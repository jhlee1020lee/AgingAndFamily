# Manual Review Proposal - settersten-godlewski-2016

`meta.json`의 최종 승인값이 아니라, 빌드 엔진이 `meta.json`을 만든 뒤 사람이 검수할 때 사용할 제안이다.

## Proposed initial state

```json
{
  "manual_review": {
    "approved_pages": [],
    "approved_page_hashes": {},
    "reviewer": "",
    "reviewed_at": null,
    "notes": [
      "Stage 1 review pending: compare the title, 10 subsections, conclusion, and all 68 references with the 17-page local PDF; confirm that the chapter has no notes, tables, or figures.",
      "Stage 2 review pending: spot-check chronological age versus aging, the relative-time examples, AARC's five domains, Neugarten's nonchronological distinction, integration/segregation cautions, Project AGE, and the concluding paradox.",
      "Stage 3 review pending: verify every answer against evidence_segment_id and confirm that professor-prep remains labeled as prior-course-pattern prediction rather than actual exam content."
    ],
    "blocked_reason": ""
  }
}
```

## Approval sequence

1. 원문 PDF 대조가 끝난 뒤 `full`만 먼저 승인한다.
2. strict alignment 통과와 사람의 표본 검수가 모두 끝난 뒤 `translation`을 승인한다.
3. Stage 3 페이지는 요약·개념·함정·복습지·퀴즈·교수대비 순서로 묶음별 검수한다.
4. validator가 현재 내용의 해시를 계산하게 하고 자리표시자 해시를 손으로 넣지 않는다.
