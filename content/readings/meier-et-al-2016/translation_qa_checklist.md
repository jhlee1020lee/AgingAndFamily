# Translation QA Checklist

- Reading: `meier-et-al-2016`
- Alignment status: **PASS — independent manual review complete**

- [x] 제목, 여섯 저자, 소속·출판·접수·교신·저작권 메타데이터를 같은 위치에 보존했다.
- [x] 초록, 핵심어, 서론, 방법, 결과, 논의, 향후 연구 방향, 연구비와 보충자료를 요약으로 대체하지 않고 완역했다.
- [x] 원문과 번역의 18개 `segment_id`, 118개 콘텐츠 블록, H2 11개, H3 4개, 그림·표 4개가 순서와 구조까지 일치한다.
- [x] 111개 문단을 단조롭게 1:1 정렬하고 229개 문장쌍을 `human-reviewed-v1` / `verified`로 검토했다.
- [x] 수동 문장경계 규칙 18개가 양쪽 문장을 빠짐없이 순서대로 덮으며 문장쌍별 숫자 누락은 0건이다.
- [x] 참고문헌 72개는 원문과 같은 10,627바이트이고 SHA-256은 `04F044268497A41065C02A05A6F0B82AAB23B3E164B3078555B1038AA23E2CF3`이다.
- [x] strict 정렬은 18/18, source-only 번역 스키마는 오류·경고 없이 통과했다.
- [x] 원해상도 Figure 1과 Tables 1–3을 독립적으로 시각 대조해 표본흐름, 37개 제외 사유, Table 1의 20행, Table 2의 11개 주제, Table 3의 33개 수/백분율 셀을 확인했다.
- [x] 독립감사에서 숫자 귀속 1건과 한정 표현 2건을 authoritative 스크립트에서 수정하고 전체 재생성 파이프라인을 두 번 실행해 바이트 재현성을 확인했다.
- [x] 새 격리 전체 미리보기 `tmp/meier-stage2-full-preview-independent-r1`에서 243 HTML / 5,430 로컬 대상, 111/111 문단 reveal, 229개 문장 reveal이 통과했다.
- [x] 번역 원천·파생 산출물과 렌더 결과에서 사적 경로, STT, 녹음, 전사, 학생정보, 챗봇 표식은 0건이다.
- [x] 공개 `docs` 빌드, 배포, Stage 3 작성, 커밋은 수행하지 않았다.

## Independent manual review notes

- 첫 판정: **HOLD (Critical 0, Major 1, Minor 2)**.
- `METHOD-SELECTION-001`: `3,434`가 제외된 수처럼 읽히던 문장을 `최초 검색 결과 3,434편 가운데 대부분은 ... 제외`로 수정했다. 그림의 정확한 흐름은 `3,434 − 3,042 = 392`, `392 − 356 = 36`이다.
- `INTRO-001`: `after a recent diagnosis`를 `진단 직후`가 아닌 `최근 암 진단을 받은 뒤`로, `potential unmet needs`를 `아직 충족되지 않았을 수 있는 필요`로 수정했다.
- 수정 뒤 PDF 11쪽과 18개 세그먼트를 다시 대조한 최종 판정: **PASS (Critical 0, Major 0, Minor 0)**.
- 인쇄상 특이값 `p < 0.0.000`, 연령 `14–93`/평균 `89.7`, Table 1의 `Amsterdam`과 `291 White`는 원문 표기를 임의로 고치지 않았다.
- 이해관계자 관점 차이는 논문 빈도의 기술 결과로 유지했고 인과효과로 강화하지 않았다.
