# settersten-godlewski-2016: shared-source click group review

Scope: stage 2 translation click boundaries only. Reviewed by Codex against the stored Korean and English blocks.
Adjacent verified pairs that repeat the same source are one click group. The first pair ID is retained.
Korean text and order are unchanged; English source coverage matches each complete source block exactly once.
No original/translation markdown, segment IDs, figures, tables, references, or quiz evidence were changed.

- Blocks checked: 86
- Click controls: 340 → 315
- Duplicate groups merged: 24
- Alignment SHA256 before: bdd1e54edb8df786b74b6767447a35718bf8a91ff08422d14a01b1e47bfa214f
- Alignment SHA256 after: 649a0451da62d6617c8663faf47d5a70987b9ab8658d2460d01dc9b43c9509a4

| Block | Retained ID | Combined IDs |
| --- | --- | --- |
| settersten-tr-004 | settersten-tr-004-s07 | settersten-tr-004-s07, settersten-tr-004-s08 |
| settersten-tr-004 | settersten-tr-004-s09 | settersten-tr-004-s09, settersten-tr-004-s10 |
| settersten-tr-004 | settersten-tr-004-s12 | settersten-tr-004-s12, settersten-tr-004-s13 |
| settersten-tr-005 | settersten-tr-005-s04 | settersten-tr-005-s04, settersten-tr-005-s05 |
| settersten-tr-006 | settersten-tr-006-s11 | settersten-tr-006-s11, settersten-tr-006-s12 |
| settersten-tr-006 | settersten-tr-006-s19 | settersten-tr-006-s19, settersten-tr-006-s20 |
| settersten-tr-007 | settersten-tr-007-s07 | settersten-tr-007-s07, settersten-tr-007-s08 |
| settersten-tr-007 | settersten-tr-007-s12 | settersten-tr-007-s12, settersten-tr-007-s13 |
| settersten-tr-008 | settersten-tr-008-s06 | settersten-tr-008-s06, settersten-tr-008-s07, settersten-tr-008-s08 |
| settersten-tr-008 | settersten-tr-008-s18 | settersten-tr-008-s18, settersten-tr-008-s19 |
| settersten-tr-009 | settersten-tr-009-s03 | settersten-tr-009-s03, settersten-tr-009-s04 |
| settersten-tr-009 | settersten-tr-009-s05 | settersten-tr-009-s05, settersten-tr-009-s06 |
| settersten-tr-009 | settersten-tr-009-s14 | settersten-tr-009-s14, settersten-tr-009-s15 |
| settersten-tr-010 | settersten-tr-010-s05 | settersten-tr-010-s05, settersten-tr-010-s06 |
| settersten-tr-010 | settersten-tr-010-s09 | settersten-tr-010-s09, settersten-tr-010-s10 |
| settersten-tr-011 | settersten-tr-011-s07 | settersten-tr-011-s07, settersten-tr-011-s08 |
| settersten-tr-011 | settersten-tr-011-s09 | settersten-tr-011-s09, settersten-tr-011-s10 |
| settersten-tr-011 | settersten-tr-011-s16 | settersten-tr-011-s16, settersten-tr-011-s17 |
| settersten-tr-014 | settersten-tr-014-s05 | settersten-tr-014-s05, settersten-tr-014-s06 |
| settersten-tr-015 | settersten-tr-015-s07 | settersten-tr-015-s07, settersten-tr-015-s08 |
| settersten-tr-015 | settersten-tr-015-s09 | settersten-tr-015-s09, settersten-tr-015-s10 |
| settersten-tr-016 | settersten-tr-016-s02 | settersten-tr-016-s02, settersten-tr-016-s03 |
| settersten-tr-018 | settersten-tr-018-s08 | settersten-tr-018-s08, settersten-tr-018-s09 |
| settersten-tr-018 | settersten-tr-018-s15 | settersten-tr-018-s15, settersten-tr-018-s16 |

Approval scope: translation page only. Rebuild and publish-gate validation are required after updating its dependency hash.

## Verification result

- PASS: per-reading strict alignment, rendered Korean/source coverage, and publish gate after translation-only reapproval and rebuild.
- PASS: full-manifest final audit found zero remaining duplicate-source controls; original markdown and segment JSON hashes were preserved.
