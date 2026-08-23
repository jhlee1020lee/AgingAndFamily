# Translation Work Log - vaupel-2010

## Pass 1 - Title, abstract, body, Box 1, and figures

- Translated the complete seven-page source reconstruction without summary substitution: title, abstract, all body sections, Box 1, Figure 1–4 captions, acknowledgements, and author information.
- Preserved the 19 source segment IDs and their order. `translation_segments.json` contains 19 non-summary translations and no empty segment.
- Kept all five asset positions and targets unchanged: Figure 1, Figure 2, Box 1, Figure 3, and Figure 4.
- Preserved quantitative anchors and notation, including `X5`, `X10`, `100+`, `105+`, `~75`, all percentages, age ranges, calendar years, probabilities, colour legends, URLs, and `NIA P01-08761`.

## Pass 2 - Terminology and claim strength

- Applied the following terminology consistently in translated prose:
  - `pace/rate of ageing` → `노화 속도`
  - `late/advanced-age mortality` → `고령기 사망률` or, where the source refers to the event rather than the rate, `고령기의 사망`
  - `heterogeneous/heterogeneity` → `이질적/이질성`
  - `frail/frailty` → `취약한/취약성`
  - `health expectancy` → `건강기대수명`; `healthspan` does not occur literally in this source
  - `life expectancy` → `기대수명`
  - `postponement` → `지연`
  - `slowing/deceleration` → `둔화/감속`, according to the source distinction
- Rechecked every qualified claim containing `seems`, `suggests`, `may`, `might`, `likely`, `plausible`, `probable`, `perhaps`, `not inconsistent`, and related limitation language. Korean possibility and uncertainty markers were retained.
- Rechecked the distinction between delayed senescence and a slower rate of ageing throughout the abstract, “Delay not deceleration,” Box 1, forecasts, and perspectives.

## Pass 3 - References and back matter

- Preserved all 100 English bibliographic entries byte-for-byte and in numerical order.
- Translated the six explanatory reference annotations while leaving their associated bibliographic records unchanged.
- Translated the complete acknowledgement and funding statement, including every named person and grant identifier.
- Introduced no interactive assistant, lecture recording, STT, or course-private personal information. Public author-contact text already present in the approved source was translated only to preserve source completeness.

## Alignment QA

- Verified 156 paragraph/context-block entries against `full.md`.
- Reviewed all sentence pairs for semantic correspondence and complete ordered coverage, then promoted 356 pairs to `verified` with `human-reviewed-v1` as the method.
- The automatic splitter initially treated initials in the acknowledgement as sentence endings; those fragments were manually regrouped into two complete semantic pairs (acknowledgement and funding).
- Pair-level numeric-token audit found no source number missing from its Korean pair.
- Figure-target and symbol counts match the source, and all 100 reference records match exactly.
- Strict segment alignment passes with no errors. Its three citation warnings (`MORT-003`, `DELAY-001`, `PERSPECTIVES-001`) are false positives: the checker looks for author-year citations in Korean, whereas this Nature article uses preserved numeric citations.

## Validation and approval status

- Source-only content validation reports `translation: schema_pass`, 156 reveal entries, and 356 verified sentence pairs.
- Independent Stage 2 audit covered all 19 segments, 156 source/translation blocks, 356 sentence pairs, Box 1, Figures 1–4, all numeric anchors, six translated annotations, and references 1–100; it found no omissions, ordering defects, or substantive errors.
- The audit's five low-risk refinements were applied consistently across `translation.md`, `translation_segments.json`, and `translation_alignment.json`: nutrition/lifestyle wording, the logical scope of the APOE comparison, the population-health sentence's non-causal form, the meaning of `two orders of magnitude`, and the final forecast's possibility marker.
- Stage 2 is ready for manual approval after the corrected hashes are validated.
- Stage 3 materials were not created or modified.
- A repository-wide build restored the shared `docs/` tree and its link check passed in the parent workflow. That build preceded the Vaupel `translation_original_reveal` manifest setting, so the current rendered Vaupel translation page is stale: `check_rendered_reveals.js` finds 0 of the expected 156 reveal bodies and 356 sentence pairs. Per the shared-build coordination instruction, no second build was run here; the next permitted build must regenerate this page before rendered-reveal approval.
