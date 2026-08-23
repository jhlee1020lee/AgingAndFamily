# Stage 3 Work Log - lin-et-al-2018

## Content sequence

1. `summary.md`를 황혼이혼 증가, 생애과정 질문, HRS 표본, 측정·사건사 분석, Figure 1, 이변량·다변량 결과, 한계와 수업 포인트 순서로 구성했다.
2. `concepts.md`에 황혼이혼, 생애과정 관점, 전환점, 결혼이력, 행위주체성, 연결된 삶, 결혼의 질, 동질혼·이질혼, 이산시간 사건사 분석, 위험률, 시간가변·시간불변 변수, 시차 공변량, 중도절단, MICE의 14개 개념을 작성했다.
3. `pitfalls.md`에 연령과 결혼기간, 연간 위험과 누적확률, 이론적 전환점과 실증결과, 부분모형과 완전모형, 재혼과 결혼기간, 이변량과 독립효과, 측정시점과 실제 변화, 관련성과 인과성 등을 구분하는 16개 오독 대비를 작성했다.
4. `review-sheet.md`를 20초 요약, 배경숫자, 이론, 표본흐름, 변수, 분석, 결과암기표, Figure/Table 함정, 강점·한계, 서술형 골격으로 압축했다.
5. 교수식 즉석 질문 15개와 읽기 응답 6개를 작성했다.
6. OX·단답형·객관식 문항을 각각 정확히 15개 작성했다.

## Evidence discipline

- 승인된 `full.md`, `source_segments.json`, `translation.md`, `translation_segments.json`, `translation_alignment.json`만 내용 근거로 사용했다.
- 교수식 카드 15개, 읽기 응답 카드 6개, 퀴즈 45개를 합친 66개 레코드 모두 정확히 하나의 실제 source segment ID를 가진다. 66/66 ID 존재를 검사했고 잘못된 ID는 0개다.
- 1차 독립감사 뒤 각 레코드의 답변·정답·해설 전체가 지정 세그먼트 하나에서 완결되도록 전수 재대조했다. 배경수치, 이변량·다변량, 측정·분석, 결과·인과한계를 여러 세그먼트에서 한 ID 아래 결합했던 11개 레코드를 한 근거 범위로 축소하거나 올바른 ID로 교체했다.
- 황혼이혼을 이혼 시점의 연령으로 정의하고 결혼기간과 구분했다. 연간 이혼율, 시점별 위험률, Figure 1의 누적확률도 서로 바꾸어 쓰지 않았다.
- 1990–2010년 변화, 최종 5,331쌍, 29,286개 부부-면접-연도, Table 1의 296/5,035를 서로 다른 분모로 유지했다. 출판 원문은 5,566쌍과 218·11·189·35의 네 제외수를 열거하지만 단순 차감값 5,113이 최종 5,331과 맞지 않으므로, 이 내부 불일치를 명시하고 정상적인 산술 흐름으로 재구성하지 않았다.
- 세 노년기 전환이 이론적으로 관계를 재조직할 수 있다는 예상과 완전 모형에서 모두 유의하지 않았다는 결과를 분리했다. 아내 은퇴의 43% 낮은 승산은 모형 1에서만 나타나고 모형 2에서 사라졌다는 순서를 보존했다.
- 재혼과 결혼기간의 `r = −0.69`, 비공유 자녀와 재혼의 `r = 0.79`를 정확히 귀속했다. 결혼기간 포함 여부에 따라 재혼의 유의성이 달라지는 교란을 ‘재혼이 무관함’으로 단순화하지 않았다.
- 아내와 남편의 결혼의 질, 인종 이질혼 1.76배, 주택 소유, 자산 25만 달러 초과 집단의 약 38% 낮은 승산을 보존했다. 연령·교육 이질혼과 모든 추가 상호작용은 유의하지 않았음을 함께 명시했다.
- 결혼의 질은 최초 면접에서만 측정된 2–6점 시간불변 지표이고, 전환·주택·자산은 2년 시차를 둔 시간가변 변수라는 구분을 유지했다. 시차를 무작위실험 수준의 인과식별로 과장하지 않았다.
- 원문의 자산범주 서술은 ‘여섯 범주’라고 한 뒤 다섯 범주만 열거하며, Table 1 본문에는 `12. 62` 표기가 있다. 두 원문 특이점을 임의로 보충·수정하지 않고 복습지에서 명시했다.
- 현재 논문은 황혼이혼의 선행요인을 분석했으며 당사자와 성인자녀의 이혼결과는 후속연구 과제라는 범위를 모든 학습자료에서 지켰다.

## Question-set balance

- OX 정답 순서: `OXOOXXOXOOXOXXO`, O 8개 / X 7개. 문항은 50세 이상 이혼자의 비중, 선별된 선행연구 표본, 기대수명 기제, 빈 둥지의 양면 경로, 배우자 질병의 성별 방향, 제외 코호트, 가중치, 배우자 보고 처리, 십대 결혼, 연령차, 경제변수의 시간성, 연도 더미, 분석 가중, 결혼차수별 생존곡선, 재접촉 표본으로 서로 다른 학습목표를 다룬다. X는 단순한 부정어가 아니라 범위·방향·처리방식을 미세하게 바꿨다.
- 객관식 정답 위치 순서: `CADBDCACBDABACD`; A/B/C/D = `4/3/4/4`.
- 객관식 정답 길이순위: `313242132413412`; 최장/둘째/셋째/최단 = `4/4/4/3`. 기존의 반복적인 `1234` 주기를 제거했고 순위 순서는 불규칙하다.
- 객관식 오답은 실제 표본 제외건수, 시차·흡수형 측정, 결혼의 질 구성, 위험률·누적확률, 모형 1·2, 상관계수와 유의성, 이질혼·경제자원 결과를 그럴듯하게 교환하도록 다시 작성했다. 비현실적인 무작위 주택배정·위험 0·사후 0–100점 같은 단서를 제거했다.
- 객관식 정답은 네 선택지 가운데 정확히 한 번만 등장한다. 단답형 허용정답은 모두 7단어 이하이고 정규화한 질문 본문에 허용정답 문자열이 포함된 경우는 0건이다.
- 교수식·읽기 응답 카드 ID 21개는 모두 고유하다. 세 번째 독립감사에서 확인된 퀴즈 간 근접중복 군집을 해소하기 위해 OX 전 문항과 단답형 1–14번을 서로 다른 학습목표로 교체했다. 단답형은 관찰기간·코호트 출생연도·세 제외수·Table 1 집단수·응답률·결측률·Figure 1 근삿값·주택소유율을 짧게 회상하게 하고, 객관식은 정의·이론·분석논리·다변량 해석을 판별하게 한다.

## Source and schema validation

- Strict alignment: **PASS, 22/22 source segments**.
- Source-only schema: Stage 3의 8개 페이지 모두 **schema_pass**, 오류·경고 0건.
- 기존 original/translation의 figure-label 휴리스틱 경고는 Stage 3 콘텐츠 오류가 아니다. Figure 1과 Table 1–2는 Stage 2 독립감사에서 원본 해상도로 확인했다.
- Summary: 917 words, 8 sections, 37 bullets.
- Concepts: 1,270 words, 14 concepts, 84 required fields.
- Pitfalls: 793 words, 16 contrasts, 48 explicit contrast labels.
- Review sheet: 767 words, 10 sections, 61 bullets. 이혼은 분석 사건이고 사망·2012년 도달·표본탈락이 중도절단이라는 구분으로 수정했으며, 원문 표본 흐름의 산술 불일치를 별도 주의사항으로 표시했다.
- Professor preparation: 15 core cards + 6 reading-response cards.
- Stage 3 상태는 `manual_review_required`로 유지하며 작성자가 승인하지 않는다.

## Isolated full-preview checks

- 최종 교정본을 공개 경로가 아닌 `tmp/final-corrections-preview-20260823-r2`에 slug 없이 `--preview-locked --preview-draft`로 전체 사이트 빌드했다.
- Full-preview link 검사: **PASS, 243 HTML files / 5,928 local targets**. Lin 번역 원문 reveal은 **PASS, 89/89 blocks / 332 sentences**다.
- 렌더링된 전체 HTML·JS·CSS에서 사적 경로, 챗봇 UI·문구, 독립 단어 STT, 강의 녹음·녹음본·전사본 표식은 0건이다.
- 공개 `docs` 빌드, 승인, 배포, 커밋은 수행하지 않았다.

## Content hashes (SHA-256)

- `full.md`: `2C13D48B5E32EC538F401E1E937B51D0C432DB9D20FB12EE5D64A530EA1FC972`
- `source_segments.json`: `CE7AD9FB880CFF64A54771FA5224FAF1EBBA9218565CC726FA3F03478AA04879`
- `translation.md`: `05D42E8E3B51809715C3AC766CF4217E5A495E119DC694AABE7E9D4EFBA8B72E`
- `translation_segments.json`: `7F731C84F44F684EC61418FCAAFC954AACC3C89DB20B38E1A55304904EE5D49B`
- `translation_alignment.json`: `BF65D9728C87C6D01CA30AA23593BAD4F0B624661E451EC886167DFDD397DEEE`
- `summary.md`: `B7B326971DDB48F36B0A7C51D339783737A4BFD8AEBE8D782D6DD2A0A15EE07C`
- `concepts.md`: `7293EBA14936C9BDF17EE4367B4032240A4C60827441FF072A1DD6F0087CC48D`
- `pitfalls.md`: `A0F6A7692DD4E9A45C5A93C422DCE66B53C3F7CCF1F41BADCC7559E2415E58B1`
- `review-sheet.md`: `5107CBBBF7B6EC934507077FED103148699F5DD530EAB38AAE312E85F8F88161`
- `professor_prep.json`: `4C57DCA8BA4C65AFE8D37E35AC75FCDDF5DC7433B6DEA42CE5D6ECAD87EB8651`
- `quiz-ox.json`: `5EE69B473B2CA6555B2DB21CD77F2F055602C64A58AD6D3CE32B43470C9D250C`
- `quiz_short.json`: `28C7BB0DF4F2CF1C49AC809B95FD46E0FAC83DEE4E4F91992E3E6F4FEBD13416`
- `quiz-mcq.json`: `690C3D0AAA0AC0EF040F7F50E1ECD5633C8600EF15B9B25AD83A5C64C40A0652`

## Review boundary

- 1차 독립감사는 Critical 0 / Major 2 / Minor 1로 HOLD했고, 단일 evidence 완결성·퀴즈 단서·사건/중도절단 표현을 위와 같이 모두 수정했다.
- 1차 교정본 독립 재감사에서는 Critical 0 / Major 1 / Minor 0으로 HOLD했다. `lin-reading-05`가 `LIMIT-001`의 한계와 `DISCUSSION-001`의 비유의 결과를 결합한 점을 확인해, 마지막 문장을 `LIMIT-001`에 실제로 열거된 부부 상호작용·관계폭력·물질사용·부정의 미측정과 후속연구 필요성으로 교체했다.
- 두 번째 교정 뒤 독립 재감사는 `lin-reading-05`의 단일 evidence 결합 문제를 해소해 66/66 근거 완결성을 확인했으나, 원문 표본 수의 내부 산술 불일치를 정상 흐름처럼 가르친 문제와 퀴즈 형식 간 근접중복을 Major 2로 판정했다.
- 세 번째 교정에서 표본 흐름의 `5,566 − (218 + 11 + 189 + 35) = 5,113`이 출판된 최종값 5,331과 맞지 않음을 summary·review sheet·교수 대비·객관식 해설에 명시했다. OX 15개와 단답형 1–14번도 서로 다른 학습목표로 다시 작성했다.
- 마지막 재감사는 `lin-prep-01`과 MCQ 1의 단일 근거 범위를 각각 `ABSTRACT-001` 표현으로 축소하고 `INTRO-001`로 바로잡은 뒤 66/66 레코드를 확인해 **Critical 0 / Major 0 / Minor 0 — PASS**로 판정했다.
- strict 22/22, Stage 3 8/8 source-only schema, 최종 격리 전체 미리보기·링크·reveal·privacy 검사를 모두 통과했다.
