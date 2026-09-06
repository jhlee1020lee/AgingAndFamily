const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { buildValidationSnapshot, validateBuildArtifacts, validateManifestReadings, sourceHashForPage, validateQuizPayload, validateProfessorPrepJson } = require("./validate_content");
const { approveReading } = require("./approve_reading");
const { checkReading, qualityChecks, digitTokens } = require("./check_alignment");

const ROOT = path.resolve(__dirname, "..");
const TMP = path.join(ROOT, "tmp");
fs.mkdirSync(TMP, { recursive: true });
const fixture = fs.mkdtempSync(path.join(TMP, "validation-gates-"));
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
const writeJson = (filePath, value) => fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
let checks = 0;

function verify(label, callback) {
  callback();
  checks += 1;
  console.log(`PASS ${label}`);
}

try {
  const manifest = readJson(path.join(ROOT, "manifest", "readings.json"));
  const reading = manifest.readings.find((item) => item.slug === "levy-2009") || manifest.readings[0];
  for (const relative of ["scripts", reading.content_dir, `docs/readings/${reading.slug}`, `docs/assets/readings/${reading.slug}`]) {
    fs.cpSync(path.join(ROOT, relative), path.join(fixture, relative), { recursive: true });
  }
  fs.mkdirSync(path.join(fixture, "manifest"), { recursive: true });
  writeJson(path.join(fixture, "manifest", "readings.json"), { ...manifest, readings: [reading] });
  const contentDir = path.join(fixture, reading.content_dir);
  const metaPath = path.join(contentDir, "meta.json");
  const emptyMeta = { ...readJson(metaPath), manual_review: { approved_pages: ["full"], approved_page_hashes: {} } };
  writeJson(metaPath, emptyMeta);
  const snapshot = (built = false) => buildValidationSnapshot(fixture, reading, readJson(metaPath), { requireBuiltArtifacts: built });
  const alter = (relative, callback) => {
    const target = path.join(fixture, relative);
    const before = fs.readFileSync(target);
    try { callback(target, before); } finally { fs.writeFileSync(target, before); }
  };

  verify("missing approval hashes never become approvals", () => {
    assert.equal(snapshot().content_status.full, "schema_pass");
    assert.deepEqual(snapshot().manual_review.approved_pages, []);
  });
  approveReading({ slug: reading.slug, reviewer: "validation-fixture", note: "Temporary test fixture only.", requireBuiltArtifacts: false }, fixture);
  verify("explicit source-only approval includes overview and v2 dependencies", () => {
    assert.equal(snapshot().workflow_status, "approved");
    assert.equal(snapshot().content_status.index, "approved");
    assert.ok(Object.values(snapshot().manual_review.approved_page_hashes).every((hash) => /^v2:[a-f0-9]{64}$/.test(hash)));
  });
  const approvedMeta = fs.readFileSync(metaPath);

  alter(path.join(reading.content_dir, "source_segments.json"), (target, before) => {
    const data = JSON.parse(before); data.segments[0].original_text += " Evidence reviewed."; writeJson(target, data);
    verify("source evidence edits revoke dependent approvals", () => {
      assert.notEqual(snapshot().content_status.full, "approved");
      assert.notEqual(snapshot().content_status.quiz_short, "approved");
      assert.notEqual(snapshot().content_status.index, "approved");
    });
  });
  alter(path.join(reading.content_dir, "translation_segments.json"), (target, before) => {
    const data = JSON.parse(before); data.translations[0].ko_translation += " 검토용 문장."; writeJson(target, data);
    verify("translation segment edits revoke translation approval", () => assert.notEqual(snapshot().content_status.translation, "approved"));
    verify("translation segment edits revoke original-reading approval", () => {
      const changed = snapshot();
      assert.notEqual(changed.content_status.full, "approved");
      assert.notEqual(changed.validation_status.source_page_results.full.source_hash, JSON.parse(approvedMeta).manual_review.approved_page_hashes.full);
    });
  });
  alter(path.join(reading.content_dir, "translation.md"), (target, before) => {
    // Keep the aligned body intact so this tests dependency approval rather than
    // merely rejecting an invalid sentence mapping.
    fs.writeFileSync(target, String(before).replace(/^(# [^\r\n]+)/m, "$1 검토용 제목"));
    verify("Korean Markdown edits revoke original-reading approval", () => {
      const changed = snapshot();
      assert.equal(changed.content_status.full, "schema_pass");
      assert.ok(!changed.manual_review.approved_pages.includes("full"));
      assert.notEqual(changed.validation_status.source_page_results.full.source_hash, JSON.parse(approvedMeta).manual_review.approved_page_hashes.full);
    });
  });
  alter(path.join(reading.content_dir, "translation_alignment.json"), (target, before) => {
    const data = JSON.parse(before); const entry = data.entries.find((item) => item.sentence_pairs?.length > 1);
    entry.sentence_pairs = [{ id: entry.sentence_pairs[0].id, status: "verified", ko_text: entry.sentence_pairs.map((pair) => pair.ko_text).join(" "), source_text: entry.source_text }];
    writeJson(target, data);
    verify("structurally valid changed sentence mappings require review", () => {
      const changed = snapshot();
      assert.equal(changed.content_status.translation, "schema_pass");
      assert.ok(!changed.manual_review.approved_pages.includes("translation"));
      assert.equal(changed.content_status.full, "schema_pass");
      assert.ok(!changed.manual_review.approved_pages.includes("full"));
    });
  });
  const supplementPath = path.join(contentDir, "original_translation_alignment.json");
  const originalSupplement = fs.existsSync(supplementPath) ? fs.readFileSync(supplementPath) : null;
  try {
    if (fs.existsSync(supplementPath)) fs.unlinkSync(supplementPath);
    verify("a fully aligned original body allows an absent optional supplement", () => assert.equal(snapshot().content_status.full, "approved"));
    const supplement = { version: 1, reading_slug: reading.slug, entries: [], review_note: "Temporary reverse disclosure dependency fixture." };
    writeJson(supplementPath, supplement);
    verify("adding an optional reverse supplement revokes only dependent approval", () => {
      const changed = snapshot();
      assert.equal(changed.content_status.full, "schema_pass");
      assert.ok(!changed.manual_review.approved_pages.includes("full"));
      assert.equal(changed.content_status.summary, "approved");
      assert.equal(changed.content_status.translation, "approved");
    });
    approveReading({ slug: reading.slug, pages: ["full"], reviewer: "reverse-dependency-fixture", note: "Temporary optional reverse supplement approval test only.", requireBuiltArtifacts: false }, fixture);
    verify("reviewed optional reverse supplement can be approved", () => assert.equal(snapshot().content_status.full, "approved"));
    const approvedSupplementMeta = fs.readFileSync(metaPath);
    writeJson(supplementPath, { ...supplement, review_note: "The reverse supplement was edited after approval." });
    verify("editing an optional reverse supplement revokes original-reading approval", () => {
      const changed = snapshot();
      assert.equal(changed.content_status.full, "schema_pass");
      assert.ok(!changed.manual_review.approved_pages.includes("full"));
      assert.equal(changed.content_status.summary, "approved");
      assert.equal(changed.content_status.translation, "approved");
    });
    writeJson(supplementPath, supplement);
    fs.writeFileSync(metaPath, approvedSupplementMeta);
    fs.unlinkSync(supplementPath);
    verify("deleting an approved optional reverse supplement requires review", () => {
      const changed = snapshot();
      assert.equal(changed.content_status.full, "schema_pass");
      assert.ok(!changed.manual_review.approved_pages.includes("full"));
      assert.equal(changed.content_status.summary, "approved");
      assert.equal(changed.content_status.translation, "approved");
    });
    fs.writeFileSync(metaPath, approvedMeta);
    writeJson(supplementPath, { version: 1, reading_slug: reading.slug, entries: "invalid entries" });
    verify("a malformed reverse supplement fails original-reading source validation", () => {
      const changed = snapshot();
      assert.equal(changed.content_status.full, "schema_fail");
      assert.ok(!changed.manual_review.approved_pages.includes("full"));
      assert.equal(changed.content_status.summary, "approved");
    });
  } finally {
    fs.writeFileSync(metaPath, approvedMeta);
    if (originalSupplement === null) {
      if (fs.existsSync(supplementPath)) fs.unlinkSync(supplementPath);
    } else fs.writeFileSync(supplementPath, originalSupplement);
  }
  const comic = readJson(path.join(contentDir, "overview_comic.json"));
  const panelPath = path.join(reading.content_dir, comic.panels[0].image);
  alter(panelPath, (target, before) => {
    fs.writeFileSync(target, Buffer.concat([before, Buffer.from("fixture image change")]));
    verify("image bytes revoke overview approval", () => assert.notEqual(snapshot().content_status.index, "approved"));
  });
  alter(path.join(reading.content_dir, "full.md"), (target, before) => {
    fs.writeFileSync(target, `${before}\n![Fixture image](${comic.panels[0].image})\n`);
    const beforeHash = sourceHashForPage(fixture, reading, "full");
    alter(panelPath, (imagePath, bytes) => {
      fs.writeFileSync(imagePath, Buffer.concat([bytes, Buffer.from("image dependency")]));
      verify("full text approval includes its referenced image bytes", () => assert.notEqual(sourceHashForPage(fixture, reading, "full"), beforeHash));
    });
  });
  alter(`docs/readings/${reading.slug}/full.html`, (target) => {
    fs.unlinkSync(target);
    verify("missing built full text fails the publish snapshot", () => {
      assert.equal(snapshot(true).content_status.full, "schema_fail");
      assert.notEqual(snapshot(true).workflow_status, "approved");
    });
  });
  alter(`docs/readings/${reading.slug}/summary.html`, (target, before) => {
    fs.writeFileSync(target, `${before}<div class="upload-placeholder">Pending</div>`);
    verify("built learning-page placeholders fail the publish snapshot", () => assert.equal(snapshot(true).content_status.summary, "schema_fail"));
  });
  alter(`docs/readings/${reading.slug}/quiz.html`, (target) => {
    fs.unlinkSync(target);
    verify("missing unified quiz fails every affected quiz page", () => {
      assert.equal(snapshot(true).content_status.quiz_ox, "schema_fail");
      assert.equal(snapshot(true).content_status.quiz_short, "schema_fail");
    });
  });
  const builtImage = `docs/assets/readings/${reading.slug}/${comic.panels[0].image}`;
  alter(builtImage, (target, before) => {
    fs.writeFileSync(target, Buffer.concat([before, Buffer.from("stale built image")]));
    verify("stale built image fails approved overview", () => assert.equal(snapshot(true).content_status.index, "schema_fail"));
  });

  const checkSegments = () => checkReading(reading, { strict: true, rootDir: fixture });
  const segmentCases = [
    ["duplicate source IDs", "source_segments.json", (data) => { data.segments.push(data.segments.at(-1)); }, /duplicate segment_id/],
    ["extra duplicate translation row", "translation_segments.json", (data) => { data.translations.push(data.translations.at(-1)); }, /segment counts differ/],
    ["empty original text", "source_segments.json", (data) => { data.segments[0].original_text = " "; }, /missing original_text/],
    ["empty translation text", "translation_segments.json", (data) => { data.translations[0].ko_translation = " "; }, /missing ko_translation/],
    ["incorrect paper identity", "source_segments.json", (data) => { data.paper_id = "another-paper"; }, /paper_id must match manifest slug/],
    ["missing translation identity", "translation_segments.json", (data) => { delete data.paper_id; }, /paper_id must match manifest slug/],
    ["case-changed segment IDs", "translation_segments.json", (data) => { data.translations[0].segment_id = data.translations[0].segment_id.toLowerCase(); }, /unknown segment_id|missing translations/],
  ];
  segmentCases.forEach(([label, filename, change, expected]) => {
    alter(path.join(reading.content_dir, filename), (target, before) => {
      const data = JSON.parse(before); change(data); writeJson(target, data);
      verify(`strict alignment rejects ${label}`, () => assert.ok(checkSegments().errors.some((error) => expected.test(error))));
    });
  });
  verify("preserved numeric citations do not trigger author-year warnings", () => {
    const result = qualityChecks({ segment_id: "S1", original_text: "Evidence supports this conclusion73,74.", contains_citations: true }, { ko_translation: "이 결론을 뒷받침한다73,74." });
    assert.deepEqual(result.errors, []); assert.deepEqual(result.warnings, []);
  });
  verify("decimal thousands and citation lists tokenize consistently", () => {
    assert.deepEqual(digitTokens("1,234.5 and 1234.5; refs 73,74"), ["1234.5", "73", "74"]);
  });

  const evidenceId = readJson(path.join(contentDir, "source_segments.json")).segments[0].segment_id;
  const evidence = new Set([evidenceId]);
  const quiz = {
    language: "en", title: "Reading quiz", instructions: "Give one term.",
    items: Array.from({ length: 15 }, (_, index) => ({ question: `Which term explains example ${index + 1}?`, answer_type: "term", accepted_answers: [`Concept${index + 1}`], explanation: "The source connects the concept with the argument.", evidence_segment_id: evidenceId })),
  };
  verify("English short-answer fixture is valid", () => assert.deepEqual(validateQuizPayload("quiz-short", quiz, evidence).errors, []));
  verify("English SOC does not leak through the word social", () => {
    const changed = structuredClone(quiz);
    changed.items[0].question = "Which model explains social adaptation?";
    changed.items[0].accepted_answers = ["SOC"];
    assert.deepEqual(validateQuizPayload("quiz-short", changed, evidence).errors, []);
  });
  verify("English literal SOC exposure fails regardless of case or punctuation", () => {
    const changed = structuredClone(quiz);
    changed.items[0].question = "Which model (sOc) explains adaptation?";
    changed.items[0].accepted_answers = ["SOC"];
    assert.ok(validateQuizPayload("quiz-short", changed, evidence).errors.some((error) => error.includes("leaks the accepted answer")));
  });
  verify("English full-phrase exposure fails after case and whitespace normalization", () => {
    const changed = structuredClone(quiz);
    changed.items[0].question = "Which model describes Selective  Optimization\nwith Compensation?";
    changed.items[0].accepted_answers = ["selective optimization with compensation"];
    assert.ok(validateQuizPayload("quiz-short", changed, evidence).errors.some((error) => error.includes("leaks the accepted answer")));
  });
  verify("English answer matching treats regex punctuation literally", () => {
    const changed = structuredClone(quiz);
    changed.items[0].question = "Which term explains the AAB sequence?";
    changed.items[0].accepted_answers = ["A+B"];
    assert.deepEqual(validateQuizPayload("quiz-short", changed, evidence).errors, []);
    changed.items[0].question = "Which term explains the A+B sequence?";
    assert.ok(validateQuizPayload("quiz-short", changed, evidence).errors.some((error) => error.includes("leaks the accepted answer")));
  });
  verify("Korean answer exposure retains substring matching", () => {
    const changed = structuredClone(quiz);
    changed.language = "ko";
    changed.items[0].question = "사회적 적응을 설명하는 개념은 무엇인가요?";
    changed.items[0].accepted_answers = ["사회"];
    assert.ok(validateQuizPayload("quiz-short", changed, evidence).errors.some((error) => error.includes("leaks the accepted answer")));
  });
  verify("Korean accepted answers cannot enter an English quiz", () => {
    const changed = structuredClone(quiz); changed.items[0].accepted_answers = ["한국어"];
    assert.ok(validateQuizPayload("quiz-short", changed, evidence).errors.some((error) => error.includes("must contain English")));
  });
  verify("nonexistent evidence IDs fail schema validation", () => {
    const changed = structuredClone(quiz); changed.items[0].evidence_segment_id = "MISSING";
    assert.ok(validateQuizPayload("quiz-short", changed, evidence).errors.some((error) => error.includes("unknown evidence_segment_id")));
  });
  const makeCards = (count, prefix) => Array.from({ length: count }, (_, index) => ({ card_id: `${prefix}-${index}`, title: `Explain example ${index}.`, answer_30s: "The paper connects age stereotypes with later outcomes.", evidence_segment_id: evidenceId }));
  const prep = { language: "en", title: "Response practice", instructions: "Explain the paper.", cards: makeCards(15, "cold"), reading_response: { title: "Reading response", instructions: "Use evidence.", cards: makeCards(5, "response") } };
  verify("English response cards are checked against source evidence", () => {
    assert.deepEqual(validateProfessorPrepJson(prep, evidence).errors, []);
    const changed = structuredClone(prep); changed.cards[0].answer_30s = "한국어 답변";
    assert.ok(validateProfessorPrepJson(changed, evidence).errors.some((error) => error.includes("must contain English")));
  });
  const bilingualPrep = structuredClone(prep);
  [...bilingualPrep.cards, ...bilingualPrep.reading_response.cards].forEach((card, index) => {
    card.title_ko = `검증 질문 ${index + 1}`;
    card.answer_30s_ko = `원문을 설명하는 한국어 답변 ${index + 1}입니다.`;
  });
  verify("complete bilingual prep preserves the English schema", () => assert.deepEqual(validateProfessorPrepJson(bilingualPrep, evidence).errors, []));
  for (const [label, change, expected] of [
    ["an incomplete Korean pair", (data) => { delete data.cards[0].answer_30s_ko; }, /answer_30s_ko must contain non-empty Korean/],
    ["blank Korean text", (data) => { data.cards[0].title_ko = " "; }, /title_ko must contain non-empty Korean/],
    ["English-only text in Korean fields", (data) => { data.cards[0].answer_30s_ko = "This is still English."; }, /answer_30s_ko must contain non-empty Korean/],
    ["mixed translated and untranslated decks", (data) => { for (const card of data.reading_response.cards) { delete card.title_ko; delete card.answer_30s_ko; } }, /must cover every card/],
  ]) {
    const changed = structuredClone(bilingualPrep); change(changed);
    verify(`prep schema rejects ${label}`, () => assert.ok(validateProfessorPrepJson(changed, evidence).errors.some((error) => expected.test(error))));
  }
  alter(path.join(reading.content_dir, "professor_prep.json"), (target) => {
    writeJson(target, bilingualPrep);
    alter(path.join(reading.content_dir, "meta.json"), () => {
      approveReading({ slug: reading.slug, reviewer: "bilingual-fixture", note: "Temporary bilingual approval test only.", requireBuiltArtifacts: false }, fixture);
      assert.equal(snapshot().content_status.professor_prep, "approved");
      const changed = structuredClone(bilingualPrep); changed.cards[0].answer_30s_ko += " 검토 후 바뀐 번역입니다."; writeJson(target, changed);
      verify("Korean answer edits revoke an existing prep approval", () => {
        assert.equal(snapshot().content_status.professor_prep, "schema_pass");
        assert(!snapshot().manual_review.approved_pages.includes("professor-prep"));
      });
    });
    writeJson(target, bilingualPrep);
    alter(`docs/readings/${reading.slug}/professor-prep.html`, (htmlPath) => {
      const escapeHtml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const html = [...bilingualPrep.cards, ...bilingualPrep.reading_response.cards].map((card) => `<h3>${escapeHtml(card.title)}<span data-prep-question-language="ko" lang="ko" hidden>${escapeHtml(card.title_ko)}</span></h3><p>${escapeHtml(card.answer_30s)}<span data-prep-answer-language="ko" lang="ko" hidden>${escapeHtml(card.answer_30s_ko)}</span></p>`).join("");
      const artifacts = () => validateBuildArtifacts(fixture, reading, readJson(metaPath), { "professor-prep": { status: "approved" } });
      fs.writeFileSync(htmlPath, html);
      verify("built Korean question and answer variants match their approved cards", () => assert.deepEqual(artifacts().errors, []));
      const firstAnswer = escapeHtml(bilingualPrep.cards[0].answer_30s_ko);
      fs.writeFileSync(htmlPath, html.replace(firstAnswer, "변조된 답변입니다.") + `<aside>${firstAnswer}</aside>`);
      verify("changed Korean variants fail even when the original text exists elsewhere", () => assert.ok(artifacts().errors.some((error) => error.includes("built Korean content differs at item 1 (answer_30s_ko)"))));
    });
  });
  alter(path.join(reading.content_dir, "quiz_short.json"), (target) => {
    writeJson(target, quiz);
    const artifacts = validateBuildArtifacts(fixture, reading, readJson(metaPath), { "quiz-short": { status: "approved" } });
    verify("built quiz must contain its approved English answers and explanations", () => assert.ok(artifacts.errors.some((error) => error.includes("built English content differs"))));
  });
  alter(path.join(reading.content_dir, "quiz_short.json"), (target) => {
    const comparisonQuiz = structuredClone(quiz);
    comparisonQuiz.items[0].explanation = "The model reports p < .05 and x > 0; A & B are labels.";
    writeJson(target, comparisonQuiz);
    alter(`docs/readings/${reading.slug}/quiz-short.html`, (htmlPath) => {
      const escapeHtml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const html = comparisonQuiz.items.map((item) => [item.question, item.explanation, ...item.accepted_answers].map((value) => `<p>${escapeHtml(value)}</p>`).join("")).join("");
      const artifacts = () => validateBuildArtifacts(fixture, reading, readJson(metaPath), { "quiz-short": { status: "approved" } });
      fs.writeFileSync(htmlPath, html);
      verify("displayed English inequalities survive HTML entity decoding", () => assert.deepEqual(artifacts().errors, []));
      fs.writeFileSync(htmlPath, html.replace("&lt; .05", "&lt; .01"));
      verify("a changed displayed inequality still fails the artifact gate", () => assert.ok(artifacts().errors.some((error) => error.includes("built English content differs at item 1:"))));
      fs.writeFileSync(htmlPath, html.replace("&lt; .05 and x &gt; 0; A &amp; B are labels.", ""));
      verify("text lost after an inequality still fails the artifact gate", () => assert.ok(artifacts().errors.some((error) => error.includes("built English content differs at item 1:"))));
    });
  });
  verify("unknown reading slug cannot pass an empty publish check", () => assert.throws(() => validateManifestReadings(fixture, "missing-slug"), /Unknown slug/));

  fs.writeFileSync(metaPath, approvedMeta);
  const build = spawnSync(process.execPath, ["scripts/build_site.js"], { cwd: fixture, encoding: "utf8" });
  verify("source-only approval can build without approval circularity", () => {
    assert.equal(build.status, 0, build.stderr);
    assert.equal(snapshot(true).workflow_status, "approved");
  });
  const comics = spawnSync(process.execPath, ["scripts/check_overview_comics.js", "--require-built"], { cwd: fixture, encoding: "utf8" });
  verify("comic validation follows manifest reading count", () => assert.equal(comics.status, 0, comics.stderr));
  console.log(`PASS validation gates (${checks} regression checks)`);
} finally {
  const relative = path.relative(TMP, path.resolve(fixture));
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Refusing to remove a fixture outside project tmp");
  fs.rmSync(fixture, { recursive: true, force: true });
}
