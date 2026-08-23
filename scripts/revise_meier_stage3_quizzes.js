const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const READING_DIR = path.join(ROOT, "content", "readings", "meier-et-al-2016");

function readJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(READING_DIR, filename), "utf8"));
}

function writeJson(filename, value) {
  fs.writeFileSync(path.join(READING_DIR, filename), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const shortQuiz = readJson("quiz_short.json");
shortQuiz.items = [
  {
    question: "문헌검색에 사용한 두 서지 데이터베이스는?",
    accepted_answers: ["PubMed와 PsycINFO", "PubMed, PsycINFO"],
    answer_type: "term",
    explanation: "저자들은 PubMed와 PsycINFO를 개설 시점부터 정해진 종료시점까지 검색했다.",
    evidence_segment_id: "METHOD-DATA-001",
    source: "Meier et al. (2016)"
  },
  {
    question: "제목·초록 선별 뒤 전문검토 대상으로 남은 논문 수는?",
    accepted_answers: ["392편", "392"],
    answer_type: "number",
    explanation: "최초 검색결과에서 주제와 무관한 문헌 등을 제외한 뒤 392편의 전문을 검토했다.",
    evidence_segment_id: "METHOD-SELECTION-001",
    source: "Meier et al. (2016)"
  },
  {
    question: "합의 절차가 시작될 때 마련된 초기 주제 수는?",
    accepted_answers: ["38개", "38"],
    answer_type: "number",
    explanation: "코더들은 처음 38개 주제에서 출발해 세 저자의 합의로 11개 핵심주제로 좁혔다.",
    evidence_segment_id: "METHOD-CODING-001",
    source: "Meier et al. (2016)"
  },
  {
    question: "최종 코딩틀을 만들기 전에 두 코더가 연 합의회의 횟수는?",
    accepted_answers: ["4회", "네 차례", "4차례"],
    answer_type: "number",
    explanation: "두 코더는 불일치를 해결하며 네 차례 합의회의를 거쳐 최종 코딩틀을 만들었다.",
    evidence_segment_id: "METHOD-CODING-001",
    source: "Meier et al. (2016)"
  },
  {
    question: "독립 평정자 간 신뢰도로 보고된 카파 계수는?",
    accepted_answers: ["0.896"],
    answer_type: "number",
    explanation: "두 독립 코더의 일치도는 kappa = 0.896으로 보고됐다.",
    evidence_segment_id: "METHOD-CODING-001",
    source: "Meier et al. (2016)"
  },
  {
    question: "PRISMA 전문검토에서 중복 논문으로 제외된 건수는?",
    accepted_answers: ["51편", "51건", "51"],
    answer_type: "number",
    explanation: "전문검토 제외 사유 중 duplicate articles는 51건으로 인쇄돼 있다.",
    evidence_segment_id: "METHOD-CODING-001",
    source: "Meier et al. (2016)"
  },
  {
    question: "환자·가족·HCP 관점에 기여한 논문 수를 순서대로 쓰면?",
    accepted_answers: ["20·10·18편", "20, 10, 18", "20편, 10편, 18편"],
    answer_type: "short_phrase",
    explanation: "관점별 분모는 환자 20편, 사별 전후 가족 10편, HCP 18편이며 한 논문이 여러 관점에 기여할 수 있다.",
    evidence_segment_id: "METHOD-CODING-001",
    source: "Meier et al. (2016)"
  },
  {
    question: "둘 이상의 관점집단에 기여한 고유 논문은 몇 편인가?",
    accepted_answers: ["7편", "7"],
    answer_type: "number",
    explanation: "두 관점에 기여한 2편과 세 관점 모두에 기여한 5편을 합친 고유 논문 수다.",
    evidence_segment_id: "METHOD-CODING-001",
    source: "Meier et al. (2016)"
  },
  {
    question: "질적·양적·혼합방법 연구 수를 순서대로 쓰면?",
    accepted_answers: ["27·5·4편", "27, 5, 4", "27편, 5편, 4편"],
    answer_type: "short_phrase",
    explanation: "최종 36편은 질적 27편, 양적 5편, 혼합방법 4편으로 구성됐다.",
    evidence_segment_id: "METHOD-SELECTION-001",
    source: "Meier et al. (2016)"
  },
  {
    question: "양적·혼합방법 연구에서 표준도구와 자체도구를 쓴 논문 수는 각각?",
    accepted_answers: ["3편과 6편", "3·6편", "3, 6"],
    answer_type: "short_phrase",
    explanation: "해당 9편 중 3편은 표준화 도구를, 6편은 자체 개발 도구를 사용했다.",
    evidence_segment_id: "METHOD-SELECTION-001",
    source: "Meier et al. (2016)"
  },
  {
    question: "최종 포함 연구가 출판된 연도 범위는?",
    accepted_answers: ["1996–2015년", "1996-2015년", "1996년부터 2015년"],
    answer_type: "short_phrase",
    explanation: "포함된 36편의 출판연도는 1996년부터 2015년까지였다.",
    evidence_segment_id: "RESULTS-SAMPLE-001",
    source: "Meier et al. (2016)"
  },
  {
    question: "각 핵심주제를 구성한 하위주제 수의 범위는?",
    accepted_answers: ["2–4개", "2-4개", "2개에서 4개"],
    answer_type: "short_phrase",
    explanation: "11개 핵심주제는 각각 2개에서 4개의 하위주제로 구성됐다.",
    evidence_segment_id: "RESULTS-THEMES-001",
    source: "Meier et al. (2016)"
  },
  {
    question: "환자 관점 논문 중 60세 초과자를 포함한 논문의 비율은?",
    accepted_answers: ["50%", "절반"],
    answer_type: "short_phrase",
    explanation: "이 값은 전체 개인 중 고령자 비율이 아니라 환자 관점 논문 20편을 분모로 한 논문 수준 비율이다.",
    evidence_segment_id: "RESULTS-SAMPLE-001",
    source: "Meier et al. (2016)"
  },
  {
    question: "가족 관점에서 지지율 70% 이상이었던 핵심주제는 몇 개인가?",
    accepted_answers: ["8개", "8"],
    answer_type: "number",
    explanation: "가족 관점 논문에서는 11개 핵심주제 중 8개가 70% 이상이었다.",
    evidence_segment_id: "RESULTS-THEMES-001",
    source: "Meier et al. (2016)"
  },
  {
    question: "각 논문의 구체적 정보를 저장한 프로그램은?",
    accepted_answers: ["Excel", "엑셀"],
    answer_type: "term",
    explanation: "선정된 각 논문의 구체적 정보는 Excel 데이터베이스에 저장했다.",
    evidence_segment_id: "METHOD-SELECTION-001",
    source: "Meier et al. (2016)"
  }
];
writeJson("quiz_short.json", shortQuiz);

const mcqQuiz = readJson("quiz-mcq.json");
mcqQuiz.items = [
  {
    prompt: "이 종설이 직접 답하려 한 중심 질문은?",
    options: [
      "호스피스와 일반병동의 생존기간 차이가 질병별로 얼마나 큰가",
      "하나의 표준화된 척도가 모든 문화권과 질병집단의 임종 만족도를 일관되게 정확히 예측하는가",
      "환자·가족·HCP가 좋은 죽음을 어떻게 정의하며 관점별 공통점과 차이는 무엇인가",
      "좋은 죽음에 관한 공개 대화가 의료비와 사망장소를 인과적으로 바꾸는가"
    ],
    answer: "환자·가족·HCP가 좋은 죽음을 어떻게 정의하며 관점별 공통점과 차이는 무엇인가",
    explanation: "저자들은 세 이해관계자가 명시적으로 제시한 좋은 죽음의 정의를 모아 핵심주제와 관점 차이를 검토했다.",
    evidence_segment_id: "INTRO-001",
    source: "Meier et al. (2016)",
    difficulty: "easy"
  },
  {
    prompt: "좋은 죽음과 죽음과 죽어감의 질을 가장 정확히 구분한 것은?",
    options: [
      "좋은 죽음은 사망장소만 뜻하고, 후자는 통증을 측정한 생물학적 지표만 뜻한다",
      "두 용어는 이 논문에서 완전히 같은 결과변수이며 문헌선정에도 아무 차이가 없다",
      "좋은 죽음은 가족의 사후평가이고, 후자는 HCP가 사전에 정한 치료목표만 뜻한다",
      "좋은 죽음은 바람직한 임종의 구성, 후자는 선호와 실제 죽음의 일치 정도다"
    ],
    answer: "좋은 죽음은 바람직한 임종의 구성, 후자는 선호와 실제 죽음의 일치 정도다",
    explanation: "이 종설은 두 개념을 구분하고 이해관계자가 구체적으로 정의한 좋은 죽음에 초점을 맞췄다.",
    evidence_segment_id: "INTRO-001",
    source: "Meier et al. (2016)",
    difficulty: "medium"
  },
  {
    prompt: "이 종설의 포함기준에 가장 잘 맞는 연구는?",
    options: [
      "영어 동료심사 경험연구로 좋은 죽음을 주된 결과로 정의·측정한 논문",
      "좋은 죽음을 정의하지 않고 말기돌봄 서비스 이용량만 기술한 품질관리 보고서",
      "안락사 태도만 조사하고 좋은 죽음이나 성공적 죽음을 결과로 다루지 않은 연구",
      "자료 없이 좋은 죽음의 철학적 의미를 논평한 편집자 서신"
    ],
    answer: "영어 동료심사 경험연구로 좋은 죽음을 주된 결과로 정의·측정한 논문",
    explanation: "양적 또는 질적 자료가 좋은 죽음을 구체적으로 정의하거나 측정해야 했고 영어 동료심사 논문이어야 했다.",
    evidence_segment_id: "METHOD-SELECTION-001",
    source: "Meier et al. (2016)",
    difficulty: "easy"
  },
  {
    prompt: "양적·혼합방법 연구에서 사용된 표준화된 좋은 죽음 도구 세 개를 옳게 묶은 것은?",
    options: [
      "Quality of Death and Dying 점수·죽음불안 척도·호스피스 만족도 척도",
      "삶의 질 단축형·우울 척도·통증 숫자평정척도",
      "Preferences about Death and Dying·Concept of a Good Death·Good Death Inventory",
      "Advance Directive Checklist·Family Burden Index·Staff Comfort Scale"
    ],
    answer: "Preferences about Death and Dying·Concept of a Good Death·Good Death Inventory",
    explanation: "이 세 도구가 표준화된 측정으로 열거됐고 다른 연구들은 자체 양적 도구를 개발했다.",
    evidence_segment_id: "METHOD-SELECTION-001",
    source: "Meier et al. (2016)",
    difficulty: "medium"
  },
  {
    prompt: "좋은 죽음의 정의 항목이 확정된 핵심주제에 맞지 않을 때의 코딩은?",
    options: [
      "가장 비슷한 기존 주제에 두 코더가 각각 임시 배치했다",
      "‘기타’ 핵심주제에 배치했다",
      "세 번째 저자가 열두 번째 핵심주제를 새로 만들었다",
      "해당 정의만 버리고 그 논문은 다른 분석에 남겼다"
    ],
    answer: "‘기타’ 핵심주제에 배치했다",
    explanation: "두 코더는 각 정의를 11개 주제에 대응시켰고 어느 주제에도 맞지 않는 항목은 Other에 넣었다.",
    evidence_segment_id: "METHOD-CODING-001",
    source: "Meier et al. (2016)",
    difficulty: "medium"
  },
  {
    prompt: "코딩된 세 관점의 자료원을 원문에 맞게 연결한 것은?",
    options: [
      "환자는 진행성 암과 만성질환만, 가족은 사별 후만, HCP는 의사·간호사·사회복지사·영적 상담자",
      "환자는 진행성 암·HIV/AIDS·일반인구, 가족은 사별 전만, HCP는 의사·간호사와 병원 관리자",
      "환자는 진행성 암·만성질환·HIV/AIDS·일반인구, 가족은 사별 전후, HCP는 의사와 간호사만",
      "환자는 진행성 암·만성질환·HIV/AIDS·일반인구, 가족은 사별 전후, HCP는 여러 돌봄직종"
    ],
    answer: "환자는 진행성 암·만성질환·HIV/AIDS·일반인구, 가족은 사별 전후, HCP는 여러 돌봄직종",
    explanation: "환자집단에는 네 범주가, 가족에는 사별 전후가, HCP에는 의사·간호사·사회복지사·영적 상담자가 포함됐다.",
    evidence_segment_id: "METHOD-CODING-001",
    source: "Meier et al. (2016)",
    difficulty: "hard"
  },
  {
    prompt: "저자들이 공식 메타분석과 연구별 가중치를 사용하지 않은 이유는?",
    options: [
      "양적 연구의 결과 방향이 같아 효과크기 차이를 다시 통합할 필요가 없었기 때문에",
      "연구별 정보·평가방법이 이질적이고 질적·양적 연구를 함께 묶었기 때문에",
      "관점별 주제 빈도가 보고되지 않아 비가중 집계조차 계산할 수 없었기 때문에",
      "아홉 양적·혼합연구가 같은 척도를 썼지만 표본 수가 작아 통계통합을 보류했기 때문에"
    ],
    answer: "연구별 정보·평가방법이 이질적이고 질적·양적 연구를 함께 묶었기 때문에",
    explanation: "연구 간 정보와 방법 차이 때문에 정식 메타분석이 불가능했고, 질적·양적 연구를 함께 다뤄 가중하지 않았다.",
    evidence_segment_id: "METHOD-ANALYSES-001",
    source: "Meier et al. (2016)",
    difficulty: "medium"
  },
  {
    prompt: "포함 연구의 환자 연령정보를 원문 범위에 맞게 해석한 것은?",
    options: [
      "범위는 14–93세였고 일부 연구가 평균 대신 범위만 보고해 요약 연령이 치우쳤을 수 있다",
      "범위는 14–93세였고 범위만 보고한 연구를 제외했으므로 평균 89.7세에는 편향 가능성이 없다",
      "범위는 14–93세였으며 50%라는 값은 전체 개인 중 60세 초과자의 비율을 뜻한다",
      "범위는 30–93세였고 표본크기 가중 평균으로 연구 간 보고방식 차이를 모두 조정했다"
    ],
    answer: "범위는 14–93세였고 일부 연구가 평균 대신 범위만 보고해 요약 연령이 치우쳤을 수 있다",
    explanation: "일부 논문이 평균 대신 범위만 보고해 저자들은 연령 요약이 어느 정도 치우쳤다고 경고했다.",
    evidence_segment_id: "RESULTS-SAMPLE-001",
    source: "Meier et al. (2016)",
    difficulty: "hard"
  },
  {
    prompt: "‘치료 선호’ 핵심주제의 하위내용만으로 묶인 것은?",
    options: [
      "생명 연장하지 않기·가능한 치료를 모두 했다는 믿음·치료 통제·안락사/의사조력자살",
      "작별하기·잘 살아온 삶·다가오는 죽음의 수용",
      "정서적 지지·심리적 편안함·죽음의 의미를 이야기할 기회",
      "가족 지지·가족의 죽음 수용·가족의 준비·부담이 되지 않기"
    ],
    answer: "생명 연장하지 않기·가능한 치료를 모두 했다는 믿음·치료 통제·안락사/의사조력자살",
    explanation: "나머지 선택지는 각각 삶의 완결, 정서적 안녕, 가족 주제의 하위내용이다.",
    evidence_segment_id: "RESULTS-THEMES-001",
    source: "Meier et al. (2016)",
    difficulty: "easy"
  },
  {
    prompt: "표 3의 ‘환자 삶의 질 35%’를 올바르게 읽은 것은?",
    options: [
      "환자 관점 연구의 모든 개인응답을 합쳐 삶의 질을 고른 사람 비율을 표본크기로 보정한 값이다",
      "전체 36편 중 환자 관점에만 코딩된 논문의 비율을 뜻한다",
      "삶의 질을 보고한 일곱 연구의 개인 응답률을 표본크기와 연구설계로 가중한 평균이다",
      "환자 관점을 포함한 20편 중 삶의 질 주제가 등장한 7편의 논문 수준 비율이다"
    ],
    answer: "환자 관점을 포함한 20편 중 삶의 질 주제가 등장한 7편의 논문 수준 비율이다",
    explanation: "관점별 백분율은 개인 응답률이나 효과크기가 아니라 해당 관점 논문에서 주제가 등장한 비가중 비율이다.",
    evidence_segment_id: "RESULTS-STAKEHOLDERS-001",
    source: "Meier et al. (2016)",
    difficulty: "hard"
  },
  {
    prompt: "세 이해관계자가 가장 강하게 수렴한 주제쌍은?",
    options: [
      "정서적 안녕과 존엄성: 환자 60/55%, 가족 70/70%, HCP 67/67%",
      "가족과 삶의 완결: 환자 55/55%, 가족 70/80%, HCP 61/56%",
      "임종 과정 선호와 통증 없는 상태: 환자 100/85%, 가족 100/90%, HCP 94/83%",
      "종교성·영성과 치료 선호: 환자 65/55%, 가족 50/70%, HCP 59/61%로 관점별 순위가 비슷했다"
    ],
    answer: "임종 과정 선호와 통증 없는 상태: 환자 100/85%, 가족 100/90%, HCP 94/83%",
    explanation: "임종 과정 선호는 환자·가족·HCP에서 100·100·94%, 통증 없는 상태는 85·90·83%로 모두 83% 이상이었다.",
    evidence_segment_id: "RESULTS-STAKEHOLDERS-001",
    source: "Meier et al. (2016)",
    difficulty: "medium"
  },
  {
    prompt: "가족 70%, 환자 35%로 나타난 삶의 질 차이를 해석한 것은?",
    options: [
      "가족자료가 모두 사별 전 자료였으므로 환자와 같은 시점의 선호를 더 정확히 측정했다",
      "가족자료의 사별 후 회고와 두 집단의 삶의 질 정의 차이 가능성 때문에 우월한 대리판단으로 단정할 수 없다",
      "개인응답을 표본크기로 가중한 차이이므로 관점의 인과효과를 직접 추정한 값이다",
      "HCP 관점도 70%였으므로 가족과 HCP가 일치하고 환자만 예외였다는 뜻이다"
    ],
    answer: "가족자료의 사별 후 회고와 두 집단의 삶의 질 정의 차이 가능성 때문에 우월한 대리판단으로 단정할 수 없다",
    explanation: "가족 연구 대부분은 사별 후 회고였고 저자들은 두 관점의 정의가 다를 가능성을 남겨 확정적 추론을 피했다.",
    evidence_segment_id: "DISCUSSION-CONSENSUS-001",
    source: "Meier et al. (2016)",
    difficulty: "hard"
  },
  {
    prompt: "환자 55%, 가족 70%로 나타난 존엄성 결과의 적절한 해석은?",
    options: [
      "표본가중 통계검정이 유의했으므로 환자가 존엄성을 덜 중시한다고 일반화할 수 있다",
      "차이는 호스피스의 영적 상담자 이용 가능성만으로 설명되며 존엄성 정의와는 무관하다",
      "가족은 모두 사별 전, 환자는 모두 사별 후 조사되어 측정시점이 차이를 만들었다",
      "정의가 다른 주제에 흡수되거나 환자가 표현하기 어려웠을 수 있어 중요도가 낮다고 단정할 수 없다"
    ],
    answer: "정의가 다른 주제에 흡수되거나 환자가 표현하기 어려웠을 수 있어 중요도가 낮다고 단정할 수 없다",
    explanation: "저자들은 15%포인트 차이를 환자의 낮은 가치로 해석하지 않고 개념 다양성과 표현 가능성을 논의했다.",
    evidence_segment_id: "DISCUSSION-DIGNITY-001",
    source: "Meier et al. (2016)",
    difficulty: "hard"
  },
  {
    prompt: "이 종설의 한계를 원문대로 묶은 것은?",
    options: [
      "공통척도 부재·불완전한 응답자 특성·사별 전 가족의 부족·HCP 직종과 훈련정보의 부족",
      "공통척도의 일관된 사용·불완전한 응답자 특성·사별 전 가족의 부족·HCP 직종정보의 부족",
      "공통척도 부재·충분한 인구학 정보·사별 전 가족의 부족·HCP 훈련정보의 부족",
      "공통척도 부재·불완전한 응답자 특성·사별 전 가족의 충분한 대표·HCP 직종별 완전한 구분"
    ],
    answer: "공통척도 부재·불완전한 응답자 특성·사별 전 가족의 부족·HCP 직종과 훈련정보의 부족",
    explanation: "측정과 표본 보고의 이질성, 사별 전 가족의 과소대표, HCP 세분정보 부족이 비교와 통계검정을 제약했다.",
    evidence_segment_id: "DISCUSSION-LIMITATIONS-001",
    source: "Meier et al. (2016)",
    difficulty: "medium"
  },
  {
    prompt: "논문의 실천적 행동 촉구를 가장 충실히 옮긴 것은?",
    options: [
      "11개 평균 주제를 초기 지침으로 쓰되 개인에게 다시 묻지 않고 관점별 다수값만으로 우선순위를 자동 결정한다",
      "선호가 안정되는 임종 직전까지 죽음 대화를 미루고 그때 가족과 HCP가 치료목표를 함께 결정한다",
      "죽음 대화를 열고 환자 가치를 직접 확인하며 가족·HCP와 조율해 개인화하되 환자 관점을 중심에 둔다",
      "표준화 도구가 완성될 때까지 임상 대화와 실시간 돌봄 조정은 연구영역과 분리해 보류한다"
    ],
    answer: "죽음 대화를 열고 환자 가치를 직접 확인하며 가족·HCP와 조율해 개인화하되 환자 관점을 중심에 둔다",
    explanation: "저자들은 공개 대화와 이해관계자 간 소통을 촉구하면서 개인별 필요와 환자가 직접 밝힌 관점을 강조했다.",
    evidence_segment_id: "FUTURE-001",
    source: "Meier et al. (2016)",
    difficulty: "hard"
  }
];
writeJson("quiz-mcq.json", mcqQuiz);

const positions = mcqQuiz.items.map((item) => item.options.indexOf(item.answer) + 1).join("");
if (positions !== "341324211432413") {
  throw new Error(`Unexpected MCQ answer-position sequence: ${positions}`);
}

console.log(`[updated] meier quiz_short.json (${shortQuiz.items.length} items)`);
console.log(`[updated] meier quiz-mcq.json (${mcqQuiz.items.length} items; positions ${positions})`);
