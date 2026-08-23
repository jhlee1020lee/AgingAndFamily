# Stage 2 Work Log - smith-et-al-2007

## Authority and reconstruction

- 승인된 `full.md`와 `source_segments.json`만 번역 문안의 권위 원문으로 사용했다. 원 PDF 11쪽과 기존 렌더는 표·인용·배치 및 승인 원문의 시각적 일치 여부를 확인하는 용도로만 대조했다.
- `scripts/reconstruct_smith_translation.py`에 제목·H1–H3·이미지 대체텍스트 매핑과 비참고문헌 78개 블록의 완역을 선언했다.
- 재구성기는 표 이미지 3개의 경로를 유지하고 대체텍스트만 번역하며, `## References` 뒤 59개 항목을 원문 그대로 복사한다.
- 재구성기는 번역 블록 78개, 이미지 3개, 참고문헌 문자 동일성, 핵심 개념·표본·수치·인용 sentinel과 금지된 사적/대화형 흔적의 부재를 확인한 뒤 `translation.md`를 생성한다.

## Translation passes

- 1차: 제목, 저자·소속, 초록, 핵심어와 독립성·헤게모니적 남성성·성공적 노화의 이론적 배경을 번역하고 핵심 용어를 고정했다.
- 2차: FAMAS 연구 맥락, 표본·층화, 윤리승인, 면담 환경·라포, JS와 참여자의 연령차, NVIVO 귀납적 주제분석을 원문과 대조했다.
- 3차: 11명의 참여자 진술과 면담자 질문을 포함한 면담 인용 26개 블록을 순서와 발화자·연령·괄호 표기까지 보존해 번역했다. 앞부분의 메타데이터 인용 형식 블록 5개까지 합친 전체 인용 형식 구조는 31개다.
- 4차: 남성성 담론의 자기의존·통제·강인함과 성공적 노화 담론의 일상기능·삶의 질을 구분하면서 두 담론이 얽혀 있다는 저자의 해석을 옮겼다.
- 5차: 죽음에 가까웠던 경험, 죽음 욕망, 운전면허 상실, 안락사·요양원 진술, 전동 스쿠터를 통한 재구성된 독립성을 완곡화하지 않고 문맥에 맞게 번역했다.
- 6차: 실천·정책 함의, 건강을 해치는/증진하는 독립성, 복약 순응, 덜 보편주의적인 정책 접근과 추가 검토 필요성을 대조했다.
- 7차: 표 1–3의 캡션·접근성 설명과 수치, 인쇄된 `Methology` 및 표 1의 `25.5` 인쇄상 이상, 참고문헌 59개를 전수 확인했다.
- 독립감사 중 질적 연구의 `interview schedule`이 시간 일정으로 오해되지 않도록 표 3의 용어를 `면담 일정표`에서 `면담 지침`으로 일관되게 교정하고 생성기부터 모든 파생 정렬 산출물을 재생성했다.

## Segmentation and alignment

- `tmp/source_segment_plans/smith-et-al-2007-translation.json`은 승인된 원문 계획과 동일한 16개 ID와 블록 범위 1–137을 사용하고 한국어 절 이름을 선언한다.
- `scripts/generate_translation_segments.js`로 16개 세그먼트와 137개 번역 콘텐츠 블록을 생성했다.
- `scripts/generate_block_alignment.js --verified`로 원문 공개 대상 106개 문단을 단조롭게 1:1 정렬했다. 인용문 31개는 Markdown 인용 구조를 유지한 채 세그먼트 완전성 검사에 포함된다.
- `scripts/review_smith_sentence_alignment.js`로 251개 문장쌍을 의미·순서·누락·인용·수치·한정 표현·핵심 개념 구분 기준으로 전수 검토했다.
- 영어와 한국어의 문장 경계가 다른 5개 문단에는 양쪽 전체 문장을 순서대로 덮는 수동 결합 규칙을 명시했다.
- 모든 정렬 문단의 `sentence_alignment_method`는 `human-reviewed-v1`, 모든 문장쌍의 상태는 `verified`이며 문장쌍별 원문 숫자 누락은 0건이다.

## Validation and reproducibility

- `node scripts/check_alignment.js --slug smith-et-al-2007 --strict`: **PASS 16/16**, 오류 0, 경고 0.
- `node scripts/validate_content.js --slug smith-et-al-2007 --source-only --json`: 번역 `schema_pass`; 원문과 번역의 H2/H3 수는 각각 8/7, 표 이미지는 각각 3개, 공개 대상 문단은 각각 106개이다.
- `node scripts/build_site.js --slug smith-et-al-2007 --preview-locked --preview-draft --output-dir tmp/site-preview-smith-stage2`: 프로젝트 내부 임시 디렉터리에만 격리 미리보기를 생성했다.
- `node scripts/check_rendered_reveals.js --slug smith-et-al-2007 --site-dir tmp/site-preview-smith-stage2`: **PASS 106/106 block reveals, 251 sentence reveals**.
- Smith 격리 하위페이지 11개에 대한 로컬 링크·자산·프래그먼트 검사: **PASS 185 targets**, 사적 경로·챗봇 흔적 0건.
- 재구성·세그먼트·블록정렬·문장정렬을 연속으로 다시 실행한 뒤 아래 세 파일이 바이트 단위로 동일함을 확인했다.
  - `translation.md`: `8D45C44F7C923ED30D22865B79153354AED95FF42BD5B3FC3243A349EDF5F237`
  - `translation_segments.json`: `2248F1EFB4CFFA339DDEFB52666C89A361E2563AA073143EFBD94739049414A5`
  - `translation_alignment.json`: `7E2692120CF8B2F08612E1115E61FF1E49DA19528D990C20848BCD8829CF1B11`
- `manifest/readings.json`의 해당 항목에 `translation_original_reveal`을 `details` 모드로 연결했다. 수동 승인 상태는 변경하지 않았다.
- 공개 `docs` 빌드, 배포, Stage 3 학습자료 작성 또는 커밋은 수행하지 않았다.
