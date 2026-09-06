# hagestad-settersten-2017: shared-source click group review

Scope: stage 2 translation click boundaries only. Reviewed by Codex against the stored Korean and English blocks.
Adjacent verified pairs that repeat the same source are one click group. The first pair ID is retained.
Korean text and order are unchanged; English source coverage matches each complete source block exactly once.
No original/translation markdown, segment IDs, figures, tables, references, or quiz evidence were changed.

- Blocks checked: 107
- Click controls: 483 → 460
- Duplicate groups merged: 23
- Alignment SHA256 before: 4d82df6f06bfab0626b4f9e937d385ee3d48f9b1693e26a5d72a62e994093294
- Alignment SHA256 after: 73d0eb7407f5f062499f0270e589e063acc8cfb3bd86351324e7dfe9d99d93b8

| Block | Retained ID | Combined IDs |
| --- | --- | --- |
| hagestad-settersten-2017-tr-003 | hagestad-settersten-2017-tr-003-s01 | hagestad-settersten-2017-tr-003-s01, hagestad-settersten-2017-tr-003-s02 |
| hagestad-settersten-2017-tr-008 | hagestad-settersten-2017-tr-008-s01 | hagestad-settersten-2017-tr-008-s01, hagestad-settersten-2017-tr-008-s02 |
| hagestad-settersten-2017-tr-013 | hagestad-settersten-2017-tr-013-s01 | hagestad-settersten-2017-tr-013-s01, hagestad-settersten-2017-tr-013-s02 |
| hagestad-settersten-2017-tr-017 | hagestad-settersten-2017-tr-017-s03 | hagestad-settersten-2017-tr-017-s03, hagestad-settersten-2017-tr-017-s04 |
| hagestad-settersten-2017-tr-017 | hagestad-settersten-2017-tr-017-s08 | hagestad-settersten-2017-tr-017-s08, hagestad-settersten-2017-tr-017-s09 |
| hagestad-settersten-2017-tr-020 | hagestad-settersten-2017-tr-020-s07 | hagestad-settersten-2017-tr-020-s07, hagestad-settersten-2017-tr-020-s08 |
| hagestad-settersten-2017-tr-022 | hagestad-settersten-2017-tr-022-s06 | hagestad-settersten-2017-tr-022-s06, hagestad-settersten-2017-tr-022-s07 |
| hagestad-settersten-2017-tr-024 | hagestad-settersten-2017-tr-024-s01 | hagestad-settersten-2017-tr-024-s01, hagestad-settersten-2017-tr-024-s02 |
| hagestad-settersten-2017-tr-025 | hagestad-settersten-2017-tr-025-s03 | hagestad-settersten-2017-tr-025-s03, hagestad-settersten-2017-tr-025-s04 |
| hagestad-settersten-2017-tr-026 | hagestad-settersten-2017-tr-026-s04 | hagestad-settersten-2017-tr-026-s04, hagestad-settersten-2017-tr-026-s05 |
| hagestad-settersten-2017-tr-027 | hagestad-settersten-2017-tr-027-s08 | hagestad-settersten-2017-tr-027-s08, hagestad-settersten-2017-tr-027-s09 |
| hagestad-settersten-2017-tr-027 | hagestad-settersten-2017-tr-027-s12 | hagestad-settersten-2017-tr-027-s12, hagestad-settersten-2017-tr-027-s13 |
| hagestad-settersten-2017-tr-030 | hagestad-settersten-2017-tr-030-s01 | hagestad-settersten-2017-tr-030-s01, hagestad-settersten-2017-tr-030-s02 |
| hagestad-settersten-2017-tr-030 | hagestad-settersten-2017-tr-030-s03 | hagestad-settersten-2017-tr-030-s03, hagestad-settersten-2017-tr-030-s04 |
| hagestad-settersten-2017-tr-032 | hagestad-settersten-2017-tr-032-s06 | hagestad-settersten-2017-tr-032-s06, hagestad-settersten-2017-tr-032-s07 |
| hagestad-settersten-2017-tr-043 | hagestad-settersten-2017-tr-043-s04 | hagestad-settersten-2017-tr-043-s04, hagestad-settersten-2017-tr-043-s05 |
| hagestad-settersten-2017-tr-044 | hagestad-settersten-2017-tr-044-s06 | hagestad-settersten-2017-tr-044-s06, hagestad-settersten-2017-tr-044-s07 |
| hagestad-settersten-2017-tr-045 | hagestad-settersten-2017-tr-045-s03 | hagestad-settersten-2017-tr-045-s03, hagestad-settersten-2017-tr-045-s04 |
| hagestad-settersten-2017-tr-056 | hagestad-settersten-2017-tr-056-s05 | hagestad-settersten-2017-tr-056-s05, hagestad-settersten-2017-tr-056-s06 |
| hagestad-settersten-2017-tr-059 | hagestad-settersten-2017-tr-059-s02 | hagestad-settersten-2017-tr-059-s02, hagestad-settersten-2017-tr-059-s03 |
| hagestad-settersten-2017-tr-059 | hagestad-settersten-2017-tr-059-s06 | hagestad-settersten-2017-tr-059-s06, hagestad-settersten-2017-tr-059-s07 |
| hagestad-settersten-2017-tr-060 | hagestad-settersten-2017-tr-060-s03 | hagestad-settersten-2017-tr-060-s03, hagestad-settersten-2017-tr-060-s04 |
| hagestad-settersten-2017-tr-063 | hagestad-settersten-2017-tr-063-s01 | hagestad-settersten-2017-tr-063-s01, hagestad-settersten-2017-tr-063-s02 |

Approval scope: translation page only. Rebuild and publish-gate validation are required after updating its dependency hash.

## Verification result

- PASS: per-reading strict alignment, rendered Korean/source coverage, and publish gate after translation-only reapproval and rebuild.
- PASS: full-manifest final audit found zero remaining duplicate-source controls; original markdown and segment JSON hashes were preserved.
