#!/usr/bin/env python3
"""Deterministically reconstruct the Korean Stage 2 translation for Utz et al."""

from __future__ import annotations

from collections import Counter
from hashlib import sha256
from pathlib import Path
import re

from utz_translation_data import TRANSLATED_BLOCKS


ROOT_DIR = Path(__file__).resolve().parents[1]
CONTENT_DIR = ROOT_DIR / "content" / "readings" / "utz-et-al-2002"
SOURCE_PATH = CONTENT_DIR / "full.md"
OUTPUT_PATH = CONTENT_DIR / "translation.md"
EXPECTED_SOURCE_SHA256 = "F55434DCC90975BE98F29BC63B656F93D3CC8F01AC5A33F82416A2606DE65FAA"


HEADING_TRANSLATIONS = {
    "# The Effect of Widowhood on Older Adults’ Social Participation: An Evaluation of Activity, Disengagement, and Continuity Theories":
        "# 배우자 사별이 노인의 사회참여에 미치는 영향: 활동이론, 이탈이론, 지속성이론의 평가",
    "## Abstract": "## 초록",
    "## Key Words": "## 핵심어",
    "## Introduction": "## 서론",
    "### Defining Social Participation": "### 사회참여의 정의",
    "### The Effect of Widowhood on Social Participation": "### 배우자 사별이 사회참여에 미치는 영향",
    "### Theoretical Explanations: Activity, Disengagement, and Continuity Theories":
        "### 이론적 설명: 활동이론, 이탈이론, 지속성이론",
    "### Prior Research and its Methodological Limitations": "### 선행연구와 그 방법론적 한계",
    "## Methods": "## 방법",
    "### Sample": "### 표본",
    "### Measures": "### 측정",
    "#### Dependent Variables": "#### 종속변수",
    "#### Predictor Variables": "#### 예측변수",
    "#### Control Variables": "#### 통제변수",
    "#### Confounding Variables": "#### 교란변수",
    "### Analytic Plan": "### 분석계획",
    "## Results": "## 결과",
    "### Sample Characteristics": "### 표본 특성",
    "## Discussion": "## 논의",
    "### Summary and Conclusions": "### 요약 및 결론",
    "### Evaluation of Activity, Disengagement, and Continuity Theories":
        "### 활동이론, 이탈이론, 지속성이론의 평가",
    "### Limitations and Future Research": "### 한계와 향후 연구",
    "### Practical Applications and Implications": "### 실천적 적용과 함의",
    "## References": "## 참고문헌",
}


IMAGE_ALT_TRANSLATIONS = {
    "Table 1: means and standard deviations for widowed and nonwidowed respondents":
        "표 1: 배우자 사별 응답자와 비사별 응답자의 평균과 표준편차",
    "Figure 1: formal and informal social participation at baseline and Wave 1 by marital status":
        "그림 1: 혼인상태별 기초조사와 1차 조사 시점의 공식적·비공식적 사회참여",
    "Table 2: OLS coefficients predicting baseline social participation":
        "표 2: 기초시점 사회참여를 예측하는 OLS 계수",
    "Table 3: OLS coefficients predicting formal and informal participation six months after widowhood":
        "표 3: 배우자 사별 6개월 후 공식적·비공식적 참여를 예측하는 OLS 계수",
    "Figure 2: whose interest in social contact changed after widowhood":
        "그림 2: 배우자 사별 후 누구의 사회적 접촉 관심이 달라졌는가",
    "Figure 3: whether widowed older adults kept busy to cope":
        "그림 3: 배우자를 사별한 노인이 대처를 위해 계속 바쁘게 지냈는가",
}


def digit_tokens(value: str) -> Counter[str]:
    return Counter(token.replace(",", "") for token in re.findall(r"\d+(?:[.,]\d+)?%?", value))


def image_parts(block: str) -> tuple[str, str] | None:
    match = re.fullmatch(r"!\[([^\]]+)\]\(([^)]+)\)", block)
    return (match.group(1), match.group(2)) if match else None


def build_translation(source: str) -> str:
    blocks = re.split(r"\n{2,}", source.strip())
    try:
        reference_heading_index = blocks.index("## References")
    except ValueError as exc:
        raise ValueError("Source References heading is missing") from exc
    nonreference_source = [
        block for block in blocks[1:reference_heading_index]
        if not block.startswith("#") and image_parts(block) is None
    ]
    if len(TRANSLATED_BLOCKS) != 62 or len(nonreference_source) != 62:
        raise ValueError(
            f"Expected 62 non-reference blocks; translation/source are "
            f"{len(TRANSLATED_BLOCKS)}/{len(nonreference_source)}"
        )

    output_blocks: list[str] = []
    translated_index = 0
    image_paths: list[str] = []
    in_references = False
    for block in blocks:
        if block == "## References":
            output_blocks.append(HEADING_TRANSLATIONS[block])
            in_references = True
            continue
        if in_references:
            output_blocks.append(block)
            continue
        if block.startswith("#"):
            if block not in HEADING_TRANSLATIONS:
                raise ValueError(f"Unmapped heading: {block}")
            output_blocks.append(HEADING_TRANSLATIONS[block])
            continue
        image = image_parts(block)
        if image is not None:
            alt, asset_path = image
            if alt not in IMAGE_ALT_TRANSLATIONS:
                raise ValueError(f"Unmapped image alt: {alt}")
            image_paths.append(asset_path)
            output_blocks.append(f"![{IMAGE_ALT_TRANSLATIONS[alt]}]({asset_path})")
            continue
        output_blocks.append(TRANSLATED_BLOCKS[translated_index])
        translated_index += 1

    if translated_index != 62:
        raise ValueError(f"Used {translated_index}/62 translated blocks")
    expected_images = [
        "figures/table-1.png", "figures/figure-1.png", "figures/table-2.png",
        "figures/table-3.png", "figures/figure-2.png", "figures/figure-3.png",
    ]
    if image_paths != expected_images:
        raise ValueError(f"Image order/path mismatch: {image_paths}")

    numeric_errors: list[str] = []
    for index, (original, translated) in enumerate(
        zip(nonreference_source, TRANSLATED_BLOCKS), start=1
    ):
        missing = digit_tokens(original) - digit_tokens(translated)
        if missing:
            numeric_errors.append(
                f"block {index}: " + ", ".join(
                    f"{token}×{count}" if count > 1 else token
                    for token, count in sorted(missing.items())
                )
            )
    if numeric_errors:
        raise ValueError("Source numeric token(s) missing from translation: " + "; ".join(numeric_errors))

    translation = "\n\n".join(output_blocks).rstrip() + "\n"
    source_refs = source.split("## References\n\n", 1)[1]
    translated_refs = translation.split("## 참고문헌\n\n", 1)[1]
    reference_count = len(re.split(r"\n{2,}", source_refs.strip()))
    if reference_count != 61:
        raise ValueError(f"Expected 61 source references, found {reference_count}")
    if source_refs != translated_refs:
        raise ValueError("Reference section changed during translation reconstruction")

    required = (
        "1,532명이", "응답률은 68%", "297명(여성 217명, 남성 80명)",
        "사별한 사람 210명과 비사별 대조군 87명", "333명", "사별자 249명과 대조군 84명",
        "α = .52", "α = .71", "α = .77", "α = .81", "α = .53",
        "0.44 표준편차", "유의하게 예측했지만 공식적 사회참여 수준은 유의하게 예측하지 않았다",
        "배우자 사별 × 성별 상호작용항은 어떤 모형에서도 유의하지 않았으며",
        "17%가 증가, 71%가 동일, 12%가 감소", "35%가 증가, 59%가 동일, 6%가 감소",
        "예 87%, 아니요 13%", "활동 그 자체를 위한 활동",
    )
    for sentinel in required:
        if sentinel not in translation:
            raise ValueError(f"Required translation sentinel missing: {sentinel}")

    forbidden = re.compile(
        r"(?:chatbot|chatgpt|\bstt\b|transcript|recording|lecture\s+audio|강의\s*녹음|"
        r"학생\s*정보|수강생\s*정보|(?:^|[\s\x60(])(?:[A-Za-z]:[\\/]|/Users/|/home/))",
        flags=re.IGNORECASE | re.MULTILINE,
    )
    if forbidden.search(translation):
        raise ValueError("Private/chatbot/STT/recording marker found in translation")
    return translation


def main() -> None:
    source_bytes = SOURCE_PATH.read_bytes()
    source_hash = sha256(source_bytes).hexdigest().upper()
    if source_hash != EXPECTED_SOURCE_SHA256:
        raise ValueError(f"Approved source hash changed: {source_hash}")
    newline = "\r\n" if b"\r\n" in source_bytes else "\n"
    source = source_bytes.decode("utf-8").replace("\r\n", "\n")
    translation = build_translation(source)
    output_bytes = translation.replace("\n", newline).encode("utf-8")
    OUTPUT_PATH.write_bytes(output_bytes)

    source_marker = f"## References{newline}{newline}".encode("utf-8")
    translated_marker = f"## 참고문헌{newline}{newline}".encode("utf-8")
    source_reference_bytes = source_bytes.split(source_marker, 1)[1]
    translated_reference_bytes = output_bytes.split(translated_marker, 1)[1]
    if source_reference_bytes != translated_reference_bytes:
        raise ValueError("Reference section is not byte-identical after writing translation.md")
    print(
        f"Wrote {OUTPUT_PATH.relative_to(ROOT_DIR)}: 62 translated blocks, "
        f"{len(IMAGE_ALT_TRANSLATIONS)} translated image alts, 61 verbatim references"
    )


if __name__ == "__main__":
    main()
