# Stage 2 Work Log - oswald-et-al-2010

## Authority and reconstruction

- 승인된 `full.md`와 `source_segments.json`만 번역의 권위 원문으로 사용하고, `source_pdfs/11 Oswald et al., 2010.pdf`는 네 표의 시각 대조에만 사용했다.
- `scripts/reconstruct_oswald_translation.py`에 H1–H4 제목, 네 이미지 대체텍스트, 참고문헌 이전 53개 블록의 완역을 선언했다.
- 재구성기는 원문 숫자 토큰의 블록별 중복 횟수를 확인하고, 네 자산의 경로·순서, 표본·통계·유의성·횡단설계 제한 sentinel을 검사한다.
- 원문 CRLF를 번역본에도 적용하고, `## 참고문헌` 뒤 51개 항목이 원문의 `## References` 뒤와 바이트 단위로 같은지 파일 기록 후 다시 검사한다.

## Translation passes

- 1차: 제목, 네 저자, 소속·출판·접수·교신·저작권, 구조화 초록 및 핵심어를 옮기고 `aging in place`, 전기 노인/후기 노인, 개인-환경 교환, 행위주체성/소속감 용어를 고정했다.
- 2차: 환경적 풍요/압력, 주거·근린환경의 객관적·지각된·사회적 차원, 장소애착과 사회적 교환을 모든 인용 및 한정어와 함께 옮겼다.
- 3차: 연구 목적, `773 → 21명 결측 제외 → 381(226+155)`의 표본 흐름, 응답률 52%, 성별·연령 범위와 측정도구의 문항 수·코딩 방향을 대조했다.
- 4차: 분산분석, χ², 0차 Pearson 상관, 회귀분석, 다중공선성 검토, IADL 제외, 공통성 분석 및 연령×예측변수 상호작용의 목적을 통계 범위에 맞춰 번역했다.
- 5차: 전체·전기 노인·후기 노인 회귀모형의 29%/27%/39%, 근린환경 블록 8%/5%/11%, ADL 고유기여 10%/8%/12%, 개별 고유분산과 정·부적 방향을 확인했다.
- 6차: 논의의 가설 지지/불일치, 무효과와 한계수준 효과, 네 한계 및 횡단자료의 비인과 해석을 확인했다. 원문에 명시적 영가설 문장은 없으며, 비유의 결과와 유의성 판단 범위를 임의로 강화하지 않았다.
- 7차: 결론의 연구·실천 함의와 참고문헌 51개, 인용연도, 숫자, 대시, 척도 방향을 다시 대조했다. 본문에는 95% CI가 없고 정확한 p값은 표 crop에 보존되어 있다.

## Table and visual verification

- PDF 13쪽의 144-dpi 렌더(각 1191×1565)를 원해상도 보기로 확인하고, 표가 실린 인쇄면 p. 242, p. 243, p. 244, p. 246을 네 crop과 나란히 대조했다.
- Table 1은 `table-1-part-1.png`(1392×1008)와 `table-1-part-2.png`(1392×478)로 이어지며, N = 381 / n = 226 / n = 155, 전체 표본 특성·주거·근린환경·사회적 측면·ADL/IADL·삶의 만족도와 주석 a–f가 모두 포함된다.
- Table 1의 유의한 차이뿐 아니라 성별 p = .07, 교육 p = .14, 자가소유 p = .25, 주거 접근성 p = .10, 근린환경의 질 p = .56, 장소애착 p = .87, 사회적 근린환경의 질 p = .92, 지역 내 사회적 관계자 p = .64도 원 crop에서 확인했다.
- Table 2 `table-2.png`(1392×470)의 전기 노인 대각선 아래/후기 노인 대각선 위 방향, 12×12 변수 행렬, 음·양 부호와 `***/**/*/‡` 유의성 기호 및 주석을 확인했다.
- Table 3 `table-3.png`(1392×880)의 표본 345/207/138, B·SE·β·R²ᵤq 열, 모든 예측변수 블록, 정·부적 부호, `***/**/*` 기호와 목록별 삭제·표준화계수 주석을 확인했다. 네 crop 모두 잘림이나 행·열·주석 누락이 없다.

## Segmentation and sentence alignment

- `tmp/source_segment_plans/oswald-et-al-2010-translation.json`은 승인 원문 계획과 같은 20개 ID 및 블록 범위 1–104를 사용한다.
- `scripts/generate_translation_segments.js`로 20개 번역 세그먼트와 104개 번역 블록을 생성했다.
- `scripts/generate_block_alignment.js --verified`로 98개 문단을 단조롭게 1:1 정렬했다.
- `scripts/review_oswald_sentence_alignment.js`로 278개 문장쌍을 의미, 순서, 누락, 인용, 숫자, 척도 방향, 상관·회귀 부호, 유의/비유의 범위, 연령집단 비교 및 인과 한계 기준으로 전수 검토했다.
- 공용 분리기와 한국어 경계가 달랐거나 저자 이니셜에서 과분리된 15개 문단은 양쪽 문장을 빠짐없이 순서대로 덮는 수동 결합 규칙으로 보정했다.
- 모든 문단의 `sentence_alignment_method`는 `human-reviewed-v1`, 모든 문장쌍의 상태는 `verified`이며 문장쌍별 원문 숫자 누락은 0건이다.

## References and validation

- 참고문헌은 51개, 10,274바이트, SHA-256 `011B10198BEDE4A783CA64A25D010442726E3BEEBC24133B14C3628F2015AB7D`로 원문과 바이트 단위로 동일하다.
- `node scripts/check_alignment.js --slug oswald-et-al-2010 --strict --write-report`: **PASS 20/20**, 오류·경고 0.
- `node scripts/validate_content.js --slug oswald-et-al-2010 --source-only --json`: 번역 `schema_pass`, 오류·경고 0, H2/H3/H4 10/6/5, 그림·표 4개, 문단 98개, reveal 98개, 문장쌍 278개.
- 기본 빌드나 `--help`를 사용하지 않고 `node scripts/build_site.js --preview-locked --preview-draft --output-dir tmp/oswald-stage2-full-preview-r1`로만 새 slug 없는 전체 격리 미리보기를 생성했다.
- `node scripts/check_rendered_reveals.js --slug oswald-et-al-2010 --site-dir tmp/oswald-stage2-full-preview-r1`: **PASS 98/98 block reveals, 278 sentence reveals**.
- `node scripts/check_site_links.js --site-dir tmp/oswald-stage2-full-preview-r1`: **PASS 243 HTML files, 5,651 local targets, no private paths or chatbot**.
- 번역 원천·파생 산출물과 렌더된 번역 페이지의 표적 검사에서 비공개 경로, STT, 녹음, 전사, 학생정보, 챗봇 표식은 0건이었다.
- 실제 브라우저에서 데스크톱 문장 tooltip과 문단 전체 원문 펼치기, 390×844 모바일 문장 탭과 줄바꿈을 확인했다. 애플리케이션 오류·경고는 없었고 요청되지 않은 `/favicon.ico` 404만 있었다.

## Deterministic regeneration and hashes

- 재구성, 번역 세그먼트 생성, 블록 정렬, 자동 문장 생성 및 수동 문장 검토를 강제 재실행한 뒤 핵심 산출물 세 개의 SHA-256이 재실행 전후 모두 동일했다.
  - `translation.md`: `D96B91E8E64A0FC65D81162AD7A8E220F7BE55F0F00AAF97CF12E295D6DB2AF0`
  - `translation_segments.json`: `4E6CEA157B8491425BEACFBFF8C858A8907ED09416EEF32A4A40C68900A4DD76`
  - `translation_alignment.json`: `452B987413651E3DD9DBFAFDC1FF3FF3036AEB11766452E231A600FB55D83181`
- 재구성 스크립트 SHA-256은 `6E950E4E388FA3DF0A96D33B98A13F9F47DE7C85AADBB120E50857DCF9A27332`, 문장 검토 스크립트는 `ADE21B0174F57AFF321F2013F7D0A9E1360379A4E1175D55D641545674FED518`, 번역 세그먼트 계획은 `4E2F8208A91C944F77694F0F31362E49924F791261067AF723EFDD90CCD91C5C`이다.

## Review status

- 작성자 자체 전수 검수와 모든 자동·렌더·브라우저 검사는 완료했지만 Stage 2 수동 승인 상태는 변경하지 않았다.
- 별도 감사자가 원 PDF의 네 표, 승인 원문 53개 비참고문헌 블록, 통계 방향·유의성 범위, 98개 문단과 278개 문장쌍을 독립적으로 재감사해야 한다.
- 최종 상태는 **HOLD — independent audit pending**이다.
- 공개 `docs` 빌드, 배포, Stage 3 작성, 승인 및 커밋은 수행하지 않았다.
