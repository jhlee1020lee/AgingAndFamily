# Stage 2 Work Log - lin-et-al-2018

## Authority and reconstruction

- 요청 메시지의 `lin-et-al-2017`은 저장소에 존재하지 않았고, 부모 작업자 확인을 받아 실제 승인된 slug `lin-et-al-2018`을 대상으로 작업했다.
- 승인된 `full.md`와 `source_segments.json`만 번역의 권위 원문으로 사용했다.
- `scripts/reconstruct_lin_translation.py`에 제목·H2–H4, 그림·표 대체텍스트 3개와 참고문헌 이외 텍스트 58개 블록의 완역을 선언했다.
- 재구성기는 원문 Markdown 121개 블록, 번역 텍스트 58개, 이미지 3개, 참고문헌 36개, 블록별 원문 숫자, 핵심 표본·모형·결과 sentinel과 금지 표지를 검사한다.
- `## 참고문헌` 아래 36개 항목은 원문에서 그대로 복사하며 줄바꿈 정규화를 제외한 참고문헌 절 전체의 문자 동일성을 강제한다.

## Translation decisions and review passes

- `gray divorce`는 한국어 노년학·가족학 문맥에서 통용되는 `황혼이혼`으로 고정하고 초록 첫 문장에서 의미 범위를 50세 이후 이혼으로 명시했다.
- `life course perspective`는 `생애과정 관점`, `turning point`는 `전환점`, `marital biography`는 `결혼이력`으로 통일했다.
- 결혼차수·결혼기간·결혼의 질, 배우자 동질혼·이질혼, 비공유 자녀를 서로 다른 구성개념으로 유지했다.
- 1차 검토에서 제목, 저자·소속·출판·교신·저작권 메타데이터, 구조화 초록, 핵심어를 대조했다.
- 2차 검토에서 1990–2010 황혼이혼율 변화, 생애과정 전환점 세 가지, 결혼이력·결혼의 질·동질혼 배경과 연구질문을 확인했다.
- 3차 검토에서 1998–2012 HRS 코호트 구성, 응답률·가중치, 원문이 보고한 5,566쌍·네 제외수·최종 5,331쌍·29,286 관측치를 대조했다. 네 제외수를 단순 차감하면 5,113이어서 최종 N과 맞지 않는 출판 원문 내부 불일치는 임의로 고치지 않고 그대로 보존했다.
- 4차 검토에서 시간가변·시간불변 측정, 2년 시차, 결혼의 질 2문항과 2–6 범위, 인종·연령·교육 동질성 및 자산범주를 확인했다.
- 5차 검토에서 생존확률, 이산시간 로지스틱 사건사 모형, 위험률 식, 분석 진입·중도절단, MICE·다중대치·가중치 적용을 대조했다.
- 6차 검토에서 Figure 1과 Table 1–2의 alt·caption·접근성 설명, 모든 주요 수치·부호·유의성·상호작용 결과를 확인했다.
- 7차 검토에서 이변량과 다변량 결과를 구분하고, 아내의 은퇴 효과 소멸, 재혼과 결혼기간의 교란, 무관련 전환점 및 상호작용 0건을 보존했다.
- 8차 검토에서 논의의 범위, 표본탈락·결혼의 질 측정시점·누락변수·코호트 한계, 후속연구 제안과 연구비를 대조했다.
- 9차 검토에서 참고문헌 36개, 본문 인용의 저자명·연도, 모든 숫자를 블록 및 문장쌍 단위로 전수 확인했다.

## Corrections during self-review and independent audit

- 원문의 `In general`을 옮긴 `전반적으로`가 strict validator의 요약 대체 탐지어와 충돌하여 의미가 같은 `일반적으로`로 교정했다.
- HRS 코호트 구성 문장에서 원문에 없는 `1924–1930`이 AHEAD 연구까지 수식하던 초벌 범위 오류를 제거했다. 해당 연도는 원문대로 CODA 코호트만 수식한다.
- 재혼 218건 제외 문장의 조사 결합을 다듬어 의미와 문장 자연성을 함께 바로잡았다.
- 각 교정 뒤 번역문, 번역 세그먼트, 블록정렬, 문장정렬을 모두 다시 생성했다.
- 독립 검수의 최초 판정은 **HOLD (Critical 0 / Major 0 / Minor 2)**였다. `more consequential`을 `더 큰 결과를 가져올 수 있다`로 옮긴 어색한 표현을 `더 큰 영향을 미칠 수 있다`로 바로잡았다.
- 같은 검수에서 `integral to divorce in later life`를 필요조건처럼 읽힐 수 있는 `노년기 이혼에도 필수적이다`가 아니라 관련성의 핵심성을 나타내는 `노년기 이혼에도 핵심적으로 관련된다`로 교정했다.
- 교정 후 22개 세그먼트와 Figure 1·Table 1–2를 다시 대조해 **PASS (Critical 0 / Major 0 / Minor 0)**로 판정했다. 원문의 자산범주 개수 불일치(여섯 범주라고 한 뒤 다섯 범주만 열거)와 Table 1 본문의 `12. 62`는 원문 자체의 특징으로 확인해 임의로 고치지 않았다.

## Segmentation and alignment

- `tmp/source_segment_plans/lin-et-al-2018-translation.json`은 승인 원문 계획과 동일한 22개 ID와 1–94 블록 범위를 사용하며 한국어 절 이름을 선언한다.
- `scripts/generate_translation_segments.js`로 22개 번역 세그먼트와 94개 번역 계획 블록을 생성했다.
- `scripts/generate_block_alignment.js --verified`로 원문 보기 대상 89개 문단을 같은 순서로 정렬했다.
- `scripts/review_lin_sentence_alignment.js`로 332개 문장쌍을 의미·순서·누락·수치·인명·인용·한정 표현·모형·결과·한계 기준으로 전수 검토했다.
- 문장 경계가 다른 10개 문단에는 원문과 번역 전체를 빠짐없이 순서대로 덮는 수동 결합 규칙을 명시했다.
- 모든 문단의 `sentence_alignment_method`는 `human-reviewed-v1`, 모든 문장쌍 상태는 `verified`이며 문장쌍별 원문 숫자 누락은 0개다.

## Validation and isolated preview

- `node scripts/check_alignment.js --slug lin-et-al-2018 --strict`: **PASS 22/22**, 오류 0, 경고 0.
- `node scripts/validate_content.js --slug lin-et-al-2018 --source-only --json`: 번역 `schema_pass`, Stage 2 `manual_review_required`; 원문과 번역 H2/H3/H4 9/6/8, 그림·표 3개, 문단 89개.
- `node scripts/build_site.js --preview-locked --preview-draft --output-dir tmp/lin-stage2-full-preview-independent-r1`: slug 없이 프로젝트 내부의 새 전체 격리 미리보기를 생성했다.
- `node scripts/check_rendered_reveals.js --slug lin-et-al-2018 --site-dir tmp/lin-stage2-full-preview-independent-r1`: **PASS 89/89 block reveals, 332 sentence reveals**.
- `node scripts/check_site_links.js --site-dir tmp/lin-stage2-full-preview-independent-r1`: **PASS 243 HTML files, 5,441 local targets, no private paths or chatbot**.
- 번역 원본·세그먼트·정렬과 대상 렌더에서 `source_pdfs/`, private 절대경로, STT·녹음·전사자료, 챗봇 UI·코드·문구가 없음을 추가 확인했다.

## Reproducibility and hashes

- 번역 재구성, 번역 세그먼트 생성, 계획 기반 블록정렬, 문장정렬을 연속 두 번 실행해 다음 세 파일이 바이트 단위로 동일함을 확인했다.
  - `translation.md`: `05D42E8E3B51809715C3AC766CF4217E5A495E119DC694AABE7E9D4EFBA8B72E`
  - `translation_segments.json`: `7F731C84F44F684EC61418FCAAFC954AACC3C89DB20B38E1A55304904EE5D49B`
  - `translation_alignment.json`: `BF65D9728C87C6D01CA30AA23593BAD4F0B624661E451EC886167DFDD397DEEE`
- 권위 재구성기 `scripts/reconstruct_lin_translation.py`: `3DD42F28D101567A40FB6F919E9DC3AA0E4945BF2458595537AE509E6AB9D23F`.
- manifest의 `lin-et-al-2018` 항목에 `translation_original_reveal`을 `details` 모드로 연결했다.
- 공개 `docs` 빌드, 배포, 승인, Stage 3 작성, 커밋은 수행하지 않았다.

## Final Stage 2 review status

- 독립 검수의 두 경미한 지적을 모두 교정했고, 재검수·strict alignment·source-only schema·격리 렌더 검사를 모두 통과했다.
- `translation` 페이지는 `codex-root`가 source-only 방식으로 승인했다. Stage 3 학습자료는 아직 작성 대상이다.
