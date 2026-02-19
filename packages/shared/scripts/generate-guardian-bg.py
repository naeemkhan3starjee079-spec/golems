#!/usr/bin/env python3
"""Generate guardian golem watermark PNG for iTerm2 background.

Renders the guardian art as a small watermark in the top-right corner of a
large transparent canvas. Text identity is handled by iTerm2 badge (fixed
size, survives split-screen). This script only renders the art.

Usage:
  python3 generate-guardian-bg.py [dim] [font_size]
  python3 generate-guardian-bg.py 0.8 20    # default settings
  python3 generate-guardian-bg.py 0.6 18    # dimmer, smaller

Output: ~/.config/ralphtools/guardian-bg.png
"""

import os
import sys
from PIL import Image, ImageDraw, ImageFont

# Guardian art (matches GUARDIAN_ART_FULL from ascii-mascots.ts)
# Hebrew letters reversed for correct RTL reading: ת מ א = אמת (Emet/Truth)
ART_LINES = [
    "         ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄",
    "       ▄██▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓██▄",
    "     ▄██▓░░░░░░░░░░░░░░░░░░░░░░░░▓██▄",
    "    ███▓░░░┌──────────────────┐░░░▓███",
    "    ███▓░░░│    ת   מ   א     │░░░▓███",
    "    ███▓░░░└──────────────────┘░░░▓███",
    "    ███▓░░░░░░░░░░░░░░░░░░░░░░░░░░▓███",
    "   ████▓░░░░■■■■░░░░░░░░░░■■■■░░░░▓████",
    "   ████▓░░░░■◆◆■░░░░░░░░░░■◆◆■░░░░▓████",
    "   ████▓░░░░■■■■░░░░░░░░░░■■■■░░░░▓████",
    "    ███▓░░░░░░░░░░░░░░░░░░░░░░░░░░▓███",
    "    ███▓░░░░╔════════════════╗░░░░▓███",
    "    ███▓░░░░║     { ·· }     ║░░░░▓███",
    "    ███▓░░░░╚════════════════╝░░░░▓███",
    "    ███▓░░░░░░░░░░░░░░░░░░░░░░░░░░▓███",
    "     ███▓░░░░░░░░░░░░░░░░░░░░░░░░▓███",
    "      ▀██▓░░░░░░░░░░░░░░░░░░░░░░▓██▀",
    "       ▀██▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓██▀",
    "    ╔══▀██████████████████████████▀══╗",
    "    ║░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░║",
    "    ╚════════════════════════════════╝",
    "                   ◇◇",
]

# Color palette (from ascii-mascots.ts GUARDIAN_COLORS)
COLORS = {
    "clay": (196, 120, 60),
    "dark_clay": (160, 96, 48),
    "accent": (139, 115, 85),
    "outline": (110, 85, 48),
    "glow": (255, 176, 32),
}

HEBREW_CHARS = set("אמת")
GLOW_CHARS = set("◆{}")
ACCENT_CHARS = set("╔╗╚╝║═┌┐└┘─│╠╣◇··")
CLAY_CHARS = set("▒▓█▄▀░■")


def get_char_color(ch: str) -> tuple:
    if ch in HEBREW_CHARS or ch in GLOW_CHARS:
        return COLORS["glow"]
    elif ch in ACCENT_CHARS:
        return COLORS["accent"]
    elif ch in CLAY_CHARS:
        return COLORS["clay"]
    elif ch.strip() == "":
        return (0, 0, 0)
    else:
        return COLORS["outline"]


def load_font(paths: list, size: int):
    for fp in paths:
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size=size)
            except Exception:
                continue
    return ImageFont.load_default()


def generate_guardian_png(
    output_path: str,
    dim: float = 0.8,
    font_size: int = 20,
):
    """Render guardian art as a watermark in the top-right. Text handled by badge."""

    # Monospace font for art (block chars, box-drawing)
    art_font = load_font([
        "/System/Library/Fonts/Menlo.ttc",
        "/System/Library/Fonts/SFMono-Regular.otf",
        "/Library/Fonts/SF-Mono-Regular.otf",
        "/System/Library/Fonts/Monaco.ttf",
    ], font_size)

    # Hebrew-capable font for ת מ א (Menlo/Pillow can't render Hebrew)
    hebrew_font = load_font([
        "/Library/Fonts/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
    ], font_size)

    # Measure character cell — terminal chars are ~55% as wide as tall
    bbox = art_font.getbbox("█")
    char_h = int((bbox[3] - bbox[1]) * 1.15)
    char_w = int(char_h * 0.55)

    max_line_len = max(len(line) for line in ART_LINES)
    art_w = max_line_len * char_w
    art_h = len(ART_LINES) * char_h

    # Canvas: 16:9 aspect ratio matching typical monitors
    canvas_w = 3840
    canvas_h = 2160

    # Position in top-right with generous margin
    margin_right = int(canvas_w * 0.05)
    margin_top = int(canvas_h * 0.04)
    art_x = canvas_w - art_w - margin_right
    art_y = margin_top

    # Transparent background
    img = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw guardian art
    for row, line in enumerate(ART_LINES):
        for col, ch in enumerate(line):
            if ch == " ":
                continue
            r, g, b = get_char_color(ch)
            alpha = max(10, int(255 * dim))
            rgba = (int(r * dim), int(g * dim), int(b * dim), alpha)
            x = art_x + col * char_w
            y = art_y + row * char_h
            font = hebrew_font if ch in HEBREW_CHARS else art_font
            draw.text((x, y), ch, fill=rgba, font=font)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, "PNG")
    print(f"Generated: {output_path} ({canvas_w}x{canvas_h}, guardian art only)")


if __name__ == "__main__":
    dim = float(sys.argv[1]) if len(sys.argv) > 1 else 0.8
    font_size = int(sys.argv[2]) if len(sys.argv) > 2 else 20
    output = sys.argv[3] if len(sys.argv) > 3 else os.path.expanduser(
        "~/.config/ralphtools/guardian-bg.png"
    )
    generate_guardian_png(output, dim=dim, font_size=font_size)
