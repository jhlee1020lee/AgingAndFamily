# Translation QA Checklist

- Reading: `carstensen-et-al-1999`
- Alignment status: **PASS**
- Review scope: 승인된 `full.md`와 `source_segments.json`의 전체 내용

## Completeness and structure

- [x] 원문의 22개 `segment_id`를 같은 순서로 모두 번역했고 번역 전용 ID는 없다.
- [x] 원문과 번역은 각각 216개 콘텐츠 블록이며, 참고문헌 이외의 텍스트 100개 블록과 그림 대체텍스트 2개를 완역했다.
- [x] 제목 뒤 H2/H3/H4는 원문과 번역 모두 6/11/2개, 그림은 2개, 문단은 207개, 인용 블록은 7개다.
- [x] 편집자 주, 저자 주, 각주 1–3, Figure 1–2의 캡션·저작권·접근성 설명을 보존했다.
- [x] `## References` 아래 116개 참고문헌은 순서·문자·구두점까지 원문과 동일하다.

## Translation fidelity

- [x] `socioemotional selectivity theory`를 `사회정서선택이론`, `time perspective`를 `시간 관점`, `knowledge-related goals`를 `지식 관련 목표`, `emotion regulation`을 `정서 조절`로 일관되게 옮겼다.
- [x] 연령 자체가 아니라 남은 시간의 지각이 목표 우선순위를 바꾼다는 이론적 인과 논리와 저자들의 제한 표현을 보존했다.
- [x] HIV 하위표본의 평균 연령 37세, 세 감염 상태, 남성 표본, 18장 카드와 다차원척도분석을 원문대로 구분했다.
- [x] 기억 연구의 20–83세 표본과 Figure 2의 `.20 (.04)`, `.22 (.03)`, `.32 (.05)`, `.34 (.03)`을 대조했다.
- [x] 부부 갈등 15분, 경험표집 18–95세·1주·35쪽·19개 정서와 빈도·강도·지속시간·혼합성 결과를 서로 혼동하지 않았다.
- [x] 긍정 정서의 빈도와 강도 유지, 부정 정서의 빈도 감소와 강도 비감소, 노년기의 더 짧은 지속시간을 각각 보존했다.
- [x] 사회연결망의 선제적 가지치기, 69–104세 Berlin Aging Study, 핵심 원의 비교와 횡단설계 한계를 구분했다.
- [x] 11–92세 상대 선호 연구의 30분·가상 이사·20년 연장 조작과 8–90세 홍콩 표본의 반환 4개월 전·1년 후 결과를 보존했다.
- [x] SOC, 문화적 상호작용, 인지 자원에 관한 유보, 임상적 함의를 사실·추론·추측 수준에 맞춰 옮겼다.
- [x] 원문의 인쇄상 표현 `principle age differences`는 `주된 연령차(원문 표기: principle age differences)`로 투명하게 처리했다.
- [x] 비참고문헌의 숫자·네 자리 연도·인명·본문 인용 묶음을 블록별로 대조했으며 누락은 0개다.
- [x] 독립 검수에서 발견한 `social niches`, `open-ended`/`unlimited`, Rothbart 인용문 수식 범위, 자원 할당 관계, HIV 결과 양상, 생리활동 측정, 자기상징화 표현을 권위 생성 스크립트에서 교정했다.
- [x] 교정 뒤 독립 재검수의 잔여 결함은 Critical/Major/Minor 0/0/0이며 최종 판정은 PASS다.

## Alignment and rendering

- [x] `translation_alignment.json`은 207개 문단을 단조롭게 1:1 정렬한다.
- [x] 605개 문장쌍을 전수 검토했고 모두 `verified`, 모든 문단은 `human-reviewed-v1`이다.
- [x] 문장 경계가 다른 22개 문단에는 원문과 번역 전체를 순서대로 덮는 명시적 수동 결합 규칙을 적용했다.
- [x] strict alignment 검사는 22/22 세그먼트, 오류 0, 경고 0으로 통과했다.
- [x] source-only 검사는 번역 스키마를 통과했고 Stage 2는 승인 전 상태인 `manual_review_required`로 유지된다.
- [x] 격리 미리보기에서 207/207 블록 원문 보기와 605개 문장 원문 보기를 확인했다.
- [x] 새 전체 격리 미리보기의 HTML 243개와 로컬 대상 5,140개를 실제 `--site-dir`로 검사해 누락 링크·프래그먼트·사설 경로 노출이 없음을 확인했다.
- [x] 챗봇 UI·코드·문구, STT·녹음 자료, 개인정보가 번역·정렬·렌더 결과에 없다.

## Reproducibility and scope

- [x] 번역 재구성, 세그먼트 생성, 블록 정렬, 문장 정렬을 두 차례 실행해 세 핵심 산출물의 바이트 동일성을 확인했다.
- [x] `translation_original_reveal`은 manifest의 `details` 모드로 연결했다.
- [x] 공개 `docs` 빌드, 배포, 수동 승인, Stage 3 작성과 커밋은 수행하지 않았다.
