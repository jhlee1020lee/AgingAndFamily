const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { normalizeTranslationOriginalRevealConfig, parseMarkdownDocument, resolveTranslationAlignment } = require("./translation_original_reveal");
const { validateSentencePairs } = require("./sentence_alignment");
const { checkReading: checkSegmentAlignment } = require("./check_alignment");

const ROOT_DIR = path.resolve(__dirname, "..");

const PAGE_STATUS = Object.freeze({
  MISSING: "missing",
  SCHEMA_FAIL: "schema_fail",
  SCHEMA_PASS: "schema_pass",
  APPROVED: "approved",
  NOT_APPLICABLE: "not_applicable",
});

const READING_STATUS = Object.freeze({
  BLOCKED: "blocked",
  PARTIAL: "partial",
  MANUAL_REVIEW_REQUIRED: "manual_review_required",
  APPROVED: "approved",
});

const ARTICLE_PAGE_KEYS = new Set(["full", "translation", "summary", "concepts", "pitfalls", "review-sheet"]);
const QUIZ_PAGE_KEYS = new Set(["quiz-ox", "quiz-short", "quiz-mcq"]);
const STAGE1_PAGE_KEYS = ["full"];
const STAGE2_PAGE_KEYS = ["translation"];
const STAGE3_PAGE_KEYS = ["summary", "concepts", "pitfalls", "review-sheet", "professor-prep", "quiz-ox", "quiz-short", "quiz-mcq"];
const ALL_PAGE_KEYS = ["full", "translation", "summary", "concepts", "pitfalls", "review-sheet", "professor-prep", "quiz-ox", "quiz-short", "quiz-mcq"];
const SHORT_ANSWER_TYPES = new Set(["term", "person", "number", "short_phrase"]);

const SUMMARY_BANNED_PATTERNS = [
  /이 읽기에서 .*어떻게 연결되는지 보여 주는 핵심 축이다/,
  /발표에서는 .*한 문장으로 정의한 뒤 바로 근거와 함의를 붙이는 방식이 안전하다/,
  /읽을 때는 .*같은 말인지, 다른 수준의 개념인지 구분해서 따라가면 구조가 잡힌다/,
];

const CONCEPTS_BANNED_PATTERNS = [
  /반복적으로 확인해야 하는 핵심 개념 또는 쟁점이다/,
  /정의, 근거, 함의 순서로 연결해 말하면 수업 답변이 흔들리지 않는다/,
  /원문 용어 확인 필요/,
  /헷갈리는 포인트 확인 필요/,
  /왜 중요한지 설명 보강 필요/,
];

const PITFALLS_BANNED_PATTERNS = [
  /자주 틀리는 말만 반복하고 구체 구분이 없다/,
];

const REVIEW_SHEET_BANNED_PATTERNS = [
  /이 부분을 한 문장으로 다시 말할 수 있어야 한다/,
  /이 용어가 왜 중요한지 바로 설명할 수 있어야 한다/,
  /한 문장으로 다시 말할 수 있어야 한다/,
];

const PITFALLS_GENERIC_PATTERNS = [
  /교수님 스타일에서는 한국 맥락 연결이 중요하다/,
  /AI처럼 들리기 쉽다/,
  /영문 읽기/,
  /번역만 보고 가면/,
];

const QUIZ_TRIVIAL_EXPLANATION_PATTERNS = [
  /이 읽기(?:의)? 핵심 용어다\.?$/,
  /보여 주는 핵심 축이다\.?$/,
  /읽기 구조를 잡는 핵심 축이다\.?$/,
];

const UNRESOLVED_PARTICLE_PATTERN = /은\(는\)|는\(은\)|와\(과\)|과\(와\)|이\(가\)|가\(이\)|을\(를\)|를\(을\)|로\(으로\)|으로\(로\)/;
const INCOMPLETE_FULL_PATTERNS = [
  /stage\s*1\s*pass/i,
  /현재\s*원문/,
  /현재\s*추출/,
  /다음\s*패스/,
  /끝단\s*qa/i,
  /이어서\s*진행/,
];
const INCOMPLETE_TRANSLATION_PATTERNS = [
  /stage\s*2\s*pass/i,
  /현재\s*번역/,
  /다음\s*패스/,
  /끝단\s*qa/i,
  /이어서\s*진행/,
  /번역본이다/,
  /부록.?참고문헌.*다음\s*패스/,
];

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(readText(filePath));
}

function toText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function webpDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (
    buffer.length < 30 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    throw new Error("not a WebP file");
  }
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const type = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (type === "VP8X" && size >= 10) {
      return {
        width: readUInt24LE(buffer, data + 4) + 1,
        height: readUInt24LE(buffer, data + 7) + 1,
      };
    }
    if (
      type === "VP8 " &&
      size >= 10 &&
      buffer[data + 3] === 0x9d &&
      buffer[data + 4] === 0x01 &&
      buffer[data + 5] === 0x2a
    ) {
      return {
        width: buffer.readUInt16LE(data + 6) & 0x3fff,
        height: buffer.readUInt16LE(data + 8) & 0x3fff,
      };
    }
    if (type === "VP8L" && size >= 5 && buffer[data] === 0x2f) {
      const bits = buffer.readUInt32LE(data + 1);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >>> 14) & 0x3fff) + 1,
      };
    }
    offset = data + size + (size % 2);
  }
  throw new Error("unsupported WebP bitstream");
}

function wordCount(value) {
  return toText(value).split(/\s+/).filter(Boolean).length;
}

function countMatches(value, pattern) {
  return [...toText(value).matchAll(pattern)].length;
}

function normalizedText(value) {
  return toText(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function containsEnglishAnswer(question, answer) {
  const escapedAnswer = normalizedText(answer).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const boundary = "[^\\p{L}\\p{N}_]";
  return new RegExp(`(^|${boundary})${escapedAnswer}(?=$|${boundary})`, "u").test(normalizedText(question));
}

function findDuplicateNormalizedTexts(values) {
  const seen = new Set();
  const duplicates = new Set();
  values.forEach((value) => {
    const key = normalizedText(value);
    if (!key) {
      return;
    }
    if (seen.has(key)) {
      duplicates.add(key);
      return;
    }
    seen.add(key);
  });
  return [...duplicates];
}

function containsUnresolvedParticleTemplate(value) {
  return UNRESOLVED_PARTICLE_PATTERN.test(toText(value));
}

function splitLevelTwoSections(markdown) {
  const text = toText(markdown);
  const matches = [...text.matchAll(/^##\s+(.+)$/gm)];
  if (!matches.length) {
    return [];
  }
  return matches.map((match, index) => {
    const bodyStart = match.index + match[0].length;
    const bodyEnd = index + 1 < matches.length ? matches[index + 1].index : text.length;
    return {
      title: toText(match[1]),
      body: text.slice(bodyStart, bodyEnd).trim(),
    };
  });
}

function findReferenceSection(sections = []) {
  return sections.find((section) => /^(references?|참고문헌)$/i.test(toText(section?.title).trim()));
}

function statusKeyForPage(pageKey) {
  return pageKey.replace(/-/g, "_");
}
function normalizeEnabledPageKeys(rawKeys, language) {
  const fallback = ALL_PAGE_KEYS.filter((key) => language === "en" || key !== "translation");
  if (!Array.isArray(rawKeys)) {
    return fallback;
  }
  const allowed = new Set(fallback);
  const selected = rawKeys.map((item) => toText(item)).filter((item) => allowed.has(item));
  return selected.length ? fallback.filter((key) => selected.includes(key)) : fallback;
}
function enabledPageKeys(reading, existingMeta = {}) {
  return normalizeEnabledPageKeys(reading.enabled_page_keys || existingMeta.enabled_page_keys, reading.language);
}
function isPageEnabledForReading(reading, pageKey, existingMeta = {}) {
  return enabledPageKeys(reading, existingMeta).includes(pageKey);
}

function isEnglishLike(value) {
  return /^[A-Za-z][A-Za-z0-9+ /().,:&'-]*$/.test(toText(value));
}

function pdfVisibility(reading, existingMeta = {}) {
  return toText(reading.pdf_visibility || existingMeta.pdf_visibility) || (toText(reading.public_pdf) ? "public" : "none");
}

function translationOriginalRevealPath(rootDir, reading, existingMeta = {}) {
  const config = normalizeTranslationOriginalRevealConfig(existingMeta.translation_original_reveal || reading.translation_original_reveal);
  if (!config.enabled) {
    return "";
  }
  const translationSourcePath = contentPathForPage(rootDir, reading, "translation");
  return path.join(path.dirname(translationSourcePath), config.alignment_file);
}

function shouldRequireTranslationOriginalRevealBuild(reading, existingMeta = {}, pageResults = {}) {
  const config = normalizeTranslationOriginalRevealConfig(existingMeta.translation_original_reveal || reading.translation_original_reveal);
  if (!config.enabled || reading.language !== "en") {
    return false;
  }
  return pageResults.full?.status === PAGE_STATUS.APPROVED
    && pageResults.translation?.status === PAGE_STATUS.APPROVED;
}

function countHtmlClass(html, className) {
  const classAttrs = [...String(html || "").matchAll(/class="([^"]+)"/g)].map((match) => match[1]);
  return classAttrs.filter((value) => value.split(/\s+/).includes(className)).length;
}

function builtPageFilename(pageKey) {
  return `${pageKey}.html`;
}

function hasBuiltPlaceholderContent(html) {
  const value = String(html || "");
  return value.includes("<h2>업로드 예정입니다.</h2>")
    || value.includes("<h2>임시 안내 페이지</h2>")
    || countHtmlClass(value, "upload-placeholder") > 0
    || countHtmlClass(value, "article-placeholder") > 0;
}

function applyArtifactErrorsToPageResult(result, artifactErrors = []) {
  if (!artifactErrors.length) {
    return result;
  }
  const mergedErrors = Array.from(new Set([...(Array.isArray(result.errors) ? result.errors : []), ...artifactErrors]));
  return {
    ...result,
    status: PAGE_STATUS.SCHEMA_FAIL,
    errors: mergedErrors,
  };
}

function validateTranslationOriginalReveal(rootDir, reading, existingMeta, translationText, fullText) {
  const config = normalizeTranslationOriginalRevealConfig(existingMeta.translation_original_reveal || reading.translation_original_reveal);
  const errors = [];
  const warnings = [];
  const metrics = {
    original_reveal_enabled: config.enabled,
    reveal_entry_count: 0,
    sentence_reveal_pair_count: 0,
  };
  if (!config.enabled) {
    return { errors, warnings, metrics };
  }
  if (reading.language !== "en") {
    errors.push("translation original reveal is only allowed on English readings");
    return { errors, warnings, metrics };
  }
  const alignmentPath = translationOriginalRevealPath(rootDir, reading, existingMeta);
  if (!alignmentPath || !fs.existsSync(alignmentPath)) {
    errors.push("translation original reveal alignment file is missing");
    return { errors, warnings, metrics };
  }
  const payload = loadJson(alignmentPath);
  if (!payload || typeof payload !== "object") {
    errors.push("translation original reveal alignment payload is invalid");
    return { errors, warnings, metrics };
  }
  if (toText(payload.reading_slug) && toText(payload.reading_slug) !== reading.slug) {
    errors.push("translation original reveal reading_slug does not match the reading");
  }
  const translationDocument = parseMarkdownDocument(translationText, { skipFirstTitleHeading: true, collectFrontmatter: true });
  const originalDocument = parseMarkdownDocument(fullText, { skipFirstTitleHeading: true, collectFrontmatter: true });
  const resolved = resolveTranslationAlignment(payload, translationDocument, originalDocument, { allowedStatuses: ["verified"] });
  metrics.reveal_entry_count = resolved.entries.length;
  errors.push(...resolved.errors);
  const rawById = new Map((Array.isArray(payload.entries) ? payload.entries : []).map((entry) => [entry.id, entry]));
  resolved.entries.forEach((entry) => {
    const pairs = Array.isArray(rawById.get(entry.id)?.sentence_pairs) ? rawById.get(entry.id).sentence_pairs : [];
    metrics.sentence_reveal_pair_count += pairs.length;
    errors.push(...validateSentencePairs({
      id: entry.id,
      translationText: entry.translationBlock?.text || entry.translationBlock?.plainText || "",
      sourceText: entry.sourceText,
      pairs,
    }, { allowedStatuses: ["verified"] }));
  });
  if (!metrics.reveal_entry_count) {
    errors.push("translation original reveal is enabled but no verified entries were published");
  }
  return { errors, warnings, metrics };
}

function sharedPageKeys(reading) {
  return (Array.isArray(reading.shared_page_keys) ? reading.shared_page_keys : [])
    .map((item) => toText(item))
    .filter(Boolean);
}

function pageSourceFilename(pageKey) {
  if (pageKey === "full") {
    return "full.md";
  }
  if (pageKey === "translation") {
    return "translation.md";
  }
  if (pageKey === "review-sheet") {
    return "review-sheet.md";
  }
  if (pageKey === "professor-prep") {
    return "professor_prep.json";
  }
  if (pageKey === "quiz-short") {
    return "quiz_short.json";
  }
  if (ARTICLE_PAGE_KEYS.has(pageKey)) {
    return `${pageKey}.md`;
  }
  return `${pageKey}.json`;
}

function sharedPageSourcePath(rootDir, reading, pageKey) {
  const bundle = toText(reading.shared_page_bundle);
  if (!bundle || !sharedPageKeys(reading).includes(pageKey)) {
    return "";
  }
  return path.join(rootDir, "content", "shared-study", bundle, pageSourceFilename(pageKey));
}

function normalizeManualReview(value) {
  const manual = value && typeof value === "object" ? value : {};
  const approvedPageHashes = manual.approved_page_hashes && typeof manual.approved_page_hashes === "object"
    ? Object.fromEntries(
      Object.entries(manual.approved_page_hashes)
        .map(([pageKey, hash]) => [toText(pageKey), toText(hash)])
        .filter(([pageKey, hash]) => pageKey && hash)
    )
    : {};
  return {
    approved_pages: Array.isArray(manual.approved_pages)
      ? manual.approved_pages.map((item) => toText(item)).filter(Boolean)
      : [],
    approved_page_hashes: approvedPageHashes,
    reviewer: toText(manual.reviewer),
    reviewed_at: toText(manual.reviewed_at) || null,
    notes: Array.isArray(manual.notes) ? manual.notes.map((item) => toText(item)).filter(Boolean) : [],
    blocked_reason: toText(manual.blocked_reason),
  };
}

function withApproval(pageKey, baseResult, manualReview) {
  const baseStatus = baseResult?.status;
  const sourceHash = toText(baseResult?.source_hash);
  const storedHash = toText(manualReview?.approved_page_hashes?.[pageKey]);
  if (
    baseStatus === PAGE_STATUS.SCHEMA_PASS
    && manualReview.approved_pages.includes(pageKey)
    && Boolean(storedHash && sourceHash && storedHash === sourceHash)
  ) {
    return PAGE_STATUS.APPROVED;
  }
  return baseStatus;
}

function makeResult(status, errors = [], warnings = [], metrics = {}) {
  return { status, errors, warnings, metrics };
}

function missingResult() {
  return makeResult(PAGE_STATUS.MISSING, ["source file is missing"], []);
}

function baseMarkdownChecks(text, minWords) {
  const errors = [];
  const warnings = [];
  const metrics = {
    word_count: wordCount(text),
    section_count: countMatches(text, /^##\s+/gm),
    sub_section_count: countMatches(text, /^###\s+/gm),
    bullet_count: countMatches(text, /^\s*-\s+/gm),
  };
  if (metrics.word_count < minWords) {
    errors.push(`content is too short (<${minWords} words)`);
  }
  return { errors, warnings, metrics };
}

function parseLongFormStructure(text) {
  const document = parseMarkdownDocument(text, {
    skipFirstTitleHeading: true,
    collectFrontmatter: true,
  });
  const blocks = Array.isArray(document?.blocks) ? document.blocks : [];
  const levelCounts = { 2: 0, 3: 0, 4: 0 };
  const sections = [];
  let currentLevelTwoSection = null;

  blocks.forEach((block) => {
    if (block.type === "heading") {
      if (levelCounts[block.level] !== undefined) {
        levelCounts[block.level] += 1;
      }
      if (block.level === 2) {
        currentLevelTwoSection = {
          title: toText(block.text),
          content_block_count: 0,
          prose_block_count: 0,
          figure_count: 0,
        };
        sections.push(currentLevelTwoSection);
      }
      return;
    }
    if (!currentLevelTwoSection) {
      return;
    }
    currentLevelTwoSection.content_block_count += 1;
    if (block.type === "figure") {
      currentLevelTwoSection.figure_count += 1;
    }
    if (block.type === "paragraph" || block.type === "list" || block.type === "quote" || block.type === "code") {
      currentLevelTwoSection.prose_block_count += 1;
    }
  });

  const emptySections = sections.filter((section) => section.content_block_count === 0);
  return {
    level2_heading_count: levelCounts[2],
    level3_heading_count: levelCounts[3],
    level4_heading_count: levelCounts[4],
    figure_count: blocks.filter((block) => block.type === "figure").length,
    paragraph_count: blocks.filter((block) => block.type === "paragraph").length,
    level2_section_count: sections.length,
    empty_level2_sections: emptySections.map((section) => section.title || "untitled"),
    last_level2_title: sections.length ? sections[sections.length - 1].title : "",
  };
}

function countStandaloneFigureLabelLines(text) {
  return toText(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("!["))
    .filter((line) => /^(?:figure|table|그림|표)\s*[-–—:]?\s*\d+\s*(?:[.:\-–—]|$)/iu.test(line))
    .length;
}

function addIncompleteProgressErrors(errors, text, patterns, label) {
  patterns.forEach((pattern) => {
    if (pattern.test(text)) {
      errors.push(`${label} contains incomplete pass or progress-note text: ${pattern}`);
    }
  });
}

function applyLongFormCoverageChecks(errors, targetMetrics, sourceMetrics, label) {
  if (!sourceMetrics || !targetMetrics) {
    return;
  }
  if (sourceMetrics.level2_heading_count > 0 && targetMetrics.level2_heading_count < sourceMetrics.level2_heading_count) {
    errors.push(`${label} is missing second-level sections relative to the original text`);
  }
  const minimumLevelThreeCount = Math.ceil(sourceMetrics.level3_heading_count * 0.75);
  if (sourceMetrics.level3_heading_count > 0 && targetMetrics.level3_heading_count < minimumLevelThreeCount) {
    errors.push(`${label} is missing third-level sections relative to the original text`);
  }
  const minimumLevelFourCount = Math.ceil(sourceMetrics.level4_heading_count * 0.75);
  if (sourceMetrics.level4_heading_count > 0 && targetMetrics.level4_heading_count < minimumLevelFourCount) {
    errors.push(`${label} is missing fourth-level sections relative to the original text`);
  }
  if (targetMetrics.figure_count !== sourceMetrics.figure_count) {
    errors.push(`${label} is missing figure/table assets relative to the original text`);
  }
  if (targetMetrics.empty_level2_sections.length) {
    errors.push(`${label} contains empty second-level sections: ${targetMetrics.empty_level2_sections.join(", ")}`);
  }
}

function validateSummaryMarkdown(text) {
  if (!text) {
    return missingResult();
  }
  const { errors, warnings, metrics } = baseMarkdownChecks(text, 120);
  if (metrics.section_count < 3) {
    errors.push("summary needs at least 3 second-level sections");
  }
  if (metrics.bullet_count < 6) {
    errors.push("summary needs at least 6 bullet points");
  }
  if (!/^##\s+(한 줄 핵심|핵심 주장|한눈에 보기)$/m.test(text)) {
    errors.push("summary is missing a lead section such as '한 줄 핵심' or '핵심 주장'");
  }
  if (!/^##\s+(결론 정리|왜 중요한지|논증 흐름|수업에서 잡힐 가능성이 큰 포인트|수업에서 바로 잡힐 포인트)$/m.test(text)) {
    warnings.push("summary should include a dedicated implication, conclusion, or class-facing section");
  }
  SUMMARY_BANNED_PATTERNS.forEach((pattern) => {
    if (pattern.test(text)) {
      errors.push(`summary contains banned template phrase: ${pattern}`);
    }
  });
  return makeResult(errors.length ? PAGE_STATUS.SCHEMA_FAIL : PAGE_STATUS.SCHEMA_PASS, errors, warnings, metrics);
}

function validateConceptsMarkdown(text) {
  if (!text) {
    return missingResult();
  }
  const { errors, warnings, metrics } = baseMarkdownChecks(text, 180);
  const sections = splitLevelTwoSections(text);
  metrics.concept_count = sections.length;
  if (sections.length < 5) {
    errors.push("concepts page needs at least 5 concept sections");
  }
  sections.forEach((section, index) => {
    const prefix = `section ${index + 1} (${section.title || "untitled"})`;
    if (!/^- 한국어 개념명:/m.test(section.body)) {
      errors.push(`${prefix}: missing '한국어 개념명'`);
    }
    if (!/^- Original English term:/m.test(section.body)) {
      errors.push(`${prefix}: missing 'Original English term'`);
    }
    if (!/^- 정확한 한 줄 정의:/m.test(section.body)) {
      errors.push(`${prefix}: missing '정확한 한 줄 정의'`);
    }
    if (!/^- 학생 말투로 풀어쓴 설명:/m.test(section.body)) {
      errors.push(`${prefix}: missing '학생 말투로 풀어쓴 설명'`);
    }
    if (!/^- 왜 이 (논문|읽기|장|글)에서 중요한지:/m.test(section.body)) {
      errors.push(`${prefix}: missing '왜 이 ...에서 중요한지'`);
    }
    if (!/^- 자주 헷갈리는 포인트:/m.test(section.body)) {
      errors.push(`${prefix}: missing '자주 헷갈리는 포인트'`);
    }
  });
  CONCEPTS_BANNED_PATTERNS.forEach((pattern) => {
    if (pattern.test(text)) {
      errors.push(`concepts page contains banned placeholder or template phrase: ${pattern}`);
    }
  });
  return makeResult(errors.length ? PAGE_STATUS.SCHEMA_FAIL : PAGE_STATUS.SCHEMA_PASS, errors, warnings, metrics);
}

function validatePitfallsMarkdown(text) {
  if (!text) {
    return missingResult();
  }
  const { errors, warnings, metrics } = baseMarkdownChecks(text, 80);
  if (countMatches(text, /^##\s+/gm) < 3) {
    errors.push("pitfalls page needs at least 3 contrast sections");
  }
  const contrastLines = countMatches(text, /^\s*-\s+(오해|바로잡기|왜 중요한가|A vs B|짧은 구분|왜 헷갈리는지|이 글에서 어떻게 읽어야 하는지):/gm);
  if (contrastLines < 9) {
    errors.push("pitfalls page should include explicit contrast labels such as A vs B, 짧은 구분, 오해, 바로잡기, or 왜 중요한가");
  }
  PITFALLS_BANNED_PATTERNS.forEach((pattern) => {
    if (pattern.test(text)) {
      errors.push(`pitfalls page contains banned template phrase: ${pattern}`);
    }
  });
  PITFALLS_GENERIC_PATTERNS.forEach((pattern) => {
    if (pattern.test(text)) {
      errors.push(`pitfalls page contains generic coaching phrase instead of reading-specific confusion: ${pattern}`);
    }
  });
  if (containsUnresolvedParticleTemplate(text)) {
    errors.push("pitfalls page contains unresolved particle template such as '은(는)' or '와(과)'");
  }
  return makeResult(errors.length ? PAGE_STATUS.SCHEMA_FAIL : PAGE_STATUS.SCHEMA_PASS, errors, warnings, metrics);
}

function validateReviewSheetMarkdown(text) {
  if (!text) {
    return missingResult();
  }
  const { errors, warnings, metrics } = baseMarkdownChecks(text, 80);
  if (countMatches(text, /^##\s+/gm) < 3) {
    warnings.push("review sheet should usually have at least 3 second-level sections");
  }
  REVIEW_SHEET_BANNED_PATTERNS.forEach((pattern) => {
    if (pattern.test(text)) {
      errors.push(`review sheet contains placeholder study instruction instead of actual content: ${pattern}`);
    }
  });
  if (containsUnresolvedParticleTemplate(text)) {
    errors.push("review sheet contains unresolved particle template such as '은(는)' or '와(과)'");
  }
  return makeResult(errors.length ? PAGE_STATUS.SCHEMA_FAIL : PAGE_STATUS.SCHEMA_PASS, errors, warnings, metrics);
}

function validateFullMarkdown(text) {
  if (!text) {
    return missingResult();
  }
  const { errors, warnings, metrics } = baseMarkdownChecks(text, 400);
  const structure = parseLongFormStructure(text);
  Object.assign(metrics, structure);
  metrics.figure_label_line_count = countStandaloneFigureLabelLines(text);
  addIncompleteProgressErrors(errors, text, INCOMPLETE_FULL_PATTERNS, "full text");
  if (structure.level2_heading_count > 0 && structure.empty_level2_sections.length) {
    errors.push(`full text contains empty second-level sections: ${structure.empty_level2_sections.join(", ")}`);
  }
  if (metrics.figure_label_line_count > structure.figure_count) {
    warnings.push("full text appears to contain standalone figure/table labels without matching direct image inserts");
  }
  return makeResult(errors.length ? PAGE_STATUS.SCHEMA_FAIL : PAGE_STATUS.SCHEMA_PASS, errors, warnings, metrics);
}

function validateTranslationMarkdown(rootDir, reading, existingMeta, text, fullText) {
  if (!text) {
    return missingResult();
  }
  const { errors, warnings, metrics } = baseMarkdownChecks(text, 200);
  if (!fullText) {
    errors.push("translation cannot be validated because full text is missing or empty");
  }
  const fullWords = wordCount(fullText);
  if (fullWords) {
    metrics.full_word_count = fullWords;
    metrics.translation_ratio = Number((metrics.word_count / fullWords).toFixed(3));
    if (metrics.translation_ratio < 0.5) {
      errors.push("translation is suspiciously short relative to full text (minimum ratio: 0.5)");
    }
  }
  const translationStructure = parseLongFormStructure(text);
  Object.assign(metrics, translationStructure);
  metrics.figure_label_line_count = countStandaloneFigureLabelLines(text);
  addIncompleteProgressErrors(errors, text, INCOMPLETE_TRANSLATION_PATTERNS, "translation");
  if (fullText) {
    const fullStructure = parseLongFormStructure(fullText);
    const translationSections = splitLevelTwoSections(text);
    const fullSections = splitLevelTwoSections(fullText);
    metrics.full_level2_heading_count = fullStructure.level2_heading_count;
    metrics.full_level3_heading_count = fullStructure.level3_heading_count;
    metrics.full_level4_heading_count = fullStructure.level4_heading_count;
    metrics.full_figure_count = fullStructure.figure_count;
    applyLongFormCoverageChecks(errors, translationStructure, fullStructure, "translation");
    const fullReferenceSection = findReferenceSection(fullSections);
    const translationReferenceSection = findReferenceSection(translationSections);
    if (fullReferenceSection) {
      const fullReferenceWords = wordCount(fullReferenceSection.body);
      metrics.full_reference_word_count = fullReferenceWords;
      if (!translationReferenceSection) {
        errors.push("translation is missing the references section");
      } else {
        const translationReferenceWords = wordCount(translationReferenceSection.body);
        metrics.translation_reference_word_count = translationReferenceWords;
        if (fullReferenceWords >= 200) {
          metrics.translation_reference_ratio = Number((translationReferenceWords / fullReferenceWords).toFixed(3));
          if (metrics.translation_reference_ratio < 0.8) {
            errors.push("translation references section is suspiciously short relative to the original references");
          }
        }
      }
    }
  } else if (translationStructure.empty_level2_sections.length) {
    errors.push(`translation contains empty second-level sections: ${translationStructure.empty_level2_sections.join(", ")}`);
  }
  if (metrics.figure_label_line_count > translationStructure.figure_count) {
    warnings.push("translation appears to contain standalone figure/table labels without matching direct image inserts");
  }
  const revealValidation = validateTranslationOriginalReveal(rootDir, reading, existingMeta, text, fullText);
  errors.push(...revealValidation.errors);
  warnings.push(...revealValidation.warnings);
  Object.assign(metrics, revealValidation.metrics);
  return makeResult(errors.length ? PAGE_STATUS.SCHEMA_FAIL : PAGE_STATUS.SCHEMA_PASS, errors, warnings, metrics);
}

function validateEnglishText(value, label, errors, options = {}) {
  const text = toText(value);
  if (!text) return;
  if (/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/.test(text) || (!options.allowNumeric && !/[A-Za-z]/.test(text))) {
    errors.push(`${label} must contain English text for language=en`);
  }
}

function validateEvidenceId(value, label, knownIds, errors) {
  const id = toText(value);
  if (!id) errors.push(`${label} is missing evidence_segment_id`);
  else if (!knownIds.has(id)) errors.push(`${label} references unknown evidence_segment_id ${id}`);
}

function validateProfessorPrepJson(payload, knownIds = new Set()) {
  if (!payload) {
    return missingResult();
  }
  const cards = Array.isArray(payload.cards) ? payload.cards : [];
  const readingResponse = payload.reading_response && typeof payload.reading_response === "object"
    ? payload.reading_response
    : null;
  const readingResponseCards = Array.isArray(readingResponse?.cards) ? readingResponse.cards : [];
  const errors = [];
  const warnings = [];
  const metrics = {
    card_count: cards.length,
    reading_response_card_count: readingResponseCards.length,
  };
  if (payload.language === "en") {
    for (const field of ["title", "instructions"]) validateEnglishText(payload[field], `professor-prep ${field}`, errors);
    for (const field of ["title", "instructions"]) validateEnglishText(readingResponse?.[field], `reading_response ${field}`, errors);
  }
  if (cards.length < 15) {
    errors.push("professor-prep needs at least 15 cards");
  }
  if (!readingResponse) {
    errors.push("professor-prep needs a reading_response section");
  } else {
    if (!toText(readingResponse.title)) {
      errors.push("reading_response is missing title");
    }
    if (!toText(readingResponse.instructions)) {
      errors.push("reading_response is missing instructions");
    }
    if (readingResponseCards.length < 5) {
      errors.push("reading_response needs at least 5 cards");
    }
  }
  const ids = new Set();
  const validateCards = (items, label, requireEvidence = false) => {
    items.forEach((card, index) => {
      if (!card || typeof card !== "object") {
        errors.push(`${label} ${index + 1} is not an object`);
        return;
      }
      const cardId = toText(card.card_id);
      if (!cardId) {
        errors.push(`${label} ${index + 1} is missing card_id`);
      } else if (ids.has(cardId)) {
        errors.push(`${label} ${index + 1} has duplicate card_id ${cardId}`);
      } else {
        ids.add(cardId);
      }
      if (!toText(card.title)) {
        errors.push(`${label} ${index + 1} is missing title`);
      }
      const answer30s = toText(card.answer_30s);
      const legacyAnswer = toText(card.answer || card.model_answer);
      if (!answer30s) {
        if (legacyAnswer) {
          errors.push(`${label} ${index + 1} must use answer_30s; legacy answer/model_answer is not valid for approval`);
        } else {
          errors.push(`${label} ${index + 1} is missing answer_30s`);
        }
      }
      if (requireEvidence) validateEvidenceId(card.evidence_segment_id, `${label} ${index + 1}`, knownIds, errors);
      if (payload.language === "en") {
        for (const field of ["title", "answer_30s", "source"]) validateEnglishText(card[field], `${label} ${index + 1} ${field}`, errors);
      }
    });
  };
  validateCards(cards, "card", true);
  validateCards(readingResponseCards, "reading_response card", true);
  return makeResult(errors.length ? PAGE_STATUS.SCHEMA_FAIL : PAGE_STATUS.SCHEMA_PASS, errors, warnings, metrics);
}

function validateQuizPayload(pageKey, payload, knownIds = new Set()) {
  if (!payload) {
    return missingResult();
  }
  const items = Array.isArray(payload.items) ? payload.items : [];
  const errors = [];
  const warnings = [];
  const metrics = { item_count: items.length, evidence_segment_count: 0 };
  if (payload.language === "en") {
    for (const field of ["title", "instructions"]) validateEnglishText(payload[field], `${pageKey} ${field}`, errors);
  }
  items.forEach((item, index) => {
    validateEvidenceId(item?.evidence_segment_id, `${pageKey} item ${index + 1}`, knownIds, errors);
    if (payload.language === "en") {
      for (const field of ["question", "prompt", "explanation", "source", "misconception_targeted"]) validateEnglishText(item?.[field], `${pageKey} item ${index + 1} ${field}`, errors);
      for (const [field, values] of [["options", item?.options], ["accepted_answers", item?.accepted_answers]]) {
        (Array.isArray(values) ? values : []).forEach((value, answerIndex) => validateEnglishText(value, `${pageKey} item ${index + 1} ${field}[${answerIndex}]`, errors, { allowNumeric: item?.answer_type === "number" }));
      }
      if (pageKey !== "quiz-short") validateEnglishText(item?.answer, `${pageKey} item ${index + 1} answer`, errors, { allowNumeric: true });
    }
  });
  if (items.length !== 15) {
    errors.push(`${pageKey} must contain exactly 15 items`);
  }
  if (pageKey === "quiz-short") {
    const questions = [];
    items.forEach((item, index) => {
      const question = toText(item.question);
      const explanation = toText(item.explanation);
      const evidenceSegmentId = toText(item.evidence_segment_id);
      const acceptedAnswers = Array.isArray(item.accepted_answers)
        ? item.accepted_answers.map((answer) => toText(answer)).filter(Boolean)
        : [];
      if (evidenceSegmentId) {
        metrics.evidence_segment_count += 1;
      } else {
        warnings.push(`quiz-short item ${index + 1} is missing evidence_segment_id; legacy source is tolerated but not approval-ready for new segment-aligned work`);
      }
      questions.push(question);
      if (!question) {
        errors.push(`quiz-short item ${index + 1} is missing question`);
      }
      if (!acceptedAnswers.length) {
        errors.push(`quiz-short item ${index + 1} is missing accepted_answers`);
      }
      if (!SHORT_ANSWER_TYPES.has(toText(item.answer_type))) {
        errors.push(`quiz-short item ${index + 1} has invalid answer_type`);
      }
      if (!explanation) {
        errors.push(`quiz-short item ${index + 1} is missing explanation`);
      } else {
        QUIZ_TRIVIAL_EXPLANATION_PATTERNS.forEach((pattern) => {
          if (pattern.test(explanation)) {
            errors.push(`quiz-short item ${index + 1} explanation is too generic: ${pattern}`);
          }
        });
      }
      if (containsUnresolvedParticleTemplate(question) || containsUnresolvedParticleTemplate(explanation)) {
        errors.push(`quiz-short item ${index + 1} contains unresolved particle template`);
      }
      acceptedAnswers.forEach((answer, answerIndex) => {
        if (wordCount(answer) > 7) {
          errors.push(`quiz-short item ${index + 1} answer ${answerIndex + 1} exceeds 7 words`);
        }
        const leaksAnswer = payload.language === "en"
          ? containsEnglishAnswer(question, answer)
          : normalizedText(question).includes(normalizedText(answer));
        if (answer.length >= 2 && leaksAnswer) {
          errors.push(`quiz-short item ${index + 1} leaks the accepted answer in the question`);
        }
      });
    });
    const duplicateQuestions = findDuplicateNormalizedTexts(questions);
    if (duplicateQuestions.length) {
      errors.push(`quiz-short contains duplicate or near-duplicate questions (${duplicateQuestions.length})`);
    }
  } else {
    const prompts = [];
    const mcqAnswerPositions = [];
    const mcqAnswerLengthRanks = [];
    items.forEach((item, index) => {
      const prompt = toText(item.prompt);
      const answer = toText(item.answer);
      const explanation = toText(item.explanation);
      const evidenceSegmentId = toText(item.evidence_segment_id);
      prompts.push(prompt);
      if (evidenceSegmentId) {
        metrics.evidence_segment_count += 1;
      } else {
        warnings.push(`${pageKey} item ${index + 1} is missing evidence_segment_id; legacy source is tolerated but not approval-ready for new segment-aligned work`);
      }
      if (!prompt) {
        errors.push(`${pageKey} item ${index + 1} is missing prompt`);
      }
      if (!answer) {
        errors.push(`${pageKey} item ${index + 1} is missing answer`);
      }
      if (!explanation) {
        errors.push(`${pageKey} item ${index + 1} is missing explanation`);
      } else {
        QUIZ_TRIVIAL_EXPLANATION_PATTERNS.forEach((pattern) => {
          if (pattern.test(explanation)) {
            errors.push(`${pageKey} item ${index + 1} explanation is too generic: ${pattern}`);
          }
        });
      }
      if (containsUnresolvedParticleTemplate(prompt) || containsUnresolvedParticleTemplate(explanation)) {
        errors.push(`${pageKey} item ${index + 1} contains unresolved particle template`);
      }
      if (pageKey === "quiz-ox" && !/^(O|X|true|false)$/i.test(answer)) {
        errors.push(`quiz-ox item ${index + 1} answer must be O/X or true/false`);
      }
      if (pageKey === "quiz-mcq") {
        const options = Array.isArray(item.options)
          ? item.options.map((option) => toText(option)).filter(Boolean)
          : [];
        if (options.length !== 4) {
          errors.push(`quiz-mcq item ${index + 1} must contain exactly 4 options`);
        }
        if (options.length && !options.includes(answer)) {
          errors.push(`quiz-mcq item ${index + 1} answer must appear in options`);
        }
        const answerOccurrences = options.filter((option) => option === answer).length;
        if (answerOccurrences > 1) {
          errors.push(`quiz-mcq item ${index + 1} answer must appear exactly once in options`);
        }
        const answerPosition = options.indexOf(answer);
        mcqAnswerPositions.push(answerPosition);
        if (answerPosition >= 0) {
          const optionLengths = options.map((option) => Array.from(option).length);
          const sortedLengths = [...optionLengths].sort((left, right) => right - left);
          mcqAnswerLengthRanks.push(sortedLengths.indexOf(optionLengths[answerPosition]) + 1);
        }
      }
    });
    const duplicatePrompts = findDuplicateNormalizedTexts(prompts);
    if (duplicatePrompts.length) {
      errors.push(`${pageKey} contains duplicate or near-duplicate prompts (${duplicatePrompts.length})`);
    }
    if (pageKey === "quiz-mcq") {
      const uniquePositions = [...new Set(mcqAnswerPositions.filter((position) => position >= 0))];
      if (mcqAnswerPositions.length >= 6 && uniquePositions.length === 1) {
        errors.push("quiz-mcq uses the same answer position for every item");
      }
      const positionCounts = mcqAnswerPositions.reduce((counts, position) => {
        if (position >= 0) counts[position + 1] = (counts[position + 1] || 0) + 1;
        return counts;
      }, {});
      const lengthRankCounts = mcqAnswerLengthRanks.reduce((counts, rank) => {
        counts[rank] = (counts[rank] || 0) + 1;
        return counts;
      }, {});
      metrics.answer_position_counts = positionCounts;
      metrics.correct_option_length_rank_counts = lengthRankCounts;
      if (items.length === 15) {
        const sparsePositions = [1, 2, 3, 4].filter((position) => (positionCounts[position] || 0) < 2);
        if (sparsePositions.length) {
          errors.push(
            `quiz-mcq answer positions are too concentrated; each of A-D must be used at least twice ` +
            `(sparse positions: ${sparsePositions.join(", ")})`
          );
        }
      }
      if (mcqAnswerLengthRanks.length >= 10) {
        const [dominantRank, dominantCount] = Object.entries(lengthRankCounts)
          .sort((left, right) => right[1] - left[1])[0] || ["", 0];
        if (dominantCount / mcqAnswerLengthRanks.length >= 0.8) {
          errors.push(
            `quiz-mcq correct-option length rank is overly concentrated ` +
            `(${dominantCount}/${mcqAnswerLengthRanks.length} at rank ${dominantRank})`
          );
        }
      }
    }
  }
  return makeResult(errors.length ? PAGE_STATUS.SCHEMA_FAIL : PAGE_STATUS.SCHEMA_PASS, errors, warnings, metrics);
}

function validateOverviewComic(rootDir, reading) {
  const contentDir = path.resolve(rootDir, reading.content_dir || "");
  const comicPath = path.join(contentDir, "overview_comic.json");
  if (!fs.existsSync(comicPath)) {
    return {
      errors: ["overview_comic.json is required for every reading landing page"],
      warnings: [],
      metrics: { overview_comic_panel_count: 0, overview_comic_asset_bytes: 0 },
    };
  }
  const errors = [];
  const warnings = [];
  let payload = null;
  try {
    payload = loadJson(comicPath);
  } catch (error) {
    errors.push(`overview_comic.json is not valid JSON: ${error.message}`);
    return { errors, warnings, metrics: { overview_comic_panel_count: 0, overview_comic_asset_bytes: 0 } };
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    errors.push("overview_comic.json root must be an object");
    return { errors, warnings, metrics: { overview_comic_panel_count: 0, overview_comic_asset_bytes: 0 } };
  }
  if (!toText(payload.title)) errors.push("overview_comic.json missing title");
  if (!toText(payload.intro)) errors.push("overview_comic.json missing intro");
  const panels = Array.isArray(payload.panels) ? payload.panels : [];
  if (panels.length !== 4) errors.push(`overview_comic.json must contain exactly 4 panels (found ${panels.length})`);
  const sourceSegments = loadJson(path.join(contentDir, "source_segments.json"));
  const knownSegmentIds = new Set((Array.isArray(sourceSegments?.segments) ? sourceSegments.segments : []).map((segment) => toText(segment?.segment_id)).filter(Boolean));
  const panelIds = new Set();
  const imagePaths = new Set();
  const imageHashes = new Set();
  let assetBytes = 0;
  panels.forEach((panel, index) => {
    const label = `overview_comic.json panels[${index}]`;
    if (!panel || typeof panel !== "object" || Array.isArray(panel)) {
      errors.push(`${label} must be an object`);
      return;
    }
    const panelId = toText(panel.panel_id);
    if (!panelId) errors.push(`${label} missing panel_id`);
    if (panelId && panelIds.has(panelId)) errors.push(`${label} duplicates panel_id ${panelId}`);
    panelIds.add(panelId);
    ["label", "alt", "caption", "detail", "limit"].forEach((field) => {
      if (!toText(panel[field])) errors.push(`${label} missing ${field}`);
    });
    const width = Number(panel.width);
    const height = Number(panel.height);
    if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
      errors.push(`${label} width and height must be positive integers`);
    } else if (width !== 900 || height !== 900) {
      errors.push(`${label} width and height must be 900x900`);
    }
    const image = toText(panel.image).replace(/\\/g, "/");
    if (!image) {
      errors.push(`${label} missing image`);
    } else if (/^(?:[a-z]+:|\/)/i.test(image) || path.isAbsolute(image)) {
      errors.push(`${label} image must be a local relative path`);
    } else {
      const imagePath = path.resolve(contentDir, ...image.split("/"));
      const relativeImagePath = path.relative(contentDir, imagePath);
      if (!relativeImagePath || relativeImagePath.startsWith("..") || path.isAbsolute(relativeImagePath)) {
        errors.push(`${label} image escapes the reading content directory`);
      } else if (!fs.existsSync(imagePath)) {
        errors.push(`${label} image does not exist: ${image}`);
      } else {
        if (imagePaths.has(image)) errors.push(`${label} reuses image path ${image}`);
        imagePaths.add(image);
        const size = fs.statSync(imagePath).size;
        assetBytes += size;
        if (size > 250000) errors.push(`${label} image is larger than 250 KB (${size} bytes)`);
        try {
          const dimensions = webpDimensions(imagePath);
          if (dimensions.width !== 900 || dimensions.height !== 900) {
            errors.push(`${label} actual image is ${dimensions.width}x${dimensions.height}, expected 900x900`);
          }
          const hash = crypto.createHash("sha256").update(fs.readFileSync(imagePath)).digest("hex");
          if (imageHashes.has(hash)) errors.push(`${label} duplicates another panel image`);
          imageHashes.add(hash);
        } catch (error) {
          errors.push(`${label} cannot read WebP image (${error.message})`);
        }
      }
      if (path.extname(image).toLowerCase() !== ".webp") errors.push(`${label} image must use WebP for the overview`);
    }
    if (Object.prototype.hasOwnProperty.call(panel, "dialogues")) {
      errors.push(`${label} dialogues is no longer supported; use the single caption field`);
    }
    const evidenceIds = (Array.isArray(panel.evidence_segment_ids) ? panel.evidence_segment_ids : []).map((item) => toText(item)).filter(Boolean);
    if (!evidenceIds.length) errors.push(`${label} evidence_segment_ids must be non-empty`);
    if (knownSegmentIds.size) {
      evidenceIds.filter((segmentId) => !knownSegmentIds.has(segmentId)).forEach((segmentId) => errors.push(`${label} references unknown evidence segment ${segmentId}`));
    }
  });
  if (assetBytes > 600000) errors.push(`overview comic assets exceed 600 KB total (${assetBytes} bytes)`);
  return { errors, warnings, metrics: { overview_comic_panel_count: panels.length, overview_comic_asset_bytes: assetBytes } };
}

function validateLandingOverview(rootDir, reading, existingMeta = {}) {
  const overviewHook = toText(reading.overview_hook || existingMeta.overview_hook);
  const rawClassroomPoints = Array.isArray(reading.classroom_points)
    ? reading.classroom_points
    : (Array.isArray(existingMeta.classroom_points) ? existingMeta.classroom_points : []);
  const classroomPoints = rawClassroomPoints.map((point) => toText(point)).filter(Boolean);
  const comic = validateOverviewComic(rootDir, reading);
  const errors = [...comic.errors];
  const metrics = {
    overview_hook_length: overviewHook.length,
    classroom_point_raw_count: rawClassroomPoints.length,
    classroom_point_count: classroomPoints.length,
    ...comic.metrics,
  };
  if (!overviewHook) {
    errors.push("missing overview_hook");
  }
  if (rawClassroomPoints.length !== 5 || classroomPoints.length !== 5) {
    errors.push(
      `classroom_points must contain exactly 5 non-empty items ` +
      `(array length ${rawClassroomPoints.length}, non-empty ${classroomPoints.length})`
    );
  }
  const duplicatePoints = findDuplicateNormalizedTexts(classroomPoints);
  if (duplicatePoints.length) {
    errors.push(`classroom_points contains duplicate items: ${duplicatePoints.join(" | ")}`);
  }
  return makeResult(errors.length ? PAGE_STATUS.SCHEMA_FAIL : PAGE_STATUS.SCHEMA_PASS, errors, comic.warnings, metrics);
}

function approvalDependenciesForPage(rootDir, reading, pageKey, existingMeta = {}) {
  const contentDir = path.resolve(rootDir, reading.content_dir);
  const files = new Set([path.join(contentDir, "source_segments.json")]);
  const sourcePath = pageKey === "index" ? path.join(contentDir, "overview_comic.json") : contentPathForPage(rootDir, reading, pageKey);
  files.add(sourcePath);
  const metadata = { version: 2, slug: reading.slug, page: pageKey, language: reading.language };
  if (pageKey === "translation") {
    files.add(path.join(contentDir, "translation_segments.json"));
    files.add(contentPathForPage(rootDir, reading, "full"));
    const config = normalizeTranslationOriginalRevealConfig(reading.translation_original_reveal || existingMeta.translation_original_reveal);
    metadata.translation_original_reveal = config;
    if (config.enabled) files.add(path.join(path.dirname(sourcePath), config.alignment_file));
  }
  if (pageKey === "index") {
    metadata.overview_hook = reading.overview_hook || existingMeta.overview_hook || "";
    metadata.classroom_points = reading.classroom_points || existingMeta.classroom_points || [];
    const comic = loadJson(sourcePath);
    (Array.isArray(comic?.panels) ? comic.panels : []).forEach((panel) => {
      if (toText(panel?.image)) files.add(path.resolve(contentDir, panel.image));
    });
  }
  // Hash the files actually used by Markdown image inserts as well as their paths.
  for (const filePath of [...files]) {
    if (!filePath.endsWith(".md") || !fs.existsSync(filePath)) continue;
    for (const match of readText(filePath).matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
      const image = match[1].trim().replace(/^<|>$/g, "");
      if (!/^(?:[a-z]+:|\/\/)/i.test(image)) files.add(path.resolve(path.dirname(filePath), image));
    }
  }
  return { metadata, files: [...files].sort() };
}

function sourceHashForPage(rootDir, reading, pageKey, existingMeta = {}) {
  const { metadata, files } = approvalDependenciesForPage(rootDir, reading, pageKey, existingMeta);
  const dependencies = files.map((filePath) => {
    const relative = path.relative(rootDir, filePath).split(path.sep).join("/");
    if (!fs.existsSync(filePath)) return [relative, "missing"];
    const bytes = /\.(?:md|json)$/i.test(filePath) ? Buffer.from(readText(filePath).replace(/\r\n?/g, "\n")) : fs.readFileSync(filePath);
    return [relative, crypto.createHash("sha256").update(bytes).digest("hex")];
  });
  return `v2:${crypto.createHash("sha256").update(JSON.stringify({ metadata, dependencies })).digest("hex")}`;
}

function contentPathForPage(rootDir, reading, pageKey) {
  const sharedPath = sharedPageSourcePath(rootDir, reading, pageKey);
  if (sharedPath) {
    return sharedPath;
  }
  const contentDir = path.join(rootDir, reading.content_dir);
  if (pageKey === "full") {
    const preferred = path.join(contentDir, "full.md");
    const fallback = path.join(contentDir, "cleaned.md");
    return fs.existsSync(preferred) ? preferred : fallback;
  }
  if (pageKey === "translation") {
    return path.join(contentDir, "translation.md");
  }
  if (pageKey === "summary") {
    return path.join(contentDir, "summary.md");
  }
  if (pageKey === "concepts") {
    return path.join(contentDir, "concepts.md");
  }
  if (pageKey === "pitfalls") {
    return path.join(contentDir, "pitfalls.md");
  }
  if (pageKey === "review-sheet") {
    return path.join(contentDir, "review-sheet.md");
  }
  if (pageKey === "professor-prep") {
    return path.join(contentDir, "professor_prep.json");
  }
  if (pageKey === "quiz-short") {
    return path.join(contentDir, "quiz_short.json");
  }
  return path.join(contentDir, `${pageKey}.json`);
}

function validatePage(rootDir, reading, pageKey, existingMeta = {}) {
  if (!isPageEnabledForReading(reading, pageKey, existingMeta)) {
    return makeResult(PAGE_STATUS.NOT_APPLICABLE, [], [], {});
  }
  if (pageKey === "translation" && reading.language !== "en") {
    return makeResult(PAGE_STATUS.NOT_APPLICABLE, [], [], {});
  }
  const sourcePath = contentPathForPage(rootDir, reading, pageKey);
  if (!fs.existsSync(sourcePath)) {
    return missingResult();
  }
  const sourceHash = sourceHashForPage(rootDir, reading, pageKey, existingMeta);
  if (ARTICLE_PAGE_KEYS.has(pageKey)) {
    const text = readText(sourcePath);
    let result;
    if (pageKey === "summary") {
      result = validateSummaryMarkdown(text);
    } else if (pageKey === "concepts") {
      result = validateConceptsMarkdown(text);
    } else if (pageKey === "pitfalls") {
      result = validatePitfallsMarkdown(text);
    } else if (pageKey === "review-sheet") {
      result = validateReviewSheetMarkdown(text);
    } else if (pageKey === "translation") {
      const fullPath = contentPathForPage(rootDir, reading, "full");
      const fullText = fs.existsSync(fullPath) ? readText(fullPath) : "";
      result = validateTranslationMarkdown(rootDir, reading, existingMeta, text, fullText);
    } else {
      result = validateFullMarkdown(text);
    }
    return { ...result, source_hash: sourceHash };
  }
  if (pageKey === "professor-prep") {
    const payload = loadJson(sourcePath);
    const source = loadJson(path.join(rootDir, reading.content_dir, "source_segments.json"));
    const result = validateProfessorPrepJson(payload, new Set((source?.segments || []).map((segment) => toText(segment.segment_id))));
    return { ...result, source_hash: sourceHash };
  }
  if (QUIZ_PAGE_KEYS.has(pageKey)) {
    const payload = loadJson(sourcePath);
    const source = loadJson(path.join(rootDir, reading.content_dir, "source_segments.json"));
    const result = validateQuizPayload(pageKey, payload, new Set((source?.segments || []).map((segment) => toText(segment.segment_id))));
    return { ...result, source_hash: sourceHash };
  }
  return missingResult();
}

function sanitizeManualReviewApprovals(manualReview, basePageResults) {
  const approvedPages = [];
  const approvedPageHashes = { ...manualReview.approved_page_hashes };

  manualReview.approved_pages.forEach((pageKey) => {
    const result = basePageResults[pageKey];
    if (!result || result.status !== PAGE_STATUS.SCHEMA_PASS) {
      delete approvedPageHashes[pageKey];
      return;
    }
    const sourceHash = toText(result.source_hash);
    const storedHash = toText(approvedPageHashes[pageKey]);
    if (!storedHash || !sourceHash || storedHash !== sourceHash) {
      delete approvedPageHashes[pageKey];
      return;
    }
    approvedPages.push(pageKey);
  });

  return {
    ...manualReview,
    approved_pages: approvedPages,
    approved_page_hashes: approvedPageHashes,
  };
}

function applyManualApproval(pageKey, result, manualReview) {
  return {
    ...result,
    status: withApproval(pageKey, result, manualReview),
  };
}

function isPassingStatus(status) {
  return status === PAGE_STATUS.SCHEMA_PASS || status === PAGE_STATUS.APPROVED;
}

function stageStatusFromPages(pageResults, requiredKeys, options = {}) {
  const notes = [];
  let hasFailure = false;
  requiredKeys.forEach((key) => {
    const page = pageResults[key];
    if (!page || page.status === PAGE_STATUS.MISSING || page.status === PAGE_STATUS.SCHEMA_FAIL) {
      hasFailure = true;
      const problems = page ? page.errors : ["missing validator result"];
      notes.push(`${key}: ${problems.join("; ")}`);
    }
  });
  if (options.extraNotes && options.extraNotes.length) {
    hasFailure = true;
    notes.push(...options.extraNotes);
  }
  const uniqueNotes = Array.from(new Set(notes));
  if (hasFailure) {
    return { status: READING_STATUS.PARTIAL, notes: uniqueNotes };
  }
  const allApproved = requiredKeys.every((key) => pageResults[key] && pageResults[key].status === PAGE_STATUS.APPROVED);
  if (allApproved) {
    return { status: READING_STATUS.APPROVED, notes: [] };
  }
  return { status: READING_STATUS.MANUAL_REVIEW_REQUIRED, notes: [] };
}

function validateBuildArtifacts(rootDir, reading, existingMeta = {}, pageResults = {}) {
  const errors = [];
  const translationErrors = [];
  const readingDir = path.join(rootDir, "docs", "readings", reading.slug);
  const requiredPages = ["index.html", ...enabledPageKeys(reading, existingMeta).map((pageKey) => builtPageFilename(pageKey))];
  const quizKeys = enabledPageKeys(reading, existingMeta).filter((pageKey) => QUIZ_PAGE_KEYS.has(pageKey));
  if (quizKeys.length) requiredPages.push("quiz.html");
  requiredPages.forEach((file) => {
    if (!fs.existsSync(path.join(readingDir, file))) {
      const message = `missing built page: docs/readings/${reading.slug}/${file}`;
      errors.push(message);
      if (file === "translation.html") {
        translationErrors.push(message);
      }
    }
  });
  if (pdfVisibility(reading, existingMeta) === "public" && toText(reading.public_pdf)) {
    const publicPdfPath = path.join(rootDir, "docs", ...reading.public_pdf.split("/"));
    if (!fs.existsSync(publicPdfPath)) {
      errors.push(`missing built public pdf: ${reading.public_pdf}`);
    }
  }
  if (shouldRequireTranslationOriginalRevealBuild(reading, existingMeta, pageResults)) {
    const translationHtmlPath = path.join(readingDir, "translation.html");
    if (fs.existsSync(translationHtmlPath)) {
      const html = readText(translationHtmlPath);
      const segmentCount = countHtmlClass(html, "translation-segment");
      const revealCount = countHtmlClass(html, "source-reveal");
      const expectedCount = Number(pageResults.translation?.metrics?.reveal_entry_count || 0);
      if (!html.includes('data-original-reveal="enabled"')) {
        translationErrors.push(`missing built translation original reveal marker: docs/readings/${reading.slug}/translation.html`);
      }
      if (segmentCount !== expectedCount) {
        translationErrors.push(`built translation original reveal segment count mismatch: expected ${expectedCount}, found ${segmentCount} in docs/readings/${reading.slug}/translation.html`);
      }
      if (revealCount !== expectedCount) {
        translationErrors.push(`built translation original reveal body count mismatch: expected ${expectedCount}, found ${revealCount} in docs/readings/${reading.slug}/translation.html`);
      }
      if (countHtmlClass(html, "source-reveal-summary") !== expectedCount) {
        translationErrors.push(`built translation original reveal summary count mismatch: expected ${expectedCount} in docs/readings/${reading.slug}/translation.html`);
      }
    } else {
      translationErrors.push(`missing built page: docs/readings/${reading.slug}/translation.html`);
    }
  }
  Object.entries(pageResults).forEach(([pageKey, result]) => {
    if (result?.status !== PAGE_STATUS.APPROVED) {
      return;
    }
    if (pageKey === "translation" && reading.language !== "en") {
      return;
    }
    const htmlPath = path.join(readingDir, builtPageFilename(pageKey));
    if (!fs.existsSync(htmlPath)) {
      return;
    }
    const html = readText(htmlPath);
    const contentDir = path.resolve(rootDir, reading.content_dir);
    const imageDependencies = approvalDependenciesForPage(rootDir, reading, pageKey, existingMeta).files.filter((filePath) => /\.(?:webp|png|jpe?g|gif|svg)$/i.test(filePath));
    imageDependencies.forEach((sourcePath) => {
      const relativeImage = path.relative(contentDir, sourcePath);
      if (relativeImage.startsWith("..") || path.isAbsolute(relativeImage)) return;
      const builtImage = path.join(rootDir, "docs", "assets", "readings", reading.slug, relativeImage);
      if (!fs.existsSync(sourcePath) || !fs.existsSync(builtImage) || !fs.readFileSync(sourcePath).equals(fs.readFileSync(builtImage))) {
        errors.push(`built image differs from approved source (${relativeImage}): docs/readings/${reading.slug}/${builtPageFilename(pageKey)}`);
      }
    });
    if (hasBuiltPlaceholderContent(html)) {
      const message = `approved page still renders placeholder content: docs/readings/${reading.slug}/${builtPageFilename(pageKey)}`;
      errors.push(message);
      if (pageKey === "translation") {
        translationErrors.push(message);
      }
    }
    if (QUIZ_PAGE_KEYS.has(pageKey) || pageKey === "professor-prep") {
      const payload = loadJson(contentPathForPage(rootDir, reading, pageKey));
      if (payload?.language === "en") {
        // Strip markup before decoding entities so displayed inequalities cannot become HTML tags.
        const text = html.replace(/<[^>]*>/g, " ").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\s+/g, " ");
        const cards = pageKey === "professor-prep" ? [...(payload.cards || []), ...(payload.reading_response?.cards || [])] : payload.items || [];
        cards.forEach((item, index) => {
          const values = pageKey === "professor-prep" ? [item.title, item.answer_30s] : [item.question || item.prompt, item.explanation, ...(pageKey === "quiz-short" ? item.accepted_answers || [] : [item.answer])];
          values.forEach((value) => {
            const expected = toText(value).replace(/[*`]/g, "").replace(/\s+/g, " ");
            if (expected && !text.includes(expected)) errors.push(`built English content differs at item ${index + 1}: docs/readings/${reading.slug}/${builtPageFilename(pageKey)}`);
          });
        });
      }
    }
  });
  if (quizKeys.length && quizKeys.every((key) => pageResults[key]?.status === PAGE_STATUS.APPROVED)) {
    const playerPath = path.join(readingDir, "quiz.html");
    if (fs.existsSync(playerPath) && hasBuiltPlaceholderContent(readText(playerPath))) errors.push(`approved page still renders placeholder content: docs/readings/${reading.slug}/quiz.html`);
  }
  const allErrors = [...new Set([...errors, ...translationErrors])];
  const pageErrors = {};
  allErrors.forEach((message) => {
    const match = message.match(/\/([^/]+)\.html(?:\b|$)/);
    const keys = match?.[1] === "quiz" ? quizKeys : [match?.[1] || "full"];
    keys.forEach((key) => { (pageErrors[key] ||= []).push(message); });
  });
  return { errors: allErrors, pageErrors, translationErrors, page_count: requiredPages.length };
}

function buildValidationSnapshot(rootDir, reading, existingMeta = {}, options = {}) {
  const rawManualReview = normalizeManualReview(existingMeta.manual_review);
  const landingSource = validateLandingOverview(rootDir, reading, existingMeta);
  const basePageResults = {
    index: { ...landingSource, source_hash: sourceHashForPage(rootDir, reading, "index", existingMeta) },
    full: validatePage(rootDir, reading, "full", existingMeta),
    translation: validatePage(rootDir, reading, "translation", existingMeta),
    summary: validatePage(rootDir, reading, "summary", existingMeta),
    concepts: validatePage(rootDir, reading, "concepts", existingMeta),
    pitfalls: validatePage(rootDir, reading, "pitfalls", existingMeta),
    "review-sheet": validatePage(rootDir, reading, "review-sheet", existingMeta),
    "professor-prep": validatePage(rootDir, reading, "professor-prep", existingMeta),
    "quiz-ox": validatePage(rootDir, reading, "quiz-ox", existingMeta),
    "quiz-short": validatePage(rootDir, reading, "quiz-short", existingMeta),
    "quiz-mcq": validatePage(rootDir, reading, "quiz-mcq", existingMeta),
  };
  if (reading.language === "en") {
    const segmentResult = checkSegmentAlignment(reading, { strict: true, rootDir });
    for (const pageKey of ["full", "translation"]) {
      if (basePageResults[pageKey].status !== PAGE_STATUS.NOT_APPLICABLE && segmentResult.errors.length) {
        basePageResults[pageKey] = applyArtifactErrorsToPageResult(basePageResults[pageKey], segmentResult.errors.map((error) => `segment alignment: ${error}`));
      }
    }
  }
  const manualReview = sanitizeManualReviewApprovals(rawManualReview, basePageResults);
  const sourcePageResults = Object.fromEntries(
    Object.entries(basePageResults).map(([pageKey, result]) => [
      pageKey,
      applyManualApproval(pageKey, result, manualReview),
    ])
  );
  const pageResults = Object.fromEntries(
    Object.entries(sourcePageResults).map(([pageKey, result]) => [
      pageKey,
      {
        ...result,
        errors: [...result.errors],
        warnings: [...result.warnings],
        metrics: { ...result.metrics },
      },
    ])
  );

  const stage1Extra = [];
  const requireBuiltArtifacts = options.requireBuiltArtifacts === false
    ? false
    : Boolean(
      options.requireBuiltArtifacts
      || shouldRequireTranslationOriginalRevealBuild(reading, existingMeta, pageResults)
    );
  if (requireBuiltArtifacts) {
    const artifactResult = validateBuildArtifacts(rootDir, reading, existingMeta, pageResults);
    Object.entries(artifactResult.pageErrors).forEach(([pageKey, errors]) => {
      if (pageResults[pageKey]) pageResults[pageKey] = applyArtifactErrorsToPageResult(pageResults[pageKey], errors);
      else stage1Extra.push(...errors);
    });
  }
  const landing = pageResults.index;
  const enabledKeys = enabledPageKeys(reading, existingMeta);
  const stage1Required = STAGE1_PAGE_KEYS.filter((key) => enabledKeys.includes(key));
  const stage1 = stageStatusFromPages(pageResults, stage1Required, { extraNotes: stage1Extra });
  const stage2Required = reading.language === "en" ? STAGE2_PAGE_KEYS.filter((key) => enabledKeys.includes(key)) : [];
  const stage2 = stageStatusFromPages(pageResults, stage2Required);
  const stage3 = stageStatusFromPages(pageResults, STAGE3_PAGE_KEYS.filter((key) => enabledKeys.includes(key)));

  let readingStatus = READING_STATUS.PARTIAL;
  const readingNotes = [];
  if (manualReview.blocked_reason) {
    readingStatus = READING_STATUS.BLOCKED;
    readingNotes.push(manualReview.blocked_reason);
  } else if (
    [PAGE_STATUS.MISSING, PAGE_STATUS.SCHEMA_FAIL].includes(landing.status)
    || stage1.status === READING_STATUS.PARTIAL
    || stage2.status === READING_STATUS.PARTIAL
    || stage3.status === READING_STATUS.PARTIAL
  ) {
    readingStatus = READING_STATUS.PARTIAL;
    readingNotes.push(...landing.errors, ...landing.warnings, ...stage1.notes, ...stage2.notes, ...stage3.notes);
  } else if (
    stage1.status === READING_STATUS.APPROVED
    && stage2.status === READING_STATUS.APPROVED
    && stage3.status === READING_STATUS.APPROVED
    && landing.status === PAGE_STATUS.APPROVED
  ) {
    readingStatus = READING_STATUS.APPROVED;
  } else {
    readingStatus = READING_STATUS.MANUAL_REVIEW_REQUIRED;
  }

  const contentStatus = Object.fromEntries(
    Object.entries(pageResults).map(([pageKey, result]) => [statusKeyForPage(pageKey), result.status])
  );
  contentStatus.index = landing.status;

  const dedupedReadingNotes = Array.from(new Set(readingNotes));
  const validationStatus = {
    updated_at: new Date().toISOString(),
    require_built_artifacts: requireBuiltArtifacts,
    landing: {
      status: landing.status,
      errors: landing.errors,
      warnings: landing.warnings,
      metrics: landing.metrics,
    },
    page_results: Object.fromEntries(
      Object.entries(pageResults).map(([pageKey, result]) => [
        statusKeyForPage(pageKey),
        {
          status: result.status,
          errors: result.errors,
          warnings: result.warnings,
          metrics: result.metrics,
        },
      ])
    ),
    source_page_results: Object.fromEntries(
      Object.entries(sourcePageResults).map(([pageKey, result]) => [
        statusKeyForPage(pageKey),
        {
          status: result.status,
          source_hash: result.source_hash,
          errors: result.errors,
          warnings: result.warnings,
          metrics: result.metrics,
        },
      ])
    ),
    stage1,
    stage2,
    stage3,
    reading: {
      status: readingStatus,
      notes: dedupedReadingNotes,
    },
  };

  return {
    manual_review: manualReview,
    content_status: contentStatus,
    validation_status: validationStatus,
    workflow_status: readingStatus,
    workflow_notes: dedupedReadingNotes,
  };
}

function mergeValidationFields(basePayload, snapshot) {
  return {
    ...basePayload,
    manual_review: snapshot.manual_review,
    content_status: snapshot.content_status,
    validation_status: snapshot.validation_status,
    workflow_status: snapshot.workflow_status,
    workflow_notes: snapshot.workflow_notes,
  };
}

function loadManifest(rootDir = ROOT_DIR) {
  return loadJson(path.join(rootDir, "manifest", "readings.json"));
}

function validateManifestReadings(rootDir = ROOT_DIR, slugFilter = null, options = {}) {
  const manifest = loadManifest(rootDir);
  const readings = Array.isArray(manifest?.readings) ? manifest.readings : [];
  if (!readings.length) throw new Error("manifest must contain at least one reading");
  if (new Set(readings.map((reading) => reading.slug)).size !== readings.length) throw new Error("manifest contains duplicate reading slugs");
  if (slugFilter && !readings.some((reading) => reading.slug === slugFilter)) throw new Error(`Unknown slug: ${slugFilter}`);
  return readings
    .filter((reading) => !slugFilter || reading.slug === slugFilter)
    .map((reading) => {
      const metaPath = path.join(rootDir, reading.content_dir, "meta.json");
      const existingMeta = loadJson(metaPath) || {};
      return {
        slug: reading.slug,
        snapshot: buildValidationSnapshot(rootDir, reading, existingMeta, options),
      };
    });
}

function renderCliReport(results) {
  const lines = [];
  results.forEach(({ slug, snapshot }) => {
    lines.push(`- ${slug}: ${snapshot.workflow_status}`);
    lines.push(`  - stage1: ${snapshot.validation_status.stage1.status}`);
    lines.push(`  - stage2: ${snapshot.validation_status.stage2.status}`);
    lines.push(`  - stage3: ${snapshot.validation_status.stage3.status}`);
  });
  return lines.join("\n");
}

function parseArgs(argv) {
  const args = { slug: null, json: false, requireBuiltArtifacts: true, publishGate: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--slug") {
      args.slug = argv[index + 1] || null;
      index += 1;
    } else if (token === "--json") {
      args.json = true;
    } else if (token === "--require-built-artifacts") {
      args.requireBuiltArtifacts = true;
    } else if (token === "--source-only") {
      args.requireBuiltArtifacts = false;
    } else if (token === "--publish-gate") {
      args.publishGate = true;
    }
  }
  return args;
}

module.exports = {
  PAGE_STATUS,
  READING_STATUS,
  buildValidationSnapshot,
  mergeValidationFields,
  validateBuildArtifacts,
  validateManifestReadings,
  sourceHashForPage,
  validateQuizPayload,
  validateProfessorPrepJson,
};

if (require.main === module) {
  const options = parseArgs(process.argv.slice(2));
  const results = validateManifestReadings(ROOT_DIR, options.slug, {
    requireBuiltArtifacts: options.requireBuiltArtifacts,
  });
  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(renderCliReport(results));
  }
  if (options.publishGate && results.some(({ snapshot }) => snapshot.workflow_status !== READING_STATUS.APPROVED)) {
    process.exitCode = 1;
  }
}
