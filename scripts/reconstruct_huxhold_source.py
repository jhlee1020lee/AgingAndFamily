import json
import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
SLUG = "huxhold-et-al-2014"
BLOCKS_PATH = ROOT_DIR / "tmp" / "pdf_blocks" / f"{SLUG}.json"
OUTPUT_PATH = ROOT_DIR / "content" / "readings" / SLUG / "full.md"


TRUE_HYPHENATED_BREAKS = {
    ("6", "year"),
    ("age", "related"),
    ("community", "dwelling"),
    ("cohort", "sequential"),
    ("cross", "sectional"),
    ("elder", "helping"),
    ("family", "based"),
    ("family", "focused"),
    ("follow", "up"),
    ("friend", "based"),
    ("high", "quality"),
    ("in", "home"),
    ("long", "term"),
    ("low", "quality"),
    ("middle", "aged"),
    ("motel", "klingebiel"),
    ("population", "based"),
    ("resource", "driven"),
    ("self", "rated"),
    ("self", "regulatory"),
    ("short", "term"),
    ("shiovitz", "ezra"),
    ("small", "to"),
    ("socio", "emotional"),
    ("well", "being"),
}


LITERAL_CORRECTIONS = {
    "< once per month": "<once per month",
    "T1/ T2": "T1/T2",
    "T1/ T2": "T1/T2",
    "T1/\u00a0T2": "T1/T2",
    "P25P32": "P25–P32",
    "D., . . . Azen": "D., … Azen",
    "doi:10.10371040-3590.5.2.164": "doi:10.1037/1040-3590.5.2.164",
    "1999. tb00187.x": "1999.tb00187.x",
    "528– 547": "528–547",
    "dual−change": "dual-change",
    "middle−aged": "middle-aged",
}


def load_payload() -> dict:
    return json.loads(BLOCKS_PATH.read_text(encoding="utf-8"))


def lookup_block(payload: dict, page_number: int, block_index: int) -> str:
    for block in payload["pages"][page_number - 1]["blocks"]:
        if block["block_index"] == block_index:
            return block["text"]
    raise KeyError(f"Missing page {page_number} block {block_index}")


def normalize_text(text: str) -> str:
    value = re.sub(r"\s+", " ", text.replace("\u00a0", " ")).strip()
    for source, target in LITERAL_CORRECTIONS.items():
        value = value.replace(source, target)
    value = value.replace("Δχ2", "Δχ²").replace("χ2", "χ²")
    value = re.sub(r"\s+([,.;:?!])", r"\1", value)
    value = re.sub(r"\s*=\s*", " = ", value)
    value = re.sub(r"([<>])\s*([.=]?\d)", r"\1 \2", value)
    return value


def append_wrapped_line(value: str, next_line: str) -> str:
    if value.endswith("/"):
        return value + next_line
    match = re.search(r"([A-Za-z]+|\d+)-$", value)
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
        raise ValueError(f"Expected prefix {normalized_prefix!r}, found {value[:100]!r}")
    return normalize_text(value[len(normalized_prefix) :])


def split_on_markers(value: str, markers: list[str]) -> list[str]:
    remaining = normalize_text(value)
    parts: list[str] = []
    for marker in markers:
        position = remaining.find(marker)
        if position <= 0:
            raise ValueError(f"Split marker {marker!r} not found after text: {remaining[:180]!r}")
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


def reference_lines(payload: dict) -> list[tuple[int, str, float, str]]:
    selected: list[tuple[int, str, float, str]] = []
    for page_number in (9, 10):
        for line in payload["pages"][page_number - 1]["lines"]:
            x0, y0, _, _ = line["bbox"]
            if page_number == 9:
                if x0 < 290 and y0 < 450:
                    continue
                if x0 >= 290 and y0 < 65:
                    continue
            elif y0 < 65:
                continue
            if y0 > 730:
                continue
            column = "left" if x0 < 290 else "right"
            selected.append((page_number, column, float(x0), line["text"].strip()))
    return selected


def parse_references(payload: dict) -> list[str]:
    selected = reference_lines(payload)
    baselines: dict[tuple[int, str], float] = {}
    for page_number, column, x0, _ in selected:
        key = (page_number, column)
        baselines[key] = min(x0, baselines.get(key, x0))

    references: list[str] = []
    for page_number, column, x0, text in selected:
        key = (page_number, column)
        starts_reference = x0 <= baselines[key] + 4.5
        cleaned = normalize_text(text)
        if starts_reference:
            references.append(cleaned)
        elif not references:
            raise ValueError(f"Reference continuation before first entry on page {page_number}")
        else:
            references[-1] = join_continuation(references[-1], cleaned)

    if len(references) != 53:
        raise ValueError(f"Expected 53 references, found {len(references)}")
    return references


def add_paragraphs(lines: list[str], paragraphs: list[str]) -> None:
    for paragraph in paragraphs:
        lines.extend([normalize_text(paragraph), ""])


def add_section(lines: list[str], heading: str, paragraphs: list[str], level: int = 2) -> None:
    lines.extend([f"{'#' * level} {heading}", ""])
    add_paragraphs(lines, paragraphs)


def build_document(payload: dict) -> str:
    intro_left = "S" + block_text(payload, 1, 13)
    intro_1, intro_2_start = split_on_markers(intro_left, ["Participating in social activities"])
    intro_right = block_text(payload, 1, 14)
    intro_2_end, intro_3, intro_4 = split_on_markers(
        intro_right,
        ["However, activity engagement", "Furthermore, a key aspect"],
    )

    family_start = strip_prefix(
        block_text(payload, 1, 15),
        "Differential Effects of Social Interactions With Family and Friends",
    )
    family_page_2 = block_text(payload, 2, 1)
    family_continuation, family_2, family_3, family_4_start = split_on_markers(
        family_page_2,
        [
            "However, it has also been proposed",
            "Social interactions with kin or nonkin",
            "Social interactions with family members or friends differ",
        ],
    )
    family_4 = join_continuation(family_4_start, block_text(payload, 2, 2))

    age_effects = strip_prefix(
        block_text(payload, 2, 3),
        "Do the Effects of Informal Social Activities Change With Age?",
    )
    age_effect_1, age_effect_2 = split_on_markers(age_effects, ["Socioemotional selectivity theory predicts"])

    aims_start = strip_prefix(block_text(payload, 2, 4), "Aims and Hypotheses")
    aims = join_continuation(aims_start, block_text(payload, 3, 1))
    hypotheses = split_on_markers(block_text(payload, 3, 2), ["H2:", "H3:"])

    sample = strip_prefix(block_text(payload, 3, 4), "Sample")
    measures_intro = strip_prefix(block_text(payload, 3, 5), "Measures")
    activities = join_continuation(
        strip_prefix(block_text(payload, 3, 6), "Social activities.—"),
        block_text(payload, 3, 7),
    )
    subjective_wellbeing = strip_prefix(block_text(payload, 3, 8), "Subjective well-being.—")
    controls = strip_prefix(block_text(payload, 3, 9), "Control variables.—")

    analyses = strip_prefix(block_text(payload, 3, 10), "Statistical Analyses")
    analyses_1, analyses_2, analyses_3_start = split_on_markers(
        analyses,
        ["To evaluate measurement invariance", "LCS decomposes the score"],
    )
    analyses_3 = join_continuation(analyses_3_start, block_text(payload, 4, 1))

    age_group_results = strip_prefix(
        block_text(payload, 4, 3),
        "Age Group Differences in Informal Social Activities",
    )
    differential_start = strip_prefix(
        block_text(payload, 4, 4),
        "Differential Effects of Informal Social Activities on Changes in SWB",
    )
    differential_page_5 = block_text(payload, 5, 1)
    differential_continuation, differential_2, differential_3 = split_on_markers(
        differential_page_5,
        ["We examined if levels", "The overall model fit"],
    )
    differential_1 = join_continuation(differential_start, differential_continuation)
    middle_group = join_continuation(
        strip_prefix(block_text(payload, 5, 2), "Middle-aged group (40–64 years).—"),
        block_text(payload, 5, 3),
    )
    older_group = join_continuation(
        strip_prefix(block_text(payload, 5, 4), "Older age group (65 years and older).—"),
        block_text(payload, 7, 1),
    )

    discussion = strip_prefix(block_text(payload, 7, 2), "Discussion")
    discussion_1, discussion_2 = split_on_markers(discussion, ["Our results imply"])
    h1 = block_text(payload, 7, 3)
    h1_discussion = join_continuation(block_text(payload, 7, 4), block_text(payload, 7, 5))
    h2 = block_text(payload, 7, 6)
    h2_discussion = block_text(payload, 7, 7)
    h3 = block_text(payload, 7, 8)

    h3_page_7 = block_text(payload, 7, 9)
    h3_1, h3_2, h3_3_start = split_on_markers(
        h3_page_7,
        ["High levels of social activities", "Social activities were unrelated to NA"],
    )
    h3_page_8_left = block_text(payload, 8, 1)
    h3_3_end, h3_4, h3_5_start = split_on_markers(
        h3_page_8_left,
        ["Our finding is in contrast", "The finding that social activities with family members"],
    )
    h3_3 = join_continuation(h3_3_start, h3_3_end)
    h3_5 = join_continuation(h3_5_start, block_text(payload, 8, 2))

    limitations = strip_prefix(block_text(payload, 8, 3), "Limitations and Strengths")
    limitation_1, limitation_2 = split_on_markers(limitations, ["Moreover, our measures"])

    conclusion = strip_prefix(block_text(payload, 9, 1), "Implications and Conclusion")
    funding = strip_prefix(block_text(payload, 9, 2), "Funding")
    correspondence = strip_prefix(block_text(payload, 9, 3), "Correspondence")
    references = parse_references(payload)

    abstract_objectives = strip_prefix(block_text(payload, 1, 7), "Objectives.")
    abstract_method = strip_prefix(block_text(payload, 1, 8), "Method.")
    abstract_results = strip_prefix(block_text(payload, 1, 9), "Results.")
    abstract_discussion = strip_prefix(block_text(payload, 1, 10), "Discussion.")
    keywords = strip_prefix(block_text(payload, 1, 11), "Key Words:")

    lines = [
        "# Benefits of Having Friends in Older Ages: Differential Effects of Informal Social Activities on Well-Being in Middle-Aged and Older Adults",
        "",
        "> Oliver Huxhold¹ · Martina Miche¹,² · Benjamin Schüz³",
        "",
        "> ¹ German Centre of Gerontology, Berlin, Germany. ² Department of Psychological Aging Research, Institute of Psychology, Heidelberg University, Germany. ³ School of Psychology, University of Tasmania, Australia.",
        "",
        "> *The Journals of Gerontology, Series B: Psychological Sciences and Social Sciences*, 69(3), 366–375 (2014). DOI: 10.1093/geronb/gbt029. Advance Access publication May 16, 2013.",
        "",
        "> Received August 14, 2012; Accepted March 26, 2013. Decision Editor: Bob Knight, PhD.",
        "",
        "> © The Author 2013. Published by Oxford University Press on behalf of The Gerontological Society of America. All rights reserved. For permissions, please e-mail: journals.permissions@oup.com.",
        "",
    ]

    add_section(lines, "Abstract", [
        f"**Objectives.** {abstract_objectives}",
        f"**Method.** {abstract_method}",
        f"**Results.** {abstract_results}",
        f"**Discussion.** {abstract_discussion}",
    ])
    add_section(lines, "Key Words", [keywords])
    add_paragraphs(lines, [
        intro_1,
        join_continuation(intro_2_start, intro_2_end),
        intro_3,
        intro_4,
    ])

    add_section(
        lines,
        "Differential Effects of Social Interactions With Family and Friends",
        [join_continuation(family_start, family_continuation), family_2, family_3, family_4],
    )
    add_section(
        lines,
        "Do the Effects of Informal Social Activities Change With Age?",
        [age_effect_1, age_effect_2],
    )
    add_section(lines, "Aims and Hypotheses", [aims])
    for hypothesis in hypotheses:
        lines.extend([f"> {hypothesis}", ""])

    add_section(lines, "Methods", [])
    add_section(lines, "Sample", [sample], level=3)
    add_section(lines, "Measures", [measures_intro], level=3)
    add_section(lines, "Social activities", [activities], level=4)
    add_section(lines, "Subjective well-being", [subjective_wellbeing], level=4)
    add_section(lines, "Control variables", [controls], level=4)
    add_section(lines, "Statistical Analyses", [analyses_1, analyses_2, analyses_3], level=3)
    lines.extend([
        "![Figure 1. Bivariate dual-change score model](figures/figure-1.png)",
        "",
        "Figure 1. Illustration of a bivariate dual-change score model with two waves of measurement controlled for age, sex, education, self-rated health, and functional health. A and B = factors A or B; ΔA and ΔB = change in factor A or B; α = correlation at T1; β¹A → ΔA = autoregression of factor A (regression of change in A on interindividual differences in A at T1); β²B → ΔB = autoregression of factor B (regression of change in B on interindividual differences in B at T1); β³A → ΔB = directional effect (regression of change in B on interindividual differences in A at T1); β⁴B → ΔA = directional effect (regression of change in A on interindividual differences in B at T1); β⁵ΔA → ΔB = regression of change in ΔB on change in ΔA. Accessibility description: At T1 and T2, latent factors A and B are connected to change factors ΔA and ΔB by autoregressive, directional, and change-correlation paths. Age, sex, partner status, education, self-rated health, and functional health enter as covariates.",
        "",
    ])

    add_section(lines, "Results", [])
    add_section(lines, "Age Group Differences in Informal Social Activities", [age_group_results], level=3)
    lines.extend([
        "![Figure 2. Informal social activity frequencies by age group, source, and time](figures/figure-2.png)",
        "",
        "Figure 2. Mean differences in the frequency to engage in informal social activities by age group (i.e., middle-aged adults vs. older adults), by source (i.e., family members vs. friends), and time point (i.e., T1 vs. T2). Accessibility description: At both waves, middle-aged adults report more activities than older adults and activities with friends exceed activities with family. Both activity types decline from T1 to T2; the decline in family activities is visibly larger among older adults.",
        "",
    ])
    add_section(
        lines,
        "Differential Effects of Informal Social Activities on Changes in SWB",
        [differential_1, differential_2, differential_3],
        level=3,
    )
    lines.extend([
        "![Table 1. Predictors of six-year changes in subjective well-being](figures/table-1.png)",
        "",
        "Table 1. Predictors of 6-Year Changes in Subjective Well-Being (SWB) in Middle-Aged and Older Adults. Notes: r = correlation coefficient; n/a = not applicable. Intercepts cannot be interpreted directly. Path coefficients are reported as standardized β coefficients. *p < .05. Accessibility description: The table presents parallel middle-aged and older-adult columns for six-year changes in life satisfaction, positive affect, negative affect, family activities, and friend activities. Rows report intercepts, residual variances, T1 predictor levels, controls, and correlations among change scores; bold starred coefficients are statistically significant.",
        "",
    ])
    add_section(lines, "Middle-aged group (40–64 years)", [middle_group], level=4)
    add_section(lines, "Older age group (65 years and older)", [older_group], level=4)

    add_section(lines, "Discussion", [discussion_1, discussion_2])
    lines.extend([f"> {h1}", "", h1_discussion, ""])
    lines.extend([f"> {h2}", "", h2_discussion, ""])
    lines.extend([f"> {h3}", ""])
    add_paragraphs(lines, [h3_1, h3_2, h3_3, h3_4, h3_5])
    add_section(lines, "Limitations and Strengths", [limitation_1, limitation_2])
    add_section(lines, "Implications and Conclusion", [conclusion])
    add_section(lines, "Funding", [funding])
    add_section(lines, "Correspondence", [correspondence])
    add_section(lines, "References", references)

    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    payload = load_payload()
    document = build_document(payload)
    OUTPUT_PATH.write_text(document, encoding="utf-8")
    word_count = len(document.split())
    print(
        f"[written] {OUTPUT_PATH.relative_to(ROOT_DIR)} "
        f"({word_count:,} whitespace words, {len(parse_references(payload))} references)"
    )


if __name__ == "__main__":
    main()
