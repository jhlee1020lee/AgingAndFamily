import argparse
import json
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


def extract_with_pymupdf(pdf_path):
    try:
        import fitz  # type: ignore
    except ImportError:
        return None, "PyMuPDF not installed"

    document = fitz.open(pdf_path)
    pages = []
    for index, page in enumerate(document, start=1):
        page_text = page.get_text("text").strip()
        pages.append(f"## Page {index}\n\n{page_text}")
    return "\n\n".join(pages).strip(), "PyMuPDF"


def extract_with_pypdf(pdf_path):
    try:
        from pypdf import PdfReader  # type: ignore
    except ImportError:
        return None, "pypdf not installed"

    reader = PdfReader(str(pdf_path))
    pages = []
    for index, page in enumerate(reader.pages, start=1):
        page_text = (page.extract_text() or "").strip()
        pages.append(f"## Page {index}\n\n{page_text}")
    return "\n\n".join(pages).strip(), "pypdf"


def extract_text(pdf_path):
    for extractor in (extract_with_pymupdf, extract_with_pypdf):
        text, engine = extractor(pdf_path)
        if text:
            return text, engine
    return None, "No supported PDF text extractor found"


def write_raw_text(reading, text, engine, force=False):
    content_dir = ROOT_DIR / reading["content_dir"]
    content_dir.mkdir(parents=True, exist_ok=True)
    output_path = content_dir / "raw.txt"
    if output_path.exists() and not force:
        return output_path, False

    header = [
        f"Title: {reading['title']}",
        f"Source PDF: {reading['source_pdf']}",
        f"Extractor: {engine}",
        ""
    ]
    output_path.write_text("\n".join(header) + text + "\n", encoding="utf-8")
    return output_path, True


def parse_args():
    parser = argparse.ArgumentParser(description="Extract raw text from local PDFs into reading folders.")
    parser.add_argument("--slug", help="Build only one reading slug.")
    parser.add_argument("--all", action="store_true", help="Process all readings in the manifest.")
    parser.add_argument("--force", action="store_true", help="Overwrite existing raw.txt files.")
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
        pdf_path = ROOT_DIR / reading["source_pdf"]
        if not pdf_path.exists():
            print(f"[skip] {reading['slug']}: missing PDF at {pdf_path}")
            continue

        text, engine = extract_text(pdf_path)
        if not text:
            print(f"[skip] {reading['slug']}: {engine}")
            continue

        output_path, written = write_raw_text(reading, text, engine, force=args.force)
        action = "wrote" if written else "kept"
        print(f"[{action}] {reading['slug']}: {output_path.relative_to(ROOT_DIR)} via {engine}")


if __name__ == "__main__":
    main()
