# 영어 수업용 학습 기능 개선

시작: 2026-09-05. 정적 HTML/CSS/vanilla JavaScript 구조를 유지한다.

최신 화면 조정: 사용자 요청에 따라 본문·번역의 글자 크기, 북마크, 읽던 위치 저장·복원, 중요 표시 기능을 제거했다. 교수님 답변 대비는 입력창과 답변 펼치기를 없애고 질문 아래에 답변을 바로 표시한다. 이전에 저장된 글자 크기·읽기 위치·연습 초안은 새 화면에 적용하지 않는다. 아래의 과거 검증 기록 중 해당 기능을 확인한 내용은 제거 이전의 기록이다.

화면 조정 검증: 전체 빌드 후 Node 20의 `npm run check`를 통과했다. 44개 본문·번역 페이지의 도구 제거, 462개 답변의 직접 표시, 기존 퀴즈 990문항 동작을 확인했다. 실제 브라우저에서 1280px 본문·답변 준비와 390px 번역·답변 준비 화면을 확인했으며 가로 넘침은 없었다. manifest와 원문·번역·학습 JSON은 변경하지 않았다.

## 범위

- 공통: 채점, 퀴즈 저장·복습, 원문 근거 확인, 실제 DOM 동작 검사
- 읽기: 현재 목차, 읽기 진행 표시, 필터 접근성, 다음 읽기 표시
- 검증: 승인 의존 파일 해시, 개요 명시 승인, 정렬·ID·본문 검사, 모든 빌드 오류 반영, 초안 공개 차단, manifest 순서, 전체 기본 검사
- 학습자료: manifest 순서로 논문 한 편씩 퀴즈 45개와 교수님 답변 카드 21개를 영어로 전환하고 해당 논문의 evidence_segment_id를 대조한다.

## 작업 상태

공통 기능 수정과 22편의 영어 전환·근거 검토를 완료했다. 퀴즈 990문항, 교수님 답변 대비 462카드, 영어 학습 JSON 88개다. 논문별 작업기록 22개를 남겼고 변경된 승인 해시는 검토 후 명시적으로 갱신했다. 과거 승인 해시를 자동으로 새 해시로 바꾸지 않는다.

| 개선 항목 | 구현·검증 상태 |
|---|---|
| 단답형 공백·숫자 표기, 영어 입력 | 실제 DOM 및 브라우저에서 확인. 다른 수치·단위는 구분 |
| 퀴즈 진행·오답 저장, 문항 변경 무효화 | 실제 DOM의 reload/round/result/retry 시나리오 통과 |
| 퀴즈·구술 연습의 원문 근거 | 답 확인 후 해당 source segment 원문 펼치기 |
| 영어 구술 답변 대비 | 입력창 없이 질문 아래 30초 답변 즉시 표시 |
| 승인 해시·개요 승인·생성물 오류 | 36개 검증 회귀 통과. HTML 비교 기호 보존 검사 포함 |
| manifest 순서·초안 출력 경로·공통 파일 캐시 | 23개 빌드 회귀 통과. 미리보기는 tmp의 하위 폴더로 제한 |
| strict alignment | 전체 22편 통과, 경고 0 |
| 현재 목차·필터 | 현재 절 강조와 필터 상태 표시. 읽기 도구·개인 표시 UI 제거 |
| 전체 기본 검사·영어 필수 gate | Node 20.20.2에서 전체 npm run check 통과. 17개 영어 gate 회귀 포함 |

| 논문 | 영어 전환·근거 검토 | 명시 승인·빌드 | 화면 |
|---|---|---|---|
| Levy (2009) | 66개 완료 | 완료, content/alignment/reveals 통과 | 16개 화면 확인 |
| Settersten & Godlewski (2016) | 66개 완료 | 완료, content/alignment/reveals 통과 | 8개 화면 확인 |
| Hagestad & Settersten (2017) | 66개 완료 | 완료, content/alignment/reveals 통과 | 8개 화면 확인 |
| Vaupel (2010) | 66개 완료 | 완료, content/alignment/reveals 통과 | 8개 화면 확인 |
| Stine-Morrow (2007) | 66개 완료 | 완료, content/alignment/reveals 통과 | 8개 화면 확인 |
| Underwood (2014) | 66개 완료 | 완료, content/alignment/reveals 통과 | 8개 화면 확인 |
| Carstensen et al. (1999) | 66개 완료 | 완료, content/alignment/reveals 통과 | 8개 화면 확인 |
| Luong et al. (2011) | 66개 완료 | 완료, content/alignment/reveals 통과 | 8개 화면 확인 |
| Huxhold et al. (2014) | 66개 완료, 원문 내부 불일치 별도 표시 | 완료, content/alignment/reveals 통과 | 8개 화면 확인 |
| Cotten (2021) | 66개 완료 | 완료, content/alignment/reveals 통과 | 8개 화면 확인 |
| Kim et al. (2015) | 66개 완료 | 완료, content/alignment/reveals 통과 | 8개 화면 확인 |
| Lin et al. (2018) | 66개 완료, 단답 숫자형 14→1 | 완료, content/alignment/reveals 통과 | 8개 화면 확인 |
| Bangerter & Waldron (2014) | 66개 완료, 단답 숫자형 11→1 | 완료, content/alignment/reveals 통과 | 8개 화면 확인 |
| Kalmijn & Leopold (2019) | 66개 완료 | 완료, content/alignment/reveals 통과 | 8개 화면 확인 |
| Oswald et al. (2010) | 66개 완료, 단답 숫자형 3개로 축소 | 완료, content/alignment/reveals 통과 | 8개 화면 확인 |
| Smith et al. (2007) | 66개 완료, 참여자 이름 암기 문항을 개념·해석으로 전환 | 완료, content/alignment/reveals 통과 | 8개 화면 확인 |
| Gruenewald et al. (2016) | 66개 완료, 배정 효과와 참여량 모형 구분 | 완료, content/alignment/reveals 통과 | 8개 화면 확인 |
| Lee & Yeung (2021) | 66개 완료, 단답 숫자형 14→3 | 완료, content/alignment/reveals 통과 | 8개 화면 확인 |
| Martinson & Berridge (2015) | 66개 완료, 단답 숫자형 1개로 축소 | 완료, content/alignment/reveals 통과 | 8개 화면 확인 |
| Utz et al. (2002) | 66개 완료, 주분석 시점·가중 표본·참여 유형 구분 | 완료, content/alignment/reveals 통과 | 8개 화면 확인 |
| Boerner & Schulz (2009) | 66개 완료, 진단 기준은 당시 제안으로 명시 | 완료, content/alignment/reveals 통과 | 8개 화면 확인 |
| Meier et al. (2016) | 66개 완료, 단답 숫자형 1개로 축소, 논문 비율과 개인 선호 구분 | 완료, content/alignment/reveals 통과 | 8개 화면 확인 |

전체 빌드 후 CI와 같은 Node 20.20.2에서 `npx --yes --package=node@20 --package=npm@10 npm run check`를 실행해 종료코드 0으로 통과했다. 생성 퀴즈 990문항을 실제 DOM에서 모두 출제·제출·채점·결과 확인했다. 저장·복원·오답 복습·문항 변경 무효화·한국어 입력의 채점 보류·읽기 도구·교수 답변 초안도 검사했다. 원문/번역 417쌍의 strict alignment와 22편의 publish gate 및 원문 펼침 검사를 통과했다. 승인/콘텐츠 회귀 36개, 빌드 회귀 23개, 영어 gate 회귀 17개도 통과했다.

Carstensen 단답형은 수치 암기 문항 5개를 개념·설계 질문으로 바꾸고 원래 수치는 해설에 보존했다. Lin 단답형은 숫자형 14개를 1개로 줄이고 부부 단위, 전향적 관찰설계, 가중, 탈락, 이산시간 사건사, 시차와 모형 조정 해석으로 재구성했다. Smith의 참여자 이름 암기 문항도 개념·해석 중심으로 바꿨다. 마지막 Meier도 소수 표기 회귀 사례인 kappa .896을 남기고 방법·핵심 주제·한계 중심으로 바꿨다.

브라우저 화면 기록: `tmp/english-improvement-screens.json` (로컬 검증 기록, Git 제외). 22편의 퀴즈·교수 답변 대비·본문·번역을 데스크톱 1280px와 모바일 390px에서 확인했고 Levy는 360/430px도 확인했다. 184개 화면 상태에서 가로 넘침 및 로드 완료 이미지 깨짐은 0건이었다. 마지막 Meier의 데스크톱 답변 연습과 모바일 퀴즈 스크린샷도 직접 확인했다. 자동 mobile contract는 265개 HTML의 360/390/430px 검사를 통과했다.

최종 공개 산출물은 440파일, HTML 265개, 약 43.2 MiB다. 11,098개 로컬 링크 대상 검사와 만화 22편·88패널 검사도 통과했다. 원문·번역·정렬·그림·manifest의 보호대상 283파일은 개선 전 Git HEAD 대비 변경·추가가 없다. 공개·Git 추적 파일의 확장자·파일명·헤더 inventory에서 PDF·음성·자막·비공개 강의자료는 발견되지 않았다.

사용자의 배포 요청에 따라 GitHub Pages에 반영했고, [Ubuntu·Node 20 배포 실행](https://github.com/jhlee1020lee/AgingAndFamily/actions/runs/33936773039)의 전체 검사와 배포가 성공했다. 공개 퀴즈·답변 연습 44페이지와 홈·공통 CSS/JS 총 47파일이 로컬 검증본과 일치함을 확인했다. 배포 후 이전 스크립트 캐시로 새 퀴즈가 초기화되지 않을 수 있어 CSS/JS URL에 실제 생성 바이트의 SHA256 앞 12자리를 붙이도록 보완했다. 동일한 내용은 버전을 유지하고 내용이 바뀔 때 해당 파일의 URL만 바뀐다. 추가 빌드 회귀 6개는 내용 해시, 줄바꿈 차이, 재빌드 안정성, 파일 변경 및 링크의 query 처리를 검사한다.

추가로 Underwood·Carstensen·Luong의 생성 퀴즈 135문항도 실제 DOM 전체 진행 검사에 통과했다. 브라우저에서 직접 만든 Levy 검증용 저장 퀴즈·오답과 연습 초안은 UI로 지웠고, 검증용 북마크와 글자 크기도 원래 상태로 복원했다.

마지막 Meier에서는 모바일 5문항 시작→정답 제출→영어 해설·원문 근거→중도 종료 결과를 직접 확인했다. 기존 단답형 화면에서도 `.896`이 `Correct.`로 채점됨을 확인했다. 이 확인에서 만든 저장 라운드와 입력 답안은 UI로 지웠다.

Lin 모바일 화면을 직접 보며 표지 설명문(`rdp-hook`)의 글자색이 일반 문단 규칙에 덮이는 문제를 확인했다. 전용 선택자를 구체화하여 어두운 표지 배경 위에 원래 의도한 밝은 글자색이 적용되도록 수정했다. 빌드 후 모바일 스크린샷과 계산된 색상 `rgba(255,255,255,.84)`로 확인했고 265개 HTML의 360/390/430px mobile contract도 통과했다.

## 검증 범위의 한계

이번 영어 전환의 근거는 저장된 source_segments.json이다. 로컬 원본 PDF가 없으므로 원본 PDF 전체에 대한 재대조 완료를 뜻하지 않는다. 본문 및 한국어 번역은 영어 학습자료 전환 대상이 아니다.

Huxhold et al. (2014)의 보존 자료에는 두 불일치가 있다. DISCUSSION-001의 가족·친구 평균 활동량 비교는 Figure 2와 반대이고, Table 1의 노년 집단 부정 정서 계수 부호는 ABS/OLDER-001/H3-001 본문과 반대다. 논쟁적인 평균 비교는 출제하지 않았다. 부정 정서 문항과 답변은 결과 본문의 값임을 한정하고 표와의 불일치를 알린다. 원본 PDF가 없으므로 어느 쪽이 맞는지 확정하지 않았으며 원문·번역을 임의 수정하지 않았다.

Cotten (2021) DRIVING-001의 자율주행 이용 의향 문장에는 ‘대부분 원하지 않음’과 ‘81% 원함’이 함께 나오며 교통사망 16%의 분모도 모호하다. 이 수치들은 영어 학습자료에서 사용하지 않았다. 상세 근거와 검증 결과는 각 논문의 `stage3_english_work_log.md`에 기록한다.

후속 논문에서도 모호한 표본 산술·표 축 방향·유의성 기호·부정확한 분모·오타 등을 발견했다. 학습자료는 논쟁적인 값을 정답으로 단정하지 않도록 조정했고 원문은 보존했다. 마지막 검토 사례는 [Utz 작업기록](content/readings/utz-et-al-2002/stage3_english_work_log.md), [Boerner–Schulz 작업기록](content/readings/boerner-schulz-2009/stage3_english_work_log.md), [Meier 작업기록](content/readings/meier-et-al-2016/stage3_english_work_log.md)에 정리했다.
