# Stage 3 Work Log - levy-2009

## Content sequence

1. Wrote a paper-specific summary centered on the four theoretical components and their evidence.
2. Defined seven concepts with Korean and English terms, precise definitions, plain-language explanations, importance, and confusion points.
3. Built six contrast sections covering social construction, self-relevance, unconscious operation, the 7.5-year result, multiple pathways, and transferability.
4. Produced a compact review sheet with the four-component flow, numeric anchors, pathway evidence, and causal cautions.
5. Created exactly 15 OX, 15 short-answer, and 15 multiple-choice items.
6. Created 15 professor-style oral-response cards with a conclusion-evidence-limitation/application flow.

## Evidence discipline

- Every quiz item has an `evidence_segment_id` that exists in `source_segments.json`.
- Questions use only Levy (2009) for factual claims and correct answers.
- The former Adult Development and Aging materials informed only the mixture of definitions, contrasts, number traps, and application prompts.
- Data labels distinguish `논문 근거 학습문제` from `교수 스타일 예상문제`.

## Quiz QA

- OX direction was balanced and false items change a meaningful condition, number, direction, or scope.
- Short answers stay within the validator's seven-word limit and do not leak the accepted answer in the question.
- Multiple-choice answer positions vary, and distractors target actual confusions rather than unrelated trivia.
- Explanations state why the answer is correct and preserve observational-versus-causal distinctions.

## Manual review status

- Stage 3 is schema-ready for review but has not been manually approved in `meta.json`.

## 객관식 길이·위치 단서 제거

- 기존 객관식에서 정답이 A·B에 몰리고 가장 긴 선택지가 정답인 패턴을 전 문항에서 제거했다.
- 정답 위치와 정답 길이 순위를 모두 1·2·3·4번에 각각 4·4·4·3회로 분산했다.
- 네 이론 구성요소, 7.5년의 집단 평균, 종단자료의 관찰적 범위, 심리·행동·생리 경로는 그대로 보존했으며, 수정본은 독립 내용 감사 뒤에만 승인한다.
