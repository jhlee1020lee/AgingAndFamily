# 교수님 답변 대비 전체 읽기 적용

목표: Levy(2009)의 검토된 답변·근거·경험 전환·두 탭·모바일 구성을 최소 기준으로 나머지 읽기자료에 적용한다. 범위는 `manifest/readings.json`의 전체 22편이며, 한 번에 한 편의 교수님 답변 대비 단계만 작성·검토·빌드한다.

## 완료 기준

- 각 읽기의 원문에 맞춘 첫 답변 6개: 논문 출발 3개, 경험 출발 3개.
- 각 첫 답변에 영·한 꼬리 문답 3개 이상. 핵심 개념, 실제 연구설계·결과와 해석의 한계를 원문 세그먼트에 연결한다.
- 경험형 카드마다 영·한 가상 예시 최소 6개. 기존 Levy와 같은 슬롯·저장·언어 전환·연결된 후속 답변 동기화를 유지한다.
- `이 읽기 답변 준비 / 두 편 연결` 두 탭. 두 편 연결은 같은 주차의 공통 데이터로 유지한다.
- 질문은 처음부터 표시하고 답변만 접는다. 한국어 기본, 독립 언어 선택, 모바일 가독성과 44px 터치 영역을 유지한다.
- 각 자료의 작성 후 원문 대조, 승인 해시 재검수, strict alignment, source/content 및 built publish gate, 앱 동작, 데스크톱·모바일 표시를 확인한다.
- 원문·번역·퀴즈·주차 공통 데이터와 기존 내부 개념 문항을 보호한다. 작업 시작 기준은 `tmp/reflection-rollout-baseline.json`에 기록했다.
- 현재 작업 공간에는 `source_pdfs/`가 없으므로 원문 대조는 이미 검수된 `source_segments.json`과 `full.md`를 사용한다. 원본 PDF의 기준 시점 부재도 별도로 기록하며, PDF를 새로 복사하거나 공개하지 않는다.
- 마지막에는 manifest 전체를 대상으로 적용 여부와 생성 HTML·승인·보호 파일을 다시 감사한다. 일부 적용이나 schema 통과만으로 전체 완료로 처리하지 않는다.

## 진행

| 읽기 | 상태 | 근거 |
|---|---|---|
| levy-2009 | 완료 | 공통 배치·390px 모바일·생성물 감사 재확인 |
| settersten-godlewski-2016 | 완료 | 원문 검토·승인·19/19 alignment·built gate·앱·360/390/1440px 확인 |
| hagestad-settersten-2017 | 완료 | 본문 20세그먼트 대조·승인·22/22 alignment·built gate·앱·360/1440px 확인 |
| vaupel-2010 | 완료 | 본문15세그먼트 대조·승인·19/19 alignment·built gate·앱·360/1440px 확인 |
| stine-morrow-2007 | 완료 | 핵심본문7개 대조·승인·10/10 alignment·built gate·앱·360/1440px 확인 |
| underwood-2014 | 완료 | 본문8개 대조·승인·8/8 alignment·built gate·앱·360/1440px 확인 |
| carstensen-et-al-1999 | 완료 | 본문20개 대조·승인·22/22 alignment·built gate·앱·360/1440px 확인 |
| luong-et-al-2011 | 완료 | 본문15개 대조·승인·19/19 alignment·built gate·앱·360/1440px 확인 |
| huxhold-et-al-2014 | 완료 | 본문18개 대조·승인·22/22 alignment·built gate·앱·360/1440px 확인 |
| cotten-2021 | 완료 | 본문18개 대조·승인·22/22 alignment·built gate·앱·360/1440px 확인 |
| kim-et-al-2015 | 완료 | 본문15개 대조·승인·17/17 alignment·built gate·앱·360/1440px 확인 |
| lin-et-al-2018 | 완료 | 초록·본문19개 대조·승인·22/22 alignment·built gate·앱·360/1440px 확인 |
| bangerter-waldron-2014 | 완료 | 초록·본문16개 대조·승인·19/19 alignment·built gate·앱·360/1440px 확인 |
| kalmijn-leopold-2019 | 완료 | 초록·본문17개 대조·승인·22/22 alignment·built gate·앱·360/1440px 확인 |
| oswald-et-al-2010 | 완료 | 초록·본문16개·표3 대조·승인·20/20 alignment·built gate·앱·360/1440px 확인 |
| smith-et-al-2007 | 완료 | 초록·본문12개 대조·승인·16/16 alignment·built gate·앱·360/1440px 확인 |
| gruenewald-et-al-2016 | 완료 | 초록·본문18개·표2/3 대조·승인·24/24 alignment·built gate·앱·360/1440px 확인 |
| lee-yeung-2021 | 완료 | 초록·본문18개·표3/4 대조·승인·23/23 alignment·built gate·앱·360/1440px 확인 |
| martinson-berridge-2015 | 완료 | 초록·본문19개 대조·승인·28/28 alignment·built gate·앱·360/1440px 확인 |
| utz-et-al-2002 | 완료 | 초록·본문14개·표2/3 대조·승인·20/20 alignment·built gate·앱·360/1440px 확인 |
| boerner-schulz-2009 | 완료 | 초록·본문5개 대조·승인·9/9 alignment·built gate·앱·360/1440px 확인 |
| meier-et-al-2016 | 완료 | 초록·본문13개·표2/3 대조·승인·18/18 alignment·built gate·앱·360/1440px 확인 |

공통 기능 확인: 실제 360/390/430px 모바일 확인, mobile contract 276페이지 통과, build contract 28개와 weekly connection 135개 회귀 검증 통과. 미리보기 승인 경계 검증은 새 형식에서 실제 표시되는 첫 답을 대상으로 갱신했다.

GitHub 배포는 이 작업의 현재 완료 기준에 포함하지 않는다. 로컬 소스와 생성 사이트를 완성하고 검증한다.

## 전체 적용 완료 및 최종 검증

manifest 전체 22편에 적용했다. 첫 답변은 총132개(읽기 출발66개·경험 출발66개), 꼬리 문답396개, 가상 경험396개다. 각 논문은 원문 대조와 독립 카드 검토 후 승인 해시를 갱신하고 개별 빌드·검증을 마쳤다. 경험을 바꾸면 해당 카드의 영한 슬롯과 연결된 꼬리 답변이 함께 바뀌며, 질문은 처음부터 표시하고 상세 답변은 접는다. 두 탭과 한국어 기본, 언어별 선택·경험 저장 기능을 유지한다.

최종 생성물 전체를 대상으로 다음 검사를 통과했다.

- `node scripts/check_alignment.js --strict`: 22편 모두 PASS.
- `node scripts/validate_content.js --publish-gate --require-built-artifacts`: 22편의 source/content·생성물과 단계1/2/3 승인 모두 유효.
- `node scripts/check_app_behaviors.js`: 990개 퀴즈 문항, 132개 대비 답변, 44개 읽기 페이지, 영어6,563개·한국어6,680개 펼침과 경험·언어·두 탭·저장 동작 PASS.
- `node scripts/check_reflection_rollout.js`: 22 PASS / 0 PENDING / 0 FAIL. 보호 파일532개 및 기존 내부 문항배열22개 해시 유지. 원문·번역·퀴즈·주차 공통 데이터는 변경되지 않았다. 기준 시점에 없던 원본 PDF22개를 새로 복사하거나 공개하지 않았다.
- `node scripts/check_site_links.js`: HTML276개, 로컬 링크 대상11,902개 PASS.
- `node scripts/check_mobile_contract.js --width 360 --width 390 --width 430`: HTML276개, 홈 읽기카드22개 PASS.
- `git diff --check`: PASS. 기존 `scripts/site_app.js`의 CRLF→LF 안내만 출력됐으며 공백 오류는 없었다.

각 읽기의 실제360px 모바일과1440px 데스크톱 화면을 확인했다. 가로 넘침 없이 질문목록6개가 열리고 상세 답변은 접히며, 경험 버튼44px을 유지한다. 마지막으로 Levy를390px 미리보기에 열어 확인했다. 첫 카드 시작602px, 본문16.32px, 현재 저장된 경험 선택에서 페이지5530px/첫 경험카드853px였다. 같은 선택 상태를 맞춘 이전 비교에서는7629→5557px로 약27% 줄었고, 첫 카드1012→602px·첫 경험카드1206→881px였다. 글자를 줄이지 않고 중첩 여백과 세로 배치를 조정한 결과다.

기존 `npm run check`는 `check:terms`가 호출하는 `scripts/check_translation_terms.js`의 부재 때문에 전체 명령으로 통과했다고 보고하지 않는다. 위의 작업 관련 필수 검사를 각각 실행해 통과했으며, 관련 없는 기존 누락 파일을 새로 만들지 않았다. GitHub push·배포는 실행하지 않았다.
