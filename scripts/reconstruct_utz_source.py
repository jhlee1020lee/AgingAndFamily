import json
import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
SLUG = "utz-et-al-2002"
BLOCKS_PATH = ROOT_DIR / "tmp" / "pdf_blocks" / f"{SLUG}.json"
OUTPUT_PATH = ROOT_DIR / "content" / "readings" / SLUG / "full.md"


TRUE_HYPHENATED_BREAKS = {
    ("late", "life"),
    ("self", "identity"),
    ("age", "related"),
    ("two", "stage"),
    ("couple", "level"),
    ("self", "determined"),
    ("life", "span"),
}


def load_payload() -> dict:
    return json.loads(BLOCKS_PATH.read_text(encoding="utf-8"))


def lookup_block(payload: dict, page_number: int, block_index: int) -> str:
    for block in payload["pages"][page_number - 1]["blocks"]:
        if block["block_index"] == block_index:
            return block["text"]
    raise KeyError(f"Missing page {page_number} block {block_index}")


def normalize_text(text: str) -> str:
    value = text.replace("\ufb01 ", "fi").replace("\ufb02 ", "fl")
    value = value.replace("\ufb01", "fi").replace("\ufb02", "fl")
    value = value.replace("\u00a0", " ")
    value = value.replace("\x02", "α").replace("\x03", "=")
    value = value.replace("\x04", "<").replace("\x05", "≤")
    value = value.replace("\x06", "−").replace("\x07", "β")
    value = value.replace("\x08", "≠").replace("\t", "×")
    value = re.sub(r"\s+", " ", value).strip()
    value = re.sub(r"\s*–\s*", "–", value)
    value = re.sub(r"\s*—\s*", "—", value)
    value = re.sub(r"\s+([,;:?!])", r"\1", value)
    value = re.sub(r"\s+\.(?!\d)", ".", value)
    value = re.sub(r"([([{])\s+", r"\1", value)
    value = re.sub(r"\s+([)\]}])", r"\1", value)
    value = re.sub(r"“\s+", "“", value)
    value = re.sub(r"\s+”", "”", value)
    value = re.sub(r"‘\s+", "‘", value)
    value = re.sub(r"\s+’", "’", value)
    value = re.sub(r"\s*=\s*", " = ", value)
    value = re.sub(r"\s*≤\s*", " ≤ ", value)
    value = re.sub(r"\s*<\s*", " < ", value)
    value = value.replace("( < 15%)", "(<15%)")
    value = value.replace("R2", "R²")
    return value.strip()


def append_wrapped_line(value: str, next_line: str) -> str:
    next_line = next_line.replace("\ufb01 ", "fi").replace("\ufb02 ", "fl")
    next_line = next_line.replace("\ufb01", "fi").replace("\ufb02", "fl")
    if value.endswith("/"):
        return value + next_line
    match = re.search(r"([A-Za-z]+)-$", value)
    next_match = re.match(r"([A-Za-z]+)(.*)$", next_line)
    if match and next_match:
        first = match.group(1)
        second = next_match.group(1)
        tail = next_match.group(2)
        if (first.lower(), second.lower()) in TRUE_HYPHENATED_BREAKS:
            return value + second + tail
        return value[:-1] + second + tail
    return value + " " + next_line


def join_wrapped_lines(text: str) -> str:
    # The embedded tab in `Widowhood × Sex` is a mathematical glyph in the
    # PDF's legacy font, not a layout delimiter.
    text = text.replace("\t", "×")
    lines = [line.strip() for line in text.replace("\r\n", "\n").split("\n") if line.strip()]
    if not lines:
        return ""
    value = lines[0]
    for next_line in lines[1:]:
        value = append_wrapped_line(value, next_line)
    return normalize_text(value)


def block_text(payload: dict, page: int, block: int) -> str:
    return join_wrapped_lines(lookup_block(payload, page, block))


def strip_prefix(value: str, prefix: str) -> str:
    normalized_prefix = normalize_text(prefix)
    if not value.startswith(normalized_prefix):
        raise ValueError(f"Expected prefix {normalized_prefix!r}, found {value[:160]!r}")
    return normalize_text(value[len(normalized_prefix) :])


def split_on_markers(value: str, markers: list[str]) -> list[str]:
    remaining = normalize_text(value)
    parts: list[str] = []
    for marker in markers:
        normalized_marker = normalize_text(marker)
        position = remaining.find(normalized_marker)
        if position <= 0:
            raise ValueError(
                f"Split marker {normalized_marker!r} not found after text: {remaining[:280]!r}"
            )
        parts.append(normalize_text(remaining[:position]))
        remaining = normalize_text(remaining[position:])
    parts.append(remaining)
    return parts


def join_continuation(*parts: str) -> str:
    selected = [normalize_text(part) for part in parts if part and part.strip()]
    if not selected:
        return ""
    value = selected[0]
    for part in selected[1:]:
        value = append_wrapped_line(value, part)
    return normalize_text(value)


def reference_lines(payload: dict) -> list[tuple[int, str, float, float, str]]:
    selected: list[tuple[int, str, float, float, str]] = []

    for line in payload["pages"][10]["lines"]:
        x0, y0, _, _ = line["bbox"]
        if x0 >= 300 and 699 <= y0 <= 744:
            selected.append((11, "right", float(x0), float(y0), line["text"].strip()))

    page_12: list[tuple[int, str, float, float, str]] = []
    for line in payload["pages"][11]["lines"]:
        x0, y0, _, _ = line["bbox"]
        column = "left" if x0 < 300 else "right"
        maximum_y = 744 if column == "left" else 690
        if not 40 <= y0 <= maximum_y:
            continue
        page_12.append((12, column, float(x0), float(y0), line["text"].strip()))
    selected.extend(item for item in page_12 if item[1] == "left")
    selected.extend(item for item in page_12 if item[1] == "right")
    return selected


def parse_references(payload: dict) -> list[str]:
    selected = reference_lines(payload)
    expected_baselines = {
        (11, "right"): 310.00,
        (12, "left"): 51.99,
        (12, "right"): 310.01,
    }
    observed: dict[tuple[int, str], float] = {}
    for page_number, column, x0, _, _ in selected:
        key = (page_number, column)
        observed[key] = min(x0, observed.get(key, x0))
    for key, expected in expected_baselines.items():
        if abs(observed[key] - expected) > 0.15:
            raise ValueError(f"Unexpected reference baseline for {key}: {observed[key]}")

    references: list[str] = []
    for page_number, column, x0, _, text in selected:
        baseline = expected_baselines[(page_number, column)]
        starts_reference = x0 <= baseline + 4.5
        cleaned = normalize_text(text)
        if starts_reference:
            references.append(cleaned)
        elif not references:
            raise ValueError(f"Reference continuation before first entry on page {page_number}")
        else:
            references[-1] = join_continuation(references[-1], cleaned)

    references = [normalize_text(reference) for reference in references]
    if len(references) != 61:
        raise ValueError(f"Expected 61 references, found {len(references)}")
    if not references[0].startswith("Anderson, T. B. (1983)."):
        raise ValueError("First reference sentinel did not match Anderson")
    if not references[-1].startswith("Ward, R., Logan, J., & Spitze, G. (1992)."):
        raise ValueError("Last reference sentinel did not match Ward et al.")
    if not references[1].startswith("Antonucci, T. C. (1989)."):
        raise ValueError("Second reference sentinel did not match Antonucci 1989")
    if not references[2].startswith("Antonucci, T. C. (1990)."):
        raise ValueError("Page 11-to-12 reference transition is incorrect")
    return references


def add_paragraphs(lines: list[str], paragraphs: list[str]) -> None:
    for paragraph in paragraphs:
        lines.extend([normalize_text(paragraph), ""])


def add_section(lines: list[str], heading: str, paragraphs: list[str], level: int = 2) -> None:
    lines.extend([f"{'#' * level} {heading}", ""])
    add_paragraphs(lines, paragraphs)


def add_asset(
    lines: list[str],
    alt_text: str,
    source: str,
    caption: str,
    accessibility: str,
) -> None:
    lines.extend(
        [
            f"![{alt_text}]({source})",
            "",
            f"{normalize_text(caption)} Accessibility description: {normalize_text(accessibility)}",
            "",
        ]
    )


def build_document(payload: dict) -> str:
    if len(payload.get("pages", [])) != 12:
        raise ValueError(f"Expected 12 PDF pages, found {len(payload.get('pages', []))}")

    abstract = block_text(payload, 1, 5)
    purpose, design, results, implications = split_on_markers(
        abstract,
        ["Design and Methods:", "Results:", "Implications:"],
    )
    purpose = strip_prefix(purpose, "Purpose:")
    design = strip_prefix(design, "Design and Methods:")
    results = strip_prefix(results, "Results:")
    implications = strip_prefix(implications, "Implications:")
    keywords = strip_prefix(block_text(payload, 1, 6), "Key Words:")

    introduction = join_continuation(block_text(payload, 1, 7), block_text(payload, 1, 8))
    defining = join_continuation(block_text(payload, 1, 10), block_text(payload, 2, 1))
    widowhood_effect = block_text(payload, 2, 3)

    theory_activity_end, theory_disengagement, theory_continuity, theory_review = split_on_markers(
        block_text(payload, 2, 6),
        [
            "Second, disengagement theory",
            "Third, continuity theory",
            "Gerontologists have debated the explanatory power",
        ],
    )
    theories = [
        join_continuation(block_text(payload, 2, 5), theory_activity_end),
        theory_disengagement,
        theory_continuity,
        theory_review,
    ]

    prior_first_end, prior_second, prior_third_start = split_on_markers(
        block_text(payload, 3, 1),
        [
            "We believe the empirical literature is inconclusive for four reasons",
            "Data from the CLOC study make it possible",
        ],
    )
    prior_research = [
        join_continuation(block_text(payload, 2, 8), prior_first_end),
        prior_second,
        join_continuation(prior_third_start, block_text(payload, 3, 2)),
    ]

    sample_first, sample_second, sample_third = split_on_markers(
        block_text(payload, 3, 5),
        [
            "Following the baseline interview (1987–1988)",
            "Analyses were based on a sample of 297 older adults",
        ],
    )

    dependent = strip_prefix(block_text(payload, 4, 2), "Dependent Variables.—")
    predictor = strip_prefix(block_text(payload, 4, 3), "Predictor Variables.—")
    controls = strip_prefix(block_text(payload, 4, 4), "Control Variables.—")

    (
        confounding_first_end,
        confounding_health,
        confounding_personality,
        confounding_constraints_start,
    ) = split_on_markers(
        block_text(payload, 4, 6),
        [
            "To assess the role of individual- and couple-level health characteristics",
            "One personality measure was included in the analysis",
            "Finally, three variables represent possible constraints",
        ],
    )
    confounding = [
        join_continuation(
            strip_prefix(block_text(payload, 4, 5), "Confounding Variables.—"),
            confounding_first_end,
        ),
        confounding_health,
        confounding_personality,
        join_continuation(confounding_constraints_start, block_text(payload, 5, 1)),
    ]

    analytic_plan = block_text(payload, 5, 3)

    sample_results_first, figure_one_start = split_on_markers(
        block_text(payload, 5, 6),
        ["Figure 1 graphically illustrates"],
    )
    figure_one_end, preloss_start = split_on_markers(
        block_text(payload, 6, 1),
        ["To explore whether adjustment to widowhood begins before the date of death"],
    )
    sample_results = [
        sample_results_first,
        join_continuation(figure_one_start, figure_one_end),
        join_continuation(preloss_start, block_text(payload, 6, 2)),
    ]

    effect_intro, effect_widowhood, effect_characteristics, effect_continuity_start = split_on_markers(
        block_text(payload, 6, 4),
        [
            "As shown in Model 1 and replicated in Models 2–3",
            "Model 2 considered the effects of individual- and couple-level characteristics",
            "Model 3 considered baseline social participation",
        ],
    )
    effect_continuity_end, effect_sex, effect_direction_start = split_on_markers(
        block_text(payload, 8, 1),
        [
            "Finally, we assessed all analyses in Table 3",
            "Given the above analyses, it is unclear",
        ],
    )
    effect_direction_end, effect_coping = split_on_markers(
        block_text(payload, 8, 2),
        ["Although continuity prevails in their behavioral adjustments"],
    )
    effect_results = [
        effect_intro,
        effect_widowhood,
        effect_characteristics,
        join_continuation(effect_continuity_start, effect_continuity_end),
        effect_sex,
        join_continuation(effect_direction_start, effect_direction_end),
        effect_coping,
    ]

    summary_first_end, summary_theme_one, summary_theme_two_start = split_on_markers(
        block_text(payload, 9, 1),
        [
            "Four broad themes, which encompass broader issues related to late-life bereavement",
            "The second theme contends that widowhood is a process",
        ],
    )
    summary_theme_two_end, summary_theme_three, summary_theme_four_start = split_on_markers(
        block_text(payload, 9, 2),
        [
            "A third theme concerns the interrelatedness of social actors",
            "A fourth and final theme assumes that there are multiple pathways",
        ],
    )
    discussion_summary = [
        join_continuation(block_text(payload, 8, 5), summary_first_end),
        summary_theme_one,
        join_continuation(summary_theme_two_start, summary_theme_two_end),
        summary_theme_three,
        join_continuation(summary_theme_four_start, block_text(payload, 10, 1)),
    ]

    evaluation_first, evaluation_second_start = split_on_markers(
        block_text(payload, 10, 3),
        ["Given our finding that widowed persons have increased levels"],
    )
    evaluation_second_end, evaluation_third, evaluation_fourth = split_on_markers(
        block_text(payload, 10, 4),
        [
            "Although this exercise in theory testing is largely inconclusive",
            "Despite activity, continuity, and disengagement theories’ inimitable presence",
        ],
    )
    evaluation = [
        evaluation_first,
        join_continuation(evaluation_second_start, evaluation_second_end),
        evaluation_third,
        evaluation_fourth,
    ]

    limitations_first_end, limitations_second = split_on_markers(
        block_text(payload, 11, 1),
        ["Future research should also consider the role of couple-level characteristics"],
    )
    limitations = [
        join_continuation(block_text(payload, 10, 6), limitations_first_end),
        limitations_second,
    ]

    practical_first_end, practical_second, practical_third = split_on_markers(
        block_text(payload, 11, 4),
        [
            "Intervention efforts should aim to minimize the disruption in social roles",
            "The findings from this study not only expand our knowledge",
        ],
    )
    practical = [
        join_continuation(block_text(payload, 11, 3), practical_first_end),
        practical_second,
        practical_third,
    ]

    references = parse_references(payload)

    lines = [
        "# The Effect of Widowhood on Older Adults’ Social Participation: An Evaluation of Activity, Disengagement, and Continuity Theories",
        "",
        "> Rebecca L. Utz, MGS¹ · Deborah Carr, PhD¹˒² · Randolph Nesse, MD, PhD² · Camille B. Wortman, PhD³",
        "",
        "> ¹ Department of Sociology and ² Institute for Social Research, University of Michigan, Ann Arbor. ³ Department of Psychology, State University of New York at Stony Brook.",
        "",
        "> *The Gerontologist*, 42(4), 522–533 (2002). Copyright 2002 by The Gerontological Society of America.",
        "",
        "> Received July 17, 2001; Accepted January 24, 2002. Decision Editor: Laurence G. Branch, PhD.",
        "",
        "> The Changing Lives of Older Couples study was supported by National Institute on Aging (NIA) Grants P01-AG05561-01 and R01-AG15948-01. Rebecca Utz’s participation was supported by an NIA predoctoral traineeship. We thank the anonymous reviewers for their thoughtful and detailed comments on earlier versions of this article. This paper was presented at the 53rd Annual Scientific Meeting of The Gerontological Society of America, November 2000, Washington, DC.",
        "",
        "> Correspondence: Rebecca Utz, Population Studies Center of the Institute for Social Research, 426 Thompson St., P.O. Box 1248, Ann Arbor, MI 48106-1248. E-mail: utzrl@umich.edu.",
        "",
    ]

    add_section(
        lines,
        "Abstract",
        [
            f"**Purpose.** {purpose}",
            f"**Design and Methods.** {design}",
            f"**Results.** {results}",
            f"**Implications.** {implications}",
        ],
    )
    add_section(lines, "Key Words", [keywords])
    add_section(lines, "Introduction", [introduction])
    add_section(lines, "Defining Social Participation", [defining], level=3)
    add_section(
        lines,
        "The Effect of Widowhood on Social Participation",
        [widowhood_effect],
        level=3,
    )
    add_section(
        lines,
        "Theoretical Explanations: Activity, Disengagement, and Continuity Theories",
        theories,
        level=3,
    )
    add_section(
        lines,
        "Prior Research and its Methodological Limitations",
        prior_research,
        level=3,
    )

    add_section(lines, "Methods", [])
    add_section(lines, "Sample", [sample_first, sample_second, sample_third], level=3)
    add_section(lines, "Measures", [], level=3)
    add_section(lines, "Dependent Variables", [dependent], level=4)
    add_section(lines, "Predictor Variables", [predictor], level=4)
    add_section(lines, "Control Variables", [controls], level=4)
    add_section(lines, "Confounding Variables", confounding, level=4)
    add_section(lines, "Analytic Plan", [analytic_plan], level=3)

    add_section(lines, "Results", [])
    add_section(lines, "Sample Characteristics", [sample_results[0]], level=3)
    add_asset(
        lines,
        "Table 1: means and standard deviations for widowed and nonwidowed respondents",
        "figures/table-1.png",
        "Table 1. Means and Standard Deviations for Widowed and Nonwidowed Respondents, Changing Lives of Older Couples Study, 1987–1993.",
        "The table compares weighted widowed (n = 210) and nonwidowed (n = 87) respondents on baseline and Wave 1 formal and informal participation, demographics, respondent and spouse health, extraversion, employment, driving, and children. The source crop preserves every mean, standard deviation, significance marker, and note.",
    )
    add_paragraphs(lines, [sample_results[1]])
    add_asset(
        lines,
        "Figure 1: formal and informal social participation at baseline and Wave 1 by marital status",
        "figures/figure-1.png",
        block_text(payload, 6, 5),
        "Two line charts compare standardized informal and formal social participation for widowed and control groups at baseline and Wave 1. Controls decline significantly in both measures; widowed respondents remain near their baseline means.",
    )
    add_paragraphs(lines, [sample_results[2]])
    add_asset(
        lines,
        "Table 2: OLS coefficients predicting baseline social participation",
        "figures/table-2.png",
        "Table 2. Ordinary Least Squares Regression Coefficients Predicting Baseline Social Participation Levels, Changing Lives of Older Couples Study, 1987–1993.",
        "Four weighted models (n = 297) predict formal and informal baseline/preloss participation. Widowhood predicts lower informal participation in Model 1b (−.29, p ≤ .01), and poor/fair spousal health predicts lower informal participation in Model 2b (−.31, p ≤ .001). The crop preserves all coefficients, adjusted R² values, controls, and notes.",
    )

    add_section(lines, "The Effect of Widowhood on Social Participation", [effect_results[0]], level=3)
    add_asset(
        lines,
        "Table 3: OLS coefficients predicting formal and informal participation six months after widowhood",
        "figures/table-3.png",
        "Table 3. Ordinary Least Squares Regression Coefficients Predicting the Effect of Widowhood on Formal and Informal Social Participation, Changing Lives of Older Couples Study, 1987–1993.",
        "Six weighted models (n = 297) predict Wave 1 participation. Widowhood is nonsignificant for formal participation but rises from .29 to .40 and .44 for informal participation; baseline formal and informal coefficients are .58 and .31. The crop preserves all demographic, health, personality, constraint, interaction, adjusted R², and significance entries.",
    )
    add_paragraphs(lines, effect_results[1:6])
    add_asset(
        lines,
        "Figure 2: whose interest in social contact changed after widowhood",
        "figures/figure-2.png",
        block_text(payload, 8, 6),
        "For widowed respondents’ own interest, 17% reported more, 71% the same, and 12% less. For friends’ and relatives’ interest, 35% reported more, 59% the same, and 6% less. The two pie charts preserve the survey-question wording.",
    )
    add_paragraphs(lines, [effect_results[6]])
    add_asset(
        lines,
        "Figure 3: whether widowed older adults kept busy to cope",
        "figures/figure-3.png",
        block_text(payload, 9, 3),
        "The central pie chart shows 87% answering yes and 13% no to trying to keep busy or become involved in an activity to cope. Side panels compare both groups’ sex, age, income, home ownership, race, driving, depression, activity limitation, health, and Wave 1 participation; asterisks mark significant mean differences.",
    )

    add_section(lines, "Discussion", [])
    add_section(lines, "Summary and Conclusions", discussion_summary, level=3)
    add_section(
        lines,
        "Evaluation of Activity, Disengagement, and Continuity Theories",
        evaluation,
        level=3,
    )
    add_section(lines, "Limitations and Future Research", limitations, level=3)
    add_section(lines, "Practical Applications and Implications", practical, level=3)
    add_section(lines, "References", references)

    document = "\n".join(lines).rstrip() + "\n"

    required_sentinels = [
        "1,532 individuals completed a baseline interview, yielding a 68% response rate",
        "sample of 297 older adults (217 women and 80 men)",
        "210 widowed persons and 87 nonwidowed controls",
        "unweighted sample size was 333, with 249 widowed persons and 84 controls",
        "Informal social participation (α = .52)",
        "Formal social participation (α = .71)",
        "Activity limitation (α = .77)",
        "depression (α = .81)",
        "Extraversion (α = .53)",
        "0.44 standard deviation units higher",
        "adjusted R² from .13 to .46",
        "from .16 to .29 for informal social participation",
        "A majority of widowed persons (71%)",
        "more than a third (35%)",
        "majority of widowed persons (87%)",
        "Widowhood × Sex interaction term was not significant",
        "continuity theory prevails as the most applicable theory",
        "little empirical support for activity theory",
        "Nor do the empirical results offer convincing support for the disengagement hypothesis",
    ]
    for sentinel in required_sentinels:
        if sentinel not in document:
            raise ValueError(f"Required source sentinel is missing: {sentinel}")

    image_sources = re.findall(r"!\[[^\]]*\]\((figures/[^)]+)\)", document)
    expected_images = [
        "figures/table-1.png",
        "figures/figure-1.png",
        "figures/table-2.png",
        "figures/table-3.png",
        "figures/figure-2.png",
        "figures/figure-3.png",
    ]
    if image_sources != expected_images:
        raise ValueError(f"Unexpected visual-asset sequence: {image_sources}")
    for relative_path in expected_images:
        if not (OUTPUT_PATH.parent / relative_path).is_file():
            raise FileNotFoundError(f"Missing visual asset: {relative_path}")

    forbidden = ["chatbot", "stt", "강의 녹음", "개인정보"]
    lowered = document.lower()
    for token in forbidden:
        if token.lower() in lowered:
            raise ValueError(f"Non-source material detected: {token}")
    return document


def main() -> None:
    payload = load_payload()
    document = build_document(payload)
    OUTPUT_PATH.write_text(document, encoding="utf-8")
    references = parse_references(payload)
    print(
        f"[written] {OUTPUT_PATH.relative_to(ROOT_DIR)} "
        f"({len(document.split()):,} whitespace words, {len(references)} references, 6 visual assets)"
    )


if __name__ == "__main__":
    main()
