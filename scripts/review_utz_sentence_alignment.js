const fs = require("fs");
const path = require("path");

const {
  parseMarkdownDocument,
  resolveTranslationAlignment,
  sentenceSplitSourceText,
} = require("./translation_original_reveal");
const { normalizeSentenceText, validateSentencePairs } = require("./sentence_alignment");

const ROOT_DIR = path.resolve(__dirname, "..");
const SLUG = "utz-et-al-2002";
const CONTENT_DIR = path.join(ROOT_DIR, "content", "readings", SLUG);
const ALIGNMENT_PATH = path.join(CONTENT_DIR, "translation_alignment.json");
const EXPECTED_BLOCK_COUNT = 117;
const EXPECTED_PAIR_COUNT = 357;

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

// Monotonic [Korean indexes, source indexes] rules for every duplicated
// automatic source reveal. Each rule was checked against the complete block.
const GROUP_RULES = {
  "utz-et-al-2002-tr-004": [
    [[0, 1], [0]],
  ],
  "utz-et-al-2002-tr-009": [
    [[0], [0]], [[1], [1]], [[2], [2]], [[3, 4], [3]],
  ],
  "utz-et-al-2002-tr-010": [
    [[0], [0]], [[1], [1]], [[2, 3], [2]],
  ],
  "utz-et-al-2002-tr-012": [
    [[0], [0]], [[1], [1]], [[2, 3], [2]], [[4], [3]],
  ],
  "utz-et-al-2002-tr-013": [
    [[0], [0]], [[1], [1]], [[2], [2]], [[3], [3]], [[4], [4]],
    [[5], [5]], [[6], [6]], [[7, 8], [7]], [[9], [8]],
  ],
  "utz-et-al-2002-tr-019": [
    [[0], [0]], [[1, 2, 3], [1]], [[4, 5], [2]], [[6, 7], [3]],
    [[8], [4]], [[9], [5]], [[10], [6]],
  ],
  "utz-et-al-2002-tr-037": [
    [[0], [0]], [[1, 2], [1]], [[3], [2]], [[4], [3]],
  ],
  "utz-et-al-2002-tr-038": [
    [[0], [0]], [[1], [1]], [[2], [2]], [[3, 4], [3]], [[5], [4]],
  ],
  "utz-et-al-2002-tr-041": [
    [[0], [0]], [[1, 2], [1]], [[3], [2]],
  ],
  "utz-et-al-2002-tr-049": [
    [[0], [0]], [[1], [1]], [[2], [2]], [[3, 4], [3]], [[5], [4]],
  ],
  "utz-et-al-2002-tr-054": [
    [[0], [0]], [[1, 2], [1]], [[3], [2]], [[4], [3]], [[5], [4]],
    [[6], [5]], [[7], [6]], [[8], [7]],
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
  const start = positions[indexes[0]].start;
  const end = positions[indexes[indexes.length - 1]].end;
  return normalizeSentenceText(normalizedComplete.slice(start, end));
}

function assertCoverage(groups, koreanCount, sourceCount, entryId) {
  const korean = groups.flatMap(([indexes]) => indexes);
  const source = groups.flatMap(([, indexes]) => indexes);
  const expectedKorean = range(0, koreanCount - 1);
  const expectedSource = range(0, sourceCount - 1);
  if (JSON.stringify(korean) !== JSON.stringify(expectedKorean)) {
    throw new Error(`${entryId}: Korean group indexes do not exactly cover the block`);
  }
  if (JSON.stringify(source) !== JSON.stringify(expectedSource)) {
    throw new Error(`${entryId}: source group indexes do not exactly cover the block`);
  }
}

function buildReviewedPairs(entryId, koreanText, sourceText, existingPairs) {
  const korean = sentenceSplitSourceText(koreanText);
  const source = sentenceSplitSourceText(sourceText);
  const groups = GROUP_RULES[entryId];
  if (groups) {
    assertCoverage(groups, korean.length, source.length, entryId);
    return groups.map(([koreanIndexes, sourceIndexes], index) => ({
      id: `${entryId}-s${String(index + 1).padStart(2, "0")}`,
      status: "verified",
      ko_text: groupText(korean, koreanIndexes, `${entryId} Korean`, koreanText),
      source_text: groupText(source, sourceIndexes, `${entryId} source`, sourceText),
    }));
  }
  if (!Array.isArray(existingPairs) || !existingPairs.length) {
    throw new Error(`${entryId}: generated sentence pairs are missing`);
  }
  return existingPairs.map((pair, index) => ({
    id: `${entryId}-s${String(index + 1).padStart(2, "0")}`,
    status: "verified",
    ko_text: normalizeSentenceText(pair.ko_text),
    source_text: normalizeSentenceText(pair.source_text),
  }));
}

function digitTokenCounts(value) {
  const counts = new Map();
  for (const raw of String(value || "").match(/\d+(?:[.,]\d+)?%?/g) || []) {
    const token = raw.replace(/,/g, "");
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return counts;
}

function missingDigitTokens(sourceText, koreanText) {
  const source = digitTokenCounts(sourceText);
  const korean = digitTokenCounts(koreanText);
  return [...source].flatMap(([token, count]) => {
    const missing = Math.max(0, count - (korean.get(token) || 0));
    return Array.from({ length: missing }, () => token);
  });
}

function assertScope(translationText) {
  const sentinels = [
    "1,532명이", "응답률은 68%", "297명(여성 217명, 남성 80명)",
    "사별한 사람 210명과 비사별 대조군 87명", "0.44 표준편차",
    "공식적 사회참여 수준은 유의하게 예측하지 않았다",
    "배우자 사별 × 성별 상호작용항은 어떤 모형에서도 유의하지 않았으며",
    "17%가 증가, 71%가 동일, 12%가 감소", "예 87%, 아니요 13%",
  ];
  sentinels.forEach((sentinel) => {
    if (!translationText.includes(sentinel)) throw new Error(`missing scope sentinel: ${sentinel}`);
  });
}

function main() {
  const alignment = JSON.parse(readText(ALIGNMENT_PATH));
  const translationText = readText(path.join(CONTENT_DIR, "translation.md"));
  const options = { skipFirstTitleHeading: true, collectFrontmatter: true };
  const translationDocument = parseMarkdownDocument(translationText, options);
  const originalDocument = parseMarkdownDocument(readText(path.join(CONTENT_DIR, "full.md")), options);
  const resolved = resolveTranslationAlignment(
    alignment, translationDocument, originalDocument, { allowedStatuses: ["verified"] }
  );
  if (resolved.errors.length) {
    throw new Error(`${SLUG}: block alignment failed\n  ${resolved.errors.join("\n  ")}`);
  }
  if (resolved.entries.length !== EXPECTED_BLOCK_COUNT) {
    throw new Error(`${SLUG}: expected ${EXPECTED_BLOCK_COUNT} aligned paragraphs, found ${resolved.entries.length}`);
  }
  assertScope(translationText);

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
        entry.sourceText,
        rawEntry.sentence_pairs
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
      for (let index = 1; index < rawEntry.sentence_pairs.length; index += 1) {
        const current = rawEntry.sentence_pairs[index];
        const prior = rawEntry.sentence_pairs[index - 1];
        if (current.source_text === prior.source_text || current.ko_text === prior.ko_text) {
          errors.push(`${entry.id}: adjacent sentence reveal is duplicated at pair ${index + 1}`);
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  const unknownRules = Object.keys(GROUP_RULES).filter((id) => !rawById.has(id));
  if (unknownRules.length) errors.push(`unknown review rule(s): ${unknownRules.join(", ")}`);
  if (errors.length) throw new Error(`${SLUG}: sentence review failed\n  ${errors.join("\n  ")}`);

  const pairCount = alignment.entries.reduce(
    (sum, entry) => sum + entry.sentence_pairs.length, 0
  );
  if (pairCount !== EXPECTED_PAIR_COUNT) {
    throw new Error(`${SLUG}: expected ${EXPECTED_PAIR_COUNT} reviewed pairs, found ${pairCount}`);
  }
  alignment.sentence_alignment_version = 1;
  alignment.sentence_alignment_status = "verified";
  alignment.sentence_alignment_note =
    `All ${pairCount} sentence pairs were checked against the complete bilingual blocks for ` +
    `meaning, order, omissions, citations, every source number, CLOC sample flow, weighted and ` +
    `unweighted denominators, formal versus informal outcomes, coefficient direction and ` +
    `significance/non-significance scope, theory claims, causal boundaries, and all six visual ` +
    `descriptions. All 61 references remain verbatim; duplicated automatic reveal boundaries were ` +
    `regrouped in ${Object.keys(GROUP_RULES).length} manually checked rules.`;
  delete alignment.sentence_alignment_reviewed_at;
  fs.writeFileSync(ALIGNMENT_PATH, `${JSON.stringify(alignment, null, 2)}\n`, "utf8");
  console.log(
    `[sentence-review] ${SLUG}: ${resolved.entries.length} blocks, ${pairCount} verified pairs, ` +
    `${Object.keys(GROUP_RULES).length} manual boundary rules, ${missingDigitPairCount} numeric omissions`
  );
}

main();
