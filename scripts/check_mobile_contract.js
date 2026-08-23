const fs=require("fs");
const path=require("path");

const ROOT=path.resolve(__dirname,"..");
const SITE=path.join(ROOT,"docs");
const CSS_PATH=path.join(ROOT,"scripts","site_styles.css");
const APP_PATH=path.join(ROOT,"scripts","site_app.js");
const MANIFEST_PATH=path.join(ROOT,"manifest","readings.json");

function parseWidths(argv){
  const widths=[];
  for(let index=0;index<argv.length;index+=1){
    if(argv[index]==="--width"&&argv[index+1]){
      widths.push(Number(argv[index+1]));
      index+=1;
    }
  }
  return widths.length?widths:[360,390,430];
}

function walkHtml(directory){
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap((entry)=>{
    const target=path.join(directory,entry.name);
    if(entry.isDirectory())return walkHtml(target);
    return entry.isFile()&&entry.name.endsWith(".html")?[target]:[];
  });
}

function count(text,pattern){
  return (text.match(pattern)||[]).length;
}

function expect(condition,message,errors){
  if(!condition)errors.push(message);
}

function stripTags(value){
  return String(value||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
}

function checkAriaReferences(html,relative,errors){
  const ids=new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g),(match)=>match[1]));
  const seen=new Set();
  for(const id of ids){
    expect(!seen.has(id),`${relative}: duplicate id ${id}`,errors);
    seen.add(id);
  }
  for(const match of html.matchAll(/\baria-(?:labelledby|describedby|controls)="([^"]+)"/g)){
    for(const ref of match[1].split(/\s+/).filter(Boolean)){
      expect(ids.has(ref),`${relative}: unresolved ARIA reference ${ref}`,errors);
    }
  }
}

function checkDetails(html,relative,errors){
  for(const match of html.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/g)){
    expect(/^\s*<summary\b/.test(match[1]),`${relative}: details must begin with summary`,errors);
  }
}

function checkNamedSearches(html,relative,errors){
  for(const match of html.matchAll(/<input\b[^>]*type="search"[^>]*>/g)){
    const tag=match[0];
    expect(/\baria-label="[^"]+"/.test(tag)||/\baria-labelledby="[^"]+"/.test(tag),`${relative}: search input has no accessible name`,errors);
  }
}

function checkDocument(html,filePath,errors){
  const relative=path.relative(ROOT,filePath).replace(/\\/g,"/");
  expect(count(html,/<meta name="viewport" content="width=device-width, initial-scale=1" \/>/g)===1,`${relative}: viewport meta count`,errors);
  expect(/<body\b[^>]*\bdata-page-kind="[^"]+"/.test(html),`${relative}: body data-page-kind missing`,errors);
  expect(count(html,/<main\b/g)===1,`${relative}: main landmark count`,errors);
  expect(count(html,/assets\/styles\.css/g)===1,`${relative}: shared stylesheet count`,errors);
  expect(count(html,/assets\/app\.js/g)===1,`${relative}: shared script count`,errors);
  checkAriaReferences(html,relative,errors);
  checkDetails(html,relative,errors);
  checkNamedSearches(html,relative,errors);

  if(/class="reading-detail-shell"/.test(html)){
    expect(count(html,/class="mobile-tab-row"/g)===1,`${relative}: mobile tab row count`,errors);
    expect(/class="tab[^"\n]* active"[^>]*aria-current="page"/.test(html),`${relative}: active tab must expose aria-current`,errors);
    const headerAt=html.indexOf("reading-detail-header");
    const tabsAt=html.indexOf("mobile-tab-row");
    const panelAt=html.indexOf('class="rpanel"');
    expect(headerAt>=0&&tabsAt>headerAt&&panelAt>tabsAt,`${relative}: header/tab/content DOM order`,errors);
  }
}

function checkHome(html,manifest,errors){
  const expected=manifest.readings.length;
  expect(count(html,/data-reading-card(?:="")?/g)===expected,`home: expected ${expected} reading cards`,errors);
  expect(count(html,/data-home-rail-item(?:="")?/g)===expected,`home: expected ${expected} rail items`,errors);
  expect(count(html,/class="rcard-mobile-eyebrow"/g)===expected,`home: expected ${expected} mobile card eyebrows`,errors);
  expect(count(html,/<img\b[^>]*width="360"[^>]*height="360"[^>]*loading="(?:eager|lazy)"[^>]*decoding="async"/g)===expected,`home: responsive thumbnail attributes`,errors);
  expect(count(html,/loading="eager"/g)===1,"home: exactly one eager thumbnail",errors);
  expect(count(html,/fetchpriority="high"/g)===1,"home: exactly one high-priority thumbnail",errors);
  expect(count(html,/loading="lazy"/g)===Math.max(0,expected-1),"home: remaining thumbnails must be lazy",errors);
  expect(/<h1 class="sr-only">[^<]+<\/h1>/.test(html),"home: page h1 missing",errors);
  expect(/class="filter-chip-row" role="group" aria-label="읽기 유형 필터"/.test(html),"home: filter chip group missing",errors);
  expect(/type="search" aria-label="[^"]+"/.test(html),"home: search accessible name missing",errors);
  expect(!/<details class="rail"[^>]*\sopen(?:\s|>)/.test(html),"home: schedule rail must be closed in initial mobile HTML",errors);

  const railAt=html.indexOf('class="rail"');
  const heroAt=html.indexOf('class="hero"');
  const filterAt=html.indexOf('class="filter-row"');
  const gridAt=html.indexOf('class="reading-grid"');
  expect(railAt>=0&&heroAt>railAt&&filterAt>heroAt&&gridAt>filterAt,"home: rail/hero/filter/grid DOM order",errors);

  for(const match of html.matchAll(/<a class="card-link rcard[^"]*"[\s\S]*?<\/a>|<button class="card-link rcard[^"]*"[\s\S]*?<\/button>/g)){
    expect(stripTags(match[0]).length>0,"home: card has no accessible text",errors);
  }
}

function contractRule(block,selectorFragment,declarations,errors){
  const selector=selectorFragment.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const rule=new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\}`,"g");
  const bodies=Array.from(block.matchAll(rule),(match)=>match[1]);
  expect(bodies.length>0,`CSS contract selector missing: ${selectorFragment}`,errors);
  if(!bodies.length)return;
  expect(bodies.some((body)=>declarations.every((declaration)=>declaration.test(body))),`CSS contract declarations missing for ${selectorFragment}: ${declarations.join(", ")}`,errors);
}

function checkCss(widths,errors){
  const css=fs.readFileSync(CSS_PATH,"utf8");
  const startMarker="/* mobile-contract:start";
  const endMarker="/* mobile-contract:end */";
  const start=css.indexOf(startMarker);
  const end=css.indexOf(endMarker);
  expect(start>=0&&end>start,"CSS mobile contract markers missing",errors);
  expect(css.slice(end+endMarker.length).trim()==="","CSS mobile contract must remain the final stylesheet layer",errors);
  if(start<0||end<0)return;
  const block=css.slice(start,end+endMarker.length);

  expect(/@media\s*\(max-width:560px\)/.test(block),"CSS <=560px contract media query missing",errors);
  contractRule(block,".topbar",[/flex-direction:\s*row/,/min-height:\s*60px/],errors);
  contractRule(block,".topbar-actions .ghost-btn",[/min-height:\s*44px/],errors);
  contractRule(block,".home-dashboard .workspace-mockup-card",[/display:\s*none/],errors);
  contractRule(block,".home-dashboard [data-home-controls]",[/grid-template-columns:\s*minmax\(0,1fr\)/],errors);
  contractRule(block,".filter-chip-row",[/display:\s*flex/,/overflow-x:\s*auto/],errors);
  contractRule(block,".home-dashboard .filter-chip",[/min-height:\s*44px/],errors);
  contractRule(block,".home-dashboard .reading-grid",[/grid-template-columns:\s*minmax\(0,1fr\)/],errors);
  contractRule(block,".card-link.rcard",[/grid-template-columns:\s*clamp\(6\.5rem,28vw,7rem\)\s+minmax\(0,1fr\)/,/min-block-size:\s*7rem/],errors);
  contractRule(block,".rcard-thumb",[/aspect-ratio:\s*1/],errors);
  contractRule(block,".rcard-thumb.is-sticker img",[/object-fit:\s*contain/,/padding:\s*0/],errors);
  contractRule(block,".reading-detail-shell .tab-row",[/display:\s*none/],errors);
  contractRule(block,".reading-detail-shell .mobile-tab-row",[/display:\s*flex/,/overflow-x:\s*auto/],errors);
  contractRule(block,".reading-detail-shell .mobile-tab-row .tab",[/min-height:\s*44px/,/white-space:\s*nowrap/],errors);
  contractRule(block,'body[data-reading-layout="reader-v2"] .reader-detail-side',[/order:\s*-1/],errors);
  contractRule(block,'body[data-reading-layout="reader-v2"] .reader-toc-panel .toc-list',[/max-height:\s*10rem/,/overflow-y:\s*auto/],errors);
  contractRule(block,'body[data-reading-layout="reader-v2"] .article-body',[/font-size:\s*calc\(1rem\s*\*\s*var\(--reader-font-scale\)\)/],errors);

  for(const width of widths){
    expect(Number.isFinite(width)&&width>=320&&width<=560,`unsupported contract width: ${width}`,errors);
    const outerWidth=width-24;
    const thumbnail=Math.min(112,Math.max(104,width*.28));
    const textWidth=outerWidth-16-10-thumbnail;
    expect(textWidth>=185,`${width}px: card text column is only ${textWidth.toFixed(1)}px`,errors);
  }
}

function checkClientLogic(errors){
  const app=fs.readFileSync(APP_PATH,"utf8");
  expect(/function\s+initMobileTabs\s*\(/.test(app)&&/\binitMobileTabs\(\);/.test(app),"client: mobile active-tab centering is not initialized",errors);
  expect(/querySelector\("\.rcard-mobile-eyebrow"\)/.test(app)&&/mobileState\.className=`rcard-mobile-state \$\{state\}`/.test(app),"client: dynamic current-reading state does not update mobile cards",errors);
  const builtApp=fs.readFileSync(path.join(SITE,"assets","app.js"),"utf8");
  expect(builtApp.replace(/\r\n/g,"\n")===app.replace(/\r\n/g,"\n"),"docs/assets/app.js is stale; rebuild the site",errors);
}

function main(){
  const widths=parseWidths(process.argv.slice(2));
  const errors=[];
  const manifest=JSON.parse(fs.readFileSync(MANIFEST_PATH,"utf8"));
  const pages=walkHtml(SITE);
  expect(pages.length>0,"docs: no generated HTML pages",errors);
  pages.forEach((filePath)=>checkDocument(fs.readFileSync(filePath,"utf8"),filePath,errors));
  const homePath=path.join(SITE,"index.html");
  checkHome(fs.readFileSync(homePath,"utf8"),manifest,errors);
  checkCss(widths,errors);
  checkClientLogic(errors);
  if(errors.length)throw new Error(`Mobile contract failed\n  ${errors.join("\n  ")}`);
  console.log(`[mobile-contract] ${pages.length} HTML pages passed at ${widths.join("/")}px; ${manifest.readings.length} home cards verified`);
}

main();
