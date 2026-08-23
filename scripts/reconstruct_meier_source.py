import json
import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
SLUG = "meier-et-al-2016"
BLOCKS_PATH = ROOT_DIR / "tmp" / "pdf_blocks" / f"{SLUG}.json"
OUTPUT_PATH = ROOT_DIR / "content" / "readings" / SLUG / "full.md"


TRUE_HYPHENATED_BREAKS = {
    ("death", "phobic"),
    ("inter", "rater"),
    ("life", "sustaining"),
    ("of", "life"),
    ("peer", "reviewed"),
    ("well", "characterized"),
}


LITERAL_CORRECTIONS = {
    "dying.The authors": "dying. The authors",
    "death.Stakeholders": "death. Stakeholders",
    "perspectives.Thirty-six": "perspectives. Thirty-six",
    "and other.The top": "and other. The top",
    "(50%).Taking": "(50%). Taking",
    "end-of-life care.Dialogues": "end-of-life care. Dialogues",
    "successful dying,good death,aging,hospice,palliative care,caregivers": (
        "successful dying, good death, aging, hospice, palliative care, caregivers"
    ),
    "time is all you have...and": "time is all you have. . .and",
    "“... our most cruel": "“. . . our most cruel",
    "patients‘": "patients’",
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
    value = value.replace("\u2010", "-").replace("\u2011", "-")
    value = value.replace(". . .", "__SPACED_ELLIPSIS__")
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
    value = value.replace("__SPACED_ELLIPSIS__", ". . .")
    return value.strip()


def append_wrapped_line(value: str, next_line: str) -> str:
    next_line = next_line.replace("\ufb01 ", "fi").replace("\ufb02 ", "fl")
    next_line = next_line.replace("\ufb01", "fi").replace("\ufb02", "fl")
    next_line = next_line.replace("\u2010", "-").replace("\u2011", "-")
    if value.endswith(("/", "–")) or next_line.startswith("_"):
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


def normalize_reference(text: str) -> str:
    value = normalize_text(text)
    value = re.sub(r",(?=[A-Za-z])", ", ", value)
    value = re.sub(r",(?=\d)", ", ", value)
    value = re.sub(r":(?=[A-Za-z“])", ": ", value)
    value = re.sub(r";(?=\d)", "; ", value)
    value = re.sub(r"\.(?=[A-Z])", ". ", value)
    value = value.replace("Epidemiology.3rd", "Epidemiology. 3rd")
    value = re.sub(r"\?(?=[A-Z])", "? ", value)
    value = re.sub(r"(?<=[A-Za-z])(?=“)", " ", value)
    value = re.sub(r"”(?=[A-Za-z])", "” ", value)
    return normalize_text(value)


def reference_lines(payload: dict) -> list[tuple[int, str, float, float, str]]:
    selected: list[tuple[int, str, float, float, str]] = []
    for page_number in (10, 11):
        page_lines: list[tuple[int, str, float, float, str]] = []
        for line in payload["pages"][page_number - 1]["lines"]:
            x0, y0, _, _ = line["bbox"]
            lower_y = 280 if page_number == 10 else 75
            upper_y = 710 if page_number == 10 else 625
            if not lower_y <= y0 <= upper_y:
                continue
            column = "left" if x0 < 295 else "right"
            page_lines.append(
                (page_number, column, float(x0), float(y0), line["text"].strip())
            )
        selected.extend(item for item in page_lines if item[1] == "left")
        selected.extend(item for item in page_lines if item[1] == "right")
    return selected


def parse_references(payload: dict) -> list[str]:
    selected = reference_lines(payload)
    references: list[str] = []
    for page_number, _, _, _, text in selected:
        cleaned = normalize_text(text)
        if re.match(r"^\d+\.\s", cleaned):
            references.append(cleaned)
        elif not references:
            raise ValueError(f"Reference continuation before first entry on page {page_number}")
        else:
            references[-1] = join_continuation(references[-1], cleaned)

    references = [normalize_reference(reference) for reference in references]
    if len(references) != 72:
        raise ValueError(f"Expected 72 references, found {len(references)}")
    for index, reference in enumerate(references, start=1):
        if not reference.startswith(f"{index}. "):
            raise ValueError(f"Reference sequence error at {index}: {reference[:100]}")
    if not references[0].startswith("1. Albom M: Tuesdays with Morrie."):
        raise ValueError("First reference sentinel did not match Albom")
    if not references[35].startswith("36. Landis JR, Koch GG:"):
        raise ValueError("Page 10-to-11 reference transition did not match Landis and Koch")
    if not references[54].startswith("55. National Palliative Care Research:"):
        raise ValueError("Page 11 column transition did not match National Palliative Care Research")
    if not references[-1].startswith("72. van Gennip IE, Pasman HR, Kaspers PJ, et al:"):
        raise ValueError("Last reference sentinel did not match van Gennip et al.")
    return references


def add_paragraphs(lines: list[str], paragraphs: list[str]) -> None:
    for paragraph in paragraphs:
        lines.extend([normalize_text(paragraph), ""])


def add_section(lines: list[str], heading: str, paragraphs: list[str], level: int = 2) -> None:
    lines.extend([f"{'#' * level} {heading}", ""])
    add_paragraphs(lines, paragraphs)


def add_asset(
    lines: list[str],
    alt_text: str,
    source: str,
    caption: str,
    accessibility: str,
) -> None:
    lines.extend(
        [
            f"![{alt_text}]({source})",
            "",
            f"{normalize_text(caption)} Accessibility description: {normalize_text(accessibility)}",
            "",
        ]
    )


def build_document(payload: dict) -> str:
    abstract = block_text(payload, 1, 3)
    keywords = strip_prefix(block_text(payload, 1, 4), "Key Words:")

    intro_third, intro_fourth = split_on_markers(
        join_continuation(block_text(payload, 2, 4), block_text(payload, 2, 5)),
        ["By examining the perspectives regarding a good death"],
    )
    introduction = [
        block_text(payload, 2, 2),
        block_text(payload, 2, 3),
        intro_third,
        intro_fourth,
    ]

    data_sources = join_continuation(block_text(payload, 2, 8), block_text(payload, 3, 0))

    selection_open, selection_search, selection_screening, selection_measures = split_on_markers(
        block_text(payload, 3, 3),
        [
            "Two authors (EAM and JVG) independently searched",
            "Most initial search results (3,434) were excluded",
            "References from review papers of a good death were examined",
        ],
    )
    selection = [
        join_continuation(block_text(payload, 3, 2), selection_open),
        selection_search,
        selection_screening,
        join_continuation(selection_measures, block_text(payload, 3, 4)),
    ]

    coding_process, coding_sources = split_on_markers(
        block_text(payload, 3, 6),
        ["The sources of each definition were separated into three groups:"],
    )

    analysis_first = join_continuation(
        block_text(payload, 4, 1),
        block_text(payload, 4, 2),
        block_text(payload, 5, 0),
    )
    analyses = [analysis_first, block_text(payload, 5, 1)]

    themes_first = join_continuation(block_text(payload, 5, 5), block_text(payload, 5, 6))
    themes_four, themes_family, themes_hcp_start = split_on_markers(
        block_text(payload, 5, 7),
        [
            "Prebereaved and bereaved family members rated",
            "Among HCPs, preference for dying process",
        ],
    )
    themes_hcp_end, themes_differences = split_on_markers(
        block_text(payload, 7, 0),
        ["Differences in frequencies of themes among the stakeholder groups"],
    )
    themes_hcp = join_continuation(themes_hcp_start, themes_hcp_end)
    themes_differences = join_continuation(themes_differences, block_text(payload, 7, 1))

    discussion_overview, discussion_limits, discussion_methods_start = split_on_markers(
        block_text(payload, 7, 3),
        [
            "This review has several limitations.",
            "Empirical research on what comprises a good death",
        ],
    )
    discussion_methods_end, discussion_consensus = split_on_markers(
        block_text(payload, 8, 0),
        ["Despite these limitations, we were able to identify"],
    )
    discussion_methods = join_continuation(discussion_methods_start, discussion_methods_end)

    discussion_family_start, discussion_dignity_start = split_on_markers(
        join_continuation(block_text(payload, 8, 1), block_text(payload, 8, 2)),
        ["Additionally, “dignity” was reported"],
    )
    discussion_dignity_end, discussion_religion, discussion_emotional = split_on_markers(
        block_text(payload, 9, 0),
        [
            "The role of religiosity/spirituality was also",
            "Finally, although some literature exists on pain and physical symptoms",
        ],
    )
    discussion_dignity = join_continuation(discussion_dignity_start, discussion_dignity_end)
    discussion = [
        discussion_overview,
        discussion_limits,
        discussion_methods,
        discussion_consensus,
        discussion_family_start,
        discussion_dignity,
        discussion_religion,
        discussion_emotional,
    ]

    future_open, future_studies, future_dialogue_start = split_on_markers(
        join_continuation(block_text(payload, 9, 2), block_text(payload, 9, 3)),
        [
            "Well-designed studies are also necessary",
            "Finally, an important goal of this review is to issue a call for action",
        ],
    )
    future_dialogue = join_continuation(
        future_dialogue_start,
        block_text(payload, 10, 0),
        block_text(payload, 10, 1),
    )

    references = parse_references(payload)

    lines = [
        "# Defining a Good Death (Successful Dying): Literature Review and a Call for Research and Public Dialogue",
        "",
        "> **Clinical Review Article**",
        "",
        "> Emily A. Meier, Ph.D. · Jarred V. Gallegos, M.A. · Lori P. Montross-Thomas, Ph.D. · Colin A. Depp, Ph.D. · Scott A. Irwin, M.D., Ph.D. · Dilip V. Jeste, M.D.",
        "",
        "> Department of Psychiatry (EAM, JVG, LPMT, CAD, SAI, DVJ); Sam and Rose Stein Institute for Research on Aging (EAM, JVG, LPMT, CAD, DVJ), Moores Cancer Center, Psychiatry & Psychosocial Services, La Jolla, CA; Patient & Family Support Services (EAM, JVG, LPMT, SAI); and Department of Family Medicine and Public Health (LPMT), University of California, San Diego, La Jolla, CA.",
        "",
        "> *The American Journal of Geriatric Psychiatry*, 24(4), 261–271 (April 2016). DOI: 10.1016/j.jagp.2016.01.135.",
        "",
        "> Received May 12, 2015; revised December 18, 2015; accepted January 19, 2016.",
        "",
        "> Send correspondence and reprint requests to Dr Dilip V. Jeste, Stein Institute for Research on Aging, University of California, San Diego, 9500 Gilman Drive #0664, La Jolla, CA 92093-0664. e-mail: djeste@ucsd.edu",
        "",
        "> © 2016 American Association for Geriatric Psychiatry. Published by Elsevier Inc. All rights reserved.",
        "",
    ]

    add_section(lines, "Abstract", [abstract])
    add_section(lines, "Key Words", [keywords])
    add_section(lines, "Introduction", [block_text(payload, 2, 1), *introduction])

    add_section(lines, "Methods", [])
    add_section(lines, "Data Sources", [data_sources], level=3)
    add_section(lines, "Selection of Articles", selection, level=3)
    add_section(lines, "Coding of Articles", [coding_process, coding_sources], level=3)
    add_asset(
        lines,
        "Figure 1: PRISMA flow diagram of the review process",
        "figures/figure-1.png",
        "Figure 1. Preferred Reporting Items for Systematic Reviews and Meta-Analyses (PRISMA) flow diagram of the review process.",
        "The database search identified 3,434 studies: 1,506 from PubMed and 1,928 from PsycInfo. The figure shows 3,042 studies excluded based on title/abstract reviewed, leaving 392 full text articles reviewed for eligibility. It states that 356 articles were excluded as they did not provided quantitative or qualitative data that specifically defined or used a measure of good death as the main aim or outcome of the study. The printed reasons and counts are: Quality of end-of-life care (73); Duplicate articles (51); Utilization/attitudes toward hospice and palliative care (20); Letters and commentary to the editor (20); Education/Training (17); Euthanasia (17); Decision-making (13); Instrument development (12); Quality of life (11); Clinical case report (10); Pediatric death (10); Philosophical/sociological discussion of good death (10); Place of death (8); Quality of death (8); End of life preferences/expectations (7); Review papers (7); Unable to obtain full-text (7); Dignity (6); Disease management (6); Treatment decisions (6); Bereavement (5); Difficulty interpreting results (4); Ethical/legal (4); Religion/Spirituality (4); Palliative Sedation (3); Advanced directives (2); Caregiving (2); Communication (2); Components of meaning making (2); Informed Consent (2); Attitude toward dying (1); Clinical guidelines (1); Death anxiety (1); Good life (1); Hope (1); Life after death (1); and Prognosis (1). The final box states 36 studies included in final analysis.",
    )
    add_section(lines, "Analyses", analyses, level=3)

    add_section(lines, "Results", [block_text(payload, 5, 3)])
    add_asset(
        lines,
        "Table 1: demographic characteristics of patients in the 36 reviewed articles",
        "figures/table-1.png",
        "Table 1. Demographic Characteristics of Patients in the 36 Articles Reviewed for Successful Dying.",
        "Twenty displayed patient-perspective study rows run from Payne (1996) through Reinke (2013). Columns report country, qualitative/quantitative design, measure of a good death, diagnosis/population, age, gender, ethnicity/race, and numbers of patients, family members, and HCPs. In row order, the printed age; gender; ethnicity/race; and patient/family/HCP counts are: Payne (1996), range 30–81; 50% Male; —; 18/—/20; Payne and Hillier (1996), mean 66; 50% Male; —; 67/—/—; Leichtentritt (2000), range 60–86; 57% Female; Israelis; 26/—/—; Steinhauser (2000, reference 41), mean 68; 78% Male; 69% Non-Hispanic, White; 340/332/361; Steinhauser (2000, reference 33), range 26–77; 36% Male; 70% Non-Hispanic, White; 14/4/57; Pierson (2002), mean 41; 91% Male; 69% Non-Hispanic, White; 35/—/—; Vig (2002), range 60–84; 87% Female; —; 16/—/—; Tong (2003), range 14–68; 67% Female; 53% Non-Hispanic, White, 23% Black, and 14% Hispanic; 95/—/—; Vig (2004), mean 71; 100% Male; —; 26/—/—; Goldstein (2006), range 39–83; 70% Male; Non-Hispanic, White; 13/—/—; Hirai (2006), mean 62; 54% Male; —; 13/10/40; Rietjens (2006), range 20–93; 61% Female; —; 1,388/—/—; Lloyd-Williams (2007), range 80–89; 40% Male; 85% English; 40/—/—; Miyashita (2007), range 49–70; 48% Male; —; 2,548/513/—; Gott (2008), mean 77; 53% Male; —; 40/—/—; Hughes (2008), range 24–85; 50% Male; —; 100/—/—; De Jong (2009), —; —; —; 3/3/9; Tayeb (2010), —; 58% Male; Non-Saudi Arabian; 26/77/181; Hattori (2012), mean 78; 77% Female; Japanese; 18/—/—; and Reinke (2013), mean 69; 97% Male; 291 White; 376/—/—. Measures containing additional printed counts are Steinhauser's 44-attribute survey, Rietjens's 11 attributes, Miyashita's 57 components, and Reinke's rating of the last 7 days of life. Exact study, country, design, measure, diagnosis/population wording, dashes, and superscript reference numbers—including the printed country 'Amsterdam' for Goldstein—are preserved in the source crop.",
    )

    add_section(lines, "Themes and Subthemes of Successful Death Definitions", [themes_first])
    add_asset(
        lines,
        "Table 2: eleven core themes and their subthemes",
        "figures/table-2.png",
        "Table 2. Core Themes and Subthemes of a Good Death and/or Successful Dying.",
        "The 11 core themes and printed subthemes are: Preferences for dying process (Death scene [how, who, where, and when]; Dying during sleep; Preparation for death [e.g., advanced directives, funeral arrangements]); Pain-free status (Not suffering; Pain and symptom management); Emotional well-being (Emotional support; Psychological comfort; Chance to discuss meaning of death); Family (Family support; Family acceptance of death; Family is prepared for death; Not be a burden to family); Dignity (Respect as an individual; Independence); Life completion (Saying goodbye; Life well lived; Acceptance of death); Religiosity/spirituality (Religious/spiritual comfort; Faith; Meet with clergy); Treatment preferences (Not prolonging life; Belief that all available treatments were used; Control over treatment; Euthanasia/physician-assisted suicide); Quality of life (Living as usual; Maintaining hope, pleasure, gratitude; Life is worth living); Relationship with HCP (Trust/support/comfort from physician/nurse; Physician comfortable with death/dying; Discuss spiritual beliefs/fears with physician); and Other (Recognition of culture; Physical touch; Being with pets; Healthcare costs).",
    )
    add_paragraphs(lines, [themes_four, themes_family, themes_hcp, themes_differences])
    add_asset(
        lines,
        "Table 3: number and percentage of articles endorsing each core theme by stakeholder group",
        "figures/table-3.png",
        "Table 3. Number of Articles (N = 36) that Included Specific Core Themes.",
        "Cells give article counts with stakeholder percentages in parentheses for patients (N = 20), prebereaved/bereaved family (N = 10), and HCPs (N = 18), respectively: preferences for dying process 20 (100), 10 (100), 17 (94); pain-free status 17 (85), 9 (90), 15 (83); religiosity/spirituality 13 (65), 5 (50), 9 (59); emotional well-being 12 (60), 7 (70), 12 (67); life completion 11 (55), 8 (80), 10 (56); treatment preferences 11 (55), 7 (70), 11 (61); dignity 11 (55), 7 (70), 12 (67); family 11 (55), 7 (70), 11 (61); quality of life 7 (35), 7 (70), 4 (22); relationship with HCP 4 (20), 4 (40), 7 (39); and other 8 (40), 4 (40), 5 (28). The printed note states: Values in parentheses are percent of the stakeholders endorsing themes.",
    )

    add_section(lines, "Discussion", discussion)
    add_section(lines, "Future Directions", [future_open, future_studies, future_dialogue])
    add_section(lines, "Funding", [block_text(payload, 10, 2)])
    add_section(lines, "Appendix: Supplementary Material", [block_text(payload, 10, 4)])
    add_section(lines, "References", references)

    document = "\n".join(lines).rstrip() + "\n"

    required_sentinels = [
        "Thirty-six studies met eligibility criteria",
        "religiosity/spiritualty",
        "preferences for dying process (94% of reports)",
        "pain-free status (81%)",
        "emotional well-being (64%)",
        "from inception through November 2015",
        "Most initial search results (3,434) were excluded",
        "which resulted in 392 articles for further review",
        "Twenty-seven articles contained qualitative methods, 5 articles used quantitative methods, and 4 articles contained mixed methods",
        "kappa = 0.896 (p < 0.0.000; standard error: 0.023)",
        "patients’ perspectives (N = 20)",
        "family members’ perspectives (N = 10)",
        "HCPs’ perspectives (N = 18)",
        "ranged from 3 to 2,548 (mean: 184.4; standard deviation: 440.8)",
        "14–93 years (mean: 89.7; standard deviation: 16.6)",
        "quality of life, which was rated more frequently in family perspective articles (70%)",
        "Nearly two-thirds of patients (65%)",
        "a loss of autonomy (91%)",
        "life enjoyable (86%), and a loss of dignity (71%)",
        "largely “death-phobic” culture",
        "MRSG-13-233-01 PCSM",
        "Supplementary data to this article can be found online",
    ]
    for sentinel in required_sentinels:
        if sentinel not in document:
            raise ValueError(f"Required source sentinel is missing: {sentinel}")

    image_sources = re.findall(r"!\[[^\]]*\]\((figures/[^)]+)\)", document)
    expected_images = [
        "figures/figure-1.png",
        "figures/table-1.png",
        "figures/table-2.png",
        "figures/table-3.png",
    ]
    if image_sources != expected_images:
        raise ValueError(f"Unexpected figure/table image sequence: {image_sources}")
    for relative_path in expected_images:
        if not (OUTPUT_PATH.parent / relative_path).is_file():
            raise FileNotFoundError(f"Missing figure/table asset: {relative_path}")

    forbidden = [
        "chatbot",
        "stt",
        "transcript",
        "lecture recording",
        "강의 녹음",
        "개인정보",
        "Downloaded from",
        "Seoul National University user",
    ]
    lowered = document.lower()
    for token in forbidden:
        if token.lower() in lowered:
            raise ValueError(f"Non-source or private material detected: {token}")
    return document


def main() -> None:
    payload = load_payload()
    document = build_document(payload)
    OUTPUT_PATH.write_text(document, encoding="utf-8")
    references = parse_references(payload)
    print(
        f"[written] {OUTPUT_PATH.relative_to(ROOT_DIR)} "
        f"({len(document.split()):,} whitespace words, {len(references)} references, 4 assets)"
    )


if __name__ == "__main__":
    main()
