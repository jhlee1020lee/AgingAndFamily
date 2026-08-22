const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(ROOT_DIR, "manifest", "readings.json");
const SUMMARY_MARKERS = [/요약하면/, /전반적으로/, /핵심은/, /간단히 말하면/, /정리하면/];
const LIMITATION_MARKERS = /\b(limitation|caution|caveat|however|although|might|cannot|not necessarily)\b/i;
const MAY_LIMITATION_MARKER = /\bmay\b/;
const KOREAN_CAUTION_MARKERS = /(한계|주의|다만|그러나|그럼에도|하지만|지만|에도 불구|일 수|가능성|반드시|인과|제한)/;

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(readText(filePath));
}

function toText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function textArray(value) {
  return (Array.isArray(value) ? value : [value]).map((item) => toText(item)).filter(Boolean);
}

function normalizeId(value) {
  return toText(value).toUpperCase();
}

function countWords(value) {
  return toText(value).split(/\s+/).filter(Boolean).length;
}

function digitTokens(value) {
  return Array.from(new Set((toText(value).match(/\d+(?:[.,]\d+)?%?/g) || []).map((item) => item.replace(/,/g, ""))));
}

function hasCitation(value) {
  const text = toText(value);
  return /\([A-Z][^)]+,\s*\d{4}[a-z]?\)/.test(text) || /\b[A-Z][A-Za-z-]+\s+et\s+al\.\s*\(?\d{4}/.test(text);
}

function hasTableOrFigure(value) {
  return /\b(table|figure|fig\.)\s*\d+/i.test(toText(value));
}

function formatList(items) {
  return items.length ? items.map((item) => `  - ${item}`).join("\n") : "  - none";
}

function loadManifest() {
  const payload = loadJson(MANIFEST_PATH);
  return Array.isArray(payload?.readings) ? payload.readings : [];
}

function parseArgs(argv) {
  const args = { slug: "", strict: false, writeReport: false, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--slug") {
      args.slug = argv[index + 1] || "";
      index += 1;
    } else if (token === "--strict") {
      args.strict = true;
    } else if (token === "--write-report") {
      args.writeReport = true;
    } else if (token === "--json") {
      args.json = true;
    }
  }
  return args;
}

function qualityChecks(sourceSegment, translationSegment) {
  const errors = [];
  const warnings = [];
  const original = toText(sourceSegment.original_text);
  const translation = toText(translationSegment.ko_translation || translationSegment.translation);
  const segmentId = normalizeId(sourceSegment.segment_id);

  if (!translation) {
    errors.push(`${segmentId}: missing ko_translation`);
    return { errors, warnings };
  }

  if (translationSegment.is_summary === true) {
    errors.push(`${segmentId}: translation segment is marked is_summary=true`);
  }
  SUMMARY_MARKERS.forEach((pattern) => {
    if (pattern.test(translation)) {
      errors.push(`${segmentId}: translation uses summary-style wording (${pattern})`);
    }
  });

  const sourceDigits = digitTokens(original);
  const translationDigits = digitTokens(translation);
  const missingDigits = sourceDigits.filter((token) => !translationDigits.includes(token));
  if (missingDigits.length) {
    errors.push(`${segmentId}: number(s) missing from translation: ${missingDigits.join(", ")}`);
  }

  if (sourceSegment.contains_citations === true || hasCitation(original)) {
    if (!/\d{4}|et\s+al\.|[A-Z][A-Za-z-]+\s*\(/.test(translation)) {
      warnings.push(`${segmentId}: citation marker may be missing`);
    }
  }

  if (sourceSegment.contains_table_or_figure_reference === true || hasTableOrFigure(original)) {
    if (!/(표|그림|table|figure|fig\.)\s*\d*/i.test(translation)) {
      errors.push(`${segmentId}: table/figure reference may be missing`);
    }
  }

  if ((LIMITATION_MARKERS.test(original) || MAY_LIMITATION_MARKER.test(original)) && !KOREAN_CAUTION_MARKERS.test(translation)) {
    warnings.push(`${segmentId}: limitation/caution wording may be weakened`);
  }

  const sourceWords = countWords(original);
  const koChars = translation.replace(/\s+/g, "").length;
  if (sourceWords >= 35 && koChars < sourceWords * 1.1) {
    warnings.push(`${segmentId}: translation is unusually short for the source segment`);
  }

  return { errors, warnings };
}

function checkReading(reading, options = {}) {
  const contentDir = path.join(ROOT_DIR, reading.content_dir);
  const sourcePath = path.join(contentDir, "source_segments.json");
  const translationPath = path.join(contentDir, "translation_segments.json");
  const hasSource = fs.existsSync(sourcePath);
  const hasTranslation = fs.existsSync(translationPath);
  const errors = [];
  const warnings = [];

  if (!hasSource || !hasTranslation) {
    const message = `missing segment file pair: ${hasSource ? "" : "source_segments.json"}${!hasSource && !hasTranslation ? ", " : ""}${hasTranslation ? "" : "translation_segments.json"}`;
    if (options.strict || hasSource || hasTranslation) {
      errors.push(message);
    } else {
      warnings.push(message);
    }
    return {
      slug: reading.slug,
      status: errors.length ? "FAIL" : "SKIP",
      source_path: sourcePath,
      translation_path: translationPath,
      source_count: 0,
      translation_count: 0,
      missing_translation_ids: [],
      extra_translation_ids: [],
      order_mismatch_ids: [],
      errors,
      warnings,
    };
  }

  const sourcePayload = loadJson(sourcePath);
  const translationPayload = loadJson(translationPath);
  const sourceSegments = Array.isArray(sourcePayload?.segments) ? sourcePayload.segments : [];
  const translationSegments = Array.isArray(translationPayload?.translations) ? translationPayload.translations : [];

  if (!sourceSegments.length) errors.push("source_segments.json has no segments");
  if (!translationSegments.length) errors.push("translation_segments.json has no translations");
  if (toText(sourcePayload?.paper_id) && toText(translationPayload?.paper_id) && toText(sourcePayload.paper_id) !== toText(translationPayload.paper_id)) {
    errors.push("paper_id differs between source_segments.json and translation_segments.json");
  }

  const sourceIds = sourceSegments.map((segment) => normalizeId(segment.segment_id));
  const translationIds = translationSegments.map((segment) => normalizeId(segment.segment_id));
  const sourceIdSet = new Set(sourceIds);
  const translationIdSet = new Set(translationIds);
  const missingTranslationIds = sourceIds.filter((id) => !translationIdSet.has(id));
  const extraTranslationIds = translationIds.filter((id) => !sourceIdSet.has(id));
  const orderMismatchIds = [];

  sourceIds.forEach((id, index) => {
    if (translationIds[index] && translationIds[index] !== id) {
      orderMismatchIds.push(`${id} -> ${translationIds[index]}`);
    }
  });

  if (missingTranslationIds.length) errors.push(`missing translations for segment_id(s): ${missingTranslationIds.join(", ")}`);
  if (extraTranslationIds.length) errors.push(`translation has unknown segment_id(s): ${extraTranslationIds.join(", ")}`);
  if (orderMismatchIds.length) errors.push(`segment order differs: ${orderMismatchIds.join(", ")}`);

  const translationById = new Map(translationSegments.map((segment) => [normalizeId(segment.segment_id), segment]));
  sourceSegments.forEach((sourceSegment, index) => {
    const id = normalizeId(sourceSegment.segment_id);
    if (!id) {
      errors.push(`source segment ${index + 1} is missing segment_id`);
      return;
    }
    const translationSegment = translationById.get(id);
    if (!translationSegment) return;
    const splitFrom = textArray(translationSegment.split_from);
    const mergedFrom = textArray(translationSegment.merged_from);
    if (splitFrom.length && !toText(translationSegment.split_reason)) {
      errors.push(`${id}: split_from requires split_reason`);
    }
    if (mergedFrom.length > 1 && !toText(translationSegment.merge_reason)) {
      errors.push(`${id}: merged_from requires merge_reason`);
    }
    const quality = qualityChecks(sourceSegment, translationSegment);
    errors.push(...quality.errors);
    warnings.push(...quality.warnings);
  });

  return {
    slug: reading.slug,
    status: errors.length ? "FAIL" : "PASS",
    source_path: sourcePath,
    translation_path: translationPath,
    source_count: sourceSegments.length,
    translation_count: translationSegments.length,
    missing_translation_ids: missingTranslationIds,
    extra_translation_ids: extraTranslationIds,
    order_mismatch_ids: orderMismatchIds,
    errors,
    warnings,
  };
}

function renderMarkdownReport(result) {
  const now = new Date().toISOString();
  return `# Alignment Report

- Reading: \`${result.slug}\`
- Generated at: ${now}
- Final status: **${result.status}**
- Source segments: ${result.source_count}
- Translation segments: ${result.translation_count}

## Missing translation segment_id
${formatList(result.missing_translation_ids)}

## Extra translation segment_id
${formatList(result.extra_translation_ids)}

## Order mismatches
${formatList(result.order_mismatch_ids)}

## Errors
${formatList(result.errors)}

## Warnings
${formatList(result.warnings)}
`;
}

function renderQaChecklist(result) {
  const rows = [
    ["All source segment_id values have translations", result.missing_translation_ids.length === 0],
    ["No translation-only segment_id values exist", result.extra_translation_ids.length === 0],
    ["Segment order is unchanged", result.order_mismatch_ids.length === 0],
    ["No summary-style replacement was detected", !result.errors.some((error) => /summary-style|is_summary/.test(error))],
    ["Numbers, table/figure references, and required IDs passed automated checks", !result.errors.some((error) => /number|table|figure|segment_id/.test(error))],
    ["Manual spot-check completed for abstract/method/result/discussion/backmatter", false],
  ];
  return `# Translation QA Checklist

- Reading: \`${result.slug}\`
- Alignment status: **${result.status}**

${rows.map(([label, passed]) => `- [${passed ? "x" : " "}] ${label}`).join("\n")}

## Manual Review Notes

- Add notes here before marking translation alignment approved.
`;
}

function writeReports(result) {
  const contentDir = path.dirname(result.source_path);
  writeText(path.join(contentDir, "alignment_report.md"), renderMarkdownReport(result));
  writeText(path.join(contentDir, "translation_qa_checklist.md"), renderQaChecklist(result));
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const readings = loadManifest().filter((reading) => !options.slug || reading.slug === options.slug);
  if (options.slug && !readings.length) {
    console.error(`No reading found for slug: ${options.slug}`);
    process.exit(1);
  }
  const results = readings.map((reading) => checkReading(reading, options));
  if (options.writeReport) {
    results.filter((result) => result.status !== "SKIP").forEach(writeReports);
  }
  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    results.forEach((result) => {
      console.log(`${result.status} ${result.slug} (${result.source_count}/${result.translation_count})`);
      result.errors.forEach((error) => console.log(`  error: ${error}`));
      result.warnings.forEach((warning) => console.log(`  warning: ${warning}`));
    });
  }
  if (results.some((result) => result.status === "FAIL")) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkReading, renderMarkdownReport, renderQaChecklist, main };
