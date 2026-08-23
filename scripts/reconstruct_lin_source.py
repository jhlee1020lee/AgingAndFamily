import json
import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
SLUG = "lin-et-al-2018"
BLOCKS_PATH = ROOT_DIR / "tmp" / "pdf_blocks" / f"{SLUG}.json"
OUTPUT_PATH = ROOT_DIR / "content" / "readings" / SLUG / "full.md"


TRUE_HYPHENATED_BREAKS = {
    ("continuous", "time"),
    ("couple", "level"),
    ("cross", "sectional"),
    ("discrete", "time"),
    ("interview", "year"),
    ("later", "life"),
    ("life", "course"),
    ("middle", "aged"),
    ("multiple", "imputed"),
    ("non", "shared"),
    ("non", "white"),
    ("pre", "divorce"),
    ("same", "race"),
    ("time", "varying"),
    ("time", "invariant"),
    ("two", "thirds"),
}


def load_payload() -> dict:
    return json.loads(BLOCKS_PATH.read_text(encoding="utf-8"))


def normalize_text(text: str) -> str:
    value = (
        text.replace("\ufb01", "fi")
        .replace("\ufb02", "fl")
        .replace("\u00a0", " ")
        .replace("\xad", "")
    )
    value = re.sub(r"\s+", " ", value).strip()
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
    last_token = value.rsplit(" ", 1)[-1]
    if "doi:" in last_token.lower() and re.match(r"[0-9A-Za-z(<]", next_line):
        return value + next_line
    if ("http://" in last_token or "https://" in last_token) and re.match(r"\S", next_line):
        return value + next_line
    if value.endswith("–") and re.match(r"\d", next_line):
        return value + next_line
    match = re.search(r"([A-Za-z]+)-$", value)
    next_match = re.match(r"([A-Za-z]+)(.*)$", next_line)
    if match and next_match:
        first = match.group(1)
        second = next_match.group(1)
        tail = next_match.group(2)
        if "doi:" in last_token.lower() or "http://" in last_token or "https://" in last_token:
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


def strip_prefix(value: str, prefix: str) -> str:
    value = normalize_text(value)
    if not value.startswith(prefix):
        raise ValueError(f"Expected prefix {prefix!r}, found {value[:120]!r}")
    return normalize_text(value[len(prefix):])


def is_sentence_end(value: str) -> bool:
    return bool(re.search(r"[.!?][\"'’”)]*$", normalize_text(value)))


def column_lines(page: dict, column: str) -> list[dict]:
    if column == "left":
        selected = [line for line in page["lines"] if float(line["bbox"][0]) < 300]
    else:
        selected = [line for line in page["lines"] if float(line["bbox"][0]) >= 300]
    return sorted(selected, key=lambda line: (float(line["bbox"][1]), float(line["bbox"][0])))


def body_line_selected(page_number: int, column: str, y0: float) -> bool:
    if page_number == 1:
        return 495 <= y0 <= 710
    if page_number in (2, 3, 4, 5, 7):
        return 45 <= y0 <= 730
    if page_number == 6:
        if column == "left":
            return 45 <= y0 < 580
        return 45 <= y0 < 290
    if page_number == 8:
        return 565 <= y0 <= 730
    if page_number == 9:
        if column == "left":
            return 45 <= y0 <= 730
        return 45 <= y0 < 530
    return False


def heading_kind(line: dict) -> str | None:
    font = str(line.get("font", ""))
    size = float(line.get("size", 0))
    if "UniversLTStd-Bold" in font and size >= 10.5:
        return "heading2"
    if font == "UniversLTStd" and size >= 9.8:
        return "heading3"
    if "SabonLTStd-Bold" in font and size >= 9:
        return "heading4"
    return None


def parse_body_events(payload: dict) -> list[tuple[str, str, int]]:
    events: list[tuple[str, str, int]] = []
    paragraph = ""
    equation_inserted = False

    def flush(page_number: int) -> None:
        nonlocal paragraph
        if paragraph:
            events.append(("paragraph", normalize_text(paragraph), page_number))
            paragraph = ""

    for page in payload["pages"][:9]:
        page_number = int(page["page"])
        for column in ("left", "right"):
            lines = [
                line for line in column_lines(page, column)
                if body_line_selected(page_number, column, float(line["bbox"][1]))
            ]
            first_line = True
            for line in lines:
                x0 = float(line["bbox"][0])
                y0 = float(line["bbox"][1])
                text = normalize_text(line["text"])
                if not text:
                    continue

                if page_number == 5 and column == "right" and 300 <= y0 < 480:
                    if not equation_inserted:
                        flush(page_number)
                        events.append(("equation", "Pᵢₜ = 1 / [1 + exp(−αₜ − β′xᵢₜ)]", page_number))
                        events.append((
                            "paragraph",
                            "Pᵢₜ is the hazard rate, defined by Pᵢₜ = Pr(T = t | T ≥ t), where T is the discrete random variable giving the uncensored time of event occurrence (Allison, 1982). In other words, Pᵢₜ is the conditional probability that divorce occurs to couple i at time t, given that it has not already occurred. We consider how this hazard rate is a function of time (αₜ) and a vector of explanatory variables (xᵢₜ, with its coefficient vector β). Couples were observed from the earliest time point at which they were (a) married and (b) at least one spouse was aged 50 or older. All couples entered the analysis beginning with the first interview at which they were married (1998 or later). They were censored once they divorced, when one of the spouses died, or at the 2012 interview (or attrition).",
                            page_number,
                        ))
                        equation_inserted = True
                    first_line = False
                    continue

                kind = heading_kind(line)
                if kind:
                    flush(page_number)
                    events.append((kind, text, page_number))
                    first_line = False
                    continue

                column_base = 54.64 if column == "left" else 306.64
                begins_paragraph = x0 >= column_base + 9
                if first_line and paragraph and is_sentence_end(paragraph):
                    begins_paragraph = True
                if begins_paragraph:
                    flush(page_number)
                paragraph = append_wrapped_line(paragraph, text)
                first_line = False

    flush(9)
    return events


def parse_abstract(payload: dict) -> list[tuple[str, str]]:
    value = block_text(payload, 1, 10)
    labels = ["Objectives:", "Method:", "Results:", "Discussion:"]
    positions = [value.find(label) for label in labels]
    if any(position < 0 for position in positions):
        raise ValueError("Structured abstract labels were not recovered")
    sections: list[tuple[str, str]] = []
    for index, label in enumerate(labels):
        start = positions[index] + len(label)
        end = positions[index + 1] if index + 1 < len(labels) else len(value)
        sections.append((label[:-1], normalize_text(value[start:end])))
    return sections


def reference_lines(payload: dict) -> list[tuple[int, str, float, str]]:
    selected: list[tuple[int, str, float, str]] = []
    for page_number in (9, 10):
        page = payload["pages"][page_number - 1]
        for column in ("left", "right"):
            if page_number == 9 and column == "left":
                continue
            for line in column_lines(page, column):
                x0, y0, _, _ = line["bbox"]
                if page_number == 9:
                    if y0 < 560 or y0 > 730:
                        continue
                elif y0 < 45 or y0 > 650:
                    continue
                selected.append((page_number, column, float(x0), normalize_text(line["text"])))
    return selected


def parse_references(payload: dict) -> list[str]:
    references: list[str] = []
    for page_number, column, x0, text in reference_lines(payload):
        base = 54.64 if column == "left" else 306.64
        if x0 <= base + 2.5:
            references.append(text)
        elif not references:
            raise ValueError(f"Reference continuation before first entry on page {page_number}")
        else:
            references[-1] = append_wrapped_line(references[-1], text)
    if len(references) != 36:
        raise ValueError(f"Expected 36 references, found {len(references)}")
    return [normalize_text(reference) for reference in references]


def append_figure(lines: list[str]) -> None:
    lines.extend([
        "![Figure 1. Cumulative probability of gray divorce by marriage order](figures/figure-1.png)",
        "",
        "Figure 1. Cumulative probability of gray divorce by marriage order. Accessibility description: Cumulative gray-divorce probability rises with marital duration for all couples. The remarriage curve rises earliest and reaches roughly .095, the all-marriages curve reaches roughly .058, and the first-marriage curve remains near zero until around 30 years before reaching roughly .032.",
        "",
    ])


def append_table_1(lines: list[str]) -> None:
    lines.extend([
        "![Table 1. Weighted means or percentages of couples' characteristics at baseline](figures/table-1.png)",
        "",
        "Table 1. Weighted Means or Percentages of Couples’ Characteristics at Baseline. Notes: Divorced couples (unweighted n = 296) are compared with married couples (unweighted n = 5,035) across life-course transitions, marital biography, marital quality, spousal homogamy, and economic resources. Asterisk legend: one = p < .10; two = p < .05; three = p < .01; four = p < .001. Exact values and significance markers are preserved in the table image.",
        "",
    ])


def append_table_2(lines: list[str]) -> None:
    lines.extend([
        "![Table 2. Odds ratios from discrete-time logistic regressions of gray divorce](figures/table-2.png)",
        "",
        "Table 2. Odds Ratios From Discrete-Time Logistic Regressions of Gray Divorce (Unweighted N = 29,286). Notes: Model 1 includes the lagged later-life transitions and interview year; Model 2 adds marital biography, marital quality, spousal homogamy, and economic resources. Asterisk legend: one = p < .10; two = p < .05; three = p < .01; four = p < .001. Exact odds ratios, reference categories, model-fit statistics, and significance markers are preserved in the table image.",
        "",
    ])


def build_document(payload: dict) -> str:
    lines = [
        "# Antecedents of Gray Divorce: A Life Course Perspective",
        "",
        "> I-Fen Lin · Susan L. Brown · Matthew R. Wright · Anna M. Hammersmith",
        "",
        "> Department of Sociology, Bowling Green State University, Ohio. *The Journals of Gerontology: Series B, Social Sciences*, 73(6), 1022–1031 (2018). DOI: 10.1093/geronb/gbw164. Advance Access publication December 15, 2016.",
        "",
        "> Correspondence: I-Fen Lin, PhD, Department of Sociology, Bowling Green State University, 217 Williams Hall, Bowling Green, OH 43403; ifenlin@bgsu.edu. Received July 18, 2016; Editorial Decision date November 18, 2016. Decision Editor: Deborah Carr, PhD.",
        "",
        "> © The Author(s) 2016. Published by Oxford University Press on behalf of The Gerontological Society of America. All rights reserved. For permissions, please e-mail: journals.permissions@oup.com.",
        "",
        "## Abstract",
        "",
    ]
    for label, text in parse_abstract(payload):
        lines.extend([f"**{label}:** {text}", ""])
    keywords = strip_prefix(block_text(payload, 1, 11), "Keywords:")
    lines.extend(["## Keywords", "", keywords, ""])

    table_2_added = False
    for kind, value, _page_number in parse_body_events(payload):
        if kind == "heading2" and value == "Discussion" and not table_2_added:
            append_table_2(lines)
            table_2_added = True
        if kind == "heading2":
            lines.extend([f"## {value}", ""])
        elif kind == "heading3":
            lines.extend([f"### {value}", ""])
        elif kind == "heading4":
            lines.extend([f"#### {value}", ""])
        elif kind == "equation":
            lines.extend([f"> {value}", ""])
        else:
            lines.extend([value, ""])
            if value.startswith("Figure 1 shows the cumulative probability"):
                append_figure(lines)
            if value.startswith("Table 1 show the weighted means or percentages"):
                append_table_1(lines)

    if not table_2_added:
        raise ValueError("Table 2 insertion point was not found")
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
