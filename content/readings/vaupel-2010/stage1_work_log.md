# Stage 1 Work Log - Vaupel (2010)

## Source and scope

- Canonical PDF: `source_pdfs/3 Vaupel, 2010.pdf`
- Article: James W. Vaupel, “Biodemography of human ageing,” *Nature* 464, 536–542 (2010), doi:10.1038/nature08984
- PDF extent: 7 pages, printed pp. 536–542
- Layout: two-column *Nature* Review/Insight article with full-width opening matter, a full-width boxed feature, four numbered figures, and a two-column reference list
- Included in `full.md`: title, author and affiliations, complete standfirst, opening overview, all named body sections, Box 1 and its complete narrative, four complete figure captions, all 100 references and six publisher-supplied annotated-reference notes, acknowledgements, and author information
- No table, standalone footnote section, or supplementary appendix appears in the PDF.

## Pass 1 - visual order audit

- Rendered all 7 pages with Poppler at 144 dpi and inspected every page against the extracted text.
- Page 536 begins with a full-width title, author line, affiliations, and standfirst; the body then switches to two columns, with the first named section continuing from the lower left into the right column.
- Page 537 places Figures 1 and 2 above the continuing two-column body. Their chart labels and complete captions were checked visually.
- Page 538 is a continuous two-column body page. The page break in the health–survival discussion and the transition to “Delay not deceleration” were restored in reading order.
- Page 539 places Box 1 across the full width above the two-column body. The left and right graph explanations were kept in semantic left-to-right order before the article resumes below the box.
- Page 540 places Figures 3 and 4 at the top and continues the body below them. The final sentence of the figure-introducing paragraph crosses from the left to right column and was reconstructed before both captions.
- Page 541 ends the “Perspectives” section in the left column and begins references 1–16 below it; references 17–59 occupy the right column. Page 542 continues references 60–100 from left to right, followed by acknowledgements and author information.

## Pass 2 - cleanup and reconstruction

- Removed running heads, printed page numbers, chart-axis OCR fragments, copyright boilerplate, and extraction-only line-wrap hyphenation while retaining the original wording, punctuation, numbers, and numeric citation order.
- Restored Markdown hierarchy for the standfirst, six named body sections, Box 1, references, acknowledgements, and author information.
- Cropped the five source visuals at 216 dpi into `figures/figure-1.png` through `figures/figure-4.png` and `figures/box-1.png`. Each crop was visually inspected for complete axes, legends, labels, and absence of adjacent body text.
- Preserved all figure captions as searchable text immediately beside their corresponding image assets.
- Preserved the six explanatory notes attached by the journal to references 1, 14, 23, 28, 37, and 62.

## Pass 3 - segmentation and source QA

- Created 19 stable meaning units in `source_segments.json`.
- Eighteen segments contain 300–700 words. `ABS-001` is a deliberate 101-word exception because it preserves the complete standfirst as one self-contained unit.
- Assigned all 156 article-source blocks parsed from `full.md` in order. The only two unassigned front-matter blocks are the citation metadata and affiliations, which remain available in `full.md` but are not translation units.
- Preserved the complete reference list across `REFERENCES-001` through `REFERENCES-004`; the final unit also preserves acknowledgements and author information.
- Recomputed word and character counts from the saved segment text and marked Nature-style numeric citations, numeric claims, and figure/box references for later alignment checks.

## Validation results

- `node scripts/validate_content.js --slug vaupel-2010 --source-only --json`
  - `full`: `schema_pass`
  - Full-text metrics: 8,556 words, 10 level-2 sections, 1 level-3 Box section, 5 image inserts, 5 matching figure/box labels, 156 source paragraphs
  - Stage 1: `manual_review_required`, as expected because independent approval has not been recorded
  - Stage 2 and Stage 3: `partial` only because their files were intentionally not created in this task
- Stage 1 custom QA:
  - section order and Box 1 placement: pass
  - 100 references numbered consecutively and six annotated-reference notes: pass
  - five linked visual assets and four numbered captions plus Box 1: pass
  - 19 unique segments, saved word/character counts, and 300–700-word rule with one documented standfirst exception: pass
  - ordered source coverage excluding only citation metadata and affiliations: pass
  - independent normalized-text comparison matched all 130 substantive PDF blocks for title, standfirst, body, captions, Box 1, references, acknowledgements, and author information; the sole remaining long PDF block was the affiliation block because its superscript affiliation markers were intentionally flattened, while every affiliation name and address remains present
  - numeric anchors (including 2.5 years per decade, 50% annual mortality at validated ages 110–114, expected age 118, and German work-hour values 16.3 and 14.9), acknowledgements, and author information: pass

## Manual observations

- This is a synthetic review rather than a report of one new sample or model. Its empirical backbone is historical mortality, centenarian, health/disability, and labour-force evidence drawn from cited studies and public databases.
- Figures 1–4 are evidentiary displays; Box 1 is a conceptual demonstration of how population heterogeneity can produce aggregate mortality patterns unlike those of the component subpopulations.
- Approval has not been recorded. Stage 1 is ready for independent source comparison and manual review; no translation, alignment, summary, quiz, or other Stage 2/3 artifact was created.
