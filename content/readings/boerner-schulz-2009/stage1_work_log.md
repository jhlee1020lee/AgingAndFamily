# Stage 1 Work Log - boerner-schulz-2009

## Source reconstruction

- Reconstructed the complete four-page article (printed pp. 10–13) from positioned PDF blocks while comparing every page with the 144-dpi render.
- Preserved the title, both authors and professional affiliations, publication/DOI/copyright information, complete funding note, abstract, keywords, all substantive prose, the eight-item symptom list, and all 11 references.
- Excluded only running heads, page numbers, production timestamps, decorative rules, and the two author portraits. The portraits communicate no study result; the adjacent author biographies are preserved as searchable text.
- Restored the initial drop-cap `M` in `Most deaths`, column and page continuations, and extraction-only line breaks in `post-traumatic` and `DSM-V`. Source-specific forms such as `eg.`, `et al`, British spellings, `10−20%`, and `psychosocial−behavioural` remain unchanged.

## Structure and reading order

- Retained Abstract, Keywords, Introduction, Caregiving and bereavement, Complicated grief, Who is at risk for complicated grief?, What can be done?, and References as level-2 site sections.
- The source page has no printed heading above its reference list; `References` is added only as a transparent structural label required for navigation.
- Rejoined the three theoretical perspectives across the first two columns/pages, the risk discussion across pp. 11–12, the practice discussion across pp. 12–13, and the Hebert et al. (2006) reference across the final-page columns.
- Preserved all eight numbered complicated-grief symptoms and the accompanying four-of-eight, six-month-duration, severity, and functional-impairment conditions.

## Evidence sentinels and references

- Verified the central prevalence values: approximately 10−20% with persistent high stress/psychiatric problems, 30% at risk for clinical depression one year after death, and 20% with complicated grief in the cited dementia-caregiver work.
- Preserved the article's central cautions that positive and negative caregiving experiences can coexist, apparently positive caregiving can still precede difficult bereavement, and preparedness has emotional, pragmatic, and informational components.
- Verified 11 references in printed order, from Gross (2007) through Zhang, El-Jawahri, and Prigerson (2006), including all cross-column continuations and printed page ranges.

## Reproducibility and validation

- `scripts/reconstruct_boerner_source.py` deterministically rebuilds `full.md` from `tmp/pdf_blocks/boerner-schulz-2009.json`, checks page count, required evidence sentinels, reference count, and prohibited chatbot/STT/transcript markers.
- `tmp/source_segment_plans/boerner-schulz-2009.json` maps all 34 parsed Markdown source blocks exactly once into nine meaning-based segments. `source_segments.json` contains 2,384 source words.
- The reconstructed `full.md` contains 2,422 whitespace-delimited words, eight level-2 sections, 30 validator paragraphs, eight numbered symptoms, no substantive raster assets, and 11 reference paragraphs.
- SHA-256 hashes are `A8B035CAD8729B654153FAAF64B1F1340C58B585A7B9687DBE6B127A4B5C5923` for `full.md`, `9E7D19E971E7FC4E58A2B3D7A34FB1677523AB81151139817E76233A0F5058CC` for `source_segments.json`, and `C1B679F61A5D2FB724EEFC1C97BDF914AAA0B17CA1D60B277D919939DEBD09CE` for the source PDF.
- Source-only schema validation and the isolated draft-preview link/private-path/chatbot check pass. The isolated preview was regenerated after restoring the exact funding wording (`was in part supported` and `the NSF`). No public-site build or commit was performed as part of the Stage 1 review.

## Review status

- Root reconstruction and page-by-page visual comparison are complete. An independent four-page source audit passed with zero remaining findings after the funding-note correction; Stage 1 is ready for manual approval.
