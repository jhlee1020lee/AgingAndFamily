const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(ROOT_DIR, "manifest", "readings.json");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function parseArgs(argv) {
  const args = { slug: "", plan: "", force: false, listBlocks: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--slug") {
      args.slug = argv[index + 1] || "";
      index += 1;
    } else if (token === "--plan") {
      args.plan = argv[index + 1] || "";
      index += 1;
    } else if (token === "--force") {
      args.force = true;
    } else if (token === "--list-blocks") {
      args.listBlocks = true;
    }
  }
  if (!args.slug) {
    throw new Error("Use --slug <reading-slug>.");
  }
  if (!args.listBlocks && !args.plan) {
    throw new Error("Use --plan <plan.json> or --list-blocks.");
  }
  return args;
}

function cleanInlineMarkdown(value) {
  return value
    .replace(/^>\s?/gm, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1")
    .replace(/(?<!_)_([^_]+)_(?!_)/g, "$1")
    .trim();
}

function parseMarkdownBlocks(markdown) {
  const rawBlocks = markdown.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const blocks = [];
  let section = "Opening";

  for (const rawBlock of rawBlocks) {
    const value = rawBlock.trim();
    if (!value) {
      continue;
    }
    const heading = value.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      if (heading[1].length >= 2) {
        section = cleanInlineMarkdown(heading[2]);
      }
      continue;
    }
    if (/^!\[[^\]]*\]\([^)]*\)$/.test(value)) {
      continue;
    }
    const text = cleanInlineMarkdown(value);
    if (!text) {
      continue;
    }
    blocks.push({
      block_index: blocks.length + 1,
      section,
      text,
      word_count: text.split(/\s+/).filter(Boolean).length,
    });
  }
  return blocks;
}

function segmentBlockIndexes(item) {
  if (Array.isArray(item.blocks) && item.blocks.length) {
    return item.blocks.map(Number);
  }
  const start = Number(item.block_start);
  const end = Number(item.block_end);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
    throw new Error(`Invalid block range for ${item.segment_id || "unnamed segment"}.`);
  }
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function excludedBlockIndexes(plan) {
  const indexes = new Set();
  for (const value of Array.isArray(plan.exclude_blocks) ? plan.exclude_blocks : []) {
    const index = Number(typeof value === "object" ? value.block : value);
    if (!Number.isInteger(index) || index < 1) {
      throw new Error(`Invalid excluded block: ${JSON.stringify(value)}`);
    }
    indexes.add(index);
  }
  return indexes;
}

function buildSegments(reading, blocks, plan) {
  if (!Array.isArray(plan.segments) || !plan.segments.length) {
    throw new Error("Plan must contain a non-empty segments array.");
  }
  const assigned = new Set();
  const excluded = excludedBlockIndexes(plan);

  const segments = plan.segments.map((item, segmentIndex) => {
    const indexes = segmentBlockIndexes(item);
    const selected = indexes.map((blockIndex) => {
      const block = blocks[blockIndex - 1];
      if (!block) {
        throw new Error(`${item.segment_id}: block ${blockIndex} does not exist.`);
      }
      if (assigned.has(blockIndex) || excluded.has(blockIndex)) {
        throw new Error(`${item.segment_id}: block ${blockIndex} is assigned more than once or excluded.`);
      }
      assigned.add(blockIndex);
      return block;
    });
    const originalText = selected.map((block) => block.text).join("\n\n");
    const segmentId = String(item.segment_id || "").trim();
    if (!segmentId) {
      throw new Error(`Segment ${segmentIndex + 1} is missing segment_id.`);
    }
    return {
      segment_id: segmentId,
      section: String(item.section || selected[0].section || "Article").trim(),
      paragraph_index: segmentIndex + 1,
      source_location: String(item.source_location || reading.source_filename).trim(),
      original_text: originalText,
      word_count: originalText.split(/\s+/).filter(Boolean).length,
      char_count: originalText.length,
      contains_numbers: /\d/.test(originalText),
      contains_citations: /\([A-Z][^)]+,\s*\d{4}[a-z]?\)|\b[A-Z][A-Za-z-]+\s+et\s+al\.\s*\(?\d{4}/.test(originalText),
      contains_table_or_figure_reference: /\b(table|figure|fig\.)\s*\d+/i.test(originalText),
      notes: String(item.notes || "Meaning-based segment checked against the local PDF rendering.").trim(),
    };
  });

  const missing = blocks
    .map((block) => block.block_index)
    .filter((blockIndex) => !assigned.has(blockIndex) && !excluded.has(blockIndex));
  if (missing.length) {
    throw new Error(`Plan leaves source block(s) unassigned: ${missing.join(", ")}.`);
  }
  const outOfRangeExcluded = [...excluded].filter((blockIndex) => !blocks[blockIndex - 1]);
  if (outOfRangeExcluded.length) {
    throw new Error(`Excluded block(s) do not exist: ${outOfRangeExcluded.join(", ")}.`);
  }
  return segments;
}

function listBlocks(blocks) {
  for (const block of blocks) {
    const preview = block.text.replace(/\s+/g, " ").slice(0, 130);
    console.log(`${String(block.block_index).padStart(3, "0")} | ${String(block.word_count).padStart(4, " ")} | ${block.section} | ${preview}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = readJson(MANIFEST_PATH);
  const reading = (manifest.readings || []).find((item) => item.slug === args.slug);
  if (!reading) {
    throw new Error(`Unknown reading slug: ${args.slug}`);
  }
  const contentDir = path.join(ROOT_DIR, reading.content_dir);
  const fullPath = path.join(contentDir, "full.md");
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing full.md: ${fullPath}`);
  }
  const blocks = parseMarkdownBlocks(readText(fullPath));
  if (args.listBlocks) {
    listBlocks(blocks);
    return;
  }
  const planPath = path.resolve(ROOT_DIR, args.plan);
  const plan = readJson(planPath);
  const outputPath = path.join(contentDir, "source_segments.json");
  if (fs.existsSync(outputPath) && !args.force) {
    throw new Error(`Refusing to overwrite ${outputPath}; pass --force to replace it.`);
  }
  const segments = buildSegments(reading, blocks, plan);
  const payload = {
    paper_id: reading.slug,
    title: reading.title,
    segments,
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`[written] ${path.relative(ROOT_DIR, outputPath)} (${segments.length} segments, ${blocks.length} source blocks)`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = { parseMarkdownBlocks, buildSegments };
