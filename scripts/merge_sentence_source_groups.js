const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { parseMarkdownDocument, resolveTranslationAlignment } = require("./translation_original_reveal");
const { mergeAdjacentSourcePairs, normalizeSentenceText, validateSentencePairs } = require("./sentence_alignment");

const ROOT = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
const digest = (text) => crypto.createHash("sha256").update(text).digest("hex");

function mergeSlug(slug, { write = false } = {}) {
  const manifest = JSON.parse(read(path.join(ROOT, "manifest", "readings.json")));
  const reading = manifest.readings.find((item) => item.slug === slug);
  assert(reading, `Unknown reading: ${slug}`);
  const content = path.join(ROOT, reading.content_dir);
  const alignmentPath = path.join(content, "translation_alignment.json");
  const before = read(alignmentPath);
  const alignment = JSON.parse(before);
  const parse = (name) => parseMarkdownDocument(read(path.join(content, name)), {
    skipFirstTitleHeading: true, collectFrontmatter: true,
  });
  const resolved = resolveTranslationAlignment(alignment, parse("translation.md"), parse("full.md"), { allowedStatuses: ["verified"] });
  assert.deepEqual(resolved.errors, []);
  const rawById = new Map(alignment.entries.map((entry) => [entry.id, entry]));
  const merges = [];
  let beforeCount = 0;
  let afterCount = 0;
  for (const entry of resolved.entries) {
    const raw = rawById.get(entry.id);
    const previous = raw.sentence_pairs;
    assert(previous.every((pair) => pair.status === "verified"), `${entry.id}: review unverified pairs before merging`);
    const pairs = mergeAdjacentSourcePairs(previous, { sourceText: entry.sourceText });
    assert.equal(normalizeSentenceText(pairs.map((pair) => pair.ko_text).join(" ")),
      normalizeSentenceText(previous.map((pair) => pair.ko_text).join(" ")), `${entry.id}: Korean text changed`);
    assert.equal(normalizeSentenceText(pairs.map((pair) => pair.source_text).join(" ")),
      normalizeSentenceText(entry.sourceText), `${entry.id}: source text or order changed`);
    assert.deepEqual(validateSentencePairs({ id: entry.id, translationText: entry.translationBlock.text || entry.translationBlock.plainText,
      sourceText: entry.sourceText, pairs }), []);
    beforeCount += previous.length;
    afterCount += pairs.length;
    for (let index = 0; index < pairs.length; index += 1) {
      const start = previous.findIndex((pair) => pair.id === pairs[index].id);
      const end = index + 1 < pairs.length ? previous.findIndex((pair) => pair.id === pairs[index + 1].id) : previous.length;
      if (end - start > 1) merges.push({ block: entry.id, retained_id: pairs[index].id,
        merged_ids: previous.slice(start, end).map((pair) => pair.id), ko_text: pairs[index].ko_text, source_text: pairs[index].source_text });
    }
    raw.sentence_pairs = pairs;
  }
  const result = { slug, blocks: resolved.entries.length, before: beforeCount, after: afterCount,
    merged_groups: merges.length, removed_duplicate_controls: beforeCount - afterCount, merges };
  if (write && merges.length) {
    const after = `${JSON.stringify(alignment, null, 2)}\n`;
    const report = [
      `# ${slug}: shared-source click group review`, "",
      "Scope: stage 2 translation click boundaries only. Reviewed by Codex against the stored Korean and English blocks.",
      "Adjacent verified pairs that repeat the same source are one click group. The first pair ID is retained.",
      "Korean text and order are unchanged; English source coverage matches each complete source block exactly once.",
      "No original/translation markdown, segment IDs, figures, tables, references, or quiz evidence were changed.", "",
      `- Blocks checked: ${resolved.entries.length}`,
      `- Click controls: ${beforeCount} → ${afterCount}`,
      `- Duplicate groups merged: ${merges.length}`,
      `- Alignment SHA256 before: ${digest(before)}`,
      `- Alignment SHA256 after: ${digest(after)}`, "",
      "| Block | Retained ID | Combined IDs |", "| --- | --- | --- |",
      ...merges.map((merge) => `| ${merge.block} | ${merge.retained_id} | ${merge.merged_ids.join(", ")} |`), "",
      "Approval scope: translation page only. Rebuild and publish-gate validation are required after updating its dependency hash.", "",
    ].join("\n");
    fs.writeFileSync(alignmentPath, after, "utf8");
    fs.writeFileSync(path.join(content, "stage2_reveal_group_review.md"), report, "utf8");
  }
  return result;
}

if (require.main === module) {
  const slugs = process.argv.flatMap((arg, index) => arg === "--slug" ? [process.argv[index + 1]] : []);
  assert(slugs.length === 1 && slugs[0], "Use exactly one --slug <reading-slug>; add --write after reviewing the proposed groups.");
  console.log(JSON.stringify(mergeSlug(slugs[0], { write: process.argv.includes("--write") }), null, 2));
}

module.exports = { mergeSlug };
