# Stage 1 Work Log - lin-et-al-2018

## Source reconstruction

- Reconstructed the complete 10-page article from positioned PDF lines while preserving the two-column reading order, paragraph indents, section hierarchy, and all cross-column and cross-page continuations.
- Retained the structured abstract, keywords, study rationale, life-course framework, HRS sample construction, measures, event-history equation and definitions, results, discussion, limitations, funding, and 36 references.
- Excluded journal running heads and printed page numbers while retaining article metadata, correspondence, receipt and editorial-decision dates, DOI, advance-publication date, and publisher notice.

## Figures and tables

- Rendered and visually inspected all 10 PDF pages at 150 dpi.
- Extracted Figure 1 and Tables 1–2 as exact raster crops with full labels, values, notes, and significance markers.
- Added concise accessibility descriptions while keeping exact graphical curves, baseline statistics, odds ratios, reference categories, and model-fit statistics visible in the source crops.
- Stored reproducible crop coordinates in `figure_crops.json`; `scripts/crop_page_regions.py` regenerates all three assets.

## Structure and verification

- Repaired extraction-only column and line-wrap artifacts while preserving substantive compounds, numeric ranges, source-side wording, and DOI/URL continuity.
- The reproducible script writes 7,934 whitespace-delimited words and parses all 36 hanging-indent reference entries.
- Twenty-two meaning-based source segments cover all 94 Markdown source blocks exactly once.
- Only the assigned PDF and static source assets were used; no private transcript, STT content, or unpublished course material entered the reconstruction.

## Review status

- Source schema, structural checks, crop reproducibility, and an independent page-by-page audit remain required before manual approval.
