# Translation QA Checklist

- Reading: `cotten-2021`
- Alignment status: **PASS**

- [x] All source segment_id values have translations
- [x] No translation-only segment_id values exist
- [x] Segment order is unchanged
- [x] No summary-style replacement was detected
- [x] Numbers, table/figure references, and required IDs passed automated checks
- [x] Manual review completed for frontmatter/body/figures/table/backmatter/references

## Manual Review Notes

- `source_segments.json`의 22개 ID와 순서를 그대로 유지했으며 누락·추가·순서 불일치가 없다. 원문과 번역은 각각 203개 세그먼트 콘텐츠 블록 및 228개 문서 블록으로 구조와 순서가 일치한다.
- 제목, 저자·소속, 장 개요, 7개 H2와 12개 H3, 본문, 그림·표 캡션과 접근성 설명을 요약 없이 번역했다.
- 정보통신기술(ICT) 이용의 연령·교육·소득·인종 및 민족 차이, 디지털 격차와 디지털 불평등의 구분, 인터넷·휴대전화·소셜미디어 이용률과 시점별 수치를 원문과 대조했다.
- 사회적 선택과 사회적 원인, 사회적 유대·사회적 지지·고립·외로움·안녕·우울 관련 결과를 구분했다. 횡단연구·종단연구·무작위 개입의 증거 수준과 양방향성·선택편향·내생성 제한을 인과적 단정으로 강화하지 않았다.
- 퍼빙, 테크노스트레스, 관계 유지 부담, 사이버불링, 과도한 이용 등 예상하지 못한 결과와 신흥기술·사물인터넷·원격보건·자율주행차 논의를 원문의 가능성 표현과 함께 보존했다.
- 그림 23.1–23.5와 표 23.1의 자산 경로·레이블·캡션·출처·수치를 보존했다. 원문에 인쇄된 자율주행차 관련 `81%`도 임의 교정하지 않았다.
- 199개 문단/맥락 블록과 488개 문장쌍을 전수 대조했다. 모든 정렬 항목은 `human-reviewed-v1`, 모든 문장쌍은 `verified`이며 한국어와 영어 원문을 각각 완전한 순서로 덮는다.
- 자동 문장분리 경계가 다르거나 인용구의 위치가 이동한 30개 블록은 문맥 단위로 수동 재결합했다. 문장쌍별 원문 숫자 토큰 누락은 0개이고 strict alignment는 오류와 경고 없이 통과했다.
- 참고문헌 132개와 더 읽을거리 2개는 줄바꿈을 정규화한 뒤 `full.md`와 문자 단위로 정확히 일치하며 순서·구두점·서지정보를 변경하지 않았다.
- 수동 승인, 공개 메타데이터 변경, 공개 사이트 빌드·배포·커밋 및 번역 페이지 외 사용자 기능 추가는 수행하지 않았다.
