# Stage 1 Work Log - levy-2009

## Source

- Authoritative PDF: `source_pdfs/2 Levy, 2009.pdf`
- Extracted comparison text: `raw.txt` (PyMuPDF)
- PDF metadata: 5 pages, Current Directions in Psychological Science, 18(6), 332-336

## Pass 1 - Front and opening argument

- Checked title, subtitle, author, affiliation, abstract, opening problem, targeter-to-target shift, Ohio longitudinal findings, and four theoretical components against pages 332-333.
- Restored words broken by column extraction and typographic ligatures without changing wording.

## Pass 2 - Four components and figures

- Checked internalization, unconscious operation, self-relevance, and psychological/behavioral/physiological pathways in article order.
- Cropped Figure 1 from page 333 and Figure 2 from page 335; captions remain as searchable text in `full.md`.
- Preserved all reported sample sizes, follow-up periods, effect directions, and cautionary wording.

## Pass 3 - Back matter

- Checked Future Directions, all three Recommended Reading entries, Acknowledgments, and the complete References list on pages 335-336.
- Preserved the source's unresolved page placeholder in the Rothermund reference (`pp. ??-??`) rather than silently repairing it.

## Segment QA

- Created 16 meaning-based source segments with stable IDs.
- Compared the full first and last sentences of every segment with the rendered PDF.
- Verified coverage of abstract, all four theoretical components, both figure captions, future directions, recommended reading, acknowledgments, and references.
- Automated strict alignment is recorded separately in `alignment_report.md`.

## Manual review status

- Stage 1 is ready for a human source check but is not manually approved in `meta.json`.
