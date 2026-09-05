const assert = require("assert/strict");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { approveReading } = require("./approve_reading");
const { buildValidationSnapshot } = require("./validate_content");
const { collectApprovalRows } = require("./approval_status");

const ROOT = path.resolve(__dirname, "..");
const TMP = path.join(ROOT, "tmp");
fs.mkdirSync(TMP, { recursive: true });
const fixture = fs.mkdtempSync(path.join(TMP, "build-contracts-"));
const readJson = (target) => JSON.parse(fs.readFileSync(target, "utf8").replace(/^\uFEFF/, ""));
const writeJson = (target, value) => fs.writeFileSync(target, JSON.stringify(value, null, 2));
const digest = (target) => crypto.createHash("sha256").update(fs.readFileSync(target)).digest("hex");
let checks = 0;
const verify = (label, callback) => { callback(); checks += 1; console.log(`PASS ${label}`); };
const run = (args) => {
  const result = spawnSync(process.execPath, args, { cwd: fixture, encoding: "utf8" });
  assert.equal(result.status, 0, `${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result;
};

try {
  const sourceManifest = readJson(path.join(ROOT, "manifest", "readings.json"));
  const readings = sourceManifest.readings.slice(0, 2).reverse();
  assert.equal(readings.length, 2, "A manifest-order regression needs two readings");
  fs.cpSync(path.join(ROOT, "scripts"), path.join(fixture, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(fixture, "manifest"), { recursive: true });
  const manifest = { ...sourceManifest, site: { ...sourceManifest.site, publish_cutoff_date: "" }, readings };
  writeJson(path.join(fixture, "manifest", "readings.json"), manifest);
  for (const reading of readings) {
    fs.cpSync(path.join(ROOT, reading.content_dir), path.join(fixture, reading.content_dir), { recursive: true });
    const metaPath = path.join(fixture, reading.content_dir, "meta.json");
    const meta = readJson(metaPath);
    meta.manual_review = { approved_pages: [], approved_page_hashes: {} };
    writeJson(metaPath, meta);
  }
  const first = readings[0];
  const firstContent = path.join(fixture, first.content_dir);
  const comicPath = path.join(firstContent, "overview_comic.json");
  const comic = readJson(comicPath);
  comic.panels[0].caption += " OverviewDraftBoundaryProbe.";
  writeJson(comicPath, comic);
  const prepPath = path.join(firstContent, "professor_prep.json");
  const prep = readJson(prepPath);
  prep.cards[0].answer_30s += " ResponseDraftBoundaryProbe.";
  writeJson(prepPath, prep);

  run(["scripts/build_site.js"]);
  const sitePage = (base, reading, file) => fs.readFileSync(path.join(fixture, base, "readings", reading.slug, file), "utf8");
  const home = fs.readFileSync(path.join(fixture, "docs", "index.html"), "utf8");
  verify("home cards and schedule follow reordered manifest", () => {
    const cards = [...home.matchAll(/\bdata-reading-card\s+data-reading-slug="([^"]+)"/g)].map((match) => match[1]);
    const rail = [...home.matchAll(/\bdata-home-rail-item\s+data-reading-slug="([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(cards, readings.map((reading) => reading.slug));
    assert.deepEqual(rail, readings.map((reading) => reading.slug));
  });
  verify("normal output hides schema-pass overview and discussion drafts", () => {
    const meta = readJson(path.join(firstContent, "meta.json"));
    const source = buildValidationSnapshot(fixture, first, meta, { requireBuiltArtifacts: false });
    assert.equal(source.content_status.index, "schema_pass");
    assert.equal(source.content_status.professor_prep, "schema_pass");
    assert(!sitePage("docs", first, "index.html").includes("OverviewDraftBoundaryProbe"));
    assert(!sitePage("docs", first, "professor-prep.html").includes("ResponseDraftBoundaryProbe"));
    assert(!sitePage("docs", first, "professor-prep.html").includes("data-prep-card"));
  });
  const normalPath = path.join(fixture, "docs", "readings", first.slug, "professor-prep.html");
  const normalDigest = digest(normalPath);
  const metaDigest = digest(path.join(firstContent, "meta.json"));
  run(["scripts/build_site.js", "--preview-locked", "--slug", first.slug, "--output-dir", "tmp/locked-preview"]);
  verify("unlock-only preview does not grant draft approval", () => {
    assert(!sitePage("tmp/locked-preview", first, "index.html").includes("OverviewDraftBoundaryProbe"));
    assert(!sitePage("tmp/locked-preview", first, "professor-prep.html").includes("ResponseDraftBoundaryProbe"));
  });
  run(["scripts/build_site.js", "--preview-locked", "--preview-draft", "--slug", first.slug, "--output-dir", "tmp/draft-preview"]);
  verify("explicit draft preview exposes reviewable source outside docs", () => {
    assert(sitePage("tmp/draft-preview", first, "index.html").includes("OverviewDraftBoundaryProbe"));
    assert(sitePage("tmp/draft-preview", first, "professor-prep.html").includes("ResponseDraftBoundaryProbe"));
    assert.equal(digest(normalPath), normalDigest);
    assert.equal(digest(path.join(firstContent, "meta.json")), metaDigest);
  });
  verify("draft previews cannot overwrite public docs", () => {
    const rejected = spawnSync(process.execPath, ["scripts/build_site.js", "--preview-locked", "--preview-draft", "--output-dir", "docs"], { cwd: fixture, encoding: "utf8" });
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /cannot overwrite docs/);
    assert.equal(digest(normalPath), normalDigest);
  });
  for (const outputDir of ["docs/subdir", "DOCS/SubDir", first.content_dir, "tmp/../docs/preview", "tmp", "../outside-preview"]) {
    verify(`preview rejects non-temporary destination ${outputDir}`, () => {
      const rejected = spawnSync(process.execPath, ["scripts/build_site.js", "--preview-locked", "--preview-draft", "--output-dir", outputDir], { cwd: fixture, encoding: "utf8" });
      assert.notEqual(rejected.status, 0);
      assert.match(rejected.stderr, /inside project tmp|cannot overwrite docs/);
      assert.equal(digest(normalPath), normalDigest);
      assert.equal(digest(path.join(firstContent, "meta.json")), metaDigest);
    });
  }
  const directoryLink = path.join(fixture, "tmp", "preview-link-to-docs");
  fs.symlinkSync(path.join(fixture, "docs"), directoryLink, process.platform === "win32" ? "junction" : "dir");
  verify("preview rejects a temporary-directory link into public docs", () => {
    const rejected = spawnSync(process.execPath, ["scripts/build_site.js", "--preview-locked", "--preview-draft", "--output-dir", "tmp/preview-link-to-docs/subdir"], { cwd: fixture, encoding: "utf8" });
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /inside project tmp/);
    assert.equal(digest(normalPath), normalDigest);
  });
  verify("normal build returns to docs after preview in the same process", () => {
    const { buildSite } = require(path.join(fixture, "scripts", "build_site.js"));
    buildSite({ previewLocked: true, previewDraft: true, slug: first.slug, outputDir: "tmp/reentrant-preview" });
    const previewPath = path.join(fixture, "tmp", "reentrant-preview", "readings", first.slug, "professor-prep.html");
    const previewDigest = digest(previewPath);
    fs.writeFileSync(normalPath, "NORMAL_OUTPUT_MUST_BE_REBUILT");
    buildSite({ slug: first.slug });
    assert(!fs.readFileSync(normalPath, "utf8").includes("NORMAL_OUTPUT_MUST_BE_REBUILT"));
    assert(!fs.readFileSync(normalPath, "utf8").includes("ResponseDraftBoundaryProbe"));
    assert.equal(digest(previewPath), previewDigest);
  });

  // Exercise both language branches even while the content migration is partial.
  const evidenceId = readJson(path.join(firstContent, "source_segments.json")).segments[0].segment_id;
  const quiz = { language: "en", title: "English practice fixture", instructions: "Give one English term.", items: Array.from({ length: 15 }, (_, index) => ({ question: `Which concept explains fixture example ${index + 1}?`, answer_type: "term", accepted_answers: [`Concept${index + 1}`], explanation: "This concept describes the relationship explained in the source.", evidence_segment_id: evidenceId })) };
  writeJson(path.join(firstContent, "quiz_short.json"), quiz);
  const makeCards = (count, prefix) => Array.from({ length: count }, (_, index) => ({ card_id: `${prefix}-${index}`, title: `Explain fixture example ${index + 1}.`, answer_30s: "I read this argument as a claim about aging in a social context, supported by the source passage.", evidence_segment_id: evidenceId }));
  const englishPrep = { language: "en", title: "Discussion practice", instructions: "Try a response in English.", cards: makeCards(15, "cold"), reading_response: { title: "Reading response", instructions: "Use evidence from the paper.", cards: makeCards(5, "reading") } };
  writeJson(prepPath, englishPrep);
  for (const reading of readings) approveReading({ slug: reading.slug, reviewer: "build-contract-fixture", note: "Temporary fixture only.", requireBuiltArtifacts: false }, fixture);
  run(["scripts/build_site.js"]);
  verify("English and legacy interaction contracts pass on fresh fixture output", () => run(["scripts/check_interactions.js"]));
  verify("quiz player preserves English answers, evidence and resume controls", () => run(["scripts/check_quiz_player.js"]));
  verify("fresh explicit approvals pass all generated artifact gates", () => run(["scripts/validate_content.js", "--publish-gate"]));
  verify("approval report follows the same manifest order as the home page", () => assert.deepEqual(collectApprovalRows(fixture).map((row) => row.slug), readings.map((reading) => reading.slug)));
  console.log(`PASS build contracts (${checks} regression checks)`);
} finally {
  const relative = path.relative(TMP, path.resolve(fixture));
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Refusing to remove a fixture outside project tmp");
  fs.rmSync(fixture, { recursive: true, force: true });
}
