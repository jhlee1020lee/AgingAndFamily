const fs = require("fs");
const path = require("path");

const { createCanvas, loadImage } = require("@napi-rs/canvas");

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
    spec: "",
    inputSubdir: "_page_previews",
    outputSubdir: "figures",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--slug") {
      args.slug = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (token === "--spec") {
      args.spec = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (token === "--input-subdir") {
      args.inputSubdir = argv[index + 1] || args.inputSubdir;
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

function clampCropBox(box, image) {
  const x = Math.max(0, Math.floor(Number(box.x) || 0));
  const y = Math.max(0, Math.floor(Number(box.y) || 0));
  const width = Math.max(1, Math.floor(Number(box.width) || 0));
  const height = Math.max(1, Math.floor(Number(box.height) || 0));
  return {
    x: Math.min(x, image.width - 1),
    y: Math.min(y, image.height - 1),
    width: Math.min(width, image.width - x),
    height: Math.min(height, image.height - y),
  };
}

async function cropRegions({ slug, spec: specArg, inputSubdir, outputSubdir }) {
  const reading = findReading(slug);
  if (!reading) {
    throw new Error(`Unknown reading slug: ${slug}`);
  }

  const contentDir = path.join(ROOT_DIR, reading.content_dir);
  const specPath = specArg
    ? path.resolve(ROOT_DIR, specArg)
    : path.join(contentDir, "figure_crops.json");
  if (!fs.existsSync(specPath)) {
    throw new Error(`Missing crop spec: ${specPath}`);
  }

  const specs = readJson(specPath);
  if (!Array.isArray(specs) || !specs.length) {
    throw new Error(`Crop spec must be a non-empty array: ${specPath}`);
  }

  const inputDir = path.join(contentDir, inputSubdir);
  const outputDir = path.join(contentDir, outputSubdir);
  fs.mkdirSync(outputDir, { recursive: true });

  for (const spec of specs) {
    const sourceName = String(spec.source || "").trim();
    const outputName = String(spec.output || "").trim();
    if (!sourceName || !outputName) {
      throw new Error(`Each crop item needs source and output: ${JSON.stringify(spec)}`);
    }

    const sourcePath = path.join(inputDir, sourceName);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Missing source image: ${sourcePath}`);
    }

    const image = await loadImage(sourcePath);
    const box = clampCropBox(spec, image);
    const canvas = createCanvas(box.width, box.height);
    const context = canvas.getContext("2d");
    context.drawImage(image, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);

    const outputPath = path.join(outputDir, outputName);
    fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));
    console.log(`[cropped] ${path.relative(ROOT_DIR, outputPath)}`);
  }
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    await cropRegions(args);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

void main();
