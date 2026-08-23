const fs = require("fs");
const path = require("path");

const targetPath = path.resolve(__dirname, "..", "content", "readings", "settersten-godlewski-2016", "translation.md");

function replaceBoundary(text, name, oldSeparator, newSeparator) {
  if (text.includes(newSeparator)) return text;
  const matches = text.split(oldSeparator).length - 1;
  if (matches !== 1) throw new Error(`${name}: expected one source boundary, found ${matches}`);
  return text.replace(oldSeparator, newSeparator);
}

let text = fs.readFileSync(targetPath, "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");

const proxyHeading = "### 지위와 경험의 대리변수로서의 연령";
const declineParagraph = "그러나 대개 연령은 여러 영역(예: 인지건강 또는 신체건강)의 쇠퇴나 위험을 가져오는 것으로 설정된다. 얼마 전 수석저자는 몇 가지 건강 증상을 의사에게 말했을 때 의사가 “글쎄요, 그 나이에는 무엇을 기대하십니까?”라고 답했던 일을 통해 이를 다시 떠올렸다.";
const proxyParagraphStart = "생활연령은 오래전부터 ‘내용이 빈’ 독립변수로 인식되어 왔다.";
text = replaceBoundary(
  text,
  "age-as-proxy heading placement",
  `${proxyHeading}\n\n${declineParagraph}\n\n${proxyParagraphStart}`,
  `${declineParagraph}\n\n${proxyHeading}\n\n${proxyParagraphStart}`
);

const stereotypePrevious = "여기서 연령은 부정적 고정관념에 노출된 경험의 축적을 뜻하고, 그 결과 내면화 가능성이 커진다.";
const stereotypeMovedStart = "노화에 관한 개인적 고정관념은 후기 성인기의 신체건강·인지건강·정신건강 결과와 관련된다.";
const stereotypeMovedEnd = "오랜 세월 노화에 대해 부정적인 개인 신념을 지녀 왔거나 그러한 고정관념을 강화하는 환경에 사는 사람은 기억기능이 더 나쁘고 불안, 심장사건, 자살사고, 외상후스트레스장애 같은 건강문제를 경험할 가능성이 더 크다(Horton, Baker, Pearce, & Deakin, 2008; Levy, Pilver, & Pietrzak, 2014).";
const stereotypeNext = "노화 고정관념 중 많은 것은 부정적이지만 반드시 그래야 하는 것은 아니다.";
text = replaceBoundary(text, "stereotype boundary start", `${stereotypePrevious} ${stereotypeMovedStart}`, `${stereotypePrevious}\n\n${stereotypeMovedStart}`);
text = replaceBoundary(text, "stereotype boundary end", `${stereotypeMovedEnd}\n\n${stereotypeNext}`, `${stereotypeMovedEnd} ${stereotypeNext}`);

const culturePrevious = "연령의 개념과 이론은 이와 마찬가지로 문화에도 민감해야 한다.";
const cultureMovedStart = "대부분의 문화와 사회에는 연령, 연령시기, 생애과정 전체를 이해하는 자체의 틀이 있지만, 이 틀에 관해서는 알려진 바가 거의 없다.";
const cultureMovedEnd = "연구자들은 모든 환경에서 노년기가 생애에서 가장 바람직하지 않은 시기라는 점을 발견했지만, 생계가 건강과 활력에 의해 그만큼 크게 좌우되지 않고 독립성을 유지할 수 있는 문화에서 가장 덜 부정적인 평가가 나타났다.";
const cultureNext = "사회참여의 기준으로서 연령은 서로 다른 연령의 사람들 사이 공식적·비공식적 상호작용 규범과 관련된다.";
text = replaceBoundary(text, "Project AGE boundary start", `${culturePrevious}\n\n${cultureMovedStart}`, `${culturePrevious} ${cultureMovedStart}`);
text = replaceBoundary(text, "Project AGE boundary end", `${cultureMovedEnd} ${cultureNext}`, `${cultureMovedEnd}\n\n${cultureNext}`);

fs.writeFileSync(targetPath, text.endsWith("\n") ? text : `${text}\n`, "utf8");
console.log("[translation-boundaries] verified and applied");
