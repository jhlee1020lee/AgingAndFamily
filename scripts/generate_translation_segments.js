const fs = require("fs");
const path = require("path");

const { parseMarkdownBlocks, buildSegments } = require("./generate_source_segments");

const ROOT_DIR = path.resolve(__dirname, "..");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function parseArgs(argv) {
  const args = { slug: "", plan: "", force: false };
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
    }
  }
  if (!args.slug || !args.plan) {
    throw new Error("Use --slug <reading-slug> --plan <plan.json>.");
  }
  return args;
}

function translatedPlan(plan) {
  return {
    ...plan,
    segments: (plan.segments || []).map((item) => {
      const copy = { ...item };
      delete copy.section;
      copy.section = item.translation_section || "";
      return copy;
    }),
  };
}

function markdownTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = readJson(path.join(ROOT_DIR, "manifest", "readings.json"));
  const reading = (manifest.readings || []).find((item) => item.slug === args.slug);
  if (!reading) {
    throw new Error(`Unknown reading slug: ${args.slug}`);
  }
  const contentDir = path.join(ROOT_DIR, reading.content_dir);
  const translationPath = path.join(contentDir, "translation.md");
  const sourcePath = path.join(contentDir, "source_segments.json");
  if (!fs.existsSync(translationPath) || !fs.existsSync(sourcePath)) {
    throw new Error("translation.md and source_segments.json must both exist.");
  }

  const markdown = readText(translationPath);
  const blocks = parseMarkdownBlocks(markdown);
  const plan = readJson(path.resolve(ROOT_DIR, args.plan));
  const translated = buildSegments(reading, blocks, translatedPlan(plan));
  const sourcePayload = readJson(sourcePath);
  const sourceIds = (sourcePayload.segments || []).map((item) => item.segment_id);
  const translatedIds = translated.map((item) => item.segment_id);
  if (JSON.stringify(sourceIds) !== JSON.stringify(translatedIds)) {
    throw new Error("Translation segment IDs or order do not match source_segments.json.");
  }

  const payload = {
    paper_id: reading.slug,
    title_ko: markdownTitle(markdown),
    translations: translated.map((item) => ({
      segment_id: item.segment_id,
      section: item.section,
      source_location: item.source_location,
      ko_translation: item.original_text,
      is_summary: false,
    })),
  };
  const outputPath = path.join(contentDir, "translation_segments.json");
  if (fs.existsSync(outputPath) && !args.force) {
    throw new Error(`Refusing to overwrite ${outputPath}; pass --force to replace it.`);
  }
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`[written] ${path.relative(ROOT_DIR, outputPath)} (${payload.translations.length} translations, ${blocks.length} translation blocks)`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = { translatedPlan, markdownTitle };
