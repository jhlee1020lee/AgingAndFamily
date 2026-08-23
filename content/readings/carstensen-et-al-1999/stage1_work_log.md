# Stage 1 Work Log - carstensen-et-al-1999

## Source reconstruction

- Reconstructed the complete 17-page article from positioned PDF blocks while preserving the two-column reading order.
- Retained the abstract, article/editor/author notes, epigraph, all substantive sections, three footnotes, two figures, and 116 references.
- Excluded running heads, page numbers, copyright overlays, and unrelated publisher navigation text.
- Kept the source's printed `principle age differences` wording rather than silently correcting the article's apparent typo.

## Figures

- Rendered and inspected all 17 PDF pages at 150 dpi.
- Preserved Figure 1 and Figure 2 as full-panel crops, including titles, axes, plotted values, error bars, notes, and source credits.
- Recorded reproducible crop coordinates in `figure_crops.json`: 516×504 pixels for Figure 1 and 516×764 pixels for Figure 2.
- Marked editor-added descriptions of the plotted trajectories and values explicitly as accessibility descriptions, separate from the printed captions.

## Independent audit corrections

- Restored the comma in `here and now, a valuable commodity` while retaining the period in the earlier `focus on the here and now.` sentence.
- Corrected the extraction artifacts `Our.observational`, `Brandtstadter`, `Lifecourse`, and the Lindenberger–Baltes volume/page string.
- Moved Footnote 3 to the theoretical-development section where its marker and printed note occur, and preserved the source's double quotation marks around `time`.
- Normalized three em-dash extraction artifacts in numeric page ranges to en dashes.
- Corrected the source-location metadata for the Hong Kong subsection and regenerated all 22 source segments.

## Verification

- Independent audit covered 17/17 rendered pages, reading order, headings, all numeric anchors, names and citations, both figures, all three footnotes, and all 116 references.
- Source validator passes with 15,015 words, 6 level-2 sections, 11 level-3 sections, 2 level-4 sections, 2 figures, and 207 paragraphs.
- `source_segments.json` contains 22 unique segments and assigns all 216 source blocks exactly once.
- No chatbot, private transcript, STT content, or unpublished course material was used.
