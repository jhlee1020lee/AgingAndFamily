import argparse
import json
import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
MANIFEST_PATH = ROOT_DIR / "manifest" / "readings.json"


def load_manifest():
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def select_readings(manifest, slug=None):
    readings = manifest["readings"]
    if slug:
        return [reading for reading in readings if reading["slug"] == slug]
    return readings


def normalize_block(block):
    lines = [line.strip() for line in block.splitlines() if line.strip()]
    if not lines:
        return ""
    if lines[0].startswith("## Page "):
        return "\n".join(lines)
    joined = " ".join(lines)
    joined = re.sub(r"\s+", " ", joined).strip()
    return joined


def clean_raw_text(raw_text):
    text = raw_text.replace("\r\n", "\n")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = text.replace("-\n", "")
    blocks = re.split(r"\n{2,}", text)
    cleaned_blocks = [normalize_block(block) for block in blocks]
    cleaned_blocks = [block for block in cleaned_blocks if block]
    return "\n\n".join(cleaned_blocks).strip()


def write_cleaned_markdown(reading, body_text, force=False):
    content_dir = ROOT_DIR / reading["content_dir"]
    output_path = content_dir / "cleaned.md"
    if output_path.exists() and not force:
        return output_path, False

    title = reading["title"]
    source_note = reading["source_pdf"]
    markdown = [
        f"# {title}",
        "",
        f"> Draft cleaned from `{source_note}`",
        "",
        body_text,
        ""
    ]
    output_path.write_text("\n".join(markdown), encoding="utf-8")
    return output_path, True


def parse_args():
    parser = argparse.ArgumentParser(description="Normalize extracted raw PDF text into draft markdown.")
    parser.add_argument("--slug", help="Build only one reading slug.")
    parser.add_argument("--all", action="store_true", help="Process all readings in the manifest.")
    parser.add_argument("--force", action="store_true", help="Overwrite existing cleaned.md files.")
    return parser.parse_args()


def main():
    args = parse_args()
    manifest = load_manifest()

    if not args.all and not args.slug:
        raise SystemExit("Use --all or --slug <reading-slug>.")

    readings = select_readings(manifest, slug=args.slug)
    if not readings:
        raise SystemExit("No readings matched the requested slug.")

    for reading in readings:
        content_dir = ROOT_DIR / reading["content_dir"]
        raw_path = content_dir / "raw.txt"
        if not raw_path.exists():
            print(f"[skip] {reading['slug']}: missing {raw_path.relative_to(ROOT_DIR)}")
            continue

        cleaned = clean_raw_text(raw_path.read_text(encoding="utf-8"))
        output_path, written = write_cleaned_markdown(reading, cleaned, force=args.force)
        action = "wrote" if written else "kept"
        print(f"[{action}] {reading['slug']}: {output_path.relative_to(ROOT_DIR)}")


if __name__ == "__main__":
    main()
