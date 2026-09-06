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
  refreshWeeklyEntryHtml,
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

function checkEntryRefresh(verify){
  const oldEntry='<a class="weekly-entry" href="../../weeks/week-02/index.html"><span><strong>Old weekly entry</strong><span>Old description</span></span><span aria-hidden="true">→</span></a>';
  const newEntry='<a class="weekly-entry" href="../../weeks/week-03/index.html"><span><strong>New weekly entry</strong><span>New description</span></span><span aria-hidden="true">→</span></a>';
  const article='<section class="article-body prep-body detail-article-body"><p>Existing per-reading answer.</p><a href="full.html#evidence">Existing source evidence</a></section>';
  const page=`<main><section><a href="../../index.html">Unrelated navigation</a>${oldEntry}${article}</section></main>`;
  const inspect=(html,callback)=>{const dom=new JSDOM(html);try{callback(dom.window.document);}finally{dom.window.close();}};
  const preserved=(doc)=>{
    assert.equal(doc.querySelector(".article-body").outerHTML,article,"refresh preserves the existing reading answer and evidence link");
    assert.equal(doc.querySelector('a[href="../../index.html"]').textContent,"Unrelated navigation");
  };
  verify("withdrawing a weekly entry removes its stale link and preserves reading content",()=>inspect(refreshWeeklyEntryHtml(page,""),(doc)=>{
    assert.equal(doc.querySelector(".weekly-entry"),null);preserved(doc);
  }));
  verify("updating a weekly entry replaces the old destination beside existing reading content",()=>inspect(refreshWeeklyEntryHtml(page,newEntry),(doc)=>{
    assert.equal(doc.querySelectorAll(".weekly-entry").length,1);
    assert.equal(doc.querySelector(".weekly-entry").getAttribute("href"),"../../weeks/week-03/index.html");
    assert.equal(doc.querySelector(".article-body").previousElementSibling,doc.querySelector(".weekly-entry"));
    assert(!doc.body.textContent.includes("Old weekly entry"));preserved(doc);
  }));
  verify("repeated weekly refresh repairs duplicate entries without creating new duplicates",()=>{
    const duplicated=page.replace(oldEntry,oldEntry+oldEntry);
    const once=refreshWeeklyEntryHtml(duplicated,newEntry);
    inspect(refreshWeeklyEntryHtml(once,newEntry),(doc)=>{assert.equal(doc.querySelectorAll(".weekly-entry").length,1);preserved(doc);});
    inspect(refreshWeeklyEntryHtml(once,""),(doc)=>{assert.equal(doc.querySelector(".weekly-entry"),null);preserved(doc);});
  });
}

function checkPublicationEntries(root,manifest,weeks,verify){
  const site=path.join(root,"docs");
  const weeklyDir=path.join(site,"weeks");
  const expected=weeks.map((week)=>week.id);
  const directories=fs.existsSync(weeklyDir)?fs.readdirSync(weeklyDir,{withFileTypes:true}).filter((entry)=>entry.isDirectory()).map((entry)=>entry.name):[];
  verify("built weekly directories contain exactly the currently publishable weeks",()=>assert.deepEqual(directories.sort(),[...expected].sort()));
  const entryPaths=(file,base)=>{
    const dom=new JSDOM(fs.readFileSync(file,"utf8"),{url:`https://example.test${base}`});
    try{return[...dom.window.document.querySelectorAll("a.weekly-entry")].map((entry)=>new URL(entry.getAttribute("href"),dom.window.location.href).pathname);}
    finally{dom.window.close();}
  };
  verify("home weekly entries include approved available weeks and exclude withdrawn weeks",()=>{
    assert.deepEqual(entryPaths(path.join(site,"index.html"),"/index.html"),weeks.map((week)=>`/weeks/${week.id}/index.html`));
  });
  verify("every existing reading preparation page has current weekly entries without stale links",()=>{
    for(const reading of manifest.readings){
      const file=path.join(site,"readings",reading.slug,"professor-prep.html");
      if(!fs.existsSync(file))continue;
      const expectedWeeks=weeks.filter((week)=>week.pair.some((source)=>source.slug===reading.slug));
      assert.deepEqual(entryPaths(file,`/readings/${reading.slug}/professor-prep.html`),expectedWeeks.map((week)=>`/weeks/${week.id}/index.html`),`${reading.slug}: entry links follow current weekly publication gates`);
    }
  });
}

async function boot(html,script,entries={},options={}){
  const dom=new JSDOM(`<!doctype html><html lang="ko"><body>${html}</body></html>`,{
    url:`https://example.test/weeks/week-02/index.html${options.hash||""}`,
    runScripts:"outside-only",pretendToBeVisual:true,
  });
  await new Promise((resolve)=>dom.window.addEventListener("load",resolve,{once:true}));
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
    assert([...staticDom.window.document.querySelectorAll("[data-weekly-answer]")].every((answer)=>answer.open));
  });
  staticDom.window.close();
  let dom=await boot(render(),script);
  let doc=dom.window.document;
  try{
    verify("weekly question and answer languages change independently",()=>{
      assert.equal(doc.querySelector(".weekly-controls").hidden,false);
      assertLanguages(doc,"en","en");
      change(dom,"[data-weekly-question-select]","ko");
      assertLanguages(doc,"ko","en");
      change(dom,"[data-weekly-answer-select]","ko");
      assertLanguages(doc,"ko","ko");
      change(dom,"[data-weekly-question-select]","en");
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
    checkEntryRefresh(verify);
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
