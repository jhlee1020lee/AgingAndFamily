import json
import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
SLUG = "gruenewald-et-al-2016"
BLOCKS_PATH = ROOT_DIR / "tmp" / "pdf_blocks" / f"{SLUG}.json"
OUTPUT_PATH = ROOT_DIR / "content" / "readings" / SLUG / "full.md"


TRUE_HYPHENATED_BREAKS = {
    ("large", "scale"),
    ("middle", "aged"),
    ("non", "compliance"),
    ("self", "perceived"),
    ("self", "perceptions"),
    ("well", "being"),
}


LITERAL_CORRECTIONS = {
    "AARP Experience Corp.": "AARP Experience Corp.",
    "ClinicalTrials. gov": "ClinicalTrials.gov",
    "doi:10.1080/01 621459.1996.10476902": "doi:10.1080/01621459.1996.10476902",
    "doi:10.1016/j. cct.2013.05.003": "doi:10.1016/j.cct.2013.05.003",
    "doi: 10.1016/0895-4356(90)90237-j": "doi:10.1016/0895-4356(90)90237-j",
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

    for line in payload["pages"][7]["lines"]:
        x0, y0, _, _ = line["bbox"]
        if x0 >= 300 and 708 <= y0 <= 730:
            selected.append((8, "right", float(x0), float(y0), line["text"].strip()))

    for page_number in (9, 10):
        page_lines: list[tuple[int, str, float, float, str]] = []
        for line in payload["pages"][page_number - 1]["lines"]:
            x0, y0, _, _ = line["bbox"]
            if not 54 <= y0 <= 735:
                continue
            column = "left" if x0 < 295 else "right"
            page_lines.append(
                (page_number, column, float(x0), float(y0), line["text"].strip())
            )
        # The extractor already preserves each column's visual line order. Keep that
        # order so mixed-font fragments with slightly different y values (notably
        # the first reference's journal title) are not transposed.
        selected.extend(item for item in page_lines if item[1] == "left")
        selected.extend(item for item in page_lines if item[1] == "right")
    return selected


def parse_references(payload: dict) -> list[str]:
    selected = reference_lines(payload)
    expected_baselines = {
        (8, "right"): 306.64,
        (9, "left"): 54.64,
        (9, "right"): 306.64,
        (10, "left"): 54.64,
        (10, "right"): 306.64,
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
    if len(references) != 47:
        raise ValueError(f"Expected 47 references, found {len(references)}")
    if not references[0].startswith("An, J. S., & Cooney, T. M. (2006)."):
        raise ValueError("First reference sentinel did not match An and Cooney")
    if not references[-1].startswith("Yesavage, J. A., Brink, T. L., Rose, T. L."):
        raise ValueError("Last reference sentinel did not match Yesavage et al.")
    if not references[29].startswith("McAdams, D. P., & de St. Aubin, E. (1992)."):
        raise ValueError("Page 9-to-10 McAdams continuation was not joined")
    if not any(
        reference.startswith("Rothrauff, T., & Cooney, T. M. (2008).")
        and "and parents?" in reference
        for reference in references
    ):
        raise ValueError("Page 10 left-to-right Rothrauff continuation was not joined")
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
    objectives, method, results, discussion = split_on_markers(
        abstract,
        ["Method:", "Results:", "Discussion:"],
    )
    objectives = strip_prefix(objectives, "Objectives:")
    method = strip_prefix(method, "Method:")
    results = strip_prefix(results, "Results:")
    discussion = strip_prefix(discussion, "Discussion:")
    keywords = strip_prefix(block_text(payload, 1, 11), "Keywords:")

    introduction_all = join_continuation(
        block_text(payload, 1, 13),
        block_text(payload, 1, 14),
        block_text(payload, 2, 0),
    )
    introduction = split_on_markers(
        introduction_all,
        ["Desires to be generative and engagement in generative activity"],
    )

    experience_all = join_continuation(block_text(payload, 2, 2), block_text(payload, 2, 3))
    experience_corps = split_on_markers(
        experience_all,
        ["The EC program in Baltimore, MD"],
    )

    mental_physical = [block_text(payload, 2, 5), block_text(payload, 3, 0)]

    enhancing_start, enhancing_end_start = split_on_markers(
        block_text(payload, 3, 2),
        ["The aim of the current analysis is to evaluate"],
    )
    enhancing = [
        enhancing_start,
        join_continuation(enhancing_end_start, block_text(payload, 3, 3)),
    ]

    method_overview = block_text(payload, 3, 5)
    participants_all = join_continuation(block_text(payload, 3, 7), block_text(payload, 4, 0))
    participants = split_on_markers(
        participants_all,
        ["Control participants were referred to the Baltimore City Commission"],
    )

    materials = join_continuation(block_text(payload, 4, 2), block_text(payload, 4, 3))
    measures = strip_prefix(
        block_text(payload, 4, 4),
        "Perceptions of generative desire and achievement",
    )
    covariates = strip_prefix(
        block_text(payload, 4, 5),
        "Sociodemographic and health status covariates",
    )

    cace_method, assumptions = split_on_markers(
        block_text(payload, 5, 0),
        ["The use of CACE models to examine differences"],
    )
    analytic_first = join_continuation(
        strip_prefix(block_text(payload, 4, 6), "Analytic strategy"),
        cace_method,
    )
    dose, imputation, attrition = split_on_markers(
        block_text(payload, 5, 1),
        [
            "Sociodemographic and health status factors",
            "As detailed in Figure 1, there was a moderate degree of attrition",
        ],
    )
    analytic = [analytic_first, assumptions, dose, imputation, attrition]

    result_intro = block_text(payload, 5, 3)
    result_assumptions = join_continuation(block_text(payload, 5, 4), block_text(payload, 6, 0))
    result_effects = join_continuation(block_text(payload, 6, 1), block_text(payload, 7, 0))

    discussion_two, discussion_three_start = split_on_markers(
        block_text(payload, 7, 3),
        ["EC-induced enhancement of self-perceptions of generativity"],
    )
    discussion_three_end, limitations, strengths_start = split_on_markers(
        block_text(payload, 8, 0),
        [
            "There are some limitations of the present study.",
            "There are many notable strengths of this study.",
        ],
    )
    discussion_paragraphs = [
        block_text(payload, 7, 2),
        discussion_two,
        join_continuation(discussion_three_start, discussion_three_end),
        limitations,
        join_continuation(strengths_start, block_text(payload, 8, 1)),
    ]

    references = parse_references(payload)

    lines = [
        "# The Baltimore Experience Corps Trial: Enhancing Generativity via Intergenerational Activity Engagement in Later Life",
        "",
        "> Tara L. Gruenewald¹ · Elizabeth K. Tanner² · Linda P. Fried³ · Michelle C. Carlson⁴ · Qian-Li Xue⁵ · Jeanine M. Parisi⁶ · George W. Rebok⁶ · Lisa M. Yarnell⁷ · Teresa E. Seeman⁸",
        "",
        "> ¹ Davis School of Gerontology, University of Southern California, Los Angeles. ² Department of Community-Public Health at the Johns Hopkins School of Nursing, Johns Hopkins University, Baltimore, Maryland. ³ Mailman School of Public Health, Columbia University, New York, New York. ⁴ Departments of Mental Health and Epidemiology, Johns Hopkins University, Baltimore, Maryland. ⁵ Department of Epidemiology, Johns Hopkins Bloomberg School of Public Health, Baltimore, Maryland. ⁶ Department of Mental Health, Johns Hopkins University, Baltimore, Maryland. ⁷ American Institutes for Research, Washington, District of Columbia. ⁸ Department of Medicine, Division of Geriatrics, Geffen School of Medicine, University of California, Los Angeles.",
        "",
        "> *Journals of Gerontology: Psychological Sciences*, 71(4), 661–670 (2016). DOI: 10.1093/geronb/gbv005. Advance Access publication February 25, 2015.",
        "",
        "> Received July 29, 2014; Accepted December 22, 2014. Decision Editor: Shevaun Neupert, PhD.",
        "",
        "> Correspondence: Tara L. Gruenewald, PhD, MPH, Davis School of Gerontology, University of Southern California, 3715 McClintock Ave., Los Angeles, CA 90095-0191. E-mail: Tara.Gruenewald@usc.edu.",
        "",
        "> © The Author 2015. Published by Oxford University Press on behalf of The Gerontological Society of America. All rights reserved. For permissions, please e-mail: journals.permissions@oup.com.",
        "",
    ]

    add_section(
        lines,
        "Abstract",
        [
            f"**Objectives.** {objectives}",
            f"**Method.** {method}",
            f"**Results.** {results}",
            f"**Discussion.** {discussion}",
        ],
    )
    add_section(lines, "Keywords", [keywords])
    add_section(lines, "Introduction", ["Mature man needs to be needed . . . (Erikson, 1950)", *introduction])
    add_section(lines, "Experience Corps", experience_corps)
    add_section(lines, "Mental and Physical Well-Being Benefits of Generativity", mental_physical)
    add_section(lines, "Enhancing Self-Perceptions of Generativity", enhancing)

    add_section(lines, "Method", [method_overview])
    add_section(lines, "Participants", participants, level=3)
    add_asset(
        lines,
        "Figure 1: Baltimore Experience Corps Trial CONSORT participant flowchart",
        "figures/figure-1.png",
        "Figure 1. Baltimore Experience Corps Trial CONSORT flowchart.",
        "Of 2,675 people screened, 768 were excluded (609 not interested, 109 interested but younger than 60, and 50 interested but unable to commit 15 hr/wk), leaving 1,907 invited to an information meeting. Of those invited, 1,108 withdrew or did not attend; 799 were assessed, and 97 were excluded (69 did not meet inclusion criteria and 28 declined). The remaining 702 were randomized to the EC intervention (n = 352) or control (n = 350). In the EC arm, 284 received the intervention and 68 did not (41 self-withdrawal, 11 program selection, and 16 other reasons). Thirty EC participants were lost to follow-up (6 deaths and 24 dropouts), and 79 discontinued EC (1 death, 27 self-selection, 10 program selection, and 41 other reasons). All 350 control participants received the control assignment; 64 were lost to follow-up (9 deaths and 55 dropouts), and 20 discontinued control status (9 deaths and 11 crossovers to the intervention arm).",
    )
    add_section(lines, "Materials and Procedure", [materials], level=3)
    add_section(
        lines,
        "Perceptions of generative desire and achievement",
        [measures],
        level=3,
    )
    add_section(
        lines,
        "Sociodemographic and health status covariates",
        [covariates],
        level=3,
    )
    add_section(lines, "Analytic strategy", analytic, level=3)

    add_section(lines, "Results", [result_intro])
    add_asset(
        lines,
        "Table 1: participant characteristics for the entire cohort and randomized groups",
        "figures/table-1.png",
        "Table 1. Participant Characteristics.",
        "The table compares the entire cohort (n = 702), control participants (n = 350), and intervention participants (n = 352). It reports mean age 67.4 years in every group, 85% female in every group, race, education, income, Geriatric Depression Scale scores, and major morbidities. Exact means, standard deviations, percentages, category labels, and the table note are preserved in the source crop.",
    )
    add_asset(
        lines,
        "Table 2: generativity desire and achievement measures across four assessments",
        "figures/table-2.png",
        "Table 2. Generativity Measures.",
        "The table gives seven generative-desire items and six generative-achievement items for baseline (n = 701), 4 months (n = 589), 12 months (n = 538), and 24 months (n = 532). Desire subscale means (SDs) are 5.62 (.48), 5.62 (.47), 5.56 (.51), and 5.57 (.55), with alpha = .82; achievement means (SDs) are 5.18 (.82), 5.32 (.70), 5.23 (.76), and 5.30 (.75), with alpha = .90. Exact item wording and cells are preserved in the source crop.",
    )
    add_paragraphs(lines, [result_assumptions])
    add_asset(
        lines,
        "Table 3: ITT and graded-exposure CACE estimates for generativity outcomes",
        "figures/table-3.png",
        "Table 3. Regression Coefficients Representing Mean Difference in Experience Corps Intervention Versus Control Group Participants for Each Generativity Measure at the 4-, 12-, and 24-Month Evaluations in ITT and CACE Analyses Utilizing Graded Definitions of Exposure to Define Compliance With the Intervention.",
        "For generative desire and generative achievement at 4, 12, and 24 months, the table reports covariate-adjusted ITT estimates and CACE estimates using the 20th, 40th, 60th, and 80th exposure percentiles, with standard errors, Cohen's d effect sizes, significance marks, cumulative-hour cutpoints, and assumption flags. The printed footnote uses 65th-percentile labels for the 12- and 24-month cutpoints even though the column heading and analysis text specify 60th percentiles; the source crop preserves this wording exactly.",
    )
    add_paragraphs(lines, [result_effects])

    add_section(lines, "Discussion", discussion_paragraphs)
    add_section(lines, "Conclusion", [block_text(payload, 8, 3)])
    add_section(lines, "Funding", [block_text(payload, 8, 5)])
    add_section(lines, "Acknowledgments", [block_text(payload, 8, 7)])
    add_section(lines, "References", references)

    document = "\n".join(lines).rstrip() + "\n"

    required_sentinels = [
        "randomized to the intervention (n = 352) or control (n = 350) arms",
        "Postrandomization, 68 participants",
        "among the 284 of the 352 participants",
        "4 month (n = 593 [84.5%])",
        "12 month (n = 558 [79.5%])",
        "24 month (n = 560 [79.8%])",
        "accounting for 51.2%",
        "moderately correlated (r = .54)",
        "generative desire Cronbach’s alpha [α] = .82",
        "generative achievement α = .90",
        "20th percentile, 24-month model for generative desire",
        "60th percentile, 4-month",
        "40th percentile, 12-month",
        "40th percentile, 24-month",
        "Since the additivity assumption was not met for these three models",
        "dose–response relationship",
        "loss to follow-up (~15%–20% from 4- to 24-month evaluations)",
    ]
    for sentinel in required_sentinels:
        if sentinel not in document:
            raise ValueError(f"Required source sentinel is missing: {sentinel}")

    image_sources = re.findall(r"!\[[^\]]*\]\((figures/[^)]+)\)", document)
    expected_images = [
        "figures/figure-1.png",
        "figures/table-1.png",
        "figures/table-2.png",
        "figures/table-3.png",
    ]
    if image_sources != expected_images:
        raise ValueError(f"Unexpected figure/table image sequence: {image_sources}")
    for relative_path in expected_images:
        if not (OUTPUT_PATH.parent / relative_path).is_file():
            raise FileNotFoundError(f"Missing figure/table asset: {relative_path}")

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
        f"({len(document.split()):,} whitespace words, {len(references)} references, 4 assets)"
    )


if __name__ == "__main__":
    main()
