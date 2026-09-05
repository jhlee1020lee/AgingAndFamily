# Stage 3 English learning materials review

- Date: 2026-09-05
- Reading: Levy (2009), `levy-2009`
- Scope: `quiz-ox.json`, `quiz_short.json`, `quiz-mcq.json`, and `professor_prep.json`.
- All prompts, options, short-answer variants, explanations, source labels, difficulty labels, discussion questions, and model responses were rewritten in English. Each file declares `language: "en"`. Internal question-category enums and card/evidence IDs were preserved.
- Counts preserved: 15 true/false, 15 short-answer, 15 multiple-choice questions, 15 discussion cards, and 6 reading-response cards.

## Evidence review

The 66 questions/cards were reviewed against the local `source_segments.json`. The original PDF is absent; this review establishes agreement with the stored source text, not independent fidelity to the PDF.

- `ABS-001`, `INTRO-001`, `INTRO-002`: four theory components, cultural variation, partial social construction, age 50+ at baseline, follow-up exceeding two decades, and the average 7.5-year association.
- `LIFE-001`, `LIFE-002`: childhood and later internalization, short-term resource advantages, 440 participants aged 18–49 followed for 38 years, and the subgroup of 229 aged 18–39 with twice the likelihood of cardiovascular events after 60.
- `UNCONSC-001`: 55-millisecond presentation, handwriting, intervention choices, and the limits of unconscious priming evidence.
- `SELFREL-001`, `SELFREL-002`: objective versus subjective age thresholds, self-relevance, interpersonal/institutional cues, and current/future self-views.
- `PATH-PSYCH-001`, `PATH-BEHAV-001`, `PATH-PHYS-001`: stereotype matching, healthy practices over 18 years, self-efficacy, the proposed autonomic pathway, and Figure 2 response directions.
- `FUTURE-001`: sustained activation and unresolved transferability. Applications to family life and policy are explicitly identified as inferences, not evaluated interventions.

## Verification

One source-only validation pass after the English rewrite: all four changed pages returned `schema_pass`, with zero errors and warnings. Additional checks in the same pass confirmed 66 valid evidence references, the required counts and language fields, and no Korean text outside internal question-category enums. MCQ answer positions remain 4/4/4/3.

Short answers include relevant hyphen/spacing variants, US/UK spellings of aging, and numeric answers with and without explicitly requested units. No source, translation, metadata, approval record, or generated site file was edited. The content changes require approval renewal and a site build by the coordinating workflow.
