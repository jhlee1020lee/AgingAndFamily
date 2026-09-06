const fs = require("fs");
const path = require("path");

const {
  parseMarkdownDocument,
  resolveTranslationAlignment,
  sentenceSplitSourceText,
} = require("./translation_original_reveal");
const { mergeAdjacentSourcePairs, normalizeSentenceText, validateSentencePairs } = require("./sentence_alignment");

const ROOT_DIR = path.resolve(__dirname, "..");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function loadReading(slug) {
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
  if (resolved.errors.length) throw new Error(`${slug}: block alignment failed\n  ${resolved.errors.join("\n  ")}`);
  return { alignment, alignmentPath, resolved };
}

function chunksByStarts(text, starts, label) {
  const value = normalizeSentenceText(text);
  const positions = [];
  let cursor = 0;
  starts.forEach((start) => {
    const position = value.indexOf(start, cursor);
    if (position < 0) throw new Error(`${label}: start marker not found: ${start}`);
    positions.push(position);
    cursor = position + start.length;
  });
  if (positions[0] !== 0) throw new Error(`${label}: first marker must begin the block`);
  return positions.map((position, index) => normalizeSentenceText(value.slice(position, positions[index + 1] ?? value.length)));
}

function splitAtMarker(value, marker, label) {
  const text = normalizeSentenceText(value);
  const index = text.indexOf(marker);
  if (index <= 0) throw new Error(`${label}: split marker not found: ${marker}`);
  return [normalizeSentenceText(text.slice(0, index)), normalizeSentenceText(text.slice(index))];
}

function expandSentence(sentences, index, marker, label) {
  const parts = splitAtMarker(sentences[index], marker, label);
  return [...sentences.slice(0, index), ...parts, ...sentences.slice(index + 1)];
}

function mappedPairs(entryId, koreanChunks, sourceChunks, sourceMap) {
  if (koreanChunks.length !== sourceMap.length) {
    throw new Error(`${entryId}: Korean chunk count ${koreanChunks.length} does not match map ${sourceMap.length}`);
  }
  return koreanChunks.map((koText, index) => {
    const rawIndexes = Array.isArray(sourceMap[index]) ? sourceMap[index] : [sourceMap[index]];
    const sourceText = normalizeSentenceText(rawIndexes.map((sourceIndex) => {
      if (!sourceChunks[sourceIndex]) throw new Error(`${entryId}: missing source chunk ${sourceIndex}`);
      return sourceChunks[sourceIndex];
    }).join(" "));
    return {
      id: `${entryId}-s${String(index + 1).padStart(2, "0")}`,
      status: "verified",
      ko_text: normalizeSentenceText(koText),
      source_text: sourceText,
    };
  });
}

function setMappedRule(context, entryId, sourceMap, transformKorean = (sentences) => sentences, transformSource = (sentences) => sentences) {
  const resolvedEntry = context.resolvedById.get(entryId);
  const rawEntry = context.rawById.get(entryId);
  if (!resolvedEntry || !rawEntry) throw new Error(`${entryId}: entry not found`);
  const korean = transformKorean(sentenceSplitSourceText(resolvedEntry.translationBlock?.text || ""));
  const source = transformSource(sentenceSplitSourceText(resolvedEntry.sourceText));
  rawEntry.sentence_pairs = mappedPairs(entryId, korean, source, sourceMap);
  rawEntry.sentence_alignment_method = "human-reviewed-v1";
}

function setChunkRule(context, entryId, koreanStarts, sourceStarts, sourceMap) {
  const resolvedEntry = context.resolvedById.get(entryId);
  const rawEntry = context.rawById.get(entryId);
  if (!resolvedEntry || !rawEntry) throw new Error(`${entryId}: entry not found`);
  const korean = chunksByStarts(resolvedEntry.translationBlock?.text || "", koreanStarts, `${entryId} Korean`);
  const source = chunksByStarts(resolvedEntry.sourceText, sourceStarts, `${entryId} source`);
  rawEntry.sentence_pairs = mappedPairs(entryId, korean, source, sourceMap);
  rawEntry.sentence_alignment_method = "human-reviewed-v1";
}

function reviewLevy(context) {
  setChunkRule(context, "levy-tr-002",
    ["노화 과정은", "이를 잘 보여", "“생물노년학자", "그러나 이러한", "그러므로 노화", "이 글이 취하는"],
    ["It is widely", "To illustrate", "But this assumed", "There exists", "The particular approach"],
    [0, 1, 1, 2, 3, 4]);
  setMappedRule(context, "levy-tr-003", [0, 1, 2, 2, 3]);
  setMappedRule(context, "levy-tr-006", [0, 0, 1, [2, 3]]);
  setChunkRule(context, "levy-tr-008",
    ["그러나 장기적으로", "최근 연구에서는", "18세에서 49세", "또한 18세에서", "이 결과 역시"],
    ["On a long-term", "A recent study", "In a cohort", "Further, in a younger"],
    [0, 1, 2, 3, 3]);
  setMappedRule(context, "levy-tr-013", [0, 1, 1, 2]);
  setChunkRule(context, "levy-tr-018",
    ["연령 고정관념을", "젊은 사람이", "노인이 고용", "또는 한 대학병원", "“젊은 [의사]들은"],
    ["Old-age cues", "And cues may", "Alternatively, the two"],
    [0, 0, 1, 2, 2]);
  setChunkRule(context, "levy-tr-023",
    ["그림 2.", "역하로 점화", "긍정적 연령", "B.R. Levy", "Copyright 2000", "허가를 받아"],
    ["Figure 2.", "Influence of subliminally", "Positive and negative", "Reproduced from", "Copyright 2000", "Reproduced with"],
    [0, 1, 2, 3, 4, 5]);
  setChunkRule(context, "levy-tr-027",
    ["Butler, R. (2008).", "Ageism:", "In The longevity", "New York:", "이 장은 노인이"],
    ["Butler, R. (2008).", "Ageism:", "In The longevity", "New York:", "This chapter presents"],
    [0, 1, 2, 3, 4]);
  setChunkRule(context, "levy-tr-028",
    ["Mead, G.H. (1934).", "Mind, self", "Chicago:", "공동체의 태도가"],
    ["Mead, G.H. (1934).", "Mind, self", "Chicago:", "A classic description"],
    [0, 1, 2, 3]);
  setChunkRule(context, "levy-tr-029",
    ["O’Brien, L.T.", "Memory performance", "Social Cognition", "이 실험은", "하나는 현재", "저자들은 후자가"],
    ["O’Brien, L.T.", "Memory performance", "Social Cognition", "This experiment tested"],
    [0, 1, 2, 3, 3, 3]);
}

function reviewSettersten(context) {
  setMappedRule(context, "settersten-tr-004", [0, 1, 2, 3, 4, 5, 6, 6, 7, 7, 8, 9, 9, 10, 11]);
  setMappedRule(context, "settersten-tr-008",
    [0, 1, 2, 3, 4, 5, 5, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 15, 16, 17, 18, 19],
    (sentences) => {
      const first = expandSentence(sentences, 9, "‘젊은 노인’과", "settersten-tr-008 first split");
      return expandSentence(first, 17, "‘노년기’를 정의", "settersten-tr-008 second split");
    });
  setMappedRule(context, "settersten-tr-009", [0, 1, 2, 2, 3, 3, 4, 5, 6, 7, 8, 9, 10, 11, 11]);
  setMappedRule(context, "settersten-tr-010",
    [0, 1, 2, 3, 4, 4, 5, 6, 7, 7, 8, 9, 10, 11, 12, 13, 14],
    (sentences) => expandSentence(sentences, 9, "2015년 Journals", "settersten-tr-010 split"));
  setMappedRule(context, "settersten-tr-015", [0, 1, 2, 3, 4, 5, 6, 6, 7, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
  setMappedRule(context, "settersten-tr-016", [0, 1, 1, 2, 3, 4, 5]);
  setMappedRule(context, "settersten-tr-018",
    [0, 1, 2, 3, 4, 5, 6, 7, 7, 8, 9, 10, 11, 12, 13, 13, 14, 15, 16, 17, 18],
    (sentences) => expandSentence(sentences, 9, "‘늙음’이라는", "settersten-tr-018 Korean split"),
    (sentences) => expandSentence(sentences, 7, "We now speak", "settersten-tr-018 source split"));
}

function reviewUnderwood(context) {
  setMappedRule(context, "underwood-2014-tr-001", [0, 1, 1, 2, 3]);
  setMappedRule(context, "underwood-2014-tr-012", [0, 1, 1]);
  setChunkRule(context, "underwood-2014-tr-013",
    ["전국 조사자료를", "1932년과 1947년에", "대신 한 대표표본을"],
    ["After unearthing", "Financial realities"],
    [0, 1, 1]);
  setChunkRule(context, "underwood-2014-tr-028",
    [
      "Assembly Hall의", "흰 머리와", "두 집단은", "1932년 Scottish",
      "이제 93세가", "반면 더 큰", "Deary는 “누가",
    ],
    ["To the study participants", "Gazing out over", "Few of the 550"],
    [0, 1, 1, 2, 2, 2, 2]);
  setMappedRule(context, "underwood-2014-tr-032", [0, 1, 2, 3, 3]);
  setChunkRule(context, "underwood-2014-tr-038",
    ["2009년 Lothian", "이 연합에는", "연구자들은", "Thompson은", "그는 같은 접근"],
    ["In 2009", "With access to", "The same approach"],
    [0, 0, 1, 1, 2]);
}

function reviewSlug(slug, reviewer) {
  const { alignment, alignmentPath, resolved } = loadReading(slug);
  const context = {
    rawById: new Map((alignment.entries || []).map((entry) => [entry.id, entry])),
    resolvedById: new Map(resolved.entries.map((entry) => [entry.id, entry])),
  };
  reviewer(context);
  const errors = [];
  resolved.entries.forEach((entry) => {
    const rawEntry = context.rawById.get(entry.id);
    rawEntry.sentence_pairs = mergeAdjacentSourcePairs(rawEntry.sentence_pairs, { sourceText: entry.sourceText });
    errors.push(...validateSentencePairs({
      id: entry.id,
      translationText: entry.translationBlock?.text || entry.translationBlock?.plainText || "",
      sourceText: entry.sourceText,
      pairs: rawEntry?.sentence_pairs,
    }, { allowedStatuses: ["generated", "verified"] }));
  });
  if (errors.length) throw new Error(`${slug}: reviewed sentence alignment failed\n  ${errors.join("\n  ")}`);
  alignment.sentence_alignment_note = "Sentence pairs were generated monotonically and all mismatch blocks were reviewed against the bilingual text before promotion.";
  alignment.sentence_alignment_reviewed_at = new Date().toISOString();
  alignment.sentence_alignment_status = "verified";
  fs.writeFileSync(alignmentPath, `${JSON.stringify(alignment, null, 2)}\n`, "utf8");
  const pairCount = (alignment.entries || []).reduce((sum, entry) => sum + (entry.sentence_pairs || []).length, 0);
  console.log(`[sentence-review] ${slug}: ${pairCount} structurally valid pairs`);
}

if (require.main === module) {
  const reviewers = {
    "levy-2009": reviewLevy,
    "settersten-godlewski-2016": reviewSettersten,
    "underwood-2014": reviewUnderwood,
  };
  const slugs = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === "--slug" && process.argv[index + 1]) {
      slugs.push(process.argv[index + 1]);
      index += 1;
    }
  }
  const selected = slugs.length ? slugs : ["levy-2009", "settersten-godlewski-2016"];
  selected.forEach((slug) => {
    if (!reviewers[slug]) throw new Error(`No manual sentence-review rules registered for ${slug}`);
    reviewSlug(slug, reviewers[slug]);
  });
}

module.exports = { reviewLevy, reviewSettersten, reviewUnderwood, reviewSlug };
