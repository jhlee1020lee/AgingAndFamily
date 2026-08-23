import json
import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
SLUG = "kim-et-al-2015"
BLOCKS_PATH = ROOT_DIR / "tmp" / "pdf_blocks" / f"{SLUG}.json"
OUTPUT_PATH = ROOT_DIR / "content" / "readings" / SLUG / "full.md"


TRUE_HYPHENATED_BREAKS = {
    ("co", "residence"),
    ("cross", "cultural"),
    ("cross", "national"),
    ("in", "law"),
    ("nest", "leaving"),
    ("non", "family"),
    ("parent", "child"),
    ("skipped", "generation"),
    ("well", "being"),
}


LITERAL_CORRECTIONS = {
    "60C": "60+",
    "65C": "65+",
    "Kﬁngerman": "KFingerman",
}


def load_payload() -> dict:
    return json.loads(BLOCKS_PATH.read_text(encoding="utf-8"))


def normalize_text(text: str) -> str:
    value = (
        text.replace("\ufb01", "fi")
        .replace("\ufb02", "fl")
        .replace("\u00a0", " ")
        .replace("\x02", "")
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
    if value.endswith("/"):
        return value + next_line
    if value.endswith("–") and re.match(r"\d", next_line):
        return value + next_line
    if re.search(r"https?://\S+\.$", value) and re.match(r"^(?:html?|pdf)(?:[.)]|$)", next_line, re.IGNORECASE):
        return value + next_line
    match = re.search(r"([A-Za-z]+)-$", value)
    next_match = re.match(r"([A-Za-z]+)(.*)$", next_line)
    if match and next_match:
        first = match.group(1)
        second = next_match.group(1)
        tail = next_match.group(2)
        last_token = value.rsplit(" ", 1)[-1]
        if "http://" in last_token or "https://" in last_token:
            return value + second + tail
        if (first.lower(), second.lower()) in TRUE_HYPHENATED_BREAKS:
            return value + second + tail
        return value[:-1] + second + tail
    return value + " " + next_line


def is_sentence_end(value: str) -> bool:
    return bool(re.search(r"[.!?][\"'’”)]*$", normalize_text(value)))


def body_line_selected(page_number: int, y0: float) -> bool:
    if page_number == 1:
        return 225 <= y0 <= 485
    if 2 <= page_number <= 14:
        return 55 <= y0 <= 605
    if page_number == 15:
        return 55 <= y0 <= 435
    return False


def parse_body_events(payload: dict) -> list[tuple[str, str, int]]:
    events: list[tuple[str, str, int]] = []
    paragraph = ""

    def flush(page_number: int) -> None:
        nonlocal paragraph
        if paragraph:
            events.append(("paragraph", normalize_text(paragraph), page_number))
            paragraph = ""

    for page in payload["pages"]:
        page_number = int(page["page"])
        selected = [
            line for line in page["lines"]
            if body_line_selected(page_number, float(line["bbox"][1]))
        ]
        first_body_line = True
        for line in selected:
            x0 = float(line["bbox"][0])
            size = float(line.get("size", 0))
            text = normalize_text(line["text"])
            if not text:
                continue
            if size >= 11.5:
                flush(page_number)
                font = str(line.get("font", ""))
                level = 3 if "BoldIt" in font else 2
                events.append((f"heading{level}", text, page_number))
                first_body_line = False
                continue

            begins_paragraph = x0 >= 60
            if first_body_line and paragraph and is_sentence_end(paragraph):
                begins_paragraph = True
            if begins_paragraph:
                flush(page_number)
            paragraph = append_wrapped_line(paragraph, text)
            first_body_line = False

    flush(15)
    return events


def reference_lines(payload: dict) -> list[tuple[int, float, str]]:
    selected: list[tuple[int, float, str]] = []
    for page_number in range(15, 23):
        page = payload["pages"][page_number - 1]
        for line in page["lines"]:
            x0, y0, _, _ = line["bbox"]
            if page_number == 15:
                if y0 < 485 or y0 > 600:
                    continue
            elif y0 < 55 or y0 > 600:
                continue
            selected.append((page_number, float(x0), normalize_text(line["text"])))
    return selected


def parse_references(payload: dict) -> list[str]:
    references: list[str] = []
    for page_number, x0, text in reference_lines(payload):
        if x0 <= 56.5:
            references.append(text)
        elif not references:
            raise ValueError(f"Reference continuation before first entry on page {page_number}")
        else:
            references[-1] = append_wrapped_line(references[-1], text)
    if len(references) < 80:
        raise ValueError(f"Expected a long chapter reference list, found only {len(references)} entries")
    return [normalize_text(reference) for reference in references]


def build_document(payload: dict) -> str:
    lines = [
        "# Relationships Between Adults and Parents in Asia",
        "",
        "> Kyungmin Kim · Yen-Pi Cheng · Steven H. Zarit · Karen L. Fingerman",
        "",
        "> Chapter 7 in S.-T. Cheng, I. Chi, H. H. Fung, L. W. Li, and J. Woo (Eds.), *Successful Aging: Asian Perspectives*, pp. 101–122. Springer Science+Business Media Dordrecht, 2015. DOI: 10.1007/978-94-017-9331-5_7.",
        "",
        "> Recommended citation: Kim, K., Cheng, Y.-P., Zarit, S. H., & Fingerman, K. L. (2015). Relationships between adults and parents in Asia (Chapter 7). In S.-T. Cheng, I. Chi, H. H. Fung, L. W. Li, & J. Woo (Eds.), *Successful aging: Asian perspectives* (pp. 101–122). New York: Springer. doi:10.1007/978-94-017-9331-5_7",
        "",
        "> Correspondence: Kyungmin Kim, Yen-Pi Cheng, and Karen L. Fingerman, Department of Human Development and Family Sciences, The University of Texas at Austin, 108 E Dean Keeton St, Stop A2702, Austin, TX 78712-1248, USA; kkim@utexas.edu; ypcheng@austin.utexas.edu; kfingerman@austin.utexas.edu. Steven H. Zarit, Department of Human Development and Family Studies, The Pennsylvania State University, 305 Health and Human Development East Building, University Park, PA 16802, USA; z67@psu.edu.",
        "",
    ]

    for kind, value, _page_number in parse_body_events(payload):
        if kind == "heading2":
            lines.extend([f"## {value}", ""])
        elif kind == "heading3":
            lines.extend([f"### {value}", ""])
        else:
            lines.extend([value, ""])

    lines.extend(["## References", ""])
    for reference in parse_references(payload):
        lines.extend([reference, ""])
    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    payload = load_payload()
    document = build_document(payload)
    OUTPUT_PATH.write_text(document, encoding="utf-8")
    print(
        f"[written] {OUTPUT_PATH.relative_to(ROOT_DIR)} "
        f"({len(document.split()):,} whitespace words, {len(parse_references(payload))} references)"
    )


if __name__ == "__main__":
    main()
