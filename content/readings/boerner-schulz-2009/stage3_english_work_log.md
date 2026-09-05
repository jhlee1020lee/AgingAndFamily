# Stage 3 English learning materials review

- Date: 2026-09-05
- Reading: Boerner and Schulz (2009), `boerner-schulz-2009`
- Scope: three canonical quiz JSON files and `professor_prep.json`.
- Four editors worked on separate files within this reading and stage; the content editor coordinated combined verification.
- All learner-facing text is English and all four files declare `language: "en"`. Existing IDs, question order, evidence links, O/X codes, and internal classification enums were preserved. MCQ difficulty labels are English.
- Counts: 15 questions per quiz type, 15 discussion cards, and 6 reading-response cards.

## Evidence review

Each assigned editor directly read the local English source supporting their items. The MCQ editor read the complete retained source, including all four substantive evidence sections (`CAREGIVING-001`, `COMPLICATED-001`, `RISK-001`, `PRACTICE-001`), and checked the final short-answer set against its assigned evidence. Original PDFs are absent; this review does not independently establish full-publication fidelity or reanalyze the studies cited in the article.

- `ABS-001`, `INTRO-001`: this is a 2009 review of caregiving and bereavement with practical recommendations. It summarizes other research rather than reporting one new sample that supplies every estimate or treatment result.
- `CAREGIVING-001`: cumulative stress emphasizes depletion of coping resources; stress reduction emphasizes relief from demands and suffering; anticipation can allow preparation. These processes may coexist in the same person and apply differently across subgroups. Relief does not imply absent love or mourning, and positive average trajectories do not remove the need to recognize people who struggle.
- `CAREGIVING-001`: the broad estimate of approximately 10–20% with persistent high stress or psychiatric problems is distinct from the authors' dementia-caregiver study reporting 30% at risk for clinical depression one year after death and 20% experiencing complicated grief. Depression risk is not a confirmed diagnosis. The two study-specific percentages are not established as mutually exclusive groups and cannot simply be added or applied to all bereaved adults. MCQ 4 now asks about these interpretive limits instead of pairing two memorized numbers.
- `COMPLICATED-001`: the article describes intense yearning, intrusive distress, and difficulty reengaging in relationships and activities. It discusses a proposed diagnostic framework in 2009, not current diagnostic rules. Every criteria-based question is explicitly historical. The proposal combined persistent disruptive yearning with four of eight additional symptoms, frequency/severity conditions, at least six months of distress, and significant functional impairment. Ordinary sadness alone does not satisfy that proposal.
- `COMPLICATED-001`: the review permits co-occurrence with depression and PTSD while regarding complicated grief as distinct and warranting different treatment strategies. Overlap does not make these conditions interchangeable. The learning material attributes this discussion to the historical article.
- `RISK-001`: preloss distress, burden, exhaustion, lack of support, and socioeconomic disadvantage are reported risk markers. Constrained resources are a possible explanation for socioeconomic differences; the materials avoid deterministic individual predictions or inherent deficits. MCQ 8 replaces an irrelevant birth-order distractor task with interpretation of these associations.
- `RISK-001`: caregivers who report rewarding experiences may also encounter bereavement difficulties. The authors suggest loss of a meaningful role or a central relationship as possible explanations. They do not establish that positive caregiving causes complicated grief or that positive reports necessarily conceal negative experiences.
- `RISK-001`: preparedness has emotional, pragmatic, and informational dimensions in the cited focus-group work. Readiness in one dimension does not guarantee readiness in another. Years of intensive care and relative certainty of death do not automatically confer preparedness. The research is described as still developing at the time.
- `PRACTICE-001`: recommended conversations explore stress, support, depression and anxiety, positive experiences, and effects on life before and after death. A positive account does not exclude risk where caregiving supplies a defining purpose. MCQ 12 tests this inclusive conversational approach rather than identifying an unrelated political question.
- `PRACTICE-001`: the reported prevention benefit for complicated grief comes from the cited randomized psychosocial–behavioral dementia-caregiver intervention. The review does not provide a numerical effect size here, and the material does not claim universal prevention. Suggested help with meaning, goals, preparation, and support remains a professional recommendation rather than a separately tested package.
- `PRACTICE-001`: the Shear study's loss-focused approach includes retelling the death, an imagined conversation, and confronting avoided situations. Its reported higher and faster improvement is relative to the study's standard interpersonal therapy comparator. The materials do not isolate one component as the cause, claim superiority over all treatment options, or generalize that approach to every bereaved person.

No additional internal numerical contradiction requiring a disputed answer was identified. The short-answer owner replaced most numerical recall with anticipation, heterogeneity, yearning, and functional impairment. Only the study-specific 30% depression-risk question remains numeric. All final questions and explanations were checked against their assigned source sections.

## Verification

After all four files were final, `node tmp/verify-english-stage3.js boerner-schulz-2009` ran one combined source-only validation. All four pages returned `schema_pass`, with no errors or warnings. Count, language, English-display, and evidence-ID checks passed for all 66 questions/cards. Korean remains only in internal classification enums.

MCQ answer-position counts are 4/4/4/3. Correct-option length-rank counts are 4/4/2/5, where rank 1 is longest. Both distributions pass the answer-cue checks. The final MCQ source hash is `v2:a43c2b24190c31086634ab23f333400f33d207b4cae44b05957a654b82cc878a`.

Approval renewal and built-page verification remain with the coordinating workflow. No source text, translations, metadata, approval records, or generated pages were changed by this stage.
