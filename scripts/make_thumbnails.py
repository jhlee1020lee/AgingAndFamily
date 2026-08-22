import json
import shutil
import subprocess
from html import escape
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
MANIFEST_PATH = ROOT_DIR / "manifest" / "readings.json"
OUTPUT_DIR = ROOT_DIR / "docs"
THUMBNAIL_DIR = OUTPUT_DIR / "assets" / "thumbnails"


def load_manifest():
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def render_with_pymupdf(pdf_path, png_path):
    try:
        import fitz  # type: ignore
    except ImportError:
        return False

    document = fitz.open(pdf_path)
    page = document.load_page(0)
    matrix = fitz.Matrix(1.8, 1.8)
    pixmap = page.get_pixmap(matrix=matrix, alpha=False)
    pixmap.save(str(png_path))
    return png_path.exists()


def render_with_pdftoppm(pdf_path, png_path):
    executable = shutil.which("pdftoppm")
    if not executable:
        return False

    prefix = png_path.with_suffix("")
    try:
        subprocess.run(
            [executable, "-f", "1", "-singlefile", "-png", str(pdf_path), str(prefix)],
            check=True,
            capture_output=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return False
    return png_path.exists()


def render_with_magick(pdf_path, png_path):
    executable = shutil.which("magick")
    if not executable:
        return False

    try:
        subprocess.run(
            [executable, f"{pdf_path}[0]", str(png_path)],
            check=True,
            capture_output=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return False
    return png_path.exists()


def write_placeholder_svg(reading, svg_path):
    slug = escape(reading["slug"])
    title = escape(reading.get("title") or reading["slug"])
    subtitle = escape(reading.get("subtitle") or "Filename-derived placeholder metadata.")
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#17324d" />
      <stop offset="100%" stop-color="#b76e32" />
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)" rx="36" />
  <rect x="56" y="56" width="1168" height="608" fill="rgba(255,255,255,0.08)" rx="28" />
  <text x="84" y="138" fill="#f7f1e8" font-size="36" font-family="'Segoe UI', 'Noto Sans KR', sans-serif">{slug}</text>
  <text x="84" y="248" fill="#ffffff" font-size="74" font-weight="700" font-family="'Segoe UI', 'Noto Sans KR', sans-serif">{title}</text>
  <text x="84" y="330" fill="#e9d9c9" font-size="34" font-family="'Segoe UI', 'Noto Sans KR', sans-serif">{subtitle}</text>
  <text x="84" y="604" fill="#ffffff" font-size="28" font-family="'Segoe UI', 'Noto Sans KR', sans-serif">PDF thumbnail placeholder</text>
</svg>
"""
    svg_path.write_text(svg, encoding="utf-8")


def build_thumbnails():
    manifest = load_manifest()
    THUMBNAIL_DIR.mkdir(parents=True, exist_ok=True)

    results = {}
    for reading in manifest["readings"]:
        pdf_path = ROOT_DIR / reading["source_pdf"]
        png_path = THUMBNAIL_DIR / f"{reading['slug']}.png"
        svg_path = THUMBNAIL_DIR / f"{reading['slug']}.svg"

        rendered = False
        if pdf_path.exists():
            rendered = (
                render_with_pymupdf(pdf_path, png_path)
                or render_with_pdftoppm(pdf_path, png_path)
                or render_with_magick(pdf_path, png_path)
            )

        if rendered:
            results[reading["slug"]] = Path("assets") / "thumbnails" / png_path.name
            continue

        write_placeholder_svg(reading, svg_path)
        results[reading["slug"]] = Path("assets") / "thumbnails" / svg_path.name

    return {slug: path.as_posix() for slug, path in results.items()}


def main():
    for slug, asset_path in build_thumbnails().items():
        print(f"[thumb] {slug}: {asset_path}")


if __name__ == "__main__":
    main()
