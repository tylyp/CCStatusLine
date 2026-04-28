"""Generate SVG preview images for YetAnotherCCStatusLine README."""

# --- Bar Styles Preview ---

BAR_STYLES = [
    ("classic",  "█", "░"),
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

    rows = len(BAR_STYLES)
    width = 420
    height = PAD_Y * 2 + rows * LINE_H

    lines = [svg_header(width, height)]

    for i, (name, filled_char, empty_char) in enumerate(BAR_STYLES):
        y = PAD_Y + (i + 1) * LINE_H - 6

        label = name.ljust(9)
        lines.append(f'  <text x="{PAD_X}" y="{y}" class="label">{label}</text>')

        bar_x = PAD_X + 9 * CHAR_W + 8
        filled_text = escape(filled_char * filled_count)
        lines.append(f'  <text x="{bar_x}" y="{y}" fill="#22c55e">{filled_text}</text>')

        empty_x = bar_x + filled_count * CHAR_W
        empty_text = escape(empty_char * empty_count)
        lines.append(f'  <text x="{empty_x}" y="{y}" fill="#45475a">{empty_text}</text>')

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

        demos = [(4, 30, low), (10, 65, mid), (13, 90, high)]
        offset = bar_x

        for filled, pct, color in demos:
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
    """Return (elements, end_x) for a progress bar drawn at x,y."""
    els = []
    f_str = "█" * filled
    e_str = "░" * empty
    els.append(f'  <text x="{x:.1f}" y="{y}" fill="{fill_color}">{f_str}</text>')
    x += filled * cw
    els.append(f'  <text x="{x:.1f}" y="{y}" fill="{empty_color}">{e_str}</text>')
    x += empty * cw
    return els, x


def _build_demo_lines(bg, text_color, dim_color, bar_empty_color):
    """Build a 4-line demo, shown as two stacked terminal frames.

    Frame 1 (calm state):
      Line 1: dir | model
      Line 2: ctx <bar> 32% (64k)        — green
      Line 3: 5h  <bar> 18% ⟳ 14:30          — green
      Line 4: 7d  <bar> 42% ⟳ apr 28, 00:00  — green

    Frame 2 (busy state):
      Line 1: \U0001f525 PEAK 16:00-22:00 | ⬆ CC 2.1.85 | dir | model
      Line 2: ctx <bar> 78% (156k)       — yellow
      Line 3: 5h  <bar> 85% ⟳ 16:45          — red (rate-limit warning)
      Line 4: 7d  <bar> 71% ⟳ may 4, 00:00   — yellow
    """
    cw = 7.8
    line_h = 22
    pad_x = 16
    pad_y = 12
    frame_h = pad_y * 2 + line_h * 4
    gap = 14
    width = 720
    height = frame_h * 2 + gap

    lines = [f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">
  <style>
    text {{ font-family: {FONT}; font-size: 13px; }}
  </style>
  <rect width="{width}" height="{frame_h}" fill="{bg}" rx="8" />
  <rect y="{frame_h + gap}" width="{width}" height="{frame_h}" fill="{bg}" rx="8" />''']

    sep = (dim_color, " | ")
    state = {"x": pad_x}

    def add(color, text, yy):
        # Approximate emoji as 1.6 char-widths
        display_len = 0.0
        for ch in text:
            display_len += 1.6 if ord(ch) > 0x2000 else 1.0
        lines.append(f'  <text x="{state["x"]:.1f}" y="{yy}" fill="{color}">{escape(text)}</text>')
        state["x"] += display_len * cw

    def bar(yy, filled, empty, color):
        els, end_x = _build_bar(state["x"], yy, filled, empty, color, bar_empty_color, cw)
        lines.extend(els)
        state["x"] = end_x

    # ── Frame 1: calm ─────────────────────────────────────
    base = pad_y + line_h - 6

    state["x"] = pad_x
    add(dim_color, "YetAnotherCCStatusLine", base)
    add(*sep, base)
    add(dim_color, "Opus 4.7 (1M)", base)

    state["x"] = pad_x
    add(dim_color, "ctx ", base + line_h)
    bar(base + line_h, 5, 10, "#22c55e")
    add(text_color, " 32%", base + line_h)
    add(dim_color, " (64k)", base + line_h)

    state["x"] = pad_x
    add(dim_color, "5h  ", base + line_h * 2)
    bar(base + line_h * 2, 3, 12, "#22c55e")
    add(text_color, " 18%", base + line_h * 2)
    add(dim_color, " ⟳ 14:30", base + line_h * 2)

    state["x"] = pad_x
    add(dim_color, "7d  ", base + line_h * 3)
    bar(base + line_h * 3, 6, 9, "#22c55e")
    add(text_color, " 42%", base + line_h * 3)
    add(dim_color, " ⟳ apr 28, 00:00", base + line_h * 3)

    # ── Frame 2: busy ─────────────────────────────────────
    base = frame_h + gap + pad_y + line_h - 6

    state["x"] = pad_x
    add("#dc2626", "\U0001f525 PEAK", base)
    add(dim_color, " 16:00-22:00", base)
    add(*sep, base)
    add("#a04000", "⬆ CC 2.1.85", base)
    add(*sep, base)
    add(dim_color, "YetAnotherCCStatusLine", base)
    add(*sep, base)
    add(dim_color, "Sonnet 4.7", base)

    state["x"] = pad_x
    add(dim_color, "ctx ", base + line_h)
    bar(base + line_h, 12, 3, "#eab308")
    add(text_color, " 78%", base + line_h)
    add(dim_color, " (156k)", base + line_h)

    state["x"] = pad_x
    add(dim_color, "5h  ", base + line_h * 2)
    bar(base + line_h * 2, 13, 2, "#ef4444")
    add(text_color, " 85%", base + line_h * 2)
    add(dim_color, " ⟳ 16:45", base + line_h * 2)

    state["x"] = pad_x
    add(dim_color, "7d  ", base + line_h * 3)
    bar(base + line_h * 3, 11, 4, "#eab308")
    add(text_color, " 71%", base + line_h * 3)
    add(dim_color, " ⟳ may 4, 00:00", base + line_h * 3)

    lines.append(svg_footer())
    return "\n".join(lines)


def generate_demo_dark_svg():
    return _build_demo_lines(
        bg="#1e1e2e",
        text_color="#cdd6f4",
        dim_color="#6c7086",
        bar_empty_color="#45475a",
    )


def generate_demo_light_svg():
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
