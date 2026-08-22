# Stage 1 Work Log - Settersten & Godlewski (2016)

## Source and scope

- Canonical PDF: `source_pdfs/2 Settersten and Godlewski, 2016.pdf`
- Supporting extraction: `raw.txt` (PyMuPDF)
- PDF extent: 17 pages, printed pp. 9-25
- Layout: single-column handbook chapter
- Included: chapter title, authors, all body sections and subsections, conclusion, and the complete reference list
- No standalone notes section, table, or figure appears in this chapter.

## Pass 1 - visual order audit

- Rendered all 17 pages with Poppler and checked the opening page, section transitions, conclusion, and final reference pages visually.
- Confirmed that the extracted reading order follows the printed single-column order.
- Confirmed the two top-level strands: age as an individual/group property and age as a dimension of social organization/dynamics.
- Confirmed that references begin on printed p. 21 and end on printed p. 25.

## Pass 2 - cleanup and reconstruction

- Removed running heads, printed page numbers, line-wrap artifacts, and PDF ligatures while retaining original wording and citation order.
- Restored Markdown hierarchy for 2 top-level body sections, 10 named subsections, the conclusion, and references.
- Corrected the extraction-only loss of the hyphen in `Cross-fertilizing` by checking the rendered reference page.
- Separated the Horton et al. (2008) and Keith et al. (1994) references, which the initial line-based extraction had merged at a page-layout boundary.

## Pass 3 - segmentation and source QA

- Created 19 stable meaning units in `source_segments.json`.
- Body segments are normally 300-700 words; `AGE-RIGHTS-001` is 289 words because it is a complete, self-contained subsection.
- Grouped the short opening of the individual-level strand with the proxy discussion in `INDIVIDUAL-001` to avoid a fragmentary segment.
- Preserved all 68 reference entries across `REFERENCES-001` through `REFERENCES-003`.
- Marked number, citation, and chapter-reference flags for automated alignment checks.

## Manual observations

- The PDF title page names the second author as **Bethany Godlewski**. The manifest record was corrected from **Barbara Godlewski** to **Bethany Godlewski** during final integration.
- The chapter is conceptual rather than empirical. It reports illustrative ages and prior-study claims but contains no original sample, statistical model, effect estimate, table, or figure.
- Approval has not been recorded. Stage 1 remains ready for independent source comparison and manual review.
