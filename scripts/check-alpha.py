#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

from PIL import Image


def main():
    parser = argparse.ArgumentParser(description="Validate that an image is a usable alpha layer.")
    parser.add_argument("image")
    parser.add_argument("--min-transparent", type=float, default=0.02)
    parser.add_argument("--max-transparent", type=float, default=0.95)
    args = parser.parse_args()

    path = Path(args.image)
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    values = list(alpha.getdata())
    total = len(values)
    transparent = sum(value < 250 for value in values) / total
    fully_transparent = sum(value == 0 for value in values) / total
    opaque = sum(value == 255 for value in values) / total
    corners = [alpha.getpixel((0, 0)), alpha.getpixel((image.width - 1, 0)), alpha.getpixel((0, image.height - 1)), alpha.getpixel((image.width - 1, image.height - 1))]
    errors = []
    if transparent < args.min_transparent:
        errors.append(f"transparent coverage {transparent:.4f} is below {args.min_transparent}")
    if transparent > args.max_transparent:
        errors.append(f"transparent coverage {transparent:.4f} is above {args.max_transparent}")
    if min(corners) > 16:
        errors.append("no corner is transparent")
    if opaque == 0:
        errors.append("no fully opaque pixels")

    report = {
        "ok": not errors,
        "path": str(path.resolve()),
        "width": image.width,
        "height": image.height,
        "transparentRatio": transparent,
        "fullyTransparentRatio": fully_transparent,
        "opaqueRatio": opaque,
        "cornerAlpha": corners,
        "errors": errors,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
