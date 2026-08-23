# Stage 2 Work Log - meier-et-al-2016

## Authority and reconstruction

- 승인된 `full.md`, `source_segments.json`, 원 PDF 11쪽과 네 개 원문 crop을 번역의 근거로 사용했다.
- `scripts/reconstruct_meier_translation.py`에 H1–H3 제목, 네 이미지 대체텍스트, 참고문헌 이전 46개 블록의 완역을 선언했다.
- 재구성기는 원문 숫자 토큰을 블록별 중복 횟수까지 확인하고, 네 자산의 경로·순서와 핵심 표본·흐름·표 sentinel을 검사한다.
- 원문 파일의 CRLF를 번역본에도 적용하고, `## 참고문헌` 뒤 72개 항목이 원문의 `## References` 뒤 10,627바이트와 정확히 같은지 파일 기록 후 다시 검사한다.

## Translation passes

- 1차: 제목, 여섯 저자, 소속·출판·접수·교신·저작권 메타데이터, 초록, 핵심어를 번역하고 핵심 개념어를 고정했다.
- 2차: 서론의 네 문학 사례, 좋은 죽음의 정의와 비판, 환자 중심 목적과 공공 대화의 범위를 옮겼다.
- 3차: 검색식·선정 기준·36편 코딩 절차·평정자 간 신뢰도·세 이해관계자 출처 구성을 수치와 함께 대조했다.
- 4차: Figure 1의 모든 상자·화살표와 37개 제외 사유, Table 1의 20개 행, Table 2의 11개 주제와 하위주제, Table 3의 33개 수/백분율 셀을 시각 대조했다.
- 5차: 이해관계자별 공통점과 차이, 방법론적 한계, 존엄성·종교성/영성·심리적 돌봄, 향후 연구 권고를 주장 강도와 한정 표현에 맞춰 검토했다.
- 6차: 연구비·보충자료와 참고문헌 72개, 모든 인용번호·숫자·대시·p값·표본 흐름을 다시 확인했다. 원문에는 95% CI가 없다.

## Segmentation and sentence alignment

- `tmp/source_segment_plans/meier-et-al-2016-translation.json`은 승인 원문 계획과 같은 18개 ID 및 블록 범위 1–118을 사용한다.
- `scripts/generate_translation_segments.js`로 18개 번역 세그먼트와 118개 번역 블록을 생성했다.
- `scripts/generate_block_alignment.js --verified`로 111개 문단을 단조롭게 1:1 정렬했다.
- `scripts/review_meier_sentence_alignment.js`로 229개 문장쌍을 의미, 순서, 누락, 인용, 숫자, 표본 분모, 통계 표기, 비교 범위, 인과 강도 기준으로 전수 검토했다.
- 공용 문장 분리기와 한국어 경계가 달랐던 18개 문단은 양쪽 문장을 빠짐없이 순서대로 덮는 수동 결합 규칙을 선언했다.
- 모든 문단의 `sentence_alignment_method`는 `human-reviewed-v1`, 모든 문장쌍의 상태는 `verified`이며 문장쌍별 숫자 누락은 0건이다.

## Content verification

- 검색 흐름 `1,506 + 1,928 = 3,434`, `3,434 − 3,042 = 392`, `392 − 356 = 36`과 37개 제외 사유의 합계 356을 확인했다.
- 연구 방법 구성 27/5/4, 양적·혼합 9편 중 표준화 도구 3편, 코딩 38→11, 이해관계자 20/10/18을 보존했다.
- 표본범위 `3–2,548`, 평균 184.4, 표준편차 440.8, 인쇄된 연령 `14–93`, 평균 89.7, 표준편차 16.6을 보존했다.
- Table 3의 33개 셀, 핵심 결과 `94%/81%/64%`, 가족 `80%/70%`, 종교성·영성 `65%/50%`, 존엄성 관련 `91%/86%/71%`와 `87%/87%`를 대조했다.
- 인쇄상 이상인 `p < 0.0.000`, Table 1의 `Amsterdam`·`291 White`, 국가 목록의 Nova Scotia와 Sweden/Turkey 배열을 번역에서 임의로 정정하지 않았다.
- 참고문헌은 72개, 10,627바이트, SHA-256 `04F044268497A41065C02A05A6F0B82AAB23B3E164B3078555B1038AA23E2CF3`으로 원문과 바이트 단위로 동일하다.

## Validation and isolated preview

- `node scripts/check_alignment.js --slug meier-et-al-2016 --strict --write-report`: **PASS 18/18**, 오류 0, 경고 0.
- `node scripts/validate_content.js --slug meier-et-al-2016 --source-only --json`: 번역 `schema_pass`, 오류·경고 0, H2/H3 11/4, 그림·표 4개, 문단 111개, reveal 111개, 문장쌍 229개.
- 금지된 기본 빌드나 `--help`를 사용하지 않고 `node scripts/build_site.js --preview-locked --preview-draft --output-dir tmp/meier-stage2-full-preview-r2`로만 새 전체 격리 미리보기를 생성했다.
- `node scripts/check_rendered_reveals.js --slug meier-et-al-2016 --site-dir tmp/meier-stage2-full-preview-r2`: **PASS 111/111 block reveals, 229 sentence reveals**.
- `node scripts/check_site_links.js --site-dir tmp/meier-stage2-full-preview-r2`: **PASS 243 HTML files, 5,337 local targets, no private paths or chatbot**.
- 번역 원천·파생 산출물과 렌더된 번역 페이지의 표적 검사에서 STT, 녹음, 전사, 수강생/학생정보, 챗봇, 로컬 경로 표식은 0건이었다.
- 실제 브라우저에서 데스크톱 문장 툴팁과 문단 전체 원문 펼치기, 390px 모바일 문장 탭과 줄바꿈을 확인했다. 임시 서버의 `/favicon.ico` 404 외에 애플리케이션 콘솔 오류·경고는 없었다.

## Deterministic regeneration and hashes

- 재구성, 세그먼트 생성, 블록 정렬, 문장 검토를 강제 재실행한 뒤 아래 세 핵심 산출물의 SHA-256이 재실행 전후 모두 동일했다.
  - `translation.md`: `DEFCB5BB4AB027041783F550AA27F67B6C7BA62DD9A1A8BB5D1026878FA84A48`
  - `translation_segments.json`: `00DBD1FEDF628439D0BFCE1B94F503C6A8F3BF30EF473E9C4473990E72D8C988`
  - `translation_alignment.json`: `EAA3743405177080732EC0FA5D5FEEDD419CFA79FE6AFBCA64C684BD38DB53B8`
- 재구성 스크립트 SHA-256은 `4AC36B1A6FDACEB40F032765361919B81E347E5BB54FC8F19C5032F4E8E6D43B`, 문장 검토 스크립트는 `823756A90C19FBC87EDC9BEA2D1FDDA567A34856220C7851C2CE123C44402E15`, 번역 세그먼트 계획은 `2F761263438ABE13EBECEEE39934831871F83D411416E18F9A051930FAF180C1`이다.

## Independent audit

- 독립감사 첫 판정은 **HOLD (Critical 0, Major 1, Minor 2)**였다. 방법 절의 `3,434편`이 최초 검색결과 수가 아니라 제외된 수처럼 읽힌 숫자 귀속 1건, `recent diagnosis`를 `진단 직후`로 강화한 시간범위 1건, `potential unmet needs`를 `잠재적 필요`로 옮긴 의미범위 1건을 확인했다.
- authoritative 재구성 스크립트에서 각각 `최초 검색 결과 3,434편 가운데`, `최근 암 진단을 받은 뒤`, `아직 충족되지 않았을 수 있는 필요`로 바로잡고 번역·세그먼트·블록정렬·229개 문장쌍을 다시 생성했다.
- 독립감사자는 PDF 11쪽, 승인 원문 18개 세그먼트, 46개 비참고문헌 블록, 원해상도 Figure 1 및 Tables 1–3, 참고문헌 72개를 전수 대조했다. 수정 뒤 최종 판정은 **PASS (Critical 0, Major 0, Minor 0)**다.
- 새 격리 전체 미리보기 `tmp/meier-stage2-full-preview-independent-r1`에서 링크 **243 HTML / 5,430 local targets**, reveal **111/111 blocks / 229 sentences**, 사적 경로·STT·녹음·전사·챗봇 표식 0건을 재확인했다.
- 최종 PASS에 따라 번역 페이지는 source-only 승인 대상이 된다. 공개 `docs` 빌드, 배포, Stage 3 작성, 커밋은 수행하지 않았다.
