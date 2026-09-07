const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {JSDOM}=require('jsdom');
const {loadWeeklyConnections}=require('./weekly_connections');
const {assertReflectionCard}=require('./check_weekly_connections');
const root=path.resolve(__dirname,'..');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8').replace(/^\uFEFF/,''));

function run(argv=process.argv.slice(2)){
  const options={week:null};
  for(let i=0;i<argv.length;i++){
    if(argv[i]==='--week')options.week=Number(argv[++i]);
    else throw Error('Unknown option: '+argv[i]);
  }
  const manifest=read('manifest/readings.json');
  const expected=[...new Set(manifest.readings.map(reading=>reading.week))];
  if(options.week!==null)assert(expected.includes(options.week),'Unknown week');
  const reviewed=loadWeeklyConnections(root,manifest);
  const selected=options.week===null?expected:[options.week];
  let first=0,followups=0,artifacts=0;
  for(const number of selected){
    const week=reviewed.find(item=>item.week===number);
    assert(week,`Week ${number}: current source review required`);
    assert.equal(week.schema_version,2,`${week.id}: still uses teacher-question-first practice`);
    assert.equal(week.practice_format,'reflection-followups-v1');
    assert.equal(week.cards.length,6,`${week.id}: six distinct opening perspectives required`);
    assert(week.cards.every(card=>card.followups.length===3),`${week.id}: three replies per opening required`);
    for(const language of ['en','ko']){
      assert.equal(new Set(week.cards.map(card=>card.first_response[language])).size,6,`${week.id}: distinct ${language} openings`);
    }
    const files=[`docs/weeks/${week.id}/index.html`,...week.pair.map(reading=>`docs/readings/${reading.slug}/professor-prep.html`)];
    for(const file of files){
      const dom=new JSDOM(fs.readFileSync(path.join(root,file),'utf8'));
      try{
        const doc=dom.window.document,section=doc.querySelector('[data-weekly-root]');
        assert(section,`${file}: missing shared practice`);
        assert.equal(section.dataset.weeklyId,week.id);
        assert.equal(section.dataset.weeklyVersion,week.revision,`${file}: stale source revision`);
        assert.equal(section.dataset.weeklyFormat,week.practice_format);
        assert.equal(section.querySelectorAll('[data-weekly-first-response]').length,6);
        assert.equal(section.querySelectorAll('.weekly-followup').length,18);
        assert.equal(section.querySelectorAll('.weekly-followup[open]').length,0);
        assert.equal(section.querySelector('.weekly-context').open,false);
        assert.equal(section.querySelector('.weekly-topic-menu').open,false);
        for(const card of week.cards){
          const rendered=doc.getElementById(card.id);assertReflectionCard(rendered,card);
          for(const language of ['en','ko']){
            const opening=rendered.querySelector(`[data-weekly-first-response] [lang="${language}"]`);
            assert.equal(opening.textContent,card.first_response[language]);
            assert.equal(opening.hidden,language==='en');
          }
          assert.equal(rendered.querySelectorAll('.weekly-evidence a').length,card.evidence.length);
        }
        artifacts++;
      }finally{dom.window.close();}
    }
    first+=week.cards.length;followups+=week.cards.reduce((sum,card)=>sum+card.followups.length,0);
    console.log(`PASS ${week.id}: six first statements, eighteen visible followup questions, three matching pages; current review`);
  }
  const baselineFile='tmp/weekly-reflection/baseline.json';
  if(fs.existsSync(path.join(root,baselineFile))){
    const baseline=read(baselineFile);
    for(const [file,digest] of Object.entries(baseline.protectedFiles)){
      const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
      assert.equal(actual,digest,`Protected individual reading or manifest changed: ${file}`);
    }
    console.log(`PASS ${Object.keys(baseline.protectedFiles).length} protected individual-reading and manifest files`);
  }
  console.log(`PASS weekly reflection: ${selected.length} weeks, ${first} first statements, ${followups} followups, ${artifacts} built pages`);
}
if(require.main===module)try{run();}catch(error){console.error(error.message);process.exitCode=1;}
module.exports={run};
