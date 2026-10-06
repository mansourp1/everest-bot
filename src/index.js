// ============================================
// EVEREST BOT v3.6 — Auto Monitor + Yahoo Finance
// ============================================

const CONF_KEYS=['structure','smc','ict','candle','liquidity','riskReward'];
const CONF_LABELS={structure:'Market Structure',smc:'SMC/OB',ict:'ICT/FVG',candle:'Candlestick',liquidity:'Liquidity',riskReward:'R/R'};

const MODEL_TIERS={
  aiprime:{fast:{label:'🚀 سریع',text:'gpt-4o-mini',vision:'gpt-4o'},deepseek:{label:'🧠 DeepSeek',text:'deepseek-v4.1-flash',vision:'deepseek-v4.1-flash'},premium:{label:'💎 قوی',text:'claude-sonnet-5',vision:'claude-sonnet-5'}},
  gapgpt:{fast:{label:'🚀 سریع',text:'gpt-4o-mini',vision:'gemini-2.0-flash'},deepseek:{label:'🧠 DeepSeek',text:'deepseek-v4.1-flash',vision:'deepseek-v4.1-flash'},premium:{label:'💎 قوی',text:'claude-sonnet-5',vision:'claude-sonnet-5'}}
};

const MODE_CONFIG={
  scalping:{label:'اسکلپی',icon:'⚡',minConfidence:70,minRR:2.0,minConfluence:7,allowedTFs:['1min','3min','5min','15min']},
  medium:{label:'متوسط',icon:'⚖️',minConfidence:65,minRR:1.5,minConfluence:6,allowedTFs:['5min','15min','1h','4h']},
  confident:{label:'مطمئن',icon:'🛡️',minConfidence:75,minRR:2.5,minConfluence:8,allowedTFs:['15min','1h','4h']}
};

const DATA_PROVIDERS={
  twelve:{label:'📊 Twelve Data'},
  yahoo:{label:'🌐 Yahoo Finance'},
  auto:{label:'🔄 خودکار (Twelve→Yahoo)'}
};

const TF_MINUTES={'1min':1,'3min':3,'5min':5,'15min':15,'1h':60,'4h':240};
const TF_LABELS={'1min':'1 دقیقه','3min':'3 دقیقه','5min':'5 دقیقه','15min':'15 دقیقه','1h':'1 ساعت','4h':'4 ساعت'};

function isAdmin(env,chatId){if(!env.ADMIN_CHAT_ID)return true;return String(chatId)===String(env.ADMIN_CHAT_ID);}
function isSecurityEnabled(env){return !!env.ADMIN_CHAT_ID;}
function withTimeout(p,ms,l){return Promise.race([p,new Promise((_,r)=>setTimeout(()=>r(new Error(l+' timeout')),ms))]);}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

const PROVIDER_NAMES={gemini:'Google Gemini',aiprime:'AIPrime',github:'GitHub Models',groq:'Groq',together:'Together AI',gapgpt:'GapGPT',openrouter:'OpenRouter',mistral:'Mistral AI',huggingface:'HuggingFace',cloudflare:'Cloudflare',nvidia:'NVIDIA NIM',llm7:'LLM7.io',avalai:'AvalAI',metis:'Metis',onexai:'1xAi'};

function getKey(env,p){
  const m={gemini:env.GEMINI_KEY_1||env.GEMINI_KEY,aiprime:env.AIPRIME_KEY,github:env.GITHUB_MODELS_TOKEN,groq:env.GROQ_KEY,together:env.TOGETHER_KEY,gapgpt:env.GAPGPT_KEY,openrouter:env.OPENROUTER_KEY,mistral:env.MISTRAL_KEY,huggingface:env.HUGGINGFACE_KEY,cloudflare:env.CLOUDFLARE_KEY,nvidia:env.NVIDIA_KEY,llm7:env.LLM7_KEY||'unused',avalai:env.AVALAI_KEY,metis:env.METIS_KEY,onexai:env.ONEXAI_KEY};
  return m[p]||'';
}
function getGeminiKeys(env){const k=[];if(env.GEMINI_KEY_1)k.push(env.GEMINI_KEY_1);if(env.GEMINI_KEY_2)k.push(env.GEMINI_KEY_2);if(env.GEMINI_KEY_3)k.push(env.GEMINI_KEY_3);if(env.GEMINI_KEY)k.push(env.GEMINI_KEY);return k;}
function getAvailableProviders(env){return ['gemini','aiprime','groq','github','together','gapgpt','openrouter','mistral','huggingface','cloudflare','nvidia','llm7','avalai','metis','onexai'].filter(p=>{if(p==='gemini')return getGeminiKeys(env).length>0;if(p==='llm7')return true;return !!getKey(env,p);});}

// ===== KV =====
async function setUserState(env,c,s){await env.KV.put('state:'+c,JSON.stringify(s),{expirationTtl:600});}
async function getUserState(env,c){try{return await env.KV.get('state:'+c,'json');}catch(e){return null;}}
async function clearUserState(env,c){await env.KV.delete('state:'+c);}
async function getJournal(env,c){try{return await env.KV.get('journal:'+c,'json')||[];}catch(e){return [];}}
async function saveJournal(env,c,j){await env.KV.put('journal:'+c,JSON.stringify(j));}
async function getWatchlist(env,c){try{return await env.KV.get('watch:'+c,'json')||[];}catch(e){return [];}}
async function saveWatchlist(env,c,l){await env.KV.put('watch:'+c,JSON.stringify(l));}
async function getConfluenceMode(env,c){try{return (await env.KV.get('confmode:'+c))||'auto';}catch(e){return 'auto';}}
async function setConfluenceMode(env,c,m){await env.KV.put('confmode:'+c,m);}
async function getUserMode(env,c){try{const m=await env.KV.get('mode:'+c);return MODE_CONFIG[m]?m:'medium';}catch(e){return 'medium';}}
async function setUserMode(env,c,m){if(!MODE_CONFIG[m])m='medium';await env.KV.put('mode:'+c,m);}
async function getUserModelTier(env,c,p){try{return (await env.KV.get('tier:'+c+':'+p))||'fast';}catch(e){return 'fast';}}
async function setUserModelTier(env,c,p,t){await env.KV.put('tier:'+c+':'+p,t);}
async function getUserDataProvider(env,c){try{return (await env.KV.get('dataprov:'+c))||'auto';}catch(e){return 'auto';}}
async function setUserDataProvider(env,c,p){await env.KV.put('dataprov:'+c,p);}

// ⭐ Monitor storage
async function getMonitors(env,c){try{return await env.KV.get('monitors:'+c,'json')||[];}catch(e){return [];}}
async function saveMonitors(env,c,list){await env.KV.put('monitors:'+c,JSON.stringify(list));}

function getModelTierConfig(prov,tier,hasImage){
  const cfg=MODEL_TIERS[prov]?.[tier];
  if(!cfg)return {model:hasImage?'gpt-4o':'gpt-4o-mini',label:''};
  return {model:hasImage?cfg.vision:cfg.text,label:cfg.label};
}

const SYSTEM_PROMPT="شما یک تحلیل‌گر ارشد بازارهای مالی با ۱۵ سال تجربه در SMC، ICT و پرایس اکشن هستید.\n\n"+
"**در انتهای پاسخ دقیقاً این فرمت را بنویس:**\n---\nDirection: [BUY/SELL/WAIT]\nRegime: [TRENDING_UP/TRENDING_DOWN/RANGING/TRANSITIONAL]\nConfidenceScore: [0-100]\nEntry: [عدد یا N/A]\nStop Loss: [عدد یا N/A]\nTP1: [عدد یا N/A]\nTP2: [عدد یا N/A]\nTP3: [عدد یا N/A]\nR/R: [نسبت یا N/A]\n---\n\nتحلیل کامل و مفصل (حداقل ۵۰۰ کلمه) با ساختار SMC/ICT هم بنویس.";

const MULTI_TF_PROMPT="شما یک تحلیل‌گر ارشد بازارهای مالی هستید.\n\n**تحلیل MTF**\n🎯 HTF (4H)\n🔍 MTF (1H)\n📊 LTF (15M)\n⏱️ EntryTF (1M)\n\n**فرمت:**\n---\nDirection: [BUY/SELL/WAIT]\nConfluenceScore: [0-10]\nHTF4H: [BULLISH/BEARISH/RANGING]\nMTF1H: [BULLISH/BEARISH/RANGING]\nLTF15M: [BULLISH/BEARISH/RANGING]\nEntryTF1M: [BULLISH/BEARISH/RANGING]\nConfidenceScore: [0-100]\nEntry: [عدد یا N/A]\nStop Loss: [عدد یا N/A]\nTP1: [عدد یا N/A]\nTP2: [عدد یا N/A]\nTP3: [عدد یا N/A]\nR/R: [نسبت یا N/A]\n---";

const IMAGE_PROMPT="شما یک تحلیل‌گر ارشد بازارهای مالی هستید.\n\n**تحلیل تصویر**\n\n**تحلیل کامل بنویس (۵۰۰ کلمه):**\n### ۰. رژیم بازار\n### ۱. ساختار\n### ۲. SMC\n### ۳. ICT\n### ۴. کندل\n### ۵. سطوح\n### ۶. سناریو\n### ۷. خلاصه\n\n**فرمت نهایی:**\n---\nDirection: [BUY/SELL/WAIT]\nSymbol: [نماد یا UNKNOWN]\nTimeframe: [TF یا UNKNOWN]\nRegime: [...]\nConfidenceScore: [0-100]\nEntry: [عدد یا N/A]\nStop Loss: [عدد یا N/A]\nTP1: [عدد یا N/A]\nR/R: [نسبت یا N/A]\n---";

// ===== PARSING =====
function parseJsonBlock(text){
  const m=text.match(/```json\s*([\s\S]*?)```/i);
  if(!m){const m2=text.match(/\{[\s\S]*"direction"[\s\S]*\}/);if(m2){try{return JSON.parse(m2[0]);}catch(e){return null;}}return null;}
  try{return JSON.parse(m[1].trim());}catch(e){return null;}
}
function parseRR(s){if(!s)return null;const m=String(s).match(/(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)/);if(m){const a=parseFloat(m[1]),b=parseFloat(m[2]);return a>0?b/a:null;}const n=parseFloat(s);return isNaN(n)?null:n;}
function findValue(text,labels){for(const l of labels){const p=new RegExp("\\*{0,2}"+l+"\\*{0,2}\\s*[:=]\\s*\\*{0,2}\\s*([\\d]+(?:\\.[\\d]+)?)",'i');const m=text.match(p);if(m){const n=parseFloat(m[1]);if(!isNaN(n))return n;}}return null;}
function detectDirection(text){if(!text)return 'WAIT';const td=text.match(/Direction\s*[:=]\s*(BUY|SELL|WAIT|LONG|SHORT)/i);if(td){const v=td[1].toUpperCase();if(v==='BUY'||v==='LONG')return 'BUY';if(v==='SELL'||v==='SHORT')return 'SELL';return 'WAIT';}return 'WAIT';}

function extractLevels(rawText){
  const j=parseJsonBlock(rawText);
  if(j)return {direction:j.direction||'WAIT',regime:j.regime||null,confidence:typeof j.confidence==='number'?j.confidence:(j.confidenceScore||null),entry:j.entry||null,sl:j.stopLoss||j.sl||null,tp1:j.tp1||null,tp2:j.tp2||null,tp3:j.tp3||null,rr:j.rr||null,confluenceScore:j.confluenceScore||null,htf:j.htf4h||null,mtf:j.mtf1h||null,ltf:j.ltf15m||null,entryTf:j.entrytf1m||null,detectedSymbol:j.symbol||null,detectedTimeframe:j.timeframe||null,aiScores:j.scores||null};
  const blocks=rawText.match(/---\s*\n([\s\S]*?)\n\s*---/g);
  let text=rawText;if(blocks&&blocks.length)text=blocks[blocks.length-1];
  const rM=text.match(/Regime\s*[:=]\s*(TRENDING_UP|TRENDING_DOWN|RANGING|TRANSITIONAL)/i);
  const rrM=text.match(/R\/R\s*[:=]\s*([\d\.:]+)/i);
  const cM=text.match(/ConfluenceScore\s*[:=]\s*([\d\.]+)/i);
  const hM=text.match(/HTF4H\s*[:=]\s*(BULLISH|BEARISH|RANGING)/i);
  const mM=text.match(/MTF1H\s*[:=]\s*(BULLISH|BEARISH|RANGING)/i);
  const lM=text.match(/LTF15M\s*[:=]\s*(BULLISH|BEARISH|RANGING)/i);
  const eM=text.match(/EntryTF1M\s*[:=]\s*(BULLISH|BEARISH|RANGING)/i);
  const sM=text.match(/Symbol\s*[:=]\s*([^\n]+)/i);
  const tM=text.match(/Timeframe\s*[:=]\s*([^\n]+)/i);
  return {direction:detectDirection(rawText),regime:rM?rM[1].toUpperCase():null,confidence:findValue(text,['ConfidenceScore','امتیاز\\s*اطمینان']),entry:findValue(text,['Entry','ورود']),sl:findValue(text,['Stop[\\s-]?Loss','SL','حد\\s*ضرر']),tp1:findValue(text,['TP\\s*1']),tp2:findValue(text,['TP\\s*2']),tp3:findValue(text,['TP\\s*3']),rr:rrM?rrM[1]:null,confluenceScore:cM?parseFloat(cM[1]):null,htf:hM?hM[1].toUpperCase():null,mtf:mM?mM[1].toUpperCase():null,ltf:lM?lM[1].toUpperCase():null,entryTf:eM?eM[1].toUpperCase():null,detectedSymbol:sM?sM[1].trim():null,detectedTimeframe:tM?tM[1].trim():null,aiScores:null};
}

async function validateSignal(env,chatId,levels){
  const userMode=await getUserMode(env,chatId);
  const cfg=MODE_CONFIG[userMode];
  const issues=[];
  const orig=levels.direction;
  if(orig!=='WAIT'){
    if(levels.confidence==null){issues.push('امتیاز نیست');levels.direction='WAIT';}
    else if(levels.confidence<cfg.minConfidence){issues.push('اطمینان '+levels.confidence+'% کم');levels.direction='WAIT';}
  }
  if(levels.direction==='BUY'||levels.direction==='SELL'){
    if(levels.entry==null){issues.push('Entry نیست');levels.direction='WAIT';}
    else if(levels.sl==null){issues.push('SL نیست');levels.direction='WAIT';}
    else{
      if(levels.direction==='BUY'&&levels.sl>=levels.entry){issues.push('SL بالای Entry');levels.direction='WAIT';}
      if(levels.direction==='SELL'&&levels.sl<=levels.entry){issues.push('SL زیر Entry');levels.direction='WAIT';}
    }
    if(levels.direction!=='WAIT'&&levels.entry&&levels.sl&&levels.tp1){
      const r=Math.abs(levels.entry-levels.sl),rw=Math.abs(levels.tp1-levels.entry);
      const rr=r>0?rw/r:0;
      if(rr<cfg.minRR){issues.push('R/R کم');levels.direction='WAIT';}
      else levels.rr='1:'+rr.toFixed(2);
    }
  }
  levels.validationIssues=issues;
  levels.appliedModeCfg=cfg;
  return levels;
}

// ===== CONFLUENCE =====
function extractScores(text){
  const j=parseJsonBlock(text);
  if(j&&j.scores){const s={};let ok=0;for(const k of CONF_KEYS){let v=j.scores[k];if(typeof v==='number'&&v>=0&&v<=100){s[k]=v;ok++;}else if(typeof v==='string'){const n=parseFloat(v);if(!isNaN(n)){s[k]=n;ok++;}}}if(ok>=4)return s;}
  const pats={structure:/(?:Structure|ساختار)[^\d\n]{0,25}(\d{1,3})/i,smc:/(?:SMC|Order\s*Block|OB)[^\d\n]{0,25}(\d{1,3})/i,ict:/(?:ICT|FVG|Fair\s*Value)[^\d\n]{0,25}(\d{1,3})/i,candle:/(?:Candle|کندل|Engulf|Pin|Hammer)[^\d\n]{0,25}(\d{1,3})/i,liquidity:/(?:Liquidity|نقدینگی|Sweep)[^\d\n]{0,25}(\d{1,3})/i,riskReward:/(?:R\/R|RiskReward|Risk-Reward)[^\d\n]{0,25}(\d{1,3})/i};
  const scores={};let found=0;
  for(const k in pats){const m=text.match(pats[k]);if(m){const v=parseInt(m[1]);if(v>=0&&v<=100){scores[k]=v;found++;}}}
  return found>=3?scores:null;
}
function calculateConfluenceAuto(levels,rawText){
  const t=String(rawText||'');const s={};
  let st=50;if(/\bBOS\b/i.test(t))st+=12;if(/CHOCH|CHoCH/i.test(t))st+=10;if(/Retest|پولبک/i.test(t))st+=8;if(/TRENDING_UP|TRENDING_DOWN/i.test(t))st+=10;if(/RANGING|رنج/i.test(t))st-=15;s.structure=Math.max(0,Math.min(100,st));
  let smc=50;if(/Order\s*Block|\bOB\b/i.test(t))smc+=18;if(/Premium|Discount/i.test(t))smc+=8;s.smc=Math.max(0,Math.min(100,smc));
  let ict=50;if(/FVG|Fair\s*Value\s*Gap/i.test(t))ict+=22;if(/Imbalance/i.test(t))ict+=12;s.ict=Math.max(0,Math.min(100,ict));
  let cd=50;if(/Engulf|پوششی/i.test(t))cd+=18;if(/Pin\s*Bar/i.test(t))cd+=15;s.candle=Math.max(0,Math.min(100,cd));
  let lq=50;if(/Liquidity\s*Sweep|Sweep/i.test(t))lq+=20;if(/نقدینگی/i.test(t))lq+=10;s.liquidity=Math.max(0,Math.min(100,lq));
  let rr=0;if(levels.entry&&levels.sl&&levels.tp1){const r=Math.abs(levels.entry-levels.sl),rw=Math.abs(levels.tp1-levels.entry);rr=Math.min(100,Math.round((r>0?rw/r:0)*33));}s.riskReward=rr;
  const avg=(s.structure+s.smc+s.ict+s.candle+s.liquidity+s.riskReward)/6;
  return {scores:s,confluence:Math.round((avg/10)*10)/10,auto:true};
}
async function resolveConfluence(env,chatId,levels,rawText){
  const mode=await getConfluenceMode(env,chatId);
  const result={mode,scores:null,confluence:null,auto:false,warning:null};
  const aiScores=levels.aiScores||extractScores(rawText);
  if(aiScores&&Object.keys(aiScores).length>=4){
    const af=calculateConfluenceAuto(levels,rawText);
    for(const k of CONF_KEYS){if(aiScores[k]==null)aiScores[k]=af.scores[k];}
    let sum=0;for(const k of CONF_KEYS)sum+=(aiScores[k]||0);
    result.scores=aiScores;result.confluence=(levels.confluenceScore!=null)?levels.confluenceScore:Math.round((sum/6/10)*10)/10;result.auto=false;return result;
  }
  if(mode==='auto'||mode==='force'){const a=calculateConfluenceAuto(levels,rawText);result.scores=a.scores;result.confluence=a.confluence;result.auto=true;return result;}
  if(mode==='normal'){result.warning='⚠️ نمرات دریافت نشد.';}
  return result;
}

// ===== AI PROVIDERS =====
function gemReq(parts){return{contents:[{parts}],generationConfig:{temperature:.2,topP:.9,maxOutputTokens:12288}};}
function oaiReq(parts,model){const content=[];parts.forEach(p=>{if(p.text)content.push({type:'text',text:p.text});if(p.inline_data)content.push({type:'image_url',image_url:{url:`data:${p.inline_data.mime_type};base64,${p.inline_data.data}`}});});return{model,messages:[{role:'user',content}],temperature:.2,max_tokens:12288};}

async function callGeminiText(env,prompt,imgB64,imgMime){
  const keys=getGeminiKeys(env);if(!keys.length)throw new Error('no key');
  const models=['gemini-3.5-flash-lite','gemini-2.5-flash','gemini-2.0-flash','gemini-1.5-flash'];
  const parts=[{text:prompt}];if(imgB64)parts.push({inline_data:{mime_type:imgMime,data:imgB64}});
  let lastErr='';
  for(const k of keys){
    for(const m of models){
      try{
        const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+m+':generateContent?key='+k,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(gemReq(parts))});
        const d=await r.json();
        if(r.ok){const t=d?.candidates?.[0]?.content?.parts?.[0]?.text;if(t)return t;}
        lastErr=d?.error?.message||'HTTP '+r.status;
        if(r.status===400&&/not found/i.test(lastErr))continue;
        if([429,401,403].includes(r.status))break;
      }catch(e){lastErr=e.message;}
    }
  }
  throw new Error('Gemini: '+lastErr);
}

async function callAIPrimeText(env,prompt,imgB64,imgMime,chatId){
  const key=env.AIPRIME_KEY;if(!key)throw new Error('no key');
  const tier=chatId?await getUserModelTier(env,chatId,'aiprime'):'fast';
  const cfg=getModelTierConfig('aiprime',tier,!!imgB64);
  const content=imgB64?[{type:'text',text:prompt},{type:'image_url',image_url:{url:'data:'+imgMime+';base64,'+imgB64}}]:prompt;
  const r=await fetch('https://api.aiprime.shop/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:cfg.model,messages:[{role:'user',content}],temperature:0.1,max_tokens:8192})});
  const d=await r.json();if(!r.ok)throw new Error(d?.error?.message||'HTTP '+r.status);
  return d.choices?.[0]?.message?.content||'';
}

async function callGapGPTText(env,prompt,imgB64,imgMime,chatId){
  const key=env.GAPGPT_KEY;if(!key)throw new Error('no key');
  const tier=chatId?await getUserModelTier(env,chatId,'gapgpt'):'fast';
  const cfg=getModelTierConfig('gapgpt',tier,!!imgB64);
  const content=imgB64?[{type:'text',text:prompt},{type:'image_url',image_url:{url:'data:'+imgMime+';base64,'+imgB64}}]:prompt;
  const r=await fetch('https://api.gapgpt.app/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:cfg.model,messages:[{role:'user',content}],temperature:0.1,max_tokens:8192})});
  const d=await r.json();if(!r.ok)throw new Error(d?.error?.message||'HTTP '+r.status);
  return d.choices?.[0]?.message?.content||'';
}

async function callGroqText(env,prompt,imgB64,imgMime){
  const key=env.GROQ_KEY;if(!key)throw new Error('no key');
  const models=['meta-llama/llama-4-scout-17b-16e-instruct','llama-3.3-70b-versatile'];
  let lastErr='';
  for(const m of models){
    try{
      const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify(oaiReq(imgB64?[{type:'text',text:prompt},{type:'image_url',image_url:{url:'data:'+imgMime+';base64,'+imgB64}}]:[{text:prompt}],m))});
      const d=await r.json();if(r.ok){const t=d?.choices?.[0]?.message?.content;if(t)return t;}lastErr=d?.error?.message;
    }catch(e){lastErr=e.message;}
  }
  throw new Error('Groq: '+lastErr);
}

async function callGitHubText(env,prompt,imgB64,imgMime){
  const t=env.GITHUB_MODELS_TOKEN;if(!t)throw new Error('no token');
  const content=imgB64?[{type:'text',text:prompt},{type:'image_url',image_url:{url:'data:'+imgMime+';base64,'+imgB64}}]:prompt;
  const r=await fetch('https://models.inference.ai.azure.com/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},body:JSON.stringify({model:'gpt-4o-mini',messages:[{role:'user',content}],temperature:0.1,max_tokens:8192})});
  const d=await r.json();if(!r.ok)throw new Error(d?.error?.message);return d.choices?.[0]?.message?.content||'';
}

async function callOpenRouterText(env,prompt,imgB64,imgMime){
  const key=env.OPENROUTER_KEY;if(!key)throw new Error('no key');
  const models=['inclusionai/ling-3.0-flash-vl:free','google/gemma-3-27b-it:free'];
  let lastErr='';
  for(const m of models){
    try{
      const content=imgB64?[{type:'text',text:prompt},{type:'image_url',image_url:{url:'data:'+imgMime+';base64,'+imgB64}}]:prompt;
      const r=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:m,messages:[{role:'user',content}],temperature:0.1,max_tokens:8192})});
      const d=await r.json();if(r.ok){const t=d?.choices?.[0]?.message?.content;if(t)return t;}lastErr=d?.error?.message;
    }catch(e){lastErr=e.message;}
  }
  throw new Error('OR: '+lastErr);
}

async function callMistralText(env,prompt,imgB64,imgMime){
  const key=env.MISTRAL_KEY;if(!key)throw new Error('no key');
  const model=imgB64?'pixtral-12b-2409':'mistral-small-latest';
  const content=imgB64?[{type:'text',text:prompt},{type:'image_url',image_url:'data:'+imgMime+';base64,'+imgB64}]:prompt;
  const r=await fetch('https://api.mistral.ai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model,messages:[{role:'user',content}],temperature:0.1,max_tokens:8192})});
  const d=await r.json();if(!r.ok)throw new Error(d?.error?.message);return d.choices?.[0]?.message?.content||'';
}

async function callAvalAIText(env,prompt,imgB64,imgMime){
  const key=env.AVALAI_KEY;if(!key)throw new Error('no key');
  const content=imgB64?[{type:'text',text:prompt},{type:'image_url',image_url:{url:'data:'+imgMime+';base64,'+imgB64}}]:prompt;
  const r=await fetch('https://api.avalai.ir/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:'gemini-2.0-flash',messages:[{role:'user',content}],temperature:0.1,max_tokens:8192})});
  const d=await r.json();if(!r.ok)throw new Error(d?.error?.message);return d.choices?.[0]?.message?.content||'';
}

async function callTogetherText(env,prompt,imgB64,imgMime){
  const key=env.TOGETHER_KEY;if(!key)throw new Error('no key');
  const model=imgB64?'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo':'meta-llama/Llama-3.3-70B-Instruct-Turbo';
  const content=imgB64?[{type:'text',text:prompt},{type:'image_url',image_url:{url:'data:'+imgMime+';base64,'+imgB64}}]:prompt;
  const r=await fetch('https://api.together.xyz/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model,messages:[{role:'user',content}],temperature:0.1,max_tokens:8192})});
  const d=await r.json();if(!r.ok)throw new Error(d?.error?.message);return d.choices?.[0]?.message?.content||'';
}

async function callHuggingFaceText(env,prompt,imgB64,imgMime){
  const key=env.HUGGINGFACE_KEY;if(!key)throw new Error('no key');
  const model=imgB64?'Qwen/Qwen2.5-VL-7B-Instruct':'meta-llama/Meta-Llama-3-8B-Instruct';
  const content=imgB64?[{type:'text',text:prompt},{type:'image_url',image_url:{url:'data:'+imgMime+';base64,'+imgB64}}]:prompt;
  const r=await fetch('https://api-inference.huggingface.co/models/'+model+'/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model,messages:[{role:'user',content}],temperature:0.1,max_tokens:8192})});
  const d=await r.json();if(!r.ok)throw new Error(d?.error?.message);return d.choices?.[0]?.message?.content||'';
}

async function callCloudflareText(env,prompt,imgB64,imgMime){
  const key=env.CLOUDFLARE_KEY;if(!key)throw new Error('no key');
  const [acc,tok]=key.split(':');if(!acc||!tok)throw new Error('bad key');
  const model=imgB64?'@cf/meta/llama-3.2-11b-vision-instruct':'@cf/meta/llama-3.1-8b-instruct';
  const content=imgB64?[{type:'text',text:prompt},{type:'image_url',image_url:{url:'data:'+imgMime+';base64,'+imgB64}}]:prompt;
  const r=await fetch('https://api.cloudflare.com/client/v4/accounts/'+acc+'/ai/run/'+model,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},body:JSON.stringify({messages:[{role:'user',content}]})});
  const d=await r.json();if(!r.ok)throw new Error(d?.errors?.[0]?.message);return d.result?.response||'';
}

async function callNvidiaText(env,prompt,imgB64,imgMime){
  const key=env.NVIDIA_KEY;if(!key)throw new Error('no key');
  const model=imgB64?'meta/llama-3.2-90b-vision-instruct':'meta/llama-3.3-70b-instruct';
  const content=imgB64?[{type:'text',text:prompt},{type:'image_url',image_url:{url:'data:'+imgMime+';base64,'+imgB64}}]:prompt;
  const r=await fetch('https://integrate.api.nvidia.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model,messages:[{role:'user',content}],temperature:0.1,max_tokens:8192})});
  const d=await r.json();if(!r.ok)throw new Error(d?.error?.message);return d.choices?.[0]?.message?.content||'';
}

async function callLLM7Text(env,prompt,imgB64,imgMime){
  const key=env.LLM7_KEY||'unused';
  const models=['pro','default'];let lastErr='';
  for(const m of models){
    try{
      const content=imgB64?[{type:'text',text:prompt},{type:'image_url',image_url:{url:'data:'+imgMime+';base64,'+imgB64}}]:prompt;
      const r=await fetch('https://api.llm7.io/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:m,messages:[{role:'user',content}],temperature:0.1,max_tokens:8192})});
      const d=await r.json();if(r.ok){const t=d?.choices?.[0]?.message?.content;if(t)return t;}lastErr=d?.error?.message;
    }catch(e){lastErr=e.message;}
  }
  throw new Error('LLM7: '+lastErr);
}

async function callMetisText(env,prompt,imgB64,imgMime){
  const key=env.METIS_KEY;if(!key)throw new Error('no key');
  const content=imgB64?[{type:'text',text:prompt},{type:'image_url',image_url:{url:'data:'+imgMime+';base64,'+imgB64}}]:prompt;
  const r=await fetch('https://api.metisai.ir/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:'google/gemini-2.5-flash',messages:[{role:'user',content}],temperature:0.1,max_tokens:8192})});
  const d=await r.json();if(!r.ok)throw new Error(d?.error?.message);return d.choices?.[0]?.message?.content||'';
}

async function callOneXAiText(env,prompt,imgB64,imgMime){
  const key=env.ONEXAI_KEY;if(!key)throw new Error('no key');
  const content=imgB64?[{type:'text',text:prompt},{type:'image_url',image_url:{url:'data:'+imgMime+';base64,'+imgB64}}]:prompt;
  const r=await fetch('https://1xai.ir/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:'google/gemini-2.5-flash',messages:[{role:'user',content}],temperature:0.1,max_tokens:8192})});
  const d=await r.json();if(!r.ok)throw new Error(d?.error?.message);return d.choices?.[0]?.message?.content||'';
}

const PROVIDER_FUNCS={gemini:callGeminiText,aiprime:callAIPrimeText,groq:callGroqText,github:callGitHubText,together:callTogetherText,gapgpt:callGapGPTText,openrouter:callOpenRouterText,mistral:callMistralText,huggingface:callHuggingFaceText,cloudflare:callCloudflareText,nvidia:callNvidiaText,llm7:callLLM7Text,avalai:callAvalAIText,metis:callMetisText,onexai:callOneXAiText};

async function callWithFallback(env,prompt,imgB64,imgMime,chatId,forcedProvider){
  let providers;
  if(forcedProvider&&forcedProvider!=='auto'&&PROVIDER_FUNCS[forcedProvider]&&(forcedProvider==='gemini'?getGeminiKeys(env).length>0:getKey(env,forcedProvider))){
    providers=[forcedProvider];
  }else{
    providers=getAvailableProviders(env);
    const hasImg=!!imgB64;
    const pri=hasImg?{gemini:1,aiprime:2,gapgpt:3,groq:4,openrouter:5,mistral:6,together:7,nvidia:8,huggingface:9,github:10,cloudflare:11,avalai:12,metis:13,onexai:14,llm7:15}:{aiprime:1,github:2,groq:3,together:4,gapgpt:5,openrouter:6,mistral:7,llm7:8,avalai:9,metis:10,onexai:11,huggingface:12,nvidia:13,cloudflare:14,gemini:99};
    providers.sort((a,b)=>(pri[a]||50)-(pri[b]||50));
  }
  if(!providers.length)throw new Error('هیچ سرویس فعال نیست');
  const errs=[];
  for(const p of providers){
    try{
      const timeout=(p==='gapgpt'||p==='aiprime')?30000:15000;
      const r=await withTimeout(PROVIDER_FUNCS[p](env,prompt,imgB64,imgMime,chatId),timeout,p);
      if(r&&r.length>10)return {text:r,provider:PROVIDER_NAMES[p]};
      errs.push(p+': کوتاه');
    }catch(e){errs.push(p+': '+e.message);}
  }
  throw new Error('همه سرویس‌ها خطا دادند:\n'+errs.slice(0,8).join('\n'));
}

// ===== MARKET DATA =====
const TD_INT={'1min':'1min','3min':'5min','5min':'5min','15min':'15min','1h':'1h','4h':'4h'};

async function fetchTwelveData(symbol,interval,apiKey){
  const url=new URL('https://api.twelvedata.com/time_series');
  url.searchParams.set('symbol',symbol);url.searchParams.set('interval',interval);url.searchParams.set('outputsize','200');url.searchParams.set('apikey',apiKey);
  const r=await fetch(url.toString());const d=await r.json();
  if(d.status==='error'||d.code)throw new Error(d.message||'Twelve error');
  if(!d.values||!d.values.length)throw new Error('Twelve: no data');
  const result=[];
  for(let i=d.values.length-1;i>=0;i--){const v=d.values[i];result.push({datetime:v.datetime||'',open:parseFloat(v.open),high:parseFloat(v.high),low:parseFloat(v.low),close:parseFloat(v.close),volume:parseFloat(v.volume||0)});}
  return result;
}

async function fetchYahooData(symbol,interval){
  const sm={'XAU/USD':'XAUUSD=X','XAG/USD':'XAGUSD=X','EUR/USD':'EURUSD=X','GBP/USD':'GBPUSD=X','USD/JPY':'USDJPY=X','BTC/USD':'BTC-USD','ETH/USD':'ETH-USD','AUD/USD':'AUDUSD=X','USD/CAD':'USDCAD=X','USD/CHF':'USDCHF=X','NZD/USD':'NZDUSD=X'};
  const ySym=sm[symbol.toUpperCase()]||symbol.replace('/','');
  const im={'1min':'1m','3min':'5m','5min':'5m','15min':'15m','1h':'60m','4h':'60m'};
  const rm={'1m':'1d','5m':'5d','15m':'5d','60m':'3mo'};
  const yInt=im[interval]||'60m';
  const yRange=rm[yInt]||'5d';
  const url=`https://query1.finance.yahoo.com/v8/finance/chart/${ySym}?interval=${yInt}&range=${yRange}`;
  const proxyUrl=`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  let res;
  try{res=await fetch(proxyUrl);if(!res.ok)throw new Error('proxy');}catch(e){res=await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);}
  const d=await res.json();
  if(!d.chart||!d.chart.result||!d.chart.result[0])throw new Error('Yahoo: no data');
  const r=d.chart.result[0];const ts=r.timestamp;const q=r.indicators.quote[0];
  let klines=[];
  for(let i=0;i<ts.length;i++){
    if(q.open[i]==null||q.close[i]==null)continue;
    klines.push({datetime:new Date(ts[i]*1000).toISOString(),open:q.open[i],high:q.high[i],low:q.low[i],close:q.close[i],volume:q.volume?.[i]||0});
  }
  if(interval==='4h'){
    const agg=[];
    for(let i=0;i<klines.length;i+=4){
      const b=klines.slice(i,i+4);if(!b.length)continue;
      agg.push({datetime:b[0].datetime,open:b[0].open,high:Math.max(...b.map(k=>k.high)),low:Math.min(...b.map(k=>k.low)),close:b[b.length-1].close,volume:b.reduce((s,k)=>s+k.volume,0)});
    }
    return agg;
  }
  return klines;
}

async function fetchMarketData(symbol,interval,env,chatId,providerOverride){
  const provider=providerOverride||await getUserDataProvider(env,chatId);
  if(provider==='twelve'){
    if(!env.TWELVE_KEY)throw new Error('TWELVE_KEY نشده');
    return await fetchTwelveData(symbol,interval,env.TWELVE_KEY);
  }
  if(provider==='yahoo'){
    return await fetchYahooData(symbol,interval);
  }
  // auto
  if(env.TWELVE_KEY){
    try{return await fetchTwelveData(symbol,interval,env.TWELVE_KEY);}
    catch(e){console.log('Twelve failed, trying Yahoo:',e.message);return await fetchYahooData(symbol,interval);}
  }
  return await fetchYahooData(symbol,interval);
}

// ===== HELPERS =====
function klinesToText(klines,symbol,tfName){
  if(!klines||!klines.length)return '';
  const last=klines[klines.length-1];
  const recent=klines.slice(-40);
  const rows=recent.slice(-25).map(k=>{const t=k.datetime?String(k.datetime).slice(-8,-3):'';return '  '+t+' | O:'+k.open+' H:'+k.high+' L:'+k.low+' C:'+k.close;}).join('\n');
  return '=== '+tfName+' ('+symbol+') ===\nقیمت: '+last.close+'\n\n'+rows;
}
function normalizeSymbol(s){if(!s)return '';const c=s.trim().toUpperCase();if(c.indexOf('/')!==-1)return c;const m=c.match(/^([A-Z]+)(USD|EUR|GBP|JPY|CHF|AUD|CAD|NZD)$/);if(m)return m[1]+'/'+m[2];return c;}
function regimeLabel(r){return {TRENDING_UP:'📈 صعودی',TRENDING_DOWN:'📉 نزولی',RANGING:'↔️ رنج',TRANSITIONAL:'🔄 گذار'}[r]||'';}
function directionEmoji(d){if(d==='BULLISH'||d==='BUY'||d==='LONG')return '🟢';if(d==='BEARISH'||d==='SELL'||d==='SHORT')return '🔴';if(d==='RANGING'||d==='WAIT')return '⚪️';return d||'—';}

// ===== KEYBOARDS =====
function mainMenu(){return {inline_keyboard:[
  [{text:'📊 تحلیل جدید',callback_data:'menu_analyze'},{text:'🎯 تحلیل MTF',callback_data:'menu_mtf'}],
  [{text:'📸 تحلیل تصویر',callback_data:'menu_image'},{text:'🤖 مانیتور خودکار',callback_data:'menu_monitor'}],
  [{text:'📓 ژورنال',callback_data:'menu_journal'},{text:'🔔 هشدار',callback_data:'menu_watch'}],
  [{text:'⚙️ تنظیمات',callback_data:'menu_settings'},{text:'📈 وضعیت',callback_data:'menu_status'}],
  [{text:'📖 راهنما',callback_data:'menu_help'}]
];};}

function symbolMenu(){return {inline_keyboard:[
  [{text:'🥇 XAU/USD',callback_data:'sym_XAUUSD'},{text:'💶 EUR/USD',callback_data:'sym_EURUSD'}],
  [{text:'₿ BTC/USD',callback_data:'sym_BTCUSD'},{text:'💷 GBP/USD',callback_data:'sym_GBPUSD'}],
  [{text:'💎 ETH/USD',callback_data:'sym_ETHUSD'},{text:'💵 USD/JPY',callback_data:'sym_USDJPY'}],
  [{text:'✏️ نماد دیگر',callback_data:'sym_custom'}],
  [{text:'🏠 منو',callback_data:'menu_main'}]
];};}

function timeframeMenu(sr){return {inline_keyboard:[
  [{text:'🎯 MTF (4H+1H+15M+1M)',callback_data:'mtf_'+sr}],
  [{text:'⏱️ 1 دقیقه',callback_data:'tf_'+sr+'_1min'},{text:'⏱️ 5 دقیقه',callback_data:'tf_'+sr+'_5min'}],
  [{text:'⏱️ 15 دقیقه',callback_data:'tf_'+sr+'_15min'},{text:'🕐 1 ساعت',callback_data:'tf_'+sr+'_1h'}],
  [{text:'📅 4 ساعت',callback_data:'tf_'+sr+'_4h'}],
  [{text:'◀️ بازگشت',callback_data:'menu_analyze'}]
];};}

function providerMenu(list,sr,tf,isMTF){
  const btn=[];let row=[];
  for(const p of list){
    const ic={gemini:'🌟',aiprime:'🅰️',groq:'⚡',openrouter:'🔀',mistral:'🌬️',github:'🐙',together:'🤝',gapgpt:'💎',huggingface:'🤗',cloudflare:'☁️',nvidia:'🟢',llm7:'🎁',avalai:'🇮🇷',metis:'🇮🇷',onexai:'🇮🇷'}[p]||'🤖';
    row.push({text:ic+' '+(PROVIDER_NAMES[p]||p),callback_data:'pvd_'+p+'_'+sr+'_'+(isMTF?'MTF':tf)});
    if(row.length===2){btn.push(row);row=[];}
  }
  if(row.length)btn.push(row);
  btn.push([{text:'◀️ بازگشت',callback_data:isMTF?'menu_main':'menu_analyze'}]);
  return {inline_keyboard:btn};
}

function monitorMenu(){return {inline_keyboard:[
  [{text:'➕ مانیتور جدید',callback_data:'mon_add'}],
  [{text:'📋 لیست مانیتورها',callback_data:'mon_list'}],
  [{text:'🏠 منو',callback_data:'menu_main'}]
];};}

function monitorListMenu(monitors){
  const btn=monitors.map((m,i)=>[{text:(m.active?'🟢':'⏸️')+' #'+(i+1)+' '+m.symbol+' '+m.timeframe+' '+DATA_PROVIDERS[m.dataProvider]?.label,callback_data:'mon_view_'+i}]);
  btn.push([{text:'🏠 منو',callback_data:'menu_main'}]);
  return {inline_keyboard:btn};
}

function monitorTfMenu(){return {inline_keyboard:[
  [{text:'⏱️ 1 دقیقه',callback_data:'mon_tf_1min'},{text:'⏱️ 5 دقیقه',callback_data:'mon_tf_5min'}],
  [{text:'⏱️ 15 دقیقه',callback_data:'mon_tf_15min'},{text:'🕐 1 ساعت',callback_data:'mon_tf_1h'}],
  [{text:'📅 4 ساعت',callback_data:'mon_tf_4h'}],
  [{text:'❌ لغو',callback_data:'mon_cancel'}]
];};}

function monitorAiMenu(){return {inline_keyboard:[
  [{text:'🎯 خودکار',callback_data:'mon_ai_auto'}],
  [{text:'🅰️ AIPrime',callback_data:'mon_ai_aiprime'},{text:'💎 GapGPT',callback_data:'mon_ai_gapgpt'}],
  [{text:'🌟 Gemini',callback_data:'mon_ai_gemini'},{text:'⚡ Groq',callback_data:'mon_ai_groq'}],
  [{text:'❌ لغو',callback_data:'mon_cancel'}]
];};}

function monitorDataMenu(){return {inline_keyboard:[
  [{text:'📊 Twelve Data',callback_data:'mon_dp_twelve'}],
  [{text:'🌐 Yahoo Finance',callback_data:'mon_dp_yahoo'}],
  [{text:'🔄 خودکار (Twelve→Yahoo)',callback_data:'mon_dp_auto'}],
  [{text:'❌ لغو',callback_data:'mon_cancel'}]
];};}

function journalMenu(){return {inline_keyboard:[
  [{text:'➕ معامله جدید',callback_data:'journal_add'}],
  [{text:'📋 لیست',callback_data:'journal_list'},{text:'📊 آمار',callback_data:'journal_stats'}],
  [{text:'🗑️ پاک',callback_data:'journal_clear'}],
  [{text:'🏠 منو',callback_data:'menu_main'}]
];};}

function watchMenu(){return {inline_keyboard:[
  [{text:'➕ هشدار جدید',callback_data:'watch_add'}],
  [{text:'📋 لیست',callback_data:'watch_list'}],
  [{text:'🗑️ پاک',callback_data:'watch_clear'}],
  [{text:'🏠 منو',callback_data:'menu_main'}]
];};}

function modeMenu(cur){const m=x=>cur===x?' ✅':'';return {inline_keyboard:[
  [{text:'⚡ اسکلپی'+m('scalping'),callback_data:'mode_scalping'}],
  [{text:'⚖️ متوسط'+m('medium'),callback_data:'mode_medium'}],
  [{text:'🛡️ مطمئن'+m('confident'),callback_data:'mode_confident'}],
  [{text:'◀️ بازگشت',callback_data:'menu_settings'}]
];};}

function confModeMenu(cur){const m=x=>cur===x?' ✅':'';return {inline_keyboard:[
  [{text:'🔵 عادی'+m('normal'),callback_data:'conf_normal'}],
  [{text:'🟢 خودکار'+m('auto'),callback_data:'conf_auto'}],
  [{text:'🔴 اجبار'+m('force'),callback_data:'conf_force'}],
  [{text:'◀️ بازگشت',callback_data:'menu_settings'}]
];};}

function dataProviderMenu(cur){const m=x=>cur===x?' ✅':'';return {inline_keyboard:[
  [{text:'📊 Twelve Data'+m('twelve'),callback_data:'dp_twelve'}],
  [{text:'🌐 Yahoo Finance'+m('yahoo'),callback_data:'dp_yahoo'}],
  [{text:'🔄 خودکار'+m('auto'),callback_data:'dp_auto'}],
  [{text:'◀️ بازگشت',callback_data:'menu_settings'}]
];};}

function tierMenu(cur){const m=x=>cur===x?' ✅':'';return {inline_keyboard:[
  [{text:'🚀 سریع'+m('fast'),callback_data:'tier_fast'}],
  [{text:'🧠 DeepSeek'+m('deepseek'),callback_data:'tier_deepseek'}],
  [{text:'💎 قوی (Claude)'+m('premium'),callback_data:'tier_premium'}],
  [{text:'◀️ بازگشت',callback_data:'menu_settings'}]
];};}

function tierProvMenu(){return {inline_keyboard:[
  [{text:'🅰️ AIPrime',callback_data:'tier_prov_aiprime'}],
  [{text:'💎 GapGPT',callback_data:'tier_prov_gapgpt'}],
  [{text:'◀️ بازگشت',callback_data:'menu_settings'}]
];};}

// ===== SEND/EDIT =====
async function sendOrEdit(token,cid,mid,text,kb){
  if(mid){
    try{
      const r=await fetch('https://api.telegram.org/bot'+token+'/editMessageText',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:cid,message_id:mid,text:text.slice(0,4000),parse_mode:'HTML',disable_web_page_preview:true,reply_markup:kb})});
      const d=await r.json();if(d.ok)return d;
    }catch(e){}
  }
  return await sendMessage(token,cid,text,kb);
}
async function sendMessage(token,cid,text,kb){
  const p={chat_id:cid,text:text.slice(0,4000),parse_mode:'HTML',disable_web_page_preview:true};
  if(kb)p.reply_markup=kb;
  const r=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
  return r.json();
}
async function answerCallback(token,cid){await fetch('https://api.telegram.org/bot'+token+'/answerCallbackQuery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({callback_query_id:cid})});}
async function downloadTelegramPhoto(token,fid){
  const r1=await fetch('https://api.telegram.org/bot'+token+'/getFile?file_id='+fid);
  const d1=await r1.json();if(!d1.ok)throw new Error('getFile failed');
  const r2=await fetch('https://api.telegram.org/file/bot'+token+'/'+d1.result.file_path);
  const buf=await r2.arrayBuffer();const b=new Uint8Array(buf);
  let bin='';const ch=8192;
  for(let i=0;i<b.length;i+=ch)bin+=String.fromCharCode.apply(null,b.subarray(i,i+ch));
  return {base64:btoa(bin),size:b.length};
}

// ===== MENU VIEWS =====
async function showMainMenu(t,c,mid){await sendOrEdit(t,c,mid,'🎯 <b>Everest Bot</b>\n\nاز منو انتخاب کن:',mainMenu());}
async function showSymbolMenu(t,c,mid){await sendOrEdit(t,c,mid,'🎯 <b>نماد:</b>',symbolMenu());}
async function showTimeframeMenu(t,c,mid,sr){await sendOrEdit(t,c,mid,'⏰ <b>'+normalizeSymbol(sr)+'</b>',timeframeMenu(sr));}

async function showProviderMenu(t,c,mid,sr,tf,isMTF,env){
  const avail=getAvailableProviders(env);
  if(!avail.length){await sendOrEdit(t,c,mid,'❌ سرویس فعال نیست',{inline_keyboard:[[{text:'🏠',callback_data:'menu_main'}]]});return;}
  const dp=await getUserDataProvider(env,c);
  const text='<b>🎯 انتخاب AI</b>\n\n<b>نماد:</b> '+normalizeSymbol(sr)+'\n<b>منبع داده:</b> '+DATA_PROVIDERS[dp].label+'\n\nکدوم AI؟';
  await sendOrEdit(t,c,mid,text,providerMenu(avail,sr,tf,isMTF));
}

async function showMonitorMenu(t,c,mid,env){
  const list=await getMonitors(env,c);
  let txt='🤖 <b>مانیتور خودکار</b>\n\n';
  if(list.length){
    txt+=list.length+' مانیتور فعال:\n\n';
    for(let i=0;i<list.length;i++){
      const m=list[i];
      txt+=(m.active?'🟢':'⏸️')+' #'+(i+1)+' '+m.symbol+' '+TF_LABELS[m.timeframe]+'\n';
    }
  }else txt+='<i>هنوز مانیتوری نداری</i>\n\n';
  txt+='\n💡 هر کندل که بسته میشه، خودکار تحلیل می‌گیره.';
  await sendOrEdit(t,c,mid,txt,monitorMenu());
}

async function showMonitorList(t,c,mid,env){
  const list=await getMonitors(env,c);
  if(!list.length){await sendOrEdit(t,c,mid,'📋 <i>خالی</i>',{inline_keyboard:[[{text:'◀️',callback_data:'menu_monitor'}]]});return;}
  let txt='<b>📋 مانیتورها</b>\n\n';
  for(let i=0;i<list.length;i++){
    const m=list[i];
    txt+='#'+(i+1)+' '+(m.active?'🟢':'⏸️')+' <b>'+m.symbol+'</b> '+TF_LABELS[m.timeframe]+'\n';
    txt+='   📡 '+(DATA_PROVIDERS[m.dataProvider]?.label||'?')+' • 🤖 '+m.aiProvider+'\n';
    if(m.signalCount)txt+='   📊 '+m.signalCount+' سیگنال امروز\n';
    txt+='\n';
  }
  await sendOrEdit(t,c,mid,txt,monitorListMenu(list));
}

async function showMonitorView(t,c,mid,env,idx){
  const list=await getMonitors(env,c);
  if(!list[idx]){await sendOrEdit(t,c,mid,'❌ یافت نشد',{inline_keyboard:[[{text:'◀️',callback_data:'menu_monitor'}]]});return;}
  const m=list[idx];
  let txt='<b>🤖 مانیتور #'+(idx+1)+'</b>\n\n';
  txt+='<b>نماد:</b> '+m.symbol+'\n';
  txt+='<b>تایم‌فریم:</b> '+TF_LABELS[m.timeframe]+'\n';
  txt+='<b>منبع داده:</b> '+DATA_PROVIDERS[m.dataProvider]?.label+'\n';
  txt+='<b>AI:</b> '+m.aiProvider+'\n';
  txt+='<b>وضعیت:</b> '+(m.active?'🟢 فعال':'⏸️ متوقف')+'\n';
  if(m.lastCheck)txt+='<b>آخرین بررسی:</b> '+m.lastCheck+'\n';
  if(m.lastSignal)txt+='<b>آخرین سیگنال:</b> '+m.lastSignal+'\n';
  txt+='<b>تعداد سیگنال:</b> '+(m.signalCount||0)+'\n';
  await sendOrEdit(t,c,mid,txt,{inline_keyboard:[
    [{text:m.active?'⏸️ توقف':'▶️ شروع',callback_data:'mon_toggle_'+idx}],
    [{text:'🗑️ حذف',callback_data:'mon_del_'+idx}],
    [{text:'◀️ بازگشت',callback_data:'mon_list'}]
  ]});
}

async function showJournalMenu(t,c,mid,env){
  const j=await getJournal(env,c);
  let txt='📓 <b>ژورنال</b>\n\n';
  if(j.length){const w=j.filter(x=>x.result==='win').length,l=j.filter(x=>x.result==='loss').length;txt+='📈 '+j.length+'\n✅ '+w+'\n❌ '+l+'\n';}
  else txt+='<i>خالی</i>';
  await sendOrEdit(t,c,mid,txt,journalMenu());
}
async function showWatchMenu(t,c,mid,env){
  const l=await getWatchlist(env,c);
  await sendOrEdit(t,c,mid,'🔔 <b>هشدارها</b>\n\n'+(l.length?l.length+' هشدار':'<i>خالی</i>'),watchMenu());
}
async function showSettingsMenu(t,c,mid,env){
  const cm=await getConfluenceMode(env,c);
  const cl=cm==='force'?'🔴':cm==='auto'?'🟢':'🔵';
  const um=await getUserMode(env,c);
  const uc=MODE_CONFIG[um];
  const dp=await getUserDataProvider(env,c);
  const aT=await getUserModelTier(env,c,'aiprime');
  const gT=await getUserModelTier(env,c,'gapgpt');
  const aL=aT==='premium'?'💎':aT==='deepseek'?'🧠':'🚀';
  const gL=gT==='premium'?'💎':gT==='deepseek'?'🧠':'🚀';
  const text='⚙️ <b>تنظیمات</b>\n\n'+
    '<b>🎯 حالت:</b> '+uc.icon+' '+uc.label+'\n'+
    '<b>🧠 هم‌گرایی:</b> '+cl+' '+cm+'\n'+
    '<b>📊 منبع:</b> '+DATA_PROVIDERS[dp].label+'\n'+
    '<b>🎚️ مدل:</b> AIPrime '+aL+' • GapGPT '+gL;
  await sendOrEdit(t,c,mid,text,{inline_keyboard:[
    [{text:'🎯 حالت معاملاتی',callback_data:'settings_mode'}],
    [{text:'🧠 هم‌گرایی',callback_data:'settings_confluence'}],
    [{text:'📊 منبع داده',callback_data:'settings_dataprovider'}],
    [{text:'🎚️ سطح مدل',callback_data:'settings_tier'}],
    [{text:'🏠 منو',callback_data:'menu_main'}]
  ]});
}
async function showStatus(t,c,mid,env){
  const all=['gemini','aiprime','groq','github','together','gapgpt','openrouter','mistral','huggingface','cloudflare','nvidia','llm7','avalai','metis','onexai'];
  let txt='📈 <b>وضعیت</b>\n\n';let act=0;
  for(const p of all){
    let hk;if(p==='gemini')hk=getGeminiKeys(env).length>0;else if(p==='llm7')hk=true;else hk=!!getKey(env,p);
    if(hk)act++;
    txt+=(hk?'✅':'❌')+' '+PROVIDER_NAMES[p]+'\n';
  }
  txt+='\n🎯 AI: <b>'+act+'/'+all.length+'</b>\n';
  txt+='📊 Twelve: '+(env.TWELVE_KEY?'✅':'❌')+'\n';
  txt+='🌐 Yahoo: ✅ (رایگان)\n';
  txt+='💾 KV: '+(env.KV?'✅':'❌');
  await sendOrEdit(t,c,mid,txt,{inline_keyboard:[[{text:'🏠',callback_data:'menu_main'}]]});
}
async function showHelp(t,c,mid){
  const txt='📖 <b>راهنما</b>\n\n📊 تحلیل:\n• تک TF\n• MTF\n• تصویر\n• 🤖 مانیتور خودکار\n\n⚙️ تنظیمات:\n• حالت معاملاتی\n• هم‌گرایی\n• منبع داده (Twelve/Yahoo/خودکار)\n• سطح مدل\n\n<b>دستورات:</b>\n/menu /help /analyze /monitor';
  await sendOrEdit(t,c,mid,txt,{inline_keyboard:[[{text:'🏠',callback_data:'menu_main'}]]});
}

// ===== FORMATTING =====
function buildCaption(levels,symbol,tf,provider,conf){
  let c='<b>📊 تحلیل</b>\n\n<b>نماد:</b> '+symbol+'\n<b>TF:</b> '+tf+'\n';
  if(provider)c+='<b>سرویس:</b> '+provider+'\n';
  c+='\n';
  const d=levels.direction||'WAIT';
  c+='<b>جهت:</b> '+(d==='BUY'?'🟢 خرید':d==='SELL'?'🔴 فروش':'⏸️ انتظار')+'\n';
  if(levels.regime)c+='<b>رژیم:</b> '+regimeLabel(levels.regime)+'\n';
  if(levels.confidence!=null)c+='<b>اطمینان:</b> '+levels.confidence+'%\n';
  c+='\n';
  if(d==='WAIT')c+='<i>ستاپ معتبری نیست.</i>\n';
  else{
    if(levels.entry)c+='<b>🎯 ورود:</b> <code>'+levels.entry+'</code>\n';
    if(levels.sl)c+='<b>🛑 SL:</b> <code>'+levels.sl+'</code>\n';
    if(levels.tp1)c+='<b>✅ TP1:</b> <code>'+levels.tp1+'</code>\n';
    if(levels.tp2)c+='<b>✅ TP2:</b> <code>'+levels.tp2+'</code>\n';
    if(levels.tp3)c+='<b>✅ TP3:</b> <code>'+levels.tp3+'</code>\n';
    if(levels.rr)c+='<b>⚖️ R/R:</b> <code>'+levels.rr+'</code>\n';
  }
  if(conf)c+=buildConfBlock(conf,levels);
  return c;
}
function buildMTFCaption(levels,symbol,provider,conf){
  let c='<b>🎯 MTF</b>\n\n<b>نماد:</b> '+symbol+'\n';
  if(provider)c+='<b>سرویس:</b> '+provider+'\n';
  c+='\n';
  if(levels.htf||levels.mtf||levels.ltf||levels.entryTf){
    c+='<b>📊 TF:</b>\n• 4H: '+directionEmoji(levels.htf)+'\n• 1H: '+directionEmoji(levels.mtf)+'\n• 15M: '+directionEmoji(levels.ltf)+'\n• 1M: '+directionEmoji(levels.entryTf)+'\n\n';
  }
  const d=levels.direction||'WAIT';
  c+='<b>جهت:</b> '+(d==='BUY'?'🟢 خرید':d==='SELL'?'🔴 فروش':'⏸️ انتظار')+'\n';
  if(levels.confidence!=null)c+='<b>اطمینان:</b> '+levels.confidence+'%\n';
  c+='\n';
  if(d!=='WAIT'){
    if(levels.entry)c+='<b>🎯 ورود:</b> <code>'+levels.entry+'</code>\n';
    if(levels.sl)c+='<b>🛑 SL:</b> <code>'+levels.sl+'</code>\n';
    if(levels.tp1)c+='<b>✅ TP1:</b> <code>'+levels.tp1+'</code>\n';
    if(levels.rr)c+='<b>⚖️ R/R:</b> <code>'+levels.rr+'</code>\n';
  }
  if(conf)c+=buildConfBlock(conf,levels);
  return c;
}
function buildImageCaption(levels,provider,conf){
  let c='<b>📸 تصویر</b>\n';
  if(provider)c+='<b>سرویس:</b> '+provider+'\n';
  c+='\n';
  if(levels.detectedSymbol&&levels.detectedSymbol!=='UNKNOWN')c+='<b>نماد:</b> '+levels.detectedSymbol+'\n';
  const d=levels.direction||'WAIT';
  c+='<b>جهت:</b> '+(d==='BUY'?'🟢':d==='SELL'?'🔴':'⏸️')+'\n';
  if(levels.confidence!=null)c+='<b>اطمینان:</b> '+levels.confidence+'%\n';
  c+='\n';
  if(d!=='WAIT'){
    if(levels.entry)c+='<b>🎯 ورود:</b> <code>'+levels.entry+'</code>\n';
    if(levels.sl)c+='<b>🛑 SL:</b> <code>'+levels.sl+'</code>\n';
    if(levels.tp1)c+='<b>✅ TP1:</b> <code>'+levels.tp1+'</code>\n';
    if(levels.rr)c+='<b>⚖️ R/R:</b> <code>'+levels.rr+'</code>\n';
  }
  if(conf)c+=buildConfBlock(conf,levels);
  return c;
}
function buildConfBlock(conf,levels){
  if(!conf)return '';
  let c='';
  let score=conf.confluence??levels?.confluenceScore??null;
  if(score==null&&conf.scores){let sum=0,cnt=0;for(const k in conf.scores){if(typeof conf.scores[k]==='number'){sum+=conf.scores[k];cnt++;}}if(cnt)score=Math.round((sum/cnt/10)*10)/10;}
  if(score!=null){const e=score>=8?'🔥':score>=6?'✅':score>=4?'⚠️':'❌';c+='\n<b>هم‌گرایی:</b> '+e+' <b>'+score+'/10</b>'+(conf.auto?' <i>(خودکار)</i>':'')+'\n';}
  if(conf.scores){c+='\n📌 <b>چیپ‌ها:</b>\n';for(const k of CONF_KEYS){const v=conf.scores[k];if(v==null){c+='◯ '+CONF_LABELS[k]+'\n';}else{const ic=v>=80?'🟢':v>=60?'🟡':v>=40?'🟠':'🔴';c+=ic+' '+CONF_LABELS[k]+' ('+v+')\n';}}}
  if(conf.warning)c+=conf.warning;
  return c;
}
function tgFormat(text){
  const c=text.replace(/```json[\s\S]*?```/gi,'').replace(/```[\s\S]*?```/g,'');
  let h=c.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  h=h.replace(/^#{1,4}\s*(.+)$/gm,'\n━━━━━━━━━━━━━━━\n📌 <b>$1</b>\n━━━━━━━━━━━━━━━');
  h=h.replace(/\*\*([^*\n]+)\*\*/g,'<b>$1</b>');
  h=h.replace(/\n{3,}/g,'\n\n');
  return h.trim();
}

// ===== ANALYSIS =====
async function runAnalysis(t,c,symbol,env,tf,forcedProvider){
  try{
    const pl=forcedProvider?(PROVIDER_NAMES[forcedProvider]||forcedProvider):'خودکار';
    const mode=await getConfluenceMode(env,c);
    const um=await getUserMode(env,c);
    const uc=MODE_CONFIG[um];
    const dp=await getUserDataProvider(env,c);
    if(uc.allowedTFs.indexOf(tf)===-1){await sendMessage(t,c,'⚠️ TF مجاز نیست برای '+uc.label,{inline_keyboard:[[{text:'⚙️',callback_data:'menu_settings'}]]});return;}
    await sendMessage(t,c,'⏳ <b>'+symbol+'</b>\n🤖 '+pl+'\n📊 '+DATA_PROVIDERS[dp].label+'\n🎯 '+uc.icon+' '+uc.label);
    const interval=TD_INT[tf]||'1h';
    const klines=await fetchMarketData(symbol,interval,env,c);
    const body='نماد: '+symbol+'\nTF: '+TF_LABELS[tf]+'\n\n'+klinesToText(klines,symbol,TF_LABELS[tf]);
    const fullPrompt=(mode==='force'?SYSTEM_PROMPT+'\n⚠️ STRICT JSON':SYSTEM_PROMPT)+'\n\n'+body;
    let result;
    if(forcedProvider&&PROVIDER_FUNCS[forcedProvider]){
      try{
        const txt=await withTimeout(PROVIDER_FUNCS[forcedProvider](env,fullPrompt,null,null,c),30000,forcedProvider);
        if(txt&&txt.length>10)result={text:txt,provider:PROVIDER_NAMES[forcedProvider]};else throw new Error('کوتاه');
      }catch(e){await sendMessage(t,c,'❌ '+forcedProvider+': '+e.message);result=await callWithFallback(env,fullPrompt,null,null,c);}
    }else result=await callWithFallback(env,fullPrompt,null,null,c);
    const levels=await validateSignal(env,c,extractLevels(result.text));
    const conf=await resolveConfluence(env,c,levels,result.text);
    await sendMessage(t,c,buildCaption(levels,symbol,TF_LABELS[tf],result.provider,conf));
    const ft=tgFormat(result.text);
    if(ft.length)for(let i=0;i<ft.length;i+=3800){await sendMessage(t,c,ft.slice(i,i+3800));await sleep(300);}
    await sendMessage(t,c,'🏠',{inline_keyboard:[[{text:'🏠 منو',callback_data:'menu_main'}]]});
  }catch(e){await sendMessage(t,c,'❌ <code>'+e.message+'</code>');}
}

async function runMultiTFAnalysis(t,c,symbol,env,forcedProvider){
  try{
    const pl=forcedProvider?(PROVIDER_NAMES[forcedProvider]||forcedProvider):'خودکار';
    const mode=await getConfluenceMode(env,c);
    const dp=await getUserDataProvider(env,c);
    await sendMessage(t,c,'🎯 MTF <b>'+symbol+'</b>\n🤖 '+pl+'\n📊 '+DATA_PROVIDERS[dp].label);
    const k4=await fetchMarketData(symbol,'4h',env,c);
    const k1=await fetchMarketData(symbol,'1h',env,c);
    const k15=await fetchMarketData(symbol,'15min',env,c);
    const k1m=await fetchMarketData(symbol,'1min',env,c);
    const p='نماد: '+symbol+'\n\n4H:\n'+klinesToText(k4,symbol,'4H')+'\n\n1H:\n'+klinesToText(k1,symbol,'1H')+'\n\n15M:\n'+klinesToText(k15,symbol,'15M')+'\n\n1M:\n'+klinesToText(k1m,symbol,'1M');
    const fullPrompt=(mode==='force'?MULTI_TF_PROMPT+'\n⚠️ STRICT':MULTI_TF_PROMPT)+'\n\n'+p;
    let result;
    if(forcedProvider&&PROVIDER_FUNCS[forcedProvider]){
      try{
        const txt=await withTimeout(PROVIDER_FUNCS[forcedProvider](env,fullPrompt,null,null,c),30000,forcedProvider);
        if(txt&&txt.length>10)result={text:txt,provider:PROVIDER_NAMES[forcedProvider]};else throw new Error('کوتاه');
      }catch(e){result=await callWithFallback(env,fullPrompt,null,null,c);}
    }else result=await callWithFallback(env,fullPrompt,null,null,c);
    const levels=await validateSignal(env,c,extractLevels(result.text));
    const conf=await resolveConfluence(env,c,levels,result.text);
    await sendMessage(t,c,buildMTFCaption(levels,symbol,result.provider,conf));
    const ft=tgFormat(result.text);
    if(ft.length)for(let i=0;i<ft.length;i+=3800){await sendMessage(t,c,ft.slice(i,i+3800));await sleep(300);}
    await sendMessage(t,c,'🏠',{inline_keyboard:[[{text:'🏠',callback_data:'menu_main'}]]});
  }catch(e){await sendMessage(t,c,'❌ MTF: <code>'+e.message+'</code>');}
}

async function runImageAnalysis(t,c,fid,env){
  try{
    const mode=await getConfluenceMode(env,c);
    await sendMessage(t,c,'📸 دریافت...');
    const pd=await downloadTelegramPhoto(t,fid);
    if(pd.size>5*1024*1024){await sendMessage(t,c,'❌ > ۵MB');return;}
    await sendMessage(t,c,'🧠 تحلیل...');
    const fullPrompt=(mode==='force'?IMAGE_PROMPT+'\n⚠️ STRICT':IMAGE_PROMPT);
    const result=await callWithFallback(env,fullPrompt,pd.base64,'image/jpeg',c);
    const levels=await validateSignal(env,c,extractLevels(result.text));
    const conf=await resolveConfluence(env,c,levels,result.text);
    await sendMessage(t,c,buildImageCaption(levels,result.provider,conf));
    const clean=result.text.replace(/```json[\s\S]*?```/gi,'').replace(/```[\s\S]*?```/g,'');
    const ft=tgFormat(clean);
    if(ft.length>20)for(let i=0;i<ft.length;i+=3800){await sendMessage(t,c,ft.slice(i,i+3800));await sleep(400);}
    await sendMessage(t,c,'🏠',{inline_keyboard:[[{text:'🏠',callback_data:'menu_main'}]]});
  }catch(e){await sendMessage(t,c,'❌ <code>'+e.message+'</code>');}
}

// ===== MONITOR WIZARD =====
async function startMonitorWizard(t,c,env){
  await setUserState(env,c,{action:'mon_add',step:'symbol',data:{}});
  await sendMessage(t,c,'🤖 <b>مانیتور جدید</b>\n\nمرحله ۱/۴\n\n<b>نماد:</b>\nمثال: XAU/USD',{inline_keyboard:[[{text:'❌ لغو',callback_data:'mon_cancel'}]]});
}

async function handleMonitorWizard(t,c,text,env,state){
  const d=state.data||{};
  if(state.step==='symbol'){
    d.symbol=normalizeSymbol(text);state.data=d;state.step='tf';
    await setUserState(env,c,state);
    await sendMessage(t,c,'🤖 ۲/۴ <b>تایم‌فریم:</b>',monitorTfMenu());
    return;
  }
}

async function handleMonitorCallback(t,c,mid,data,env){
  const state=await getUserState(env,c);
  if(data==='mon_cancel'){await clearUserState(env,c);await sendOrEdit(t,c,mid,'❌ لغو',{inline_keyboard:[[{text:'🏠',callback_data:'menu_main'}]]});return;}
  if(data==='mon_add'){await startMonitorWizard(t,c,env);return;}
  if(data==='mon_list'){await showMonitorList(t,c,mid,env);return;}
  
  if(data.indexOf('mon_view_')===0){
    const idx=parseInt(data.replace('mon_view_',''));
    await showMonitorView(t,c,mid,env,idx);
    return;
  }
  if(data.indexOf('mon_toggle_')===0){
    const idx=parseInt(data.replace('mon_toggle_',''));
    const list=await getMonitors(env,c);
    if(list[idx]){list[idx].active=!list[idx].active;await saveMonitors(env,c,list);}
    await showMonitorView(t,c,mid,env,idx);
    return;
  }
  if(data.indexOf('mon_del_')===0){
    const idx=parseInt(data.replace('mon_del_',''));
    const list=await getMonitors(env,c);
    list.splice(idx,1);
    await saveMonitors(env,c,list);
    await sendOrEdit(t,c,mid,'🗑️ حذف شد',{inline_keyboard:[[{text:'◀️',callback_data:'mon_list'}]]});
    return;
  }
  
  // Wizard steps
  if(!state||state.action!=='mon_add')return;
  if(data.indexOf('mon_tf_')===0){
    state.data.timeframe=data.replace('mon_tf_','');state.step='ai';
    await setUserState(env,c,state);
    await sendOrEdit(t,c,mid,'🤖 ۳/۴ <b>سرویس AI:</b>',monitorAiMenu());
    return;
  }
  if(data.indexOf('mon_ai_')===0){
    state.data.aiProvider=data.replace('mon_ai_','');state.step='dp';
    await setUserState(env,c,state);
    await sendOrEdit(t,c,mid,'🤖 ۴/۴ <b>منبع داده:</b>',monitorDataMenu());
    return;
  }
  if(data.indexOf('mon_dp_')===0){
    state.data.dataProvider=data.replace('mon_dp_','');
    const d=state.data;
    const list=await getMonitors(env,c);
    list.push({
      symbol:d.symbol,timeframe:d.timeframe,aiProvider:d.aiProvider,dataProvider:d.dataProvider,
      active:true,created:Date.now(),signalCount:0,lastSignal:null,lastCheck:null,
      lastSignalKey:null
    });
    await saveMonitors(env,c,list);
    await clearUserState(env,c);
    const txt='✅ <b>مانیتور ساخته شد</b>\n\n'+
      '📊 '+d.symbol+'\n'+
      '⏰ '+TF_LABELS[d.timeframe]+'\n'+
      '🤖 '+d.aiProvider+'\n'+
      '📡 '+DATA_PROVIDERS[d.dataProvider].label+'\n\n'+
      '💡 حالا خودکار هر کندل بسته می‌شه، تحلیل می‌گیره و اگه سیگنال تایید شد هشدار میده.';
    await sendOrEdit(t,c,mid,txt,{inline_keyboard:[[{text:'📋 لیست',callback_data:'mon_list'}],[{text:'🏠',callback_data:'menu_main'}]]});
    return;
  }
}

// ⭐ Cron check monitors
async function checkAllMonitors(env){
  try {
    const token=env.TG_TOKEN;
    const list=await env.KV.list({prefix:'monitors:'});
    
    for(const key of list.keys){
      const chatId=key.name.replace('monitors:','');
      const monitors=await env.KV.get(key.name,'json')||[];
      if(!monitors.length)continue;
      
      const now=new Date();
      const nowMs=Date.now();
      let changed=false;
      
      for(let i=0;i<monitors.length;i++){
        const m=monitors[i];
        if(!m.active)continue;
        
        const mins=TF_MINUTES[m.timeframe]||5;
        const periodMs=mins*60*1000;
        
        // بررسی آیا الان باید اجرا بشه (کندل قبلی بسته شده؟)
        const lastRun=m.lastRunAt||0;
        const timeSince=nowMs-lastRun;
        
        // اجرا هر دقیقه فقط اگه کندل TF مورد نظر بسته شده باشه
        const currentMin=now.getUTCMinutes();
        const shouldRun = (m.timeframe==='1min') ||
                         (m.timeframe==='5min' && currentMin%5===0) ||
                         (m.timeframe==='15min' && currentMin%15===0) ||
                         (m.timeframe==='1h' && currentMin===0) ||
                         (m.timeframe==='4h' && currentMin===0 && now.getUTCHours()%4===0);
        
        if(!shouldRun || timeSince<60000)continue;
        
        m.lastRunAt=nowMs;
        m.lastCheck=new Date().toISOString().slice(11,16);
        changed=true;
        
        // اجرای تحلیل
        try{
          const interval=TD_INT[m.timeframe]||'1h';
          const klines=await fetchMarketData(m.symbol,interval,env,chatId,m.dataProvider);
          const body='نماد: '+m.symbol+'\nTF: '+TF_LABELS[m.timeframe]+'\n\n'+klinesToText(klines,m.symbol,TF_LABELS[m.timeframe]);
          const userMode=await getUserMode(env,chatId);
          const mode=await getConfluenceMode(env,chatId);
          const fullPrompt=SYSTEM_PROMPT+'\n\n'+body;
          
          const result=await callWithFallback(env,fullPrompt,null,null,chatId,m.aiProvider==='auto'?null:m.aiProvider);
          const levels=await validateSignal(env,chatId,extractLevels(result.text));
          const conf=await resolveConfluence(env,chatId,levels,result.text);
          
          const cfg=MODE_CONFIG[userMode];
          const isConfirmed=levels.direction!=='WAIT' && 
                          levels.confidence!=null && levels.confidence>=cfg.minConfidence &&
                          levels.entry && levels.sl && levels.tp1 &&
                          (parseFloat((levels.rr||'').replace('1:',''))>=cfg.minRR) &&
                          (!conf.confluence || conf.confluence>=cfg.minConfluence);
          
          const sigKey=levels.direction+'_'+(levels.entry||'na');
          
          if(isConfirmed && sigKey!==m.lastSignalKey){
            m.lastSignalKey=sigKey;
            m.signalCount=(m.signalCount||0)+1;
            m.lastSignal=levels.direction+' @ '+levels.entry;
            
            // ارسال هشدار
            const alertTxt='🚨 <b>سیگنال تایید شد!</b>\n\n'+
              '<b>#'+(i+1)+' '+m.symbol+'</b> • '+TF_LABELS[m.timeframe]+'\n\n'+
              buildCaption(levels,m.symbol,TF_LABELS[m.timeframe],result.provider,conf);
            
            await sendMessage(token,chatId,alertTxt,{inline_keyboard:[[{text:'📋 لیست',callback_data:'mon_list'}],[{text:'🏠',callback_data:'menu_main'}]]});
          } else if(levels.direction==='WAIT'){
            m.lastSignalKey=null;
          } else if(!isConfirmed){
            m.lastSignalKey=null;
          }
        }catch(e){console.error('Monitor error:',e.message);}
      }
      
      if(changed)await env.KV.put(key.name,JSON.stringify(monitors));
    }
  }catch(e){console.error('checkAllMonitors:',e.message);}
}

// ===== CALLBACK =====
async function handleCallback(t,c,mid,data,env){
  if(data==='menu_main'){await showMainMenu(t,c,mid);return;}
  if(data==='menu_analyze'){await showSymbolMenu(t,c,mid);return;}
  if(data==='menu_mtf'){await showSymbolMenu(t,c,mid);return;}
  if(data==='menu_image'){await sendOrEdit(t,c,mid,'📸 عکس چارت را بفرست!',{inline_keyboard:[[{text:'🏠',callback_data:'menu_main'}]]});return;}
  if(data==='menu_monitor'){await showMonitorMenu(t,c,mid,env);return;}
  if(data==='menu_journal'){await showJournalMenu(t,c,mid,env);return;}
  if(data==='menu_watch'){await showWatchMenu(t,c,mid,env);return;}
  if(data==='menu_settings'){await showSettingsMenu(t,c,mid,env);return;}
  if(data==='menu_status'){await showStatus(t,c,mid,env);return;}
  if(data==='menu_help'){await showHelp(t,c,mid);return;}
  if(data==='wizard_cancel'){await clearUserState(env,c);await sendOrEdit(t,c,mid,'❌ لغو',{inline_keyboard:[[{text:'🏠',callback_data:'menu_main'}]]});return;}
  
  if(data.indexOf('mon_')===0){await handleMonitorCallback(t,c,mid,data,env);return;}
  
  if(data==='sym_custom'){await setUserState(env,c,{action:'custom_symbol',step:'input',data:{}});await sendOrEdit(t,c,mid,'✏️ نماد:',{inline_keyboard:[[{text:'❌',callback_data:'wizard_cancel'}]]});return;}
  if(data.indexOf('sym_')===0){await showTimeframeMenu(t,c,mid,data.replace('sym_',''));return;}
  
  if(data.indexOf('mtf_')===0){await showProviderMenu(t,c,mid,data.replace('mtf_',''),'MTF',true,env);return;}
  
  if(data.indexOf('tf_')===0){
    const rest=data.replace('tf_','');
    const tfm=rest.match(/_([^_]+)$/);if(!tfm)return;
    await showProviderMenu(t,c,mid,rest.slice(0,-tfm[0].length),tfm[1],false,env);
    return;
  }
  
  if(data.indexOf('pvd_')===0){
    const rest=data.replace('pvd_','');
    const parts=rest.split('_');
    if(parts.length<3)return;
    const prov=parts[0];
    const tf=parts[parts.length-1];
    const sr=parts.slice(1,-1).join('_');
    const symbol=normalizeSymbol(sr);
    try{await fetch('https://api.telegram.org/bot'+t+'/deleteMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:c,message_id:mid})});}catch(e){}
    if(tf==='MTF')await runMultiTFAnalysis(t,c,symbol,env,prov);
    else await runAnalysis(t,c,symbol,env,tf,prov);
    return;
  }
  
  if(data==='journal_add'){await setUserState(env,c,{action:'journal_add',step:'symbol',data:{}});await sendOrEdit(t,c,mid,'📝 <b>مرحله ۱/۵</b>\n\n<b>نماد:</b>',{inline_keyboard:[[{text:'❌',callback_data:'wizard_cancel'}]]});return;}
  if(data==='journal_list'){
    const j=await getJournal(env,c);
    if(!j.length){await sendOrEdit(t,c,mid,'📓 خالی',{inline_keyboard:[[{text:'◀️',callback_data:'menu_journal'}]]});return;}
    let txt='<b>📓 لیست</b>\n\n';
    for(let i=0;i<Math.min(j.length,15);i++){const x=j[i];const s=x.result==='win'?'✅':x.result==='loss'?'❌':'⏳';txt+=s+' #'+x.id+' '+x.symbol+' '+x.direction+'\n';}
    await sendOrEdit(t,c,mid,txt,{inline_keyboard:[[{text:'◀️',callback_data:'menu_journal'}]]});
    return;
  }
  if(data==='journal_stats'){
    const j=await getJournal(env,c);
    if(!j.length){await sendOrEdit(t,c,mid,'📓 خالی',{inline_keyboard:[[{text:'◀️',callback_data:'menu_journal'}]]});return;}
    const w=j.filter(x=>x.result==='win').length,l=j.filter(x=>x.result==='loss').length,p=j.filter(x=>!x.result).length;
    const cl=w+l;const wr=cl>0?(w/cl*100).toFixed(1):'0';
    await sendOrEdit(t,c,mid,'<b>📊 آمار</b>\n\nکل: '+j.length+'\n✅ '+w+'\n❌ '+l+'\n⏳ '+p+'\n\nنرخ برد: '+wr+'%',{inline_keyboard:[[{text:'◀️',callback_data:'menu_journal'}]]});
    return;
  }
  if(data==='journal_clear'){await saveJournal(env,c,[]);await sendOrEdit(t,c,mid,'🗑️',{inline_keyboard:[[{text:'◀️',callback_data:'menu_journal'}]]});return;}
  
  if(data.indexOf('wiz_dir_')===0){
    const st=await getUserState(env,c);if(!st||st.action!=='journal_add')return;
    st.data.direction=data.replace('wiz_dir_','');st.step='entry';
    await setUserState(env,c,st);
    await sendOrEdit(t,c,mid,'📝 ۳/۵ <b>Entry:</b>',{inline_keyboard:[[{text:'❌',callback_data:'wizard_cancel'}]]});
    return;
  }
  
  if(data==='watch_add'){await setUserState(env,c,{action:'watch_add',step:'symbol',data:{}});await sendOrEdit(t,c,mid,'🔔 <b>مرحله ۱/۳</b>\n\n<b>نماد:</b>',{inline_keyboard:[[{text:'❌',callback_data:'wizard_cancel'}]]});return;}
  if(data==='watch_list'){
    const l=await getWatchlist(env,c);
    if(!l.length){await sendOrEdit(t,c,mid,'🔔 خالی',{inline_keyboard:[[{text:'◀️',callback_data:'menu_watch'}]]});return;}
    let txt='<b>🔔 لیست</b>\n\n';
    for(const x of l)txt+='#'+x.id+' '+x.symbol+' '+(x.condition==='above'?'⬆️':'⬇️')+' '+x.price+'\n';
    await sendOrEdit(t,c,mid,txt,{inline_keyboard:[[{text:'◀️',callback_data:'menu_watch'}]]});
    return;
  }
  if(data==='watch_clear'){await saveWatchlist(env,c,[]);await sendOrEdit(t,c,mid,'🗑️',{inline_keyboard:[[{text:'◀️',callback_data:'menu_watch'}]]});return;}
  if(data.indexOf('wiz_cond_')===0){
    const st2=await getUserState(env,c);if(!st2||st2.action!=='watch_add')return;
    st2.data.condition=data.replace('wiz_cond_','');st2.step='price';
    await setUserState(env,c,st2);
    await sendOrEdit(t,c,mid,'🔔 ۳/۳ <b>قیمت:</b>',{inline_keyboard:[[{text:'❌',callback_data:'wizard_cancel'}]]});
    return;
  }
  
  // Settings
  if(data==='settings_mode'){const cur=await getUserMode(env,c);await sendOrEdit(t,c,mid,'🎯 <b>حالت معاملاتی</b>',modeMenu(cur));return;}
  if(data.indexOf('mode_')===0){const m=data.replace('mode_','');await setUserMode(env,c,m);const cfg=MODE_CONFIG[m];await sendOrEdit(t,c,mid,'✅ '+cfg.icon+' '+cfg.label,modeMenu(m));return;}
  if(data==='settings_confluence'){const cur=await getConfluenceMode(env,c);await sendOrEdit(t,c,mid,'🧠 <b>هم‌گرایی</b>',confModeMenu(cur));return;}
  if(data.indexOf('conf_')===0){const m=data.replace('conf_','');await setConfluenceMode(env,c,m);const lbl=m==='force'?'🔴':m==='auto'?'🟢':'🔵';await sendOrEdit(t,c,mid,'✅ '+lbl,confModeMenu(m));return;}
  if(data==='settings_dataprovider'){const cur=await getUserDataProvider(env,c);await sendOrEdit(t,c,mid,'📊 <b>منبع داده</b>\n\nTwelve اول، Yahoo برای همه نمادها. اگه Twelve خطا داد، Yahoo پشتیبان میشه.',dataProviderMenu(cur));return;}
  if(data.indexOf('dp_')===0){const m=data.replace('dp_','');await setUserDataProvider(env,c,m);await sendOrEdit(t,c,mid,'✅ '+DATA_PROVIDERS[m].label,dataProviderMenu(m));return;}
  if(data==='settings_tier'){await sendOrEdit(t,c,mid,'🎚️ <b>سطح مدل</b>',tierProvMenu());return;}
  if(data==='tier_prov_aiprime'){await env.KV.put('last_tier_prov:'+c,'aiprime');const cur=await getUserModelTier(env,c,'aiprime');await sendOrEdit(t,c,mid,'🅰️ <b>AIPrime</b>\n\nسطح: '+MODEL_TIERS.aiprime[cur].label,tierMenu(cur));return;}
  if(data==='tier_prov_gapgpt'){await env.KV.put('last_tier_prov:'+c,'gapgpt');const cur=await getUserModelTier(env,c,'gapgpt');await sendOrEdit(t,c,mid,'💎 <b>GapGPT</b>\n\nسطح: '+MODEL_TIERS.gapgpt[cur].label,tierMenu(cur));return;}
  if(data==='tier_fast'||data==='tier_premium'||data==='tier_deepseek'){
    const nt=data.replace('tier_','');
    const lp=await env.KV.get('last_tier_prov:'+c)||'aiprime';
    await setUserModelTier(env,c,lp,nt);
    const tl=nt==='premium'?'💎 قوی':nt==='deepseek'?'🧠 DeepSeek':'🚀 سریع';
    await sendOrEdit(t,c,mid,'✅ '+lp+': '+tl,tierMenu(nt));
    return;
  }
}

async function sendAccessDenied(t,c){await sendMessage(t,c,'🔒 دسترسی محدود\nChat ID: <code>'+c+'</code>');}

// ===== MESSAGE HANDLER =====
async function handleUpdate(update,env){
  const token=env.TG_TOKEN;
  if(update.message){
    const c=update.message.chat.id;
    const text=(update.message.text||'').trim();
    if(text==='/myid'){await sendMessage(token,c,'🆔 <code>'+c+'</code>');return;}
    if(isSecurityEnabled(env)&&!isAdmin(env,c)){await sendAccessDenied(token,c);return;}
    if(update.message.photo&&update.message.photo.length){await runImageAnalysis(token,c,update.message.photo[update.message.photo.length-1].file_id,env);return;}
    if(update.message.document&&update.message.document.mime_type?.indexOf('image/')===0){await runImageAnalysis(token,c,update.message.document.file_id,env);return;}
    
    const st=await getUserState(env,c);
    if(st){
      if(st.action==='journal_add'){
        const d=st.data||{};
        if(st.step==='symbol'){d.symbol=normalizeSymbol(text);st.data=d;st.step='direction';await setUserState(env,c,st);await sendMessage(token,c,'📝 ۲/۵ <b>جهت:</b>',{inline_keyboard:[[{text:'🟢 BUY',callback_data:'wiz_dir_BUY'},{text:'🔴 SELL',callback_data:'wiz_dir_SELL'}]]});return;}
        if(st.step==='entry'){const e=parseFloat(text.replace(/[^\d.\-]/g,''));if(isNaN(e)){await sendMessage(token,c,'❌ عدد:');return;}d.entry=e;st.data=d;st.step='sl';await setUserState(env,c,st);await sendMessage(token,c,'📝 ۴/۵ <b>SL:</b>');return;}
        if(st.step==='sl'){const s=parseFloat(text.replace(/[^\d.\-]/g,''));if(isNaN(s)){await sendMessage(token,c,'❌ عدد:');return;}d.sl=s;st.data=d;st.step='tp';await setUserState(env,c,st);await sendMessage(token,c,'📝 ۵/۵ <b>TP:</b>');return;}
        if(st.step==='tp'){const tp=parseFloat(text.replace(/[^\d.\-]/g,''));if(isNaN(tp)){await sendMessage(token,c,'❌ عدد:');return;}d.tp=tp;const j=await getJournal(env,c);j.push({id:j.length+1,symbol:d.symbol,direction:d.direction,entry:d.entry,sl:d.sl,tp:d.tp,ts:Date.now(),result:null});await saveJournal(env,c,j);await clearUserState(env,c);const rr=Math.abs(d.tp-d.entry)/Math.abs(d.entry-d.sl);await sendMessage(token,c,'✅ ثبت #'+j.length+'\nR/R: 1:'+rr.toFixed(2),{inline_keyboard:[[{text:'📓',callback_data:'menu_journal'}]]});return;}
      }
      if(st.action==='watch_add'){
        const d=st.data||{};
        if(st.step==='symbol'){d.symbol=normalizeSymbol(text);st.data=d;st.step='condition';await setUserState(env,c,st);await sendMessage(token,c,'🔔 ۲/۳ <b>شرط:</b>',{inline_keyboard:[[{text:'⬆️',callback_data:'wiz_cond_above'},{text:'⬇️',callback_data:'wiz_cond_below'}]]});return;}
        if(st.step==='price'){const p=parseFloat(text.replace(/[^\d.\-]/g,''));if(isNaN(p)){await sendMessage(token,c,'❌ عدد:');return;}d.price=p;const l=await getWatchlist(env,c);const nid=l.length?Math.max(...l.map(w=>w.id))+1:1;l.push({id:nid,symbol:d.symbol,condition:d.condition,price:d.price,ts:Date.now()});await saveWatchlist(env,c,l);await clearUserState(env,c);await sendMessage(token,c,'✅ #'+nid,{inline_keyboard:[[{text:'🔔',callback_data:'menu_watch'}]]});return;}
      }
      if(st.action==='mon_add'&&st.step==='symbol'){
        await handleMonitorWizard(token,c,text,env,st);
        return;
      }
      if(st.action==='custom_symbol'){const s=normalizeSymbol(text);await clearUserState(env,c);await showTimeframeMenu(token,c,null,s.replace('/',''));return;}
    }
    
    if(text==='/start'||text==='/menu'){await showMainMenu(token,c,null);return;}
    if(text==='/help'){await showHelp(token,c,null);return;}
    if(text==='/status'){await showStatus(token,c,null,env);return;}
    if(text==='/analyze'){await showSymbolMenu(token,c,null);return;}
    if(text==='/monitor'){await showMonitorMenu(token,c,null,env);return;}
    if(text==='/journal'){await showJournalMenu(token,c,null,env);return;}
    if(text==='/watch'){await showWatchMenu(token,c,null,env);return;}
    
    if(text&&text.charAt(0)!=='/'&&/^[A-Za-z]{2,10}(\/[A-Za-z]{2,10})?$/.test(text)){await showTimeframeMenu(token,c,null,normalizeSymbol(text).replace('/',''));return;}
    await sendMessage(token,c,'❓ متوجه نشدم',mainMenu());
  }
  
  if(update.callback_query){
    const cb=update.callback_query;
    const cid=cb.message.chat.id;
    if(isSecurityEnabled(env)&&!isAdmin(env,cid)){await answerCallback(token,cb.id);await sendAccessDenied(token,cid);return;}
    await answerCallback(token,cb.id);
    await handleCallback(token,cid,cb.message.message_id,cb.data,env);
  }
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/'||url.pathname==='')return new Response('Everest Bot v3.6 — Auto Monitor',{status:200});
    if(request.method==='POST'&&url.pathname==='/webhook'){
      try{const update=await request.json();ctx.waitUntil(handleUpdate(update,env));}catch(e){}
      return new Response('OK',{status:200});
    }
    return new Response('Not found',{status:404});
  },
  async scheduled(event,env,ctx){
    // هر دقیقه چک میشه (browser cron)
    ctx.waitUntil(checkAllMonitors(env));
    ctx.waitUntil(checkWatchlist(env));
  }
};

async function checkWatchlist(env){
  try{
    const token=env.TG_TOKEN;
    const list=await env.KV.list({prefix:'watch:'});
    for(const key of list.keys){
      const k=key.name;
      const cid=k.replace('watch:','');
      const wl=await env.KV.get(k,'json');
      if(!wl||!wl.length)continue;
      const rem=[];
      for(const w of wl){
        try{
          const interval='1h';
          const klines=await fetchMarketData(w.symbol,interval,env,cid);
          const price=klines[klines.length-1]?.close;
          if(!price){rem.push(w);continue;}
          const hit=(w.condition==='above'&&price>=w.price)||(w.condition==='below'&&price<=w.price);
          if(hit)await sendMessage(token,cid,'🔔 <b>هشدار!</b>\n📌 '+w.symbol+'\n💰 '+price);
          else rem.push(w);
        }catch(e){rem.push(w);}
      }
      await env.KV.put(k,JSON.stringify(rem));
    }
  }catch(e){}
}