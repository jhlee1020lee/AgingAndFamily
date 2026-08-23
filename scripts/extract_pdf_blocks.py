import argparse
import json
from pathlib import Path

import fitz


ROOT_DIR = Path(__file__).resolve().parent.parent


def load_reading(slug: str) -> dict:
    manifest = json.loads((ROOT_DIR / "manifest" / "readings.json").read_text(encoding="utf-8"))
    for reading in manifest.get("readings", []):
        if reading.get("slug") == slug:
            return reading
    raise SystemExit(f"Unknown reading slug: {slug}")


def normalized_block_text(value: str) -> str:
    return value.replace("\r\n", "\n").strip()


def extract_blocks(reading: dict) -> dict:
    pdf_path = ROOT_DIR / reading["source_pdf"]
    document = fitz.open(pdf_path)
    pages = []
    for page_index, page in enumerate(document, start=1):
        blocks = []
        for block_index, block in enumerate(page.get_text("blocks")):
            x0, y0, x1, y1, text, block_no, block_type = block[:7]
            text = normalized_block_text(text)
            if not text:
                continue
            blocks.append(
                {
                    "block_index": block_index,
                    "bbox": [round(x0, 2), round(y0, 2), round(x1, 2), round(y1, 2)],
                    "block_no": block_no,
                    "block_type": block_type,
                    "word_count": len(text.split()),
                    "text": text,
                }
            )
        lines = []
        text_dict = page.get_text("dict")
        for block_index, block in enumerate(text_dict.get("blocks", [])):
            if block.get("type") != 0:
                continue
            for line_index, line in enumerate(block.get("lines", [])):
                spans = line.get("spans", [])
                text = "".join(span.get("text", "") for span in spans).strip()
                if not text:
                    continue
                first_span = spans[0] if spans else {}
                lines.append(
                    {
                        "block_index": block_index,
                        "line_index": line_index,
                        "bbox": [round(value, 2) for value in line.get("bbox", (0, 0, 0, 0))],
                        "font": first_span.get("font", ""),
                        "size": round(float(first_span.get("size", 0)), 2),
                        "flags": int(first_span.get("flags", 0)),
                        "text": text,
                    }
                )
        pages.append(
            {
                "page": page_index,
                "width": page.rect.width,
                "height": page.rect.height,
                "blocks": blocks,
                "lines": lines,
            }
        )
    return {
        "slug": reading["slug"],
        "source_pdf": reading["source_pdf"],
        "page_count": len(pages),
        "pages": pages,
    }


def render_markdown(payload: dict) -> str:
    lines = [f"# PDF blocks: {payload['slug']}", ""]
    for page in payload["pages"]:
        lines.extend([f"## Page {page['page']}", ""])
        for block in page["blocks"]:
            bbox = ", ".join(str(value) for value in block["bbox"])
            lines.extend(
                [
                    f"<!-- block {block['block_index']} | bbox {bbox} | {block['word_count']} words -->",
                    "",
                    block["text"],
                    "",
                ]
            )
    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract positioned PDF text blocks for source reconstruction QA.")
    parser.add_argument("--slug", required=True)
    parser.add_argument("--output-dir", default="tmp/pdf_blocks")
    args = parser.parse_args()

    reading = load_reading(args.slug)
    payload = extract_blocks(reading)
    output_dir = (ROOT_DIR / args.output_dir).resolve()
    if ROOT_DIR not in output_dir.parents:
        raise SystemExit("Output directory must stay inside the project.")
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / f"{args.slug}.json"
    markdown_path = output_dir / f"{args.slug}.md"
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    markdown_path.write_text(render_markdown(payload), encoding="utf-8")
    block_count = sum(len(page["blocks"]) for page in payload["pages"])
    print(f"[written] {json_path.relative_to(ROOT_DIR)} and {markdown_path.relative_to(ROOT_DIR)} ({block_count} blocks)")


if __name__ == "__main__":
    main()
