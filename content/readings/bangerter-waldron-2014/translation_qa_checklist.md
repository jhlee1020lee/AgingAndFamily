# Translation QA Checklist - bangerter-waldron-2014

## Coverage and structure

- [x] 승인된 `full.md`의 116개 블록이 19개 source segment에 누락·중복 없이 연속 배정되었다.
- [x] `translation.md`는 참고문헌 이전 85개 본문 블록, 이미지 대체텍스트 6개, 직접 인용 블록 23개를 모두 포함한다.
- [x] H1–H3 제목과 Figure 1–5, Table 1의 순서·라벨·경로가 원문과 일치한다.
- [x] 참고문헌 31개는 원문과 5,668바이트 및 SHA-256 `5080BBA2C17AE68FE320BACE72458117B6F2ABE769772A85E39CEA8A0C9098EF`로 동일하다.

## Meaning and terminology

- [x] `long-distance grandparenting`, `turning point`, `relational trajectory`, `relational closeness`, `Retrospective Interview Technique`, `constant comparative method`의 번역을 일관되게 유지했다.
- [x] 15개 참여자 발화의 화자, 손자녀 성별·연령, 정서적 어조, 구어체·말더듬·욕설을 완곡화하거나 다른 화자에게 옮기지 않았다.
- [x] 지리적 거리, 관계 투자 부족, 기술 사용, 관계 투자, 여가시간 부족, 손자녀 독립성 증가 등 여덟 전환점 범주의 긍정·부정 방향을 원문대로 보존했다.
- [x] 결과의 ‘고유 전환점 100개’와 논의의 ‘22명에게서 100개가 넘는 사건’이라는 서로 다른 서술을 임의 통합하지 않았다.
- [x] 방법의 `1 = 가장 가까움, 5 = 가장 멂` 척도 설명과 Figure 1·5의 궤적 라벨/방향 사이에 있는 원문 자체의 불일치를 수정하지 않고 그대로 보존했다.

## Numbers, figures, and table

- [x] 모집 35명, 전사 불가 5건, 분석 참여자·그래프 30개를 확인했다.
- [x] 성별 `21+9`, 결혼상태 `26+4`, 거주형태 `23+7`, 인종/민족 `29+1`이 각각 30으로 합산된다.
- [x] 다섯 궤적 빈도 `10+8+5+5+2=30`을 본문·Figure 1–5와 대조했다.
- [x] Table 1의 여덟 범주, 정의, 합계 전환점 100개, 긍정 50·부정 50을 대조했다.
- [x] Figure 1–5 및 Table 1 crop을 PDF 인쇄면 88–97과 원본 해상도로 대조해 축·범례·행·열·주석·잘림 오류가 없음을 확인했다.

## Segment and sentence alignment

- [x] 19개 source/translation segment ID와 순서가 정확히 일치한다.
- [x] 93개 번역 문단이 93개 원문 문단에 단조롭게 대응한다.
- [x] 313개 문장쌍을 의미·순서·누락·숫자·직접 인용·인용연도·표본흐름·척도방향·표 합계 기준으로 전수 확인했다.
- [x] 공용 분리기와 실제 의미경계가 다른 22개 문단에 수동 결합 규칙을 적용했다.
- [x] 모든 문단은 `human-reviewed-v1`, 모든 문장쌍은 `verified`이며 숫자 누락은 0건이다.
- [x] `sentence_alignment_note`의 수동 규칙 수는 하드코딩하지 않고 `Object.keys(GROUP_RULES).length`에서 산출한다.

## Interpretation boundaries

- [x] 질적·회고적 조부모 면접자료를 인과효과나 손자녀 관점의 직접 증거로 바꾸지 않았다.
- [x] 30개 관계 그래프와 100개 전환점 사건을 참여자 수나 독립표본 수와 혼동하지 않았다.
- [x] 기술 사용의 대체로 긍정적인 사례를 모든 장거리 관계에 보편적인 효과로 과장하지 않았다.
- [x] 가족체계 변화·거리·시간제약·독립성의 역할을 원문이 제시한 사례와 한계 범위 안에서 서술했다.

## Determinism, rendering, and privacy

- [x] 재구성기, 세그먼트 생성기, 블록 정렬기, 문장 검토기를 재실행해 핵심 산출물이 결정론적으로 재현된다.
- [x] Strict alignment는 19/19, source-only 번역 schema는 오류·경고 없이 통과한다.
- [x] 최신 격리 full preview에서 reveal 93/93 문단과 313문장, 243 HTML/5,665 링크가 통과한다.
- [x] 1440×900 및 390×844에서 문장·문단 원문 펼침, 그림·표 렌더링, 확대 링크와 수평 overflow 부재를 확인했다.
- [x] 공개 콘텐츠와 격리 산출물에서 사적 절대경로, STT·강의 녹음·학생정보·챗봇 흔적은 0건이다. 논문 방법의 녹음·전사 언급은 공개 학술내용으로 구분했다.

## Independent audit

- [x] 독립 감사자가 PDF 전체, 본문 85개 블록, 대체텍스트 6개, 직접 인용 15개, 정렬 93문단·313문장쌍, 참고문헌을 재대조했다.
- [x] 내용·수치·정렬·렌더링은 Critical 0 / Major 0으로 통과했다.
- [x] 독립감사에서 발견된 유일한 Minor인 수동 규칙 수 `21` 하드코딩을 실제 22개 자동산출로 수정했다.
- [x] 수정 뒤 결정론적 재생성·해시 갱신과 독립 재감사를 마쳤고 Critical 0 / Major 0 / Minor 0으로 통과했다.

## Review boundary

- 수정된 정렬 산출물의 독립 재감사가 PASS하여 Stage 2 수동 승인 조건을 충족했다.
- 이 파일은 상세 수동검수 기록이므로 `check_alignment --write-report`로 덮어쓰지 않는다.
