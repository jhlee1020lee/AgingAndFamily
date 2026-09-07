const storage={
  get(key,fallback){
    try{
      const raw=localStorage.getItem(key);
      return raw?JSON.parse(raw):fallback;
    }catch(error){
      return fallback;
    }
  },
  set(key,value){
    try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(error){return false;}
  },
  remove(key){
    try{localStorage.removeItem(key);}catch(error){}
  }
};

const STORAGE_PREFIX="aaf";
const THEME_KEY=`${STORAGE_PREFIX}-theme`;
const UI_TEXT={
  darkMode:"다크 모드",
  lightMode:"라이트 모드",
  prepDifficult:"표시",
  prepDifficultActive:"표시됨",
  prepNoDifficult:"표시한 답변 카드가 여기에 모입니다."
};

function setTheme(theme){
  document.documentElement.dataset.theme=theme;
  try{localStorage.setItem(THEME_KEY,theme);}catch(error){}
  document.querySelectorAll("[data-theme-toggle]").forEach((button)=>{
    button.textContent=theme==="dark"?UI_TEXT.lightMode:UI_TEXT.darkMode;
  });
}

function initTheme(){
  const saved=(()=>{try{return localStorage.getItem(THEME_KEY);}catch(error){return null;}})();
  setTheme(saved||document.documentElement.dataset.theme||"light");
  document.querySelectorAll("[data-theme-toggle]").forEach((button)=>{
    button.addEventListener("click",()=>{
      setTheme(document.documentElement.dataset.theme==="dark"?"light":"dark");
    });
  });
}

function ensureGateToast(){
  let toast=document.querySelector("[data-gate-toast]");
  if(toast)return toast;
  toast=document.createElement("div");
  toast.className="gate-toast";
  toast.hidden=true;
  toast.setAttribute("data-gate-toast","");
  toast.setAttribute("role","status");
  toast.setAttribute("aria-live","polite");
  toast.setAttribute("aria-atomic","true");
  document.body.appendChild(toast);
  return toast;
}

function showGateToast(message){
  const toast=ensureGateToast();
  const text=(message||"준비중입니다.").trim();
  toast.textContent=text;
  toast.hidden=false;
  if(showGateToast.timer)window.clearTimeout(showGateToast.timer);
  showGateToast.timer=window.setTimeout(()=>{
    toast.hidden=true;
  },1800);
}

function parseHomeReadingData(){
  const script=document.getElementById("home-reading-data");
  if(!script)return null;
  try{
    const payload=JSON.parse(script.textContent||"{}");
    return Array.isArray(payload.readings)?payload:null;
  }catch(error){
    return null;
  }
}

function todayIsoDateForZone(timeZone){
  const now=new Date();
  try{
    const parts=Object.fromEntries(
      new Intl.DateTimeFormat("en-US",{
        timeZone,
        year:"numeric",
        month:"2-digit",
        day:"2-digit"
      }).formatToParts(now).map((part)=>[part.type,part.value])
    );
    if(parts.year&&parts.month&&parts.day)return `${parts.year}-${parts.month}-${parts.day}`;
  }catch(error){}

  const month=String(now.getMonth()+1).padStart(2,"0");
  const day=String(now.getDate()).padStart(2,"0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function selectHomeCurrentReadings(readings,today,publishCutoffDate){
  const published=(Array.isArray(readings)?readings:[])
    .filter((reading)=>reading?.classDate&&(!publishCutoffDate||reading.classDate<=publishCutoffDate));
  const byDateThenSequence=(a,b)=>String(a.classDate).localeCompare(String(b.classDate))||(Number(a.sequence)||0)-(Number(b.sequence)||0);
  const upcoming=published
    .filter((reading)=>reading.classDate>=today)
    .sort(byDateThenSequence);
  return upcoming.filter((reading)=>reading.classDate===upcoming[0].classDate);
}

function homeReadingState(reading,currentSlugs){
  if(!reading||reading.baseState==="locked")return"locked";
  return currentSlugs.includes(reading.slug)?"current":"ready";
}

function syncHomeCardState(card,state){
  const link=card.querySelector(".card-link.rcard");
  const status=card.querySelector(".rcard-status");
  const eyebrow=card.querySelector(".rcard-mobile-eyebrow");
  let mobileState=card.querySelector(".rcard-mobile-state");
  const stateLabel=state==="current"?"다음 읽기":state==="ready"?"공개됨":"잠금";
  card.dataset.cardState=state;
  if(link){
    link.classList.toggle("is-current",state==="current");
    link.classList.toggle("is-locked",state==="locked");
  }
  if(status){
    status.classList.remove("ready","current","locked");
    status.classList.add(state);
    status.textContent=stateLabel;
  }
  if(state==="ready"){
    mobileState?.remove();
  }else if(eyebrow){
    if(!mobileState){
      mobileState=document.createElement("span");
      eyebrow.appendChild(mobileState);
    }
    mobileState.className=`rcard-mobile-state ${state}`;
    mobileState.textContent=stateLabel;
  }
}

function syncHomeRailState(item,state,isScheduleCurrent=false){
  item.classList.toggle("is-current",Boolean(isScheduleCurrent));
  item.classList.toggle("is-done",state==="ready");
  const reading=item.querySelector(".rail-reading");
  if(reading){
    reading.classList.remove("ready","current","locked");
    reading.classList.add(state);
    if(isScheduleCurrent)reading.setAttribute("aria-current","date");
    else reading.removeAttribute("aria-current");
  }
}

function initHomeCurrentReading(){
  const payload=parseHomeReadingData();
  if(!payload)return;
  const today=todayIsoDateForZone(payload.dateTimeZone||"Asia/Seoul");
  const currentReadings=selectHomeCurrentReadings(payload.readings,today,String(payload.publishCutoffDate||"").trim());
  const currentSlugs=currentReadings.map((reading)=>reading.slug);
  document.querySelectorAll("[data-reading-card]").forEach((card)=>{
    const reading=payload.readings.find((item)=>item.slug===card.dataset.readingSlug);
    syncHomeCardState(card,homeReadingState(reading,currentSlugs));
  });

  document.querySelectorAll("[data-home-rail-item]").forEach((item)=>{
    const reading=payload.readings.find((entry)=>entry.slug===item.dataset.readingSlug);
    syncHomeRailState(item,homeReadingState(reading,currentSlugs),currentSlugs.includes(reading?.slug));
  });

  const railMeta=document.querySelector(".home-dashboard .rail-toggle-meta");
  const current=currentReadings[0];
  if(railMeta)railMeta.textContent=current?`${current.displayDateLabel||current.classDate} · 읽기 ${currentReadings.length}편`:`총 ${payload.readings.length}개`;
}

function initGatedLinks(){
  document.querySelectorAll("[data-gated-link]").forEach((element)=>{
    element.addEventListener("click",(event)=>{
      event.preventDefault();
      showGateToast(element.dataset.gatedMessage||"준비중입니다.");
    });
  });
}

function initHomeFilters(){
  const controls=document.querySelector("[data-home-controls]");
  if(!controls)return;
  const input=controls.querySelector("[data-reading-search]");
  const typeSelect=controls.querySelector("[data-reading-type]");
  const tagSelect=controls.querySelector("[data-reading-tag]");
  const chips=Array.from(controls.querySelectorAll("[data-filter-chip]"));
  const grid=document.querySelector("[data-reading-grid]");
  const cards=Array.from(document.querySelectorAll("[data-reading-card]"));
  const empty=document.querySelector("[data-empty-state]");
  const resultCount=document.querySelector("[data-filter-result-count]");

  const activeChipValue=()=>{
    const chip=chips.find((item)=>item.classList.contains("is-active"));
    return (chip?.dataset.filterValue||"").trim().toLowerCase();
  };

  const apply=()=>{
    const query=(input?.value||"").trim().toLowerCase();
    const type=(typeSelect?.value||activeChipValue()||"").trim().toLowerCase();
    const tag=(tagSelect?.value||"").trim().toLowerCase();
    const visible=cards.filter((card)=>{
      const search=(card.dataset.search||"").toLowerCase();
      const cardType=(card.dataset.type||"").toLowerCase();
      const filterGroup=(card.dataset.filterGroup||"").toLowerCase();
      const tags=(card.dataset.tags||"").toLowerCase().split("||").filter(Boolean);
      const typeMatch=typeSelect
        ? (!type||cardType===type)
        : (!type||filterGroup===type);
      return (!query||search.includes(query))&&typeMatch&&(!tag||tags.includes(tag));
    });

    cards.forEach((card)=>{card.hidden=!visible.includes(card);});
    visible.forEach((card)=>grid?.appendChild(card));
    if(empty)empty.hidden=visible.length!==0;
    if(resultCount)resultCount.textContent=`${visible.length}개 / 전체 ${cards.length}개`;
  };

  [input,typeSelect,tagSelect].forEach((element)=>element&&element.addEventListener("input",apply));
  [typeSelect,tagSelect].forEach((element)=>element&&element.addEventListener("change",apply));
  chips.forEach((chip)=>{
    chip.addEventListener("click",()=>{
      chips.forEach((item)=>{
        item.classList.toggle("is-active",item===chip);
        item.setAttribute("aria-pressed",String(item===chip));
      });
      apply();
    });
  });
  chips.forEach((chip)=>chip.setAttribute("aria-pressed",String(chip.classList.contains("is-active"))));
  apply();
}

function initHomeRail(){
  const rail=document.querySelector(".home-dashboard .rail");
  if(!rail)return;
  const media=window.matchMedia("(max-width: 1080px)");
  const syncRail=(state)=>{
    if(state.matches){
      rail.removeAttribute("open");
      return;
    }
    rail.setAttribute("open","");
  };
  syncRail(media);
  if(typeof media.addEventListener==="function"){
    media.addEventListener("change",syncRail);
  }else if(typeof media.addListener==="function"){
    media.addListener(syncRail);
  }
}

function initTabMenus(){
  const menus=Array.from(document.querySelectorAll("[data-tab-more]"));
  if(!menus.length)return;

  const closeMenu=(menu)=>{
    if(menu?.open)menu.open=false;
  };

  const closeAll=(except=null)=>{
    menus.forEach((menu)=>{
      if(menu!==except)closeMenu(menu);
    });
  };

  menus.forEach((menu)=>{
    const links=Array.from(menu.querySelectorAll("[data-tab-more-link]"));
    menu.addEventListener("toggle",()=>{
      if(menu.open)closeAll(menu);
    });
    links.forEach((link)=>{
      link.addEventListener("click",()=>{
        closeMenu(menu);
      });
    });
  });

  document.querySelectorAll("[data-tab-link]").forEach((link)=>{
    link.addEventListener("click",()=>{
      closeAll();
    });
  });

  document.addEventListener("click",(event)=>{
    menus.forEach((menu)=>{
      if(menu.open&&!menu.contains(event.target))closeMenu(menu);
    });
  });

  document.addEventListener("keydown",(event)=>{
    if(event.key!=="Escape")return;
    closeAll();
  });
}

function escapeUiText(value){
  return String(value??"").replace(/[&<>"']/g,(character)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character]));
}

function isReaderHeading(heading){
  return Boolean(heading)&&heading.dataset?.readerToc!=="false";
}

function initTranslationSentenceReveals(){
  const buttons=Array.from(document.querySelectorAll("[data-source-sentence]"));
  if(!buttons.length)return;
  let activeButton=null;

  const close=(button=activeButton)=>{
    if(!button)return;
    const pair=button.closest("[data-sentence-pair]");
    const popover=pair?.querySelector("[data-source-popover]");
    button.setAttribute("aria-expanded","false");
    pair?.classList.remove("is-source-open");
    if(popover)popover.hidden=true;
    if(activeButton===button)activeButton=null;
  };

  const open=(button)=>{
    if(activeButton&&activeButton!==button)close(activeButton);
    const pair=button.closest("[data-sentence-pair]");
    const popover=pair?.querySelector("[data-source-popover]");
    if(!pair||!popover)return;
    activeButton=button;
    button.setAttribute("aria-expanded","true");
    pair.classList.add("is-source-open");
    popover.hidden=false;
  };

  buttons.forEach((button)=>{
    button.addEventListener("click",()=>{
      if(activeButton===button)close(button);
      else open(button);
    });
  });

  document.addEventListener("keydown",(event)=>{
    if(event.key!=="Escape"||!activeButton)return;
    const button=activeButton;
    const returnFocus=button.closest("[data-sentence-pair]")?.contains(document.activeElement);
    close(button);
    if(returnFocus){
      event.preventDefault();
      button.focus();
    }
  });
  document.addEventListener("click",(event)=>{
    if(activeButton&&!event.target.closest("[data-sentence-pair]"))close(activeButton);
  });
}

function initMobileTabs(){
  const media=window.matchMedia("(max-width: 560px)");
  const rows=Array.from(document.querySelectorAll("[data-mobile-tab-row]"));
  const centerActiveTabs=()=>{
    if(!media.matches)return;
    rows.forEach((row)=>{
      const active=row.querySelector('[aria-current="page"]');
      if(!active)return;
      window.requestAnimationFrame(()=>{
        const left=active.offsetLeft-(row.clientWidth-active.offsetWidth)/2;
        row.scrollTo({left:Math.max(0,left),behavior:"auto"});
      });
    });
  };
  centerActiveTabs();
  if(typeof media.addEventListener==="function")media.addEventListener("change",centerActiveTabs);
  else if(typeof media.addListener==="function")media.addListener(centerActiveTabs);
}

function normalizeQuizAnswer(value){
  return String(value??"")
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .trim()
    .replace(/\s+/g," ")
    .replace(/[.!?。！？]+$/g,"")
    .trim();
}

function quizAnswerKey(value){
  const normalized=normalizeQuizAnswer(value).replace(/\u2212/g,"-");
  // A space between two digits separates numbers; never turn “7 5” into “75”.
  const compact=normalized.replace(/(\d)\s+(?=\d)/g,"$1| ").replace(/\s+/g,"");
  const numeric=compact.match(/^([+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+))(%|percent|percentage|years?|yrs?|yr|년|months?|mos?|개월|weeks?|주|days?|일|milliseconds?|msec|ms|밀리초|seconds?|secs?|sec|s|초|명|people|persons?)?$/);
  if(!numeric)return compact;
  const unit=numeric[2]||"";
  const units={percent:"%",percentage:"%",year:"year",years:"year",yr:"year",yrs:"year","년":"year",month:"month",months:"month",mo:"month",mos:"month","개월":"month",week:"week",weeks:"week","주":"week",day:"day",days:"day","일":"day",millisecond:"ms",milliseconds:"ms",msec:"ms",ms:"ms","밀리초":"ms",second:"s",seconds:"s",sec:"s",secs:"s",s:"s","초":"s",people:"person",person:"person",persons:"person","명":"person"};
  // Canonicalize decimals as strings so distinct high-precision values never round together.
  const token=numeric[1].replace(/,/g,"");
  const unsigned=token.replace(/^[+-]/,"");
  const [whole="",fraction=""]=unsigned.split(".");
  const integer=whole.replace(/^0+/,"")||"0";
  const decimals=fraction.replace(/0+$/,"");
  const negative=token.startsWith("-")&&(integer!=="0"||decimals);
  return `number:${negative?"-":""}${integer}${decimals?`.${decimals}`:""}:${units[unit]||unit}`;
}

function quizAnswersMatch(actual,accepted){
  return quizAnswerKey(actual)===quizAnswerKey(accepted);
}

function quizLanguage(item){
  return item?.dataset?.quizLanguage||item?.closest?.("[data-quiz-language]")?.dataset.quizLanguage||"ko";
}

function containsKorean(value){
  return /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/.test(String(value||""));
}

function quizInputMessage(item,message){
  let note=item.querySelector("[data-quiz-input-message]");
  if(!note&&message){
    note=document.createElement("p");
    note.className="player-note";
    note.setAttribute("data-quiz-input-message","");
    note.setAttribute("role","status");
    item.appendChild(note);
  }
  if(note)note.textContent=message;
}

function quizItemValue(item){
  if(item.dataset.quizKind==="short")return item.querySelector("[data-quiz-input]")?.value||"";
  return item.querySelector("[data-quiz-input]:checked")?.value||"";
}

function gradeQuizItem(item){
  const value=quizItemValue(item);
  const english=quizLanguage(item)==="en";
  if(english&&item.dataset.quizKind==="short"&&containsKorean(value)){
    delete item.dataset.quizGraded;
    item.classList.remove("is-correct","is-incorrect","is-unanswered");
    const previousFeedback=item.querySelector("[data-quiz-feedback]");
    if(previousFeedback)previousFeedback.hidden=true;
    quizInputMessage(item,"Please answer in English. Your answer has not been graded.");
    return{answered:false,correct:false,blocked:true};
  }
  quizInputMessage(item,"");
  const normalizedValue=normalizeQuizAnswer(value);
  const answered=Boolean(normalizedValue);
  let acceptedAnswers=[];
  if(item.dataset.quizKind==="short"){
    try{acceptedAnswers=JSON.parse(item.dataset.acceptedAnswers||"[]");}catch(error){acceptedAnswers=[];}
  }else{
    acceptedAnswers=[item.dataset.correctAnswer||""];
  }
  const correct=answered&&acceptedAnswers.some((answer)=>quizAnswersMatch(answer,value));
  item.dataset.quizGraded="true";
  item.classList.toggle("is-correct",correct);
  item.classList.toggle("is-incorrect",answered&&!correct);
  item.classList.toggle("is-unanswered",!answered);
  item.querySelectorAll(".quiz-choice").forEach((choice)=>{
    const input=choice.querySelector("[data-quiz-input]");
    const isAnswer=acceptedAnswers.some((answer)=>quizAnswersMatch(answer,input?.value));
    choice.classList.toggle("is-answer",isAnswer);
    choice.classList.toggle("is-selected",Boolean(input?.checked));
  });
  const feedback=item.querySelector("[data-quiz-feedback]");
  const result=item.querySelector("[data-quiz-result]");
  if(feedback)feedback.hidden=false;
  if(result){
    result.textContent=english
      ?(!answered?"Unanswered. Review the answer and explanation.":correct?"Correct.":"Incorrect. Review the answer and explanation.")
      :(!answered?"미응답입니다. 정답과 해설을 확인하세요.":correct?"정답입니다.":"오답입니다. 정답과 해설을 확인하세요.");
  }
  return{answered,correct};
}

function initInteractiveQuizzes(){
  document.querySelectorAll("[data-quiz-root]").forEach((root)=>{
    const english=quizLanguage(root)==="en";
    const items=Array.from(root.querySelectorAll("[data-quiz-item]"));
    const score=root.querySelector("[data-quiz-score]");
    const updateScore=()=>{
      const graded=items.filter((item)=>item.dataset.quizGraded==="true");
      const correct=graded.filter((item)=>item.classList.contains("is-correct")).length;
      const answered=graded.filter((item)=>!item.classList.contains("is-unanswered")).length;
      if(score)score.textContent=english
        ?(graded.length?`${correct} / ${items.length} correct · ${answered} answered · ${graded.length} graded`:"No answers graded yet.")
        :(graded.length?`정답 ${correct} / ${items.length} · 응답 ${answered}문제 · 채점 ${graded.length}문제`:"아직 채점하지 않았습니다.");
    };

    items.forEach((item)=>{
      item.querySelector("[data-quiz-check]")?.addEventListener("click",()=>{
        gradeQuizItem(item);
        updateScore();
      });
      const shortInput=item.dataset.quizKind==="short"?item.querySelector("[data-quiz-input]"):null;
      shortInput?.addEventListener("keydown",(event)=>{
        if(event.key!=="Enter"||event.isComposing)return;
        event.preventDefault();
        gradeQuizItem(item);
        updateScore();
      });
    });

    root.addEventListener("submit",(event)=>{
      event.preventDefault();
      items.forEach(gradeQuizItem);
      updateScore();
      score?.focus?.();
    });
    root.addEventListener("reset",()=>{
      window.setTimeout(()=>{
        items.forEach((item)=>{
          delete item.dataset.quizGraded;
          item.classList.remove("is-correct","is-incorrect","is-unanswered");
          item.querySelectorAll(".quiz-choice").forEach((choice)=>choice.classList.remove("is-answer","is-selected"));
          const feedback=item.querySelector("[data-quiz-feedback]");
          if(feedback)feedback.hidden=true;
          const result=item.querySelector("[data-quiz-result]");
          if(result)result.textContent="";
          quizInputMessage(item,"");
        });
        updateScore();
      },0);
    });
  });
}

function selectQuizQuestions(questions,kind,count,random=Math.random){
  const pool=questions.filter((question)=>kind==="all"||question.kind===kind);
  for(let index=pool.length-1;index>0;index--){
    const other=Math.floor(random()*(index+1));
    [pool[index],pool[other]]=[pool[other],pool[index]];
  }
  const limit=count==="all"?pool.length:Math.max(0,Math.min(pool.length,Number(count)||0));
  return pool.slice(0,limit);
}

function quizBankFingerprint(bank){
  let hash=2166136261;
  const value=bank.map((question)=>`${question.id}:${question.template.innerHTML}`).join("\n");
  for(let index=0;index<value.length;index++)hash=Math.imul(hash^value.charCodeAt(index),16777619);
  return (hash>>>0).toString(16);
}

function validQuizSession(saved,bank,version){
  if(!saved||saved.schema!==1||saved.bankVersion!==version||!Array.isArray(saved.questionIds)||!saved.questionIds.length)return false;
  const known=new Set(bank.map((question)=>question.id));
  if(new Set(saved.questionIds).size!==saved.questionIds.length||saved.questionIds.some((id)=>!known.has(id)))return false;
  if(!Number.isInteger(saved.index)||saved.index<0||saved.index>=saved.questionIds.length)return false;
  if(!["round","results"].includes(saved.screen)||!Array.isArray(saved.results)||saved.results.length>saved.questionIds.length)return false;
  if(saved.results.some((result,index)=>!result||result.id!==saved.questionIds[index]||typeof result.answer!=="string"||typeof result.correct!=="boolean"||typeof result.skipped!=="boolean"))return false;
  if(saved.screen==="round"&&![saved.index,saved.index+1].includes(saved.results.length))return false;
  return typeof saved.draft==="string";
}

function initQuizPlayers(){
  document.querySelectorAll("[data-quiz-player]").forEach((root)=>{
    const get=(name)=>root.querySelector(`[data-player-${name}]`);
    const english=quizLanguage(root)==="en";
    const say=(en,ko)=>english?en:ko;
    const bank=Array.from(root.querySelectorAll("template[data-player-question]"),
      (template)=>({id:template.dataset.playerQuestion,kind:template.dataset.kind,template}));
    const bankById=new Map(bank.map((question)=>[question.id,question]));
    const version=root.dataset.questionBankVersion||quizBankFingerprint(bank);
    const stateKey=`${STORAGE_PREFIX}-quiz:${root.dataset.pagePath||window.location.pathname}`;
    const kindLabels=english?{ox:"True / False",short:"Short answer",mcq:"Multiple choice"}:{ox:"OX",short:"단답형",mcq:"객관식"};
    const settings=get("settings");
    if(!settings||!bank.length)return;
    const kindSelect=settings.elements.kind;
    const countSelect=settings.elements.count;
    const answerForm=get("answer");
    let questions=[];
    let results=[];
    let index=0;
    let graded=false;
    let missed=[];
    let card=null;
    let screen="setup";
    let saved=storage.get(stateKey,null);
    const invalidated=Boolean(saved&&!validQuizSession(saved,bank,version));
    if(invalidated){saved=null;storage.remove(stateKey);}
    const missedIds=new Set(Array.isArray(saved?.missedQuestionIds)?saved.missedQuestionIds.filter((id)=>bankById.has(id)):[]);
    const ensureSetupControl=(name,tag="button")=>{
      let element=get(name);
      if(!element){
        element=document.createElement(tag);
        element.setAttribute(`data-player-${name}`,"");
        element.className=tag==="button"?"btn-ghost player-saved-action":"player-note";
        if(tag==="button")element.type="button";
        else element.setAttribute("role","status");
        get("setup").appendChild(element);
      }
      return element;
    };
    const resumeButton=ensureSetupControl("resume");
    const resetSavedButton=ensureSetupControl("reset-saved");
    const practiceMissedButton=ensureSetupControl("review-missed");
    const savedNote=ensureSetupControl("saved-note","p");
    if(invalidated)savedNote.textContent=say("Saved progress was reset because the question bank changed.","문항이 바뀌어 이전 퀴즈 기록을 초기화했습니다.");
    const updateSavedControls=()=>{
      resumeButton.hidden=!saved;
      resetSavedButton.hidden=!saved;
      resumeButton.textContent=saved?.screen==="results"
        ?say("View saved results","저장된 결과 보기")
        :say(`Resume saved quiz (${saved?.results.length||0} / ${saved?.questionIds.length||0})`,`이어서 풀기 (${saved?.results.length||0} / ${saved?.questionIds.length||0})`);
      resetSavedButton.textContent=say("Clear saved quiz","저장된 퀴즈 지우기");
      practiceMissedButton.hidden=!missedIds.size;
      practiceMissedButton.textContent=say(`Practice saved mistakes (${missedIds.size})`,`저장된 오답 ${missedIds.size}문제 풀기`);
    };
    const persist=()=>{
      if(!questions.length||screen==="setup")return;
      const next={schema:1,bankVersion:version,kind:kindSelect.value,count:countSelect.value,screen,index,
        questionIds:questions.map((question)=>question.id),results:results.map((result)=>({id:result.question.id,answer:result.answer,correct:result.correct,skipped:result.skipped})),
        draft:card?quizItemValue(card):"",missedQuestionIds:Array.from(missedIds),updatedAt:Date.now()};
      if(storage.set(stateKey,next)){
        saved=next;
        savedNote.textContent=say("Progress and mistakes are saved in this browser.","풀이 진행과 오답을 이 브라우저에 저장했습니다.");
      }else savedNote.textContent=say("This browser could not save your progress.","이 브라우저에서 퀴즈 기록을 저장할 수 없습니다.");
      updateSavedControls();
    };
    const show=(nextScreen)=>{
      screen=nextScreen;
      ["setup","round","results"].forEach((name)=>{get(name).hidden=name!==screen;});
    };
    const refreshSelection=()=>{
      const available=bank.filter((question)=>kindSelect.value==="all"||question.kind===kindSelect.value).length;
      const count=countSelect.value==="all"?available:Math.min(available,Number(countSelect.value));
      get("selection").textContent=say(`${count} of ${available} questions, in random order.`,`${available}문제 중 ${count}문제를 무작위 순서로 풉니다.`);
      get("start").textContent=count?say(`Start ${count} question${count===1?"":"s"}`,`${count}문제 시작하기`):say("No questions available","준비된 문제가 없습니다");
      get("start").disabled=!count;
    };
    const showGradedCard=(result)=>{
      graded=true;
      const inputs=card.querySelectorAll("[data-quiz-input]");
      inputs.forEach((input)=>{
        if(input.type==="radio")input.checked=!result.skipped&&input.value===result.answer;
        else input.value=result.skipped?"":result.answer;
      });
      gradeQuizItem(card);
      inputs.forEach((input)=>{input.disabled=true;});
      if(result.skipped)card.querySelector("[data-quiz-result]").textContent=say("That's okay. Review the answer and try again.","괜찮아요. 정답과 해설을 확인하고 다시 풀어 보세요.");
      get("check").hidden=true;
      get("skip").hidden=true;
      get("next").hidden=false;
      get("progress").value=results.length;
    };
    const renderQuestion=(draft="")=>{
      graded=false;
      get("card").replaceChildren(questions[index].template.content.cloneNode(true));
      card=get("card").querySelector("[data-quiz-item]");
      card.querySelector(".quiz-item-actions")?.remove();
      card.querySelector(".quiz-number").textContent=String(index+1).padStart(2,"0");
      const heading=card.querySelector("h3");
      heading.tabIndex=-1;
      get("kind").textContent=kindLabels[questions[index].kind];
      get("counter").textContent=`${index+1} / ${questions.length}`;
      get("progress").max=questions.length;
      get("progress").value=index;
      get("message").textContent="";
      get("check").hidden=false;
      get("skip").hidden=false;
      get("next").hidden=true;
      get("next").textContent=index===questions.length-1?say("View results","결과 보기"):say("Next question","다음 문제");
      card.querySelectorAll("[data-quiz-input]").forEach((input)=>{
        if(input.type==="radio")input.checked=input.value===draft;
        else input.value=draft;
      });
      if(results[index])showGradedCard(results[index]);
      heading.focus();
    };
    const start=(selection)=>{
      if(!selection.length)return;
      questions=selection;
      results=[];
      index=0;
      missed=[];
      get("review").replaceChildren();
      show("round");
      renderQuestion();
      persist();
    };
    const finish=()=>{
      show("results");
      missed=results.filter((result)=>!result.correct);
      const correct=results.length-missed.length;
      const remaining=questions.length-results.length;
      const skipped=results.filter((result)=>result.skipped).length;
      get("result-title").textContent=results.length
        ?say(`${results.length} question${results.length===1?"":"s"} ${remaining?"reviewed":"completed"}`,`${results.length}문제 풀이 ${remaining?"종료":"완료"}`)
        :say("Quiz ended","풀이를 종료했어요");
      get("result-score").textContent=results.length
        ?say(`${Math.round(correct/results.length*100)}% · ${correct} / ${results.length} correct`,`${Math.round(correct/results.length*100)}점 · ${correct} / ${results.length} 정답`)
        :say("No questions answered yet.","아직 푼 문제가 없습니다.");
      get("result-note").textContent=results.length
        ?say(`${missed.length} incorrect${skipped?` (including ${skipped} skipped)`:""}${remaining?` · ${remaining} remaining question${remaining===1?" was":"s were"} not graded.`:missed.length?" · Review the explanations and try again.":" · All correct!"}`,
          `오답 ${missed.length}문제${skipped?` (모르겠어요 ${skipped}문제 포함)`:""}${remaining?` · 남은 ${remaining}문제는 채점하지 않았습니다.`:missed.length?" · 해설을 확인하고 다시 도전해 보세요.":" · 모두 맞혔어요!"}`)
        :say("Start a new quiz or change the settings.","새 문제로 다시 시작하거나 설정을 바꿔 보세요.");
      get("retry").hidden=!missed.length;
      get("retry").textContent=say(`Retry missed questions (${missed.length})`,`틀린 ${missed.length}문제 다시 풀기`);
      get("review").replaceChildren();
      if(missed.length){
        const title=document.createElement("h3");
        title.textContent=say("Review missed questions","틀린 문제 돌아보기");
        get("review").append(title);
      }
      missed.forEach((result)=>{
        const original=result.question.template.content;
        const details=document.createElement("details");
        const summary=document.createElement("summary");
        summary.textContent=original.querySelector("h3").textContent;
        const ownAnswer=document.createElement("p");
        ownAnswer.className="player-own-answer";
        ownAnswer.textContent=say(`Your answer: ${result.skipped?"Skipped":result.answer}`,`내 답: ${result.skipped?"모르겠어요":result.answer}`);
        const feedback=original.querySelector("[data-quiz-feedback]").cloneNode(true);
        feedback.hidden=false;
        feedback.querySelector("[data-quiz-result]")?.remove();
        details.append(summary,ownAnswer,feedback);
        get("review").append(details);
      });
      persist();
      get("result-title").focus();
    };
    const submit=(skip=false)=>{
      if(graded||screen!=="round")return;
      const answer=quizItemValue(card);
      if(!skip&&!normalizeQuizAnswer(answer)){
        get("message").textContent=questions[index].kind==="short"
          ?say("Enter an answer, or choose 'I don't know'.","답을 입력해 주세요. 모르면 ‘모르겠어요’를 눌러 주세요.")
          :say("Select an answer, or choose 'I don't know'.","답을 선택해 주세요. 모르면 ‘모르겠어요’를 눌러 주세요.");
        card.querySelector("[data-quiz-input]")?.focus();
        return;
      }
      if(skip)card.querySelectorAll("[data-quiz-input]").forEach((input)=>{if(input.type==="radio")input.checked=false;else input.value="";});
      const outcome=gradeQuizItem(card);
      if(outcome.blocked){persist();card.querySelector("[data-quiz-input]")?.focus();return;}
      const result={question:questions[index],answer:skip?"":answer,correct:outcome.correct,skipped:skip};
      results.push(result);
      if(result.correct)missedIds.delete(result.question.id);
      else missedIds.add(result.question.id);
      showGradedCard(result);
      get("message").textContent="";
      persist();
      const feedback=card.querySelector("[data-quiz-feedback]");
      feedback.tabIndex=-1;
      feedback.focus();
    };
    settings.addEventListener("change",refreshSelection);
    settings.addEventListener("submit",(event)=>{event.preventDefault();start(selectQuizQuestions(bank,kindSelect.value,countSelect.value));});
    answerForm.addEventListener("submit",(event)=>{event.preventDefault();submit();});
    answerForm.addEventListener("keydown",(event)=>{if(event.isComposing&&event.key==="Enter")event.preventDefault();});
    answerForm.addEventListener("input",persist);
    answerForm.addEventListener("change",persist);
    get("skip").addEventListener("click",()=>submit(true));
    get("next").addEventListener("click",()=>{
      if(!graded)return;
      if(index===questions.length-1){finish();return;}
      index++;
      renderQuestion();
      persist();
    });
    get("exit").addEventListener("click",finish);
    get("retry").addEventListener("click",()=>start(missed.map((result)=>result.question)));
    get("again").addEventListener("click",()=>start(selectQuizQuestions(bank,kindSelect.value,countSelect.value)));
    get("configure").addEventListener("click",()=>{show("setup");updateSavedControls();get("setup-title").focus();});
    resumeButton.addEventListener("click",()=>{
      if(!validQuizSession(saved,bank,version))return;
      questions=saved.questionIds.map((id)=>bankById.get(id));
      results=saved.results.map((result)=>({...result,question:bankById.get(result.id)}));
      index=saved.index;
      const draft=saved.draft;
      const resumeResults=saved.screen==="results";
      show("round");
      renderQuestion(draft);
      if(resumeResults)finish();
    });
    resetSavedButton.addEventListener("click",()=>{
      storage.remove(stateKey);
      saved=null;
      missedIds.clear();
      savedNote.textContent=say("Saved quiz cleared.","저장된 퀴즈 기록을 지웠습니다.");
      updateSavedControls();
      get("setup-title").focus();
    });
    practiceMissedButton.addEventListener("click",()=>start(Array.from(missedIds,(id)=>bankById.get(id)).filter(Boolean)));
    if(saved){
      if(Array.from(kindSelect.options).some((option)=>option.value===saved.kind))kindSelect.value=saved.kind;
      if(Array.from(countSelect.options).some((option)=>option.value===saved.count))countSelect.value=saved.count;
      savedNote.textContent=say("Saved progress is available in this browser.","이 브라우저에 저장된 퀴즈 기록이 있습니다.");
    }
    updateSavedControls();
    refreshSelection();
  });
}

function initProfessorPrep(){
  const root=document.querySelector("[data-prep-root]");
  if(!root)return;
  const pagePath=window.location.pathname;
  const stateKey=`${STORAGE_PREFIX}-prep:${pagePath}`;
  const stored=storage.get(stateKey,{});
  const saved=stored&&typeof stored==="object"?stored:{};
  const english=root.dataset.prepLanguage==="en";
  const format=root.dataset.prepFormat||"";
  const tabs=Array.from(root.querySelectorAll("[data-prep-tab]"));
  const panels=Array.from(root.querySelectorAll("[data-prep-panel]"));
  const availableTabKeys=tabs.map((tab)=>tab.dataset.prepTab).filter(Boolean);
  const defaultTab=availableTabKeys.includes(root.dataset.prepDefaultTab)?root.dataset.prepDefaultTab:(availableTabKeys[0]||"");
  const initialTab=(!format||saved.format===format)&&availableTabKeys.includes(saved.activeTab)?saved.activeTab:defaultTab;
  const state={
    activeTab:initialTab,
    difficultIds:new Set(Array.isArray(saved.difficultIds)?saved.difficultIds:[])
  };
  const difficultList=document.querySelector("[data-prep-difficult-list]");
  const questionSelect=root.querySelector("[data-prep-question-select]");
  const answerSelect=root.querySelector("[data-prep-answer-select]");
  // Version the shared preference so the new Korean default also reaches returning readers.
  const languageKey=`${STORAGE_PREFIX}-practice-languages-v2`;
  const storedLanguages=questionSelect||answerSelect?storage.get(languageKey,{}):{};
  const savedLanguages=storedLanguages&&typeof storedLanguages==="object"?storedLanguages:{};
  const validLanguage=(value)=>value==="ko"||value==="en"?value:"ko";
  const languages={
    questionLanguage:validLanguage(savedLanguages.questionLanguage),
    answerLanguage:validLanguage(savedLanguages.answerLanguage)
  };

  const cards=Array.from(root.querySelectorAll("[data-prep-card]")).map((card)=>{
    const id=card.dataset.cardId||card.id;
    const titleElement=card.querySelector("[data-prep-title]")||card.querySelector("h3, h2");
    const visibleTitle=titleElement?.querySelector("[data-prep-question-language]:not([hidden])");
    const title=(visibleTitle?.textContent||titleElement?.textContent||id).trim();
    let experienceExamples=[];
    try{
      const data=JSON.parse(card.querySelector("[data-prep-experience-data]")?.textContent||"[]");
      if(Array.isArray(data))experienceExamples=data.filter((example)=>example&&typeof example.id==="string"&&example.values);
    }catch(error){}
    const savedExperienceId=saved.experienceIds?.[id];
    return{
      id,
      card,
      titleElement,
      title,
      experienceExamples,
      experienceIndex:Math.max(0,experienceExamples.findIndex((example)=>example.id===savedExperienceId)),
      experienceButton:card.querySelector("[data-prep-experience-next]"),
      difficultButton:card.querySelector("[data-prep-difficult]")
    };
  });

  const persist=()=>{
    const experienceIds=Object.fromEntries(cards.filter((card)=>card.experienceExamples.length).map((card)=>[card.id,card.experienceExamples[card.experienceIndex].id]));
    return storage.set(stateKey,{activeTab:state.activeTab,difficultIds:Array.from(state.difficultIds),...(format?{format}:{}),...(Object.keys(experienceIds).length?{experienceIds}:{})});
  };

  const renderExperience=(card)=>{
    const example=card.experienceExamples[card.experienceIndex];
    if(!example)return;
    card.card.querySelectorAll("[data-prep-experience-slot]").forEach((slot)=>{
      const value=example.values[slot.dataset.prepExperienceSlot]?.[slot.dataset.prepExperienceLanguage];
      if(typeof value==="string")slot.textContent=value;
    });
    const counter=card.card.querySelector("[data-prep-experience-counter]");
    if(counter)counter.textContent=`${card.experienceIndex+1} / ${card.experienceExamples.length}`;
    const label=card.card.querySelector("[data-prep-experience-label]");
    if(label){label.textContent=languages.answerLanguage==="en"?example.label:example.label_ko;label.lang=languages.answerLanguage;}
  };

  const activateTab=(key,options={})=>{
    if(!availableTabKeys.includes(key))return;
    state.activeTab=key;
    tabs.forEach((tab)=>{
      const active=tab.dataset.prepTab===key;
      tab.classList.toggle("is-active",active);
      tab.setAttribute("aria-selected",String(active));
      tab.tabIndex=active?0:-1;
      if(active&&options.focus)tab.focus();
    });
    panels.forEach((panel)=>{
      panel.hidden=panel.dataset.prepPanel!==key;
    });
    if(options.persist!==false)persist();
  };

  tabs.forEach((tab,index)=>{
    tab.addEventListener("click",()=>activateTab(tab.dataset.prepTab));
    tab.addEventListener("keydown",(event)=>{
      const keys=["ArrowLeft","ArrowRight","Home","End"];
      if(!keys.includes(event.key))return;
      event.preventDefault();
      let nextIndex=index;
      if(event.key==="ArrowLeft")nextIndex=(index-1+tabs.length)%tabs.length;
      if(event.key==="ArrowRight")nextIndex=(index+1)%tabs.length;
      if(event.key==="Home")nextIndex=0;
      if(event.key==="End")nextIndex=tabs.length-1;
      activateTab(tabs[nextIndex].dataset.prepTab,{focus:true});
    });
  });

  const revealHashedCard=()=>{
    const rawId=window.location.hash.slice(1);
    if(!rawId)return false;
    let id=rawId;
    try{id=decodeURIComponent(rawId);}catch(error){}
    const target=document.getElementById(id);
    const panel=target?.closest("[data-prep-panel]");
    if(!panel)return false;
    activateTab(panel.dataset.prepPanel,{persist:false});
    let detail=target.closest("details");
    while(detail){detail.open=true;detail=detail.parentElement?.closest("details");}
    return true;
  };

  const renderDifficult=()=>{
    cards.forEach((card)=>{
      const active=state.difficultIds.has(card.id);
      card.card.classList.toggle("is-difficult",active);
      if(card.difficultButton){
        card.difficultButton.textContent=format?(active?"표시됨":"연습 표시"):english?(active?"Marked":"Mark for review"):(active?UI_TEXT.prepDifficultActive:UI_TEXT.prepDifficult);
        card.difficultButton.classList.toggle("is-active",active);
        card.difficultButton.setAttribute("aria-pressed",String(active));
      }
    });

    if(difficultList){
      const activeCards=cards.filter((card)=>state.difficultIds.has(card.id));
      difficultList.innerHTML=activeCards.length
        ? activeCards.map((card)=>`<a class="important-link" href="#${escapeUiText(card.id)}">${escapeUiText(card.title)}</a>`).join("")
        : `<p class="meta">${english?"Marked answers appear here.":UI_TEXT.prepNoDifficult}</p>`;
    }
  };

  const applyLanguages=()=>{
    if(questionSelect){
      questionSelect.value=languages.questionLanguage;
      root.dataset.prepQuestionLanguage=languages.questionLanguage;
      root.querySelectorAll("[data-prep-question-language]").forEach((variant)=>{
        variant.hidden=variant.dataset.prepQuestionLanguage!==languages.questionLanguage;
        variant.lang=variant.dataset.prepQuestionLanguage;
        variant.parentElement.lang=languages.questionLanguage;
      });
      cards.forEach((card)=>{
        const variants=Array.from(card.titleElement?.querySelectorAll("[data-prep-question-language]")||[]);
        if(!variants.length)return;
        variants.forEach((variant)=>{
          variant.hidden=variant.dataset.prepQuestionLanguage!==languages.questionLanguage;
          variant.lang=variant.dataset.prepQuestionLanguage;
        });
        card.titleElement.lang=languages.questionLanguage;
        const visibleTitle=variants.find((variant)=>!variant.hidden);
        card.title=(visibleTitle?.textContent||card.title).trim();
      });
    }
    if(answerSelect){
      answerSelect.value=languages.answerLanguage;
      root.dataset.prepAnswerLanguage=languages.answerLanguage;
      root.querySelectorAll("[data-prep-answer-language]").forEach((variant)=>{
        variant.hidden=variant.dataset.prepAnswerLanguage!==languages.answerLanguage;
        variant.lang=variant.dataset.prepAnswerLanguage;
        const copy=variant.closest(".prep-answer-copy, .prep-followup-copy, .prep-experience-prompt");
        if(copy)copy.lang=languages.answerLanguage;
      });
      root.querySelectorAll("[data-prep-answer-label]").forEach((label)=>{
        const first=label.dataset.prepAnswerLabel==="first";
        const experience=label.closest('[data-entry-type="experience"]');
        label.textContent=first?(languages.answerLanguage==="ko"?(experience?"가상 경험으로 말하기":"첫 답변"):(experience?"Practice with an example":"Opening answer")):(languages.answerLanguage==="ko"?"30초 답변":"30-second answer");
        label.lang=languages.answerLanguage;
      });
    }
    cards.forEach(renderExperience);
    renderDifficult();
  };

  [[questionSelect,"questionLanguage"],[answerSelect,"answerLanguage"]].forEach(([select,key])=>{
    if(!select)return;
    select.addEventListener("change",()=>{
      languages[key]=validLanguage(select.value);
      applyLanguages();
      storage.set(languageKey,languages);
    });
  });

  cards.forEach((card)=>{
    if(card.experienceButton){
      card.experienceButton.disabled=card.experienceExamples.length<2;
      card.experienceButton.addEventListener("click",()=>{
        if(card.experienceExamples.length<2)return;
        card.experienceIndex=(card.experienceIndex+1)%card.experienceExamples.length;
        renderExperience(card);
        persist();
      });
    }
    if(card.difficultButton){
      card.difficultButton.addEventListener("click",()=>{
        if(state.difficultIds.has(card.id))state.difficultIds.delete(card.id);
        else state.difficultIds.add(card.id);
        renderDifficult();
        persist();
      });
    }
  });

  if(!revealHashedCard())activateTab(state.activeTab,{persist:false});
  window.addEventListener("hashchange",revealHashedCard);
  applyLanguages();
}

function initReadingProgressAndToc(){
  const article=document.querySelector("[data-reading-article-body]");
  if(!article)return;
  const progressBar=document.querySelector("[data-reading-progress-bar]");
  const tocLinks=Array.from(document.querySelectorAll("[data-reader-toc-link]"));
  const headings=Array.from(article.querySelectorAll("h2[id],h3[id],h4[id]")).filter(isReaderHeading);

  const setActiveToc=(id)=>{
    tocLinks.forEach((link)=>{
      const active=link.getAttribute("href")===`#${id}`;
      link.classList.toggle("is-active",active);
      if(active)link.setAttribute("aria-current","true");
      else link.removeAttribute("aria-current");
    });
  };

  const syncProgress=()=>{
    if(!progressBar)return;
    const rect=article.getBoundingClientRect();
    const start=window.scrollY+rect.top;
    const lastScroll=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
    const end=Math.min(lastScroll,start+article.scrollHeight-window.innerHeight*.72);
    const height=Math.max(1,end-start);
    const progress=end<=start?(window.scrollY>=end?1:0):Math.min(1,Math.max(0,(window.scrollY-start)/height));
    progressBar.style.width=`${Math.round(progress*100)}%`;
  };

  let ticking=false;
  const onScroll=()=>{
    if(ticking)return;
    ticking=true;
    window.requestAnimationFrame(()=>{
      syncProgress();
      if(headings.length){
        const active=headings.reduce((current,heading)=>heading.getBoundingClientRect().top<160?heading:current,headings[0]);
        setActiveToc(active.id);
      }
      ticking=false;
    });
  };

  window.addEventListener("scroll",onScroll,{passive:true});
  window.addEventListener("resize",onScroll);
  onScroll();
}

document.addEventListener("DOMContentLoaded",()=>{
  initTheme();
  initHomeCurrentReading();
  initGatedLinks();
  initHomeRail();
  initHomeFilters();
  initTabMenus();
  initMobileTabs();
  initTranslationSentenceReveals();
  initInteractiveQuizzes();
  initQuizPlayers();
  initProfessorPrep();
  initReadingProgressAndToc();
});
