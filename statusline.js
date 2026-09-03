#!/usr/bin/env node
// YetAnotherCCStatusLine - Configurable Claude Code status line
// https://github.com/tylyp/YetAnotherCCStatusLine
// Shows (4 lines): dir | model / context / 5h / 7d

const fs = require('fs');
const path = require('path');
const os = require('os');

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

// ── Stale bridge-file sweep (hourly, best effort) ────────
// The context bridge below drops one claude-ctx-<session>.json into tmp per
// session and nothing ever removes it. Sweep files older than a day, at most
// once an hour, so tmp does not grow without bound.
const BRIDGE_TTL_MS = 24 * 60 * 60 * 1000;
const BRIDGE_SWEEP_FILE = path.join(CACHE_DIR, 'statusline-bridge-sweep');

function sweepStaleBridgeFiles() {
  try {
    const stat = fs.statSync(BRIDGE_SWEEP_FILE);
    if (Date.now() - stat.mtimeMs < 3600000) return;
  } catch (e) {}
  writeJsonCache(BRIDGE_SWEEP_FILE, String(Date.now()));

  const tmp = os.tmpdir();
  let names;
  try { names = fs.readdirSync(tmp); } catch (e) { return; }
  for (const name of names) {
    if (!/^claude-ctx-.+\.json$/.test(name)) continue;
    const file = path.join(tmp, name);
    try {
      if (Date.now() - fs.statSync(file).mtimeMs > BRIDGE_TTL_MS) fs.unlinkSync(file);
    } catch (e) {}
  }
}

// ── Usage data ───────────────────────────────────────────
// Claude Code feeds fresh rate_limits on stdin every render (CC ≥ 2.1.80).
// The cache file only covers the gap on a fresh boot, before the first turn,
// when stdin carries no rate_limits yet.
const USAGE_CACHE_FILE = path.join(CACHE_DIR, 'statusline-usage-cache.json');

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

// Write only when the numbers actually change, so a redraw is not a disk write.
function writeUsageCache(usage) {
  const payload = JSON.stringify(usage);
  let prev = null;
  try { prev = fs.readFileSync(USAGE_CACHE_FILE, 'utf8'); } catch (e) {}
  if (prev !== payload) writeJsonCache(USAGE_CACHE_FILE, payload);
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
process.stdin.on('end', () => {
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
    // Fall back to the cache only when stdin lacks the field (fresh boot, before
    // the first turn).
    const stdinUsage = normalizeStdinRateLimits(data.rate_limits);
    const usage = stdinUsage || readJsonFile(USAGE_CACHE_FILE);

    // Refresh the shared cache from fresh stdin data so other sessions and the
    // next boot start with recent numbers.
    if (stdinUsage) {
      try { writeUsageCache(stdinUsage); } catch (e) {}
    }

    sweepStaleBridgeFiles();

    const sep = ` ${c.dim}|${c.reset} `;

    const line1 = [];
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
