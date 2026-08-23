# Stage 2 Work Log - lee-yeung-2021

## Authority and reconstruction

- 승인된 `full.md`와 `source_segments.json`, 로컬 원 PDF `12 Lee and Yeung, 2021.pdf` 14쪽, 네 개 표 crop만을 권위 자료로 사용했다.
- 원 PDF SHA-256은 `7C65CFE6421CA53E0421B886B0F2A48C3D9A8D2E223DCC15AD33D5E3EDE98052`이며, 인쇄면은 642–655쪽이다.
- `scripts/reconstruct_lee_yeung_translation.py`에 H1/H2 제목 17개, 이미지 대체텍스트 4개, 참고문헌 이전 비참고문헌 블록 70개의 번역을 선언했다.
- 재구성기는 승인 원문의 블록 순서·이미지 경로·참고문헌 수와 byte identity, 원문 숫자 토큰의 블록별 중복 횟수, KLoSA 표본흐름·젠더 상호작용·유의/비유의 결과 sentinel, 사적 정보 금지표식을 검사한다.
- 원문의 CRLF를 번역에도 보존하며, `## 참고문헌` 뒤를 원문 `## References` 뒤에서 그대로 복사한다.

## Translation passes

- 1차: 제목, 저자·소속, 출판·접수·교신·저작권 메타데이터, 구조화 초록과 핵심어를 번역했다.
- 2차: 생애과정·누적적 사회계층화, 직업 경험, 가족 상황, 한국 연금·노동시장 맥락과 여섯 가설을 주장 강도에 맞춰 옮겼다.
- 3차: KLoSA 자료, 표본선정·탈락, 결과변수, 직업력·건강·재정·가족 설명변수와 결측치 처리 방식을 수치와 함께 대조했다.
- 4차: 다층 이산시간 모형, 두 연계식, 무작위효과, FIML·조사 가중, 성별 층화 및 Models 1–3의 분석범위를 확인했다.
- 5차: 모든 결과를 여성·남성별로 분리해 비교집단, 계수 부호, 오즈 해석, p값, 유의/비유의 및 무작위효과 상관을 전수 확인했다.
- 6차: 논의의 연관성·가능성·정책 함의를 인과로 강화하지 않았는지, 보충자료·연구비·이해상충과 참고문헌이 빠지지 않았는지 다시 읽었다.

## PDF and visual verification

- PDF 14쪽을 1,191×1,565픽셀 QA 렌더로 전수 확인했다. 본문은 2열이며 페이지·열을 넘는 문장, 제목, 메타데이터, 각주성 출판정보와 참고문헌 이어짐을 승인 Stage 1 원문과 대조했다.
- PDF 647쪽의 두 식을 원해상도로 확인했다. 위첨자·아래첨자, α/β/δ/γ, `D/X/Y/Z`, `u/e`, 분수와 부호를 번역에서 그대로 보존했고 설명의 `a = 진입`, `b = 이탈`을 유지했다.
- PDF 648–651쪽과 네 crop을 나란히 확인했다. Table 1은 980×986(186,438바이트), Table 2는 980×986(174,018바이트), Table 3은 980×1,028(169,857바이트), Table 4는 980×1,145(178,593바이트)이다.
- 네 표 모두 제목, 열 머리글, 변수행, 준거집단, 표준오차 괄호, Models 1–3, 무작위효과·로그우도, 통제변수 주석, `** p < .01`/`* p < .05`가 잘림 없이 보존됐다.
- 각 이미지에는 한국어 대체텍스트가 있고, 이어지는 캡션·접근성 설명은 비교 열, 핵심 값, 정확한 셀 값이 crop에 보존됨을 설명한다.

## Numeric, attribution, and scope audit

- KLoSA 조사기간 2006–2016, 최대 10년, 표본연령 50–64→60–74세, 무유급노동 경험 제외 `n = 1,295`, 결측 노동상태 탈락 14.3%, 관측손실 중 사망 약 14%를 보존했다.
- 최종 2,600명은 남성 1,579명과 여성 1,021명이며 26,520인년이다. 계속 일한 비율 약 29%, 조사 전 이탈 후 재진입 약 36%, 복수 노동상태 전환 약 27%의 서로 다른 분모와 시점을 유지했다.
- Tables 1–2의 상태변화율 `.20/.16/.25`와 `.14/.13/.16`, 인년 `10,414/6,528/3,886`과 `16,106/12,301/3,805`를 crop과 대조했다.
- 젠더 상호작용 다섯 개 `−0.02 p < .001`, `−0.03 p < .05`, `−0.38 p < .01`, `−0.28 p < .01`, `0.44 p < .05`의 부호와 귀속을 확인했다.
- 여성의 39% 낮은 이탈 오즈, 42% 높은 이탈 오즈, `ρ = 0.49`; 남성의 취업 배우자와 관련된 약 22% 낮은 이탈 오즈, `ρ = 0.44`를 해당 준거집단과 함께 유지했다.
- 전문직·비숙련 육체노동직의 남성 결과, 여성 자산과 잔류, 남성 혼인해체·자녀지원 등 비유의 결과를 유의한 효과로 바꾸지 않았다. `관련되었다`, `보인다`, `일 수 있다`, `시사한다`를 사용해 관찰연구의 인과경계를 지켰다.
- 비참고문헌 70개 블록 및 372개 문장쌍에서 원문 숫자 토큰 누락은 0건이다. 자동 단순 계수의 세 차이는 월명이 `2월`·`1월`로, `a decade`가 `10년`으로 명시된 정상 번역이다.

## Segmentation and sentence alignment

- `tmp/source_segment_plans/lee-yeung-2021-translation.json`은 승인 원문과 같은 23개 ID, 블록범위 1–126, PDF 위치를 사용한다.
- `scripts/generate_translation_segments.js`로 23개 번역 세그먼트와 126개 번역 블록을 생성했다.
- `scripts/generate_block_alignment.js --verified`로 참고문헌을 포함한 117개 문단을 단조롭게 1:1 정렬했다.
- `scripts/review_lee_yeung_sentence_alignment.js`로 372개 문장쌍을 의미, 순서, 누락, 인용, 모든 숫자, 표본 분모, 성별 귀속, 계수 방향, 유의/비유의 범위, 인과 강도, 네 표 설명 기준으로 전수 검토했다.
- 자동 경계가 의미 단위와 달랐던 `tr-033`, `tr-042`, `tr-046`, `tr-048`, `tr-060`에는 양쪽 텍스트를 빠짐없이 단조롭게 덮는 수동 결합 규칙 5개를 선언했다.
- 모든 문단의 `sentence_alignment_method`는 `human-reviewed-v1`, 모든 문장쌍의 상태는 `verified`이며 문장쌍별 숫자 누락은 0건이다.

## References

- 참고문헌 56개는 원문에서 직접 보존했다. Markdown 참고문헌 본문은 양쪽 모두 11,449바이트이고 SHA-256 `B22AA61E9D28ECAA46786C19A36C1D9DC3F2F0CE7F62F84843764CFCB13065AB`로 byte-identical이다.
- 세그먼트 JSON의 `REF-001` 원문/번역 문자열도 서로 동일하며 11,331바이트, SHA-256 `09FADDC1CCDD0A421F48ED3A2FF8C085A27283954F315395407029B38E69DE6A`이다.
- 저자·연도·제목·저널·페이지·DOI뿐 아니라 승인 원문의 인쇄상 특이 공백과 구두점도 임의로 교정하지 않았다.

## Validation and isolated preview

- `node scripts/check_alignment.js --slug lee-yeung-2021 --strict`: **PASS 23/23**. 상세 체크리스트를 덮어쓰는 `--write-report`는 실행하지 않았다.
- `node scripts/validate_content.js --slug lee-yeung-2021 --source-only --json`: 번역 `schema_pass`, 오류 0, H2 16개, 그림·표 4개, 문단 117개, reveal 117개, 문장쌍 372개다. Stage 2는 승인 전 정상 상태인 `manual_review_required`다.
- validator의 표 라벨 경고는 이미지 4개 외에 캡션·접근성 설명도 라벨로 세는 일반 휴리스틱이며, 직접 이미지 삽입과 캡션의 누락은 없다.
- 기본 빌드나 `--help`를 실행하지 않고 `node scripts/build_site.js --preview-locked --preview-draft --output-dir tmp/lee-yeung-stage2-full-preview-r4`로 최종 전체 격리 미리보기만 만들었다.
- `node scripts/check_rendered_reveals.js --slug lee-yeung-2021 --site-dir tmp/lee-yeung-stage2-full-preview-r4`: **PASS 117/117 block reveals, 372 sentence reveals**.
- `node scripts/check_site_links.js --site-dir tmp/lee-yeung-stage2-full-preview-r4`: **PASS 243 HTML files, 5,713 local targets, no private paths or chatbot**.
- 공유 렌더러의 경계형 italic 정규식 수정 후 새 미리보기를 만들었다. `tr-041`·`tr-046` 및 Tables 3–4의 한국어·영어 `** p < .01`/`* p < .05`가 literal로 존재하고 잘못된 `<em>` 변환은 0건이다.
- 번역 Markdown, 두 JSON 파생물, 최종 렌더 HTML을 12개 금지 패턴으로 검사한 결과 사적 경로, STT, 녹음·전사, 강의 오디오, 학생·수강생 정보, 챗봇 표식은 0건이다.
- 동일한 번역·renderer를 사용한 직전 고유 격리 미리보기 `r3`를 실제 브라우저로 열어 데스크톱 문장 툴팁과 문단 전체 원문 펼치기, 390×844 모바일 문장 탭과 영어 tooltip을 확인했다. 이후 결정론 파이프라인을 재실행하고 만든 최종 `r4`는 rendered-reveal checker로 다시 전수 대조했다. 임시 서버의 `/favicon.ico` 404 한 건 외에 애플리케이션 콘솔 오류·경고는 없었다.

## Deterministic regeneration and hashes

- 재구성, 번역 세그먼트 생성, 검증된 블록정렬, 수동검토 문장정렬의 전체 파이프라인을 연속 강제 실행했다. 두 번째 실행 전후 아래 세 핵심 산출물의 SHA-256이 동일했다.
  - `translation.md`: `2B04884390209724C1EE4CFF421DAB3F692A13201D0AE2958DB779A63572CAC5`
  - `translation_segments.json`: `6D3CBE164DB7221640166103A0513474A82E5288E8F16B6311A0C87D7C236C91`
  - `translation_alignment.json`: `272B138D20F53D626F26C997FC95CAEF6C8610A65FAD3F34B9D24D4ED7338784`
- 권위 재구성 스크립트 SHA-256은 `1693565AB146224D1DE23ACADB056F65415685BB23BB4D82D1402418CA761780`, 문장검토 스크립트는 `0BEA70953FD801BE53DB6CFE5A782239486641649AB4903B5DE66BB8597AFE0D`, 번역 세그먼트 계획은 `D85D406C9ECC335E428A0E0E36C7142F0ED3E195D9DEF49082F702A5D098D792`이다.

## Review status

- 작성자 자체 검수 결과 해결되지 않은 Critical/Major/Minor 내용 오류는 발견하지 못했다.
- 작성자가 자기 번역을 승인하지 않는 원칙에 따라 Stage 2는 **HOLD — independent audit required**로 남긴다.
- 공개 `docs` 빌드, manifest 승인, Stage 3 작성, 배포, 커밋은 수행하지 않았다.
