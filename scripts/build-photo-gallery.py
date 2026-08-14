#!/usr/bin/env python3
"""Build web-ready gallery assets and EXIF data from camera originals.

The originals are read-only inputs. Generated WebP files intentionally omit GPS
and other source metadata; only selected display fields are written to the JS
manifest consumed by the static personal page.
"""

from __future__ import annotations

import argparse
import json
import math
import re
from datetime import datetime
from pathlib import Path
from typing import Any

from PIL import ExifTags, Image, ImageOps


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = PROJECT_ROOT.parent / "web photo" / "life" / "Best"
DEFAULT_OUTPUT = PROJECT_ROOT / "assets" / "photos" / "life" / "best"
DEFAULT_MANIFEST = PROJECT_ROOT / "assets" / "photos" / "gallery-data.js"
SUPPORTED = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"}
DEFAULT_CAMERA = "FUJIFILM X-H2"

# The order is editorial rather than alphabetical: light to dark, with related
# seascape and wind-power images kept near one another.
CURATED_ORDER = [
    "DSCF7154.JPG",
    "DSCF7540.JPG",
    "DSCF0723.JPG",
    "DSCF9157.JPG",
    "DSCF7950.JPG",
    "9dbb6ecef329c627fd57142b9d9ed010.jpg",
    "432a3dd78e579b0b85a9beee110f29bd.jpg",
]


def clean_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).replace("\x00", "").strip()
    return text or None


def number(value: Any) -> float | None:
    try:
        result = float(value)
        return result if math.isfinite(result) else None
    except (TypeError, ValueError, ZeroDivisionError):
        return None


def format_number(value: float | None, digits: int = 1) -> str | None:
    if value is None:
        return None
    rounded = round(value, digits)
    return str(int(rounded)) if rounded.is_integer() else f"{rounded:g}"


def format_shutter(value: Any) -> str | None:
    seconds = number(value)
    if not seconds or seconds <= 0:
        return None
    if seconds >= 1:
        return f"{format_number(seconds, 1)}s"
    denominator = round(1 / seconds)
    return f"1/{denominator}s"


def normalize_date(value: Any) -> tuple[str | None, str | None]:
    raw = clean_text(value)
    if not raw:
        return None, None
    for pattern in ("%Y:%m:%d %H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            parsed = datetime.strptime(raw, pattern)
            return parsed.isoformat(), parsed.strftime("%Y.%m.%d")
        except ValueError:
            pass
    return None, None


def extract_exif(image: Image.Image) -> dict[str, Any]:
    exif = image.getexif()
    base = {ExifTags.TAGS.get(key, str(key)): value for key, value in exif.items()}
    detail: dict[str, Any] = {}
    try:
        exif_ifd = exif.get_ifd(ExifTags.IFD.Exif)
        detail = {ExifTags.TAGS.get(key, str(key)): value for key, value in exif_ifd.items()}
    except (KeyError, TypeError, ValueError):
        pass
    merged = {**base, **detail}

    captured_at, date_label = normalize_date(merged.get("DateTimeOriginal"))
    make = clean_text(merged.get("Make"))
    model = clean_text(merged.get("Model"))
    camera = " ".join(part for part in (make, model) if part) or None
    focal = number(merged.get("FocalLength"))
    focal_35 = number(merged.get("FocalLengthIn35mmFilm"))
    aperture = number(merged.get("FNumber"))
    iso = number(merged.get("PhotographicSensitivity") or merged.get("ISOSpeedRatings"))

    return {
        "capturedAt": captured_at,
        "dateLabel": date_label,
        "camera": camera,
        "lens": clean_text(merged.get("LensModel")),
        "focalLength": f"{format_number(focal)}mm" if focal else None,
        "focalLength35mm": f"{format_number(focal_35)}mm eq." if focal_35 else None,
        "aperture": f"f/{format_number(aperture)}" if aperture else None,
        "shutter": format_shutter(merged.get("ExposureTime")),
        "iso": f"ISO {int(round(iso))}" if iso else None,
    }


def slugify(stem: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", stem).strip("-").lower()
    return slug or "photo"


def save_webp(image: Image.Image, path: Path, max_size: tuple[int, int], quality: int) -> tuple[int, int]:
    output = image.copy()
    output.thumbnail(max_size, Image.Resampling.LANCZOS)
    icc_profile = image.info.get("icc_profile")
    save_args = {"format": "WEBP", "quality": quality, "method": 6}
    if icc_profile:
        save_args["icc_profile"] = icc_profile
    output.save(path, **save_args)
    return output.size


def build(source: Path, output: Path, manifest: Path, camera_fallback: str | None) -> list[dict[str, Any]]:
    if not source.is_dir():
        raise SystemExit(f"Photo source does not exist: {source}")
    order = {name.lower(): index for index, name in enumerate(CURATED_ORDER)}
    originals = sorted(
        (path for path in source.iterdir() if path.is_file() and path.suffix.lower() in SUPPORTED),
        key=lambda path: (order.get(path.name.lower(), len(order)), path.name.lower()),
    )
    if not originals:
        raise SystemExit(f"No supported photos found in: {source}")

    output.mkdir(parents=True, exist_ok=True)
    manifest.parent.mkdir(parents=True, exist_ok=True)
    photos: list[dict[str, Any]] = []
    used_names: set[str] = set()

    for index, original in enumerate(originals, start=1):
        base = slugify(original.stem)
        slug = base
        suffix = 2
        while slug in used_names:
            slug = f"{base}-{suffix}"
            suffix += 1
        used_names.add(slug)

        with Image.open(original) as source_image:
            exif = extract_exif(source_image)
            if not exif["camera"] and camera_fallback:
                exif["camera"] = camera_fallback
                exif["cameraSource"] = "user-confirmed"
            image = ImageOps.exif_transpose(source_image).convert("RGB")
            display_path = output / f"{slug}-display.webp"
            thumb_path = output / f"{slug}-thumb.webp"
            display_size = save_webp(image, display_path, (2400, 2400), 84)
            thumb_size = save_webp(image, thumb_path, (1000, 1200), 78)

        photo = {
            "id": f"best-{index:02d}",
            "collection": "life-best",
            "sequence": index,
            "title": f"精选 / {index:02d}",
            "alt": f"王匡义的生活摄影精选，第 {index} 张",
            "sourceName": original.name,
            "src": f"../assets/photos/life/best/{display_path.name}",
            "thumb": f"../assets/photos/life/best/{thumb_path.name}",
            "width": display_size[0],
            "height": display_size[1],
            "thumbWidth": thumb_size[0],
            "thumbHeight": thumb_size[1],
            "orientation": "portrait" if display_size[1] > display_size[0] else "landscape",
            "exif": exif,
        }
        photos.append(photo)
        print(f"[{index:02d}/{len(originals):02d}] {original.name} -> {display_path.name}")

    payload = {
        "version": 1,
        "generatedAt": datetime.now().astimezone().isoformat(timespec="seconds"),
        "source": "web photo/life/Best",
        "collection": {"id": "life-best", "title": "精选", "count": len(photos)},
        "photos": photos,
    }
    manifest.write_text(
        "window.PHOTO_GALLERY = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(f"Manifest: {manifest}")
    return photos


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build optimized personal gallery assets from camera originals.")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE, help="Directory containing source photos")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Directory for generated WebP files")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST, help="Generated gallery-data.js path")
    parser.add_argument(
        "--camera-fallback",
        default=DEFAULT_CAMERA,
        help="Camera shown when an edited file no longer contains camera EXIF",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    build(args.source.resolve(), args.output.resolve(), args.manifest.resolve(), args.camera_fallback)
