const fs = require("fs");
const path = require("path");

const {
  parseMarkdownDocument,
  resolveTranslationAlignment,
  sourceTextForEntry,
} = require("./translation_original_reveal");
const { validateSentencePairs } = require("./sentence_alignment");

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

function normalizeRenderedExpectation(value) {
  return normalize(String(value || "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1")
    // Treat underscores as emphasis only at text boundaries. The previous
    // pattern also stripped literal underscores embedded in bare URLs (for
    // example `PI_2017..._FINAL.pdf`), producing false reveal mismatches.
    .replace(/(?<![A-Za-z0-9/])_([^_\n]+)_(?![A-Za-z0-9])/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"));
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

function renderedSentencePairs(html, id) {
  const sectionPattern = new RegExp(
    `<section\\b[^>]*\\bid="${escapeRegExp(id)}"[^>]*>([\\s\\S]*?)<\\/section>`
  );
  const sectionMatch = html.match(sectionPattern);
  if (!sectionMatch) return [];
  return [...sectionMatch[1].matchAll(/<button\b([^>]*)\bdata-source-sentence(?:="")?([^>]*)>/g)].map((match) => {
    const attrs = `${match[1]} ${match[2]}`;
    const value = (name) => {
      const attrMatch = attrs.match(new RegExp(`\\b${escapeRegExp(name)}="([^"]*)"`));
      return attrMatch ? normalize(decodeHtmlText(attrMatch[1])) : "";
    };
    return {
      id: value("data-pair-id"),
      status: "verified",
      ko_text: value("data-translation-text"),
      source_text: value("data-source-text"),
    };
  });
}

function checkSlug(slug, options = {}) {
  const manifest = readJson(path.join(ROOT_DIR, "manifest", "readings.json"));
  const reading = manifest.readings.find((item) => item.slug === slug);
  if (!reading) throw new Error(`Unknown slug: ${slug}`);

  const contentDir = path.join(ROOT_DIR, reading.content_dir);
  const fullText = readText(path.join(contentDir, "full.md"));
  const translationText = readText(path.join(contentDir, "translation.md"));
  const alignment = readJson(path.join(contentDir, "translation_alignment.json"));
  const siteDir = options.siteDir || path.join(ROOT_DIR, "docs");
  const html = readText(path.join(siteDir, "readings", slug, "translation.html"));
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
    } else if (rendered !== normalizeRenderedExpectation(entry.sourceText)) {
      errors.push(`${entry.id}: rendered reveal text does not match resolved source text`);
    }
    const rawPairs = Array.isArray(rawEntry.sentence_pairs) ? rawEntry.sentence_pairs : [];
    errors.push(...validateSentencePairs({
      id: entry.id,
      translationText: entry.translationBlock?.text || entry.translationBlock?.plainText || "",
      sourceText: entry.sourceText,
      pairs: rawPairs,
    }, { allowedStatuses: ["verified"] }));
    const renderedPairs = renderedSentencePairs(html, entry.id);
    if (renderedPairs.length !== rawPairs.length) {
      errors.push(`${entry.id}: rendered sentence pair count mismatch (expected ${rawPairs.length}, found ${renderedPairs.length})`);
    } else {
      rawPairs.forEach((pair, index) => {
        const actual = renderedPairs[index];
        if (normalize(actual.id) !== normalize(pair.id)) errors.push(`${entry.id}: rendered pair ${index + 1} id mismatch`);
        if (normalize(actual.ko_text) !== normalize(pair.ko_text)) errors.push(`${entry.id}: rendered pair ${index + 1} Korean text mismatch`);
        if (normalize(actual.source_text) !== normalize(pair.source_text)) errors.push(`${entry.id}: rendered pair ${index + 1} source text mismatch`);
      });
      errors.push(...validateSentencePairs({
        id: `${entry.id} rendered`,
        translationText: entry.translationBlock?.text || entry.translationBlock?.plainText || "",
        sourceText: entry.sourceText,
        pairs: renderedPairs,
      }, { allowedStatuses: ["verified"] }));
    }
  });

  if (resolved.entries.length !== verifiedEntries.length) {
    errors.push(`resolved entry count mismatch: expected ${verifiedEntries.length}, found ${resolved.entries.length}`);
  }
  if (errors.length) {
    throw new Error(`${slug}\n  ${errors.join("\n  ")}`);
  }
  const sentencePairCount = verifiedEntries.reduce((sum, entry) => sum + (Array.isArray(entry.sentence_pairs) ? entry.sentence_pairs.length : 0), 0);
  console.log(`PASS ${slug} (${resolved.entries.length}/${verifiedEntries.length} block reveals, ${sentencePairCount} sentence reveals)`);
}

function parseArgs(argv) {
  const slugs = [];
  let siteDir = path.join(ROOT_DIR, "docs");
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--slug" && argv[index + 1]) {
      slugs.push(argv[index + 1]);
      index += 1;
    } else if (argv[index] === "--site-dir" && argv[index + 1]) {
      siteDir = path.resolve(ROOT_DIR, argv[index + 1]);
      index += 1;
    }
  }
  const relative = path.relative(ROOT_DIR, siteDir);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("--site-dir must identify a non-root directory inside the project.");
  }
  return { slugs, siteDir };
}

if (require.main === module) {
  const { slugs, siteDir } = parseArgs(process.argv.slice(2));
  if (!slugs.length) {
    throw new Error("Use --slug <reading-slug>.");
  }
  slugs.forEach((slug) => checkSlug(slug, { siteDir }));
}

module.exports = { checkSlug };
