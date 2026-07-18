"""从边缘洪水填充去除近白背景，保留人物（含白手套/白领）。"""
from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

from PIL import Image


def is_near_white(r: int, g: int, b: int, a: int, threshold: int = 232) -> bool:
    if a < 8:
        return True
    return r >= threshold and g >= threshold and b >= threshold and min(r, g, b) >= threshold - 8


def remove_bg_edge_flood(im: Image.Image, threshold: int = 232) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    bg = [[False] * h for _ in range(w)]
    q: deque[tuple[int, int]] = deque()

    def try_push(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= w or y >= h or bg[x][y]:
            return
        r, g, b, a = px[x, y]
        if not is_near_white(r, g, b, a, threshold):
            return
        bg[x][y] = True
        q.append((x, y))

    for x in range(w):
        try_push(x, 0)
        try_push(x, h - 1)
    for y in range(h):
        try_push(0, y)
        try_push(w - 1, y)

    while q:
        x, y = q.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            try_push(nx, ny)

    out = im.copy()
    out_px = out.load()
    for x in range(w):
        for y in range(h):
            if not bg[x][y]:
                continue
            r, g, b, a = px[x, y]
            # 边缘半透明抗锯齿
            whiteness = (r + g + b) / 3 / 255
            if whiteness > 0.92:
                out_px[x, y] = (r, g, b, 0)
            else:
                alpha = max(0, min(255, int((1 - whiteness) * 255 * 1.8)))
                out_px[x, y] = (r, g, b, alpha)
    return out


def soft_fringe(im: Image.Image) -> Image.Image:
    """对透明边缘附近的近白像素再削一层，减少白边。"""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    for x in range(w):
        for y in range(h):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if r > 245 and g > 245 and b > 245:
                # 若邻域有透明，则削掉白边
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] == 0:
                        px[x, y] = (r, g, b, 0)
                        break
    return im


def process(src: Path, dst: Path) -> None:
    im = Image.open(src)
    out = soft_fringe(remove_bg_edge_flood(im))
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst, "PNG")
    print(f"OK {src.name} -> {dst}")


def main() -> None:
    if len(sys.argv) < 3:
        print("usage: remove_white_bg.py <src_dir_or_file> <dst_dir>")
        sys.exit(1)
    src = Path(sys.argv[1])
    dst_dir = Path(sys.argv[2])
    files = [src] if src.is_file() else sorted(src.glob("*.png"))
    for f in files:
        process(f, dst_dir / f.name)


if __name__ == "__main__":
    main()
