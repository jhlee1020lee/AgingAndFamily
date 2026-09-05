# Stage 3 English learning materials review

- Date: 2026-09-05
- Reading: Lee and Yeung (2021), `lee-yeung-2021`
- Scope: three canonical quiz JSON files and `professor_prep.json`.
- Four editors worked on separate files within this reading and stage. The content editor coordinated combined verification.
- All learner-facing text is English and all four files declare `language: "en"`. Internal classification enums, existing card IDs, question order, and O/X codes were preserved. Redesigned short answers use corresponding evidence IDs and answer types.
- Counts: 15 questions per quiz type, 15 discussion cards, and 6 reading-response cards.

## Evidence review

The assigned editors directly checked the local English source supporting their items. The MCQ editor read all 22 segments outside the references, inspected Tables 3 and 4, and checked every revised short answer against its assigned evidence. The original PDF is absent, so this review cannot independently establish fidelity to the complete original publication or resolve the provenance of inconsistent retained details.

- `ABS-001`, `INTRO-001`, `WORK-001`, `WORK-002`: retirement is treated as a process of exits and re-entries, potentially repeated, rather than a single irreversible event. Life-course and cumulative-stratification perspectives connect prior work with later resources and opportunities. Disadvantage can simultaneously create pressure to work and barriers to employment. Theory and prior findings are distinguished from the present estimates.
- `FAMILY-001`, `CONTEXT-001`, `CONTEXT-002`: spouse work, partnership, child coresidence, and upward transfers are distinct family dimensions. Hypotheses about gender differences remain separate from results. Korean pension and labor-market statistics from 2013/2018 and the cited OECD comparisons are historical context, not current legal guidance or verified current rankings.
- `DATA-001`: the analysis uses KLoSA observations from 2006–2016, restricting baseline age to 50–64, reaching 60–74 at the final wave. The final sample of 2,600 people contributes 26,520 person-years. Prior paid work and sufficient observation were required, potentially selecting more work-oriented women. The wider survey population and analytic sample are not interchangeable. Retrospective work history was collected in 2007.
- `MEASURES-001`: transitions are observed changes between employment and nonemployment/retirement; both are nonabsorbing states. Individuals can have multiple spells. Paid work among people reporting retirement counts as re-entry under the study definition. The initial risk-period definition is not a rule excluding later transitions.
- `EXPLANATORY-001`: main occupational sector, longest uninterrupted job duration, and total self-employment years are distinct. Ties in longest-job duration use the most recent experience. The sector indicator is time-constant, while health, resources, and family measures can vary. No-partner status combines several marital categories. Upward transfers sum previous-year support from children and are logged; they are not money sent downward to children. Missing covariates and missing transfers have separately described handling.
- `ANALYSIS-001`: jointly estimated discrete-time exit and entry equations include correlated person-level random effects. These represent unobserved heterogeneity and do not imply randomized exposure. Gender-by-predictor interactions precede stratified models. Model 1 includes work history, Model 2 adds proximate health and financial correlates, and Model 3 adds family circumstances. Death/loss to follow-up leads to censoring, with FIML and survey/nonresponse adjustments under assumptions about attrition.
- `RESULTS-DESCRIPTIVE-001`: women's 16% exit and 25% re-entry percentages describe observations starting in different labor-force states. The corresponding men's figures also have state-specific denominators. They are not shares of all individuals with identical observation histories.
- `RESULTS-INTERACTIONS-001`: the gender coding is 0 for women and 1 for men. Interactions describe differences in modeled associations, not absolute probability gaps. MCQ question 12 asks about the stronger negative self-employment/exit association among men and leaves the numeric coefficient in the explanation.
- `RESULTS-WOMEN-001`, Table 3: nonpartnered women's reported exit odds are about 39% lower than those with a retired spouse. Married-child coresidence is negatively associated with re-entry; unmarried-child coresidence is associated with about 42% higher exit odds. Upward transfers are associated with lower re-entry and higher exit. These directions and reference categories are not collapsed into a universal claim that living with children causes retirement.
- `RESULTS-MEN-001`, Table 4: skilled manual work predicts higher re-entry and lower exit relative to nonmanual work. Longer tenure predicts lower re-entry; more self-employment predicts lower exit. Reported odds ratios .98 and .97 concern a year of the corresponding career measure. The agricultural comparison of about .68 is explicitly the results prose's exp(−.39) value, not an assumption that every model has that coefficient. A working spouse is associated with about 22% lower exit odds. The child-transfer significance discrepancy is handled separately below.
- `DISCUSSION-001`, `DISCUSSION-002`, `LIMITATIONS-001`, `IMPLICATIONS-001`: continued work may reflect both flexibility and financial constraint. Work attachment, breadwinner identity, and family obligations are interpretations that need stronger direct measurement. Longer working lives do not automatically reduce inequality. Cohort differences and changes in institutions or norms were not established by these models. Proposed training, job-quality, and support policies are implications, not evaluated interventions.

The short-answer owner reduced numeric recall from 14 to three questions: women's 39% lower exit odds, the reported men's agricultural odds ratio of .68, and men's 22% lower exit odds with a working spouse. Each specifies its sex, comparison group, and odds interpretation. New questions target KLoSA, cumulative stratification, sample selection, person-years, repeated transitions, nonabsorbing states, occupational measures, random effects, log transformation, FIML, and interactions. All revised evidence links were directly checked.

## Source wording and scope

1. `DATA-001` says the survey selected 71% of households, alongside an individual response rate of about 75%. The household-stage denominator and whether this describes selection or response are unclear in the retained wording. MCQ question 6 now tests the explicitly stated multistage stratified probability design rather than requiring the ambiguous percentage. No unsupported correction to the source was made.
2. The measurement text defines the no-child-coresidence reference as living alone or with a spouse only, whereas Tables 3 and 4 shorten the label to living with a spouse. Learning explanations use the full measurement definition and identify the shortened table label where relevant.
3. Table 4 reports men's upward-transfer/re-entry coefficient as −.08 with SE .02, without a significance mark, while the results text calls the association nonsignificant. The apparent coefficient-to-SE ratio does not align with that inference. The retained table image confirms the cell. Materials that discuss the nonsignificant result explicitly attribute it to the authors' report and preserve the discrepancy; the MCQ and short answers do not test the disputed significance as a settled fact.
4. The attrition description says attrition is random and systematically associated with modeled variables. The materials describe the stated adjustments and their reliance on assumptions, without turning that wording into a guarantee of unconditional random dropout or complete removal of bias.

The source text, translations, and tables were preserved. This review does not re-estimate models or supply missing survey or statistical documentation.

## Verification

After all four files were complete, `node tmp/verify-english-stage3.js lee-yeung-2021` ran one combined source-only validation. All four pages returned `schema_pass`, with no errors or warnings. Count, language, English-display, and evidence checks passed for all 66 questions/cards, with no Korean outside internal classification enums.

MCQ answer-position counts are 4/4/4/3. Correct-option length-rank counts are 3/5/2/5, where rank 1 is longest. Both distributions pass the answer-cue checks. The final MCQ source hash is `v2:0d0e601c5b8fa3aad57b7a7443febcf11afbd60c3ad90ce4f4d66429c69e378a`.

Approval renewal and built-page verification remain with the coordinating workflow.

No source text, translations, metadata, approval records, or generated pages were changed by this stage.
