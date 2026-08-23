import json
import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
SLUG = "lee-yeung-2021"
BLOCKS_PATH = ROOT_DIR / "tmp" / "pdf_blocks" / f"{SLUG}.json"
OUTPUT_PATH = ROOT_DIR / "content" / "readings" / SLUG / "full.md"


TRUE_HYPHENATED_BREAKS = {
    ("discrete", "time"),
    ("lewin", "epstein"),
    ("self", "employed"),
    ("socio", "economic"),
    ("time", "squeeze"),
    ("work", "retirement"),
}


LITERAL_CORRECTIONS = {
    "lifetime earrings": "lifetime earnings",
    "doi:10.1016/j. alcr.2019.02.004": "doi:10.1016/j.alcr.2019.02.004",
    "doi:10.1016/j. socscimed.2018.05.026": "doi:10.1016/j.socscimed.2018.05.026",
    "doi:10.1163/1569 14911X582413": "doi:10.1163/156914911X582413",
    "http://dx.doi. org/10.1787/pension_glance.": "http://dx.doi.org/10.1787/pension_glance.",
    "e−0.11 = 0.90": "e^(−0.11) = 0.90",
    "e−0.39 = 0.68": "e^(−0.39) = 0.68",
    "e−0.02 = 0.98": "e^(−0.02) = 0.98",
    "e−0.03 = 0.97": "e^(−0.03) = 0.97",
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
    value = value.replace("\u2010", "-").replace("\u2011", "-")
    value = value.replace(". . .", "__SPACED_ELLIPSIS__")
    value = re.sub(r"\s+", " ", value).strip()
    for source, target in LITERAL_CORRECTIONS.items():
        value = value.replace(source, target)
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
    value = value.replace("__SPACED_ELLIPSIS__", ". . .")
    return value.strip()


def append_wrapped_line(value: str, next_line: str) -> str:
    next_line = next_line.replace("\ufb01 ", "fi").replace("\ufb02 ", "fl")
    next_line = next_line.replace("\ufb01", "fi").replace("\ufb02", "fl")
    next_line = next_line.replace("\u2010", "-").replace("\u2011", "-")
    if value.endswith(("/", "–")):
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
        raise ValueError(f"Expected prefix {normalized_prefix!r}, found {value[:120]!r}")
    return normalize_text(value[len(normalized_prefix) :])


def split_on_markers(value: str, markers: list[str]) -> list[str]:
    remaining = normalize_text(value)
    parts: list[str] = []
    for marker in markers:
        normalized_marker = normalize_text(marker)
        position = remaining.find(normalized_marker)
        if position <= 0:
            raise ValueError(
                f"Split marker {normalized_marker!r} not found after text: {remaining[:220]!r}"
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

    page_12_lines: list[tuple[int, str, float, float, str]] = []
    for line in payload["pages"][11]["lines"]:
        x0, y0, _, _ = line["bbox"]
        if x0 > 550:
            continue
        if x0 < 295 and not 710 <= y0 <= 735:
            continue
        if x0 >= 295 and not 53 <= y0 <= 735:
            continue
        if x0 < 295 or x0 >= 300:
            column = "left" if x0 < 295 else "right"
            page_12_lines.append((12, column, float(x0), float(y0), line["text"].strip()))
    selected.extend(item for item in page_12_lines if item[1] == "left")
    selected.extend(item for item in page_12_lines if item[1] == "right")

    for page_number in (13, 14):
        page_lines: list[tuple[int, str, float, float, str]] = []
        for line in payload["pages"][page_number - 1]["lines"]:
            x0, y0, _, _ = line["bbox"]
            if x0 > 550:
                continue
            if not 53 <= y0 <= 720:
                continue
            column = "left" if x0 < 295 else "right"
            page_lines.append(
                (page_number, column, float(x0), float(y0), line["text"].strip())
            )
        selected.extend(item for item in page_lines if item[1] == "left")
        selected.extend(item for item in page_lines if item[1] == "right")
    return selected


def parse_references(payload: dict) -> list[str]:
    selected = reference_lines(payload)
    expected_baselines = {
        (12, "left"): 54.64,
        (12, "right"): 306.64,
        (13, "left"): 54.64,
        (13, "right"): 306.64,
        (14, "left"): 54.64,
        (14, "right"): 306.64,
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
        starts_reference = x0 <= expected_baselines[(page_number, column)] + 4.5
        cleaned = normalize_text(text)
        if starts_reference:
            references.append(cleaned)
        elif not references:
            raise ValueError(f"Reference continuation before first entry on page {page_number}")
        else:
            references[-1] = join_continuation(references[-1], cleaned)

    references = [normalize_text(reference) for reference in references]
    if len(references) != 56:
        raise ValueError(f"Expected 56 references, found {len(references)}")
    if not references[0].startswith("Aaron, H. J., & Jean, M. C. (2011)."):
        raise ValueError("First reference sentinel did not match Aaron and Jean")
    if not references[15].startswith("Higgs, P., Mein, G., Ferrie, J."):
        raise ValueError("Page 12-to-13 Higgs continuation was not joined")
    if not references[47].startswith("Steele, F.(2011)."):
        raise ValueError("Page 13 right-column ending sentinel did not match Steele")
    if not references[-1].startswith("Yoon, H. S. (2013)."):
        raise ValueError("Last reference sentinel did not match Yoon")
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
    abstract = block_text(payload, 1, 10)
    objectives, methods, results, discussion = split_on_markers(
        abstract,
        ["Methods:", "Results:", "Discussion:"],
    )
    objectives = strip_prefix(objectives, "Objectives:")
    methods = strip_prefix(methods, "Methods:")
    results = strip_prefix(results, "Results:")
    discussion = strip_prefix(discussion, "Discussion:")
    keywords = strip_prefix(block_text(payload, 1, 11), "Keywords:")

    intro_page_1_first, intro_page_1_second = split_on_markers(
        block_text(payload, 1, 13),
        ["In order to have a clear idea about the changing nature"],
    )
    intro_page_2_first, intro_page_2_second = split_on_markers(
        block_text(payload, 2, 0),
        ["This study aims to bridge the gap in knowledge"],
    )
    introduction = [
        join_continuation(block_text(payload, 1, 12), intro_page_1_first),
        intro_page_1_second,
        intro_page_2_first,
        intro_page_2_second,
    ]

    work_health, work_financial, work_opposing = split_on_markers(
        block_text(payload, 2, 3),
        [
            "Financial preparedness for retirement",
            "There can be opposing factors associated with career characteristics",
        ],
    )
    work_opposing_end, work_gender = split_on_markers(
        block_text(payload, 3, 0),
        ["Men and women may differ in their career trajectories."],
    )
    work_experiences = [
        block_text(payload, 2, 2),
        work_health,
        work_financial,
        join_continuation(work_opposing, work_opposing_end),
        work_gender,
    ]

    family_opening_end, family_gender, family_children, family_transfer_start = split_on_markers(
        block_text(payload, 3, 3),
        [
            "The response of women to change in marital status",
            "It is well documented that parents with children",
            "The contribution of the children’s resources to the retirement",
        ],
    )
    family_circumstances = [
        join_continuation(block_text(payload, 3, 2), family_opening_end),
        family_gender,
        family_children,
        join_continuation(family_transfer_start, block_text(payload, 4, 0)),
    ]

    context_pension, context_boap, context_rates, context_gender_start = split_on_markers(
        block_text(payload, 4, 2),
        [
            "The Basic Old-Age Pension (BOAP) program",
            "Older adults in Korea have reported",
            "Significant institutional barriers in the Korean labor market",
        ],
    )
    context_gender_end, context_private, context_hypotheses = split_on_markers(
        block_text(payload, 4, 3),
        [
            "Given the lack of provision from a public pension",
            "Based on this context, we aim to explore six relevant hypotheses.",
        ],
    )
    context = [
        context_pension,
        context_boap,
        context_rates,
        join_continuation(context_gender_start, context_gender_end),
        context_private,
        context_hypotheses,
    ]

    data_opening_end, data_sample, data_attrition = split_on_markers(
        block_text(payload, 5, 0),
        [
            "The sample is restricted to individuals aged 50–64 years",
            "Among the sample, 14.3% of the respondents",
        ],
    )
    data = [
        join_continuation(block_text(payload, 4, 5), data_opening_end),
        data_sample,
        data_attrition,
    ]

    measures = join_continuation(block_text(payload, 5, 2), block_text(payload, 5, 3))
    explanatory_work, explanatory_mechanisms, explanatory_family = split_on_markers(
        block_text(payload, 5, 5),
        [
            "The mechanisms underlying the relationship between work experience",
            "Family environments are measured by marital status",
        ],
    )
    explanatory = [
        explanatory_work,
        explanatory_mechanisms,
        explanatory_family,
        block_text(payload, 6, 0),
    ]

    analysis_models, analysis_gender, analysis_model_sequence = split_on_markers(
        block_text(payload, 6, 2),
        [
            "We test gender differences in the life experiences",
            "We focus on incentives and disincentives to remain in the labor force",
        ],
    )
    analysis_model_sequence = join_continuation(
        analysis_model_sequence,
        block_text(payload, 6, 3),
    )

    result_descriptive, result_interactions, result_women_start = split_on_markers(
        block_text(payload, 6, 15),
        [
            "We found significant interaction terms with gender",
            "In Table 3, Models 1, 2, and 3 show coefficients",
        ],
    )
    result_women_career_end, result_women_health_start = split_on_markers(
        block_text(payload, 7, 0),
        ["Women with poorer health were less likely to remain in the labor force."],
    )
    result_women_health_end, result_women_family_start = split_on_markers(
        block_text(payload, 7, 1),
        ["For women, the most important factors predicting labor force transitions"],
    )
    result_women_family_end, result_women_random_start = split_on_markers(
        block_text(payload, 8, 0),
        ["Significant variance component and random effect deviation factors"],
    )
    result_women_career = join_continuation(result_women_start, result_women_career_end)
    result_women_health = join_continuation(result_women_health_start, result_women_health_end)
    result_women_family = join_continuation(result_women_family_start, result_women_family_end)
    result_women_random = join_continuation(result_women_random_start, block_text(payload, 8, 1))

    result_men_career_end, result_men_model_2_start = split_on_markers(
        block_text(payload, 9, 1),
        ["Model 2 shows that health status and financial resources"],
    )
    result_men_career = join_continuation(
        block_text(payload, 8, 2),
        block_text(payload, 9, 0),
        result_men_career_end,
    )
    result_men_model_2_end, result_men_family_start = split_on_markers(
        block_text(payload, 10, 0),
        ["The odds of moving into retirement were lower for married men"],
    )
    result_men_model_2 = join_continuation(result_men_model_2_start, result_men_model_2_end)
    result_men_random_start, result_men_random = split_on_markers(
        block_text(payload, 11, 0),
        ["The variances of random effects indicate that there was"],
    )
    result_men_family = join_continuation(
        result_men_family_start,
        block_text(payload, 10, 1),
        result_men_random_start,
    )

    discussion_intro, discussion_careers, discussion_manual_start = split_on_markers(
        block_text(payload, 11, 2),
        [
            "We find that the decision to work until a later age",
            "The findings support the hypothesis that workers who have skilled manual jobs",
        ],
    )
    discussion_manual_end, discussion_self_employment, discussion_family, discussion_disparities_start = split_on_markers(
        block_text(payload, 11, 3),
        [
            "We also find that the negative relationship between previous self-employment spells",
            "This study demonstrates gender differences in the effects of family circumstances",
            "The current research reveals social disparities in work-retirement transitions",
        ],
    )
    discussion_disparities_end, discussion_limitations, discussion_implications = split_on_markers(
        block_text(payload, 12, 0),
        [
            "This study has some limitations.",
            "Despite these limitations, the current study extends our understanding",
        ],
    )
    discussion_paragraphs = [
        discussion_intro,
        discussion_careers,
        join_continuation(discussion_manual_start, discussion_manual_end),
        discussion_self_employment,
        discussion_family,
        join_continuation(discussion_disparities_start, discussion_disparities_end),
        discussion_limitations,
        discussion_implications,
    ]

    references = parse_references(payload)

    lines = [
        "# The Country That Never Retires: The Gendered Pathways to Retirement in South Korea",
        "",
        "> Yeonjin Lee, PhD¹˒²* and Wei-Jun Jean Yeung, PhD³˒⁴˒⁵",
        "",
        "> ¹ Department of Social Work and Social Administration, The University of Hong Kong. ² School of Public Health, LKS Faculty of Medicine, The University of Hong Kong. ³ Department of Sociology, National University of Singapore. ⁴ Asia Research Institute, National University of Singapore. ⁵ Centre for Family and Population Research, National University of Singapore.",
        "",
        "> *Journals of Gerontology: Social Sciences*. Cite as: *J Gerontol B Psychol Sci Soc Sci*, 2021, Vol. 76, No. 3, 642–655. doi:10.1093/geronb/gbaa016. Advance Access publication February 6, 2020.",
        "",
        "> Received: February 6, 2019; Editorial Decision Date: January 6, 2020.",
        "",
        "> Decision Editor: James Raymo, PhD.",
        "",
        "> *Address correspondence to:* Yeonjin Lee, PhD. E-mail: yjinl@hku.hk",
        "",
        "> © The Author(s) 2020. Published by Oxford University Press on behalf of The Gerontological Society of America. All rights reserved. For permissions, please e-mail: journals.permissions@oup.com.",
        "",
    ]

    add_section(
        lines,
        "Abstract",
        [
            f"**Objectives.** {objectives}",
            f"**Methods.** {methods}",
            f"**Results.** {results}",
            f"**Discussion.** {discussion}",
        ],
    )
    add_section(lines, "Keywords", [keywords])
    add_section(lines, "Introduction", introduction)
    add_section(lines, "Work Experiences", work_experiences)
    add_section(lines, "Family Circumstances", family_circumstances)
    add_section(lines, "Context Matters: Pension System and Labor Force Participation", context)
    add_section(lines, "Data", data)
    add_section(lines, "Measures", [measures])
    add_section(lines, "Explanatory Variables", explanatory)

    add_section(lines, "Statistical Analysis", [analysis_models, analysis_gender, analysis_model_sequence])
    lines.extend(
        [
            "> ln [pᵃᵢₜ / 1 − pᵃᵢₜ] = αᵃDᵢₜ + βᵃXᵢ + δᵃYᵢₜ + γᵃZᵢₜ + uᵃᵢ + eᵃᵢₜ",
            "",
            "> ln [pᵇᵢₜ / 1 − pᵇᵢₜ] = αᵇDᵢₜ + βᵇXᵢ + δᵇYᵢₜ + γᵇZᵢₜ + uᵇᵢ + eᵇᵢₜ",
            "",
        ]
    )
    add_paragraphs(lines, [block_text(payload, 6, 13)])

    add_section(lines, "Results", [result_descriptive])
    add_asset(
        lines,
        "Table 1: descriptive statistics for women by labor force status",
        "figures/table-1.png",
        "Table 1. Descriptive Statistics of Characteristics Among Women by Labor Force Status.",
        "The table compares total, in-the-labor-force, and not-in-the-labor-force observations for women. Change in labor status is .20 overall, .16 among those in the labor force, and .25 among those outside it; the corresponding person-years are 10,414, 6,528, and 3,886. The source crop preserves all age, education, occupational class, job-duration, self-employment, health, wealth, pension, spouse, child-coresidence, transfer, fertility, and region cells.",
    )
    add_asset(
        lines,
        "Table 2: descriptive statistics for men by labor force status",
        "figures/table-2.png",
        "Table 2. Descriptive Statistics of Characteristics Among Men by Labor Force Status.",
        "The table compares total, in-the-labor-force, and not-in-the-labor-force observations for men. Change in labor status is .14 overall, .13 among those in the labor force, and .16 among those outside it; the corresponding person-years are 16,106, 12,301, and 3,805. The source crop preserves all age, education, occupational class, job-duration, self-employment, health, wealth, pension, spouse, child-coresidence, transfer, fertility, and region cells.",
    )
    add_paragraphs(lines, [result_interactions])
    add_asset(
        lines,
        "Table 3: multilevel discrete-time model estimates for women",
        "figures/table-3.png",
        "Table 3. Parameter Estimates of Multilevel Discrete-Time Models with Person-Level Random Effects of Women.",
        "Models 1–3 each report labor-force reentry and exit coefficients with standard errors. Model 3 includes work experiences, proximate correlates, and family circumstances; its child-coresidence and upward-transfer coefficients retain their signs, significance marks, and reference groups. Random-effect correlations are .49 in all three models. The note states that age, education, number of children, region, and time spells are controlled in all models and defines ** as p < .01 and * as p < .05. Exact cells are preserved in the source crop.",
    )
    add_paragraphs(
        lines,
        [
            result_women_career,
            result_women_health,
            result_women_family,
            result_women_random,
        ],
    )
    add_asset(
        lines,
        "Table 4: multilevel discrete-time model estimates for men",
        "figures/table-4.png",
        "Table 4. Parameter Estimates of Multilevel Discrete-Time Models with Person-Level Random Effects of Men.",
        "Models 1–3 each report labor-force reentry and exit coefficients with standard errors. Across models, skilled manual work is positively associated with reentry and negatively associated with exit, longer tenure predicts lower reentry, and more self-employment years predict lower exit; Model 3 adds spouse and child measures. Random-effect correlations are .44 in all three models. The note states that age, education, number of children, region, and time spells are controlled in all models and defines ** as p < .01 and * as p < .05. Exact cells are preserved in the source crop.",
    )
    add_paragraphs(
        lines,
        [result_men_career, result_men_model_2, result_men_family, result_men_random],
    )

    add_section(lines, "Discussion", discussion_paragraphs)
    add_section(lines, "Supplementary Material", [block_text(payload, 12, 2)])
    add_section(lines, "Funding", [block_text(payload, 12, 4)])
    add_section(lines, "Conflict of Interest", [block_text(payload, 12, 6)])
    add_section(lines, "References", references)

    document = "\n".join(lines).rstrip() + "\n"

    required_sentinels = [
        "survey, the Korean Longitudinal Study of Aging (KLoSA)",
        "survey was conducted in 2006",
        "followed the respondents until 2016",
        "final sample for this study consists of 2,600 individuals",
        "including 1,579 men and 1,021 women",
        "contributing 26,520 person years of observations",
        "ln [pᵃᵢₜ / 1 − pᵃᵢₜ]",
        "ln [pᵇᵢₜ / 1 − pᵇᵢₜ]",
        "around 16% left their job while around 25%",
        "around 13% exited the labor force while around 16% re-entered",
        "interaction term: coeff. = −0.02, p < .001",
        "The odds ratio of the labor force exit of nonpartnered women was around 39% lower",
        "Coresidence with unmarried adult offspring was related to a 42% increase",
        "Positive correlation between random effects (ρ = 0.49)",
        "the odds of labor force exit were reduced by approximately 22%",
        "strong and positive correlation (ρ = 0.44)",
        "Supplementary data is available",
        "None reported.",
    ]
    for sentinel in required_sentinels:
        if sentinel not in document:
            raise ValueError(f"Required source sentinel is missing: {sentinel}")

    image_sources = re.findall(r"!\[[^\]]*\]\((figures/[^)]+)\)", document)
    expected_images = [
        "figures/table-1.png",
        "figures/table-2.png",
        "figures/table-3.png",
        "figures/table-4.png",
    ]
    if image_sources != expected_images:
        raise ValueError(f"Unexpected table image sequence: {image_sources}")
    for relative_path in expected_images:
        if not (OUTPUT_PATH.parent / relative_path).is_file():
            raise FileNotFoundError(f"Missing table asset: {relative_path}")

    forbidden = [
        "Downloaded from https://academic.oup.com",
        "Seoul National University user",
        "chatbot",
        "stt",
        "transcript",
        "lecture recording",
        "강의 녹음",
        "개인정보",
    ]
    lowered = document.lower()
    for token in forbidden:
        if token.lower() in lowered:
            raise ValueError(f"Non-source or private material detected: {token}")
    return document


def main() -> None:
    payload = load_payload()
    document = build_document(payload)
    OUTPUT_PATH.write_text(document, encoding="utf-8")
    references = parse_references(payload)
    print(
        f"[written] {OUTPUT_PATH.relative_to(ROOT_DIR)} "
        f"({len(document.split()):,} whitespace words, {len(references)} references, 4 table assets)"
    )


if __name__ == "__main__":
    main()
