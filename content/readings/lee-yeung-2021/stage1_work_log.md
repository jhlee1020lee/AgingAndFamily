# Stage 1 Work Log - lee-yeung-2021

## Source reconstruction

- Reconstructed the complete 14-page article (printed pp. 642–655) from the positioned PDF blocks while checking every page against the original-resolution QA render and the layout-preserving extraction.
- Preserved the full title; both authors and all five affiliations; correspondence, received and editorial-decision dates, decision editor, journal citation, DOI, Advance Access date, and copyright; the structured Abstract; Keywords; all body sections; Supplementary Material; Funding; Conflict of Interest; and all 56 references.
- Excluded the journal running heads, printed page numbers, and the vertical Oxford Academic download watermark and its user/date string.
- Rejoined the two-column and cross-page prose in visual reading order. The reconstruction retains all six hypotheses, the 2006–2016 KLoSA design, the gender-stratified reentry/exit findings, the two printed statistical equations, and the Discussion's stated limitations and policy implications.

## Extraction normalization

- Restored extraction-only ligatures and nonbreaking-space artifacts, collapsed layout spacing, and removed discretionary line-wrap hyphens without rewriting the authors' claims.
- Retained genuine compounds encountered at line breaks (`discrete-time`, `Lewin-Epstein`, `self-employed`, `Socio-economic`, `time-squeeze`, and `work-retirement`) and source compounds already intact in a line.
- Corrected the extraction-only `lifetime earrings` error to the visually verified `lifetime earnings`. Restored odds-ratio exponent structure as `e^(−0.11)`, `e^(−0.39)`, `e^(−0.02)`, and `e^(−0.03)` rather than accepting the flattened extraction.
- Repaired only extraction-induced DOI/URL continuity and spacing defects, including the Dingemans and Möhring, Lee (2011), Lee (2018), and OECD (2013) entries. Slash-ended URLs, DOI components, and en-dash-ended page ranges were joined without inserting spaces.
- Preserved printed source-specific forms rather than silently modernizing them, including `un-employment`, `un-unionized`, `experiences.Net`, the missing terminal period after `social burdens`, `Hank, K., & Julie, M. K`, and `Steele, F.(2011)`.

## Equations, figures, and tables

- Transcribed both multilevel discrete-time equations with their `a`/`b`, individual (`i`), and wave (`t`) superscript/subscript distinctions and preserved the following paragraph's definitions and linked-random-effects statement.
- Reused the four already prepared and visually verified source crops: `table-1.png`, `table-2.png`, `table-3.png`, and `table-4.png`. OCR table blocks were not duplicated as prose.
- Table 1's accessibility description preserves women's labor-status-change proportions `.20/.16/.25` and person-years `10,414/6,528/3,886`; Table 2 preserves men's `.14/.13/.16` and `16,106/12,301/3,805`.
- Table 3 remains an exact crop containing all women’s Model 1–3 reentry/exit coefficients, standard errors, significance marks, reference categories, controls, and notes; the accessibility description records the random-effect correlation `.49`. Table 4 does the same for men and records `.44`.
- Crop regeneration command (not rerun because the supplied crops and `figure_crops.json` had already passed full visual review):

  `python scripts/crop_page_regions.py --spec content/readings/lee-yeung-2021/figure_crops.json --input-dir tmp/pdfs/lee-yeung-2021-qa --output-dir content/readings/lee-yeung-2021/figures`

## Numerical and scope checks

- Verified that KLoSA began in 2006 and followed respondents through 2016; the baseline restriction was ages 50–64, the 2016 range was 60–74, and people with no lifetime paid-work experience were excluded (`n = 1,295`).
- Preserved 14.3% as the missing-labor-status exclusion threshold, mortality as about 14% of observation loss, the final `n = 2,600` (`1,579` men and `1,021` women), `26,520` person-years, and the reported 29% continued-work and 36% reentry descriptions.
- Preserved all interaction coefficients and uncertainty levels, including self-employment-by-gender `−0.02, p < .001`, tenure-by-gender `−0.03, p < .05`, marital dissolution `−0.38, p < .01`, coresidence `−0.28, p < .01`, and upward transfer `0.44, p < .05`.
- Verified the women-specific 39% lower exit odds for nonpartnered women, 42% higher exit odds with unmarried-child coresidence, and random-effect correlation `ρ = 0.49`; and the men-specific approximately 22% lower exit odds with an employed spouse and `ρ = 0.44`.
- Kept the article's association and interpretation language at its printed strength; the reconstruction does not convert model associations, hypothesized pathways, or selection interpretations into causal claims.

## References

- Parsed references from PDF p. 653 left at y approximately 710–735, then p. 653 right and pp. 654–655 left/right at baselines x approximately 54.6/306.6, excluding the vertical watermark at x approximately 571.3.
- Verified 56 entries in natural order from Aaron and Jean (2011) through Yoon (2013). The top of p. 653 right completes Aaron from the left column, and the top of p. 654 left completes Higgs from the bottom of p. 653 right.
- Visually compared the long URLs/DOIs and the bottom-of-column references on all three reference pages; no reference paragraph is duplicated or split into a separate entry.

## Reproducibility and validation

- `scripts/reconstruct_lee_yeung_source.py` deterministically rebuilds `full.md` from `tmp/pdf_blocks/lee-yeung-2021.json`, checks reference-column baselines and reference sentinels/count, verifies required sample/result sentinels, verifies all four table assets in order, and rejects watermark, chatbot, STT, transcript, and private-material markers.
- `tmp/source_segment_plans/lee-yeung-2021.json` maps all 126 parsed Markdown source blocks exactly once into 23 meaning-based segments. `source_segments.json` contains 9,127 segment words with no unassigned or duplicated block; its reference segment contains all 56 references.
- The reconstructed `full.md` contains 9,232 whitespace-delimited words, 117 metadata/prose/reference paragraphs, 56 reference paragraphs, four direct image embeds, and 16 level-2 sections.
- Re-running both reconstruction and source-segment generation produced byte-identical output. SHA-256 hashes are `C6AFD7958023761929D490412BFFA816AA5F78912FF289E619FD73EE12ED6323` for `full.md` and `EB55F4133229F92E4626357260EF93F5F66A8E7AB4BE8BC2E31373FF0ACAFC4B` for `source_segments.json`.
- The source PDF SHA-256 is `7C65CFE6421CA53E0421B886B0F2A48C3D9A8D2E223DCC15AD33D5E3EDE98052`; the positioned-block JSON SHA-256 is `BC34C824182A6394AF3053B82A42BB54D658C9611E1729CA7BA3AAE25B658F2F`.
- `node scripts/validate_content.js --slug lee-yeung-2021 --source-only --json` reports `full: schema_pass`; Stage 1 remains at the expected `manual_review_required` state because no approval was performed. Its sole full-text warning is a label-count heuristic: four direct table images are present while seven lines begin with table captions or prose references; it does not indicate a missing asset.
- `node scripts/build_site.js --preview-locked --preview-draft --slug lee-yeung-2021 --output-dir tmp/lee-yeung-stage1-preview` built an isolated draft preview. A read-only scan checked 141 local `href`/`src` targets with zero broken targets, and the source artifacts plus isolated preview had zero chatbot/STT/transcript/private-data/watermark hits.
- No manifest/meta activation, manual approval, or commit was performed.

## Process incident affecting public docs

- Before the isolated preview command, `node scripts/build_site.js --help` was run to inspect options. This script does not implement a help mode and unexpectedly performed its default public `docs` build. The parent agent was notified immediately.
- Per the parent agent's explicit direction, no public `docs` file was deleted, restored, or otherwise touched afterward because the worktree contained concurrent changes whose ownership could not safely be separated. The observed post-command status consisted of four modified tracked pages (`docs/index.html`, Levy MCQ, Settersten MCQ, and Settersten translation) plus multiple untracked reading/asset directories, including Lee; this log does not attribute preexisting versus newly emitted files without a before-snapshot.

## Remaining source-bound uncertainty

- The PDF prints several grammatical, punctuation, and bibliographic anomalies noted above. They are retained as source evidence rather than corrected, even where a modernized form would read more naturally.
- Table cells remain raster content by design. Key values and model scope are repeated in accessibility descriptions and reconstruction assertions, while every coefficient, standard error, significance marker, category label, and table note remains available in the four verified crops.
- Markdown cannot reproduce every typographic detail of the typeset equations (especially italic mathematical glyph styling), but the variables, indices, operators, and `a`/`b` equation distinction are preserved.

## Review status

- Source reconstruction, 14-page visual comparison, two-column/page-continuation audit, deterministic regeneration, complete block mapping, reference-column audit, isolated preview/link/privacy checks, and source-only schema validation are complete. Manual approval and downstream stages were not performed.
