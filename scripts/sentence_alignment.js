const { sentenceSplitSourceText } = require("./translation_original_reveal");

const ALIGNMENT_TRANSITIONS = [
  [1, 1, 0],
  [1, 2, 0.16],
  [2, 1, 0.16],
  [1, 3, 0.34],
  [3, 1, 0.34],
  [1, 4, 0.54],
  [4, 1, 0.54],
];

function normalizeSentenceText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function visibleLength(value) {
  return normalizeSentenceText(value)
    .replace(/[`*_>#\[\](){}]/g, "")
    .replace(/\s+/g, "")
    .length;
}

function groupCost(koreanSentences, sourceSentences, ratio, penalty) {
  const koreanLength = koreanSentences.reduce((sum, sentence) => sum + visibleLength(sentence), 0);
  const sourceLength = sourceSentences.reduce((sum, sentence) => sum + visibleLength(sentence), 0);
  const expectedSourceLength = Math.max(1, koreanLength * ratio);
  const lengthCost = Math.abs(Math.log((sourceLength + 1) / (expectedSourceLength + 1)));
  return lengthCost + penalty;
}

function fallbackAlignment(koreanSentences, sourceSentences) {
  return koreanSentences.map((sentence, index) => {
    if (!sourceSentences.length) return { korean: [sentence], source: [] };
    if (sourceSentences.length >= koreanSentences.length) {
      const start = Math.floor((index * sourceSentences.length) / koreanSentences.length);
      const end = Math.max(start + 1, Math.floor(((index + 1) * sourceSentences.length) / koreanSentences.length));
      return { korean: [sentence], source: sourceSentences.slice(start, end) };
    }
    const sourceIndex = Math.min(
      sourceSentences.length - 1,
      Math.floor(((index + 0.5) * sourceSentences.length) / koreanSentences.length)
    );
    return { korean: [sentence], source: [sourceSentences[sourceIndex]] };
  });
}

function alignSentenceGroups(koreanSentences, sourceSentences) {
  const koreanCount = koreanSentences.length;
  const sourceCount = sourceSentences.length;
  if (!koreanCount || !sourceCount) return fallbackAlignment(koreanSentences, sourceSentences);
  const koreanTotal = koreanSentences.reduce((sum, sentence) => sum + visibleLength(sentence), 0);
  const sourceTotal = sourceSentences.reduce((sum, sentence) => sum + visibleLength(sentence), 0);
  const ratio = Math.max(0.1, sourceTotal / Math.max(1, koreanTotal));
  const scores = Array.from({ length: koreanCount + 1 }, () => Array(sourceCount + 1).fill(Number.POSITIVE_INFINITY));
  const previous = Array.from({ length: koreanCount + 1 }, () => Array(sourceCount + 1).fill(null));
  scores[0][0] = 0;

  for (let koreanIndex = 0; koreanIndex <= koreanCount; koreanIndex += 1) {
    for (let sourceIndex = 0; sourceIndex <= sourceCount; sourceIndex += 1) {
      if (!Number.isFinite(scores[koreanIndex][sourceIndex])) continue;
      ALIGNMENT_TRANSITIONS.forEach(([koreanTake, sourceTake, penalty]) => {
        const nextKorean = koreanIndex + koreanTake;
        const nextSource = sourceIndex + sourceTake;
        if (nextKorean > koreanCount || nextSource > sourceCount) return;
        const cost = groupCost(
          koreanSentences.slice(koreanIndex, nextKorean),
          sourceSentences.slice(sourceIndex, nextSource),
          ratio,
          penalty
        );
        const nextScore = scores[koreanIndex][sourceIndex] + cost;
        if (nextScore >= scores[nextKorean][nextSource]) return;
        scores[nextKorean][nextSource] = nextScore;
        previous[nextKorean][nextSource] = { koreanIndex, sourceIndex };
      });
    }
  }

  if (!Number.isFinite(scores[koreanCount][sourceCount])) {
    return fallbackAlignment(koreanSentences, sourceSentences);
  }

  const groups = [];
  let koreanIndex = koreanCount;
  let sourceIndex = sourceCount;
  while (koreanIndex > 0 || sourceIndex > 0) {
    const prior = previous[koreanIndex][sourceIndex];
    if (!prior) return fallbackAlignment(koreanSentences, sourceSentences);
    groups.push({
      korean: koreanSentences.slice(prior.koreanIndex, koreanIndex),
      source: sourceSentences.slice(prior.sourceIndex, sourceIndex),
    });
    koreanIndex = prior.koreanIndex;
    sourceIndex = prior.sourceIndex;
  }
  return groups.reverse();
}

function buildSentencePairs(translationText, sourceText, blockId, status = "generated") {
  const normalizedTranslation = normalizeSentenceText(translationText);
  const normalizedSource = normalizeSentenceText(sourceText);
  if (normalizedTranslation && normalizedTranslation === normalizedSource) {
    return [{
      id: `${blockId}-s01`,
      status,
      ko_text: normalizedTranslation,
      source_text: normalizedSource,
    }];
  }
  const koreanSentences = sentenceSplitSourceText(translationText);
  const sourceSentences = sentenceSplitSourceText(sourceText);
  if (koreanSentences.length && koreanSentences.length === sourceSentences.length) {
    return koreanSentences.map((sentence, index) => ({
      id: `${blockId}-s${String(index + 1).padStart(2, "0")}`,
      status,
      ko_text: normalizeSentenceText(sentence),
      source_text: normalizeSentenceText(sourceSentences[index]),
    }));
  }
  const groups = alignSentenceGroups(koreanSentences, sourceSentences);
  const pairs = groups.map((group, index) => ({
    id: `${blockId}-s${String(index + 1).padStart(2, "0")}`,
    status,
    ko_text: normalizeSentenceText(group.korean.join(" ")),
    source_text: normalizeSentenceText(group.source.join(" ")),
  }));
  return mergeAdjacentSourcePairs(pairs, { sourceText: normalizedSource });
}

function mergeAdjacentSourcePairs(pairs, options = {}) {
  const originals = (Array.isArray(pairs) ? pairs : []).map((pair) => ({ ...pair }));
  const sourceCoverage = (items) => normalizeSentenceText(items.map((pair) => pair.source_text).join(" "));
  const hasSourceText = options.sourceText !== undefined;
  const sourceText = normalizeSentenceText(options.sourceText);
  // A real repetition in the original is already covered once per occurrence.
  if (hasSourceText && sourceCoverage(originals) === sourceText) return originals;
  const merged = [];
  originals.forEach((pair) => {
    const previous = merged[merged.length - 1];
    const source = normalizeSentenceText(pair.source_text);
    if (source && previous && source === normalizeSentenceText(previous.source_text)
      && pair.status === previous.status) {
      previous.ko_text = normalizeSentenceText(`${previous.ko_text} ${pair.ko_text}`);
    } else {
      merged.push(pair);
    }
  });
  if (hasSourceText && sourceCoverage(merged) !== sourceText) {
    throw new Error("Cannot merge sentence pairs without changing source coverage; review the mapping first.");
  }
  return merged;
}

function collapseRepeatedSourceGroups(pairs) {
  const groups = [];
  (Array.isArray(pairs) ? pairs : []).forEach((pair) => {
    const sourceText = normalizeSentenceText(pair?.source_text);
    if (!sourceText || groups[groups.length - 1] === sourceText) return;
    groups.push(sourceText);
  });
  return groups;
}

function validateSentencePairs(entry, options = {}) {
  const errors = [];
  const id = normalizeSentenceText(entry?.id) || "translation-entry";
  const translationText = normalizeSentenceText(entry?.translationText);
  const sourceText = normalizeSentenceText(entry?.sourceText);
  const pairs = Array.isArray(entry?.pairs) ? entry.pairs : [];
  const allowedStatuses = new Set(
    (Array.isArray(options.allowedStatuses) && options.allowedStatuses.length
      ? options.allowedStatuses
      : ["verified"])
      .map((status) => normalizeSentenceText(status))
      .filter(Boolean)
  );
  if (!pairs.length) {
    errors.push(`${id}: sentence_pairs is missing or empty`);
    return errors;
  }
  const ids = new Set();
  pairs.forEach((pair, index) => {
    const pairId = normalizeSentenceText(pair?.id);
    if (!pairId) errors.push(`${id}: sentence pair ${index + 1} is missing id`);
    else if (ids.has(pairId)) errors.push(`${id}: duplicate sentence pair id ${pairId}`);
    else ids.add(pairId);
    if (!allowedStatuses.has(normalizeSentenceText(pair?.status))) {
      errors.push(`${id}: ${pairId || `sentence pair ${index + 1}`} is not verified`);
    }
    if (!normalizeSentenceText(pair?.ko_text)) errors.push(`${id}: ${pairId || index + 1} is missing ko_text`);
    if (!normalizeSentenceText(pair?.source_text)) errors.push(`${id}: ${pairId || index + 1} is missing source_text`);
  });
  const joinedKorean = normalizeSentenceText(pairs.map((pair) => pair.ko_text).join(" "));
  if (joinedKorean !== translationText) {
    errors.push(`${id}: sentence_pairs do not cover the complete Korean translation block`);
  }
  const joinedSource = normalizeSentenceText(pairs.map((pair) => pair.source_text).join(" "));
  if (joinedSource !== sourceText) {
    errors.push(`${id}: sentence_pairs must cover the complete source block once, in order, without repeated reveal groups`);
  }
  return errors;
}

module.exports = {
  alignSentenceGroups,
  buildSentencePairs,
  collapseRepeatedSourceGroups,
  mergeAdjacentSourcePairs,
  normalizeSentenceText,
  validateSentencePairs,
};
