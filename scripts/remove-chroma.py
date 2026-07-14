#!/usr/bin/env python3
import argparse
import math
import statistics
from pathlib import Path

from PIL import Image


def parse_key(value: str, image: Image.Image):
    if value != "auto":
        text = value.lstrip("#")
        if len(text) != 6:
            raise ValueError("--key must be auto or a six-digit hex color")
        return tuple(int(text[i : i + 2], 16) for i in (0, 2, 4))

    rgb = image.convert("RGB")
    width, height = rgb.size
    band = max(2, min(width, height) // 80)
    samples = []
    for y in range(height):
        for x in range(width):
            if x < band or x >= width - band or y < band or y >= height - band:
                samples.append(rgb.getpixel((x, y)))
    return tuple(int(statistics.median(channel)) for channel in zip(*samples))


def despill_pixel(rgb, key, alpha):
    r, g, b = rgb
    strength = max(0.0, min(1.0, (255 - alpha) / 255))
    dominant = max(range(3), key=lambda index: key[index])
    if dominant == 1 and key[1] > key[0] * 1.25 and key[1] > key[2] * 1.25:
        target = max(r, b) + 12
        g = round(g + (min(g, target) - g) * strength)
    elif key[0] > key[1] * 1.2 and key[2] > key[1] * 1.2:
        target = g + 18
        r = round(r + (min(r, target) - r) * strength)
        b = round(b + (min(b, target) - b) * strength)
    return (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)))


def main():
    parser = argparse.ArgumentParser(description="Remove a flat chroma-key background into alpha.")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--key", default="auto")
    parser.add_argument("--transparent-threshold", type=float, default=20.0)
    parser.add_argument("--opaque-threshold", type=float, default=125.0)
    parser.add_argument("--despill", action="store_true")
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGBA")
    key = parse_key(args.key, source)
    low = args.transparent_threshold
    high = max(low + 1, args.opaque_threshold)
    output = Image.new("RGBA", source.size)
    pixels = []

    for r, g, b, _ in source.getdata():
        distance = math.sqrt((r - key[0]) ** 2 + (g - key[1]) ** 2 + (b - key[2]) ** 2)
        if distance <= low:
            alpha = 0
        elif distance >= high:
            alpha = 255
        else:
            t = (distance - low) / (high - low)
            alpha = round((t * t * (3 - 2 * t)) * 255)
        rgb = despill_pixel((r, g, b), key, alpha) if args.despill else (r, g, b)
        pixels.append((*rgb, alpha))

    output.putdata(pixels)
    destination = Path(args.output)
    destination.parent.mkdir(parents=True, exist_ok=True)
    output.save(destination)
    print(f"key=#{key[0]:02x}{key[1]:02x}{key[2]:02x}")
    print(destination.resolve())


if __name__ == "__main__":
    main()
