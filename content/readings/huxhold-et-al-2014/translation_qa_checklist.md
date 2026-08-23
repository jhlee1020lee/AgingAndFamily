# Translation QA Checklist

- Reading: `huxhold-et-al-2014`
- Alignment status: **PASS**

- [x] All source segment_id values have translations
- [x] No translation-only segment_id values exist
- [x] Segment order is unchanged
- [x] No summary-style replacement was detected
- [x] Numbers, table/figure references, and required IDs passed automated checks
- [x] Manual review completed for abstract/method/result/discussion/backmatter/references

## Manual Review Notes

- `source_segments.json`의 22개 ID와 순서를 그대로 유지했으며 누락·추가·순서 불일치가 없다.
- 제목, 저자·소속, 구조화 초록, 핵심어, 본문, 연구비, 교신정보를 요약 없이 번역했다. 원문과 번역은 각각 111개 마크다운 콘텐츠 블록 및 132개 문서 블록으로 구조와 순서가 일치한다.
- 표본과 파동, DEAS 코호트 순차설계, 척도와 신뢰도, 통제변수, 측정불변성, LCS 모형, 모형 적합도와 모든 보고 통계량을 문단별로 대조했다.
- 중년 집단과 노년 집단의 PA·NA·삶의 만족도 결과를 구분하고, 노년 집단에서 가족 활동과 친구 활동이 NA에 보인 반대 방향의 연관성(`βfriends = −0.08`, `βfamily = 0.08`)을 보존했다.
- `may`, `seem`, `suggest`, `plausible`, `associated with`, `predictive of`의 가능성·연관성·예측 표현을 인과적 단정으로 강화하지 않았다. 변화 간 연관성이 횡단적이어서 논의에서 해석하지 않는다는 저자의 제한도 유지했다.
- 그림 1, 그림 2, 회전된 표 1의 파일 위치·캡션·접근성 설명이 원문과 1:1로 대응한다.
- 100개 문단/맥락 블록과 264개 문장쌍을 전수 대조했다. 모든 항목은 `human-reviewed-v1`, 모든 문장쌍은 `verified`이며 한국어와 영어 원문을 각각 완전한 순서로 덮는다.
- 그림 2 캡션의 `T1 vs. T2`를 자동 분리기가 두 문장으로 오인한 곳은 하나의 완전한 캡션 문장쌍으로 수동 재결합했다.
- 문장쌍별 숫자 토큰을 전수 검사해 원문 숫자가 빠진 문장쌍은 0개였고, strict alignment는 오류와 경고 없이 통과했다.
- 참고문헌 53개는 줄바꿈을 정규화한 뒤 `full.md`와 문자 단위로 정확히 일치하며 순서·구두점·서지정보를 변경하지 않았다.
- 수동 승인, 메타데이터 변경, 공개 사이트 빌드와 배포는 수행하지 않았다.
