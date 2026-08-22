const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const { createCanvas } = require("@napi-rs/canvas");

const ROOT_DIR = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(ROOT_DIR, "manifest", "readings.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function loadManifest() {
  return readJson(MANIFEST_PATH);
}

function findReading(slug) {
  const manifest = loadManifest();
  return manifest.readings.find((reading) => reading.slug === slug) || null;
}

function parseArgs(argv) {
  const args = {
    slug: "",
    pages: "",
    scale: 1.6,
    outputSubdir: "_page_previews",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--slug") {
      args.slug = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (token === "--pages") {
      args.pages = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (token === "--scale") {
      const value = Number(argv[index + 1] || "");
      if (Number.isFinite(value) && value > 0) {
        args.scale = value;
      }
      index += 1;
      continue;
    }
    if (token === "--output-subdir") {
      args.outputSubdir = argv[index + 1] || args.outputSubdir;
      index += 1;
    }
  }

  if (!args.slug) {
    throw new Error("Use --slug <reading-slug>.");
  }

  return args;
}

function expandPageSpec(pageSpec, maxPage) {
  if (!pageSpec.trim()) {
    return Array.from({ length: maxPage }, (_, index) => index + 1);
  }

  const pages = new Set();
  for (const rawPart of pageSpec.split(",")) {
    const part = rawPart.trim();
    if (!part) {
      continue;
    }

    const rangeMatch = part.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      const min = Math.max(1, Math.min(start, end));
      const max = Math.min(maxPage, Math.max(start, end));
      for (let page = min; page <= max; page += 1) {
        pages.add(page);
      }
      continue;
    }

    const page = Number(part);
    if (Number.isInteger(page) && page >= 1 && page <= maxPage) {
      pages.add(page);
    }
  }

  return [...pages].sort((a, b) => a - b);
}

async function getPdfjs() {
  return import("pdfjs-dist/legacy/build/pdf.mjs");
}

class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(Math.ceil(width), Math.ceil(height));
    return {
      canvas,
      context: canvas.getContext("2d"),
    };
  }

  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = Math.ceil(width);
    canvasAndContext.canvas.height = Math.ceil(height);
  }

  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

async function renderPages({ slug, pages: pageSpec, scale, outputSubdir }) {
  const reading = findReading(slug);
  if (!reading) {
    throw new Error(`Unknown reading slug: ${slug}`);
  }

  const pdfPath = path.join(ROOT_DIR, reading.source_pdf);
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`Missing PDF: ${pdfPath}`);
  }

  const pdfjs = await getPdfjs();
  const standardFontDataUrl = `${pathToFileURL(path.join(ROOT_DIR, "node_modules", "pdfjs-dist", "standard_fonts")).href}/`;
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const document = await pdfjs.getDocument({
    data,
    standardFontDataUrl,
    disableFontFace: true,
    useSystemFonts: true,
  }).promise;

  const outputDir = path.join(ROOT_DIR, reading.content_dir, outputSubdir);
  fs.mkdirSync(outputDir, { recursive: true });

  const pages = expandPageSpec(pageSpec, document.numPages);
  if (!pages.length) {
    throw new Error("No valid pages requested.");
  }

  const canvasFactory = new NodeCanvasFactory();

  for (const pageNumber of pages) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const { canvas, context } = canvasFactory.create(viewport.width, viewport.height);
    await page.render({
      canvasContext: context,
      viewport,
      canvasFactory,
    }).promise;

    const outputPath = path.join(outputDir, `page-${String(pageNumber).padStart(2, "0")}.png`);
    fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));
    console.log(`[rendered] ${path.relative(ROOT_DIR, outputPath)}`);
  }
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    await renderPages(args);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

void main();
