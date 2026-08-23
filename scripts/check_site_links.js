const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(ROOT_DIR, "docs");

function parseArgs(argv) {
  const args = { siteDir: "" };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--site-dir") {
      if (!argv[index + 1]) throw new Error("--site-dir requires a directory path");
      args.siteDir = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return args;
}

function walk(dirPath) {
  return fs.readdirSync(dirPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dirPath, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function isExternal(value) {
  return /^(?:[a-z]+:|\/\/)/i.test(value);
}

function idsInHtml(html) {
  return new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => decodeHtml(match[1])));
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const siteDir = args.siteDir ? path.resolve(ROOT_DIR, args.siteDir) : DOCS_DIR;
  if (!fs.existsSync(siteDir) || !fs.statSync(siteDir).isDirectory()) {
    throw new Error(`Site directory does not exist: ${siteDir}`);
  }
  const htmlFiles = walk(siteDir).filter((filePath) => filePath.toLowerCase().endsWith(".html"));
  const htmlCache = new Map(htmlFiles.map((filePath) => [filePath, fs.readFileSync(filePath, "utf8")]));
  const idCache = new Map([...htmlCache].map(([filePath, html]) => [filePath, idsInHtml(html)]));
  const errors = [];
  let localTargetCount = 0;

  htmlCache.forEach((html, filePath) => {
    const relative = path.relative(siteDir, filePath);
    const privatePattern = /(?:source_pdfs\/|recording_stt|stt_final|06_stt_correction|[A-Z]:\\codex\\|chat\s*bot|chatbot|챗봇)/i;
    if (privatePattern.test(html)) errors.push(`${relative}: private/local/chatbot reference leaked into HTML`);
    for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      const raw = decodeHtml(match[1]).trim();
      if (!raw || isExternal(raw) || raw.startsWith("data:")) continue;
      const [rawTarget, rawFragment = ""] = raw.split("#", 2);
      const targetWithoutQuery = rawTarget.split("?", 1)[0];
      let targetPath = targetWithoutQuery ? path.resolve(path.dirname(filePath), targetWithoutQuery) : filePath;
      if (targetWithoutQuery.endsWith("/")) targetPath = path.join(targetPath, "index.html");
      localTargetCount += 1;
      if (!fs.existsSync(targetPath)) {
        errors.push(`${relative}: missing local target ${raw}`);
        continue;
      }
      if (!rawFragment || path.extname(targetPath).toLowerCase() !== ".html") continue;
      let fragment = rawFragment;
      try { fragment = decodeURIComponent(rawFragment); } catch (error) {}
      const ids = idCache.get(targetPath) || idsInHtml(fs.readFileSync(targetPath, "utf8"));
      if (!ids.has(fragment)) errors.push(`${relative}: missing fragment #${fragment} in ${path.relative(siteDir, targetPath)}`);
    }
  });

  if (errors.length) throw new Error(`Site link checks failed\n  ${errors.join("\n  ")}`);
  console.log(`PASS site links (${htmlFiles.length} HTML files, ${localTargetCount} local targets, no private paths or chatbot)`);
}

if (require.main === module) main();

module.exports = { main, parseArgs };
