const {
  parseMarkdownDocument,
  resolveTranslationAlignment,
} = require("./translation_original_reveal");
const { normalizeSentenceText, validateSentencePairs } = require("./sentence_alignment");

const normalize = normalizeSentenceText;
const parseOptions = { skipFirstTitleHeading: true, collectFrontmatter: true };

function fail(message) {
  throw new Error(`Original translation reveal: ${message}`);
}

// Replay the text units emitted by markdownToHtml, including its treatment of
// wrapped numbered references. Keep markers separately so native <ol> numbering
// remains outside the clickable text.
function scanRenderedUnits(markdown) {
  const units = [];
  let paragraph = [];
  let quote = [];
  let code = false;
  let contentHeading = false;
  let skippedTitle = false;
  const flushParagraph = () => {
    if (paragraph.length) units.push({ kind: "p", text: paragraph.join(" ").trim(), raw_text: paragraph.join(" ").trim() });
    paragraph = [];
  };
  const flushQuote = () => {
    if (quote.length) units.push({ kind: "quote", text: quote.join(" ").trim(), raw_text: quote.join(" ").trim() });
    quote = [];
  };
  for (const raw of String(markdown || "").replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (code) {
      if (line.startsWith("```")) code = false;
      continue;
    }
    if (!line || line === ">" || /^<!--[\s\S]*-->$/.test(line)) {
      flushParagraph(); flushQuote(); continue;
    }
    if (!contentHeading && /source_pdfs\//i.test(line)) {
      flushParagraph(); flushQuote(); continue;
    }
    if (line.startsWith("```")) {
      flushParagraph(); flushQuote(); code = true; continue;
    }
    if (/^!\[[^\]]*\]\([^)]+\)$/.test(line)) {
      flushParagraph(); flushQuote(); continue;
    }
    if (/^#{1,4} /.test(line)) {
      flushParagraph(); flushQuote();
      if (line.startsWith("# ") && !skippedTitle) skippedTitle = true;
      else contentHeading = true;
      continue;
    }
    if (line.startsWith("- ")) {
      flushParagraph(); flushQuote();
      units.push({ kind: "ul", text: line.slice(2).trim(), raw_text: line.slice(2).trim() });
      continue;
    }
    const numbered = line.match(/^(\d+)\.\s+(.+)$/);
    if (numbered) {
      flushParagraph(); flushQuote();
      units.push({ kind: "ol", text: numbered[2].trim(), raw_text: line, number: Number(numbered[1]), prefix: line.slice(0, line.indexOf(numbered[2])) });
      continue;
    }
    if (line.startsWith("> ")) {
      flushParagraph(); quote.push(line.slice(2).trim()); continue;
    }
    flushQuote(); paragraph.push(line);
  }
  flushParagraph(); flushQuote();
  return units;
}

function documentUnits(markdown) {
  const document = parseMarkdownDocument(markdown, parseOptions);
  const units = scanRenderedUnits(markdown);
  const blocks = [];
  let unitIndex = 0;
  const visit = (block, anchor) => {
    if (!["paragraph", "quote", "list"].includes(block.type)) return;
    const text = normalize(block.type === "list" ? block.items.join(" ") : block.text);
    const record = { block, anchor: { ...anchor, block_type: block.type }, text, units: [] };
    let position = 0;
    while (position < text.length) {
      while (text[position] === " ") position += 1;
      if (position === text.length) break;
      const unit = units[unitIndex];
      if (!unit) fail(`renderer text ended before ${JSON.stringify(anchor)}`);
      const raw = normalize(unit.raw_text);
      if (text.slice(position, position + raw.length) !== raw) {
        fail(`renderer/parser mismatch at ${JSON.stringify(anchor)}: ${raw.slice(0, 80)}`);
      }
      unit.start = position;
      unit.end = position + raw.length;
      unit.anchor = { ...record.anchor };
      if (block.type === "list" || unit.kind === "ol") unit.anchor.item_index = record.units.length;
      record.units.push(unit);
      position = unit.end;
      unitIndex += 1;
    }
    blocks.push(record);
  };
  document.frontmatterBlocks.forEach((block, index) => visit(block, { frontmatter_index: index }));
  document.blocks.forEach((block, index) => visit(block, { flat_index: index }));
  if (unitIndex !== units.length) fail("renderer produced text outside the parsed document");
  return { document, blocks, units };
}

function anchorKey(anchor) {
  if (Number.isInteger(anchor?.frontmatter_index)) return `frontmatter:${anchor.frontmatter_index}`;
  if (Number.isInteger(anchor?.flat_index)) return `body:${anchor.flat_index}`;
  fail("an explicit flat_index or frontmatter_index is required");
}

function supplementEntries(payload, slug, inheritedVersion) {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    if (!payload.length) fail("supplemental mapping array is empty");
    return payload.flatMap((item) => supplementEntries(item, slug, inheritedVersion));
  }
  const version = payload.version === undefined ? inheritedVersion : payload.version;
  if (version !== 1) fail("supplemental mappings require version 1");
  if (Array.isArray(payload.readings)) {
    if (!payload.readings.length) fail("supplemental readings array is empty");
    return payload.readings.filter((item) => item.slug === slug || item.reading_slug === slug).flatMap((item) => supplementEntries(item, slug, version));
  }
  if (payload.reading_slug !== undefined ? payload.reading_slug !== slug : payload.slug !== slug) fail("supplemental reading_slug does not match the alignment");
  if (Array.isArray(payload.entries)) return payload.entries;
  fail("invalid supplemental mapping payload");
}

function validatePairs(id, source, korean, pairs) {
  const errors = validateSentencePairs({ id, sourceText: source, translationText: korean, pairs }, { allowedStatuses: ["verified"] });
  if (errors.length) fail(errors.join("\n"));
}

function resolveSupplementText(record, anchor) {
  if (!record || record.block.type !== anchor.block_type) fail(`supplemental block type mismatch at ${anchorKey(anchor)}`);
  if (Number.isInteger(anchor.item_index)) {
    if (record.block.type !== "list" || !record.block.items[anchor.item_index]) fail(`invalid supplemental list item at ${anchorKey(anchor)}`);
    return record.block.items[anchor.item_index];
  }
  if (record.block.type === "list") fail("supplemental bullet lists require item_index");
  return record.block.text;
}

function collectOriginalTranslationUnits({ fullText, translationText, alignment, supplement } = {}) {
  if (!fullText || !translationText || !alignment) fail("full text, translation text, and alignment are required");
  const original = documentUnits(fullText);
  const translated = documentUnits(translationText);
  const originalByKey = new Map(original.blocks.map((record) => [anchorKey(record.anchor), record]));
  const translatedByKey = new Map(translated.blocks.map((record) => [anchorKey(record.anchor), record]));
  const resolved = resolveTranslationAlignment(alignment, translated.document, original.document, { allowedStatuses: ["verified"] });
  if (resolved.errors.length) fail(resolved.errors.join("\n"));
  const rawById = new Map((alignment.entries || []).map((entry) => [entry.id, entry]));
  const inputPairIds = new Set();
  const addPairs = (record, pairs, translationRecord = null) => {
    for (const pair of pairs) {
      if (inputPairIds.has(pair.id)) fail(`duplicate pair ID ${pair.id}`);
      inputPairIds.add(pair.id);
    }
    if (!record.pairs) record.pairs = [];
    record.pairs.push(...pairs.map((pair) => ({ ...pair })));
    if (translationRecord) record.translationRecord = translationRecord;
  };
  for (const entry of resolved.entries) {
    const raw = rawById.get(entry.id);
    const pairs = raw?.sentence_pairs || [];
    validatePairs(entry.id, entry.sourceText, entry.translationBlock.text, pairs);
    const key = `body:${entry.originalBlock.flatIndex}`;
    addPairs(originalByKey.get(key), pairs, translatedByKey.get(`body:${entry.translationBlock.flatIndex}`));
  }
  const supplementalIds = new Set();
  for (const entry of supplementEntries(supplement, alignment.reading_slug)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) fail("invalid supplemental entry");
    if (entry.status !== "verified-existing-text") fail(`unverified supplement ${entry.id}`);
    if (!entry.id || supplementalIds.has(entry.id)) fail(`duplicate or missing supplement ID ${entry.id}`);
    supplementalIds.add(entry.id);
    const record = originalByKey.get(anchorKey(entry.en_anchor));
    const translationRecord = translatedByKey.get(anchorKey(entry.ko_anchor));
    const source = resolveSupplementText(record, entry.en_anchor);
    const korean = resolveSupplementText(translationRecord, entry.ko_anchor);
    if (source !== entry.source_text || korean !== entry.ko_text) fail(`supplemental text changed: ${entry.id}`);
    const pairs = entry.sentence_pairs || [{ id: entry.id, status: "verified", source_text: source, ko_text: korean }];
    validatePairs(entry.id, source, korean, pairs);
    addPairs(record, pairs, translationRecord);
  }
  const result = [];
  const outputIds = new Set();
  for (const record of original.blocks) {
    const pairs = record.pairs || [];
    const required = Number.isInteger(record.anchor.flat_index);
    if (!pairs.length) {
      if (required) fail(`unmapped ${record.block.type} at ${anchorKey(record.anchor)}`);
      result.push(...record.units.map((unit) => ({ ...unit, pairs: [] })));
      continue;
    }
    // Exact, sequential coverage rejects overlaps, repeated controls, missing
    // quote/list items, and changes in the original ordering.
    if (normalize(pairs.map((pair) => pair.source_text).join(" ")) !== record.text) fail(`source coverage mismatch at ${anchorKey(record.anchor)}`);
    let position = 0;
    const ranges = pairs.map((pair) => {
      while (record.text[position] === " ") position += 1;
      const start = position;
      position += normalize(pair.source_text).length;
      return { pair, start, end: position, pieces: 0 };
    });
    const numbered = record.units.length > 1 && record.units.every((unit) => unit.kind === "ol");
    const koreanUnits = record.translationRecord?.units || [];
    if (numbered && (koreanUnits.length !== record.units.length || koreanUnits.some((unit, i) => unit.kind !== "ol" || unit.number !== record.units[i].number))) {
      fail(`numbered source/translation list labels differ at ${anchorKey(record.anchor)}`);
    }
    for (const [unitIndex, unit] of record.units.entries()) {
      const prefixLength = unit.kind === "ol" ? normalize(unit.raw_text).length - normalize(unit.text).length : 0;
      const visibleStart = unit.start + prefixLength;
      const renderedPairs = [];
      for (const range of ranges) {
        const start = Math.max(visibleStart, range.start);
        const end = Math.min(unit.end, range.end);
        if (start >= end) continue;
        const source = record.text.slice(start, end);
        let korean;
        const wholePair = start === range.start && end === range.end;
        if (wholePair) korean = range.pair.ko_text;
        else if (normalize(range.pair.source_text) === normalize(range.pair.ko_text)) korean = source;
        else if (numbered && pairs.length === 1) korean = koreanUnits[unitIndex].text;
        else if (unit.kind === "ol" && range.start === unit.start && range.end === unit.end) {
          const match = normalize(range.pair.ko_text).match(/^(\d+)\.\s+(.+)$/);
          if (!match || Number(match[1]) !== unit.number) fail(`translation number differs for ${range.pair.id}`);
          korean = match[2];
        } else fail(`cannot split a translated sentence across rendered units: ${range.pair.id}`);
        range.pieces += 1;
        const id = range.pieces === 1 ? range.pair.id : `${range.pair.id}-part-${range.pieces}`;
        if (outputIds.has(id)) fail(`duplicate rendered pair ID ${id}`);
        outputIds.add(id);
        renderedPairs.push({ id, status: "verified", source_text: source, ko_text: korean, anchor: { ...unit.anchor } });
      }
      if (normalize(renderedPairs.map((pair) => pair.source_text).join(" ")) !== normalize(unit.text)) fail(`rendered text coverage mismatch at ${anchorKey(unit.anchor)}`);
      result.push({ ...unit, pairs: renderedPairs });
    }
  }
  return result;
}

function collectOriginalTranslationPairs(options) {
  return collectOriginalTranslationUnits(options).flatMap((unit) => unit.pairs);
}

module.exports = {
  collectOriginalTranslationUnits,
  collectOriginalTranslationRenderUnits: collectOriginalTranslationUnits,
  collectOriginalTranslationPairs,
};
