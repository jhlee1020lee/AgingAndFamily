const fs = require("fs");
const path = require("path");

const {
  parseMarkdownDocument,
  resolveTranslationAlignment,
} = require("./translation_original_reveal");
const {
  buildSentencePairs,
  validateSentencePairs,
} = require("./sentence_alignment");

const ROOT_DIR = path.resolve(__dirname, "..");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function parseArgs(argv) {
  const slugs = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--slug" && argv[index + 1]) {
      slugs.push(argv[index + 1]);
      index += 1;
    }
  }
  return {
    slugs,
    force: argv.includes("--force"),
    promote: argv.includes("--promote"),
  };
}

function loadResolvedReading(slug) {
  const manifest = readJson(path.join(ROOT_DIR, "manifest", "readings.json"));
  const reading = manifest.readings.find((item) => item.slug === slug);
  if (!reading) throw new Error(`Unknown slug: ${slug}`);
  const contentDir = path.join(ROOT_DIR, reading.content_dir);
  const alignmentPath = path.join(contentDir, "translation_alignment.json");
  const alignment = readJson(alignmentPath);
  const translationDocument = parseMarkdownDocument(readText(path.join(contentDir, "translation.md")), {
    skipFirstTitleHeading: true,
    collectFrontmatter: true,
  });
  const originalDocument = parseMarkdownDocument(readText(path.join(contentDir, "full.md")), {
    skipFirstTitleHeading: true,
    collectFrontmatter: true,
  });
  const resolved = resolveTranslationAlignment(alignment, translationDocument, originalDocument, {
    allowedStatuses: ["verified"],
  });
  if (resolved.errors.length) {
    throw new Error(`${slug}: block alignment failed\n  ${resolved.errors.join("\n  ")}`);
  }
  return { alignment, alignmentPath, resolved };
}

function generateSlug(slug, options = {}) {
  const { alignment, alignmentPath, resolved } = loadResolvedReading(slug);
  const rawById = new Map((alignment.entries || []).map((entry) => [entry.id, entry]));
  let generatedPairCount = 0;
  let preservedEntryCount = 0;
  resolved.entries.forEach((entry) => {
    const rawEntry = rawById.get(entry.id);
    if (!rawEntry) throw new Error(`${slug}: missing raw entry ${entry.id}`);
    const existingPairs = Array.isArray(rawEntry.sentence_pairs) ? rawEntry.sentence_pairs : [];
    if (existingPairs.length && !options.force) {
      preservedEntryCount += 1;
      return;
    }
    rawEntry.sentence_alignment_method = "monotonic-length-v1";
    rawEntry.sentence_pairs = buildSentencePairs(
      entry.translationBlock?.text || entry.translationBlock?.plainText || "",
      entry.sourceText,
      entry.id,
      "generated"
    );
    generatedPairCount += rawEntry.sentence_pairs.length;
  });
  alignment.sentence_alignment_version = 1;
  alignment.sentence_alignment_note = "Sentence pairs preserve block order; mismatched sentence counts require human review before promotion.";
  writeJson(alignmentPath, alignment);
  console.log(`[sentence-alignment] ${slug}: ${generatedPairCount} pairs generated, ${preservedEntryCount} entries preserved`);
}

function promoteSlug(slug) {
  const { alignment, alignmentPath, resolved } = loadResolvedReading(slug);
  const rawById = new Map((alignment.entries || []).map((entry) => [entry.id, entry]));
  const errors = [];
  resolved.entries.forEach((entry) => {
    const rawEntry = rawById.get(entry.id);
    const pairs = Array.isArray(rawEntry?.sentence_pairs) ? rawEntry.sentence_pairs : [];
    errors.push(...validateSentencePairs({
      id: entry.id,
      translationText: entry.translationBlock?.text || entry.translationBlock?.plainText || "",
      sourceText: entry.sourceText,
      pairs,
    }, { allowedStatuses: ["generated", "verified"] }));
  });
  if (errors.length) {
    throw new Error(`${slug}: sentence alignment cannot be promoted\n  ${errors.join("\n  ")}`);
  }
  (alignment.entries || []).forEach((entry) => {
    (Array.isArray(entry.sentence_pairs) ? entry.sentence_pairs : []).forEach((pair) => {
      pair.status = "verified";
    });
  });
  alignment.sentence_alignment_reviewed_at = new Date().toISOString();
  alignment.sentence_alignment_status = "verified";
  writeJson(alignmentPath, alignment);
  console.log(`[sentence-alignment] ${slug}: promoted to verified`);
}

if (require.main === module) {
  const options = parseArgs(process.argv.slice(2));
  if (!options.slugs.length) throw new Error("Use --slug <reading-slug>.");
  options.slugs.forEach((slug) => {
    if (options.promote) promoteSlug(slug);
    else generateSlug(slug, options);
  });
}

module.exports = { generateSlug, promoteSlug };
