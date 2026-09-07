const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");

const readJson=(file)=>JSON.parse(fs.readFileSync(file,"utf8").replace(/^\uFEFF/,""));
const escape=(value)=>String(value??"").replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const weekId=(week)=>`week-${String(week).padStart(2,"0")}`;
const bilingual=(value,kind="answer")=>`<span lang="en" data-weekly-${kind}-language="en" hidden>${escape(value.en)}</span><span lang="ko" data-weekly-${kind}-language="ko">${escape(value.ko)}</span>`;

function pairForWeek(manifest,week){
  const pair=manifest.readings.filter((reading)=>reading.week===week);
  if(pair.length!==2||!pair[0].class_date||pair[0].class_date!==pair[1].class_date){
    throw new Error(`[weekly] ${weekId(week)} requires exactly two manifest readings on the same class date`);
  }
  return pair;
}

function validateWeeklyData(root,manifest,data){
  const fail=(message)=>{throw new Error(`[weekly] ${weekId(data.week)}: ${message}`);};
  if(![1,2].includes(data.schema_version)||!Number.isInteger(data.week)||data.week<1)fail("invalid schema or week");
  const reflection=data.schema_version===2;
  if(reflection&&data.practice_format!=="reflection-followups-v1")fail("reflection practice format is required");
  const pair=pairForWeek(manifest,data.week);
  const pairSlugs=pair.map((reading)=>reading.slug);
  const text=(value,label)=>{
    if(!value||typeof value.en!=="string"||!value.en.trim()||typeof value.ko!=="string"||!value.ko.trim())fail(`${label} needs English and Korean text`);
    if(!/[가-힣]/.test(value.ko)||/\uFFFD|\?{2,}/.test(value.ko))fail(`${label} has damaged Korean text`);
  };
  text(data.title,"title");text(data.introduction,"introduction");
  text(data.connection?.thesis,"connection thesis");text(data.connection?.distinction,"connection distinction");
  if(!Array.isArray(data.connection?.roles)||data.connection.roles.length!==2||new Set(data.connection.roles.map((role)=>role.slug)).size!==2)fail("connection roles must cover the pair");
  for(const role of data.connection.roles){
    if(!pairSlugs.includes(role.slug))fail("role references another reading");
    text(role.description,"role description");
  }
  if(!Array.isArray(data.cards)||data.cards.length<3||data.cards.length>8)fail("expected 3–8 focused questions");
  const sourceMaps=new Map(pair.map((reading)=>[reading.slug,new Map(readJson(path.join(root,reading.content_dir,"source_segments.json")).segments.map((segment)=>[segment.segment_id,segment]))]));
  const ids=new Set();
  for(const card of data.cards){
    if(!new RegExp(`^${weekId(data.week)}-\\d{2}$`).test(card.id)||ids.has(card.id))fail("invalid or duplicate question id");
    ids.add(card.id);
    text(card.topic,`${card.id} topic`);
    if(reflection){
      text(card.first_response,`${card.id} first response`);
      const words=card.first_response.en.trim().split(/\s+/).length;
      if(words<35||words>110)fail(`${card.id} first response must be a focused opening (${words} words)`);
      if(!Array.isArray(card.followups)||card.followups.length<3||card.followups.length>5)fail(`${card.id} needs 3–5 follow-up questions`);
      for(const followup of card.followups){
        if(!new RegExp(`^${card.id}-followup-\\d{2}$`).test(followup.id)||ids.has(followup.id))fail(`${card.id} invalid or duplicate follow-up id`);
        ids.add(followup.id);
        text(followup.question,`${followup.id} question`);text(followup.answer,`${followup.id} answer`);
      }
      if(["question","answer","takeaway","connection","caution","followup"].some((key)=>key in card))fail(`${card.id} must move teacher questions and detailed explanations under followups`);
    }else{
      for(const key of["question","answer","takeaway","connection","caution"])text(card[key],`${card.id} ${key}`);
      text(card.followup?.question,`${card.id} follow-up question`);text(card.followup?.answer,`${card.id} follow-up answer`);
      const words=card.answer.en.trim().split(/\s+/).length;
      if(words<85||words>135)fail(`${card.id} answer must be suitable for about one minute (${words} words)`);
    }
    if(!Array.isArray(card.evidence)||!pairSlugs.every((slug)=>card.evidence.some((evidence)=>evidence.slug===slug)))fail(`${card.id} needs evidence from both readings`);
    const evidenceIds=new Set();
    for(const evidence of card.evidence){
      const key=`${evidence.slug}:${evidence.segment_id}`;
      if(!sourceMaps.get(evidence.slug)?.has(evidence.segment_id)||evidenceIds.has(key))fail(`${card.id} invalid or duplicate evidence ${key}`);
      evidenceIds.add(key);
      if(typeof evidence.anchor!=="string"||!/^[-a-z0-9]*$/.test(evidence.anchor))fail(`${card.id} invalid evidence anchor`);
      text(evidence.note,`${card.id} evidence note`);
    }
  }
  return pair;
}

// Bind the reviewed synthesis to the actual sources and the manifest pairing.
// Existing per-reading approvals remain the publication gate for each source.
function weeklyReviewDigest(root,manifest,data){
  const pair=pairForWeek(manifest,data.week);
  const hash=crypto.createHash("sha256");
  hash.update(JSON.stringify(data));
  hash.update(JSON.stringify(pair.map(({slug,week,class_date,title,authors,year})=>({slug,week,class_date,title,authors,year}))));
  for(const reading of pair){
    for(const file of["source_segments.json","full.md"]){
      hash.update(reading.slug+"/"+file+"\n");
      hash.update(fs.readFileSync(path.join(root,reading.content_dir,file)));
    }
  }
  return hash.digest("hex");
}

function loadWeeklyConnections(root,manifest){
  const dir=path.join(root,"content","weeks");
  if(!fs.existsSync(dir))return[];
  const result=[];
  for(const filename of fs.readdirSync(dir).filter((name)=>/^week-\d+\.json$/.test(name))){
    const reviewFile=path.join(dir,filename.replace(/\.json$/,".review.json"));
    if(!fs.existsSync(reviewFile))continue;
    const review=readJson(reviewFile);
    if(review.status!=="approved")continue;
    const data=readJson(path.join(dir,filename));
    if(filename!==`${weekId(data.week)}.json`)throw new Error(`[weekly] filename does not match week: ${filename}`);
    const pair=validateWeeklyData(root,manifest,data);
    const digest=weeklyReviewDigest(root,manifest,data);
    if(review.sha256!==digest)throw new Error(`[weekly] ${filename}: content or source changed; review must be renewed`);
    if(!review.reviewer||!review.reviewed_at||!review.scope)throw new Error(`[weekly] ${filename}: incomplete review record`);
    result.push({...data,pair,id:weekId(data.week),revision:digest.slice(0,12)});
  }
  return result.sort((a,b)=>manifest.readings.indexOf(a.pair[0])-manifest.readings.indexOf(b.pair[0]));
}

function selectAvailableWeeks(weeks,readings){
  return weeks.filter((week)=>week.pair.every((source)=>{
    const reading=readings.find((item)=>item.slug===source.slug);
    return reading&&reading.workflow_status!=="blocked"&&!reading.release_locked&&["full","professor-prep"].every((key)=>{
      const page=reading.pages.find((item)=>item.key===key);
      return page&&page.source_validation_status==="approved";
    });
  }));
}

function renderWeeklyEntry(week,href){
  if(!week)return"";
  return `<a class="weekly-entry" href="${escape(href)}"><span><strong>${week.week}주차 · 두 편 연결해서 답하기</strong><span>${week.schema_version===2?`두 편을 읽고 먼저 말할 관점 ${week.cards.length}개와 꼬리 질문`:`같은 주의 두 자료를 엮은 질문 ${week.cards.length}개와 답변`}</span></span><span aria-hidden="true">→</span></a>`;
}

function renderWeeklyBody(root,week,helpers){
  const {homeHref,readingHref,embedded=false,sharedLanguages=embedded}=helpers;
  const shellTag=embedded?"section":"main";
  const titleTag=embedded?"h2":"h1";
  const reflection=week.schema_version===2;
  const readingLabel=(reading)=>`${reading.authors.map((name)=>name.trim().replace(/,?\s+(Jr\.?|Sr\.?|II|III|IV)$/i,"").split(/\s+/).at(-1)).join(" & ")} · ${reading.year}`;
  const evidenceHtml=(item)=>{
    const reading=week.pair.find((source)=>source.slug===item.slug);
    const segment=readJson(path.join(root,reading.content_dir,"source_segments.json")).segments.find((source)=>source.segment_id===item.segment_id);
    return `<li><h4>${escape(readingLabel(reading))}</h4><p>${bilingual(item.note)}</p><a href="${escape(readingHref(reading,"full.html")+(item.anchor?`#${item.anchor}`:""))}">원문에서 확인 <span lang="en">· ${escape(segment.source_location)}</span> →</a></li>`;
  };
  const reflectionCard=(card,index)=>`<article class="weekly-card weekly-reflection-card" id="${card.id}" data-weekly-card>
    <header class="weekly-card-head"><div><p class="weekly-eyebrow">함께 읽고 든 생각 · ${String(index+1).padStart(2,"0")}</p><h3>${bilingual(card.topic,"question")}</h3></div><button type="button" data-weekly-mark aria-pressed="false" hidden>다시 연습</button></header>
    <details class="weekly-response" data-weekly-answer open><summary>내가 먼저 말하기</summary><p class="weekly-answer" data-weekly-first-response>${bilingual(card.first_response)}</p></details>
    <details class="weekly-evidence"><summary>이 발언의 두 자료 근거</summary><ul>${card.evidence.map(evidenceHtml).join("")}</ul></details>
    <section class="weekly-followups" aria-label="이 말에 이어질 꼬리 질문"><h4>이 말에 이어질 꼬리 질문 <span>${card.followups.length}개</span></h4>${card.followups.map((followup)=>`<details class="weekly-followup" id="${followup.id}"><summary>${bilingual(followup.question,"question")}</summary><p class="weekly-followup-answer">${bilingual(followup.answer)}</p></details>`).join("")}</section>
  </article>`;
  return `<${shellTag} class="weekly-shell${embedded?" weekly-embedded":""}${reflection?" weekly-reflection":""}" lang="ko" data-weekly-root data-weekly-id="${week.id}" data-weekly-version="${week.revision}"${reflection?' data-weekly-format="reflection-followups-v1"':""}>
  <header class="weekly-hero">
    ${embedded?"":`<a class="weekly-back" href="${escape(homeHref)}">← 전체 읽기</a>`}
    <p class="weekly-eyebrow">${escape(week.pair[0].display_date_label||`${week.week}주차 · ${week.pair[0].class_date}`)} · 두 읽기 연결</p>
    <${titleTag}>${escape(week.title.ko)}</${titleTag}>
    <p class="weekly-intro">${escape(week.introduction.ko)}</p>
  </header>
  <div class="weekly-controls" hidden>
    ${sharedLanguages?"":`<label>질문 언어<select data-weekly-question-select aria-label="질문 언어"><option value="ko">한국어</option><option value="en">English</option></select></label>
    <label>답변 언어<select data-weekly-answer-select aria-label="답변 언어"><option value="ko">한국어</option><option value="en">English</option></select></label>`}
    <label><input type="checkbox" data-weekly-hide-answers />${reflection?"첫 발언 가리고 연습":"답변 가리고 연습"}</label>
    <label><input type="checkbox" data-weekly-marked-only />${reflection?"표시한 관점만":"표시한 질문만"}</label>
    <p data-weekly-status role="status" aria-live="polite"></p>
  </div>
  ${reflection?'<details class="weekly-context"><summary>두 자료와 연결점 살펴보기</summary>':""}
  <section class="weekly-pair" aria-label="함께 읽는 두 자료">${week.pair.map((reading,index)=>`<article class="weekly-reading"><p class="weekly-eyebrow">READING ${String(index+1).padStart(2,"0")} · ${escape(readingLabel(reading))}</p><h2 lang="en">${escape(reading.title)}</h2><p>${bilingual(week.connection.roles.find((role)=>role.slug===reading.slug).description)}</p><div class="weekly-reading-links"><a href="${escape(readingHref(reading,"full.html"))}">원문 읽기 →</a><a href="${escape(readingHref(reading,"professor-prep.html"))}">이 자료 답변 대비 →</a></div></article>`).join("")}</section>
  <section class="weekly-synthesis"><h2>두 글을 잇는 핵심</h2><p class="weekly-thesis">${bilingual(week.connection.thesis)}</p><p class="weekly-distinction">${bilingual(week.connection.distinction)}</p></section>
  ${reflection?'</details><details class="weekly-topic-menu"><summary>말할 관점 고르기 · '+week.cards.length+'개</summary>':""}
  <nav class="weekly-question-nav" aria-label="${reflection?"읽고 든 생각 바로가기":"연결 질문 바로가기"}">${week.cards.map((card,index)=>`<a href="#${card.id}"><span>${String(index+1).padStart(2,"0")}</span>${escape(card.topic.ko)}</a>`).join("")}</nav>
  ${reflection?"</details>":""}
  <p class="weekly-empty" hidden>${reflection?"표시한 관점이 없습니다. ‘표시한 관점만’을 해제하고 먼저 말할 내용을 골라보세요.":"표시한 질문이 없습니다. ‘표시한 질문만’을 해제하고 연습할 질문을 골라보세요."}</p>
  <section class="weekly-card-list" aria-label="두 편 연결 답변 연습">${week.cards.map((card,index)=>reflection?reflectionCard(card,index):`<article class="weekly-card" id="${card.id}" data-weekly-card>
    <header class="weekly-card-head"><div><p class="weekly-eyebrow">QUESTION ${String(index+1).padStart(2,"0")} · ${escape(card.topic.ko)}</p><h2>${bilingual(card.question,"question")}</h2></div><button type="button" data-weekly-mark aria-pressed="false" hidden>다시 연습</button></header>
    <details class="weekly-response" data-weekly-answer open><summary>1분 답변</summary><p class="weekly-answer">${bilingual(card.answer)}</p><div class="weekly-takeaway"><h3>한 문장으로 줄이면</h3><p>${bilingual(card.takeaway)}</p></div></details>
    <div class="weekly-analysis"><section><h3>이렇게 연결</h3><p>${bilingual(card.connection)}</p></section><section><h3>답변할 때 주의</h3><p>${bilingual(card.caution)}</p></section></div>
    <details class="weekly-evidence"><summary>두 자료의 근거</summary><ul>${card.evidence.map(evidenceHtml).join("")}</ul></details>
    <details class="weekly-followup"><summary>꼬리 질문</summary><h3>${bilingual(card.followup.question,"question")}</h3><p>${bilingual(card.followup.answer)}</p></details>
  </article>`).join("")}</section>
  <footer class="weekly-footer"><p>${reflection?"두 자료를 함께 읽고 말할 수 있는 발언 예시와 예상 꼬리 문답입니다. 자신의 생각에 맞게 골라 말해 보세요.":"두 자료를 함께 읽고 구성한 연습 질문과 답변입니다. 실제 수업 질문이나 저자들의 공동 결론을 뜻하지 않습니다."}</p><a href="${escape(homeHref)}">전체 읽기로 돌아가기 →</a></footer>
</${shellTag}>`;
}

module.exports={pairForWeek,validateWeeklyData,weeklyReviewDigest,loadWeeklyConnections,selectAvailableWeeks,renderWeeklyEntry,renderWeeklyBody};
