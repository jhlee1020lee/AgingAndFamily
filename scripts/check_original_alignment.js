const assert = require("node:assert/strict");
const { collectOriginalTranslationUnits } = require("./original_translation_reveal");

let count = 0;
function check(label, run) {
  run();
  count += 1;
  console.log(`PASS ${label}`);
}

function fixture(source = "First. Second.", korean = "첫째다. 둘째다.", pairs = [
  { id: "first", status: "verified", source_text: "First.", ko_text: "첫째다." },
  { id: "second", status: "verified", source_text: "Second.", ko_text: "둘째다." },
]) {
  return {
    fullText: `# Fixture\n\n> Author metadata.\n\n## Body\n\n${source}\n\n> Quoted thought.\n`,
    translationText: `# 번역\n\n> 저자 정보.\n\n## 본문\n\n${korean}\n\n> 인용한 생각이다.\n`,
    alignment: {
      version: 2,
      reading_slug: "fixture",
      entries: [{
        id: "paragraph",
        status: "verified",
        unit: "context_block",
        en_anchor: { flat_index: 1, block_type: "paragraph" },
        ko_anchor: { flat_index: 1, block_type: "paragraph" },
        source_text: source.replace(/\s+/g, " ").trim(),
        sentence_pairs: pairs,
      }],
    },
    supplement: {
      version: 1,
      reading_slug: "fixture",
      entries: [{
        id: "quote",
        status: "verified-existing-text",
        en_anchor: { flat_index: 2, block_type: "quote" },
        ko_anchor: { flat_index: 2, block_type: "quote" },
        source_text: "Quoted thought.",
        ko_text: "인용한 생각이다.",
      }],
    },
  };
}

check("repeated source occurrences preserve distinct Korean answers and IDs", () => {
  const input = fixture("Repeated. Middle. Repeated.", "처음이다. 중간이다. 다시다.", [
    { id: "a", status: "verified", source_text: "Repeated.", ko_text: "처음이다." },
    { id: "b", status: "verified", source_text: "Middle.", ko_text: "중간이다." },
    { id: "c", status: "verified", source_text: "Repeated.", ko_text: "다시다." },
  ]);
  const original = structuredClone(input);
  const units = collectOriginalTranslationUnits(input);
  assert.deepEqual(units[1].pairs.map(({ id, source_text, ko_text }) => ({ id, source_text, ko_text })), input.alignment.entries[0].sentence_pairs.map(({ id, source_text, ko_text }) => ({ id, source_text, ko_text })));
  assert.equal(units[0].pairs.length, 0, "metadata stays in the occurrence sequence");
  assert.deepEqual(input, original, "collection must not mutate approved inputs");
});

check("duplicate pair IDs and unverified pairs are rejected", () => {
  const duplicate = fixture();
  duplicate.alignment.entries[0].sentence_pairs[1].id = "first";
  assert.throws(() => collectOriginalTranslationUnits(duplicate), /duplicate/);
  const unverified = fixture();
  unverified.alignment.entries[0].sentence_pairs[0].status = "generated";
  assert.throws(() => collectOriginalTranslationUnits(unverified), /not verified/);
});

check("changed or missing supplemental source and Korean text are rejected", () => {
  for (const field of ["source_text", "ko_text"]) {
    for (const value of ["Wrong content.", "", undefined]) {
      const input = fixture();
      input.supplement.entries[0][field] = value;
      assert.throws(() => collectOriginalTranslationUnits(input), /supplemental text changed/);
    }
  }
  const wrongAnchor = fixture();
  wrongAnchor.supplement.entries[0].ko_anchor.flat_index = 1;
  assert.throws(() => collectOriginalTranslationUnits(wrongAnchor), /block type mismatch/);
});

check("dropping a required source quote or paragraph cannot silently reduce coverage", () => {
  const missingQuote = fixture();
  missingQuote.supplement = null;
  assert.throws(() => collectOriginalTranslationUnits(missingQuote), /unmapped quote/);
  const missingParagraph = fixture();
  missingParagraph.alignment.entries = [];
  assert.throws(() => collectOriginalTranslationUnits(missingParagraph), /unmapped paragraph/);
});

check("supplement schema rejects malformed payloads and accepts an empty per-reading entries array", () => {
  for (const supplement of [
    {}, [],
    { version: 1, reading_slug: "fixture", entries: {} },
    { version: 1, reading_slug: "fixture", entries: [null] },
    { version: 1, reading_slug: "fixture", entries: [{}] },
    { version: 1, reading_slug: "another-reading", entries: fixture().supplement.entries },
    { version: 2, reading_slug: "fixture", entries: fixture().supplement.entries },
  ]) {
    assert.throws(() => collectOriginalTranslationUnits({ ...fixture(), supplement }));
  }
  const input = fixture();
  const wrapped = [{ version: 1, readings: [{ slug: "fixture", entries: input.supplement.entries }] }];
  assert.deepEqual(collectOriginalTranslationUnits({ ...input, supplement: wrapped }), collectOriginalTranslationUnits(input));
  const complete = fixture();
  complete.fullText = complete.fullText.replace("\n\n> Quoted thought.\n", "\n");
  complete.translationText = complete.translationText.replace("\n\n> 인용한 생각이다.\n", "\n");
  complete.supplement.entries = [];
  assert.deepEqual(collectOriginalTranslationUnits(complete), collectOriginalTranslationUnits({ ...complete, supplement: null }));
});

check("supplemental status, duplicate controls and overlapping source mappings are rejected", () => {
  const status = fixture();
  status.supplement.entries[0].status = "generated";
  assert.throws(() => collectOriginalTranslationUnits(status), /unverified supplement/);
  const duplicate = fixture();
  duplicate.supplement.entries.push(structuredClone(duplicate.supplement.entries[0]));
  assert.throws(() => collectOriginalTranslationUnits(duplicate), /duplicate/);
  const overlap = fixture();
  overlap.supplement.entries.push({ ...structuredClone(overlap.supplement.entries[0]), id: "quote-again" });
  assert.throws(() => collectOriginalTranslationUnits(overlap), /source coverage mismatch/);
});

function numberedFixture(secondNumber = 2) {
  return fixture("1. First item\n2. Second item", `1. 첫 항목\n${secondNumber}. 둘째 항목`, [{
    id: "numbered",
    status: "verified",
    source_text: "1. First item 2. Second item",
    ko_text: `1. 첫 항목 ${secondNumber}. 둘째 항목`,
  }]);
}

check("numbered lists preserve exact numbered correspondence and native list markers", () => {
  const units = collectOriginalTranslationUnits(numberedFixture()).filter((unit) => unit.kind === "ol");
  assert.deepEqual(units.map((unit) => unit.number), [1, 2]);
  assert.deepEqual(units.map((unit) => unit.text), ["First item", "Second item"]);
  assert.deepEqual(units.map((unit) => unit.pairs[0].ko_text), ["첫 항목", "둘째 항목"]);
  assert.deepEqual(units.map((unit) => unit.pairs[0].id), ["numbered", "numbered-part-2"]);
  assert.throws(() => collectOriginalTranslationUnits(numberedFixture(3)), /list labels differ/);
});

check("translated sentences crossing rendered units require a reviewed mapping", () => {
  const input = fixture("1. First line\ncontinued line.", "1. 첫 줄\n이어지는 줄이다.", [{
    id: "cross-unit",
    status: "verified",
    source_text: "1. First line continued line.",
    ko_text: "1. 첫 줄 이어지는 줄이다.",
  }]);
  assert.throws(() => collectOriginalTranslationUnits(input), /cannot split a translated sentence/);
});

check("unchanged reference text may be split losslessly around renderer line wrapping", () => {
  const text = "1. First line\ncontinued line.";
  const input = fixture(text, text, [{ id: "reference", status: "verified", source_text: "1. First line continued line.", ko_text: "1. First line continued line." }]);
  // The fixture quote follows the extra paragraph emitted by the old renderer,
  // while the alignment parser still sees one source paragraph before it.
  const units = collectOriginalTranslationUnits(input).filter((unit) => ["ol", "p"].includes(unit.kind));
  assert.deepEqual(units.map((unit) => unit.text), ["First line", "continued line."]);
  assert.deepEqual(units.map((unit) => unit.pairs[0].ko_text), ["First line", "continued line."]);
});

console.log(`PASS original alignment (${count} regression checks)`);
