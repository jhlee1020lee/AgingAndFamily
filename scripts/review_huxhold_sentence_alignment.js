const fs = require("fs");
const path = require("path");

const {
  parseMarkdownDocument,
  resolveTranslationAlignment,
  sentenceSplitSourceText,
} = require("./translation_original_reveal");
const { normalizeSentenceText, validateSentencePairs } = require("./sentence_alignment");

const ROOT_DIR = path.resolve(__dirname, "..");
const SLUG = "huxhold-et-al-2014";
const CONTENT_DIR = path.join(ROOT_DIR, "content", "readings", SLUG);
const ALIGNMENT_PATH = path.join(CONTENT_DIR, "translation_alignment.json");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function makePairs(entryId, koreanChunks, sourceChunks, sourceMap) {
  if (koreanChunks.length !== sourceMap.length) {
    throw new Error(`${entryId}: Korean chunk count ${koreanChunks.length} does not match map ${sourceMap.length}`);
  }
  return koreanChunks.map((koText, index) => {
    const indexes = Array.isArray(sourceMap[index]) ? sourceMap[index] : [sourceMap[index]];
    const sourceText = normalizeSentenceText(indexes.map((sourceIndex) => {
      if (!sourceChunks[sourceIndex]) throw new Error(`${entryId}: missing source chunk ${sourceIndex}`);
      return sourceChunks[sourceIndex];
    }).join(" "));
    return {
      id: `${entryId}-s${String(index + 1).padStart(2, "0")}`,
      status: "generated",
      ko_text: normalizeSentenceText(koText),
      source_text: sourceText,
    };
  });
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
  if (resolved.entries.length !== 100) {
    throw new Error(`${SLUG}: expected 100 aligned context blocks, found ${resolved.entries.length}`);
  }

  const rawById = new Map((alignment.entries || []).map((entry) => [entry.id, entry]));
  const resolvedById = new Map(resolved.entries.map((entry) => [entry.id, entry]));

  // The generic English splitter treats the abbreviation in "T1 vs. T2" as a
  // sentence boundary. Keep that abbreviation inside the complete Figure 2
  // caption, then align the two accessibility-description sentences in order.
  const figureEntryId = `${SLUG}-tr-027`;
  const rawFigureEntry = rawById.get(figureEntryId);
  const resolvedFigureEntry = resolvedById.get(figureEntryId);
  if (!rawFigureEntry || !resolvedFigureEntry) throw new Error(`${figureEntryId}: entry not found`);
  const koreanFigureChunks = sentenceSplitSourceText(
    resolvedFigureEntry.translationBlock?.text || resolvedFigureEntry.translationBlock?.plainText || ""
  );
  const sourceFigureChunks = sentenceSplitSourceText(resolvedFigureEntry.sourceText);
  if (koreanFigureChunks.length !== 4 || sourceFigureChunks.length !== 5) {
    throw new Error(
      `${figureEntryId}: expected 4 Korean and 5 source splitter chunks, found ` +
      `${koreanFigureChunks.length} and ${sourceFigureChunks.length}`
    );
  }
  rawFigureEntry.sentence_pairs = makePairs(
    figureEntryId,
    koreanFigureChunks,
    sourceFigureChunks,
    [0, [1, 2], 3, 4]
  );

  for (const entry of alignment.entries || []) {
    entry.sentence_alignment_method = "human-reviewed-v1";
    (entry.sentence_pairs || []).forEach((pair, index) => {
      pair.id = `${entry.id}-s${String(index + 1).padStart(2, "0")}`;
      pair.status = "generated";
    });
  }

  const errors = [];
  for (const resolvedEntry of resolved.entries) {
    const rawEntry = rawById.get(resolvedEntry.id);
    errors.push(...validateSentencePairs({
      id: resolvedEntry.id,
      translationText: resolvedEntry.translationBlock?.text || resolvedEntry.translationBlock?.plainText || "",
      sourceText: resolvedEntry.sourceText,
      pairs: rawEntry?.sentence_pairs,
    }, { allowedStatuses: ["generated"] }));
  }
  if (errors.length) {
    throw new Error(`${SLUG}: reviewed sentence alignment failed\n  ${errors.join("\n  ")}`);
  }

  const pairCount = (alignment.entries || []).reduce(
    (sum, entry) => sum + (entry.sentence_pairs || []).length,
    0
  );
  if (pairCount !== 264) {
    throw new Error(`${SLUG}: expected 264 reviewed sentence pairs, found ${pairCount}`);
  }

  alignment.sentence_alignment_note =
    "All 264 sentence pairs were checked against the complete bilingual blocks for meaning, order, omissions, citations, numeric anchors, statistical signs, and qualification language. The Figure 2 abbreviation split was regrouped manually.";
  delete alignment.sentence_alignment_reviewed_at;
  delete alignment.sentence_alignment_status;
  fs.writeFileSync(ALIGNMENT_PATH, `${JSON.stringify(alignment, null, 2)}\n`, "utf8");
  console.log(`[sentence-review] ${SLUG}: ${pairCount} human-reviewed pairs prepared`);
}

main();
