const fs=require("fs");
const path=require("path");
const crypto=require("node:crypto");

const {PAGE_STATUS,READING_STATUS,buildValidationSnapshot,mergeValidationFields}=require("./validate_content");
const {writeApprovalStatusReport}=require("./approval_status");
const {normalizeTranslationOriginalRevealConfig,parseMarkdownDocument,resolveTranslationAlignment}=require("./translation_original_reveal");
const {validateSentencePairs}=require("./sentence_alignment");

const rootDir=path.resolve(__dirname,"..");
const manifestPath=path.join(rootDir,"manifest","readings.json");
let siteDir=path.join(rootDir,"docs");
let allowDraftPreview=false;
const styleSource=path.join(__dirname,"site_styles.css");
const appSource=path.join(__dirname,"site_app.js");
const brandLogoSource=path.join(__dirname,"assets","branding","snu.png");
const LANDING_TAB_LABEL="개요";
const THUMBNAIL_SOURCE_CANDIDATES=["thumbnail.png","thumbnail.jpg","thumbnail.jpeg","thumbnail.webp","thumbnail.svg"];
const READING_LAYOUT_PAGE_KEYS=new Set(["full","translation"]);
const PRESERVED_DOC_MARKDOWN_DIRS=["guides","references"];

const PAGE_DEFS=[
  {key:"summary",label:"핵심 요약",filename:"summary.html",type:"article",description:"읽기 전 전체 흐름을 빠르게 잡는 요약 페이지입니다."},
  {key:"full",label:"본문 읽기",filename:"full.html",type:"article",description:"정리된 본문을 읽기 편한 글 레이아웃으로 제공합니다."},
  {key:"translation",label:"번역본 읽기",filename:"translation.html",type:"article",description:"영문 읽기 자료를 한국어로 다시 따라갈 수 있는 번역 페이지입니다.",englishOnly:true},
  {key:"concepts",label:"핵심 개념",filename:"concepts.html",type:"article",description:"핵심 개념과 용어를 빠르게 복습하는 페이지입니다."},
  {key:"pitfalls",label:"헷갈리는 포인트",filename:"pitfalls.html",type:"article",description:"헷갈리기 쉬운 구분과 자주 틀리는 포인트를 정리하는 페이지입니다."},
  {key:"quiz-ox",label:"OX 퀴즈",filename:"quiz-ox.html",type:"quiz",description:"맞다/틀리다 형식으로 핵심 내용을 점검하는 퀴즈입니다."},
  {key:"quiz-short",label:"단답형 퀴즈",filename:"quiz-short.html",type:"quiz",description:"한 용어, 이름, 숫자, 짧은 구로만 답하는 진짜 단답형 퀴즈입니다."},
  {key:"quiz-mcq",label:"객관식 퀴즈",filename:"quiz-mcq.html",type:"quiz",description:"선지를 비교하며 이해를 점검하는 객관식 퀴즈입니다."},
  {key:"review-sheet",label:"시험 직전 정리",filename:"review-sheet.html",type:"article",description:"시험 직전에 빠르게 훑을 수 있도록 압축한 정리 페이지입니다."},
  {key:"professor-prep",label:"읽기 답변 준비",filename:"professor-prep.html",type:"professor-prep",description:"이 글을 어떻게 읽었는지 바로 말할 수 있도록 답변을 정리하는 페이지입니다."}
];
const ALL_PAGE_KEYS=PAGE_DEFS.map((page)=>page.key);

const COMMON_TEXT_MAP={
  "Filename-derived placeholder metadata.":"파일명 기준으로 만든 임시 메타데이터입니다.",
  "Placeholder record created from the source filename only.":"현재 로컬 파일명만 기준으로 만든 임시 기록입니다.",
  "Placeholder record created from the source filename only. Chapter title, author, and language need confirmation.":"현재 로컬 파일명만 기준으로 만든 임시 기록입니다. 장 제목, 저자, 언어는 추가 확인이 필요합니다.",
  "Title is copied from the filename.":"제목은 현재 파일명 기준으로만 입력되어 있습니다.",
  "Author metadata is not available from the filename.":"파일명만으로는 저자 정보를 확인할 수 없습니다.",
  "Language is not confirmed from the filename alone.":"파일명만으로는 언어를 확정할 수 없습니다.",
  "Metadata incomplete":"메타데이터 미완료",
  "Filename only":"파일명 기준",
  "Chapter PDF":"교재 PDF",
  "Article PDF":"기사 PDF",
  "Paper PDF":"논문 PDF"
};

const SHORT_ANSWER_TYPES=new Set(["term","person","number","short_phrase"]);
const SHORT_ANSWER_TYPE_LABELS={term:"용어",person:"인물",number:"숫자",short_phrase:"짧은 구"};
const PROFESSOR_FOLLOWUP_BANK=["그게 뭐야?","왜 그렇게 보는데?","뭐가 새로웠는데?","다시 말해봐.","그게 왜 중요한데?","연구에서는 뭐라고 하는데?","한국에서는 어떻게 보이는데?","그 설명의 한계는 뭐야?"];
const PROFESSOR_STYLE={
  prefers:["질문에서 묻는 핵심을 먼저 한 문장으로 바로 답하기","핵심 개념을 자기 말로 분명하게 정의하기","비슷한 개념과 무엇이 다른지 구분하기","추상어 대신 읽기의 연구설계·변수·결과를 근거로 들기","가족 또는 한국 사회에 적용할 때는 구체적으로 연결하기","반론이나 한계를 짧게 인정하고 다시 핵심으로 돌아오기"],
  avoids:["흥미롭다, 복잡하다, 다양하다처럼 내용 없는 형용사만 반복하기","질문과 다른 이야기로 새어나가기","읽기 근거 없이 교과서식 정의만 길게 말하기","무조건 '상황에 따라 다르다'고 끝내기","AI 문장처럼 균일하고 밋밋한 표현만 늘어놓기"]
};
const PREP_EXTRA_VARIANTS=["importance","korea","limit","evidence"];
const PREP_TARGET_CARD_COUNT=12;

function readText(filePath){return fs.readFileSync(filePath,"utf8").replace(/^\uFEFF/,"");}
function writeText(filePath,text){const normalized=String(text).replace(/[ \t]+(?=\r?$)/gm,"").replace(/(?:\r?\n)+$/,"\n");fs.mkdirSync(path.dirname(filePath),{recursive:true});fs.writeFileSync(filePath,normalized,"utf8");}
function collectMarkdownFiles(dirPath){if(!fs.existsSync(dirPath))return[];return fs.readdirSync(dirPath,{withFileTypes:true}).flatMap((entry)=>{const entryPath=path.join(dirPath,entry.name);if(entry.isDirectory())return collectMarkdownFiles(entryPath);return entry.isFile()&&entry.name.toLowerCase().endsWith(".md")?[entryPath]:[];});}
function snapshotPreservedDocMarkdown(){return PRESERVED_DOC_MARKDOWN_DIRS.flatMap((dirName)=>{const baseDir=path.join(siteDir,dirName);return collectMarkdownFiles(baseDir).map((filePath)=>({relativePath:path.relative(siteDir,filePath),content:readText(filePath)}));});}
function restorePreservedDocMarkdown(snapshot){(Array.isArray(snapshot)?snapshot:[]).forEach((entry)=>writeText(path.join(siteDir,entry.relativePath),entry.content));}
function loadManifest(){return JSON.parse(readText(manifestPath));}
function relHref(fromPath,toPath){return path.relative(path.dirname(fromPath),toPath).split(path.sep).join("/");}
function versionedAssetHref(outputPath,filename){const assetPath=path.join(siteDir,"assets",filename);const version=crypto.createHash("sha256").update(fs.readFileSync(assetPath)).digest("hex").slice(0,12);return `${relHref(outputPath,assetPath)}?v=${version}`;}
function escapeHtml(value){return String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#39;");}
function renderInline(text){return escapeHtml(text).replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/(?<!\*)\*([^*]+)\*(?!\*)/g,"<em>$1</em>");}
function slugifyHeading(value){return String(value||"").toLowerCase().trim().replace(/[^a-z0-9\uac00-\ud7a3\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")||"section";}
function stripHtml(value){return String(value||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();}
function isSupplementFigureLabel(value){return /^(table|figure)\s+\d+(?:[\s.:_-].*)?$|^(표|그림)\s*\d+(?:[\s.:_-].*)?$/i.test(toText(value));}
function isReaderMetaHeading(value){return /^(editor'?s note(?: and author information)?|편집자 주(?: 및 저자 정보)?)$/i.test(toText(value));}
function isReaderBackmatterHeading(value){return /^(references|publication history|참고문헌|출판 이력)$/i.test(toText(value));}
function figureKindForAsset(caption,assetTarget){
  const label=toText(caption)||path.basename(toText(assetTarget)).toLowerCase();
  if(/^(table)\b|^(표)\b/i.test(label)||/table-\d+/i.test(label))return"table";
  if(/^(figure)\b|^(그림)\b/i.test(label)||/figure-\d+/i.test(label))return"figure";
  return"media";
}
function usesReadingLayout(page){return READING_LAYOUT_PAGE_KEYS.has(page.key);}
function translationOriginalRevealPath(reading){
  const config=normalizeTranslationOriginalRevealConfig(reading.translation_original_reveal);
  if(!config.enabled)return"";
  const translationSourcePath=contentPath(reading,{key:"translation",type:"article"});
  return path.join(path.dirname(translationSourcePath),config.alignment_file);
}
function hasApprovedStageStatus(reading,stageKey){
  return toText(reading.validation_status?.[stageKey]?.status)===READING_STATUS.APPROVED;
}
function hasApprovedPageSourceStatus(reading,pageKey){
  const sourceStatus=toText(reading.validation_status?.source_page_results?.[pageKey]?.status);
  const fallbackStatus=toText(reading.validation_status?.page_results?.[pageKey]?.status);
  const status=sourceStatus||fallbackStatus;
  return status===PAGE_STATUS.APPROVED||(allowDraftPreview&&status===PAGE_STATUS.SCHEMA_PASS);
}
function shouldUseTranslationOriginalReveal(reading,page){
  const config=normalizeTranslationOriginalRevealConfig(reading.translation_original_reveal);
  return page.key==="translation"
    &&reading.language==="en"
    &&config.enabled
    &&hasApprovedPageSourceStatus(reading,"full")
    &&hasApprovedPageSourceStatus(reading,"translation");
}
function revealSummaryLabel(reveal){
  if(reveal?.unit==="sentence_group")return "이 문단의 전체 원문 보기";
  if(reveal?.unit==="context_block")return "이 문단의 전체 원문 보기";
  return "이 문단의 전체 원문 보기";
}
function normalizeEnabledPageKeys(rawKeys,language){
  const fallback=ALL_PAGE_KEYS.filter((key)=>language==="en"||key!=="translation");
  if(!Array.isArray(rawKeys))return fallback;
  const allowed=new Set(fallback);
  const selected=rawKeys.map((item)=>toText(item)).filter((item)=>allowed.has(item));
  return selected.length?fallback.filter((key)=>selected.includes(key)):fallback;
}
function enabledPageKeys(reading){return normalizeEnabledPageKeys(reading.enabled_page_keys,reading.language||"unknown");}
function isPageEnabledForReading(reading,pageKey){return enabledPageKeys(reading).includes(pageKey);}

function resolveReadingAssetHref(outputPath,reading,sourcePath,assetPath){
  const rawPath=toText(assetPath);
  if(!rawPath)return "";
  if(isExternalUrl(rawPath))return rawPath;
  const contentDir=path.join(rootDir,reading.content_dir);
  const sourceDir=path.dirname(sourcePath);
  const absoluteSource=path.resolve(sourceDir,rawPath);
  const relativeWithinContent=path.relative(contentDir,absoluteSource);
  if(relativeWithinContent.startsWith(".."))return "";
  const targetPath=path.join(siteDir,"assets","readings",reading.slug,relativeWithinContent);
  return relHref(outputPath,targetPath);
}

function extractReaderTocItems(html){
  const items=[];
  const headingPattern=/<h([234])([^>]*)>([\s\S]*?)<\/h\1>/g;
  let match;
  while((match=headingPattern.exec(String(html||"")))!==null){
    const [,level,attrs,innerHtml]=match;
    if(/data-reader-toc="false"/.test(attrs))continue;
    const idMatch=attrs.match(/\bid="([^"]+)"/);
    if(!idMatch)continue;
    const text=stripHtml(innerHtml);
    if(!text)continue;
    items.push({level:Number(level),id:idMatch[1],text});
  }
  return items;
}

function renderReaderToc(html){
  const items=extractReaderTocItems(html);
  if(!items.length)return `<p class="meta">본문 목차가 아직 없습니다.</p>`;
  return items.map((item)=>`<a class="toc-link toc-h${item.level}" href="#${escapeHtml(item.id)}" data-reader-toc-link>${escapeHtml(item.text)}</a>`).join("");
}

function isHiddenReaderFrontmatterLine(line){
  const normalized=toText(line).trim().replace(/^>\s*/,"").replace(/^-\s*/,"");
  if(!normalized)return false;
  return /source_pdfs\//i.test(normalized);
}

function isMarkdownCommentLine(line){return /^<!--[\s\S]*-->$/.test(toText(line).trim());}
function isMarkdownHeadingLine(line){return /^#{1,6}\s/.test(toText(line).trim());}
function isMarkdownFigureLine(line){return /^!\[[^\]]*\]\(([^)]+)\)$/.test(toText(line).trim());}
function isMarkdownListLine(line){return /^-\s+/.test(toText(line).trim());}
function isMarkdownQuoteLine(line){return /^>/.test(toText(line).trim());}
function isMarkdownFenceLine(line){return /^```/.test(toText(line).trim());}
function isMarkdownStructuralLine(line){
  const trimmed=toText(line).trim();
  if(!trimmed)return false;
  return isMarkdownCommentLine(trimmed)
    ||isMarkdownHeadingLine(trimmed)
    ||isMarkdownFigureLine(trimmed)
    ||isMarkdownListLine(trimmed)
    ||isMarkdownQuoteLine(trimmed)
    ||isMarkdownFenceLine(trimmed);
}
function isPlainMarkdownTextLine(line){
  const trimmed=toText(line).trim();
  return Boolean(trimmed)&&!isMarkdownStructuralLine(trimmed);
}
function isLikelyStandaloneShortLine(line){
  const trimmed=toText(line).trim();
  return trimmed.length>0&&trimmed.length<=30;
}
function isStandalonePlainLine(line){
  const trimmed=toText(line).trim();
  return isLikelyStandaloneShortLine(trimmed)
    ||/^출처[:：]/.test(trimmed)
    ||(/[=<>]/.test(trimmed)&&trimmed.length<=80);
}
function endsStrongParagraph(line){
  const trimmed=toText(line).trim();
  if(!trimmed)return true;
  if(/^출처[:：]/.test(trimmed))return true;
  const stripped=trimmed.replace(/[)"'’”\]」』〉》]+$/g,"");
  return /[.!?。！？…:]$/.test(stripped);
}
function firstToken(line){return toText(line).trim().split(/\s+/)[0]||"";}
function lastToken(line){
  const tokens=toText(line).trim().split(/\s+/).filter(Boolean);
  return tokens[tokens.length-1]||"";
}
function shouldJoinWithoutSpace(prev,next){
  const prevTrim=toText(prev).trim();
  const nextTrim=toText(next).trim();
  if(!prevTrim||!nextTrim)return false;
  if(prevTrim.endsWith("-"))return true;
  const prevToken=lastToken(prevTrim);
  const nextToken=firstToken(nextTrim);
  if(/[A-Za-z0-9]$/.test(prevTrim)&&/^[A-Za-z0-9]/.test(nextTrim)){
    if(prevToken.length<=4||nextToken.length<=4||/^[a-z]/.test(nextTrim))return true;
  }
  if(/[가-힣]$/.test(prevTrim)&&/^[가-힣]/.test(nextTrim)){
    const prevWord=prevToken.replace(/[^가-힣]/g,"");
    const nextWord=nextToken.replace(/[^가-힣]/g,"");
    if(!prevWord||!nextWord)return false;
    if(nextWord.length===1)return true;
    if(/^(가|고|과|구|기|길|나|는|니|다|던|되|도|든|듯|라|려|로|를|며|면|명|밖|보|산|상|서|성|스럽|시|신|실|아|어|여|였|와|요|우|으|은|을|의|이|인|임|자|적|전|정|조|주|지|진|질|처|하|한|할|함|해|했|형|화|회)/.test(nextWord))return true;
  }
  return false;
}
function mergeWrappedPlainLines(lines){
  let merged="";
  lines.forEach((line)=>{
    const trimmed=toText(line).trim();
    if(!trimmed)return;
    if(!merged){merged=trimmed;return;}
    merged+=`${shouldJoinWithoutSpace(merged,trimmed)?"":" "}${trimmed}`;
  });
  return merged;
}
function nextPlainTextLine(lines,startIndex){
  for(let i=startIndex;i<lines.length;i+=1){
    const trimmed=toText(lines[i]).trim();
    if(!trimmed||isMarkdownCommentLine(trimmed))continue;
    if(isPlainMarkdownTextLine(trimmed))return trimmed;
    return "";
  }
  return "";
}
function normalizeWrappedMarkdownSegment(lines){
  const paragraphs=[];
  let current=[];
  lines.forEach((line,index)=>{
    const trimmed=toText(line).trim();
    if(!trimmed||isMarkdownCommentLine(trimmed)){
      const nextLine=nextPlainTextLine(lines,index+1);
      const prevLine=current[current.length-1]||"";
      if(current.length&&nextLine&&!endsStrongParagraph(prevLine)&&!isStandalonePlainLine(prevLine)&&!/^출처[:：]/.test(nextLine))return;
      if(current.length){
        paragraphs.push(mergeWrappedPlainLines(current));
        current=[];
      }
      return;
    }
    if(isPlainMarkdownTextLine(trimmed)){
      current.push(trimmed);
    }
  });
  if(current.length)paragraphs.push(mergeWrappedPlainLines(current));
  return paragraphs.filter(Boolean);
}
function shouldNormalizeWrappedMarkdown(reading,page){
  return page?.key==="full"&&reading?.type==="chapter"&&reading?.language==="ko";
}
function normalizeWrappedMarkdownForRender(text,reading,page){
  if(!shouldNormalizeWrappedMarkdown(reading,page))return text;
  const rawLines=toText(text).replace(/\r\n/g,"\n").split("\n");
  const output=[];
  let buffer=[];
  let inCode=false;
  const flushBuffer=()=>{
    if(!buffer.length)return;
    const normalized=normalizeWrappedMarkdownSegment(buffer);
    if(normalized.length){
      if(output.length&&output[output.length-1]!==""&&normalized[0]!==""&& !isMarkdownStructuralLine(output[output.length-1]))output.push("");
      normalized.forEach((paragraph,index)=>{
        if(index>0)output.push("");
        output.push(paragraph);
      });
    }
    buffer=[];
  };
  rawLines.forEach((line)=>{
    const trimmed=toText(line).trim();
    if(inCode){
      output.push(line);
      if(isMarkdownFenceLine(trimmed))inCode=false;
      return;
    }
    if(isMarkdownFenceLine(trimmed)){
      flushBuffer();
      output.push(line);
      inCode=true;
      return;
    }
    if(isMarkdownCommentLine(trimmed)||!trimmed||isPlainMarkdownTextLine(trimmed)){
      buffer.push(line);
      return;
    }
    flushBuffer();
    if(output.length&&output[output.length-1]!==""&&trimmed)output.push("");
    output.push(line);
  });
  flushBuffer();
  return output.join("\n").replace(/\n{3,}/g,"\n\n");
}

function markdownToHtml(text,options={}){
  const lines=text.replace(/\r\n/g,"\n").split("\n");
  const parts=[];
  const frontmatterParts=[];
  let paragraph=[];
  let listItems=[];
  let listKind="ul";
  let orderedListStart=1;
  let quoteLines=[];
  let codeLines=null;
  const outputPath=options.outputPath||"";
  const reading=options.reading||null;
  const sourcePath=options.sourcePath||"";
  const skipFirstTitleHeading=Boolean(options.skipFirstTitleHeading);
  const collectFrontmatter=Boolean(options.collectFrontmatter);
  const suppressFigureCaptions=Boolean(options.suppressFigureCaptions);
  const usedHeadingIds=new Set();
  let skippedTitleHeading=false;
  let encounteredContentHeading=false;

  const pushBlock=(html,preferFrontmatter=false)=>{
    if(collectFrontmatter&&preferFrontmatter&&!encounteredContentHeading){
      frontmatterParts.push(html);
      return;
    }
    parts.push(html);
  };
  const flushParagraph=()=>{if(paragraph.length){pushBlock(`<p>${renderInline(paragraph.join(" ").trim())}</p>`,true);paragraph=[];}};
  const flushList=()=>{if(listItems.length){const start=listKind==="ol"&&orderedListStart!==1?` start="${orderedListStart}"`:"";pushBlock(`<${listKind}${start}>${listItems.map((item)=>`<li>${renderInline(item)}</li>`).join("")}</${listKind}>`,true);listItems=[];listKind="ul";orderedListStart=1;}};
  const appendListItem=(kind,item,start=1)=>{if(listItems.length&&listKind!==kind)flushList();if(!listItems.length){listKind=kind;orderedListStart=start;}listItems.push(item);};
  const flushQuote=()=>{if(quoteLines.length){pushBlock(`<blockquote>${renderInline(quoteLines.join(" ").trim())}</blockquote>`,true);quoteLines=[];}};
  const flushCode=()=>{if(codeLines){pushBlock(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`,true);codeLines=null;}};
  const parseTableRow=(value)=>{
    const trimmed=toText(value);
    if(!trimmed.includes("|"))return[];
    const body=trimmed.replace(/^\|/,"").replace(/\|$/,"");
    return body.split("|").map((cell)=>cell.trim());
  };
  const tableDividerCells=(value)=>{
    const cells=parseTableRow(value);
    return cells.length>=2&&cells.every((cell)=>/^:?-{3,}:?$/.test(cell))?cells:[];
  };
  const tableAlignmentClass=(divider)=>divider.startsWith(":")&&divider.endsWith(":")?" is-center":divider.endsWith(":")?" is-right":"";
  const renderTable=(headers,dividers,rows)=>{
    const renderCells=(cells,tag)=>headers.map((_,index)=>`<${tag}${tag==="th"?' scope="col"':""} class="${tableAlignmentClass(dividers[index]||"").trim()}">${renderInline(cells[index]||"")}</${tag}>`).join("");
    return `<div class="article-table-wrap" role="region" aria-label="표" tabindex="0"><table><thead><tr>${renderCells(headers,"th")}</tr></thead><tbody>${rows.map((row)=>`<tr>${renderCells(row,"td")}</tr>`).join("")}</tbody></table></div>`;
  };
  const headingAttrs=(textLabel)=>{
    const attrs=[];
    const classes=[];
    const baseId=slugifyHeading(textLabel);
    let id=baseId;
    let suffix=2;
    while(usedHeadingIds.has(id))id=`${baseId}-${suffix++}`;
    usedHeadingIds.add(id);
    attrs.push(`id="${escapeHtml(id)}"`);
    if(isReaderMetaHeading(textLabel)){
      attrs.push('data-reader-toc="false"');
      classes.push("article-meta-heading");
    }
    if(isReaderBackmatterHeading(textLabel)){
      attrs.push('data-reader-toc="false"');
      classes.push("article-backmatter-heading");
    }
    if(classes.length)attrs.push(`class="${escapeHtml(classes.join(" "))}"`);
    return attrs.length?` ${attrs.join(" ")}`:"";
  };
  const renderFigure=(line)=>{
    const match=line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if(!match)return "";
    const caption=match[1].trim();
    const assetTarget=match[2].trim();
    const href=reading&&outputPath&&sourcePath?resolveReadingAssetHref(outputPath,reading,sourcePath,assetTarget):assetTarget;
    if(!href)return "";
    const figureKind=figureKindForAsset(caption,assetTarget);
    const captionHtml=!suppressFigureCaptions&&caption?`<figcaption>${renderInline(caption)}</figcaption>`:"";
    return `<figure class="article-figure is-${escapeHtml(figureKind)}"><a class="article-figure-link" href="${escapeHtml(href)}" target="_blank" rel="noopener"><img src="${escapeHtml(href)}" alt="${escapeHtml(caption)}" loading="lazy" /></a>${captionHtml}<p class="article-figure-action"><a href="${escapeHtml(href)}" target="_blank" rel="noopener">크게 보기</a></p></figure>`;
  };
  const pushHeading=(level,textLabel)=>{
    encounteredContentHeading=true;
    if(isSupplementFigureLabel(textLabel)){
      parts.push(`<p class="article-inline-label" data-reader-toc="false">${renderInline(textLabel)}</p>`);
      return;
    }
    parts.push(`<h${level}${headingAttrs(textLabel)}>${renderInline(textLabel)}</h${level}>`);
  };

  for(let lineIndex=0;lineIndex<lines.length;lineIndex+=1){
    const rawLine=lines[lineIndex];
    if(codeLines){
      if(rawLine.trim().startsWith("```")){flushCode();continue;}
      codeLines.push(rawLine);
      continue;
    }
    const line=rawLine.trim();
    if(!line){flushParagraph();flushList();flushQuote();continue;}
    if(/^<!--[\s\S]*-->$/.test(line)){flushParagraph();flushList();flushQuote();continue;}
    if(line===">"){flushParagraph();flushList();flushQuote();continue;}
    if(collectFrontmatter&&!encounteredContentHeading&&isHiddenReaderFrontmatterLine(line)){flushParagraph();flushList();flushQuote();continue;}
    if(line.startsWith("```")){flushParagraph();flushList();flushQuote();codeLines=[];continue;}
    const dividerCells=tableDividerCells(lines[lineIndex+1]||"");
    const headerCells=parseTableRow(line);
    if(headerCells.length>=2&&headerCells.length===dividerCells.length){
      flushParagraph();flushList();flushQuote();
      const rows=[];
      let nextIndex=lineIndex+2;
      while(nextIndex<lines.length){
        const rowLine=lines[nextIndex].trim();
        if(!rowLine)break;
        const rowCells=parseTableRow(rowLine);
        if(rowCells.length!==headerCells.length)break;
        rows.push(rowCells);
        nextIndex+=1;
      }
      pushBlock(renderTable(headerCells,dividerCells,rows));
      lineIndex=nextIndex-1;
      continue;
    }
    const figureHtml=renderFigure(line);
    if(figureHtml){flushParagraph();flushList();flushQuote();pushBlock(figureHtml,true);continue;}
    if(line.startsWith("#### ")){flushParagraph();flushList();flushQuote();pushHeading(4,line.slice(5));continue;}
    if(line.startsWith("### ")){flushParagraph();flushList();flushQuote();pushHeading(3,line.slice(4));continue;}
    if(line.startsWith("## ")){flushParagraph();flushList();flushQuote();pushHeading(2,line.slice(3));continue;}
    if(line.startsWith("# ")){
      flushParagraph();
      flushList();
      flushQuote();
      if(skipFirstTitleHeading&&!skippedTitleHeading){skippedTitleHeading=true;continue;}
      pushHeading(1,line.slice(2));
      continue;
    }
    if(line.startsWith("- ")){flushParagraph();flushQuote();appendListItem("ul",line.slice(2).trim());continue;}
    const orderedListMatch=line.match(/^(\d+)\.\s+(.+)$/);
    if(orderedListMatch){flushParagraph();flushQuote();appendListItem("ol",orderedListMatch[2].trim(),Number(orderedListMatch[1]));continue;}
    if(line.startsWith("> ")){flushParagraph();flushList();quoteLines.push(line.slice(2).trim());continue;}
    flushList();flushQuote();paragraph.push(line);
  }

  flushParagraph();flushList();flushQuote();flushCode();
  return(frontmatterParts.length?[`<div class="article-frontmatter">${frontmatterParts.join("\n")}</div>`,...parts]:parts).join("\n");
}
function renderArticleBlock(block,options={}){
  if(!block||typeof block!=="object")return"";
  const outputPath=options.outputPath||"";
  const reading=options.reading||null;
  const sourcePath=options.sourcePath||"";
  const suppressFigureCaptions=Boolean(options.suppressFigureCaptions);
  if(block.type==="paragraph")return `<p>${renderInline(block.text)}</p>`;
  if(block.type==="list")return `<ul>${(Array.isArray(block.items)?block.items:[]).map((item)=>`<li>${renderInline(item)}</li>`).join("")}</ul>`;
  if(block.type==="quote")return `<blockquote>${renderInline(block.text)}</blockquote>`;
  if(block.type==="code")return `<pre><code>${escapeHtml(block.text||"")}</code></pre>`;
  if(block.type==="inline_label")return `<p class="article-inline-label" data-reader-toc="false">${renderInline(block.text)}</p>`;
  if(block.type==="heading"){
    const attrs=[];
    if(block.id)attrs.push(`id="${escapeHtml(block.id)}"`);
    if(block.tocExcluded)attrs.push('data-reader-toc="false"');
    if(Array.isArray(block.classes)&&block.classes.length)attrs.push(`class="${escapeHtml(block.classes.join(" "))}"`);
    return `<h${block.level}${attrs.length?` ${attrs.join(" ")}`:""}>${renderInline(block.text)}</h${block.level}>`;
  }
  if(block.type==="figure"){
    const caption=toText(block.caption);
    const href=reading&&outputPath&&sourcePath?resolveReadingAssetHref(outputPath,reading,sourcePath,block.assetTarget):block.assetTarget;
    if(!href)return"";
    const figureKind=figureKindForAsset(caption,block.assetTarget);
    const captionHtml=!suppressFigureCaptions&&caption?`<figcaption>${renderInline(caption)}</figcaption>`:"";
    return `<figure class="article-figure is-${escapeHtml(figureKind)}"><a class="article-figure-link" href="${escapeHtml(href)}" target="_blank" rel="noopener"><img src="${escapeHtml(href)}" alt="${escapeHtml(caption)}" loading="lazy" /></a>${captionHtml}<p class="article-figure-action"><a href="${escapeHtml(href)}" target="_blank" rel="noopener">크게 보기</a></p></figure>`;
  }
  return"";
}
function renderRevealSourceHtml(text){
  return String(text||"").split(/\n{2,}/).map((paragraph)=>paragraph.trim()).filter(Boolean).map((paragraph)=>`<p>${renderInline(paragraph)}</p>`).join("");
}
function renderTranslationSentencePairs(reveal){
  return reveal.sentencePairs.map((pair)=>{
    const pairId=toText(pair.id);
    const popoverId=`${pairId}-source`;
    return `<span class="translation-sentence-pair" data-sentence-pair><button class="translation-sentence" type="button" aria-expanded="false" aria-controls="${escapeHtml(popoverId)}" data-source-sentence data-pair-id="${escapeHtml(pairId)}" data-translation-text="${escapeHtml(pair.ko_text)}" data-source-text="${escapeHtml(pair.source_text)}">${renderInline(pair.ko_text)}</button><span class="sentence-source-popover" id="${escapeHtml(popoverId)}" role="region" aria-label="영어 원문" lang="en" data-source-popover hidden>${renderInline(pair.source_text)}</span></span>`;
  }).join(" ");
}
function renderParsedArticleDocument(document,options={}){
  const frontmatterBlocks=Array.isArray(document?.frontmatterBlocks)?document.frontmatterBlocks:[];
  const contentBlocks=Array.isArray(document?.blocks)?document.blocks:[];
  const revealByFlatIndex=options.revealByFlatIndex instanceof Map?options.revealByFlatIndex:new Map();
  const frontmatterHtml=frontmatterBlocks.length?`<div class="article-frontmatter">${frontmatterBlocks.map((block)=>renderArticleBlock(block,options)).join("\n")}</div>`:"";
  const contentHtml=contentBlocks.map((block,flatIndex)=>{
    const blockHtml=renderArticleBlock(block,options);
    if(!blockHtml)return"";
    const reveal=revealByFlatIndex.get(flatIndex);
    if(!reveal||block.type!=="paragraph")return blockHtml;
    const sentenceHtml=Array.isArray(reveal.sentencePairs)&&reveal.sentencePairs.length?`<p class="translation-sentence-paragraph">${renderTranslationSentencePairs(reveal)}</p>`:blockHtml;
    return `<section class="translation-segment original-translation-pair source-segment-anchor" id="${escapeHtml(reveal.id)}" data-segment-id="${escapeHtml(reveal.id)}" data-reveal-unit="${escapeHtml(reveal.unit||"paragraph")}">${sentenceHtml}<details class="source-reveal original-toggle"><summary class="source-reveal-summary">${escapeHtml(revealSummaryLabel(reveal))}</summary><div class="source-reveal-body" lang="en">${renderRevealSourceHtml(reveal.sourceText)}</div></details></section>`;
  }).join("\n");
  const sentenceHint=revealByFlatIndex.size?`<aside class="translation-sentence-hint" aria-label="문장별 원문 사용법"><strong>문장별 원문</strong><span>한국어 문장을 클릭하거나 누르면 바로 아래에 영어 원문이 펼쳐집니다. 다시 누르거나 Esc 키를 누르면 닫힙니다. 키보드에서는 Tab으로 문장을 선택한 뒤 Enter 또는 Space를 누르세요.</span></aside>`:"";
  return[sentenceHint,frontmatterHtml,contentHtml].filter(Boolean).join("\n");
}
function buildTranslationOriginalRevealHtml(reading,page,outputPath,text){
  const alignmentPath=translationOriginalRevealPath(reading);
  const alignmentPayload=alignmentPath?loadJson(alignmentPath):null;
  if(!alignmentPayload)throw new Error(`[missing] ${reading.slug}: translation original reveal is enabled but alignment file is missing`);
  const translationDocument=parseMarkdownDocument(text,{skipFirstTitleHeading:true,collectFrontmatter:true});
  const fullSourcePath=contentPath(reading,{key:"full",type:"article"});
  const fullText=loadMarkdown(fullSourcePath);
  if(!fullText)throw new Error(`[missing] ${reading.slug}: translation original reveal requires full.md`);
  const originalDocument=parseMarkdownDocument(fullText,{skipFirstTitleHeading:true,collectFrontmatter:true});
  const resolved=resolveTranslationAlignment(alignmentPayload,translationDocument,originalDocument,{allowedStatuses:["verified"]});
  if(resolved.errors.length)throw new Error(`[invalid] ${reading.slug}: translation original reveal alignment failed\n${resolved.errors.join("\n")}`);
  const rawEntryById=new Map((Array.isArray(alignmentPayload.entries)?alignmentPayload.entries:[]).map((entry)=>[entry.id,entry]));
  const sentenceErrors=[];
  const resolvedWithSentences=resolved.entries.map((entry)=>{
    const rawEntry=rawEntryById.get(entry.id);
    const sentencePairs=Array.isArray(rawEntry?.sentence_pairs)?rawEntry.sentence_pairs:[];
    sentenceErrors.push(...validateSentencePairs({
      id:entry.id,
      translationText:entry.translationBlock?.text||entry.translationBlock?.plainText||"",
      sourceText:entry.sourceText,
      pairs:sentencePairs
    },{allowedStatuses:["verified"]}));
    return{...entry,sentencePairs};
  });
  if(sentenceErrors.length)throw new Error(`[invalid] ${reading.slug}: sentence-level original reveal failed\n${sentenceErrors.join("\n")}`);
  const revealByFlatIndex=new Map(resolvedWithSentences.map((entry)=>[entry.translationBlock.flatIndex,entry]));
  return renderParsedArticleDocument(translationDocument,{outputPath,reading,sourcePath:page.sourcePath,suppressFigureCaptions:true,revealByFlatIndex});
}

function loadMarkdown(filePath){if(!fs.existsSync(filePath))return null;const text=readText(filePath).trim();return text||null;}
function loadJson(filePath){if(!fs.existsSync(filePath))return null;return JSON.parse(readText(filePath));}
function fileLabel(filePath){return path.relative(rootDir,filePath).split(path.sep).join("/");}
function toText(value){return typeof value==="string"?value.trim():"";}
function textArray(value){return(Array.isArray(value)?value:[value]).map((item)=>toText(item)).filter(Boolean);}
function wordCount(value){return toText(value).split(/\s+/).filter(Boolean).length;}
function truncateWords(value,maxWords){const words=toText(value).replace(/\s+/g," ").split(" ").filter(Boolean);if(words.length<=maxWords)return words.join(" ");return `${words.slice(0,maxWords).join(" ")}…`;}
function sentenceList(value){return toText(value).replace(/\s+/g," ").split(/(?<=[.!?])\s+/).map((item)=>item.trim()).filter(Boolean);}
function cleanQuestionLabel(value){return toText(value).replace(/[?？]\s*$/,"");}
function requireText(value,label,filePath){const text=toText(value);if(!text)throw new Error(`[invalid] ${fileLabel(filePath)}: ${label} is required`);return text;}
function loadOverviewComic(contentDir){
  const filePath=path.join(rootDir,contentDir,"overview_comic.json");
  const payload=loadJson(filePath);
  if(!payload)return null;
  if(!payload||typeof payload!=="object"||Array.isArray(payload))throw new Error(`[invalid] ${fileLabel(filePath)}: root must be an object`);
  const title=requireText(payload.title,"title",filePath);
  const intro=requireText(payload.intro,"intro",filePath);
  const rawPanels=Array.isArray(payload.panels)?payload.panels:[];
  if(rawPanels.length!==4)throw new Error(`[invalid] ${fileLabel(filePath)}: panels must contain exactly 4 items`);
  const contentPath=path.dirname(filePath);
  const panelIds=new Set();
  const panels=rawPanels.map((panel,index)=>{
    if(!panel||typeof panel!=="object"||Array.isArray(panel))throw new Error(`[invalid] ${fileLabel(filePath)}: panels[${index}] must be an object`);
    const panel_id=requireText(panel.panel_id,`panels[${index}].panel_id`,filePath);
    if(panelIds.has(panel_id))throw new Error(`[invalid] ${fileLabel(filePath)}: duplicate panel_id ${panel_id}`);
    panelIds.add(panel_id);
    const image=requireText(panel.image,`panels[${index}].image`,filePath).replace(/\\/g,"/");
    if(isExternalUrl(image)||path.isAbsolute(image))throw new Error(`[invalid] ${fileLabel(filePath)}: panels[${index}].image must be a local relative path`);
    const imagePath=path.resolve(contentPath,...image.split("/"));
    const relativeImagePath=path.relative(contentPath,imagePath);
    if(!relativeImagePath||relativeImagePath.startsWith("..")||path.isAbsolute(relativeImagePath))throw new Error(`[invalid] ${fileLabel(filePath)}: panels[${index}].image escapes the reading content directory`);
    if(!fs.existsSync(imagePath))throw new Error(`[missing] ${fileLabel(filePath)}: panels[${index}].image not found (${image})`);
    const width=Number(panel.width);
    const height=Number(panel.height);
    if(!Number.isInteger(width)||width<=0||!Number.isInteger(height)||height<=0)throw new Error(`[invalid] ${fileLabel(filePath)}: panels[${index}] width and height must be positive integers`);
    if(Object.prototype.hasOwnProperty.call(panel,"dialogues"))throw new Error(`[invalid] ${fileLabel(filePath)}: panels[${index}].dialogues is no longer supported; use caption`);
    const evidence_segment_ids=textArray(panel.evidence_segment_ids);
    if(!evidence_segment_ids.length)throw new Error(`[invalid] ${fileLabel(filePath)}: panels[${index}].evidence_segment_ids must be non-empty`);
    return{
      panel_id,
      label:requireText(panel.label,`panels[${index}].label`,filePath),
      image,
      width,
      height,
      alt:requireText(panel.alt,`panels[${index}].alt`,filePath),
      caption:requireText(panel.caption,`panels[${index}].caption`,filePath),
      detail:requireText(panel.detail,`panels[${index}].detail`,filePath),
      limit:requireText(panel.limit,`panels[${index}].limit`,filePath),
      evidence_segment_ids
    };
  });
  return{title,intro,panels};
}
function professorPrepAnswerText(card){return toText(card.answer_30s||card.answer||card.model_answer);}
function usesLegacyProfessorPrepAnswer(card){return!toText(card.answer_30s)&&!!toText(card.answer||card.model_answer);}
function loadQuiz(page,filePath){
  const payload=loadJson(filePath);
  if(!payload)return null;
  const items=Array.isArray(payload.items)?payload.items:[];
  if(!items.length)return null;
  const segments=loadJson(path.join(path.dirname(filePath),"source_segments.json"))?.segments||[];
  const normalizeEvidence=(item)=>({
    language:payload.language||"ko",
    evidence_segment:segments.find((segment)=>segment.segment_id===item.evidence_segment_id)||null,
    source:toText(item.source),
    evidence_segment_id:toText(item.evidence_segment_id),
    difficulty:toText(item.difficulty),
    misconception_targeted:toText(item.misconception_targeted)
  });
  if(page.key==="quiz-short"){
    if(items.length!==15)throw new Error(`[invalid] ${fileLabel(filePath)}: quiz_short.json must contain exactly 15 items`);
    const normalizedItems=items.map((item,index)=>{
      const question=requireText(item.question,`items[${index}].question`,filePath);
      const accepted_answers=textArray(item.accepted_answers);
      const answer_type=requireText(item.answer_type,`items[${index}].answer_type`,filePath);
      const explanation=requireText(item.explanation,`items[${index}].explanation`,filePath);
      if(!accepted_answers.length)throw new Error(`[invalid] ${fileLabel(filePath)}: items[${index}].accepted_answers must be a non-empty array`);
      if(!SHORT_ANSWER_TYPES.has(answer_type))throw new Error(`[invalid] ${fileLabel(filePath)}: items[${index}].answer_type must be one of ${Array.from(SHORT_ANSWER_TYPES).join(", ")}`);
      accepted_answers.forEach((answer,answerIndex)=>{if(wordCount(answer)>7)throw new Error(`[invalid] ${fileLabel(filePath)}: items[${index}].accepted_answers[${answerIndex}] must stay under 8 words`);});
      return{question,accepted_answers,answer_type,explanation,...normalizeEvidence(item)};
    });
    return{...payload,items:normalizedItems};
  }
  const normalizedItems=items.map((item,index)=>{
    const prompt=requireText(item.prompt,`items[${index}].prompt`,filePath);
    const answer=requireText(item.answer,`items[${index}].answer`,filePath);
    const explanation=requireText(item.explanation,`items[${index}].explanation`,filePath);
    const options=Array.isArray(item.options)?item.options.map((option)=>toText(option)).filter(Boolean):[];
    return{prompt,answer,explanation,options,...normalizeEvidence(item)};
  });
  return{...payload,items:normalizedItems};
}
function normalizeProfessorPrepCards(cards,filePath,label){
  return(Array.isArray(cards)?cards:[]).map((card,index)=>{
    if(!card||typeof card!=="object")throw new Error(`[invalid] ${fileLabel(filePath)}: ${label}[${index}] must be an object`);
    const fallbackTitle=cleanQuestionLabel(card.question);
    const title=requireText(card.title||fallbackTitle,`${label}[${index}].title`,filePath);
    if(usesLegacyProfessorPrepAnswer(card))console.warn(`[legacy] ${fileLabel(filePath)}: ${label}[${index}] should rename answer/model_answer to answer_30s`);
    const answer_30s=requireText(professorPrepAnswerText(card),`${label}[${index}].answer_30s`,filePath);
    return{
      ...card,
      card_id:toText(card.card_id),
      title,
      answer_30s,
      evidence_segment_id:toText(card.evidence_segment_id)
    };
  });
}
function loadProfessorPrep(filePath){
  const payload=loadJson(filePath);
  if(!payload)return null;
  const cards=normalizeProfessorPrepCards(payload.cards,filePath,"cards");
  if(!cards.length)return null;
  const responsePayload=payload.reading_response&&typeof payload.reading_response==="object"?payload.reading_response:{};
  const responseCards=normalizeProfessorPrepCards(responsePayload.cards,filePath,"reading_response.cards");
  return{
    language:payload.language||"ko",
    title:toText(payload.title)||"읽기 답변 준비",
    instructions:toText(payload.instructions)||"교수님이 바로 이어 물을 수 있는 질문에 30초 안으로 답하는 연습입니다.",
    cards,
    reading_response:{
      title:toText(responsePayload.title)||"“어떻게 읽었어요?” 답변 준비",
      instructions:toText(responsePayload.instructions)||"읽기 전 생각, 달라진 관점, 구체적 근거와 한계를 자기 말로 연결합니다.",
      cards:responseCards
    }
  };
}
function translateCommonText(text){return COMMON_TEXT_MAP[text]||text;}
function loadReadingMeta(contentDir){const metaPath=path.join(rootDir,contentDir,"meta.json");const payload=loadJson(metaPath);return payload&&typeof payload==="object"?payload:{};}
function detectReadingThumbnailSource(contentDir){const baseDir=path.join(rootDir,contentDir);for(const filename of THUMBNAIL_SOURCE_CANDIDATES){const candidate=path.join(baseDir,filename);if(fs.existsSync(candidate))return candidate;}return"";}
function readingPdfVisibility(reading,supplemental={}){return toText(reading.pdf_visibility||supplemental.pdf_visibility)||(toText(reading.public_pdf)?"public":"none");}
function detectType(reading){if(reading.type)return reading.type;const kind=String(reading.kind||"").toLowerCase();if(kind.includes("chapter"))return"chapter";if(kind.includes("paper"))return"paper";if(kind.includes("article"))return"article";return"reading";}
function typeLabel(type){return({article:"기사",paper:"논문",chapter:"교재",reading:"읽기 자료"})[type]||"읽기 자료";}
function yearLabel(year){return year?`${year}년`:"연도 미확인";}
function languageLabel(language){return({en:"영어",ko:"한국어",unknown:"미확인"})[language]||String(language||"").toUpperCase();}
function authorsLabel(authors){return authors&&authors.length?authors.join(", "):"저자 정보 미확인";}
function kindLabel(kind,type){const normalized=String(kind||"").trim().toLowerCase();if(!normalized){return type==="chapter"?"교재 PDF":type==="paper"?"논문 PDF":type==="article"?"기사 PDF":"읽기 자료 PDF";}if(normalized==="chapter pdf")return"교재 PDF";if(normalized==="paper pdf")return"논문 PDF";if(normalized==="article pdf")return"기사 PDF";return translateCommonText(kind);}
function translateTag(tag){return translateCommonText(tag);}
function firstValue(...values){for(const value of values){if(value===null||value===undefined)continue;const text=String(value).trim();if(text)return text;}return"";}
function effectiveSortDate(reading){return firstValue(reading.sort_date,reading.reading_date,reading.class_date);}
function displayDateLabel(reading){return firstValue(reading.display_date_label,reading.reading_date,reading.class_date,reading.sort_date)||"날짜 미정";}
function publishCutoffDate(siteMeta={}){return toText(siteMeta.publish_cutoff_date);}
function publishCutoffNote(siteMeta={}){return toText(siteMeta.publish_cutoff_note);}
function isReleaseLockedByCutoff(sortDate,publishCutoff){return Boolean(publishCutoff&&sortDate&&sortDate>publishCutoff);}
function sharedPageKeys(reading){return(Array.isArray(reading.shared_page_keys)?reading.shared_page_keys:[]).map((item)=>toText(item)).filter(Boolean);}
function pageSourceFilename(page){if(page.key==="full")return"full.md";if(page.key==="translation")return"translation.md";if(page.key==="review-sheet")return"review-sheet.md";if(page.key==="professor-prep")return"professor_prep.json";if(page.key==="quiz-short")return"quiz_short.json";return page.type==="article"?`${page.key}.md`:`${page.key}.json`;}
function sharedPageSourcePath(reading,page){const bundle=toText(reading.shared_page_bundle);if(!bundle||!sharedPageKeys(reading).includes(page.key))return"";return path.join(rootDir,"content","shared-study",bundle,pageSourceFilename(page));}
function chapterNumberLabel(reading){
  if(reading.type!=="chapter")return"";
  return reading.week?`${reading.week}주차 핸드북 장`:"핸드북 장";
}
function cardAuthorLabel(reading){
  if(!(Array.isArray(reading.authors)&&reading.authors.length))return"";
  if(reading.type==="chapter"&&reading.authors.length>1)return `${reading.authors[0]} 외`;
  return reading.authors_label;
}
function cardMetaLabel(reading){
  if(reading.type==="chapter"){
    return [chapterNumberLabel(reading),reading.language_label,reading.year?`${reading.year}년`:"출간연도 미확인"].filter(Boolean).join(" · ");
  }
  return [reading.type_label,reading.language_label,reading.year?reading.year_label:null].filter(Boolean).join(" · ");
}
function statusKeyForPage(pageKey){return pageKey.replace(/-/g,"_");}
function isReadyStatus(status){return status===PAGE_STATUS.SCHEMA_PASS||status===PAGE_STATUS.APPROVED;}
function validationStatusForPage(snapshot,pageKey,available){const key=statusKeyForPage(pageKey);const status=snapshot?.content_status?.[key];if(status)return status;return available?PAGE_STATUS.SCHEMA_PASS:PAGE_STATUS.MISSING;}
function sourceValidationStatusForPage(snapshot,pageKey,available){const key=statusKeyForPage(pageKey);const status=snapshot?.validation_status?.source_page_results?.[key]?.status;if(status)return status;return validationStatusForPage(snapshot,pageKey,available);}
function landingStatus(reading){return reading.validation_status?.landing?.status||PAGE_STATUS.SCHEMA_FAIL;}
function isApprovedStatus(status){return status===PAGE_STATUS.APPROVED;}
function isPublishedReading(reading){return reading.workflow_status===READING_STATUS.APPROVED;}
function isReleaseLockedReading(reading){return reading.release_locked===true;}
function hasApprovedReadingPage(reading){return Array.isArray(reading.pages)&&reading.pages.some((page)=>page.review_passed);}
function isBlockedReading(reading){return reading.workflow_status===READING_STATUS.BLOCKED;}
function isSourceApprovedPage(page){return page?.source_review_passed===true||page?.source_validation_status===PAGE_STATUS.APPROVED||(allowDraftPreview&&page?.source_validation_status===PAGE_STATUS.SCHEMA_PASS);}
function hasApprovedSourceReadingPage(reading){return Array.isArray(reading.pages)&&reading.pages.some((page)=>isSourceApprovedPage(page));}
function isAccessibleReading(reading){
  if(isBlockedReading(reading)||isReleaseLockedReading(reading))return false;
  return isPublishedReading(reading)||hasApprovedSourceReadingPage(reading)||isApprovedStatus(landingStatus(reading));
}
function canRenderPageContent(reading,page){return isAccessibleReading(reading)&&isSourceApprovedPage(page);}
function preferredReadingPage(reading){
  if(!Array.isArray(reading.pages))return null;
  const priority=["full","translation","summary","concepts","pitfalls","review-sheet","professor-prep","quiz-ox","quiz-short","quiz-mcq"];
  const approvedPages=reading.pages.filter((page)=>page.review_passed);
  if(!approvedPages.length)return null;
  return [...approvedPages].sort((a,b)=>{
    const aIndex=priority.indexOf(a.key);
    const bIndex=priority.indexOf(b.key);
    const safeA=aIndex===-1?Number.MAX_SAFE_INTEGER:aIndex;
    const safeB=bIndex===-1?Number.MAX_SAFE_INTEGER:bIndex;
    return safeA-safeB;
  })[0];
}
function readingEntryTarget(reading){
  if(!isAccessibleReading(reading))return "";
  if(isApprovedStatus(landingStatus(reading)))return "index.html";
  const page=preferredReadingPage(reading);
  return page?page.filename:"index.html";
}
function contentPath(reading,page){const sharedPath=sharedPageSourcePath(reading,page);if(sharedPath)return sharedPath;const contentDir=path.join(rootDir,reading.content_dir);if(page.key==="full"){const preferred=path.join(contentDir,"full.md");const fallback=path.join(contentDir,"cleaned.md");return fs.existsSync(preferred)?preferred:(fs.existsSync(fallback)?fallback:preferred);}if(page.key==="quiz-short")return path.join(contentDir,"quiz_short.json");if(page.key==="professor-prep")return path.join(contentDir,"professor_prep.json");if(page.type==="article")return path.join(contentDir,`${page.key}.md`);return path.join(contentDir,`${page.key}.json`);}
function pageState(reading,page,snapshot=null){const sourcePath=contentPath(reading,page);if(page.type==="article"){const available=Boolean(loadMarkdown(sourcePath));const validation_status=validationStatusForPage(snapshot,page.key,available);const source_validation_status=sourceValidationStatusForPage(snapshot,page.key,available);return{sourcePath,available,count:null,validation_status,source_validation_status,schema_passed:isReadyStatus(validation_status),review_passed:validation_status===PAGE_STATUS.APPROVED,source_review_passed:source_validation_status===PAGE_STATUS.APPROVED};}if(page.type==="professor-prep"){const prep=loadProfessorPrep(sourcePath);const available=Boolean(prep);const validation_status=validationStatusForPage(snapshot,page.key,available);const source_validation_status=sourceValidationStatusForPage(snapshot,page.key,available);return{sourcePath,available,count:prep?prep.cards.length:0,validation_status,source_validation_status,schema_passed:isReadyStatus(validation_status),review_passed:validation_status===PAGE_STATUS.APPROVED,source_review_passed:source_validation_status===PAGE_STATUS.APPROVED};}const quiz=loadQuiz(page,sourcePath);const available=Boolean(quiz);const validation_status=validationStatusForPage(snapshot,page.key,available);const source_validation_status=sourceValidationStatusForPage(snapshot,page.key,available);return{sourcePath,available,count:quiz?quiz.items.length:0,validation_status,source_validation_status,schema_passed:isReadyStatus(validation_status),review_passed:validation_status===PAGE_STATUS.APPROVED,source_review_passed:source_validation_status===PAGE_STATUS.APPROVED};}
function pageByKey(reading,pageKey){return Array.isArray(reading.pages)?reading.pages.find((page)=>page.key===pageKey)||null:null;}
function hasAvailablePage(reading,pageKey){const page=pageByKey(reading,pageKey);return Boolean(page&&page.available);}
function hasApprovedSourcePage(reading,pageKey){const page=pageByKey(reading,pageKey);return Boolean(page&&isApprovedStatus(page.source_validation_status));}
function localTodayIsoDate(){const now=new Date();const month=String(now.getMonth()+1).padStart(2,"0");const day=String(now.getDate()).padStart(2,"0");return `${now.getFullYear()}-${month}-${day}`;}
function currentReadingSlugs(readings,today=localTodayIsoDate(),publishCutoff=""){
  const upcoming=(Array.isArray(readings)?readings:[])
    .filter((reading)=>toText(reading.class_date)&&reading.class_date>=today&&(!publishCutoff||reading.class_date<=publishCutoff))
    .sort((a,b)=>a.class_date.localeCompare(b.class_date)||a.sequence-b.sequence);
  return upcoming.filter((reading)=>reading.class_date===upcoming[0].class_date).map((reading)=>reading.slug);
}
function readingFilterGroup(reading){if(reading.type==="chapter")return"chapter";if(reading.type==="article")return"article";return"paper";}
function readingProgress(reading){const read=Boolean(["summary","full","translation"].some((pageKey)=>hasAvailablePage(reading,pageKey)))?1:0;const concepts=hasAvailablePage(reading,"concepts")?1:0;const quizAvailableCount=["quiz-ox","quiz-short","quiz-mcq"].filter((pageKey)=>hasAvailablePage(reading,pageKey)).length;const prep=hasAvailablePage(reading,"professor-prep")?1:0;return{read,concepts,quiz:quizAvailableCount/3,prep,quiz_available_count:quizAvailableCount};}
function completedProgressStageCount(progress){return["read","concepts","quiz","prep"].filter((key)=>Number(progress?.[key]||0)>=1).length;}
function readingAuthorsDisplay(reading){return cardAuthorLabel(reading)||reading.authors_label;}
function homeReadingState(reading,currentSlugs){if(reading.metadata_status!=="complete"||isReleaseLockedReading(reading)||!isAccessibleReading(reading))return"locked";if(currentSlugs.includes(reading.slug))return"current";return"ready";}
function readingOverviewTarget(reading){return isAccessibleReading(reading)?"index.html":"";}
function approvedPageTarget(reading,pageKey){return hasApprovedSourcePage(reading,pageKey)?pageByKey(reading,pageKey)?.filename||"":"";}
function reviewReadyProfessorPrepTarget(reading){const page=pageByKey(reading,"professor-prep");return page&&page.available&&isReadyStatus(page.source_validation_status)?page.filename||"":"";}
function firstApprovedPageTarget(reading,pageKeys){for(const pageKey of pageKeys){const target=approvedPageTarget(reading,pageKey);if(target)return target;}return"";}
function readingStartTarget(reading){return firstApprovedPageTarget(reading,["full","translation","summary","concepts","pitfalls","review-sheet"])||readingOverviewTarget(reading);}
function quizOverviewTarget(reading){return firstApprovedPageTarget(reading,["quiz-ox","quiz-short","quiz-mcq"])?"quiz.html":"";}
function prepTarget(reading){return approvedPageTarget(reading,"professor-prep")||reviewReadyProfessorPrepTarget(reading);}
function readingGateMessage(reading){if(isReleaseLockedReading(reading))return toText(reading.publish_cutoff_note)||"다시 점검한 뒤 공개합니다.";if(reading.metadata_status!=="complete")return"메타데이터 확인 후 공개합니다.";if(isBlockedReading(reading))return"이 읽기는 전체 승인 전이라 아직 공개되지 않습니다.";if(!isAccessibleReading(reading))return"준비중입니다.";return"준비중입니다.";}
function metadataStatusHtml(status){return status==="complete"?'<span class="status ready">메타데이터 확인됨</span>':'<span class="status placeholder">메타데이터 확인 필요</span>';}
function readingPageLabel(reading,page){
  if(page.key==="full")return reading.language==="en"?"원문 읽기":"본문 읽기";
  if(page.key==="translation")return "번역본 읽기";
  return page.label;
}
function normalizeReading(reading,sequence,siteMeta={}){const supplemental=loadReadingMeta(reading.content_dir);const language=reading.language||"unknown";const type=detectType(reading);const rawTags=Array.isArray(reading.tags)&&reading.tags.length?reading.tags:["Metadata incomplete"];const source_filename=reading.source_filename||path.basename(reading.source_pdf);const sortDate=effectiveSortDate(reading);const classroom_points=(Array.isArray(reading.classroom_points)?reading.classroom_points:[]).map((item)=>translateCommonText(item)).filter(Boolean);const shared_page_keys=(Array.isArray(reading.shared_page_keys)?reading.shared_page_keys:Array.isArray(supplemental.shared_page_keys)?supplemental.shared_page_keys:[]).map((item)=>toText(item)).filter(Boolean);const enabled_page_keys=normalizeEnabledPageKeys(reading.enabled_page_keys||supplemental.enabled_page_keys,language);const pdf_visibility=readingPdfVisibility(reading,supplemental);const translation_original_reveal=normalizeTranslationOriginalRevealConfig(reading.translation_original_reveal||supplemental.translation_original_reveal);const cutoffDate=publishCutoffDate(siteMeta);const cutoffNote=publishCutoffNote(siteMeta);return{...reading,sequence,subtitle:translateCommonText(reading.subtitle||"Filename-derived placeholder metadata."),authors:reading.authors||[],authors_label:authorsLabel(reading.authors||[]),year_label:yearLabel(reading.year),language,language_label:languageLabel(language),kind:reading.kind||`${type} pdf`,kind_label:kindLabel(reading.kind||`${type} pdf`,type),type,type_label:typeLabel(type),source_filename,tags:rawTags.map(translateTag),description:translateCommonText(reading.description||"Placeholder record created from the source filename only."),metadata_status:reading.metadata_status||"incomplete",metadata_notes:(reading.metadata_notes||[]).map(translateCommonText),class_date:reading.class_date??null,reading_date:reading.reading_date??null,sort_date:reading.sort_date??null,display_date_label:reading.display_date_label??null,effective_sort_date:sortDate,display_date:displayDateLabel(reading),translation_required:language==="en"&&enabled_page_keys.includes("translation"),pdf_visibility,public_pdf:toText(reading.public_pdf)||"",overview_hook:translateCommonText(reading.overview_hook||""),classroom_points,shared_page_bundle:toText(reading.shared_page_bundle||supplemental.shared_page_bundle||""),shared_page_keys,enabled_page_keys,translation_original_reveal,publish_cutoff_date:cutoffDate,publish_cutoff_note:cutoffNote,release_locked:isReleaseLockedByCutoff(sortDate,cutoffDate)};}
function buildContentStatus(reading,existingMeta={},options={}){return buildValidationSnapshot(rootDir,reading,existingMeta,options).content_status;}
function ensureContentPlaceholders(manifest,siteMeta={},slugFilter=null){manifest.readings.forEach((rawReading,index)=>{const reading=normalizeReading(rawReading,index+1,siteMeta);if(slugFilter&&reading.slug!==slugFilter)return;const contentDir=path.join(rootDir,reading.content_dir);fs.mkdirSync(contentDir,{recursive:true});const metaPath=path.join(contentDir,"meta.json");let existing={};if(fs.existsSync(metaPath)){try{existing=JSON.parse(readText(metaPath));}catch(error){existing={};}}const validationOptions={requireBuiltArtifacts:Boolean(existing.validation_status?.require_built_artifacts)};const snapshot=buildValidationSnapshot(rootDir,reading,existing,validationOptions);const payload=mergeValidationFields({...existing,slug:reading.slug,source_filename:reading.source_filename,source_pdf:reading.source_pdf,content_dir:reading.content_dir,title:reading.title,subtitle:reading.subtitle,authors:reading.authors,year:reading.year??null,language:reading.language,type:reading.type,kind:reading.kind,class_date:reading.class_date,reading_date:reading.reading_date,sort_date:reading.sort_date,display_date_label:reading.display_date_label,description:reading.description,metadata_status:reading.metadata_status,metadata_notes:reading.metadata_notes,pdf_visibility:reading.pdf_visibility||"none",public_pdf:reading.public_pdf||null,overview_hook:reading.overview_hook||null,classroom_points:reading.classroom_points||[],shared_page_bundle:reading.shared_page_bundle||null,shared_page_keys:reading.shared_page_keys||[],enabled_page_keys:reading.enabled_page_keys||null,content_status:buildContentStatus(reading,existing,validationOptions)},snapshot);writeText(metaPath,`${JSON.stringify(payload,null,2)}\n`);});}
function prepareReadings(manifest,siteMeta={}){
  const prepared=manifest.readings.map((rawReading,index)=>{
    const reading=normalizeReading(rawReading,index+1,siteMeta);
    const existingMeta=loadReadingMeta(reading.content_dir);
    const overview_comic=loadOverviewComic(reading.content_dir);
    const validationOptions={requireBuiltArtifacts:Boolean(existingMeta.validation_status?.require_built_artifacts)};
    const snapshot=buildValidationSnapshot(rootDir,reading,existingMeta,validationOptions);
    const mergedMeta=mergeValidationFields(existingMeta,snapshot);
    const pages=PAGE_DEFS
      .filter((page)=>!(page.englishOnly&&reading.language!=="en")&&isPageEnabledForReading(reading,page.key))
      .map((page)=>({...page,label:readingPageLabel(reading,page),...pageState(reading,page,snapshot)}));
    return{
      ...reading,
      content_status:mergedMeta.content_status,
      validation_status:mergedMeta.validation_status,
      workflow_status:mergedMeta.workflow_status,
      workflow_notes:mergedMeta.workflow_notes,
      manual_review:mergedMeta.manual_review,
      overview_comic,
      pages
    };
  });
  const currentSlugs=currentReadingSlugs(prepared,localTodayIsoDate(),publishCutoffDate(siteMeta));
  return prepared.map((reading)=>{
    const progress=readingProgress(reading);
    const state=homeReadingState(reading,currentSlugs);
    return{
      ...reading,
      authors_display:readingAuthorsDisplay(reading),
      filter_group:readingFilterGroup(reading),
      progress,
      progress_stage_count:completedProgressStageCount(progress),
      current_candidate:currentSlugs.includes(reading.slug),
      state
    };
  });
}
function compareReadings(a,b){return a.sequence-b.sequence;}
function searchBlob(reading){return[reading.slug,reading.title,reading.subtitle,reading.source_filename,reading.language,reading.type,reading.kind,reading.year_label,reading.display_date,...(reading.authors||[]),...(reading.tags||[]),...(reading.metadata_notes||[])].filter(Boolean).join(" ");}
function buildTagOptions(readings){return Array.from(new Set(readings.flatMap((reading)=>reading.tags||[]).filter(Boolean))).sort((a,b)=>a.localeCompare(b,"ko"));}
function readingSequenceLabel(sequence){return `읽기 ${String(sequence).padStart(2,"0")}`;}
function studyOrderText(reading){const labelsByKey=new Map(PAGE_DEFS.map((page)=>[page.key,readingPageLabel(reading,page)]));const steps=[LANDING_TAB_LABEL];enabledPageKeys(reading).forEach((key)=>{if(labelsByKey.has(key))steps.push(labelsByKey.get(key));});return steps.join(" -> ");}
function actionIntroText(reading){const enabled=new Set(enabledPageKeys(reading));if(reading.language==="en"&&enabled.has("full")&&enabled.has("translation")&&!enabled.has("summary"))return"이 글은 원문 읽기와 번역본 읽기를 오가며 원문 구조와 핵심 표현을 차근차근 확인하는 방식이 가장 안정적입니다.";if(reading.translation_required)return"이 글은 핵심 요약으로 큰 흐름을 먼저 잡고, 원문 읽기와 번역본 읽기를 오가며 원문 구조와 핵심 용어를 다시 확인하면 가장 안정적으로 읽힙니다.";if(!enabled.has("summary")&&enabled.has("full"))return"이 글은 본문 읽기를 따라가며 구조와 핵심 개념을 차근차근 확인하는 방식이 가장 안정적입니다.";if(reading.type==="paper")return"이 글은 핵심 요약으로 큰 흐름을 먼저 잡고, 본문 읽기를 따라가며 논문의 질문, 방법, 결과를 다시 확인하면 가장 안정적으로 읽힙니다.";return"이 글은 핵심 요약으로 큰 흐름을 먼저 잡고, 본문 읽기를 따라가며 장의 구조와 핵심 개념을 다시 확인하면 가장 안정적으로 읽힙니다.";}
function publicPdfTargetPath(reading){if(!reading.public_pdf)return"";return path.join(siteDir,...reading.public_pdf.split("/"));}
function pdfHref(outputPath,reading){if(reading.pdf_visibility!=="public"||!reading.public_pdf)return"";return relHref(outputPath,publicPdfTargetPath(reading));}
function renderPdfActions(outputPath,reading,className="pdf-actions"){const href=pdfHref(outputPath,reading);if(!href)return"";return`<div class="${escapeHtml(className)}"><a class="ghost-btn link-btn pdf-btn" href="${escapeHtml(href)}" target="_blank" rel="noopener">원문 PDF 보기</a></div>`;}
function readingPageHref(outputPath,reading,targetFilename){return relHref(outputPath,path.join(siteDir,"readings",reading.slug,targetFilename));}
function renderActionLinkOrGate(outputPath,reading,label,targetFilename,className,message){if(targetFilename){return `<a class="${escapeHtml(className)}" href="${escapeHtml(readingPageHref(outputPath,reading,targetFilename))}">${escapeHtml(label)}</a>`;}return `<button class="${escapeHtml(`${className} is-disabled`)}" type="button" data-gated-link data-gated-message="${escapeHtml(message||readingGateMessage(reading))}">${escapeHtml(label)}</button>`;}
function progressSummaryItems(reading){return[{label:"읽기",value:reading.progress.read,detail:reading.progress.read>=1?"준비됨":"대기"},{label:"개념",value:reading.progress.concepts,detail:reading.progress.concepts>=1?"준비됨":"대기"},{label:"퀴즈",value:reading.progress.quiz,detail:`${reading.progress.quiz_available_count}/3 세트`},{label:"답변 대비",value:reading.progress.prep,detail:reading.progress.prep>=1?"준비됨":"대기"}];}
function renderProgressGrid(reading){return `<div class="progress-grid">${progressSummaryItems(reading).map((item)=>`<article class="prog-item"><p class="k">${escapeHtml(item.label)}</p><div class="prog-bar${item.value<1&&item.value>0?" pale":""}"><span style="width:${escapeHtml(String(Math.max(0,Math.min(100,Math.round(item.value*100)))))}%"></span></div><p class="v">${escapeHtml(item.detail)}</p></article>`).join("")}</div>`;}
function jsonScriptContent(value){return JSON.stringify(value).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029");}
function homeReadingClientData(reading){
  return{
    slug:reading.slug,
    displayDateLabel:reading.display_date_label||displayDateLabel(reading),
    classDate:reading.class_date||"",
    sequence:reading.sequence,
    baseState:reading.state==="locked"?"locked":"ready",
    typeLabel:reading.type_label
  };
}
function renderHomeReadingDataScript(siteMeta,readings){
  const payload={
    dateTimeZone:"Asia/Seoul",
    publishCutoffDate:publishCutoffDate(siteMeta),
    readings:readings.map((reading)=>homeReadingClientData(reading))
  };
  return `<script type="application/json" id="home-reading-data">${jsonScriptContent(payload)}</script>`;
}
function isExternalUrl(value){return /^https?:\/\//i.test(toText(value));}
function copyDirRecursive(sourceDir,targetDir){if(!fs.existsSync(sourceDir))return;for(const entry of fs.readdirSync(sourceDir,{withFileTypes:true})){const sourcePath=path.join(sourceDir,entry.name);const targetPath=path.join(targetDir,entry.name);if(entry.isDirectory()){copyDirRecursive(sourcePath,targetPath);continue;}fs.mkdirSync(path.dirname(targetPath),{recursive:true});fs.copyFileSync(sourcePath,targetPath);}}
function copyReadingAssets(reading){const contentDir=path.join(rootDir,reading.content_dir);for(const assetDirName of["figures","assets"]){const sourceDir=path.join(contentDir,assetDirName);if(!fs.existsSync(sourceDir))continue;copyDirRecursive(sourceDir,path.join(siteDir,"assets","readings",reading.slug,assetDirName));}}
function resolveSiteAssetHref(outputPath,value){const text=toText(value);if(!text)return"";if(isExternalUrl(text))return text;const normalized=text.replace(/^\.?\//,"");return relHref(outputPath,path.join(siteDir,...normalized.split("/")));}
function renderBrandMarkSvg(){return `
<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
  <defs>
    <path id="brand-ring-top" d="M 12 32 A 20 20 0 0 1 52 32" />
    <path id="brand-ring-bottom" d="M 52 32 A 20 20 0 0 1 12 32" />
  </defs>
  <circle cx="32" cy="32" r="31" fill="#0f2f6b" />
  <circle cx="32" cy="32" r="25.5" fill="none" stroke="#ffffff" stroke-width="1.8" opacity=".92" />
  <circle cx="32" cy="32" r="16.5" fill="#ffffff" />
  <path d="M32 18.8c3.8 4.3 5.7 8 5.7 11.4 0 3.8-2.4 6.2-5.7 8.5-3.3-2.3-5.7-4.7-5.7-8.5 0-3.4 1.9-7.1 5.7-11.4Z" fill="#0f2f6b" />
  <path d="M26.6 40.4h10.8" stroke="#0f2f6b" stroke-width="2.2" stroke-linecap="round" />
  <path d="M29.1 44.7h5.8" stroke="#0f2f6b" stroke-width="2.2" stroke-linecap="round" />
  <text fill="#ffffff" font-size="5" font-weight="700" letter-spacing=".14em">
    <textPath href="#brand-ring-top" startOffset="50%" text-anchor="middle">SEOUL NATIONAL</textPath>
  </text>
  <text fill="#ffffff" font-size="5.2" font-weight="700" letter-spacing=".12em">
    <textPath href="#brand-ring-bottom" startOffset="50%" text-anchor="middle">UNIVERSITY</textPath>
  </text>
</svg>`;}
function renderBrandMark(outputPath){if(fs.existsSync(brandLogoSource)){const logoHref=relHref(outputPath,path.join(siteDir,"assets","branding","snu.png"));return `<img src="${escapeHtml(logoHref)}" alt="" />`;}return renderBrandMarkSvg();}
function siteHeader(siteMeta,outputPath){const homeHref=relHref(outputPath,path.join(siteDir,"index.html"));return `
<header class="topbar">
  <div class="brand">
    <a class="brand-mark" href="${escapeHtml(homeHref)}" aria-label="Home">${renderBrandMark(outputPath)}</a>
    <div>
      <p class="brand-title">${escapeHtml([siteMeta.term,siteMeta.short_title||siteMeta.title].filter(Boolean).join(" · "))}</p>
    </div>
  </div>
  <nav class="topbar-nav" aria-label="주요 메뉴">
    <a href="${escapeHtml(`${homeHref}#readings`)}">전체 읽기</a>
    <a href="${escapeHtml(`${homeHref}#schedule`)}">읽기 일정</a>
  </nav>
  <div class="topbar-actions">
    <button class="ghost-btn" type="button" data-theme-toggle>다크 모드</button>
  </div>
</header>
`;}
function renderCloudflareWebAnalytics(siteMeta){
  const token=toText(siteMeta?.analytics?.cloudflare_token);
  if(!token)return"";
  if(!/^[a-f0-9]{32}$/i.test(token))throw new Error("site.analytics.cloudflare_token must be a 32-character hexadecimal token");
  return `<!-- Cloudflare Web Analytics -->
<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${token}"}'></script>
<!-- End Cloudflare Web Analytics -->`;
}
function renderDocument(siteMeta,outputPath,title,body,description,bodyAttrs="",lang="ko",extraScripts=""){const cssHref=versionedAssetHref(outputPath,"styles.css");const jsHref=versionedAssetHref(outputPath,"app.js");const bodyHtml=String(body||"").trim();const analyticsHtml=renderCloudflareWebAnalytics(siteMeta);return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} | ${escapeHtml(siteMeta.title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <script>
    (() => {
      try {
        const theme=localStorage.getItem("aaf-theme");
        if(theme) document.documentElement.dataset.theme=theme;
      } catch (error) {}
    })();
  </script>
  <link rel="stylesheet" href="${escapeHtml(cssHref)}" />
</head>
<body ${bodyAttrs}>
${bodyHtml}
${extraScripts?`\n${extraScripts}`:""}
<script src="${escapeHtml(jsHref)}"></script>
${analyticsHtml}
</body>
</html>
`;}
function renderGatedTab(label,active=false,message="준비중입니다."){return `<button class="tab${active?" active":""} is-locked" type="button"${active?' aria-current="page"':""} aria-disabled="true" data-tab-link data-gated-link data-gated-message="${escapeHtml(message)}">${escapeHtml(label)}</button>`;}
function renderActiveTab(outputPath,tab,active=false){return `<a class="tab${active?" active":""}" href="${escapeHtml(relHref(outputPath,tab.target))}"${active?' aria-current="page"':""} data-tab-link>${escapeHtml(tab.label)}</a>`;}
function pageTabs(outputPath,reading,activeKey){
  const accessible=isAccessibleReading(reading);
  const blocked=isBlockedReading(reading);
  const base=path.join(siteDir,"readings",reading.slug);
  const tabs=[{key:"index",label:LANDING_TAB_LABEL,target:path.join(base,"index.html"),status:landingStatus(reading),sourceStatus:landingStatus(reading)}];
  if(pageByKey(reading,"full"))tabs.push({key:"full",label:"본문 읽기",target:path.join(base,"full.html"),status:pageByKey(reading,"full")?.validation_status,sourceStatus:pageByKey(reading,"full")?.source_validation_status});
  if(pageByKey(reading,"translation"))tabs.push({key:"translation",label:"번역본 읽기",target:path.join(base,"translation.html"),status:pageByKey(reading,"translation")?.validation_status,sourceStatus:pageByKey(reading,"translation")?.source_validation_status});
  if(pageByKey(reading,"professor-prep"))tabs.push({key:"professor-prep",label:"교수님 답변 대비",target:path.join(base,"professor-prep.html"),status:pageByKey(reading,"professor-prep")?.validation_status,sourceStatus:pageByKey(reading,"professor-prep")?.source_validation_status});
  if(reading.pages.some((page)=>page.type==="quiz"))tabs.push({key:"quiz",label:"퀴즈 풀기",target:path.join(base,"quiz.html"),sourceStatus:quizOverviewTarget(reading)?PAGE_STATUS.APPROVED:null});
  const hiddenTabs=reading.pages
    .filter((page)=>page.type!=="quiz"&&!["professor-prep","full","translation"].includes(page.key))
    .map((page)=>({key:page.key,label:page.label,target:path.join(base,page.filename),status:page.validation_status,sourceStatus:page.source_validation_status}));
  const hiddenActive=hiddenTabs.find((tab)=>tab.key===activeKey)||null;
  const isActiveTab=(tab)=>tab.key===activeKey||(tab.key==="quiz"&&["quiz-ox","quiz-short","quiz-mcq"].includes(activeKey));
  const renderTab=(tab)=>{
    if(blocked||!accessible)return renderGatedTab(tab.label,isActiveTab(tab),readingGateMessage(reading));
    if(tab.key==="index"&&(isApprovedStatus(tab.sourceStatus)||(allowDraftPreview&&isReadyStatus(tab.sourceStatus))))return renderActiveTab(outputPath,tab,isActiveTab(tab));
    return isApprovedStatus(tab.sourceStatus)?renderActiveTab(outputPath,tab,isActiveTab(tab)):renderGatedTab(tab.label,isActiveTab(tab),"이 탭은 아직 공개되지 않았습니다.");
  };
  const hiddenMarkup=!hiddenTabs.length?"":`<details class="tab-more${hiddenActive?" has-active":""}" data-tab-more><summary class="tab-more-toggle" data-tab-more-toggle>더보기</summary><div class="tab-more-list" data-tab-more-list>${hiddenTabs.map((tab)=>renderTab(tab).replace("data-tab-link","data-tab-link data-tab-more-link")).join("")}</div></details>`;
  const mobileMarkup=[...tabs,...hiddenTabs].map((tab)=>renderTab(tab)).join("");
  return `<nav class="tab-row" aria-label="읽기 페이지 메뉴" data-tab-row>${tabs.map((tab)=>renderTab(tab)).join("")}${hiddenMarkup}</nav><nav class="mobile-tab-row" aria-label="읽기 페이지 메뉴" data-mobile-tab-row>${mobileMarkup}</nav>`;
}
function renderBreadcrumbs(outputPath,reading,currentLabel=""){const homeHref=relHref(outputPath,path.join(siteDir,"index.html"));const overviewHref=relHref(outputPath,path.join(siteDir,"readings",reading.slug,"index.html"));const crumbs=[`<a href="${escapeHtml(homeHref)}">홈</a>`];if(currentLabel){crumbs.push(`<a href="${escapeHtml(overviewHref)}">${escapeHtml(reading.title)}</a>`);crumbs.push(`<span aria-current="page">${escapeHtml(currentLabel)}</span>`);}else{crumbs.push(`<span aria-current="page">${escapeHtml(reading.title)}</span>`);}return `<nav class="breadcrumbs" aria-label="breadcrumb">${crumbs.map((item,index)=>`${index?'<span class="crumb-sep">/</span>':""}${item}`).join("")}</nav>`;}
function renderArticleMeta(reading,options={}){const bits=[options.pageLabel||"",reading.display_date,reading.type_label,options.includeLanguage?reading.language_label:"",reading.authors_label].filter(Boolean);return `<div class="article-meta-row">${bits.map((bit)=>`<span>${escapeHtml(bit)}</span>`).join("")}</div>`;}
function renderArticleHeader(outputPath,reading,options){const currentLabel=options.breadcrumbLabel===undefined?(options.activeKey==="index"?"":options.label):options.breadcrumbLabel;return `<header class="article-header"><div class="article-header-top"><div class="article-header-copy">${renderBreadcrumbs(outputPath,reading,currentLabel)}<p class="section-kicker">${escapeHtml(readingSequenceLabel(reading.sequence))}</p><h1>${escapeHtml(reading.title)}</h1>${renderArticleMeta(reading,{pageLabel:options.metaPageLabel||"",includeLanguage:Boolean(options.includeLanguage)})}</div></div>${options.includePdf===false?"":renderPdfActions(outputPath,reading,"pdf-actions header-pdf-actions")}${pageTabs(outputPath,reading,options.activeKey)}</header>`;}
function renderHomeRailItem(outputPath,reading){
  const target=readingOverviewTarget(reading);
  const displayLabel=reading.display_date_label||displayDateLabel(reading);
  const labelParts=displayLabel.split("·").map((part)=>part.trim()).filter(Boolean);
  const weekLabel=labelParts[0]||`${reading.week||reading.sequence}주차`;
  const dateLabel=labelParts[1]||displayLabel;
  const metaId=`rail-meta-${reading.slug}`;
  const titleMarkup=`<span class="rail-title" lang="${reading.language==="en"?"en":"ko"}">${escapeHtml(reading.title)}</span>`;
  const currentAttr=reading.current_candidate?' aria-current="date"':"";
  const content=target
    ?`<a class="rail-reading ${escapeHtml(reading.state)}" href="${escapeHtml(readingPageHref(outputPath,reading,target))}" aria-describedby="${escapeHtml(metaId)}"${currentAttr} title="${escapeHtml(reading.title)}">${titleMarkup}</a>`
    :`<button class="rail-reading ${escapeHtml(reading.state)}" type="button" aria-describedby="${escapeHtml(metaId)}" aria-disabled="true" data-gated-link data-gated-message="${escapeHtml(readingGateMessage(reading))}" title="${escapeHtml(reading.title)}">${titleMarkup}</button>`;
  const meta=`<div class="rail-meta" id="${escapeHtml(metaId)}"><span>${escapeHtml(weekLabel)}</span><span aria-hidden="true">·</span><time datetime="${escapeHtml(reading.class_date||"")}">${escapeHtml(dateLabel)}</time><span aria-hidden="true">·</span><span>${escapeHtml(reading.type_label)}</span></div>`;
  return `<li class="rail-item${reading.current_candidate?" is-current":""}${reading.state==="ready"?" is-done":""}" data-home-rail-item data-reading-slug="${escapeHtml(reading.slug)}" data-base-state="${escapeHtml(reading.state==="locked"?"locked":"ready")}"><div class="rail-body">${meta}${content}</div></li>`;
}
function renderHomeCard(outputPath,reading,thumbnailHref=""){
  const target=readingOverviewTarget(reading);
  const clickable=Boolean(target);
  const tag=`${clickable?"a":"button"}`;
  const attrs=clickable?`class="card-link rcard${reading.state==="locked"?" is-locked":""}${reading.state==="current"?" is-current":""}" href="${escapeHtml(readingPageHref(outputPath,reading,target))}"`:`class="card-link rcard is-locked" type="button" data-gated-link data-gated-message="${escapeHtml(readingGateMessage(reading))}"`;
  const stateLabel=reading.state==="current"?"다음 읽기":reading.state==="ready"?"공개됨":"잠금";
  const thumbnailSrc=thumbnailHref?resolveSiteAssetHref(outputPath,thumbnailHref):"";
  const thumbnailVisualClass=path.posix.extname(thumbnailHref).toLowerCase()===".png"?" is-sticker":" is-photo";
  const imageLoading=reading.state==="current"?"eager":"lazy";
  const imagePriority=reading.state==="current"?' fetchpriority="high"':"";
  const mobileState=reading.state==="current"?'<span class="rcard-mobile-state current">다음 읽기</span>':reading.state==="locked"?'<span class="rcard-mobile-state locked">잠금</span>':"";
  const mobileEyebrow=`<p class="rcard-mobile-eyebrow"><time datetime="${escapeHtml(reading.class_date||"")}">${escapeHtml(reading.display_date_label||displayDateLabel(reading))}</time>${mobileState}</p>`;
  const thumbnailMarkup=thumbnailSrc?`<div class="rcard-thumb${thumbnailVisualClass}"><img src="${escapeHtml(thumbnailSrc)}" alt="" width="360" height="360" loading="${imageLoading}" decoding="async"${imagePriority} /><span class="rcard-status ${escapeHtml(reading.state)}">${escapeHtml(stateLabel)}</span><span class="rcard-date card-date">${escapeHtml(reading.display_date_label||displayDateLabel(reading))}</span></div>`:`<div class="rcard-thumb rcard-thumb-fallback"><span class="rcard-status ${escapeHtml(reading.state)}">${escapeHtml(stateLabel)}</span><span class="rcard-date card-date">${escapeHtml(reading.display_date_label||displayDateLabel(reading))}</span></div>`;
  return `<article class="reading-card-shell" data-reading-card data-reading-slug="${escapeHtml(reading.slug)}" data-week="${escapeHtml(String(reading.week||""))}" data-card-state="${escapeHtml(reading.state)}" data-card-base-state="${escapeHtml(reading.state==="locked"?"locked":"ready")}" data-search="${escapeHtml(searchBlob(reading))}" data-type="${escapeHtml(reading.type)}" data-filter-group="${escapeHtml(reading.filter_group)}" data-tags="${escapeHtml(reading.tags.map((tag)=>tag.toLowerCase()).join("||"))}" data-sort-date="${escapeHtml(reading.effective_sort_date||"")}" data-sequence="${reading.sequence}"><${tag} ${attrs}>${thumbnailMarkup}<div class="rcard-content">${mobileEyebrow}<p class="rcard-week">${escapeHtml(reading.week?`${reading.week}주차 · ${reading.topic||""}`:reading.topic||"")}</p><h2 class="rcard-title title">${escapeHtml(reading.title)}</h2><p class="rcard-meta card-meta">${escapeHtml([reading.type_label,reading.language_label,reading.authors_display].filter(Boolean).join(" · "))}</p><p class="rcard-sub card-subtitle">${escapeHtml(reading.subtitle)}</p><div class="rcard-foot"><span class="rcard-arrow" aria-hidden="true">→</span></div></div></${tag}></article>`;
}
function renderOverviewPoints(reading){if(Array.isArray(reading.classroom_points)&&reading.classroom_points.length){return `<ol class="points-list">${reading.classroom_points.map((point,index)=>`<li><span class="n">${String(index+1).padStart(2,"0")}</span><span>${escapeHtml(point)}</span></li>`).join("")}</ol>`;}return"";}
function renderOverviewComic(outputPath,reading){
  const comic=reading.overview_comic;
  if(!comic||!Array.isArray(comic.panels)||comic.panels.length!==4)return"";
  const panels=comic.panels.map((panel,index)=>{
    const imageTarget=path.join(siteDir,"assets","readings",reading.slug,...panel.image.split("/"));
    const imageHref=relHref(outputPath,imageTarget);
    const priority=index===0?' fetchpriority="high"':"";
    const captionId=`${panel.panel_id}-caption`;
    return `<li class="overview-comic-panel" id="${escapeHtml(panel.panel_id)}" aria-labelledby="${escapeHtml(captionId)}">
      <div class="overview-comic-visual">
        <img src="${escapeHtml(imageHref)}" alt="${escapeHtml(panel.alt)}" width="${panel.width}" height="${panel.height}" loading="${index===0?"eager":"lazy"}" decoding="async"${priority} />
        <span class="overview-comic-index" aria-hidden="true">${String(index+1).padStart(2,"0")}</span>
      </div>
      <div class="overview-comic-copy">
        <p class="overview-comic-caption" id="${escapeHtml(captionId)}">${escapeHtml(panel.caption)}</p>
      </div>
    </li>`;
  }).join("");
  return `<section class="panel detail-block overview-comic" lang="ko" aria-labelledby="overview-comic-title">
    <div class="section-head overview-comic-head">
      <div>
        <p class="section-kicker">ILLUSTRATED OVERVIEW</p>
        <h2 id="overview-comic-title">${escapeHtml(comic.title)}</h2>
      </div>
      <span class="count">4컷</span>
    </div>
    <p class="overview-comic-intro">${escapeHtml(comic.intro)}</p>
    <p class="overview-comic-swipe-hint" id="overview-comic-swipe-hint">옆으로 넘겨 4컷 보기 <span aria-hidden="true">→</span></p>
    <ol class="overview-comic-grid" role="list" tabindex="0" aria-describedby="overview-comic-swipe-hint">${panels}</ol>
  </section>`;
}
function renderOverviewQuickLinks(outputPath,reading){const links=[renderActionLinkOrGate(outputPath,reading,"본문 읽기",readingStartTarget(reading),"sub-link"),renderActionLinkOrGate(outputPath,reading,"교수님 답변 대비",prepTarget(reading),"sub-link","읽기 답변 준비는 아직 공개되지 않았습니다."),renderActionLinkOrGate(outputPath,reading,"퀴즈 풀기",quizOverviewTarget(reading),"sub-link","퀴즈는 아직 공개되지 않았습니다.")];return `<div class="sub-link-list">${links.join("")}</div>`;}
function renderReadingDetailHeader(outputPath,reading,options={}){const activeKey=options.activeKey||"index";const currentLabel=options.currentLabel!==undefined?options.currentLabel:(activeKey==="index"?"":"");return `<header class="article-header reading-detail-header"><div class="article-header-top reading-detail-top">${renderBreadcrumbs(outputPath,reading,currentLabel||"")}<p class="section-kicker">${escapeHtml(readingSequenceLabel(reading.sequence))}</p><div class="rdp-kicker"><span class="chip brand">${escapeHtml(reading.display_date_label||displayDateLabel(reading))}</span><span class="chip strong">${escapeHtml(reading.type_label)}</span><span class="chip">${escapeHtml(reading.language_label)}</span></div><h1 class="rdp-title">${escapeHtml(reading.title)}</h1><p class="rdp-authors">${escapeHtml([reading.authors_label,reading.year?String(reading.year):""].filter(Boolean).join(" · "))}</p>${reading.overview_hook?`<p class="rdp-hook">${escapeHtml(reading.overview_hook)}</p>`:""}<div class="hero-cta-row">${renderActionLinkOrGate(outputPath,reading,"읽기",readingStartTarget(reading),"btn-primary")} ${renderActionLinkOrGate(outputPath,reading,"교수님 답변 대비",prepTarget(reading),"btn-ghost","읽기 답변 준비는 아직 공개되지 않았습니다.")}</div></div>${pageTabs(outputPath,reading,activeKey)}</header>`;}
function renderReadingDetailAside(outputPath,reading){
  if(!(reading.tags&&reading.tags.length))return "";
  return `<aside class="rpanel-side"><section class="panel detail-side-panel"><p class="section-kicker">태그</p><h2>읽기 키워드</h2>${renderChipRow(reading.tags.map((tag)=>`# ${tag}`),"chip-row reading-tag-row")}</section></aside>`;
}
function placeholderArticleHtml(reading,page,sourcePath){const relSource=fileLabel(sourcePath);return `
<section class="placeholder article-placeholder">
  <h2>임시 안내 페이지</h2>
  <p>${escapeHtml(relSource)}에 아직 작성된 콘텐츠가 없습니다. 읽기 흐름이 끊기지 않도록 링크는 유지한 상태로 안내 페이지를 보여 줍니다.</p>
  <h3>예상 소스 파일</h3>
  <p><code>${escapeHtml(relSource)}</code></p>
  <h3>이 페이지의 역할</h3>
  <p>${escapeHtml(page.description)}</p>
  <h3>현재 읽기 정보</h3>
  <p>${escapeHtml(reading.display_date)} | ${escapeHtml(reading.type_label)} | ${escapeHtml(reading.language_label)}</p>
</section>
`;}
function placeholderQuizHtml(page,sourcePath){const relSource=fileLabel(sourcePath);return `
<section class="placeholder">
  <h2>임시 안내 페이지</h2>
  <p>${escapeHtml(relSource)}에 아직 퀴즈 데이터가 없습니다. 전체 학습 흐름이 끊기지 않도록 링크는 그대로 유지합니다.</p>
  <h3>예상 소스 파일</h3>
  <p><code>${escapeHtml(relSource)}</code></p>
  <h3>이 페이지의 역할</h3>
  <p>${escapeHtml(page.description)}</p>
</section>
`;}
function placeholderProfessorPrepHtml(page,sourcePath){const relSource=fileLabel(sourcePath);return `
<section class="placeholder">
  <h2>임시 안내 페이지</h2>
  <p>${escapeHtml(relSource)}에 아직 읽기 답변 준비 카드가 없습니다. 링크는 유지하고, 페이지 역할만 먼저 안내합니다.</p>
  <h3>예상 소스 파일</h3>
  <p><code>${escapeHtml(relSource)}</code></p>
  <h3>이 페이지의 역할</h3>
  <p>${escapeHtml(page.description)}</p>
</section>
`;}
function pendingUploadHtml(reading,label,detail="",options={}){const backHref=options.backHref||"index.html";const backLabel=options.backLabel||"개요로 돌아가기";const lead=options.lead||`${label} 페이지는 아직 승인되지 않아 공개되지 않습니다.`;return `
<section class="placeholder upload-placeholder">
  <h2>업로드 예정입니다.</h2>
  <p>${escapeHtml(lead)}</p>
  <p>${escapeHtml(detail||"검토가 끝나면 이 자리에서 바로 열 수 있습니다.")}</p>
  <div class="action-row">
    <a class="ghost-btn link-btn" href="${escapeHtml(backHref)}">${escapeHtml(backLabel)}</a>
  </div>
</section>
`;}
function pendingReadingHtml(reading,label,options={}){return pendingUploadHtml(reading,label,"이 읽기는 전체 승인 전이라 아직 공개되지 않습니다. 전체 승인 후 홈 카드에서 바로 열 수 있습니다.",options);}
function pendingReleaseHtml(reading,label,options={}){const detail=toText(reading.publish_cutoff_note)||"이 읽기는 다시 점검한 뒤 업로드할 예정입니다.";return pendingUploadHtml(reading,label,detail,{lead:"이 읽기는 아직 공개 시점이 아니어서 잠시 닫혀 있습니다.",...options});}
function metadataNotesHtml(reading){if(!reading.metadata_notes||!reading.metadata_notes.length)return"";return `<div class="meta-notes"><h3>메타데이터 메모</h3><ul>${reading.metadata_notes.map((note)=>`<li>${escapeHtml(note)}</li>`).join("")}</ul></div>`;}
function pageDetailText(page){if(page.type==="quiz")return page.available?`${page.count}문항`:"임시 안내";if(page.type==="professor-prep")return page.available?`${page.count}카드`:"임시 안내";return page.available?"열기":"임시 안내";}
function pageLink(outputPath,reading,page,labelOverride){const target=relHref(outputPath,path.join(siteDir,"readings",reading.slug,page.filename));return `<a class="ghost-btn link-btn" href="${escapeHtml(target)}">${escapeHtml(labelOverride||page.label)}</a>`;}
function renderPilotReaderAside(outputPath,reading,page,tocHtml){return `
<aside class="reader-aside" aria-label="${escapeHtml(page.label)} navigation">
  <section class="panel side-panel">
    <p class="section-kicker">목차</p>
    <div class="toc-list">${tocHtml}</div>
  </section>
  <section class="panel side-panel reader-context-panel">
    <p class="section-kicker">자료</p>
    <h2>${escapeHtml(page.label)}</h2>
    <p class="meta">${escapeHtml(page.description)}</p>
    ${renderPdfActions(outputPath,reading,"pdf-actions side-pdf-actions")}
  </section>
</aside>
`;}
function renderReadingContentAside(outputPath,reading,page,tocHtml){return `<aside class="rpanel-side reader-detail-side sticky-toc" aria-label="${escapeHtml(page.label)} navigation"><section class="panel detail-side-panel reader-toc-panel"><p class="section-kicker">목차</p><h2>${escapeHtml(page.label)}</h2><div class="toc-list">${tocHtml||'<p class="meta">본문 목차가 아직 없습니다.</p>'}</div></section>${reading.tags&&reading.tags.length?`<section class="panel detail-side-panel key-concept-callout"><p class="section-kicker">태그</p><h2>읽기 키워드</h2>${renderChipRow(reading.tags.map((tag)=>`# ${tag}`),"chip-row reading-tag-row")}</section>`:""}</aside>`;}
function renderList(items){return `<ul>${items.map((item)=>`<li>${renderInline(item)}</li>`).join("")}</ul>`;}
function renderChipRow(items,className="chip-row"){return `<div class="${escapeHtml(className)}">${items.map((item)=>`<span class="chip">${escapeHtml(item)}</span>`).join("")}</div>`;}
function prepKeyword(card){return card.must_include_keywords[0]||"핵심 포인트";}
function prepKeywordText(card){return card.must_include_keywords.slice(0,2).join(", ")||prepKeyword(card);}
function prepEvidenceText(card){return truncateWords(firstValue(sentenceList(card.evidence_from_reading[0])[0],card.evidence_from_reading[0],card.answer_10s),18);}
function prepFollowupAnswer(card,tokens){return card.followup_answers.find((entry)=>tokens.some((token)=>entry.question.includes(token)||entry.answer.includes(token)))||null;}
function buildProfessorPrepDeck(cards,prefix){return cards.map((card,index)=>({...card,card_id:toText(card.card_id)||`${prefix}-${String(index+1).padStart(2,"0")}`}));}
function renderProfessorPrepPanel(config){const hidden=config.active?"":' hidden';return `
<section class="prep-mode-panel" id="${escapeHtml(config.panelId)}" role="tabpanel" aria-labelledby="${escapeHtml(config.tabId)}" data-prep-panel="${escapeHtml(config.key)}"${hidden}>
  <section class="panel prep-intro">
    ${config.draftBadge}
    <p class="section-kicker">${escapeHtml(config.kicker)}</p>
    <h2>${escapeHtml(config.title)}</h2>
    <p class="meta">${escapeHtml(config.instructions)}</p>
    ${config.draftNote}
  </section>
  <section class="prep-card-list">
    ${config.deck.map((card,index)=>renderProfessorPrepCard(card,index,{label:config.cardLabel,language:config.language,reading:config.reading,bilingual:config.bilingual})).join("")}
  </section>
</section>
`;}
function renderProfessorPrepDeckSection(prep,coldCallDeck,readingResponseDeck,options={}){
  const draft=options.draft===true;
  const en=prep.language==="en";
  const bilingual=en&&[...coldCallDeck,...readingResponseDeck].every((card)=>toText(card.title_ko)&&toText(card.answer_30s_ko));
  const draftBadge=draft?'<p><span class="status warning">평가용 초안</span></p>':"";
  const draftNote=draft?'<p class="meta">이 페이지는 아직 최종 승인본이 아닙니다. 직접 링크로만 확인하는 평가용 프리뷰입니다.</p>':"";
  const hasReadingResponses=readingResponseDeck.length>0;
  const coldTabId="prep-tab-cold-call";
  const coldPanelId="prep-panel-cold-call";
  const responseTabId="prep-tab-reading-response";
  const responsePanelId="prep-panel-reading-response";
  return `
<section class="prep-workspace" data-prep-root data-prep-language="${en?"en":"ko"}" lang="${en?"en":"ko"}">
  ${bilingual?`<div class="prep-language-controls" role="group" aria-label="질문과 답변 언어 선택" lang="ko">
    <label class="prep-language-field"><span>질문 언어</span><select data-prep-question-select aria-label="질문 언어"><option value="en" lang="en">English</option><option value="ko" lang="ko">한국어</option></select></label>
    <label class="prep-language-field"><span>답변 언어</span><select data-prep-answer-select aria-label="답변 언어"><option value="en" lang="en">English</option><option value="ko" lang="ko">한국어</option></select></label>
  </div>`:""}
  <div class="prep-mode-tabs" role="tablist" aria-label="${en?"Discussion practice mode":"교수님 답변 대비 방식"}">
    <button class="prep-mode-tab is-active" id="${coldTabId}" type="button" role="tab" aria-selected="true" aria-controls="${coldPanelId}" tabindex="0" data-prep-tab="cold-call"><span>${en?"Cold-call questions":"즉석 질문"}</span><span class="prep-tab-count">${coldCallDeck.length}</span></button>
    ${hasReadingResponses?`<button class="prep-mode-tab" id="${responseTabId}" type="button" role="tab" aria-selected="false" aria-controls="${responsePanelId}" tabindex="-1" data-prep-tab="reading-response"><span>${en?"Reading response":"어떻게 읽었나요?"}</span><span class="prep-tab-count">${readingResponseDeck.length}</span></button>`:""}
  </div>
  ${renderProfessorPrepPanel({key:"cold-call",tabId:coldTabId,panelId:coldPanelId,active:true,draftBadge,draftNote,language:prep.language,reading:options.reading,bilingual,kicker:en?"SPEAK WITH EVIDENCE":"교수님이 바로 이어 물을 때",title:en?`${coldCallDeck.length} cold-call questions`:`${coldCallDeck.length}개 즉석 질문${draft?" 초안":""}`,instructions:prep.instructions||"",deck:coldCallDeck,cardLabel:en?"Discussion question":"즉석 답변"})}
  ${hasReadingResponses?renderProfessorPrepPanel({key:"reading-response",tabId:responseTabId,panelId:responsePanelId,active:false,draftBadge,draftNote,language:prep.language,reading:options.reading,bilingual,kicker:en?"IN YOUR OWN WORDS":"수업 첫 질문에 자기 말로",title:prep.reading_response.title,instructions:prep.reading_response.instructions,deck:readingResponseDeck,cardLabel:en?"Reading response":"읽기 답변"}):""}
</section>
`;}
function writePlaceholderSvg(reading,svgPath){const slug=escapeHtml(reading.slug);const title=escapeHtml(reading.title||reading.slug);const subtitle=escapeHtml(reading.subtitle||"파일명 기준으로 만든 임시 메타데이터입니다.");const dateLabel=escapeHtml(displayDateLabel(reading));const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#e9e2d8" />
  <rect x="44" y="44" width="1192" height="632" fill="#f8f5f0" stroke="#cbbcab" stroke-width="4" rx="18" />
  <rect x="84" y="88" width="170" height="42" fill="#ede6dc" rx="8" />
  <text x="104" y="117" fill="#5f564c" font-size="24" font-family="'Segoe UI', 'Noto Sans KR', sans-serif">${dateLabel}</text>
  <text x="84" y="172" fill="#8d826f" font-size="24" font-family="'Segoe UI', 'Noto Sans KR', sans-serif">${slug}</text>
  <text x="84" y="280" fill="#1f1b17" font-size="66" font-weight="700" font-family="'Segoe UI', 'Noto Sans KR', sans-serif">${title}</text>
  <text x="84" y="350" fill="#61584e" font-size="32" font-family="'Segoe UI', 'Noto Sans KR', sans-serif">${subtitle}</text>
  <line x1="84" y1="558" x2="1196" y2="558" stroke="#d8cfc4" stroke-width="3" />
  <text x="84" y="612" fill="#6d6459" font-size="26" font-family="'Segoe UI', 'Noto Sans KR', sans-serif">PDF 첫 페이지 이미지가 없을 때 사용하는 로컬 대체 썸네일</text>
</svg>
`;writeText(svgPath,svg);}
function buildThumbnails(manifest,slugFilter=null){const thumbnailDir=path.join(siteDir,"assets","thumbnails");fs.mkdirSync(thumbnailDir,{recursive:true});const results={};for(const reading of manifest.readings){const sourceThumbnail=detectReadingThumbnailSource(reading.content_dir);if(sourceThumbnail){const extension=path.extname(sourceThumbnail).toLowerCase();const targetPath=path.join(thumbnailDir,`${reading.slug}${extension}`);fs.copyFileSync(sourceThumbnail,targetPath);results[reading.slug]=path.posix.join("assets","thumbnails",path.basename(targetPath));continue;}const svgPath=path.join(thumbnailDir,`${reading.slug}.svg`);if(!slugFilter||reading.slug===slugFilter||!fs.existsSync(svgPath))writePlaceholderSvg(reading,svgPath);results[reading.slug]=path.posix.join("assets","thumbnails",`${reading.slug}.svg`);}return results;}
function buildIndex(siteMeta,readings,thumbnails){const outputPath=path.join(siteDir,"index.html");const sortedReadings=[...readings].sort((a,b)=>compareReadings(a,b,"chronological"));const currentReadings=sortedReadings.filter((reading)=>reading.current_candidate);const currentReading=currentReadings[0];const cards=sortedReadings.map((reading)=>renderHomeCard(outputPath,reading,thumbnails?.[reading.slug]||"")).join("");const railItems=sortedReadings.map((reading)=>renderHomeRailItem(outputPath,reading)).join("");const railToggleMeta=currentReading?`${currentReading.display_date_label||displayDateLabel(currentReading)} · 읽기 ${currentReadings.length}편`:`총 ${sortedReadings.length}개`;const body=`
${siteHeader(siteMeta,outputPath)}
<main class="home-shell home-dashboard" data-page-kind="home">
  <h1 class="sr-only">${escapeHtml(siteMeta.title)}</h1>
  <details class="rail" id="schedule" aria-label="읽기 일정">
    <summary class="rail-toggle"><span class="rail-toggle-label">읽기 일정</span><span class="rail-toggle-meta">${escapeHtml(railToggleMeta)}</span></summary>
    <div class="rail-panel">
      <p class="rail-label">읽기 일정</p>
      <ol class="rail-list">${railItems}</ol>
    </div>
  </details>
  <div class="home-main">
    <section id="readings">
      <div class="section-head">
        <h3>주차별 읽기</h3>
        <span class="count" data-filter-result-count role="status" aria-live="polite">${sortedReadings.length}개</span>
      </div>
      <div class="filter-row" data-home-controls>
        <input class="filter-search" type="search" aria-label="제목, 저자 또는 태그로 읽기 검색" placeholder="제목, 저자, 태그 검색" data-reading-search />
        <div class="filter-chip-row" role="group" aria-label="읽기 유형 필터">
          <button class="filter-chip is-active" type="button" aria-pressed="true" data-filter-chip data-filter-value="">전체</button>
          <button class="filter-chip" type="button" aria-pressed="false" data-filter-chip data-filter-value="paper">논문</button>
          <button class="filter-chip" type="button" aria-pressed="false" data-filter-chip data-filter-value="chapter">핸드북 장</button>
          <button class="filter-chip" type="button" aria-pressed="false" data-filter-chip data-filter-value="article">기사</button>
        </div>
      </div>
      <div class="reading-grid" data-reading-grid>${cards}</div>
      <p class="meta empty-state" data-empty-state hidden>조건에 맞는 읽기가 없습니다.</p>
    </section>
  </div>
</main>
${renderHomeReadingDataScript(siteMeta,sortedReadings)}
`;writeText(outputPath,renderDocument(siteMeta,outputPath,siteMeta.title,body,siteMeta.tagline||siteMeta.title,'data-page-kind="home"',"ko"));}
function buildLanding(siteMeta,reading){buildQuizPlayer(siteMeta,reading);const outputPath=path.join(siteDir,"readings",reading.slug,"index.html");const overviewSection=isAccessibleReading(reading)&&(isApprovedStatus(landingStatus(reading))||(allowDraftPreview&&isReadyStatus(landingStatus(reading))))?renderOverviewComic(outputPath,reading):pendingUploadHtml(reading,LANDING_TAB_LABEL);const body=`
${siteHeader(siteMeta,outputPath)}
<main class="reading-shell reading-detail-shell" data-reading-slug="${escapeHtml(reading.slug)}">
  ${renderReadingDetailHeader(outputPath,reading,{activeKey:"index"})}
  <div class="rpanel">
    <section class="rpanel-main">
      ${overviewSection}
    </section>
    ${renderReadingDetailAside(outputPath,reading)}
  </div>
</main>
`;writeText(outputPath,renderDocument(siteMeta,outputPath,reading.title,body,reading.description,`data-page-kind="landing" data-reading-slug="${escapeHtml(reading.slug)}"`,reading.language==="en"?"en":"ko"));}
function buildArticle(siteMeta,reading,page){
  const outputPath=path.join(siteDir,"readings",reading.slug,page.filename);
  const text=loadMarkdown(page.sourcePath);
  const readingLayout=usesReadingLayout(page);
  const originalReveal=shouldUseTranslationOriginalReveal(reading,page);
  const renderText=text&&!originalReveal?normalizeWrappedMarkdownForRender(text,reading,page):text;
  const content=isBlockedReading(reading)?pendingReadingHtml(reading,page.label):isReleaseLockedReading(reading)?pendingReleaseHtml(reading,page.label):canRenderPageContent(reading,page)?(text?(originalReveal?buildTranslationOriginalRevealHtml(reading,page,outputPath,text):markdownToHtml(renderText,{outputPath,reading,sourcePath:page.sourcePath,skipFirstTitleHeading:readingLayout,collectFrontmatter:readingLayout,suppressFigureCaptions:readingLayout&&page.key==="translation"})):placeholderArticleHtml(reading,page,page.sourcePath)):pendingUploadHtml(reading,page.label);
  const tocHtml=readingLayout?renderReaderToc(content):"";
  const progressHtml=readingLayout?`<div class="reading-progress" aria-hidden="true"><span data-reading-progress-bar></span></div>`:"";
  const body=`
${siteHeader(siteMeta,outputPath)}
<main class="reading-shell reading-detail-shell">
  ${renderReadingDetailHeader(outputPath,reading,{activeKey:page.key,currentLabel:page.label})}
  ${progressHtml}
  <div class="rpanel">
    <section class="rpanel-main">
      <section class="panel detail-block detail-content-block section-block">
        <section class="article-body detail-article-body${readingLayout?" article-body-pilot":""}" data-reading-article-body${readingLayout?' data-article-body':''}>${content}</section>
      </section>
    </section>
    ${readingLayout?renderReadingContentAside(outputPath,reading,page,tocHtml):renderReadingDetailAside(outputPath,reading)}
  </div>
</main>
`;
  const bodyAttrs=`data-page-kind="article" data-reading-slug="${escapeHtml(reading.slug)}" data-reading-page="${escapeHtml(page.key)}"${readingLayout?' data-reading-layout="reader-v2"':''}${originalReveal?' data-original-reveal="enabled"':''}`;
  writeText(outputPath,renderDocument(siteMeta,outputPath,`${reading.title} - ${page.label}`,body,reading.description,bodyAttrs,page.key==="full"&&reading.language==="en"?"en":"ko"));
}
function writePublicPdf(reading){if(reading.pdf_visibility!=="public"||!reading.public_pdf)return false;const sourcePath=path.join(rootDir,reading.source_pdf);if(!fs.existsSync(sourcePath))return false;const targetPath=publicPdfTargetPath(reading);fs.mkdirSync(path.dirname(targetPath),{recursive:true});fs.copyFileSync(sourcePath,targetPath);return true;}
function renderQuizEvidence(item){
  const en=item.language==="en";
  const evidence=toText(item.evidence_segment_id);
  const segment=item.evidence_segment;
  const bits=[evidence?`<span class="quiz-evidence-segment">${escapeHtml(evidence)}</span>`:"",item.source?renderInline(item.source):""].filter(Boolean);
  if(!bits.length)return"";
  const excerpt=segment?.original_text?`<details class="quiz-evidence-detail"><summary>${en?"Read the source passage":"원문 근거 읽기"}</summary><blockquote lang="en"><p>${escapeHtml(segment.original_text).replace(/\n\n/g,"</p><p>")}</p></blockquote><p class="meta">${escapeHtml([segment.section,segment.source_location].filter(Boolean).join(" · "))} · <a href="full.html">${en?"Open the full reading":"본문 읽기"}</a></p></details>`:"";
  return `<div class="quiz-evidence"><p><strong>${en?"Evidence":"근거"}:</strong> ${bits.join(" · ")}</p>${excerpt}</div>`;
}
function renderQuizFeedback(item,answerLabel){
  const en=item.language==="en";
  const answer=item.answer||(item.accepted_answers||[]).join(" / ");
  const shown=en&&["O","X"].includes(answer)?(answer==="O"?"True":"False"):answer;
  return `<section class="quiz-feedback" data-quiz-feedback hidden aria-live="polite"><p class="quiz-result" data-quiz-result></p><p><strong>${escapeHtml(answerLabel)}:</strong> ${renderInline(shown)}</p><p><strong>${en?"Explanation":"해설"}:</strong> ${renderInline(item.explanation)}</p>${renderQuizEvidence(item)}</section>`;
}
function renderStandardQuizCard(item,index,pageKey){
  const en=item.language==="en";
  const isOx=pageKey==="quiz-ox";
  const options=isOx?["O","X"]:item.options;
  const inputName=`${pageKey}-q${String(index+1).padStart(2,"0")}`;
  const optionsHtml=`<fieldset class="quiz-options" aria-labelledby="${escapeHtml(inputName)}-prompt"><legend class="sr-only">${en?"Choose your answer":"답 선택"}</legend>${options.map((option,optionIndex)=>`<label class="quiz-choice"><input type="radio" name="${escapeHtml(inputName)}" value="${escapeHtml(option)}" data-quiz-input /><span class="quiz-choice-marker" aria-hidden="true">${isOx?(en?(option==="O"?"T":"F"):escapeHtml(option)):String.fromCharCode(65+optionIndex)}</span><span>${isOx?(en?(option==="O"?"True":"False"):(option==="O"?"맞다":"틀리다")):renderInline(option)}</span></label>`).join("")}</fieldset>`;
  return `<article class="quiz-card quiz-entry-card" data-quiz-item data-quiz-language="${en?"en":"ko"}" lang="${en?"en":"ko"}" data-quiz-kind="${isOx?"ox":"mcq"}" data-correct-answer="${escapeHtml(item.answer)}">
  <div class="quiz-card-head"><span class="quiz-number">${String(index+1).padStart(2,"0")}</span><h3 id="${escapeHtml(inputName)}-prompt">${renderInline(item.prompt)}</h3></div>
  ${optionsHtml}
  <div class="quiz-item-actions"><button class="btn-ghost quiz-check-one" type="button" data-quiz-check>${en?"Check answer":"이 문제 채점"}</button></div>
  ${renderQuizFeedback(item,en?"Answer":"정답")}
</article>`;
}
function renderShortAnswerQuizCard(item,index,pageKey){
  const en=item.language==="en";
  const inputId=`${pageKey}-q${String(index+1).padStart(2,"0")}`;
  const typeLabel=({term:"a term",person:"a name",number:"a number",short_phrase:"a short phrase"})[item.answer_type];
  return `<article class="quiz-card quiz-entry-card short-answer-card" data-quiz-item data-quiz-language="${en?"en":"ko"}" lang="${en?"en":"ko"}" data-quiz-kind="short" data-accepted-answers="${escapeHtml(JSON.stringify(item.accepted_answers))}">
  <div class="quiz-card-head"><span class="quiz-number">${String(index+1).padStart(2,"0")}</span><h3 id="${escapeHtml(inputId)}-prompt">${renderInline(item.question)}</h3></div>
  <label class="short-answer-input-wrap" for="${escapeHtml(inputId)}"><span>${en?`Answer in English using ${typeLabel}`:`${escapeHtml(SHORT_ANSWER_TYPE_LABELS[item.answer_type]||item.answer_type)}로 답하기`}</span><input class="short-answer-input" id="${escapeHtml(inputId)}" type="text" data-quiz-input autocomplete="off" spellcheck="true" lang="${en?"en":"ko"}" aria-describedby="${escapeHtml(inputId)}-hint" /><small id="${escapeHtml(inputId)}-hint">${en?"Capitalization and spacing between words do not affect grading. Keep the correct numbers and units.":"영문 대소문자와 단어 사이 공백은 무시합니다. 숫자와 단위는 정확히 입력해 주세요."}</small></label>
  <div class="quiz-item-actions"><button class="btn-ghost quiz-check-one" type="button" data-quiz-check>${en?"Check answer":"이 문제 채점"}</button></div>
  ${renderQuizFeedback(item,en?"Accepted answers":"허용 정답")}
</article>`;
}
function renderInteractiveQuiz(quiz,page){
  const en=quiz.language==="en";
  const intro=`<section class="quiz-intro">${quiz.title?`<h2>${renderInline(quiz.title)}</h2>`:""}${quiz.instructions?`<p>${renderInline(quiz.instructions)}</p>`:""}<p class="quiz-instruction-note">${en?"Check each answer as you go, or grade all answers at the end.":"답을 고른 뒤 문항별로 확인하거나, 맨 아래에서 한꺼번에 채점할 수 있습니다."}</p></section>`;
  const cards=quiz.items.map((item,index)=>page.key==="quiz-short"?renderShortAnswerQuizCard(item,index,page.key):renderStandardQuizCard(item,index,page.key)).join("");
  return `<div lang="${en?"en":"ko"}">${intro}<form class="interactive-quiz" data-quiz-root data-quiz-language="${en?"en":"ko"}" data-quiz-type="${escapeHtml(page.key)}" novalidate><section class="quiz-list">${cards}</section><div class="quiz-toolbar"><p class="quiz-score" data-quiz-score role="status" aria-live="polite" tabindex="-1">${en?"Not graded yet.":"아직 채점하지 않았습니다."}</p><div class="quiz-toolbar-actions"><button class="btn-primary" type="submit" data-quiz-submit>${en?"Grade all answers":"전체 채점"}</button><button class="btn-ghost" type="reset" data-quiz-reset>${en?"Start again":"다시 풀기"}</button></div></div></form></div>`;
}
function buildQuiz(siteMeta,reading,page){const outputPath=path.join(siteDir,"readings",reading.slug,page.filename);const quiz=loadQuiz(page,page.sourcePath);let content="";if(isBlockedReading(reading)){content=pendingReadingHtml(reading,page.label);}else if(isReleaseLockedReading(reading)){content=pendingReleaseHtml(reading,page.label);}else if(!canRenderPageContent(reading,page)){content=pendingUploadHtml(reading,page.label);}else if(!quiz){content=placeholderQuizHtml(page,page.sourcePath);}else{content=renderInteractiveQuiz(quiz,page);}const body=`
${siteHeader(siteMeta,outputPath)}
<main class="reading-shell reading-detail-shell">
  ${renderReadingDetailHeader(outputPath,reading,{activeKey:page.key,currentLabel:page.label})}
  <div class="rpanel">
    <section class="rpanel-main">
      <section class="panel detail-block detail-content-block">
        <section class="article-body detail-article-body"><p><a class="sub-link" href="quiz.html">한 문제씩 풀 수 있는 통합 퀴즈로 이동 →</a></p>${content}</section>
      </section>
    </section>
    ${renderReadingDetailAside(outputPath,reading)}
  </div>
</main>
`;writeText(outputPath,renderDocument(siteMeta,outputPath,`${reading.title} - ${page.label}`,body,reading.description,`data-page-kind="quiz" data-reading-slug="${escapeHtml(reading.slug)}" data-reading-page="${escapeHtml(page.key)}"`,"ko"));}
function renderQuizPlayer(reading){
  const sets=reading.pages.filter((page)=>page.type==="quiz"&&canRenderPageContent(reading,page))
    .map((page)=>({page,quiz:loadQuiz(page,page.sourcePath)})).filter(({quiz})=>quiz);
  const total=sets.reduce((sum,{quiz})=>sum+quiz.items.length,0);
  if(!total)return pendingUploadHtml(reading,"퀴즈 풀기");
  const language=sets.every(({quiz})=>quiz.language==="en")?"en":"ko";
  const version=crypto.createHash("sha256").update(JSON.stringify(sets.map(({page,quiz})=>({key:page.key,quiz})))).digest("hex");
  const templates=sets.map(({page,quiz})=>quiz.items.map((item,index)=>{
    const card=page.key==="quiz-short"?renderShortAnswerQuizCard(item,index,page.key):renderStandardQuizCard(item,index,page.key);
    return `<template data-player-question="${escapeHtml(page.key)}-${index+1}" data-kind="${escapeHtml(page.key.replace("quiz-",""))}">${card}</template>`;
  }).join("")).join("");
  const types=sets.map(({page,quiz})=>`<option value="${escapeHtml(page.key.replace("quiz-",""))}">${({"quiz-ox":"True / False","quiz-short":"Short answer","quiz-mcq":"Multiple choice"})[page.key]} · ${quiz.items.length} questions</option>`).join("");
  return `<section class="quiz-player" data-quiz-player data-quiz-language="${language}" data-question-bank-version="${version}" lang="en" aria-label="Practice quiz">
    <section data-player-setup>
      <p class="section-kicker">CHECK YOUR UNDERSTANDING</p>
      <h2 tabindex="-1" data-player-setup-title>Practice quiz</h2>
      <p class="player-intro">Practice with ${total} questions from this reading. Answer in English, then check the explanation and source passage.</p>
      <form data-player-settings>
        <div class="player-settings-grid">
          <label for="player-kind">Question type<select id="player-kind" name="kind"><option value="all">Mixed · ${total} questions</option>${types}</select></label>
          <label for="player-count">Quiz length<select id="player-count" name="count"><option value="5">5 questions</option><option value="10" selected>10 questions</option><option value="all">All questions</option></select></label>
        </div>
        <p class="player-note" data-player-selection aria-live="polite"></p>
        <button class="btn-primary player-start" type="submit" data-player-start disabled>Start quiz</button>
      </form>
      <p class="player-note" data-player-saved-note role="status" aria-live="polite"></p>
      <div class="player-saved-actions"><button class="btn-ghost" type="button" data-player-resume hidden>Resume saved quiz</button><button class="btn-ghost" type="button" data-player-reset-saved hidden>Clear saved quiz</button></div>
      <noscript><p>Enable JavaScript to answer one question at a time. You can also open the complete question sets below.</p>${sets.map(({page})=>`<a class="sub-link" href="${escapeHtml(page.filename)}">${escapeHtml(page.label)}</a>`).join(" · ")}</noscript>
    </section>
    <section data-player-round hidden>
      <div class="player-round-head"><span class="chip" data-player-kind></span><span class="player-counter" data-player-counter></span><button class="btn-ghost" type="button" data-player-exit>Finish early</button></div>
      <progress class="player-progress" data-player-progress value="0" max="10" aria-label="Quiz progress"></progress>
      <form data-player-answer novalidate>
        <div data-player-card></div>
        <p class="player-note" data-player-message role="status"></p>
        <div class="player-actions"><button class="btn-ghost" type="button" data-player-skip>Skip</button><button class="btn-primary" type="submit" data-player-check>Check answer</button><button class="btn-primary" type="button" data-player-next hidden>Next question</button></div>
      </form>
    </section>
    <section data-player-results hidden>
      <p class="section-kicker">YOUR RESULTS</p>
      <h2 class="player-result-title" tabindex="-1" data-player-result-title></h2>
      <p class="player-result-score" data-player-result-score></p>
      <p class="player-note" data-player-result-note></p>
      <div class="player-actions"><button class="btn-primary" type="button" data-player-retry>Retry missed questions</button><button class="btn-ghost" type="button" data-player-again>New quiz</button><button class="btn-ghost" type="button" data-player-configure>Change settings</button></div>
      <div class="player-review" data-player-review></div>
    </section>
    ${templates}
  </section>`;
}
function buildQuizPlayer(siteMeta,reading){
  if(!reading.pages.some((page)=>page.type==="quiz"))return;
  const outputPath=path.join(siteDir,"readings",reading.slug,"quiz.html");
  const content=isBlockedReading(reading)?pendingReadingHtml(reading,"퀴즈 풀기"):isReleaseLockedReading(reading)?pendingReleaseHtml(reading,"퀴즈 풀기"):renderQuizPlayer(reading);
  const body=`${siteHeader(siteMeta,outputPath)}
<main class="reading-shell reading-detail-shell quiz-player-shell">
  ${renderArticleHeader(outputPath,reading,{activeKey:"quiz",label:"퀴즈 풀기",includePdf:false})}
  <div class="rpanel"><section class="rpanel-main"><section class="panel detail-block player-panel">${content}</section></section></div>
</main>`;
  writeText(outputPath,renderDocument(siteMeta,outputPath,`${reading.title} - 퀴즈 풀기`,body,"OX·단답형·객관식을 한 문제씩 풀고 논문 근거와 해설을 확인하세요.",`data-page-kind="quiz-player" data-reading-slug="${escapeHtml(reading.slug)}" data-reading-page="quiz"`));
}
function renderProfessorPrepCard(card,index,options={}){
  const en=options.language==="en";
  const language=en?"en":"ko";
  const bilingual=options.bilingual===true;
  const question=bilingual?`<span data-prep-question-language="en" lang="en">${renderInline(card.title)}</span><span data-prep-question-language="ko" lang="ko" hidden>${renderInline(card.title_ko)}</span>`:renderInline(card.title);
  const answer=bilingual?`<span data-prep-answer-language="en" lang="en">${renderInline(card.answer_30s)}</span><span data-prep-answer-language="ko" lang="ko" hidden>${renderInline(card.answer_30s_ko)}</span>`:renderInline(card.answer_30s);
  const label=toText(options.label)||(en?"Model answer":"모델 답변");
  const segment=options.reading?loadJson(path.join(rootDir,options.reading.content_dir,"source_segments.json"))?.segments?.find((item)=>item.segment_id===card.evidence_segment_id):null;
  const evidence={language:options.language,evidence_segment_id:card.evidence_segment_id,evidence_segment:segment};
  return `<article class="panel prep-card" id="${escapeHtml(card.card_id)}" data-prep-card data-card-id="${escapeHtml(card.card_id)}">
  <div class="prep-card-head"><div><p class="section-kicker">${escapeHtml(label)} ${String(index+1).padStart(2,"0")}</p><h3 data-prep-title lang="${language}">${question}</h3></div><button class="btn-ghost prep-difficult-btn" type="button" aria-pressed="false" data-prep-difficult>${en?"Mark for practice":"표시"}</button></div>
  <section class="prep-block prep-answer-block" data-prep-answer><h4 class="prep-answer-label" data-prep-answer-label lang="${language}">${en?"30-second answer":"30초 답변"}</h4><p class="prep-answer-copy" lang="${language}">${answer}</p>${renderQuizEvidence(evidence)}</section>
</article>`;
}
function buildProfessorPrep(siteMeta,reading,page){const outputPath=path.join(siteDir,"readings",reading.slug,page.filename);const prep=loadProfessorPrep(page.sourcePath);const coldCallDeck=prep?buildProfessorPrepDeck(prep.cards,"prep-cold-call"):null;const readingResponseDeck=prep?buildProfessorPrepDeck(prep.reading_response.cards,"prep-reading-response"):null;const content=isBlockedReading(reading)?pendingReadingHtml(reading,page.label):isReleaseLockedReading(reading)?pendingReleaseHtml(reading,page.label):canRenderPageContent(reading,page)?(prep?renderProfessorPrepDeckSection(prep,coldCallDeck,readingResponseDeck,{reading,draft:!isApprovedStatus(page.source_validation_status)}):placeholderProfessorPrepHtml(page,page.sourcePath)):pendingUploadHtml(reading,page.label);const body=`
${siteHeader(siteMeta,outputPath)}
<main class="reading-shell reading-detail-shell">
  ${renderReadingDetailHeader(outputPath,reading,{activeKey:page.key,currentLabel:"교수님 답변 대비"})}
  <div class="rpanel">
    <section class="rpanel-main">
      <section class="panel detail-block detail-content-block">
        <section class="article-body prep-body detail-article-body">${content}</section>
      </section>
    </section>
    ${renderReadingDetailAside(outputPath,reading)}
  </div>
</main>
`;writeText(outputPath,renderDocument(siteMeta,outputPath,`${reading.title} - ${page.label}`,body,reading.description,`data-page-kind="prep" data-reading-slug="${escapeHtml(reading.slug)}" data-reading-page="${escapeHtml(page.key)}"`,"ko"));}
function writeAssets(){writeText(path.join(siteDir,"assets","styles.css"),readText(styleSource).replace(/\r\n?/g,"\n"));writeText(path.join(siteDir,"assets","app.js"),readText(appSource).replace(/\r\n?/g,"\n"));if(fs.existsSync(brandLogoSource)){const target=path.join(siteDir,"assets","branding","snu.png");fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(brandLogoSource,target);}}
function refreshReadings(manifest,siteMeta={},slugFilter=null){ensureContentPlaceholders(manifest,siteMeta,slugFilter);return prepareReadings(manifest,siteMeta);}
function buildSlugOutputs(siteMeta,manifest,readings,slug){const target=readings.find((reading)=>reading.slug===slug);if(!target)throw new Error(`Unknown slug: ${slug}`);fs.mkdirSync(siteDir,{recursive:true});const thumbnails=buildThumbnails(manifest,target.slug);writeAssets();buildIndex(siteMeta,readings,thumbnails);writePublicPdf(target);const readingDir=path.join(siteDir,"readings",target.slug);const readingAssetDir=path.join(siteDir,"assets","readings",target.slug);if(fs.existsSync(readingDir))fs.rmSync(readingDir,{recursive:true,force:true});if(fs.existsSync(readingAssetDir))fs.rmSync(readingAssetDir,{recursive:true,force:true});copyReadingAssets(target);buildLanding(siteMeta,target);for(const page of target.pages){buildPage(siteMeta,target,page);}return target;}
function buildFullOutputs(siteMeta,manifest,readings){const preservedMarkdown=snapshotPreservedDocMarkdown();if(fs.existsSync(siteDir))fs.rmSync(siteDir,{recursive:true,force:true});const thumbnails=buildThumbnails(manifest);writeAssets();buildIndex(siteMeta,readings,thumbnails);for(const reading of readings){writePublicPdf(reading);copyReadingAssets(reading);buildLanding(siteMeta,reading);for(const page of reading.pages){buildPage(siteMeta,reading,page);}}restorePreservedDocMarkdown(preservedMarkdown);}
function cliValue(flag){const index=process.argv.indexOf(flag);return index!==-1?process.argv[index+1]||"":"";}
function parseArgs(){const slug=cliValue("--slug");const previewLocked=process.argv.includes("--preview-locked");return{slug:slug||null,homeOnly:process.argv.includes("--home-only"),previewLocked,previewDraft:process.argv.includes("--preview-draft"),outputDir:cliValue("--output-dir")||null};}
function buildPage(siteMeta,reading,page){if(page.type==="article"){buildArticle(siteMeta,reading,page);return;}if(page.type==="professor-prep"){buildProfessorPrep(siteMeta,reading,page);return;}buildQuiz(siteMeta,reading,page);}
function buildHomeOutputs(siteMeta,manifest,readings){fs.mkdirSync(siteDir,{recursive:true});const thumbnails=buildThumbnails(manifest);writeAssets();buildIndex(siteMeta,readings,thumbnails);}
function resolvePreviewSiteDir(outputDir){
  const tmpDir=path.join(rootDir,"tmp");
  const candidate=path.resolve(rootDir,outputDir||path.join("tmp","site-preview"));
  if(!path.relative(path.join(rootDir,"docs"),candidate))throw new Error("Preview output cannot overwrite docs; omit --output-dir to use tmp/site-preview.");
  const isSubdirectory=(base,target)=>{const relative=path.relative(base,target);return Boolean(relative)&&relative!==".."&&!relative.startsWith(`..${path.sep}`)&&!path.isAbsolute(relative);};
  if(!isSubdirectory(tmpDir,candidate))throw new Error("Preview output must be a non-root directory inside project tmp.");
  fs.mkdirSync(tmpDir,{recursive:true});
  let existing=candidate;
  while(!fs.existsSync(existing))existing=path.dirname(existing);
  const resolvedTarget=path.resolve(fs.realpathSync(existing),path.relative(existing,candidate));
  if(!isSubdirectory(fs.realpathSync(tmpDir),resolvedTarget))throw new Error("Preview output must remain inside project tmp after resolving directory links.");
  return resolvedTarget;
}
function buildSite(options={}){siteDir=path.join(rootDir,"docs");if(options.previewDraft&&!options.previewLocked)throw new Error("--preview-draft requires --preview-locked so draft content cannot be written to public docs");allowDraftPreview=Boolean(options.previewLocked&&options.previewDraft);const manifest=loadManifest();if(options.previewLocked){siteDir=resolvePreviewSiteDir(options.outputDir);const siteMeta={...manifest.site,publish_cutoff_date:"",publish_cutoff_note:""};const readings=prepareReadings(manifest,siteMeta);if(options.homeOnly){buildHomeOutputs(siteMeta,manifest,readings);}else if(options.slug){buildSlugOutputs(siteMeta,manifest,readings,options.slug);}else{buildFullOutputs(siteMeta,manifest,readings);}return{siteMeta,readings,siteDir,preview:true};}const siteMeta=manifest.site;if(options.homeOnly){const readings=prepareReadings(manifest,siteMeta);buildHomeOutputs(siteMeta,manifest,readings);return{siteMeta,readings};}let readings=refreshReadings(manifest,siteMeta,options.slug||null);if(options.slug){buildSlugOutputs(siteMeta,manifest,readings,options.slug);readings=refreshReadings(manifest,siteMeta,options.slug);buildSlugOutputs(siteMeta,manifest,readings,options.slug);writeApprovalStatusReport(rootDir);return{siteMeta,readings};}buildFullOutputs(siteMeta,manifest,readings);readings=refreshReadings(manifest,siteMeta);buildFullOutputs(siteMeta,manifest,readings);writeApprovalStatusReport(rootDir);return{siteMeta,readings};}
module.exports={buildSite};
if(require.main===module){const options=parseArgs();const result=buildSite(options);console.log(options.previewLocked?`[built] locked-content preview ${path.relative(rootDir,result.siteDir)}`:options.homeOnly?"[built] home":options.slug?`[built] reading ${options.slug} + home`:"[built] docs" );}
