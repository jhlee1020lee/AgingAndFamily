const fs = require("fs");
const path = require("path");

const {
  PAGE_STATUS,
  buildValidationSnapshot,
  mergeValidationFields,
} = require("./validate_content");

const ROOT_DIR = path.resolve(__dirname, "..");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseArgs(argv) {
  const slugIndex = argv.indexOf("--slug");
  const reviewerIndex = argv.indexOf("--reviewer");
  const noteIndex = argv.indexOf("--note");
  return {
    slug: slugIndex >= 0 ? argv[slugIndex + 1] : "",
    reviewer: reviewerIndex >= 0 ? argv[reviewerIndex + 1] : "codex",
    note: noteIndex >= 0 ? argv[noteIndex + 1] : "Source, alignment, learning assets, and rendered artifacts reviewed.",
    requireBuiltArtifacts: !argv.includes("--source-only"),
  };
}

function approveReading(options) {
  if (!options.slug) throw new Error("Use --slug <reading-slug>.");
  const manifest = readJson(path.join(ROOT_DIR, "manifest", "readings.json"));
  const reading = manifest.readings.find((item) => item.slug === options.slug);
  if (!reading) throw new Error(`Unknown slug: ${options.slug}`);

  const metaPath = path.join(ROOT_DIR, reading.content_dir, "meta.json");
  if (!fs.existsSync(metaPath)) {
    throw new Error(`Missing meta.json. Build the slug first: ${reading.content_dir}`);
  }

  const existing = readJson(metaPath);
  const initial = buildValidationSnapshot(ROOT_DIR, reading, existing, {
    requireBuiltArtifacts: options.requireBuiltArtifacts,
  });
  const sourceResults = initial.validation_status.source_page_results;
  const sourceEntries = Object.entries(sourceResults)
    .filter(([, result]) => result.status !== PAGE_STATUS.NOT_APPLICABLE);
  const pageKeys = sourceEntries.map(([statusKey]) => statusKey.replace(/_/g, "-"));
  const failures = sourceEntries
    .filter(([, result]) => result.status !== PAGE_STATUS.SCHEMA_PASS && result.status !== PAGE_STATUS.APPROVED)
    .map(([statusKey]) => statusKey.replace(/_/g, "-"));
  if (failures.length) {
    throw new Error(`Source validation must pass before approval: ${failures.join(", ")}`);
  }

  const seeded = {
    ...existing,
    manual_review: {
      ...initial.manual_review,
      approved_pages: pageKeys,
      approved_page_hashes: {},
      reviewer: options.reviewer,
      reviewed_at: new Date().toISOString(),
      notes: [options.note],
      blocked_reason: "",
    },
  };
  const approved = buildValidationSnapshot(ROOT_DIR, reading, seeded, {
    requireBuiltArtifacts: options.requireBuiltArtifacts,
  });
  const payload = mergeValidationFields(seeded, approved);
  writeJson(metaPath, payload);
  console.log(`[approved] ${options.slug}: ${approved.workflow_status} (${pageKeys.length} pages)`);
}

if (require.main === module) {
  approveReading(parseArgs(process.argv.slice(2)));
}

module.exports = { approveReading };
