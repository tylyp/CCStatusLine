#!/usr/bin/env node
// YetAnotherCCStatusLine - Configurable Claude Code status line
// https://github.com/tylyp/YetAnotherCCStatusLine
// Shows: [CC update |] dir | context | 5h | 7d | model

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { execSync } = require('child_process');

// ── Load config ──────────────────────────────────────────
const CONFIG_LOCATIONS = [
  process.env.CCSTATUSLINE_CONFIG,
  path.join(os.homedir(), '.config', 'ccstatusline', 'config.json'),
  path.join(__dirname, 'config.json'),
];

let cfg = {};
for (const loc of CONFIG_LOCATIONS) {
  if (loc && fs.existsSync(loc)) {
    try { cfg = JSON.parse(fs.readFileSync(loc, 'utf8')); } catch (e) {}
    break;
  }
}

const BAR_SIZE_MAP = { tiny: 4, small: 6, medium: 10, large: 15, xl: 20 };
const BAR_WIDTH = BAR_SIZE_MAP[cfg.bar_size] || 10;

const BAR_STYLES = {
  classic: ['█', '░'], shade: ['▓', '░'],
  dot:     ['●', '○'], square: ['■', '□'], star: ['★', '☆'],
  pipe:    ['┃', '┆'], thin:   ['━', '─'], braille: ['⣿', '⡀'],
  arrow:   ['▶', '▷'],
};
const [BAR_FILLED, BAR_EMPTY] = BAR_STYLES[cfg.bar_style] || BAR_STYLES.classic;

// ── Theme colors ─────────────────────────────────────────
const THEMES = {
  default: { low: [0,140,60],   mid: [180,150,0],   high: [200,30,30],  label: [80,80,80] },
  ocean:   { low: [6,182,212],  mid: [59,130,246],  high: [168,85,247], label: [6,182,212] },
  sunset:  { low: [180,150,0],  mid: [200,120,0],   high: [200,30,30],  label: [200,120,0] },
  mono:    { low: [120,120,120],mid: [80,80,80],    high: [40,40,40],   label: [100,100,100] },
  neon:    { low: [0,255,65],   mid: [255,0,255],   high: [255,0,64],   label: [0,255,255] },
  frost:   { low: [147,197,253],mid: [96,165,250],  high: [59,130,246], label: [147,197,253] },
  ember:   { low: [251,191,36], mid: [234,88,12],   high: [220,38,38],  label: [208,120,0] },
  candy:   { low: [249,168,212],mid: [192,132,252], high: [244,63,94],  label: [219,170,255] },
  matrix:  { low: [0,255,65],   mid: [22,163,74],   high: [22,101,52],  label: [22,130,60] },
};

const theme = THEMES[cfg.theme] || THEMES.default;
const rgb = (r,g,b) => `\x1b[38;2;${r};${g};${b}m`;
const c = {
  low:    rgb(...theme.low),
  mid:    rgb(...theme.mid),
  high:   rgb(...theme.high),
  label:  rgb(...theme.label),
  ember:  '\x1b[38;2;160;70;20m',
  dim:    '\x1b[2m',
  reset:  '\x1b[0m',
};

// ── Helpers ──────────────────────────────────────────────
function colorForPct(pct) {
  if (pct >= 80) return c.high;
  if (pct >= 50) return c.mid;
  return c.low;
}

function buildBar(pct, width = BAR_WIDTH) {
  pct = Math.max(0, Math.min(100, pct));
  const filled = Math.round(pct * width / 100);
  const empty = width - filled;
  const col = colorForPct(pct);
  return `${col}${BAR_FILLED.repeat(filled)}${c.dim}${BAR_EMPTY.repeat(empty)}${c.reset}`;
}

function formatResetTime(isoStr, style) {
  if (!isoStr || isoStr === 'null') return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const h = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    if (style === 'time') return `${h}:${mm}`;
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${h}:${mm}`;
  } catch (e) {
    return '';
  }
}

const CACHE_DIR = path.join(os.tmpdir(), 'claude');

function readJsonFile(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (e) { return null; }
}

function writeJsonCache(filePath, data) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(filePath, typeof data === 'string' ? data : JSON.stringify(data));
  } catch (e) {}
}

// ── OAuth token resolution ───────────────────────────────
function getOAuthToken() {
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) return process.env.CLAUDE_CODE_OAUTH_TOKEN;
  const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  const credsFile = path.join(claudeDir, '.credentials.json');
  try {
    const creds = readJsonFile(credsFile);
    const token = creds?.claudeAiOauth?.accessToken;
    if (token && token !== 'null') return token;
  } catch (e) {}
  return '';
}

// ── Claude Code update checker (cached 1 hour) ──────────
function getLocalClaudeVersion() {
  try {
    const output = execSync('claude --version 2>/dev/null', { timeout: 3000, encoding: 'utf8' });
    const match = output.trim().match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

const UPDATE_CACHE_FILE = path.join(CACHE_DIR, 'cc-update-check.json');

function triggerAsyncUpdateCheck(localVer) {
  const req = https.get('https://registry.npmjs.org/@anthropic-ai/claude-code/latest', { timeout: 5000 }, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      try {
        const data = JSON.parse(body);
        const remoteVer = data.version;
        if (remoteVer) {
          writeJsonCache(UPDATE_CACHE_FILE, {
            timestamp: Date.now(),
            update_available: compareVersions(remoteVer, localVer) > 0,
            local_version: localVer,
            remote_version: remoteVer,
          });
        }
      } catch (e) {}
    });
  });
  req.on('error', () => {});
  req.on('timeout', () => { req.destroy(); });
}

function getClaudeUpdateIndicator() {
  const cacheTTL = 3600;

  try {
    const cache = readJsonFile(UPDATE_CACHE_FILE);
    if (cache) {
      const localVer = getLocalClaudeVersion();
      const age = (Date.now() - cache.timestamp) / 1000;

      if (age >= cacheTTL && localVer) {
        triggerAsyncUpdateCheck(localVer);
      }

      if (cache.update_available) {
        if (localVer && localVer === cache.local_version) {
          return `${c.ember}⬆ CC ${cache.remote_version}${c.reset}`;
        }
        if (localVer) triggerAsyncUpdateCheck(localVer);
      }
    } else {
      const localVer = getLocalClaudeVersion();
      if (localVer) triggerAsyncUpdateCheck(localVer);
    }
  } catch (e) {}
  return '';
}

// ── Fetch usage data (cached 5 min, cross-session dedup) ─
const USAGE_CACHE_FILE = path.join(CACHE_DIR, 'statusline-usage-cache.json');
const USAGE_ATTEMPT_FILE = path.join(CACHE_DIR, 'statusline-usage-attempt');

// Normalize stdin rate_limits (CC ≥2.1.80) into the shape formatUsageTier expects.
// Stdin shape: { five_hour: { used_percentage, resets_at (epoch s) }, seven_day: {...} }
// Target shape: { five_hour: { utilization, resets_at (ISO) }, seven_day: {...} }
function normalizeStdinRateLimits(rl) {
  if (!rl || typeof rl !== 'object') return null;
  const conv = tier => {
    if (!tier) return undefined;
    const epoch = Number(tier.resets_at);
    const iso = Number.isFinite(epoch) ? new Date(epoch * 1000).toISOString() : null;
    return { utilization: Number(tier.used_percentage) || 0, resets_at: iso };
  };
  const out = {};
  if (rl.five_hour) out.five_hour = conv(rl.five_hour);
  if (rl.seven_day) out.seven_day = conv(rl.seven_day);
  return out.five_hour || out.seven_day ? out : null;
}

function fetchUsageData() {
  return new Promise(resolve => {
    const cacheMaxAge = 600; // 10 minutes — prevents multi-session API spam

    try {
      const stat = fs.statSync(USAGE_CACHE_FILE);
      const age = (Date.now() - stat.mtimeMs) / 1000;
      if (age < cacheMaxAge) {
        return resolve(readJsonFile(USAGE_CACHE_FILE));
      }
    } catch (e) {}

    // Cross-session dedup: only one session attempts the API per 60s
    try {
      const attemptStat = fs.statSync(USAGE_ATTEMPT_FILE);
      const attemptAge = (Date.now() - attemptStat.mtimeMs) / 1000;
      if (attemptAge < 60) {
        return resolve(readJsonFile(USAGE_CACHE_FILE));
      }
    } catch (e) {}

    const token = getOAuthToken();
    if (!token) return resolve(null);

    // Touch attempt file so other sessions skip
    writeJsonCache(USAGE_ATTEMPT_FILE, String(Date.now()));

    const staleCache = readJsonFile(USAGE_CACHE_FILE);

    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/api/oauth/usage',
      method: 'GET',
      timeout: 5000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'anthropic-beta': 'oauth-2025-04-20',
      },
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        // Non-200: touch cache file to prevent immediate retry, but use shorter TTL
        // so it recovers faster than the full 5-min window
        if (res.statusCode !== 200) {
          if (staleCache) {
            // Re-write stale data to refresh mtime — retries in 5 min instead of immediately
            writeJsonCache(USAGE_CACHE_FILE, JSON.stringify(staleCache));
          }
          return resolve(staleCache);
        }

        try {
          const data = JSON.parse(body);
          if (data.five_hour) {
            writeJsonCache(USAGE_CACHE_FILE, body);
            return resolve(data);
          }
        } catch (e) {}
        resolve(staleCache);
      });
    });
    req.on('error', () => resolve(staleCache));
    req.on('timeout', () => { req.destroy(); });
    req.end();
  });
}

// ── Format usage segments ────────────────────────────────
function formatUsageTier(usage, key, label, resetStyle) {
  if (!usage?.[key]) return '';
  const pct = Math.round(Number(usage[key].utilization) || 0);
  const reset = formatResetTime(usage[key].resets_at, resetStyle);
  const bar = buildBar(pct);
  const pctCol = colorForPct(pct);
  let out = `${c.label}${label}${c.reset} ${bar} ${pctCol}${pct}%${c.reset}`;
  if (reset) out += ` ${c.dim}⟳ ${reset}${c.reset}`;
  return out;
}

// ── Main ─────────────────────────────────────────────────
let input = '';
const stdinTimeout = setTimeout(() => process.exit(0), 3000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', async () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);

    let model = data.model?.display_name || 'Claude';
    if (data.context_window?.context_window_size >= 1000000 && !/1m/i.test(model)) model += ' (1M)';
    const dir = data.workspace?.current_dir || process.cwd();
    const session = data.session_id || '';
    const remaining = data.context_window?.remaining_percentage;

    // Context window display
    const AUTO_COMPACT_BUFFER_PCT = 16.5;
    let ctx = '';
    if (remaining != null) {
      const usableRemaining = Math.max(0, ((remaining - AUTO_COMPACT_BUFFER_PCT) / (100 - AUTO_COMPACT_BUFFER_PCT)) * 100);
      const used = Math.max(0, Math.min(100, Math.round(100 - usableRemaining)));

      if (session) {
        try {
          const bridgePath = path.join(os.tmpdir(), `claude-ctx-${session}.json`);
          const prev = readJsonFile(bridgePath);
          if (!prev || prev.used_pct !== used) {
            fs.writeFileSync(bridgePath, JSON.stringify({
              session_id: session,
              remaining_percentage: remaining,
              used_pct: used,
              timestamp: Math.floor(Date.now() / 1000)
            }));
          }
        } catch (e) {}
      }

      const bar = buildBar(used);
      const pctCol = colorForPct(used);
      const size = data.context_window?.context_window_size;
      let absStr = '';
      if (size) {
        const usedTokens = size * (100 - remaining) / 100;
        absStr = ` ${c.dim}(${Math.round(usedTokens / 1000)}k)${c.reset}`;
      }
      if (used >= 80) {
        ctx = `\x1b[5m${c.high}💀${c.reset} ${bar} ${pctCol}${used}%${c.reset}${absStr}`;
      } else {
        ctx = `${bar} ${pctCol}${used}%${c.reset}${absStr}`;
      }
    }

    // Prefer stdin rate_limits (CC ≥2.1.80) — fresh every render, zero API calls.
    // Fall back to cached API data only when stdin lacks the field (fresh boot,
    // pre-first-turn, or older CC versions).
    const stdinUsage = normalizeStdinRateLimits(data.rate_limits);
    const usagePromise = stdinUsage ? Promise.resolve(stdinUsage) : fetchUsageData();
    const ccUpdate = getClaudeUpdateIndicator();
    const usage = await usagePromise;

    // Opportunistically refresh the shared cache from fresh stdin data so other
    // sessions (and next boot) get recent numbers without an API call.
    if (stdinUsage) {
      try { writeJsonCache(USAGE_CACHE_FILE, JSON.stringify(stdinUsage)); } catch (e) {}
    }

    const sep = ` ${c.dim}|${c.reset} `;

    const line1 = [];
    if (ccUpdate) line1.push(ccUpdate);
    line1.push(`${c.dim}${path.basename(dir)}${c.reset}`);
    line1.push(`${c.dim}${model}${c.reset}`);

    const fiveHourStr = formatUsageTier(usage, 'five_hour', '5h ', 'time')
      || (!usage ? `${c.label}5h ${c.reset} ${c.dim}?${c.reset}` : '');
    const sevenDayStr = formatUsageTier(usage, 'seven_day', '7d ', 'datetime')
      || (!usage ? `${c.label}7d ${c.reset} ${c.dim}?${c.reset}` : '');

    const lines = [line1.join(sep)];
    if (ctx) lines.push(`${c.label}ctx${c.reset} ${ctx}`);
    if (fiveHourStr) lines.push(fiveHourStr);
    if (sevenDayStr) lines.push(sevenDayStr);

    process.stdout.write(lines.join('\n'));
  } catch (e) {}
});
