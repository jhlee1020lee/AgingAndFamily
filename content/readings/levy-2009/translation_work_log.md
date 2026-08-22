# Translation Work Log - levy-2009

## Pass 1 - Abstract through internalization

- Translated the abstract and opening argument without replacing the full text with a summary.
- Kept the distinction among age stereotypes, self-perceptions of aging, and stereotype embodiment.
- Rechecked `50`, `2`, `20`, `7.5`, `6`, `440`, `18-49`, `38`, `229`, `18-39`, and `60` against the source segments.

## Pass 2 - Unconscious operation through pathways

- Preserved the direction of positive and negative priming effects in handwriting, will-to-live, cognitive/physical tasks, healthy practices, and cardiovascular stress response.
- Translated self-relevance as `자기관련성` and stereotype-matching effect as `고정관념 일치 효과`, while retaining the English terms on the concepts page.
- Kept possibility language such as `가능성이 있다`, `~일 수 있다`, and `~로 보인다` where the source did not make a definitive causal claim.

## Pass 3 - Future directions and back matter

- Translated Future Directions, explanatory text in Recommended Reading, and Acknowledgments.
- Preserved the full English bibliographic entries so names, titles, years, volumes, and pages remain exact and searchable.
- Matched the two figure assets and translated captions in the same positions as the original.

## Alignment QA

- `source_segments.json` and `translation_segments.json` contain the same 16 IDs in the same order.
- `translation_alignment.json` maps every rendered Korean paragraph to its corresponding English paragraph with verified context-block anchors.
- Automated number and figure-reference checks pass; the only remaining strict-alignment warning is a false positive caused by author surname `May` in `REF-002`.

## Manual review status

- Translation is ready for spot checks of the abstract, longitudinal numbers, priming directions, limitation language, and back matter, but is not manually approved in `meta.json`.
