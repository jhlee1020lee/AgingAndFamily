# 고령화와 가족 읽기 사이트

2026년 2학기 `고령화와 가족` 강의의 영문 읽기자료를 주차 순서대로 공부하기 위한 정적 사이트입니다.

[공개 사이트 열기](https://jhlee1020lee.github.io/AgingAndFamily/)

## 현재 범위

- 강의계획서에 명시된 읽기자료 22편을 `manifest/readings.json`에 등록했습니다.
- 22편 모두 원문, 전체 번역, 핵심 개념, 복습자료, 구술대비와 퀴즈까지 승인·공개 상태입니다.
- 주차별 공개 제한은 사용하지 않으며 홈에서 모든 읽기를 바로 열 수 있습니다.
- 주요 메뉴의 `퀴즈 풀기`에서 논문별 True/False·단답형·객관식 45문항을 섞어 한 문제씩 풀 수 있습니다. 기본은 무작위 10문제이며, 유형별 선택과 5문제·전체 풀기, 즉시 해설, 결과와 오답 재풀이를 지원합니다.
- 영어 수업에 맞춰 퀴즈의 문제·선택지·허용 답안·해설과 교수님 답변 카드를 영어로 제공합니다. 단답형에 한국어를 입력하면 영어 입력을 안내하고 채점을 보류합니다. 답을 확인한 뒤 연결된 원문 segment를 펼쳐 볼 수 있습니다.
- 퀴즈 진행과 오답은 이 브라우저에 저장되며 이어 풀거나 저장 오답만 복습할 수 있습니다. 문항이 바뀌면 이전 퀴즈 기록은 무효화됩니다. 교수님 답변 대비는 질문 아래에 30초 답변을 바로 보여줍니다.
- 본문·번역본은 목차와 읽기 진행 표시를 제공합니다. 홈의 읽기 순서는 manifest 배열 순서이며, 날짜로 고른 가장 가까운 읽기는 `다음 읽기`로 표시합니다.
- 더보기에는 요약·개념·헷갈리는 포인트·시험 직전 정리만 표시합니다. 기존 유형별 퀴즈 주소는 유지하며 통합 퀴즈로 이동할 수 있습니다.
- 원본 PDF, 강의 녹음, STT와 개인정보는 배포 대상에 포함하지 않습니다.

## 구조

- `manifest/readings.json`: 사이트 설정과 22편의 주차·메타데이터
- `content/readings/<slug>/`: 원문, 번역, 학습자료, 검수 기록
- `scripts/`: 빌드·정렬·콘텐츠 검증 엔진
- `docs/`: 생성된 정적 사이트
- `source_pdfs/`: 로컬 전용 원문 PDF (`.gitignore` 대상)
- `workspace/`: 로컬 전용 강의계획서와 작업 메모

## 빌드와 검증

```powershell
npm ci
npm run build
npm run check
```

`node scripts/build_site.js`는 승인된 22편 전체 정적 사이트를 `docs/`에 생성합니다.
기본 검사는 manifest의 전체 읽기를 대상으로 합니다. 첫 두 편만 확인하는 명령에는 `:pilot`이 붙습니다. `npm run check:app`은 실제 DOM에서 출제→입력→채점→결과→재풀이와 퀴즈 저장·복원, 목차, 답변의 즉시 표시를 확인합니다. `check:validation`과 `check:build`는 승인 의존 파일 변경, 잘못된 정렬, 누락·오래된 생성물, 초안 공개 차단과 manifest 순서의 회귀를 검사합니다.

`check:mobile`은 360·390·430px에 대한 정적 레이아웃 검사입니다. 변경 후에는 실제 브라우저에서도 데스크톱·모바일 화면을 확인합니다.

## 검토와 승인

본문 파일뿐 아니라 근거 segment, 번역 정렬, 참조 이미지와 개요를 포함한 합성해시를 승인에 저장합니다. 의존 파일이 바뀌거나 이전 형식의 승인 해시만 있으면 검토가 필요합니다. 빌드는 승인을 자동 갱신하지 않습니다.

논문 한 편의 변경 사항을 검토한 다음 명시적으로 승인하고 빌드합니다.

```powershell
node scripts/approve_reading.js --slug levy-2009 --source-only --reviewer reviewer-name --note "검토한 범위와 결과"
node scripts/build_site.js --slug levy-2009
node scripts/validate_content.js --slug levy-2009 --publish-gate
```

영어 학습자료 전환의 논문별 검토 범위와 결과는 `content/readings/<slug>/stage3_english_work_log.md`에 기록합니다. 이번 검토는 저장된 `source_segments.json`을 기준으로 하며, 로컬 원본 PDF가 없어 원본 PDF 전체를 새로 재대조한 것은 아닙니다.

승인 전 초안은 공개 폴더에 출력하지 않습니다. 다음 명령은 `tmp/site-preview/`에 검토용 사이트를 만듭니다. 사용자 지정 `--output-dir`도 `tmp/`의 하위 폴더만 허용합니다.

```powershell
node scripts/build_site.js --slug levy-2009 --preview-locked --preview-draft
```

## 로컬 미리보기

```powershell
python -m http.server 8765 --directory docs
```

브라우저에서 `http://127.0.0.1:8765/`를 엽니다.
