# CCStatusLine

A configurable status line for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) that shows context usage, session and weekly rate limits, update notifications, and model info — right in your terminal.

<p align="center">
  <img src="assets/demo-dark.svg" alt="CCStatusLine dark terminal" /><br/>
  <img src="assets/demo-light.svg" alt="CCStatusLine light terminal" />
</p>

![Node.js](https://img.shields.io/badge/node.js-%23339933.svg?style=flat&logo=node.js&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

## Features

- **Claude Code update notification** — hidden when up to date, appears when a new version is available
- **Context window** — usage bar with percentage
- **Session usage** — 5-hour rate limit bar with reset countdown
- **Weekly usage** — 7-day rate limit bar with reset date/time
- **Model name** — current model display
- **9 bar styles** — classic, shade, dot, square, star, pipe, thin, braille, arrow
- **5 bar sizes** — tiny (4), small (6), medium (10), large (15), xl (20)
- **9 color themes** — default, ocean, sunset, mono, neon, frost, ember, candy, matrix
- Zero external dependencies (Node.js only)

## Installation

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/tylyp/CCStatusLine/main/install.sh | bash
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/tylyp/CCStatusLine/main/install.ps1 | iex
```

Restart Claude Code and you're done.

## Bar Styles

<img src="assets/bar-styles.svg" alt="Bar styles preview" />

## Bar Sizes

<img src="assets/bar-sizes.svg" alt="Bar sizes preview" />

## Color Themes

Threshold-based coloring: **< 50%** low, **50-79%** mid, **80%+** high.

<img src="assets/themes.svg" alt="Color themes preview" />

## Configuration

Edit `~/.config/ccstatusline/config.json`:

```json
{
  "bar_size": "large",
  "bar_style": "classic",
  "theme": "default"
}
```

| Key         | Values | Default | Description |
|-------------|--------|---------|-------------|
| `bar_size`  | `tiny` (4), `small` (6), `medium` (10), `large` (15), `xl` (20) | `large` | Width of the progress bars in character blocks |
| `bar_style` | `classic`, `shade`, `dot`, `square`, `star`, `pipe`, `thin`, `braille`, `arrow` | `classic` | Character style for bars |
| `theme`     | `default`, `ocean`, `sunset`, `mono`, `neon`, `frost`, `ember`, `candy`, `matrix` | `default` | Color theme |

Config file lookup order:
1. `$CCSTATUSLINE_CONFIG` environment variable
2. `~/.config/ccstatusline/config.json`
3. `config.json` next to the script

## Requirements

- Node.js 16+
- Claude Code CLI (for update checks)

## License

[MIT](LICENSE)
