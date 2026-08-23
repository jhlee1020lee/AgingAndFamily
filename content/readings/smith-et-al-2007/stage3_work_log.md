# Stage 3 Work Log - smith-et-al-2007

## Content sequence

1. `summary.md`를 독립성의 다중 의미, 헤게모니적 남성성과 성공적 노화 담론의 얽힘, 건강 위해·건강 증진의 양면성 순서로 구성했다.
2. `concepts.md`에 독립성, 헤게모니적 남성성, 자기의존·자율성·통제, 성공적 노화, 의존의 연속선, 도움 요청, 라포·연령차, 귀납적 주제분석, 적응적 재구성, 덜 보편주의적인 정책 접근을 포함한 12개 개념을 정의했다.
3. `pitfalls.md`에 참여자 발화와 저자 해석, FAMAS 코호트와 질적 하위표본, 종단연구 맥락과 이 논문의 질적 근거, 보조수단과 독립성, 정책 제안과 검증된 개입효과를 구분하는 14개 오독 대비를 작성했다.
4. `review-sheet.md`를 두 담론 비교, 개념 구분, 방법·숫자, 참여자 사례와 저자 해석, 건강 위해·증진 경로, 실천·정책 한계의 시험 직전 구조로 압축했다.
5. 교수식 즉석 질문 15개와 읽기 응답 6개를 작성했다.
6. OX·단답형·객관식 문항을 각각 정확히 15개 작성했다.

## Evidence discipline

- 승인된 `full.md`, `source_segments.json`, `translation.md`, `translation_segments.json`, `translation_alignment.json`만 사용했다.
- 교수식 카드 15개, 읽기 응답 카드 6개, 퀴즈 45개를 합친 66개 항목은 모두 실제 source segment ID 하나를 가진다. 66/66 ID가 존재하며, 각 카드·문항의 질문·정답·해설 전체를 해당 단일 세그먼트가 직접 지지하도록 대조했다.
- 독립성을 자기의존, 자율성 또는 통제 한 가지로 환원하지 않았고, 성공적 노화의 독립성과 남성성의 독립성이 참여자 발화에서 얽힌다는 논지를 유지했다.
- FAMAS 전체 코호트 1,195명(35~80세)과 연령·혼인상태로 층화해 초대한 질적 하위표본 36명을 분리했다. 36명 중 55세 초과 22명, 그중 65세 이상 12명이라는 범위를 보존했다.
- 면담 1시간~1시간 45분, 예비면담 4회, 대체 장소 4회, JS 25세와 대다수 55세 이상 참여자의 연령차, 축어 전사·현장노트·NVIVO·귀납적 주제분석을 원문 범위 안에서 제시했다.
- Michael의 남성 정체성 상실은 참여자가 명시한 사실이 아니라 저자의 한정된 해석으로 분리했다.
- Arnold의 스쿠터는 가까운 목적지까지 약 5분, 의사까지 약 세 정거장, 약 40km 주행 능력은 자신이 시도하지 않는다는 한정을 보존했다.
- 덜 보편주의적인 정책 접근은 노년 남성 등 하위집단의 고유한 관심과 여러 관점을 고려하자는 제안으로 설명했고, 보편서비스 폐지나 검증된 개입효과로 바꾸지 않았다.

## Question-set balance

- OX 정답 분포: O 8개, X 7개.
- 객관식 정답 위치: A 4개, B 4개, C 4개, D 3개.
- 객관식 정답 길이 순위: 최장 4개, 둘째 4개, 셋째 4개, 최단 3개.
- 객관식 15문항은 모두 선택지 4개와 정확히 한 번 등장하는 정답을 가진다.
- 단답형 15문항의 모든 허용 정답은 7단어 이하이며 질문 본문에 정답 문자열을 노출하지 않는다.
- 교수식·읽기 응답 카드 ID 21개는 모두 고유하다.

## Source and schema validation

- Strict alignment: **PASS, 16/16 source segments**.
- Source-only schema: Stage 3의 8개 페이지 모두 **schema_pass**, 페이지 오류·경고 0건.
- Summary: 1,082 words, 8 sections, 39 bullets.
- Concepts: 1,325 words, 12 concepts, 72 bullets.
- Pitfalls: 698 words, 14 sections, 42 bullets.
- Review sheet: 734 words, 9 sections, 27 bullets.
- Professor prep: 15 core cards + 6 reading-response cards.
- Stage 3 상태는 `manual_review_required`로 유지했으며 승인 작업을 하지 않았다.

## Isolated full-preview checks

- 최종 검증본은 공개 경로가 아닌 `tmp/site-preview-smith-stage3-full-20260822-d`에 `--preview-locked --preview-draft`로 전체 사이트를 빌드했다.
- Full-preview link 검사: **PASS, 243 HTML files / 5,176 local targets**, 깨진 링크·프래그먼트 0건.
- Smith 번역 원문 reveal: **PASS, 106/106 block reveals / 251 sentence reveals**.
- 렌더링된 Smith 하위트리에서 사적 로컬 경로, STT, 녹음자료, 챗봇 표식 0건.
- Playwright 데스크톱 1440×900과 모바일 390×844에서 summary, professor-prep, 읽기 응답 탭, 객관식 선택·문항별 채점 흐름을 확인했다. 모바일 `scrollWidth`와 `clientWidth`는 모두 390으로 가로 넘침이 없었고 정답 피드백이 정상 표시됐다.
- 브라우저 콘솔의 유일한 오류는 로컬 미리보기 서버의 선택적 `favicon.ico` 404였으며 페이지 콘텐츠·상호작용에는 영향이 없었다.

## Content hashes (SHA-256)

- `full.md`: `D214EFBD6734FF22404A42C594940048E4DA878E1422874B1643F04F0A963AA1`
- `source_segments.json`: `21657D66909FA95E10DFF9D34A2912E7AEF55EE5663C0C8631D940F5A59EA94E`
- `translation.md`: `8D45C44F7C923ED30D22865B79153354AED95FF42BD5B3FC3243A349EDF5F237`
- `translation_segments.json`: `2248F1EFB4CFFA339DDEFB52666C89A361E2563AA073143EFBD94739049414A5`
- `translation_alignment.json`: `7E2692120CF8B2F08612E1115E61FF1E49DA19528D990C20848BCD8829CF1B11`
- `summary.md`: `E737ABF9DB1A57F97A71087C74DD808E54A110F865CE6CB20895703E376BC7AB`
- `concepts.md`: `133C359982367AFD03227E6544C3E52E81A2D5D1ACDA814FFE5350E40D0C700E`
- `pitfalls.md`: `EAED9D4BC6C8A969ED863DC99005B20846B9436D5F3606747C0A73C24FC6E7CD`
- `review-sheet.md`: `4BF8FA61CF3C3B96902F4082035248DC8EC2CC23FD6EBF378F0B2056751FF534`
- `professor_prep.json`: `EEE2C53CD907D271C54923F0729804601001682F2CDE79069C7882A452978086`
- `quiz-ox.json`: `2228E03A07B18131CCE05AD8AC3C96F54110E06CA0CFF2E224DCDBD3E32BE579`
- `quiz_short.json`: `882C2A2D4CC836392E0FA443BC8185A7C5A437B6CE12E1A67298ADF1C0929E6D`
- `quiz-mcq.json`: `17A40A1B0C14701D11EABD39ED07F166E7DA172111A59A9BFF57EE8543E51E0A`

## Review boundary and execution note

- 독립 내용감사에서 **HOLD (Critical 0, Major 0, Minor 1)**가 먼저 나왔다. `smith-prep-09`가 Sam의 말을 실제 도움 수용으로 단정했지만, 원문은 아내가 자신이 잘못하고 있다고 판단하면 알려 줄 것이라고 한 발화까지만 지지했다.
- 해당 문장을 원문 범위로 좁힌 뒤 21개 교수/읽기 응답 카드와 퀴즈 45개를 다시 단일 근거 세그먼트에 대조했다. 최종 판정은 **PASS (Critical 0, Major 0, Minor 0)**이며, 숫자·인명·참여자 발화/저자 해석 경계·방법론 범위·정책 제안의 한정을 재확인했다.
- 이 최종 PASS 뒤 Stage 3의 여덟 페이지는 source-only 승인 대상이 된다. 공개 빌드나 커밋은 하지 않는다.
- 옵션 확인을 위해 실행한 `node scripts/build_site.js --help`가 help 모드를 지원하지 않아 2026-08-22 18:27 KST에 기본 공개 출력 빌드를 의도치 않게 한 차례 실행했다. 즉시 root에 알리고 영향 범위를 읽기 전용으로 보고했으며, 이후 공개 경로에는 어떤 명령·복구·되돌리기도 하지 않았다.
- 위에 기록한 작성자 Stage 3 검증 수치는 모두 `tmp/site-preview-smith-stage3-full-20260822-d` 격리 전체 미리보기에서 얻었다. 독립감사 수정 뒤에는 새 격리 전체 미리보기에서 다시 검증한다.
