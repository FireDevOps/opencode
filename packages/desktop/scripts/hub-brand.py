#!/usr/bin/env python3
"""[AoG] Hub brand asset generator.

Regenerates every Hub logo/icon/favicon/background from one geometric mark
(rounded square + H bars + hub node) in AoG purple, so future tweaks only
touch the constants below. Run:  python packages/desktop/scripts/hub-brand.py

Outputs:
  packages/desktop/icons/{dev,beta,prod}/  icon set (ico, icns, pngs, dock)
  packages/desktop/resources/icons/        same set (mirrors copy-icons.ts)
  packages/ui/src/assets/favicon/          v3 favicon set + web manifest PNGs
  packages/desktop/src/renderer/assets/    hub-background.png (in-app backdrop)
"""
from __future__ import annotations

import os
import shutil

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DESKTOP = os.path.join(ROOT, "packages", "desktop")
UI_FAVICON = os.path.join(ROOT, "packages", "ui", "src", "assets", "favicon")
RENDERER_ASSETS = os.path.join(DESKTOP, "src", "renderer", "assets")

BG_TOP = (13, 11, 20)      # near-black violet
BG_BOTTOM = (26, 20, 38)
H_BAR = (242, 239, 255)    # near-white
NODE = (138, 123, 184)     # AoG purple bright
TEXT_DIM = (160, 150, 180)


def rounded_bg(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    top = Image.new("RGBA", (size, 1), BG_TOP + (255,))
    bottom = Image.new("RGBA", (size, 1), BG_BOTTOM + (255,))
    grad = Image.new("RGBA", (size, size))
    for y in range(size):
        t = y / max(size - 1, 1)
        grad.paste(Image.new("RGBA", (size, 1), tuple(
            round(top.getpixel((0, 0))[i] * (1 - t) + bottom.getpixel((0, 0))[i] * t)
            for i in range(3)) + (255,)), (0, y))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=255)
    img.paste(grad, (0, 0), mask)
    return img


def draw_mark(img: Image.Image) -> Image.Image:
    s = img.size[0]
    d = ImageDraw.Draw(img)
    u = s / 20.0  # 20-unit grid like the SVG mark
    bar = 2.6 * u
    # H bars
    d.rectangle([5 * u, 5 * u, (5 + 2.6) * u, 15 * u], fill=H_BAR)
    d.rectangle([(15 - 2.6) * u, 5 * u, 15 * u, 15 * u], fill=H_BAR)
    d.rectangle([5 * u, (10 - 1.1) * u, 15 * u, (10 + 1.1) * u], fill=H_BAR)
    # hub node
    r = 2.3 * u
    d.ellipse([10 * u - r, 10 * u - r, 10 * u + r, 10 * u + r], fill=NODE)
    return img


def master(size: int = 1024) -> Image.Image:
    return draw_mark(rounded_bg(size))


def save_png(img: Image.Image, path: str, size: int) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.resize((size, size), Image.LANCZOS).save(path)


def main() -> None:
    m = master(1024)

    channel_dirs = [os.path.join(DESKTOP, "icons", c) for c in ("dev", "beta", "prod")]
    res_icons = os.path.join(DESKTOP, "resources", "icons")
    for d in channel_dirs + [res_icons]:
        save_png(m, os.path.join(d, "icon.png"), 512)
        for name, size in (("32x32.png", 32), ("64x64.png", 64), ("128x128.png", 128),
                           ("128x128@2x.png", 256), ("dock.png", 256)):
            save_png(m, os.path.join(d, name), size)
        m.save(os.path.join(d, "icon.ico"), sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
        m.save(os.path.join(d, "icon.icns"), sizes=[(16, 16), (32, 32), (64, 64), (128, 128), (256, 256), (512, 512), (1024, 1024)])
        print("icons ->", d)

    # Shared web/favicon set (v3 = Hub).
    save_png(m, os.path.join(UI_FAVICON, "favicon-96x96-v3.png"), 96)
    save_png(m, os.path.join(UI_FAVICON, "apple-touch-icon-v3.png"), 180)
    m.save(os.path.join(UI_FAVICON, "favicon-v3.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
    save_png(m, os.path.join(UI_FAVICON, "web-app-manifest-192x192.png"), 192)
    save_png(m, os.path.join(UI_FAVICON, "web-app-manifest-512x512.png"), 512)
    with open(os.path.join(UI_FAVICON, "favicon-v3.svg"), "w", encoding="utf-8") as f:
        f.write(HUB_SVG)
    print("favicons ->", UI_FAVICON)

    # Social share + in-app backdrop.
    os.makedirs(RENDERER_ASSETS, exist_ok=True)
    social = background(1200, 630, watermark=0.16)
    d = ImageDraw.Draw(social)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 150)
        small = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 44)
    except OSError:
        font = small = ImageFont.load_default()
    mark = master(300)
    social.alpha_composite(mark, (120, 165))
    d.text((470, 230), "[AoG] Hub", font=font, fill=(242, 239, 255, 255))
    d.text((472, 400), "AI coding agent for developers", font=small, fill=TEXT_DIM + (255,))
    social.convert("RGB").save(os.path.join(UI_FAVICON, "social-share.png"))
    print("social ->", UI_FAVICON)

    bg = background(1920, 1080, watermark=0.10)
    bg.save(os.path.join(RENDERER_ASSETS, "hub-background.png"))
    print("backdrop ->", RENDERER_ASSETS)


def background(w: int, h: int, watermark: float) -> Image.Image:
    from math import sqrt
    img = Image.new("RGBA", (w, h), BG_TOP + (255,))
    px = img.load()
    cx1, cy1, r1 = w * 0.18, h * 0.22, min(w, h) * 0.55
    cx2, cy2, r2 = w * 0.85, h * 0.80, min(w, h) * 0.60
    for y in range(0, h, 2):
        t = y / h
        base = tuple(round(BG_TOP[i] * (1 - t) + BG_BOTTOM[i] * t) for i in range(3))
        for x in range(0, w, 2):
            d1 = sqrt((x - cx1) ** 2 + (y - cy1) ** 2) / r1
            d2 = sqrt((x - cx2) ** 2 + (y - cy2) ** 2) / r2
            glow = max(0.0, 1 - d1) ** 2 * 46 + max(0.0, 1 - d2) ** 2 * 34
            px[x, y] = tuple(min(255, round(base[j] + glow * (NODE[j] / 255))) for j in range(3)) + (255,)
            px[x + 1, y] = px[x, y]
            if y + 1 < h:
                px[x, y + 1] = px[x, y]
                px[x + 1, y + 1] = px[x, y]
    if watermark > 0:
        size = int(min(w, h) * 0.9)
        wm = master(size)
        alpha = wm.getchannel("A").point(lambda a: int(a * watermark))
        wm.putalpha(alpha)
        img.alpha_composite(wm, (int(w / 2 - size / 2), int(h / 2 - size / 2)))
    return img


HUB_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">
  <rect x="1" y="1" width="18" height="18" rx="4.4" fill="#171226"/>
  <path d="M5 5h2.6v10H5zM12.4 5H15v10h-2.6zM5 8.9h10v2.2H5z" fill="#F2EFFF"/>
  <circle cx="10" cy="10" r="2.3" fill="#8A7BB8"/>
</svg>
"""

if __name__ == "__main__":
    main()
