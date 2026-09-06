(() => {
  "use strict";

  const LANGUAGE_KEY = "aaf-weekly-languages";
  const isLanguage = (value) => value === "en" || value === "ko";

  function initWeeklyPage(root) {
    if (root.dataset.weeklyInitialized === "true") return;

    const controls = root.querySelector(".weekly-controls");
    const questionSelect = root.querySelector("[data-weekly-question-select]");
    const answerSelect = root.querySelector("[data-weekly-answer-select]");
    const hideAnswers = root.querySelector("[data-weekly-hide-answers]");
    const markedOnly = root.querySelector("[data-weekly-marked-only]");
    const status = root.querySelector("[data-weekly-status]");
    const empty = root.querySelector(".weekly-empty");
    const cards = Array.from(root.querySelectorAll("[data-weekly-card]"));
    if (!controls || !questionSelect || !answerSelect || !hideAnswers || !markedOnly || !status || !empty) return;

    root.dataset.weeklyInitialized = "true";
    const practiceKey = `aaf-weekly-${root.dataset.weeklyId}-${root.dataset.weeklyVersion}`;
    let storageFailed = false;

    function readSaved(key) {
      let raw;
      try {
        raw = localStorage.getItem(key);
      } catch (error) {
        storageFailed = true;
        return {};
      }
      try {
        const value = JSON.parse(raw);
        return value && typeof value === "object" && !Array.isArray(value) ? value : {};
      } catch (error) {
        return {};
      }
    }

    function save(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        storageFailed = true;
      }
    }

    const languages = readSaved(LANGUAGE_KEY);
    const practice = readSaved(practiceKey);
    const cardIds = new Set(cards.map((card) => card.id));
    const marked = new Set(
      (Array.isArray(practice.marked) ? practice.marked : [])
        .filter((id) => typeof id === "string" && cardIds.has(id))
    );

    questionSelect.value = isLanguage(languages.question) ? languages.question : "en";
    answerSelect.value = isLanguage(languages.answer) ? languages.answer : "en";
    markedOnly.checked = practice.markedOnly === true;
    hideAnswers.checked = false;

    function updateLanguages() {
      root.querySelectorAll("[data-weekly-question-language]").forEach((element) => {
        element.hidden = element.dataset.weeklyQuestionLanguage !== questionSelect.value;
      });
      root.querySelectorAll("[data-weekly-answer-language]").forEach((element) => {
        element.hidden = element.dataset.weeklyAnswerLanguage !== answerSelect.value;
      });
    }

    function updateStatus() {
      const visibleCount = markedOnly.checked ? marked.size : cards.length;
      const count = markedOnly.checked
        ? `표시한 질문 ${visibleCount}개 · 전체 ${cards.length}개`
        : `전체 ${cards.length}개 · 다시 연습 ${marked.size}개`;
      const mode = hideAnswers.checked ? " · 답변을 가리고 연습 중" : "";
      const storageNote = storageFailed
        ? " 이 브라우저에 저장할 수 없어 변경 사항은 이번 방문에만 유지됩니다."
        : "";
      status.textContent = count + mode + storageNote;
    }

    function updateCards() {
      cards.forEach((card) => {
        const isMarked = marked.has(card.id);
        card.hidden = markedOnly.checked && !isMarked;
        const markButton = card.querySelector("[data-weekly-mark]");
        if (markButton) {
          markButton.setAttribute("aria-pressed", String(isMarked));
          markButton.textContent = isMarked ? "표시됨" : "다시 연습";
          markButton.hidden = false;
        }
      });
      empty.hidden = !markedOnly.checked || marked.size > 0;
      updateStatus();
    }

    function savePractice() {
      save(practiceKey, { marked: Array.from(marked), markedOnly: markedOnly.checked });
    }

    [questionSelect, answerSelect].forEach((select) => {
      select.addEventListener("change", () => {
        updateLanguages();
        save(LANGUAGE_KEY, { question: questionSelect.value, answer: answerSelect.value });
        updateStatus();
      });
    });

    hideAnswers.addEventListener("change", () => {
      root.querySelectorAll("details[data-weekly-answer]").forEach((details) => {
        details.open = !hideAnswers.checked;
      });
      updateStatus();
    });

    markedOnly.addEventListener("change", () => {
      savePractice();
      updateCards();
    });

    cards.forEach((card) => {
      const markButton = card.querySelector("[data-weekly-mark]");
      if (!markButton) return;
      markButton.addEventListener("click", () => {
        if (marked.has(card.id)) marked.delete(card.id);
        else marked.add(card.id);
        savePractice();
        updateCards();
        if (card.hidden) {
          const nextCard = cards.find((candidate) => !candidate.hidden);
          const nextButton = nextCard && nextCard.querySelector("[data-weekly-mark]");
          (nextButton || markedOnly).focus();
        }
      });
    });

    // Topic links must remain usable while a marked-only filter is active.
    root.querySelectorAll(".weekly-question-nav a[href^='#']").forEach((link) => {
      link.addEventListener("click", () => {
        let id;
        try {
          id = decodeURIComponent(link.getAttribute("href").slice(1));
        } catch (error) {
          return;
        }
        const targetCard = cards.find((card) => card.id === id);
        if (targetCard && targetCard.hidden) {
          markedOnly.checked = false;
          savePractice();
          updateCards();
        }
      });
    });

    // A direct question link takes priority over a previously saved filter.
    let fragment;
    try {
      fragment = decodeURIComponent(window.location.hash.slice(1));
    } catch (error) {
      fragment = "";
    }
    if (cardIds.has(fragment) && !marked.has(fragment)) markedOnly.checked = false;

    updateLanguages();
    updateCards();
    controls.hidden = false;
  }

  function init() {
    document.querySelectorAll("[data-weekly-root]").forEach(initWeeklyPage);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
