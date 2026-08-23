# Stage 2 Work Log - kalmijn-leopold-2019

## Authority and reconstruction

- 승인된 `full.md`와 `source_segments.json`을 번역의 권위 원문으로 사용하고, 원 PDF와 16쪽 렌더는 표·그림·수치·인쇄상 이상을 확인하는 데만 사용했다.
- `scripts/reconstruct_kalmijn_translation.py`에 제목·H1–H4·이미지 대체텍스트 매핑과 비참고문헌 71개 블록의 완역을 선언했다.
- 재구성기는 그림 6개의 경로를 유지하고 대체텍스트만 번역하며, `## References` 뒤 52개 항목을 원문 그대로 복사한다.
- 재구성기는 번역 블록 71개, 그림 6개, 참고문헌 문자 동일성, 핵심 방법·통계·한계 sentinel을 검증한 뒤 `translation.md`를 생성한다.

## Translation passes

- 1차: 제목, 저자·소속, 구조화 초록, 핵심어와 이론적 배경을 번역하고 `결속`, `친족유지`, `친족유지자`, `형제자매 접촉` 용어를 고정했다.
- 2차: 결속·호송대·친족유지 관점과 가설 1–6을 원문 순서대로 번역하고 첫 번째/두 번째 부모 사망의 대조를 유지했다.
- 3차: 4개 조사차수, N = 3,812, 사건·통제 표본, 형제자매 다이애드, 개인-연도 자료, 접촉·갈등·지원 측정을 대조했다.
- 4차: 고정효과, 군집-강건 표준오차, 조건부 로짓, 선형확률모형, 개체 내 변환, `khb` 매개검정과 모형 1a–8b의 역할을 옮겼다.
- 5차: 모든 결과 계수·부호·유의성, 평균 한계효과, 어머니 사망 상호작용 검토, 결론·한계·대안적 인과방향을 전수 대조했다.
- 6차: 표 1–4와 그림 1–2의 캡션·주·접근성 설명을 번역하고 참고문헌 52개를 문자 단위로 보존했다.

## Segmentation and alignment

- `tmp/source_segment_plans/kalmijn-leopold-2019-translation.json`은 승인된 원문 계획과 같은 22개 ID 및 블록 범위(1–123)를 사용하고 한국어 절 이름을 선언한다.
- `scripts/generate_translation_segments.js`로 22개 세그먼트와 123개 번역 블록을 생성했다.
- `scripts/generate_block_alignment.js --verified`로 117개 문단/맥락 블록을 단조롭게 1:1 정렬했다.
- `scripts/review_kalmijn_sentence_alignment.js`로 379개 문장쌍을 의미·순서·누락·인용·숫자·한정 표현 기준으로 전수 검토했다.
- 문장부호와 콜론·세미콜론 때문에 공용 분리기의 경계가 달라진 10개 블록은 양쪽 문장을 완전한 순서로 덮도록 수동 결합 규칙을 명시했다.
- 모든 문단의 `sentence_alignment_method`는 `human-reviewed-v1`, 모든 문장쌍의 상태는 `verified`이며 원문 숫자 누락은 0건이다.

## Validation and reproducibility

- `node scripts/check_alignment.js --slug kalmijn-leopold-2019 --strict --write-report`: **PASS 22/22**, 오류 0, 경고 0.
- `node scripts/validate_content.js --slug kalmijn-leopold-2019 --source-only --json`: 번역 `schema_pass`; 원문과 번역의 H2/H3/H4 수는 각각 8/5/4, 그림은 각각 6개, 문단은 각각 117개이다.
- `node scripts/build_site.js --slug kalmijn-leopold-2019 --preview-locked --preview-draft --output-dir tmp/site-preview-kalmijn-stage2`: 프로젝트 내부 임시 디렉터리에만 격리 미리보기를 생성했다.
- `node scripts/check_rendered_reveals.js --slug kalmijn-leopold-2019 --site-dir tmp/site-preview-kalmijn-stage2`: **PASS 117/117 block reveals, 379 sentence reveals**.
- 재구성·세그먼트·블록정렬·문장정렬·수동검토를 연속으로 다시 실행한 뒤 아래 세 파일이 바이트 단위로 동일함을 확인했다.
  - `translation.md`: `E3EF7F6FE3623279903C75E9F15AD8A918B11DB1D43CFFB441AF10100299990B`
  - `translation_segments.json`: `4F9C6E48304A3CF119D0D560853169B2C987A906FB4EDF6DDFB887F5B95CD8AD`
  - `translation_alignment.json`: `D1D07AB372944E0BC37DD451BF8B73649148A990C56C57579654BBD9BBCD01AF`
- `manifest/readings.json`의 해당 항목에 `translation_original_reveal`을 `details` 모드로 연결했다. 수동 승인 상태는 변경하지 않았다.
- 공개 `docs` 빌드, 배포, 커밋 또는 후속 학습자료 작성은 수행하지 않았다.

## Independent audit and correction

- Stage 2 작성에 참여하지 않은 별도 감사자가 원 PDF 16쪽, 승인 원문, 번역 71개 비참고문헌 블록, 참고문헌 52개, 그림·표 6개, 117개 블록 정렬과 379개 문장쌍을 읽기 전용으로 전수 대조했다.
- 첫 감사에서 내용 오류는 없었고, 비의학적 갈등 맥락에서 `prevalence`를 `유병률`로 옮긴 한 곳만 경미한 자연성 개선 후보로 제시되었다. 이를 `형제자매 갈등의 비율`로 수정했다.
- 통계 방향을 `정(+)/부(-)`로 명확히 한 문장, 최초 `khb(KHB)` 표기, 가설 4의 `뒷받침`, Figure 1/2 접근성 설명, Umberson 인용문 등 최종 표현 변경도 같은 감사자가 원문 및 문장쌍과 다시 대조했다.
- 재감사 결과는 중대·실질·경미 finding 0건의 **PASS**였다. 격리 UI에서 문단 원문 공개, 문장 단위 키보드 토글, 390px 모바일 공개와 콘솔 오류 0건도 확인했다.
