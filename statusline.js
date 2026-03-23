#!/usr/bin/env node
// CCStatusLine - Configurable Claude Code status line
// https://github.com/tylyp/CCStatusLine
// Shows: [CC update] dir | context | session | weekly | model

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
const BAR_WIDTH = BAR_SIZE_MAP[cfg.bar_size] || 20;

const BAR_STYLES = {
  classic: ['█', '░'], block: ['█', '▒'], shade: ['▓', '░'],
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
  bold:   '\x1b[1m',
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

// ── OAuth token resolution (reads from local credentials at runtime) ──
function getOAuthToken() {
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) return process.env.CLAUDE_CODE_OAUTH_TOKEN;
  const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  const credsFile = path.join(claudeDir, '.credentials.json');
  try {
    if (fs.existsSync(credsFile)) {
      const creds = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
      const token = creds?.claudeAiOauth?.accessToken;
      if (token && token !== 'null') return token;
    }
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

function triggerAsyncUpdateCheck(localVer, cacheDir, cacheFile) {
  const req = https.get('https://registry.npmjs.org/@anthropic-ai/claude-code/latest', { timeout: 5000 }, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      try {
        const data = JSON.parse(body);
        const remoteVer = data.version;
        if (remoteVer) {
          const updateAvailable = compareVersions(remoteVer, localVer) > 0;
          const result = {
            timestamp: Date.now(),
            update_available: updateAvailable,
            local_version: localVer,
            remote_version: remoteVer,
          };
          try {
            fs.mkdirSync(cacheDir, { recursive: true });
            fs.writeFileSync(cacheFile, JSON.stringify(result));
          } catch (e) {}
        }
      } catch (e) {}
    });
  });
  req.on('error', () => {});
  req.on('timeout', () => { req.destroy(); });
}

function getClaudeUpdateIndicator() {
  const cacheDir = path.join(os.tmpdir(), 'claude');
  const cacheFile = path.join(cacheDir, 'cc-update-check.json');
  const cacheTTL = 3600;

  try {
    if (fs.existsSync(cacheFile)) {
      const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      const age = (Date.now() - cache.timestamp) / 1000;

      if (age >= cacheTTL) {
        const localVer = getLocalClaudeVersion();
        if (localVer) triggerAsyncUpdateCheck(localVer, cacheDir, cacheFile);
      }

      if (cache.update_available) {
        const currentLocal = getLocalClaudeVersion();
        if (currentLocal && currentLocal === cache.local_version) {
          return `${c.ember}⬆ CC ${cache.remote_version}${c.reset}`;
        }
        if (currentLocal) triggerAsyncUpdateCheck(currentLocal, cacheDir, cacheFile);
      }
    } else {
      const localVer = getLocalClaudeVersion();
      if (localVer) triggerAsyncUpdateCheck(localVer, cacheDir, cacheFile);
    }
  } catch (e) {}
  return '';
}

// ── Fetch usage data (cached 60s) ────────────────────────
function fetchUsageData() {
  return new Promise(resolve => {
    const cacheDir = path.join(os.tmpdir(), 'claude');
    const cacheFile = path.join(cacheDir, 'statusline-usage-cache.json');
    const cacheMaxAge = 60;

    try {
      if (fs.existsSync(cacheFile)) {
        const stat = fs.statSync(cacheFile);
        const age = (Date.now() - stat.mtimeMs) / 1000;
        if (age < cacheMaxAge) {
          return resolve(JSON.parse(fs.readFileSync(cacheFile, 'utf8')));
        }
      }
    } catch (e) {}

    const token = getOAuthToken();
    if (!token) return resolve(null);

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
        try {
          const data = JSON.parse(body);
          if (data.five_hour) {
            try {
              fs.mkdirSync(cacheDir, { recursive: true });
              fs.writeFileSync(cacheFile, body);
            } catch (e) {}
            return resolve(data);
          }
        } catch (e) {}
        try {
          if (fs.existsSync(cacheFile)) {
            return resolve(JSON.parse(fs.readFileSync(cacheFile, 'utf8')));
          }
        } catch (e) {}
        resolve(null);
      });
    });
    req.on('error', () => {
      try {
        if (fs.existsSync(cacheFile)) {
          return resolve(JSON.parse(fs.readFileSync(cacheFile, 'utf8')));
        }
      } catch (e) {}
      resolve(null);
    });
    req.on('timeout', () => { req.destroy(); });
    req.end();
  });
}

// ── Format usage segments ────────────────────────────────
function formatSession(usage) {
  if (!usage?.five_hour) return '';
  const pct = Math.round(Number(usage.five_hour.utilization) || 0);
  const reset = formatResetTime(usage.five_hour.resets_at, 'time');
  const bar = buildBar(pct);
  const pctCol = colorForPct(pct);
  let out = `${c.label}s${c.reset} ${bar} ${pctCol}${pct}%${c.reset}`;
  if (reset) out += ` ${c.dim}⟳ ${reset}${c.reset}`;
  return out;
}

function formatWeekly(usage) {
  if (!usage?.seven_day) return '';
  const pct = Math.round(Number(usage.seven_day.utilization) || 0);
  const reset = formatResetTime(usage.seven_day.resets_at, 'datetime');
  const bar = buildBar(pct);
  const pctCol = colorForPct(pct);
  let out = `${c.label}w${c.reset} ${bar} ${pctCol}${pct}%${c.reset}`;
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
    const model = data.model?.display_name || 'Claude';
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
          fs.writeFileSync(bridgePath, JSON.stringify({
            session_id: session,
            remaining_percentage: remaining,
            used_pct: used,
            timestamp: Math.floor(Date.now() / 1000)
          }));
        } catch (e) {}
      }

      const bar = buildBar(used);
      const pctCol = colorForPct(used);
      if (used >= 80) {
        ctx = `\x1b[5m${c.high}💀${c.reset} ${bar} ${pctCol}${used}%${c.reset}`;
      } else {
        ctx = `${bar} ${pctCol}${used}%${c.reset}`;
      }
    }

    // CC update indicator (hidden unless update available)
    let updates = '';
    const ccUpdate = getClaudeUpdateIndicator();
    if (ccUpdate) {
      updates += `${ccUpdate} `;
    }

    // Fetch usage data
    const usage = await fetchUsageData();

    // Build line: [CC update] dir | context | session | weekly | model
    const sep = ` ${c.dim}|${c.reset} `;
    const parts = [];

    parts.push(`${c.dim}${path.basename(dir)}${c.reset}`);
    if (ctx) parts.push(ctx);

    const sessionStr = formatSession(usage);
    if (sessionStr) parts.push(sessionStr);

    const weeklyStr = formatWeekly(usage);
    if (weeklyStr) parts.push(weeklyStr);

    parts.push(`${c.dim}${model}${c.reset}`);

    process.stdout.write(updates + parts.join(sep));
  } catch (e) {}
});
