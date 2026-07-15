#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

from PIL import Image


def main():
    parser = argparse.ArgumentParser(description="Validate that a file is a decodable raster image.")
    parser.add_argument("image")
    args = parser.parse_args()

    path = Path(args.image)
    errors = []
    width = None
    height = None
    mode = None
    image_format = None
    try:
        with Image.open(path) as image:
            width, height = image.size
            mode = image.mode
            image_format = image.format
            image.verify()
        if not width or not height:
            errors.append("image dimensions must be positive")
    except Exception as error:  # Pillow exposes format-specific exception types.
        errors.append(f"Pillow could not decode the raster: {error}")

    report = {
        "ok": not errors,
        "path": str(path.resolve()),
        "width": width,
        "height": height,
        "mode": mode,
        "format": image_format,
        "errors": errors,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
