# Translation Work Log - settersten-godlewski-2016

## Pass 1 - 개인 수준의 연령

- 제목, 저자, 서지정보와 도입부부터 주관적 연령까지 전문을 번역했다.
- chronological age를 `생활연령`, subjective age를 `주관적 연령`, awareness of age-related change를 `연령 관련 변화에 대한 자각`으로 통일했다.
- 나이·기간 예시와 AARC의 5개 영역, 모든 연도·페이지·Chapter 번호를 원문과 대조했다.

## Pass 2 - 복수의 시간과 사회조직

- family/organizational/historical time을 가족시간·조직시간·역사시간으로 구분했다.
- age structuring, life phases, age norms, age integration/segregation의 사회적 의미와 양방향 조건을 보존했다.
- `may`, `might`, `seems`, `can`에 해당하는 가능성 표현을 단정으로 강화하지 않았다.

## Pass 3 - 교차성과 결론·참고문헌

- 젠더·계층·인종·문화의 결합, Project AGE의 7개 문화 맥락과 3개 의미 영역을 누락 없이 옮겼다.
- 결론의 두 방향—개인 수준에서 연령을 원인으로 자동 사용하지 말 것과 사회 수준에서 연령구조를 가시화할 것—을 함께 유지했다.
- 68개 참고문헌은 인명·제목·연도·권호·쪽의 검색·인용 정확성을 위해 원문 서지 표기를 유지했다.

## Alignment QA

- `source_segments.json`과 `translation_segments.json`은 동일한 19개 ID를 같은 순서로 갖는다.
- `translation_alignment.json`은 번역의 렌더링 문단 86개를 원문 문단에 연결한다.
- 엄격 정렬 검사에서 누락 ID, 순서 불일치, 수치 누락, 표·그림 참조 오류는 0개다.
- 엄격 정렬 검사의 오류와 경고는 모두 0개다.

## Independent audit correction - 2026-08-22

- PDF p. 10과 `full.md`를 다시 대조해 `그러나 대개 연령은 ...` 문단 뒤에 `지위와 경험의 대리변수로서의 연령` 소제목이 오도록 `translation.md`의 절 경계를 바로잡았다.
- `scripts/fix_settersten_translation_boundaries.js`에 같은 제목 배치 규칙을 추가했으며, 교정 후 재실행한 결과 `translation.md`의 SHA-256이 바뀌지 않았다.
- 원문의 결론 1문단을 번역에서 2문단으로 나눈 구조는 `translation_alignment_plan.json`에 명시하고, 계획 기반 블록 생성기로 86개 정렬 항목을 재생성했다.
- 문장 정렬은 자동 336쌍 생성 후 7개 불일치 블록의 사람 검토 규칙을 재적용하여 340쌍 모두 `verified`로 승격했다.
- 재현·검증 명령은 다음과 같다.
  - `node scripts/generate_block_alignment.js --slug settersten-godlewski-2016 --plan content/readings/settersten-godlewski-2016/translation_alignment_plan.json --force --verified`
  - `node scripts/generate_sentence_alignment.js --slug settersten-godlewski-2016 --force`
  - `node scripts/review_sentence_alignment.js --slug settersten-godlewski-2016`
  - `node scripts/generate_sentence_alignment.js --slug settersten-godlewski-2016 --promote`
  - `node scripts/check_alignment.js --slug settersten-godlewski-2016 --strict --json`
  - `node scripts/validate_content.js --slug settersten-godlewski-2016 --source-only --json`
  - `node scripts/build_site.js --slug settersten-godlewski-2016 --preview-locked --preview-draft --output-dir tmp/settersten-stage2-fix-preview`
  - `node scripts/check_rendered_reveals.js --slug settersten-godlewski-2016 --site-dir tmp/settersten-stage2-fix-preview`
- 최종 결과는 19/19 strict PASS, 86/86 블록 reveal, 340/340 문장 reveal, 참고문헌 원문 보존 비율 1.00이다.
- 승인, `meta.json` 갱신, 공개 `docs/` 빌드, 커밋은 수행하지 않았다.

## Manual review status

- 생활연령/노화 구분, Neugarten 범주의 원뜻, 통합·분리의 양방향성, 결론의 역설과 7개 문장 수 불일치 블록을 독립 검수했으며, `meta.json` 승인 상태는 변경하지 않았다.
