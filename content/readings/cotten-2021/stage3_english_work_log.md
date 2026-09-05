# Stage 3 English learning materials review

- Date: 2026-09-05
- Reading: Cotten (2021), `cotten-2021`
- Scope: three canonical quiz JSON files and `professor_prep.json`.
- Four editors worked on separate files within this reading and stage. The content editor coordinated one combined verification after all files were complete.
- All learner-facing text is English and all four files declare `language: "en"`. Internal category enums, question order, existing card/evidence IDs, answer types, and O/X answer codes are preserved.
- Counts: 15 questions per quiz type, 15 discussion cards, and 6 reading-response cards.

## Evidence review

The assigned editors directly read the local English source segments and checked their items against them. The MCQ editor read the 20 segments from metadata through future research, excluding the reference list and further-reading list. This is a 2021 handbook chapter reviewing varied research; its statistics, technology categories, policies, and forecasts retain their original historical context. Original PDFs are absent, so this review does not independently verify fidelity to the complete original PDF.

- `DEFINE-001`, `VARIATION-001`, `VARIATION-002`: distinguish ICTs from technology generally and from technologies considered emerging in the chapter. Age and cohort cannot be separated with cross-sectional data alone. Access, skills, experience, purposes, and support differ within older populations. Toronto subtype percentages describe 41 interview participants, not population prevalence.
- `DIVIDE-001`, `DATA-001`: early digital advantages can accumulate through education, jobs, skills, information, and social ties. The reviewed Pew samples may overestimate use by underrepresenting vulnerable older adults and excluding care-facility residents. Coarse measures, recall, installation barriers, and access to device data complicate research.
- `IMPACTS-001`, `PSYCH-001`: social selection and social causation are different explanations. Causal accounts can concern benefits or harms. Four-wave HRS analyses and three-wave New Zealand analyses are distinguished from cross-sectional studies. Social ICT use was linked through loneliness and engagement, while informational/instrumental use had different reported pathways. Mediation is not presented as a randomized mechanism test.
- `PHYSICAL-001`: the age-80-plus study was cross-sectional. Device/app use was associated with self-rated health and functional limitations; social-purpose use was not associated with those outcomes, while learning information and skills was relevant.
- `UNANTICIPATED-001`: phubbing may disrupt copresence, but prior relationship quality can influence phubbing, leaving causal direction unresolved. Technostress and financial or social resources for maintenance matter. Cotten defines overuse by interference with daily activities, not frequency alone, and does not equate it with addiction.
- `EMERGING-001`, `ROBOTICS-001`, `IOT-001`, `TELEHEALTH-001`: potential benefits depend on costs, user needs, acceptance, accessibility, maintenance, support, privacy, and security. Housing and connectivity matter for IoT use. The three supported telehealth uses and differences in state policy are described in the chapter's historical context; possible additional family-caregiver burdens are retained.
- `FUTURE-001`, `FUTURE-002`: differentiated longitudinal measures, combined self-report/device records, changes in use, and behavioral or health outcomes remain research needs. Training and maintenance require sustained resources. Virtual ties are not assumed to be equivalent to face-to-face relationships; program applications are marked as inferences.

All short-answer questions are conceptual. Accepted answers include relevant abbreviations, singular/plural forms, and hyphenation variants.

## Source concerns excluded from the learning questions

`DRIVING-001` says most older adults would not be willing to ride in an autonomous vehicle, immediately followed by a statement that "only 81%" would be willing. Those clauses conflict in the retained text. Its statement that 16% of people aged 65 and over were involved in traffic fatalities in 2017 also has an unclear or potentially misstated denominator. These driving statistics are not used in any of the four learning files. They were reported to the coordinating editor without changing source text or inventing corrected values. The original PDF is unavailable, so their provenance and intended values remain unresolved in this review.

## Verification

After all four files were complete, `node tmp/verify-english-stage3.js cotten-2021` ran one combined source-only validation. All four pages returned `schema_pass`, with no errors or warnings. The count, English-display, and reference checks confirmed 66 valid evidence references, required counts and language declarations, and no Korean outside internal category enums.

MCQ answer-position counts are 4/4/4/3. Correct-option length-rank counts are 2/6/3/4, where rank 1 is longest; the distribution passes the answer-cue check.

No source text, translation, metadata, approval records, or generated pages were changed by this stage. Approval renewal and final built-page verification remain with the coordinating workflow.
