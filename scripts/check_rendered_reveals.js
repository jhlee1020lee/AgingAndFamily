const fs = require("fs");
const path = require("path");

const {
  parseMarkdownDocument,
  resolveTranslationAlignment,
  sourceTextForEntry,
} = require("./translation_original_reveal");

const ROOT_DIR = path.resolve(__dirname, "..");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function normalize(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlText(value) {
  return String(value || "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
}

function renderedRevealText(html, id) {
  const sectionPattern = new RegExp(
    `<section\\b[^>]*\\bid="${escapeRegExp(id)}"[^>]*>([\\s\\S]*?)<\\/section>`
  );
  const sectionMatch = html.match(sectionPattern);
  if (!sectionMatch) return "";
  const bodyMatch = sectionMatch[1].match(
    /<div class="[^"]*\bsource-reveal-body\b[^"]*"[^>]*>\s*<p>([\s\S]*?)<\/p>\s*<\/div>/
  );
  return bodyMatch ? normalize(decodeHtmlText(bodyMatch[1])) : "";
}

function checkSlug(slug) {
  const manifest = readJson(path.join(ROOT_DIR, "manifest", "readings.json"));
  const reading = manifest.readings.find((item) => item.slug === slug);
  if (!reading) throw new Error(`Unknown slug: ${slug}`);

  const contentDir = path.join(ROOT_DIR, reading.content_dir);
  const fullText = readText(path.join(contentDir, "full.md"));
  const translationText = readText(path.join(contentDir, "translation.md"));
  const alignment = readJson(path.join(contentDir, "translation_alignment.json"));
  const html = readText(path.join(ROOT_DIR, "docs", "readings", slug, "translation.html"));
  const originalDocument = parseMarkdownDocument(fullText, {
    skipFirstTitleHeading: true,
    collectFrontmatter: true,
  });
  const translationDocument = parseMarkdownDocument(translationText, {
    skipFirstTitleHeading: true,
    collectFrontmatter: true,
  });
  const resolved = resolveTranslationAlignment(
    alignment,
    translationDocument,
    originalDocument,
    { allowedStatuses: ["verified"] }
  );
  const errors = [...resolved.errors];
  const verifiedEntries = (alignment.entries || []).filter(
    (entry) => String(entry?.status || "verified").trim() === "verified"
  );
  const rawById = new Map(verifiedEntries.map((entry) => [entry.id, entry]));
  const originalBlockCounts = new Map();
  resolved.entries.forEach((entry) => {
    const flatIndex = entry.originalBlock?.flatIndex;
    originalBlockCounts.set(flatIndex, (originalBlockCounts.get(flatIndex) || 0) + 1);
  });

  resolved.entries.forEach((entry) => {
    const rawEntry = rawById.get(entry.id);
    if (!rawEntry) {
      errors.push(`${entry.id}: resolved entry is missing from alignment payload`);
      return;
    }
    const explicitSource = normalize(sourceTextForEntry(rawEntry));
    if (explicitSource || originalBlockCounts.get(entry.originalBlock?.flatIndex) === 1) {
      const declared = explicitSource || normalize(entry.originalBlock?.plainText);
      if (normalize(entry.sourceText) !== declared) {
        errors.push(`${entry.id}: a unique source anchor was altered during reveal resolution`);
      }
    }
    const rendered = renderedRevealText(html, entry.id);
    if (!rendered) {
      errors.push(`${entry.id}: rendered reveal body is missing`);
    } else if (rendered !== normalize(entry.sourceText)) {
      errors.push(`${entry.id}: rendered reveal text does not match resolved source text`);
    }
  });

  if (resolved.entries.length !== verifiedEntries.length) {
    errors.push(`resolved entry count mismatch: expected ${verifiedEntries.length}, found ${resolved.entries.length}`);
  }
  if (errors.length) {
    throw new Error(`${slug}\n  ${errors.join("\n  ")}`);
  }
  console.log(`PASS ${slug} (${resolved.entries.length}/${verifiedEntries.length} rendered reveals)`);
}

function parseSlugs(argv) {
  const slugs = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--slug" && argv[index + 1]) {
      slugs.push(argv[index + 1]);
      index += 1;
    }
  }
  return slugs;
}

if (require.main === module) {
  const slugs = parseSlugs(process.argv.slice(2));
  if (!slugs.length) {
    throw new Error("Use --slug <reading-slug>.");
  }
  slugs.forEach(checkSlug);
}

module.exports = { checkSlug };
