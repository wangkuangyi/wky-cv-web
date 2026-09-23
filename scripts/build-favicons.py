"""Build the site's SVG, PNG and ICO icons (requires Pillow)."""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
NAVY = "#1c3142"
PAPER = "#f1eee6"
POINTS = [(13, 19), (22, 45), (32, 27), (42, 45), (51, 19)]
STROKE = 6


def raster(size):
    # Supersample the same geometry as the SVG to keep tiny diagonals smooth.
    scale = 16
    unit = size * scale / 64
    image = Image.new("RGBA", (size * scale, size * scale))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle(
        (0, 0, size * scale - 1, size * scale - 1),
        radius=14 * unit,
        fill=NAVY,
    )
    points = [(x * unit, y * unit) for x, y in POINTS]
    draw.line(points, fill=PAPER, width=round(STROKE * unit), joint="curve")
    radius = STROKE * unit / 2
    for x, y in points:
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=PAPER)
    return image.resize((size, size), Image.Resampling.LANCZOS)


if __name__ == "__main__":
    coordinates = " ".join(f"{x},{y}" for x, y in POINTS)
    (ROOT / "favicon.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">\n'
        '  <title>WKY</title>\n'
        f'  <rect width="64" height="64" rx="14" fill="{NAVY}"/>\n'
        f'  <polyline points="{coordinates}" fill="none" stroke="{PAPER}" '
        f'stroke-width="{STROKE}" stroke-linecap="round" stroke-linejoin="round"/>\n'
        '</svg>\n',
        encoding="utf-8",
    )
    for size in (16, 32):
        raster(size).save(ROOT / f"favicon-{size}x{size}.png")
    raster(180).save(ROOT / "apple-touch-icon.png")
    raster(512).save(ROOT / "assets" / "wky-icon.png")
    raster(64).save(
        ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
        append_images=[raster(size) for size in (16, 32, 48)],
    )
    print("Built SVG, 16/32 px PNGs, 4-size ICO, 180 px touch icon and 512 px preview.")
