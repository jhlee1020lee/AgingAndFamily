**고령화와 가족 프로젝트 전체 점검 — 2026-09-05**

후속 개선과 영어 학습자료 전환을 완료했다. 아래는 수정 전 점검 기록이며, 현재 상태와 전체 검증 결과는 [IMPROVEMENT_STATUS.md](IMPROVEMENT_STATUS.md)를 참고한다.

현재 작업 폴더의 미커밋 변경과 새 통합 퀴즈를 포함해 점검했다. 이번 작업의 산출물은 점검 보고서이며 앱 코드·논문·번역·승인 기록은 수정하지 않았다. 결함 재현은 `tmp/`의 복사본에서 수행했다.

프로젝트의 정적 구조와 기본 빌드는 안정적이다. 다만 학습자가 올바른 답을 입력해도 오답으로 처리되는 경우가 있고, 승인·정렬 검증이 일부 중요한 변경과 손상을 놓친다. 현재 데이터에서 발견한 문제와 임시로 손상시켜 확인한 검증의 빈틈을 구분해 기록했다.

**확인한 범위와 결과**

| 점검 | 확인한 결과 |
| --- | --- |
| 전체 빌드 재현 | scripts·manifest·content를 임시 폴더에 복사해 처음부터 빌드 성공. 생성된 440개 파일이 현재 docs와 바이트 단위로 모두 동일. 발행 검사도 통과 |
| 읽기 목록·구간 | 22편, 원문·번역 417쌍의 현재 ID·순서·중복 상태 정상 |
| 콘텐츠 참조 | 퀴즈 990문항과 교수 답변 462카드의 근거 ID가 해당 논문의 원문 구간에 모두 존재 |
| 본문 데이터 동기화 | 제목·이미지·마크업 차이를 제외한 Markdown과 segment 텍스트 대조에서 실질적인 본문 불일치를 찾지 못함 |
| 기존 검사 | strict alignment, publish gate, 22편 원문 펼침, 퀴즈·기존 상호작용·모바일 계약·링크·만화 검사 통과 |
| 사이트 규모 | HTML 265개, 전체 파일 440개, 약 35.1 MiB. 링크 검사 8,656개 대상 통과 |
| 브라우저 | 홈·개요·본문·번역·통합 퀴즈·교수 답변·요약 및 긴 번역 페이지 8개 경로를 360·390·430·1280px에서 확인. 32개 초기 화면에서 가로 넘침과 로드 완료 이미지의 깨짐 없음 |
| 실제 조작 | 홈 검색·유형 필터, 본문 목차 이동·스크롤, 단답형 채점, 통합 퀴즈 출제→모르겠어요→중도 종료→오답 재풀이→만점 결과 확인 |
| PDF·비공개 파일 | docs 및 Git 추적 파일에서 PDF·음성·자막 파일을 발견하지 못함. manifest의 PDF 공개 설정은 전부 none |

현재 실행 환경은 Windows의 Node.js 24.14.0이다. CI 설정은 Ubuntu·Node.js 20이며, 이번에 원격 CI 실행이나 실제 배포 상태를 확인한 것은 아니다. GitHub Actions의 명령과 로컬 재현을 검토했다.

원본 PDF는 manifest 경로 기준 **0/22개** 존재한다. 따라서 PDF 대비 추출 순서·표 수치·번역 충실도 전체를 다시 검수했다는 뜻은 아니다. 근거 ID 존재와 텍스트 동기화도 모든 주장·정답의 의미 일치를 보장하지 않는다. 단답형 330문항과 관련 원문·번역을 선택 대조했으며, 990문항 전체의 의미 검수를 완료한 것은 아니다.

**우선 개선할 사항**

1. **단답형에서 올바른 답이 오답이 되는 문제 — 현재 데이터와 브라우저에서 확인**

   [site_app.js:522](C:/codex/AgingAndFamily/scripts/site_app.js:522)의 정규화는 연속 공백을 하나로 줄일 뿐 내부 공백을 무시하지 않는다. [build_site.js:1232](C:/codex/AgingAndFamily/scripts/build_site.js:1232)는 띄어쓰기가 채점에 영향을 주지 않는다고 안내한다.

   Levy 첫 단답 문항에서 `고정관념체화이론`은 오답, `고정관념 체화 이론`은 정답으로 표시되는 것을 실제 브라우저에서 확인했다. 전체 단답 330개 중 222개에서 공백이 들어간 허용답 하나를 붙여 쓰면 거부되는 사례를 찾았다. 이는 222문항의 정답 자체가 틀렸다는 의미는 아니다.

   별칭과 숫자 표기에도 문제가 있다.

   | 문항 | 현재 거부되는 답 | 사이트 내부 근거 |
   | --- | --- | --- |
   | Stine-Morrow 2번 | 결정성 능력 | [번역:15](C:/codex/AgingAndFamily/content/readings/stine-morrow-2007/translation.md:15)의 용어지만 [허용답:16](C:/codex/AgingAndFamily/content/readings/stine-morrow-2007/quiz_short.json:16)은 결정화 능력·영문만 포함 |
   | Stine-Morrow 6번 | 음의 피드백 고리 | [번역:39](C:/codex/AgingAndFamily/content/readings/stine-morrow-2007/translation.md:39)의 용어지만 [허용답:48](C:/codex/AgingAndFamily/content/readings/stine-morrow-2007/quiz_short.json:48)은 부적 피드백 고리·영문만 포함 |
   | Settersten 3번 | 미래 시간 조망 | [허용답:26](C:/codex/AgingAndFamily/content/readings/settersten-godlewski-2016/quiz_short.json:26)과 띄어쓰기 차이 |
   | Huxhold 11번 | 2032명 | [허용답:88](C:/codex/AgingAndFamily/content/readings/huxhold-et-al-2014/quiz_short.json:88)은 2,032명·2032·N = 2,032만 포함 |
   | Meier 5번 | .896 | [허용답:54](C:/codex/AgingAndFamily/content/readings/meier-et-al-2016/quiz_short.json:54)은 0.896만 포함 |

   **개선:** 문제 유형에 맞게 공백·숫자 표기를 정규화하고, 번역본에서 사용한 용어를 검수된 허용답에 포함한다. 의미가 다른 답까지 정답으로 만드는 포괄적인 유사도 판정은 피한다. 허용답 파일을 변경한 논문은 해당 단계의 승인을 다시 받는다. 회귀검사에는 정답의 표기 변형과 실제 오답을 함께 넣는다.

2. **승인 해시가 페이지를 구성하는 의존 파일을 빠뜨림 — 임시 변경으로 재현**

   [validate_content.js:1121](C:/codex/AgingAndFamily/scripts/validate_content.js:1121)의 승인 해시는 페이지 원본 파일 하나를 대상으로 한다. 원문 구간·문장 정렬·그림처럼 실제 학습 화면과 근거에 영향을 주는 파일은 승인 의존성에 포함되지 않는다. 개요는 [1063행](C:/codex/AgingAndFamily/scripts/validate_content.js:1063) 부근에서 스키마 통과만으로 승인된다.

   Levy 복사본에서 다음 변경을 각각 수행해도 기존 승인 해시와 `approved` 상태가 유지되고 publish gate가 종료코드 0을 반환했다: 원문 segment 내용 교체, 정렬의 문장쌍 7개를 문단쌍 1개로 병합, 만화 첫 이미지를 다른 논문의 같은 규격 이미지로 교체. 문장 펼침 수가 159개에서 153개로 바뀌어도 재검수 상태가 되지 않았다. 다른 논문의 이미지로 바꾼 경우 22편 fixture의 만화 검사도 통과했다.

   **개선:** 페이지별 의존 파일 목록을 정의해 합성 해시를 저장한다. 원문·번역 segment, 정렬 JSON, 사용 이미지와 개요 데이터의 변경은 해당 승인을 무효화해야 한다. 스키마 통과와 검수 승인을 분리한다.

   현재 본문이나 그림이 잘못 교체돼 있다는 발견은 아니다. 승인 이후 변경을 감지하는 장치가 불완전하다는 재현 결과다.

3. **strict alignment가 중복 번역과 빈 원문을 통과시킴 — 임시 손상으로 재현**

   [check_alignment.js:177](C:/codex/AgingAndFamily/scripts/check_alignment.js:177)의 Set·Map 비교는 중복 ID와 배열 길이 차이를 놓친다. [81행](C:/codex/AgingAndFamily/scripts/check_alignment.js:81) 이후 품질 검사는 빈 번역을 확인하지만 빈 원문은 확인하지 않는다.

   Levy 복사본에 마지막 번역 구간을 중복 추가해 **16개 원문·17개 번역**으로 만들어도 strict 검사에서 오류·경고 없이 PASS였다. 별도 실험으로 첫 `original_text`를 빈 문자열로 만들어도 PASS였다. 현재 실제 417쌍에는 이 손상이 없다.

   **개선:** 양쪽 배열 길이 동일, 각 ID 유일성, 모든 구간의 원문·번역 비어 있지 않음, 양쪽 `paper_id`와 manifest slug 일치를 명시적으로 검사한다. 정상 데이터뿐 아니라 중복·누락·빈 구간을 주입한 검사를 추가한다.

4. **발행 검사에서 본문·학습자료 HTML 오류를 감지하고도 승인에 반영하지 않음 — 임시 손상으로 재현**

   [validate_content.js:1331](C:/codex/AgingAndFamily/scripts/validate_content.js:1331)은 생성물 검사 결과 중 PDF와 번역 오류만 상태에 반영한다. 나머지 페이지 오류는 최종 승인 상태에서 빠진다.

   복사본의 `full.html`을 삭제하면 내부 검사에서 `missing built page`를 발견하지만 publish gate는 승인·종료코드 0을 반환했다. `summary.html`에 `upload-placeholder`를 넣은 경우에도 내부 검사는 미완성 내용을 감지했지만 최종 gate는 통과했다.

   CI 링크 검사는 사라진 본문 링크를 별도로 잡을 수 있다. 그러나 링크가 유효한 미완성 내용은 링크 검사로 검증할 수 없다. 현재 실제 생성물이 누락돼 있다는 뜻은 아니다.

   **개선:** 생성물 오류를 페이지별 결과로 반환해 모든 해당 페이지의 상태에 반영한다. 파일 누락과 placeholder 삽입 모두 gate 실패를 요구하는 회귀검사를 둔다.

5. **manifest 외부에 읽기 순서가 중복 정의됨 — 순서 변경으로 재현**

   [build_site.js:56](C:/codex/AgingAndFamily/scripts/build_site.js:56)의 `SYLLABUS_HOME_ORDER`를 [816행](C:/codex/AgingAndFamily/scripts/build_site.js:816)이 같은 날짜의 정렬 기준으로 사용한다. manifest의 첫 두 편을 Settersten→Levy로 바꿔도 홈은 Levy→Settersten 순서를 유지한다. [approval_status.js:78](C:/codex/AgingAndFamily/scripts/approval_status.js:78)의 승인 보고서는 manifest 순서를 사용하므로 서로 달라질 수 있다.

   **개선:** 수업 날짜와 manifest 배열 인덱스만 정렬 기준으로 사용한다. 추가로 만화 검사에 박힌 [읽기 수 22](C:/codex/AgingAndFamily/scripts/check_overview_comics.js:7)도 manifest에서 계산해야 자료 추가·삭제 시 정상적인 CI 실패를 피할 수 있다.

6. **교수 답변 대비의 미승인 초안이 일반 docs 빌드에 포함됨 — 임시 수정으로 재현**

   [build_site.js:1328](C:/codex/AgingAndFamily/scripts/build_site.js:1328)은 승인 조건을 만족하지 못한 답변도 `draft:true`로 렌더링하며, [942행](C:/codex/AgingAndFamily/scripts/build_site.js:942)에서는 스키마를 통과하면 탭을 활성화한다.

   승인된 `professor_prep.json`에 미검수 문장을 추가한 뒤 일반 `--slug` 빌드를 실행하면 성공하며, 상태는 `schema_pass`로 내려가지만 문장은 docs의 답변 페이지에 그대로 포함된다. **이 경우 CI publish gate는 종료코드 1로 배포를 차단했다.** 원격 배포 우회가 아니라 일반 공개 산출물과 평가용 초안의 구분이 일관되지 않은 문제다.

   **개선:** 초안은 기존 `--preview-locked --preview-draft`의 임시 출력에서만 허용하고 일반 docs에는 승인된 본문만 넣는다.

7. **읽기 위치·북마크·글자 크기 기능이 실제 화면에 연결되지 않음 — 현재 44페이지에서 확인**

   [site_app.js:326](C:/codex/AgingAndFamily/scripts/site_app.js:326)의 `initReader`는 `data-reader-root`가 없으면 바로 종료한다. [build_site.js:1200](C:/codex/AgingAndFamily/scripts/build_site.js:1200)의 본문 출력은 다른 속성을 사용한다. 현재 원문·번역 44페이지에는 연결에 필요한 root와 조작 UI가 없다. 실제 Levy 본문 화면의 버튼도 다크 모드·PDF 다운로드뿐이었다.

   앞선 프로젝트 소개에서 이 기능들이 제공된다고 설명한 것은 코드 존재를 실제 화면 연결과 혼동한 것이다. 현재 구현 상태에 맞춰 정정한다.

   **개선:** 읽기 도구를 현재 레이아웃에 연결하거나, 사용하지 않는 코드를 정리하고 제공 기능 설명을 맞춘다. 연결한다면 사용자가 지정한 중요 표시와 읽던 절을 안정적인 구간 ID 기준으로 저장하는 편이 화면 폭 변경에도 적합하다.

8. **긴 절의 중간에서 목차가 아직 도달하지 않은 다음 절을 강조함 — 브라우저에서 재현**

   [site_app.js:911](C:/codex/AgingAndFamily/scripts/site_app.js:911)은 화면에 들어온 heading이 없으면 `top > 0`인 다음 heading을 고른다. Levy 본문의 ‘A Psychosocial Approach to Aging’ 중간을 읽을 때 현재 heading은 −546px, 다음 heading은 +1,021px였는데 목차는 다음 절 ‘Research Supporting Age-Stereotype Embodiment’를 강조했다.

   **개선:** 고정 헤더 높이를 고려해 현재 스크롤 지점 이전의 마지막 heading을 활성화한다. 제목 사이가 화면 높이보다 긴 경우와 마지막 절을 검사한다.

**그다음 학습 경험을 개선할 사항**

- **근거에서 원문으로 바로 이동:** [build_site.js:1211](C:/codex/AgingAndFamily/scripts/build_site.js:1211)은 `ABS-001` 같은 ID를 일반 텍스트로만 표시한다. 해당 ID는 본문 앵커에도 없으므로 단순 링크만 추가하면 안 된다. 구간 ID→렌더된 앵커 매핑 또는 근거 원문 펼치기를 함께 구현하면 해설을 검증하기 쉬워진다.
- **퀴즈 진행·오답 저장:** 현재 통합 퀴즈의 진행 상태는 메모리에만 있어 새로고침하면 사라진다. 이 기기에서만 이어 풀기와 오답 복습을 제공하되, 문제 은행이 바뀌었을 때 저장 상태가 유효한지도 확인한다.
- **기본 퀴즈의 학습 목적 조정:** [Lin 단답형](C:/codex/AgingAndFamily/content/readings/lin-et-al-2018/quiz_short.json:7)은 15문항 중 14문항이 숫자 답이고, [Smith 단답형](C:/codex/AgingAndFamily/content/readings/smith-et-al-2007/quiz_short.json:71)은 7문항이 사례 참여자 이름을 묻는다. 사실 오류는 아니지만 기본 혼합 퀴즈의 목적이 이해도 확인이라면 핵심 개념·해석·한계 문항 비중을 높이거나 ‘핵심 복습’과 ‘세부 암기’를 구분할 수 있다.
- **‘이번 주’ 표시의 의미 수정:** [site_app.js:108](C:/codex/AgingAndFamily/scripts/site_app.js:108)은 기간 제한 없이 가장 가까운 미래 자료 한 편을 선택한다. 9월 5일에도 9월 14일 첫 자료가 ‘이번 주’이고 같은 날 두 번째 자료는 제외된다. 한 편을 고를 목적이면 ‘다음 읽기’, 주 단위 목적이면 해당 주의 자료 모두를 표시하는 편이 정확하다.
- **접근성 상태 표시:** 유형 필터는 CSS 활성 클래스만 바뀐다. `aria-pressed`와 필터 결과 개수 알림을 추가하면 선택 상태를 이해하기 쉽다. 검색과 기사 필터의 실제 기능은 정상으로 확인했다.

**검사 체계의 개선 방향**

[check_quiz_player.js:12](C:/codex/AgingAndFamily/scripts/check_quiz_player.js:12)의 VM은 DOM 초기화 콜백을 실행하지 않는다. 현재 검사는 출제·셔플·데이터 보존을 확인하지만 실제 시작→제출→다음→결과→오답 재풀이를 실행하지 않는다. [check_mobile_contract.js:136](C:/codex/AgingAndFamily/scripts/check_mobile_contract.js:136)은 CSS 문자열과 산식 검사이며 실제 브라우저의 크기·포커스·상호작용 검사와 구분해야 한다.

기존 검사는 유지하면서 위에서 재현한 실패 조건과 대표 브라우저 흐름을 추가하는 것이 우선이다. `package.json`의 일부 기본 검사 명령은 아직 처음 두 편만 대상으로 하므로, 전체 검사 명령과 pilot 명령을 이름으로 구분하면 혼동이 줄어든다. 실제 CI에는 전체 대상 명령이 있으므로 이것을 현재 전체 검증 누락으로 해석해서는 안 된다.

strict alignment의 Vaupel 인용 경고 3건(MORT-003, DELAY-001, PERSPECTIVES-001)은 원문·번역 대조 결과 숫자형 인용이 보존돼 있었다. [check_alignment.js:108](C:/codex/AgingAndFamily/scripts/check_alignment.js:108) 부근의 저자·연도 중심 탐지에 따른 오탐이다. 인용 방식을 구분해 경고를 유용하게 만들 필요가 있다.

**권장 작업 순서**

1. 단답형 정규화와 번역 용어 별칭을 수정하고 실제 정답·오답 회귀검사를 추가한다.
2. 승인 의존성, strict alignment의 기본 조건, 생성물 오류 전파, 초안 출력 경계를 보강한다.
3. manifest 순서의 중복 정의를 제거한다.
4. 읽기 도구 연결과 목차 강조를 수정하고 대표 브라우저 검사를 자동화한다.
5. 근거 원문 펼치기, 퀴즈 진행 저장, 핵심 복습 중심의 출제를 개선한다.

논문 데이터를 변경할 때는 기존 원칙대로 ‘논문 1편 × 단계 1개 × 검증 1회’로 진행하고, 변경된 승인 파일은 다시 검수한다. 정적 HTML/CSS/vanilla JavaScript 구조 안에서 모두 수행할 수 있다.

재현 기록은 `tmp/build-audit-20260905.cjs`, `tmp/build-audit-results.json`, `tmp/audit-content-2026-09-05/`, `tmp/project-review-clean-build-result.json`, `tmp/project-review-browser-matrix.json`에 있다. 이 임시 파일들은 공개 사이트에 포함되지 않는다.
