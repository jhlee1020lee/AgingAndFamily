import json
import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
SLUG = "carstensen-et-al-1999"
BLOCKS_PATH = ROOT_DIR / "tmp" / "pdf_blocks" / f"{SLUG}.json"
OUTPUT_PATH = ROOT_DIR / "content" / "readings" / SLUG / "full.md"


TRUE_HYPHENATED_BREAKS = {
    ("age", "related"),
    ("ever", "deepening"),
    ("emotion", "related"),
    ("information", "seeking"),
    ("knowledge", "related"),
    ("Labouvie", "Vief"),
    ("Life", "course"),
    ("self", "concept"),
    ("self", "reports"),
    ("Turk", "Charles"),
    ("well", "documented"),
}


LITERAL_CORRECTIONS = {
    "planfui": "planful",
    "vaiue": "value",
    "ihe perception": "the perception",
    "iinked": "linked",
    "a lime perspective": "a time perspective",
    "!he broader": "the broader",
    "(hat boundaries": "that boundaries",
    "belief thai social": "belief that social",
    "goals thai motivates": "goals that motivates",
    "theory is thai one": "theory is that one",
    "distinction is thai one": "distinction is that one",
    "one io satisfaction": "one to satisfaction",
    "or me thrill": "or the thrill",
    "Like die older person": "Like the older person",
    "First, Ihere is": "First, there is",
    "in Ihe pursuit": "in the pursuit",
    "nonoveriapping": "nonoverlapping",
    "Older peopie": "Older people",
    "Perlmutier": "Perlmutter",
    "Socioe motion a! selectivity": "Socioemotional selectivity",
    "age-reiated": "age-related",
    "agereiated": "age-related",
    "in die face": "in the face",
    "Carstensen el al.": "Carstensen et al.",
    "1996,1997": "1996, 1997",
    "1917/ 1956": "1917/1956",
    "ones' worldview": "one's worldview",
    "able to explore, the cognitive dimensions": "able to explore the cognitive dimensions",
    "suggest.1": "suggest.¹",
    "infancy2": "infancy²",
    "emotion.3": "emotion.³",
    "Past orientation is associated wilh": "Past orientation is associated with",
    "Holriijn": "Holman",
    "but age is no! Rli.ihU associated": "but age is not reliably associated",
    "Rolhbart": "Rothbart",
    "developmental!y": "developmentally",
    "Tomktns": "Tomkins",
    "emotion molives": "emotion motives",
    "to rind meaning": "to find meaning",
    "know ledge": "knowledge",
    "wil!": "will",
    "lhe ": "the ",
    "Ihese ": "These ",
    "Ihis ": "This ",
    "Ihat ": "That ",
    "lhat ": "that ",
    "Kluckhorn": "Kluckhohn",
    "Strodtbeck, F^": "Strodtbeck, F.",
    "Gotestam Skorpen, C,": "Götestam Skorpen, C.,",
    "Antonucci, T. C,": "Antonucci, T. C.,",
    "Blanchard-Fields, F., Jahnke, H. C,": "Blanchard-Fields, F., Jahnke, H. C.,",
    "291311": "291–311",
    "pp. 69164": "pp. 69–164",
    "4, 151156": "4, 151–156",
    "63, 212220": "63, 212–220",
    "51, 12081217": "51, 1208–1217",
    "12,410": "12, 410",
    "Our.observational": "Our observational",
    "they focus on the here and now,": "they focus on the here and now.",
    "Brandtstadter": "Brandtstädter",
    "Psychology and Aging, 72,410-432": "Psychology and Aging, 12, 410–432",
    "182—206": "182–206",
    "206—237": "206–237",
    "193—210": "193–210",
}


def load_payload() -> dict:
    return json.loads(BLOCKS_PATH.read_text(encoding="utf-8"))


def lookup_block(payload: dict, page_number: int, block_index: int) -> str:
    page = payload["pages"][page_number - 1]
    for block in page["blocks"]:
        if block["block_index"] == block_index:
            return block["text"]
    raise KeyError(f"Missing page {page_number} block {block_index}")


def join_wrapped_lines(text: str) -> str:
    lines = [line.strip() for line in text.replace("\r\n", "\n").split("\n") if line.strip()]
    if not lines:
        return ""
    value = lines[0]
    for next_line in lines[1:]:
        match = re.search(r"([A-Za-z]+)-$", value)
        next_match = re.match(r"([A-Za-z]+)(.*)$", next_line)
        if match and next_match:
            first = match.group(1)
            second = next_match.group(1)
            tail = next_match.group(2)
            if first.lower() == "short" and second.lower() == "and":
                value += f" {second}{tail}"
            elif (first, second) in TRUE_HYPHENATED_BREAKS or (first.lower(), second.lower()) in {
                (left.lower(), right.lower()) for left, right in TRUE_HYPHENATED_BREAKS
            }:
                value += f"{second}{tail}"
            else:
                value = value[:-1] + second + tail
        else:
            value += " " + next_line
    return normalize_text(value)


def normalize_text(text: str) -> str:
    value = re.sub(r"\s+", " ", text).strip()
    for source, target in LITERAL_CORRECTIONS.items():
        value = value.replace(source, target)
    value = value.replace("— ", "—")
    value = re.sub(r"(\d)[-—]\s+(\d)", r"\1–\2", value)
    value = re.sub(r"\s+([,.;:?!])", r"\1", value)
    return value


def fragment(payload: dict, page: int, block: int, prefix: str | None = None) -> str:
    value = join_wrapped_lines(lookup_block(payload, page, block))
    if prefix:
        normalized_prefix = normalize_text(prefix)
        if not value.startswith(normalized_prefix):
            raise ValueError(f"Unexpected prefix for page {page} block {block}: {value[:120]!r}")
        value = value[len(normalized_prefix) :].lstrip()
    return normalize_text(value)


def join_continuation(left: str, right: str) -> str:
    match = re.search(r"([A-Za-z]+)-$", left)
    next_match = re.match(r"([A-Za-z]+)(.*)$", right)
    if match and next_match:
        first = match.group(1)
        second = next_match.group(1)
        tail = next_match.group(2)
        if (first, second) in TRUE_HYPHENATED_BREAKS or (first.lower(), second.lower()) in {
            (a.lower(), b.lower()) for a, b in TRUE_HYPHENATED_BREAKS
        }:
            return normalize_text(left + second + tail)
        return normalize_text(left[:-1] + second + tail)
    return normalize_text(left + " " + right)


def render_paragraphs(fragments: list[str]) -> str:
    paragraphs: list[str] = []
    for item in (normalize_text(value) for value in fragments if value.strip()):
        if not paragraphs:
            paragraphs.append(item)
            continue
        previous = paragraphs[-1]
        terminal = re.search(r"[.!?][\"'’”)]*$", previous) is not None
        begins_lower = re.match(r"[a-z]", item) is not None
        if previous.endswith("-") or not terminal or begins_lower:
            paragraphs[-1] = join_continuation(previous, item)
        else:
            paragraphs.append(item)
    return "\n\n".join(paragraphs)


def refs_from_lines(payload: dict) -> list[str]:
    selected: list[tuple[int, str, float, str]] = []
    for page_number in range(14, 18):
        page = payload["pages"][page_number - 1]
        for line in page["lines"]:
            x0, y0, _, _ = line["bbox"]
            if x0 <= 40 or y0 >= 710:
                continue
            if page_number == 14 and not (x0 > 300 and y0 >= 620):
                continue
            if page_number == 17 and y0 >= 210:
                continue
            column = "left" if x0 < 300 else "right"
            selected.append((page_number, column, float(x0), line["text"]))

    baselines: dict[tuple[int, str], float] = {}
    for page_number, column, x0, _ in selected:
        key = (page_number, column)
        baselines[key] = min(x0, baselines.get(key, x0))

    references: list[str] = []
    for page_number, column, x0, text in selected:
        cleaned_line = normalize_text(text)
        is_new = x0 <= baselines[(page_number, column)] + 4.5
        if not references or is_new:
            references.append(cleaned_line)
        else:
            references[-1] = join_continuation(references[-1], cleaned_line)
    return [normalize_text(reference) for reference in references if reference.strip()]


def add_section(lines: list[str], heading: str, paragraphs: str) -> None:
    lines.extend([heading, "", paragraphs, ""])


def build_document(payload: dict) -> str:
    abstract = fragment(payload, 1, 5)
    epigraph_raw = lookup_block(payload, 1, 6).replace("\nT", "")
    epigraph = join_wrapped_lines(epigraph_raw)
    editor_note = fragment(payload, 1, 11)
    author_note = fragment(payload, 1, 12)

    intro_before_quote = [fragment(payload, 1, 7), fragment(payload, 1, 8)]
    intro_before_quote[0] = re.sub(r"^he monitoring", "The monitoring", intro_before_quote[0])
    medina_quote = fragment(payload, 1, 9)
    intro_after_quote = [
        fragment(payload, page, block)
        for page, block in [(1, 10), (2, 1), (2, 2), (2, 3)]
    ]

    general = [
        fragment(payload, page, block)
        for page, block in [
            (2, 6),
            (2, 7),
            (2, 8),
            (2, 9),
            (2, 10),
            (2, 11),
            (3, 1),
            (3, 2),
            (3, 3),
            (3, 4),
            (3, 5),
            (3, 6),
            (3, 7),
            (4, 1),
        ]
    ]

    theoretical_before_figure = [
        fragment(payload, 4, 2, "Theoretical Relevance to Life Span Development"),
        fragment(payload, 4, 3),
        fragment(payload, 4, 4),
        fragment(payload, 4, 5),
        fragment(payload, 4, 6),
    ]
    theoretical_after_figure = [
        fragment(payload, 4, 7),
        fragment(payload, 5, 8),
        fragment(payload, 5, 9),
        fragment(payload, 5, 10),
        fragment(payload, 5, 11),
        fragment(payload, 5, 12),
    ]

    empirical_intro = fragment(
        payload,
        5,
        13,
        "Empirical Findings From Socioemotional Selectivity Theory\nThe Salience of Emotion as People Approach the End of Life",
    )
    mental_representation = [
        fragment(payload, 5, 14, "Mental representations of social partners."),
        fragment(payload, 5, 15),
        fragment(payload, 5, 16),
        fragment(payload, 6, 0),
        fragment(payload, 6, 1),
        fragment(payload, 6, 2),
        fragment(payload, 6, 3),
        fragment(payload, 6, 4),
    ]
    memory_before_figure = [
        fragment(payload, 6, 5, "Memory for social narratives."),
        fragment(payload, 6, 6),
    ]
    memory_after_figure = [fragment(payload, 6, 7), fragment(payload, 7, 20)]

    emotion_regulation = [
        fragment(payload, 7, 21, "Age Differences in the Regulation of Emotion"),
        *[fragment(payload, 7, block) for block in range(22, 28)],
        *[fragment(payload, 8, block) for block in range(0, 10)],
        fragment(payload, 9, 0),
    ]
    social_networks = [
        fragment(payload, 9, 1, "Life Cycle Differences in the Composition of Social Networks"),
        *[fragment(payload, 9, block) for block in range(2, 9)],
        fragment(payload, 10, 0),
        fragment(payload, 10, 1),
    ]
    social_preferences = [
        *[fragment(payload, 10, block) for block in range(3, 12)],
        *[fragment(payload, 11, block) for block in range(0, 5)],
    ]
    broader_intro = [
        fragment(payload, 11, 5, "Broader Applicability of Time in Psychological Research"),
        fragment(payload, 11, 6),
    ]
    life_span_implications = [
        fragment(payload, 11, 7, "Implications for life span developmental psychology."),
        fragment(payload, 11, 8),
        fragment(payload, 11, 9),
        fragment(payload, 12, 0),
        fragment(payload, 12, 1),
    ]
    social_personality_implications = [
        fragment(payload, 12, 2, "Implications for social and personality psychology."),
        *[fragment(payload, 12, block) for block in range(3, 9)],
    ]
    cultural_implications = [
        fragment(payload, 12, 9, "Implications for cultural psychology."),
        fragment(payload, 12, 10),
        *[fragment(payload, 13, block) for block in range(0, 5)],
    ]
    cognitive_implications = [
        fragment(payload, 13, 5, "Implications for cognitive psychology."),
        *[fragment(payload, 13, block) for block in range(6, 11)],
    ]
    clinical_implications = [
        fragment(payload, 14, 0, "Implications for clinical psychology."),
        *[fragment(payload, 14, block) for block in range(1, 9)],
    ]
    conclusion = [fragment(payload, 14, 10), fragment(payload, 14, 11)]

    references = refs_from_lines(payload)

    footnote_1 = normalize_text(
        "Past orientation is associated with depressive symptoms (e.g., Holman & Silver, 1998), "
        "but age is not reliably associated with past focus."
    )
    footnote_2 = normalize_text(
        "In very early childhood, limited cognitive capacity precludes the appreciation of abstract concepts "
        "of time. Subsequently, the type of goal competition predicted by the theory is minimal. Infants are "
        "highly motivated by both knowledge-related and emotional goals."
    )
    footnote_3 = normalize_text(
        "Some previous research on time perspective associates present orientation, and the concomitant failure "
        "to delay gratification, with hedonism (Gonzalez & Zimbardo, 1985). However, these studies measure time "
        "orientation within a relatively narrow time period; for example, will a person study today or tomorrow? "
        'In contrast, "time" as construed in socioemotional selectivity theory spans the life course. Although an '
        "emphasis on the present is common to both, present orientation activated by awareness of mortality leads "
        "to mixed emotional reactions, such as poignancy, as opposed to hedonism."
    )

    lines = [
        "# Taking Time Seriously: A Theory of Socioemotional Selectivity",
        "",
        "> Laura L. Carstensen · Stanford University",
        "> Derek M. Isaacowitz · University of Pennsylvania",
        "> Susan T. Charles · Stanford University",
        "",
        "> American Psychologist, 54(3), 165–181 (1999) · https://doi.org/10.1037/0003-066X.54.3.165",
        "",
        "## Abstract",
        "",
        abstract,
        "",
        f"> {epigraph}",
        "",
        f"> {editor_note}",
        "",
        f"> {author_note}",
        "",
        render_paragraphs(intro_before_quote),
        "",
        f"> {medina_quote}",
        "",
        render_paragraphs(intro_after_quote),
        "",
    ]
    add_section(lines, "## Socioemotional Selectivity Theory", "")
    add_section(lines, "### General Tenets of the Theory", render_paragraphs(general))
    add_section(lines, "### Theoretical Relevance to Life Span Development", render_paragraphs(theoretical_before_figure))
    lines.extend(
        [
            "![Figure 1. Idealized model of the salience of two classes of social motives across the life span](figures/figure-1.png)",
            "",
            "Figure 1. Idealized Model of Socioemotional Selectivity Theory’s Conception of the Salience of Two Classes of Social Motives Across the Life Span. Note. From “The Social Context of Emotion,” by L. L. Carstensen, J. Gross, & H. Fung, 1997, Annual Review of Geriatrics and Gerontology, 17, p. 331. Copyright 1997 by Springer Publishing Company, Inc. Reprinted with permission. Accessibility description: The vertical axis runs from low to high salience of social motives; the horizontal axis runs from infancy through adolescence and middle age to old age. The emotion trajectory is high in infancy, lower across adolescence and middle age, and higher again in old age. The knowledge trajectory rises from infancy, remains high through adolescence and middle age, and declines toward old age.",
            "",
            render_paragraphs(theoretical_after_figure),
            "",
            f"> Footnote 1. {footnote_1}",
            "",
            f"> Footnote 2. {footnote_2}",
            "",
            f"> Footnote 3. {footnote_3}",
            "",
        ]
    )
    add_section(lines, "## Empirical Findings From Socioemotional Selectivity Theory", "")
    add_section(lines, "### The Salience of Emotion as People Approach the End of Life", empirical_intro)
    add_section(lines, "#### Mental Representations of Social Partners", render_paragraphs(mental_representation))
    add_section(lines, "#### Memory for Social Narratives", render_paragraphs(memory_before_figure))
    lines.extend(
        [
            "![Figure 2. Mean proportion of emotional material recalled in four adult age groups](figures/figure-2.png)",
            "",
            "Figure 2. Mean Proportion of Emotional Material Recalled in Four Adult Age Groups. Note. Error bars depict standard errors of the mean. From “The Salience of Emotion Across the Adult Life Course,” by L. L. Carstensen and S. Turk-Charles, 1994, Psychology and Aging, 9, p. 262. Copyright 1994 by the American Psychological Association. Accessibility description: Mean proportions (standard errors in parentheses) were .20 (.04) for ages 20–29, .22 (.03) for ages 35–45, .32 (.05) for ages 53–67, and .34 (.03) for ages 70–83.",
            "",
            render_paragraphs(memory_after_figure),
            "",
        ]
    )
    add_section(lines, "### Age Differences in the Regulation of Emotion", render_paragraphs(emotion_regulation))
    add_section(lines, "### Life Cycle Differences in the Composition of Social Networks", render_paragraphs(social_networks))
    add_section(lines, "### Social Preferences as a Function of Time", render_paragraphs(social_preferences))
    add_section(lines, "## Broader Applicability of Time in Psychological Research", render_paragraphs(broader_intro))
    add_section(lines, "### Implications for Life Span Developmental Psychology", render_paragraphs(life_span_implications))
    add_section(lines, "### Implications for Social and Personality Psychology", render_paragraphs(social_personality_implications))
    add_section(lines, "### Implications for Cultural Psychology", render_paragraphs(cultural_implications))
    add_section(lines, "### Implications for Cognitive Psychology", render_paragraphs(cognitive_implications))
    add_section(lines, "### Implications for Clinical Psychology", render_paragraphs(clinical_implications))
    add_section(lines, "## Concluding Comments", render_paragraphs(conclusion))
    lines.extend(["## References", ""])
    for reference in references:
        lines.extend([reference, ""])
    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    payload = load_payload()
    document = build_document(payload)
    OUTPUT_PATH.write_text(document, encoding="utf-8")
    word_count = len(re.findall(r"\b[\w’'-]+\b", document))
    print(f"[written] {OUTPUT_PATH.relative_to(ROOT_DIR)} ({word_count} tokens)")


if __name__ == "__main__":
    main()
