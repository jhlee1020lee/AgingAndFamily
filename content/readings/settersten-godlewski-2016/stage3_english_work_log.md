# Stage 3 English learning materials review

- Date: 2026-09-05
- Reading: Settersten & Godlewski (2016), `settersten-godlewski-2016`
- Scope: `quiz-ox.json`, `quiz_short.json`, `quiz-mcq.json`, and `professor_prep.json`.
- All learner-facing prompts, options, answers, explanations, source/difficulty labels, discussion questions, and model responses were rewritten in English. Each file declares `language: "en"`.
- Internal category enums and all card/evidence IDs were preserved. Counts remain 15 questions per quiz type, 15 discussion cards, and 6 reading-response cards.

## Evidence review

All 66 questions/cards were reviewed against the local `source_segments.json`. The original PDF is absent; agreement with the stored text does not independently establish PDF fidelity.

- `INTRO-001`, `INDIVIDUAL-001`: the two strands of inquiry, age as a proxy, convenience of measurement, and the need to identify underlying mechanisms.
- `RELATIVE-TIME-001`, `SUBJECTIVE-AGE-001`, `MULTIPLE-TIMES-001`: relative duration, future time perspective, the attribution required for AARC, interpersonal subjective age, and age/cohort distinctions.
- `SOCIAL-ORG-001`, `LIFE-PHASES-001`: rationalization, different temporal demands of work and family, and Neugarten's original functional/resource distinction rather than later fixed age bands.
- `AGEISM-001`, `AGEISM-002`, `ROLE-TIMING-001`: SET, limits of positive stereotypes, age norms, sanctions, and persistence of life-course ideals.
- `AGE-INTEGRATION-001`, `AGE-RIGHTS-001`: costs and benefits of integration/segregation and the assumptions about risk and dependence underlying age-based programs.
- `GENDER-CULTURE-001`, `GENDER-CULTURE-002`: gendered evaluations, Linton, intersecting inequalities, seven Project AGE contexts, and the three meanings of age.
- `CONCLUSION-001`, `CONCLUSION-002`: age as a carrier variable, limitations of stacked age-group comparisons, and explanations connecting social and individual levels.

Family, program-design, and policy extensions are identified as applications or inferences. The South Korean family example is explicitly not presented as a finding of this chapter. Future-time-perspective wording was narrowed to influence in people of any age; it does not assert statistical independence from chronological age.

## Verification

One source-only validation pass after the rewrite: all four changed pages returned `schema_pass`, with zero errors and warnings. Checks in the same pass confirmed 66 valid evidence references, unchanged question counts, English language fields, and no Korean outside internal question-category enums. MCQ answer positions remain 3/3/4/5.

Short answers include relevant hyphen/spacing variants and US/UK spellings. Original source, translation, metadata, approval records, and generated site files were not edited. Approval renewal and a site build remain with the coordinating workflow.
