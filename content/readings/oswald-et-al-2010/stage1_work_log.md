# Stage 1 Work Log - oswald-et-al-2010

## Source reconstruction

- Reconstructed the complete 13-page article (printed pp. 238–250) from the positioned PDF blocks while checking every page against the 144-dpi render and the layout-preserving text extraction.
- Preserved the printed title, all four authors and affiliations, correspondence, received/accepted dates, decision editor, journal/DOI and publication information, structured abstract, key words, complete article hierarchy, substantive prose, conclusions, and all 51 references.
- Excluded running journal/volume heads and printed page numbers. The full text records both the 2010 copyright/Advance Access date and the printed 2011 issue date rather than silently collapsing the two publication-year signals.
- Restored extraction-only ligature and word-break defects such as `specific`, `findings`, `reflect`, `nonresponders`, `multicollinearity`, `coinhabitants`, `chi-square (χ²)`, `Norris-Baker`, and `observer-based`. Preserved source-specific wording and grammar, including `sociophysical`, `age differential`, `independent positively related`, `multi item measures`, and the causal-sounding phrases printed by the authors.
- Normalized spacing around citations, punctuation, mathematical signs, and ranges while retaining meaningful source compounds and dashes, including `young–old`, `old–old`, `person–environment`, `p-e`, `age-group`, `health-related`, and `cross-sectional`.

## Structure and reading order

- Retained Abstract; Key Words; Introduction; Research Aims; Methods; Results; Discussion; Limitations; Conclusions; and References as level-2 site sections.
- Retained Participants, Concepts and Related Measures, Analytic Procedure, the three Results subsections, and the five printed measure labels as nested headings for navigation.
- Joined all prose continuations across columns and pages. Floating tables are placed beside their first substantive discussion point in the reconstructed reading flow so that no prose paragraph is interrupted by a raster asset.
- Preserved all four explicitly signposted limitations: abbreviated/self-report environmental measurement and limited construct selection; the single-item life-satisfaction measure; the urban community-dwelling sample; and the cross-sectional design/causal limitation.

## Tables

- Used the four previously prepared and visually verified assets: `table-1-part-1.png`, `table-1-part-2.png`, `table-2.png`, and `table-3.png`.
- Table 1 is represented by two exact crops from PDF pp. 242–243; Table 2 by its exact crop from p. 244; and Table 3 by its exact crop from p. 246. OCR table cells were not duplicated as prose.
- Accessibility descriptions preserve the table scope and central sentinels without replacing the raster source: Table 1 total/age-group samples are 381/226/155; Table 3 analytic samples are 345/207/138, total R² values are .29/.27/.39, ADL unique contributions are .10/.08/.12, and neighborhood-block contributions are .08/.05/.11.
- Crop regeneration command:

  `python scripts/crop_page_regions.py --spec content/readings/oswald-et-al-2010/figure_crops.json --input-dir tmp/pdfs/oswald-et-al-2010-qa --output-dir content/readings/oswald-et-al-2010/figures`

## References

- Parsed references from PDF p. 249 right-column lines at y = 446–730 with baseline x ≈ 314.9, followed by p. 250 left-column lines at baseline x ≈ 42.0 and right-column lines at baseline x ≈ 298.3.
- The first four lines at the top of the p. 250 right column are correctly joined to the Oswald, Wahl, Naumann, Mollenkopf, and Hieber (2006) item begun at the bottom of the left column.
- Verified 51 entries in order, from Abbott et al. (2009) through Wight et al. (2009), while preserving printed anomalies and forms rather than modernizing them (for example, `Cochran Review`, `The Cochran Library`, and Sampson et al.'s page range `918–24`).

## Reproducibility and validation

- `scripts/reconstruct_oswald_source.py` deterministically rebuilds `full.md` from `tmp/pdf_blocks/oswald-et-al-2010.json`, parses and checks all references, verifies required numerical and limitation sentinels, verifies the four expected table assets in order, and rejects chatbot/STT/private-material markers.
- `tmp/source_segment_plans/oswald-et-al-2010.json` maps all 104 parsed Markdown source blocks exactly once into 20 meaning-based segments. `source_segments.json` contains 7,865 source words with no unassigned or duplicate block.
- The reconstructed `full.md` contains 7,985 whitespace-delimited words, 98 prose/metadata/reference paragraphs, 51 reference paragraphs, four direct image embeds, 10 level-2 sections, six level-3 subsections, and five level-4 measure headings.
- Re-running reconstruction and source-segment generation produced byte-identical output. SHA-256 hashes are `831BAC0C53D1392D20892FD632BE60D870AFB326CB165AA3E9C7611FFB8C5E21` for `full.md` and `A19733AC20662A94DCC57FE1F53CC4291C0DFD943080177F2782E61C5B3F370B` for `source_segments.json`.
- The source PDF SHA-256 is `F987EFDAE70F222E1F5DD83DCABE0CD87A4A2F7565DD00C1BC2CC5E5627B03B4`.
- `node scripts/validate_content.js --slug oswald-et-al-2010 --source-only --json` reports `full: schema_pass`, with Stage 1 left at the expected `manual_review_required` state because no approval was performed.
- No transcript, STT output, chatbot material, or private course information was used. No manifest activation, public-site build, approval, or commit was performed.

## Remaining source-bound uncertainty

- The PDF presents copyright and Advance Access in 2010 but identifies the bound issue as Vol. 51, No. 2, 2011. The reconstruction exposes both facts; it does not attempt to resolve the repository's citation-year convention.
- Exact table cells remain raster content by design. Selected key values are repeated only in accessibility descriptions and reconstruction assertions; all other table values and notes should be read from the verified crops.

## Review status

- Source reconstruction, page-by-page visual comparison, deterministic regeneration, complete block mapping, reference-column audit, and source-only schema validation are complete. Manual approval and downstream stages were not performed.
