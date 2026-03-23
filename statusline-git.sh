#!/bin/bash

# CCStatusLine - Configurable Claude Code status line
# https://github.com/tylyp/CCStatusLine

# --- Configuration ---
# Config file location: ~/.config/ccstatusline/config.json
# Falls back to config.json next to this script, then defaults.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${CCSTATUSLINE_CONFIG:-}"

if [ -z "$CONFIG_FILE" ] || [ ! -f "$CONFIG_FILE" ]; then
    if [ -f "$HOME/.config/ccstatusline/config.json" ]; then
        CONFIG_FILE="$HOME/.config/ccstatusline/config.json"
    elif [ -f "$SCRIPT_DIR/config.json" ]; then
        CONFIG_FILE="$SCRIPT_DIR/config.json"
    fi
fi

# Read config values (with defaults)
if [ -n "$CONFIG_FILE" ] && [ -f "$CONFIG_FILE" ]; then
    cfg_bar_size=$(jq -r '.bar_size // "large"' "$CONFIG_FILE")
    cfg_bar_style=$(jq -r '.bar_style // "classic"' "$CONFIG_FILE")
    cfg_theme=$(jq -r '.theme // "default"' "$CONFIG_FILE")
    cfg_show_cost=$(jq -r '.show_cost // true' "$CONFIG_FILE")
    cfg_show_git=$(jq -r '.show_git // true' "$CONFIG_FILE")
else
    cfg_bar_size="large"
    cfg_bar_style="classic"
    cfg_theme="default"
    cfg_show_cost="true"
    cfg_show_git="true"
fi

# --- Bar Sizes ---
case "$cfg_bar_size" in
    tiny)       bar_width=4  ;;
    small)      bar_width=6  ;;
    medium)     bar_width=10 ;;
    large)      bar_width=15 ;;
    xl)         bar_width=20 ;;
    *)          bar_width=15 ;;
esac

# --- Bar Styles ---
# Each style defines filled and empty characters
case "$cfg_bar_style" in
    classic)    bar_filled="█" ; bar_empty="░" ;;
    block)      bar_filled="█" ; bar_empty="▒" ;;
    shade)      bar_filled="▓" ; bar_empty="░" ;;
    dot)        bar_filled="●" ; bar_empty="○" ;;
    square)     bar_filled="■" ; bar_empty="□" ;;
    star)       bar_filled="★" ; bar_empty="☆" ;;
    pipe)       bar_filled="┃" ; bar_empty="┆" ;;
    thin)       bar_filled="━" ; bar_empty="─" ;;
    braille)    bar_filled="⣿" ; bar_empty="⡀" ;;
    arrow)      bar_filled="▶" ; bar_empty="▷" ;;
    *)          bar_filled="█" ; bar_empty="░" ;;
esac

# --- Theme Colors ---
# Themes define colors for: low (<50%), mid (50-79%), high (80%+), and labels
# Format: low_color mid_color high_color label_color
case "$cfg_theme" in
    default)
        color_low='\033[0;32m'    # green
        color_mid='\033[0;33m'    # yellow
        color_high='\033[0;31m'   # red
        color_label='\033[0;90m'  # gray
        ;;
    ocean)
        color_low='\033[0;36m'    # cyan
        color_mid='\033[0;34m'    # blue
        color_high='\033[0;35m'   # magenta
        color_label='\033[0;36m'  # cyan
        ;;
    sunset)
        color_low='\033[0;33m'    # yellow
        color_mid='\033[38;5;208m' # orange
        color_high='\033[0;31m'   # red
        color_label='\033[38;5;208m'
        ;;
    mono)
        color_low='\033[0;37m'    # white
        color_mid='\033[0;90m'    # gray
        color_high='\033[0;97m'   # bright white
        color_label='\033[0;90m'
        ;;
    neon)
        color_low='\033[38;5;46m'  # bright green
        color_mid='\033[38;5;201m' # hot pink
        color_high='\033[38;5;196m' # bright red
        color_label='\033[38;5;51m' # bright cyan
        ;;
    frost)
        color_low='\033[38;5;153m' # light blue
        color_mid='\033[38;5;111m' # medium blue
        color_high='\033[38;5;69m'  # deep blue
        color_label='\033[38;5;153m'
        ;;
    ember)
        color_low='\033[38;5;220m' # gold
        color_mid='\033[38;5;202m' # dark orange
        color_high='\033[38;5;160m' # dark red
        color_label='\033[38;5;208m'
        ;;
    candy)
        color_low='\033[38;5;213m' # pink
        color_mid='\033[38;5;177m' # lavender
        color_high='\033[38;5;196m' # red
        color_label='\033[38;5;219m'
        ;;
    matrix)
        color_low='\033[38;5;46m'  # bright green
        color_mid='\033[38;5;34m'  # green
        color_high='\033[38;5;22m' # dark green
        color_label='\033[38;5;28m'
        ;;
    *)
        color_low='\033[0;32m'
        color_mid='\033[0;33m'
        color_high='\033[0;31m'
        color_label='\033[0;90m'
        ;;
esac

# --- Static Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# --- Claude Code Update Check (cached, hidden when up to date) ---
# Cache file stores "local_ver|latest_ver|timestamp" — refreshes every 6 hours
CACHE_DIR="${HOME}/.cache/ccstatusline"
CACHE_FILE="${CACHE_DIR}/update_check"
CACHE_TTL=21600  # 6 hours in seconds
update_notice=""

check_cc_update() {
    mkdir -p "$CACHE_DIR" 2>/dev/null

    local now
    now=$(date +%s)
    local cached_time=0 cached_local="" cached_latest=""

    if [ -f "$CACHE_FILE" ]; then
        cached_local=$(cut -d'|' -f1 "$CACHE_FILE")
        cached_latest=$(cut -d'|' -f2 "$CACHE_FILE")
        cached_time=$(cut -d'|' -f3 "$CACHE_FILE")
    fi

    if [ $((now - cached_time)) -gt "$CACHE_TTL" ]; then
        # Refresh cache — get versions (timeout quickly to not block statusline)
        cached_local=$(claude --version 2>/dev/null | grep -oP '[\d.]+' | head -1)
        cached_latest=$(timeout 3 npm view @anthropic-ai/claude-code version 2>/dev/null)

        if [ -n "$cached_local" ] && [ -n "$cached_latest" ]; then
            echo "${cached_local}|${cached_latest}|${now}" > "$CACHE_FILE"
        fi
    fi

    # Compare versions — only show notice if latest is strictly newer
    if [ -n "$cached_local" ] && [ -n "$cached_latest" ] && [ "$cached_local" != "$cached_latest" ]; then
        # Simple version comparison: if they differ and latest sorts higher, update available
        local higher
        higher=$(printf '%s\n%s' "$cached_local" "$cached_latest" | sort -V | tail -1)
        if [ "$higher" = "$cached_latest" ]; then
            update_notice="${MAGENTA}CC ${cached_local}>${cached_latest}${NC} ${GRAY}|${NC} "
        fi
    fi
}

check_cc_update

# --- Read JSON input from stdin ---
input=$(cat)

# Extract information from JSON
model_name=$(echo "$input" | jq -r '.model.display_name')
current_dir=$(echo "$input" | jq -r '.workspace.current_dir')

# Extract context window information
context_size=$(echo "$input" | jq -r '.context_window.context_window_size // 200000')
current_usage=$(echo "$input" | jq '.context_window.current_usage')

# Calculate context percentage
if [ "$current_usage" != "null" ]; then
    current_tokens=$(echo "$current_usage" | jq '.input_tokens + .cache_creation_input_tokens + .cache_read_input_tokens')
    context_percent=$((current_tokens * 100 / context_size))
else
    context_percent=0
fi

# Clamp percentage
[ "$context_percent" -gt 100 ] && context_percent=100

# --- Select bar color based on threshold ---
if [ "$context_percent" -lt 50 ]; then
    bar_color="$color_low"
elif [ "$context_percent" -lt 80 ]; then
    bar_color="$color_mid"
else
    bar_color="$color_high"
fi

# --- Build progress bar ---
filled=$((context_percent * bar_width / 100))
empty=$((bar_width - filled))

bar=""
for ((i=0; i<filled; i++)); do bar+="$bar_filled"; done
for ((i=0; i<empty; i++)); do bar+="$bar_empty"; done

# Extract cost information
session_cost=$(echo "$input" | jq -r '.cost.total_cost_usd // empty')
[ "$session_cost" != "empty" ] && session_cost=$(printf "%.4f" "$session_cost") || session_cost=""

# Get directory name
dir_name=$(basename "$current_dir")

# --- Git Info ---
git_info=""
if [ "$cfg_show_git" = "true" ]; then
    cd "$current_dir" 2>/dev/null || cd /

    if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        branch=$(git branch --show-current 2>/dev/null || echo "detached")

        status_output=$(git status --porcelain 2>/dev/null)

        if [ -n "$status_output" ]; then
            total_files=$(echo "$status_output" | wc -l | xargs)
            line_stats=$(git diff --numstat HEAD 2>/dev/null | awk '{added+=$1; removed+=$2} END {print added+0, removed+0}')

            added=$(echo $line_stats | cut -d' ' -f1)
            removed=$(echo $line_stats | cut -d' ' -f2)

            git_info=" ${YELLOW}($branch${NC} ${YELLOW}|${NC} ${GRAY}${total_files} files${NC}"
            [ "$added" -gt 0 ] && git_info="${git_info} ${GREEN}+${added}${NC}"
            [ "$removed" -gt 0 ] && git_info="${git_info} ${RED}-${removed}${NC}"
            git_info="${git_info} ${YELLOW})${NC}"
        else
            git_info=" ${YELLOW}($branch)${NC}"
        fi
    fi
fi

# --- Cost Info ---
cost_info=""
if [ "$cfg_show_cost" = "true" ] && [ -n "$session_cost" ] && [ "$session_cost" != "null" ] && [ "$session_cost" != "empty" ]; then
    cost_info=" ${GRAY}[\$$session_cost]${NC}"
fi

# --- Build context bar display with theme colors ---
context_info="${bar_color}${bar}${NC} ${context_percent}%"

# --- Output the status line ---
# Order: CC update | dir | context | session cost | git | model
echo -e "${update_notice}${BLUE}${dir_name}${NC} ${GRAY}|${NC} ${context_info}${cost_info:+ ${GRAY}|${NC}}${cost_info}${git_info:+ ${GRAY}|${NC}}${git_info} ${GRAY}|${NC} ${CYAN}${model_name}${NC}"
