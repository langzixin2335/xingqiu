from pathlib import Path
from collections import deque
from PIL import Image

DIR = Path(r"d:\laopo\frontend\public\images\avatar")
THRESHOLD = 42


def is_bg(px):
    r, g, b, a = px
    if a < 8:
        return True
    return r <= THRESHOLD and g <= THRESHOLD and b <= THRESHOLD


def remove_black_bg(path: Path):
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    pix = im.load()
    visited = [[False] * w for _ in range(h)]
    q = deque()

    def try_enqueue(x, y):
        if x < 0 or y < 0 or x >= w or y >= h or visited[y][x]:
            return
        if not is_bg(pix[x, y]):
            return
        visited[y][x] = True
        q.append((x, y))

    for x in range(w):
        try_enqueue(x, 0)
        try_enqueue(x, h - 1)
    for y in range(h):
        try_enqueue(0, y)
        try_enqueue(w - 1, y)

    cleared = 0
    while q:
        x, y = q.popleft()
        pix[x, y] = (0, 0, 0, 0)
        cleared += 1
        try_enqueue(x + 1, y)
        try_enqueue(x - 1, y)
        try_enqueue(x, y + 1)
        try_enqueue(x, y - 1)

    # Soften fringe next to cleared pixels
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            if a == 0:
                continue
            if r <= 55 and g <= 55 and b <= 55:
                near = False
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and pix[nx, ny][3] == 0:
                        near = True
                        break
                if near:
                    pix[x, y] = (r, g, b, 0)

    im.save(path, optimize=True)
    return cleared, w, h


def main():
    for p in sorted(DIR.glob("*.png")):
        try:
            n, w, h = remove_black_bg(p)
            print(f"OK {p.name} cleared={n} size={w}x{h}")
        except Exception as e:
            print(f"FAIL {p.name}: {e}")

    img = Path(r"d:\laopo\frontend\public\images")
    for key in ("wood", "fire", "earth", "metal", "water"):
        src = DIR / f"sailor-{key}-portrait.png"
        if src.exists():
            Image.open(src).save(img / f"goddess-{key}.png")
    print("DONE")


if __name__ == "__main__":
    main()
