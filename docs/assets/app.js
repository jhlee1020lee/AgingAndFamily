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
    try{localStorage.setItem(key,JSON.stringify(value));}catch(error){}
  }
};

const STORAGE_PREFIX="aaf";
const THEME_KEY=`${STORAGE_PREFIX}-theme`;
const FONT_KEY=`${STORAGE_PREFIX}-font-scale`;
const UI_TEXT={
  darkMode:"다크 모드",
  lightMode:"라이트 모드",
  bookmark:"북마크",
  bookmarked:"북마크됨",
  resume:"이어서 보기",
  savedResume:"마지막 읽은 위치를 이 기기에 저장했습니다.",
  savedPosition:"읽던 위치를 저장했습니다.",
  noHeadings:"표시할 제목이 아직 없습니다.",
  noImportant:"중요 표시한 제목이 여기에 모입니다.",
  noHeadingList:"제목이 아직 없습니다.",
  mark:"중요",
  prepDifficult:"표시",
  prepDifficultActive:"표시됨",
  prepNoDifficult:"표시한 답변 카드가 여기에 모입니다."
};

function escapeHtmlText(value){
  return String(value??"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/\"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

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

function selectHomeCurrentReading(readings,today,publishCutoffDate){
  const published=(Array.isArray(readings)?readings:[])
    .filter((reading)=>reading?.classDate&&(!publishCutoffDate||reading.classDate<=publishCutoffDate));
  const byDateThenSequence=(a,b)=>String(a.classDate).localeCompare(String(b.classDate))||(Number(a.sequence)||0)-(Number(b.sequence)||0);
  const upcoming=published
    .filter((reading)=>reading.classDate>=today)
    .sort(byDateThenSequence);
  if(upcoming.length)return upcoming[0];
  const referenceDate=publishCutoffDate&&publishCutoffDate<today?publishCutoffDate:today;
  return published
    .filter((reading)=>reading.classDate<=referenceDate)
    .sort((a,b)=>String(b.classDate).localeCompare(String(a.classDate))||(Number(b.sequence)||0)-(Number(a.sequence)||0))[0]||null;
}

function homeReadingState(reading,currentSlug){
  if(!reading||reading.baseState==="locked")return"locked";
  return reading.slug===currentSlug?"current":"ready";
}

function renderHomeHeroAction(label,href,className,message,download=false){
  if(href){
    return `<a class="${escapeHtmlText(className)}" href="${escapeHtmlText(href)}"${download?" download":""}>${escapeHtmlText(label)}</a>`;
  }
  return `<button class="${escapeHtmlText(`${className} is-disabled`)}" type="button" data-gated-link data-gated-message="${escapeHtmlText(message||"준비중입니다.")}">${escapeHtmlText(label)}</button>`;
}

function renderHomeWorkspaceMockup(reading){
  const accents=["purple","orange","teal","pink"];
  const tasks=(Array.isArray(reading?.progressItems)?reading.progressItems:[]).map((item,index)=>{
    const value=Number(item.value)||0;
    const state=value>=1?"ready":value>0?"partial":"pending";
    const accent=accents[index%accents.length];
    return `<article class="workspace-task is-${escapeHtmlText(state)} accent-${escapeHtmlText(accent)}"><span>${escapeHtmlText(item.label)}</span><strong>${escapeHtmlText(item.detail)}</strong></article>`;
  }).join("");
  if(!tasks)return"";
  return `<div class="workspace-mockup-card" aria-hidden="true">
    <div class="workspace-mockup-top"><span></span><span></span><span></span><strong>Aging &amp; Family</strong></div>
    <div class="workspace-mockup-body">
      <div class="workspace-page-title"><span class="workspace-icon">N</span><div><p>이번 주 스터디 보드</p><strong>${escapeHtmlText(reading.title)}</strong></div></div>
      <div class="workspace-board">${tasks}</div>
    </div>
  </div>`;
}

function renderDynamicHomeHero(reading){
  if(!reading){
    return `<div class="hero-body"><p class="hero-kicker">이번 주</p><h2>표시할 읽기가 아직 없습니다.</h2><p class="hook">수업 날짜가 지난 읽기가 생기면 이 영역에 자동으로 반영됩니다.</p></div>`;
  }
  const tags=(Array.isArray(reading.tags)?reading.tags:[])
    .slice(0,2)
    .map((tag)=>`<span class="chip brand"># ${escapeHtmlText(tag)}</span>`)
    .join("");
  return `<div class="hero-body"><span class="hero-kicker"><span class="pulse"></span>이번 주 · ${escapeHtmlText(reading.displayDateLabel||reading.classDate||"날짜 미정")}</span><h2>${escapeHtmlText(reading.title)}</h2><p class="hook">${escapeHtmlText(reading.hook||reading.subtitle||"")}</p><div class="hero-meta"><span class="chip strong">${escapeHtmlText(reading.typeLabel||"읽기")}</span><span class="chip">${escapeHtmlText(reading.languageLabel||"")}</span><span class="chip">${escapeHtmlText(reading.authorsDisplay||"")}</span>${tags}</div><div class="hero-cta-row">${renderHomeHeroAction("읽기",reading.overviewHref,"btn-primary",reading.gateMessage)} ${renderHomeHeroAction("교수님 답변 대비",reading.prepHref,"btn-ghost",reading.prepGateMessage)} ${renderHomeHeroAction("PDF 다운로드",reading.pdfHref,"btn-ghost",reading.pdfGateMessage,true)}</div></div>${renderHomeWorkspaceMockup(reading)}`;
}

function syncHomeCardState(card,state){
  const link=card.querySelector(".card-link.rcard");
  const status=card.querySelector(".rcard-status");
  const stateLabel=state==="current"?"이번 주":state==="ready"?"공개됨":"잠금";
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
}

function syncHomeRailState(item,state,isScheduleCurrent=false){
  item.classList.toggle("is-current",Boolean(isScheduleCurrent));
  item.classList.toggle("is-done",state==="ready");
  const reading=item.querySelector(".rail-reading");
  if(reading){
    reading.classList.remove("ready","current","locked");
    reading.classList.add(state);
  }
}

function initDynamicHomeCurrentReading(){
  const payload=parseHomeReadingData();
  if(!payload)return;
  const today=todayIsoDateForZone(payload.dateTimeZone||"Asia/Seoul");
  const current=selectHomeCurrentReading(payload.readings,today,String(payload.publishCutoffDate||"").trim());
  const currentSlug=current?.slug||"";
  const hero=document.querySelector("[data-home-hero]");
  if(hero)hero.innerHTML=renderDynamicHomeHero(current);

  document.querySelectorAll("[data-reading-card]").forEach((card)=>{
    const reading=payload.readings.find((item)=>item.slug===card.dataset.readingSlug);
    syncHomeCardState(card,homeReadingState(reading,currentSlug));
  });

  document.querySelectorAll("[data-home-rail-item]").forEach((item)=>{
    const reading=payload.readings.find((entry)=>entry.slug===item.dataset.readingSlug);
    syncHomeRailState(item,homeReadingState(reading,currentSlug),reading?.slug===currentSlug);
  });

  const railMeta=document.querySelector(".home-dashboard .rail-toggle-meta");
  if(railMeta&&current)railMeta.textContent=`${current.displayDateLabel||current.classDate} · ${current.title}`;
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
  };

  [input,typeSelect,tagSelect].forEach((element)=>element&&element.addEventListener("input",apply));
  [typeSelect,tagSelect].forEach((element)=>element&&element.addEventListener("change",apply));
  chips.forEach((chip)=>{
    chip.addEventListener("click",()=>{
      chips.forEach((item)=>item.classList.toggle("is-active",item===chip));
      apply();
    });
  });
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

function slugify(value){
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")||"section";
}

function cleanHeadingText(text){
  return String(text||"").replace(/\s*중요\s*$/," ").trim();
}

function isReaderHeading(heading){
  return Boolean(heading)&&heading.dataset?.readerToc!=="false";
}

function setFontScale(scale){
  const clamped=Math.min(1.35,Math.max(0.9,Number(scale.toFixed(2))));
  document.documentElement.style.setProperty("--reader-font-scale",String(clamped));
  try{localStorage.setItem(FONT_KEY,String(clamped));}catch(error){}
  return clamped;
}

function initReader(){
  const root=document.querySelector("[data-reader-root]");
  if(!root)return;
  const articleBody=root.querySelector("[data-article-body]");
  if(!articleBody)return;

  const pagePath=root.dataset.pagePath||window.location.pathname;
  const scrollKey=`${STORAGE_PREFIX}-scroll:${pagePath}`;
  const marksKey=`${STORAGE_PREFIX}-marks:${pagePath}`;
  const bookmarksKey=`${STORAGE_PREFIX}-bookmarked-pages`;
  const note=root.querySelector("[data-reading-status]");
  const resume=root.querySelector("[data-resume-position]");
  const bookmarkButton=root.querySelector("[data-page-bookmark]");
  const importantList=root.querySelector("[data-important-list]");
  const toc=root.querySelector("[data-generated-toc]");
  const marked=new Set(storage.get(marksKey,[]));
  const savedScale=Number((()=>{try{return localStorage.getItem(FONT_KEY);}catch(error){return 1;}})()||1);

  setFontScale(savedScale||1);
  root.querySelectorAll("[data-font-action]").forEach((button)=>{
    button.addEventListener("click",()=>{
      const action=button.dataset.fontAction;
      const current=Number(getComputedStyle(document.documentElement).getPropertyValue("--reader-font-scale")||1);
      if(action==="decrease")setFontScale(current-0.05);
      if(action==="increase")setFontScale(current+0.05);
      if(action==="reset")setFontScale(1);
    });
  });

  const bookmarked=new Set(storage.get(bookmarksKey,[]));
  const updateBookmark=()=>{
    const active=bookmarked.has(pagePath);
    if(bookmarkButton){
      bookmarkButton.textContent=active?UI_TEXT.bookmarked:UI_TEXT.bookmark;
      bookmarkButton.classList.toggle("is-active",active);
    }
  };

  if(bookmarkButton){
    bookmarkButton.addEventListener("click",()=>{
      if(bookmarked.has(pagePath))bookmarked.delete(pagePath);
      else bookmarked.add(pagePath);
      storage.set(bookmarksKey,Array.from(bookmarked));
      updateBookmark();
    });
    updateBookmark();
  }

  const headings=Array.from(articleBody.querySelectorAll("h2,h3,h4")).filter(isReaderHeading);
  const renderImportantList=()=>{
    if(!importantList)return;
    if(!headings.length){
      importantList.innerHTML=`<p class="meta">${UI_TEXT.noHeadingList}</p>`;
      return;
    }
    const markedHeadings=headings.filter((heading)=>marked.has(heading.id));
    importantList.innerHTML=markedHeadings.length
      ? markedHeadings.map((heading)=>`<a class="important-link" href="#${heading.id}">${cleanHeadingText(heading.textContent)}</a>`).join("")
      : `<p class="meta">${UI_TEXT.noImportant}</p>`;
  };

  if(!headings.length&&toc)toc.innerHTML=`<p class="meta">${UI_TEXT.noHeadings}</p>`;
  const tocLinks=headings.map((heading,index)=>{
    if(!heading.id)heading.id=`${slugify(heading.textContent)}-${index+1}`;
    heading.classList.add("markable-heading");
    let marker=heading.querySelector(".mark-btn");
    if(!marker){
      marker=document.createElement("button");
      marker.type="button";
      marker.className="mark-btn";
      marker.textContent=UI_TEXT.mark;
      heading.appendChild(marker);
    }

    const syncMarker=()=>{
      const active=marked.has(heading.id);
      marker.classList.toggle("is-active",active);
      marker.setAttribute("aria-pressed",String(active));
    };

    marker.addEventListener("click",()=>{
      if(marked.has(heading.id))marked.delete(heading.id);
      else marked.add(heading.id);
      storage.set(marksKey,Array.from(marked));
      syncMarker();
      renderImportantList();
      if(toc){
        const tocLink=toc.querySelector(`[href="#${heading.id}"]`);
        tocLink&&tocLink.classList.toggle("is-important",marked.has(heading.id));
      }
    });

    syncMarker();
    return `<a class="toc-link toc-${heading.tagName.toLowerCase()} ${marked.has(heading.id)?"is-important":""}" href="#${heading.id}">${cleanHeadingText(heading.textContent)}</a>`;
  });

  if(toc&&tocLinks.length)toc.innerHTML=tocLinks.join("");
  renderImportantList();

  const saved=storage.get(scrollKey,null);
  if(saved&&typeof saved.y==="number"&&saved.y>120&&resume){
    resume.hidden=false;
    resume.addEventListener("click",()=>{window.scrollTo({top:saved.y,behavior:"smooth"});});
    if(note)note.textContent=UI_TEXT.savedResume;
  }

  let ticking=false;
  const saveScroll=()=>{
    storage.set(scrollKey,{y:window.scrollY,t:Date.now()});
    if(note)note.textContent=UI_TEXT.savedPosition;
    ticking=false;
  };

  window.addEventListener("scroll",()=>{
    if(ticking)return;
    ticking=true;
    window.requestAnimationFrame(saveScroll);
  },{passive:true});
  window.addEventListener("beforeunload",saveScroll);
}

function initProfessorPrep(){
  const root=document.querySelector("[data-prep-root]");
  if(!root)return;
  const readerRoot=root.closest("[data-reader-root]");
  const pagePath=readerRoot?.dataset.pagePath||window.location.pathname;
  const stateKey=`${STORAGE_PREFIX}-prep:${pagePath}`;
  const saved=storage.get(stateKey,{});
  const state={difficultIds:new Set(Array.isArray(saved.difficultIds)?saved.difficultIds:[])};
  const difficultList=document.querySelector("[data-prep-difficult-list]");

  const cards=Array.from(root.querySelectorAll("[data-prep-card]")).map((card)=>{
    const id=card.dataset.cardId||card.id;
    const title=(card.querySelector("[data-prep-title]")?.textContent||card.querySelector("h3, h2")?.textContent||id).trim();
    return{
      id,
      card,
      title,
      difficultButton:card.querySelector("[data-prep-difficult]")
    };
  });

  const persist=()=>{
    storage.set(stateKey,{difficultIds:Array.from(state.difficultIds)});
  };

  const renderDifficult=()=>{
    cards.forEach((card)=>{
      const active=state.difficultIds.has(card.id);
      card.card.classList.toggle("is-difficult",active);
      if(card.difficultButton){
        card.difficultButton.textContent=active?UI_TEXT.prepDifficultActive:UI_TEXT.prepDifficult;
        card.difficultButton.classList.toggle("is-active",active);
      }
    });

    if(difficultList){
      const activeCards=cards.filter((card)=>state.difficultIds.has(card.id));
      difficultList.innerHTML=activeCards.length
        ? activeCards.map((card)=>`<a class="important-link" href="#${card.id}">${card.title}</a>`).join("")
        : `<p class="meta">${UI_TEXT.prepNoDifficult}</p>`;
    }
  };

  cards.forEach((card)=>{
    if(card.difficultButton){
      card.difficultButton.addEventListener("click",()=>{
        if(state.difficultIds.has(card.id))state.difficultIds.delete(card.id);
        else state.difficultIds.add(card.id);
        renderDifficult();
        persist();
      });
    }
  });

  renderDifficult();
}

function initReadingProgressAndToc(){
  const article=document.querySelector("[data-reading-article-body]");
  if(!article)return;
  const progressBar=document.querySelector("[data-reading-progress-bar]");
  const tocLinks=Array.from(document.querySelectorAll("[data-reader-toc-link]"));
  const headings=Array.from(article.querySelectorAll("h2[id],h3[id],h4[id]"));

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
    const height=Math.max(1,article.scrollHeight-window.innerHeight*.72);
    const progress=Math.min(1,Math.max(0,(window.scrollY-start)/height));
    progressBar.style.width=`${Math.round(progress*100)}%`;
  };

  let ticking=false;
  const onScroll=()=>{
    if(ticking)return;
    ticking=true;
    window.requestAnimationFrame(()=>{
      syncProgress();
      if(headings.length&&!("IntersectionObserver" in window)){
        const active=headings.reduce((current,heading)=>heading.getBoundingClientRect().top<160?heading:current,headings[0]);
        setActiveToc(active.id);
      }
      ticking=false;
    });
  };

  if(headings.length&&"IntersectionObserver" in window){
    const visible=new Map();
    const observer=new IntersectionObserver((entries)=>{
      entries.forEach((entry)=>visible.set(entry.target.id,entry.isIntersecting));
      const active=headings.find((heading)=>visible.get(heading.id))||headings.find((heading)=>heading.getBoundingClientRect().top>0)||headings[headings.length-1];
      if(active)setActiveToc(active.id);
    },{rootMargin:"-18% 0px -70% 0px",threshold:[0,1]});
    headings.forEach((heading)=>observer.observe(heading));
    setActiveToc(headings[0].id);
  }

  window.addEventListener("scroll",onScroll,{passive:true});
  window.addEventListener("resize",onScroll);
  syncProgress();
}

document.addEventListener("DOMContentLoaded",()=>{
  initTheme();
  initDynamicHomeCurrentReading();
  initGatedLinks();
  initHomeRail();
  initHomeFilters();
  initTabMenus();
  initReader();
  initProfessorPrep();
  initReadingProgressAndToc();
});
