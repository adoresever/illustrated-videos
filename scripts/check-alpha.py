#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

from PIL import Image


def inspect_image(path, min_transparent, max_transparent):
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    values = list(alpha.getdata())
    total = len(values)
    transparent = sum(value < 250 for value in values) / total
    fully_transparent = sum(value == 0 for value in values) / total
    opaque = sum(value == 255 for value in values) / total
    corners = [alpha.getpixel((0, 0)), alpha.getpixel((image.width - 1, 0)), alpha.getpixel((0, image.height - 1)), alpha.getpixel((image.width - 1, image.height - 1))]
    errors = []
    if transparent < min_transparent:
        errors.append(f"transparent coverage {transparent:.4f} is below {min_transparent}")
    if transparent > max_transparent:
        errors.append(f"transparent coverage {transparent:.4f} is above {max_transparent}")
    if min(corners) > 16:
        errors.append("no corner is transparent")
    if opaque == 0:
        errors.append("no fully opaque pixels")

    return {
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


def main():
    parser = argparse.ArgumentParser(description="Validate that one or more images are usable alpha layers.")
    parser.add_argument("image", nargs="+")
    parser.add_argument("--min-transparent", type=float, default=0.02)
    parser.add_argument("--max-transparent", type=float, default=0.95)
    args = parser.parse_args()

    paths = [Path(image) for image in args.image]
    if len(paths) == 1:
        report = inspect_image(paths[0], args.min_transparent, args.max_transparent)
        print(json.dumps(report, ensure_ascii=False, indent=2))
        if report["errors"]:
            raise SystemExit(1)
        return

    reports = []
    for path in paths:
        try:
            report = inspect_image(path, args.min_transparent, args.max_transparent)
        except Exception as error:  # Keep one unreadable input from hiding the other batch results.
            report = {
                "ok": False,
                "path": str(path.resolve()),
                "errors": [f"could not inspect image: {error}"],
            }
        reports.append(report)

    failed = sum(not report["ok"] for report in reports)
    aggregate = {
        "ok": failed == 0,
        "summary": {
            "total": len(reports),
            "passed": len(reports) - failed,
            "failed": failed,
        },
        "images": reports,
    }
    print(json.dumps(aggregate, ensure_ascii=False, indent=2))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
