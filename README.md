# 고령화와 가족 읽기 사이트

2026년 2학기 `고령화와 가족` 강의의 영문 읽기자료를 주차 순서대로 공부하기 위한 정적 사이트입니다.

## 현재 범위

- 강의계획서에 명시된 읽기자료 22편을 `manifest/readings.json`에 등록했습니다.
- 22편 모두 원문, 전체 번역, 핵심 개념, 복습자료, 구술대비와 퀴즈까지 승인·공개 상태입니다.
- 주차별 공개 제한은 사용하지 않으며 홈에서 모든 읽기를 바로 열 수 있습니다.
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
node scripts/check_alignment.js --strict
node scripts/build_site.js
$manifest = Get-Content manifest/readings.json -Raw | ConvertFrom-Json
foreach ($reading in $manifest.readings) {
  node scripts/check_rendered_reveals.js --slug $reading.slug --site-dir docs
}
node scripts/validate_content.js --publish-gate
node scripts/check_site_links.js --site-dir docs
npm run check:mobile
```

`node scripts/build_site.js`는 승인된 22편 전체 정적 사이트를 `docs/`에 생성합니다.
`npm run check:mobile`은 생성된 243개 페이지와 홈 카드 22개를 360·390·430px 모바일 계약으로 검사합니다.

## 로컬 미리보기

```powershell
python -m http.server 8765 --directory docs
```

브라우저에서 `http://127.0.0.1:8765/`를 엽니다.
