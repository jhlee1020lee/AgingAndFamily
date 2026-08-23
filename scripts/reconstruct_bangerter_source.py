import json
import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
SLUG = "bangerter-waldron-2014"
BLOCKS_PATH = ROOT_DIR / "tmp" / "pdf_blocks" / f"{SLUG}.json"
OUTPUT_PATH = ROOT_DIR / "content" / "readings" / SLUG / "full.md"


TRUE_HYPHENATED_BREAKS = {
    ("long", "distance"),
    ("schwartz", "soicher"),
    ("twenty", "nine"),
    ("university", "sponsored"),
    ("year", "old"),
}


LITERAL_CORRECTIONS = {
    "0ther changes": "Other changes",
    "(N =9)": "(N = 9)",
    "2011).These": "2011). These",
}


HEADING_LEVELS = {
    "Introduction": 2,
    "Grandparenting": 3,
    "Long distance grandparenting": 3,
    "Turning points in grandparenting relationships": 3,
    "Rationale and research questions": 3,
    "Method": 2,
    "Participants": 3,
    "Procedure": 3,
    "Data analysis": 3,
    "Results": 2,
    "Discussion": 2,
    "Limitations and conclusions": 2,
}


QUOTE_STARTS = (
    "It's starting to come up now",
    "Our granddaughter, among other things",
    "I had hoped it would be a bonding experience",
    "Let's see, the waning of the closeness",
    "We get to see her maybe once or twice a year",
    "We'll come for Thanksgiving",
    "But there's no connection between us anymore",
    "You know, it's so much fun for me",
    "Basically what she did was",
    "When it comes to helping him with homework",
    "She said ‘Grandma do you know",
    "I think that closeness prevailed",
    "But they're so involved with neighbor kids",
    "I would say I drew the line",
    "For her 16th birthday",
)


FIGURE_INSERTS = {
    "A second type of trajectory (Fig. 2)": (1, 2),
    "Fig. 4 indicates multidimensional changes": (3, 4, 5),
}


FIGURE_TEXT = {
    1: (
        "![Figure 1. Decrease in relational closeness](figures/figure-1.png)",
        "Fig. 1. Decrease in relational closeness. Accessibility description: Ten trajectories, P11–P20, are plotted by grandchild age from 0 to 20 and relational closeness from 0 to 6. Most begin around levels 4–5 and move toward levels 1–4 during later childhood or adolescence.",
    ),
    2: (
        "![Figure 2. Consistent relational closeness](figures/figure-2.png)",
        "Fig. 2. Consistent relational closeness. Accessibility description: Eight trajectories, P1–P8, remain horizontal across observed grandchild ages at relational-closeness levels 1, 3, or 5.",
    ),
    3: (
        "![Figure 3. Minimal changes in relational closeness](figures/figure-3.png)",
        "Fig. 3. Minimal changes in relational closeness. Accessibility description: Five trajectories, P21–P25, show limited shifts among relational-closeness levels 3–5 across observed grandchild ages.",
    ),
    4: (
        "![Figure 4. Multidimensional changes in relational closeness](figures/figure-4.png)",
        "Fig. 4. Multidimensional changes in relational closeness. Accessibility description: Five trajectories, P26–P30, fluctuate in multiple directions across observed grandchild ages, with plotted levels ranging from 1 to 5.",
    ),
    5: (
        "![Figure 5. Increase in relational closeness](figures/figure-5.png)",
        "Fig. 5. Increase in relational closeness. Accessibility description: Two trajectories, P9 and P10, move from plotted level 1 at younger ages to level 5 by approximately ages 12–14.",
    ),
}


TABLE_ROWS = (
    ("Spending Time Together", 22, 22, 0, "Face-to-face interaction with a grandchild."),
    ("Family Relational Dynamics", 17, 5, 12, "Divorce, abuse, conflict with parents, conflict with in-laws, cohabitation, discipline."),
    ("Geographic Distance", 12, 0, 12, "Significant geographic distance as a result of moving or family location."),
    ("Lack of Relational Investment", 12, 0, 12, "Lack of effort to cultivate or sustain closeness."),
    ("Use of Technology", 11, 11, 0, "Adopting technology as a means of communication."),
    ("Relational Investment", 11, 11, 0, "Relational adaptations initiating a qualitative shift in closeness."),
    ("Lack of Free Time", 8, 0, 8, "Inability to spend time together because of busy schedules and activities."),
    ("Grandchild Gaining Independence", 7, 1, 6, "Grandchild reaching puberty, maturing, and/or developing into a young adult."),
)


def load_payload() -> dict:
    return json.loads(BLOCKS_PATH.read_text(encoding="utf-8"))


def normalize_text(text: str) -> str:
    value = (
        text.replace("\ufb01", "fi")
        .replace("\ufb02", "fl")
        .replace("\u00a0", " ")
        .replace("\u00ad", "")
    )
    value = re.sub(r"\s+", " ", value).strip()
    for source, target in LITERAL_CORRECTIONS.items():
        value = value.replace(source, target)
    value = re.sub(r"\s+([,.;:?!])", r"\1", value)
    return value


def append_wrapped_line(value: str, next_line: str) -> str:
    value = normalize_text(value)
    next_line = normalize_text(next_line)
    if not value:
        return next_line
    if not next_line:
        return value
    last_token = value.rsplit(" ", 1)[-1]
    if value.endswith("/"):
        return value + next_line
    if ("http://" in last_token or "https://" in last_token) and re.match(r"\S", next_line):
        return value + next_line
    if value.endswith("–") and re.match(r"[0-9A-Za-z]", next_line):
        return value + next_line
    match = re.search(r"([A-Za-z]+)-$", value)
    next_match = re.match(r"([A-Za-z]+)(.*)$", next_line)
    if match and next_match:
        first = match.group(1)
        second = next_match.group(1)
        tail = next_match.group(2)
        if "http://" in last_token or "https://" in last_token:
            return value + second + tail
        if (first.lower(), second.lower()) in TRUE_HYPHENATED_BREAKS:
            return value + second + tail
        return value[:-1] + second + tail
    return value + " " + next_line


def join_wrapped_lines(text: str) -> str:
    lines = [normalize_text(line) for line in text.replace("\r\n", "\n").split("\n") if line.strip()]
    value = ""
    for line in lines:
        value = append_wrapped_line(value, line)
    return normalize_text(value)


def block_text(payload: dict, page_number: int, block_index: int) -> str:
    for block in payload["pages"][page_number - 1]["blocks"]:
        if int(block["block_index"]) == block_index:
            return join_wrapped_lines(block["text"])
    raise KeyError(f"Missing page {page_number} block {block_index}")


def column_lines(page: dict, column: str) -> list[dict]:
    if column == "left":
        selected = [line for line in page["lines"] if float(line["bbox"][0]) < 275]
    else:
        selected = [line for line in page["lines"] if float(line["bbox"][0]) >= 275]
    return sorted(selected, key=lambda line: (float(line["bbox"][1]), float(line["bbox"][0])))


def body_line_selected(page_number: int, column: str, y0: float) -> bool:
    if page_number == 1:
        return 460 <= y0 <= (580 if column == "left" else 655)
    if page_number in (2, 3, 7, 8):
        return 45 <= y0 <= 695
    if page_number == 4:
        return 45 <= y0 <= 515 if column == "left" else 210 <= y0 <= 515
    if page_number == 5:
        return 210 <= y0 <= 540 if column == "left" else 45 <= y0 <= 695
    if page_number == 6:
        return 245 <= y0 <= 695
    if page_number == 9:
        return column == "left" and 45 <= y0 <= 695
    return False


def column_base(page_number: int, column: str) -> float:
    odd_page = page_number % 2 == 1
    if column == "left":
        return 41.22 if odd_page else 36.85
    return 286.30 if odd_page else 281.93


def is_sentence_end(value: str) -> bool:
    return bool(re.search(r"[.!?][\"'’”)]*$", normalize_text(value)))


def parse_body_events(payload: dict) -> list[tuple[str, str, int, int]]:
    events: list[tuple[str, str, int, int]] = []
    paragraph = ""
    paragraph_start_page = 1

    def flush(end_page: int) -> None:
        nonlocal paragraph
        if paragraph:
            events.append(("paragraph", normalize_text(paragraph), paragraph_start_page, end_page))
            paragraph = ""

    for page in payload["pages"][:9]:
        page_number = int(page["page"])
        for column in ("left", "right"):
            lines = [
                line
                for line in column_lines(page, column)
                if body_line_selected(page_number, column, float(line["bbox"][1]))
            ]
            first_line = True
            base = column_base(page_number, column)
            previous_block_index: int | None = None
            previous_x = base
            for line in lines:
                text = normalize_text(line["text"])
                if not text:
                    continue
                if text in HEADING_LEVELS:
                    flush(page_number)
                    events.append((f"heading{HEADING_LEVELS[text]}", text, page_number, page_number))
                    first_line = False
                    continue

                x0 = float(line["bbox"][0])
                block_index = int(line["block_index"])
                begins_paragraph = (
                    previous_block_index is not None and block_index != previous_block_index
                ) or (x0 >= base + 9.0 and previous_x < base + 9.0)
                if first_line and paragraph:
                    begins_paragraph = is_sentence_end(paragraph)
                if begins_paragraph:
                    flush(page_number)
                if not paragraph:
                    paragraph_start_page = page_number
                paragraph = append_wrapped_line(paragraph, text)
                first_line = False
                previous_block_index = block_index
                previous_x = x0

    flush(9)
    return events


def parse_references(payload: dict) -> list[str]:
    references: list[str] = []
    selections = (
        (9, "right", 65.0, 700.0, 286.30),
        (10, "left", 45.0, 150.0, 36.85),
        (10, "right", 45.0, 150.0, 281.93),
    )
    for page_number, column, min_y, max_y, base in selections:
        page = payload["pages"][page_number - 1]
        for line in column_lines(page, column):
            x0, y0, _, _ = [float(value) for value in line["bbox"]]
            if not min_y <= y0 <= max_y:
                continue
            text = normalize_text(line["text"])
            if not text:
                continue
            if x0 <= base + 4.0:
                references.append(text)
            elif not references:
                raise ValueError(f"Reference continuation before first entry on page {page_number}")
            else:
                references[-1] = append_wrapped_line(references[-1], text)

    references = [normalize_text(reference) for reference in references]
    if len(references) != 31:
        raise ValueError(f"Expected 31 references, found {len(references)}")
    if not references[0].startswith("Attar-Schwartz, S., Tan, J., & Buchanan, A. (2009)."):
        raise ValueError("Reference parsing did not begin at the expected Attar-Schwartz entry")
    if not references[-1].startswith("Waldron, K., & Waldron, V. R. (2009)."):
        raise ValueError("Reference parsing did not end at the expected Waldron and Waldron entry")
    if not references[-1].endswith("Springer Publishing Company."):
        raise ValueError("The final reference is incomplete")
    return references


def validate_table(payload: dict) -> None:
    extracted = block_text(payload, 6, 15)
    for label, frequency, positive, negative, definition in TABLE_ROWS:
        required = (label, str(frequency), str(positive), str(negative), definition)
        if any(value not in extracted for value in required):
            raise ValueError(f"Table 1 extraction is incomplete for {label}")
    totals = (
        sum(row[1] for row in TABLE_ROWS),
        sum(row[2] for row in TABLE_ROWS),
        sum(row[3] for row in TABLE_ROWS),
    )
    if totals != (100, 50, 50) or "Total 100 50 50" not in extracted:
        raise ValueError(f"Unexpected Table 1 totals: {totals}")


def add_figure(lines: list[str], figure_number: int) -> None:
    image_line, caption = FIGURE_TEXT[figure_number]
    lines.extend([image_line, "", caption, ""])


def add_table(lines: list[str]) -> None:
    row_description = "; ".join(
        f"{label}: frequency {frequency}, positive {positive}, negative {negative}, {definition}"
        for label, frequency, positive, negative, definition in TABLE_ROWS
    )
    lines.extend(
        [
            "![Table 1. Turning point frequency, relational impact, and definition](figures/table-1.png)",
            "",
            "Table 1. Turning point frequency, relational impact, and definition. "
            f"Accessibility description: {row_description} Total: frequency 100, positive relational impact 50, negative relational impact 50.",
            "",
        ]
    )


def build_document(payload: dict) -> str:
    abstract = block_text(payload, 1, 5)
    copyright_line = "© 2014 Elsevier Inc. All rights reserved."
    if not abstract.endswith(copyright_line):
        raise ValueError("Abstract copyright sentinel is missing")
    abstract = normalize_text(abstract[: -len(copyright_line)])

    keyword_lines = [
        normalize_text(line)
        for line in next(
            block["text"]
            for block in payload["pages"][0]["blocks"]
            if int(block["block_index"]) == 6
        ).splitlines()
        if line.strip()
    ]
    if keyword_lines[0] != "Keywords:" or len(keyword_lines) != 4:
        raise ValueError("Keyword block did not match the printed three-keyword structure")

    lines = [
        "# Turning points in long distance grandparent–grandchild relationships",
        "",
        "> Lauren R. Bangerterᵃ,* · Vincent R. Waldronᵇ",
        "",
        "> ᵃ The Pennsylvania State University, United States. ᵇ Arizona State University, United States.",
        "",
        "> *Journal of Aging Studies*, 29, 88–97 (2014). DOI: https://doi.org/10.1016/j.jaging.2014.01.004.",
        "",
        "> Article history: Received 9 October 2013; received in revised form 30 January 2014; accepted 30 January 2014; available online 3 March 2014.",
        "",
        "> Corresponding author: Department of Human Development and Family Studies, The Pennsylvania State University, University Park, PA 16802, United States. E-mail addresses: lrb207@psu.edu (L.R. Bangerter), vincent.waldron@asu.edu (V.R. Waldron).",
        "",
        "> 0890-4065/© 2014 Elsevier Inc. All rights reserved.",
        "",
        "## Abstract",
        "",
        abstract,
        "",
        "## Keywords",
        "",
        "; ".join(keyword_lines[1:]),
        "",
    ]

    inserted_figures: set[int] = set()
    table_inserted = False
    for kind, value, _start_page, _end_page in parse_body_events(payload):
        if kind.startswith("heading"):
            level = int(kind[-1])
            lines.extend([f"{'#' * level} {value}", ""])
            continue

        if value.startswith(("RQ1.", "RQ2.")):
            rq, remainder = value.split(".", 1)
            lines.extend([f"> **{rq}.**{remainder}", ""])
        elif value.startswith(QUOTE_STARTS):
            lines.extend([f"> {value}", ""])
        else:
            lines.extend([value, ""])

        for marker, figure_numbers in FIGURE_INSERTS.items():
            if marker in value:
                for figure_number in figure_numbers:
                    if figure_number in inserted_figures:
                        raise ValueError(f"Figure {figure_number} would be inserted twice")
                    add_figure(lines, figure_number)
                    inserted_figures.add(figure_number)
        if "Table 1 presents the labels, frequencies, valence" in value:
            if table_inserted:
                raise ValueError("Table 1 would be inserted twice")
            add_table(lines)
            table_inserted = True

    if inserted_figures != {1, 2, 3, 4, 5}:
        raise ValueError(f"Missing figure insert(s): {sorted({1, 2, 3, 4, 5} - inserted_figures)}")
    if not table_inserted:
        raise ValueError("Table 1 was not inserted")

    lines.extend(["## References", ""])
    for reference in parse_references(payload):
        lines.extend([reference, ""])
    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    payload = load_payload()
    if int(payload.get("page_count", 0)) != 10:
        raise ValueError(f"Expected 10 PDF pages, found {payload.get('page_count')}")
    validate_table(payload)
    document = build_document(payload)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(document, encoding="utf-8")
    print(
        f"[written] {OUTPUT_PATH.relative_to(ROOT_DIR)} "
        f"({len(document.split()):,} whitespace words, {len(parse_references(payload))} references, "
        "5 figures, Table 1 totals 100/50/50)"
    )


if __name__ == "__main__":
    main()
