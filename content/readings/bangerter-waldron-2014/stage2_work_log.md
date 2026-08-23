# Stage 2 Work Log - bangerter-waldron-2014

## Authority and reconstruction

- 승인된 `full.md`, `source_segments.json`, 원 PDF 10쪽과 Figure 1–5 및 Table 1 crop을 번역의 근거로 사용했다.
- `scripts/reconstruct_bangerter_translation.py`에 H1–H3 제목, 이미지 대체텍스트 6개, 참고문헌 이전 85개 블록의 완역을 선언했다.
- 재구성기는 원문 숫자 토큰을 블록별 중복 횟수까지 확인하고, 여섯 자산의 경로·순서와 핵심 표본·척도·궤적·표 합계 sentinel을 검사한다.
- 원문 파일의 줄바꿈 형식을 번역본에도 적용하고, `## 참고문헌` 뒤 31개 항목이 원문의 `## References` 뒤 바이트와 정확히 같은지 파일 기록 후 다시 검사한다.

## Translation passes

- 1차: 제목, 두 저자, 소속·출판·접수·교신·저작권 메타데이터, 초록과 핵심어를 번역하고 핵심 개념어를 고정했다.
- 2차: 조부모 역할, 장거리 관계, 전환점 선행연구와 두 연구질문을 인용·한정어와 함께 옮겼다.
- 3차: 참여자 모집, 35→30의 분석 표본 흐름, 인구학적 수치, RIT 절차, 면접시간·전사자료·그래프 수, 지속적 비교방법을 대조했다.
- 4차: 다섯 관계 궤적과 Figure 1–5의 축·범례·방향, Table 1의 여덟 범주·정의·24개 수치와 합계를 원 PDF 렌더 및 crop과 시각 대조했다.
- 5차: 전환점 여덟 범주의 결과와 직접 인용 15개를 화자의 의미·감정·구어체·수치에 맞게 옮겼다.
- 6차: 논의의 관계 안정/변화, 기술과 관계 유지, 가족체계 혼란, 손자녀 독립성, 한계·후속연구·실천적 함의에서 추론 범위와 불확실성을 재검토했다.
- 7차: 참고문헌 31개와 모든 인용연도·숫자·대시·척도 방향을 다시 확인했다. 원문에는 p값이나 신뢰구간이 없다.

## Segmentation and sentence alignment

- `tmp/source_segment_plans/bangerter-waldron-2014-translation.json`은 승인 원문 계획과 같은 19개 ID 및 블록 범위 1–116을 사용한다.
- `scripts/generate_translation_segments.js`로 19개 번역 세그먼트와 116개 번역 블록을 생성했다.
- `scripts/generate_block_alignment.js --verified`로 93개 문단을 단조롭게 정렬했다.
- `scripts/review_bangerter_sentence_alignment.js`로 313개 문장쌍을 의미, 순서, 누락, 직접 인용, 인용연도, 숫자, 표본 흐름, 척도 방향, 표 합계, 주장 강도 기준으로 전수 검토했다.
- 공용 문장 분리기와 한국어 경계가 달랐던 22개 문단은 양쪽 문장을 빠짐없이 순서대로 덮는 수동 결합 규칙을 선언했다.
- 모든 문단의 `sentence_alignment_method`는 `human-reviewed-v1`, 모든 문장쌍의 상태는 `verified`이며 문장쌍별 숫자 누락은 0건이다.

## Quantitative and visual verification

- 참여자 35명, 전사 불가 면접 5건, 분석 참여자·그래프 30개와 성별 `21+9`, 결혼상태 `26+4`, 거주형태 `23+7`, 인종/민족 `29+1`을 확인했다.
- 궤적 `10+8+5+5+2=30`, 전환점 범주 빈도 합계 100, 긍정·부정 영향 합계 각각 50을 확인했다.
- Figure 1–5와 Table 1을 포함한 PDF 10쪽 렌더를 1089×1485 원본 해상도로 검토하고, 여섯 crop의 잘림·축·범례·표 행 누락이 없음을 확인했다.
- 참고문헌은 31개, 5,668바이트, SHA-256 `5080BBA2C17AE68FE320BACE72458117B6F2ABE769772A85E39CEA8A0C9098EF`으로 원문과 바이트 단위로 동일하다.

## Validation and isolated preview

- `node scripts/check_alignment.js --slug bangerter-waldron-2014 --strict`: **PASS 19/19**, 오류·경고 0. 상세 QA checklist를 보존하기 위해 `--write-report`는 다시 사용하지 않았다.
- `node scripts/validate_content.js --slug bangerter-waldron-2014 --source-only --json`: 번역 `schema_pass`, 번역 오류·경고 0, H2/H3 8/7, 그림·표 6개, 문단 93개, reveal 93개, 문장쌍 313개.
- 기본 빌드를 사용하지 않고 독립감사용 `tmp/bangerter-stage2-full-preview-audit-20260822-r4` 전체 격리 미리보기만 생성했다.
- 최신 독립 preview의 reveal은 **PASS 93/93 block reveals, 313 sentence reveals**였다.
- 최신 독립 preview 링크는 **PASS 243 HTML files, 5,665 local targets, no private paths or chatbot**였다.
- 번역 원천·파생 산출물과 렌더된 번역 페이지에서 비공개 경로, STT, 강의 녹음, 학생정보, 챗봇 표식은 0건이었다. 논문 연구절차 자체의 녹음·전사 언급은 원문 근거와 연결된 공개 학술 내용으로 별도 확인했다.
- 실제 브라우저에서 데스크톱 문장 tooltip과 문단 전체 원문 펼치기, 390×844 모바일 문장 탭과 줄바꿈을 확인했다. 임시 서버의 `/favicon.ico` 404 외에 애플리케이션 콘솔 오류·경고는 없었다.

## Deterministic regeneration and hashes

- 재구성, 세그먼트 생성, 블록 정렬, 문장 검토를 강제 재실행한 뒤 아래 세 핵심 산출물의 SHA-256이 재실행 전후 모두 동일했다.
  - `translation.md`: `13994A2AF947AAC2C4D56F421C44238851A056C198C99E5601B276408DCDEEEF`
  - `translation_segments.json`: `7F05B734BBB9DAA236018BE6A4511584C18A085AA9008965B9AC03104F1FF609`
  - `translation_alignment.json`: `DF3B4DA141E9036C90EC8D200E1E816F12EC30882BE524B1AD1C3B9A2CE553A0`
- 재구성 스크립트 SHA-256은 `549DFB9DB1DFC75D4239BC47FCBC8A1B66E1DA1CB436C140AAF7D7888F44D7B0`, 문장 검토 스크립트는 `F927A77F94E32B4348B6BCEFD054E0C6894487CB6145779A516400D01D5CEAA1`, 번역 세그먼트 계획은 `4227B2683CA27CE4B164EADFE8824061D189BFE3851E621CA799A4EB58DD7314`이다.

## Review status and remaining audit

- 독립 감사에서 내용·수치·PDF·정렬·렌더링은 Critical 0 / Major 0으로 통과했고, 유일한 Minor는 실제 22개 수동 경계규칙을 provenance note에 21개로 하드코딩한 표기 불일치였다.
- 문장 검토 스크립트가 `Object.keys(GROUP_RULES).length`를 사용하도록 고치고 정렬 산출물을 재생성했다. note·실행로그가 모두 22개로 일치하며 strict 19/19와 source-only schema를 다시 통과했다.
- 일반 양식으로 덮어써졌던 `translation_qa_checklist.md`는 독립감사 범위와 세부 수동 대조 결과를 포함하도록 복구했다. 수정된 provenance와 최신 해시는 독립 재감사 전까지 승인하지 않는다.
- 수정 뒤 독립 재감사에서 재생성 동일성, 22개 규칙 note·로그, 93문단·313문장쌍, 최신 해시와 상세 checklist를 다시 확인했고 Critical 0 / Major 0 / Minor 0으로 최종 PASS했다.
- 공개 `docs` 빌드, 배포, Stage 3 작성, 승인, 커밋은 수행하지 않았다.
