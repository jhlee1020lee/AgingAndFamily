# 작업 원칙

1. 정적 HTML/CSS/vanilla JavaScript 구조를 유지한다.
2. `manifest/readings.json`을 읽기 목록과 공개 순서의 단일 기준으로 사용한다.
3. 원본 PDF는 `source_pdfs/`에만 두고 `docs/`나 Git에 복사하지 않는다.
4. 한 번에 `논문 1편 × 단계 1개 × 검증 1회` 단위로 작업한다.
5. 새 영문 읽기는 `source_segments.json`과 `translation_segments.json`을 같은 ID·순서로 유지한다.
6. 번역은 요약하지 않고 원문의 주장 강도, 수치, 표·그림, 한계와 참고문헌 구조를 보존한다.
7. 퀴즈 정답은 새 논문의 `evidence_segment_id`에 연결한다. 과거 성발노 자료는 문항 형식 참고에만 쓴다.
8. 강의 녹음, STT, 수강생 정보, 교수·조교 연락처를 공개 산출물에 넣지 않는다.
9. 빌드 후 strict alignment, source/content validation, 데스크톱·모바일 화면을 모두 확인한다.
10. 승인된 파일이 바뀌면 승인 해시가 무효화되므로 다시 검수한다.
