# Stage 3 English learning materials review

- Date: 2026-09-05
- Reading: Vaupel (2010), `vaupel-2010`
- Scope: the three canonical quiz JSON files and `professor_prep.json`.
- The quiz editor rewrote 45 questions; a second editor rewrote the 15 discussion and 6 reading-response cards within this same reading and stage. The coordinating content editor performed one combined verification after all four files were complete.
- Each file declares `language: "en"`. All learner-facing text is English; internal category enums, IDs, evidence IDs, O/X codes, and question/card counts are preserved.

## Evidence review

The editors directly read the stored English source segments relevant to their assigned material. The original PDF is absent; this review establishes agreement with the stored source text rather than independent PDF fidelity.

- `ABS-001`, `OPEN-001`, `MORT-001`: a decade of postponement, the distinction from deceleration, X5/X10, the Swedish eight-year and Japanese twelve-year shifts, Figure 2 population counts, and the conditional projection of centenarian survival.
- `MORT-002`, `MORT-003`: the approximately 25% estimate concerns adult lifespan variation between individuals, not a fixed fraction of an individual's lifespan; limited genetic findings and inverse senescence retain their original qualifications.
- `DEBILITY-001`, `DEBILITY-002`, `DEBILITY-003`: health-measurement limitations, mixed disability trends, morbidity versus functioning, prevalence versus incidence/survival, and the direction of the health–survival paradox.
- `DELAY-001`: validated ages 110–114 and a roughly 50% annual death probability, sparse observations beyond 114, and population compositional change without cessation of individual aging.
- `CAUSES-001`, `CAUSES-002`: interaction between prosperity and medicine and the distinction between relative individual longevity and population longevity levels.
- `FORECAST-001`, `FORECAST-002`, `PERSPECTIVES-001`: 2.5 years per decade, the conditional 2107 projection, the baseline expected age at death of 84 versus counterfactual ages 90 and 118, hypothetical work redistribution, and the aging-rate hypothesis as a research question.

Short-answer question 12 now refers to **most children born since 2000**, matching its existing `OPEN-001` reference; the previous wording used “half,” which appears in another segment. Forecasts and then-current evidence are framed as the 2010 article's claims. Family and policy extensions are marked as applications or inferences.

## Verification

One combined source-only validation pass after both editors finished: all four changed pages returned `schema_pass`, with zero errors or warnings. The same pass confirmed 66 valid evidence references, 15 questions per quiz type, the language fields, and no Korean outside internal category enums. MCQ answer positions are 4/4/4/3, with no dominant correct-option length rank.

Short answers include relevant hyphenation, alternative spellings, and numerical answers with and without units explicitly supplied by their question. Source text, translation, metadata, approvals, and generated site files were not edited by this stage. Approval renewal and built-page checks remain with the coordinating workflow.
