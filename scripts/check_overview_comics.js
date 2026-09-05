const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const requireBuilt = process.argv.includes("--require-built");
const MAX_PANEL_BYTES = 250000;
const MAX_READING_BYTES = 600000;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function count(value, pattern) {
  return [...String(value || "").matchAll(pattern)].length;
}

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function webpDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    throw new Error("not a WebP file");
  }
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const type = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (type === "VP8X" && size >= 10) {
      return { width: readUInt24LE(buffer, data + 4) + 1, height: readUInt24LE(buffer, data + 7) + 1 };
    }
    if (type === "VP8 " && size >= 10 && buffer[data + 3] === 0x9d && buffer[data + 4] === 0x01 && buffer[data + 5] === 0x2a) {
      return { width: buffer.readUInt16LE(data + 6) & 0x3fff, height: buffer.readUInt16LE(data + 8) & 0x3fff };
    }
    if (type === "VP8L" && size >= 5 && buffer[data] === 0x2f) {
      const bits = buffer.readUInt32LE(data + 1);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    offset = data + size + (size % 2);
  }
  throw new Error("unsupported WebP bitstream");
}

const manifest = readJson(path.join(rootDir, "manifest", "readings.json"));
const readings = Array.isArray(manifest.readings) ? manifest.readings : [];
const errors = [];
let panelCount = 0;
let captionCount = 0;
let assetBytes = 0;

if (!readings.length) errors.push("manifest must contain at least one reading");
if (new Set(readings.map((reading) => reading.slug)).size !== readings.length) errors.push("manifest contains duplicate reading slugs");

for (const reading of readings) {
  const slug = reading.slug;
  const contentDir = path.join(rootDir, reading.content_dir);
  const comicPath = path.join(contentDir, "overview_comic.json");
  if (!fs.existsSync(comicPath)) {
    errors.push(`${slug}: missing overview_comic.json`);
    continue;
  }
  let comic;
  try {
    comic = readJson(comicPath);
  } catch (error) {
    errors.push(`${slug}: invalid overview_comic.json (${error.message})`);
    continue;
  }
  const panels = Array.isArray(comic.panels) ? comic.panels : [];
  if (panels.length !== 4) errors.push(`${slug}: expected 4 panels, found ${panels.length}`);
  panelCount += panels.length;
  let readingBytes = 0;
  const imagePaths = new Set();
  const imageHashes = new Set();
  panels.forEach((panel, index) => {
    const prefix = `${slug} panel ${index + 1}`;
    if (Object.prototype.hasOwnProperty.call(panel, "dialogues")) errors.push(`${prefix}: retired dialogues field remains`);
    if (typeof panel.caption !== "string" || !panel.caption.trim()) errors.push(`${prefix}: missing caption`);
    else captionCount += 1;
    if (panel.width !== 900 || panel.height !== 900) errors.push(`${prefix}: metadata must be 900x900`);
    const image = typeof panel.image === "string" ? panel.image.replace(/\\/g, "/") : "";
    if (path.posix.extname(image).toLowerCase() !== ".webp") errors.push(`${prefix}: image must be WebP`);
    if (imagePaths.has(image)) errors.push(`${prefix}: reuses image path ${image}`);
    imagePaths.add(image);
    const imagePath = path.resolve(contentDir, ...image.split("/"));
    if (!fs.existsSync(imagePath)) {
      errors.push(`${prefix}: missing image ${image}`);
      return;
    }
    const bytes = fs.statSync(imagePath).size;
    readingBytes += bytes;
    assetBytes += bytes;
    if (bytes > MAX_PANEL_BYTES) errors.push(`${prefix}: image exceeds 250 KB (${bytes} bytes)`);
    try {
      const dimensions = webpDimensions(imagePath);
      if (dimensions.width !== 900 || dimensions.height !== 900) {
        errors.push(`${prefix}: actual image is ${dimensions.width}x${dimensions.height}, expected 900x900`);
      }
      const hash = crypto.createHash("sha256").update(fs.readFileSync(imagePath)).digest("hex");
      if (imageHashes.has(hash)) errors.push(`${prefix}: duplicates another panel image`);
      imageHashes.add(hash);
    } catch (error) {
      errors.push(`${prefix}: cannot read image dimensions (${error.message})`);
    }
  });
  if (readingBytes > MAX_READING_BYTES) errors.push(`${slug}: comic assets exceed 600 KB (${readingBytes} bytes)`);

  if (requireBuilt) {
    const htmlPath = path.join(rootDir, "docs", "readings", slug, "index.html");
    if (!fs.existsSync(htmlPath)) {
      errors.push(`${slug}: missing built landing page`);
    } else {
      const html = fs.readFileSync(htmlPath, "utf8");
      if (count(html, /class="overview-comic-panel"/g) !== 4) errors.push(`${slug}: built page does not contain 4 comic panels`);
      if (count(html, /class="overview-comic-caption"/g) !== 4) errors.push(`${slug}: built page does not contain 4 captions`);
      if (/overview-comic-(?:dialogues|bubble|speaker|label|notes|limit|evidence)/.test(html)) errors.push(`${slug}: built panel contains text beyond its caption`);
      if (html.includes('class="points-list"')) errors.push(`${slug}: built page still contains the old point list`);
    }
  }
}

const expectedPanels = readings.length * 4;
const expectedCaptions = readings.length * 4;
if (panelCount !== expectedPanels) errors.push(`site total: expected ${expectedPanels} panels, found ${panelCount}`);
if (captionCount !== expectedCaptions) errors.push(`site total: expected ${expectedCaptions} captions, found ${captionCount}`);

console.log(`Overview comics: ${readings.length} readings, ${panelCount} panels, ${captionCount} captions, ${assetBytes} bytes`);
if (errors.length) {
  errors.forEach((error) => console.error(`ERROR ${error}`));
  process.exitCode = 1;
} else {
  console.log("Overview comic check passed.");
}
