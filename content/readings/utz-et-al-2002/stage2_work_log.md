# Stage 2 Work Log - utz-et-al-2002

## Authority and reconstruction

- 승인된 `full.md`와 `source_segments.json`, 로컬 원 PDF `13 Utz et al., 2002.pdf` 12쪽, Figure 1–3과 Table 1–3 crop만을 권위 자료로 사용했다.
- 원 PDF SHA-256은 `EA99282F9DBC0043A8468AFFACF2CCC7E710D306EB776D1947512B68F96EAE79`이며, 인쇄면은 522–533쪽이다.
- `scripts/utz_translation_data.py`에 참고문헌 이전 비참고문헌 텍스트 블록 62개의 한국어 번역을 선언하고, `scripts/reconstruct_utz_translation.py`가 제목·절 제목, 이미지 대체텍스트 여섯 개와 참고문헌을 결합하도록 했다.
- 재구성기는 승인 원문의 SHA-256, 62개 번역 블록, 제목 대응, 여섯 이미지 경로·순서, 참고문헌 수와 byte identity, 원문 숫자 토큰의 블록별 중복 횟수, 표본·시점·핵심 결과·이론 범위 sentinel, 사적 정보 금지표식을 검사한다.
- `## 참고문헌` 뒤는 승인 원문의 `## References` 뒤에서 그대로 복사해 저자·연도·서지정보뿐 아니라 인쇄상 특이 표기와 구두점도 임의로 고치지 않았다.

## Translation passes

- 1차: 논문 제목, 저자·학위·소속, 출판·접수·교신·연구비 메타데이터, 구조화 초록과 핵심어를 번역했다.
- 2차: 사회참여의 정의, 사별의 사회적·행동적 함의, 활동이론·이탈이론·지속성이론과 선행연구의 방법론적 한계를 주장 강도에 맞춰 옮겼다.
- 3차: CLOC 표본설계, 가중·비가중 분모, 사별자·대조군 구성, 추적시점, 공식적·비공식적 참여 측정치, 통제·교란변수와 분석계획을 수치와 함께 대조했다.
- 4차: Table 1–3과 Figure 1–3의 집단·성별·시점, 회귀계수, 표준화 계수, `p`값, 조정 `R²`, 유의·비유의를 표와 crop에 맞춰 전수 확인했다.
- 5차: 논의에서 세 이론 중 어느 것도 완전히 지지·기각되지 않는다는 범위, 사별 전 배우자 건강과 사별 후 지원의 차이, 지속성이론의 제한적 적합성을 확인했다.
- 6차: 한계·향후 연구·실천 함의를 인과로 강화하지 않았는지, 모든 캡션·접근성 설명과 참고문헌이 빠지지 않았는지 다시 읽었다.

## PDF and visual verification

- PDF 12쪽을 1,206×1,566픽셀 QA 렌더로 전수 확인했다. 본문은 2열이며 인쇄면 522쪽의 제목·저자·초록부터 533쪽의 마지막 참고문헌과 접수·승인 footer까지 열·페이지를 넘는 이어짐을 승인 Stage 1 원문과 대조했다.
- 여섯 crop을 원 PDF 페이지와 나란히 원해상도로 확인했다.
  - `figure-1.png`: 500×830, 87,843바이트, SHA-256 `1F84192D175CD7F0F8983E5E34637FCCA44FF5C849C31744684DDBD0428F53DC`
  - `figure-2.png`: 1,006×470, 169,973바이트, SHA-256 `A6394AD8C35BEEDDCA4854691BA8ED635685A8F92FCFFD0794860612CF2EDBF5`
  - `figure-3.png`: 1,006×440, 183,130바이트, SHA-256 `19A71A08C1840C58A06AE6D64DE3FF5149691582BC4A78F221957A249D37395D`
  - `table-1.png`: 1,006×720, 137,719바이트, SHA-256 `AE4C80F7E5FA066EF80B51644E8FC72A48E753062726040A3712B895534EEBDF`
  - `table-2.png`: 1,006×540, 95,820바이트, SHA-256 `E00273730E20015CCACBBDBCB584DD51BB6EFCF8686866562258A48A3DC30380`
  - `table-3.png`: 1,006×805, 159,341바이트, SHA-256 `6337493BD69F746F72B28C8B9F799A2308F0F2BBC7928699610285DA699FDC0B`
- Figure 1은 인쇄면 527쪽, Tables 2–3은 528쪽, Figures 2–3은 529–530쪽에서 대조했다. Table 1은 526쪽에 있으며 여섯 crop 모두 제목, 축·범례, 행·열, 계수·표준오차, 주석과 유의성 기호가 잘림 없이 보존됐다.
- 각 이미지에는 한국어 대체텍스트가 있고, 이어지는 캡션·접근성 설명은 비교집단, 시점, 핵심 값, 유의범위를 crop에 맞게 설명한다.

## Numeric, attribution, and scope audit

- CLOC 기초표본 1,532명과 응답률 68%, 가중 분석표본 297명(사별 210명·대조군 87명; 여성 217명·남성 80명), 비가중 분석표본 333명(사별 249명·대조군 84명)의 분모를 구분했다.
- 6·18·48개월 추적, Wave 1이 사망 약 6개월 뒤라는 시점, 신뢰도 `α = .52/.71/.77/.81/.53`, 상관 `.37/.13/.16 (p < .05)`를 보존했다.
- Figure 1의 `.01` 대 `.23 (p ≤ .05)`, `.03` 대 `−.11 (p ≤ .10)`, 대조군의 비공식 `p ≤ .001`·공식 `p ≤ .05`와 사별집단의 안정성을 확인했다.
- Table 2의 비공식 참여 `β = −.29 (p ≤ .01)`와 배우자 건강 `β = −.31 (p ≤ .001)`을 확인했다.
- Table 3의 사별 공식 참여 효과는 비유의이며, 비공식 계수 `.29/.40/.44`, Model 3의 `0.44 SD`, 외향성 `.09/.11 (p ≤ .05)`, 우울 `−.09 (p ≤ .05)`, 기초값 `.58/.31 (p ≤ .001)`, 조정 `R² .13→.46`과 `.16→.29`를 그대로 옮겼다. 모든 사별×성별 상호작용은 비유의다.
- Figure 2의 본인 보고 `17/71/12%`와 친구 보고 `35/59/6%`, Figure 3의 `예 87%/아니요 13%`를 질문·응답자·시점과 함께 보존했다.
- 지속성이론이 가장 적용 가능하다는 논의는 보편적 입증으로 강화하지 않았다. 활동이론은 방향상 유사하나 주로 수동적으로 받은 지원 때문에 지지가 약하며, 이탈이론은 설득력이 낮지만 배우자 사망 전 감소와 아픈 배우자의 맥락은 보존했다. 세 이론 중 어느 것도 전적으로 지지·기각되지 않는다는 결론을 유지했다.
- 비참고문헌 62개 블록 및 357개 문장쌍에서 원문 숫자 토큰 누락은 0건이다. 단순 계수에서 번역에만 나타난 숫자는 월명과 영문 수사·분수 표현을 숫자로 명시한 정상 번역이다.

## Segmentation and sentence alignment

- `tmp/source_segment_plans/utz-et-al-2002-translation.json`은 승인 원문과 같은 20개 ID, 블록범위 1–123, PDF 위치를 사용한다.
- `scripts/generate_translation_segments.js`로 20개 번역 세그먼트와 123개 번역 블록을 생성했다.
- `scripts/generate_block_alignment.js --verified`로 참고문헌을 포함한 117개 문단을 단조롭게 1:1 정렬했다.
- 자동 문장정렬의 371개 쌍을 모두 검토한 뒤 `scripts/review_utz_sentence_alignment.js`의 수동 경계 규칙 11개로 의미 단위를 바로잡아 최종 357개 문장쌍을 만들었다.
- 수동 규칙 대상은 `tr-004`, `tr-009`, `tr-010`, `tr-012`, `tr-013`, `tr-019`, `tr-037`, `tr-038`, `tr-041`, `tr-049`, `tr-054`이며 양쪽 연속 텍스트를 빠짐없이 덮는다.
- 모든 문단의 `sentence_alignment_method`는 `human-reviewed-v1`, 모든 문장쌍의 상태는 `verified`이며 문장쌍별 숫자 누락은 0건이다.

## References

- 참고문헌 61개는 원문에서 직접 보존했다. Markdown 참고문헌 본문은 양쪽 모두 9,486바이트이고 SHA-256 `B15E1C15064EA6E35EFC87C9E4AFDF64091E9108A8C1AB100B3C1FC20B2A7EE4`로 byte-identical이다.
- 세 개 참고문헌 세그먼트의 JSON 원문/번역 문자열도 서로 동일하며 9,364바이트, SHA-256 `6D67280629D004E76576B6DA7ED3269A9590057484451C370C46A4F25CD6B6A7`이다.
- 저자·연도·제목·저널·페이지뿐 아니라 승인 원문의 인쇄상 특이 철자·공백·구두점도 임의로 교정하지 않았다.

## Validation and isolated preview

- `node scripts/check_alignment.js --slug utz-et-al-2002 --strict`: **PASS 20/20**.
- `node scripts/validate_content.js --slug utz-et-al-2002 --source-only --json`: 번역 `schema_pass`, 오류 0, H2 7개, H3 13개, H4 4개, 이미지 6개, 문단 117개, reveal 117개, 문장쌍 357개다. Stage 2는 승인 전 정상 상태인 `manual_review_required`다.
- validator의 그림·표 라벨 경고는 직접 이미지 여섯 개 외에 캡션·접근성 설명도 라벨로 세는 일반 휴리스틱이며, 직접 이미지 삽입과 캡션·설명의 누락은 없다.
- 기본 빌드나 `--help`를 실행하지 않고 `node scripts/build_site.js --preview-locked --preview-draft --output-dir tmp/utz-stage2-full-preview-author-r1`로 전체 격리 미리보기만 만들었다.
- `node scripts/check_rendered_reveals.js --slug utz-et-al-2002 --site-dir tmp/utz-stage2-full-preview-author-r1`: **PASS 117/117 block reveals, 357 sentence reveals**.
- `node scripts/check_site_links.js --site-dir tmp/utz-stage2-full-preview-author-r1`: **PASS 243 HTML files, 5,792 local targets, no private paths or chatbot**.
- 번역 Markdown, 두 JSON 파생물, 렌더된 번역 HTML을 12개 금지 패턴으로 검사한 결과 사적 경로, STT, 녹음·전사, 강의 오디오, 학생·수강생 정보, 챗봇 표식은 0건이다.
- 격리 미리보기를 실제 브라우저로 열어 데스크톱 문장 원문 popover와 문단 전체 원문 펼치기, 390×844 모바일 문장 탭과 영어 tooltip을 확인했다. 임시 서버의 `/favicon.ico` 404 한 건 외에 애플리케이션 콘솔 오류·경고는 없었다.

## Deterministic regeneration and hashes

- 재구성, 번역 세그먼트 생성, 검증된 블록정렬, 자동 문장정렬, 수동검토 문장정렬의 전체 파이프라인을 연속 강제 실행했다. 두 번째 실행 전후 아래 세 핵심 산출물의 SHA-256이 동일했다.
  - `translation.md`: `2EDF816A9E31B3B8DBA5ACA17DFB588C9FD57EEE80F9C576A77BE0A33938F581`
  - `translation_segments.json`: `70062E187CC546A996A338AA2F820EF330AD8F4E0F819F88F9F3F1915EEE4013`
  - `translation_alignment.json`: `2C1A59CA12B1A7DBE136FA01E46465C7E60935BE2BC16EB23EB3CE49F49E47C1`
- 권위 번역 데이터 SHA-256은 `29389247C32FE178158E58512CD55E8E9CDD3D0289EE36401971D2D76029B714`, 재구성 스크립트는 `1E1F8EE580B16B89C5A3E594CCCAE637CBE96BDC2BC10C7BEC94FFAFB27895B4`, 문장검토 스크립트는 `F707C5E6FCB5BA58E6444A595089134F6FAB12D85C89BD8613E44C83E9DB0113`, 번역 세그먼트 계획은 `EE87105F50A87841452CFA9654F284C96760640F58D2B765DF464F180053E734`이다.

## Review status

- 작성자 자체 검수 결과 해결되지 않은 Critical/Major/Minor 내용 오류는 발견하지 못했다.
- 작성자가 자기 번역을 승인하지 않는 원칙에 따라 Stage 2는 **HOLD — independent audit required**로 남긴다.
- 공개 `docs` 빌드, manifest 승인, Stage 3 작성, 배포, 커밋은 수행하지 않았다.
