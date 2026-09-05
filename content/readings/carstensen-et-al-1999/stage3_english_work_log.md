# Stage 3 English learning materials review

- Date: 2026-09-05
- Reading: Carstensen, Isaacowitz, and Charles (1999), `carstensen-et-al-1999`
- Scope: three canonical quiz JSON files and `professor_prep.json`.
- Four editors worked on separate files within this reading and stage. The content editor coordinated combined verification after all four files were complete.
- All learner-facing text is English and all four files declare `language: "en"`. Internal category enums, question order, existing card/evidence IDs, and O/X answer codes are preserved.
- Counts: 15 questions per quiz type, 15 discussion cards, and 6 reading-response cards.

## Evidence review

The assigned editors directly read the local English source segments and checked their items against them. The MCQ editor read the 21 segments from article metadata through the conclusion; the reference-list segment was not independently audited. Original PDFs are absent, so this review does not independently verify fidelity to the original PDF.

- `ABS-001`, `INTRO-001`, `TENETS-001`, `TENETS-002`: perceived time changes the relative priority of knowledge and emotional goals. The functional categories overlap, information seeking can be emotional, and immediately relevant information can remain important under limited time.
- `TIMEDEV-001`: Figure 1 is an idealized theoretical model, not a measured longitudinal trajectory. The infancy qualification rules out attributing infants' emotional motives to an understanding of abstract time. Present focus is distinguished from past orientation and from a simple preference for hedonism.
- `PARTNER-001`, `MEMORY-001`: HIV-status groups were male and comparable in mean age, rather than randomly assigned. Card sorting and multidimensional scaling differ from direct goal questions. The narrative-memory finding concerns the proportion of recalled material that is emotional, not greater absolute recall by older adults.
- `EMOREG-001`, `EMOREG-002`: the article's 1999 account lacked longitudinal emotion-regulation studies, leaving cohort alternatives open. Subjective intensity is distinguished from physiological reactivity and from emotional frequency and duration. Experience sampling included ages 18-95, 35 prompts, and 19 states; the very-old frequency rebound, unchanged intensity, and preliminary status are preserved.
- `NETWORK-001`: the Child Guidance Study follows the same participants over time. The reported Berlin comparison is cross-sectional and does not establish within-person change. Loss remains relevant alongside the proposed proactive selection of emotionally close partners.
- `PREFER-001`, `PREFER-002`: hypothetical geographical moves and an imagined medical advance adding about 20 years are experimental manipulations of time perspective. Hong Kong's political handover provides a separate historical context: the four-month-before and one-year-after observations are distinguished from the earlier age pattern and the imagined-emigration study.
- `LIFESPAN-001`, `CULTURE-001`, `COGNITIVE-001`, `CLINICAL-001`: SST provides domain-specific goal predictions within SOC's broader processes. Cultural meanings and the stimuli that signal endings may differ. Biological cognitive change is acknowledged, while motivational contributions and the motivation/disinhibition distinction remain open. Clinical implications are explicitly conjectural, not tested treatment effects.

The short-answer owner replaced five numerical-recall questions with questions about age comparability, experience sampling, longitudinal design, cross-sectional design, and political transition. Their original evidence IDs are retained; `answer_type` is updated where the task changed, and the source's numerical details remain in explanations. Accepted answers include relevant abbreviations, hyphenation variants, and numerical forms.

## Verification

After all files were complete, one combined run of `node tmp/verify-english-stage3.js carstensen-et-al-1999` returned `schema_pass` for all four pages with no errors or warnings. The English/count/reference check confirmed 66 valid evidence references, required counts and language fields, and no Korean outside internal category enums.

Before this run, the short-answer owner clarified question 15 to avoid the existing checker's substring confusion between the answer `SOC` and the word `social`. This was not a substantive answer leak.

The combined run passed the MCQ distribution rule, but 10 of 15 correct options were the shortest. Three items were then refined to reduce this incidental cue without changing their evidence or answer positions. The necessary MCQ recheck passed without errors or warnings. Final answer-position counts are 4/4/4/3; correct-option length-rank counts are 2/1/5/7, where rank 1 is longest.

No source text, translation, metadata, approval records, or generated pages were changed by this stage. Approval renewal and final built-page verification remain with the coordinating workflow.
