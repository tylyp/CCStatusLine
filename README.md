# CCStatusLine

A configurable status line for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) that displays project context, model info, context usage, git status, and session cost — right in your terminal.

![Bash](https://img.shields.io/badge/bash-%23121011.svg?style=flat&logo=gnu-bash&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

## Features

- Context window usage with configurable progress bar
- Git branch, file count, and line diff stats
- Session cost tracking
- **10 bar styles** — classic, block, shade, dot, square, star, pipe, thin, braille, arrow
- **5 bar sizes** — tiny, small, medium, large, xl
- **9 color themes** — default, ocean, sunset, mono, neon, frost, ember, candy, matrix
- Zero dependencies (just bash + jq)

## Bar Styles

```
classic  ████████░░░░░░░  65%
block    ████████▒▒▒▒▒▒▒  65%
shade    ▓▓▓▓▓▓▓▓░░░░░░░  65%
dot      ●●●●●●●●○○○○○○○  65%
square   ■■■■■■■■□□□□□□□  65%
star     ★★★★★★★★☆☆☆☆☆☆☆  65%
pipe     ┃┃┃┃┃┃┃┃┆┆┆┆┆┆┆  65%
thin     ━━━━━━━━─────── 65%
braille  ⣿⣿⣿⣿⣿⣿⣿⣿⡀⡀⡀⡀⡀⡀⡀  65%
arrow    ▶▶▶▶▶▶▶▶▷▷▷▷▷▷▷  65%
```

## Bar Sizes

| Size   | Width | Example            |
|--------|-------|--------------------|
| tiny   | 4     | `███░ 75%`         |
| small  | 6     | `████░░ 75%`       |
| medium | 10    | `███████░░░ 75%`   |
| large  | 15    | `███████████░░░░ 75%` |
| xl     | 20    | `███████████████░░░░░ 75%` |

## Color Themes

All themes use threshold-based coloring:
- **< 50%** — low color (green by default)
- **50-79%** — mid color (yellow by default)
- **80%+** — high color (red by default)

| Theme   | Low        | Mid          | High        |
|---------|------------|--------------|-------------|
| default | green      | yellow       | red         |
| ocean   | cyan       | blue         | magenta     |
| sunset  | yellow     | orange       | red         |
| mono    | white      | gray         | bright white|
| neon    | bright green | hot pink   | bright red  |
| frost   | light blue | medium blue  | deep blue   |
| ember   | gold       | dark orange  | dark red    |
| candy   | pink       | lavender     | red         |
| matrix  | bright green | green      | dark green  |

## Installation

### Quick Install

```bash
# Clone the repo
git clone https://github.com/tylyp/CCStatusLine.git

# Copy the script somewhere convenient
cp CCStatusLine/statusline-git.sh ~/.config/ccstatusline/statusline-git.sh
cp CCStatusLine/config.json ~/.config/ccstatusline/config.json
chmod +x ~/.config/ccstatusline/statusline-git.sh
```

### Configure Claude Code

Add to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "statusLine": {
    "command": "bash /path/to/statusline-git.sh"
  }
}
```

Or with environment-based config path:

```json
{
  "statusLine": {
    "command": "CCSTATUSLINE_CONFIG=/path/to/config.json bash /path/to/statusline-git.sh"
  }
}
```

## Configuration

Edit `config.json` (or `~/.config/ccstatusline/config.json`):

```json
{
  "bar_size": "large",
  "bar_style": "classic",
  "theme": "default",
  "show_cost": true,
  "show_git": true
}
```

### Options

| Key         | Values | Default | Description |
|-------------|--------|---------|-------------|
| `bar_size`  | `tiny`, `small`, `medium`, `large`, `xl` | `large` | Width of the progress bar |
| `bar_style` | `classic`, `block`, `shade`, `dot`, `square`, `star`, `pipe`, `thin`, `braille`, `arrow` | `classic` | Character style for the bar |
| `theme`     | `default`, `ocean`, `sunset`, `mono`, `neon`, `frost`, `ember`, `candy`, `matrix` | `default` | Color theme with threshold-based coloring |
| `show_cost` | `true`, `false` | `true` | Show session cost |
| `show_git`  | `true`, `false` | `true` | Show git branch and stats |

### Config File Locations

The script looks for config in this order:
1. `$CCSTATUSLINE_CONFIG` environment variable
2. `~/.config/ccstatusline/config.json`
3. `config.json` next to the script

## Requirements

- `bash` 4+
- `jq` (JSON processor)
- `git` (optional, for git status display)

## License

[MIT](LICENSE)
