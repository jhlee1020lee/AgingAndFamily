import json
import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
SLUG = "cotten-2021"
BLOCKS_PATH = ROOT_DIR / "tmp" / "pdf_blocks" / f"{SLUG}.json"
OUTPUT_PATH = ROOT_DIR / "content" / "readings" / SLUG / "full.md"


TRUE_HYPHENATED_BREAKS = {
    ("age", "comparative"),
    ("age", "related"),
    ("all", "cause"),
    ("best", "selling"),
    ("community", "based"),
    ("community", "dwelling"),
    ("computer", "mediated"),
    ("cross", "cultural"),
    ("cross", "disciplinary"),
    ("cross", "lagged"),
    ("cross", "sectional"),
    ("de", "professionalization"),
    ("driving", "related"),
    ("face", "to"),
    ("first", "level"),
    ("full", "time"),
    ("health", "related"),
    ("high", "speed"),
    ("in", "depth"),
    ("diathesis", "stress"),
    ("effort", "reward"),
    ("human", "robot"),
    ("large", "scale"),
    ("life", "span"),
    ("long", "term"),
    ("low", "income"),
    ("lower", "income"),
    ("mid", "life"),
    ("non", "representative"),
    ("oldest", "old"),
    ("patient", "directed"),
    ("poor", "quality"),
    ("ragu", "nathan"),
    ("self", "efficacy"),
    ("self", "esteem"),
    ("self", "rated"),
    ("self", "realization"),
    ("self", "regulation"),
    ("self", "report"),
    ("small", "scale"),
    ("specially", "designed"),
    ("socio", "economic"),
    ("task", "oriented"),
    ("time", "relevant"),
    ("well", "being"),
    ("workforce", "age"),
}


LITERAL_CORRECTIONS = {
    "N 5 39": "N = 39",
    "50 1 live": "50+ live",
    "Brostro¨m": "Broström",
    "Retrieved from ,http://": "Retrieved from http://",
    "Retrieved from ,https://": "Retrieved from https://",
    "Retrieved from: ,http://": "Retrieved from: http://",
    "Retrieved from: ,https://": "Retrieved from: https://",
    "website: ,http://": "website: http://",
    "website: ,https://": "website: https://",
    "from ,http://": "from http://",
    "from ,https://": "from https://",
    "Retrieved from:,http://": "Retrieved from: http://",
    "Retrieved from:,https://": "Retrieved from: https://",
    "usein-2015": "use-in-2015",
    "congress-fed-eral-trade-commission": "congress-federal-trade-commission",
    "economic-secu-rity": "economic-security",
    "lower-income-amer-icans": "lower-income-americans",
    "fact-sheet/inter-net-broadband": "fact-sheet/internet-broadband",
    "clinical trial and obervsational study samples": "clinical trial and observational study samples",
    "Foundations and Trendss in Information Systems": "Foundations and Trends® in Information Systems",
    "?sl5 af&tl5 en&u5 ": "?sl=af&tl=en&u=",
    "www.scielo.org. za": "www.scielo.org.za",
    "S0041- 4751": "S0041-4751",
    "tlng% 3Daf": "tlng%3Daf",
    "&skpa 5 on": "&skpa=on",
    ",http://": " http://",
    ",https://": " https://",
}


def load_payload() -> dict:
    return json.loads(BLOCKS_PATH.read_text(encoding="utf-8"))


def lookup_block(payload: dict, page_number: int, block_index: int) -> str:
    for block in payload["pages"][page_number - 1]["blocks"]:
        if block["block_index"] == block_index:
            return block["text"]
    raise KeyError(f"Missing page {page_number} block {block_index}")


def normalize_text(text: str) -> str:
    value = text.replace("\u00a0", " ").replace("\x01", "–")
    value = re.sub(r"\s+", " ", value).strip()
    for source, target in LITERAL_CORRECTIONS.items():
        value = value.replace(source, target)
    value = value.replace(". . .", "…")
    value = value.replace("— ", "—")
    value = re.sub(r"\s+([,.;:?!])", r"\1", value)
    value = re.sub(r"\s+([)])", r"\1", value)
    value = re.sub(r"([(])\s+", r"\1", value)
    value = re.sub(r"https://doi\.\s+org/", "https://doi.org/", value)
    value = re.sub(r"http://dx\.doi\.\s+org/", "http://dx.doi.org/", value)
    value = re.sub(r"(https?://\S+?)\.\.(?=\s|$)", r"\1.", value)
    return value


def current_token_is_url(value: str) -> bool:
    token = value.rsplit(" ", 1)[-1].lstrip(",<(")
    return token.startswith(("http://", "https://", "www."))


def append_wrapped_line(value: str, next_line: str) -> str:
    value = value.rstrip()
    next_line = next_line.lstrip()
    if not value:
        return next_line
    if value.endswith("/") or current_token_is_url(value):
        return value + next_line
    if re.search(r"https?://doi\.$", value) and next_line.startswith("org/"):
        return value + next_line
    match = re.search(r"([A-Za-z]+|\d+)-$", value)
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
        raise ValueError(f"Expected prefix {normalized_prefix!r}, found {value[:100]!r}")
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


def grouped_lines(payload: dict, page_number: int, column: str, y_min: float, y_max: float) -> list[tuple[float, str]]:
    left = column == "left"
    selected = []
    for line in payload["pages"][page_number - 1]["lines"]:
        x0, y0, _, _ = line["bbox"]
        if not (y_min <= y0 <= y_max):
            continue
        if left and x0 >= 300:
            continue
        if not left and x0 < 300:
            continue
        selected.append((float(y0), float(x0), line["text"].strip()))

    rows: list[list[tuple[float, float, str]]] = []
    for item in sorted(selected, key=lambda row: (row[0], row[1])):
        if rows and abs(rows[-1][0][0] - item[0]) <= 1.0:
            rows[-1].append(item)
        else:
            rows.append([item])

    output: list[tuple[float, str]] = []
    for row in rows:
        ordered = sorted(row, key=lambda item: item[1])
        first_x = ordered[0][1]
        text = " ".join(item[2] for item in ordered if item[2])
        output.append((first_x, normalize_text(text)))
    return output


def reference_rows(payload: dict) -> list[tuple[str, float, str]]:
    selections = [
        (16, "right", 463.0, 722.0),
        (17, "left", 50.0, 722.0),
        (17, "right", 50.0, 722.0),
        (18, "left", 50.0, 722.0),
        (18, "right", 50.0, 722.0),
        (19, "left", 50.0, 722.0),
        (19, "right", 50.0, 722.0),
        (20, "left", 50.0, 690.0),
        (20, "right", 50.0, 590.0),
    ]
    rows: list[tuple[str, float, str]] = []
    for page, column, y_min, y_max in selections:
        for x0, text in grouped_lines(payload, page, column, y_min, y_max):
            rows.append((column, x0, text))
    return rows


def parse_references(payload: dict) -> list[str]:
    references: list[str] = []
    for column, x0, line in reference_rows(payload):
        baseline = 51.8 if column == "left" else 312.8
        starts_reference = x0 <= baseline + 3.5
        if starts_reference:
            references.append(line)
        elif not references:
            raise ValueError("Reference continuation appeared before the first entry")
        else:
            references[-1] = append_wrapped_line(references[-1], line)
    references = [normalize_text(reference) for reference in references]
    if len(references) != 132:
        raise ValueError(f"Expected 132 references, found {len(references)}")
    if not references[0].startswith("Administration on Aging. (2018)."):
        raise ValueError("Reference parsing did not begin at the expected Administration on Aging entry")
    if not references[-1].startswith("Zickuhr, K., & Madden"):
        raise ValueError("Reference parsing did not end at the expected Zickuhr and Madden entry")
    return references


def parse_further_reading(payload: dict) -> list[str]:
    references: list[str] = []
    for x0, line in grouped_lines(payload, 20, "right", 620.0, 680.0):
        starts_reference = x0 <= 316.3
        if starts_reference:
            references.append(line)
        elif not references:
            raise ValueError("Further-reading continuation appeared before the first entry")
        else:
            references[-1] = append_wrapped_line(references[-1], line)
    references = [normalize_text(reference) for reference in references]
    if len(references) != 2:
        raise ValueError(f"Expected 2 further-reading entries, found {len(references)}")
    return references


def add_paragraphs(lines: list[str], paragraphs: list[str]) -> None:
    for paragraph in paragraphs:
        lines.extend([normalize_text(paragraph), ""])


def add_section(lines: list[str], heading: str, paragraphs: list[str], level: int = 2) -> None:
    lines.extend([f"{'#' * level} {heading}", ""])
    add_paragraphs(lines, paragraphs)


def add_figure(lines: list[str], filename: str, alt: str, caption: str) -> None:
    lines.extend([f"![{alt}](figures/{filename})", "", normalize_text(caption), ""])


def build_document(payload: dict) -> str:
    opening_1 = join_continuation(block_text(payload, 1, 13), block_text(payload, 1, 14))
    opening_2 = block_text(payload, 2, 0)
    defining = block_text(payload, 2, 2)

    variations_start = block_text(payload, 2, 4)
    variation_page_2 = block_text(payload, 2, 5)
    variation_1_end, variation_2, variation_3_start = split_on_markers(
        variation_page_2,
        ["Elder’s life course paradigm illustrates", "The foundation of the Internet"],
    )
    variation_1 = join_continuation(variations_start, variation_1_end)
    variation_page_3_left = block_text(payload, 3, 0)
    variation_3_end, variation_4_start = split_on_markers(
        variation_page_3_left,
        ["Similar patterns over time are seen with other ICTs"],
    )
    variation_3 = join_continuation(variation_3_start, variation_3_end)
    variation_page_3_right = block_text(payload, 3, 1)
    variation_4_end, variation_5_start = split_on_markers(
        variation_page_3_right,
        ["Americans vary widely in their use of the Internet"],
    )
    variation_4 = join_continuation(variation_4_start, variation_4_end)
    variation_page_5_left = block_text(payload, 5, 0)
    variation_5_end, variation_6_start = split_on_markers(
        variation_page_5_left,
        ["The Silent Generation cohort"],
    )
    variation_5 = join_continuation(variation_5_start, variation_5_end)
    variation_page_5_right = block_text(payload, 5, 1)
    variation_6_end, variation_7, variation_8, variation_9_start = split_on_markers(
        variation_page_5_right,
        [
            "In both these groups, the most consistent ICTs used",
            "Skills differences have been found among older adults",
            "Research on the types of ICTs older adults use",
        ],
    )
    variation_6 = join_continuation(variation_6_start, variation_6_end)
    variation_9 = join_continuation(variation_9_start, block_text(payload, 6, 0))

    divide_1, divide_2, divide_3_start = split_on_markers(
        block_text(payload, 6, 2),
        [
            "Socioeconomic status has also been associated",
            "The research on cumulative disadvantage indicates",
        ],
    )
    divide_3 = join_continuation(divide_3_start, block_text(payload, 6, 3))

    data_1_start = block_text(payload, 6, 5)
    data_page_7_left = block_text(payload, 7, 0)
    data_1_end, data_2, data_3_start = split_on_markers(
        data_page_7_left,
        [
            "ICT research among older adults is still in fairly nascent forms",
            "In addition, most studies use self-report modes of data collection",
        ],
    )
    data_1 = join_continuation(data_1_start, data_1_end)
    data_3 = join_continuation(data_3_start, block_text(payload, 7, 1))

    impacts_start = block_text(payload, 7, 3)
    impacts_page_9_left = block_text(payload, 9, 0)
    impacts_1_end, impacts_2, impacts_3_start = split_on_markers(
        impacts_page_9_left,
        [
            "While younger generations may feel confident using ICTs",
            "Smartphones, computers, tablets, and other ICT use",
        ],
    )
    impacts_1 = join_continuation(impacts_start, impacts_1_end)
    impacts_3 = join_continuation(impacts_3_start, block_text(payload, 9, 1))

    psychosocial_1, psychosocial_2_start = split_on_markers(
        block_text(payload, 9, 3),
        ["Though ICT use is positively associated with older adult well-being"],
    )
    psychosocial_page_10_left = block_text(payload, 10, 0)
    psychosocial_2_end, psychosocial_3, psychosocial_4_start = split_on_markers(
        psychosocial_page_10_left,
        [
            "Instrumental ICT use",
            "Longitudinal analyses of the effects of ICT use on well-being",
        ],
    )
    psychosocial_2 = join_continuation(psychosocial_2_start, psychosocial_2_end)
    psychosocial_4 = join_continuation(psychosocial_4_start, block_text(payload, 10, 1))

    physical = join_continuation(block_text(payload, 10, 3), block_text(payload, 11, 0))

    unanticipated_1, unanticipated_2_start = split_on_markers(
        block_text(payload, 11, 2),
        ["One area that is underexplored is how ICT use relates"],
    )
    unanticipated_page_11_right = block_text(payload, 11, 3)
    (
        unanticipated_2_end,
        unanticipated_3,
        unanticipated_4,
        unanticipated_5,
        unanticipated_6_start,
    ) = split_on_markers(
        unanticipated_page_11_right,
        [
            "Higher levels of technostress",
            "Related to the stress that can result from these technology changes",
            "When ICT technical difficulties and hassles arise",
            "Cyberbullying and online exploitation of older adults",
        ],
    )
    unanticipated_2 = join_continuation(unanticipated_2_start, unanticipated_2_end)
    unanticipated_page_12_left = block_text(payload, 12, 0)
    (
        unanticipated_6_end,
        unanticipated_7,
        unanticipated_8,
        unanticipated_9,
    ) = split_on_markers(
        unanticipated_page_12_left,
        [
            "Compared to younger cohorts",
            "Technology overuse may also become relevant",
            "The current public discourse surrounding technology addiction",
        ],
    )
    unanticipated_6 = join_continuation(unanticipated_6_start, unanticipated_6_end)

    impacts_gap = block_text(payload, 12, 2)
    emerging = join_continuation(block_text(payload, 12, 4), block_text(payload, 13, 0))
    robotics_1, robotics_2 = split_on_markers(
        block_text(payload, 13, 2),
        ["Whether it is through telepresence robots or assistive robots"],
    )

    iot_start = block_text(payload, 13, 4)
    iot_page_13_right = block_text(payload, 13, 5)
    iot_1_end, iot_2, iot_3 = split_on_markers(
        iot_page_13_right,
        [
            "When these IoT systems, devices, and applications",
            "For older adults to successfully age in place",
        ],
    )
    iot_1 = join_continuation(iot_start, iot_1_end)

    telehealth_start = block_text(payload, 13, 7)
    telehealth_page_14 = block_text(payload, 14, 0)
    telehealth_1_end, telehealth_2 = split_on_markers(
        telehealth_page_14,
        ["A challenge with increasing telehealth services"],
    )
    telehealth_1 = join_continuation(telehealth_start, telehealth_1_end)

    driving_start = block_text(payload, 14, 2)
    driving_page_14_right = block_text(payload, 14, 3)
    driving_1_end, driving_2, driving_3, driving_4_start = split_on_markers(
        driving_page_14_right,
        [
            "Older adults are keeping their driver’s license",
            "With the increasing number of adaptive safety systems",
            "Given that giving up driving is one of the major stressful life events",
        ],
    )
    driving_1 = join_continuation(driving_start, driving_1_end)
    driving_page_15_left = block_text(payload, 15, 0)
    driving_4_end, driving_5 = split_on_markers(
        driving_page_15_left,
        ["Most older adults currently report that they would not be willing"],
    )
    driving_4 = join_continuation(driving_4_start, driving_4_end)

    future_page_15_left = block_text(payload, 15, 2)
    future_1, future_2_start = split_on_markers(
        future_page_15_left,
        ["The majority of existing datasets have very basic information"],
    )
    future_page_15_right = block_text(payload, 15, 3)
    future_2_end, future_3, future_4, future_5, future_6_start = split_on_markers(
        future_page_15_right,
        [
            "Various theories on aging suggest",
            "The increasing proliferation and use of digital assistants",
            "Unfortunately, it is likely that scams and cybersecurity threats",
            "Some of the existing and emerging technologies",
        ],
    )
    future_2 = join_continuation(future_2_start, future_2_end)
    future_page_16_left = block_text(payload, 16, 0)
    future_6_end, future_7, future_8, future_9_start = split_on_markers(
        future_page_16_left,
        [
            "Research is needed that examines the interrelationships",
            "Given the rapidly changing technological world",
            "Helping older adults cross the digital divide",
        ],
    )
    future_6 = join_continuation(future_6_start, future_6_end)
    future_page_16_right = block_text(payload, 16, 1)
    future_9_end, future_10 = split_on_markers(
        future_page_16_right,
        ["Technology is constantly evolving"],
    )
    future_9 = join_continuation(future_9_start, future_9_end)

    references = parse_references(payload)
    further_reading = parse_further_reading(payload)

    lines = [
        "# Technologies and aging: understanding use, impacts, and future needs",
        "",
        "> Shelia R. Cotten",
        "",
        "> Office of the Vice President for Research and Department of Sociology, Anthropology, and Criminal Justice, Clemson University, Clemson, SC, United States",
        "",
        "> Chapter 23 in *Handbook of Aging and the Social Sciences*, pp. 373–392 (2021). DOI: https://doi.org/10.1016/B978-0-12-815970-5.00023-1",
        "",
        "## Outline",
        "",
        "> Technology use among older adults (p. 373)  ",
        "> Defining technology: information and communication technologies and emerging technologies (p. 374)  ",
        "> Variations in information and communication technologies use (p. 374)  ",
        "> The digital divide (p. 378)  ",
        "> Gaps in knowledge and data (p. 378)  ",
        "> Impacts of technology use for older adults (p. 379)  ",
        "> Psychosocial outcomes (p. 381)  ",
        "> Physical health outcomes (p. 382)  ",
        "> Unanticipated outcomes (p. 383)  ",
        "> Gaps in knowledge (p. 384)  ",
        "> Emerging technologies and the future of aging (p. 384)  ",
        "> Robotics (p. 385)  ",
        "> Internet of things (p. 385)  ",
        "> Telehealth (p. 385)  ",
        "> Driving and vehicle advances (p. 386)  ",
        "> Future research and conclusions (p. 387)  ",
        "> References (p. 388)  ",
        "> Further reading (p. 392)",
        "",
    ]

    add_section(lines, "Technology use among older adults", [opening_1, opening_2])
    add_section(
        lines,
        "Defining technology: information and communication technologies and emerging technologies",
        [defining],
        level=3,
    )
    add_section(
        lines,
        "Variations in information and communication technologies use",
        [variation_1, variation_2, variation_3],
        level=3,
    )
    add_figure(
        lines,
        "figure-23-1.png",
        "Figure 23.1. A brief timeline of technology advances",
        "Figure 23.1. A brief timeline of technology advances. Adapted from Internet Hall of Fame. (2019). Timeline. Retrieved from https://www.internethalloffame.org/internet-history/timeline/. Accessibility description: Two arrow timelines mark ARPANET becoming operational in 1969; the first personal computer in 1975; the IBM PC using MS-DOS in 1981; cell-phone service in 1983; AOL in 1989; GPS navigation systems marketed in the United States in 1994; the Microsoft tablet in 2000; the first digital-camera cell phone in 2002; Facebook and Gmail in 2004; Twitter in 2006; the first iPhone in 2007; Facebook mobile in 2008; Instagram and the Apple iPad in 2010; and Apple Watch sales in 2015.",
    )
    add_paragraphs(lines, [variation_4])
    add_figure(
        lines,
        "figure-23-2.png",
        "Figure 23.2. Percentage of U.S. adults who use the internet by age",
        "Figure 23.2. Percentage of U.S. adults who use the internet by age. Source: From Pew Research Center. (2019). Internet/broadband fact sheet. Retrieved from https://www.pewresearch.org/internet/fact-sheet/internet-broadband/; Survey conducted 2000–2018. Data for each year based on a pooled analysis of all surveys conducted during that year. Accessibility description: Four trend lines show internet adoption rising between 2000 and 2018 for ages 18–29, 30–49, 50–64, and 65+, while the oldest group remains lowest throughout.",
    )
    add_figure(
        lines,
        "figure-23-3.png",
        "Figure 23.3. ICT adoption among older adults compared with all adults",
        "Figure 23.3. ICT adoption—older adults compared to all adults. Source: From Anderson, M., & Perrin, A. (2017). Tech adoption climbs among older adults. Retrieved from Pew Research Center website: https://www.pewinternet.org/2017/05/17/tech-adoption-climbs-among-older-adults/; Survey conducted September 29–November 6, 2016. Trend data are from previous Pew Research Center Surveys. “Tech Adoption Climbs Among Older Adults.” Accessibility description: For adults aged 65+, adoption rises from 12% to 67% for internet use, 0% to 51% for home broadband, 11% to 42% for smartphones, 1% to 32% for tablets, and 2% to 34% for social media; corresponding latest values for all adults are 90%, 73%, 77%, 51%, and 69%.",
    )
    add_paragraphs(lines, [variation_5])
    add_figure(
        lines,
        "figure-23-4.png",
        "Figure 23.4. Variation in ICT use among older adults",
        "Figure 23.4. Variation in ICT use among older adults. Source: From Anderson, M., & Perrin, A. (2017). Tech adoption climbs among older adults. Retrieved from Pew Research Center website: https://www.pewinternet.org/2017/05/17/tech-adoption-climbs-among-older-adults/; Survey conducted September 29–November 6, 2016. Trend data are from previous Pew Research Center Surveys. “Tech Adoption Climbs Among Older Adults.” Accessibility description: Across ages 65–69, 70–74, 75–79, and 80+, internet use is 82%, 75%, 60%, and 44%; home broadband is 66%, 61%, 41%, and 28%; and smartphone ownership is 59%, 49%, 31%, and 17%.",
    )
    add_paragraphs(lines, [variation_6, variation_7, variation_8, variation_9])

    add_section(lines, "The digital divide", [divide_1], level=3)
    add_figure(
        lines,
        "figure-23-5.png",
        "Figure 23.5. Income and ICT adoption",
        "Figure 23.5. Income and ICT adoption. Note: Respondents who did not give an answer are not shown. Source: From Anderson, M., & Perrin, A. (2017). Tech adoption climbs among older adults. Retrieved from Pew Research Center website: https://www.pewinternet.org/2017/05/17/tech-adoption-climbs-among-older-adults/; Survey conducted January 8–February 7, 2019. Accessibility description: For incomes under $30,000, $30,000–$99,999, and $100,000+, respectively, adoption is 71%, 85%, and 97% for smartphones; 54%, 83%, and 94% for desktop or laptop computers; 56%, 81%, and 94% for home broadband; 36%, 55%, and 70% for tablets; and 18%, 39%, and 64% for all four technologies.",
    )
    add_paragraphs(lines, [divide_2, divide_3])
    add_section(lines, "Gaps in knowledge and data", [data_1, data_2, data_3], level=3)
    add_figure(
        lines,
        "table-23-1.png",
        "Table 23.1. Select data resources and measures for studying older adults’ ICT usage and health",
        "Table 23.1. Select data resources and measures for studying older adults’ ICT usage and health. Accessibility description: The table compares the Health & Retirement Study (HRS) and National Health & Aging Trends Study (NHATS) by study description, respondent sample, example ICT-use measures, example publications, and website. HRS is a longitudinal U.S. panel of adults over 50 and spouses and includes internet use plus periodic internet modules; NHATS is a representative sample of Medicare beneficiaries aged 65+ and includes device access, recent computer and messaging use, and online activities. Exact wording, sample figures, measures, citations, and URLs remain visible in the table image.",
    )

    add_section(lines, "Impacts of technology use for older adults", [impacts_1, impacts_2, impacts_3])
    add_section(
        lines,
        "Psychosocial outcomes",
        [psychosocial_1, psychosocial_2, psychosocial_3, psychosocial_4],
        level=3,
    )
    add_section(lines, "Physical health outcomes", [physical], level=3)
    add_section(
        lines,
        "Unanticipated outcomes",
        [
            unanticipated_1,
            unanticipated_2,
            unanticipated_3,
            unanticipated_4,
            unanticipated_5,
            unanticipated_6,
            unanticipated_7,
            unanticipated_8,
            unanticipated_9,
        ],
        level=3,
    )
    add_section(lines, "Gaps in knowledge", [impacts_gap], level=3)

    add_section(lines, "Emerging technologies and the future of aging", [emerging])
    add_section(lines, "Robotics", [robotics_1, robotics_2], level=3)
    add_section(lines, "Internet of things", [iot_1, iot_2, iot_3], level=3)
    add_section(lines, "Telehealth", [telehealth_1, telehealth_2], level=3)
    add_section(
        lines,
        "Driving and vehicle advances",
        [driving_1, driving_2, driving_3, driving_4, driving_5],
        level=3,
    )

    add_section(
        lines,
        "Future research and conclusions",
        [
            future_1,
            future_2,
            future_3,
            future_4,
            future_5,
            future_6,
            future_7,
            future_8,
            future_9,
            future_10,
        ],
    )
    add_section(lines, "References", references)
    add_section(lines, "Further reading", further_reading)

    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    payload = load_payload()
    document = build_document(payload)
    OUTPUT_PATH.write_text(document, encoding="utf-8")
    references = parse_references(payload)
    print(
        f"[written] {OUTPUT_PATH.relative_to(ROOT_DIR)} "
        f"({len(document.split()):,} whitespace words, {len(references)} references, 2 further-reading entries)"
    )


if __name__ == "__main__":
    main()
