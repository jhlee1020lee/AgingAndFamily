const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");

const correctionSets = [
  {
    slug: "vaupel-2010",
    replacements: [
      ["더 건강한 영양, 더 건전한 생활방식", "더 건강한 영양 섭취, 건강에 더 이로운 생활방식"],
      ["APOE의 크지 않은 효과보다 더 큰 효과를 지닌 것은 없고", "APOE의 크지 않은 효과만큼 큰 효과를 지닌 것은 없고"],
      ["더 건강한 인구는 생산성과 번영을 높인다.", "더 건강한 인구는 더 생산적이고 더 번영한다."],
      ["한 세기 전에는 100세 이상이 될 가능성이 두 자릿수 규모, 즉 약 100배 낮았다(그림 2).", "한 세기 전 100세 이상이 될 가능성은 현재의 약 100분의 1이었다(그림 2)."],
      ["오늘날 살아 있는 아동이 그 혜택을 볼 것이다28.", "그 혜택은 오늘날 살아 있는 아동에게 돌아갈 수 있다28."],
    ],
  },
  {
    slug: "stine-morrow-2007",
    replacements: [
      ["즉 정신 역학의 쇠퇴", "즉 인지 역학(mental mechanics)의 쇠퇴"],
      ["“정신 역학”인", "“인지 역학”인"],
      ["음성 피드백 고리", "음의 피드백 고리"],
      ["전문 수행 연구", "전문가 수행 연구"],
      ["표 형식의 Box 1에", "Box 1에"],
      ["기술 발달을 위한 주의 관여를 연습할 기회", "기술을 발달시키기 위해 주의 관여를 발휘할 기회"],
      ["실질적으로 복잡한 환경", "실질적 복잡성이 높은 환경"],
      ["필요할 때 구성 기술을 자기주도적으로 사용하도록", "필요할 때 요소 기술을 자기주도적으로 사용하도록"],
    ],
  },
];

function replaceAll(text, source, target) {
  return text.split(source).join(target);
}

function editableFiles(slug) {
  const contentDir = path.join(ROOT_DIR, "content", "readings", slug);
  return fs.readdirSync(contentDir)
    .filter((name) => name.endsWith(".md") || name.endsWith(".json"))
    .map((name) => path.join(contentDir, name));
}

for (const correctionSet of correctionSets) {
  const files = editableFiles(correctionSet.slug);
  let slugChanges = 0;
  for (const [source, target] of correctionSet.replacements) {
    let sourceCount = 0;
    let targetCount = 0;
    for (const filePath of files) {
      const text = fs.readFileSync(filePath, "utf8");
      sourceCount += text.split(source).length - 1;
      targetCount += text.split(target).length - 1;
    }
    if (sourceCount === 0) {
      if (targetCount === 0) {
        throw new Error(`${correctionSet.slug}: neither source nor corrected wording found: ${source}`);
      }
      continue;
    }
    for (const filePath of files) {
      const text = fs.readFileSync(filePath, "utf8");
      if (!text.includes(source)) {
        continue;
      }
      const revised = replaceAll(text, source, target);
      fs.writeFileSync(filePath, revised, "utf8");
    }
    slugChanges += sourceCount;
  }
  console.log(`[corrected] ${correctionSet.slug}: ${slugChanges} occurrence(s)`);
}
