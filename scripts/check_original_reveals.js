const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const ROOT_DIR = path.resolve(__dirname, "..");
const readText = (file) => fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
const readJson = (file) => JSON.parse(readText(file));
const normalize = (text) => String(text ?? "").replace(/\s+/g, " ").trim();

// Text expectations come from the reviewed mapping, independently of the HTML
// renderer. These are the three inline Markdown constructs supported by the site.
function visibleInlineText(text) {
  return normalize(String(text ?? "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1"));
}

function stripTranslationControls(body) {
  const clean = body.cloneNode(true);
  clean.querySelectorAll("[data-source-popover]").forEach((node) => node.remove());
  clean.querySelectorAll("button[data-source-sentence]").forEach((node) => node.replaceWith(...node.childNodes));
  clean.querySelectorAll("span[data-sentence-pair]").forEach((node) => node.replaceWith(...node.childNodes));
  clean.normalize();
  return clean;
}

function canonicalNodes(node) {
  return Array.from(node.childNodes).flatMap((child) => {
    if (child.nodeType === 3) return normalize(child.textContent) ? [["text", normalize(child.textContent)]] : [];
    if (child.nodeType !== 1) return [["other", child.nodeType, child.textContent]];
    const attributes = Array.from(child.attributes, (attribute) => [attribute.name, attribute.value])
      .sort(([left], [right]) => left.localeCompare(right));
    return [[child.localName, attributes, canonicalNodes(child)]];
  });
}

function validateRenderedOriginal(html, baselineHtml, units) {
  const dom = new JSDOM(html);
  const baseline = new JSDOM(`<section data-baseline>${baselineHtml}</section>`);
  const errors = [];
  const expect = (condition, message) => { if (!condition) errors.push(message); };
  try {
    const document = dom.window.document;
    const bodies = document.querySelectorAll("[data-reading-article-body]");
    expect(bodies.length === 1, `expected one reading article body, found ${bodies.length}`);
    if (bodies.length !== 1) return { errors, pairCount: 0 };
    const body = bodies[0];
    const expectedPairs = units.flatMap((unit) => unit.pairs || []);
    const expectedById = new Map();
    for (const pair of expectedPairs) {
      expect(Boolean(pair.id), "expected mapping contains a pair without an ID");
      expect(!expectedById.has(pair.id), `${pair.id}: duplicate expected pair ID`);
      expect(pair.status === "verified", `${pair.id}: expected pair is not verified`);
      expect(Boolean(normalize(pair.source_text)), `${pair.id}: expected English source is empty`);
      expect(Boolean(normalize(pair.ko_text)), `${pair.id}: expected Korean translation is empty`);
      expectedById.set(pair.id, pair);
    }
    expect(expectedPairs.length > 0, "expected mapping has no source-to-Korean pairs");

    const idCounts = new Map();
    document.querySelectorAll("[id]").forEach((element) => {
      const id = element.id;
      idCounts.set(id, (idCounts.get(id) || 0) + 1);
    });
    for (const [id, count] of idCounts) expect(count === 1, `${id}: duplicate DOM ID (${count} occurrences)`);

    const controls = Array.from(body.querySelectorAll("[data-source-sentence]"));
    expect(controls.length === expectedPairs.length,
      `original control count mismatch: expected ${expectedPairs.length}, found ${controls.length}`);
    expect(body.querySelectorAll("[data-source-popover]").length === expectedPairs.length,
      "Korean popover count does not match the expected pair count");
    const seenPairs = new Set();
    controls.forEach((control, index) => {
      const id = control.getAttribute("data-pair-id");
      const pair = expectedById.get(id);
      expect(control.localName === "button" && control.getAttribute("type") === "button",
        `${id}: English control must be a native button with type=button`);
      expect(!seenPairs.has(id), `${id}: duplicate rendered pair ID`);
      seenPairs.add(id);
      expect(Boolean(pair), `${id}: unexpected rendered pair`);
      expect(expectedPairs[index]?.id === id, `${id}: source-to-Korean control order differs from the reviewed source order`);
      if (!pair) return;
      expect(normalize(control.getAttribute("data-source-text")) === normalize(pair.source_text),
        `${id}: English source attribute mismatch`);
      expect(normalize(control.getAttribute("data-translation-text")) === normalize(pair.ko_text),
        `${id}: Korean translation attribute mismatch`);
      expect(normalize(control.textContent) === visibleInlineText(pair.source_text),
        `${id}: visible English source mismatch`);
      expect(control.getAttribute("aria-expanded") === "false", `${id}: English control must begin collapsed`);
      expect(control.parentElement?.matches("span[data-sentence-pair]"), `${id}: paired inline wrapper is missing`);

      const targetId = control.getAttribute("aria-controls");
      expect(targetId === `${id}-translation`, `${id}: aria-controls must identify its Korean translation`);
      const target = document.getElementById(targetId || "");
      expect(Boolean(target?.matches("[data-source-popover]")), `${id}: Korean popover is missing`);
      if (!target) return;
      expect(target.parentElement === control.parentElement && control.nextElementSibling === target,
        `${id}: Korean translation must immediately follow its English control in the same wrapper`);
      expect(target.getAttribute("lang") === "ko", `${id}: Korean translation language must be ko`);
      expect(target.getAttribute("aria-label") === "한국어 번역", `${id}: Korean translation accessible label mismatch`);
      expect(target.getAttribute("role") === "region", `${id}: Korean translation region role is missing`);
      expect(target.hasAttribute("hidden"), `${id}: Korean translation must begin hidden`);
      expect(normalize(target.textContent) === visibleInlineText(pair.ko_text), `${id}: visible Korean translation mismatch`);
    });
    for (const id of expectedById.keys()) expect(seenPairs.has(id), `${id}: expected original control is missing`);

    expect(body.querySelectorAll(".translation-sentence-hint, [data-original-translation-hint]").length === 0,
      "original page must not include retired sentence instructions");
    const stripped = stripTranslationControls(body);
    const expectedBody = baseline.window.document.querySelector("[data-baseline]");
    expectedBody.normalize();
    expect(normalize(stripped.textContent) === normalize(expectedBody.textContent),
      "original article text differs from the baseline after translation controls are removed");
    expect(JSON.stringify(canonicalNodes(stripped)) === JSON.stringify(canonicalNodes(expectedBody)),
      "original article DOM differs from the baseline: headings, lists, numbering, figures, or inline markup changed");
    return { errors, pairCount: expectedPairs.length };
  } finally {
    dom.window.close();
    baseline.window.close();
  }
}

function checkSlug(slug, options = {}) {
  const manifest = readJson(path.join(ROOT_DIR, "manifest", "readings.json"));
  const reading = manifest.readings.find((item) => item.slug === slug);
  if (!reading) throw new Error(`Unknown slug: ${slug}`);
  const contentDir = path.join(ROOT_DIR, reading.content_dir);
  const sourcePath = path.join(contentDir, "full.md");
  const fullText = readText(sourcePath);
  const translationText = readText(path.join(contentDir, "translation.md"));
  const alignment = readJson(path.join(contentDir, "translation_alignment.json"));
  const supplementPath = path.join(contentDir, "original_translation_alignment.json");
  const supplement = fs.existsSync(supplementPath) ? readJson(supplementPath) : null;
  const siteDir = options.siteDir || path.join(ROOT_DIR, "docs");
  const outputPath = path.join(siteDir, "readings", slug, "full.html");
  const html = readText(outputPath);
  const { collectOriginalTranslationRenderUnits } = require("./original_translation_reveal");
  const { markdownToHtml } = require("./build_site");
  const units = collectOriginalTranslationRenderUnits({ fullText, translationText, alignment, supplement });
  // The imported renderer resolves assets against its default docs root. A
  // preview keeps the same site-relative layout, so render the baseline from
  // the canonical docs page path rather than mixing that root with a preview.
  const baselineOutputPath = path.join(ROOT_DIR, "docs", "readings", slug, "full.html");
  const baselineHtml = markdownToHtml(fullText, {
    skipFirstTitleHeading: true, collectFrontmatter: true, reading, sourcePath, outputPath: baselineOutputPath,
  });
  const result = validateRenderedOriginal(html, baselineHtml, units);
  if (result.errors.length) throw new Error(`${slug}\n  ${result.errors.join("\n  ")}`);
  if (!options.quiet) console.log(`PASS ${slug} (${result.pairCount} English-to-Korean controls; complete original DOM preserved)`);
  return result;
}

function checkMutationFixtures() {
  const pairs = [
    { id: "fixture-first", status: "verified", source_text: "A **bold** finding.", ko_text: "중요한 발견이다." },
    { id: "fixture-second", status: "verified", source_text: "A second result.", ko_text: "두 번째 결과다." },
  ];
  const units = [{ pairs }];
  const baseline = '<h2 id="results">Results</h2><ol start="3"><li>A <strong>bold</strong> finding.</li><li>A second result.</li></ol><figure><img src="figure.png" alt="Original figure"></figure>';
  // Deliberately literal HTML; fixtures must not inherit a renderer defect.
  const html = '<section data-reading-article-body><h2 id="results">Results</h2><ol start="3"><li><span data-sentence-pair><button type="button" aria-expanded="false" aria-controls="fixture-first-translation" data-source-sentence data-pair-id="fixture-first" data-source-text="A **bold** finding." data-translation-text="중요한 발견이다.">A <strong>bold</strong> finding.</button><span data-source-popover id="fixture-first-translation" role="region" aria-label="한국어 번역" lang="ko" hidden>중요한 발견이다.</span></span></li><li><span data-sentence-pair><button type="button" aria-expanded="false" aria-controls="fixture-second-translation" data-source-sentence data-pair-id="fixture-second" data-source-text="A second result." data-translation-text="두 번째 결과다.">A second result.</button><span data-source-popover id="fixture-second-translation" role="region" aria-label="한국어 번역" lang="ko" hidden>두 번째 결과다.</span></span></li></ol><figure><img src="figure.png" alt="Original figure"></figure></section>';
  assert.deepEqual(validateRenderedOriginal(html, baseline, units).errors, []);
  const mutations = [
    ["wrong Korean text", (body) => { body.querySelector("[data-source-popover]").textContent = "잘못된 번역이다."; }, /visible Korean translation mismatch/],
    ["duplicate pair ID", (body) => { body.querySelectorAll("button")[1].dataset.pairId = "fixture-first"; }, /duplicate rendered pair ID/],
    ["duplicate DOM ID", (body) => { body.querySelectorAll("[data-source-popover]")[1].id = "fixture-first-translation"; }, /duplicate DOM ID/],
    ["missing control", (body) => { const wrapper = body.querySelector("[data-sentence-pair]"); wrapper.replaceWith(...wrapper.querySelector("button").childNodes); }, /expected original control is missing/],
    ["wrong English text", (body) => { body.querySelector("button").textContent = "Changed source."; }, /visible English source mismatch/],
    ["changed list numbering", (body) => { body.querySelector("ol").setAttribute("start", "1"); }, /original article DOM differs/],
    ["missing original figure", (body) => { body.querySelector("figure").remove(); }, /original article DOM differs/],
  ];
  for (const [label, mutate, message] of mutations) {
    const dom = new JSDOM(html);
    mutate(dom.window.document.querySelector("section"));
    const result = validateRenderedOriginal(dom.serialize(), baseline, units);
    dom.window.close();
    assert(result.errors.some((error) => message.test(error)), `${label}: mutation must be rejected for its actual defect`);
  }
  console.log(`PASS original reveal checker (${mutations.length} mutation fixtures)`);
}

function parseArgs(argv) {
  const options = { slugs: [], siteDir: path.join(ROOT_DIR, "docs"), selfTest: false };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--slug" && argv[index + 1]) options.slugs.push(argv[++index]);
    else if (argv[index] === "--site-dir" && argv[index + 1]) options.siteDir = path.resolve(ROOT_DIR, argv[++index]);
    else if (argv[index] === "--self-test") options.selfTest = true;
    else throw new Error(`Unknown or incomplete argument: ${argv[index]}`);
  }
  return options;
}

if (require.main === module) {
  const options = parseArgs(process.argv.slice(2));
  checkMutationFixtures();
  if (!options.selfTest) {
    if (!options.slugs.length) {
      options.slugs.push(...readJson(path.join(ROOT_DIR, "manifest", "readings.json")).readings
        .filter((reading) => reading.language === "en").map((reading) => reading.slug));
    }
    options.slugs.forEach((slug) => checkSlug(slug, options));
  }
}

module.exports = { checkSlug, checkMutationFixtures, validateRenderedOriginal };
