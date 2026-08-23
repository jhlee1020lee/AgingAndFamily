const fs = require("fs");
const path = require("path");

const { parseMarkdownDocument } = require("./translation_original_reveal");

const ROOT_DIR = path.resolve(__dirname, "..");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function parseArgs(argv) {
  const slugIndex = argv.indexOf("--slug");
  const planIndex = argv.indexOf("--plan");
  return {
    slug: slugIndex >= 0 ? argv[slugIndex + 1] || "" : "",
    plan: planIndex >= 0 ? argv[planIndex + 1] || "" : "",
    force: argv.includes("--force"),
    verified: argv.includes("--verified"),
  };
}

function parseDocument(filePath) {
  return parseMarkdownDocument(readText(filePath), {
    skipFirstTitleHeading: true,
    collectFrontmatter: true,
  });
}

function validateParallelStructure(sourceDocument, translationDocument) {
  const sourceBlocks = sourceDocument.blocks || [];
  const translationBlocks = translationDocument.blocks || [];
  const errors = [];
  if (sourceBlocks.length !== translationBlocks.length) {
    errors.push(`block count differs: source ${sourceBlocks.length}, translation ${translationBlocks.length}`);
  }
  const max = Math.max(sourceBlocks.length, translationBlocks.length);
  for (let index = 0; index < max; index += 1) {
    const sourceType = sourceBlocks[index]?.type || "missing";
    const translationType = translationBlocks[index]?.type || "missing";
    if (sourceType !== translationType) {
      errors.push(`block ${index} type differs: source ${sourceType}, translation ${translationType}`);
    }
    if (sourceType === "heading" && sourceBlocks[index]?.level !== translationBlocks[index]?.level) {
      errors.push(`heading ${index} level differs`);
    }
  }
  return errors;
}

function buildAlignment(slug, sourceDocument, translationDocument, status = "generated") {
  const sourceBlocks = sourceDocument.blocks || [];
  const translationBlocks = translationDocument.blocks || [];
  const entries = [];
  for (let index = 0; index < translationBlocks.length; index += 1) {
    const translationBlock = translationBlocks[index];
    if (translationBlock.type !== "paragraph") {
      continue;
    }
    const sourceBlock = sourceBlocks[index];
    entries.push({
      id: `${slug}-tr-${String(entries.length + 1).padStart(3, "0")}`,
      status,
      unit: "context_block",
      ko_anchor: {
        flat_index: index,
        block_type: "paragraph",
      },
      en_anchor: {
        flat_index: index,
        block_type: "paragraph",
      },
      source_text: sourceBlock.text || sourceBlock.plainText || "",
    });
  }
  return {
    version: 2,
    reading_slug: slug,
    page: "translation",
    entries,
  };
}

function splitTextByStarts(value, starts, label) {
  const text = String(value || "").trim();
  if (!Array.isArray(starts) || starts.length < 2) {
    throw new Error(`${label}: source_text_starts must contain at least two markers`);
  }
  const positions = [];
  let cursor = 0;
  for (const rawStart of starts) {
    const start = String(rawStart || "").trim();
    const position = text.indexOf(start, cursor);
    if (!start || position < 0) {
      throw new Error(`${label}: source split marker not found: ${start}`);
    }
    positions.push(position);
    cursor = position + start.length;
  }
  if (positions[0] !== 0) {
    throw new Error(`${label}: first source split marker must begin the paragraph`);
  }
  return positions.map((position, index) => text.slice(position, positions[index + 1] ?? text.length).trim());
}

function headingRankBefore(blocks, flatIndex) {
  let rank = -1;
  for (let index = 0; index < flatIndex; index += 1) {
    if (blocks[index]?.type === "heading") rank += 1;
  }
  return rank;
}

function plannedParagraphRecords(sourceDocument, translationDocument, plan) {
  const sourceBlocks = sourceDocument.blocks || [];
  const translationBlocks = translationDocument.blocks || [];
  const splitPlans = new Map();
  for (const item of Array.isArray(plan?.source_splits) ? plan.source_splits : []) {
    const flatIndex = Number(item.source_flat_index);
    if (!Number.isInteger(flatIndex) || flatIndex < 0 || splitPlans.has(flatIndex)) {
      throw new Error(`Invalid or duplicate source_flat_index: ${item.source_flat_index}`);
    }
    splitPlans.set(flatIndex, item);
  }

  const usedSplits = new Set();
  const sourceParagraphs = [];
  sourceBlocks.forEach((block, flatIndex) => {
    if (block.type !== "paragraph") return;
    const splitPlan = splitPlans.get(flatIndex);
    if (!splitPlan) {
      sourceParagraphs.push({ flatIndex, text: block.text || block.plainText || "", split: false });
      return;
    }
    usedSplits.add(flatIndex);
    const chunks = splitTextByStarts(
      block.text || block.plainText || "",
      splitPlan.source_text_starts,
      `source block ${flatIndex}`
    );
    chunks.forEach((text) => sourceParagraphs.push({ flatIndex, text, split: true }));
  });
  const unusedSplits = [...splitPlans.keys()].filter((flatIndex) => !usedSplits.has(flatIndex));
  if (unusedSplits.length) {
    throw new Error(`Planned source split block(s) are not paragraphs: ${unusedSplits.join(", ")}`);
  }

  const translationParagraphs = [];
  translationBlocks.forEach((block, flatIndex) => {
    if (block.type === "paragraph") {
      translationParagraphs.push({ flatIndex, text: block.text || block.plainText || "" });
    }
  });
  return { sourceBlocks, translationBlocks, sourceParagraphs, translationParagraphs };
}

function validatePlannedStructure(records) {
  const errors = [];
  const { sourceBlocks, translationBlocks, sourceParagraphs, translationParagraphs } = records;
  const sourceHeadings = sourceBlocks.filter((block) => block.type === "heading");
  const translationHeadings = translationBlocks.filter((block) => block.type === "heading");
  if (sourceHeadings.length !== translationHeadings.length) {
    errors.push(`heading count differs: source ${sourceHeadings.length}, translation ${translationHeadings.length}`);
  }
  const headingCount = Math.min(sourceHeadings.length, translationHeadings.length);
  for (let index = 0; index < headingCount; index += 1) {
    if (sourceHeadings[index].level !== translationHeadings[index].level) {
      errors.push(`heading ${index} level differs`);
    }
  }
  if (sourceParagraphs.length !== translationParagraphs.length) {
    errors.push(`planned paragraph count differs: source ${sourceParagraphs.length}, translation ${translationParagraphs.length}`);
  }
  const paragraphCount = Math.min(sourceParagraphs.length, translationParagraphs.length);
  for (let index = 0; index < paragraphCount; index += 1) {
    const source = sourceParagraphs[index];
    const translation = translationParagraphs[index];
    const sourceRank = headingRankBefore(sourceBlocks, source.flatIndex);
    const translationRank = headingRankBefore(translationBlocks, translation.flatIndex);
    if (sourceRank !== translationRank) {
      errors.push(`paragraph ${index} section differs: source heading ${sourceRank}, translation heading ${translationRank}`);
    }
  }
  return errors;
}

function buildPlannedAlignment(slug, records, status = "generated", entryIdPrefix = slug) {
  const entries = records.translationParagraphs.map((translation, index) => {
    const source = records.sourceParagraphs[index];
    const entry = {
      id: `${entryIdPrefix}-tr-${String(index + 1).padStart(3, "0")}`,
      status,
      unit: source.split ? "sentence_group" : "context_block",
      ko_anchor: {
        flat_index: translation.flatIndex,
        block_type: "paragraph",
      },
      en_anchor: {
        flat_index: source.flatIndex,
        block_type: "paragraph",
      },
    };
    if (source.split) entry.source_text = source.text;
    return entry;
  });
  return {
    version: 2,
    reading_slug: slug,
    page: "translation",
    entries,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.slug) {
    throw new Error("Use --slug <reading-slug>.");
  }
  const manifest = readJson(path.join(ROOT_DIR, "manifest", "readings.json"));
  const reading = (manifest.readings || []).find((item) => item.slug === args.slug);
  if (!reading) {
    throw new Error(`Unknown reading slug: ${args.slug}`);
  }
  const contentDir = path.join(ROOT_DIR, reading.content_dir);
  const sourceDocument = parseDocument(path.join(contentDir, "full.md"));
  const translationDocument = parseDocument(path.join(contentDir, "translation.md"));
  const plan = args.plan ? readJson(path.resolve(ROOT_DIR, args.plan)) : null;
  const records = plan ? plannedParagraphRecords(sourceDocument, translationDocument, plan) : null;
  const structureErrors = plan
    ? validatePlannedStructure(records)
    : validateParallelStructure(sourceDocument, translationDocument);
  if (structureErrors.length) {
    throw new Error(`Parallel Markdown structure check failed:\n  ${structureErrors.join("\n  ")}`);
  }
  const payload = plan
    ? buildPlannedAlignment(
      args.slug,
      records,
      args.verified ? "verified" : "generated",
      String(plan.entry_id_prefix || args.slug).trim()
    )
    : buildAlignment(args.slug, sourceDocument, translationDocument, args.verified ? "verified" : "generated");
  const outputPath = path.join(contentDir, "translation_alignment.json");
  if (fs.existsSync(outputPath) && !args.force) {
    throw new Error(`Refusing to overwrite ${outputPath}; pass --force to replace it.`);
  }
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`[written] ${path.relative(ROOT_DIR, outputPath)} (${payload.entries.length} paragraph alignments, ${args.verified ? "verified" : "generated"})`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  validateParallelStructure,
  buildAlignment,
  plannedParagraphRecords,
  validatePlannedStructure,
  buildPlannedAlignment,
};
