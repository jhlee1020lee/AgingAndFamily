# Stage 3 English learning materials review

- Date: 2026-09-05
- Reading: Underwood (2014), `underwood-2014`, "Starting Young"
- Scope: three canonical quiz JSON files and `professor_prep.json`.
- Four editors worked on separate files within this reading and stage; the content editor coordinated one combined verification after all files were complete.
- All learner-facing text is English and all four files declare `language: "en"`. Internal category enums, question order, existing card/evidence IDs, and O/X answer codes are preserved.
- Counts: 15 questions per quiz type, 15 discussion cards, and 6 reading-response cards.

## Evidence review

The assigned editors directly read the local English source segments and checked their items against the article. The source is a Science news article reporting several research findings and interpretations, rather than a single intervention experiment. Original PDFs are absent, so this review does not independently establish fidelity to the original PDF.

- `OPEN-001`, `COHORT-001`, `DESIGN-001`: Scottish Mental Survey records at age 11; the historical survey aims; roughly 160,000 original children, nearly 5,000 local contacts, 1,641 follow-up participants, and the plan for MRI studies of 1,000 participants. These quantities refer to different populations or study components.
- `DESIGN-001`, `FINDINGS-001`: age-11 scores predicting about half of age-77 IQ variance is a statement about between-person variation, not a fixed fraction of an individual's intelligence. Childhood-IQ adjustment challenges causal interpretations of some lifestyle associations; it does not prove that every intervention is ineffective. Greenwood's caution and the remaining variation are retained.
- `SIDEBAR-001`: the article situates Lothian among other aging studies with different designs and early-life measures. These are distinguished from findings of the Lothian cohorts themselves.
- `CHANGE-001`: relatively preserved memory and knowledge are qualified by possible test familiarity. Declines in abstract problem-solving and speed-related tasks coexist with substantial individual divergence.
- `NEURO-001`: diffusion tensor imaging tracks water movement in white matter; the reported roughly 10% relationship concerns differences in cognitive function. Cortisol and white matter abnormalities are associated, with causation unresolved. A relatively thin cortex in old age may partly reflect earlier differences and does not, by itself, quantify an individual's tissue loss.
- `RESERVE-001`: cognitive reserve and the water tank metaphor are presented as explanatory hypotheses involving genes and, partly, early environments. ENIGMA's 70 institutions in 33 countries and Lothian's 2009 entry are historical article details. McGowan's return to art and learning is a personal example, not evidence of intervention efficacy.

Numerical answers allow appropriate comma, unit, percentage, and word variants. Terminology includes relevant abbreviations and hyphenation variants. Additional family or policy applications are identified as inferences. Research-output totals, study membership, and evolving scientific conclusions are framed in the article's 2014 context.

## Verification

After all four files were complete, `node tmp/verify-english-stage3.js underwood-2014` ran one combined source-only validation. All four pages returned `schema_pass` with no errors or warnings. The count, English-display, and reference checks confirmed 66 valid evidence references, the required item counts, and no Korean outside internal category enums.

MCQ answer-position counts are 5/3/3/4; correct-option length-rank counts are 1/4/5/5. There is no dominant answer-length cue. The short-answer owner improved the wording of question 3 before this final verification without changing its answer or evidence.

No source text, translation, metadata, approval records, or generated pages were changed by this stage. Approval renewal and final built-page verification remain with the coordinating workflow.
