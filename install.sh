#!/bin/bash
# CCStatusLine installer

set -e

INSTALL_DIR="$HOME/.config/ccstatusline"
REPO="https://raw.githubusercontent.com/tylyp/CCStatusLine/main"
SETTINGS_FILE="$HOME/.claude/settings.json"

echo "Installing CCStatusLine..."

# Create install directory
mkdir -p "$INSTALL_DIR"

# Download files
curl -fsSL "$REPO/statusline.js" -o "$INSTALL_DIR/statusline.js"
curl -fsSL "$REPO/config.json" -o "$INSTALL_DIR/config.json"
chmod +x "$INSTALL_DIR/statusline.js"

# Configure Claude Code settings
mkdir -p "$HOME/.claude"
COMMAND="node $INSTALL_DIR/statusline.js"

if [ -f "$SETTINGS_FILE" ]; then
    # Merge statusLine into existing settings
    tmp=$(mktemp)
    jq --arg cmd "$COMMAND" '.statusLine.command = $cmd' "$SETTINGS_FILE" > "$tmp" && mv "$tmp" "$SETTINGS_FILE"
else
    # Create new settings file
    printf '{\n  "statusLine": {\n    "command": "%s"\n  }\n}\n' "$COMMAND" > "$SETTINGS_FILE"
fi

echo "Installed to $INSTALL_DIR"
echo "Claude Code settings updated."
echo "Restart Claude Code to see your new status line."
echo ""
echo "Customize: $INSTALL_DIR/config.json"
