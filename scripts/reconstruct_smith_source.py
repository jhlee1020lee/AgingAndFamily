import json
import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
SLUG = "smith-et-al-2007"
BLOCKS_PATH = ROOT_DIR / "tmp" / "pdf_blocks" / f"{SLUG}.json"
OUTPUT_PATH = ROOT_DIR / "content" / "readings" / SLUG / "full.md"


# These two compounds, unlike the ordinary typesetting break in
# "envi- / ronments", retain a lexical hyphen in the printed article.
TRUE_HYPHENATED_BREAKS = {
    ("non", "traditional"),
    ("risk", "taking"),
}


LITERAL_CORRECTIONS = {
    "\ufb01": "fi",
    "\ufb02": "fl",
    "FAMAS.International": "FAMAS. International",
    # The PDF typesets several issue numbers as raised numerals. Text
    # extraction concatenates those numerals with the volume or drops them;
    # restore conventional volume(issue) notation without changing citations.
    "Social Alternatives, 163, 7−10": "Social Alternatives, 16(3), 7−10",
    "Journal of Health Psychology, 7, 69−283": "Journal of Health Psychology, 7(3), 269−283",
    "International Journal of Men's Health, 22, 93−109": "International Journal of Men's Health, 2(2), 93−109",
    "Journal of American College Health, 486, 247−256": "Journal of American College Health, 48(6), 247−256",
    "Journal of Health Psychology, 73, 253−267": "Journal of Health Psychology, 7(3), 253−267",
    "Journal of Family Practice, 481, 47−52": "Journal of Family Practice, 48(1), 47−52",
    "British Journal of Community Nursing, 71, 52": "British Journal of Community Nursing, 7(1), 52",
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
    return value


def append_wrapped_line(value: str, next_line: str) -> str:
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


def join_continuation(*parts: str) -> str:
    selected = [normalize_text(part) for part in parts if part and part.strip()]
    if not selected:
        return ""
    value = selected[0]
    for part in selected[1:]:
        value = append_wrapped_line(value, part)
    return normalize_text(value)


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


def parse_references(payload: dict) -> list[str]:
    page_specs = {
        9: (36.9, 630.0, 700.0),
        10: (41.2, 60.0, 700.0),
        11: (36.9, 60.0, 250.0),
    }
    references: list[str] = []
    for page_number, (baseline, min_y, max_y) in page_specs.items():
        lines = sorted(
            (
                line
                for line in payload["pages"][page_number - 1]["lines"]
                if min_y <= float(line["bbox"][1]) <= max_y
            ),
            key=lambda line: (float(line["bbox"][1]), float(line["bbox"][0])),
        )
        for line in lines:
            x0 = float(line["bbox"][0])
            cleaned = normalize_text(line["text"])
            if x0 <= baseline + 4.5:
                references.append(cleaned)
            elif not references:
                raise ValueError(f"Reference continuation before first entry on page {page_number}")
            else:
                references[-1] = join_continuation(references[-1], cleaned)

    if len(references) != 59:
        raise ValueError(f"Expected 59 references, found {len(references)}")
    if not references[0].startswith("Aoun, S., Donovan"):
        raise ValueError(f"Unexpected first reference: {references[0]}")
    if not references[-1].startswith("Woods, B. (1999)"):
        raise ValueError(f"Unexpected final reference: {references[-1]}")
    return references


def add_paragraphs(lines: list[str], paragraphs: list[str]) -> None:
    for paragraph in paragraphs:
        lines.extend([normalize_text(paragraph), ""])


def add_section(lines: list[str], heading: str, paragraphs: list[str], level: int = 2) -> None:
    lines.extend([f"{'#' * level} {heading}", ""])
    add_paragraphs(lines, paragraphs)


def add_quote(lines: list[str], *paragraphs: str) -> None:
    for paragraph in paragraphs:
        lines.extend([f"> {normalize_text(paragraph)}", ""])


def add_asset(lines: list[str], image_name: str, alt: str, caption: str) -> None:
    lines.extend([f"![{alt}](figures/{image_name})", "", caption, ""])


def build_document(payload: dict) -> str:
    abstract = block_text(payload, 1, 5).replace("© 2007 Elsevier Inc. All rights reserved.", "").strip()
    keywords = block_text(payload, 1, 6).removeprefix("Keywords:").strip()

    introduction = join_continuation(block_text(payload, 1, 8), block_text(payload, 2, 0))
    introduction_paragraphs = split_on_markers(introduction, ["In this paper, we argue"])

    aging_independence = split_on_markers(
        block_text(payload, 2, 4),
        ["Biomedical theories define", "As with previous studies"],
    )
    masculinity_aging = split_on_markers(
        block_text(payload, 3, 1),
        ["Scholarship which has attempted"],
    )

    study_context = join_continuation(block_text(payload, 3, 4), block_text(payload, 4, 0))
    study_context_paragraphs = split_on_markers(study_context, ["Of the men aged 65 or older"])

    interview_followup = split_on_markers(
        block_text(payload, 5, 0),
        [
            "Despite academic scholarship",
            "It is noteworthy that age",
            "JS transcribed each of the interviews",
        ],
    )

    masculine_tail = join_continuation(block_text(payload, 6, 14), block_text(payload, 7, 0))
    masculine_tail_paragraphs = split_on_markers(masculine_tail, ["Max's example challenges"])

    david_analysis = split_on_markers(block_text(payload, 7, 4), ["We explored our participants'"])
    wayne_analysis = split_on_markers(block_text(payload, 7, 10), ["The older men in our study"])
    roger_analysis = split_on_markers(block_text(payload, 7, 12), ["For other men"])
    arnold_analysis = split_on_markers(block_text(payload, 8, 10), ["For some of the men"])

    conclusion_paragraphs = split_on_markers(
        block_text(payload, 9, 1),
        [
            "While a focus on hegemonic constructions",
            "Health service providers need",
            "Our analysis also has significant implications",
            "This paper has demonstrated",
            "We have begun to examine",
        ],
    )
    references = parse_references(payload)

    lines = [
        "# “I’ve been independent for so damn long!”: Independence, masculinity and aging in a help seeking context",
        "",
        "> James A. Smith a,b,⁎ · Annette Braunack-Mayer a,¹ · Gary Wittert b,² · Megan Warin c,³",
        "",
        "> a Discipline of Public Health, School of Population Health & Clinical Practice, University of Adelaide, Level 9 — Tower Building (MDP 207), 10 Pulteney St., Adelaide SA 5005, Australia; b Discipline of Medicine, School of Medicine, University of Adelaide, Level 6 — Eleanor Harrald Building, Frome Road, Royal Adelaide Hospital, Adelaide SA 5005, Australia; c Department of Anthropology, University of Durham, 43 Old Elvet, Durham DH1 3HN, United Kingdom.",
        "",
        "> *Journal of Aging Studies*, 21 (2007), 325–335. DOI: 10.1016/j.jaging.2007.05.004.",
        "",
        "> Received 16 February 2007; received in revised form 26 April 2007; accepted 30 May 2007.",
        "",
        "> ⁎ Corresponding author. Tel.: +61 8 8226 0799, +61 8 8342 5567. E-mail addresses: james.smith@adelaide.edu.au (J.A. Smith), annette.braunackmayer@adelaide.edu.au (A. Braunack-Mayer), gary.wittert@adelaide.edu.au (G. Wittert), megan.warin@durham.ac.uk (M. Warin). ¹ Tel.: +61 8 8226 0799 or +61 8 8303 3569. ² Tel.: +61 8 82225502. ³ Tel.: 44 101 3346177.",
        "",
    ]

    add_section(lines, "Abstract", [abstract])
    add_section(lines, "Keywords", [keywords])
    add_section(lines, "Introduction", introduction_paragraphs)
    add_section(lines, "Hegemonic masculinity and independence", [block_text(payload, 2, 2)], level=3)
    add_section(lines, "Aging and independence", aging_independence, level=3)
    add_section(lines, "Hegemonic masculinity and aging", masculinity_aging, level=3)

    # The source itself prints the section title as “Methology”; the source
    # spelling is intentionally retained here and can be clarified in Korean.
    add_section(lines, "Methology", [])
    add_section(lines, "Study context", [study_context_paragraphs[0]], level=3)
    add_asset(
        lines,
        "table-1.png",
        "Table 1. Age distribution in FAMAS and the qualitative help-seeking sub-study",
        "Table 1. Percentage of men, as represented by age categories, participating in both the FAMAS and the FAMAS sub-study exploring men's help seeking and health service use. Accessibility description: The full FAMAS cohort contains 1,195 men and the qualitative sub-study contains 36. For ages 35–44, 45–54, 55–64, and 65+, the respective cohort counts are 271 (22.7%), 326 (27.3%), 305 (25.5 in the printed table), and 293 (24.5%); sub-study counts are 6 (16.6%), 8 (22.2%), 10 (27.7%), and 12 (33.3%).",
    )
    add_paragraphs(lines, [study_context_paragraphs[1]])
    add_asset(
        lines,
        "table-2.png",
        "Table 2. Partnership status in the qualitative FAMAS sub-study",
        "Table 2. The number of men, as represented by age categories, participating in the FAMAS sub-study exploring men's help seeking behaviour and health service use who reported being either partnered or single. Accessibility description: Partnered/single counts are 2/4 at ages 35–44, 5/3 at 45–54, 4/6 at 55–64, and 8/4 at 65+.",
    )

    add_section(lines, "Conducting interviews", [block_text(payload, 4, 2)], level=3)
    add_asset(
        lines,
        "table-3.png",
        "Table 3. FAMAS health service use interview schedule",
        "Table 3. Florey Adelaide Male Ageing Study (FAMAS) health service use interview schedule. Accessibility description: The semi-structured guide asks about personal background, meanings of health, triggers and barriers to help seeking, the latest health-care visit and provider, the latest illness, ideal services and providers, dissatisfaction, and any additional comments. Probes cover ethnic, racial, and religious background; family, work, leisure, morbidity, illness severity, wives, friends, support structures, self-help, workplace health, perceived weakness and fear, feminisation and environment of services, provider interaction and gender, practitioner roles, causes and feelings associated with illness, and participants' broader narratives.",
    )
    add_paragraphs(lines, interview_followup)

    add_section(lines, "Study findings", [block_text(payload, 5, 2)])
    add_section(lines, "Acting independently as part of a masculine discourse", [block_text(payload, 5, 4)], level=3)
    add_quote(lines, block_text(payload, 5, 5))
    add_paragraphs(lines, [block_text(payload, 6, 0)])
    add_quote(lines, block_text(payload, 6, 1))
    add_paragraphs(lines, [block_text(payload, 6, 2)])
    add_quote(lines, block_text(payload, 6, 3))
    add_paragraphs(lines, [block_text(payload, 6, 4)])
    add_quote(lines, block_text(payload, 6, 5))
    add_paragraphs(lines, [block_text(payload, 6, 6)])
    add_quote(lines, block_text(payload, 6, 7))
    add_paragraphs(lines, [block_text(payload, 6, 8)])
    add_quote(
        lines,
        block_text(payload, 6, 9),
        block_text(payload, 6, 10),
        block_text(payload, 6, 11),
        block_text(payload, 6, 12),
        block_text(payload, 6, 13),
    )
    add_paragraphs(lines, masculine_tail_paragraphs)

    add_section(lines, "Acting independently as part of a discourse on successful aging", [block_text(payload, 7, 2)], level=3)
    add_quote(lines, block_text(payload, 7, 3))
    add_paragraphs(lines, [david_analysis[0], david_analysis[1]])
    add_quote(lines, block_text(payload, 7, 5))
    add_paragraphs(lines, [block_text(payload, 7, 6)])
    add_quote(lines, block_text(payload, 7, 7), block_text(payload, 7, 8), block_text(payload, 7, 9))
    add_paragraphs(lines, wayne_analysis)
    add_quote(lines, block_text(payload, 7, 11))
    add_paragraphs(lines, roger_analysis)
    add_quote(
        lines,
        block_text(payload, 7, 13),
        block_text(payload, 8, 0),
        block_text(payload, 8, 1),
        block_text(payload, 8, 2),
        block_text(payload, 8, 3),
        block_text(payload, 8, 4),
        block_text(payload, 8, 5),
    )
    add_paragraphs(lines, [block_text(payload, 8, 6)])
    add_quote(lines, block_text(payload, 8, 7), block_text(payload, 8, 8), block_text(payload, 8, 9))
    add_paragraphs(lines, arnold_analysis)

    add_section(lines, "Conclusion", conclusion_paragraphs)
    add_section(lines, "Acknowledgements", [block_text(payload, 9, 3)])
    add_section(lines, "References", references)

    document = "\n".join(lines).rstrip() + "\n"
    required = [
        "semi-structured interviews conducted with 36 older men",
        "The cohort consists of 1195 participants",
        "22 men were over 55 years of age",
        "12 of these men were aged 65 or older",
        "Interviews lasted between one and one and three quarter hours",
        "I've been independent for so damn long!",
        "independence can have multiple meanings",
        "both a characteristic of masculine identity and as a marker of successful aging",
        "showing and interest in discussion",
        "## Methology",
    ]
    missing = [sentinel for sentinel in required if sentinel not in document]
    if missing:
        raise ValueError(f"Missing required source sentinels: {missing}")
    if document.count("](figures/") != 3:
        raise ValueError("Expected exactly three source table assets")
    if re.search(r"\bSTT\b|chat\s*bot|챗봇", document, flags=re.IGNORECASE):
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
