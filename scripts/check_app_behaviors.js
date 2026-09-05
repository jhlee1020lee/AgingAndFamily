const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {JSDOM}=require("jsdom");

const APP=fs.readFileSync(path.join(__dirname,"site_app.js"),"utf8");
const URL="https://example.test/readings/fixture/quiz.html";
const SESSION_KEY="aaf-quiz:/readings/fixture/quiz.html";
const feedback='<section data-quiz-feedback hidden><p data-quiz-result></p><p>Answer and explanation.</p></section>';
const template=(id,kind,body)=>`<template data-player-question="${id}" data-kind="${kind}"><article data-quiz-item data-quiz-kind="${kind}" ${kind==="short"?'data-accepted-answers="[&quot;7.5 years&quot;]"':'data-correct-answer="O"'}><div><span class="quiz-number">1</span><h3 id="${id}-prompt">${id} prompt</h3></div>${body}<div class="quiz-item-actions"><button type="button" data-quiz-check>Check</button></div>${feedback}</article></template>`;
const radios=(name)=>`<fieldset><legend>Choose</legend><label class="quiz-choice"><input type="radio" name="${name}" value="O" data-quiz-input>Correct option</label><label class="quiz-choice"><input type="radio" name="${name}" value="X" data-quiz-input>Wrong option</label></fieldset>`;
const playerHtml=`<section data-quiz-player data-quiz-language="en" data-question-bank-version="fixture-v1">
  <section data-player-setup><h2 tabindex="-1" data-player-setup-title>Quiz</h2><form data-player-settings><select name="kind"><option value="all">All</option><option value="ox">True / False</option><option value="short">Short</option><option value="mcq">MCQ</option></select><select name="count"><option value="all">All</option><option value="5">Five</option></select><p data-player-selection></p><button data-player-start type="submit">Start</button></form></section>
  <section data-player-round hidden><span data-player-kind></span><span data-player-counter></span><button data-player-exit type="button">Exit</button><progress data-player-progress></progress><form data-player-answer><div data-player-card></div><p data-player-message></p><button data-player-skip type="button">Skip</button><button data-player-check type="submit">Check</button><button data-player-next type="button" hidden>Next</button></form></section>
  <section data-player-results hidden><h2 data-player-result-title tabindex="-1"></h2><p data-player-result-score></p><p data-player-result-note></p><button data-player-retry>Retry</button><button data-player-again>Again</button><button data-player-configure>Settings</button><div data-player-review></div></section>
  ${template("ox-1","ox",radios("ox-1"))}${template("short-1","short",'<label>Years<input type="text" data-quiz-input></label>')}${template("mcq-1","mcq",radios("mcq-1"))}
</section>`;

async function boot(html,entries={},prepare=()=>{}){
  const documentHtml=/<!doctype\s+html/i.test(html)?html:`<!doctype html><html lang="en"><body>${html}</body></html>`;
  const dom=new JSDOM(documentHtml,{url:URL,runScripts:"outside-only",pretendToBeVisual:true});
  await new Promise((resolve)=>dom.window.addEventListener("load",resolve,{once:true}));
  const {window}=dom;
  window.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
  window.requestAnimationFrame=(callback)=>{callback();return 1;};
  window.Math.random=()=>.999;
  window.scrollTo=({top})=>{window.scrollY=top;};
  for(const [key,value] of Object.entries(entries))window.localStorage.setItem(key,value);
  prepare(window);
  window.eval(APP);
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
  return dom;
}
const get=(dom,name)=>dom.window.document.querySelector(`[data-player-${name}]`);
const submit=(dom,name)=>get(dom,name).dispatchEvent(new dom.window.Event("submit",{bubbles:true,cancelable:true}));
const input=(dom,value)=>{
  const element=get(dom,"card").querySelector('[data-quiz-input][type="text"]');
  element.value=value;
  element.dispatchEvent(new dom.window.Event("input",{bubbles:true}));
};
const select=(dom,value)=>get(dom,"card").querySelector(`[data-quiz-input][value="${value}"]`).click();
const snapshot=(dom)=>Object.fromEntries(Array.from({length:dom.window.localStorage.length},(_,index)=>{
  const key=dom.window.localStorage.key(index);return[key,dom.window.localStorage.getItem(key)];
}));

async function checkPlayer(){
  let dom=await boot(playerHtml);
  for(const [actual,accepted] of [["고정관념체화이론","고정관념 체화 이론"],["7.50 yrs","7.5 years"],["1,000 people","1000 persons"],["55 milliseconds","55 ms"],["７．５ years!","7.5years"],[".896","0.896"]])assert(dom.window.quizAnswersMatch(actual,accepted),`${actual} should match ${accepted}`);
  for(const [actual,accepted] of [["7 5","75"],[".75","7.5"],["7.5","7.5 years"],["55 ms","55 s"],["12 months","1 year"],["7.5%","7.5"],["1,00","100"],["0.12345678901234567891","0.12345678901234567892"]])assert(!dom.window.quizAnswersMatch(actual,accepted),`${actual} must not match ${accepted}`);
  submit(dom,"settings");
  assert.equal(get(dom,"counter").textContent,"1 / 3");
  submit(dom,"answer");
  assert.equal(JSON.parse(dom.window.localStorage.getItem(SESSION_KEY)).results.length,0,"empty answers must stay ungraded");
  assert.equal(get(dom,"next").hidden,true);
  select(dom,"O");submit(dom,"answer");
  assert.equal(get(dom,"progress").value,1);
  assert.match(get(dom,"card").textContent,/Correct\./);
  get(dom,"next").click();
  input(dom,"칠 년");submit(dom,"answer");
  assert.equal(get(dom,"next").hidden,true,"Korean answers must stay editable");
  assert.equal(get(dom,"card").querySelector("[data-quiz-feedback]").hidden,true,"English input guidance must not reveal the answer");
  assert.equal(JSON.parse(dom.window.localStorage.getItem(SESSION_KEY)).results.length,1);
  assert.match(get(dom,"card").textContent,/not been graded/);
  input(dom,"7.50 yrs");
  const beforeReload=snapshot(dom);
  dom.window.close();
  dom=await boot(playerHtml,beforeReload);
  assert.equal(get(dom,"resume").hidden,false);
  get(dom,"resume").click();
  assert.equal(get(dom,"counter").textContent,"2 / 3");
  assert.equal(get(dom,"card").querySelector("input").value,"7.50 yrs","draft must survive reload");
  submit(dom,"answer");
  assert.match(get(dom,"card").textContent,/Correct\./);
  const gradedReload=snapshot(dom);
  dom.window.close();
  dom=await boot(playerHtml,gradedReload);
  get(dom,"resume").click();
  assert.equal(get(dom,"card").querySelector("input").disabled,true,"graded state must survive reload");
  assert.equal(get(dom,"next").hidden,false);
  get(dom,"next").click();select(dom,"X");submit(dom,"answer");get(dom,"next").click();
  assert.equal(get(dom,"results").hidden,false);
  assert.match(get(dom,"result-score").textContent,/67%.*2 \/ 3/);
  assert.equal(get(dom,"review").querySelectorAll("details").length,1);
  const finished=snapshot(dom);
  dom.window.close();
  dom=await boot(playerHtml,finished);
  get(dom,"resume").click();
  assert.equal(get(dom,"results").hidden,false,"completed results must survive reload");
  get(dom,"retry").click();
  assert.equal(get(dom,"counter").textContent,"1 / 1");
  assert.equal(get(dom,"card").querySelector("h3").id,"mcq-1-prompt");
  select(dom,"O");submit(dom,"answer");get(dom,"next").click();
  assert.match(get(dom,"result-score").textContent,/100%.*1 \/ 1/);
  assert.deepEqual(JSON.parse(dom.window.localStorage.getItem(SESSION_KEY)).missedQuestionIds,[],"correct retry must clear the saved mistake");
  get(dom,"configure").click();
  get(dom,"settings").elements.kind.value="short";
  submit(dom,"settings");
  assert.equal(get(dom,"counter").textContent,"1 / 1","type filter must affect the real DOM round");
  get(dom,"skip").click();get(dom,"next").click();
  assert.match(get(dom,"result-note").textContent,/1 skipped/);
  get(dom,"configure").click();
  assert.equal(get(dom,"review-missed").hidden,false);
  get(dom,"review-missed").click();
  assert.equal(get(dom,"card").querySelector("h3").id,"short-1-prompt");
  get(dom,"exit").click();
  assert.match(get(dom,"result-score").textContent,/No questions answered/);
  const invalidated=snapshot(dom);
  dom.window.close();
  dom=await boot(playerHtml.replace('fixture-v1','fixture-v2'),invalidated);
  assert.equal(get(dom,"resume").hidden,true,"question-bank revision must invalidate old progress");
  assert.equal(get(dom,"review-missed").hidden,true);
  assert.match(get(dom,"saved-note").textContent,/question bank changed/);
  dom.window.close();
}

async function checkReader(){
  const html=`<main data-reader-root data-page-path="reader-fixture"><div data-reading-status></div><button data-page-bookmark></button><button data-resume-position hidden>Resume</button><button data-font-action="increase">Larger</button><button data-font-action="reset">Reset</button><div data-important-list></div><nav><a href="#first" data-reader-toc-link>First</a><a href="#second" data-reader-toc-link>Second</a></nav><div data-reading-progress-bar></div><article data-article-body data-reading-article-body><h2 id="first">First</h2><p>Long section</p><h2 id="second">Second</h2></article></main>`;
  const prepare=(window)=>{
    const first=window.document.getElementById("first"),second=window.document.getElementById("second");
    first.getBoundingClientRect=()=>({top:100-window.scrollY});
    second.getBoundingClientRect=()=>({top:2500-window.scrollY});
    const article=window.document.querySelector("article");
    article.getBoundingClientRect=()=>({top:100-window.scrollY});
    Object.defineProperty(article,"scrollHeight",{value:3500});
    Object.defineProperty(window.document.documentElement,"scrollHeight",{value:3600});
  };
  let dom=await boot(html,{},prepare);
  const {window}=dom;
  window.scrollY=700;
  window.dispatchEvent(new window.Event("scroll"));
  assert.equal(window.document.querySelector('[data-reader-toc-link][aria-current="true"]').getAttribute("href"),"#first","a heading below the viewport must not become the active section");
  window.document.querySelector("[data-page-bookmark]").click();
  window.document.querySelector("[data-font-action=increase]").click();
  window.document.querySelector("#first .mark-btn").click();
  window.dispatchEvent(new window.Event("pagehide"));
  const saved=snapshot(dom);
  assert.equal(JSON.parse(saved["aaf-scroll:reader-fixture"]).headingId,"first");
  dom.window.close();
  dom=await boot(html,saved,(window)=>{
    prepare(window);
    // The layout changed (for example the font size or viewport changed).
    window.document.getElementById("first").getBoundingClientRect=()=>({top:300-window.scrollY});
  });
  assert.equal(dom.window.document.querySelector("[data-page-bookmark]").getAttribute("aria-pressed"),"true");
  assert.equal(dom.window.document.querySelector("#first .mark-btn").getAttribute("aria-pressed"),"true");
  assert.equal(dom.window.document.documentElement.style.getPropertyValue("--reader-font-scale"),"1.05");
  dom.window.document.querySelector("[data-resume-position]").click();
  assert.equal(dom.window.scrollY,900,"resume must use the saved heading and relative offset after reflow");
  dom.window.close();
}

async function checkPrepAndFilters(){
  const prep=`<section data-prep-root data-prep-language="en"><button data-prep-tab="talk" aria-selected="true">Talk</button><div data-prep-panel="talk"><article data-prep-card data-card-id="stable-card"><h3 data-prep-title>Question</h3><button data-prep-difficult>Mark</button><label>Your answer<textarea data-prep-practice></textarea></label><details data-prep-model><summary>Model response</summary>Model answer</details></article></div></section>`;
  let dom=await boot(prep);
  const textarea=dom.window.document.querySelector("textarea");
  textarea.value="This paper proposes four components.";
  textarea.dispatchEvent(new dom.window.Event("input",{bubbles:true}));
  dom.window.document.querySelector("[data-prep-difficult]").click();
  assert.equal(dom.window.document.querySelector("[data-prep-model]").open,false);
  const entries=snapshot(dom);dom.window.close();
  dom=await boot(prep,entries);
  assert.equal(dom.window.document.querySelector("textarea").value,"This paper proposes four components.");
  assert.equal(dom.window.document.querySelector("[data-prep-difficult]").getAttribute("aria-pressed"),"true");
  assert.match(dom.window.document.querySelector("[data-prep-practice-status]").textContent,/Draft saved/);
  dom.window.close();
  const filters=`<section data-home-controls><input data-reading-search><button class="is-active" data-filter-chip data-filter-value="">All</button><button data-filter-chip data-filter-value="article">Articles</button></section><p data-filter-result-count></p><div data-reading-grid><article data-reading-card data-search="Levy" data-filter-group="paper"></article><article data-reading-card data-search="Underwood" data-filter-group="article"></article></div><p data-empty-state hidden>Empty</p>`;
  dom=await boot(filters);
  const search=dom.window.document.querySelector("[data-reading-search]");
  search.value="Levy";search.dispatchEvent(new dom.window.Event("input"));
  dom.window.document.querySelector('[data-filter-value="article"]').click();
  assert.equal(dom.window.document.querySelector("[data-empty-state]").hidden,false);
  search.value="";search.dispatchEvent(new dom.window.Event("input"));
  assert.equal(dom.window.document.querySelectorAll("[data-reading-card]:not([hidden])").length,1);
  assert.match(dom.window.document.querySelector("[data-filter-result-count]").textContent,/1.*2/);
  assert.equal(dom.window.document.querySelector('[data-filter-value="article"]').getAttribute("aria-pressed"),"true");
  dom.window.close();
}

async function checkGeneratedPages(){
  let count=0;
  const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,"..","manifest","readings.json"),"utf8"));
  const requested=process.argv.flatMap((arg,index)=>arg==="--slug"?[process.argv[index+1]]:[]);
  const readings=manifest.readings.filter((reading)=>!requested.length||requested.includes(reading.slug));
  assert(readings.length,"No matching readings for generated DOM checks");
  for(const {slug} of readings){
    const read=(page)=>fs.readFileSync(path.join(__dirname,"..","docs","readings",slug,`${page}.html`),"utf8");
    let dom=await boot(read("quiz"));
    const root=dom.window.document.querySelector("[data-quiz-player]");
    assert.equal(root.dataset.quizLanguage,"en",`${slug}: English quiz root contract`);
    assert(root.dataset.questionBankVersion,`${slug}: bank revision contract`);
    const available=root.querySelectorAll("template[data-player-question]").length;
    assert.equal(available,45);
    get(dom,"settings").elements.kind.value="all";
    get(dom,"settings").elements.count.value="all";
    submit(dom,"settings");
    const kinds=new Set();
    for(let index=0;index<available;index++){
      const card=get(dom,"card").querySelector("[data-quiz-item]");
      kinds.add(card.dataset.quizKind);
      if(card.dataset.quizKind==="short")input(dom,JSON.parse(card.dataset.acceptedAnswers)[0]);
      else{
        const answer=Array.from(card.querySelectorAll("input")).find((element)=>element.value===card.dataset.correctAnswer);
        assert(answer,`${slug}: rendered correct option is selectable`);
        answer.click();
      }
      submit(dom,"answer");
      assert(card.classList.contains("is-correct"),`${slug}: question ${index+1} can be answered through the DOM`);
      assert.equal(get(dom,"progress").value,index+1);
      assert(card.querySelectorAll("[data-quiz-feedback] details").length||card.querySelector(".quiz-evidence"),`${slug}: explanation retains source evidence`);
      get(dom,"next").click();
      count++;
    }
    assert.equal(kinds.size,3);
    assert.match(get(dom,"result-score").textContent,/100%.*45 \/ 45/);
    dom.window.close();
    dom=await boot(read("quiz-short"));
    const legacy=dom.window.document.querySelector("[data-quiz-root]");
    assert.equal(legacy.dataset.quizLanguage,"en");
    const shortCard=legacy.querySelector("[data-quiz-item]");
    shortCard.querySelector("input").value=JSON.parse(shortCard.dataset.acceptedAnswers)[0];
    shortCard.querySelector("[data-quiz-check]").click();
    assert.equal(shortCard.querySelector("[data-quiz-result]").textContent,"Correct.");
    shortCard.querySelector("input").value="한국어 답변";
    shortCard.querySelector("[data-quiz-check]").click();
    assert.equal(shortCard.dataset.quizGraded,undefined);
    assert.equal(shortCard.querySelector("[data-quiz-feedback]").hidden,true);
    assert.match(legacy.querySelector("[data-quiz-score]").textContent,/No answers graded/);
    dom.window.close();
    dom=await boot(read("professor-prep"));
    assert.equal(dom.window.document.querySelector("[data-prep-root]").dataset.prepLanguage,"en");
    const textarea=dom.window.document.querySelector("textarea[data-prep-practice]");
    assert(textarea,`${slug}: practice textarea contract`);
    textarea.value="My practice response.";
    textarea.dispatchEvent(new dom.window.Event("input",{bubbles:true}));
    assert.match(textarea.closest("[data-prep-card]").querySelector("[data-prep-practice-status]").textContent,/Draft saved/);
    assert.equal(dom.window.document.querySelector("[data-prep-model]").open,false);
    dom.window.close();
    dom=await boot(read("translation"));
    const reader=dom.window.document.querySelector("[data-reader-root]");
    assert(reader,`${slug}: reader root contract`);
    assert(reader.querySelector("[data-article-body] .mark-btn"),`${slug}: stable headings are markable`);
    reader.querySelector("[data-page-bookmark]").click();
    assert.equal(reader.querySelector("[data-page-bookmark]").getAttribute("aria-pressed"),"true");
    reader.querySelector("[data-font-action=increase]").click();
    assert.equal(dom.window.document.documentElement.style.getPropertyValue("--reader-font-scale"),"1.05");
    dom.window.close();
  }
  return count;
}

(async()=>{
  await checkPlayer();
  await checkReader();
  await checkPrepAndFilters();
  const renderedQuestions=await checkGeneratedPages();
  console.log(`PASS app behaviors (real DOM quiz rounds, grading, English input, reload/resume, mistakes, bank invalidation, reader persistence/TOC, prep drafts and filters; ${renderedQuestions} generated questions)`);
})().catch((error)=>{console.error(error);process.exitCode=1;});
