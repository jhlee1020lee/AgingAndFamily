"use strict";

// Read-only rollout audit. Source approval and strict alignment remain separate gates.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const { validateProfessorPrepJson, validateReflectionPrepArtifacts } = require("./validate_content");

const ROOT = path.resolve(__dirname, "..");
const FORMAT = "reflection-followups-v1";
const DEFAULT_BASELINE = "tmp/reflection-rollout-baseline.json";
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const slash = (value) => value.split(path.sep).join("/");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function readText(file) {
  return new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(file)).replace(/^\uFEFF/, "");
}

function readJson(file) {
  return JSON.parse(readText(file));
}

function projectPath(relative) {
  assert(typeof relative === "string" && relative.length > 0, "missing project-relative path");
  const absolute = path.resolve(ROOT, relative);
  const remainder = path.relative(ROOT, absolute);
  assert(remainder && remainder !== ".." && !remainder.startsWith(`..${path.sep}`) && !path.isAbsolute(remainder), `path leaves the project: ${relative}`);
  return absolute;
}

function parseArgs(argv) {
  const options = { slug: null, allowPending: false, baseline: DEFAULT_BASELINE, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--allow-pending") options.allowPending = true;
    else if (flag === "--help" || flag === "-h") options.help = true;
    else if (flag === "--slug" || flag === "--baseline") {
      const value = argv[++index];
      assert(value && !value.startsWith("--"), `${flag} needs a value`);
      options[flag === "--slug" ? "slug" : "baseline"] = value;
    } else throw new Error(`Unknown option: ${flag}`);
  }
  return options;
}

function pdfsUnder(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return pdfsUnder(file);
    return /\.pdf$/i.test(entry.name) ? [slash(path.relative(ROOT, file))] : [];
  });
}

function checkBaseline(readings, baselinePath) {
  const errors = [], notices = [];
  const baseline = readJson(path.resolve(ROOT, baselinePath));
  assert(record(baseline.protectedFiles) && Object.keys(baseline.protectedFiles).length, "baseline needs protectedFiles hashes");
  assert(record(baseline.legacyCards), "baseline needs legacyCards hashes");
  assert(record(baseline.originalPdfState), "baseline needs originalPdfState (SHA-256 or null for each original PDF)");
  const protectedFiles = Object.entries(baseline.protectedFiles);
  const manifestSlugs = new Set(readings.map((reading) => reading.slug));
  const checkHash = (file, expected, label, jsonCards = false) => {
    try {
      assert(/^[a-f0-9]{64}$/.test(expected), "invalid SHA-256 in baseline");
      const value = jsonCards ? JSON.stringify(readJson(file).cards) : fs.readFileSync(file);
      assert(value !== undefined, "missing legacy cards array");
      if (sha256(value) !== expected) errors.push(`${label}: baseline hash changed`);
    } catch (error) {
      errors.push(`${label}: ${error.message}`);
    }
  };
  for (const [relative, expected] of protectedFiles) {
    try { checkHash(projectPath(relative), expected, relative); }
    catch (error) { errors.push(error.message); }
  }
  for (const slug of Object.keys(baseline.legacyCards)) {
    if (!manifestSlugs.has(slug)) errors.push(`baseline legacyCards has a slug absent from manifest: ${slug}`);
  }
  if (!Object.hasOwn(baseline.protectedFiles, "manifest/readings.json")) errors.push("baseline does not protect manifest/readings.json");
  let pdfsAbsentAtBaseline = 0, pdfsHashed = 0;
  for (const reading of readings) {
    const contentDir = projectPath(reading.content_dir);
    for (const filename of ["source_segments.json", "full.md"]) {
      const relative = slash(path.relative(ROOT, path.join(contentDir, filename)));
      if (!Object.hasOwn(baseline.protectedFiles, relative)) errors.push(`baseline does not protect ${relative}`);
    }
    if (!Object.hasOwn(baseline.legacyCards, reading.slug)) errors.push(`baseline has no legacyCards hash for ${reading.slug}`);
    else checkHash(path.join(contentDir, "professor_prep.json"), baseline.legacyCards[reading.slug], `${reading.slug} legacy cards`, true);
    if (!reading.source_pdf) continue;
    const pdfPath = projectPath(reading.source_pdf);
    const relative = slash(path.relative(ROOT, pdfPath));
    if (!Object.hasOwn(baseline.originalPdfState, relative)) {
      errors.push(`baseline has no originalPdfState for ${relative}`);
    } else if (baseline.originalPdfState[relative] === null) {
      pdfsAbsentAtBaseline += 1;
      if (fs.existsSync(pdfPath)) notices.push(`${relative}: now present; absent at baseline, so there is no original hash to compare`);
    } else {
      pdfsHashed += 1;
      checkHash(pdfPath, baseline.originalPdfState[relative], relative);
    }
  }
  for (const file of pdfsUnder(path.join(ROOT, "docs"))) errors.push(`PDF must not be copied into docs: ${file}`);
  return { errors, notices, protectedCount: protectedFiles.length, legacyCount: Object.keys(baseline.legacyCards).length, pdfsAbsentAtBaseline, pdfsHashed };
}

function checkBuiltLayout(reading, payload, html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const errors = [];
  const expect = (condition, message) => { if (!condition) errors.push(message); };
  try {
    expect(document.body.dataset.pageKind === "prep" && document.body.dataset.prepLayout === "reflection", "built body must use data-page-kind=prep and data-prep-layout=reflection");
    expect(document.body.dataset.readingSlug === reading.slug, "built body reading slug differs from manifest");
    expect(document.documentElement.lang === "ko", "built document must default to Korean");
    const roots = [...document.querySelectorAll("[data-prep-root]")];
    const root = roots[0];
    expect(roots.length === 1 && root?.dataset.prepFormat === FORMAT && root?.lang === "ko", "built page needs one Korean reflection workspace");
    const tabs = [...(root?.querySelectorAll("[data-prep-tab]") || [])];
    const panels = [...(root?.querySelectorAll("[data-prep-panel]") || [])];
    expect(tabs.map((tab) => tab.dataset.prepTab).join("|") === "reading-response|weekly", "built page must contain exactly the reading-response and weekly tabs");
    expect(panels.length === 2 && ["reading-response", "weekly"].every((key) => panels.filter((panel) => panel.dataset.prepPanel === key).length === 1), "built page must contain exactly two matching panels");
    const weeklyRoots = [...(root?.querySelectorAll("[data-weekly-root]") || [])];
    expect(weeklyRoots.length === 1 && weeklyRoots[0].closest('[data-prep-panel="weekly"]'), "weekly content must be present inside its tab panel");
    if (reading.week !== undefined) expect(weeklyRoots[0]?.dataset.weeklyId === `week-${String(reading.week).padStart(2, "0")}`, "weekly content belongs to a different manifest week");
    const ids = [...document.querySelectorAll("[id]")].map((node) => node.id);
    expect(new Set(ids).size === ids.length, "built page contains duplicate IDs");
    const cards = [...(root?.querySelectorAll("article.prep-reflection-card") || [])];
    const sourceCards = payload.reading_response.cards;
    expect(cards.length >= 6 && cards.length === sourceCards.length, "built page needs at least six first-answer cards matching the source");
    expect(Number(tabs[0]?.querySelector(".prep-tab-count")?.textContent) === sourceCards.length, "first tab count differs from reflection cards");
    const weeklyCount = weeklyRoots[0]?.querySelectorAll("[data-weekly-card]").length || 0;
    expect(weeklyCount > 0 && Number(tabs[1]?.querySelector(".prep-tab-count")?.textContent) === weeklyCount, "weekly tab count differs from its cards");
    for (const card of cards) {
      const first = card.querySelector("section.prep-reflection-first-answer[data-prep-answer]");
      expect(first && !first.closest("details, [hidden]"), `${card.id}: first answer must be visible outside disclosures`);
      const group = card.querySelector("details.prep-followups");
      const followups = [...(group?.querySelectorAll("details.prep-followup") || [])];
      expect(group?.open && followups.length >= 3 && followups.every((followup) => !followup.open), `${card.id}: followup list must be open with at least three closed answers`);
      expect([...card.querySelectorAll("details.quiz-evidence-detail")].every((detail) => !detail.open), `${card.id}: source evidence must start collapsed`);
      if (card.dataset.entryType === "experience") {
        const button = card.querySelector("button[data-prep-experience-next]");
        expect(button && button.type === "button" && !button.disabled, `${card.id}: experience switch is missing or disabled`);
      }
    }
  } finally {
    dom.window.close();
  }
  return errors;
}

function checkReading(reading) {
  const errors = [];
  let payload;
  try {
    const contentDir = projectPath(reading.content_dir);
    payload = readJson(path.join(contentDir, "professor_prep.json"));
    assert(record(payload), "professor_prep.json must contain an object");
    if (!payload.practice_format) return { slug: reading.slug, status: "PENDING", errors: [], reason: "legacy format" };
    assert(payload.practice_format === FORMAT, `unknown practice_format: ${payload.practice_format}`);
    const source = readJson(path.join(contentDir, "source_segments.json"));
    assert(Array.isArray(source.segments) && source.segments.length, "source_segments.json needs segments");
    const schema = validateProfessorPrepJson(payload, new Set(source.segments.map((segment) => segment.segment_id)));
    errors.push(...schema.errors.map((message) => `source: ${message}`));
    const cards = payload.reading_response?.cards;
    assert(Array.isArray(cards), "reading_response.cards must be an array");
    const experiences = cards.filter((card) => card?.entry_type === "experience");
    if (cards.length < 6) errors.push("source: at least six first answers are required");
    if (experiences.length < 3) errors.push("source: at least three experience cards are required");
    const html = readText(path.join(ROOT, "docs", "readings", reading.slug, "professor-prep.html"));
    errors.push(...validateReflectionPrepArtifacts(payload, html));
    errors.push(...checkBuiltLayout(reading, payload, html));
    return {
      slug: reading.slug,
      status: errors.length ? "FAIL" : "PASS",
      errors: [...new Set(errors)],
      cards: cards.length,
      readingCards: cards.filter((card) => card?.entry_type === "reading").length,
      experienceCards: experiences.length,
      examples: experiences.reduce((sum, card) => sum + (card.experience_examples?.length || 0), 0),
      followups: cards.reduce((sum, card) => sum + (card?.followups?.length || 0), 0),
    };
  } catch (error) {
    errors.push(error.message);
    return { slug: reading.slug, status: "FAIL", errors: [...new Set(errors)] };
  }
}

function main(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log("Usage: node scripts/check_reflection_rollout.js [--slug SLUG] [--allow-pending] [--baseline PATH]\n\nDefault: every manifest reading must pass source and built reflection checks.\n--allow-pending: report legacy readings without failing solely for their pending state.\nAlready opted-in readings remain strict; stale/missing HTML fails.\nProtection checks cover the whole manifest even with --slug.\nDefault baseline: " + DEFAULT_BASELINE + "\nThis command never builds, approves, or writes files. Run validate_content.js --publish-gate and check_alignment.js --strict separately.");
    return 0;
  }
  const manifest = readJson(path.join(ROOT, "manifest", "readings.json"));
  const readings = manifest.readings;
  assert(Array.isArray(readings) && readings.length, "manifest needs readings");
  assert(readings.every((reading) => typeof reading.slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(reading.slug)), "manifest contains invalid slugs");
  assert(new Set(readings.map((reading) => reading.slug)).size === readings.length, "manifest contains duplicate slugs");
  assert(!options.slug || readings.some((reading) => reading.slug === options.slug), `Unknown slug: ${options.slug}`);
  let protection;
  try { protection = checkBaseline(readings, options.baseline); }
  catch (error) { protection = { errors: [error.message], notices: [] }; }
  const selected = readings.filter((reading) => !options.slug || reading.slug === options.slug);
  const results = selected.map(checkReading);
  for (const result of results) {
    const detail = result.status === "PENDING" ? result.reason : result.cards === undefined ? "audit could not finish" : `${result.cards} first answers; ${result.readingCards} reading + ${result.experienceCards} experience; ${result.examples} examples; ${result.followups} followups`;
    console.log(`[${result.status}] ${result.slug}: ${detail}`);
    for (const error of result.errors) console.log(`  - ${error}`);
  }
  console.log(`[${protection.errors.length ? "FAIL" : "PASS"}] baseline: ${protection.protectedCount ?? "?"} protected files; ${protection.legacyCount ?? "?"} legacy card arrays`);
  if (protection.pdfsAbsentAtBaseline !== undefined) console.log(`[INFO] original PDFs: ${protection.pdfsHashed} hash-protected; ${protection.pdfsAbsentAtBaseline} absent at baseline (not a failure); docs PDFs checked`);
  for (const error of protection.errors) console.log(`  - ${error}`);
  for (const notice of protection.notices) console.log(`[INFO] ${notice}`);
  const count = (status) => results.filter((result) => result.status === status).length;
  console.log(`[rollout] ${count("PASS")} PASS / ${count("PENDING")} PENDING / ${count("FAIL")} FAIL; ${selected.length} selected of ${readings.length} manifest readings`);
  console.log("[scope] Source/built rollout and baseline audit only; approval and strict alignment use their separate validation commands.");
  return protection.errors.length || count("FAIL") || (!options.allowPending && count("PENDING")) ? 1 : 0;
}

if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) { console.error(`[rollout] ${error.message}`); process.exitCode = 1; }
}

module.exports = { main };
