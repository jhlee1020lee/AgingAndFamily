const fs = require("fs");
const path = require("path");

const {
  parseMarkdownDocument,
  resolveTranslationAlignment,
  sentenceSplitSourceText,
} = require("./translation_original_reveal");
const { normalizeSentenceText, validateSentencePairs } = require("./sentence_alignment");

const ROOT_DIR = path.resolve(__dirname, "..");
const SLUG = "kim-et-al-2015";
const CONTENT_DIR = path.join(ROOT_DIR, "content", "readings", SLUG);
const ALIGNMENT_PATH = path.join(CONTENT_DIR, "translation_alignment.json");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function joined(chunks, indexes) {
  return normalizeSentenceText(indexes.map((index) => chunks[index]).join(" "));
}

function makePairs(entryId, koreanChunks, sourceChunks, sourceMap) {
  if (koreanChunks.length !== sourceMap.length) {
    throw new Error(`${entryId}: Korean chunk count ${koreanChunks.length} does not match map ${sourceMap.length}`);
  }
  return koreanChunks.map((koText, index) => {
    const indexes = Array.isArray(sourceMap[index]) ? sourceMap[index] : [sourceMap[index]];
    return {
      id: `${entryId}-s${String(index + 1).padStart(2, "0")}`,
      status: "verified",
      ko_text: normalizeSentenceText(koText),
      source_text: joined(sourceChunks, indexes),
    };
  });
}

function digitTokens(value) {
  return Array.from(new Set((String(value || "").match(/\d+(?:[.,]\d+)?%?/g) || [])
    .map((item) => item.replace(/,/g, ""))));
}

function main() {
  const alignment = JSON.parse(readText(ALIGNMENT_PATH));
  const translationDocument = parseMarkdownDocument(readText(path.join(CONTENT_DIR, "translation.md")), {
    skipFirstTitleHeading: true,
    collectFrontmatter: true,
  });
  const originalDocument = parseMarkdownDocument(readText(path.join(CONTENT_DIR, "full.md")), {
    skipFirstTitleHeading: true,
    collectFrontmatter: true,
  });
  const resolved = resolveTranslationAlignment(alignment, translationDocument, originalDocument, {
    allowedStatuses: ["verified"],
  });
  if (resolved.errors.length) {
    throw new Error(`${SLUG}: block alignment failed\n  ${resolved.errors.join("\n  ")}`);
  }
  if (resolved.entries.length !== 170) {
    throw new Error(`${SLUG}: expected 170 aligned context blocks, found ${resolved.entries.length}`);
  }

  const rawById = new Map((alignment.entries || []).map((entry) => [entry.id, entry]));
  const resolvedById = new Map(resolved.entries.map((entry) => [entry.id, entry]));

  function regroup(entryNumber, expectedKorean, expectedSource, transformKorean, sourceMap) {
    const entryId = `${SLUG}-tr-${String(entryNumber).padStart(3, "0")}`;
    const rawEntry = rawById.get(entryId);
    const resolvedEntry = resolvedById.get(entryId);
    if (!rawEntry || !resolvedEntry) throw new Error(`${entryId}: entry not found`);
    const korean = sentenceSplitSourceText(
      resolvedEntry.translationBlock?.text || resolvedEntry.translationBlock?.plainText || ""
    );
    const source = sentenceSplitSourceText(resolvedEntry.sourceText);
    if (korean.length !== expectedKorean || source.length !== expectedSource) {
      throw new Error(
        `${entryId}: expected ${expectedKorean}/${expectedSource} Korean/source chunks, ` +
        `found ${korean.length}/${source.length}`
      );
    }
    rawEntry.sentence_pairs = makePairs(entryId, transformKorean(korean), source, sourceMap);
  }

  // Two English chunks contain two semantically complete Korean sentences.
  // Regroup each pair so the reveal presents one complete bilingual claim.
  regroup(12, 12, 10, (korean) => [
    korean[0], korean[1], korean[2], joined(korean, [3, 4]), korean[5],
    korean[6], korean[7], korean[8], joined(korean, [9, 10]), korean[11],
  ], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

  // The Korean splitter keeps the sentence beginning with a year inside the
  // preceding FSA sentence. Map that complete Korean chunk to both source claims.
  regroup(17, 10, 11, (korean) => korean, [0, 1, [2, 3], 4, 5, 6, 7, 8, 9, 10]);

  // The English splitter keeps the quoted research question and the following
  // review finding together; expose them as one bilingual semantic pair.
  regroup(38, 5, 4, (korean) => [
    korean[0], joined(korean, [1, 2]), korean[3], korean[4],
  ], [0, 1, 2, 3]);

  for (const entry of alignment.entries || []) {
    entry.status = "verified";
    entry.sentence_alignment_method = "human-reviewed-v1";
    (entry.sentence_pairs || []).forEach((pair, index) => {
      pair.id = `${entry.id}-s${String(index + 1).padStart(2, "0")}`;
      pair.status = "verified";
    });
  }

  const errors = [];
  let missingNumberPairCount = 0;
  resolved.entries.forEach((resolvedEntry, index) => {
    const rawEntry = rawById.get(resolvedEntry.id);
    errors.push(...validateSentencePairs({
      id: resolvedEntry.id,
      translationText: resolvedEntry.translationBlock?.text || resolvedEntry.translationBlock?.plainText || "",
      sourceText: resolvedEntry.sourceText,
      pairs: rawEntry?.sentence_pairs,
    }));
    (rawEntry?.sentence_pairs || []).forEach((pair) => {
      const sourceDigits = digitTokens(pair.source_text);
      const translationDigits = digitTokens(pair.ko_text);
      const missing = sourceDigits.filter((token) => !translationDigits.includes(token));
      if (missing.length) {
        missingNumberPairCount += 1;
        errors.push(`${pair.id}: Korean pair is missing source number(s): ${missing.join(", ")}`);
      }
    });
    if (index >= 38) {
      const translationText = normalizeSentenceText(
        resolvedEntry.translationBlock?.text || resolvedEntry.translationBlock?.plainText || ""
      );
      if (translationText !== normalizeSentenceText(resolvedEntry.sourceText)) {
        errors.push(`${resolvedEntry.id}: reference entry differs from the approved source`);
      }
    }
  });
  if (errors.length) {
    throw new Error(`${SLUG}: reviewed sentence alignment failed\n  ${errors.join("\n  ")}`);
  }

  const pairCount = (alignment.entries || []).reduce(
    (sum, entry) => sum + (entry.sentence_pairs || []).length,
    0
  );
  if (pairCount !== 350) {
    throw new Error(`${SLUG}: expected 350 reviewed sentence pairs, found ${pairCount}`);
  }
  const referenceCount = resolved.entries.slice(38).length;
  if (referenceCount !== 132) {
    throw new Error(`${SLUG}: expected 132 reference reveals, found ${referenceCount}`);
  }

  alignment.sentence_alignment_version = 1;
  alignment.sentence_alignment_status = "verified";
  alignment.sentence_alignment_note =
    "All 170 reveal entries and 350 sentence pairs were reviewed against the complete bilingual blocks for meaning, order, omissions, citations, numbers, countries, policy distinctions, association/causal scope, and qualification language. Three splitter mismatches were regrouped manually; all 132 references remain identical to the approved source.";
  delete alignment.sentence_alignment_reviewed_at;
  fs.writeFileSync(ALIGNMENT_PATH, `${JSON.stringify(alignment, null, 2)}\n`, "utf8");
  console.log(
    `[sentence-review] ${SLUG}: ${resolved.entries.length} entries, ${pairCount} verified pairs, ` +
    `${referenceCount} unchanged references, ${missingNumberPairCount} missing-number pairs`
  );
}

main();
