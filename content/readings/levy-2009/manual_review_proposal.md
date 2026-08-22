# Manual Review Proposal - levy-2009

`meta.json`의 최종 승인값이 아니라, 빌드 엔진이 `meta.json`을 만든 뒤 사람이 검수할 때 사용할 제안입니다.

## Proposed initial state

```json
{
  "manual_review": {
    "approved_pages": [],
    "approved_page_hashes": {},
    "reviewer": "",
    "reviewed_at": null,
    "notes": [
      "Stage 1 review pending: compare abstract, component transitions, Figure 1/2 captions, Future Directions, acknowledgments, and all references with the five-page local PDF.",
      "Stage 2 review pending: spot-check 7.5-year survival, 440/229 samples, 38-year follow-up, 55 ms priming, stereotype-matching directions, and caution language.",
      "Stage 3 review pending: verify all quiz answers against evidence_segment_id and confirm professor-prep items remain clearly labeled as predicted style rather than actual exam questions."
    ],
    "blocked_reason": ""
  }
}
```

## Approval sequence

1. Approve `full` only after the source PDF spot-check.
2. Approve `translation` only after strict alignment and manual spot-checks both pass.
3. Review and approve Stage 3 pages one family at a time.
4. Let the validator write and compare page hashes; do not paste placeholder hashes by hand.
