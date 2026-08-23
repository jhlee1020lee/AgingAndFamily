# Stage 3 Work Log - lee-yeung-2021

## Authority and scope

- 내용 근거는 기존 승인된 `full.md`, `source_segments.json`, `translation.md`, `translation_segments.json`, `translation_alignment.json`으로 제한했다.
- `REF-001` 참고문헌 세그먼트, 과거 과목 자료, 강의 녹음·STT, 사적 메모, 외부 검색결과는 학습 콘텐츠의 사실 근거로 사용하지 않았다.
- 승인된 Stage 1·2 파일과 `meta.json`, manifest, 공개 `docs`는 수정하지 않았다.
- Stage 3 순서에 따라 `summary.md`, `concepts.md`, `pitfalls.md`, `review-sheet.md`, `professor_prep.json`, `quiz-ox.json`, `quiz_short.json`, `quiz-mcq.json`을 새로 작성했다.

## Learning package construction

1. `summary.md`를 연구질문·이론, 한국 맥락, 여섯 가설, 표본, 측정, 모형, 기술통계, 젠더 상호작용, 여성·남성 결과, 논의·한계·정책 순으로 구성했다.
2. `concepts.md`에 과정으로서의 은퇴, 생애과정, 누적적 사회계층화, 이탈, 재진입, 비흡수상태, 직업력, 근접 관련요인, 상향이전, 자녀동거, 다층 이산시간 모형, 연계 무작위효과, 젠더 상호작용, 오즈비, 우측절단·FIML, 젠더화된 은퇴 경로의 16개 개념을 작성했다.
3. `pitfalls.md`에 사건·과정, 이탈·재진입, 개인·인년 분모, 가설·결과, 집단별 유의성·상호작용, 계수·오즈비·확률, 회귀결과·논의 기제, 정책 권고·검증효과를 구분하는 19개 대비를 작성했다.
4. `review-sheet.md`를 20초 요약, 결과변수, 가설 지도, 표본·분모, 측정·모형, 기술통계, 상호작용, 여성 결과, 남성 결과, 논의·한계, 서술형 골격으로 압축했다.
5. 교수식 핵심 카드 15개와 읽기 응답 카드 6개, OX·단답·객관식 각 15문항을 작성했다.

## Single-segment evidence audit

- 교수 카드 15개 + 읽기 응답 6개 + 퀴즈 45개 = 66개 레코드가 각각 `evidence_segment_id`를 정확히 하나만 가진다.
- 66개 ID를 승인된 `source_segments.json`의 23개 실제 ID와 대조해 **66/66 존재, 잘못된 ID 0개**를 확인했다.
- 각 카드의 질문과 `answer_30s`, 각 퀴즈의 문항·정답·해설을 지정 세그먼트 하나만으로 판정할 수 있도록 범위를 줄였다. 객관식 오답도 같은 세그먼트의 범주·수치·방향을 변형해 외부 근거가 필요하지 않게 했다.
- `META-001`, `KEY-001`, `BACK-001`, `REF-001`은 평가 레코드의 사실 근거로 사용하지 않았다.
- 교수 카드 15개는 각각 연구목적, 한국 맥락, 가설, 표본, 결과변수, 설명변수, 모형, 기술통계, 상호작용, 여성 결과, 남성 결과, 직업력 논의, 가족·불평등 논의, 한계, 정책 함의를 한 세그먼트씩 담당한다.
- 읽기 응답 6개도 개인적 반응 뒤에 붙는 수치·이유·해석이 각각 `INTRO-001`, `CONTEXT-001`, `DATA-001`, `RESULTS-WOMEN-001`, `DISCUSSION-001`, `LIMITATIONS-001` 하나에서 완결되게 했다.

## Numerical, denominator, and attribution discipline

- 표본연령 `50–64 → 60–74`, 무유급노동 경험자 제외가 아니라 **생애 유급노동 경험 없음 `n=1,295` 제외**, 결측 노동상태 `14.3%` 제외, 관측 손실 중 사망 약 `14%`를 구분했다.
- 최종 `n=2,600`은 남성 `1,579`와 여성 `1,021`이고 총 `26,520인년`이다.
- 전체 표본의 계속 취업 약 `29%`, 조사 전 이탈 뒤 추적 중 재진입 약 `36%`, 상태변화 위험집단의 복수 전환 약 `27%`를 서로 다른 경로·조건부 분모로 표시했다.
- 여성 상태변화율 `.20/.16/.25`와 인년 `10,414/6,528/3,886`, 남성 `.14/.13/.16`과 `16,106/12,301/3,805`를 전체·취업·비취업 순으로 보존했다. 여성 이탈 `16%`·재진입 `25%`, 남성 이탈 `13%`·재진입 `16%`는 상태별 인년 기술통계임을 명시했다.
- 젠더 상호작용 다섯 개 `−0.02 p<.001`, `−0.03 p<.05`, `−0.38 p<.01`, `−0.28 p<.01`, `+0.44 p<.05`의 결과변수와 방향을 따로 적었다. 젠더 코딩 `0=여성, 1=남성`을 유지하고 `+0.44`를 남성의 유의한 정적 주효과로 해석하지 않았다.
- 여성 결과에서는 무배우 여성의 이탈 오즈 약 `39%` 감소, 미혼 자녀 동거의 이탈 오즈 `42%` 증가, 자산과 재진입 `e^(−.11)=.90`, `ρ=.49`를 각각 준거집단·방향·지표유형과 함께 제시했다.
- 남성 결과에서는 농업직 이탈 `e^(−.39)=.68`, 근속기간과 재진입 `e^(−.02)=.98`, 자영업연수와 이탈 `e^(−.03)=.97`, 취업 배우자와 이탈 약 `22%` 감소, `ρ=.44`를 분리했다.
- 여성 연금수급 자격, 여성 직업계층·자영업연수, 남성 전문직·비숙련 육체노동직, 남성 순자산·혼인 해체·상향이전의 비유의 결과를 유의한 효과로 바꾸지 않았다.
- 결과표의 조정된 관련성, 논의에서 제시한 누적적 불이익·생계부양자 정체성·자영업 기제, 저자들이 밝힌 코호트·비재정적 기제 한계, 정책 권고를 서로 다른 증거수준으로 표시했다. 관찰연구의 관련성을 인과효과로 강화하지 않았다.

## Question-set separation and balance

- OX 정답 순서는 `OXOOXOXXOOXXOXO`, O 8개 / X 7개다. 표본 성별, BOAP 자격, 연금 비유의, 이전액 기준시점, 상호작용 방향, 직업범주 비유의, 코호트 한계를 서로 다른 방식으로 변형했다. 최장 연속은 2개이고 길이 5 이상 반복 부분열은 없다.
- 단답형 15문항의 모든 허용정답은 7단어 이하이고 정규화한 질문에 허용정답 문자열이 노출된 사례는 0개다.
- 객관식 정답 위치 순서는 `212441134332231`; A/B/C/D = `4/4/4/3`이다.
- 객관식 정답 길이순위는 `113122344324214`; 최장/둘째/셋째/최단 = `4/4/3/4`다. 두 열 모두 최장 연속 2개, 네 기호 완전순열 창 0개, 반복 bigram·trigram 0개다.
- 위치×길이순위 4×4 표는 `(위치 4, 길이순위 3)` 한 셀만 0이고 나머지 15개 셀이 각각 1회다(`χ²=.9375`, Cramér's `V=.1443376`). 네 선택지마다 정답 문자열은 정확히 한 번만 나타나며 위치와 길이 단서가 사실상 분리됐다.
- 객관식 1–9번은 easy/medium, 10–15번은 hard로 난이도 구간을 유지했다.
- 세 퀴즈 형식의 질문·정답·해설을 토큰 Jaccard로 교차 비교한 결과 검토 기준 `0.22` 이상인 조합은 0개였다. OX의 상향이전 해설에서 단답 11의 정답을, 객관식 8의 해설에서 단답 10의 정답을 노출하던 부분도 제거했다.

## Schema and alignment validation

- `node scripts/validate_content.js --slug lee-yeung-2021 --source-only --json`: Stage 3 여덟 페이지 모두 **schema_pass**, 오류 0, 콘텐츠 경고 0.
- Summary: 1,352 words / 13 sections / 72 bullets.
- Concepts: 1,385 words / 16 concepts / 필수 여섯 필드 96개.
- Pitfalls: 951 words / 19 contrast sections / 명시적 대비 라벨 57개.
- Review sheet: 최종 문구 교정 전후 동일한 11개 section 구조를 유지했고, placeholder·미해결 조사 템플릿은 0개다.
- Professor preparation: 15 core + 6 reading-response cards.
- Quiz: OX 15 + short 15 + MCQ 15, evidence ID 45/45.
- `node scripts/check-alignment.js --slug lee-yeung-2021 --strict`: **PASS 23/23**.
- 최종 독립감사 전 source-only 검증 상태는 예상대로 `manual_review_required`였고, 작성자가 자체 승인하지 않았다.

## Isolated full-preview checks

- slug를 지정하지 않은 `node scripts/build_site.js --preview-locked --preview-draft --output-dir tmp/lee-stage3-final-preview-20260823-r4`로 최종 독립감사 대상 전체 사이트를 공개 경로 밖에 새로 격리 빌드했다.
- `node scripts/check_rendered_reveals.js --slug lee-yeung-2021 --site-dir tmp/lee-stage3-final-preview-20260823-r4`: **PASS 117/117 block reveals, 372 sentence reveals**.
- `node scripts/check_site_links.js --site-dir tmp/lee-stage3-final-preview-20260823-r4`: **PASS 243 HTML files, 6,184 local targets, no private paths or chatbot**.
- 최종 격리 미리보기의 HTML·JavaScript·CSS를 대상으로 챗봇 표식, 독립 단어 STT, 강의 녹음, 녹음본·전사본, speech-to-text, 개발 PC 절대경로를 검사해 0건을 확인했다.
- 이 격리 미리보기 단계에서는 공개 `docs` 빌드, 승인, 배포, 커밋을 수행하지 않았다.

## Content hashes (SHA-256)

- `full.md`: `C6AFD7958023761929D490412BFFA816AA5F78912FF289E619FD73EE12ED6323`
- `source_segments.json`: `EB55F4133229F92E4626357260EF93F5F66A8E7AB4BE8BC2E31373FF0ACAFC4B`
- `translation.md`: `2B04884390209724C1EE4CFF421DAB3F692A13201D0AE2958DB779A63572CAC5`
- `translation_segments.json`: `6D3CBE164DB7221640166103A0513474A82E5288E8F16B6311A0C87D7C236C91`
- `translation_alignment.json`: `272B138D20F53D626F26C997FC95CAEF6C8610A65FAD3F34B9D24D4ED7338784`
- `summary.md`: `692481D2475BEF11A29C369CA16A124F0322960A66050794D7D29E5BAF9834FA`
- `concepts.md`: `D0BE0F1CEFB8DE98F398D31E7CA23F9986F845F7B544453743709AF04643A6CC`
- `pitfalls.md`: `AFE4563244D6FC1C10203357682F1599E0D40C810D7BA54C412FB932A73AF3C6`
- `review-sheet.md`: `0B0C37B71D695CEE1F560FB632B5C2E22C878B2B04E5B8D388ADC30569B64CF8`
- `professor_prep.json`: `680861A5386895D8E646F799EF82B82BA54D1EA8F9FEC844CD68A9AD246D26C9`
- `quiz-ox.json`: `2C85BE9CD46BFA1958685874A06172149816EFA7E3A115DF10E82EC5EAD1E5ED`
- `quiz_short.json`: `119967366917E900E24DC9C87FE4DEBC4AE4ED6390BEC657FCABAE4759A22891`
- `quiz-mcq.json`: `B1C05926602B92C029166F295F6162562CFDC87CC1276A7C5C19D069594F971F`

## Independent-audit correction round

- 최초 독립감사는 **HOLD — Critical 0 / Major 5 / Minor 2**였다. 상향이전 결측치의 별도 평균대체 예외, 단일 세그먼트 범위를 넘은 카드 3개, 동일 근속기간을 동시 취업으로 바꾼 객관식 7, 두 건의 형식 간 정답노출, 극단적·비개연적 객관식 오답이 확인됐다.
- `summary.md`에 일반 공변량의 최근값 대체와 상향이전액의 평균지원액 대체를 분리해 적었다.
- 교수 카드 4의 제외대상을 `생애 유급노동 경험이 전혀 없는 사람`으로 명료화했다. 카드 8은 `RESULTS-DESCRIPTIVE-001`, 카드 12와 읽기 응답 5는 `DISCUSSION-001` 하나만으로 답 전체가 완결되도록 범위를 줄였다.
- 객관식 7을 ‘여러 일자리의 동일 근속기간’ 동률 처리로 바로잡았다. 객관식 15개 오답을 같은 연구 맥락에서 비교할 수 있는 대안으로 다시 썼다.
- 독립감사 지적과 수정 후 source-only 스키마, strict `23/23`, 전체 링크, 원문 펼치기, 개인정보·챗봇 제외 검사는 모두 PASS였다. 내용 수정자가 자체 승인하지 않고 좁은 독립 재감수로 넘겼다.

## Quiz-pattern correction and final independent audit

- 첫 재감사에서 내용 관련 지적은 모두 해소됐지만, OX #1–7과 #7–13의 동일한 7기호 모티프 및 객관식 위치–길이 결합이 **HOLD — Critical 0 / Major 2 / Minor 0**으로 남았다.
- 문항·정답·해설·근거 ID는 바꾸지 않고 OX 레코드, 객관식 레코드와 선택지 위치만 재배치했다. 최종 정답열과 패턴 지표는 위 `Question-set separation and balance` 절과 같다.
- 다른 검수자가 실제 JSON에서 정답열·연속 길이·반복 부분열·완전순열 창·4×4 결합표·Cramér's V와 난이도 구간을 다시 계산했다. 기존 두 Major가 모두 해소되어 최종 판정은 **PASS — Critical 0 / Major 0 / Minor 0**이다.

## Review boundary

- 스키마·정렬·렌더·링크·privacy 검사는 독립적인 내용 재감사를 대신하지 않는다는 경계를 유지했다.
- 근거 범위·결측처리·문항 내용·오답 개연성 및 최종 배열을 독립 검수자가 모두 재확인했다. **Final Stage 3 verdict: PASS — Critical 0 / Major 0 / Minor 0.**
- 위 독립감사와 격리 미리보기 검증 뒤 Stage 3 여덟 페이지의 승인 해시를 `codex-independent-stage3-audit` 검수자로 기록했다. 공개 `docs` 빌드·배포·커밋은 수행하지 않았다.
