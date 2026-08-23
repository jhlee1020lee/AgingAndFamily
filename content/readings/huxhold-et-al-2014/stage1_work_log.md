# Stage 1 Work Log - huxhold-et-al-2014

## Source reconstruction

- Reconstructed the complete 10-page article from positioned PDF blocks while preserving the two-column reading order and all cross-column or cross-page sentence continuations.
- Retained article metadata, the structured abstract and keywords, every substantive section, all three printed hypotheses, funding and correspondence statements, and 53 references.
- Excluded running heads and printed page numbers while retaining the publisher, receipt, acceptance, and decision-editor metadata attached to the article.
- Corrected the extracted author metadata from `Marcel Miche` to the PDF's `Martina Miche` in both the manifest and reading metadata.

## Figures and table

- Rendered and visually inspected all 10 PDF pages at 150 dpi.
- Extracted Figure 1, Figure 2, and the sideways Table 1 as exact raster crops; Table 1 was rotated clockwise for legible landscape display without altering its content.
- Preserved the printed captions and notes and added concise accessibility descriptions. Exact Table 1 coefficients remain visible in the source crop rather than being approximated in prose.
- Stored the reproducible crop coordinates in `figure_crops.json`; `scripts/crop_page_regions.py` can regenerate all three assets from the rendered page PNGs.

## Structure and verification

- Repaired extraction-only line-wrap artifacts while preserving substantive hyphenated forms such as `well-being`, `middle-aged`, `age-related`, `follow-up`, and `cross-sectional`.
- Reconstructed 22 meaning-based source segments covering all 111 parsed source blocks exactly once, including the 53-entry reference list.
- Retained all reported sample sizes, wave years, scale ranges, reliability coefficients, fit statistics, path coefficients, hypothesis wording, causal cautions, and stated limitations for independent PDF comparison.
- Only the assigned PDF and static source assets were used; no private transcript, STT content, or unpublished course material entered the reconstruction.

## Independent audit and review status

- An independent page-by-page audit checked all 10 PDF pages, the two-column reading order, cross-page continuations, article metadata, hypotheses, statistics, figures, the table, and all 53 references.
- Audit corrections removed two extraction spaces (`1999.tb00187.x`, `528–547`), prevented duplicated inline group labels, and restored the printed `Accepted` capitalization and `e-mail:` punctuation.
- The reproducible output contains 7,302 whitespace-delimited words. Re-running the reconstruction produced the audited `full.md` byte-for-byte (SHA-256 `e56d1a69faf5bc30ad21dc6b7ac7ad71a48ae56c1dda939dfb4ea48495fd5f5b`).
- All 111 source blocks map exactly once to 22 unique segments. Source-only schema validation passed with no errors or warnings, and the independent auditor marked Stage 1 ready for manual approval.
