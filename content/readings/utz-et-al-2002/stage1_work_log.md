# Stage 1 Work Log - utz-et-al-2002

## Source reconstruction

- Reconstructed the complete 12-page article (printed pp. 522–533) from positioned PDF blocks and compared every page with the original-resolution render.
- Preserved the full title, four authors, three affiliation markers, correspondence, received/accepted dates, decision editor, journal/issue/pages, copyright, funding and presentation note, structured abstract, key words, all substantive prose, and all 61 references.
- Removed only running heads, printed page numbers, decorative rules, and page furniture. Rejoined column and page continuations and removed only typesetting line-break hyphens; printed spellings such as `Bengston`, `Antonnuci`, `Macoby`, and `Form the standpoint` remain unchanged.
- `scripts/reconstruct_utz_source.py` deterministically rebuilds `full.md` from `tmp/pdf_blocks/utz-et-al-2002.json`, normalizes extraction control glyphs into the printed mathematical symbols, checks the 12-page source and 61-reference count, asserts central evidence sentinels, and verifies the six visual assets in printed order.

## Figures and tables

- Cropped and visually checked all six substantive visual assets directly from the 144-dpi page renders: Table 1 (p. 526), Figure 1 (p. 527), Tables 2 and 3 (p. 528), Figure 2 (p. 529), and Figure 3 (p. 530).
- Expanded the two pie-chart crops to the full text width so their captions and survey-question wording are not clipped. The crop specification is recorded in `figure_crops.json`.
- Added adjacent accessibility descriptions without replacing or altering the source images. They retain the model cells, significance markers, chart labels, notes, and response distributions visible in the source.

## Structure and reading order

- Retained Abstract, Key Words, Introduction, Methods, Results, Discussion, and References as level-2 sections, with the printed substantive headings represented at lower levels.
- Preserved every cross-column and cross-page continuation, including the theory and prior-research discussions on pp. 523–524, CLOC sampling on p. 524, measures and analysis on pp. 525–526, results and visual sequence on pp. 526–530, discussion on pp. 529–532, and the two-column reference sequence on pp. 532–533.
- `tmp/source_segment_plans/utz-et-al-2002.json` assigns all 123 parsed Markdown blocks exactly once to 20 meaning-based segments. `source_segments.json` contains 9,027 assigned source words.

## Evidence sentinels and references

- Verified the baseline CLOC sample (`n = 1,532`, 68% response), 297-person weighted analytic sample (217 women and 80 men; 210 widowed and 87 controls), and unweighted sample of 333 (249 widowed and 84 controls).
- Preserved the reliability values for informal participation (`α = .52`), formal participation (`α = .71`), activity limitation (`α = .77`), depression (`α = .81`), and extraversion (`α = .53`).
- Preserved the central result that widowhood predicts informal but not formal participation, the Model 3 informal coefficient `.44`, the continuity coefficients and adjusted R² changes, and the nonsignificant Widowhood × Sex interaction.
- Preserved the Figure 2 distributions—own interest 17% more, 71% the same, 12% less; friends' and relatives' interest 35% more, 59% the same, 6% less—and Figure 3's 87% kept-busy response.
- Verified all 61 references in printed alphabetical order, from Anderson (1983) through Ward, Logan, and Spitze (1992), including source-specific spelling and punctuation.

## Reproducibility and validation

- The reconstructed `full.md` contains 9,212 whitespace-delimited words, seven level-2 sections, 13 level-3 subsections, four level-4 subsections, 117 validator paragraphs, six raster assets, and 61 reference paragraphs.
- SHA-256 hashes are `F55434DCC90975BE98F29BC63B656F93D3CC8F01AC5A33F82416A2606DE65FAA` for `full.md`, `CA47F500C22BB929E9E6511A4E8616E35008D2F35BB7D4305E806E26C0CE0A9B` for `source_segments.json`, and `EA99282F9DBC0043A8468AFFACF2CCC7E710D306EB776D1947512B68F96EAE79` for the source PDF.
- A second reconstruction and forced source-segment regeneration reproduced both output hashes byte-for-byte. Source-only schema validation passes. After `check_site_links.js` was corrected to honor `--site-dir`, a fresh complete isolated preview at `tmp/utz-stage1-full-preview-audit` passed 5,087 local target checks across 243 HTML files with no broken link, private path, or chatbot marker.

## Review status

- Root reconstruction, deterministic regeneration, and page-by-page visual comparison are complete. Independent source audit and manual approval remain pending; no public-site build or commit was performed for this reading.
