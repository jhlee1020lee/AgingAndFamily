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
  const pages = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--page" && argv[index + 1]) {
      pages.push(argv[index + 1].replace(/_/g, "-"));
      index += 1;
    }
  }
  return {
    slug: slugIndex >= 0 ? argv[slugIndex + 1] : "",
    reviewer: reviewerIndex >= 0 ? argv[reviewerIndex + 1] : "codex",
    note: noteIndex >= 0 ? argv[noteIndex + 1] : "Source, alignment, learning assets, and rendered artifacts reviewed.",
    pages: [...new Set(pages)],
    requireBuiltArtifacts: !argv.includes("--source-only"),
  };
}

function approveReading(options, rootDir = ROOT_DIR) {
  if (!options.slug) throw new Error("Use --slug <reading-slug>.");
  const manifest = readJson(path.join(rootDir, "manifest", "readings.json"));
  const reading = manifest.readings.find((item) => item.slug === options.slug);
  if (!reading) throw new Error(`Unknown slug: ${options.slug}`);

  const metaPath = path.join(rootDir, reading.content_dir, "meta.json");
  if (!fs.existsSync(metaPath)) {
    throw new Error(`Missing meta.json. Build the slug first: ${reading.content_dir}`);
  }

  const existing = readJson(metaPath);
  const initial = buildValidationSnapshot(rootDir, reading, existing, {
    requireBuiltArtifacts: options.requireBuiltArtifacts,
  });
  const sourceResults = initial.validation_status.source_page_results;
  const sourceEntries = Object.entries(sourceResults)
    .filter(([, result]) => result.status !== PAGE_STATUS.NOT_APPLICABLE);
  const availablePageKeys = sourceEntries.map(([statusKey]) => statusKey.replace(/_/g, "-"));
  const requestedPageKeys = options.pages?.length ? options.pages : availablePageKeys;
  const unknownPages = requestedPageKeys.filter((pageKey) => !availablePageKeys.includes(pageKey));
  if (unknownPages.length) {
    throw new Error(`Unknown or disabled page key(s): ${unknownPages.join(", ")}`);
  }
  const failures = sourceEntries
    .filter(([statusKey, result]) => (
      requestedPageKeys.includes(statusKey.replace(/_/g, "-"))
      && result.status !== PAGE_STATUS.SCHEMA_PASS
      && result.status !== PAGE_STATUS.APPROVED
    ))
    .map(([statusKey]) => statusKey.replace(/_/g, "-"));
  if (failures.length) {
    throw new Error(`Source validation must pass before approval: ${failures.join(", ")}`);
  }

  const pageKeys = [...new Set([
    ...(initial.manual_review.approved_pages || []),
    ...requestedPageKeys,
  ])];
  const reviewNotes = [...new Set([
    ...(initial.manual_review.notes || []),
    options.note,
  ].filter(Boolean))];

  const seeded = {
    ...existing,
    manual_review: {
      ...initial.manual_review,
      approved_pages: pageKeys,
      approved_page_hashes: { ...initial.manual_review.approved_page_hashes },
      reviewer: options.reviewer,
      reviewed_at: new Date().toISOString(),
      notes: reviewNotes,
      blocked_reason: "",
    },
  };
  requestedPageKeys.forEach((pageKey) => {
    const sourceHash = sourceResults[pageKey.replace(/-/g, "_")]?.source_hash;
    if (!sourceHash) throw new Error(`Missing approval dependency hash: ${pageKey}`);
    seeded.manual_review.approved_page_hashes[pageKey] = sourceHash;
  });
  const approved = buildValidationSnapshot(rootDir, reading, seeded, {
    requireBuiltArtifacts: options.requireBuiltArtifacts,
  });
  const artifactFailures = requestedPageKeys.filter((pageKey) => approved.content_status[pageKey.replace(/-/g, "_")] !== PAGE_STATUS.APPROVED);
  if (artifactFailures.length) throw new Error(`Approval checks failed: ${artifactFailures.join(", ")}. For reviewed source changes, use --source-only, rebuild, then validate --publish-gate.`);
  const payload = mergeValidationFields(seeded, approved);
  writeJson(metaPath, payload);
  console.log(`[approved] ${options.slug}: ${approved.workflow_status} (${requestedPageKeys.join(", ")})`);
  return approved;
}

if (require.main === module) {
  approveReading(parseArgs(process.argv.slice(2)));
}

module.exports = { approveReading };
