import json
import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
SLUG = "luong-et-al-2011"
BLOCKS_PATH = ROOT_DIR / "tmp" / "pdf_blocks" / f"{SLUG}.json"
OUTPUT_PATH = ROOT_DIR / "content" / "readings" / SLUG / "full.md"


TRUE_HYPHENATED_BREAKS = {
    ("age", "related"),
    ("blanchard", "fields"),
    ("full", "time"),
}


LITERAL_CORRECTIONS = {
    "(se the review": "(see the review",
    "(se the reviews": "(see the reviews",
    "‘‘disengagement strategies’’": "“disengagement strategies”",
    "Hess,T.M.,Bolstad,C.A.,Woodburn,S.M.,&Auman,C.(1999).Traitdiagnosticityversusbehavior": (
        "Hess, T. M., Bolstad, C. A., Woodburn, S. M., & Auman, C. (1999). "
        "Trait diagnosticity versus behavior"
    ),
    "Charles, S.T., Mather, M., & Carstensen, L.L.": "Charles, S. T., Mather, M., & Carstensen, L. L.",
    "Charles, S.T., Piazza, J., Luong, G., & Almeida, D.M.": "Charles, S. T., Piazza, J., Luong, G., & Almeida, D. M.",
    "(2007).Adaptation": "(2007). Adaptation",
}


def load_payload() -> dict:
    return json.loads(BLOCKS_PATH.read_text(encoding="utf-8"))


def lookup_block(payload: dict, page_number: int, block_index: int) -> str:
    for block in payload["pages"][page_number - 1]["blocks"]:
        if block["block_index"] == block_index:
            return block["text"]
    raise KeyError(f"Missing page {page_number} block {block_index}")


def normalize_text(text: str) -> str:
    value = re.sub(r"\s+", " ", text).strip()
    for source, target in LITERAL_CORRECTIONS.items():
        value = value.replace(source, target)
    value = re.sub(r"\s+([,.;:?!])", r"\1", value)
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


def block_text(payload: dict, page: int, block: int, prefix: str | None = None) -> str:
    raw = lookup_block(payload, page, block)
    if prefix:
        lines = raw.replace("\r\n", "\n").split("\n")
        if not lines or lines[0].strip() != prefix:
            raise ValueError(f"Unexpected prefix in page {page} block {block}: {lines[:2]!r}")
        raw = "\n".join(lines[1:])
    return join_wrapped_lines(raw)


def paragraph(payload: dict, *keys: tuple[int, int]) -> str:
    fragments = [block_text(payload, page, block) for page, block in keys]
    fragments = [fragment for fragment in fragments if fragment]
    if not fragments:
        return ""
    value = fragments[0]
    for fragment in fragments[1:]:
        value = append_wrapped_line(value, fragment)
    return normalize_text(value)


def reference_lines(payload: dict) -> list[tuple[int, float, str]]:
    selected: list[tuple[int, float, str]] = []
    for page_number in range(11, 16):
        for line in payload["pages"][page_number - 1]["lines"]:
            x0, y0, _, _ = line["bbox"]
            if y0 < 55:
                continue
            if page_number == 11 and y0 < 474:
                continue
            selected.append((page_number, float(x0), line["text"].strip()))
    return selected


def parse_references(payload: dict) -> list[str]:
    selected = reference_lines(payload)
    baselines: dict[int, float] = {}
    for page_number, x0, _ in selected:
        baselines[page_number] = min(x0, baselines.get(page_number, x0))

    references: list[str] = []
    for page_number, x0, text in selected:
        is_new = x0 <= baselines[page_number] + 3.0
        if is_new:
            references.append(normalize_text(text))
        elif not references:
            raise ValueError(f"Reference continuation precedes first entry on page {page_number}")
        else:
            references[-1] = normalize_text(append_wrapped_line(references[-1], text))

    if len(references) != 70:
        raise ValueError(f"Expected 70 references, found {len(references)}")
    return references


def add_section(lines: list[str], heading: str, paragraphs: list[str], level: int = 2) -> None:
    lines.extend([f"{'#' * level} {heading}", ""])
    for item in paragraphs:
        lines.extend([item, ""])


def build_markdown(payload: dict) -> str:
    abstract = block_text(payload, 1, 3, prefix="Abstract")
    keywords = block_text(payload, 1, 4, prefix="Keywords")
    references = parse_references(payload)

    lines = [
        "# Better with age: Social relationships across adulthood",
        "",
        "> Gloria Luong · Susan T. Charles · Karen L. Fingerman",
        "",
        "> *Journal of Social and Personal Relationships*, 28(1), 9–23 (2011). DOI: 10.1177/0265407510391362.",
        "",
        "> Affiliations: University of California, USA; Purdue University, USA.",
        "",
        "> Corresponding author: Gloria Luong, Department of Psychology and Social Behavior, 4201 Social & Behavioral Sciences Gateway, University of California–Irvine, Irvine, CA 92697-7085, USA. Email: Luongg@uci.edu.",
        "",
        "> © The Author(s) 2011. Reprints and permissions: sagepub.co.uk/journalsPermissions.nav.",
        "",
    ]

    add_section(lines, "Abstract", [abstract])
    add_section(lines, "Keywords", [keywords])
    lines.extend([
        paragraph(payload, (1, 5), (2, 0)), "",
        paragraph(payload, (2, 1)), "",
        paragraph(payload, (2, 2)), "",
    ])

    add_section(
        lines,
        "Social relationships get better with age",
        [paragraph(payload, (2, 4)), paragraph(payload, (2, 5), (3, 0))],
    )
    add_section(
        lines,
        "Why are social relationships better in later life?",
        [paragraph(payload, (3, 2))],
    )
    add_section(
        lines,
        "Optimizing positive relationships",
        [
            paragraph(payload, (3, 4)),
            paragraph(payload, (3, 5), (4, 0)),
            paragraph(payload, (4, 1)),
        ],
        level=3,
    )
    add_section(
        lines,
        "Age differences in appraisals and judgments of social relationships",
        [
            paragraph(payload, (4, 3)),
            paragraph(payload, (4, 4)),
            paragraph(payload, (4, 5), (5, 0)),
        ],
        level=3,
    )
    add_section(
        lines,
        "Social expertise",
        [paragraph(payload, (5, 2)), paragraph(payload, (5, 3))],
        level=3,
    )
    add_section(
        lines,
        "Behaviors that facilitate positive relationships",
        [
            paragraph(payload, (5, 5), (6, 0)),
            paragraph(payload, (6, 1)),
            paragraph(payload, (6, 2)),
        ],
        level=3,
    )
    add_section(
        lines,
        "Beyond the person: Age differences in social environments",
        [
            paragraph(payload, (6, 4)),
            paragraph(payload, (6, 5), (7, 0)),
            paragraph(payload, (7, 1)),
        ],
    )
    add_section(
        lines,
        "The role of social partners in older adults’ positive social ties",
        [paragraph(payload, (7, 3)), paragraph(payload, (7, 4)), paragraph(payload, (7, 5))],
    )
    add_section(
        lines,
        "Social partners provide older adults with preferential treatment",
        [
            paragraph(payload, (7, 7), (8, 0)),
            paragraph(payload, (8, 1)),
            paragraph(payload, (8, 2)),
        ],
        level=3,
    )
    add_section(
        lines,
        "Forgiveness and blame when time is limited",
        [
            paragraph(payload, (8, 4), (9, 0)),
            paragraph(payload, (9, 1)),
            paragraph(payload, (9, 2)),
            paragraph(payload, (9, 3)),
        ],
        level=3,
    )
    add_section(
        lines,
        "Stereotypes about aging",
        [
            paragraph(payload, (9, 5), (10, 0)),
            paragraph(payload, (10, 1)),
            paragraph(payload, (10, 2)),
        ],
        level=3,
    )
    add_section(
        lines,
        "Future research directions",
        [paragraph(payload, (10, 4)), paragraph(payload, (11, 0))],
    )
    add_section(lines, "Conclusions", [paragraph(payload, (11, 2))])
    add_section(lines, "Conflict of interest statement", [paragraph(payload, (11, 4))])
    add_section(lines, "Funding", [paragraph(payload, (11, 6))])
    add_section(lines, "References", references)
    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    payload = load_payload()
    markdown = build_markdown(payload)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(markdown, encoding="utf-8")
    print(
        f"[written] {OUTPUT_PATH.relative_to(ROOT_DIR)} "
        f"({len(markdown.split()):,} whitespace words, {len(parse_references(payload))} references)"
    )


if __name__ == "__main__":
    main()
