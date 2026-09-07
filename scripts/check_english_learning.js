const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {buildValidationSnapshot,PAGE_STATUS}=require("./validate_content");

const ROOT=path.resolve(__dirname,"..");
const REQUIRED_PAGES=Object.freeze([
  {key:"quiz-ox",statusKey:"quiz_ox",file:"quiz-ox.json"},
  {key:"quiz-short",statusKey:"quiz_short",file:"quiz_short.json"},
  {key:"quiz-mcq",statusKey:"quiz_mcq",file:"quiz-mcq.json"},
  {key:"professor-prep",statusKey:"professor_prep",file:"professor_prep.json"},
]);
const readJson=(file)=>JSON.parse(fs.readFileSync(file,"utf8").replace(/^\uFEFF/,""));
const text=(value)=>typeof value==="string"?value.trim():"";

function checkEnglishReading(rootDir,reading){
  const errors=[];
  const contentDir=path.resolve(rootDir,reading.content_dir||"");
  const payloads=new Map();
  for(const page of REQUIRED_PAGES){
    try{
      const payload=readJson(path.join(contentDir,page.file));
      if(!payload||typeof payload!=="object"||Array.isArray(payload)){
        errors.push(`${page.file}: root must be a JSON object`);
        continue;
      }
      payloads.set(page.key,payload);
      // This assertion is unconditional: an absent/changed tag must not bypass English validation.
      if(payload.language!=="en")errors.push(`${page.file}: language must equal "en" (found ${JSON.stringify(payload.language)??"missing"})`);
    }catch(error){errors.push(`${page.file}: ${error.message}`);}
  }

  const knownSegments=new Map();
  try{
    const source=readJson(path.join(contentDir,"source_segments.json"));
    if(!Array.isArray(source?.segments)||!source.segments.length)errors.push("source_segments.json: at least one source segment is required");
    for(const [index,segment] of (Array.isArray(source?.segments)?source.segments:[]).entries()){
      const id=text(segment?.segment_id);
      if(!id){errors.push(`source_segments.json: segment ${index+1} has no segment_id`);continue;}
      if(knownSegments.has(id))errors.push(`source_segments.json: duplicate segment_id ${id}`);
      knownSegments.set(id,segment);
    }
  }catch(error){errors.push(`source_segments.json: ${error.message}`);}

  let questionCount=0;
  let prepCardCount=0;
  for(const page of REQUIRED_PAGES){
    const payload=payloads.get(page.key);
    if(!payload)continue;
    const items=page.key==="professor-prep"
      ?[...(Array.isArray(payload.cards)?payload.cards:[]),...(Array.isArray(payload.reading_response?.cards)?payload.reading_response.cards:[])]
      :(Array.isArray(payload.items)?payload.items:[]);
    if(page.key==="professor-prep")prepCardCount+=items.length;
    else questionCount+=items.length;
    items.forEach((item,index)=>{
      if(page.key==="professor-prep"){
        for(const field of ["title_ko","answer_30s_ko"]){
          if(!/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/.test(text(item?.[field])))errors.push(`${page.file}: item ${index+1} ${field} must contain Korean text for bilingual publication`);
        }
      }
      const id=text(item?.evidence_segment_id);
      const segment=knownSegments.get(id);
      if(!id||!segment)errors.push(`${page.file}: item ${index+1} must reference an existing evidence_segment_id (found ${JSON.stringify(id)})`);
      else if(!text(segment.original_text))errors.push(`${page.file}: item ${index+1} references an empty source passage (${id})`);
    });
  }

  try{
    const metaPath=path.join(contentDir,"meta.json");
    const meta=fs.existsSync(metaPath)?readJson(metaPath):{};
    const snapshot=buildValidationSnapshot(rootDir,reading,meta,{requireBuiltArtifacts:false});
    const sourceResults=snapshot.validation_status?.source_page_results||{};
    for(const page of REQUIRED_PAGES){
      const result=sourceResults[page.statusKey];
      if(!result){errors.push(`${page.file}: missing source validation result`);continue;}
      if(![PAGE_STATUS.SCHEMA_PASS,PAGE_STATUS.APPROVED].includes(result.status))errors.push(`${page.file}: source schema status is ${result.status}`);
      if(!Array.isArray(result.errors))errors.push(`${page.file}: source validation errors array is missing`);
      else result.errors.forEach((error)=>errors.push(`${page.file}: ${error}`));
    }
  }catch(error){errors.push(`source-only validation could not complete: ${error.message}`);}

  return{slug:reading.slug,questionCount,prepCardCount,errors:[...new Set(errors)]};
}

function checkEnglishLearning(rootDir=ROOT,slugs=[]){
  const manifest=readJson(path.join(rootDir,"manifest","readings.json"));
  const readings=manifest?.readings;
  if(!Array.isArray(readings)||!readings.length)throw new Error("manifest must contain at least one reading");
  const knownSlugs=new Set(readings.map((reading)=>reading.slug));
  if(knownSlugs.size!==readings.length)throw new Error("manifest contains duplicate reading slugs");
  for(const slug of slugs)if(!knownSlugs.has(slug))throw new Error(`Unknown slug: ${slug}`);
  return readings.filter((reading)=>!slugs.length||slugs.includes(reading.slug)).map((reading)=>checkEnglishReading(rootDir,reading));
}

function runSelfTests(){
  // Use real validated schemas as the fixture baseline; copy JSON only, never PDFs or public assets.
  const baselineReading=readJson(path.join(ROOT,"manifest","readings.json")).readings[0];
  assert(baselineReading,"A manifest reading is required for the schema fixture");
  const baselineDir=path.join(ROOT,baselineReading.content_dir);
  const baseline=Object.fromEntries([...REQUIRED_PAGES.map((page)=>page.file),"source_segments.json"].map((file)=>[file,readJson(path.join(baselineDir,file))]));
  // Preserve the validated bilingual text, including synchronized experience slots.
  // Generic Korean replacements would invalidate reflection cards before a scenario runs.
  const temporaryRoot=fs.mkdtempSync(path.join(os.tmpdir(),"aaf-english-learning-"));
  const fixtureReading={...baselineReading,slug:"english-gate-fixture",content_dir:"content/fixture",translation_original_reveal:{enabled:false}};
  const fixtureDir=path.join(temporaryRoot,fixtureReading.content_dir);
  let scenarios=0;
  const write=(file,payload)=>fs.writeFileSync(path.join(fixtureDir,file),`${JSON.stringify(payload,null,2)}\n`,"utf8");
  try{
    fs.mkdirSync(fixtureDir,{recursive:true});
    fs.mkdirSync(path.join(temporaryRoot,"manifest"));
    fs.writeFileSync(path.join(temporaryRoot,"manifest","readings.json"),JSON.stringify({readings:[fixtureReading]}),"utf8");
    write("meta.json",{});
    const restore=()=>Object.entries(baseline).forEach(([file,payload])=>write(file,payload));
    const inspect=()=>checkEnglishLearning(temporaryRoot)[0].errors;
    restore();
    assert.deepEqual(inspect(),[],"valid English fixture must pass without built artifacts or approval metadata");
    scenarios++;
    for(const page of REQUIRED_PAGES){
      for(const language of [undefined,"ko"]){
        restore();
        const payload=structuredClone(baseline[page.file]);
        if(language===undefined)delete payload.language;
        else payload.language=language;
        write(page.file,payload);
        assert(inspect().some((error)=>error.startsWith(`${page.file}: language must equal`)),`${page.file}: missing or Korean language tag must fail`);
        scenarios++;
      }
      restore();
      const payload=structuredClone(baseline[page.file]);
      if(page.key==="professor-prep")payload.cards[0].answer_30s="한국어로 되돌아간 모델 답변입니다.";
      else payload.items[0].explanation="한국어로 되돌아간 문항 해설입니다.";
      write(page.file,payload);
      assert(inspect().some((error)=>error.includes("must contain English text")),`${page.file}: English tag must not hide Korean content`);
      scenarios++;
    }
    restore();
    const untranslated=structuredClone(baseline["professor_prep.json"]);
    for(const card of [...untranslated.cards,...untranslated.reading_response.cards]){delete card.title_ko;delete card.answer_30s_ko;}
    write("professor_prep.json",untranslated);
    assert(inspect().some((error)=>error.includes("Korean text for bilingual publication")),"legacy English-only prep cannot pass the publication gate");
    scenarios++;
    for(const field of ["title_ko","answer_30s_ko"]){
      restore();
      const incomplete=structuredClone(baseline["professor_prep.json"]);
      delete incomplete.cards[0][field];
      write("professor_prep.json",incomplete);
      assert(inspect().some((error)=>error.includes(`${field} must contain Korean text`)),`publication requires each ${field}`);
      scenarios++;
    }
    restore();
    const unknown=structuredClone(baseline["quiz-ox.json"]);
    unknown.items[0].evidence_segment_id="UNKNOWN-SEGMENT";
    write("quiz-ox.json",unknown);
    assert(inspect().some((error)=>error.includes("UNKNOWN-SEGMENT")),"unknown source IDs must fail");
    scenarios++;
    restore();
    const noPassage=structuredClone(baseline["source_segments.json"]);
    const referenced=baseline["quiz-ox.json"].items[0].evidence_segment_id;
    noPassage.segments.find((segment)=>segment.segment_id===referenced).original_text="";
    write("source_segments.json",noPassage);
    assert(inspect().some((error)=>error.includes("empty source passage")),"an ID without a source passage must fail");
    scenarios++;
    restore();
    const invalidSchema=structuredClone(baseline["quiz_short.json"]);
    invalidSchema.items.pop();
    write("quiz_short.json",invalidSchema);
    assert(inspect().some((error)=>error.includes("exactly 15 items")),"source-only schema failures must fail the gate");
    scenarios++;
    restore();
    assert.throws(()=>checkEnglishLearning(temporaryRoot,["unknown-reading"]),/Unknown slug/);
    scenarios++;
  }finally{
    const relative=path.relative(path.resolve(os.tmpdir()),path.resolve(temporaryRoot));
    if(relative.startsWith("..")||path.isAbsolute(relative)||!path.basename(temporaryRoot).startsWith("aaf-english-learning-"))throw new Error("Refusing to remove an unexpected fixture directory");
    fs.rmSync(temporaryRoot,{recursive:true,force:true});
  }
  return scenarios;
}

function parseArgs(argv){
  const options={slugs:[],json:false,selfTest:false};
  for(let index=0;index<argv.length;index++){
    const token=argv[index];
    if(token==="--slug"){
      const slug=argv[++index];
      if(!slug||slug.startsWith("--"))throw new Error("--slug requires a reading slug");
      options.slugs.push(slug);
    }else if(token==="--json")options.json=true;
    else if(token==="--self-test")options.selfTest=true;
    else throw new Error(`Unknown option: ${token}`);
  }
  if(options.selfTest&&(options.slugs.length||options.json))throw new Error("--self-test must be used on its own");
  return options;
}

function main(argv=process.argv.slice(2)){
  const options=parseArgs(argv);
  if(options.selfTest){console.log(`PASS English learning gate fixtures (${runSelfTests()} regression scenarios)`);return 0;}
  const results=checkEnglishLearning(ROOT,options.slugs);
  const failures=results.filter((result)=>result.errors.length);
  if(options.json)console.log(JSON.stringify({passed:!failures.length,results},null,2));
  else if(failures.length){
    console.error(`FAIL English learning gate (${failures.length} / ${results.length} readings)`);
    failures.forEach(({slug,errors})=>errors.forEach((error)=>console.error(`  ${slug}: ${error}`)));
  }else console.log(`PASS English learning gate (${results.length} readings, ${results.length*REQUIRED_PAGES.length} English JSON files, ${results.reduce((sum,result)=>sum+result.questionCount,0)} questions, ${results.reduce((sum,result)=>sum+result.prepCardCount,0)} bilingual prep cards; source schemas and evidence IDs verified)`);
  return failures.length?1:0;
}

module.exports={REQUIRED_PAGES,checkEnglishReading,checkEnglishLearning,runSelfTests,main};
if(require.main===module){
  try{process.exitCode=main();}catch(error){console.error(`FAIL English learning gate: ${error.message}`);process.exitCode=1;}
}
