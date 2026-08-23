import json
import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
SLUG = "kalmijn-leopold-2019"
BLOCKS_PATH = ROOT_DIR / "tmp" / "pdf_blocks" / f"{SLUG}.json"
OUTPUT_PATH = ROOT_DIR / "content" / "readings" / SLUG / "full.md"


# The only end-of-line hyphen that is lexical rather than a typesetting
# hyphen in this PDF extraction occurs inside a DOI suffix.
TRUE_HYPHENATED_BREAKS = {
    ("fc", "pv"),
    ("s0140", "6736"),
}


LITERAL_CORRECTIONS = {
    "Cronbach’s 𝛼varied": "Cronbach’s α varied",
    "𝛼": "α",
    "𝛲2": "χ²",
    "DOI:10.1111/jomf.12509": "DOI: 10.1111/jomf.12509",
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
    value = re.sub(r"\s+([,;:?!])", r"\1", value)
    value = re.sub(r"\s+\.(?!\d)", ".", value)
    value = re.sub(r"\s*=\s*", " = ", value)
    return value


def append_wrapped_line(value: str, next_line: str) -> str:
    if value.endswith("/") or next_line.startswith("."):
        return value + next_line
    if value.endswith("-") and "http" in value:
        return value + next_line
    match = re.search(r"([A-Za-z0-9]+)-$", value)
    next_match = re.match(r"([A-Za-z0-9]+)(.*)$", next_line)
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
        position = remaining.find(marker)
        if position <= 0:
            raise ValueError(f"Split marker {marker!r} not found after text: {remaining[:220]!r}")
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


def grouped_reference_lines(payload: dict) -> list[tuple[int, str, float, str]]:
    groups: list[tuple[int, str, float, str]] = []
    for page_number in (14, 15, 16):
        selected: list[tuple[str, float, float, str]] = []
        for line in payload["pages"][page_number - 1]["lines"]:
            x0, y0, _, _ = line["bbox"]
            if y0 < 60 or y0 > 670:
                continue
            column = "left" if x0 < 240 else "right"
            if page_number == 14 and column == "left" and y0 < 560:
                continue
            selected.append((column, float(x0), float(y0), line["text"].strip()))

        for column in ("left", "right"):
            column_lines = sorted(
                (item for item in selected if item[0] == column),
                key=lambda item: (item[2], item[1]),
            )
            current: list[tuple[str, float, float, str]] = []
            for item in column_lines:
                if current and abs(item[2] - current[0][2]) > 0.75:
                    ordered = sorted(current, key=lambda value: value[1])
                    groups.append(
                        (
                            page_number,
                            column,
                            min(value[1] for value in ordered),
                            " ".join(value[3] for value in ordered),
                        )
                    )
                    current = []
                current.append(item)
            if current:
                ordered = sorted(current, key=lambda value: value[1])
                groups.append(
                    (
                        page_number,
                        column,
                        min(value[1] for value in ordered),
                        " ".join(value[3] for value in ordered),
                    )
                )

    return groups


def parse_references(payload: dict) -> list[str]:
    groups = grouped_reference_lines(payload)
    baselines = {
        (14, "left"): 36.0,
        (14, "right"): 244.8,
        (15, "left"): 49.0,
        (15, "right"): 257.8,
        (16, "left"): 36.0,
        (16, "right"): 244.8,
    }

    references: list[str] = []
    for page_number, column, x0, text in groups:
        cleaned = normalize_text(text)
        starts_reference = x0 <= baselines[(page_number, column)] + 4.5
        if starts_reference:
            references.append(cleaned)
        elif not references:
            raise ValueError(f"Reference continuation before first entry on page {page_number}")
        else:
            references[-1] = join_continuation(references[-1], cleaned)

    if len(references) != 52:
        raise ValueError(f"Expected 52 references, found {len(references)}")
    if not references[0].startswith("Bengtson, V. L., & Roberts"):
        raise ValueError(f"Unexpected first reference: {references[0]}")
    if not references[-1].startswith("Wortman, C. B., Cohen Silver"):
        raise ValueError(f"Unexpected final reference: {references[-1]}")
    return references


def add_paragraphs(lines: list[str], paragraphs: list[str]) -> None:
    for paragraph in paragraphs:
        lines.extend([normalize_text(paragraph), ""])


def add_section(lines: list[str], heading: str, paragraphs: list[str], level: int = 2) -> None:
    lines.extend([f"{'#' * level} {heading}", ""])
    add_paragraphs(lines, paragraphs)


def add_asset(lines: list[str], image_name: str, alt: str, caption: str) -> None:
    lines.extend([f"![{alt}](figures/{image_name})", "", caption, ""])


def build_document(payload: dict) -> str:
    abstract = join_continuation(block_text(payload, 1, 3), block_text(payload, 1, 7))
    abstract_parts = split_on_markers(abstract, ["Method:", "Results:", "Conclusion:", "Implications:"])
    abstract_parts[0] = strip_prefix(abstract_parts[0], "Background:")
    abstract_parts[1] = strip_prefix(abstract_parts[1], "Method:")
    abstract_parts[2] = strip_prefix(abstract_parts[2], "Results:")
    abstract_parts[3] = strip_prefix(abstract_parts[3], "Conclusion:")
    abstract_parts[4] = strip_prefix(abstract_parts[4], "Implications:")
    keywords = strip_prefix(block_text(payload, 1, 6), "Key Words:")

    introduction_1 = block_text(payload, 1, 8)
    introduction_2 = split_on_markers(block_text(payload, 2, 1), ["An empirical test of these hypotheses"])

    prior = join_continuation(block_text(payload, 2, 4), block_text(payload, 2, 5))
    prior_paragraphs = split_on_markers(prior, ["A number of studies examined"])

    theory = join_continuation(block_text(payload, 2, 7), block_text(payload, 3, 1))
    theory_paragraphs = split_on_markers(
        theory,
        ["A third perspective sees siblings as rivals", "In this study, we draw", "The death of a parent is a crisis"],
    )
    death_intro, death_quote = split_on_markers(theory_paragraphs[3], ["As Umberson"])
    death_quote = join_continuation(death_quote, block_text(payload, 3, 2))

    hypotheses = join_continuation(
        block_text(payload, 3, 3),
        block_text(payload, 3, 4),
        block_text(payload, 4, 1),
        block_text(payload, 4, 2),
    )
    hypothesis_paragraphs = split_on_markers(
        hypotheses,
        [
            "Another implication of the solidarity perspective",
            "To test this specific aspect of the solidarity model",
            "Our second set of hypotheses is derived",
            "Regarding our study focus",
            "Based on these considerations",
            "Many studies on sibling ties",
            "Although an increase in conflict",
        ],
    )

    sample = join_continuation(block_text(payload, 4, 5), block_text(payload, 5, 1), block_text(payload, 5, 2))
    sample_paragraphs = split_on_markers(
        sample,
        ["We selected a sample", "This analytic sample", "In the interview", "To analyze", "Note that"],
    )

    measures_intro = block_text(payload, 5, 4)
    dependent = strip_prefix(block_text(payload, 5, 5), "Dependent variables.")
    independent = strip_prefix(
        join_continuation(block_text(payload, 5, 6), block_text(payload, 7, 1)),
        "Independent variables.",
    )
    mediator = strip_prefix(block_text(payload, 7, 2), "Mediator variables.")
    controls = strip_prefix(
        join_continuation(block_text(payload, 7, 3), block_text(payload, 7, 4)),
        "Control variables.",
    )

    models = join_continuation(block_text(payload, 7, 6), block_text(payload, 8, 1))
    model_paragraphs = split_on_markers(
        models,
        ["For the analysis of face-to-face contact", "To examine mediator effects", "In the models for the effects"],
    )

    results_intro = split_on_markers(block_text(payload, 8, 3), ["The fixed effects models are shown"])
    early_results = split_on_markers(block_text(payload, 8, 8), ["The unadjusted model for logged face-to-face contact"])
    result_model_intro = join_continuation(results_intro[1], early_results[0])
    detailed_results = join_continuation(
        block_text(payload, 9, 21),
        block_text(payload, 9, 22),
        block_text(payload, 10, 11),
        block_text(payload, 10, 12),
        block_text(payload, 11, 29),
        block_text(payload, 11, 30),
        block_text(payload, 12, 35),
    )
    detailed_paragraphs = split_on_markers(
        detailed_results,
        [
            "A comparison between Models 1a and 1b",
            "For siblings’ phone contact",
            "Figure 1 illustrates",
            "Next, we turn",
            "For face-to-face contact, we found",
            "For phone contact, we observed",
            "In sum, we noted",
            "In additional analyses",
            "In Table 4 we present",
        ],
    )

    discussion = join_continuation(
        block_text(payload, 12, 37),
        block_text(payload, 12, 38),
        block_text(payload, 13, 1),
        block_text(payload, 13, 2),
        block_text(payload, 14, 1),
    )
    discussion_paragraphs = split_on_markers(
        discussion,
        [
            "The second set of hypotheses was based",
            "We found no support for Hypothesis 5",
            "In concluding, it is important",
            "Our analysis provides yet another example",
            "We conclude with limitations",
            "Finally, we note that future research",
        ],
    )

    note = block_text(payload, 14, 3)
    references = parse_references(payload)

    lines = [
        "# Changing Sibling Relationships After Parents’ Death: The Role of Solidarity and Kinkeeping",
        "",
        "> Matthijs Kalmijn (ORCID: 0000-0001-5217-1897) · Thomas Leopold",
        "",
        "> University of Amsterdam and Netherlands Interdisciplinary Demographic Institute∗",
        "",
        "> *Journal of Marriage and Family*, 81 (February 2019), 99–114. DOI: 10.1111/jomf.12509.",
        "",
        "> Department of Sociology, University of Amsterdam, Nieuwe Achtergracht 166, Building REC B/C, Room B6.08, 1018 WV Amsterdam, the Netherlands. (matthijskalmijn@gmail.com).",
        "",
        "> ∗Netherlands Interdisciplinary Demographic Institute, Lange Houtstraat 19, 2511 CV The Hague, Netherlands.",
        "",
    ]

    add_section(
        lines,
        "Abstract",
        [
            f"**Background.** {abstract_parts[0]}",
            f"**Method.** {abstract_parts[1]}",
            f"**Results.** {abstract_parts[2]}",
            f"**Conclusion.** {abstract_parts[3]}",
            f"**Implications.** {abstract_parts[4]}",
        ],
    )
    add_section(lines, "Key Words", [keywords])
    add_paragraphs(lines, [introduction_1, *introduction_2])

    add_section(lines, "Background", [])
    add_section(lines, "Previous Research", prior_paragraphs, level=3)
    add_section(lines, "Theoretical Background and Hypotheses", [], level=3)
    add_paragraphs(lines, theory_paragraphs[:3] + [death_intro])
    lines.extend([f"> {death_quote}", ""])
    add_paragraphs(lines, hypothesis_paragraphs)

    add_section(lines, "Method", [])
    add_section(lines, "Data and Sample", sample_paragraphs, level=3)
    add_section(lines, "Measures", [measures_intro], level=3)
    add_asset(
        lines,
        "table-1.png",
        "Table 1. Descriptive statistics",
        "Table 1. Descriptive Statistics. Accessibility description: The source table, rotated upright for reading, lists the mean, standard deviation, minimum, maximum, sample size, and measurement description for face-to-face and phone contact, sibling conflict, the timing and duration of each parent’s death, contact with and support to surviving parents, and age. The printed description for ‘Years after second parent’s death’ says ‘years after first parent’s death’; that source wording is preserved in the image.",
    )
    add_section(lines, "Dependent variables", [dependent], level=4)
    add_section(lines, "Independent variables", [independent], level=4)
    add_section(lines, "Mediator variables", [mediator], level=4)
    add_section(lines, "Control variables", [controls], level=4)
    add_section(lines, "Models", model_paragraphs, level=3)

    add_section(lines, "Results", [results_intro[0]])
    add_asset(
        lines,
        "table-2.png",
        "Table 2. Frequency of sibling contact and conflict in all waves for all dyads",
        "Table 2. Frequency of Sibling Contact and Conflict in All Waves for All Dyads. Note. Netherlands Kinship Panel Study 2002 to 2014. Accessibility description: The table reports percentages and cumulative percentages for seven face-to-face contact categories, seven phone-contact categories, and three conflict categories. Monthly-or-more face-to-face contact totals 46.9%, monthly-or-more phone contact totals 47.9%, and any conflict totals 10.1%; the respective observation counts are 30,289, 30,289, and 18,108.",
    )
    add_paragraphs(lines, [result_model_intro, early_results[1]])
    add_asset(
        lines,
        "table-3.png",
        "Table 3. Fixed effects regression of changes in contact with siblings",
        "Table 3. Fixed Effects Regression of Changes in Contact With Siblings. Note. Netherlands Kinship Panel Study 2002 to 2014. Robust standard errors in parentheses. Outcome variables are logged. Standard errors in parentheses. Mediation by contact with and support to surviving parent. F-to-F = Face-to-face contact. *p < .05. Accessibility description: Eight fixed-effects models compare face-to-face and phone contact after the first and second parent’s deaths. Key transition coefficients are 0.173 and 0.100 for first-parent face-to-face models, 0.166 and 0.123 for first-parent phone models, and −0.006/0.068 and 0.175/0.208 for second-parent face-to-face/phone models. Significant negative duration effects after the second death are −0.040, −0.099, −0.045, and −0.072; mediation effects are 0.071 and 0.042.",
    )
    add_paragraphs(lines, detailed_paragraphs[:3])
    add_paragraphs(lines, [detailed_paragraphs[3]])
    add_asset(
        lines,
        "figure-1.png",
        "Figure 1. First parent’s death and changes in sibling contact",
        "Figure 1. First Parent’s Death and Changes in Sibling Contact. Note. Average marginal effects calculated from Models 1a and 1b (left-hand plot) and Models 2a and 2b (right-hand plot). Accessibility description: Two line plots show percentage changes in face-to-face and phone contact from more than 2 years before through 7 years after the first parent’s death. Black unadjusted effects rise at death and remain positive; gray effects adjusted for solidarity and contact with the surviving parent are smaller, especially for face-to-face contact.",
    )
    add_paragraphs(lines, [detailed_paragraphs[4]])
    add_asset(
        lines,
        "figure-2.png",
        "Figure 2. Second parent’s death and changes in sibling contact",
        "Figure 2. Second Parent’s Death and Changes in Sibling Contact. Note. Average marginal effects calculated from Model 3b (left-hand plot) and Model 4b (right-hand plot). Accessibility description: Two line plots show percentage changes from more than 2 years before through 7 years after the second parent’s death. Both face-to-face and phone contact rise around the death and then decline below the predeath reference level; the face-to-face decline is steeper and reaches about −30% by year 7.",
    )
    add_paragraphs(lines, detailed_paragraphs[5:9])
    add_asset(
        lines,
        "table-4.png",
        "Table 4. Fixed effects logit and linear probability regression of changes in conflict with siblings",
        "Table 4. Fixed Effects Logit and Linear Probability Regression of Changes in Conflict With Siblings. Note. Netherlands Kinship Panel Study 2002 to 2014. Robust standard errors in parentheses. *p < .05. Accessibility description: Six fixed-effects models show no significant first-parent transition or duration effect on conflict and no significant second-parent transition effect. The significant negative duration coefficients after the second parent’s death are −0.243 and −0.359 in logit models and −0.015 and −0.023 in linear-probability models; quadratic duration terms are not significant.",
    )
    add_paragraphs(lines, [detailed_paragraphs[9]])

    add_section(lines, "Conclusion and Discussion", discussion_paragraphs)
    add_section(lines, "Note", [note])
    add_section(lines, "References", references)

    document = "\n".join(lines).rstrip() + "\n"
    required = [
        "Hypothesis 1",
        "Hypothesis 2",
        "Hypothesis 3",
        "Hypothesis 4",
        "Hypothesis 5",
        "Hypothesis 6",
        "N = 3,812",
        "10,367 unique sibling dyads",
        "6,186 unique sibling dyads",
        "Cronbach’s α varied between .71 and .74",
        "we cannot rule out the alternative interpretation",
        "FamilyComplextiy",
    ]
    missing = [sentinel for sentinel in required if sentinel not in document]
    if missing:
        raise ValueError(f"Missing required source sentinels: {missing}")
    if document.count("](figures/") != 6:
        raise ValueError("Expected exactly six source image assets")
    if re.search(r"\bSTT\b", document, flags=re.IGNORECASE):
        raise ValueError("Disallowed non-source content found")
    return document


def main() -> None:
    payload = load_payload()
    document = build_document(payload)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(document, encoding="utf-8")
    print(
        f"[written] {OUTPUT_PATH.relative_to(ROOT_DIR)} "
        f"({len(document.split()):,} whitespace words, {len(parse_references(payload))} references)"
    )


if __name__ == "__main__":
    main()
