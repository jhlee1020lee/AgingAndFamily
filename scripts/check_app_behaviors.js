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

async function boot(html,entries={},prepare=()=>{},pageUrl=URL){
  const documentHtml=/<!doctype\s+html/i.test(html)?html:`<!doctype html><html lang="en"><body>${html}</body></html>`;
  const dom=new JSDOM(documentHtml,{url:pageUrl,runScripts:"outside-only",pretendToBeVisual:true});
  await new Promise((resolve)=>dom.window.addEventListener("load",resolve,{once:true}));
  const {window}=dom;
  window.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
  window.requestAnimationFrame=(callback)=>{callback();return 1;};
  window.Math.random=()=>.999;
  window.scrollTo=({top})=>{window.scrollY=top;};
  for(const [key,value] of Object.entries(entries))window.localStorage.setItem(key,value);
  prepare(window);
  for(const script of window.document.querySelectorAll("script:not([src])")){
    if(!script.type||/^(?:text|application)\/javascript$/.test(script.type))window.eval(script.textContent);
  }
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
  const html=`<main><nav><a href="#first" data-reader-toc-link>First</a><a href="#second" data-reader-toc-link>Second</a></nav><div data-reading-progress-bar></div><article data-reading-article-body><h2 id="first">First</h2><p>Long section</p><h2 id="second">Second</h2></article></main>`;
  const legacy=legacyReaderEntries("/readings/fixture/quiz.html");
  const prepare=(window)=>{
    const first=window.document.getElementById("first"),second=window.document.getElementById("second");
    first.getBoundingClientRect=()=>({top:100-window.scrollY});
    second.getBoundingClientRect=()=>({top:2500-window.scrollY});
    const article=window.document.querySelector("article");
    article.getBoundingClientRect=()=>({top:100-window.scrollY});
    Object.defineProperty(article,"scrollHeight",{value:3500});
    Object.defineProperty(window.document.documentElement,"scrollHeight",{value:3600});
  };
  let dom=await boot(html,legacy,prepare);
  const {window}=dom;
  assert.equal(window.document.documentElement.style.getPropertyValue("--reader-font-scale"),"","old font preferences must not change the reading layout");
  assert.equal(window.scrollY,0,"old reading positions must not restore automatically");
  assert.equal(window.document.querySelector(".mark-btn, [data-resume-position], [data-page-bookmark], [data-font-action]"),null);
  window.scrollY=700;
  window.dispatchEvent(new window.Event("scroll"));
  assert.equal(window.document.querySelector('[data-reader-toc-link][aria-current="true"]').getAttribute("href"),"#first","a heading below the viewport must not become the active section");
  const progress=parseFloat(window.document.querySelector("[data-reading-progress-bar]").style.width);
  assert(progress>0&&progress<100,"reading progress must continue updating without persistence tools");
  window.dispatchEvent(new window.Event("pagehide"));
  for(const [key,value] of Object.entries(legacy))assert.equal(window.localStorage.getItem(key),value,"retired reading state must not be rewritten");
  dom.window.close();
  dom=await boot(html,legacy,(window)=>{
    prepare(window);
    window.document.getElementById("first").getBoundingClientRect=()=>({top:300-window.scrollY});
  });
  assert.equal(dom.window.document.documentElement.style.getPropertyValue("--reader-font-scale"),"");
  assert.equal(dom.window.scrollY,0,"reload must not restore an old reading position after reflow");
  dom.window.close();
}

function legacyReaderEntries(pagePath){
  return{
    "aaf-font-scale":"1.35",
    [`aaf-scroll:${pagePath}`]:JSON.stringify({y:2100,t:1,headingId:"first",offset:600}),
    [`aaf-marks:${pagePath}`]:JSON.stringify(["first"]),
    "aaf-bookmarked-pages":JSON.stringify([pagePath]),
  };
}

async function checkPrepAndFilters(){
  const prep=`<section data-prep-root data-prep-language="en"><button data-prep-tab="talk" aria-selected="true">Talk</button><button data-prep-tab="response" aria-selected="false">Response</button><div data-prep-panel="talk"><article data-prep-card data-card-id="stable-card"><h3 data-prep-title>Question</h3><button data-prep-difficult>Mark</button><section data-prep-answer><h4 class="prep-answer-label">Model answer</h4><p class="prep-answer-copy">This paper proposes four components.</p></section></article></div><div data-prep-panel="response" hidden><article data-prep-card data-card-id="response-card"><h3 data-prep-title>Reading response</h3><section data-prep-answer><h4 class="prep-answer-label">Model answer</h4><p class="prep-answer-copy">The argument connects individual and social processes.</p></section></article></div></section>`;
  const key="aaf-prep:/readings/fixture/quiz.html";
  let dom=await boot(prep,{[key]:JSON.stringify({activeTab:"talk",difficultIds:[],drafts:{"stable-card":"Obsolete saved draft"}}),"aaf-prep-languages":JSON.stringify({questionLanguage:"ko",answerLanguage:"ko"})});
  assert.equal(dom.window.document.querySelector("textarea, [data-prep-practice], [data-prep-model]"),null);
  assert.equal(dom.window.document.querySelector(".prep-answer-copy").closest("details, [hidden]"),null,"active-tab model answers must be displayed immediately");
  dom.window.document.querySelector("[data-prep-difficult]").click();
  dom.window.document.querySelector('[data-prep-tab="response"]').click();
  assert.equal(dom.window.document.querySelector('[data-prep-panel="response"] .prep-answer-copy').closest("details, [hidden]"),null);
  const entries=snapshot(dom);dom.window.close();
  assert.equal(JSON.parse(entries[key]).drafts,undefined,"only tabs and review marks should be persisted");
  dom=await boot(prep,entries);
  assert.equal(dom.window.document.querySelector("[data-prep-difficult]").getAttribute("aria-pressed"),"true");
  assert.equal(dom.window.document.querySelector('[data-prep-tab="response"]').getAttribute("aria-selected"),"true");
  assert.equal(dom.window.document.querySelector('[data-prep-panel="response"] .prep-answer-copy').closest("details, [hidden]"),null);
  assert(!dom.window.document.body.textContent.includes("Obsolete saved draft"));
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

function bilingualPrepFixture(){
  const card=(id)=>`<article data-prep-card data-card-id="${id}"><h3 data-prep-title lang="en"><span data-prep-question-language="en" lang="en">English question ${id}</span><span data-prep-question-language="ko" lang="ko" hidden>한국어 질문 ${id}</span></h3><button data-prep-difficult>Mark for review</button><section data-prep-answer><h4 class="prep-answer-label" data-prep-answer-label lang="en">30-second answer</h4><p class="prep-answer-copy" lang="en"><span data-prep-answer-language="en" lang="en">English answer ${id}</span><span data-prep-answer-language="ko" lang="ko" hidden>한국어 답변 ${id}</span></p></section></article>`;
  const selector=(kind)=>`<label>${kind}<select data-prep-${kind}-select><option value="en">English</option><option value="ko">한국어</option></select></label>`;
  return `<section data-prep-root data-prep-language="en">${selector("question")}${selector("answer")}<button data-prep-tab="talk" aria-selected="true">Talk</button><button data-prep-tab="response" aria-selected="false">Response</button><section data-prep-panel="talk">${card("cold")}</section><section data-prep-panel="response" hidden>${card("response")}</section><div data-prep-difficult-list></div></section>`;
}

function setPrepLanguage(dom,kind,language){
  const select=dom.window.document.querySelector(`[data-prep-${kind}-select]`);
  assert(select,`The ${kind} language selector is missing`);
  select.value=language;
  select.dispatchEvent(new dom.window.Event("change",{bubbles:true}));
}

function assertPrepLanguages(dom,questionLanguage,answerLanguage){
  const root=dom.window.document.querySelector("[data-prep-root]");
  assert.equal(root.querySelector("[data-prep-question-select]").value,questionLanguage);
  assert.equal(root.querySelector("[data-prep-answer-select]").value,answerLanguage);
  for(const card of root.querySelectorAll("[data-prep-card]")){
    for(const [kind,language,selector] of [["question",questionLanguage,"[data-prep-title]"],["answer",answerLanguage,".prep-answer-copy"]]){
      const container=card.querySelector(selector);
      assert.equal(container.lang,language,`${kind} container must expose its selected language`);
      const variants=Array.from(container.querySelectorAll(`span[data-prep-${kind}-language]`));
      assert.equal(variants.length,2,`Each ${kind} needs English and Korean variants`);
      for(const expected of ["en","ko"]){
        const variant=variants.find((item)=>item.getAttribute(`data-prep-${kind}-language`)===expected);
        assert(variant?.textContent.trim(),`${expected} ${kind} text is missing`);
        assert.equal(variant.lang,expected);
        assert.equal(variant.hidden,expected!==language,`${kind} visibility must follow only its own selector`);
      }
    }
    const label=card.querySelector("[data-prep-answer-label]");
    assert.equal(label.lang,answerLanguage);
    assert.equal(/[\uac00-\ud7af]/.test(label.textContent),answerLanguage==="ko","answer label must follow the answer language");
  }
}

async function checkPrepLanguages(){
  const html=bilingualPrepFixture();
  const key="aaf-prep-languages";
  let dom=await boot(html);
  assertPrepLanguages(dom,"en","en");
  dom.window.document.querySelector('[data-prep-tab="response"]').click();
  let previousAnswer="en";
  for(const [questionLanguage,answerLanguage] of [["en","en"],["ko","en"],["ko","ko"],["en","ko"]]){
    setPrepLanguage(dom,"question",questionLanguage);
    assertPrepLanguages(dom,questionLanguage,previousAnswer);
    setPrepLanguage(dom,"answer",answerLanguage);
    assertPrepLanguages(dom,questionLanguage,answerLanguage);
    assert.equal(dom.window.document.querySelector('[data-prep-tab="response"]').getAttribute("aria-selected"),"true","language changes must preserve the active tab");
    previousAnswer=answerLanguage;
  }
  setPrepLanguage(dom,"question","ko");setPrepLanguage(dom,"answer","en");
  dom.window.document.querySelector('[data-prep-panel="response"] [data-prep-difficult]').click();
  assert.match(dom.window.document.querySelector("[data-prep-difficult-list]").textContent,/한국어 질문/);
  const saved=snapshot(dom);
  assert.deepEqual(JSON.parse(saved[key]),{questionLanguage:"ko",answerLanguage:"en"});
  dom.window.close();
  dom=await boot(html,saved);
  assertPrepLanguages(dom,"ko","en");
  assert.equal(dom.window.document.querySelector('[data-prep-tab="response"]').getAttribute("aria-selected"),"true");
  dom.window.close();
  dom=await boot(html,saved,()=>{},"https://example.test/readings/another-paper/professor-prep.html");
  assertPrepLanguages(dom,"ko","en");
  assert.equal(dom.window.document.querySelector('[data-prep-tab="talk"]').getAttribute("aria-selected"),"true","language preferences must cross readings while tab state remains per reading");
  dom.window.close();
  for(const [stored,questionLanguage,answerLanguage] of [["broken JSON","en","en"],[JSON.stringify({questionLanguage:"invalid",answerLanguage:"ko"}),"en","ko"],[JSON.stringify({questionLanguage:"ko",answerLanguage:null}),"ko","en"],[JSON.stringify([]),"en","en"]]){
    dom=await boot(html,{[key]:stored});
    assertPrepLanguages(dom,questionLanguage,answerLanguage);
    dom.window.close();
  }
  dom=await boot(html,{},(window)=>Object.defineProperty(window,"localStorage",{get(){throw new Error("Storage blocked for fixture");}}));
  assertPrepLanguages(dom,"en","en");
  setPrepLanguage(dom,"question","ko");setPrepLanguage(dom,"answer","ko");
  assertPrepLanguages(dom,"ko","ko");
  dom.window.close();
}

async function checkGeneratedPages(){
  let count=0;
  let prepAnswerCount=0;
  let readingPageCount=0;
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
    const prepRoot=dom.window.document.querySelector("[data-prep-root]");
    assert.equal(prepRoot.dataset.prepLanguage,"en");
    assert.equal(prepRoot.querySelector("textarea, [data-prep-practice], [data-prep-model], [data-prep-practice-status]"),null,`${slug}: removed prep inputs and disclosures must stay absent`);
    const cards=Array.from(prepRoot.querySelectorAll("[data-prep-card]"));
    assertPrepLanguages(dom,"en","en");
    for(const [questionLanguage,answerLanguage] of [["ko","en"],["ko","ko"],["en","ko"],["en","en"]]){
      setPrepLanguage(dom,"question",questionLanguage);setPrepLanguage(dom,"answer",answerLanguage);
      assertPrepLanguages(dom,questionLanguage,answerLanguage);
    }
    const seenCards=new Set();
    for(const tab of prepRoot.querySelectorAll("[data-prep-tab]")){
      tab.click();
      const panel=Array.from(prepRoot.querySelectorAll("[data-prep-panel]")).find((item)=>item.dataset.prepPanel===tab.dataset.prepTab);
      assert(panel&&!panel.hidden,`${slug}: selecting a prep tab must reveal its panel`);
      for(const card of panel.querySelectorAll("[data-prep-card]")){
        const answer=card.querySelector("section[data-prep-answer] > p.prep-answer-copy");
        assert(answer?.textContent.trim(),`${slug}: ${card.dataset.cardId} needs a direct model answer`);
        assert(card.querySelector("section[data-prep-answer] > h4.prep-answer-label")?.textContent.trim(),`${slug}: answer label is missing`);
        assert.equal(answer.closest("details, [hidden]"),null,`${slug}: model answers must be visible within the selected tab`);
        assert(card.querySelector("[data-prep-answer] .quiz-evidence"),`${slug}: direct answers must retain source evidence`);
        seenCards.add(card);
        prepAnswerCount++;
      }
    }
    assert.equal(seenCards.size,cards.length,`${slug}: every prep card must be accessible through its tab`);
    const mark=prepRoot.querySelector("[data-prep-panel]:not([hidden]) [data-prep-difficult]");
    assert(mark,`${slug}: mark for review remains available`);
    mark.click();
    assert.equal(mark.getAttribute("aria-pressed"),"true");
    dom.window.close();
    for(const page of ["full","translation"]){
      const pagePath=`/readings/${slug}/${page}.html`;
      const oldState=legacyReaderEntries(pagePath);
      dom=await boot(read(page),oldState,()=>{},`https://example.test${pagePath}`);
      const doc=dom.window.document;
      assert(doc.querySelector("[data-reading-article-body]"),`${slug}/${page}: readable article remains`);
      assert.equal(doc.querySelector("[data-reader-root], .reader-tools, [data-font-action], [data-page-bookmark], [data-resume-position], [data-important-list], .mark-btn"),null,`${slug}/${page}: retired reader controls must stay absent`);
      assert(doc.querySelector("[data-reader-toc-link]")&&doc.querySelector("[data-reading-progress-bar]"),`${slug}/${page}: contents navigation and progress remain`);
      assert.equal(doc.documentElement.style.getPropertyValue("--reader-font-scale"),"",`${slug}/${page}: old font scale must not be applied, including by inline bootstrap`);
      assert.equal(dom.window.scrollY,0,`${slug}/${page}: old saved position must not change initial scroll`);
      dom.window.dispatchEvent(new dom.window.Event("pagehide"));
      for(const [key,value] of Object.entries(oldState))assert.equal(dom.window.localStorage.getItem(key),value,`${slug}/${page}: removed reading preferences must not be updated`);
      dom.window.close();
      readingPageCount++;
    }
  }
  return{renderedQuestions:count,prepAnswerCount,readingPageCount};
}

(async()=>{
  await checkPlayer();
  await checkReader();
  await checkPrepAndFilters();
  await checkPrepLanguages();
  const counts=process.argv.includes("--fixture-only")?null:await checkGeneratedPages();
  console.log(`PASS app behaviors (quiz grading/resume/mistakes unchanged; TOC/progress without retired reader state, direct bilingual prep answers with independent languages/tabs/review marks, and filters; ${counts?`${counts.renderedQuestions} generated questions, ${counts.prepAnswerCount} bilingual prep answers, ${counts.readingPageCount} reading pages`:"fixtures only"})`);
})().catch((error)=>{console.error(error);process.exitCode=1;});
