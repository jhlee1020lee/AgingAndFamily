import json
import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
SLUG = "boerner-schulz-2009"
BLOCKS_PATH = ROOT_DIR / "tmp" / "pdf_blocks" / f"{SLUG}.json"
OUTPUT_PATH = ROOT_DIR / "content" / "readings" / SLUG / "full.md"


def load_payload() -> dict:
    return json.loads(BLOCKS_PATH.read_text(encoding="utf-8"))


def block_text(payload: dict, page_number: int, block_index: int) -> str:
    for block in payload["pages"][page_number - 1]["blocks"]:
        if block["block_index"] == block_index:
            return block["text"]
    raise KeyError(f"Missing page {page_number} block {block_index}")


def normalize_text(text: str) -> str:
    value = text.replace("\u00a0", " ").replace("\uf06e", "")
    value = re.sub(r"-\s*\n\s*", "-", value)
    value = re.sub(r"\s+", " ", value).strip()
    value = re.sub(r"\s+([,.;:?!])", r"\1", value)
    return value


def split_on_markers(text: str, markers: list[str]) -> list[str]:
    value = normalize_text(text)
    starts = []
    for marker in markers:
        position = value.find(marker)
        if position < 0:
            raise AssertionError(f"Missing paragraph marker: {marker}")
        starts.append(position)
    if starts != sorted(starts) or len(starts) != len(set(starts)):
        raise AssertionError(f"Invalid marker order: {markers}")
    return [value[start:end].strip() for start, end in zip(starts, starts[1:] + [len(value)])]


def add_section(lines: list[str], title: str, paragraphs: list[str]) -> None:
    lines.extend([f"## {title}", ""])
    for paragraph in paragraphs:
        lines.extend([normalize_text(paragraph), ""])


def main() -> None:
    payload = load_payload()
    if payload.get("page_count") != 4:
        raise AssertionError("Expected the complete four-page source PDF.")

    abstract = normalize_text(block_text(payload, 1, 9)).removeprefix("Abstract: ")
    keywords = normalize_text(block_text(payload, 1, 10)).removeprefix("Keywords: ")
    introduction = "M" + normalize_text(block_text(payload, 1, 4))

    caregiving_right = split_on_markers(
        block_text(payload, 1, 11),
        [
            "the death deplete people’s coping resources",
            "When all three perspectives are considered",
            "The bulk of research studies to date indicate",
        ],
    )
    caregiving_paragraphs = [
        f"{normalize_text(block_text(payload, 1, 6))} {caregiving_right[0]}",
        caregiving_right[1],
        f"{caregiving_right[2]} {normalize_text(block_text(payload, 2, 2))}",
    ]

    complicated_intro = split_on_markers(
        block_text(payload, 2, 4),
        ["Complicated grief, also referred to", "Under these criteria"],
    )
    complicated_after_list = (
        f"{normalize_text(block_text(payload, 2, 7))} "
        f"{normalize_text(block_text(payload, 2, 8))}"
    )

    risk_opening = split_on_markers(
        block_text(payload, 2, 10),
        ["Bereavement studies typically find", "However, in our own work"],
    )
    risk_paragraphs = [
        risk_opening[0],
        f"{risk_opening[1]} {normalize_text(block_text(payload, 3, 3))}",
        normalize_text(block_text(payload, 3, 4)),
        normalize_text(block_text(payload, 3, 5)),
    ]

    practical_paragraphs = [
        normalize_text(block_text(payload, 3, 7)),
        normalize_text(block_text(payload, 3, 8)),
        normalize_text(block_text(payload, 3, 9)),
        (
            f"{normalize_text(block_text(payload, 3, 10))} "
            f"{normalize_text(block_text(payload, 4, 2))}"
        ),
        normalize_text(block_text(payload, 4, 3)).removesuffix(" ■").strip(),
    ]

    references = [
        normalize_text(block_text(payload, 4, 4)),
        f"{normalize_text(block_text(payload, 4, 5))} {normalize_text(block_text(payload, 4, 6))}",
    ]
    references.extend(normalize_text(block_text(payload, 4, index)) for index in range(7, 16))

    lines = [
        "# Caregiving, bereavement and complicated grief",
        "",
        "> Kathrin Boerner, PhD · Richard Schulz, PhD",
        "",
        "> Kathrin Boerner: Senior Research Scientist, Jewish Home Lifecare, New York. Richard Schulz: Professor of Psychiatry, Epidemiology, Sociology, Psychology, Community Health and Health and Rehabilitation Sciences, University of Pittsburgh.",
        "",
        "> *Bereavement Care*, 28(3), 10–13 (2009). DOI: 10.1080/02682620903355382. © 2009 Cruse Bereavement Care.",
        "",
        "> Funding note: Preparation of this manuscript was in part supported by grants from NINR (NR08272, NR09573), NIA (AG15321, AG026010), NIMH (MH071944), NCMHD (MD000207), NHLBI (HL076852, HL076858), and the NSF (EEEC-0540856).",
        "",
    ]

    add_section(lines, "Abstract", [abstract])
    add_section(lines, "Keywords", [keywords])
    add_section(lines, "Introduction", [introduction])
    add_section(lines, "Caregiving and bereavement", caregiving_paragraphs)
    add_section(lines, "Complicated grief", complicated_intro)

    symptom_texts = [
        "trouble accepting the death",
        "inability to trust others since the death",
        "excessive bitterness related to the death",
        "feeling uneasy about moving on",
        "detachment from formerly close others",
        "feeling that life is meaningless without the deceased",
        "feeling that the future holds no prospect for fulfillment without the deceased, and",
        "feeling agitated since the death.",
    ]
    for number, symptom in enumerate(symptom_texts, start=1):
        lines.append(f"{number}. {symptom}")
    lines.extend(["", complicated_after_list, ""])

    add_section(lines, "Who is at risk for complicated grief?", risk_paragraphs)
    add_section(lines, "What can be done?", practical_paragraphs)
    add_section(lines, "References", references)

    output = "\n".join(lines).rstrip() + "\n"

    required_sentinels = [
        "approximately 10−20%",
        "30% of caregivers were at risk for clinical depression",
        "20% experienced complicated grief",
        "persistent and disruptive yearning, pining and longing",
        "at least six months",
        "positive and negative aspects of caregiving can co-exist",
        "emotional (eg. being at peace with the prospect of death)",
        "loss-focused, cognitive-behaviour therapy techniques",
        "10.1080/02682620903355382",
    ]
    missing = [item for item in required_sentinels if item not in output]
    if missing:
        raise AssertionError(f"Missing required source sentinels: {missing}")
    if len(references) != 11:
        raise AssertionError(f"Expected 11 references, found {len(references)}")
    if re.search(r"chatbot|stt|transcript|녹음", output, flags=re.IGNORECASE):
        raise AssertionError("Private transcript/chatbot material must not enter source content.")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(output, encoding="utf-8", newline="\n")
    word_count = len(re.findall(r"\S+", output))
    print(f"[written] {OUTPUT_PATH.relative_to(ROOT_DIR)} ({word_count:,} whitespace words, {len(references)} references)")


if __name__ == "__main__":
    main()
