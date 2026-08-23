const fs = require("fs");
const path = require("path");

const { parseMarkdownDocument } = require("./translation_original_reveal");
const { normalizeSentenceText } = require("./sentence_alignment");

const ROOT_DIR = path.resolve(__dirname, "..");
const SLUG = "martinson-berridge-2015";
const CONTENT_DIR = path.join(ROOT_DIR, "content", "readings", SLUG);
const ALIGNMENT_PATH = path.join(CONTENT_DIR, "translation_alignment.json");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function paragraphBlocks(fileName) {
  const parsed = parseMarkdownDocument(readText(path.join(CONTENT_DIR, fileName)), {
    skipFirstTitleHeading: true,
    collectFrontmatter: true,
  });
  return (parsed.blocks || [])
    .map((block, flatIndex) => ({ ...block, flatIndex }))
    .filter((block) => block.type === "paragraph");
}

function joinPairs(pairs, field) {
  return normalizeSentenceText((pairs || []).map((pair) => pair[field] || "").join(" "));
}

function main() {
  const alignment = readJson(ALIGNMENT_PATH);
  const sourceParagraphs = paragraphBlocks("full.md");
  const translationParagraphs = paragraphBlocks("translation.md");
  const entries = alignment.entries || [];

  if (sourceParagraphs.length !== translationParagraphs.length || entries.length !== sourceParagraphs.length) {
    throw new Error(
      `Paragraph counts differ: source=${sourceParagraphs.length}, translation=${translationParagraphs.length}, entries=${entries.length}`
    );
  }

  const coverageErrors = [];
  entries.forEach((entry, index) => {
    const source = sourceParagraphs[index];
    const translation = translationParagraphs[index];
    const sourceText = normalizeSentenceText(source.text || source.plainText || "");
    const translationText = normalizeSentenceText(translation.text || translation.plainText || "");
    const entrySource = normalizeSentenceText(entry.source_text || sourceText);
    if (entrySource !== sourceText) {
      throw new Error(`${entry.id}: entry source text does not match source paragraph ${source.flatIndex}`);
    }
    if (joinPairs(entry.sentence_pairs, "source_text") !== sourceText) {
      coverageErrors.push(`${entry.id}: sentence-pair source coverage is incomplete`);
    }
    if (joinPairs(entry.sentence_pairs, "ko_text") !== translationText) {
      coverageErrors.push(`${entry.id}: sentence-pair Korean coverage is incomplete`);
    }
    entry.ko_anchor = { flat_index: translation.flatIndex, block_type: "paragraph" };
    entry.en_anchor = { flat_index: source.flatIndex, block_type: "paragraph" };
  });

  if (coverageErrors.length) {
    throw new Error(`Sentence-pair coverage failed:\n  ${coverageErrors.join("\n  ")}`);
  }
  fs.writeFileSync(ALIGNMENT_PATH, `${JSON.stringify(alignment, null, 2)}\n`, "utf8");
  console.log(`[updated] ${path.relative(ROOT_DIR, ALIGNMENT_PATH)} (${entries.length} verified anchors; sentence pairs preserved)`);
}

main();
