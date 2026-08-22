function toText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTranslationOriginalRevealConfig(value) {
  const config = value && typeof value === "object" ? value : {};
  return {
    enabled: Boolean(config.enabled),
    alignment_file: toText(config.alignment_file) || "translation_alignment.json",
    mode: toText(config.mode) || "details",
  };
}

const REVEAL_UNITS = new Set(["paragraph", "sentence_group", "context_block"]);

function normalizeRevealUnit(value) {
  const unit = toText(value) || "paragraph";
  return REVEAL_UNITS.has(unit) ? unit : "";
}

function slugifyHeading(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\uac00-\ud7a3\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "section";
}

function isSupplementFigureLabel(value) {
  return /^(table|figure)\s+\d+(?:[\s.:_-].*)?$|^(표|그림)\s*\d+(?:[\s.:_-].*)?$/i.test(toText(value));
}

function isReaderMetaHeading(value) {
  return /^(editor'?s note(?: and author information)?|편집자 주(?: 및 저자 정보)?)$/i.test(toText(value));
}

function isReaderBackmatterHeading(value) {
  return /^(references|publication history|참고문헌|출판 이력)$/i.test(toText(value));
}

function buildHeadingBlock(level, text, usedIds) {
  const label = toText(text);
  if (isSupplementFigureLabel(label)) {
    return {
      type: "inline_label",
      text: label,
      tocExcluded: true,
    };
  }
  const baseId = slugifyHeading(label);
  let id = baseId;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${baseId}-${suffix++}`;
  }
  usedIds.add(id);
  const classes = [];
  let tocExcluded = false;
  if (isReaderMetaHeading(label)) {
    tocExcluded = true;
    classes.push("article-meta-heading");
  }
  if (isReaderBackmatterHeading(label)) {
    tocExcluded = true;
    classes.push("article-backmatter-heading");
  }
  return {
    type: "heading",
    level,
    text: label,
    id,
    classes,
    tocExcluded,
  };
}

function figureBlockFromLine(line) {
  const match = String(line || "").match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (!match) {
    return null;
  }
  return {
    type: "figure",
    caption: toText(match[1]),
    assetTarget: toText(match[2]),
  };
}

function parseMarkdownDocument(text, options = {}) {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  const frontmatterBlocks = [];
  const blocks = [];
  const usedHeadingIds = new Set();
  const collectFrontmatter = Boolean(options.collectFrontmatter);
  const skipFirstTitleHeading = Boolean(options.skipFirstTitleHeading);
  let skippedTitleHeading = false;
  let encounteredContentHeading = false;
  let paragraph = [];
  let listItems = [];
  let quoteLines = [];
  let codeLines = null;

  const pushBlock = (block, preferFrontmatter = false) => {
    if (!block) {
      return;
    }
    if (collectFrontmatter && preferFrontmatter && !encounteredContentHeading) {
      frontmatterBlocks.push(block);
      return;
    }
    blocks.push(block);
  };

  const flushParagraph = () => {
    if (!paragraph.length) {
      return;
    }
    pushBlock({
      type: "paragraph",
      text: paragraph.join(" ").trim(),
    }, true);
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length) {
      return;
    }
    pushBlock({
      type: "list",
      items: [...listItems],
    }, true);
    listItems = [];
  };

  const flushQuote = () => {
    if (!quoteLines.length) {
      return;
    }
    pushBlock({
      type: "quote",
      text: quoteLines.join(" ").trim(),
    }, true);
    quoteLines = [];
  };

  const flushCode = () => {
    if (!codeLines) {
      return;
    }
    pushBlock({
      type: "code",
      text: codeLines.join("\n"),
    }, true);
    codeLines = null;
  };

  const pushHeading = (level, textLabel) => {
    encounteredContentHeading = true;
    pushBlock(buildHeadingBlock(level, textLabel, usedHeadingIds));
  };

  for (const rawLine of lines) {
    if (codeLines) {
      if (rawLine.trim().startsWith("```")) {
        flushCode();
        continue;
      }
      codeLines.push(rawLine);
      continue;
    }
    const line = rawLine.trim();
    if (!line || line === ">") {
      flushParagraph();
      flushList();
      flushQuote();
      continue;
    }
    if (line.startsWith("```")) {
      flushParagraph();
      flushList();
      flushQuote();
      codeLines = [];
      continue;
    }
    const figureBlock = figureBlockFromLine(line);
    if (figureBlock) {
      flushParagraph();
      flushList();
      flushQuote();
      pushBlock(figureBlock, true);
      continue;
    }
    if (line.startsWith("#### ")) {
      flushParagraph();
      flushList();
      flushQuote();
      pushHeading(4, line.slice(5));
      continue;
    }
    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      flushQuote();
      pushHeading(3, line.slice(4));
      continue;
    }
    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      flushQuote();
      pushHeading(2, line.slice(3));
      continue;
    }
    if (line.startsWith("# ")) {
      flushParagraph();
      flushList();
      flushQuote();
      if (skipFirstTitleHeading && !skippedTitleHeading) {
        skippedTitleHeading = true;
        continue;
      }
      pushHeading(1, line.slice(2));
      continue;
    }
    if (line.startsWith("- ")) {
      flushParagraph();
      flushQuote();
      listItems.push(line.slice(2).trim());
      continue;
    }
    if (line.startsWith("> ")) {
      flushParagraph();
      flushList();
      quoteLines.push(line.slice(2).trim());
      continue;
    }
    flushList();
    flushQuote();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  flushQuote();
  flushCode();

  return {
    frontmatterBlocks,
    blocks,
  };
}

function blockPlainText(block) {
  if (!block || typeof block !== "object") {
    return "";
  }
  if (block.type === "paragraph" || block.type === "quote" || block.type === "code" || block.type === "heading" || block.type === "inline_label") {
    return toText(block.text);
  }
  if (block.type === "list") {
    return Array.isArray(block.items) ? block.items.map((item) => toText(item)).filter(Boolean).join(" ") : "";
  }
  if (block.type === "figure") {
    return toText(block.caption);
  }
  return "";
}

function collectLocatableBlocks(document) {
  const blocks = Array.isArray(document?.blocks) ? document.blocks : [];
  const headingStack = [];
  const counters = new Map();
  const locatable = [];

  blocks.forEach((block, flatIndex) => {
    if (block.type === "heading") {
      while (headingStack.length && headingStack[headingStack.length - 1].level >= block.level) {
        headingStack.pop();
      }
      headingStack.push({
        level: block.level,
        text: block.text,
        tocExcluded: Boolean(block.tocExcluded),
      });
      return;
    }
    const headingPath = headingStack.map((item) => item.text);
    const headingMeta = headingStack.map((item) => ({
      level: item.level,
      text: item.text,
      tocExcluded: item.tocExcluded,
    }));
    const counterKey = `${headingPath.join(" > ")}||${block.type}`;
    const blockIndex = counters.get(counterKey) || 0;
    counters.set(counterKey, blockIndex + 1);
    locatable.push({
      ...block,
      flatIndex,
      headingPath,
      headingMeta,
      blockIndex,
      plainText: blockPlainText(block),
    });
  });

  return locatable;
}

function normalizeForMatch(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizedHeadingPath(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => normalizeForMatch(item))
    .filter(Boolean);
}

function sourceTextForEntry(entry) {
  if (Array.isArray(entry?.source_text)) {
    return entry.source_text.map((item) => toText(item)).filter(Boolean).join("\n\n");
  }
  return toText(entry?.source_text || entry?.hover_text);
}

const EMBEDDED_SECTION_HEADINGS = [
  "Adult Personality Trait Development in Late Life",
  "Age Differences in Development",
  "Time-to-Death Differences in Development",
  "Interindividual Differences in Development",
  "The Role of Resources and Risk Factors for Personality Trait Development Late in Life",
  "Physical Health",
  "Cognitive Performance",
  "Perceived Control",
  "Social Inclusion",
  "Current Study",
  "Limitations and Outlook",
];

const TRANSLATION_HEADING_TO_ORIGINAL_MARKER = new Map([
  ["연령 차이에 따른 발달", "Age Differences in Development"],
  ["죽음까지 남은 시간에 따른 발달 차이", "Time-to-Death Differences in Development"],
  ["발달의 개인차", "Interindividual Differences in Development"],
  ["삶의 말기 성격 특성 발달에서 자원과 위험요인의 역할", "The Role of Resources and Risk Factors for Personality Trait Development Late in Life"],
  ["현재 연구", "Current Study"],
  ["한계와 전망", "Limitations and Outlook"],
]);

const MANUAL_REVEAL_OVERRIDES = {
  "wagner-et-al-2016": {
    "wagner-tr-004": "We discuss potential pathways by which health, cognitive performance, control, and social inclusion resources and risk factors affect personality development late in life.",
    "wagner-tr-005": "Keywords: personality development, chronological age and time to death, personal resources, old age, longitudinal data",
    "wagner-tr-007": [
      "Research over the last decades has repeatedly shown that personality trait development",
      "herein defined as long-term mean-level changes of personality traits in the second half of life",
      "is characterized by both continuity and change.",
      "For example, Kandler and colleagues (2015) examined personality trait change among people in their 60s and 70s and reported average mean-level increases in neuroticism and decreases in extraversion.",
      "However, not much is known about personality trait development late in life and with approaching death.",
      "It is unclear, for example, whether the challenges and burdens that often accompany late life are associated with more pronounced personality trait changes.",
    ].join(" "),
    "wagner-tr-008": [
      "Research on earlier phases of adulthood has long shown that personality traits",
      "understood as basic building blocks of human thinking, feeling, experience, and behavior",
      "are closely linked with important outcomes of successful aging, including key aspects of health and physical limitations, and mortality hazards.",
      "However, we are only at the very beginning of understanding how health, social, and other resources constitute risk factors for and protective factors against less desirable personality trait change late in life.",
    ].join(" "),
    "wagner-tr-009": [
      "In the present study, we move research on adult personality trait development to the last phase of life.",
      "To do so, we investigate developmental mean-level trajectories of neuroticism, extraversion, and openness to experiences in very old age and with approaching death and examine how these trajectories are related to individual differences in resources and risk factors such as health, cognitive performance, perceived control, and social inclusion.",
      "Specifically, we used 13-year longitudinal data from 463 now-deceased participants in the Berlin Aging Study (BASE).",
      "We consider only neuroticism, extraversion, and openness to experiences because only these dimensions were measured in the BASE.",
    ].join(" "),
    "wagner-tr-012": [
      "Empirical research on age-related personality trait development has repeatedly revealed evidence for change across adulthood.",
      "For example, in a recent longitudinal study using data from a representative German adult life-span sample, Lucas and Donnellan (2011) reported that mean levels of extraversion and openness decline across adulthood, whereas the mean level of neuroticism is relatively consistent in younger and middle-aged adults and decreases among people in their 60s and 70s.",
    ].join(" "),
    "wagner-tr-013": [
      "Concentrating on change trajectories in old age, Mroczek and Spiro (2003) reported in a seminal study that extraversion mean levels decline, whereas neuroticism substantially decreased up to age 80 and subsequently increased again.",
      "Similarly, openness mean levels have been shown to decline late in life.",
      "Taken together, compared to middle and young adulthood, late life appears to be characterized by trajectories of personality trait development that would be described as less favorable; that is, mean-level increases in neuroticism and decreases in extraversion and openness.",
    ].join(" "),
    "wagner-tr-014": "However, based on what we know of developmental trajectories in late life, we submit that such changes may describe adaptive developmental trajectories that adjust daily experience and behavior to available resources and risk factors of late life.",
    "wagner-tr-016": [
      "At the very end of life, many domains of functioning appear to be prone to terminal decline.",
      "Terminal decline can be expected to reflect some combination of late-life neuropathology, such as Alzheimer's disease or Lewy bodies, deteriorating integrity of neurocognitive control systems, and a breakdown of overall system coordination and integrity.",
      "Such terminal decline processes at the end of life are often referred to as mortality-related processes.",
    ].join(" "),
    "wagner-tr-017": [
      "Drawing from seminal work published in the 1960s and 1970s, empirical evidence has accumulated to suggest that progressive mechanisms leading toward death drag down functioning in many domains, including cognitive performance, well-being, physical function, and social function.",
    ].join(" "),
    "wagner-tr-018": [
      "There is also initial evidence that such mortality-related decline processes contribute to change in constructs considered to be relatively stable, or trait-like, such as self-esteem, although trajectories of decline are not as steep as those found in other domains.",
      "To the best of our knowledge, there is no previous study that has examined the relation between personality trait change and proximity or time to death.",
    ].join(" "),
    "wagner-tr-019": [
      "The literature linking personality traits with mortality hazards provides somewhat inconsistent evidence.",
      "Some studies found no, or little, predictive utility of the three traits of neuroticism, extraversion, and openness, whereas other studies found reduced mortality hazards for people with lower neuroticism and higher extraversion.",
      "In a study by Mroczek and Spiro (2007), both higher average levels as well as increases in neuroticism were uniquely predictive of mortality in men.",
    ].join(" "),
    "wagner-tr-020": [
      "Studies examining personality among centenarians find a profile of low neuroticism, high extraversion, and high openness to be most prevalent.",
      "This suggests that being less neurotic, more extraverted, and more open probably relates to a longer life.",
      "However, this latter set of empirical inquiry does not directly take into account the personality trait changes that presumably occur late in life.",
    ].join(" "),
    "wagner-tr-021": [
      "Using the sum of these findings as a backdrop to formulate expectations about personality trait development at the very end of life, we would expect that as people approach death, neuroticism increases, whereas both extraversion and openness to experiences decrease.",
      "It is an open question, though, whether trajectories of change late in life are getting steeper in closer proximity to death.",
    ].join(" "),
    "wagner-tr-023": [
      "Already based on the empirical findings of the seminal Baltimore Longitudinal Study of Aging, Shock and colleagues considered differences between individuals to be more profound than developmental age effects across the life span.",
      "The existence of substantial interindividual differences both in level and change trajectories of personality trait development has been shown in many studies and across the entire life span.",
      "Thus, despite the description of age-related or age-moderated change trajectories, people obviously differ substantially in general developmental patterns.",
    ].join(" "),
    "wagner-tr-025": [
      "Life-span developmental theory suggests that life-span dynamics of an increasingly negative gain-loss ratio in the health and cognitive domains, as well as declines in perceived control, constitute key risk factors for personality development.",
      "For example, even personality characteristics that used to be relatively stable across large parts of adulthood are shaped by broad-based functional declines late in life.",
      "To illustrate, compromised cognitive resources, as one particularly age-sensitive characteristic, may constrain and contribute to declines in openness to new experiences and in seeking out novel contexts as well as to increases in feelings of anxiety and thus neuroticism.",
      "Thus, reduced reserve capacity can be expected to shape personality trait development later in life.",
    ].join(" "),
    "wagner-tr-026": [
      "Given the convincing empirical results about considerable individual differences in level and change trajectories of personality traits, an important question to ask is whether different risk and protective factors contribute to individual differences in specific personality traits late in life.",
      "For the current study, we selected variables that broadly represent central characteristics of individual functioning late in life and thus may serve as either protective factors or risk factors for late-life personality trait development: physical health, cognitive performance, perceived control, and social inclusion.",
      "Importantly, this selection includes both subjective perceptions such as perceived control and more objective and performance-based characteristics such as physician-diagnosed physical illnesses and cognitive performance, as well as context-related characteristics such as social activity.",
      "Thus, the multidomain measures included as correlates are expected to cover a broad spectrum of areas of life that are important for late-life functioning and development.",
    ].join(" "),
    "wagner-tr-028": [
      "Functional limitations are known to increase with age and would be expected to affect basic tendencies of thinking and behaving.",
      "For example, sudden health issues such as a stroke may lead people to feel more vulnerable and to become more self-conscious or fearful of further incidences, manifesting in higher neuroticism late in life.",
      "Similarly, limitations in physical health and functioning can be expected to reduce social activity and thereby result in lowered extraversion.",
    ].join(" "),
    "wagner-tr-029": [
      "Both such notions were partially supported by previous studies.",
      "First, using an adult life-span sample, associations between neuroticism and physical limitations were stronger among older adults than among younger adults.",
      "Second, better health was related to higher levels of extraversion.",
      "Finally, developing a chronic illness was related to lower openness.",
      "Thus, suffering from physical illnesses and having more functional limitations could play a major role in personality trait development late in life.",
    ].join(" "),
    "wagner-tr-031": [
      "Age-related cognitive declines, specifically in the cognitive mechanics, are well established.",
      "The trait of openness to experiences, having a particularly strong cognitive component, thus can be expected to evince substantial declines in old age.",
      "Understanding cognitive resources as a protective factor, an intervention training to increase cognitive performance late in life showed that, as a side effect, openness to experiences increased in the intervention group but not in the control group.",
      "Also, questionnaire studies showed better cognitive performance to relate to a lower decline in openness as well as a lower increase in neuroticism.",
    ].join(" "),
    "wagner-tr-032": [
      "In addition, Berg and Johansson (2014) found higher self-rated cognitive impairment to relate to being less extraverted.",
      "However, neither level nor change of extraversion was associated with administered tests of cognitive performance.",
      "Taken together, empirical results suggest that preserved cognitive performance relates to more stable personality trait development late in life.",
    ].join(" "),
    "wagner-tr-034": [
      "From a conceptual point of view, having the belief to be in control of what happens in one's life has been regarded as both an important outcome and an antecedent of successful aging in multiple domains of life.",
      "Consistent with this line of reasoning, Kandler and colleagues found that perceptions of higher personal control were associated with lower neuroticism as well as higher extraversion and openness.",
      "Capitalizing on these initial results and understanding perceptions of control as a general-purpose mechanism, we expect people who perceive their lives to be under their control to also show more stable personality trajectories late in life.",
    ].join(" "),
    "wagner-tr-036": [
      "Based on the notion of a fundamental human need to belong, social relationships and social embedding are important parts of human life.",
      "Specifically late in life, engaging in social contact and maintaining close relationships to family and friends are often associated with better health and higher well-being.",
      "However, the known decreases in social role involvement and generally smaller social networks possibly manifest in fewer social activities and more feelings of loneliness.",
      "Such tendencies could be related to low levels of and declines in extraversion and openness late in life.",
    ].join(" "),
    "wagner-tr-037": [
      "Using an adult life-span sample, higher social well-being, as one possible indicator of social inclusion, was associated with being more extraverted, more open, and less neurotic.",
      "In a more relationship-specific approach, Wagner, Ludtke, Roberts, and Trautwein found that increases in emotional closeness to stable social network ties related to lower neuroticism.",
      "However, these findings are based on samples of young adults.",
      "Instead, a study concentrating on social engagement in late life found no associations with neuroticism but did not test for extraversion and openness effects.",
      "Thus, overall we hypothesize that higher levels of social inclusion relate to higher extraversion and openness, whereas we do not have specific hypotheses about associations with neuroticism.",
    ].join(" "),
    "wagner-tr-038": [
      "In sum, previous research was largely concerned about the effect of personality on important life outcomes later in life, including mortality hazards.",
      "However, little is known about how risk and protective factors of functioning actually relate to levels and changes in personality traits late in life.",
      "Based on life-span theoretical notions, we expect risk and protective factors of functioning to evince trait-specific associations late in life.",
    ].join(" "),
    "wagner-tr-039": [
      "First, we expect that the general tendency of increase in neuroticism in the oldest old mirrors the availability of fewer resources late in life, specifically in health and perceived control.",
      "Second, more functional limitations, less perceived control, and being less socially active might take a toll on the sociable and assertive part of a person and thus relate to a decrease of extraversion.",
      "Finally, low performance on the perceptual speed measure, less perceived control, and reduced feelings of social inclusion are each expected to relate to a decline in openness to experiences.",
    ].join(" "),
    "wagner-tr-040": [
      "With respect to possible moderator effects of age versus mortality, we think that our analyses are highly exploratory.",
      "However, because health and cognitive performance often evince steep declines close to death, these factors may be key predictors of late-life personality trait development.",
      "Importantly, our study estimates effects of all of these covariates in one conjoint model, testing the unique effect over and above the other resources.",
    ].join(" "),
    "wagner-tr-091": [
      "Tables 2, 3, and 4 show results from models where the changes in neuroticism, extraversion, and openness to experiences, respectively, are conditioned on demographic characteristics, four areas of functioning, and both chronological age and time to death, with nonsignificant interactions trimmed.",
      "Notably, including all correlates into the age- and time-to-death-moderated models revealed that neither the effect of time to death on the linear slope of neuroticism nor the age effects on the intercepts of extraversion or openness remained substantial.",
    ].join(" "),
    "wagner-tr-093": [
      "Unexpectedly, results did not support associations between either the physician-diagnosed or subjective health indicators and neuroticism trajectories.",
      "Yet, more self-reported disabilities related to steeper declines in extraversion and in openness to experiences.",
    ].join(" "),
    "wagner-tr-094": [
      "Finally, we found two moderation effects for health.",
      "First, associations between the number of comorbidities and rates of change in extraversion were moderated by age.",
      "To better understand this association, we probed the interaction using the Johnson-Neyman region of significance method.",
      "Specifically, this technique is used to identify the range of the moderator variable with which the focal predictor and outcome variables were significantly associated.",
    ].join(" "),
    "wagner-tr-095": [
      "Accordingly, we identified the age range for which a substantial association between the number of comorbidities and change in extraversion is to be expected.",
      "The probing suggested that a higher number of physician-assessed comorbidities related to stronger decreases in extraversion at ages 83 years and older.",
      "For younger participants, the number of comorbidities was not associated with rates of change in extraversion.",
      "However, this effect was very small and should be regarded with caution.",
    ].join(" "),
    "wagner-tr-096": [
      "Second, time to death moderated the association between self-reported disabilities and rates of change in openness.",
      "With approaching death, more disabilities related to an accelerated decline in openness.",
      "Johnson-Neyman probing suggested that this negative association is present only within the last 7 years of life.",
    ].join(" "),
    "wagner-tr-097": [
      "Figure 1 shows average trajectories and raw data of the three personality traits neuroticism, extraversion, and openness over time in study.",
      "Neuroticism, on average, increases, particularly for those with closer proximity to death, about 0.3 SD in the last 10 years.",
      "In contrast, extraversion and openness, on average, decline, about 0.5 SD in the last 10 years.",
    ].join(" "),
    "wagner-tr-099": [
      "As expected, results showed that higher cognitive performance abilities related to higher levels of openness.",
      "Unexpectedly, cognitive performance was not associated with rates of change in openness.",
      "However, we found an unexpected negative relation between cognitive performance abilities and the linear slope of extraversion.",
    ].join(" "),
    "wagner-tr-100": [
      "Region-of-significance analyses showed that lower cognitive performance, minus 1 SD, was unrelated to the change in extraversion.",
      "However, individuals with higher levels of cognitive performance had steeper decreases in extraversion.",
      "We will address this unexpected finding in the Discussion.",
    ].join(" "),
    "wagner-tr-102": [
      "Results of the conditional models consistently revealed that higher personal control related to higher extraversion and higher openness.",
      "In contrast, individuals who perceived higher control by others consistently showed higher levels of neuroticism.",
    ].join(" "),
    "wagner-tr-103": [
      "Unexpectedly, we found that more perceived others' control also related to higher levels of openness starting at about seven years prior to death.",
      "However, again, this effect is small and needs to be considered with caution.",
    ].join(" "),
    "wagner-tr-105": [
      "Living a socially active life was related to higher extraversion and higher openness.",
      "Furthermore, those who reported feeling less lonely were more extraverted and less neurotic.",
      "Additionally, the association between loneliness and neuroticism was moderated by time to death.",
      "Lonely individuals reported higher levels of neuroticism when they were closer to death.",
    ].join(" "),
    "wagner-tr-106": [
      "Applying the Johnson-Neyman technique showed that the mortality moderation held for participants starting at 13 years prior to death and closer.",
      "Figure 2 shows average trajectories of neuroticism mean-level increase over time to death, for 5-year bins of time to death, moderated by emotional loneliness.",
      "Lower levels of loneliness, minus 1 SD, relate to lower neuroticism approximately starting thirteen years prior to death.",
      "The dashed vertical line indicates the region of significance for the moderation effect.",
    ].join(" "),
    "wagner-tr-108": [
      "The current study modeled personality trait development at the end of life and examined how individual differences in personality trait change are related to individual differences in four resource and risk factors.",
      "Four major results emerged.",
    ].join(" "),
    "wagner-tr-109": "First, neuroticism, on average, increases in very old age, about 0.3 SD in the last 10 years, particularly at the end of life.",
    "wagner-tr-110": "Second, extraversion and openness decline rather steadily with advancing age and approaching death, about 0.5 SD in the last 10 years, with older participants reporting lower levels of extraversion and openness.",
    "wagner-tr-111": "Third, intriguingly, health constraints were related to steeper declines in extraversion and openness but not neuroticism. Cognitive performance revealed the expected positive association with levels of openness but, unexpectedly, not with its rates of change.",
    "wagner-tr-112": "Fourth, personal control and perceived others' control showed the expected associations with all three personality traits. Similarly, being socially active or feeling less lonely appeared to be consistent sources of lower levels of neuroticism and higher levels of extraversion and openness in very old age.",
    "wagner-tr-113": "These findings further our understanding of late-life personality development and suggest potential pathways by which personal resources affect individual differences in personality trait development late in life.",
    "wagner-tr-115": [
      "The current study contributes to the existing considerations of personality trait development until late in life.",
      "Our results are in line with conceptual notions and empirical evidence that personality traits change across adulthood and that patterns of change differ across personality traits.",
      "Our study extends previous findings by examining personality trait change in very old age and at the very end of life.",
      "Corroborating and extending earlier reports, we found that mean levels of extraversion and openness are lower at older ages.",
      "Thus, our results for these two traits suggest that trends of decline observed earlier in adulthood generalize into late life.",
      "Interestingly, general trends of mean-level increases in neuroticism across time were not affected by chronological age in our sample.",
      "There is a solid body of empirical evidence suggesting that processes related to pathology and mortality shape developmental trajectories across a myriad of functional domains.",
      "To the best of our knowledge, our study is the first to model mortality-related development in personality traits, that is, mean-level trajectories being moderated by proximity to death.",
      "Our results showed that being closer to death was related to stronger increases in neuroticism.",
      "In contrast, levels and rates of decline in extraversion and openness were unaffected by proximity to death.",
      "In our view, these findings converge with previous reports in the literature and suggest that the maturation of neuroticism, that is, decreases across the adult life, comes to an end by late life.",
      "That is, across adulthood, neuroticism shows a steady mean-level decrease but appears to increase again late in life and specifically with approaching death.",
      "Such results inform our knowledge about personality trait development in at least two important ways.",
      "First, across these three selected personality traits, developmental processes late in life appear to differ not only with respect to mean levels and rank-order stability coefficients but also with respect to their vulnerability to mortality-related processes.",
      "With approaching death, not only decreases in the area of physical functioning and cognitive performance show, but also neuroticism appears to be affected by mortality-related processes.",
      "Possibly, being closer to death accelerates feelings and expectations of anxiety such as fear of falling or concern for severe health limitations, which may result in elevated neuroticism at the trait level.",
      "In contrast, levels and rates of decline in extraversion and openness were unaffected by proximity to death.",
    ].join(" "),
    "wagner-tr-116": [
      "Second, the effect of time to death on neuroticism development was statistically significant but relatively small.",
      "Such small, or nearly absent, time-to-death effects distinguish personality traits from other psychological functioning variables that often show strong mortality-related change.",
      "At the same time, these findings resemble earlier work on self-esteem development, where time-to-death effects on mean-level trajectories were absent or very small.",
      "One possible explanation is that mortality-related processes may not be strong enough to visibly alter personality traits, which are comparatively stable basic building blocks of thinking, feeling, and behaving.",
      "Gradual late-life decline may therefore exert a less profound effect on personality traits than on less trait-like variables such as affect or well-being.",
    ].join(" "),
    "wagner-tr-117": [
      "In contrast, gradual decline may instead trigger adaptive developmental processes that are more likely linked to specific resources and risk factors but not to mortality-related processes per se.",
      "More research is clearly needed to understand these interdependencies.",
      "One possible route of such research may be to explore sources of variability and change in daily ways of thinking and behaving.",
      "For example, Hutteman and colleagues found that, in adolescence, changes in trait self-esteem related to changes in state self-esteem, and such changes in state self-esteem were reciprocally related to social inclusion.",
      "Similarly, personality developmental processes may occur in the context of repeated short-term, situational processes.",
      "Thus, changes in daily health-related or social loss triggers, for example, could manifest in long-term personality development.",
    ].join(" "),
    "wagner-tr-118": [
      "As an additional side note, our analyses only focused on mean-level changes.",
      "In addition, rank-order stabilities are an important part of understanding development.",
      "In our study, substantial mortality-related dropout characterized later measurement points, and thus the much smaller sample size may not be very informative as comparison with earlier measurement points.",
      "Previous studies showed increasing instability with respect to extraversion and neuroticism after the age of 70.",
      "Further studies with participants in later life are needed to also understand this important characteristic with approaching death.",
    ].join(" "),
    "wagner-tr-132": [
      "First, the BASE study included only three of the Big Five personality traits, and we are thus unable to examine agreeableness and conscientiousness.",
      "Specifically regarding the latter, recent empirical findings and theoretical approaches suggest that this personality trait may play an important role in successful aging.",
      "Thus, replication is needed regarding the three traits in the present study and, most importantly, an extension to the two other Big Five personality traits to provide a fuller picture.",
      "In addition, it will be important to extend this research to other, more in-depth measures of personality traits.",
      "The present study used only six items per trait.",
      "This short measure restricted the subfacets assessed for each trait and likely contributed to a reduction in reliability.",
      "At the same time, we are unaware of other studies with such a late-life and end-of-life sample that have examined the effects of the broad scope of antecedent and correlated resources and risk factors included in the present study.",
    ].join(" "),
    "wagner-tr-133": [
      "Second, personality traits were assessed only as a self-report measure and were based on a 5-point Likert scale.",
      "The use of diagnostic assessments designed for tracking of individual differences in stable traits complicates tracking of within-person change.",
      "The 5-point scale might not be sensitive enough to capture within-person changes, and some items may not capture changes perceived by the reporting individual.",
      "Although research with young adults indicates the validity of self-reports of personality traits, transferability to such a late-life sample from Germany may be questioned.",
      "In a general sense, additional peer-report or behavioral information could inform and strengthen our knowledge on late-life personality change.",
    ].join(" "),
    "wagner-tr-134": [
      "As a third limitation, longitudinal studies of late life are always confronted with mortality-related dropout.",
      "Our selectivity analyses suggest that our report suffers from the typical patterns seen in most longitudinal studies of the very old.",
      "Of key concern is the lack of convergence between the within-person changes and age, and time-to-death, differences in extraversion and openness.",
      "The nonconvergence suggests that a person of 75 years at the first assessment who is aging within the study shows less favorable personality trajectories than a person who is 90 years of age at the first assessment and ages within the study.",
      "Thus, despite the negative time slope, we need to consider that certain segments of the population have been missed.",
      "Further research on end-of-life dynamics is clearly needed to get a better understanding of the interdependency of psychological and physical processes for this very specific phase of life.",
      "One possible route for future research is that longitudinal assessments of individuals should cover a broad range of functioning and thus reduce reliance on between-person inference.",
    ].join(" "),
    "wagner-tr-136": [
      "Finally, our sample represents a quite specific group of late-life individuals.",
      "Including only residents of West Berlin in the late 1980s and early 1990s, these results may not apply to all parts of the Western world or beyond.",
      "At the same time, results with respect to late-life dynamics of subjective well-being and affect have been found in the BASE study and replicated in several other more representative and heterogeneous samples.",
      "We would also like to add that such specific samples with a multidisciplinary approach and fairly long-term follow-up are definitely needed to understand the interdependencies of late-life dynamics.",
      "In that sense, the BASE sample represents a very specific sample enabling particular insight into end-of-life processes.",
    ].join(" "),
    "wagner-tr-137": [
      "As a final note, it is important to mention the possible practical implications that may be drawn out of our results.",
      "In general, the findings illustrate that personality trait development appears to be minimally affected by mortality-related processes.",
      "Nevertheless, we see clear signs that decreasing personal resources affect developmental trajectories.",
      "Thus, one major implication may be that, over and above the objective, and possible inevitable, decrease of health and cognitive performance, perceptions of control and social inclusion are pivotal to sustaining personality development.",
      "The maintenance of perceived control over one’s life as well as continued involvement in social activities and relationships in daily life may be especially important at the end of life.",
    ].join(" "),
    "wagner-tr-139": [
      "Taken together, the current study examined intraindividual change trajectories of neuroticism, extraversion, and openness to experiences during very old age and showed that age and closeness to death are differentially related to developmental trends in personality traits.",
      "At the same time, the study highlighted the substantial role of interindividual differences in diverse resource and risk factors that reflect the challenges of an increasingly negative gain-loss ratio in late life.",
      "The investigation furthers our understanding of the diversity of processes underlying personality trait development at the end of the life course.",
      "It also points to the need for further research into the complex puzzle of developmental change in each of the Big Five traits in late life.",
    ].join(" "),
    "wagner-tr-257": "Appendix Item Information and Descriptive Statistics Table A1 Original Items and the German Translation Used in the Berlin Aging Study (BASE) Original items German translation",
    "wagner-tr-258": [
      "1. I like to have a lot of people around me. Ich habe gerne viele Leute um mich herum.",
      "2. I don’t like to waste my time daydreaming. Ich träume gerne am Tage vor mich hin.",
      "3. Once I find the right way to do something, I stick to it. Wenn ich erst einmal den richtigen Weg gefunden habe, etwas zu tun, dann bleibe ich dabei.",
      "4. When I’m under a great deal of stress, sometimes I feel like I’m going to pieces. Wenn ich unter starkem Stress stehe, fühle ich mich manchmal, als ob ich zusammenbräche.",
      "5. I rarely feel fearful or anxious. Ich empfinde oft Furcht oder Angst.",
      "6. I really enjoy talking to people. Ich unterhalte mich wirklich gerne mit anderen Menschen.",
    ].join(" "),
    "wagner-tr-259": [
      "7. I often feel tense and jittery. Ich fühle mich oft angespannt und nervös.",
      "8. I like to be where the action is. Ich stehe gerne im Mittelpunkt.",
      "9. Poetry has little or no effect on me. Gedichte beeindrucken mich.",
      "10. I laugh easily. Ich bin leicht zum Lachen zu bringen.",
      "11. I often try new and foreign foods. Ich probiere gerne etwas Neues aus.",
      "12. I often get angry at the way people treat me. Ich ärgere mich oft darüber, wie mich andere Leute behandeln.",
    ].join(" "),
    "wagner-tr-260": [
      "13. I am a cheerful, high-spirited person. Ich bin ein fröhlicher, gut gelaunter Mensch.",
      "14. I have a very active imagination. Ich habe ein lebhaftes Vorstellungsvermögen.",
      "15. I often feel helpless and want someone else to solve my problems. Ich fühle mich oft hilflos und wünsche mir jemanden, der meine Probleme löst.",
      "16. I am a very active person. Ich bin ein sehr aktiver Mensch.",
      "17. I have a lot of intellectual curiosity. Ich bin wissbegierig.",
      "18. Sometimes I feel completely worthless. Manchmal fühle ich mich völlig wertlos.",
    ].join(" "),
    "wagner-tr-262": "Table A2. Descriptive statistics and intercorrelations of all available personality assessments across time. Personality, n, M, SD, alpha, neuroticism, and extraversion are reported.",
    "wagner-tr-263": "Time 1: Neuroticism n = 463, M = 50.02, SD = 10.02, alpha = .75. Extraversion n = 463, M = 49.74, SD = 10.07, alpha = .64, correlation with neuroticism = -.12. Openness n = 463, M = 49.55, SD = 10.16, alpha = .54, correlations = .00 with neuroticism and .37 with extraversion.",
    "wagner-tr-264": "Time 2: Neuroticism n = 173, M = 50.52, SD = 9.88, alpha = .79. Extraversion n = 173, M = 49.31, SD = 10.24, alpha = .66, correlation with neuroticism = -.03. Openness n = 173, M = 50.20, SD = 9.80, alpha = .61, correlations = .06 with neuroticism and .55 with extraversion.",
    "wagner-tr-265": "Time 3: Neuroticism n = 105, M = 49.59, SD = 8.69, alpha = .74. Extraversion n = 105, M = 49.07, SD = 9.90, alpha = .68, correlation with neuroticism = -.14. Openness n = 105, M = 49.55, SD = 9.54, alpha = .55, correlations = .08 with neuroticism and .45 with extraversion.",
    "wagner-tr-266": "Time 4: Neuroticism n = 59, M = 47.92, SD = 7.04, alpha = .68. Extraversion n = 59, M = 48.69, SD = 8.32, alpha = .57, correlation with neuroticism = -.09. Openness n = 59, M = 50.02, SD = 8.61, alpha = .56, correlations = .16 with neuroticism and .39 with extraversion.",
    "wagner-tr-267": "Time 5: Neuroticism n = 26, M = 48.39, SD = 7.04, alpha = .74. Extraversion n = 26, M = 47.74, SD = 9.27, alpha = .69, correlation with neuroticism = -.05. Openness n = 26, M = 48.25, SD = 9.68, alpha = .67, correlations = .07 with neuroticism and .61 with extraversion. p < .05. Appendix continues.",
    "wagner-tr-269": "Table A3. Descriptive statistics and correlations of neuroticism, extraversion, openness, chronological age, time to death, and correlates at baseline. Columns report M, SD, and correlations 1 through 14.",
    "wagner-tr-270": "1. Neuroticism: M = 50.02, SD = 10.02. 2. Extraversion: M = 49.74, SD = 10.07, correlation with neuroticism = -.12. 3. Openness: M = 49.55, SD = 10.16, correlations = .00 with neuroticism and .37 with extraversion.",
    "wagner-tr-271": "4. Age: M = 85.88, SD = 8.37, correlations = .08 with neuroticism, -.18 with extraversion, and -.17 with openness. 5. Time to death: M = -5.97, SD = 4.55, correlations = .09 with neuroticism, -.12 with extraversion, -.15 with openness, and .55 with age. Correlate 6, men: M = 0.51, SD = 0.50.",
    "wagner-tr-272": "7. Education: M = 50.06, SD = 10.15, correlations = -.21 with neuroticism, .08 with extraversion, .23 with openness, -.16 with age, -.09 with time to death, and .23 with men. 8. Married: M = 0.29, SD = 0.46. 9. Comorbidities: M = 0.60, SD = 0.04.",
    "wagner-tr-273": "10. Disabilities: M = 0.41, SD = 0.49. 11. Digit Symbol Substitution Test: M = 49.44, SD = 9.95. 12. Perceived control, personal: M = 49.93, SD = 10.14. The table reports the corresponding zero-order correlations across these variables.",
    "wagner-tr-274": "13. Perceived control, others: M = 50.49, SD = 10.05. 14. Social participation: M = 49.09, SD = 9.91. 15. Emotional loneliness: M = 50.33, SD = 9.00. The remaining cells report the correlations among these baseline correlates and the personality variables.",
    "wagner-tr-275": "Note. N = 463. PC = perceived control. p < .05.",
    "wagner-tr-277": "Received April 8, 2015 Revision received July 31, 2015 Accepted August 17, 2015",
  },
};

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanOriginalRevealText(block, options = {}) {
  const keepEmbeddedHeadings = Boolean(options.keepEmbeddedHeadings);
  const headingPath = normalizedHeadingPath(block?.headingPath);
  let cleaned = String(block?.plainText || "")
    .replace(/<!--\s*Page\s+\d+\s*-->/gi, " ")
    .replace(/\bPERSONALITY TRAIT DEVELOPMENT LATE IN LIFE\b/gi, " ")
    .replace(/\b\d{3}\s+WAGNER,\s+RAM,\s+SMITH,\s+AND\s+GERSTORF\b/gi, " ")
    .replace(/\b\d{3}\s+[A-Z][A-Z,\s-]{8,}\b/g, " ")
    .trim();

  if (headingPath.includes("abstract")) {
    const abstractStart = cleaned.indexOf("Empirical evidence over the past 20 years");
    if (abstractStart >= 0) {
      cleaned = cleaned.slice(abstractStart);
    }
  }

  cleaned = cleaned.replace(/This article was published Online First[\s\S]*$/i, " ");

  if (!keepEmbeddedHeadings) {
    EMBEDDED_SECTION_HEADINGS.forEach((heading) => {
      cleaned = cleaned.replace(new RegExp(`\\b${escapeRegExp(heading)}\\b`, "g"), " ");
    });
  }

  return cleaned.replace(/\s+/g, " ").trim();
}

function sentenceSplitSourceText(value) {
  const cleaned = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) {
    return [];
  }
  const sentences = [];
  let start = 0;
  let index = 0;

  while (index < cleaned.length) {
    if (/[.!?]/.test(cleaned[index])) {
      let boundary = index + 1;
      while (boundary < cleaned.length && /[.!?]/.test(cleaned[boundary])) {
        boundary += 1;
      }
      let next = boundary;
      while (next < cleaned.length && /\s/.test(cleaned[next])) {
        next += 1;
      }
      if (
        next >= cleaned.length
        || /^[A-Z"'([{]/.test(cleaned.slice(next, next + 1))
        || /^[\u00c0-\u024f]/.test(cleaned.slice(next, next + 1))
        || /^[가-힣]/.test(cleaned.slice(next, next + 1))
      ) {
        const sentence = cleaned.slice(start, boundary).trim();
        if (sentence) {
          sentences.push(sentence);
        }
        start = next;
        index = next;
        continue;
      }
    }
    index += 1;
  }

  const tail = cleaned.slice(start).trim();
  if (tail) {
    sentences.push(tail);
  }
  return sentences;
}

function splitSourceTextByLength(value, parts) {
  const cleaned = String(value || "").replace(/\s+/g, " ").trim();
  if (!cleaned || parts <= 1) {
    return cleaned ? [cleaned] : [];
  }
  const words = cleaned.split(" ").filter(Boolean);
  if (words.length <= parts) {
    return words;
  }
  const chunks = [];
  let start = 0;
  for (let index = 0; index < parts; index += 1) {
    const remainingWords = words.length - start;
    const remainingParts = parts - index;
    const take = remainingParts === 1 ? remainingWords : Math.max(1, Math.round(remainingWords / remainingParts));
    chunks.push(words.slice(start, start + take).join(" "));
    start += take;
  }
  return chunks.filter(Boolean);
}

function sentenceCountForTranslation(text) {
  return Math.max(1, sentenceSplitSourceText(text).length);
}

function chunkSentencesByWeights(sentences, weights) {
  if (!sentences.length) {
    return [];
  }
  if (weights.length <= 1) {
    return [sentences.join(" ").trim()];
  }
  if (sentences.length < weights.length) {
    return splitSourceTextByLength(sentences.join(" ").trim(), weights.length);
  }
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const chunks = [];
  let sentenceIndex = 0;
  let remainingSentences = sentences.length;
  let remainingWeight = totalWeight;

  for (let index = 0; index < weights.length; index += 1) {
    const remainingParts = weights.length - index;
    if (remainingParts === 1) {
      chunks.push(sentences.slice(sentenceIndex).join(" ").trim());
      break;
    }
    const desiredCount = Math.max(1, Math.round((remainingSentences * weights[index]) / remainingWeight));
    const maxCount = remainingSentences - (remainingParts - 1);
    const take = Math.min(maxCount, desiredCount);
    chunks.push(sentences.slice(sentenceIndex, sentenceIndex + take).join(" ").trim());
    sentenceIndex += take;
    remainingSentences -= take;
    remainingWeight -= weights[index];
  }

  return chunks.filter(Boolean);
}

function shouldMergeSentenceFragments(previous, current) {
  if (!previous || !current) {
    return false;
  }
  if (!/[.!?]["')\]]*$/.test(previous)) {
    return true;
  }
  return /^[a-z]/.test(current);
}

function sectionMarkerForEntry(entry) {
  const headingPath = normalizedHeadingPath(entry?.translationBlock?.headingPath);
  for (let index = headingPath.length - 1; index >= 0; index -= 1) {
    const marker = TRANSLATION_HEADING_TO_ORIGINAL_MARKER.get(headingPath[index]);
    if (marker) {
      return marker;
    }
  }
  return "";
}

function buildOriginalSentenceStream(entries) {
  const orderedBlocks = [];
  const seenBlocks = new Set();
  entries.forEach((entry) => {
    const flatIndex = entry.originalBlock?.flatIndex;
    if (typeof flatIndex !== "number" || seenBlocks.has(flatIndex)) {
      return;
    }
    seenBlocks.add(flatIndex);
    orderedBlocks.push(entry.originalBlock);
  });
  orderedBlocks.sort((left, right) => left.flatIndex - right.flatIndex);

  const sentences = [];
  const blockStarts = new Map();
  const markerStarts = new Map();

  orderedBlocks.forEach((block) => {
    blockStarts.set(block.flatIndex, sentences.length);
    const markerText = cleanOriginalRevealText(block, { keepEmbeddedHeadings: true });
    EMBEDDED_SECTION_HEADINGS.forEach((heading) => {
      if (markerStarts.has(heading)) {
        return;
      }
      const position = markerText.indexOf(heading);
      if (position < 0) {
        return;
      }
      const prefix = markerText.slice(0, position).replace(new RegExp(`\\b${escapeRegExp(heading)}\\b`, "g"), " ");
      markerStarts.set(heading, sentences.length + sentenceSplitSourceText(prefix).length);
    });
    const parts = sentenceSplitSourceText(cleanOriginalRevealText(block));
    parts.forEach((part, partIndex) => {
      if (partIndex === 0 && shouldMergeSentenceFragments(sentences[sentences.length - 1], part)) {
        sentences[sentences.length - 1] = `${sentences[sentences.length - 1]} ${part}`.replace(/\s+/g, " ").trim();
        return;
      }
      sentences.push(part);
    });
  });

  return { sentences, blockStarts, markerStarts };
}

function groupEntriesByOriginalBlock(entries) {
  const groups = [];
  let currentGroup = [];

  entries.forEach((entry) => {
    if (!currentGroup.length) {
      currentGroup = [entry];
      return;
    }
    const currentBlock = currentGroup[0].originalBlock?.flatIndex;
    const currentMarker = sectionMarkerForEntry(currentGroup[0]);
    const nextMarker = sectionMarkerForEntry(entry);
    if (entry.originalBlock?.flatIndex === currentBlock && currentMarker === nextMarker) {
      currentGroup.push(entry);
      return;
    }
    groups.push(currentGroup);
    currentGroup = [entry];
  });

  if (currentGroup.length) {
    groups.push(currentGroup);
  }
  return groups;
}

function autoSplitRepeatedContextBlocks(entries) {
  const { sentences, blockStarts, markerStarts } = buildOriginalSentenceStream(entries);
  const groups = groupEntriesByOriginalBlock(entries);
  let globalCursor = 0;

  groups.forEach((group, groupIndex) => {
    if (group.length <= 1) {
      return;
    }
    const sameContextBlock = group.every((entry) => (
      entry.unit === "context_block"
      && normalizeForMatch(entry.sourceText) === normalizeForMatch(entry.originalBlock?.plainText || "")
    ));
    if (!sameContextBlock) {
      return;
    }

    const blockStart = blockStarts.get(group[0].originalBlock?.flatIndex) ?? globalCursor;
    const marker = sectionMarkerForEntry(group[0]);
    const markerStart = marker ? markerStarts.get(marker) : undefined;
    const start = Math.max(globalCursor, blockStart, typeof markerStart === "number" ? markerStart : blockStart);
    const nextGroup = groups[groupIndex + 1]?.[0];
    const nextMarker = sectionMarkerForEntry(nextGroup);
    const nextMarkerStart = nextMarker ? markerStarts.get(nextMarker) : undefined;
    const nextGroupBlock = nextGroup?.originalBlock?.flatIndex;
    let nextStart;
    if (typeof nextMarkerStart === "number" && nextGroupBlock === group[0].originalBlock?.flatIndex) {
      nextStart = nextMarkerStart;
    } else if (typeof nextMarkerStart === "number" && (nextGroupBlock ?? Infinity) >= group[0].originalBlock?.flatIndex) {
      nextStart = nextMarkerStart;
    } else if (typeof nextGroupBlock === "number") {
      nextStart = blockStarts.get(nextGroupBlock);
    } else {
      nextStart = sentences.length;
    }
    const sentenceWeights = group.map((entry) => sentenceCountForTranslation(entry.translationBlock?.plainText || ""));
    const desiredTotal = sentenceWeights.reduce((sum, value) => sum + value, 0);
    const minimumPool = Math.max(group.length, Math.round(desiredTotal * 0.85));
    let end = typeof nextStart === "number" ? nextStart : sentences.length;
    if (end - start < minimumPool) {
      end = Math.min(sentences.length, start + minimumPool);
    }
    const availableSentences = sentences.slice(start, end);
    const chunks = chunkSentencesByWeights(availableSentences, sentenceWeights);
    if (chunks.length !== group.length || chunks.some((chunk) => !chunk.trim())) {
      return;
    }
    group.forEach((entry, index) => {
      entry.unit = "sentence_group";
      entry.sourceText = chunks[index];
    });
    globalCursor = end;
  });

  return entries;
}

function applyManualRevealOverrides(readingSlug, entries) {
  const overrides = MANUAL_REVEAL_OVERRIDES[toText(readingSlug)];
  if (!overrides) {
    return entries;
  }
  entries.forEach((entry) => {
    const override = overrides[entry.id];
    if (!override) {
      return;
    }
    entry.unit = "sentence_group";
    entry.sourceText = toText(override);
  });
  return entries;
}

function locatorForEntry(entry, key) {
  if (!entry || typeof entry !== "object") {
    return {};
  }
  return entry[`${key}_anchor`] || entry[`${key}_locator`] || {};
}

function matchesLocator(block, locator) {
  if (typeof locator.flat_index === "number" && locator.flat_index !== block.flatIndex) {
    return false;
  }
  const normalizedPath = normalizedHeadingPath(locator.heading_path);
  if (normalizedPath.length) {
    const blockPath = normalizedHeadingPath(block.headingPath);
    if (blockPath.length !== normalizedPath.length) {
      return false;
    }
    if (!blockPath.every((item, index) => item === normalizedPath[index])) {
      return false;
    }
  }
  const blockType = toText(locator.block_type || locator.type);
  if (blockType && blockType !== block.type) {
    return false;
  }
  if (typeof locator.block_index === "number" && locator.block_index !== block.blockIndex) {
    return false;
  }
  const excerpt = normalizeForMatch(locator.excerpt || locator.match_text);
  if (excerpt && !normalizeForMatch(block.plainText).includes(excerpt)) {
    return false;
  }
  return true;
}

function resolveLocator(blocks, locator) {
  const matches = blocks.filter((block) => matchesLocator(block, locator));
  if (!matches.length) {
    return { block: null, error: "locator did not match any block" };
  }
  if (matches.length > 1) {
    return { block: null, error: "locator matched multiple blocks" };
  }
  return { block: matches[0], error: "" };
}

function resolveTranslationAlignment(payload, translationDocument, originalDocument, options = {}) {
  const translationBlocks = collectLocatableBlocks(translationDocument);
  const originalBlocks = collectLocatableBlocks(originalDocument);
  const allowedStatuses = new Set((Array.isArray(options.allowedStatuses) && options.allowedStatuses.length ? options.allowedStatuses : ["verified"]).map((item) => toText(item)).filter(Boolean));
  const entries = Array.isArray(payload?.entries) ? payload.entries : [];
  const resolvedEntries = [];
  const errors = [];
  const usedTranslationBlocks = new Set();

  entries.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") {
      errors.push(`entries[${index}] must be an object`);
      return;
    }
    const status = toText(entry.status || "verified");
    if (!allowedStatuses.has(status)) {
      return;
    }
    const id = toText(entry.id);
    if (!id) {
      errors.push(`entries[${index}] is missing id`);
      return;
    }
    const unit = normalizeRevealUnit(entry.unit);
    if (!unit) {
      errors.push(`entries[${index}] (${id}) has unsupported unit`);
      return;
    }
    const translationMatch = resolveLocator(translationBlocks, locatorForEntry(entry, "ko"));
    if (translationMatch.error) {
      errors.push(`entries[${index}] (${id}) ko locator: ${translationMatch.error}`);
      return;
    }
    const originalMatch = resolveLocator(originalBlocks, locatorForEntry(entry, "en"));
    if (originalMatch.error) {
      errors.push(`entries[${index}] (${id}) en locator: ${originalMatch.error}`);
      return;
    }
    const translationBlock = translationMatch.block;
    if (translationBlock.type !== "paragraph") {
      errors.push(`entries[${index}] (${id}) must target a translation paragraph block`);
      return;
    }
    if (usedTranslationBlocks.has(translationBlock.flatIndex)) {
      errors.push(`entries[${index}] (${id}) targets a translation block that is already mapped`);
      return;
    }
    const normalizedOriginalText = normalizeForMatch(originalMatch.block.plainText);
    let sourceText = sourceTextForEntry(entry);
    if (unit === "context_block" && !sourceText) {
      sourceText = originalMatch.block.plainText;
    }
    if (!sourceText) {
      errors.push(`entries[${index}] (${id}) is missing source_text`);
      return;
    }
    const normalizedSourceText = normalizeForMatch(sourceText);
    if (unit === "paragraph" && normalizedOriginalText !== normalizedSourceText) {
      errors.push(`entries[${index}] (${id}) paragraph unit must match the entire referenced original block`);
      return;
    }
    if (unit === "sentence_group" && !normalizedOriginalText.includes(normalizedSourceText)) {
      errors.push(`entries[${index}] (${id}) source_text does not match the referenced original block`);
      return;
    }
    if (unit === "context_block" && normalizedOriginalText !== normalizedSourceText) {
      errors.push(`entries[${index}] (${id}) context_block unit must match the entire referenced original block`);
      return;
    }
    usedTranslationBlocks.add(translationBlock.flatIndex);
    resolvedEntries.push({
      id,
      unit,
      sourceText,
      translationBlock,
      originalBlock: originalMatch.block,
    });
  });

  autoSplitRepeatedContextBlocks(resolvedEntries);
  applyManualRevealOverrides(payload?.reading_slug, resolvedEntries);

  return {
    translationBlocks,
    originalBlocks,
    entries: resolvedEntries,
    errors,
  };
}

module.exports = {
  normalizeTranslationOriginalRevealConfig,
  parseMarkdownDocument,
  collectLocatableBlocks,
  resolveTranslationAlignment,
  sourceTextForEntry,
};
