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
- 남은 경고 1개는 SUBJECTIVE-AGE-001의 원문 `however`를 한국어 `그럼에도`로 충실히 옮겼으나 자동 검사가 제한표현 표지로 인식하지 못한 데서 생긴 오탐이다.

## Manual review status

- 번역은 생활연령/노화 구분, Neugarten 범주의 원뜻, 통합·분리의 양방향성, 결론의 역설을 중심으로 사람 검수를 기다리며 `meta.json`에서 승인하지 않았다.
