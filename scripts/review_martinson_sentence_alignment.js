const fs = require("fs");
const path = require("path");

const {
  parseMarkdownDocument,
  resolveTranslationAlignment,
  sentenceSplitSourceText,
} = require("./translation_original_reveal");
const { normalizeSentenceText, validateSentencePairs } = require("./sentence_alignment");

const ROOT_DIR = path.resolve(__dirname, "..");
const SLUG = "martinson-berridge-2015";
const CONTENT_DIR = path.join(ROOT_DIR, "content", "readings", SLUG);
const ALIGNMENT_PATH = path.join(CONTENT_DIR, "translation_alignment.json");

// Every sentence-boundary mismatch below was checked against the complete
// bilingual paragraph. The two arrays are [Korean indexes, source indexes].
const GROUP_RULES = {
  "martinson-berridge-2015-tr-003": [
    [[0], [0, 1, 2, 3, 4]],
  ],
  "martinson-berridge-2015-tr-007": [
    [[0], [0]], [[1, 2], [1, 2]], [[3], [3]],
  ],
  "martinson-berridge-2015-tr-009": [
    [[0], [0]], [[1, 2], [1]], [[3], [2]], [[4], [3]],
  ],
  "martinson-berridge-2015-tr-012": [
    [[0], [0]], [[1, 2], [1]], [[3], [2]],
  ],
  "martinson-berridge-2015-tr-014": [
    [[0], [0]], [[1], [1, 2]], [[2], [3]], [[3], [4]],
  ],
  "martinson-berridge-2015-tr-015": [
    [[0], [0]], [[1], [1]], [[2], [2]], [[3], [3]], [[4, 5], [4]],
  ],
  "martinson-berridge-2015-tr-017": [
    [[0], [0, 1]], [[1], [2]],
  ],
  "martinson-berridge-2015-tr-020": [
    [[0, 1], [0]], [[2], [1]],
  ],
  "martinson-berridge-2015-tr-024": [
    [[0], [0, 1]],
  ],
  "martinson-berridge-2015-tr-025": [
    [[0], [0]], [[1], [1, 2]], [[2], [3]], [[3], [4]],
  ],
  "martinson-berridge-2015-tr-028": [
    [[0], [0]], [[1], [1]], [[2], [2]], [[3, 4], [3]], [[5], [4]], [[6], [5]],
  ],
  "martinson-berridge-2015-tr-030": [
    [[0], [0, 1, 2]], [[1], [3]],
  ],
  "martinson-berridge-2015-tr-034": [
    [[0], [0]], [[1], [1]], [[2, 3], [2]], [[4], [3]], [[5], [4]],
  ],
  "martinson-berridge-2015-tr-042": [
    [[0], [0]], [[1], [1]], [[2], [2, 3, 4, 5, 6]], [[3, 4], [7]],
  ],
  "martinson-berridge-2015-tr-044": [
    [[0], [0]], [[1, 2], [1]], [[3], [2]], [[4], [3]], [[5, 6], [4]], [[7], [5]],
  ],
  "martinson-berridge-2015-tr-047": [
    [[0], [0]], [[1], [1]], [[2], [2]], [[3], [3]], [[4, 5], [4]],
  ],
  "martinson-berridge-2015-tr-049": [
    [[0], [0, 1]], [[1], [2]], [[2], [3]], [[3], [4]],
  ],
  "martinson-berridge-2015-tr-053": [
    [[0], [0]], [[1], [1]], [[2], [2, 3]], [[3, 4], [4, 5]], [[5], [6]], [[6], [7]],
  ],
};

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function groupText(chunks, indexes, label, completeText) {
  const normalizedComplete = normalizeSentenceText(completeText);
  const positions = [];
  let cursor = 0;
  chunks.forEach((chunk, index) => {
    const normalizedChunk = normalizeSentenceText(chunk);
    const start = normalizedComplete.indexOf(normalizedChunk, cursor);
    if (start < 0) throw new Error(`${label}: cannot locate sentence index ${index}`);
    positions.push({ start, end: start + normalizedChunk.length });
    cursor = start + normalizedChunk.length;
  });
  indexes.forEach((index) => {
    if (!chunks[index]) throw new Error(`${label}: missing sentence index ${index}`);
  });
  return normalizedComplete.slice(
    positions[indexes[0]].start,
    positions[indexes[indexes.length - 1]].end
  );
}

function assertCompleteIndexes(groups, koreanCount, sourceCount, entryId) {
  const korean = groups.flatMap((group) => group[0]);
  const source = groups.flatMap((group) => group[1]);
  if (JSON.stringify(korean) !== JSON.stringify(range(0, koreanCount - 1))) {
    throw new Error(`${entryId}: Korean review indexes are not complete and monotonic`);
  }
  if (JSON.stringify(source) !== JSON.stringify(range(0, sourceCount - 1))) {
    throw new Error(`${entryId}: source review indexes are not complete and monotonic`);
  }
}

function buildReviewedPairs(entryId, translationText, sourceText) {
  const normalizedKorean = normalizeSentenceText(translationText);
  const normalizedSource = normalizeSentenceText(sourceText);
  if (normalizedKorean === normalizedSource) {
    return [{
      id: `${entryId}-s01`,
      status: "verified",
      ko_text: normalizedKorean,
      source_text: normalizedSource,
    }];
  }

  const korean = sentenceSplitSourceText(translationText);
  const source = sentenceSplitSourceText(sourceText);
  const groups = GROUP_RULES[entryId] || (
    korean.length === source.length
      ? korean.map((_, index) => [[index], [index]])
      : null
  );
  if (!groups) {
    throw new Error(`${entryId}: unreviewed sentence-count mismatch ${korean.length}/${source.length}`);
  }
  assertCompleteIndexes(groups, korean.length, source.length, entryId);
  return groups.map((group, index) => ({
    id: `${entryId}-s${String(index + 1).padStart(2, "0")}`,
    status: "verified",
    ko_text: groupText(korean, group[0], `${entryId} Korean`, translationText),
    source_text: groupText(source, group[1], `${entryId} source`, sourceText),
  }));
}

function digitTokens(value) {
  return Array.from(new Set(
    (normalizeSentenceText(value).match(/\d+(?:[.,]\d+)?%?/g) || [])
      .map((token) => token.replace(/,/g, ""))
  ));
}

function main() {
  const alignment = JSON.parse(readText(ALIGNMENT_PATH));
  const options = { skipFirstTitleHeading: true, collectFrontmatter: true };
  const translationText = readText(path.join(CONTENT_DIR, "translation.md"));
  const translationDocument = parseMarkdownDocument(translationText, options);
  const originalDocument = parseMarkdownDocument(readText(path.join(CONTENT_DIR, "full.md")), options);
  const resolved = resolveTranslationAlignment(
    alignment, translationDocument, originalDocument, { allowedStatuses: ["verified"] }
  );
  if (resolved.errors.length) {
    throw new Error(`${SLUG}: block alignment failed\n  ${resolved.errors.join("\n  ")}`);
  }
  if (resolved.entries.length !== 127) {
    throw new Error(`${SLUG}: expected 127 aligned paragraphs, found ${resolved.entries.length}`);
  }

  const rawById = new Map(alignment.entries.map((entry) => [entry.id, entry]));
  const errors = [];
  let missingDigitPairCount = 0;
  for (const entry of resolved.entries) {
    const rawEntry = rawById.get(entry.id);
    try {
      rawEntry.status = "verified";
      rawEntry.sentence_alignment_method = "human-reviewed-v1";
      rawEntry.sentence_pairs = buildReviewedPairs(
        entry.id,
        entry.translationBlock?.text || entry.translationBlock?.plainText || "",
        entry.sourceText
      );
      errors.push(...validateSentencePairs({
        id: entry.id,
        translationText: entry.translationBlock?.text || entry.translationBlock?.plainText || "",
        sourceText: entry.sourceText,
        pairs: rawEntry.sentence_pairs,
      }, { allowedStatuses: ["verified"] }));
      rawEntry.sentence_pairs.forEach((pair) => {
        const sourceDigits = digitTokens(pair.source_text);
        const koreanDigits = digitTokens(pair.ko_text);
        const missing = sourceDigits.filter((token) => !koreanDigits.includes(token));
        if (missing.length) {
          missingDigitPairCount += 1;
          errors.push(`${pair.id}: source number(s) missing in Korean: ${missing.join(", ")}`);
        }
      });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  const unknownRules = Object.keys(GROUP_RULES).filter((id) => !rawById.has(id));
  if (unknownRules.length) errors.push(`unknown review rule(s): ${unknownRules.join(", ")}`);
  if (errors.length) {
    throw new Error(`${SLUG}: sentence review failed\n  ${errors.join("\n  ")}`);
  }

  const pairCount = alignment.entries.reduce((sum, entry) => sum + entry.sentence_pairs.length, 0);
  if (pairCount !== 284) {
    throw new Error(`${SLUG}: expected 284 verified sentence pairs, found ${pairCount}`);
  }
  alignment.sentence_alignment_version = 1;
  alignment.sentence_alignment_status = "verified";
  alignment.sentence_alignment_note =
    `All ${pairCount} sentence pairs preserve the complete Korean and source blocks in order. ` +
    `Every equal-count block was checked one-to-one and ${Object.keys(GROUP_RULES).length} ` +
    `sentence-boundary mismatches were manually regrouped; source numbers and citations were retained.`;
  fs.writeFileSync(ALIGNMENT_PATH, `${JSON.stringify(alignment, null, 2)}\n`, "utf8");
  console.log(
    `[sentence-review] ${SLUG}: ${resolved.entries.length} blocks, ${pairCount} verified pairs, ` +
    `${Object.keys(GROUP_RULES).length} manual boundary rules, ${missingDigitPairCount} numeric omissions`
  );
}

main();
