# Translation QA Checklist

- Reading: `martinson-berridge-2015`
- Author-side structure/alignment status: **PASS**
- Workflow status: **PASS — independent correction re-audit complete**

- [x] 승인된 `full.md`와 28개 `source_segments.json`만 번역의 텍스트 권위로 사용했다.
- [x] 제목·저자·소속·출판정보·초록·핵심어·본문·두 장문 인용·한계·결론·참고문헌을 원문 순서대로 보존했다.
- [x] 원문과 같은 H2 9개, H3 4개, H4 9개, 문단 127개 구조를 유지했다.
- [x] 논문에 실질적인 표·그림이 없음을 Stage 1의 PDF 12쪽 대조 및 재구성 sentinel로 확인했고 임의 시각자료를 추가하지 않았다.
- [x] 검색 풀 453편, 포함 67편, 이중코딩 15편과 네 비판 범주 16/30/14/7을 구분했다.
- [x] `16%–24%`, `11.9%`, `3.3%–33.5%`, `50.3%/18.8%`, `63%/30%`, `92%`의 값·분모·귀속을 재구성 sentinel과 번역 세그먼트에서 확인했다.
- [x] 객관적 기준과 주관적 자기평가, 정의 확장과 개인화, 개념 폐기와 재구성·개명의 차이를 유지했다.
- [x] 개인주의·개인책임, 문화적 누락, 연령주의·능력주의, 신자유주의 맥락 비판을 원문보다 강한 인과명제로 만들지 않았다.
- [x] `may`, `could`, `suggest`, `arguably`, 한계·반론에 대응하는 가능성·유보 표현을 유지했으며 strict alignment 경고는 0건이다.
- [x] 비판노년학의 `lived experiences` 두 곳을 “삶의 경험”으로 보존하고, Rozanova의 인용 도입부는 성별 대명사 대신 실명으로 귀속했다.
- [x] 28/28 세그먼트 순서와 범위가 일치하고 번역 레코드는 모두 `is_summary: false`다.
- [x] 127개 문단 정렬과 284개 문장쌍이 원문·번역 양쪽 전체를 순서대로 덮는다.
- [x] 18개 수동 문장경계 규칙은 어느 쪽 텍스트도 버리지 않고 연속 범위만 결합한다.
- [x] 모든 문단 정렬 상태는 `verified` / `human-reviewed-v1`이며 문장쌍별 원문 숫자 누락은 0건이다.
- [x] 참고문헌 74개는 14,924바이트, SHA-256 `F8964C1EEC9138F7587594CB4BAE533F8A96665E64E9F50C318AA87AB82F5B9C`로 byte-identical이다.
- [x] 전체 번역 파이프라인을 두 번 실행해 `translation.md`, `translation_segments.json`, `translation_alignment.json`의 재현 해시가 동일함을 확인했다.
- [x] source-only 번역 스키마와 strict alignment 28/28을 오류·경고 없이 통과했다.
- [x] 독립 전수감사에서 확인된 다섯 번역쌍과 한 귀속 표현의 수정 결과를 별도 검수자가 다시 확인해 Critical 0 / Major 0 / Minor 0을 확정했다.
- [x] 최신 결정론적 재생성 산출물로 `tmp/martinson-stage2-corrections-preview-20260823-r1`을 격리 빌드하고 링크 243 HTML/6,082 targets와 127/127 문단·284개 문장 reveal을 확인했다.
- [x] 최신 격리 렌더의 HTML·JS·CSS에서 챗봇, 녹음·전사·STT, 사적 경로·학생정보 표식 0건을 확인했다.
- [x] 공개 `docs` 빌드, 승인, Stage 3 작성, 배포, 커밋은 수행하지 않았다.

## Manual review notes

- 원문 참고문헌은 번역 대상이 아니라 승인된 영문을 그대로 보존하는 정책을 적용했다.
- 논문은 성공적 노화 담론을 검토·비판하는 체계적 문헌고찰이다. 각 비판을 저자 자신의 새로운 실증 인과효과로 오해하지 않도록 귀속 표현을 유지했다.
- 2026-08-23 독립감사 지적에 따라 `tr-025-s03`, `tr-031-s07`, `tr-036-s03`, `tr-044-s03`, `tr-050-s03`, `tr-051-s03`을 원천 스크립트에서 수정하고 전체 파생 산출물을 두 번 재생성했다.
- 수정 작성자와 분리된 검수자가 영향받은 여섯 문장쌍과 최신 렌더를 재확인했으며 최종 판정은 Critical 0 / Major 0 / Minor 0이다.
