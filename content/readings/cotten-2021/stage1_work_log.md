# Stage 1 Work Log - cotten-2021

## Source reconstruction

- Reconstructed the complete 20-page Chapter 23 (printed pp. 373–392) from positioned PDF blocks while preserving the two-column reading order and every sentence continuation across columns, figure-only pages, and page boundaries.
- Retained the chapter title, author and affiliation, DOI, printed outline, all substantive headings and paragraphs, 132 references, and both entries under Further reading.
- Excluded running heads, section footers, and printed page numbers while retaining substantive chapter metadata.
- Repaired extraction-only line wrapping, the PDF extractor’s range control character, broken DOI and web addresses, and false digit substitutions in `N = 39`, `50+`, and the encoded Doman and Le Roux URL.
- Preserved substantive printed wording and values even where the source itself appears internally surprising, including the printed `81%` autonomous-vehicle willingness figure on p. 387.

## Figures and table

- Rendered and visually inspected all 20 PDF pages at 150 dpi before reconstruction.
- Extracted Figures 23.1–23.5 and Table 23.1 as six exact raster crops without including running heads, footers, or adjacent body text.
- Verified every crop at original resolution: titles, axes, legends, year and percentage labels, notes, source lines, URLs, table cell text, sample figures, and borders are fully visible and legible.
- Preserved the exact Table 23.1 wording and values in the source image rather than approximating them in prose; captions include concise accessibility descriptions for study use.
- Stored all reproducible crop coordinates in `figure_crops.json`. The assets can be regenerated with:

  `python scripts/crop_page_regions.py --spec content/readings/cotten-2021/figure_crops.json --input-dir tmp/pdfs/cotten-2021-qa --output-dir content/readings/cotten-2021/figures`

## Structure and verification

- `scripts/reconstruct_cotten_source.py` reproducibly rebuilds `full.md` from `tmp/pdf_blocks/cotten-2021.json` and asserts all 132 references, their first and last sentinels, and both Further reading entries.
- Reconstructed 22 meaning-based source segments covering all 203 parsed Markdown source blocks exactly once; the reference list is retained as one bibliographic segment, consistent with completed readings in this project.
- `full.md` contains 14,998 whitespace-delimited words, 7 level-2 sections, 12 level-3 subsections, 199 prose/reference paragraphs, and 6 figure/table embeds.
- `source_segments.json` contains 22 segments and 14,817 source words; segment IDs run from `META-001` through `FURTHER-001` with no unassigned or duplicate block.
- A normalized token-coverage audit against every substantive positioned PDF block (excluding the image-only table page and running furniture) found no omitted source tokens; the only comparison differences were the two deliberately repaired URL word-breaks.
- Re-running the reconstruction, segment generation, and all six image crops produced identical SHA-256 hashes for `full.md`, `source_segments.json`, and every figure/table asset.
- `node scripts/validate_content.js --slug cotten-2021 --source-only --json` reports `full: schema_pass` with no errors or warnings and Stage 1 as `manual_review_required`, as expected before independent approval.
- No private transcript, STT material, or unpublished course content was used.

## Independent audit correction

- An independent 20-page audit found one lost author-name hyphen in the body citation `Ragu-Nathan`. The true-hyphen rule now preserves it from the printed `Ragu-` + `Nathan` line wrap, and the source and segment payload were regenerated before approval.

## Review status

- Source reconstruction and local schema checks are complete; independent page-by-page source audit and final manual approval remain required.
