# Stage 1 Work Log - underwood-2014

## Source

- Authoritative PDF: `source_pdfs/4 Underwood, 2014.pdf`
- Extracted comparison text: `raw.txt` (PyMuPDF)
- PDF metadata: 4 pages, *Science*, 346(6209), 568-571
- Article type: reported science feature; the source has no abstract, formal methods section, acknowledgments, or reference list.

## Pass 1 - Layout and reading order

- Rendered and visually inspected all four pages at 170 dpi.
- Reconstructed the three-column reading order across page breaks and kept the two source section leads, `LIKE MANY COUNTRIES` and `THIS SPRING, WHEN DEARY SPOKE`, in their original positions.
- Removed recurring journal headers, footers, page numbers, production credits, and the publication strap while retaining the title, deck, byline, article body, callouts, figure captions, and study-comparison sidebar.

## Pass 2 - Main argument and quantitative anchors

- Checked the Scottish Mental Surveys chronology (1932 and 1947), sample and attendance counts, ages, follow-up intervals, and cohort design against pages 568-570.
- Preserved the distinction between childhood IQ explaining about 50% of later-life IQ variance and the remaining variation associated with other genetic and environmental factors.
- Preserved the article's confounding argument: several apparent benefits disappeared after childhood intelligence was controlled, but the article explicitly rejects the claim that later-life cognition is fully predetermined.

## Pass 3 - Visuals, sidebars, and final section

- Cropped and inspected the `The great divergence` plot and white-matter tract image; their captions remain searchable text in `full.md`.
- Preserved all four entries in the `Tracking healthy aging` sidebar, including dates, sample sizes, and the source's `(above)` image reference.
- Checked the late-life test results, diffusion tensor imaging result, hyperintensity and cortical-thickness cautions, water-tank hypothesis, ENIGMA consortium details, and Sheila McGowan conclusion against pages 570-571.

## Segment QA

- Created 8 meaning-based source segments with stable IDs; 7 are within the preferred 300-700-word range and the shorter sidebar is deliberately kept intact as one unit.
- Verified that every substantive PyMuPDF text block of 15 words or more is represented in `full.md`; the only unmatched extraction blocks were two page-568 fragments split by a drop cap or column boundary (`O` + `n`, and the end of `schooling`). Both are present as complete words in the reconstructed article.
- Confirmed that the segment plan assigns every non-metadata Markdown block exactly once, with no gaps or overlaps.

## Manual review status

- Stage 1 was manually checked against the latest page render and is ready for staged approval of `full`.
