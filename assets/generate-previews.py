"""Generate SVG preview images for CCStatusLine README."""

# --- Bar Styles Preview ---

BAR_STYLES = [
    ("classic",  "█", "░"),
    ("block",    "█", "▒"),
    ("shade",    "▓", "░"),
    ("dot",      "●", "○"),
    ("square",   "■", "□"),
    ("star",     "★", "☆"),
    ("pipe",     "┃", "┆"),
    ("thin",     "━", "─"),
    ("braille",  "⣿", "⡀"),
    ("arrow",    "▶", "▷"),
]

BAR_SIZES = [
    ("tiny",   4),
    ("small",  6),
    ("medium", 10),
    ("large",  15),
    ("xl",     20),
]

THEMES = [
    ("default", "#22c55e", "#eab308", "#ef4444"),
    ("ocean",   "#06b6d4", "#3b82f6", "#a855f7"),
    ("sunset",  "#eab308", "#f97316", "#ef4444"),
    ("mono",    "#d4d4d8", "#71717a", "#fafafa"),
    ("neon",    "#00ff41", "#ff00ff", "#ff0040"),
    ("frost",   "#93c5fd", "#60a5fa", "#3b82f6"),
    ("ember",   "#fbbf24", "#ea580c", "#dc2626"),
    ("candy",   "#f9a8d4", "#c084fc", "#f43f5e"),
    ("matrix",  "#00ff41", "#16a34a", "#166534"),
]

BG_COLOR = "#1e1e2e"
TEXT_COLOR = "#cdd6f4"
DIM_COLOR = "#6c7086"
FONT = "JetBrains Mono, Cascadia Code, Consolas, monospace"
CHAR_W = 10.5
LINE_H = 28
PAD_X = 20
PAD_Y = 16


def svg_header(width, height):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">
  <style>
    text {{ font-family: {FONT}; font-size: 14px; }}
    .bg {{ fill: {BG_COLOR}; rx: 8; }}
    .label {{ fill: {DIM_COLOR}; }}
    .bar-filled {{ fill: #22c55e; }}
    .bar-empty {{ fill: #45475a; }}
    .pct {{ fill: {TEXT_COLOR}; }}
  </style>
  <rect class="bg" width="{width}" height="{height}" />'''


def svg_footer():
    return "</svg>"


def escape(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def generate_bar_styles_svg():
    filled_count = 10
    empty_count = 5
    pct = 65
    label_width = 10  # chars for label column

    rows = len(BAR_STYLES)
    width = 420
    height = PAD_Y * 2 + rows * LINE_H

    lines = [svg_header(width, height)]

    for i, (name, filled_char, empty_char) in enumerate(BAR_STYLES):
        y = PAD_Y + (i + 1) * LINE_H - 6

        # Label
        label = name.ljust(9)
        lines.append(f'  <text x="{PAD_X}" y="{y}" class="label">{label}</text>')

        # Bar - filled portion
        bar_x = PAD_X + 9 * CHAR_W + 8
        filled_text = escape(filled_char * filled_count)
        lines.append(f'  <text x="{bar_x}" y="{y}" fill="#22c55e">{filled_text}</text>')

        # Bar - empty portion
        empty_x = bar_x + filled_count * CHAR_W
        empty_text = escape(empty_char * empty_count)
        lines.append(f'  <text x="{empty_x}" y="{y}" fill="#45475a">{empty_text}</text>')

        # Percentage
        pct_x = empty_x + empty_count * CHAR_W + 8
        lines.append(f'  <text x="{pct_x}" y="{y}" class="pct">{pct}%</text>')

    lines.append(svg_footer())
    return "\n".join(lines)


def generate_bar_sizes_svg():
    rows = len(BAR_SIZES)
    width = 440
    height = PAD_Y * 2 + rows * LINE_H

    lines = [svg_header(width, height)]

    for i, (name, bar_width) in enumerate(BAR_SIZES):
        y = PAD_Y + (i + 1) * LINE_H - 6
        filled = int(bar_width * 0.75)
        empty = bar_width - filled

        label = name.ljust(8)
        lines.append(f'  <text x="{PAD_X}" y="{y}" class="label">{label}</text>')

        bar_x = PAD_X + 8 * CHAR_W + 8
        lines.append(f'  <text x="{bar_x}" y="{y}" fill="#22c55e">{"█" * filled}</text>')

        empty_x = bar_x + filled * CHAR_W
        lines.append(f'  <text x="{empty_x}" y="{y}" fill="#45475a">{"░" * empty}</text>')

        pct_x = empty_x + empty * CHAR_W + 8
        lines.append(f'  <text x="{pct_x}" y="{y}" class="pct">75%</text>')

    lines.append(svg_footer())
    return "\n".join(lines)


def generate_themes_svg():
    bar_width = 15
    width = 480
    height = PAD_Y * 2 + len(THEMES) * LINE_H

    lines = [svg_header(width, height)]

    for i, (name, low, mid, high) in enumerate(THEMES):
        y = PAD_Y + (i + 1) * LINE_H - 6

        label = name.ljust(9)
        lines.append(f'  <text x="{PAD_X}" y="{y}" class="label">{label}</text>')

        bar_x = PAD_X + 9 * CHAR_W + 8

        # Show three mini bars: low (30%), mid (65%), high (90%)
        demos = [(4, 30, low), (10, 65, mid), (13, 90, high)]
        offset = bar_x

        for filled, pct, color in demos:
            empty = bar_width - filled
            # Use a shorter bar for each demo
            demo_filled = int(5 * filled / bar_width)
            demo_empty = 5 - demo_filled

            lines.append(f'  <text x="{offset}" y="{y}" fill="{color}">{"█" * demo_filled}</text>')
            emp_x = offset + demo_filled * CHAR_W
            lines.append(f'  <text x="{emp_x}" y="{y}" fill="#45475a">{"░" * demo_empty}</text>')
            pct_x = emp_x + demo_empty * CHAR_W + 4
            lines.append(f'  <text x="{pct_x}" y="{y}" fill="{color}">{pct}%</text>')

            offset = pct_x + 4 * CHAR_W + 12

        lines.append("")

    lines.append(svg_footer())
    return "\n".join(lines)


def generate_demo_svg():
    """Generate a hero image showing two realistic status lines."""
    width = 720
    height = 86
    cw = 8.4  # tighter char width for demo

    lines = [f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">
  <style>
    text {{ font-family: {FONT}; font-size: 13px; }}
  </style>
  <rect width="{width}" height="{height}" fill="{BG_COLOR}" rx="8" />''']

    # Line 1: normal status (no update)
    y = 28
    x = PAD_X
    parts = [
        ("#89b4fa", "my-project"),
        (DIM_COLOR, " | "),
        ("#06b6d4", "Opus 4.6"),
        (DIM_COLOR, " | "),
    ]
    for color, text in parts:
        lines.append(f'  <text x="{x}" y="{y}" fill="{color}">{text}</text>')
        x += len(text) * cw

    # Bar 42% green
    f_chars = "██████"
    e_chars = "░░░░░░░░░"
    lines.append(f'  <text x="{x}" y="{y}" fill="#22c55e">{f_chars}</text>')
    x += len(f_chars) * cw
    lines.append(f'  <text x="{x}" y="{y}" fill="#45475a">{e_chars}</text>')
    x += len(e_chars) * cw

    parts2 = [
        (TEXT_COLOR, " 42%"),
        (DIM_COLOR, " | "),
        ("#eab308", "(main"),
        (DIM_COLOR, " | "),
        (DIM_COLOR, "3 files "),
        ("#22c55e", "+48 "),
        ("#ef4444", "-12"),
        ("#eab308", ")"),
    ]
    for color, text in parts2:
        lines.append(f'  <text x="{x}" y="{y}" fill="{color}">{text}</text>')
        x += len(text) * cw

    # Line 2: with update notice
    y2 = 56
    x = PAD_X
    parts3 = [
        ("#a855f7", "CC 2.1.80&gt;2.1.81"),
        (DIM_COLOR, " | "),
        ("#89b4fa", "api-server"),
        (DIM_COLOR, " | "),
        ("#06b6d4", "Sonnet 4.6"),
        (DIM_COLOR, " | "),
    ]
    # Manually track length for the HTML entity
    for color, text in parts3:
        lines.append(f'  <text x="{x}" y="{y2}" fill="{color}">{text}</text>')
        display_len = len(text.replace("&gt;", ">"))
        x += display_len * cw

    # Bar 78% yellow
    f2 = "███████████"
    e2 = "░░░░"
    lines.append(f'  <text x="{x}" y="{y2}" fill="#eab308">{f2}</text>')
    x += len(f2) * cw
    lines.append(f'  <text x="{x}" y="{y2}" fill="#45475a">{e2}</text>')
    x += len(e2) * cw

    parts4 = [
        (TEXT_COLOR, " 78%"),
        (DIM_COLOR, " [$0.4821]"),
    ]
    for color, text in parts4:
        lines.append(f'  <text x="{x}" y="{y2}" fill="{color}">{text}</text>')
        x += len(text) * cw

    # Subtle labels
    lines.append(f'  <text x="{width - 100}" y="{y + 1}" fill="#45475a" font-size="10">up to date</text>')
    lines.append(f'  <text x="{width - 110}" y="{y2 + 1}" fill="#45475a" font-size="10">update available</text>')

    lines.append(svg_footer())
    return "\n".join(lines)


if __name__ == "__main__":
    import os
    out_dir = os.path.join(os.path.dirname(__file__))

    with open(os.path.join(out_dir, "demo.svg"), "w", encoding="utf-8") as f:
        f.write(generate_demo_svg())

    with open(os.path.join(out_dir, "bar-styles.svg"), "w", encoding="utf-8") as f:
        f.write(generate_bar_styles_svg())

    with open(os.path.join(out_dir, "bar-sizes.svg"), "w", encoding="utf-8") as f:
        f.write(generate_bar_sizes_svg())

    with open(os.path.join(out_dir, "themes.svg"), "w", encoding="utf-8") as f:
        f.write(generate_themes_svg())

    print("Generated: demo.svg, bar-styles.svg, bar-sizes.svg, themes.svg")
