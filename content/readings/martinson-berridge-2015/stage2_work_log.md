# Stage 2 Work Log - martinson-berridge-2015

## Authority and scope

- 번역의 권위 자료는 승인된 `full.md`, `source_segments.json`, 로컬 원 PDF `13 Martinson and Berridge, 2015.pdf` 12쪽으로 제한했다.
- 원 PDF SHA-256은 `E721CF490942E76901C0B9A06AD1C82AF4BBE7230940E66798B21060ACE439C9`이며 인쇄면은 58–69쪽이다.
- 논문에는 실질적인 표나 그림이 없다. 따라서 번역에 임의 이미지·도표를 추가하지 않았고 원문의 제목·저자·소속·서지정보·초록·핵심어·본문·두 장문 인용·한계·결론·참고문헌을 같은 순서로 보존했다.
- 강의 녹음·STT·사적 메모·과거 과목 자료·외부 검색결과는 번역 근거로 사용하지 않았다.

## Translation construction

- `scripts/reconstruct_martinson_translation.py`가 참고문헌 이전의 한국어 번역 블록 61개, 절 제목 대응, 74개 참고문헌을 결합해 `translation.md`와 28개 `translation_segments.json` 레코드를 재구성한다.
- 번역은 Abstract, Key Words, Introduction, Methods, Findings, Discussion, Limitations, Conclusion, References의 9개 대절과 네 findings theme, 아홉 내부 소제목을 원문과 평행하게 유지한다.
- 방법의 검색 풀 `n = 453`, 최종 67편, 이중코딩 15편과 네 범주 Add and Stir 16편, Missing Voices 30편, Hard Hitting Critiques 14편, New Frames and Names 7편을 서로 다른 분모로 보존했다.
- 성공적 노화 유병률 `16%–24%`, `11.9%`, 연구별 `3.3%–33.5%`, 자기평가 대 Rowe–Kahn 기준 `50.3% 대 18.8%`, `63% 대 30%`, 장애·만성질환이 흔해도 자기평가 성공적 노화가 92%였다는 값을 유지했다.
- 정의 확대, 개인화, 폐기, 재구성·개명이라는 네 응답 방향을 합치지 않았다. 개인책임·개인주의, 문화적 다양성의 누락, 연령주의·능력주의, 신자유주의·보수주의 맥락에 대한 비판을 저자의 검토 범위보다 강한 인과판단으로 바꾸지 않았다.
- Manitoba Follow-up Study 관련 문장은 원문의 `may be relatively stable`을 단정하지 않고 “비교적 일관적일 수”로 옮겨 가능성 표현을 유지했다.
- 2026-08-23 독립 내용감사에서 확인된 다섯 번역쌍과 한 귀속 표현을 재생성 원천에서 바로잡았다. `lived experiences` 두 곳은 “삶의 경험”으로 통일했고, Rozanova의 `As she explained`는 성별 대명사 대신 실명 귀속으로 바꿨다. `arguably` 두 곳은 “…라고 볼 수 있다”로, `suggests that`은 “…을 시사한다”로 옮겨 원문의 유보와 증거 강도를 복원했다.

## Segmentation and sentence alignment

- 승인 원문의 28개 `segment_id`와 블록범위를 같은 순서로 사용했으며 strict alignment는 **PASS 28/28**, 오류·경고 0건이다.
- 원문과 번역은 각각 127개 문단이며 `translation_alignment.json`은 127개 단조 1:1 문단 엔트리를 가진다.
- 자동 경계가 의미 단위를 온전히 맞추지 못한 18개 문단(`tr-003`, `007`, `009`, `012`, `014`, `015`, `017`, `020`, `024`, `025`, `028`, `030`, `034`, `042`, `044`, `047`, `049`, `053`)을 `scripts/review_martinson_sentence_alignment.js`의 수동 연속범위 규칙으로 재결합했다.
- 최종 284개 문장쌍의 상태는 모두 `verified`, 문단 방식은 모두 `human-reviewed-v1`이다. 각 쌍의 양쪽 연속 텍스트 전체를 덮고 원문 숫자 누락은 0건이다.
- `scripts/fill_martinson_alignment_anchors.js`가 127개 엔트리의 영문·한국어 문단 anchor와 문장쌍 전체 덮임을 다시 검사한다.

## References

- 참고문헌 74개는 번역하지 않고 승인 원문에서 byte-identical로 보존했다.
- 줄바꿈을 LF로 정규화한 참고문헌 본문은 양쪽 모두 14,924바이트이고 SHA-256 `F8964C1EEC9138F7587594CB4BAE533F8A96665E64E9F50C318AA87AB82F5B9C`로 동일하다.
- 저자·연도·제목·저널·권호·쪽수·DOI와 승인 원문의 특이 표기·구두점을 임의로 교정하지 않았다.

## Deterministic regeneration and hashes

- 번역 재구성 → 검증된 문단정렬 → 수동 문장경계 검토 → anchor 완전성 검사 파이프라인을 연속 두 번 실행했고 두 실행의 세 핵심 산출물 SHA-256이 같았다.
  - `translation.md`: `BBB5CF8C891471645406E080D10EC200B72EC72C9F58F67160033265080420C3`
  - `translation_segments.json`: `B29AC649F2DBF228E45C1C7EDC258F1C116F7DB1B3CAB4DD6F026E0C3239413E`
  - `translation_alignment.json`: `6CBCC65E8C9B0EBD89284D0719AD7C42183065FEAF4A99B0842650A22B81A3AF`
- 권위 원문 해시는 `full.md` `F8FE78D35F36E548840F7B0A97390DEEFAB2B44B7156DD99DF21CB8D6C7621AB`, `source_segments.json` `6943C23D374C6B2DF6BA651BF2515DE6361361D28B23FC496B28F037B930A7F4`다.
- 재구성 스크립트 해시는 `931110C2DB0E311156DF15E2CCC3903ED8B6600A86A94353D225BA5FDD565EC7`, 문장검토 스크립트는 `7338CD771233806CFD965ADF25D5FAD01AB0ABBE0B91998B1202ECE6E31D253D`, anchor 검사 스크립트는 `6CCA1FA6E6C58FAF025651A0647674C204DFF324E8492121388553CC236109B4`다.

## Validation and review boundary

- source-only validator에서 번역은 **schema_pass**다: 7,045 words, H2 9개, H3 4개, H4 9개, 127 paragraphs, 127 block reveals, 284 sentence reveals, reference ratio 1.0.
- 최신 수정본으로 `tmp/martinson-stage2-corrections-preview-20260823-r1`을 격리 빌드했다. 링크는 **PASS, 243 HTML / 6,082 local targets**, 원문 reveal은 **PASS, 127/127 blocks / 284 sentences**였고, HTML·JS·CSS privacy 검사에서 사적 경로·챗봇·STT·녹음·전사 표식이 0건이었다.
- 원 PDF 12쪽 기준 최초 독립 전수감사에서 나온 **Major 2 / Minor 1**의 원인이 재생성 원천과 파생 산출물에 반영됐다. 별도 수정 재감수에서 여섯 문장쌍의 원문·번역·정렬 레코드를 다시 대조해 `arguably`, `suggests`, `lived experiences`, Rozanova 귀속이 모두 보존됨을 확인했다. 최종 판정은 **PASS — Critical 0 / Major 0 / Minor 0**이다.
- 공개 `docs` 빌드, 승인, Stage 3 작성, 배포, 커밋은 수행하지 않았다.
