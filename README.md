# CCStatusLine

A configurable status line for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) that displays project context, model info, context usage, git status, and session cost — right in your terminal.

<p align="center">
  <img src="assets/demo-dark.svg" alt="CCStatusLine dark terminal" /><br/>
  <img src="assets/demo-light.svg" alt="CCStatusLine light terminal" />
</p>

![Bash](https://img.shields.io/badge/bash-%23121011.svg?style=flat&logo=gnu-bash&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

## Features

- **Claude Code update notification** — hidden when up to date, appears in first position when a new version is available (cached, checks every 6h)
- Context window usage with configurable progress bar
- Git branch, file count, and line diff stats
- Session cost tracking
- **10 bar styles** — classic, block, shade, dot, square, star, pipe, thin, braille, arrow
- **5 bar sizes** — tiny, small, medium, large, xl
- **9 color themes** — default, ocean, sunset, mono, neon, frost, ember, candy, matrix
- Zero dependencies (just bash + jq)

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
  "theme": "default",
  "show_cost": true,
  "show_git": true
}
```

| Key         | Values | Default | Description |
|-------------|--------|---------|-------------|
| `bar_size`  | `tiny`, `small`, `medium`, `large`, `xl` | `large` | Width of the progress bar |
| `bar_style` | `classic`, `block`, `shade`, `dot`, `square`, `star`, `pipe`, `thin`, `braille`, `arrow` | `classic` | Character style for the bar |
| `theme`     | `default`, `ocean`, `sunset`, `mono`, `neon`, `frost`, `ember`, `candy`, `matrix` | `default` | Color theme |
| `show_cost` | `true`, `false` | `true` | Show session cost |
| `show_git`  | `true`, `false` | `true` | Show git branch and stats |

Config file lookup order:
1. `$CCSTATUSLINE_CONFIG` environment variable
2. `~/.config/ccstatusline/config.json`
3. `config.json` next to the script

## Requirements

- `bash` 4+
- `jq` (JSON processor)
- `git` (optional, for git status display)
- `npm` (optional, for Claude Code update checks)

## License

[MIT](LICENSE)
