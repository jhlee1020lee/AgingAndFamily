const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const SLUG = "luong-et-al-2011";
const ALIGNMENT_PATH = path.join(
  ROOT_DIR,
  "content",
  "readings",
  SLUG,
  "translation_alignment.json"
);

const MERGES = new Map([
  [`${SLUG}-tr-003`, [2, 3]],
  [`${SLUG}-tr-006`, [3, 4]],
  [`${SLUG}-tr-008`, [6, 7]],
  [`${SLUG}-tr-019`, [3, 4]],
  [`${SLUG}-tr-025`, [1, 2]],
  [`${SLUG}-tr-038`, [7, 8]],
]);

function mergeOnePair(entry, oneBasedIndexes) {
  const [startNumber, endNumber] = oneBasedIndexes;
  const start = startNumber - 1;
  const end = endNumber - 1;
  const pairs = Array.isArray(entry.sentence_pairs) ? entry.sentence_pairs : [];
  if (end !== start + 1 || !pairs[start] || !pairs[end]) {
    throw new Error(`${entry.id}: invalid merge range ${startNumber}-${endNumber}`);
  }
  if (pairs[start].source_text !== pairs[end].source_text) {
    throw new Error(`${entry.id}: merge candidates do not share the same source sentence`);
  }
  const merged = {
    ...pairs[start],
    ko_text: `${pairs[start].ko_text} ${pairs[end].ko_text}`.replace(/\s+/g, " ").trim(),
  };
  entry.sentence_pairs = [
    ...pairs.slice(0, start),
    merged,
    ...pairs.slice(end + 1),
  ];
}

function main() {
  const alignment = JSON.parse(fs.readFileSync(ALIGNMENT_PATH, "utf8"));
  const seen = new Set();
  for (const entry of alignment.entries || []) {
    const mergeRange = MERGES.get(entry.id);
    if (mergeRange) {
      mergeOnePair(entry, mergeRange);
      seen.add(entry.id);
    }
    entry.sentence_alignment_method = "human-reviewed-v1";
    (entry.sentence_pairs || []).forEach((pair, index) => {
      pair.id = `${entry.id}-s${String(index + 1).padStart(2, "0")}`;
      pair.status = "generated";
    });
  }
  const missing = [...MERGES.keys()].filter((id) => !seen.has(id));
  if (missing.length) {
    throw new Error(`Missing reviewed entry: ${missing.join(", ")}`);
  }
  alignment.sentence_alignment_note =
    "Every sentence pair was checked against the complete bilingual block for meaning, order, omissions, citations, numeric anchors, and qualification language. English sentences rendered as two Korean sentences were regrouped into single semantic pairs.";
  delete alignment.sentence_alignment_reviewed_at;
  delete alignment.sentence_alignment_status;
  fs.writeFileSync(ALIGNMENT_PATH, `${JSON.stringify(alignment, null, 2)}\n`, "utf8");
  const pairCount = (alignment.entries || []).reduce(
    (sum, entry) => sum + (entry.sentence_pairs || []).length,
    0
  );
  console.log(`[sentence-review] ${SLUG}: ${pairCount} human-reviewed pairs prepared`);
}

main();
