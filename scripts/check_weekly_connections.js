const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {JSDOM}=require("jsdom");
const {buildValidationSnapshot}=require("./validate_content");
const {
  validateWeeklyData,
  weeklyReviewDigest,
  loadWeeklyConnections,
  selectAvailableWeeks,
  renderWeeklyBody,
}=require("./weekly_connections");

const ROOT=path.resolve(__dirname,"..");
const readJson=(file)=>JSON.parse(fs.readFileSync(file,"utf8").replace(/^\uFEFF/,""));
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`);};
const clone=(value)=>JSON.parse(JSON.stringify(value));
const bilingual=(en="A connection supported by both readings.",ko="두 읽기의 근거를 연결한 설명입니다.")=>({en,ko});
const helpers={homeHref:"../../index.html",readingHref:(reading,page)=>`../../readings/${reading.slug}/${page}`};

function makeFixture(root){
  const readings=["first","second"].map((slug,index)=>({
    slug,week:2,class_date:"2026-09-08",content_dir:`content/readings/${slug}`,
    title:`Reading ${index+1}`,authors:[`Author ${index+1}`],year:2020+index,
  }));
  for(const reading of readings){
    writeJson(path.join(root,reading.content_dir,"source_segments.json"),{
      paper_id:reading.slug,
      segments:[{segment_id:`${reading.slug}-s01`,original_text:`Evidence from ${reading.slug}.`,section:"Evidence",source_location:"p. 1"}],
    });
    fs.writeFileSync(path.join(root,reading.content_dir,"full.md"),`# ${reading.title}\n\n## Evidence\n\nEvidence from ${reading.slug}.\n`);
  }
  const answer=Array.from({length:5},()=>"The first reading explains how social expectations shape individual choices, while the second places those choices within institutions and historical circumstances.").join(" ");
  const data={
    schema_version:1,week:2,title:bilingual("Connect two readings","두 읽기 연결"),introduction:bilingual(),
    connection:{thesis:bilingual(),distinction:bilingual(),roles:readings.map((reading)=>({slug:reading.slug,description:bilingual()}))},
    cards:Array.from({length:3},(_,index)=>({
      id:`week-02-0${index+1}`,topic:bilingual(`Topic ${index+1}`,`주제 ${index+1}`),
      question:bilingual(`How do both readings explain example ${index+1}?`,`두 읽기로 사례 ${index+1}을 어떻게 설명하나요?`),
      answer:bilingual(answer),takeaway:bilingual(),connection:bilingual(),caution:bilingual(),
      followup:{question:bilingual("What is the limit?","한계는 무엇인가요?"),answer:bilingual()},
      evidence:readings.map((reading)=>({slug:reading.slug,segment_id:`${reading.slug}-s01`,anchor:"evidence",note:bilingual()})),
    })),
  };
  return{manifest:{readings},data};
}

function approvedReadings(pair){
  return pair.map((reading)=>({...reading,workflow_status:"approved",release_locked:false,
    pages:["full","professor-prep"].map((key)=>({key,source_validation_status:"approved"})),
  }));
}

function publicationReadings(root,manifest,weeks){
  const sourceSlugs=new Set(weeks.flatMap((week)=>week.pair.map((reading)=>reading.slug)));
  const cutoff=String(manifest.site?.publish_cutoff_date||"").trim();
  return manifest.readings.filter((reading)=>sourceSlugs.has(reading.slug)).map((reading)=>{
    const meta=readJson(path.join(root,reading.content_dir,"meta.json"));
    const snapshot=buildValidationSnapshot(root,reading,meta,{requireBuiltArtifacts:false});
    const sortDate=[reading.sort_date,reading.reading_date,reading.class_date].map((value)=>String(value??"").trim()).find(Boolean)||"";
    return{...reading,workflow_status:snapshot.workflow_status,release_locked:Boolean(cutoff&&sortDate&&sortDate>cutoff),
      pages:["full","professor-prep"].map((key)=>({key,source_validation_status:snapshot.validation_status.source_page_results[key.replace(/-/g,"_")]?.status})),
    };
  });
}

function checkPublicationEntries(root,manifest,weeks,verify){
  const site=path.join(root,"docs");
  const weeklyDir=path.join(site,"weeks");
  const directories=fs.existsSync(weeklyDir)?fs.readdirSync(weeklyDir,{withFileTypes:true}).filter((entry)=>entry.isDirectory()).map((entry)=>entry.name):[];
  verify("built weekly directories contain exactly the currently publishable weeks",()=>assert.deepEqual(directories.sort(),weeks.map((week)=>week.id).sort()));
  const home=new JSDOM(fs.readFileSync(path.join(site,"index.html"),"utf8"));
  try{verify("home has one compact shortcut into an available weekly tab",()=>{
    const entries=[...home.window.document.querySelectorAll("a.weekly-entry")];
    assert.equal(entries.length,weeks.length?1:0);
    if(entries.length)assert(weeks.some((week)=>entries[0].getAttribute("href")===`readings/${week.pair[0].slug}/professor-prep.html#prep-panel-weekly`));
  });}finally{home.window.close();}
  for(const reading of manifest.readings){
    const file=path.join(site,"readings",reading.slug,"professor-prep.html");
    if(!fs.existsSync(file))continue;
    const week=weeks.find((item)=>item.pair.some((source)=>source.slug===reading.slug));
    const dom=new JSDOM(fs.readFileSync(file,"utf8"));
    try{verify(`${reading.slug}: reviewed weekly practice shares a tab with Korean defaults`,()=>{
      const doc=dom.window.document;
      assert.equal(doc.querySelector(".weekly-entry"),null);
      const tab=doc.querySelector('[data-prep-tab="weekly"]');
      const panel=doc.querySelector('[data-prep-panel="weekly"]');
      assert.equal(Boolean(tab),Boolean(week));assert.equal(Boolean(panel),Boolean(week));
      if(!week)return;
      assert.equal(doc.querySelectorAll("main").length,1);
      assert.equal(doc.querySelectorAll("h1").length,1);
      assert.equal(doc.querySelectorAll("[data-prep-tab]").length,doc.querySelector('[data-prep-format="reflection-followups-v1"]')?2:3);
      assert.equal(doc.getElementById(tab.getAttribute("aria-controls")),panel);
      assert.equal(panel.getAttribute("aria-labelledby"),tab.id);
      assert.equal(panel.hidden,true);
      assert.equal(panel.querySelector("[data-weekly-root]").dataset.weeklyId,week.id);
      assert.equal(panel.querySelector("[data-weekly-root]").dataset.weeklyVersion,week.revision);
      assert.equal(panel.querySelectorAll("[data-weekly-card]").length,week.cards.length);
      assert.equal(doc.querySelectorAll('select[aria-label="질문 언어"]').length,1);
      assert.equal(doc.querySelectorAll('select[aria-label="답변 언어"]').length,1);
      assertLanguages(doc,"ko","ko");
      for(const card of week.cards){
        const built=doc.getElementById(card.id);
        assert.equal(built.querySelector('.weekly-answer [lang="ko"]').textContent,card.answer.ko);
        assert.equal(built.querySelector('.weekly-answer [lang="en"]').textContent,card.answer.en);
        assert.equal(built.querySelectorAll('.weekly-evidence a').length,card.evidence.length);
      }
      for(const asset of ["weekly.js","weekly.css"]){
        assert(doc.querySelector(`[src*="${asset}?"], [href*="${asset}?"]`));
      }
    });}finally{dom.window.close();}
  }
}

async function boot(html,script,entries={},options={}){
  const dom=new JSDOM(`<!doctype html><html lang="ko"><body>${html}</body></html>`,{
    url:`https://example.test/weeks/week-02/index.html${options.hash||""}`,
    runScripts:"outside-only",pretendToBeVisual:true,
  });
  await new Promise((resolve)=>dom.window.addEventListener("load",resolve,{once:true}));
  dom.window.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
  for(const [key,value] of Object.entries(entries))dom.window.localStorage.setItem(key,value);
  if(options.storageFailure){
    const fail=()=>{throw new dom.window.DOMException("Storage unavailable","SecurityError");};
    Object.defineProperty(dom.window,"localStorage",{value:{getItem:fail,setItem:fail}});
  }
  dom.window.eval(script);
  return dom;
}

function savedState(dom){
  const storage=dom.window.localStorage;
  return Object.fromEntries(Array.from({length:storage.length},(_,index)=>{
    const key=storage.key(index);return[key,storage.getItem(key)];
  }));
}

function change(dom,selector,value){
  const control=dom.window.document.querySelector(selector);
  assert(control,`Missing control: ${selector}`);
  if(control.type==="checkbox")control.checked=value;
  else control.value=value;
  control.dispatchEvent(new dom.window.Event("change",{bubbles:true}));
}

function assertLanguages(doc,question,answer){
  for(const [kind,expected] of [["question",question],["answer",answer]]){
    const variants=[...doc.querySelectorAll(`[data-weekly-${kind}-language]`)];
    assert(variants.length>0,`${kind} language variants exist`);
    for(const variant of variants){
      const language=variant.getAttribute(`data-weekly-${kind}-language`);
      assert.equal(variant.hidden,language!==expected,`${kind}: ${language} visibility follows its own selector`);
      assert.equal(variant.lang,language,`${kind}: language boundary matches text`);
      assert(variant.textContent.trim(),`${kind}: text remains present`);
    }
  }
}

async function checkApp(root,week,verify){
  const script=fs.readFileSync(path.join(ROOT,"scripts","weekly_connections_app.js"),"utf8");
  const render=(value=week)=>renderWeeklyBody(root,value,helpers);
  const staticDom=new JSDOM(render());
  verify("weekly answers remain readable without JavaScript",()=>{
    assert.equal(staticDom.window.document.querySelector(".weekly-controls").hidden,true);
    assertLanguages(staticDom.window.document,"ko","ko");
    assert([...staticDom.window.document.querySelectorAll("[data-weekly-answer]")].every((answer)=>answer.open));
  });
  staticDom.window.close();
  let dom=await boot(render(),script,{"aaf-weekly-languages":JSON.stringify({question:"en",answer:"en"})});
  let doc=dom.window.document;
  try{
    verify("weekly question and answer languages change independently",()=>{
      assert.equal(doc.querySelector(".weekly-controls").hidden,false);
      assertLanguages(doc,"ko","ko");
      change(dom,"[data-weekly-question-select]","en");
      assertLanguages(doc,"en","ko");
      change(dom,"[data-weekly-answer-select]","en");
      assertLanguages(doc,"en","en");
      change(dom,"[data-weekly-answer-select]","ko");
      assertLanguages(doc,"en","ko");
    });
    const state=savedState(dom);
    dom.window.close();dom=await boot(render(),script,state);doc=dom.window.document;
    verify("independent weekly language choices survive reload",()=>assertLanguages(doc,"en","ko"));
    verify("empty marked filter can be cleared and marked cards can be selected",()=>{
      const cards=[...doc.querySelectorAll("[data-weekly-card]")];
      change(dom,"[data-weekly-marked-only]",true);
      assert(cards.every((card)=>card.hidden));
      assert.equal(doc.querySelector(".weekly-empty").hidden,false);
      change(dom,"[data-weekly-marked-only]",false);
      assert(cards.every((card)=>!card.hidden));
      cards[0].querySelector("[data-weekly-mark]").click();
      assert.equal(cards[0].querySelector("[data-weekly-mark]").getAttribute("aria-pressed"),"true");
      change(dom,"[data-weekly-marked-only]",true);
      assert.deepEqual(cards.filter((card)=>!card.hidden).map((card)=>card.id),[week.cards[0].id]);
      assert.equal(doc.querySelector(".weekly-empty").hidden,true);
    });
    const markedState=savedState(dom);
    dom.window.close();dom=await boot(render(),script,markedState);doc=dom.window.document;
    verify("marked practice and filter survive reload for the reviewed content version",()=>{
      assert.equal(doc.querySelector("[data-weekly-marked-only]").checked,true);
      assert.deepEqual([...doc.querySelectorAll("[data-weekly-card]")].filter((card)=>!card.hidden).map((card)=>card.id),[week.cards[0].id]);
      assert.equal(doc.querySelector("[data-weekly-mark]").getAttribute("aria-pressed"),"true");
    });
    verify("unmarking the last filtered card shows empty state and leaves usable focus",()=>{
      const mark=doc.querySelector("[data-weekly-mark]");mark.focus();mark.click();
      assert.equal(doc.querySelector(".weekly-empty").hidden,false);
      assert.equal(doc.activeElement,doc.querySelector("[data-weekly-marked-only]"));
      change(dom,"[data-weekly-marked-only]",false);
    });
    verify("hide answers permits opening one answer and restoring all answers",()=>{
      const answers=[...doc.querySelectorAll("details[data-weekly-answer]")];
      change(dom,"[data-weekly-hide-answers]",true);
      assert(answers.every((answer)=>!answer.open));
      answers[0].querySelector("summary").click();
      assert.equal(answers[0].open,true,"native disclosure opens the chosen answer");
      assert(answers.slice(1).every((answer)=>!answer.open),"other answers remain concealed");
      assertLanguages(doc,"en","ko");
      change(dom,"[data-weekly-hide-answers]",false);
      assert(answers.every((answer)=>answer.open));
    });
    dom.window.close();dom=await boot(render(),script,markedState,{hash:`#${week.cards[1].id}`});doc=dom.window.document;
    verify("direct question links reveal questions hidden by a saved filter",()=>{
      assert.equal(doc.getElementById(week.cards[1].id).hidden,false);
      assert.equal(doc.querySelector("[data-weekly-marked-only]").checked,false);
    });
    change(dom,"[data-weekly-marked-only]",true);
    verify("question navigation remains usable while filtering marked questions",()=>{
      doc.querySelector(`.weekly-question-nav a[href="#${week.cards[1].id}"]`).click();
      assert.equal(doc.getElementById(week.cards[1].id).hidden,false);
      assert.equal(doc.querySelector("[data-weekly-marked-only]").checked,false);
    });
    dom.window.close();dom=await boot(render({...week,revision:`${week.revision}-changed`}),script,markedState);doc=dom.window.document;
    verify("content revision invalidates old practice marks while preserving language choices",()=>{
      assert([...doc.querySelectorAll("[data-weekly-mark]")].every((mark)=>mark.getAttribute("aria-pressed")==="false"));
      assert.equal(doc.querySelector("[data-weekly-marked-only]").checked,false);
      assert([...doc.querySelectorAll("[data-weekly-card]")].every((card)=>!card.hidden));
      assertLanguages(doc,"en","ko");
    });
    dom.window.close();dom=await boot(render(),script,{}, {storageFailure:true});doc=dom.window.document;
    verify("unavailable storage leaves weekly practice usable for the current visit",()=>{
      assert.equal(doc.querySelector(".weekly-controls").hidden,false);
      change(dom,"[data-weekly-question-select]","ko");
      change(dom,"[data-weekly-answer-select]","ko");
      assertLanguages(doc,"ko","ko");
      doc.querySelector("[data-weekly-mark]").click();
      change(dom,"[data-weekly-marked-only]",true);
      assert.equal([...doc.querySelectorAll("[data-weekly-card]")].filter((card)=>!card.hidden).length,1);
      change(dom,"[data-weekly-hide-answers]",true);
      assert([...doc.querySelectorAll("[data-weekly-answer]")].every((answer)=>!answer.open));
      assert.match(doc.querySelector("[data-weekly-status]").textContent,/저장.*방문/);
    });
  }finally{dom.window.close();}
}

async function checkEmbeddedApp(root,week,verify){
  const app=fs.readFileSync(path.join(ROOT,"scripts","site_app.js"),"utf8");
  const weeklyApp=fs.readFileSync(path.join(ROOT,"scripts","weekly_connections_app.js"),"utf8");
  const script=`${app}\ndocument.dispatchEvent(new Event("DOMContentLoaded"));\n${weeklyApp}`;
  const select=(kind)=>`<select data-prep-${kind}-select><option value="ko">한국어</option><option value="en">English</option></select>`;
  const tabs=["cold-call","reading-response","weekly"].map((key)=>`<button data-prep-tab="${key}" role="tab">${key}</button>`).join("");
  const question='<article data-prep-card data-card-id="individual"><h3 data-prep-title><span data-prep-question-language="ko">개별 질문</span><span data-prep-question-language="en" hidden>Individual question</span></h3><button data-prep-difficult>표시</button></article>';
  const html=`<section data-prep-root>${select("question")}${select("answer")}${tabs}<section data-prep-panel="cold-call">${question}</section><section data-prep-panel="reading-response" hidden></section><section id="prep-panel-weekly" data-prep-panel="weekly" hidden>${renderWeeklyBody(root,week,{...helpers,embedded:true})}</section></section>`;
  let dom=await boot(html,script);
  try{
    let doc=dom.window.document;
    verify("embedded practice shares both language controls and retains the active tab",()=>{
      assertLanguages(doc,"ko","ko");
      const tab=doc.querySelector('[data-prep-tab="weekly"]');tab.click();
      assert.equal(doc.querySelector('[data-prep-panel="weekly"]').hidden,false);
      change(dom,"[data-prep-question-select]","en");
      assertLanguages(doc,"en","ko");
      assert.equal(doc.querySelector('[data-prep-question-language="en"]').hidden,false);
      change(dom,"[data-prep-answer-select]","en");
      assertLanguages(doc,"en","en");
      assert.equal(tab.getAttribute("aria-selected"),"true");
      tab.dispatchEvent(new dom.window.KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true}));
      assert.equal(doc.querySelector('[data-prep-tab="cold-call"]').getAttribute("aria-selected"),"true");
      doc.activeElement.dispatchEvent(new dom.window.KeyboardEvent("keydown",{key:"End",bubbles:true}));
      assert.equal(doc.activeElement,tab);
    });
    doc.querySelector('[data-weekly-mark]').click();
    const state=savedState(dom);
    dom.window.close();dom=await boot(renderWeeklyBody(root,week,helpers),weeklyApp,state);doc=dom.window.document;
    verify("standalone weekly pages share explicit language choices and practice marks with both reading tabs",()=>{
      assertLanguages(doc,"en","en");
      assert.equal(doc.querySelector('[data-weekly-mark]').getAttribute("aria-pressed"),"true");
    });
    dom.window.close();dom=await boot(html,script,state,{hash:`#${week.cards[1].id}`});doc=dom.window.document;
    verify("a direct weekly question link opens its containing third tab",()=>{
      assert.equal(doc.querySelector('[data-prep-tab="weekly"]').getAttribute("aria-selected"),"true");
      assert.equal(doc.getElementById(week.cards[1].id).closest('[data-prep-panel]').hidden,false);
      assert.equal(doc.querySelectorAll('[data-prep-card]').length,1);
      assert.equal(doc.querySelectorAll('[data-weekly-card]').length,week.cards.length);
    });
  }finally{dom.window.close();}
}

function checkBuilt(root,weeks,verify){
  const site=path.join(root,"docs");
  const sourceDocuments=new Map();
  try{
    for(const week of weeks){
      const output=path.join(site,"weeks",week.id,"index.html");
      const dom=new JSDOM(fs.readFileSync(output,"utf8"),{url:`https://example.test/weeks/${week.id}/index.html`});
      try{
        const doc=dom.window.document;
        verify(`${week.id}: the built page loads its current practice script and stylesheet`,()=>{
          for(const [selector,attribute,filename,source] of [
            ["script[src]","src","weekly.js","weekly_connections_app.js"],
            ['link[rel="stylesheet"][href]',"href","weekly.css","weekly_connections.css"],
          ]){
            const assets=[...doc.querySelectorAll(selector)].filter((element)=>new URL(element.getAttribute(attribute),dom.window.location.href).pathname===`/assets/${filename}`);
            assert.equal(assets.length,1,`${week.id}: exactly one ${filename} reference`);
            const built=fs.readFileSync(path.join(site,"assets",filename),"utf8");
            const original=fs.readFileSync(path.join(root,"scripts",source),"utf8");
            const normalize=(text)=>text.replace(/\r\n?/g,"\n").replace(/[ \t]+$/gm,"").trimEnd();
            assert.equal(normalize(built),normalize(original),`${week.id}: ${filename} matches the reviewed source asset`);
          }
        });
        verify(`${week.id}: built reviewed cards retain bilingual answers and source links`,()=>{
          const article=doc.querySelector("[data-weekly-root]");
          assert(article,`${week.id}: weekly page is rendered`);
          assert.equal(article.dataset.weeklyId,week.id);
          assert.equal(article.dataset.weeklyVersion,week.revision);
          assert.equal(article.querySelectorAll("[data-weekly-card]").length,week.cards.length);
          const ids=[...doc.querySelectorAll("[id]")].map((element)=>element.id);
          assert.equal(new Set(ids).size,ids.length,`${week.id}: all generated IDs are unique`);
          for(const card of week.cards){
            const rendered=doc.getElementById(card.id);
            assert(rendered,`${card.id}: question is reachable by its stable anchor`);
            for(const [selector,value] of [["h2 [data-weekly-question-language]",card.question],[".weekly-answer [data-weekly-answer-language]",card.answer]]){
              for(const language of ["en","ko"]){
                const node=[...rendered.querySelectorAll(selector)].find((element)=>element.lang===language);
                assert.equal(node?.textContent,value[language],`${card.id}: ${language} text matches reviewed content`);
              }
            }
            const links=[...rendered.querySelectorAll(".weekly-evidence a[href]")];
            assert.equal(links.length,card.evidence.length);
            card.evidence.forEach((evidence,index)=>{
              const url=new URL(links[index].getAttribute("href"),dom.window.location.href);
              assert.equal(url.pathname,`/readings/${evidence.slug}/full.html`);
              assert.equal(decodeURIComponent(url.hash.slice(1)),evidence.anchor);
              const source=week.pair.find((reading)=>reading.slug===evidence.slug);
              const segments=readJson(path.join(root,source.content_dir,"source_segments.json")).segments;
              assert(segments.some((segment)=>segment.segment_id===evidence.segment_id),`${card.id}: evidence segment remains available`);
            });
          }
        });
        verify(`${week.id}: every local link and evidence anchor resolves in the built site`,()=>{
          for(const link of doc.querySelectorAll("a[href]")){
            const url=new URL(link.getAttribute("href"),dom.window.location.href);
            if(url.origin!==dom.window.location.origin)continue;
            const target=path.resolve(site,`.${decodeURIComponent(url.pathname)}`);
            const relative=path.relative(site,target);
            assert(relative&&!relative.startsWith("..")&&!path.isAbsolute(relative),`Link leaves built site: ${link.href}`);
            assert(fs.existsSync(target),`Missing built link target: ${target}`);
            if(!url.hash)continue;
            if(!sourceDocuments.has(target))sourceDocuments.set(target,new JSDOM(fs.readFileSync(target,"utf8")));
            const sourceDoc=sourceDocuments.get(target).window.document;
            const id=decodeURIComponent(url.hash.slice(1));
            assert.equal([...sourceDoc.querySelectorAll("[id]")].filter((element)=>element.id===id).length,1,`Missing or ambiguous anchor: ${link.href}`);
          }
        });
      }finally{dom.window.close();}
    }
  }finally{for(const dom of sourceDocuments.values())dom.window.close();}
}

async function run(options={}){
  const root=path.resolve(options.rootDir||ROOT);
  let checks=0;
  const verify=(label,callback)=>{callback();checks+=1;console.log(`PASS ${label}`);};
  const tmp=path.join(root,"tmp");fs.mkdirSync(tmp,{recursive:true});
  const fixture=fs.mkdtempSync(path.join(tmp,"weekly-connections-check-"));
  try{
    const {manifest,data}=makeFixture(fixture);
    verify("valid weekly cards use both manifest readings",()=>assert.deepEqual(validateWeeklyData(fixture,manifest,data).map((reading)=>reading.slug),["first","second"]));
    const invalid=[
      ["one-sided evidence",(copy)=>{copy.cards[0].evidence.pop();}],
      ["unknown evidence segment",(copy)=>{copy.cards[0].evidence[0].segment_id="missing";}],
      ["duplicate evidence",(copy)=>{copy.cards[0].evidence.push(clone(copy.cards[0].evidence[0]));}],
      ["another reading as evidence",(copy)=>{copy.cards[0].evidence[0].slug="outside";}],
      ["duplicate question IDs",(copy)=>{copy.cards[1].id=copy.cards[0].id;}],
      ["another week in question IDs",(copy)=>{copy.cards[0].id="week-03-01";}],
      ["an unrelated connection role",(copy)=>{copy.connection.roles[0].slug="outside";}],
      ["missing Korean answer",(copy)=>{copy.cards[0].answer.ko=" ";}],
    ];
    for(const [label,mutate] of invalid){const copy=clone(data);mutate(copy);verify(`weekly data rejects ${label}`,()=>assert.throws(()=>validateWeeklyData(fixture,manifest,copy),/\[weekly\]/));}
    for(let index=1;index<data.cards.length;index++){
      for(const missingPartner of [0,1]){
        const copy=clone(data);copy.cards[index].evidence.splice(missingPartner,1);
        verify(`card ${index+1} cannot omit partner ${missingPartner+1} evidence`,()=>assert.throws(()=>validateWeeklyData(fixture,manifest,copy),/\[weekly\]/));
      }
      const copy=clone(data);copy.cards[index].evidence[1].segment_id="missing";
      verify(`card ${index+1} evidence must resolve in its named reading`,()=>assert.throws(()=>validateWeeklyData(fixture,manifest,copy),/\[weekly\]/));
    }
    for(const [label,mutate] of [
      ["a missing partner",(copy)=>{copy.readings.pop();}],
      ["three readings in the week",(copy)=>{copy.readings.push({...copy.readings[0],slug:"third"});}],
      ["partners with different class dates",(copy)=>{copy.readings[1].class_date="2026-09-15";}],
      ["partners assigned to different weeks",(copy)=>{copy.readings[1].week=3;}],
    ]){const copy=clone(manifest);mutate(copy);verify(`weekly pairing rejects ${label}`,()=>assert.throws(()=>validateWeeklyData(fixture,copy,data),/\[weekly\]/));}
    const dataPath=path.join(fixture,"content","weeks","week-02.json");
    const reviewPath=path.join(fixture,"content","weeks","week-02.review.json");
    writeJson(dataPath,data);
    verify("weeks without a review remain unpublished",()=>assert.deepEqual(loadWeeklyConnections(fixture,manifest),[]));
    const digest=weeklyReviewDigest(fixture,manifest,data);
    const review={status:"approved",sha256:digest,reviewer:"fixture",reviewed_at:"2026-09-08T00:00:00Z",scope:"Both readings and every connection answer reviewed in a temporary fixture."};
    writeJson(reviewPath,{...review,status:"pending"});
    verify("pending weekly reviews remain unpublished",()=>assert.deepEqual(loadWeeklyConnections(fixture,manifest),[]));
    writeJson(reviewPath,review);
    const weeks=loadWeeklyConnections(fixture,manifest);
    verify("current reviewed weekly content becomes available",()=>assert.equal(weeks.length,1));
    for(const field of ["reviewer","reviewed_at","scope"]){writeJson(reviewPath,{...review,[field]:""});verify(`incomplete weekly ${field} cannot authorize publication`,()=>assert.throws(()=>loadWeeklyConnections(fixture,manifest),/incomplete review/));}
    writeJson(reviewPath,review);
    const changedAnswer=clone(data);changedAnswer.cards[0].answer.ko+=" 변경된 답변입니다.";writeJson(dataPath,changedAnswer);
    verify("answer edits invalidate the weekly review",()=>{
      assert.notEqual(weeklyReviewDigest(fixture,manifest,changedAnswer),digest);
      assert.throws(()=>loadWeeklyConnections(fixture,manifest),/review must be renewed/);
    });writeJson(dataPath,data);
    for(const reading of manifest.readings)for(const filename of ["full.md","source_segments.json"]){
      const sourcePath=path.join(fixture,reading.content_dir,filename);const before=fs.readFileSync(sourcePath);
      try{
        if(filename.endsWith(".json")){const source=JSON.parse(before);source.segments[0].original_text+=" Changed source evidence.";writeJson(sourcePath,source);}
        else fs.appendFileSync(sourcePath,"\nChanged source passage.\n");
        verify(`${reading.slug}/${filename} edits invalidate the weekly review`,()=>{
          assert.notEqual(weeklyReviewDigest(fixture,manifest,data),digest);
          assert.throws(()=>loadWeeklyConnections(fixture,manifest),/review must be renewed/);
        });
      }finally{fs.writeFileSync(sourcePath,before);}
    }
    const changedDates=clone(manifest);changedDates.readings.forEach((reading)=>{reading.class_date="2026-09-15";});
    verify("changed manifest pairing metadata invalidates the weekly review",()=>assert.notEqual(weeklyReviewDigest(fixture,changedDates,data),digest));
    const sources=approvedReadings(weeks[0].pair);
    verify("approved source pages permit the reviewed weekly page",()=>assert.equal(selectAvailableWeeks(weeks,sources).length,1));
    for(const index of [0,1]){
      for(const key of ["full","professor-prep"]){
        for(const status of ["schema_pass","schema_fail","missing"]){const changed=clone(sources);changed[index].pages.find((page)=>page.key===key).source_validation_status=status;verify(`partner ${index+1} ${key} ${status} blocks weekly publication`,()=>assert.deepEqual(selectAvailableWeeks(weeks,changed),[]));}
        const changed=clone(sources);changed[index].pages=changed[index].pages.filter((page)=>page.key!==key);verify(`partner ${index+1} missing ${key} blocks weekly publication`,()=>assert.deepEqual(selectAvailableWeeks(weeks,changed),[]));
      }
      for(const [field,value] of [["workflow_status","blocked"],["release_locked",true]]){const changed=clone(sources);changed[index][field]=value;verify(`partner ${index+1} ${field} blocks weekly publication`,()=>assert.deepEqual(selectAvailableWeeks(weeks,changed),[]));}
    }
    verify("a missing source reading blocks weekly publication",()=>assert.deepEqual(selectAvailableWeeks(weeks,sources.slice(0,1)),[]));
    await checkApp(fixture,weeks[0],verify);
    await checkEmbeddedApp(fixture,weeks[0],verify);
  }finally{
    const relative=path.relative(tmp,path.resolve(fixture));
    if(!relative||relative.startsWith("..")||path.isAbsolute(relative))throw new Error("Refusing to remove a fixture outside project tmp");
    fs.rmSync(fixture,{recursive:true,force:true});
  }
  let reviewedWeeks=0;
  if(!options.fixtureOnly){
    const manifest=readJson(path.join(root,"manifest","readings.json"));
    const reviewed=loadWeeklyConnections(root,manifest);
    for(const week of reviewed)verify(`${week.id}: every reviewed card passes both-source evidence validation`,()=>validateWeeklyData(root,manifest,week));
    const available=selectAvailableWeeks(reviewed,publicationReadings(root,manifest,reviewed));
    checkPublicationEntries(root,manifest,available,verify);
    checkBuilt(root,available,verify);
    reviewedWeeks=available.length;
  }
  console.log(`PASS weekly connections (${checks} checks; ${reviewedWeeks} reviewed built weeks)`);
  return{checks,reviewedWeeks};
}

if(require.main===module)run({fixtureOnly:process.argv.includes("--fixture-only")}).catch((error)=>{console.error(error);process.exitCode=1;});
module.exports={run};
