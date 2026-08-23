# Stage 3 Work Log - gruenewald-et-al-2016

## Content sequence

1. `summary.md`를 생성감의 변화 가능성, 구조적 지체, EC의 세대 간 설계, BECT 표본·측정, ITT/CACE, 결과, 한계와 해석경계 순서로 구성했다.
2. `concepts.md`에 생성감, 욕구, 성취, 구조적 지체, 세대 간 시민참여, 이중 효과성 시험, ITT, CACE, 순응·노출, 용량–반응, CACE 가정, 2요인 측정구조, 천장효과 가능성의 13개 개념을 정의했다.
3. `pitfalls.md`에 생성감과 일반 친사회성, 욕구와 성취, 자기지각과 객관적 성과, 관찰연구와 이번 시험의 직접효과, 배정과 실제 중재, 대조군과 무처치군, ITT와 CACE, 목표시간과 실제 노출 등을 구분하는 14개 오독 대비를 작성했다.
4. `review-sheet.md`를 20초 요약, 이론, 프로그램·비교조건, 표본 흐름, 측정, ITT/CACE 비교, 결과와 가정 예외, 강점·한계, 서술형 골격으로 압축했다.
5. 교수식 즉석 질문 15개와 읽기 응답 6개를 작성했다.
6. OX·단답형·객관식 문항을 각각 정확히 15개 작성했다.

## Evidence discipline

- 승인된 `full.md`, `source_segments.json`, `translation.md`, `translation_segments.json`, `translation_alignment.json`만 근거로 사용했다.
- 교수식 카드 15개, 읽기 응답 카드 6개, 퀴즈 45개를 합친 66개 항목 모두 실제 source segment ID 하나를 가진다. 66/66 ID의 존재를 검사했고 질문·정답·해설을 하나의 연결 세그먼트 범위 안에 두었다.
- 생성감 욕구와 생성감 성취를 구별하되, 욕구가 활동을 촉진하고 성취가 다시 욕구를 강화할 수 있다는 저자의 양방향 이론을 보존했다.
- 최초 선별 2,675명, 무작위배정 702명, EC군 352명, 대조군 350명, 실제 EC 노출 284명, 미진입 68명을 서로 합치지 않았다.
- 대조군은 무처치군이 아니라 CARE를 통해 EC를 제외한 통상적 자원봉사 기회를 안내받은 집단으로 일관되게 설명했다.
- 전체 평가시점과 생성감 측정시점을 분리했고, 욕구 7문항·성취 6문항, 1–6점, 설명분산 51.2%, 요인상관 `.54`, 신뢰도 `.82/.90`을 원문대로 유지했다.
- ITT는 배정효과, CACE는 중재군의 관찰 순응자와 대조군의 추정 잠재 순응자 효과라는 구분을 유지했다. CACE를 단순한 참여시간 상관이나 무가정 인과추정으로 바꾸지 않았다.
- 네 CACE 모형의 가산성 예외, 높은 기초선과 기존 자원봉사율, 15%–20% 추적탈락, 여성 85%·주로 아프리카계 미국인 표본의 일반화 범위를 포함했다.
- 이번 분석이 직접 입증한 결과를 생성감 자기지각으로 한정했다. 정신·인지·신체 건강과 생존은 선행 관찰연구의 관련성이고 BECT 내 연결은 향후 분석이라는 경계를 모든 학습자료에서 지켰다.

## Question-set balance

- OX 정답 순서: `OXOOXXOXOOXOXXO`, O 8개 / X 7개. 1차 독립감사에서 X 7개에만 절대어가 나타나 어휘만으로 15/15 정답을 추론할 수 있다는 지적을 받아, 수치·시점·분석대상·가정 개수를 미세하게 바꾼 거짓 문항으로 전면 교정했다. O 문항에도 `한정되지 않음`, `무처치가 아님`, `한 기준만 쓰지 않음` 같은 범위표현을 넣어 정답과 특정 어휘의 일대일 대응을 없앴다.
- 객관식 정답 위치 순서: `CADBDCACBDABCAD`, A/B/C/D = `4/3/4/4`.
- 객관식 정답 길이순위: 최장/둘째/셋째/최단 = `7/4/2/2`. #1·3·7·8·12·14·15의 극단적 오답은 문항수·척도범위·결측처리·비교조건·결론범위를 근접하게 바꾼 현실적인 오답으로 교체했다.
- 객관식 정답은 네 선택지 가운데 정확히 한 번만 등장하며, 단답형 허용정답은 모두 7단어 이하이고 질문에서 정답 문자열을 노출하지 않는다.
- 교수식·읽기 응답 카드 ID 21개는 모두 고유하다.

## Source and schema validation

- Strict alignment: **PASS, 24/24 source segments**.
- Source-only schema: Stage 3의 8개 페이지 모두 **schema_pass**, 오류·경고 0건.
- Summary: 864 words, 8 sections, 33 bullets.
- Concepts: 1,329 words, 13 concepts, 78 required fields.
- Pitfalls: 701 words, 14 contrasts, 42 explicit contrast labels.
- Review sheet: 627 words, 9 sections, 49 bullets. 렌더러가 Markdown 표를 표로 출력하지 못한다는 독립감사 지적에 따라 ITT/CACE 비교를 6개 명시적 목록 항목으로 바꿨다.
- Professor preparation: 15 core cards + 6 reading-response cards.
- Stage 3 상태는 `manual_review_required`로 유지하며 작성자가 승인하지 않는다.

## Isolated full-preview checks

- 교정 후 공개 경로가 아닌 `tmp/gruenewald-stage3-full-preview-corrected-r2`에 `--preview-locked --preview-draft`로 전체 사이트를 빌드했다.
- Full-preview link 검사: **PASS, 243 HTML files / 5,574 local targets**, 깨진 링크·프래그먼트·사적 경로·챗봇 표식 0건.
- Gruenewald 번역 원문 reveal: **PASS, 87/87 block reveals / 219 sentence reveals**.
- ITT/CACE 비교가 HTML의 6개 목록 항목으로 렌더되고 원래의 파이프 표 문법이나 잘못된 표 문단이 남지 않았음을 확인했다.
- 렌더링된 Gruenewald 하위트리에서 챗봇, STT, 녹음, transcript, 사적 절대경로 표식 0건.
- 공개 `docs` 빌드, 승인, 커밋은 하지 않았다.

## Content hashes (SHA-256)

- `full.md`: `C29016D7F883CF13D8BB94DD9FAC0565E510061F0B512C15F3A0FAF422BA3D57`
- `source_segments.json`: `5FC2709C2E5F864CCBB9B33EBA5148F1AF9BFFBCC0ED2FADA962972B39F1B0F0`
- `translation.md`: `11B034B39BB814D09285B7643563B645E8C9725B22DF032C40190CB9EF74C6A0`
- `translation_segments.json`: `2FD61680FF7108B264AE248A476B438FBF87846F976670D12088D1B45A0357F1`
- `translation_alignment.json`: `1379CF37DAB9784B36A86C0616AEF8724832551C5C99A2AB2454DDD26D6B2343`
- `summary.md`: `F5B2F4A24CB683E2554F6AB00BDF84D91663CD59A8893F37EDC4BEF95A17941C`
- `concepts.md`: `F5E9AFDC8935D593B905C54973DB306AB756DDD91ACB6035F18296DDBE72C0C3`
- `pitfalls.md`: `DF4F4F8051A5662E140168AC77E9030143A7878A072CC53994ED167678EA858B`
- `review-sheet.md`: `D71F117ECCBF0C68A022185C5A86417130A992F320C89A89886D0B91772BEB54`
- `professor_prep.json`: `93212761798CBEE3B0817AD56D08D40C8D06BE89400BD698CE0EB55C4A60F4BA`
- `quiz-ox.json`: `E5BD364D19D55905917F04CF9F62C636BC68388EC85B18FA9C55D22C58867B37`
- `quiz_short.json`: `D7A57BDD2679D5A453CC12856AA3084F99C4209F0573838F1A0A49C447B29895`
- `quiz-mcq.json`: `4B85E231C365D774D8A3D381D6104BCB6DFC672297208C8FEC93A0A11D2AC398`

## Review boundary

- 1차 독립감사 판정은 **HOLD (Critical 0 / Major 1 / Minor 2)**였다. OX 어휘 단서, 비현실적인 MCQ 오답, ITT/CACE 표의 렌더 실패를 모두 교정했다.
- 2차 재감사에서 기존 세 지적은 모두 해소됐으나 OX 11번의 `284/352` 수치가 지정 근거 `ANALYTIC-ITT-CACE-001`가 아니라 다른 세그먼트에 있다는 단일근거 범위 이탈을 발견했다. 숫자를 제거하고 ITT의 순응자·비순응자 재분류 여부만 묻도록 교정했다.
- 동일 감사자의 최종 재감사에서 OX 11번을 포함한 66/66 단일근거, 문항 단서, ITT/CACE 목록 렌더, schema·strict·링크·reveal·개인정보·챗봇 검사가 모두 **PASS (Critical 0 / Major 0 / Minor 0)** 판정을 받았다.
- 최종 PASS 뒤 Stage 3의 8개 페이지를 `codex-root`가 source-only 방식으로 승인했다. 공개 `docs` 빌드, 배포, 커밋은 수행하지 않았다.
