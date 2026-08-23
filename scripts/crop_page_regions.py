"""Crop exact figure/table regions from rendered PDF page PNGs.

The JSON crop specification uses the same core fields as the existing Node
utility (source, output, x, y, width, height) and optionally accepts
``rotate`` in clockwise degrees.  Pillow keeps this fallback independent of
the JavaScript canvas dependency used by the regular site toolchain.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


ROOT_DIR = Path(__file__).resolve().parent.parent


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--spec", required=True, help="Crop JSON path, relative to the repository root")
    parser.add_argument("--input-dir", required=True, help="Rendered page directory, relative to the repository root")
    parser.add_argument("--output-dir", required=True, help="Output directory, relative to the repository root")
    return parser.parse_args()


def resolve_repo_path(value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else ROOT_DIR / path


def main() -> None:
    args = parse_args()
    spec_path = resolve_repo_path(args.spec)
    input_dir = resolve_repo_path(args.input_dir)
    output_dir = resolve_repo_path(args.output_dir)
    specs = json.loads(spec_path.read_text(encoding="utf-8-sig"))
    if not isinstance(specs, list) or not specs:
        raise ValueError(f"Crop spec must be a non-empty list: {spec_path}")

    output_dir.mkdir(parents=True, exist_ok=True)
    for spec in specs:
        source = input_dir / str(spec["source"])
        output = output_dir / str(spec["output"])
        x = int(spec["x"])
        y = int(spec["y"])
        width = int(spec["width"])
        height = int(spec["height"])
        if min(x, y) < 0 or min(width, height) < 1:
            raise ValueError(f"Invalid crop box: {spec}")

        with Image.open(source) as page:
            right = min(page.width, x + width)
            bottom = min(page.height, y + height)
            if x >= right or y >= bottom:
                raise ValueError(f"Crop lies outside {source}: {spec}")
            cropped = page.crop((x, y, right, bottom))
            clockwise = int(spec.get("rotate", 0)) % 360
            if clockwise:
                cropped = cropped.rotate(-clockwise, expand=True)
            cropped.save(output, format="PNG", optimize=True)

        relative = output.relative_to(ROOT_DIR)
        print(f"[cropped] {relative.as_posix()}")


if __name__ == "__main__":
    main()
