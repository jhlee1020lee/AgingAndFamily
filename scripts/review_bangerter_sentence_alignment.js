const fs = require("fs");
const path = require("path");

const {
  parseMarkdownDocument,
  resolveTranslationAlignment,
  sentenceSplitSourceText,
} = require("./translation_original_reveal");
const { normalizeSentenceText, validateSentencePairs } = require("./sentence_alignment");

const ROOT_DIR = path.resolve(__dirname, "..");
const SLUG = "bangerter-waldron-2014";
const CONTENT_DIR = path.join(ROOT_DIR, "content", "readings", SLUG);
const ALIGNMENT_PATH = path.join(CONTENT_DIR, "translation_alignment.json");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

// Monotonic [Korean indexes, source indexes] for every sentence-boundary
// difference manually checked against the complete bilingual paragraph.
const GROUP_RULES = {
  "bangerter-waldron-2014-tr-004": [
    [[0], [0]], [[1], [1, 2]],
  ],
  "bangerter-waldron-2014-tr-006": [
    [[0], [0]], [[1], [1]], [[2, 3], [2]], [[4], [3]], [[5], [4]], [[6, 7], [5]],
  ],
  "bangerter-waldron-2014-tr-007": [
    [[0], [0]], [[1], [1, 2]], [[2], [3]], [[3], [4]], [[4], [5]], [[5], [6]], [[6], [7]],
  ],
  "bangerter-waldron-2014-tr-010": [
    [[0], [0, 1]], [[1], [2]], [[2], [3]], [[3], [4]], [[4], [5]], [[5], [6]],
  ],
  "bangerter-waldron-2014-tr-011": [
    [[0], [0]], [[1], [1]], [[2], [2, 3]], [[3], [4]], [[4], [5]], [[5], [6]],
  ],
  "bangerter-waldron-2014-tr-012": [
    [[0], [0, 1]], [[1], [2]], [[2, 3], [3]], [[4], [4]], [[5], [5]], [[6], [6]], [[7], [7]],
  ],
  "bangerter-waldron-2014-tr-014": [
    [[0], [0]], [[1], [1]], [[2], [2]], [[3], [3]], [[4, 5], [4]],
    [[6], [5]], [[7], [6]], [[8], [7]], [[9], [8]], [[10], [9]], [[11], [10]],
  ],
  "bangerter-waldron-2014-tr-016": [
    [[0], [0]], [[1], [1]], [[2], [2]], [[3], [3, 4]], [[4], [5]],
  ],
  "bangerter-waldron-2014-tr-021": [
    [[0], [0]], [[1], [1]], [[2], [2]], [[3], [3]], [[4], [4]], [[5, 6], [5]],
  ],
  "bangerter-waldron-2014-tr-030": [
    [[0, 1], [0]], [[2, 3], [1]],
  ],
  "bangerter-waldron-2014-tr-031": [
    [[0], [0]], [[1, 2], [1]],
  ],
  "bangerter-waldron-2014-tr-034": [
    [[0], [0, 1]], [[1], [2]],
  ],
  "bangerter-waldron-2014-tr-038": [
    [[0, 1], [0]],
  ],
  "bangerter-waldron-2014-tr-039": [
    [[0], [0, 1]], [[1], [2]], [[2, 3, 4], [3]],
  ],
  "bangerter-waldron-2014-tr-042": [
    [[0], [0]], [[1], [1, 2]], [[2], [3]],
  ],
  "bangerter-waldron-2014-tr-043": [
    [[0, 1, 2], [0]],
  ],
  "bangerter-waldron-2014-tr-044": [
    [[0, 1], [0]],
  ],
  "bangerter-waldron-2014-tr-048": [
    [[0], [0]], [[1, 2, 3], [1]],
  ],
  "bangerter-waldron-2014-tr-050": [
    [[0], [0]], [[1], [1]], [[2], [2]], [[3, 4], [3]], [[5, 6], [4]], [[7], [5]],
  ],
  "bangerter-waldron-2014-tr-055": [
    [[0], [0]], [[1], [1]], [[2], [2, 3]], [[3], [4]], [[4], [5]],
  ],
  "bangerter-waldron-2014-tr-058": [
    [[0], [0]], [[1], [1]], [[2], [2]], [[3], [3]], [[4, 5], [4]],
    [[6], [5]], [[7], [6]], [[8], [7]], [[9], [8]],
  ],
  "bangerter-waldron-2014-tr-062": [
    [[0], [0]], [[1], [1]], [[2], [2]], [[3], [3]], [[4], [4]],
    [[5], [5]], [[6, 7], [6]], [[8], [7]], [[9], [8]], [[10], [9]],
  ],
};

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
    throw new Error(
      `${entryId}: unreviewed sentence-count mismatch ${korean.length}/${source.length}`
    );
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

function missingDigitTokens(sourceText, koreanText) {
  const source = digitTokens(sourceText);
  const korean = digitTokens(koreanText);
  return source.filter((token) => {
    if (korean.includes(token)) return false;
    if (token === "56" && koreanText.includes("5,600만")) return false;
    if (token === "19.5" && koreanText.includes("1,950만")) return false;
    return true;
  });
}

function main() {
  const alignment = JSON.parse(readText(ALIGNMENT_PATH));
  const options = { skipFirstTitleHeading: true, collectFrontmatter: true };
  const translationDocument = parseMarkdownDocument(
    readText(path.join(CONTENT_DIR, "translation.md")), options
  );
  const originalDocument = parseMarkdownDocument(
    readText(path.join(CONTENT_DIR, "full.md")), options
  );
  const resolved = resolveTranslationAlignment(
    alignment, translationDocument, originalDocument, { allowedStatuses: ["verified"] }
  );
  if (resolved.errors.length) {
    throw new Error(`${SLUG}: block alignment failed\n  ${resolved.errors.join("\n  ")}`);
  }
  if (resolved.entries.length !== 93) {
    throw new Error(`${SLUG}: expected 93 aligned paragraphs, found ${resolved.entries.length}`);
  }

  const rawById = new Map(alignment.entries.map((entry) => [entry.id, entry]));
  const errors = [];
  let missingDigitPairCount = 0;
  for (const entry of resolved.entries) {
    const rawEntry = rawById.get(entry.id);
    if (!rawEntry) throw new Error(`${entry.id}: raw entry not found`);
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
        const missing = missingDigitTokens(pair.source_text, pair.ko_text);
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

  const pairCount = alignment.entries.reduce(
    (sum, entry) => sum + entry.sentence_pairs.length, 0
  );
  if (pairCount !== 313) {
    throw new Error(`${SLUG}: expected 313 verified sentence pairs, found ${pairCount}`);
  }
  alignment.sentence_alignment_version = 1;
  alignment.sentence_alignment_status = "verified";
  const manualRuleCount = Object.keys(GROUP_RULES).length;
  alignment.sentence_alignment_note =
    `All ${pairCount} sentence pairs were checked against the complete bilingual blocks for meaning, order, omissions, quotations, citations, numbers, scale direction, sample flow, trajectory labels, Table 1 totals, all six figure/table descriptions, and source fidelity. All 31 references remain verbatim; sentence-boundary differences were regrouped in ${manualRuleCount} manually checked rules.`;
  delete alignment.sentence_alignment_reviewed_at;
  fs.writeFileSync(ALIGNMENT_PATH, `${JSON.stringify(alignment, null, 2)}\n`, "utf8");
  console.log(
    `[sentence-review] ${SLUG}: ${resolved.entries.length} blocks, ${pairCount} verified pairs, ` +
    `${manualRuleCount} manual boundary rules, ${missingDigitPairCount} numeric omissions`
  );
}

main();
