const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT_DIR = path.resolve(__dirname, "..");
const QUIZ_PAGES = ["quiz-ox", "quiz-short", "quiz-mcq"];

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function count(html, pattern) {
  return [...String(html).matchAll(pattern)].length;
}

function expect(condition, message, errors) {
  if (!condition) errors.push(message);
}

function quizSourcePath(contentDir, pageKey) {
  if (pageKey === "quiz-short") return path.join(ROOT_DIR, contentDir, "quiz_short.json");
  return path.join(ROOT_DIR, contentDir, `${pageKey}.json`);
}

function checkQuizPage(reading, pageKey, errors) {
  const source = readJson(quizSourcePath(reading.content_dir, pageKey));
  const htmlPath = path.join(ROOT_DIR, "docs", "readings", reading.slug, `${pageKey}.html`);
  const html = readText(htmlPath);
  const prefix = `${reading.slug}/${pageKey}`;
  if (source.language === "en") {
    expect(count(html, /data-quiz-language="en"/g) === source.items.length + 1, `${prefix}: English quiz language boundaries are missing`, errors);
    expect(html.includes("Check answer") && html.includes("Explanation:"), `${prefix}: English grading labels are missing`, errors);
  }
  expect(count(html, /class="quiz-evidence-detail"/g) === source.items.length, `${prefix}: every question needs an expandable source passage`, errors);
  expect(count(html, /\bdata-quiz-root(?:="")?/g) === 1, `${prefix}: one interactive quiz form is required`, errors);
  expect(count(html, /\bdata-quiz-item(?:="")?/g) === source.items.length, `${prefix}: quiz item count mismatch`, errors);
  expect(count(html, /\bdata-quiz-check(?:="")?/g) === source.items.length, `${prefix}: per-item grade button count mismatch`, errors);
  expect(count(html, /\bdata-quiz-feedback(?:="")?/g) === source.items.length, `${prefix}: feedback count mismatch`, errors);
  expect(count(html, /\bdata-quiz-submit(?:="")?/g) === 1, `${prefix}: whole-quiz grade button is missing`, errors);
  expect(count(html, /\bdata-quiz-reset(?:="")?/g) === 1, `${prefix}: reset button is missing`, errors);
  expect(count(html, /\bdata-quiz-score(?:="")?/g) === 1, `${prefix}: live score region is missing`, errors);
  const expectedInputs = pageKey === "quiz-ox"
    ? source.items.length * 2
    : pageKey === "quiz-mcq"
      ? source.items.reduce((sum, item) => sum + item.options.length, 0)
      : source.items.length;
  expect(count(html, /\bdata-quiz-input(?:="")?/g) === expectedInputs, `${prefix}: answer input count mismatch`, errors);
  if (pageKey === "quiz-short") {
    const attrs = [...html.matchAll(/\bdata-accepted-answers="([^"]*)"/g)].map((match) => JSON.parse(decodeHtml(match[1])));
    expect(attrs.length === source.items.length, `${prefix}: accepted answer metadata count mismatch`, errors);
    attrs.forEach((answers, index) => {
      expect(JSON.stringify(answers) === JSON.stringify(source.items[index].accepted_answers), `${prefix}: accepted answers differ at item ${index + 1}`, errors);
    });
  } else {
    const attrs = [...html.matchAll(/\bdata-correct-answer="([^"]*)"/g)].map((match) => decodeHtml(match[1]));
    expect(attrs.length === source.items.length, `${prefix}: correct answer metadata count mismatch`, errors);
    attrs.forEach((answer, index) => {
      expect(answer === source.items[index].answer, `${prefix}: correct answer differs at item ${index + 1}`, errors);
    });
  }
}

function checkProfessorPrep(reading, errors) {
  const source = readJson(path.join(ROOT_DIR, reading.content_dir, "professor_prep.json"));
  const html = readText(path.join(ROOT_DIR, "docs", "readings", reading.slug, "professor-prep.html"));
  const prefix = `${reading.slug}/professor-prep`;
  expect(count(html, /\bdata-prep-tab=/g) === 2, `${prefix}: two prep tabs are required`, errors);
  expect(count(html, /\bdata-prep-panel=/g) === 2, `${prefix}: two prep panels are required`, errors);
  expect(count(html, /\bdata-prep-card(?:\s|>)/g) === source.cards.length + source.reading_response.cards.length, `${prefix}: prep card count mismatch`, errors);
  const expectedCards = source.cards.length + source.reading_response.cards.length;
  expect(html.includes(source.language === "en" ? "Reading response" : "어떻게 읽었나요?"), `${prefix}: reading-response tab label is missing`, errors);
  expect(!/<textarea\b|\bdata-prep-(?:practice|model)\b/.test(html), `${prefix}: removed response inputs or model-answer disclosures remain`, errors);
  expect(count(html, /<section\b[^>]*\bdata-prep-answer(?:\s|>)/g) === expectedCards, `${prefix}: each card needs an immediately displayed answer section`, errors);
  expect(count(html, /<h4\b[^>]*class="[^"]*\bprep-answer-label\b[^"]*"[^>]*>[^<]+<\/h4>/g) === expectedCards, `${prefix}: each answer needs a visible label`, errors);
  expect(count(html, /class="prep-answer-copy"/g) === expectedCards, `${prefix}: model answer count mismatch`, errors);
  expect(count(html, /class="quiz-evidence-detail"/g) === expectedCards, `${prefix}: answer evidence disclosures must remain available`, errors);
  if (source.language === "en") {
    expect(html.includes('data-prep-language="en"'), `${prefix}: English workspace marker missing`, errors);
  }
  const cards = [...source.cards, ...source.reading_response.cards];
  const bilingual = source.language === "en" && cards.every((card) => card.title_ko && card.answer_30s_ko);
  if (bilingual) {
    for (const control of ["question", "answer"]) {
      const selects = [...html.matchAll(new RegExp(`<select\\b[^>]*\\bdata-prep-${control}-select[^>]*>([\\s\\S]*?)<\\/select>`, "g"))];
      expect(selects.length === 1, `${prefix}: one ${control} language selector is required`, errors);
      expect(selects[0] && count(selects[0][1], /<option\b[^>]*value="(?:en|ko)"/g) === 2, `${prefix}: ${control} selector must offer English and Korean`, errors);
      for (const language of ["en", "ko"]) {
        const spans = [...html.matchAll(new RegExp(`<span\\b[^>]*\\bdata-prep-${control}-language="${language}"[^>]*>`, "g"))];
        expect(spans.length === expectedCards, `${prefix}: ${language} ${control} variant count mismatch`, errors);
        expect(spans.every(([tag]) => tag.includes(`lang="${language}"`)), `${prefix}: ${control} variants need matching lang attributes`, errors);
        expect(spans.every(([tag]) => /\bhidden(?:\s|>|=)/.test(tag) === (language === "ko")), `${prefix}: ${control} variants must default to English visible and Korean hidden`, errors);
      }
    }
  } else {
    expect(!/\bdata-prep-(?:question|answer)-select\b/.test(html), `${prefix}: legacy prep must retain its single-language fallback`, errors);
  }
}

function checkReadingPage(reading, pageKey, errors) {
  const html = readText(path.join(ROOT_DIR, "docs", "readings", reading.slug, `${pageKey}.html`));
  const prefix = `${reading.slug}/${pageKey}`;
  expect(!/\bdata-(?:reader-root|font-action|page-bookmark|resume-position|important-list|generated-toc|reading-status)\b|\breader-tools\b|\bmark-btn\b/.test(html), `${prefix}: removed reading tools remain`, errors);
  expect(!/aaf-font-scale/.test(html), `${prefix}: saved font scaling must not be restored by inline scripts`, errors);
  expect(html.includes("data-reading-article-body") && html.includes("data-reader-toc-link") && html.includes("data-reading-progress-bar"), `${prefix}: article, contents navigation, and progress must remain`, errors);
}

function checkHomeRail(manifest, errors) {
  const html = readText(path.join(ROOT_DIR, "docs", "index.html"));
  const titles = [...html.matchAll(/<span class="rail-title" lang="([^"]+)">([\s\S]*?)<\/span>/g)]
    .map((match) => ({ lang: match[1], title: decodeHtml(match[2].replace(/<[^>]+>/g, "")) }));
  expect(titles.length === manifest.readings.length, `home rail: expected ${manifest.readings.length} titles, found ${titles.length}`, errors);
  manifest.readings.forEach((reading, index) => {
    expect(titles[index]?.title === reading.title, `home rail: title mismatch at ${reading.slug}`, errors);
    expect(titles[index]?.lang === (reading.language === "en" ? "en" : "ko"), `home rail: lang mismatch at ${reading.slug}`, errors);
  });
  expect(count(html, /class="rail-meta"/g) === manifest.readings.length, "home rail: compact metadata row count mismatch", errors);
  const cutoffDate = String(manifest.site.publish_cutoff_date || "").trim();
  const lockedReadingCount = cutoffDate
    ? manifest.readings.filter((reading) => reading.class_date > cutoffDate).length
    : 0;
  expect(count(html, /aria-disabled="true"/g) >= lockedReadingCount, "home rail: locked items need aria-disabled", errors);
}

function checkClientLogic(errors) {
  const source = readText(path.join(ROOT_DIR, "scripts", "site_app.js"));
  const context = { document: { addEventListener() {}, createElement() { return { textContent: "", setAttribute() {} }; } } };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "site_app.js" });
  const schedule = [
    { slug: "second", sequence: 2, classDate: "2026-09-14" },
    { slug: "first", sequence: 1, classDate: "2026-09-14" },
    { slug: "later", sequence: 3, classDate: "2026-09-21" },
    { slug: "past", sequence: 4, classDate: "2026-09-01" },
  ];
  const nextSlugs = (today, cutoff = "") => context.selectHomeCurrentReadings(schedule, today, cutoff).map((reading) => reading.slug).join(",");
  expect(nextSlugs("2026-09-05") === "first,second", "home: every reading on the next class date must be selected in manifest order", errors);
  expect(nextSlugs("2026-09-14", "2026-09-14") === "first,second", "home: the full group stays current on the class date and inclusive publish cutoff", errors);
  expect(nextSlugs("2026-09-15") === "later", "home: advance to the next class after the current class date", errors);
  expect(nextSlugs("2026-09-15", "2026-09-14") === "", "home: readings beyond the publish cutoff must not be selected", errors);
  expect(nextSlugs("2026-12-31") === "", "home: completed readings cannot be labeled next reading", errors);
  expect(context.selectHomeCurrentReadings([], "2026-09-05", "").length === 0, "home: an empty schedule has no next readings", errors);
  expect(context.homeReadingState({slug:"second",baseState:"ready"}, ["first","second"]) === "current", "home: the second reading also needs the next-reading badge", errors);
  expect(context.homeReadingState({slug:"second",baseState:"locked"}, ["first","second"]) === "locked", "home: current readings must retain their approval gate", errors);
  expect(typeof context.normalizeQuizAnswer === "function", "client: normalizeQuizAnswer is unavailable", errors);
  if (typeof context.normalizeQuizAnswer === "function") {
    expect(context.normalizeQuizAnswer("  SELF–RELEVANCE. ") === "self–relevance", "client: answer normalization failed", errors);
    expect(context.normalizeQuizAnswer("７．５년!") === "7.5년", "client: NFKC normalization failed", errors);
  }
  expect(typeof context.gradeQuizItem === "function", "client: gradeQuizItem is unavailable", errors);
  if (typeof context.gradeQuizItem === "function") {
    const makeClassList = () => {
      const values = new Set();
      return {
        add(...names) { names.forEach((name) => values.add(name)); },
        remove(...names) { names.forEach((name) => values.delete(name)); },
        toggle(name, active) { if (active) values.add(name); else values.delete(name); },
        contains(name) { return values.has(name); },
      };
    };
    const makeItem = ({ kind, value = "", correctAnswer = "", acceptedAnswers = [], language = "ko" }) => {
      const input = { value, checked: Boolean(value) };
      const choice = { classList: makeClassList(), querySelector() { return input; } };
      const feedback = { hidden: true };
      const result = { textContent: "" };
      let inputMessage = null;
      const item = {
        dataset: { quizKind: kind, quizLanguage: language, correctAnswer, acceptedAnswers: JSON.stringify(acceptedAnswers) },
        classList: makeClassList(),
        closest() { return null; },
        appendChild(node) { inputMessage = node; },
        querySelector(selector) {
          if (selector === "[data-quiz-input-message]") return inputMessage;
          if (selector === "[data-quiz-input]:checked") return input.checked ? input : null;
          if (selector === "[data-quiz-input]") return input;
          if (selector === "[data-quiz-feedback]") return feedback;
          if (selector === "[data-quiz-result]") return result;
          return null;
        },
        querySelectorAll(selector) { return selector === ".quiz-choice" && kind !== "short" ? [choice] : []; },
      };
      return { item, input, feedback, result };
    };
    const correctChoice = makeItem({ kind: "mcq", value: "정답", correctAnswer: "정답" });
    expect(context.gradeQuizItem(correctChoice.item).correct === true, "client: choice grading failed", errors);
    expect(correctChoice.feedback.hidden === false && correctChoice.item.classList.contains("is-correct"), "client: correct feedback state failed", errors);
    const correctShort = makeItem({ kind: "short", value: " ７．５년! ", acceptedAnswers: ["7.5년"] });
    expect(context.gradeQuizItem(correctShort.item).correct === true, "client: normalized short-answer grading failed", errors);
    const unanswered = makeItem({ kind: "short", value: "", acceptedAnswers: ["정답"] });
    const unansweredResult = context.gradeQuizItem(unanswered.item);
    expect(unansweredResult.answered === false && unanswered.item.classList.contains("is-unanswered"), "client: unanswered grading failed", errors);
    const spacedAnswer = makeItem({ kind: "short", value: "Self relevance", acceptedAnswers: ["selfrelevance"], language: "en" });
    expect(context.gradeQuizItem(spacedAnswer.item).correct === true, "client: spacing promise must be reflected in short-answer grading", errors);
    expect(spacedAnswer.result.textContent === "Correct.", "client: English quiz feedback should be English", errors);
    spacedAnswer.input.value = "한국어";
    expect(context.gradeQuizItem(spacedAnswer.item).blocked === true, "client: Korean input must not be graded on an English quiz", errors);
    expect(spacedAnswer.feedback.hidden && !spacedAnswer.item.dataset.quizGraded, "client: blocked input must clear the previous grade and hide its answer", errors);
    const differentNumber = makeItem({ kind: "short", value: "7 5 years", acceptedAnswers: ["75 years"], language: "en" });
    expect(context.gradeQuizItem(differentNumber.item).correct === false, "client: removing spaces must not combine different numbers", errors);
  }
  expect(source.includes("initTranslationSentenceReveals();"), "client: sentence reveal initializer is not called", errors);
  expect(source.includes("initInteractiveQuizzes();"), "client: quiz initializer is not called", errors);
}

function checkChatbotExcluded(readings, errors) {
  const files = [
    path.join(ROOT_DIR, "docs", "index.html"),
    ...readings.flatMap((reading) => fs.readdirSync(path.join(ROOT_DIR, "docs", "readings", reading.slug))
      .filter((name) => name.endsWith(".html"))
      .map((name) => path.join(ROOT_DIR, "docs", "readings", reading.slug, name))),
  ];
  files.forEach((filePath) => {
    expect(!/(?:chat\s*bot|chatbot|챗봇)/i.test(readText(filePath)), `chatbot exclusion failed: ${path.relative(ROOT_DIR, filePath)}`, errors);
  });
}

function main() {
  const manifest = readJson(path.join(ROOT_DIR, "manifest", "readings.json"));
  const readings = manifest.readings;
  const errors = [];
  readings.forEach((reading) => {
    QUIZ_PAGES.forEach((pageKey) => checkQuizPage(reading, pageKey, errors));
    checkProfessorPrep(reading, errors);
    ["full", "translation"].forEach((pageKey) => checkReadingPage(reading, pageKey, errors));
  });
  checkHomeRail(manifest, errors);
  checkClientLogic(errors);
  checkChatbotExcluded(readings, errors);
  if (errors.length) throw new Error(`Interaction checks failed\n  ${errors.join("\n  ")}`);
  console.log(`PASS interactions (${readings.length * QUIZ_PAGES.length} quizzes, ${readings.length} prep pages with direct answers, ${readings.length * 2} reading pages without retired tools, ${manifest.readings.length} rail items, chatbot excluded)`);
}

if (require.main === module) main();

module.exports = { main };
