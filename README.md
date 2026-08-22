# 고령화와 가족 읽기 사이트

2026년 2학기 `고령화와 가족` 강의의 영문 읽기자료를 주차 순서대로 공부하기 위한 정적 사이트입니다.

## 현재 범위

- 강의계획서에 명시된 읽기자료 22편을 `manifest/readings.json`에 등록했습니다.
- 첫 읽기 주차인 2주차의 Levy (2009), Settersten & Godlewski (2016)를 시범 콘텐츠로 제공합니다.
- 이후 주차 카드는 보이지만 검수 전까지 잠깁니다.
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
node scripts/check-alignment.js --slug levy-2009 --strict --write-report
node scripts/check-alignment.js --slug settersten-godlewski-2016 --strict --write-report
node scripts/build_site.js --slug levy-2009
node scripts/build_site.js --slug settersten-godlewski-2016
node scripts/check_rendered_reveals.js --slug levy-2009 --slug settersten-godlewski-2016
node scripts/validate_content.js --slug levy-2009 --publish-gate
node scripts/validate_content.js --slug settersten-godlewski-2016 --publish-gate
```

`node scripts/build_site.js` 전체 빌드는 22편의 안내 페이지까지 생성합니다. 시범 단계에서는 위처럼 공개할 slug만 차례로 빌드합니다.

## 로컬 미리보기

```powershell
python -m http.server 8765 --directory docs
```

브라우저에서 `http://127.0.0.1:8765/`를 엽니다.
