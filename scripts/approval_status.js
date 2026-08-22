const fs = require("fs");
const path = require("path");

const { PAGE_STATUS, READING_STATUS, buildValidationSnapshot } = require("./validate_content");

const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(ROOT_DIR, "APPROVAL_STATUS.md");

const STAGE3_PAGE_KEYS = [
  "summary",
  "concepts",
  "pitfalls",
  "review_sheet",
  "professor_prep",
  "quiz_ox",
  "quiz_short",
  "quiz_mcq",
];

const PAGE_LABELS = {
  full: "전체 글",
  translation: "한국어 번역",
  summary: "핵심 요약",
  concepts: "핵심 개념",
  pitfalls: "헷갈리는 포인트",
  review_sheet: "시험 직전 정리",
  professor_prep: "교수님 구술 대비",
  quiz_ox: "OX 퀴즈",
  quiz_short: "단답형 퀴즈",
  quiz_mcq: "객관식 퀴즈",
};

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(readText(filePath));
}

function toText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function firstValue(...values) {
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }
    const text = String(value).trim();
    if (text) {
      return text;
    }
  }
  return "";
}

function effectiveSortDate(reading) {
  return firstValue(reading.sort_date, reading.reading_date, reading.class_date);
}

function displayDate(reading) {
  return firstValue(reading.display_date, reading.display_date_label, reading.reading_date, reading.class_date, reading.sort_date) || "-";
}

function sortReadings(readings) {
  return [...readings]
    .map((reading, index) => ({ ...reading, __order_index: index }))
    .sort((a, b) => {
      const aDate = effectiveSortDate(a);
      const bDate = effectiveSortDate(b);
      if (aDate && bDate && aDate !== bDate) {
        return aDate.localeCompare(bDate);
      }
      if (Boolean(aDate) !== Boolean(bDate)) {
        return aDate ? -1 : 1;
      }
      return a.__order_index - b.__order_index;
    });
}

function readingStatusLabel(status) {
  return {
    [READING_STATUS.APPROVED]: "승인",
    [READING_STATUS.MANUAL_REVIEW_REQUIRED]: "수동 검토",
    [READING_STATUS.PARTIAL]: "미승인",
    [READING_STATUS.BLOCKED]: "차단",
  }[status] || status || "-";
}

function pageStatusLabel(status) {
  return {
    [PAGE_STATUS.APPROVED]: "승인",
    [PAGE_STATUS.SCHEMA_PASS]: "검토 대기",
    [PAGE_STATUS.SCHEMA_FAIL]: "미달",
    [PAGE_STATUS.MISSING]: "없음",
    [PAGE_STATUS.NOT_APPLICABLE]: "해당 없음",
  }[status] || status || "-";
}

function isOptionalLandingGap(snapshot) {
  const landing = snapshot.validation_status?.landing || {};
  const warnings = Array.isArray(landing.warnings) ? landing.warnings : [];
  return (
    landing.status === PAGE_STATUS.SCHEMA_PASS &&
    warnings.length > 0 &&
    warnings.every((warning) => String(warning).includes("missing optional notebooklm video"))
  );
}

function landingStatusLabel(snapshot) {
  if (isOptionalLandingGap(snapshot)) {
    return "선택 사항";
  }
  return pageStatusLabel(snapshot.validation_status?.landing?.status || PAGE_STATUS.MISSING);
}

function escapeTable(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function summarizeNote(snapshot) {
  const items = [];
  const landingStatus = snapshot.validation_status?.landing?.status || PAGE_STATUS.MISSING;
  const pageResults = snapshot.validation_status?.page_results || {};

  if (landingStatus !== PAGE_STATUS.APPROVED && !isOptionalLandingGap(snapshot)) {
    items.push("설명 영상");
  }

  if (snapshot.validation_status?.stage1?.status === READING_STATUS.MANUAL_REVIEW_REQUIRED) {
    items.push("Stage 1 수동 승인");
  }

  if (snapshot.validation_status?.stage2?.status === READING_STATUS.MANUAL_REVIEW_REQUIRED) {
    items.push("Stage 2 수동 승인");
  }

  if (snapshot.validation_status?.stage3?.status === READING_STATUS.MANUAL_REVIEW_REQUIRED) {
    items.push("Stage 3 수동 승인");
  }

  ["full", "translation"].forEach((pageKey) => {
    const page = pageResults[pageKey];
    if (page && page.status !== PAGE_STATUS.APPROVED && page.status !== PAGE_STATUS.NOT_APPLICABLE) {
      items.push(PAGE_LABELS[pageKey] || pageKey);
    }
  });

  STAGE3_PAGE_KEYS.forEach((pageKey) => {
    const page = pageResults[pageKey];
    if (page && page.status !== PAGE_STATUS.APPROVED && page.status !== PAGE_STATUS.NOT_APPLICABLE) {
      items.push(PAGE_LABELS[pageKey] || pageKey);
    }
  });

  const summarized = unique(items);
  if (summarized.length) {
    return summarized.slice(0, 4).join(", ");
  }

  const workflowNotes = Array.isArray(snapshot.workflow_notes) ? snapshot.workflow_notes : [];
  if (workflowNotes.length) {
    return workflowNotes[0].split(";")[0].trim();
  }

  return snapshot.workflow_status === READING_STATUS.APPROVED ? "완료" : "-";
}

function formatTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date).replace(/\.\s?/g, "-").replace(/-$/, "") + " KST";
}

function loadManifest(rootDir = ROOT_DIR) {
  return loadJson(path.join(rootDir, "manifest", "readings.json")) || { readings: [] };
}

function collectApprovalRows(rootDir = ROOT_DIR) {
  const manifest = loadManifest(rootDir);
  const readings = Array.isArray(manifest.readings) ? manifest.readings : [];

  return sortReadings(readings).map((reading, index) => {
    const metaPath = path.join(rootDir, reading.content_dir, "meta.json");
    const existingMeta = loadJson(metaPath) || {};
    const snapshot = buildValidationSnapshot(rootDir, reading, existingMeta, {
      requireBuiltArtifacts: Boolean(existingMeta.validation_status?.require_built_artifacts),
    });

    return {
      sequence: index + 1,
      slug: reading.slug,
      title: toText(reading.title) || reading.slug,
      dateLabel: displayDate(reading),
      workflowStatus: snapshot.workflow_status,
      stage1Status: snapshot.validation_status?.stage1?.status || READING_STATUS.PARTIAL,
      stage2Status: snapshot.validation_status?.stage2?.status || READING_STATUS.PARTIAL,
      stage3Status: snapshot.validation_status?.stage3?.status || READING_STATUS.PARTIAL,
      landingStatusLabel: landingStatusLabel(snapshot),
      note: summarizeNote(snapshot),
    };
  });
}

function renderApprovalStatusReport(rows) {
  const approvedRows = rows.filter((row) => row.workflowStatus === READING_STATUS.APPROVED);
  const pendingRows = rows.filter((row) => row.workflowStatus !== READING_STATUS.APPROVED);
  const lines = [
    "# 읽기 승인 현황",
    "",
    "> 자동 생성 파일입니다. `node scripts/build_site.js`를 실행하면 함께 갱신됩니다.",
    "",
    `- 마지막 갱신: ${formatTimestamp()}`,
    `- 전체 읽기: ${rows.length}`,
    `- 승인 완료: ${approvedRows.length}`,
    `- 미승인/검토 필요: ${pendingRows.length}`,
    "",
    "## 승인 완료",
    "",
  ];

  if (!approvedRows.length) {
    lines.push("- 없음", "");
  } else {
    lines.push("| 순서 | 날짜 | slug | 제목 |", "| --- | --- | --- | --- |");
    approvedRows.forEach((row) => {
      lines.push(`| ${row.sequence} | ${escapeTable(row.dateLabel)} | ${escapeTable(row.slug)} | ${escapeTable(row.title)} |`);
    });
    lines.push("");
  }

  lines.push("## 미승인 / 검토 필요", "");

  if (!pendingRows.length) {
    lines.push("- 없음", "");
  } else {
    lines.push(
      "| 순서 | 날짜 | slug | 읽기 | Stage 1 | Stage 2 | Stage 3 | 랜딩/영상 | 메모 |",
      "| --- | --- | --- | --- | --- | --- | --- | --- | --- |"
    );
    pendingRows.forEach((row) => {
      lines.push(
        `| ${row.sequence} | ${escapeTable(row.dateLabel)} | ${escapeTable(row.slug)} | ${escapeTable(readingStatusLabel(row.workflowStatus))} | ${escapeTable(readingStatusLabel(row.stage1Status))} | ${escapeTable(readingStatusLabel(row.stage2Status))} | ${escapeTable(readingStatusLabel(row.stage3Status))} | ${escapeTable(row.landingStatusLabel)} | ${escapeTable(row.note)} |`
      );
    });
    lines.push("");
  }

  return `${lines.join("\n").replace(/\n+$/, "")}\n`;
}

function writeApprovalStatusReport(rootDir = ROOT_DIR) {
  const rows = collectApprovalRows(rootDir);
  const report = renderApprovalStatusReport(rows);
  writeText(path.join(rootDir, "APPROVAL_STATUS.md"), report);
  return { outputPath: OUTPUT_PATH, rows };
}

module.exports = {
  collectApprovalRows,
  renderApprovalStatusReport,
  writeApprovalStatusReport,
};

if (require.main === module) {
  const result = writeApprovalStatusReport(ROOT_DIR);
  console.log(`[written] ${path.relative(ROOT_DIR, result.outputPath)}`);
}
