const assert = require("node:assert/strict");
const {
  buildSentencePairs,
  mergeAdjacentSourcePairs,
  normalizeSentenceText,
  validateSentencePairs,
} = require("./sentence_alignment");

let checks = 0;
function verify(label, callback) {
  callback();
  checks += 1;
  console.log(`PASS ${label}`);
}

function pair(id, koText, sourceText, status = "verified") {
  return { id, status, ko_text: koText, source_text: sourceText };
}

function joined(pairs, key) {
  return normalizeSentenceText(pairs.map((item) => item[key]).join(" "));
}

function errorsFor(pairs, translationText, sourceText, options) {
  return validateSentencePairs({ id: "fixture", translationText, sourceText, pairs }, options);
}

verify("multiple Korean sentences translated from one English sentence share one generated control", () => {
  const korean = "검사는 쉽게 시작했다. 간단한 유추 문제였다.";
  const source = "The test began easily, with simple analogies.";
  const pairs = buildSentencePairs(korean, source, "analogy", "verified");
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].ko_text, korean);
  assert.equal(pairs[0].source_text, source);
  assert.deepEqual(errorsFor(pairs, korean, source), []);
});

verify("fallback generation also preserves one source with more than four Korean sentences", () => {
  const korean = "첫째다. 둘째다. 셋째다. 넷째다. 다섯째다.";
  const source = "Five related points belong to the same source sentence.";
  const pairs = buildSentencePairs(korean, source, "fallback", "verified");
  assert.equal(pairs.length, 1);
  assert.deepEqual(errorsFor(pairs, korean, source), []);
});

verify("merging is lossless, stable in order, and preserves the first control ID", () => {
  const original = [
    pair("first", "앞 문장이다.", "First source."),
    { ...pair("shared-a", "설명이다.", "Shared source."), review_note: "Keep original review metadata." },
    pair("shared-b", "예시다.", "Shared source."),
    pair("shared-c", "추가 설명이다.", "Shared source."),
    pair("last", "뒤 문장이다.", "Last source."),
  ];
  const before = structuredClone(original);
  const source = "First source. Shared source. Last source.";
  const merged = mergeAdjacentSourcePairs(original, { sourceText: source });
  assert.deepEqual(original, before, "input pairs must not be mutated");
  assert.deepEqual(merged.map((item) => item.id), ["first", "shared-a", "last"]);
  assert.equal(merged[1].ko_text, "설명이다. 예시다. 추가 설명이다.");
  assert.equal(merged[1].review_note, original[1].review_note);
  assert.equal(joined(merged, "ko_text"), joined(original, "ko_text"));
  assert.equal(joined(merged, "source_text"), source);
  assert.deepEqual(mergeAdjacentSourcePairs(merged, { sourceText: source }), merged, "repeated migration must be idempotent");
  assert.deepEqual(errorsFor(merged, joined(original, "ko_text"), source), []);
});

verify("source comparison normalizes whitespace without dropping Korean words", () => {
  const original = [pair("a", "첫 문장이다.", "The  same\nsource."), pair("b", "둘째 문장이다.", " The same source. ")];
  const merged = mergeAdjacentSourcePairs(original, { sourceText: "The same source." });
  assert.equal(merged.length, 1);
  assert.equal(joined(merged, "ko_text"), "첫 문장이다. 둘째 문장이다.");
  assert.equal(joined(merged, "source_text"), "The same source.");
});

verify("equal sources separated by another source remain separate controls", () => {
  const original = [pair("a", "반복이다.", "Repeated."), pair("b", "중간이다.", "Middle."), pair("c", "다시 반복이다.", "Repeated.")];
  const source = "Repeated. Middle. Repeated.";
  assert.deepEqual(mergeAdjacentSourcePairs(original, { sourceText: source }), original);
  assert.deepEqual(errorsFor(original, joined(original, "ko_text"), source), []);
});

verify("different source groups and review statuses are never silently merged", () => {
  const original = [pair("a", "검토했다.", "Shared source."), pair("b", "생성했다.", "Shared source.", "generated"), pair("c", "다시 검토했다.", "Shared source.")];
  assert.deepEqual(mergeAdjacentSourcePairs(original), original);
  assert.throws(() => mergeAdjacentSourcePairs(original, { sourceText: "Shared source." }), "review status conflicts need review");
  const overlapping = [pair("d", "첫 부분이다.", "First. Second."), pair("e", "둘째 부분이다.", "Second.")];
  assert.deepEqual(mergeAdjacentSourcePairs(overlapping), overlapping, "partially overlapping source groups need review");
  assert.throws(() => mergeAdjacentSourcePairs(overlapping, { sourceText: "First. Second." }));
});

verify("a source-aware merge rejects unrelated missing or reordered source text", () => {
  const original = [pair("a", "첫째다.", "First."), pair("b", "둘째다.", "Second.")];
  assert.throws(() => mergeAdjacentSourcePairs(original, { sourceText: "First. Second. Missing." }));
  assert.throws(() => mergeAdjacentSourcePairs(original, { sourceText: "Second. First." }));
});

verify("validator rejects separate controls that redundantly reveal one English source", () => {
  const original = [pair("a", "설명이다.", "Shared source."), pair("b", "예시다.", "Shared source.")];
  assert(errorsFor(original, joined(original, "ko_text"), "Shared source.").length > 0);
  const merged = mergeAdjacentSourcePairs(original, { sourceText: "Shared source." });
  assert.deepEqual(errorsFor(merged, joined(original, "ko_text"), "Shared source."), []);
});

verify("true repeated consecutive original sentences remain two valid source occurrences", () => {
  const korean = "다시 시도했다. 거듭 시도했다.";
  const source = "They tried again. They tried again.";
  const pairs = buildSentencePairs(korean, source, "true-repeat", "verified");
  assert.equal(pairs.length, 2);
  assert.equal(joined(pairs, "source_text"), source);
  assert.deepEqual(mergeAdjacentSourcePairs(pairs, { sourceText: source }), pairs);
  assert.deepEqual(errorsFor(pairs, korean, source), []);
});

verify("existing validation still rejects text loss, reordering, duplicate IDs and unreviewed pairs", () => {
  const original = [pair("a", "첫째다.", "First."), pair("b", "둘째다.", "Second.")];
  const korean = "첫째다. 둘째다.";
  const source = "First. Second.";
  for (const changed of [
    original.slice(0, 1),
    original.slice().reverse(),
    [original[0], { ...original[1], id: "a" }],
    [original[0], { ...original[1], status: "generated" }],
    [original[0], { ...original[1], ko_text: "" }],
    [original[0], { ...original[1], source_text: "" }],
  ]) {
    assert(errorsFor(changed, korean, source).length > 0);
  }
  const generated = original.map((item) => ({ ...item, status: "generated" }));
  assert.deepEqual(errorsFor(generated, korean, source, { allowedStatuses: ["generated", "verified"] }), []);
});

// Fixed bilingual fixture for the reported Underwood opening paragraph. Keep it
// independent of the current alignment JSON so migration cannot erase the bug.
verify("Underwood's analogy and example become one control without altering the opening paragraph", () => {
  const id = "underwood-2014-tr-001";
  const analogySource = "It began easily enough, with simple analogies: “A man is to skin as what—coat, animal, bird, skin or cloth—is to fur?” for example.";
  const original = [
    pair(`${id}-s01`, "1947년 6월 4일, 여름방학을 앞둔 11세 Sheila McGowan은 스코틀랜드 Glasgow의 한 공립학교에서 연필과 종이를 들고 지능검사를 치렀다.", "On 4 June in 1947, just before being released for the summer holiday, 11-year-old Sheila McGowan sat down at her desk with a pencil and paper to take an intelligence test at a state-run school in Glasgow, Scotland."),
    pair(`${id}-s02`, "검사는 간단한 유추 문제로 쉽게 시작했다.", analogySource),
    pair(`${id}-s03`, "예를 들면 “사람과 피부의 관계는 무엇—외투, 동물, 새, 가죽, 천—과 털의 관계와 같은가?”라는 문제였다.", analogySource),
    pair(`${id}-s04`, "이내 공간 퍼즐, 산수, 암호 해독처럼 더 어려운 과제로 넘어갔다.", "The test quickly progressed to more difficult challenges: spatial puzzles, arithmetic, and decoding cyphers."),
    pair(`${id}-s05`, "문항은 모두 71개였고, 주어진 시간은 45분뿐이었다.", "There were 71 questions in all, with only 45 minutes to finish."),
  ];
  const source = joined([original[0], original[1], original[3], original[4]], "source_text");
  const korean = joined(original, "ko_text");
  assert(errorsFor(original, korean, source).length > 0);
  const merged = mergeAdjacentSourcePairs(original, { sourceText: source });
  assert.equal(merged.length, 4);
  assert.equal(merged[1].id, `${id}-s02`);
  assert.equal(merged[1].ko_text, `${original[1].ko_text} ${original[2].ko_text}`);
  assert.equal(merged[1].source_text, analogySource);
  assert.deepEqual(errorsFor(merged, korean, source), []);
});

console.log(`PASS sentence alignment (${checks} regression checks)`);
