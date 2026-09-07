const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { validateProfessorPrepJson, validateReflectionPrepArtifacts, sourceHashForPage } = require("./validate_content");

function run() {
  let checks = 0;
  const verify = (label, check) => { check(); checks += 1; console.log(`PASS reflection practice: ${label}`); };
  const evidence = new Set(["S1", "S2"]);
  const makeCards = (count, prefix) => Array.from({ length: count }, (_, index) => ({
    card_id: `${prefix}-${index + 1}`, title: `Explain claim ${index + 1}.`, title_ko: `주장 ${index + 1}을 설명하나요?`,
    answer_30s: `The source supports claim ${index + 1}.`, answer_30s_ko: `원문은 주장 ${index + 1}을 뒷받침합니다.`, evidence_segment_id: "S1",
  }));
  const legacy = { language: "en", title: "Practice", instructions: "Explain the reading.", cards: makeCards(15, "cold"),
    reading_response: { title: "Response", instructions: "Use evidence.", cards: makeCards(6, "response") } };
  const practice = structuredClone(legacy);
  practice.practice_format = "reflection-followups-v1";
  practice.default_tab = "reading-response";
  practice.reading_response.title = "읽고 든 생각";
  practice.reading_response.instructions = "첫 답변과 이어지는 질문을 연습하세요.";
  practice.reading_response.cards.forEach((card, index) => {
    Object.assign(card, { entry_type: index < 3 ? "reading" : "experience", topic: `Topic ${index + 1}`, topic_ko: `주제 ${index + 1}` });
    if (card.entry_type === "experience") Object.assign(card, { experience_prompt: "Use your own experience, if relevant.", experience_prompt_ko: "관련된 자신의 경험이 있다면 연결해 보세요." });
    card.followups = Array.from({ length: 3 }, (_, n) => ({ id: `${card.card_id}-followup-${n + 1}`,
      question: `What supports ${card.card_id} step ${n + 1}?`, question_ko: `${card.card_id} 단계 ${n + 1}의 근거는 무엇인가요?`,
      answer: `Evidence explains ${card.card_id} step ${n + 1}.`, answer_ko: `원문은 ${card.card_id} 단계 ${n + 1}을 설명합니다.`, evidence_segment_id: n === 2 ? "S2" : "S1" }));
    if (card.entry_type === "experience") {
      card.answer_30s = "In this hypothetical example, {{scene}} {{age_cue}} {{prior_view}} The source claim stays fixed.";
      card.answer_30s_ko = "이 가상 예시에서는 {{scene}} {{age_cue}} {{prior_view}} 원문의 주장은 그대로 유지됩니다.";
      card.followups[0].answer += " The hypothetical cue is: {{age_cue}}";
      card.followups[0].answer_ko += " 가상 상황의 단서는 다음과 같습니다. {{age_cue}}";
      card.experience_examples = Array.from({ length: 6 }, (_, n) => ({
        id: `${card.card_id}-example-${n + 1}`, label: `Example ${n + 1}`, label_ko: `가상 예시 ${n + 1}`,
        values: {
          scene: { en: `I observed scene ${n + 1}.`, ko: `저는 상황 ${n + 1}을 보았습니다.` },
          age_cue: { en: `Someone mentioned age ${n + 1}.`, ko: `누군가 나이에 관한 단서 ${n + 1}을 언급했습니다.` },
          prior_view: { en: `I reconsidered assumption ${n + 1}.`, ko: `저는 생각 ${n + 1}을 다시 살펴보았습니다.` },
        },
      }));
    }
  });
  verify("legacy decks remain valid without opting in", () => assert.deepEqual(validateProfessorPrepJson(legacy, evidence).errors, []));
  verify("six bilingual entries, eighteen followups, and eighteen examples pass", () => {
    const result = validateProfessorPrepJson(practice, evidence);
    assert.deepEqual(result.errors, []);
    assert.equal(result.metrics.card_count, 15);
    assert.equal(result.metrics.reading_response_card_count, 6);
    assert.equal(result.metrics.followup_count, 18);
    assert.equal(result.metrics.reading_entry_count, 3);
    assert.equal(result.metrics.experience_entry_count, 3);
    assert.equal(result.metrics.experience_example_count, 18);
  });
  const entry = (data) => data.reading_response.cards[0];
  const followup = (data) => entry(data).followups[0];
  const experience = (data) => data.reading_response.cards[3];
  const example = (data) => experience(data).experience_examples[0];
  const failures = [
    ["unsupported format", (d) => { d.practice_format = "reflection-typo"; }, /unsupported practice_format/],
    ["wrong default tab", (d) => { d.default_tab = "cold-call"; }, /default_tab/],
    ["removal of the retained internal source cards", (d) => { d.cards = []; }, /at least 15 cards/],
    ["English-only reflection section instructions", (d) => { d.reading_response.instructions = "Use evidence."; }, /reading_response instructions must contain Korean/],
    ["missing entry type", (d) => { delete entry(d).entry_type; }, /entry_type/],
    ["only two reading entries", (d) => { d.reading_response.cards.splice(0, 1); }, /at least 3 reading entries/],
    ["only two experience entries", (d) => { d.reading_response.cards.pop(); }, /at least 3 experience entries/],
    ["invalid first-answer card ID", (d) => { entry(d).card_id = "invalid ID"; }, /invalid card_id/],
    ["duplicate first-answer card ID", (d) => { d.reading_response.cards[1].card_id = entry(d).card_id; }, /duplicate card_id/],
    ["missing first-answer evidence", (d) => { delete entry(d).evidence_segment_id; }, /missing evidence_segment_id/],
    ["unknown experience first-answer evidence", (d) => { experience(d).evidence_segment_id = "ANOTHER-PAPER"; }, /unknown evidence_segment_id/],
    ["missing Korean topic", (d) => { delete entry(d).topic_ko; }, /topic_ko/],
    ["empty followups", (d) => { entry(d).followups = []; }, /at least 3 followups/],
    ["non-array followups", (d) => { entry(d).followups = {}; }, /at least 3 followups/],
    ["only two followups", (d) => { experience(d).followups.pop(); }, /at least 3 followups/],
    ["non-object followup", (d) => { entry(d).followups[0] = null; }, /followup 1 is not an object/],
    ["missing followup ID", (d) => { delete followup(d).id; }, /invalid id/],
    ["duplicate ID across entries", (d) => { d.reading_response.cards[1].followups[0].id = followup(d).id; }, /duplicate id/],
    ["followup ID collides with a card", (d) => { followup(d).id = d.cards[0].card_id; }, /duplicate id/],
    ["missing followup evidence", (d) => { delete followup(d).evidence_segment_id; }, /missing evidence_segment_id/],
    ["unknown followup evidence", (d) => { followup(d).evidence_segment_id = "NOT-IN-THIS-READING"; }, /unknown evidence_segment_id/],
    ["missing English question", (d) => { delete followup(d).question; }, /missing question/],
    ["missing English answer", (d) => { followup(d).answer = " "; }, /missing answer/],
    ["Korean text in English answer", (d) => { followup(d).answer = "한국어 답변입니다."; }, /must contain English/],
    ["missing Korean question", (d) => { delete followup(d).question_ko; }, /question_ko/],
    ["English-only Korean answer", (d) => { followup(d).answer_ko = "An English answer."; }, /answer_ko/],
    ["damaged Korean answer", (d) => { followup(d).answer_ko = "한국어 답변 ??"; }, /undamaged Korean/],
    ["missing first Korean answers", (d) => { for (const c of [...d.cards, ...d.reading_response.cards]) { delete c.title_ko; delete c.answer_30s_ko; } }, /Korean text/],
    ["experience without English guidance", (d) => { delete d.reading_response.cards[3].experience_prompt; }, /missing experience_prompt/],
    ["experience without Korean guidance", (d) => { delete d.reading_response.cards[3].experience_prompt_ko; }, /experience_prompt_ko/],
    ["experience without examples", (d) => { delete experience(d).experience_examples; }, /at least 6 experience_examples/],
    ["experience with only five examples", (d) => { experience(d).experience_examples.length = 5; }, /at least 6 experience_examples/],
    ["non-object experience example", (d) => { experience(d).experience_examples[0] = null; }, /experience example 1 is not an object/],
    ["invalid experience example ID", (d) => { example(d).id = "contains spaces"; }, /example 1 has invalid id/],
    ["duplicate experience example ID", (d) => { experience(d).experience_examples[1].id = example(d).id; }, /duplicate example id/],
    ["identical example values with different IDs", (d) => { experience(d).experience_examples[1].values = structuredClone(example(d).values); }, /duplicates another example's slot values/],
    ["missing Korean example label", (d) => { delete example(d).label_ko; }, /label_ko/],
    ["missing example values", (d) => { delete example(d).values; }, /needs slot values/],
    ["missing example slot", (d) => { delete example(d).values.age_cue; }, /age_cue is missing en/],
    ["missing Korean example value", (d) => { delete example(d).values.scene.ko; }, /scene ko/],
    ["Korean text in English example value", (d) => { example(d).values.scene.en = "한글 상황입니다."; }, /scene en must contain English/],
    ["damaged Korean example value", (d) => { example(d).values.scene.ko = "손상된 상황 �"; }, /undamaged Korean/],
    ["unknown example slot", (d) => { example(d).values.other = { en: "Another value.", ko: "다른 값입니다." }; }, /unknown slot values/],
    ["an example containing another placeholder", (d) => { example(d).values.scene.en += " {{scene}}"; }, /contains an unresolved placeholder/],
    ["unknown answer slot", (d) => { experience(d).answer_30s += " {{unknown}}"; }, /unknown experience slot/],
    ["different English and Korean slot counts", (d) => { experience(d).answer_30s += " {{scene}}"; }, /mismatched English and Korean experience slots/],
    ["different followup slot names", (d) => { experience(d).followups[0].answer_ko = experience(d).followups[0].answer_ko.replace("{{age_cue}}", "{{scene}}"); }, /mismatched English and Korean experience slots/],
    ["malformed template token", (d) => { experience(d).answer_30s = experience(d).answer_30s.replace("{{scene}}", "{{scene}"); }, /unresolved placeholder/],
    ["old bracket placeholder", (d) => { experience(d).answer_30s += " [your experience]"; }, /unresolved placeholder/],
    ["first answer without replaceable experience", (d) => { experience(d).answer_30s = "The claim is fixed."; experience(d).answer_30s_ko = "주장은 고정되어 있습니다."; }, /first answer must use experience slots/],
    ["an unused example value", (d) => { experience(d).answer_30s = experience(d).answer_30s.replace("{{prior_view}}", ""); experience(d).answer_30s_ko = experience(d).answer_30s_ko.replace("{{prior_view}}", ""); }, /must use all three experience slots/],
    ["experience tokens in a reading entry", (d) => { entry(d).answer_30s += " {{scene}}"; }, /only experience entries/],
  ];
  failures.forEach(([label, change, expected]) => verify(`rejects ${label}`, () => {
    const changed = structuredClone(practice); change(changed);
    const errors = validateProfessorPrepJson(changed, evidence).errors;
    assert.ok(errors.some((error) => expected.test(error)), errors.join("\n"));
  }));
  verify("reading entries need no invented experience prompt", () => assert.equal(entry(practice).experience_prompt, undefined));
  verify("additional examples and followups remain valid", () => {
    const changed = structuredClone(practice);
    const extraExample = structuredClone(example(changed));
    extraExample.id = "additional-example";
    extraExample.values.scene = { en: "I considered another scene.", ko: "저는 또 다른 장면을 생각해 보았습니다." };
    experience(changed).experience_examples.push(extraExample);
    const extraFollowup = structuredClone(followup(changed)); extraFollowup.id = "additional-followup";
    entry(changed).followups.push(extraFollowup);
    assert.deepEqual(validateProfessorPrepJson(changed, evidence).errors, []);
  });
  verify("additional reading entries remain valid beyond the shared minimum", () => {
    const changed = structuredClone(practice);
    const extra = structuredClone(entry(changed)); extra.card_id = "additional-reading";
    extra.followups.forEach((item, index) => { item.id = `additional-reading-followup-${index + 1}`; });
    changed.reading_response.cards.push(extra);
    assert.deepEqual(validateProfessorPrepJson(changed, evidence).errors, []);
  });
  const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const answerText = (value, language, sample) => sample ? escape(value).replace(/\{\{([^{}]*)\}\}/g, (_, slot) => `[<span data-prep-experience-slot="${slot}" data-prep-experience-language="${language}">${escape(sample.values[slot][language])}</span>]`) : escape(value);
  const pair = (kind, en, ko, sample = null) => `<span data-prep-${kind}-language="en" lang="en" hidden>${answerText(en, "en", sample)}</span><span data-prep-${kind}-language="ko" lang="ko">${answerText(ko, "ko", sample)}</span>`;
  const cite = (id) => `<div class="quiz-evidence"><span class="quiz-evidence-segment">${id}</span></div>`;
  const render = (data, { weekly = true } = {}) => `<div data-prep-root data-prep-format="${data.practice_format}" data-prep-default-tab="${data.default_tab}">${["question", "answer"].map((kind) => `<select data-prep-${kind}-select><option value="ko" selected>한국어</option><option value="en">English</option></select>`).join("")}<div role="tablist"><button data-prep-tab="reading-response" aria-selected="true" tabindex="0">이 읽기 답변 준비<span class="prep-tab-count">${data.reading_response.cards.length}</span></button>${weekly ? '<button data-prep-tab="weekly" aria-selected="false" tabindex="-1">두 편 연결</button>' : ""}</div><section data-prep-panel="reading-response">${data.reading_response.cards.map((card) => {
    const sample = card.experience_examples?.[0];
    return `<article data-prep-card data-card-id="${card.card_id}" data-entry-type="${card.entry_type || ""}">
    ${card.entry_type ? `<h3 class="prep-reflection-topic" data-prep-title>${pair("question", card.topic, card.topic_ko)}</h3><p class="prep-reflection-question">${pair("question", card.title, card.title_ko)}</p>` : `<h3 data-prep-title>${pair("question", card.title, card.title_ko)}</h3>`}
    <section data-prep-answer><p class="prep-answer-copy">${pair("answer", card.answer_30s, card.answer_30s_ko, sample)}</p>${cite(card.evidence_segment_id)}</section>
    ${card.entry_type === "experience" ? `<p class="prep-experience-prompt">${pair("answer", card.experience_prompt, card.experience_prompt_ko)}</p>` : ""}
    ${sample ? `<div><p>가상 경험 예시</p><p data-prep-experience-label>${escape(sample.label_ko)}</p><span data-prep-experience-counter>1 / ${card.experience_examples.length}</span><button type="button" data-prep-experience-next>경험 바꾸기</button><script type="application/json" data-prep-experience-data>${JSON.stringify(card.experience_examples).replace(/</g, "\\u003c")}</script></div>` : ""}
    ${card.followups ? `<details class="prep-followups" open><summary>이어지는 질문</summary>${card.followups.map((f) => `<details class="prep-followup" id="${f.id}"><summary>${pair("question", f.question, f.question_ko)}</summary><div class="prep-followup-answer"><p class="prep-followup-copy">${pair("answer", f.answer, f.answer_ko, sample)}</p>${cite(f.evidence_segment_id)}</div></details>`).join("")}</details>` : ""}</article>`;
  }).join("")}</section>${weekly ? '<section data-prep-panel="weekly" hidden><div data-weekly-root></div></section>' : ""}</div>`;
  const html = render(practice);
  verify("scoped bilingual first and followup content matches", () => assert.deepEqual(validateReflectionPrepArtifacts(practice, html), []));
  verify("internal cold-call source cards stay valid without being published", () => {
    assert.equal(practice.cards.length, 15);
    assert.ok(practice.cards.every((card) => !html.includes(`data-card-id="${card.card_id}"`)));
    assert.deepEqual(validateReflectionPrepArtifacts(practice, html), []);
  });
  verify("unavailable weekly practice leaves just the reading preparation tab", () => assert.deepEqual(validateReflectionPrepArtifacts(practice, render(practice, { weekly: false })), []));
  for (const [label, oldText, newText] of [
    ["a followup answer moved outside its card", followup(practice).answer_ko, "다른 한국어 답변입니다."],
    ["an English followup question changed", followup(practice).question, "What is unrelated?"],
    ["a topic changed", entry(practice).topic_ko, "다른 주제"],
  ]) verify(`built content rejects ${label}`, () => {
    const changed = html.replace(escape(oldText), escape(newText)) + `<aside>${escape(oldText)}</aside>`;
    assert.ok(validateReflectionPrepArtifacts(practice, changed).length);
  });
  verify("built evidence stays attached to the correct followup", () => {
    const changed = structuredClone(practice); followup(changed).evidence_segment_id = "S2";
    assert.ok(validateReflectionPrepArtifacts(practice, render(changed)).some((error) => /followup-1 evidence/.test(error)));
  });
  verify("a missing experience prompt fails rendered validation", () => {
    const changed = html.replace(/<p class="prep-experience-prompt">[\s\S]*?<\/p>/, "");
    assert.ok(validateReflectionPrepArtifacts(practice, changed).some((error) => /experience prompt/.test(error)));
  });
  verify("rendered followup IDs cannot be duplicated", () => assert.ok(validateReflectionPrepArtifacts(practice, html.replace('id="response-1-followup-2"', 'id="response-1-followup-1"')).length));
  const renderedFailures = [
    ["a retired cold-call tab", (document) => { const button = document.createElement("button"); button.dataset.prepTab = "cold-call"; document.querySelector("[role=tablist]").append(button); }, /cold-call tab and panel must be absent/],
    ["a hidden retired cold-call panel", (document) => { const panel = document.createElement("section"); panel.dataset.prepPanel = "cold-call"; panel.hidden = true; document.querySelector("[data-prep-root]").append(panel); }, /cold-call tab and panel must be absent/],
    ["a retired source card published outside the tabs", (document) => { const card = document.createElement("article"); card.dataset.prepCard = ""; card.dataset.cardId = practice.cards[0].card_id; document.body.append(card); }, /card count differs/],
    ["an old first tab label", (document) => { document.querySelector("[data-prep-tab]").firstChild.textContent = "읽고 든 생각"; }, /first tab label differs/],
    ["a renamed weekly connection tab", (document) => { document.querySelector('[data-prep-tab="weekly"]').textContent = "다른 자료"; }, /weekly tab label differs/],
    ["an English answer shown initially", (document) => { document.querySelector('[data-prep-answer-language="en"]').hidden = false; }, /default to Korean visible and English hidden/],
    ["a Korean followup answer hidden initially", (document) => { document.querySelector('.prep-followup [data-prep-answer-language="ko"]').hidden = true; }, /default to Korean visible and English hidden/],
    ["an answer selector initially set to English", (document) => { const select = document.querySelector("[data-prep-answer-select]"); select.querySelector('[value="ko"]').removeAttribute("selected"); select.querySelector('[value="en"]').setAttribute("selected", ""); }, /answer selector must default to Korean/],
    ["a missing question language selector", (document) => { document.querySelector("[data-prep-question-select]").remove(); }, /question selector must default to Korean/],
    ["weekly practice ordered before reading preparation", (document) => { document.querySelector("[role=tablist]").prepend(document.querySelector('[data-prep-tab="weekly"]')); }, /tabs and panels differ/],
    ["reading preparation not selected initially", (document) => { document.querySelector('[data-prep-tab="reading-response"]').setAttribute("aria-selected", "false"); }, /first tab must start selected/],
    ["reading preparation hidden initially", (document) => { document.querySelector('[data-prep-panel="reading-response"]').hidden = true; }, /panel must start visible/],
    ["two initially visible panels", (document) => { document.querySelector('[data-prep-panel="weekly"]').hidden = false; }, /panel must start visible/],
    ["a reading answer moved to the weekly panel", (document) => { document.querySelector('[data-prep-panel="weekly"]').append(document.querySelector("[data-prep-card]")); }, /must be in the reading-response panel/],
    ["a collapsed followup group", (document) => { document.querySelector("details.prep-followups").open = false; }, /group must start open/],
    ["an already revealed followup answer", (document) => { document.querySelector("details.prep-followup").open = true; }, /answer must start closed/],
    ["a wrong initial example value", (document) => { document.querySelector("[data-prep-experience-slot]").textContent = example(practice).values.scene.ko; }, /experience slots differ/],
    ["a missing replacement target with the same visible text", (document) => { const slot = document.querySelector("[data-prep-experience-slot]"); slot.replaceWith(slot.textContent); }, /experience slots differ/],
    ["a replacement target with the wrong language", (document) => { document.querySelector("[data-prep-experience-slot]").dataset.prepExperienceLanguage = "ko"; }, /experience slots differ/],
    ["a replacement target with the wrong slot name", (document) => { document.querySelector("[data-prep-experience-slot]").dataset.prepExperienceSlot = "prior_view"; }, /experience slots differ/],
    ["a stale followup experience while the first answer is correct", (document) => { document.querySelector(".prep-followup [data-prep-experience-slot]").textContent = "A different cue."; }, /followup-1.*experience slots differ/],
    ["missing visible brackets", (document) => { document.querySelector("[data-prep-experience-slot]").previousSibling.textContent = "In this hypothetical example, "; }, /first answer English differs/],
    ["a missing example dataset", (document) => { document.querySelector("[data-prep-experience-data]").remove(); }, /experience data differs/],
    ["an invalid example dataset", (document) => { document.querySelector("[data-prep-experience-data]").textContent = "not JSON"; }, /experience data differs/],
    ["an incomplete example dataset", (document) => { document.querySelector("[data-prep-experience-data]").textContent = JSON.stringify(experience(practice).experience_examples.slice(0, 2)); }, /experience data differs/],
    ["an initial label for a later example", (document) => { document.querySelector("[data-prep-experience-label]").textContent = experience(practice).experience_examples[1].label_ko; }, /experience label differs/],
    ["an initial counter for a later example", (document) => { document.querySelector("[data-prep-experience-counter]").textContent = "2 / 6"; }, /experience counter differs/],
  ];
  renderedFailures.forEach(([label, mutate, expected]) => verify(`built content rejects ${label}`, () => {
    const { JSDOM } = require("jsdom");
    const dom = new JSDOM(html);
    try {
      mutate(dom.window.document);
      const errors = validateReflectionPrepArtifacts(practice, dom.serialize());
      assert.ok(errors.some((error) => expected.test(error)), errors.join("\n"));
    } finally { dom.window.close(); }
  }));
  verify("example values remain plain text even when containing HTML syntax", () => {
    const changed = structuredClone(practice);
    example(changed).values.scene.en = 'I saw a sign saying </script><b>older & wiser</b>.';
    example(changed).values.scene.ko = '저는 </script><b>나이가 들어도 & 현명하게</b>라는 표지를 보았습니다.';
    assert.deepEqual(validateProfessorPrepJson(changed, evidence).errors, []);
    assert.deepEqual(validateReflectionPrepArtifacts(changed, render(changed)), []);
  });
  verify("legacy rendering is not subject to the new contract", () => assert.deepEqual(validateReflectionPrepArtifacts(legacy, "legacy markup"), []));

  const tmp = path.resolve(__dirname, "..", "tmp");
  fs.mkdirSync(tmp, { recursive: true });
  const fixture = fs.mkdtempSync(path.join(tmp, "prep-practice-"));
  try {
    const reading = { slug: "practice-fixture", language: "en", content_dir: "content/practice-fixture" };
    const dir = path.join(fixture, reading.content_dir);
    fs.mkdirSync(dir, { recursive: true });
    const sourcePath = path.join(dir, "source_segments.json");
    const prepPath = path.join(dir, "professor_prep.json");
    fs.writeFileSync(sourcePath, JSON.stringify({ segments: [{ segment_id: "S1", original_text: "Source evidence." }] }));
    fs.writeFileSync(prepPath, JSON.stringify(practice));
    const hash = () => sourceHashForPage(fixture, reading, "professor-prep");
    const baseline = hash();
    const unrelated = sourceHashForPage(fixture, reading, "summary");
    for (const [label, change] of [
      ["a followup translation", (d) => { followup(d).answer_ko += " 바뀐 설명입니다."; }],
      ["a followup source reference", (d) => { followup(d).evidence_segment_id = "S2"; }],
      ["experience guidance", (d) => { d.reading_response.cards[3].experience_prompt += " Add context."; }],
      ["a hypothetical example value", (d) => { example(d).values.scene.ko += " 달라진 가상 장면입니다."; }],
      ["the initial example order", (d) => { experience(d).experience_examples.reverse(); }],
    ]) verify(`approval hash changes with ${label}`, () => {
      const changed = structuredClone(practice); change(changed); fs.writeFileSync(prepPath, JSON.stringify(changed));
      assert.notEqual(hash(), baseline);
      assert.equal(sourceHashForPage(fixture, reading, "summary"), unrelated);
    });
    fs.writeFileSync(prepPath, JSON.stringify(practice));
    verify("source evidence changes invalidate the practice hash", () => {
      fs.writeFileSync(sourcePath, JSON.stringify({ segments: [{ segment_id: "S1", original_text: "Revised source evidence." }] }));
      assert.notEqual(hash(), baseline);
    });
  } finally {
    const relative = path.relative(tmp, path.resolve(fixture));
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Refusing to remove a fixture outside project tmp");
    fs.rmSync(fixture, { recursive: true, force: true });
  }
  console.log(`PASS reflection practice (${checks} checks)`);
  return checks;
}

if (require.main === module) run();
module.exports = { run };
