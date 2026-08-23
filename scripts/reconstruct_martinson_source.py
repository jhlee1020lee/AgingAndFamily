import json
import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
SLUG = "martinson-berridge-2015"
BLOCKS_PATH = ROOT_DIR / "tmp" / "pdf_blocks" / f"{SLUG}.json"
OUTPUT_PATH = ROOT_DIR / "content" / "readings" / SLUG / "full.md"


# These compounds carry a real hyphen in the printed article. All other
# end-of-line hyphens in the positioned text are typesetting line breaks.
TRUE_HYPHENATED_BREAKS = {
    ("peer", "reviewed"),
    ("self", "care"),
    ("cross", "cultural"),
    ("low", "income"),
    ("anngela", "cole"),
    ("population", "based"),
    ("meaning", "based"),
    ("age", "integrated"),
    ("person", "centered"),
    ("self", "identities"),
}


LITERAL_CORRECTIONS = {
    "http: rsa.reveues.org/910": "http://rsa.revues.org/910",
    "doi:10.1080/07317115.20 11.539525": "doi:10.1080/07317115.2011.539525",
    "doi:10.1080/03 601277.2010.487759": "doi:10.1080/03601277.2010.487759",
    "doi:10.1097/01. JGP.": "doi:10.1097/01.JGP.",
    "doi:10.1016/j. jaging.": "doi:10.1016/j.jaging.",
    "doi:10.1016/j. jamda.": "doi:10.1016/j.jamda.",
    "doi:http://dx.doi.org/": "doi:http://dx.doi.org/",
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
    value = re.sub(r"\s+([,;:?!])", r"\1", value)
    value = re.sub(r"\s+\.(?!\d)", ".", value)
    value = re.sub(r"([([{])\s+", r"\1", value)
    value = re.sub(r"\s+([)\]}])", r"\1", value)
    value = re.sub(r"“\s+", "“", value)
    value = re.sub(r"\s+”", "”", value)
    value = re.sub(r"‘\s+", "‘", value)
    value = re.sub(r"\s+’", "’", value)
    value = re.sub(r"\s*=\s*", " = ", value)
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
                f"Split marker {normalized_marker!r} not found after text: {remaining[:260]!r}"
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
    for page_number in (10, 11, 12):
        page_lines: list[tuple[int, str, float, float, str]] = []
        for line in payload["pages"][page_number - 1]["lines"]:
            x0, y0, _, _ = line["bbox"]
            column = "left" if x0 < 295 else "right"
            minimum_y = 443 if page_number == 10 and column == "left" else 45
            if not minimum_y <= y0 <= 730:
                continue
            page_lines.append(
                (page_number, column, float(x0), float(y0), line["text"].strip())
            )
        selected.extend(item for item in page_lines if item[1] == "left")
        selected.extend(item for item in page_lines if item[1] == "right")
    return selected


def parse_references(payload: dict) -> list[str]:
    selected = reference_lines(payload)
    expected_baselines = {
        (10, "left"): 54.64,
        (10, "right"): 306.65,
        (11, "left"): 54.63,
        (11, "right"): 306.63,
        (12, "left"): 54.64,
        (12, "right"): 306.65,
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
    if len(references) != 74:
        raise ValueError(f"Expected 74 references, found {len(references)}")
    if not references[0].startswith("Alley, D. E., Putney, N. M., Rice, M., & Bengtson, V. L. (2010)."):
        raise ValueError("First reference sentinel did not match Alley et al.")
    if not references[-1].startswith("Young, Y., Frick, K. D., & Phelan, E. A. (2009)."):
        raise ValueError("Last reference sentinel did not match Young et al.")
    if not any(
        reference.startswith("Hilton, J. M., Gonzalez, C. A.")
        and "Latinos, in cross-cultural context." in reference
        for reference in references
    ):
        raise ValueError("Page 10-to-11 Hilton continuation was not joined")
    if not any(
        reference.startswith("Rozanova, J., Northcott, H. C.")
        and "inequality in the Globe and Mail journals." in reference
        for reference in references
    ):
        raise ValueError("Page 11-to-12 Rozanova continuation was not joined")
    return references


def add_paragraphs(lines: list[str], paragraphs: list[str]) -> None:
    for paragraph in paragraphs:
        lines.extend([normalize_text(paragraph), ""])


def add_section(lines: list[str], heading: str, paragraphs: list[str], level: int = 2) -> None:
    lines.extend([f"{'#' * level} {heading}", ""])
    add_paragraphs(lines, paragraphs)


def build_document(payload: dict) -> str:
    if len(payload.get("pages", [])) != 12:
        raise ValueError(f"Expected 12 PDF pages, found {len(payload.get('pages', []))}")

    abstract_all = join_continuation(block_text(payload, 1, 7), block_text(payload, 2, 0))
    purpose, design, results, implications = split_on_markers(
        abstract_all,
        ["Design and Methods:", "Results:", "Implications:"],
    )
    purpose = strip_prefix(purpose, "Purpose of the Study:")
    design = strip_prefix(design, "Design and Methods:")
    results = strip_prefix(results, "Results:")
    implications = strip_prefix(implications, "Implications:")
    keywords = strip_prefix(block_text(payload, 2, 1), "Key words:")

    intro_first, intro_second, intro_third_start = split_on_markers(
        block_text(payload, 2, 2),
        [
            "Although successful aging models are prominently positioned",
            "As Cole (1995) observed",
        ],
    )
    introduction = [
        intro_first,
        intro_second,
        join_continuation(intro_third_start, block_text(payload, 2, 3)),
    ]

    methods_first, methods_second_start = split_on_markers(
        block_text(payload, 2, 5),
        ["As a configurative review"],
    )
    methods_second_end, methods_third = split_on_markers(
        block_text(payload, 3, 0),
        ["Although the articles across categories sometimes overlapped"],
    )
    methods = [
        methods_first,
        join_continuation(methods_second_start, methods_second_end),
        methods_third,
    ]

    add_stir_intro = strip_prefix(block_text(payload, 3, 2), "Theme 1: Add and Stir")
    prevalence = [
        join_continuation(
            strip_prefix(block_text(payload, 3, 3), "A Prevalence Problem"),
            block_text(payload, 3, 4),
        ),
        block_text(payload, 3, 5),
    ]
    criteria_first, criteria_second = split_on_markers(
        strip_prefix(block_text(payload, 3, 6), "Additional Criteria"),
        ["Researchers have also suggested modifications"],
    )

    missing_voices_intro = join_continuation(
        block_text(payload, 3, 8), block_text(payload, 4, 0)
    )
    compare_first, compare_second, compare_third_start = split_on_markers(
        strip_prefix(block_text(payload, 4, 1), "Compare and Contrast"),
        [
            "Three studies reported that avoidance of disability or chronic physical illness",
            "This body of research that compared objective and subjective measures",
        ],
    )
    compare_contrast = [
        compare_first,
        compare_second,
        join_continuation(compare_third_start, block_text(payload, 4, 2)),
    ]

    cultural_first, cultural_second, cultural_third_start = split_on_markers(
        strip_prefix(block_text(payload, 4, 3), "Cultural Relevance and Variability"),
        [
            "Many have critiqued the Western, white, middle class bias",
            "Adding new dimensions to cultural analyses of successful aging",
        ],
    )
    cultural_third_end, cultural_fourth = split_on_markers(
        block_text(payload, 5, 0),
        ["Overall, these Missing Voices critiques"],
    )
    cultural = [
        cultural_first,
        cultural_second,
        join_continuation(cultural_third_start, cultural_third_end),
        cultural_fourth,
    ]

    hard_hitting_intro = block_text(payload, 5, 2)
    individual_first_end, individual_second = split_on_markers(
        block_text(payload, 5, 4),
        ["Over the years, critics have repeatedly argued"],
    )
    individualism = [
        join_continuation(
            strip_prefix(block_text(payload, 5, 3), "Individualism"),
            individual_first_end,
        ),
        individual_second,
    ]
    ageism = join_continuation(
        strip_prefix(block_text(payload, 5, 5), "Ageism and Ableism"),
        block_text(payload, 6, 0),
    )
    neoliberal_intro = strip_prefix(
        block_text(payload, 6, 1), "Neoliberal and Conservative Contexts"
    )
    neoliberal_quote = block_text(payload, 6, 2)
    neoliberal_after = block_text(payload, 6, 3)

    influences_intro = join_continuation(
        strip_prefix(
            block_text(payload, 6, 4), "Influences, Applications, and Internalizations"
        ),
        block_text(payload, 6, 5),
    )
    influences_first, influences_second, influences_third_start = split_on_markers(
        block_text(payload, 6, 7),
        [
            "Successful aging’s value transfer has also occurred",
            "Older adults with illness or disabilities face particularly challenging negotiations",
        ],
    )
    influences = [
        influences_intro,
        influences_first,
        influences_second,
        join_continuation(influences_third_start, block_text(payload, 7, 0)),
    ]

    justice_first, justice_second, justice_third_start = split_on_markers(
        strip_prefix(
            block_text(payload, 7, 1), "Alternative Approaches for Social Justice"
        ),
        [
            "Similarly, Morell (2003) advocated",
            "Finally, critics noted that social justice-oriented models",
        ],
    )
    social_justice = [
        justice_first,
        justice_second,
        join_continuation(justice_third_start, block_text(payload, 7, 2)),
    ]

    new_frames_first, new_frames_second = split_on_markers(
        block_text(payload, 7, 4),
        ["These critics rejected successful aging as exclusionary"],
    )
    new_frames_third_end, new_frames_fourth = split_on_markers(
        block_text(payload, 8, 0),
        ["Overall, the New Frames and Names rejected successful aging models"],
    )
    new_frames = [
        new_frames_first,
        new_frames_second,
        join_continuation(block_text(payload, 7, 5), new_frames_third_end),
        new_frames_fourth,
    ]

    discussion_first, discussion_second_start = split_on_markers(
        block_text(payload, 8, 2),
        ["Social gerontologists generally strive"],
    )
    (
        discussion_second_end,
        discussion_third,
        discussion_fourth,
        discussion_fifth,
    ) = split_on_markers(
        block_text(payload, 8, 3),
        [
            "Across all four categories of successful aging critiques",
            "Although many in the field have asserted",
            "Given all of these concerns about the limitations of successful aging",
        ],
    )
    discussion_sixth, discussion_seventh, discussion_eighth_start = split_on_markers(
        block_text(payload, 9, 0),
        [
            "Nevertheless, it is essential that we ask the critical questions",
            "These gerontological models are seemingly locked in place",
        ],
    )
    discussion_eighth_end, discussion_ninth, discussion_tenth = split_on_markers(
        block_text(payload, 9, 1),
        [
            "Reconsidering our commitment is one step",
            "Furthermore, we must acknowledge that there is not one ideal way of being old",
        ],
    )
    discussion = [
        discussion_first,
        join_continuation(discussion_second_start, discussion_second_end),
        discussion_third,
        discussion_fourth,
        discussion_fifth,
        discussion_sixth,
        discussion_seventh,
        join_continuation(discussion_eighth_start, discussion_eighth_end),
        discussion_ninth,
        discussion_tenth,
    ]

    references = parse_references(payload)

    lines = [
        "# Successful Aging and Its Discontents: A Systematic Review of the Social Gerontology Literature",
        "",
        "> Marty Martinson, DrPH*,¹ · Clara Berridge, MSW²",
        "",
        "> ¹ Department of Health Education, San Francisco State University, California. ² School of Social Welfare, University of California, Berkeley.",
        "",
        "> *The Gerontologist*, 55(1), 58–69 (2015). DOI: 10.1093/geront/gnu037. Research Article; Special Issue: Successful Aging. Advance Access publication May 9, 2014.",
        "",
        "> Received January 10 2014; Accepted March 28 2014. Decision Editor: Rachel Pruchno, PhD.",
        "",
        "> Correspondence: Marty Martinson, DrPH, Department of Health Education, San Francisco State University, 1600 Holloway Avenue, HSS Building, Room 326, San Francisco, CA 94132. E-mail: martym@sfsu.edu.",
        "",
        "> © The Author 2014. Published by Oxford University Press on behalf of The Gerontological Society of America. All rights reserved. For permissions, please e-mail: journals.permissions@oup.com.",
        "",
    ]

    add_section(
        lines,
        "Abstract",
        [
            f"**Purpose of the Study.** {purpose}",
            f"**Design and Methods.** {design}",
            f"**Results.** {results}",
            f"**Implications.** {implications}",
        ],
    )
    add_section(lines, "Key Words", [keywords])
    add_section(lines, "Introduction", introduction)
    add_section(lines, "Methods", methods)

    add_section(lines, "Findings", [])
    add_section(lines, "Theme 1: Add and Stir", [add_stir_intro], level=3)
    add_section(lines, "A Prevalence Problem", prevalence, level=4)
    add_section(lines, "Additional Criteria", [criteria_first, criteria_second], level=4)
    add_section(lines, "Theme 2: The Missing Voices", [missing_voices_intro], level=3)
    add_section(lines, "Compare and Contrast", compare_contrast, level=4)
    add_section(lines, "Cultural Relevance and Variability", cultural, level=4)
    add_section(lines, "Theme 3: Hard Hitting Critiques", [hard_hitting_intro], level=3)
    add_section(lines, "Individualism", individualism, level=4)
    add_section(lines, "Ageism and Ableism", [ageism], level=4)
    add_section(lines, "Neoliberal and Conservative Contexts", [neoliberal_intro], level=4)
    lines.extend([f"> {neoliberal_quote}", ""])
    add_paragraphs(lines, [neoliberal_after])
    add_section(
        lines,
        "Influences, Applications, and Internalizations",
        [influences[0]],
        level=4,
    )
    lines.extend([f"> {block_text(payload, 6, 6)}", ""])
    add_paragraphs(lines, influences[1:])
    add_section(lines, "Alternative Approaches for Social Justice", social_justice, level=4)
    add_section(lines, "Theme 4: New Frames and Names", new_frames, level=3)

    add_section(lines, "Discussion", discussion)
    add_section(lines, "Limitations", [block_text(payload, 9, 3)])
    add_section(lines, "Conclusion", [block_text(payload, 10, 1)])
    add_section(lines, "References", references)

    document = "\n".join(lines).rstrip() + "\n"

    required_sentinels = [
        "successful aging/ageing in the title or all text (n = 453)",
        "Using the earlier criteria, we identified 67 articles",
        "individually coded a subset of 15 articles",
        "Sixteen of the 67 reviewed articles",
        "rates of 16%–24%",
        "no more than 11.9%",
        "prevalence rates of 3.3%–33.5%",
        "Almost half (30) of the 67 critiques",
        "50.3% vs. 18.8%",
        "63% of African American elders",
        "92% of their sample viewed themselves as successfully aging",
        "Fourteen articles, ranging in publication date from 1990 to 2013",
        "Another subset (n = 7)",
        "expand it, personalize it, scrap it, or reframe and rename it",
        "After 25 years of critique",
        "one boldly reflexive conversation",
    ]
    for sentinel in required_sentinels:
        if sentinel not in document:
            raise ValueError(f"Required source sentinel is missing: {sentinel}")

    if re.search(r"!\[[^\]]*\]\(", document):
        raise ValueError("Unexpected raster asset in a source article with no tables or figures")
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
        f"({len(document.split()):,} whitespace words, {len(references)} references, no figures/tables)"
    )


if __name__ == "__main__":
    main()
