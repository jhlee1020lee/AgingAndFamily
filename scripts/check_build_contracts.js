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
  const assetUrls = () => {
    const html = fs.readFileSync(path.join(fixture, "docs", "index.html"), "utf8");
    return Object.fromEntries(["styles.css", "app.js"].map((filename) => {
      const url = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((match) => match[1]).find((value) => value.startsWith(`assets/${filename}?v=`));
      assert(url, `Missing versioned ${filename} URL`);
      return [filename, url];
    }));
  };
  const initialAssetUrls = assetUrls();
  verify("asset versions match the first 12 SHA256 digits of written bytes", () => {
    for (const filename of ["styles.css", "app.js"]) assert.equal(initialAssetUrls[filename], `assets/${filename}?v=${digest(path.join(fixture, "docs", "assets", filename)).slice(0, 12)}`);
    const nested = sitePage("docs", first, "professor-prep.html");
    for (const url of Object.values(initialAssetUrls)) assert(nested.includes(`../../${url}`));
  });
  run(["scripts/build_site.js", "--home-only"]);
  verify("unchanged builds retain stable asset URLs", () => assert.deepEqual(assetUrls(), initialAssetUrls));
  const assetSources = { "styles.css": "site_styles.css", "app.js": "site_app.js" };
  const originalAssets = Object.fromEntries(Object.entries(assetSources).map(([filename, source]) => [filename, fs.readFileSync(path.join(fixture, "scripts", source))]));
  try {
    for (const [filename, source] of Object.entries(assetSources)) fs.writeFileSync(path.join(fixture, "scripts", source), originalAssets[filename].toString("utf8").replace(/\r\n?/g, "\n").replace(/\n/g, "\r\n"));
    run(["scripts/build_site.js", "--home-only"]);
    verify("CRLF sources produce identical asset bytes and versions", () => {
      assert.deepEqual(assetUrls(), initialAssetUrls);
      for (const filename of Object.keys(assetSources)) {
        const target = path.join(fixture, "docs", "assets", filename);
        assert(!fs.readFileSync(target, "utf8").includes("\r"));
        assert.equal(`assets/${filename}?v=${digest(target).slice(0, 12)}`, initialAssetUrls[filename]);
      }
    });
    for (const [filename, source] of Object.entries(assetSources)) {
      for (const [other, otherSource] of Object.entries(assetSources)) fs.writeFileSync(path.join(fixture, "scripts", otherSource), originalAssets[other]);
      fs.appendFileSync(path.join(fixture, "scripts", source), "\n/* Asset version regression probe. */\n");
      run(["scripts/build_site.js", "--home-only"]);
      verify(`changing ${filename} updates only its content-based URL`, () => {
        const changed = assetUrls();
        assert.notEqual(changed[filename], initialAssetUrls[filename]);
        assert.equal(changed[filename], `assets/${filename}?v=${digest(path.join(fixture, "docs", "assets", filename)).slice(0, 12)}`);
        for (const other of Object.keys(assetSources).filter((value) => value !== filename)) assert.equal(changed[other], initialAssetUrls[other]);
      });
    }
  } finally {
    for (const [filename, source] of Object.entries(assetSources)) fs.writeFileSync(path.join(fixture, "scripts", source), originalAssets[filename]);
  }
  run(["scripts/build_site.js", "--home-only"]);
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
  verify("site link validation resolves versioned asset query strings", () => run(["scripts/check_site_links.js", "--site-dir", "docs"]));
  verify("approval report follows the same manifest order as the home page", () => assert.deepEqual(collectApprovalRows(fixture).map((row) => row.slug), readings.map((reading) => reading.slug)));
  verify("static home highlights both readings on the next class date before JavaScript runs", () => {
    const today = `${readings[0].class_date}T12:00:00+09:00`;
    run(["-e", `const NativeDate=Date; global.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[${JSON.stringify(today)}]));}}; require('./scripts/build_site').buildSite({homeOnly:true});`]);
    const html = fs.readFileSync(path.join(fixture, "docs", "index.html"), "utf8");
    const currentCards = [...html.matchAll(/\bdata-reading-card\s+data-reading-slug="([^"]+)"[^>]*data-card-state="current"/g)].map((match) => match[1]);
    assert.deepEqual(currentCards, readings.map((reading) => reading.slug));
    assert.equal((html.match(/class="rcard-mobile-state current"/g) || []).length, 2);
    assert.equal((html.match(/aria-current="date"/g) || []).length, 2);
    assert.match(html, /읽기 2편<\/span>/);
  });
  const {weeklyReviewDigest}=require("./weekly_connections");
  const weekly=readJson(path.join(ROOT,"content","weeks","week-02.json"));
  const weeklyDir=path.join(fixture,"content","weeks");
  fs.mkdirSync(weeklyDir,{recursive:true});
  writeJson(path.join(weeklyDir,"week-02.json"),weekly);
  const weeklyReview={status:"approved",sha256:weeklyReviewDigest(fixture,manifest,weekly),reviewer:"build-contract-fixture",reviewed_at:new Date().toISOString(),scope:"Temporary two-source publication fixture."};
  const reviewPath=path.join(weeklyDir,"week-02.review.json");
  const assertWeeklyTabs=(present)=>{
    for(const reading of readings){
      const html=sitePage("docs",reading,"professor-prep.html");
      assert.equal(html.includes('data-prep-tab="weekly"'),present,`${reading.slug}: weekly tab gate`);
      assert.equal(html.includes('data-weekly-card'),present,`${reading.slug}: embedded weekly answer gate`);
    }
    assert.equal(fs.existsSync(path.join(fixture,"docs","weeks","week-02","index.html")),present);
  };
  writeJson(reviewPath,weeklyReview);
  run(["scripts/build_site.js","--home-only"]);
  verify("home-only builds add a reviewed third tab to both existing preparation pages",()=>assertWeeklyTabs(true));
  writeJson(reviewPath,{...weeklyReview,status:"pending"});
  run(["scripts/build_site.js","--home-only"]);
  verify("withdrawing a weekly review removes both tabs and the standalone page",()=>assertWeeklyTabs(false));
  writeJson(reviewPath,weeklyReview);
  run(["scripts/build_site.js","--slug",first.slug]);
  verify("a single-reading build restores its partner's reviewed weekly tab as well",()=>assertWeeklyTabs(true));
  const partnerMetaPath=path.join(fixture,readings[1].content_dir,"meta.json");
  const partnerMeta=readJson(partnerMetaPath);
  partnerMeta.manual_review={approved_pages:[],approved_page_hashes:{}};
  writeJson(partnerMetaPath,partnerMeta);
  run(["scripts/build_site.js","--home-only"]);
  verify("withdrawing either source approval removes both embedded copies on a partial build",()=>assertWeeklyTabs(false));
  console.log(`PASS build contracts (${checks} regression checks)`);
} finally {
  const relative = path.relative(TMP, path.resolve(fixture));
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Refusing to remove a fixture outside project tmp");
  fs.rmSync(fixture, { recursive: true, force: true });
}

require("./check_weekly_connections").run().catch((error)=>{console.error(error);process.exitCode=1;});
