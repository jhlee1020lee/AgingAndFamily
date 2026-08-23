# Stage 1 Work Log - gruenewald-et-al-2016

## Source reconstruction

- Reconstructed the complete 10-page article (printed pp. 661–670) from the positioned PDF blocks while checking all pages against the 144-dpi QA render and layout-preserving extraction.
- Preserved the full printed title; all nine authors and eight affiliations; correspondence, received/accepted dates, decision editor, journal/DOI and Advance Access information; structured abstract; keywords; all article sections; Funding; Acknowledgments; and all 47 references.
- Excluded running journal/volume heads and printed page numbers. Preserved the article copyright line because it is publication metadata rather than a running footer alone.
- Joined all prose continuations across columns and pages in visual reading order. The structured abstract retains Objectives, Method, Results, and Discussion, and the Method hierarchy retains Participants, Materials and Procedure, Perceptions of generative desire and achievement, Sociodemographic and health status covariates, and Analytic strategy.

## Extraction normalization

- Restored extraction-only ligatures and nonbreaking-space artifacts, collapsed layout spacing, and removed discretionary line-wrap hyphens without rewriting the authors' wording or statistical claims.
- Retained genuine compounds encountered at line breaks (`middle-aged`, `self-perceptions`, `well-being`, `non-compliance`, `self-perceived`, and `large-scale`) and source compounds already intact in a line, including `first-ever`, `high-intensity`, `intention-to-treat`, `follow-up`, `dose–response`, and `test-fourth`.
- Preserved the spaced ellipsis in the Erikson epigraph and the Carlson et al. author list. Preserved source-specific forms rather than silently modernizing them, including `AARP Experience Corp.`, the in-text `Destaubin`/`Aubin` citation forms, `Muthen`, and `Mini-Mental State - practical method`.
- Repaired only extraction-induced DOI continuity and spacing defects: Angrist et al. now reads `doi:10.1080/01621459.1996.10476902`, Fried et al. (2013) reads `doi:10.1016/j.cct.2013.05.003`, and Grand et al. (1990) reads `doi:10.1016/0895-4356(90)90237-j`.

## Figures and tables

- Reused the four already prepared and visually verified source assets: `figure-1.png`, `table-1.png`, `table-2.png`, and `table-3.png`. No OCR table cells were duplicated as prose.
- Figure 1's accessibility description records every screened/invited/assessed/randomized branch, the 352/350 allocation, the 284 intervention recipients and 68 postrandomization nonrecipients, and every loss/discontinuation subcategory shown in the flowchart.
- Table 1's description preserves the 702/350/352 analytic columns, age 67.4, and 85% female sentinel. Table 2's description distinguishes its baseline/4-/12-/24-month samples of 701/589/538/532 and preserves the desire means 5.62/5.62/5.56/5.57 with alpha .82 and achievement means 5.18/5.32/5.23/5.30 with alpha .90.
- Table 3 remains an exact image so that every ITT/CACE coefficient, standard error, effect size, significance mark, hour cutpoint, and assumption flag is available without risky OCR duplication. The adjacent source prose retains all four exception models and the authors' dose-response interpretation and caution.
- Crop regeneration command (not rerun because the supplied crops had already passed visual review):

  `python scripts/crop_page_regions.py --spec content/readings/gruenewald-et-al-2016/figure_crops.json --input-dir tmp/pdfs/gruenewald-et-al-2016-qa --output-dir content/readings/gruenewald-et-al-2016/figures`

## Numerical and causal-scope checks

- Verified randomization of 702 participants to EC (`n = 352`) and control (`n = 350`), the 68 intervention-arm participants who did not proceed after randomization, and the 284 participants who complied to some degree.
- Preserved cohort sizes 155/223/156/168; cumulative exposure ranges 26–417, 26–826, and 26–1,589 hr; covariate missingness 1.7%/0.2%/3.9%/0.1%; and completed-evaluation counts 593/558/560 with 84.5%/79.5%/79.8%. These evaluation-completion counts remain distinct from the Table 2 analysis counts 589/538/532.
- Verified the two-factor result (51.2% of item variance), factor correlation `r = .54`, and subscale reliability `α = .82/.90`.
- Preserved all six stated CACE assumptions, the OER and additivity tests, identification constraints, missing-data methods, and conditional causal-estimand language. The results keep the four exact exception cells: generative desire at the 20th percentile/24 months, and generative achievement at the 60th percentile/4 months, 40th percentile/12 months, and 40th percentile/24 months.
- Preserved the distinction between observational associations cited as possible downstream benefits and the randomized trial's demonstrated effect on self-perceptions of generativity.

## References

- Parsed references at the printed baselines: PDF p. 668 right column from y >= 708, then p. 669 left/right and p. 670 left/right at x approximately 54.6/306.6.
- Verified 47 references in natural order from An and Cooney (2006) through Yesavage et al. (1982). The top of p. 669 correctly completes An and Cooney from p. 668; the top of p. 670 left completes McAdams and de St. Aubin (1992) from p. 669 right; and the top of p. 670 right completes Rothrauff and Cooney from p. 670 left.

## Reproducibility and validation

- `scripts/reconstruct_gruenewald_source.py` deterministically rebuilds `full.md` from `tmp/pdf_blocks/gruenewald-et-al-2016.json`, checks coordinate baselines and reference sentinels/count, verifies required numerical and causal-scope sentinels, verifies the four image assets in order, and rejects chatbot/STT/private-material markers.
- `tmp/source_segment_plans/gruenewald-et-al-2016.json` maps all 93 parsed Markdown source blocks exactly once into 24 meaning-based segments. `source_segments.json` contains 7,128 segment words with no unassigned or duplicated block; its reference segment contains all 47 reference paragraphs.
- The reconstructed `full.md` contains 7,247 whitespace-delimited words, 87 metadata/prose/reference paragraphs, 47 reference paragraphs, four direct image embeds, 13 level-2 sections, and five level-3 Method subsections.
- Re-running both reconstruction and source-segment generation produced byte-identical output. SHA-256 hashes are `C29016D7F883CF13D8BB94DD9FAC0565E510061F0B512C15F3A0FAF422BA3D57` for `full.md` and `5FC2709C2E5F864CCBB9B33EBA5148F1AF9BFFBCC0ED2FADA962972B39F1B0F0` for `source_segments.json`.
- The source PDF SHA-256 is `73900DB767026FDA255D545000182EBFE7CB55E581BA5C0C6A0FF09DDFC401DE`.
- `node scripts/validate_content.js --slug gruenewald-et-al-2016 --source-only --json` reports `full: schema_pass`; Stage 1 remains at the expected `manual_review_required` state because no approval was performed. Its sole full-text warning is a label-count heuristic: four direct image inserts are present, while a fifth line begins with the prose phrase `Table 3 details`; this does not indicate a missing asset.
- No transcript, STT output, chatbot material, or private course information was used. No manifest activation, public-site build, approval, or commit was performed.

## Remaining source-bound uncertainty

- Table 3 labels its CACE column as the 60th percentile and the surrounding analytic prose also says 60th, but the printed footnote gives `65th = 501 hr` at 12 months and `65th = 945 hr` at 24 months. The crop and accessibility note expose this inconsistency; no silent correction was made.
- The results paragraph says four models failed the exclusion-restriction/additivity checks, then says the additivity assumption was not met for “these three models.” Both printed statements are retained verbatim rather than reconciled.
- The table cells remain raster content by design. Central values and scope are repeated only in accessibility descriptions and reconstruction assertions; all coefficients and table notes remain available in the verified crops.

## Review status

- Source reconstruction, full page-by-page visual comparison, deterministic regeneration, complete block mapping, reference-column audit, source-only schema validation, and source-bound uncertainty documentation are complete. Manual approval and downstream stages were not performed.
