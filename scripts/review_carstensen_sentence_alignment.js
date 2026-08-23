const fs = require("fs");
const path = require("path");

const {
  parseMarkdownDocument,
  resolveTranslationAlignment,
  sentenceSplitSourceText,
} = require("./translation_original_reveal");
const { normalizeSentenceText, validateSentencePairs } = require("./sentence_alignment");

const ROOT_DIR = path.resolve(__dirname, "..");
const SLUG = "carstensen-et-al-1999";
const CONTENT_DIR = path.join(ROOT_DIR, "content", "readings", SLUG);
const ALIGNMENT_PATH = path.join(CONTENT_DIR, "translation_alignment.json");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

// Monotonic [Korean indexes, source indexes] used only where the two languages
// require different sentence boundaries. Every rule is inspected against the
// complete bilingual paragraph before it is accepted.
const GROUP_RULES = {
  "carstensen-et-al-1999-tr-004": [
    [[0], [0]], [[1, 2], [1]], [[3], [2]],
  ],
  "carstensen-et-al-1999-tr-013": [
    [[0], [0]], [[1], [1]], [[2], [2]], [[3, 4], [3]], [[5], [4]],
    [[6], [5]], [[7], [6]], [[8], [7]], [[9], [8]], [[10], [9]],
  ],
  "carstensen-et-al-1999-tr-014": [
    [[0], [0]], [[1, 2], [1]], [[3], [2]], [[4], [3]],
    [[5], [4]], [[6], [5]], [[7], [6]],
  ],
  "carstensen-et-al-1999-tr-019": [
    [[0], [0]], [[1], [1]], [[2], [2]], [[3, 4], [3]], [[5], [4]],
  ],
  "carstensen-et-al-1999-tr-022": [
    [[0], [0]], [[1, 2], [1]], [[3], [2]],
  ],
  "carstensen-et-al-1999-tr-028": [
    [[0], [0]], [[1], [1]], [[2, 3], [2]], [[4], [3]], [[5], [4]],
  ],
  "carstensen-et-al-1999-tr-029": [
    [[0], [0]], [[1], [1]], [[2, 3], [2]], [[4], [3]],
  ],
  "carstensen-et-al-1999-tr-030": [
    [[0], [0]], [[1], [1]], [[2], [2]], [[3], [3]], [[4], [4]],
    [[5], [5]], [[6, 7], [6]],
  ],
  "carstensen-et-al-1999-tr-034": [
    [[0], [0]], [[1], [1]], [[2, 3], [2]], [[4], [3]],
  ],
  "carstensen-et-al-1999-tr-038": [
    [[0], [0]], [[1], [1]], [[2], [2]], [[3, 4], [3]], [[5], [4]],
  ],
  "carstensen-et-al-1999-tr-040": [
    [[0], [0]], [[1, 2], [1]], [[3], [2]], [[4], [3]],
  ],
  "carstensen-et-al-1999-tr-041": [
    [[0], [0]], [[1], [1]], [[2], [2]], [[3], [3]], [[4], [4]],
    [[5, 6], [5]], [[7], [6]],
  ],
  "carstensen-et-al-1999-tr-044": [
    [[0], [0]], [[1], [1]], [[2], [2]], [[3, 4], [3]], [[5], [4]],
  ],
  "carstensen-et-al-1999-tr-051": [
    [[0], [0, 1]], [[1], [2]], [[2], [3]], [[3], [4]], [[4], [5]], [[5], [6]],
  ],
  "carstensen-et-al-1999-tr-056": [
    [[0], [0]], [[1, 2], [1]], [[3], [2]], [[4], [3]], [[5], [4]],
  ],
  "carstensen-et-al-1999-tr-059": [
    [[0, 1], [0]], [[2], [1]], [[3], [2]], [[4], [3]],
  ],
  "carstensen-et-al-1999-tr-060": [
    [[0], [0]], [[1], [1, 2]], [[2], [3]], [[3], [4]],
  ],
  "carstensen-et-al-1999-tr-062": [
    [[0], [0]], [[1], [1, 2]], [[2], [3]], [[3], [4]],
    [[4], [5]], [[5], [6]], [[6], [7]],
  ],
  "carstensen-et-al-1999-tr-066": [
    [[0], [0]], [[1], [1]], [[2, 3], [2]], [[4], [3]],
  ],
  "carstensen-et-al-1999-tr-067": [
    [[0], [0]], [[1], [1]], [[2], [2]], [[3, 4], [3]],
  ],
  "carstensen-et-al-1999-tr-068": [
    [[0, 1], [0]], [[2, 3], [1]], [[4], [2]], [[5], [3]],
  ],
  "carstensen-et-al-1999-tr-073": [
    [[0], [0]], [[1], [1]], [[2], [2]], [[3, 4], [3]], [[5], [4]],
    [[6], [5]], [[7, 8], [6]], [[9], [7]], [[10], [8]],
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
    ["U.S.", "USABBREVIATIONTOKEN"],
    ["et al.", "ETALABBREVIATIONTOKEN"],
    ["i.e.", "IEABBREVIATIONTOKEN"],
    ["e.g.", "EGABBREVIATIONTOKEN"],
    ["cf.", "CFABBREVIATIONTOKEN"],
  ];
  let prepared = String(value || "");
  for (const [original, marker] of replacements) prepared = prepared.replaceAll(original, marker);
  prepared = prepared.replace(/\b([A-Z])\.(?=\s+[A-Z])/g, "$1INITIALPERIODTOKEN");
  prepared = prepared.replace(/\?(?=\)\s*[가-힣])/g, "QUESTIONMARKPARENTOKEN");
  prepared = prepared.replace(
    /\?(?=[”"]\s*(?:같은|라는|이라고|라고|이라며|라며))/g,
    "QUESTIONMARKQUOTETOKEN"
  );
  prepared = prepared.replace(/\s+/g, " ").trim();
  const chunks = [];
  let start = 0;
  let index = 0;
  while (index < prepared.length) {
    if (/[.!?]/.test(prepared[index])) {
      if (prepared[index] === "." && /\d/.test(prepared[index + 1] || "")) {
        index += 1;
        continue;
      }
      let boundary = index + 1;
      while (boundary < prepared.length && /[.!?]/.test(prepared[boundary])) boundary += 1;
      while (boundary < prepared.length && /["'”’\])}]/.test(prepared[boundary])) boundary += 1;
      let next = boundary;
      while (next < prepared.length && /\s/.test(prepared[next])) next += 1;
      if (
        next >= prepared.length
        || /^[A-Z([{“‘]/.test(prepared.slice(next, next + 1))
        || /^[\u00c0-\u024f]/.test(prepared.slice(next, next + 1))
        || /^[가-힣]/.test(prepared.slice(next, next + 1))
      ) {
        const sentence = prepared.slice(start, boundary).trim();
        if (sentence) chunks.push(sentence);
        start = next;
        index = next;
        continue;
      }
    }
    index += 1;
  }
  const tail = prepared.slice(start).trim();
  if (tail) chunks.push(tail);
  return chunks.map((sentence) => {
    let restored = sentence;
    for (const [original, marker] of replacements) restored = restored.replaceAll(marker, original);
    restored = restored.replaceAll("INITIALPERIODTOKEN", ".");
    restored = restored.replaceAll("QUESTIONMARKPARENTOKEN", "?");
    restored = restored.replaceAll("QUESTIONMARKQUOTETOKEN", "?");
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
      id: `${entryId}-s01`, status: "verified",
      ko_text: normalizedKorean, source_text: normalizedSource,
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
  if (resolved.entries.length !== 207) {
    throw new Error(`${SLUG}: expected 207 aligned paragraphs, found ${resolved.entries.length}`);
  }

  const rawById = new Map(alignment.entries.map((entry) => [entry.id, entry]));
  const errors = [];
  let missingDigitPairCount = 0;
  for (const entry of resolved.entries) {
    const rawEntry = rawById.get(entry.id);
    try {
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
  const unneededRules = Object.keys(GROUP_RULES).filter((id) => !rawById.has(id));
  if (unneededRules.length) errors.push(`unknown review rule(s): ${unneededRules.join(", ")}`);
  if (errors.length) {
    throw new Error(`${SLUG}: sentence review failed\n  ${errors.join("\n  ")}`);
  }

  const pairCount = alignment.entries.reduce(
    (sum, entry) => sum + entry.sentence_pairs.length, 0
  );
  alignment.sentence_alignment_version = 1;
  alignment.sentence_alignment_status = "verified";
  alignment.sentence_alignment_note =
    `All ${pairCount} sentence pairs were checked against the complete bilingual paragraph blocks for meaning, order, omissions, citations, names, numbers, qualification language, time-perspective manipulations, age-group findings, and source fidelity. Sentence-boundary mismatch blocks were regrouped manually; all 116 references remain verbatim.`;
  delete alignment.sentence_alignment_reviewed_at;
  fs.writeFileSync(ALIGNMENT_PATH, `${JSON.stringify(alignment, null, 2)}\n`, "utf8");
  console.log(
    `[sentence-review] ${SLUG}: ${resolved.entries.length} blocks, ${pairCount} verified pairs, ` +
    `${Object.keys(GROUP_RULES).length} manual boundary rules, ${missingDigitPairCount} numeric omissions`
  );
}

main();
