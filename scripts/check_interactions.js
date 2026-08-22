const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT_DIR = path.resolve(__dirname, "..");
const PILOT_SLUGS = ["levy-2009", "settersten-godlewski-2016"];
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
  expect(html.includes("어떻게 읽었나요?"), `${prefix}: reading-response tab label is missing`, errors);
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
  expect(count(html, /aria-disabled="true"/g) >= manifest.readings.filter((reading) => reading.class_date > manifest.site.publish_cutoff_date).length, "home rail: locked items need aria-disabled", errors);
}

function checkClientLogic(errors) {
  const source = readText(path.join(ROOT_DIR, "scripts", "site_app.js"));
  const context = { document: { addEventListener() {} } };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "site_app.js" });
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
        toggle(name, active) { if (active) values.add(name); else values.delete(name); },
        contains(name) { return values.has(name); },
      };
    };
    const makeItem = ({ kind, value = "", correctAnswer = "", acceptedAnswers = [] }) => {
      const input = { value, checked: Boolean(value) };
      const choice = { classList: makeClassList(), querySelector() { return input; } };
      const feedback = { hidden: true };
      const result = { textContent: "" };
      const item = {
        dataset: { quizKind: kind, correctAnswer, acceptedAnswers: JSON.stringify(acceptedAnswers) },
        classList: makeClassList(),
        querySelector(selector) {
          if (selector === "[data-quiz-input]:checked") return input.checked ? input : null;
          if (selector === "[data-quiz-input]") return input;
          if (selector === "[data-quiz-feedback]") return feedback;
          if (selector === "[data-quiz-result]") return result;
          return null;
        },
        querySelectorAll(selector) { return selector === ".quiz-choice" && kind !== "short" ? [choice] : []; },
      };
      return { item, feedback, result };
    };
    const correctChoice = makeItem({ kind: "mcq", value: "정답", correctAnswer: "정답" });
    expect(context.gradeQuizItem(correctChoice.item).correct === true, "client: choice grading failed", errors);
    expect(correctChoice.feedback.hidden === false && correctChoice.item.classList.contains("is-correct"), "client: correct feedback state failed", errors);
    const correctShort = makeItem({ kind: "short", value: " ７．５년! ", acceptedAnswers: ["7.5년"] });
    expect(context.gradeQuizItem(correctShort.item).correct === true, "client: normalized short-answer grading failed", errors);
    const unanswered = makeItem({ kind: "short", value: "", acceptedAnswers: ["정답"] });
    const unansweredResult = context.gradeQuizItem(unanswered.item);
    expect(unansweredResult.answered === false && unanswered.item.classList.contains("is-unanswered"), "client: unanswered grading failed", errors);
  }
  expect(source.includes("initTranslationSentenceReveals();"), "client: sentence reveal initializer is not called", errors);
  expect(source.includes("initInteractiveQuizzes();"), "client: quiz initializer is not called", errors);
}

function checkChatbotExcluded(errors) {
  const files = [
    path.join(ROOT_DIR, "docs", "index.html"),
    ...PILOT_SLUGS.flatMap((slug) => fs.readdirSync(path.join(ROOT_DIR, "docs", "readings", slug))
      .filter((name) => name.endsWith(".html"))
      .map((name) => path.join(ROOT_DIR, "docs", "readings", slug, name))),
  ];
  files.forEach((filePath) => {
    expect(!/(?:chat\s*bot|chatbot|챗봇)/i.test(readText(filePath)), `chatbot exclusion failed: ${path.relative(ROOT_DIR, filePath)}`, errors);
  });
}

function main() {
  const manifest = readJson(path.join(ROOT_DIR, "manifest", "readings.json"));
  const readings = PILOT_SLUGS.map((slug) => manifest.readings.find((reading) => reading.slug === slug));
  const errors = [];
  readings.forEach((reading) => {
    QUIZ_PAGES.forEach((pageKey) => checkQuizPage(reading, pageKey, errors));
    checkProfessorPrep(reading, errors);
  });
  checkHomeRail(manifest, errors);
  checkClientLogic(errors);
  checkChatbotExcluded(errors);
  if (errors.length) throw new Error(`Interaction checks failed\n  ${errors.join("\n  ")}`);
  console.log(`PASS interactions (${readings.length * QUIZ_PAGES.length} quizzes, ${readings.length} prep pages, ${manifest.readings.length} rail items, chatbot excluded)`);
}

if (require.main === module) main();

module.exports = { main };
