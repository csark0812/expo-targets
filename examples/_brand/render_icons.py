#!/usr/bin/env python3
"""Render the expo-targets example icon family into each package's assets/.

Requires Pillow. Example:
  python3 -m venv /tmp/icon-venv && /tmp/icon-venv/bin/pip install Pillow
  /tmp/icon-venv/bin/python examples/_brand/render_icons.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]

# (package relative to examples/, accent hex)
PACKAGES: list[tuple[str, str]] = [
    ("share", "#2DD4BF"),
    ("action", "#F59E0B"),
    ("clip", "#38BDF8"),
    ("messages", "#4ADE80"),
    ("stickers", "#FB7185"),
    ("widgets", "#A3A3A3"),
    ("kitchen-sink", "#FBBF24"),
    ("native/share", "#14B8A6"),
    ("native/action", "#D97706"),
    ("native/clip", "#0EA5E9"),
]

BG = (20, 20, 24, 255)
WHITE = (245, 245, 247, 255)
SIZE = 1024


def hex_rgba(h: str) -> tuple[int, int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4)) + (255,)  # type: ignore[return-value]


def draw_icon(size: int, accent: tuple[int, int, int, int], *, safe: bool) -> Image.Image:
    """Concentric target + extension slot. Full-bleed square (no baked mask)."""
    img = Image.new("RGBA", (size, size), BG)
    d = ImageDraw.Draw(img)
    cx = cy = size / 2
    scale = 0.78 if safe else 0.86
    r_outer = size * 0.42 * scale

    for factor, stroke_factor in ((1.0, 0.028), (0.68, 0.024), (0.40, 0.022)):
        r = r_outer * factor
        w = max(int(round(size * stroke_factor)), 2)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=accent, width=w)

    r_dot = r_outer * 0.16
    d.ellipse([cx - r_dot, cy - r_dot, cx + r_dot, cy + r_dot], fill=accent)

    # Extension slot: cut SE quadrant, then seat a plug tab.
    slot_w = r_outer * 0.58
    slot_h = r_outer * 0.36
    slot_x0 = cx + r_outer * 0.18
    slot_y0 = cy + r_outer * 0.16
    d.rectangle([slot_x0, slot_y0, slot_x0 + slot_w, slot_y0 + slot_h], fill=BG)

    pad = slot_h * 0.2
    d.rounded_rectangle(
        [
            slot_x0 + pad,
            slot_y0 + pad,
            slot_x0 + slot_w - pad * 0.35,
            slot_y0 + slot_h - pad,
        ],
        radius=max(int(size * 0.02), 2),
        fill=WHITE,
    )
    stripe_h = (slot_h - 2 * pad) * 0.34
    mid_y = slot_y0 + pad + (slot_h - 2 * pad - stripe_h) / 2
    d.rounded_rectangle(
        [slot_x0 + pad * 1.15, mid_y, slot_x0 + slot_w * 0.52, mid_y + stripe_h],
        radius=max(int(size * 0.012), 1),
        fill=accent,
    )
    return img


def splash_from(icon: Image.Image, size: int = SIZE) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    mark = icon.resize((int(size * 0.55), int(size * 0.55)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))
    return canvas


def main() -> None:
    for rel, accent_hex in PACKAGES:
        accent = hex_rgba(accent_hex)
        icon = draw_icon(SIZE, accent, safe=False)
        adaptive = draw_icon(SIZE, accent, safe=True)
        splash = splash_from(icon)

        dest = ROOT / rel / "assets"
        dest.mkdir(exist_ok=True)
        icon.save(dest / "icon.png")
        adaptive.save(dest / "adaptive-icon.png")
        splash.save(dest / "splash-icon.png")
        print(f"wrote {rel} ({accent_hex})")

    # iMessage sticker pack icon: 60×45 pt @3x → 180×135
    stickers_accent = hex_rgba("#FB7185")
    stickers_src = draw_icon(1024, stickers_accent, safe=True)
    sticker_icon = stickers_src.resize((180, 135), Image.Resampling.LANCZOS)
    sticker_dest = ROOT / "stickers/targets/stickers/assets/icon-iphone-60x45@3x.png"
    sticker_dest.parent.mkdir(exist_ok=True)
    sticker_icon.save(sticker_dest)
    print(f"wrote {sticker_dest.relative_to(ROOT)}")
    print("done")


if __name__ == "__main__":
    main()
