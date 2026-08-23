import json
import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
SLUG = "oswald-et-al-2010"
BLOCKS_PATH = ROOT_DIR / "tmp" / "pdf_blocks" / f"{SLUG}.json"
OUTPUT_PATH = ROOT_DIR / "content" / "readings" / SLUG / "full.md"


TRUE_HYPHENATED_BREAKS = {
    ("age", "group"),
    ("age", "related"),
    ("age", "specific"),
    ("barrier", "free"),
    ("community", "dwelling"),
    ("comfort", "oriented"),
    ("chi", "square"),
    ("cross", "sectional"),
    ("follow", "up"),
    ("health", "related"),
    ("housing", "related"),
    ("low", "to"),
    ("norris", "baker"),
    ("observer", "based"),
    ("out", "of"),
    ("population", "based"),
    ("quasi", "objective"),
    ("self", "administered"),
    ("single", "item"),
    ("well", "being"),
}


LITERAL_CORRECTIONS = {
    "A.E. Smith": "A. E. Smith",
    "Age  differential": "Age differential",
    "H ousing": "Housing",
    "Health- R elated A spects": "Health-Related Aspects",
    "co inhabitants": "coinhabitants",
    "inter individual": "interindividual",
    "multicol l inearity": "multicollinearity",
    "multi dimensional": "multidimensional",
    "need s": "needs",
    "neighbo rhood": "neighborhood",
    "non responders": "nonresponders",
    "socio physical": "sociophysical",
    "v s.": "vs.",
    "wh ereas": "whereas",
    "Young–o ld": "Young–old",
    "Old–o ld": "Old–old",
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
    value = re.sub(r"\s+", " ", value).strip()
    for source, target in LITERAL_CORRECTIONS.items():
        value = value.replace(source, target)
    value = re.sub(r"\s*–\s*", "–", value)
    value = re.sub(r"\s*—\s*", "—", value)
    value = re.sub(r"(?<=\w)\s*-\s*(?=\w)", "-", value)
    value = re.sub(r"\s+([,;:?!])", r"\1", value)
    value = re.sub(r"\s+\.(?!\d)", ".", value)
    value = re.sub(r"([([{])\s+", r"\1", value)
    value = re.sub(r"\s+([)\]}])", r"\1", value)
    value = re.sub(r"“\s+", "“", value)
    value = re.sub(r"\s+”", "”", value)
    value = re.sub(r"‘\s+", "‘", value)
    value = re.sub(r"\s+’", "’", value)
    value = re.sub(r"\s*=\s*", " = ", value)
    value = re.sub(r"\s+([*/])\s+", r"\1", value)
    value = value.replace("χ 2", "χ²").replace("χ2", "χ²")
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

    for line in payload["pages"][11]["lines"]:
        x0, y0, _, _ = line["bbox"]
        if x0 >= 300 and 446 <= y0 <= 730:
            selected.append((12, "right", float(x0), float(y0), line["text"].strip()))

    page_13_lines: list[tuple[int, str, float, float, str]] = []
    for line in payload["pages"][12]["lines"]:
        x0, y0, _, _ = line["bbox"]
        if not 42 <= y0 <= 700:
            continue
        column = "left" if x0 < 290 else "right"
        page_13_lines.append((13, column, float(x0), float(y0), line["text"].strip()))

    selected.extend(
        sorted(page_13_lines, key=lambda item: (0 if item[1] == "left" else 1, item[3]))
    )
    return selected


def parse_references(payload: dict) -> list[str]:
    selected = reference_lines(payload)
    baselines: dict[tuple[int, str], float] = {}
    for page_number, column, x0, _, _ in selected:
        key = (page_number, column)
        baselines[key] = min(x0, baselines.get(key, x0))

    expected_baselines = {
        (12, "right"): 314.89,
        (13, "left"): 41.97,
        (13, "right"): 298.28,
    }
    for key, expected in expected_baselines.items():
        if abs(baselines[key] - expected) > 0.15:
            raise ValueError(f"Unexpected reference baseline for {key}: {baselines[key]}")

    references: list[str] = []
    for page_number, column, x0, _, text in selected:
        key = (page_number, column)
        starts_reference = x0 <= baselines[key] + 4.5
        cleaned = normalize_text(text)
        if starts_reference:
            references.append(cleaned)
        elif not references:
            raise ValueError(f"Reference continuation before first entry on page {page_number}")
        else:
            references[-1] = join_continuation(references[-1], cleaned)

    if len(references) != 51:
        raise ValueError(f"Expected 51 references, found {len(references)}")
    if not references[0].startswith("Abbott, P. S., Carman, N., Carman, J., & Scarfo, B."):
        raise ValueError("First reference sentinel did not match Abbott et al.")
    if not references[-1].startswith("Wight, R. G., Cummings, J. R., Karlamangla, A. S."):
        raise ValueError("Last reference sentinel did not match Wight et al.")
    oswald_2006 = next(
        reference
        for reference in references
        if reference.startswith("Oswald, F., Wahl, H.-W., Naumann, D.")
    )
    if "In H.-W. Wahl, H. Brenner" not in oswald_2006 or "Heidelberg, Germany: Springer" not in oswald_2006:
        raise ValueError("Page 13 column continuation for Oswald et al. (2006) was not joined")
    return references


def add_paragraphs(lines: list[str], paragraphs: list[str]) -> None:
    for paragraph in paragraphs:
        lines.extend([normalize_text(paragraph), ""])


def add_section(lines: list[str], heading: str, paragraphs: list[str], level: int = 2) -> None:
    lines.extend([f"{'#' * level} {heading}", ""])
    add_paragraphs(lines, paragraphs)


def add_table(
    lines: list[str],
    images: list[tuple[str, str]],
    caption: str,
    accessibility: str,
) -> None:
    for alt_text, source in images:
        lines.extend([f"![{alt_text}]({source})", ""])
    lines.extend([f"{normalize_text(caption)} Accessibility description: {normalize_text(accessibility)}", ""])


def build_document(payload: dict) -> str:
    abstract = block_text(payload, 1, 3)
    purpose, design, results, implications = split_on_markers(
        abstract,
        ["Design and Methods:", "Results:", "Implications:"],
    )
    purpose = strip_prefix(purpose, "Purpose:")
    design = strip_prefix(design, "Design and Methods:")
    results = strip_prefix(results, "Results:")
    implications = strip_prefix(implications, "Implications:")
    keywords = strip_prefix(block_text(payload, 1, 4), "Key Words:")

    intro_page_2 = block_text(payload, 2, 1)
    intro_1_end, intro_2, intro_3, intro_4_start = split_on_markers(
        intro_page_2,
        [
            "However, attempts to take a rather comprehensive approach",
            "Therefore, we refer in this study to a conceptual framework",
            "Looking at agency in more detail",
        ],
    )
    intro_page_2_right = block_text(payload, 2, 2)
    intro_4_end, intro_5, intro_6_start = split_on_markers(
        intro_page_2_right,
        [
            "At the level of belonging",
            "When considering the role of the environment",
        ],
    )
    intro_page_3 = block_text(payload, 3, 1)
    intro_6_end, intro_7, intro_8 = split_on_markers(
        intro_page_3,
        [
            "Other concepts of the social neighborhood",
            "The present study extends previous research",
        ],
    )
    introduction = [
        join_continuation(block_text(payload, 1, 5), intro_1_end),
        intro_2,
        intro_3,
        join_continuation(intro_4_start, intro_4_end),
        intro_5,
        join_continuation(intro_6_start, intro_6_end),
        intro_7,
        intro_8,
    ]

    aims = join_continuation(block_text(payload, 3, 3), block_text(payload, 3, 4))
    aims_1, aims_2 = split_on_markers(
        aims,
        ["Second, we explored whether specific aspects have age differential explanatory validity"],
    )

    participants = join_continuation(block_text(payload, 3, 7), block_text(payload, 4, 1))
    participants_1, participants_2 = split_on_markers(
        participants,
        ["Young–old participants were more often married"],
    )

    concepts_intro = block_text(payload, 4, 3)
    indoor_housing = join_continuation(block_text(payload, 4, 4), block_text(payload, 4, 5))
    indoor_housing = strip_prefix(indoor_housing, "Indoor Housing.—")
    neighborhood = strip_prefix(block_text(payload, 4, 6), "Neighborhood.—")
    social = join_continuation(block_text(payload, 4, 7), block_text(payload, 6, 1))
    social = strip_prefix(social, "Social Aspects of Housing.—")
    health = strip_prefix(block_text(payload, 6, 2), "Health-Related Aspects.—")
    life_satisfaction = strip_prefix(block_text(payload, 6, 3), "Life Satisfaction.—")
    analytic = join_continuation(block_text(payload, 6, 5), block_text(payload, 7, 1))

    age_group_differences = block_text(payload, 7, 4)
    intercorrelations = join_continuation(block_text(payload, 7, 6), block_text(payload, 8, 1))

    explanation = join_continuation(
        block_text(payload, 8, 3),
        block_text(payload, 8, 4),
        block_text(payload, 10, 1),
    )
    explanation_paragraphs = split_on_markers(
        explanation,
        [
            "Conducting the same regression analysis for the young–old participants",
            "For the old–old group, a regression analysis",
            "Follow-up analyses for variables with differential explanatory quality",
        ],
    )

    discussion = join_continuation(
        block_text(payload, 10, 3),
        block_text(payload, 10, 4),
        block_text(payload, 11, 1),
        block_text(payload, 11, 2),
    )
    discussion_paragraphs = split_on_markers(
        discussion,
        [
            "Correlative findings revealed insights into relationships",
            "Regression analysis addressing the concurrent explanatory value",
            "Our second set of analyses addressed age-specific explanation patterns",
            "Our findings contrast existing knowledge on the relationship",
            "Neighborhood characteristics, such as quality evaluation",
            "Housing-related social aspects were of minor significance",
            "In sum, our findings clearly indicate",
        ],
    )

    limitations = join_continuation(block_text(payload, 11, 4), block_text(payload, 12, 1))
    limitation_paragraphs = split_on_markers(
        limitations,
        [
            "Second, the single-item measure on life satisfaction",
            "Third, our sample consisted of old adults",
            "Finally, one limitation points to the cross-sectional nature",
        ],
    )

    conclusion = join_continuation(block_text(payload, 12, 3), block_text(payload, 12, 4))
    conclusion_paragraphs = split_on_markers(
        conclusion,
        ["From an applied perspective, these findings could affect"],
    )
    references = parse_references(payload)

    lines = [
        "# Is Aging in Place a Resource for or Risk to Life Satisfaction?",
        "",
        "> Frank Oswald, PhD¹ · Daniela Jopp, PhD² · Christoph Rott, PhD³ · Hans-Werner Wahl, PhD⁴",
        "",
        "> ¹ Interdisciplinary Ageing Research, Faculty of Educational Sciences, Goethe University, Frankfurt, Germany. ² Department of Psychology, Fordham University, Bronx, New York. ³ Institute of Gerontology, University of Heidelberg, Heidelberg, Germany. ⁴ Department of Psychological Ageing Research, Institute of Psychology, University of Heidelberg, Heidelberg, Germany.",
        "",
        "> *The Gerontologist*, 51(2), 238–250 (2011). DOI: 10.1093/geront/gnq096. Advance Access publication November 19, 2010.",
        "",
        "> Received July 2, 2010; Accepted October 19, 2010. Decision Editor: William J. McAuley, PhD.",
        "",
        "> Correspondence: Frank Oswald, Interdisciplinary Ageing Research, Faculty of Educational Sciences, Goethe University Frankfurt, Robert-Mayer-Str. 1, D-60325 Frankfurt, Germany. E-mail: oswald@em.uni-frankfurt.de.",
        "",
        "> © The Author 2010. Published by Oxford University Press on behalf of The Gerontological Society of America. All rights reserved. For permissions, please e-mail: journals.permissions@oup.com.",
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
    add_section(lines, "Introduction", introduction)
    add_section(lines, "Research Aims", [aims_1, aims_2])

    add_section(lines, "Methods", [])
    add_section(lines, "Participants", [participants_1, participants_2], level=3)
    add_table(
        lines,
        [
            ("Table 1, part 1: sample and central study variables", "figures/table-1-part-1.png"),
            ("Table 1, part 2: health-related variables and notes", "figures/table-1-part-2.png"),
        ],
        "Table 1. Descriptives of Sample and Central Study Variables: Total Sample and Split by Age Group.",
        "The first image reports sample, housing, neighborhood, and social characteristics for the total sample (N = 381), young–old group (n = 226), and old–old group (n = 155). The second image continues with ADL, IADL, and life satisfaction and contains notes a–f. Exact cells, significance tests, scales, and notes are preserved in the two source crops.",
    )
    add_section(lines, "Concepts and Related Measures", [concepts_intro], level=3)
    add_section(lines, "Indoor Housing", [indoor_housing], level=4)
    add_section(lines, "Neighborhood", [neighborhood], level=4)
    add_section(lines, "Social Aspects of Housing", [social], level=4)
    add_section(lines, "Health-Related Aspects", [health], level=4)
    add_section(lines, "Life Satisfaction", [life_satisfaction], level=4)
    add_section(lines, "Analytic Procedure", [analytic], level=3)

    add_section(lines, "Results", [])
    add_section(
        lines,
        "Mean Age-Group Differences of Central Study Variables",
        [age_group_differences],
        level=3,
    )
    add_section(
        lines,
        "Intercorrelations of Central Study Variables",
        [intercorrelations],
        level=3,
    )
    add_table(
        lines,
        [("Table 2: intercorrelations of central study variables", "figures/table-2.png")],
        "Table 2. Intercorrelations of Central Study Variables, Separate for Young–Old (n = 226; below diagonal) and Old–Old (n = 155; above diagonal).",
        "The correlation matrix covers living space, accessibility, comfort, neighborhood quality, outdoor place attachment, social housing variables, ADL, IADL, and life satisfaction. Living with others and social partners in the area are coded 0 = no and 1 = yes; higher values on the other indicators represent better scores. The source crop preserves every coefficient and significance mark.",
    )
    add_section(lines, "Explanation of Differences in Life Satisfaction", [], level=3)
    add_table(
        lines,
        [("Table 3: multiple regression models explaining life satisfaction", "figures/table-3.png")],
        "Table 3. Multiple Regression Models Explaining Life Satisfaction in the Total Sample and Split by Age Groups.",
        "The models use N = 345 for the total sample, n = 207 for young–old participants, and n = 138 for old–old participants after listwise deletion. Total R² values are .29, .27, and .39; the unique ADL contributions are .10, .08, and .12; and the neighborhood blocks contribute .08, .05, and .11, respectively. The source crop preserves B, SE, standardized β, unique contributions, all predictor blocks, and significance marks.",
    )
    add_paragraphs(lines, explanation_paragraphs)

    add_section(lines, "Discussion", discussion_paragraphs)
    add_section(lines, "Limitations", limitation_paragraphs)
    add_section(lines, "Conclusions", conclusion_paragraphs)
    add_section(lines, "References", references)

    document = "\n".join(lines).rstrip() + "\n"

    required_sentinels = [
        "random sample of 773 potential participants",
        "response rate (52%)",
        "present sample included 381 participants: 226 young–old",
        "155 old–old",
        "N = 345 for the total sample",
        "n = 207 for young–old participants",
        "n = 138 for old–old participants",
        "Total R² values are .29, .27, and .39",
        "unique ADL contributions are .10, .08, and .12",
        "neighborhood blocks contribute .08, .05, and .11",
        "Four limitations need to be considered.",
        "Second, the single-item measure",
        "Third, our sample consisted",
        "Finally, one limitation points to the cross-sectional nature",
    ]
    for sentinel in required_sentinels:
        if sentinel not in document:
            raise ValueError(f"Required source sentinel is missing: {sentinel}")

    image_sources = re.findall(r"!\[[^\]]*\]\((figures/[^)]+)\)", document)
    expected_images = [
        "figures/table-1-part-1.png",
        "figures/table-1-part-2.png",
        "figures/table-2.png",
        "figures/table-3.png",
    ]
    if image_sources != expected_images:
        raise ValueError(f"Unexpected table image sequence: {image_sources}")
    for relative_path in expected_images:
        if not (OUTPUT_PATH.parent / relative_path).is_file():
            raise FileNotFoundError(f"Missing table asset: {relative_path}")

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
        f"({len(document.split()):,} whitespace words, {len(references)} references, 4 table assets)"
    )


if __name__ == "__main__":
    main()
