# Stage 3 English learning materials review

- Date: 2026-09-05
- Reading: Kalmijn and Leopold (2019), `kalmijn-leopold-2019`
- Scope: the three canonical quiz JSON files and `professor_prep.json`.
- Four editors worked on separate files within this reading and stage. The content editor coordinated combined verification.
- Counts: 15 questions per quiz type, 15 discussion cards, and 6 reading-response cards. Existing card IDs, question order, evidence links, and O/X codes were preserved. Internal classification enums remain unchanged; MCQ difficulty labels were converted to easy/medium/hard.
- All four files declare `language: "en"`, and all learner-facing fields are English after the final professor-field completion.

## Evidence review

Each assigned editor directly checked the local English source segments supporting their items. The MCQ editor read all 21 segments outside the references, inspected the retained images of Tables 1, 3, and 4, and checked the completed short-answer set against its evidence. The original PDF is absent, so this review cannot independently establish fidelity to the complete original publication.

- `ABS-001`, `INTRO-001`, `PRIOR-001`, `THEORY-001`: the study distinguishes sibling dyads from their surrounding family network and compares first and second parental deaths over time. The solidarity perspective concerns activation of potentially dormant ties; the kinkeeping perspective concerns activities and positions sustaining cohesion. Prior studies' mixed findings are not treated as this study's estimates.
- `SOLIDARITY-001`, `KINKEEPING-001`: H2 predicts a larger first-death contact increase through occasions to meet or support the surviving parent. H3 concerns mediation through that relationship. H4 concerns contact declining below the predeath level after the second death. H5 and H6 concern short-term and long-term conflict, respectively; predictions remain distinct from findings.
- `SAMPLE-001`: the four-wave Netherlands Kinship Panel Study is an unbalanced panel. The 3,812 respondents comprise 1,211 event cases and 2,601 comparison cases. The expanded data contain 10,367 unique contact dyads and 6,186 conflict dyads before outcome-specific modeling restrictions. These are distinct from respondent and dyad-year counts. Contact was respondent-reported for siblings; conflict was assessed for at most two selected siblings. Unobserved years were not filled with invented annual measurements. Death/interview timing ambiguity and its sensitivity analysis remain a design qualification.
- `OUTCOMES-001`, `COVARIATES-001`: face-to-face contact and the measure called phone contact are separate; the latter includes letters and emails. Seven past-year categories are converted to approximate annual contact days, with never recoded to 1 before logging. Conflict covers three months and is dichotomized. Transition indicators and subsequent duration terms represent different features of change. Age adjustment and the support/contact measures are distinguished.
- `MODELS-001`: fixed effects use changes within units and family-clustered robust standard errors. The first-death models exclude observations after the second death. Conflict is modeled with both linear probability and conditional logit models; the latter omit units without outcome changes. The KHB-compatible within transformation supports statistical mediation analysis but does not establish a causal sequence.
- `CONTACT-FIRST-001`, `MEDIATION-001`, Table 3: first-death contact rises while the other parent survives, with nonsignificant duration coefficients. The authors' approximately 17% interpretation is explicitly identified as an approximation to the .173 log-outcome coefficient. For face-to-face contact, adjustment reduces the transition coefficient from about .17 to .10, with a significant reduction but a remaining positive association. Parent face-to-face contact contributes more clearly than the support index to this outcome. Phone-contact mediation is smaller. The professor explanation uses the log-log coefficient rather than presenting a doubling-to-19% calculation as exact.
- `CONTACT-SECOND-001`, Table 3: the quadratic fitted trajectories show an initial rise and later decline below the predeath reference level, becoming less steep over time. Approximate longer-term values of 30% lower face-to-face and 15% lower phone contact are the authors' model-based interpretations. They do not imply identical changes in all families or that every duration component is independently significant.
- `CONFLICT-001`, `DISCUSSION-001`, Table 4: the initial second-death conflict increase is not statistically significant, whereas the later decline is. H5 is therefore not supported. No significant sex interactions for the contact effects support emphasizing second-parent position, without proving identical effects in every subgroup. Decreases in both contact and conflict suggest fading rather than either universal reconciliation or increasing hostility.
- `SYNTHESIS-001`: Dutch context, single-reporter contact, narrow conflict measurement, and reverse causal direction limit interpretation. Increased sibling contact might itself promote support for the surviving parent. The identities and concrete activities of kinkeepers were not directly measured, so their role remains a theoretical interpretation rather than an observed mediator.

The short-answer set now asks about conflict and fading rather than recalling H5/H6 numbers. Numeric questions retain their explicit denominators or comparison periods, and the 17% item asks for the authors' approximate interpretation. The changed and retained short-answer evidence links were directly checked.

## Source reporting issues

1. `COVARIATES-001` calls the surviving-parent mediation prediction Hypothesis 4. `SOLIDARITY-001` and `DISCUSSION-001` identify it as H3; H4 is the long-term kinkeeping prediction. The learning materials follow the substantive hypothesis definitions and do not reproduce the inconsistent cross-reference.
2. The retained Table 1 row for years after the second parent's death describes years after the first parent's death. Direct image inspection confirms the wording noted in `MEASURES-001`. Questions use the transition/duration definitions in `OUTCOMES-001` and the separately specified models, rather than treating that description as a different variable definition.
3. The abstract briefly describes an initial conflict increase; the detailed conflict results and Table 4 identify it as statistically nonsignificant. Explanations preserve that distinction and the resulting lack of support for H5.

The source text, translations, and images were preserved. The first two issues cannot be assigned definitively to publication or extraction without the original PDF or additional source documentation.

## Verification

One combined source-only validation was run after the four editors reported completion: `node tmp/verify-english-stage3.js kalmijn-leopold-2019`. All four canonical pages returned `schema_pass`, with no schema errors or warnings and 66 valid evidence references. The English-display check identified Korean in 12 professor reading-response fields: `response_angle` and `style_basis` on six cards. These fields were returned to the professor editor for completion before the final review.

The professor editor translated those 12 fields while preserving their meaning and evidence. The necessary professor-only schema and English-display recheck passed with no errors, warnings, or remaining Korean outside the internal classification enums. The final professor source hash is `v2:a9f1d295cffa118990a61c135b594734144588e3fd390c35be22036cc3c058af`. All four materials therefore completed validation successfully.

MCQ answer-position counts are 4/4/4/3. Correct-option length-rank counts are 7/1/4/3, where rank 1 is longest. Both distributions pass the answer-cue checks. The MCQ source hash is `v2:9428aed42a351c434b39e06210c9d34f9e91b77077158b72d3443f2cca3ab3f8`.

No source text, translation, metadata, approval records, or generated pages were changed by this stage. Approval renewal and final built-page verification remain with the coordinating workflow.
