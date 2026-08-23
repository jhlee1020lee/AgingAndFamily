# Stage 1 Work Log - smith-et-al-2007

## Source reconstruction

- Reconstructed the complete 11-page article (printed pp. 325–335) from positioned PDF blocks while comparing every page with its rendered source image.
- Preserved the title, author/affiliation/telephone-footnote mappings, correspondence and publication metadata, abstract, keywords, complete article hierarchy, all participant quotations, methods, analysis, conclusions, and all 59 references.
- The printed section spelling `Methology` and source wording such as `showing and interest` are retained rather than silently modernized.
- Restored extraction-only ligatures, column/page continuations, punctuation, and raised issue numerals. Specifically verified the printed journal forms `16(3)`, `7(3), 269–283`, `2(2)`, `48(6)`, `7(3)`, `48(1)`, and `7(1)`.
- Re-audit of the front page confirmed the exact author mapping `a,b,⁎ / a,¹ / b,² / c,³`; the four telephone footnotes are separately preserved, including the source's unprefixed `44 101 3346177` for footnote ³.

## Tables and structure

- Used exact, visually verified crops for Table 1 (age distribution), Table 2 (participant details), and Table 3 (analytical themes). All labels, cells, notes, and sample sentinels remain visible in the raster sources.
- Retained eight level-2 sections and seven level-3 sections, including the paper's masculinity/independence framework, study context, four named interpretive analyses, and full conclusion.
- Joined prose and references across all two-column and page boundaries without duplicating table OCR as body prose.

## Reproducibility and validation

- `scripts/reconstruct_smith_source.py` deterministically rebuilds `full.md` from `tmp/pdf_blocks/smith-et-al-2007.json`, checks all 59 references, required source sentinels, the three table assets, and prohibited chatbot/STT/transcript markers.
- `tmp/source_segment_plans/smith-et-al-2007.json` maps all 137 parsed Markdown source blocks exactly once into 16 meaning-based segments. `source_segments.json` contains 6,943 source words.
- The reconstructed `full.md` contains 7,076 whitespace-delimited words, 106 validator paragraphs, 59 reference paragraphs, three direct image embeds, eight level-2 sections, and seven level-3 subsections.
- SHA-256 hashes are `D214EFBD6734FF22404A42C594940048E4DA878E1422874B1643F04F0A963AA1` for `full.md`, `21657D66909FA95E10DFF9D34A2912E7AEF55EE5663C0C8631D940F5A59EA94E` for `source_segments.json`, and `F33262CE5329ED2A63EE0E4C5FA5DCE4081D28DB319BE3169DA927FED9515941` for the source PDF.
- Source-only schema validation, isolated preview, table links, private-path scan, and no-chatbot scan pass.

## Independent audit and approval

- An independent 11-page audit initially held only the front-page author/telephone-footnote representation; the reconstruction source was corrected and regenerated.
- The independent re-audit returned PASS with zero findings for the corrected metadata, body, quotations, three tables, 59 references, 16 segments, deterministic rebuild, validator, preview links, and chatbot exclusion.
- Stage 1 `full` was manually approved on 2026-08-22. No downstream content was approved by this source-stage review, no public-site build was performed, and no commit was made.
