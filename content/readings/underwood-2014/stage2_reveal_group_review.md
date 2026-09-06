# underwood-2014: shared-source click group review

Scope: stage 2 translation click boundaries only. Reviewed by Codex against the stored Korean and English blocks.
Adjacent verified pairs that repeat the same source are one click group. The first pair ID is retained.
Korean text and order are unchanged; English source coverage matches each complete source block exactly once.
No original/translation markdown, segment IDs, figures, tables, references, or quiz evidence were changed.

- Blocks checked: 39
- Click controls: 133 → 102
- Duplicate groups merged: 28
- Alignment SHA256 before: ea2280fed1d1b2162d1bfc0ef7083a941b38e008390773e753711bc169ac83f3
- Alignment SHA256 after: 6354e8b2bf6208d72b3d563d14baa370e1e445d8a593863540e0873e08efb1ba

| Block | Retained ID | Combined IDs |
| --- | --- | --- |
| underwood-2014-tr-001 | underwood-2014-tr-001-s02 | underwood-2014-tr-001-s02, underwood-2014-tr-001-s03 |
| underwood-2014-tr-002 | underwood-2014-tr-002-s01 | underwood-2014-tr-002-s01, underwood-2014-tr-002-s02 |
| underwood-2014-tr-007 | underwood-2014-tr-007-s01 | underwood-2014-tr-007-s01, underwood-2014-tr-007-s02 |
| underwood-2014-tr-007 | underwood-2014-tr-007-s04 | underwood-2014-tr-007-s04, underwood-2014-tr-007-s05 |
| underwood-2014-tr-010 | underwood-2014-tr-010-s03 | underwood-2014-tr-010-s03, underwood-2014-tr-010-s04 |
| underwood-2014-tr-011 | underwood-2014-tr-011-s01 | underwood-2014-tr-011-s01, underwood-2014-tr-011-s02 |
| underwood-2014-tr-012 | underwood-2014-tr-012-s02 | underwood-2014-tr-012-s02, underwood-2014-tr-012-s03 |
| underwood-2014-tr-013 | underwood-2014-tr-013-s02 | underwood-2014-tr-013-s02, underwood-2014-tr-013-s03 |
| underwood-2014-tr-014 | underwood-2014-tr-014-s01 | underwood-2014-tr-014-s01, underwood-2014-tr-014-s02, underwood-2014-tr-014-s03 |
| underwood-2014-tr-014 | underwood-2014-tr-014-s04 | underwood-2014-tr-014-s04, underwood-2014-tr-014-s05 |
| underwood-2014-tr-015 | underwood-2014-tr-015-s02 | underwood-2014-tr-015-s02, underwood-2014-tr-015-s03 |
| underwood-2014-tr-016 | underwood-2014-tr-016-s01 | underwood-2014-tr-016-s01, underwood-2014-tr-016-s02 |
| underwood-2014-tr-019 | underwood-2014-tr-019-s03 | underwood-2014-tr-019-s03, underwood-2014-tr-019-s04 |
| underwood-2014-tr-020 | underwood-2014-tr-020-s03 | underwood-2014-tr-020-s03, underwood-2014-tr-020-s04 |
| underwood-2014-tr-022 | underwood-2014-tr-022-s01 | underwood-2014-tr-022-s01, underwood-2014-tr-022-s02 |
| underwood-2014-tr-028 | underwood-2014-tr-028-s02 | underwood-2014-tr-028-s02, underwood-2014-tr-028-s03 |
| underwood-2014-tr-028 | underwood-2014-tr-028-s04 | underwood-2014-tr-028-s04, underwood-2014-tr-028-s05, underwood-2014-tr-028-s06, underwood-2014-tr-028-s07 |
| underwood-2014-tr-029 | underwood-2014-tr-029-s02 | underwood-2014-tr-029-s02, underwood-2014-tr-029-s03 |
| underwood-2014-tr-029 | underwood-2014-tr-029-s06 | underwood-2014-tr-029-s06, underwood-2014-tr-029-s07 |
| underwood-2014-tr-030 | underwood-2014-tr-030-s02 | underwood-2014-tr-030-s02, underwood-2014-tr-030-s03 |
| underwood-2014-tr-031 | underwood-2014-tr-031-s02 | underwood-2014-tr-031-s02, underwood-2014-tr-031-s03 |
| underwood-2014-tr-032 | underwood-2014-tr-032-s04 | underwood-2014-tr-032-s04, underwood-2014-tr-032-s05 |
| underwood-2014-tr-033 | underwood-2014-tr-033-s01 | underwood-2014-tr-033-s01, underwood-2014-tr-033-s02 |
| underwood-2014-tr-034 | underwood-2014-tr-034-s02 | underwood-2014-tr-034-s02, underwood-2014-tr-034-s03 |
| underwood-2014-tr-036 | underwood-2014-tr-036-s02 | underwood-2014-tr-036-s02, underwood-2014-tr-036-s03 |
| underwood-2014-tr-038 | underwood-2014-tr-038-s01 | underwood-2014-tr-038-s01, underwood-2014-tr-038-s02 |
| underwood-2014-tr-038 | underwood-2014-tr-038-s03 | underwood-2014-tr-038-s03, underwood-2014-tr-038-s04 |
| underwood-2014-tr-039 | underwood-2014-tr-039-s04 | underwood-2014-tr-039-s04, underwood-2014-tr-039-s05 |

Approval scope: translation page only. Rebuild and publish-gate validation are required after updating its dependency hash.

## Verification result

- PASS: per-reading strict alignment, rendered Korean/source coverage, and publish gate after translation-only reapproval and rebuild.
- PASS: full-manifest final audit found zero remaining duplicate-source controls; original markdown and segment JSON hashes were preserved.
