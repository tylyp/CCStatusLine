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

        label = f"{name} ({bar_width})".ljust(12)
        lines.append(f'  <text x="{PAD_X}" y="{y}" class="label">{label}</text>')

        bar_x = PAD_X + 12 * CHAR_W + 8
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


def _build_bar(x, y, filled, empty, fill_color, empty_color, cw):
    """Return SVG text elements for a progress bar."""
    els = []
    f_str = "█" * filled
    e_str = "░" * empty
    els.append(f'  <text x="{x}" y="{y}" fill="{fill_color}">{f_str}</text>')
    x += filled * cw
    els.append(f'  <text x="{x}" y="{y}" fill="{empty_color}">{e_str}</text>')
    x += empty * cw
    return els, x


def _build_demo_lines(bg, text_color, dim_color, bar_empty_color):
    """Build demo SVG content for a given color scheme.
    Order: [CC update] dir | context | session | weekly | model"""
    width = 950
    height = 86
    cw = 7.8  # tighter for more elements

    lines = [f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">
  <style>
    text {{ font-family: {FONT}; font-size: 13px; }}
  </style>
  <rect width="{width}" height="{height}" fill="{bg}" rx="8" />''']

    sep = (dim_color, " | ")

    def add(color, text, yy):
        nonlocal x
        display = text.replace("&gt;", ">").replace("&lt;", "<")
        lines.append(f'  <text x="{x:.1f}" y="{yy}" fill="{color}">{text}</text>')
        x += len(display) * cw

    # ── Line 1: dir | context 32% | session 18% ⟳ 14:30 | weekly 42% ⟳ mar 27, 00:00 | model ──
    y = 28
    x = PAD_X

    add(dim_color, "CCStatusLine", y)
    add(*sep, y)
    # Context bar 32% green
    bar_els, x = _build_bar(x, y, 5, 10, "#22c55e", bar_empty_color, cw)
    lines.extend(bar_els)
    add(text_color, " 32%", y)
    add(*sep, y)
    # Session: s [bar] 18% ⟳ 14:30
    add(dim_color, "s ", y)
    bar_els, x = _build_bar(x, y, 3, 12, "#22c55e", bar_empty_color, cw)
    lines.extend(bar_els)
    add(text_color, " 18%", y)
    add(dim_color, " \u27f3 14:30", y)
    add(*sep, y)
    # Weekly: w [bar] 42% ⟳ mar 27, 00:00
    add(dim_color, "w ", y)
    bar_els, x = _build_bar(x, y, 6, 9, "#22c55e", bar_empty_color, cw)
    lines.extend(bar_els)
    add(text_color, " 42%", y)
    add(dim_color, " \u27f3 mar 27, 00:00", y)
    add(*sep, y)
    add(dim_color, "Opus 4.6", y)

    # ── Line 2: CC update | dir | context 78% | session 85% | weekly 71% | model ──
    y2 = 56
    x = PAD_X

    add("#a04000", "\u2b06 CC 2.1.81", y2)
    add(dim_color, " ", y2)
    add(dim_color, "CCStatusLine", y2)
    add(*sep, y2)
    # Context 78% yellow
    bar_els, x = _build_bar(x, y2, 12, 3, "#eab308", bar_empty_color, cw)
    lines.extend(bar_els)
    add(text_color, " 78%", y2)
    add(*sep, y2)
    # Session 85% red
    add(dim_color, "s ", y2)
    bar_els, x = _build_bar(x, y2, 13, 2, "#ef4444", bar_empty_color, cw)
    lines.extend(bar_els)
    add(text_color, " 85%", y2)
    add(dim_color, " \u27f3 16:45", y2)
    add(*sep, y2)
    # Weekly 71%
    add(dim_color, "w ", y2)
    bar_els, x = _build_bar(x, y2, 11, 4, "#eab308", bar_empty_color, cw)
    lines.extend(bar_els)
    add(text_color, " 71%", y2)
    add(*sep, y2)
    add(dim_color, "Sonnet 4.6", y2)

    lines.append(svg_footer())
    return "\n".join(lines)


def generate_demo_dark_svg():
    """Dark terminal demo."""
    return _build_demo_lines(
        bg="#1e1e2e",
        text_color="#cdd6f4",
        dim_color="#6c7086",
        bar_empty_color="#45475a",
    )


def generate_demo_light_svg():
    """Light terminal demo."""
    return _build_demo_lines(
        bg="#f5f5f5",
        text_color="#1e1e2e",
        dim_color="#6b7280",
        bar_empty_color="#d1d5db",
    )


if __name__ == "__main__":
    import os
    out_dir = os.path.join(os.path.dirname(__file__))

    with open(os.path.join(out_dir, "demo-dark.svg"), "w", encoding="utf-8") as f:
        f.write(generate_demo_dark_svg())

    with open(os.path.join(out_dir, "demo-light.svg"), "w", encoding="utf-8") as f:
        f.write(generate_demo_light_svg())

    with open(os.path.join(out_dir, "bar-styles.svg"), "w", encoding="utf-8") as f:
        f.write(generate_bar_styles_svg())

    with open(os.path.join(out_dir, "bar-sizes.svg"), "w", encoding="utf-8") as f:
        f.write(generate_bar_sizes_svg())

    with open(os.path.join(out_dir, "themes.svg"), "w", encoding="utf-8") as f:
        f.write(generate_themes_svg())

    print("Generated: demo-dark.svg, demo-light.svg, bar-styles.svg, bar-sizes.svg, themes.svg")
