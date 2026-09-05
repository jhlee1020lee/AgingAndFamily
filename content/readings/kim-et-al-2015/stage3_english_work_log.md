# Stage 3 English learning materials review

- Date: 2026-09-05
- Reading: Kim, Cheng, Zarit, and Fingerman (2015), `kim-et-al-2015`
- Scope: three canonical quiz JSON files and `professor_prep.json`.
- Four editors worked on separate files within this reading and stage. The content editor coordinated one combined verification after all files were complete.
- All learner-facing text is English and all four files declare `language: "en"`. Internal category enums, question order, existing card/evidence IDs, answer types, and O/X answer codes are preserved.
- Counts: 15 questions per quiz type, 15 discussion cards, and 6 reading-response cards.

## Evidence review

The assigned editors directly read the local English source segments and checked their items against them. The MCQ editor read all 16 segments outside the reference list. This 2015 chapter reviews multiple countries and studies; its estimates and policy accounts retain their original historical context. Original PDFs are absent, so this review does not independently establish fidelity to the original PDF.

- `INTRO-001`, `FILIAL-001`, `WEST-001`: strong filial expectations can coexist with changing support and contact. The Beijing student adulthood-criteria percentages and the separate Chinese visiting survey are not one sample. Filial piety overlaps with filial responsibility while differing in the manner, timing, and cultural meaning of support.
- `MEASURE-001`, `DFPM-001`: normative solidarity and actual exchanges are distinct. Reciprocal filial piety emphasizes care, gratitude, and repayment; authoritarian filial piety emphasizes hierarchy, compliance, and suppression of personal wishes. Neither coresidence nor a one-dimensional scale captures the full concept automatically.
- `CHANGE-001`, `CHANGE-002`: modernization does not imply an identical decline across Asian societies. The 1990s mainland-China/Taiwan comparison and long-term care insurance introduced in Japan in 2000 and South Korea in 2008 are historical accounts. Possible policy consequences remain conditional. Paid institutional care, ritualistic coresidence, and open invitations illustrate reinterpretation; class-specific access and gendered expectations remain relevant.
- `LIVING-001`, `LIVING-002`, `LIVING-003`: U.S. 14%, Japan 43%, and China 68.7% estimates come from different studies and do not establish a uniform relationship-quality ranking. The 59% nearby-village/community and 79% same-county figures concern Chinese parents aged 60+ who have children but live alone or only with a spouse. Quasi-coresidence combines proximity with separate households; it does not guarantee daily contact or well-being. Needs and resources of both generations influence living arrangements.
- `SUPPORT-001`, `SUPPORT-002`: migration may shift support toward remittances without ending exchanges. Korea's 57% in-person figure is at least monthly; the 89% telephone/email figure has no matching monthly frequency stated in the source. Poor parental health can elicit help, complicating causal interpretations of support and well-being. Providers, familism, and filial beliefs may qualify support's meaning and associations.
- `EMOTION-001`, `AMBIVALENCE-001`: indirect emotional expression and concerns about harmony and face require culturally sensitive measures. Explicit requests are not interchangeable with relational importance. Structural role contradictions and subjective mixed feelings are distinct levels of ambivalence, and the chapter identifies gaps in research on Asian families.

The short-answer set retains 13 conceptual questions and two numerical questions, with clear denominators and appropriate variants. Discussion applications are identified as inferences rather than tested effects of the reviewed studies.

## Source terminology concern

`WEST-001` labels a cited U.S. finding a "U-shaped curve" while describing well-being as compromised with both too little and too much help. If well-being itself is the plotted outcome, the verbal pattern would imply the opposite curvature; the label may instead require clarification of the outcome axis or original study. The curve name is not used as a quiz answer. The coordinating editor was informed, and source and translation were preserved without inventing a correction.

## Verification

After all four files were complete, `node tmp/verify-english-stage3.js kim-et-al-2015` ran one combined source-only validation. All four pages returned `schema_pass`, with no errors or warnings. The count, English-display, and reference checks confirmed 66 valid evidence references, required counts and language declarations, and no Korean outside internal category enums.

MCQ answer-position counts are 4/4/4/3. Correct-option length-rank counts are 5/1/3/6, where rank 1 is longest; the distribution passes the answer-cue check.

No source text, translation, metadata, approval records, or generated pages were changed by this stage. Approval renewal and final built-page verification remain with the coordinating workflow.
