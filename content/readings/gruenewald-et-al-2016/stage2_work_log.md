# Stage 2 Work Log - gruenewald-et-al-2016

## Authority and reconstruction

- 승인된 `full.md`와 `source_segments.json`만 번역의 권위 원문으로 사용했다.
- `REF-001`과 원문의 참고문헌 절을 직접 계산하여 실제 참고문헌 수가 47개임을 확인했다. 임의의 예상 개수는 사용하지 않았다.
- `scripts/reconstruct_gruenewald_translation.py`에 H1–H3 제목, 그림·표 대체텍스트 4개와 참고문헌 이외 텍스트 46개 블록의 완역을 선언했다.
- 재구성기는 116개 원문 Markdown 블록, 번역 텍스트 46개, 이미지 4개, 참고문헌 47개, 블록별 원문 숫자, 핵심 방법·결과·한계 sentinel과 금지 표지를 검사한다.
- `## 참고문헌` 아래 47개 항목은 원문에서 그대로 복사하며 참고문헌 절 전체의 문자 동일성을 강제한다.

## Translation decisions and review passes

- `generativity`는 논문이 기여 동기·행동과 그 자기지각을 함께 다루는 맥락 및 manifest 용어와 일치하도록 `생성감`으로 통일하고 첫 초록 문장에서 원어를 명시했다.
- `generative desire`는 `생성감 욕구`, `generative achievement`는 `생성감 성취에 대한 지각`으로 고정하여 두 하위척도와 결과변수를 분리했다.
- 1차 검토에서 제목, 저자 9명·소속 8곳, 출판정보, 구조화 초록, 핵심어, 서론과 EC/BECT 배경을 번역했다.
- 2차 검토에서 적격기준, 무작위배정 702명, EC 352명·대조 350명, 중재수령 284명, 미진행 68명과 Figure 1 전체 흐름을 대조했다.
- 3차 검토에서 생성감 척도의 13개 문항·2요인·51.2%·`r = .54`·`α = .82/.90`과 공변량을 확인했다.
- 4차 검토에서 ITT와 CACE의 추정대상, 순응자·비순응자, 여섯 가정, OER·가산성 검정, 식별 제약을 문장 단위로 대조했다.
- 5차 검토에서 노출 백분위수, 누적 봉사시간, 결측률, 평가 완료율과 Table 1–3의 alt·caption·접근성 설명을 확인했다.
- 6차 검토에서 네 예외 모형과 원문의 `세 모형` 표현, `60th`/각주 `65th` 불일치, ITT 유의차와 CACE 용량–반응 해석을 보존했다.
- 7차 검토에서 논의·한계·결론을 대조하여 무작위시험의 효과를 생성감 자기지각에 한정하고, 건강 관련 관찰연구의 연관성을 시험의 인과효과로 확대하지 않았다.
- 8차 검토에서 연구비·감사의 말과 참고문헌 47개를 확인하고 숫자·인명·본문 인용 묶음을 전수 점검했다.

## Segmentation and alignment

- `tmp/source_segment_plans/gruenewald-et-al-2016-translation.json`은 승인 원문 계획과 동일한 24개 ID와 1–93 블록 범위를 사용하며 한국어 절 이름을 선언한다.
- `scripts/generate_translation_segments.js`로 24개 번역 세그먼트와 93개 번역 계획 블록을 생성했다.
- `scripts/generate_block_alignment.js --plan tmp/source_segment_plans/gruenewald-et-al-2016-translation.json --verified`로 원문 보기 대상 87개 문단을 단조롭게 정렬했다.
- `scripts/review_gruenewald_sentence_alignment.js`로 219개 문장쌍을 의미·순서·누락·수치·인명·인용·한정 표현·인과범위 기준으로 전수 검토했다.
- 경계가 다른 2개 문단에는 원문과 번역 전체를 빠짐없이 순서대로 덮는 수동 결합 규칙을 명시했다.
- 모든 문단의 `sentence_alignment_method`는 `human-reviewed-v1`, 모든 문장쌍의 상태는 `verified`이며 문장쌍별 원문 숫자 누락은 0개다.

## Validation and preview

### Independent source audit

- 번역 저작자와 다른 검수자가 24개 세그먼트, Figure 1, Table 1–3을 원문과 처음부터 끝까지 재대조했다. 최초 판정은 **HOLD (Critical 0, Major 1, Minor 3)**였다.
- 예비시험 결과 문장에서 `academic performance`를 노인 자원봉사자의 성과로 잘못 수식한 범위 오류를 아동의 학업성과와 노인의 심리사회적·신체적 안녕으로 분리해 교정했다.
- `gold standard program`, `outlet for generative engagement`, 일반적 의미의 `significant benefits`를 각각 `표준이 될 프로그램`, `생성감 활동을 실천할 통로`, `상당한 혜택`으로 다듬었다.
- 교정 뒤 ITT/CACE 추정대상, 여섯 가정, OER·가산성, 60th/65th 원문 불일치, 모든 숫자·연도·인용과 인과범위를 다시 확인했다. 잔여 Critical/Major/Minor는 **0/0/0**, 최종 판정은 **PASS**다.

- `node scripts/check_alignment.js --slug gruenewald-et-al-2016 --strict`: **PASS 24/24**, 오류 0, 경고 0.
- `node scripts/validate_content.js --slug gruenewald-et-al-2016 --source-only --json`: 번역 `schema_pass`, Stage 2 `manual_review_required`; 원문과 번역 H2/H3/H4 13/5/0, 그림·표 4개, 문단 87개.
- `node scripts/build_site.js --preview-locked --preview-draft --output-dir tmp/gruenewald-stage2-full-preview-audit-r2`: slug 없이 새로운 프로젝트 내부 임시 경로에 전체 격리 미리보기를 생성했다.
- `node scripts/check_rendered_reveals.js --slug gruenewald-et-al-2016 --site-dir tmp/gruenewald-stage2-full-preview-audit-r2`: **PASS 87/87 block reveals, 219 sentence reveals**.
- `node scripts/check_site_links.js --site-dir tmp/gruenewald-stage2-full-preview-audit-r2`: **PASS 243 HTML files, 5,176 local targets, no private paths or chatbot**.
- 전체 격리 렌더에서 `source_pdfs/`, STT·녹음 사설 표지와 챗봇 관련 UI·코드·문구가 없음을 추가 확인했다.

## Reproducibility and hashes

- 번역 재구성, 번역 세그먼트 생성, 계획 기반 블록정렬, 문장정렬을 연속으로 두 번 실행해 다음 세 파일이 바이트 단위로 동일함을 확인했다.
  - `translation.md`: `11B034B39BB814D09285B7643563B645E8C9725B22DF032C40190CB9EF74C6A0`
  - `translation_segments.json`: `2FD61680FF7108B264AE248A476B438FBF87846F976670D12088D1B45A0357F1`
  - `translation_alignment.json`: `1379CF37DAB9784B36A86C0616AEF8724832551C5C99A2AB2454DDD26D6B2343`
- manifest의 해당 항목에 `translation_original_reveal`을 `details` 모드로 연결했다.
- 공개 `docs` 빌드, 배포, 수동 승인, Stage 3 작성과 커밋은 수행하지 않았다.
