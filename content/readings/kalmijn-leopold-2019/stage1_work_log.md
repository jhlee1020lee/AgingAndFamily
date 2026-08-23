# Stage 1 Work Log - kalmijn-leopold-2019

## Source reconstruction

- Reconstructed the complete 16-page article (printed pp. 99–114) from the positioned PDF blocks while preserving the two-column reading order and every continuation across columns, pages, and full-width tables or figures.
- Retained the printed title, both authors, affiliation and address notes, Kalmijn's linked ORCID identifier, journal citation, DOI, five-part structured abstract, keywords, all substantive sections, the research-funding Note, and all 52 references.
- Excluded running heads and printed page numbers. The PDF metadata's additional phrase `Sibling ties and parents' death` was not promoted into the article title because it is absent from the printed title page.
- Repaired extraction-only line wrapping and broken DOI strings while preserving substantive source forms such as `face-to-face`, `fixed-effects`, `kin-keeper`, `Floyd ... closness`, and `FamilyComplextiy`.
- Preserved the PDF's printed `Hypothesis 4` reference in the mediator-variable paragraph even though the described mediation corresponds to Hypothesis 3; no silent substantive correction was made.

## Structure

- The site adds semantic `Abstract` and `Key Words` headings around the printed front matter. The PDF itself has no standalone Abstract heading; instead it uses the inline labels Background, Method, Results, Conclusion, and Implications.
- The printed main hierarchy is retained as Background; Previous Research; Theoretical Background and Hypotheses; Method; Data and Sample; Measures; Models; Results; Conclusion and Discussion; Note; and References.
- The four italic run-in labels under Measures (Dependent, Independent, Mediator, and Control variables) are represented as level-4 headings for navigation. This is a structural normalization only; their paragraph text remains unchanged.
- All six printed hypotheses are retained in their original prose and the discussion preserves the authors' evaluation: H1 and H2 supported, H3 most clearly supported for face-to-face contact, H4 corroborated, H5 unsupported, and H6 supported.

## Tables and figures

- Rendered and visually inspected all 16 PDF pages at 144 dpi and compared them with the positioned text extraction.
- Extracted Tables 1–4 and Figures 1–2 as six exact raster crops. Table 1 alone was rotated 90 degrees clockwise after cropping because its source table is printed sideways; the page header was not rotated or included.
- Verified every crop at original resolution, including titles, axes, legends, notes, model labels, signs, significance marks, sample sizes, and table borders.
- Preserved source-specific details: Table 1 describes `Years after second parent's death` using the printed phrase `years after first parent's death`; its phone-contact superscript `a` has no corresponding note; Table 3 contains `−0.064∼`; and some Table 4 sample counts are printed without thousands separators.
- Figure 2's extracted text layer contains a hidden duplicate `8` glyph at the same coordinates as the visible `6` tick. The visually printed x-axis ends at year 7, so the accessibility description follows the visible figure and does not introduce the stray glyph.
- Stored reproducible crop coordinates in `figure_crops.json`. The six assets can be regenerated with:

  `python scripts/crop_page_regions.py --spec content/readings/kalmijn-leopold-2019/figure_crops.json --input-dir tmp/pdfs/kalmijn-leopold-2019-qa --output-dir content/readings/kalmijn-leopold-2019/figures`

## Reproducibility and verification

- `scripts/reconstruct_kalmijn_source.py` rebuilds `full.md` from `tmp/pdf_blocks/kalmijn-leopold-2019.json` and asserts all 52 references, first and last reference sentinels, all six hypotheses, key sample/reliability/causal-caution sentinels, six visual assets, and the absence of STT or other non-source material.
- `tmp/source_segment_plans/kalmijn-leopold-2019.json` deterministically maps all 123 parsed source blocks exactly once into 22 meaning-based segments. `source_segments.json` contains 8,669 source words and no unassigned or duplicate block.
- The reconstructed `full.md` contains 8,799 whitespace-delimited words, 117 prose/reference paragraphs, 52 references, and six direct image embeds.
- Re-running source reconstruction, segment generation, and all six crops produced byte-identical files. SHA-256 hashes are `E8F268E0CB902522956AFEC9BE667876E7EDDD5934E3125B61B610B206452890` for `full.md` and `2DD54B97BA184A1044E5BBF8DD208C1BE6D0F96E06873E915075006B79BEB285` for `source_segments.json`.
- The source PDF SHA-256 is `C6FBB147FF8D3DF294B6E8A891A2C6F80456CD2DCF7B50102605F98BB68BBD86`.
- `node scripts/validate_content.js --slug kalmijn-leopold-2019 --source-only --json` reports `full: schema_pass` and Stage 1 `manual_review_required`. Its sole full-text warning is a known line-label heuristic: source paragraphs beginning with `Table 1`, `Figure 1`, and `In Table 4` are counted in addition to the six matching direct image inserts.
- An independent 16-page audit checked the metadata, structured abstract, hierarchy, H1–H6, samples and models, all major coefficients and significance marks, discussion and limitations, all six crops, and the 52-entry reference sequence from Bengtson and Roberts through Wortman et al.
- Only the assigned PDF and static source assets were used. No private transcript, STT output, or unpublished course material entered the reconstruction.

## Review status

- Source reconstruction, deterministic regeneration, source-only schema validation, and independent page-by-page cross-audit are complete. Manual approval, manifest changes, public-site builds, and commits were not performed.
