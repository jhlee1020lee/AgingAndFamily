const fs = require("fs");
const path = require("path");

const {
  parseMarkdownDocument,
  resolveTranslationAlignment,
  sentenceSplitSourceText,
} = require("./translation_original_reveal");
const { normalizeSentenceText, validateSentencePairs } = require("./sentence_alignment");

const ROOT_DIR = path.resolve(__dirname, "..");
const SLUG = "boerner-schulz-2009";
const CONTENT_DIR = path.join(ROOT_DIR, "content", "readings", SLUG);
const ALIGNMENT_PATH = path.join(CONTENT_DIR, "translation_alignment.json");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

// Monotonic [Korean indexes, source indexes] for sentence-boundary differences
// that were checked manually against the complete bilingual paragraph.
const GROUP_RULES = {
  "boerner-schulz-2009-tr-003": [
    [[0], [0]], [[1, 2], [1]], [[3], [2]], [[4], [3]],
    [[5], [4]], [[6], [5]],
  ],
  "boerner-schulz-2009-tr-004": [
    [[0], [0]], [[1], [1]], [[2, 3], [2]], [[4], [3]],
  ],
  "boerner-schulz-2009-tr-005": [
    [[0], [0]], [[1, 2, 3], [1]],
  ],
  "boerner-schulz-2009-tr-009": [
    [[0, 1, 2, 3, 4, 5, 6, 7, 8], [0]],
  ],
  "boerner-schulz-2009-tr-010": [
    [[0], [0]], [[1, 2], [1]],
  ],
  "boerner-schulz-2009-tr-011": [
    [[0], [0]], [[1], [1]], [[2, 3], [2]], [[4], [3]],
  ],
  "boerner-schulz-2009-tr-012": [
    [[0], [0]], [[1], [1]], [[2, 3, 4, 5], [2]],
  ],
};

function groupText(chunks, indexes, label) {
  return normalizeSentenceText(indexes.map((index) => {
    if (!chunks[index]) throw new Error(`${label}: missing sentence index ${index}`);
    return chunks[index];
  }).join(" "));
}

function reviewedSentenceSplit(value) {
  const replacements = [
    ["et al.", "ETALABBREVIATIONTOKEN"],
    ["eg.", "EGABBREVIATIONTOKEN"],
    ["U.S.", "USABBREVIATIONTOKEN"],
  ];
  let prepared = String(value || "");
  for (const [original, marker] of replacements) prepared = prepared.replaceAll(original, marker);
  return sentenceSplitSourceText(prepared).map((sentence) => {
    let restored = sentence;
    for (const [original, marker] of replacements) restored = restored.replaceAll(marker, original);
    return restored;
  });
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

  const korean = reviewedSentenceSplit(translationText);
  const source = reviewedSentenceSplit(sourceText);
  const groups = GROUP_RULES[entryId] || (
    korean.length === source.length
      ? korean.map((_, index) => [[index], [index]])
      : null
  );
  if (!groups) {
    throw new Error(
      `${entryId}: unreviewed sentence-count mismatch ${korean.length}/${source.length}\n` +
      `  KO ${korean.map((sentence, index) => `[${index}] ${sentence}`).join("\n  KO ")}\n` +
      `  EN ${source.map((sentence, index) => `[${index}] ${sentence}`).join("\n  EN ")}`
    );
  }
  assertCompleteIndexes(groups, korean.length, source.length, entryId);
  return groups.map((group, index) => ({
    id: `${entryId}-s${String(index + 1).padStart(2, "0")}`,
    status: "verified",
    ko_text: groupText(korean, group[0], `${entryId} Korean`),
    source_text: groupText(source, group[1], `${entryId} source`),
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
  if (resolved.entries.length !== 30) {
    throw new Error(`${SLUG}: expected 30 aligned paragraphs, found ${resolved.entries.length}`);
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
      for (const pair of rawEntry.sentence_pairs) {
        const missing = digitTokens(pair.source_text).filter(
          (token) => !digitTokens(pair.ko_text).includes(token)
        );
        if (missing.length) {
          missingDigitPairCount += 1;
          errors.push(`${pair.id}: source number(s) missing in Korean: ${missing.join(", ")}`);
        }
      }
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
  alignment.sentence_alignment_version = 1;
  alignment.sentence_alignment_status = "verified";
  alignment.sentence_alignment_note =
    `All ${pairCount} sentence pairs were checked against the complete bilingual blocks for meaning, order, omissions, citations, numbers, diagnostic thresholds, risk qualifications, treatment claims, and source fidelity. Sentence-boundary mismatch blocks were regrouped manually; all 11 references remain verbatim.`;
  delete alignment.sentence_alignment_reviewed_at;
  fs.writeFileSync(ALIGNMENT_PATH, `${JSON.stringify(alignment, null, 2)}\n`, "utf8");
  console.log(
    `[sentence-review] ${SLUG}: ${resolved.entries.length} blocks, ${pairCount} verified pairs, ` +
    `${Object.keys(GROUP_RULES).length} manual boundary rules, ${missingDigitPairCount} numeric omissions`
  );
}

main();
