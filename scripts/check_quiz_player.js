const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const ROOT=path.resolve(__dirname,"..");
const read=(file)=>fs.readFileSync(path.join(ROOT,file),"utf8");
const json=(file)=>JSON.parse(read(file));
const decode=(text)=>text.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&");
const plainMarkdown=(text)=>text.replace(/`([^`]+)`/g,"$1").replace(/\*\*([^*]+)\*\*/g,"$1").replace(/(?<!\*)\*([^*]+)\*(?!\*)/g,"$1");
const context={document:{addEventListener(){}}};
vm.createContext(context);
vm.runInContext(read("scripts/site_app.js"),context);

// A session must respect its filter, never repeat a question, and leave the bank intact.
const bank=["ox","short","mcq"].flatMap((kind)=>Array.from({length:15},(_,index)=>({id:`${kind}-${index}`,kind})));
const before=JSON.stringify(bank);
for(const kind of ["all","ox","short","mcq"]){
  for(const count of ["5","10","all","100"]){
    const available=kind==="all"?45:15;
    const selected=context.selectQuizQuestions(bank,kind,count,()=>0.25);
    assert.equal(selected.length,count==="all"?available:Math.min(Number(count),available));
    assert.equal(new Set(selected.map((item)=>item.id)).size,selected.length);
    assert(selected.every((item)=>kind==="all"||item.kind===kind));
  }
}
assert.equal(JSON.stringify(bank),before);
assert.equal(context.selectQuizQuestions([],"all","10").length,0);
assert.equal(context.selectQuizQuestions(bank,"missing","all").length,0);
assert.equal(context.selectQuizQuestions(bank,"all","invalid").length,0);
assert.notEqual(context.selectQuizQuestions(bank,"all","all",()=>0).map((q)=>q.id).join(),bank.map((q)=>q.id).join());

const slugIndex=process.argv.indexOf("--slug");
const slug=slugIndex<0?null:process.argv[slugIndex+1];
const readings=json("manifest/readings.json").readings.filter((reading)=>!slug||reading.slug===slug);
assert(readings.length,"No matching readings");
let questionCount=0;
for(const reading of readings){
  const base=`docs/readings/${reading.slug}`;
  const html=read(`${base}/quiz.html`);
  const templates=[...html.matchAll(/<template data-player-question="([^"]+)" data-kind="([^"]+)">([\s\S]*?)<\/template>/g)];
  const meta=json(`${reading.content_dir}/meta.json`);
  const cutoff=json("manifest/readings.json").site.publish_cutoff_date;
  const accessible=meta.workflow_status==="approved"&&(!cutoff||reading.class_date<=cutoff);
  const expected=[];
  for(const kind of ["ox","short","mcq"]){
    const approved=meta.content_status[`quiz_${kind}`]==="approved";
    const payload=json(`${reading.content_dir}/${kind==="short"?"quiz_short":`quiz-${kind}`}.json`);
    if(accessible&&approved)payload.items.forEach((item,index)=>expected.push({id:`quiz-${kind}-${index+1}`,kind,item,language:payload.language||"ko"}));
  }
  assert.equal(templates.length,expected.length,`${reading.slug}: only approved questions may be included`);
  assert.equal(new Set(templates.map((match)=>match[1])).size,templates.length);
  const segments=json(`${reading.content_dir}/source_segments.json`).segments;
  expected.forEach(({id,kind,item,language})=>{
    const match=templates.find((candidate)=>candidate[1]===id);
    assert(match,`${reading.slug}: missing ${id}`);
    assert.equal(match[2],kind);
    const card=decode(match[3]);
    assert(card.includes(item.evidence_segment_id),`${id}: missing original evidence`);
    assert(card.includes(`data-quiz-language="${language}"`),`${id}: wrong quiz language boundary`);
    const segment=segments.find((entry)=>entry.segment_id===item.evidence_segment_id);
    assert(segment,`${id}: unknown source segment`);
    const passage=match[3].match(/<blockquote lang="en">([\s\S]*?)<\/blockquote>/)?.[1];
    assert(passage,`${id}: missing expandable source passage`);
    assert.equal(decode(passage.replace(/<[^>]+>/g," ")).replace(/\s+/g," ").trim(),segment.original_text.replace(/\s+/g," ").trim(),`${id}: original source passage changed`);
    const explanation=match[3].match(/<p><strong>(?:Explanation|해설):<\/strong> ([\s\S]*?)<\/p>/)?.[1];
    assert(explanation,`${id}: explanation is missing`);
    assert.equal(decode(explanation.replace(/<[^>]+>/g,"")),plainMarkdown(item.explanation),`${id}: explanation changed`);
    if(kind==="short"){
      const answers=JSON.parse(decode(match[3].match(/data-accepted-answers="([^"]+)"/)[1]));
      assert.deepEqual(answers,item.accepted_answers,`${id}: accepted answers changed`);
    }else{
      assert.equal(decode(match[3].match(/data-correct-answer="([^"]+)"/)[1]),item.answer);
    }
  });
  if(expected.length){
    assert(/data-question-bank-version="[a-f0-9]{64}"/.test(html),`${reading.slug}: resumable bank needs a content version`);
    for(const action of ["start","resume","reset-saved","skip","exit","retry"]){
      assert(html.includes(`data-player-${action}`),`${reading.slug}: missing ${action} action`);
    }
    assert(/data-player-start disabled/.test(html),`${reading.slug}: start button must wait for client initialization`);
    assert(html.includes("Practice quiz")&&html.includes("Check answer"),`${reading.slug}: English player controls are missing`);
  }
  for(const file of fs.readdirSync(path.join(ROOT,base)).filter((file)=>file.endsWith(".html"))){
    const page=read(`${base}/${file}`);
    const menus=[...page.matchAll(/<nav class="(?:tab-row|mobile-tab-row)"[\s\S]*?<\/nav>/g)];
    assert.equal(menus.length,2,`${reading.slug}/${file}: desktop and mobile menus required`);
    menus.forEach(([menu])=>{
      assert(menu.includes("퀴즈 풀기"),`${file}: missing main quiz tab`);
      assert(!/href="quiz-(?:ox|short|mcq)\.html"/.test(menu),`${file}: old quiz links remain in menu`);
    });
  }
  questionCount+=templates.length;
}
console.log(`PASS quiz player (${readings.length} readings, ${questionCount} original questions; filters, shuffle, answers, evidence and menus)`);
