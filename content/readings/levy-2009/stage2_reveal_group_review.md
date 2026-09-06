# levy-2009: shared-source click group review

Scope: stage 2 translation click boundaries only. Reviewed by Codex against the stored Korean and English blocks.
Adjacent verified pairs that repeat the same source are one click group. The first pair ID is retained.
Korean text and order are unchanged; English source coverage matches each complete source block exactly once.
No original/translation markdown, segment IDs, figures, tables, references, or quiz evidence were changed.

- Blocks checked: 52
- Click controls: 159 → 137
- Duplicate groups merged: 20
- Alignment SHA256 before: 52fede636c41034e1a8e06327815e731942b5879801020ffd9fce36276b4318e
- Alignment SHA256 after: 582cb7e7249832690092db8eff7303018a8486bb5de558a851c61c6650779a70

| Block | Retained ID | Combined IDs |
| --- | --- | --- |
| levy-tr-001 | levy-tr-001-s05 | levy-tr-001-s05, levy-tr-001-s06 |
| levy-tr-002 | levy-tr-002-s02 | levy-tr-002-s02, levy-tr-002-s03 |
| levy-tr-003 | levy-tr-003-s03 | levy-tr-003-s03, levy-tr-003-s04 |
| levy-tr-004 | levy-tr-004-s02 | levy-tr-004-s02, levy-tr-004-s03 |
| levy-tr-004 | levy-tr-004-s04 | levy-tr-004-s04, levy-tr-004-s05 |
| levy-tr-004 | levy-tr-004-s06 | levy-tr-004-s06, levy-tr-004-s07 |
| levy-tr-005 | levy-tr-005-s05 | levy-tr-005-s05, levy-tr-005-s06 |
| levy-tr-006 | levy-tr-006-s01 | levy-tr-006-s01, levy-tr-006-s02 |
| levy-tr-007 | levy-tr-007-s02 | levy-tr-007-s02, levy-tr-007-s03 |
| levy-tr-007 | levy-tr-007-s04 | levy-tr-007-s04, levy-tr-007-s05 |
| levy-tr-008 | levy-tr-008-s04 | levy-tr-008-s04, levy-tr-008-s05 |
| levy-tr-011 | levy-tr-011-s02 | levy-tr-011-s02, levy-tr-011-s03, levy-tr-011-s04 |
| levy-tr-012 | levy-tr-012-s02 | levy-tr-012-s02, levy-tr-012-s03 |
| levy-tr-013 | levy-tr-013-s02 | levy-tr-013-s02, levy-tr-013-s03 |
| levy-tr-014 | levy-tr-014-s02 | levy-tr-014-s02, levy-tr-014-s03 |
| levy-tr-015 | levy-tr-015-s01 | levy-tr-015-s01, levy-tr-015-s02 |
| levy-tr-018 | levy-tr-018-s01 | levy-tr-018-s01, levy-tr-018-s02 |
| levy-tr-018 | levy-tr-018-s04 | levy-tr-018-s04, levy-tr-018-s05 |
| levy-tr-022 | levy-tr-022-s03 | levy-tr-022-s03, levy-tr-022-s04 |
| levy-tr-029 | levy-tr-029-s04 | levy-tr-029-s04, levy-tr-029-s05, levy-tr-029-s06 |

Approval scope: translation page only. Rebuild and publish-gate validation are required after updating its dependency hash.

## Verification result

- PASS: per-reading strict alignment, rendered Korean/source coverage, and publish gate after translation-only reapproval and rebuild.
- PASS: full-manifest final audit found zero remaining duplicate-source controls; original markdown and segment JSON hashes were preserved.
