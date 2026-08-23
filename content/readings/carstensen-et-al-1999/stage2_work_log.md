# Stage 2 Work Log - carstensen-et-al-1999

## Authority and reconstruction

- 승인된 `full.md`와 `source_segments.json`만 번역의 권위 원문으로 사용했다. 원 PDF와 17쪽 렌더는 그림·쪽 이어짐·인쇄상 표현을 확인하는 보조 근거로만 사용했다.
- 이전 학기 자료, 음성·녹취 자료와 개인 식별 가능 자료는 읽거나 번역 콘텐츠로 가져오지 않았다.
- `scripts/reconstruct_carstensen_translation.py`에 제목·H1–H4·그림 대체텍스트 매핑과 비참고문헌 텍스트 100개 블록의 완역을 선언했다.
- 재구성기는 그림 2개의 자산 경로를 유지하고, `## References` 뒤 116개 항목을 원문 그대로 복사한다.
- 재구성기는 번역 블록 100개, 그림 2개, 참고문헌 116개와 문자 동일성, 핵심 이론·실험·그림 sentinel 및 금지된 사설 자료 표지를 검사한 뒤 `translation.md`를 생성한다.

## Translation passes

- 1차: 제목, 저자·소속, 초록, Liebman·Medina 인용문, 편집자 주와 저자 주를 옮기고 핵심 용어를 고정했다.
- 2차: 이론의 세 가정, 지식 관련 목표와 정서적 목표의 경쟁, 시간 관점에 따른 목표 우선순위, 그림 1과 각주 1–3을 번역했다.
- 3차: 사회적 상대의 정신적 표상, HIV 상태별 하위표본, 18장 카드와 다차원척도분석, 우연기억과 그림 2의 모든 수치를 대조했다.
- 4차: 정서 조절의 자기보고·부부 관찰·경험표집 증거를 옮기고 빈도·강도·지속시간·혼합성의 결과를 구분했다.
- 5차: 사회연결망의 생애 변화, 이탈이론과 선제적 가지치기, 69–104세 Berlin Aging Study와 횡단설계의 한계를 번역했다.
- 6차: 11–92세 실험, 30분·이사·20년 수명 연장 조작, 8–90세 홍콩 표본과 반환 전후 자연실험을 원문 순서대로 옮겼다.
- 7차: 생애발달·사회/성격·문화·인지·임상심리학의 함의와 맺음말을 번역하고, 가능성·추측·제한 표현을 보존했다.
- 8차: 116개 참고문헌을 원문의 문자·순서·구두점 그대로 보존하고 본문 수치·연도·인명·인용 묶음을 전수 대조했다.

## Segmentation and alignment

- `tmp/source_segment_plans/carstensen-et-al-1999-translation.json`은 승인된 원문 계획과 같은 22개 ID 및 블록 범위 1–216을 사용하고 한국어 절 이름을 선언한다.
- `scripts/generate_translation_segments.js`로 22개 세그먼트와 216개 번역 콘텐츠 블록을 생성했다.
- `scripts/generate_block_alignment.js --plan tmp/source_segment_plans/carstensen-et-al-1999-translation.json --verified`로 펼쳐보기 대상 207개 문단을 단조롭게 정렬했다.
- `scripts/review_carstensen_sentence_alignment.js`로 605개 문장쌍을 의미·순서·누락·인용·인명·숫자·한정 표현 기준으로 검토했다.
- 양 언어의 문장부호와 세미콜론·인용문 때문에 경계가 다른 22개 블록에는 전체 원문과 번역을 빠짐없이 순서대로 덮는 수동 결합 규칙을 명시했다.
- 모든 문단의 `sentence_alignment_method`는 `human-reviewed-v1`, 모든 문장쌍의 상태는 `verified`이며 원문 숫자 누락은 0개다.

## Content fidelity checks

- Markdown 구조는 원문과 번역 모두 제목 뒤 H2/H3/H4가 6/11/2개, 그림이 2개, 문단이 207개, 인용 블록이 7개다.
- Figure 1의 목표 궤적, Figure 2의 네 평균·표준오차와 자산 경로, 캡션·저작권·접근성 설명을 원문과 대조했다.
- 116개 참고문헌의 분리 항목 수와 참고문헌 절 전체 바이트가 원문과 동일함을 확인했다.
- 비참고문헌의 네 자리 연도는 블록별 중복 횟수까지 모두 보존되며, 참고문헌 저자 성의 출현 횟수 대조에서도 인용 누락이 없었다.
- 원문 인쇄상 `principle age differences`를 번역에 투명하게 표시했다.

## Independent Stage 2 audit

- 번역 저작자와 다른 검수자가 22개 세그먼트의 원문과 한국어를 처음부터 끝까지 문장 단위로 재대조했다. 최초 판정은 **HOLD (Critical 0, Major 1, Minor 6)**였고, 뜻을 바꿀 수 있거나 이론 범위를 과장할 수 있는 표현을 권위 생성 스크립트에서 수정했다.
- `social niches`를 `사회적 지위`로 옮긴 오류를 `사회적 틈새`로 바로잡고, `open-ended`/`unlimited`를 `무한`으로 과장한 표현은 각각 `개방형`/`제한되지 않은` 시간으로 구분했다.
- Rothbart 인용문의 수식 범위, 정서 목표와 자원 할당의 관계, HIV 결과의 평행성, 생리활동 측정, 자기상징화 행동 표현을 원문에 맞게 교정했다.
- 수정 뒤 수치·연도·인용·한정어를 다시 대조했으며 Critical/Major/Minor 잔여 결함은 **0/0/0**, 최종 판정은 **PASS**다.

## Validation and reproducibility

- `node scripts/check_alignment.js --slug carstensen-et-al-1999 --strict --write-report`: **PASS 22/22**, 오류 0, 경고 0.
- `node scripts/validate_content.js --slug carstensen-et-al-1999 --source-only --json`: 번역 `schema_pass`; 원문과 번역의 H2/H3/H4 수는 각각 6/11/2, 그림은 각각 2개, 문단은 각각 207개다.
- `node scripts/build_site.js --preview-locked --preview-draft --output-dir tmp/carstensen-stage2-full-preview-audit-r2`: 프로젝트 내부의 새 전체 격리 미리보기 디렉터리에만 생성했다.
- `node scripts/check_rendered_reveals.js --slug carstensen-et-al-1999 --site-dir tmp/carstensen-stage2-full-preview-audit-r2`: **PASS 207/207 block reveals, 605 sentence reveals**.
- 실제 `--site-dir`을 적용한 링크 검사에서 **PASS 243 HTML / 5,140 local targets**, 누락 경로·누락 프래그먼트·사설 경로·챗봇 노출 0건을 확인했다.
- 재구성·세그먼트·블록정렬·문장정렬을 연속으로 두 번 실행한 뒤 다음 세 파일이 바이트 단위로 동일함을 확인했다.
  - `translation.md`: `CF1858DD8331904C4BDFE277EF9E2F8B7E5A8F08D0549A715577103288CE14BE`
  - `translation_segments.json`: `3F76486CDD89FD39DF323C08BFD609AD3E1E2808E2CA3B3792B6CFBA3830A8D4`
  - `translation_alignment.json`: `86389BF5F2BFEDD2B8B22A9C9A585EF9545B5D9F3A8AC8081FB16EAFAA6BA1B4`
- `manifest/readings.json`의 해당 항목에 `translation_original_reveal`을 `details` 모드로 연결했다. 수동 승인 상태는 변경하지 않았다.
- 공개 `docs` 빌드, 배포, 수동 승인, 후속 학습자료 작성과 커밋은 수행하지 않았다.
