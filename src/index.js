const SYSTEM_PROMPT = "شما یک تحلیل‌گر ارشد بازارهای مالی با ۱۵ سال تجربه در SMC، ICT و پرایس اکشن هستید.\n\n" +
"**روش کار**\n۱. استخراج داده خام\n۲. تشخیص رژیم بازار\n۳. شناسایی BOS، CHoCH\n۴. کشف Order Blocks و FVG\n۵. الگوهای کندلی\n۶. امتیازدهی ۶ لایه\n۷. تصمیم نهایی\n\n" +
"**در انتهای پاسخ دقیقاً این فرمت را بنویس:**\n---\nDirection: [BUY/SELL/WAIT]\nRegime: [TRENDING_UP/TRENDING_DOWN/RANGING/TRANSITIONAL]\nConfidenceScore: [0-100]\nEntry: [عدد یا N/A]\nStop Loss: [عدد یا N/A]\nTP1: [عدد یا N/A]\nTP2: [عدد یا N/A]\nTP3: [عدد یا N/A]\nR/R: [نسبت یا N/A]\n---\n\n" +
"**قوانین:**\n1. اگر Confidence < 65 → WAIT\n2. حد ضرر ساختاری\n3. در BUY، SL زیر Entry و در SELL، SL بالای Entry\n4. R/R اعلامی با محاسبه واقعی\n5. تحلیل کامل و مفصل بنویس";

const MULTI_TF_PROMPT = "شما یک تحلیل‌گر ارشد بازارهای مالی هستید.\n\n" +
"**تحلیل Multi-Timeframe**\n🎯 HTF (4H): روند اصلی (قطعی)\n🔍 MTF (1H): تأیید ساختار\n📊 LTF (15M): ستاپ\n⏱️ EntryTF (1M): فقط تایمینگ\n\n" +
"**قوانین:**\n1. جهت نهایی = جهت 4H\n2. 1M فقط تایمینگ\n3. 4H رنج بود → WAIT\n\n" +
"**فرمت:**\n---\nDirection: [BUY/SELL/WAIT]\nConfluenceScore: [0-10]\nHTF4H: [BULLISH/BEARISH/RANGING]\nMTF1H: [BULLISH/BEARISH/RANGING]\nLTF15M: [BULLISH/BEARISH/RANGING]\nEntryTF1M: [BULLISH/BEARISH/RANGING]\nConfidenceScore: [0-100]\nEntry: [عدد یا N/A]\nStop Loss: [عدد یا N/A]\nTP1: [عدد یا N/A]\nTP2: [عدد یا N/A]\nTP3: [عدد یا N/A]\nR/R: [نسبت یا N/A]\n---";

// ⭐ IMAGE_PROMPT اصلاح‌شده — با تحلیل کامل و مفصل
const IMAGE_PROMPT = "شما یک تحلیل‌گر ارشد بازارهای مالی با ۱۵ سال تجربه در SMC، ICT و پرایس اکشن هستید.\n\n" +
"**تحلیل چارت از روی تصویر**\n\n" +
"**مرحله ۱: تحلیل کامل و مفصل (این بخش را حتماً بنویس)**\n" +
"### ۰. اطلاعات تصویر\n" +
"- تشخیص نماد و تایم‌فریم (اگه قابل خواندن است)\n" +
"- کالیبراسیون محور Y (بالاترین و پایین‌ترین قیمت)\n\n" +
"### ۱. رژیم بازار\n" +
"- Trending / Ranging / Transitional\n" +
"- دلایل تشخیص\n\n" +
"### ۲. ساختار بازار\n" +
"- BOS و CHoCH\n" +
"- سطوح نقدینگی\n" +
"- Retestها\n\n" +
"### ۳. SMC و Order Blocks\n" +
"- Order Blocks معتبر\n" +
"- FVG ها\n" +
"- Premium/Discount zones\n\n" +
"### ۴. الگوهای کندلی\n" +
"- الگوهای مهم در تصویر\n" +
"- کندل‌های تأییدی\n\n" +
"### ۵. سطوح کلیدی\n" +
"- حمایت و مقاومت مهم\n" +
"- سطوح R1/R2/R3 و S1/S2/S3\n\n" +
"### ۶. سناریو معاملاتی\n" +
"- سناریوی اصلی\n" +
"- سناریوی جایگزین\n" +
"- نقطه ورود دقیق\n" +
"- حد ضرر ساختاری\n" +
"- ۳ هدف سود\n\n" +
"### ۷. خلاصه اجرایی\n" +
"- جمع‌بندی نهایی\n" +
"- توصیه معاملاتی\n\n" +
"**مرحله ۲: در انتهای پاسخ دقیقاً این فرمت را بنویس:**\n\n" +
"---\n" +
"Direction: [BUY/SELL/WAIT]\n" +
"Symbol: [نماد یا UNKNOWN]\n" +
"Timeframe: [تایم‌فریم یا UNKNOWN]\n" +
"Regime: [TRENDING_UP/TRENDING_DOWN/RANGING/TRANSITIONAL]\n" +
"ConfidenceScore: [0-100]\n" +
"Entry: [عدد یا N/A]\n" +
"Stop Loss: [عدد یا N/A]\n" +
"TP1: [عدد یا N/A]\n" +
"TP2: [عدد یا N/A]\n" +
"TP3: [عدد یا N/A]\n" +
"R/R: [نسبت یا N/A]\n" +
"---\n\n" +
"**قوانین:**\n" +
"1. تحلیل کامل و مفصل بنویس — حداقل ۵۰۰ کلمه\n" +
"2. Confidence < 65 → WAIT\n" +
"3. اگر نماد/تایم‌فریم نامعلوم → UNKNOWN\n" +
"4. حد ضرر ساختاری\n" +
"5. از JSON استفاده نکن، فقط فرمت بالا";

// ============================================
// ACCESS CONTROL
// ============================================

function isAdmin(env, chatId) {
  if (!env.ADMIN_CHAT_ID) return true;
  return String(chatId) === String(env.ADMIN_CHAT_ID);
}

function isSecurityEnabled(env) {
  return !!env.ADMIN_CHAT_ID;
}

// ============================================
// TIMEOUT
// ============================================

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise(function(_, reject) {
      setTimeout(function() { reject(new Error(label + ' timeout')); }, ms);
    })
  ]);
}

// ============================================
// PROVIDER NAMES
// ============================================

const PROVIDER_NAMES = {
  gemini: 'Google Gemini',
  github: 'GitHub Models',
  groq: 'Groq',
  together: 'Together AI',
  gapgpt: 'GapGPT',
  aiprime: 'AIPrime',
  openrouter: 'OpenRouter',
  mistral: 'Mistral AI',
  huggingface: 'HuggingFace',
  cloudflare: 'Cloudflare AI',
  nvidia: 'NVIDIA NIM',
  llm7: 'LLM7.io',
  avalai: 'AvalAI',
  metis: 'Metis',
  onexai: '1xAi'
};

function getKey(env, provider) {
  var map = {
    gemini: env.GEMINI_KEY_1 || env.GEMINI_KEY,
    github: env.GITHUB_MODELS_TOKEN,
    groq: env.GROQ_KEY,
    together: env.TOGETHER_KEY,
    gapgpt: env.GAPGPT_KEY,
    aiprime: env.AIPRIME_KEY,
    openrouter: env.OPENROUTER_KEY,
    mistral: env.MISTRAL_KEY,
    huggingface: env.HUGGINGFACE_KEY,
    cloudflare: env.CLOUDFLARE_KEY,
    nvidia: env.NVIDIA_KEY,
    llm7: env.LLM7_KEY || 'unused',
    avalai: env.AVALAI_KEY,
    metis: env.METIS_KEY,
    onexai: env.ONEXAI_KEY
  };
  return map[provider] || '';
}

function getGeminiKeys(env) {
  var keys = [];
  if (env.GEMINI_KEY_1) keys.push(env.GEMINI_KEY_1);
  if (env.GEMINI_KEY_2) keys.push(env.GEMINI_KEY_2);
  if (env.GEMINI_KEY_3) keys.push(env.GEMINI_KEY_3);
  if (env.GEMINI_KEY) keys.push(env.GEMINI_KEY);
  return keys;
}

function getAvailableProviders(env) {
  var all = ['gemini', 'groq', 'github', 'together', 'gapgpt', 'aiprime', 'openrouter', 'mistral', 'huggingface', 'cloudflare', 'nvidia', 'llm7', 'avalai', 'metis', 'onexai'];
  return all.filter(function(p) {
    if (p === 'gemini') return getGeminiKeys(env).length > 0;
    if (p === 'llm7') return true;
    return !!getKey(env, p);
  });
}

// ============================================
// PARSING
// ============================================

function parseJsonBlock(text) {
  var match = text.match(/```json\s*([\s\S]*?)```/i);
  if (!match) return null;
  try { return JSON.parse(match[1].trim()); } catch (e) { return null; }
}

function parseRR(rrStr) {
  if (!rrStr) return null;
  var m = String(rrStr).match(/(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)/);
  if (m) { var a = parseFloat(m[1]), b = parseFloat(m[2]); return a > 0 ? b / a : null; }
  var n = parseFloat(rrStr);
  return isNaN(n) ? null : n;
}

function findValue(text, labels) {
  for (var i = 0; i < labels.length; i++) {
    var pattern = new RegExp("\\*{0,2}" + labels[i] + "\\*{0,2}\\s*[:=]\\s*\\*{0,2}\\s*([^\\n]+)", 'i');
    var m = text.match(pattern);
    if (m) {
      var val = m[1].trim();
      if (/N\/?A/i.test(val) || val === '-' || val === '—') return null;
      var cleaned = val.replace(/[^\d.\-]/g, '');
      var num = parseFloat(cleaned);
      if (!isNaN(num)) return num;
    }
  }
  return null;
}

function detectDirection(text) {
  if (!text) return 'WAIT';
  var td = text.match(/Direction\s*[:=]\s*(BUY|SELL|WAIT|LONG|SHORT)/i);
  if (td) {
    var v = td[1].toUpperCase();
    if (v === 'BUY' || v === 'LONG') return 'BUY';
    if (v === 'SELL' || v === 'SHORT') return 'SELL';
    return 'WAIT';
  }
  return 'WAIT';
}

function extractLevels(rawText) {
  var jsonData = parseJsonBlock(rawText);
  if (jsonData) {
    return {
      direction: jsonData.direction || 'WAIT',
      regime: jsonData.regime || null,
      confidence: typeof jsonData.confidence === 'number' ? jsonData.confidence : null,
      entry: jsonData.entry || null,
      sl: jsonData.stopLoss || null,
      tp1: jsonData.tp1 || null, tp2: jsonData.tp2 || null, tp3: jsonData.tp3 || null,
      rr: jsonData.rr || null,
      confluenceScore: jsonData.confluenceScore || null,
      htf: jsonData.htf4h || null, mtf: jsonData.mtf1h || null,
      ltf: jsonData.ltf15m || null, entryTf: jsonData.entrytf1m || null,
      detectedSymbol: jsonData.symbol || null,
      detectedTimeframe: jsonData.timeframe || null
    };
  }
  var blocks = rawText.match(/---\s*\n([\s\S]*?)\n\s*---/g);
  var text = rawText;
  if (blocks && blocks.length) text = blocks[blocks.length - 1];
  var regimeMatch = text.match(/Regime\s*[:=]\s*(TRENDING_UP|TRENDING_DOWN|RANGING|TRANSITIONAL)/i);
  var rrMatch = text.match(/R\/R\s*[:=]\s*([\d\.:]+)/i);
  var confMatch = text.match(/ConfluenceScore\s*[:=]\s*([\d\.]+)/i);
  var htfMatch = text.match(/HTF4H\s*[:=]\s*(BULLISH|BEARISH|RANGING)/i);
  var mtfMatch = text.match(/MTF1H\s*[:=]\s*(BULLISH|BEARISH|RANGING)/i);
  var ltfMatch = text.match(/LTF15M\s*[:=]\s*(BULLISH|BEARISH|RANGING)/i);
  var etfMatch = text.match(/EntryTF1M\s*[:=]\s*(BULLISH|BEARISH|RANGING)/i);
  var symMatch = text.match(/Symbol\s*[:=]\s*([^\n]+)/i);
  var tfMatch2 = text.match(/Timeframe\s*[:=]\s*([^\n]+)/i);
  return {
    direction: detectDirection(rawText),
    regime: regimeMatch ? regimeMatch[1].toUpperCase() : null,
    confidence: findValue(text, ['ConfidenceScore', 'امتیاز\\s*اطمینان']),
    entry: findValue(text, ['Entry', 'ورود']),
    sl: findValue(text, ['Stop[\\s-]?Loss', 'SL', 'حد\\s*ضرر']),
    tp1: findValue(text, ['TP\\s*1']), tp2: findValue(text, ['TP\\s*2']), tp3: findValue(text, ['TP\\s*3']),
    rr: rrMatch ? rrMatch[1] : null,
    confluenceScore: confMatch ? parseFloat(confMatch[1]) : null,
    htf: htfMatch ? htfMatch[1].toUpperCase() : null,
    mtf: mtfMatch ? mtfMatch[1].toUpperCase() : null,
    ltf: ltfMatch ? ltfMatch[1].toUpperCase() : null,
    entryTf: etfMatch ? etfMatch[1].toUpperCase() : null,
    detectedSymbol: symMatch ? symMatch[1].trim() : null,
    detectedTimeframe: tfMatch2 ? tfMatch2[1].trim() : null
  };
}

function validateSignal(levels) {
  var issues = [];
  var originalDir = levels.direction;
  if (originalDir !== 'WAIT') {
    var conf = levels.confidence;
    if (conf === null || conf === undefined) { issues.push('امتیاز استخراج نشد'); levels.direction = 'WAIT'; }
    else if (conf < 65) { issues.push('اطمینان ' + conf + '% کم'); levels.direction = 'WAIT'; }
  }
  if (levels.direction === 'BUY' || levels.direction === 'SELL') {
    var entry = levels.entry, sl = levels.sl;
    if (entry === null) { issues.push('Entry نیست'); levels.direction = 'WAIT'; }
    else if (sl === null) { issues.push('SL نیست'); levels.direction = 'WAIT'; }
    else {
      if (levels.direction === 'BUY' && sl >= entry) { issues.push('SL بالای Entry'); levels.direction = 'WAIT'; }
      if (levels.direction === 'SELL' && sl <= entry) { issues.push('SL زیر Entry'); levels.direction = 'WAIT'; }
    }
    if (levels.direction !== 'WAIT' && entry && sl && levels.tp1) {
      var risk = Math.abs(entry - sl), reward = Math.abs(levels.tp1 - entry);
      var actualRR = risk > 0 ? reward / risk : 0;
      if (actualRR < 1.5) { issues.push('R/R کم'); levels.direction = 'WAIT'; }
      else levels.rr = '1:' + actualRR.toFixed(2);
    }
  }
  levels.validationIssues = issues;
  return levels;
}

// ============================================
// AI PROVIDERS
// ============================================

async function callGeminiText(env, prompt, imageBase64, imageMime) {
  var keys = getGeminiKeys(env);
  if (!keys.length) throw new Error('no gemini key');
  var model = env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  var parts = [{ text: prompt }];
  if (imageBase64) parts.push({ inline_data: { mime_type: imageMime, data: imageBase64 } });
  var lastErr = '';
  for (var i = 0; i < keys.length; i++) {
    try {
      var res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + keys[i], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: parts }], generationConfig: { temperature: 0.1, topP: 0.85, maxOutputTokens: 12288 } })
      });
      var data = await res.json();
      if (res.ok) { var t = data.candidates?.[0]?.content?.parts?.[0]?.text; if (t) return t; }
      lastErr = data.error?.message || 'HTTP ' + res.status;
      if ([429, 503, 500, 401, 403, 400].indexOf(res.status) === -1) throw new Error(lastErr);
    } catch (e) { lastErr = e.message; }
  }
  throw new Error('Gemini: ' + lastErr);
}

async function callGroqText(env, prompt, imageBase64, imageMime) {
  var key = env.GROQ_KEY;
  if (!key) throw new Error('no groq key');
  var models = imageBase64 
    ? ['meta-llama/llama-4-scout-17b-16e-instruct', 'meta-llama/llama-4-maverick-17b-128e-instruct']
    : ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'gemma2-9b-it'];
  var lastErr = '';
  for (var i = 0; i < models.length; i++) {
    var content = imageBase64 
      ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }] 
      : prompt;
    try {
      var res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model: models[i], messages: [{ role: 'user', content: content }], temperature: 0.1, max_tokens: 8192 })
      });
      var data = await res.json();
      if (res.ok) { var t = data.choices?.[0]?.message?.content; if (t) return t; }
      lastErr = data.error?.message || 'HTTP ' + res.status;
    } catch (e) { lastErr = e.message; }
  }
  throw new Error('Groq: ' + lastErr);
}

async function callGitHubText(env, prompt, imageBase64, imageMime) {
  var token = env.GITHUB_MODELS_TOKEN;
  if (!token) throw new Error('no github token');
  var model = env.GITHUB_MODELS_MODEL || 'gpt-4o-mini';
  var content = imageBase64
    ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }]
    : prompt;
  var res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: content }], temperature: 0.1, max_tokens: 8192 })
  });
  var text = await res.text();
  if (!res.ok) throw new Error('GitHub ' + res.status + ': ' + text.slice(0, 150));
  try {
    var data = JSON.parse(text);
    return data.choices?.[0]?.message?.content || '';
  } catch (e) {
    throw new Error('GitHub JSON error: ' + text.slice(0, 150));
  }
}

async function callTogetherText(env, prompt, imageBase64, imageMime) {
  var key = env.TOGETHER_KEY;
  if (!key) throw new Error('no together key');
  var model = imageBase64 ? 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo' : 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
  var content = imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }] : prompt;
  var res = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: content }], temperature: 0.1, max_tokens: 8192 })
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'HTTP ' + res.status);
  return data.choices?.[0]?.message?.content || '';
}

async function callGapGPTText(env, prompt, imageBase64, imageMime) {
  var key = env.GAPGPT_KEY;
  if (!key) throw new Error('no gapgpt key');
  var model = imageBase64 ? 'gemini-3.5-flash-lite' : 'gpt-4o-mini';
  var content = imageBase64
    ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }]
    : prompt;
  var res = await fetch('https://api.gapgpt.app/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: content }], temperature: 0.1, max_tokens: 8192 })
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'HTTP ' + res.status);
  return data.choices?.[0]?.message?.content || '';
}

async function callAIPrimeText(env, prompt, imageBase64, imageMime) {
  var key = env.AIPRIME_KEY;
  if (!key) throw new Error('no aiprime key');
  var model = imageBase64 ? 'gpt-4o' : 'gpt-4o-mini';
  var content = imageBase64
    ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }]
    : prompt;
  var res = await fetch('https://api.aiprime.shop/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: content }], temperature: 0.1, max_tokens: 8192 })
  });
  var text = await res.text();
  if (!res.ok) throw new Error('AIPrime ' + res.status + ': ' + text.slice(0, 150));
  try {
    var data = JSON.parse(text);
    return data.choices?.[0]?.message?.content || '';
  } catch (e) {
    throw new Error('AIPrime JSON error: ' + text.slice(0, 150));
  }
}

async function callOpenRouterText(env, prompt, imageBase64, imageMime) {
  var key = env.OPENROUTER_KEY;
  if (!key) throw new Error('no openrouter key');
  var models = imageBase64
    ? ['google/gemini-2.0-flash-exp:free']
    : ['deepseek/deepseek-chat', 'meta-llama/llama-3.3-70b-instruct:free'];
  var lastErr = '';
  for (var i = 0; i < models.length; i++) {
    var content = imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }] : prompt;
    try {
      var res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key, 'HTTP-Referer': 'https://everest.bot', 'X-Title': 'Everest' },
        body: JSON.stringify({ model: models[i], messages: [{ role: 'user', content: content }], temperature: 0.1, max_tokens: 8192 })
      });
      var data = await res.json();
      if (res.ok) { var t = data.choices?.[0]?.message?.content; if (t) return t; }
      lastErr = data.error?.message || 'HTTP ' + res.status;
    } catch (e) { lastErr = e.message; }
  }
  throw new Error('OpenRouter: ' + lastErr);
}

async function callMistralText(env, prompt, imageBase64, imageMime) {
  var key = env.MISTRAL_KEY;
  if (!key) throw new Error('no mistral key');
  var model = imageBase64 ? 'pixtral-12b-2409' : 'mistral-small-latest';
  var content = imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: 'data:' + imageMime + ';base64,' + imageBase64 }] : prompt;
  var res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: content }], temperature: 0.1, max_tokens: 8192 })
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || data.message || 'HTTP ' + res.status);
  return data.choices?.[0]?.message?.content || '';
}

async function callHuggingFaceText(env, prompt, imageBase64, imageMime) {
  var key = env.HUGGINGFACE_KEY;
  if (!key) throw new Error('no hf key');
  var model = imageBase64 ? 'Qwen/Qwen2.5-VL-7B-Instruct' : 'meta-llama/Meta-Llama-3-8B-Instruct';
  var content = imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }] : prompt;
  var res = await fetch('https://api-inference.huggingface.co/models/' + model + '/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: content }], temperature: 0.1, max_tokens: 8192 })
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || data.error || 'HTTP ' + res.status);
  return data.choices?.[0]?.message?.content || '';
}

async function callCloudflareText(env, prompt, imageBase64, imageMime) {
  var key = env.CLOUDFLARE_KEY;
  if (!key) throw new Error('no cf key');
  var parts = key.split(':');
  if (parts.length !== 2) throw new Error('CF_KEY: accountId:token');
  var model = imageBase64 ? '@cf/meta/llama-3.2-11b-vision-instruct' : '@cf/meta/llama-3.1-8b-instruct';
  var content = imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }] : prompt;
  var res = await fetch('https://api.cloudflare.com/client/v4/accounts/' + parts[0] + '/ai/run/' + model, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + parts[1] },
    body: JSON.stringify({ messages: [{ role: 'user', content: content }] })
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.errors?.[0]?.message || 'HTTP ' + res.status);
  return data.result?.response || '';
}

async function callNvidiaText(env, prompt, imageBase64, imageMime) {
  var key = env.NVIDIA_KEY;
  if (!key) throw new Error('no nvidia key');
  var model = imageBase64 ? 'meta/llama-3.2-90b-vision-instruct' : 'meta/llama-3.3-70b-instruct';
  var content = imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }] : prompt;
  var res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: content }], temperature: 0.1, max_tokens: 8192 })
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'HTTP ' + res.status);
  return data.choices?.[0]?.message?.content || '';
}

async function callLLM7Text(env, prompt, imageBase64, imageMime) {
  var key = env.LLM7_KEY || 'unused';
  var models = ['pro', 'default'];
  var lastErr = '';
  for (var i = 0; i < models.length; i++) {
    var content = imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }] : prompt;
    try {
      var res = await fetch('https://api.llm7.io/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model: models[i], messages: [{ role: 'user', content: content }], temperature: 0.1, max_tokens: 8192 })
      });
      var data = await res.json();
      if (res.ok) { var t = data.choices?.[0]?.message?.content; if (t) return t; }
      lastErr = data.error?.message || 'HTTP ' + res.status;
    } catch (e) { lastErr = e.message; }
  }
  throw new Error('LLM7: ' + lastErr);
}

async function callAvalAIText(env, prompt, imageBase64, imageMime) {
  var key = env.AVALAI_KEY;
  if (!key) throw new Error('no avalai key');
  var content = imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }] : prompt;
  var res = await fetch('https://api.avalai.ir/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: 'gemini-3.5-flash', messages: [{ role: 'user', content: content }], temperature: 0.1, max_tokens: 8192 })
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'HTTP ' + res.status);
  return data.choices?.[0]?.message?.content || '';
}

async function callMetisText(env, prompt, imageBase64, imageMime) {
  var key = env.METIS_KEY;
  if (!key) throw new Error('no metis key');
  var content = imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }] : prompt;
  var res = await fetch('https://api.metisai.ir/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: content }], temperature: 0.1, max_tokens: 8192 })
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'HTTP ' + res.status);
  return data.choices?.[0]?.message?.content || '';
}

async function callOneXAiText(env, prompt, imageBase64, imageMime) {
  var key = env.ONEXAI_KEY;
  if (!key) throw new Error('no 1xai key');
  var content = imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }] : prompt;
  var res = await fetch('https://1xai.ir/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: content }], temperature: 0.1, max_tokens: 8192 })
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'HTTP ' + res.status);
  return data.choices?.[0]?.message?.content || '';
}

var PROVIDER_FUNCS = {
  gemini: callGeminiText,
  groq: callGroqText,
  github: callGitHubText,
  together: callTogetherText,
  gapgpt: callGapGPTText,
  aiprime: callAIPrimeText,
  openrouter: callOpenRouterText,
  mistral: callMistralText,
  huggingface: callHuggingFaceText,
  cloudflare: callCloudflareText,
  nvidia: callNvidiaText,
  llm7: callLLM7Text,
  avalai: callAvalAIText,
  metis: callMetisText,
  onexai: callOneXAiText
};

async function callWithFallback(env, prompt, imageBase64, imageMime) {
  var providers = getAvailableProviders(env);
  if (!providers.length) throw new Error('هیچ سرویس AI فعال نیست');

  var hasImage = !!imageBase64;

  if (hasImage) {
    var imgPriority = { gemini: 1, gapgpt: 2, aiprime: 3, groq: 4, openrouter: 5, mistral: 6, together: 7, nvidia: 8, huggingface: 9, github: 10, cloudflare: 11, avalai: 12, metis: 13, onexai: 14, llm7: 15 };
    providers.sort(function(a, b) { return (imgPriority[a] || 99) - (imgPriority[b] || 99); });
  } else {
    var txtPriority = { groq: 1, openrouter: 2, mistral: 3, github: 4, together: 5, gapgpt: 6, aiprime: 7, llm7: 8, avalai: 9, metis: 10, onexai: 11, huggingface: 12, nvidia: 13, cloudflare: 14, gemini: 99 };
    providers.sort(function(a, b) { return (txtPriority[a] || 50) - (txtPriority[b] || 50); });
  }

  console.log('Mode: ' + (hasImage ? '🖼️ IMAGE' : '📊 TEXT') + ' | Order: ' + providers.join(' → '));

  var errors = [];
  for (var i = 0; i < providers.length; i++) {
    var p = providers[i];
    try {
      console.log('Trying ' + p + '...');
      var timeout = (p === 'gapgpt' || p === 'aiprime') ? 25000 : 15000;
      var result = await withTimeout(PROVIDER_FUNCS[p](env, prompt, imageBase64, imageMime), timeout, p);
      if (result && result.length > 10) {
        console.log('✅ OK ' + p + ' (' + result.length + ' chars)');
        return { text: result, provider: PROVIDER_NAMES[p] };
      }
      errors.push(p + ': کوتاه');
    } catch (e) {
      console.log('❌ ' + p + ': ' + e.message);
      errors.push(p + ': ' + e.message);
    }
  }
  throw new Error('همه سرویس‌ها خطا دادند:\n' + errors.slice(0, 8).join('\n'));
}

// ============================================
// HELPERS
// ============================================

function klinesToText(klines, symbol, tfName) {
  if (!klines || !klines.length) return '';
  var last = klines[klines.length - 1];
  var recent = klines.slice(-40);
  var rows = recent.slice(-25).map(function(k) {
    var t = k.datetime ? k.datetime.slice(-8, -3) : '';
    return '  ' + t + ' | O:' + k.open + ' H:' + k.high + ' L:' + k.low + ' C:' + k.close;
  }).join('\n');
  return '=== ' + tfName + ' (' + symbol + ') ===\nقیمت فعلی: ' + last.close + '\n\n' + rows;
}

function normalizeSymbol(sym) {
  if (!sym) return '';
  var cleaned = sym.trim().toUpperCase();
  if (cleaned.indexOf('/') !== -1) return cleaned;
  var match = cleaned.match(/^([A-Z]+)(USD|EUR|GBP|JPY|CHF|AUD|CAD|NZD)$/);
  if (match) return match[1] + '/' + match[2];
  return cleaned;
}

function timeframeLabel(tf) {
  var labels = { '1min': '1 دقیقه', '3min': '3 دقیقه', '5min': '5 دقیقه', '15min': '15 دقیقه', '1h': '1 ساعت', '4h': '4 ساعت' };
  return labels[tf] || tf;
}

function regimeLabel(r) {
  var labels = { TRENDING_UP: '📈 صعودی', TRENDING_DOWN: '📉 نزولی', RANGING: '↔️ رنج', TRANSITIONAL: '🔄 گذار' };
  return labels[r] || '';
}

function directionEmoji(d) {
  if (d === 'BULLISH' || d === 'BUY' || d === 'LONG') return '🟢 صعودی';
  if (d === 'BEARISH' || d === 'SELL' || d === 'SHORT') return '🔴 نزولی';
  if (d === 'RANGING' || d === 'WAIT') return '⚪️ رنج';
  return d || '—';
}

// ============================================
// KEYBOARDS
// ============================================

function mainMenu() {
  return {
    inline_keyboard: [
      [{ text: '📊 تحلیل جدید', callback_data: 'menu_analyze' }, { text: '🎯 تحلیل MTF', callback_data: 'menu_mtf' }],
      [{ text: '📸 تحلیل تصویر', callback_data: 'menu_image' }, { text: '📓 ژورنال', callback_data: 'menu_journal' }],
      [{ text: '🔔 هشدارها', callback_data: 'menu_watch' }, { text: '⚙️ تنظیمات', callback_data: 'menu_settings' }],
      [{ text: '📈 وضعیت', callback_data: 'menu_status' }, { text: '📖 راهنما', callback_data: 'menu_help' }]
    ]
  };
}

function symbolMenu() {
  return {
    inline_keyboard: [
      [{ text: '🥇 XAU/USD', callback_data: 'sym_XAUUSD' }, { text: '💶 EUR/USD', callback_data: 'sym_EURUSD' }],
      [{ text: '₿ BTC/USD', callback_data: 'sym_BTCUSD' }, { text: '💷 GBP/USD', callback_data: 'sym_GBPUSD' }],
      [{ text: '💎 ETH/USD', callback_data: 'sym_ETHUSD' }, { text: '💵 USD/JPY', callback_data: 'sym_USDJPY' }],
      [{ text: '✏️ نماد دیگر', callback_data: 'sym_custom' }],
      [{ text: '🏠 منوی اصلی', callback_data: 'menu_main' }]
    ]
  };
}

function timeframeMenu(symbolRaw) {
  return {
    inline_keyboard: [
      [{ text: '🎯 تحلیل MTF (4H+1H+15M+1M)', callback_data: 'mtf_' + symbolRaw }],
      [{ text: '⏱️ 1 دقیقه', callback_data: 'tf_' + symbolRaw + '_1min' }, { text: '⏱️ 3 دقیقه', callback_data: 'tf_' + symbolRaw + '_3min' }],
      [{ text: '⏱️ 5 دقیقه', callback_data: 'tf_' + symbolRaw + '_5min' }, { text: '⏱️ 15 دقیقه', callback_data: 'tf_' + symbolRaw + '_15min' }],
      [{ text: '🕐 1 ساعت', callback_data: 'tf_' + symbolRaw + '_1h' }, { text: '📅 4 ساعت', callback_data: 'tf_' + symbolRaw + '_4h' }],
      [{ text: '◀️ بازگشت', callback_data: 'menu_analyze' }]
    ]
  };
}

function providerMenu(providerList, symbolRaw, timeframe, isMTF) {
  var buttons = [];
  var row = [];
  for (var i = 0; i < providerList.length; i++) {
    var p = providerList[i];
    var icon = {
      gemini: '🌟', groq: '⚡', openrouter: '🔀', mistral: '🌬️', github: '🐙',
      together: '🤝', gapgpt: '💎', aiprime: '🅰️', huggingface: '🤗', cloudflare: '☁️', nvidia: '🟢',
      llm7: '🎁', avalai: '🇮🇷', metis: '🇮🇷', onexai: '🇮🇷'
    }[p] || '🤖';
    var label = icon + ' ' + (PROVIDER_NAMES[p] || p);
    var cb = 'pvd_' + p + '_' + symbolRaw + '_' + (isMTF ? 'MTF' : timeframe);
    row.push({ text: label, callback_data: cb });
    if (row.length === 2) { buttons.push(row); row = []; }
  }
  if (row.length > 0) buttons.push(row);
  buttons.push([{ text: '◀️ بازگشت', callback_data: isMTF ? 'menu_main' : 'menu_analyze' }]);
  return { inline_keyboard: buttons };
}

function journalMenu() {
  return {
    inline_keyboard: [
      [{ text: '➕ ثبت معامله جدید', callback_data: 'journal_add' }],
      [{ text: '📋 لیست معاملات', callback_data: 'journal_list' }, { text: '📊 آمار عملکرد', callback_data: 'journal_stats' }],
      [{ text: '🗑️ پاک کردن همه', callback_data: 'journal_clear' }],
      [{ text: '🏠 منوی اصلی', callback_data: 'menu_main' }]
    ]
  };
}

function watchMenu() {
  return {
    inline_keyboard: [
      [{ text: '➕ افزودن هشدار', callback_data: 'watch_add' }],
      [{ text: '📋 لیست هشدارها', callback_data: 'watch_list' }],
      [{ text: '🗑️ پاک کردن همه', callback_data: 'watch_clear' }],
      [{ text: '🏠 منوی اصلی', callback_data: 'menu_main' }]
    ]
  };
}

function modeMenu() {
  return {
    inline_keyboard: [
      [{ text: '⚡ اسکلپی', callback_data: 'mode_scalping' }],
      [{ text: '⚖️ متوسط', callback_data: 'mode_medium' }],
      [{ text: '🛡️ مطمئن', callback_data: 'mode_confident' }],
      [{ text: '◀️ بازگشت', callback_data: 'menu_settings' }]
    ]
  };
}

// ============================================
// STATE / KV
// ============================================

async function setUserState(env, chatId, state) { await env.KV.put('state:' + chatId, JSON.stringify(state), { expirationTtl: 600 }); }
async function getUserState(env, chatId) { try { return await env.KV.get('state:' + chatId, 'json'); } catch (e) { return null; } }
async function clearUserState(env, chatId) { await env.KV.delete('state:' + chatId); }
async function getJournal(env, chatId) { try { return await env.KV.get('journal:' + chatId, 'json') || []; } catch (e) { return []; } }
async function saveJournal(env, chatId, journal) { await env.KV.put('journal:' + chatId, JSON.stringify(journal)); }
async function getWatchlist(env, chatId) { try { return await env.KV.get('watch:' + chatId, 'json') || []; } catch (e) { return []; } }
async function saveWatchlist(env, chatId, list) { await env.KV.put('watch:' + chatId, JSON.stringify(list)); }

// ============================================
// MENU VIEWS
// ============================================

async function showMainMenu(token, chatId, mid) { await sendOrEdit(token, chatId, mid, '🎯 <b>Everest AI Terminal</b>\n\nاز منو انتخاب کنید:', mainMenu()); }
async function showSymbolMenu(token, chatId, mid) { await sendOrEdit(token, chatId, mid, '🎯 <b>نماد:</b>', symbolMenu()); }
async function showTimeframeMenu(token, chatId, mid, sr) { await sendOrEdit(token, chatId, mid, '⏰ <b>روش تحلیل ' + normalizeSymbol(sr) + '</b>', timeframeMenu(sr)); }

async function showProviderMenu(token, chatId, mid, symbolRaw, timeframe, isMTF, env) {
  var available = getAvailableProviders(env);
  if (!available.length) {
    await sendOrEdit(token, chatId, mid, '❌ هیچ سرویس AI فعالی نیست', {
      inline_keyboard: [[{ text: '🏠 منو', callback_data: 'menu_main' }]]
    });
    return;
  }
  var symbolDisplay = normalizeSymbol(symbolRaw);
  var tfDisplay = isMTF ? 'تحلیل MTF (4H+1H+15M+1M)' : timeframeLabel(timeframe);
  var text = '<b>🎯 انتخاب سرویس AI</b>\n\n' +
    '<b>نماد:</b> ' + symbolDisplay + '\n' +
    '<b>روش:</b> ' + tfDisplay + '\n\n' +
    '<i>کدوم سرویس تحلیل رو انجام بده؟</i>';
  await sendOrEdit(token, chatId, mid, text, providerMenu(available, symbolRaw, timeframe, isMTF));
}

async function showJournalMenu(token, chatId, mid, env) {
  var j = await getJournal(env, chatId);
  var t = '📓 <b>ژورنال</b>\n\n';
  if (j.length) {
    var w = 0, l = 0;
    for (var i = 0; i < j.length; i++) { if (j[i].result === 'win') w++; if (j[i].result === 'loss') l++; }
    t += '📈 ' + j.length + ' معامله\n✅ ' + w + ' برد\n❌ ' + l + ' باخت\n\n';
  } else t += '<i>خالی</i>\n\n';
  await sendOrEdit(token, chatId, mid, t, journalMenu());
}

async function showWatchMenu(token, chatId, mid, env) {
  var l = await getWatchlist(env, chatId);
  var t = '🔔 <b>هشدارها</b>\n\n';
  if (l.length) t += l.length + ' هشدار فعال\n';
  else t += '<i>خالی</i>\n\n';
  await sendOrEdit(token, chatId, mid, t, watchMenu());
}

async function showSettingsMenu(token, chatId, mid) {
  await sendOrEdit(token, chatId, mid, '⚙️ <b>تنظیمات</b>', {
    inline_keyboard: [[{ text: '🎯 حالت تحلیل', callback_data: 'settings_mode' }], [{ text: '🏠 منو', callback_data: 'menu_main' }]]
  });
}

async function showStatus(token, chatId, mid, env) {
  var all = ['gemini', 'groq', 'github', 'together', 'gapgpt', 'aiprime', 'openrouter', 'mistral', 'huggingface', 'cloudflare', 'nvidia', 'llm7', 'avalai', 'metis', 'onexai'];
  var text = '📈 <b>وضعیت سرویس‌ها</b>\n\n';
  var active = 0;
  for (var i = 0; i < all.length; i++) {
    var p = all[i];
    var hasKey;
    if (p === 'gemini') hasKey = getGeminiKeys(env).length > 0;
    else if (p === 'llm7') hasKey = true;
    else hasKey = !!getKey(env, p);
    if (hasKey) active++;
    text += (hasKey ? '✅' : '❌') + ' ' + PROVIDER_NAMES[p] + '\n';
  }
  text += '\n🎯 فعال: <b>' + active + '/' + all.length + '</b>\n';
  text += '🔑 Gemini: <b>' + getGeminiKeys(env).length + '</b> کلید\n';
  text += '📊 TwelveData: ' + (env.TWELVE_KEY ? '✅' : '❌') + '\n';
  text += '📸 Chart-Img: ' + (env.CHART_IMG_KEY ? '✅' : '❌') + '\n';
  text += '💾 KV: ' + (env.KV ? '✅' : '❌') + '\n';
  text += '🔒 قفل: ' + (env.ADMIN_CHAT_ID ? '✅ فعال' : '❌ غیرفعال');
  await sendOrEdit(token, chatId, mid, text, { inline_keyboard: [[{ text: '🏠 منو', callback_data: 'menu_main' }]] });
}

async function showHelp(token, chatId, mid) {
  var t = '📖 <b>راهنما</b>\n\n📊 تحلیل:\n• تک تایم‌فریم\n• MTF (۴ تایم‌فریم)\n• تصویر 📸\n\n📓 ژورنال\n🔔 هشدار\n\n🎯 در هر تحلیل، خودت سرویس AI رو انتخاب می‌کنی\n\n<b>دستورات:</b>\n/menu /help /analyze /journal /watch /myid';
  await sendOrEdit(token, chatId, mid, t, { inline_keyboard: [[{ text: '🏠 منو', callback_data: 'menu_main' }]] });
}

async function showImageGuide(token, chatId, mid) {
  var t = '📸 <b>تحلیل تصویر</b>\n\nفقط عکس چارت را بفرستید!\n\n💡 محور Y واضح باشد\n\n🤖 سرویس: Gemini اول (خودکار)';
  await sendOrEdit(token, chatId, mid, t, { inline_keyboard: [[{ text: '🏠 منو', callback_data: 'menu_main' }]] });
}

// ============================================
// SEND/EDIT
// ============================================

async function sendOrEdit(token, chatId, mid, text, keyboard) {
  if (mid) {
    try {
      var res = await fetch('https://api.telegram.org/bot' + token + '/editMessageText', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: mid, text: text.slice(0, 4000), parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: keyboard })
      });
      var data = await res.json();
      if (data.ok) return data;
    } catch (e) {}
  }
  return await sendMessage(token, chatId, text, keyboard);
}

async function sendMessage(token, chatId, text, keyboard) {
  var payload = { chat_id: chatId, text: text.slice(0, 4000), parse_mode: 'HTML', disable_web_page_preview: true };
  if (keyboard) payload.reply_markup = keyboard;
  var res = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  return res.json();
}

async function sendPhotoBytes(token, chatId, imageBuffer, caption) {
  var fd = new FormData();
  fd.append('chat_id', String(chatId));
  fd.append('caption', (caption || '').slice(0, 1000));
  fd.append('parse_mode', 'HTML');
  fd.append('photo', new Blob([imageBuffer], { type: 'image/png' }), 'chart.png');
  var res = await fetch('https://api.telegram.org/bot' + token + '/sendPhoto', { method: 'POST', body: fd });
  return res.json();
}

async function answerCallback(token, cid) {
  await fetch('https://api.telegram.org/bot' + token + '/answerCallbackQuery', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callback_query_id: cid })
  });
}

async function downloadTelegramPhoto(token, fileId) {
  var r1 = await fetch('https://api.telegram.org/bot' + token + '/getFile?file_id=' + fileId);
  var d1 = await r1.json();
  if (!d1.ok) throw new Error('getFile failed');
  var r2 = await fetch('https://api.telegram.org/file/bot' + token + '/' + d1.result.file_path);
  var buf = await r2.arrayBuffer();
  var bytes = new Uint8Array(buf);
  var binary = '';
  var chunk = 8192;
  for (var i = 0; i < bytes.length; i += chunk) { binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk)); }
  return { base64: btoa(binary), size: bytes.length };
}

// ============================================
// EXTERNAL APIs
// ============================================

async function fetchTwelveData(symbol, interval, apiKey, size) {
  var url = new URL('https://api.twelvedata.com/time_series');
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('interval', interval);
  url.searchParams.set('outputsize', size || 200);
  url.searchParams.set('apikey', apiKey);
  var res = await fetch(url.toString());
  var data = await res.json();
  if (data.status === 'error' || data.code) throw new Error(data.message || 'خطا در دریافت داده');
  if (!data.values || !data.values.length) throw new Error('داده‌ای یافت نشد');
  var result = [];
  for (var i = data.values.length - 1; i >= 0; i--) {
    var v = data.values[i];
    result.push({ datetime: v.datetime || '', open: parseFloat(v.open), high: parseFloat(v.high), low: parseFloat(v.low), close: parseFloat(v.close), volume: parseFloat(v.volume || 0) });
  }
  return result;
}

async function getCurrentPrice(symbol, apiKey) {
  var res = await fetch('https://api.twelvedata.com/price?symbol=' + encodeURIComponent(symbol) + '&apikey=' + apiKey);
  var data = await res.json();
  if (data.status === 'error' || data.code) throw new Error(data.message || 'خطا');
  return parseFloat(data.price);
}

async function buildChartImage(symbol, timeframe, levels, env) {
  if (!env.CHART_IMG_KEY) throw new Error('no chart-img key');
  var symUpper = symbol.toUpperCase().replace('/', '');
  var exchange = 'OANDA';
  if (symUpper === 'BTCUSD' || symUpper === 'ETHUSD' || symUpper.indexOf('USDT') !== -1) exchange = 'BINANCE';
  else if (['AAPL', 'MSFT', 'TSLA', 'GOOGL'].indexOf(symUpper) !== -1) exchange = 'NASDAQ';
  var im = { '1min': '1m', '3min': '3m', '5min': '5m', '15min': '15m', '1h': '1h', '4h': '4h' };
  var ci = im[timeframe] || '1h';
  var hl = [];
  if (levels && levels.direction !== 'WAIT') {
    if (levels.entry) hl.push({ price: levels.entry, color: '#00c6ff', label: 'Entry', lineWidth: 2, lineStyle: 'solid' });
    if (levels.sl) hl.push({ price: levels.sl, color: '#ff1744', label: 'SL', lineWidth: 2, lineStyle: 'dashed' });
    if (levels.tp1) hl.push({ price: levels.tp1, color: '#00c853', label: 'TP1', lineWidth: 2, lineStyle: 'dashed' });
    if (levels.tp2) hl.push({ price: levels.tp2, color: '#00c853', label: 'TP2', lineWidth: 2, lineStyle: 'dashed' });
    if (levels.tp3) hl.push({ price: levels.tp3, color: '#00c853', label: 'TP3', lineWidth: 2, lineStyle: 'dashed' });
  }
  var body = { symbol: exchange + ':' + symUpper, interval: ci, theme: 'dark', width: 800, height: 600, studies: [{ name: 'Volume', forceOverlay: true }, { name: 'MACD' }, { name: 'Relative Strength Index' }] };
  if (hl.length > 0) body.horizontalLines = hl;
  var res = await fetch('https://api.chart-img.com/v2/tradingview/advanced-chart', {
    method: 'POST', headers: { 'x-api-key': env.CHART_IMG_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  if (!res.ok) { var e = await res.text(); throw new Error('Chart-Img ' + res.status + ': ' + e.slice(0, 200)); }
  return await res.arrayBuffer();
}

// ============================================
// FORMATTING
// ============================================

function buildCaption(levels, symbol, timeframe, provider) {
  var c = '<b>📊 تحلیل چارت</b>\n\n<b>نماد:</b> ' + symbol + '\n<b>تایم‌فریم:</b> ' + timeframeLabel(timeframe) + '\n';
  if (provider) c += '<b>سرویس:</b> ' + provider + '\n';
  c += '\n';
  var d = levels.direction || 'WAIT';
  c += '<b>جهت:</b> ' + (d === 'BUY' ? '🟢 خرید' : d === 'SELL' ? '🔴 فروش' : '⏸️ انتظار') + '\n';
  if (levels.regime) c += '<b>رژیم:</b> ' + regimeLabel(levels.regime) + '\n';
  if (levels.confidence !== null && levels.confidence !== undefined) c += '<b>اطمینان:</b> ' + levels.confidence + '%\n';
  c += '\n';
  if (d === 'WAIT') c += '<i>ستاپ معتبری نیست.</i>\n';
  else {
    if (levels.entry) c += '<b>🎯 ورود:</b> <code>' + levels.entry + '</code>\n';
    if (levels.sl) c += '<b>🛑 SL:</b> <code>' + levels.sl + '</code>\n';
    if (levels.tp1) c += '<b>✅ TP1:</b> <code>' + levels.tp1 + '</code>\n';
    if (levels.tp2) c += '<b>✅ TP2:</b> <code>' + levels.tp2 + '</code>\n';
    if (levels.tp3) c += '<b>✅ TP3:</b> <code>' + levels.tp3 + '</code>\n';
    if (levels.rr) c += '<b>⚖️ R/R:</b> <code>' + levels.rr + '</code>\n';
  }
  return c;
}

function buildMultiTFCaption(levels, symbol, provider) {
  var c = '<b>🎯 تحلیل MTF</b>\n\n<b>نماد:</b> ' + symbol + '\n';
  if (provider) c += '<b>سرویس:</b> ' + provider + '\n';
  c += '\n';
  if (levels.htf || levels.mtf || levels.ltf || levels.entryTf) {
    c += '<b>📊 تایم‌فریم‌ها:</b>\n';
    c += '• 4H: ' + directionEmoji(levels.htf) + '\n';
    c += '• 1H: ' + directionEmoji(levels.mtf) + '\n';
    c += '• 15M: ' + directionEmoji(levels.ltf) + '\n';
    c += '• 1M: ' + directionEmoji(levels.entryTf) + '\n\n';
  }
  if (levels.confluenceScore !== null && levels.confluenceScore !== undefined) {
    var s = levels.confluenceScore;
    var e = s >= 8 ? '🔥' : s >= 6 ? '✅' : s >= 4 ? '⚠️' : '❌';
    c += '<b>هم‌گرایی:</b> ' + e + ' <b>' + s + '/10</b>\n\n';
  }
  var d = levels.direction || 'WAIT';
  c += '<b>جهت:</b> ' + (d === 'BUY' ? '🟢 خرید' : d === 'SELL' ? '🔴 فروش' : '⏸️ انتظار') + '\n';
  if (levels.confidence !== null && levels.confidence !== undefined) c += '<b>اطمینان:</b> ' + levels.confidence + '%\n';
  c += '\n';
  if (d === 'WAIT') c += '<i>هم‌جهت نیستند.</i>\n';
  else {
    if (levels.entry) c += '<b>🎯 ورود:</b> <code>' + levels.entry + '</code>\n';
    if (levels.sl) c += '<b>🛑 SL:</b> <code>' + levels.sl + '</code>\n';
    if (levels.tp1) c += '<b>✅ TP1:</b> <code>' + levels.tp1 + '</code>\n';
    if (levels.tp2) c += '<b>✅ TP2:</b> <code>' + levels.tp2 + '</code>\n';
    if (levels.tp3) c += '<b>✅ TP3:</b> <code>' + levels.tp3 + '</code>\n';
    if (levels.rr) c += '<b>⚖️ R/R:</b> <code>' + levels.rr + '</code>\n';
  }
  return c;
}

function buildImageCaption(levels, provider) {
  var c = '<b>📸 تحلیل تصویر</b>\n';
  if (provider) c += '<b>سرویس:</b> ' + provider + '\n';
  c += '\n';
  if (levels.detectedSymbol && levels.detectedSymbol !== 'UNKNOWN') c += '<b>نماد:</b> ' + levels.detectedSymbol + '\n';
  if (levels.detectedTimeframe && levels.detectedTimeframe !== 'UNKNOWN') c += '<b>تایم‌فریم:</b> ' + levels.detectedTimeframe + '\n';
  c += '\n';
  var d = levels.direction || 'WAIT';
  c += '<b>جهت:</b> ' + (d === 'BUY' ? '🟢 خرید' : d === 'SELL' ? '🔴 فروش' : '⏸️ انتظار') + '\n';
  if (levels.regime) c += '<b>رژیم:</b> ' + regimeLabel(levels.regime) + '\n';
  if (levels.confidence !== null && levels.confidence !== undefined) c += '<b>اطمینان:</b> ' + levels.confidence + '%\n';
  c += '\n';
  if (d === 'WAIT') c += '<i>ستاپ معتبری نیست.</i>\n';
  else {
    if (levels.entry) c += '<b>🎯 ورود:</b> <code>' + levels.entry + '</code>\n';
    if (levels.sl) c += '<b>🛑 SL:</b> <code>' + levels.sl + '</code>\n';
    if (levels.tp1) c += '<b>✅ TP1:</b> <code>' + levels.tp1 + '</code>\n';
    if (levels.tp2) c += '<b>✅ TP2:</b> <code>' + levels.tp2 + '</code>\n';
    if (levels.tp3) c += '<b>✅ TP3:</b> <code>' + levels.tp3 + '</code>\n';
    if (levels.rr) c += '<b>⚖️ R/R:</b> <code>' + levels.rr + '</code>\n';
  }
  return c;
}

function tgFormat(text) {
  var c = text.replace(/```json[\s\S]*?```/gi, '').replace(/```[\s\S]*?```/g, '');
  var h = c.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  h = h.replace(/^#{1,4}\s*(.+)$/gm, '\n━━━━━━━━━━━━━━━\n📌 <b>$1</b>\n━━━━━━━━━━━━━━━');
  h = h.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  h = h.replace(/\n{3,}/g, '\n\n');
  return h.trim();
}

// ============================================
// ANALYSIS
// ============================================

async function runAnalysis(token, chatId, symbol, twelveKey, env, timeframe, forcedProvider) {
  try {
    var providerLabel = forcedProvider ? (PROVIDER_NAMES[forcedProvider] || forcedProvider) : 'خودکار';
    await sendMessage(token, chatId, '⏳ تحلیل <b>' + symbol + '</b>\n🤖 سرویس: <b>' + providerLabel + '</b>');
    var im = { '1min': '1min', '3min': '5min', '5min': '5min', '15min': '15min', '1h': '1h', '4h': '4h' };
    var interval = im[timeframe] || '1h';
    var klines = await fetchTwelveData(symbol, interval, twelveKey, 200);
    var prompt = 'نماد: ' + symbol + '\nتایم‌فریم: ' + timeframeLabel(timeframe) + '\n\n' + klinesToText(klines, symbol, timeframeLabel(timeframe));

    var result;
    if (forcedProvider && PROVIDER_FUNCS[forcedProvider]) {
      try {
        console.log('Forced: ' + forcedProvider);
        var text = await withTimeout(PROVIDER_FUNCS[forcedProvider](env, SYSTEM_PROMPT + '\n\n' + prompt, null, null), 30000, forcedProvider);
        if (text && text.length > 10) {
          result = { text: text, provider: PROVIDER_NAMES[forcedProvider] };
        } else {
          throw new Error('پاسخ کوتاه');
        }
      } catch (e) {
        await sendMessage(token, chatId, '❌ <b>' + (PROVIDER_NAMES[forcedProvider] || forcedProvider) + '</b> خطا داد:\n<code>' + e.message + '</code>\n\n🔄 تلاش با بقیه سرویس‌ها...');
        result = await callWithFallback(env, SYSTEM_PROMPT + '\n\n' + prompt, null, null);
      }
    } else {
      result = await callWithFallback(env, SYSTEM_PROMPT + '\n\n' + prompt, null, null);
    }

    var levels = validateSignal(extractLevels(result.text));
    try {
      var buf = await buildChartImage(symbol, timeframe, levels, env);
      await sendPhotoBytes(token, chatId, buf, '📊 ' + symbol + ' - ' + timeframeLabel(timeframe));
    } catch (ce) { console.error('Chart: ' + ce.message); }

    await sendMessage(token, chatId, buildCaption(levels, symbol, timeframe, result.provider));
    var ft = tgFormat(result.text);
    if (ft.length > 0) {
      for (var i = 0; i < ft.length; i += 3800) await sendMessage(token, chatId, ft.slice(i, i + 3800));
    }
    await sendMessage(token, chatId, '🏠 بازگشت:', { inline_keyboard: [[{ text: '🏠 منو', callback_data: 'menu_main' }]] });
  } catch (e) {
    await sendMessage(token, chatId, '❌ خطا: <code>' + e.message + '</code>');
  }
}

async function runMultiTFAnalysis(token, chatId, symbol, twelveKey, env, forcedProvider) {
  try {
    var providerLabel = forcedProvider ? (PROVIDER_NAMES[forcedProvider] || forcedProvider) : 'خودکار';
    await sendMessage(token, chatId, '🎯 MTF <b>' + symbol + '</b>\n🤖 سرویس: <b>' + providerLabel + '</b>');
    var k4H = await fetchTwelveData(symbol, '4h', twelveKey, 150);
    var k1H = await fetchTwelveData(symbol, '1h', twelveKey, 150);
    var k15M = await fetchTwelveData(symbol, '15min', twelveKey, 150);
    var k1M = await fetchTwelveData(symbol, '1min', twelveKey, 150);
    var p = 'نماد: ' + symbol + '\n\n🔹 HTF (4H):\n' + klinesToText(k4H, symbol, '4H') + '\n\n🔹 MTF (1H):\n' + klinesToText(k1H, symbol, '1H') + '\n\n🔹 LTF (15M):\n' + klinesToText(k15M, symbol, '15M') + '\n\n🔹 EntryTF (1M):\n' + klinesToText(k1M, symbol, '1M');

    var result;
    if (forcedProvider && PROVIDER_FUNCS[forcedProvider]) {
      try {
        console.log('Forced MTF: ' + forcedProvider);
        var text = await withTimeout(PROVIDER_FUNCS[forcedProvider](env, MULTI_TF_PROMPT + '\n\n' + p, null, null), 30000, forcedProvider);
        if (text && text.length > 10) {
          result = { text: text, provider: PROVIDER_NAMES[forcedProvider] };
        } else {
          throw new Error('پاسخ کوتاه');
        }
      } catch (e) {
        await sendMessage(token, chatId, '❌ <b>' + (PROVIDER_NAMES[forcedProvider] || forcedProvider) + '</b> خطا داد:\n<code>' + e.message + '</code>\n\n🔄 تلاش با بقیه سرویس‌ها...');
        result = await callWithFallback(env, MULTI_TF_PROMPT + '\n\n' + p, null, null);
      }
    } else {
      result = await callWithFallback(env, MULTI_TF_PROMPT + '\n\n' + p, null, null);
    }

    var levels = validateSignal(extractLevels(result.text));
    try {
      var buf = await buildChartImage(symbol, '15min', levels, env);
      await sendPhotoBytes(token, chatId, buf, '📊 ' + symbol + ' - MTF');
    } catch (ce) {}
    await sendMessage(token, chatId, buildMultiTFCaption(levels, symbol, result.provider));
    var ft = tgFormat(result.text);
    if (ft.length > 0) {
      for (var i = 0; i < ft.length; i += 3800) await sendMessage(token, chatId, ft.slice(i, i + 3800));
    }
    await sendMessage(token, chatId, '🏠 بازگشت:', { inline_keyboard: [[{ text: '🏠 منو', callback_data: 'menu_main' }]] });
  } catch (e) {
    await sendMessage(token, chatId, '❌ MTF: <code>' + e.message + '</code>');
  }
}

// ⭐ runImageAnalysis اصلاح‌شده — ارسال تحلیل کامل
async function runImageAnalysis(token, chatId, photoFileId, env) {
  try {
    await sendMessage(token, chatId, '📸 دریافت تصویر...');
    var pd = await downloadTelegramPhoto(token, photoFileId);
    if (pd.size > 5 * 1024 * 1024) { await sendMessage(token, chatId, '❌ حجم > ۵ مگابایت'); return; }
    await sendMessage(token, chatId, '🧠 در حال تحلیل...\n⏳ ممکنه ۳۰-۶۰ ثانیه طول بکشه');
    
    var result = await callWithFallback(env, IMAGE_PROMPT, pd.base64, 'image/jpeg');
    var levels = validateSignal(extractLevels(result.text));
    
    // کپشن (خلاصه سطوح)
    await sendMessage(token, chatId, buildImageCaption(levels, result.provider));
    
    // ارسال تحلیل کامل
    var fullText = result.text;
    fullText = fullText.replace(/```json[\s\S]*?```/gi, '');
    fullText = fullText.replace(/```[\s\S]*?```/g, '');
    
    var ft = tgFormat(fullText);
    
    if (ft.length > 20) {
      for (var i = 0; i < ft.length; i += 3800) {
        await sendMessage(token, chatId, ft.slice(i, i + 3800));
        await sleep(400);
      }
    } else {
      var raw = fullText.trim();
      if (raw.length > 20) {
        for (var j = 0; j < raw.length; j += 3800) {
          await sendMessage(token, chatId, raw.slice(j, j + 3800));
          await sleep(400);
        }
      } else {
        await sendMessage(token, chatId, '⚠️ پاسخ AI فقط JSON بود. لطفاً دوباره تلاش کن.');
      }
    }
    
    await sendMessage(token, chatId, '🏠 بازگشت:', { inline_keyboard: [[{ text: '🏠 منو', callback_data: 'menu_main' }]] });
  } catch (e) {
    await sendMessage(token, chatId, '❌ تصویر: <code>' + e.message + '</code>');
  }
}

// ============================================
// JOURNAL / WATCH
// ============================================

async function showJournalList(token, chatId, env) {
  var j = await getJournal(env, chatId);
  if (!j.length) { await sendMessage(token, chatId, '📓 خالی', { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_journal' }]] }); return; }
  var t = '<b>📓 لیست</b>\n\n';
  for (var i = 0; i < Math.min(j.length, 15); i++) {
    var x = j[i];
    var s = x.result === 'win' ? '✅' : x.result === 'loss' ? '❌' : '⏳';
    t += s + ' #' + x.id + ' ' + x.symbol + ' ' + x.direction + '\n';
  }
  await sendMessage(token, chatId, t, { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_journal' }]] });
}

async function showJournalStats(token, chatId, env) {
  var j = await getJournal(env, chatId);
  if (!j.length) { await sendMessage(token, chatId, '📓 خالی', { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_journal' }]] }); return; }
  var w = 0, l = 0, p = 0, tRR = 0, cRR = 0;
  for (var i = 0; i < j.length; i++) {
    var x = j[i];
    if (x.result === 'win') w++; else if (x.result === 'loss') l++; else p++;
    var r = Math.abs(x.tp - x.entry) / Math.abs(x.entry - x.sl);
    if (!isNaN(r) && isFinite(r)) { tRR += r; cRR++; }
  }
  var cl = w + l;
  var wr = cl > 0 ? (w / cl * 100).toFixed(1) : '0';
  var ar = cRR > 0 ? (tRR / cRR).toFixed(2) : '0';
  var t = '<b>📊 آمار</b>\n\n📈 کل: <b>' + j.length + '</b>\n✅ برد: <b>' + w + '</b>\n❌ باخت: <b>' + l + '</b>\n⏳ در انتظار: <b>' + p + '</b>\n\n🎯 نرخ برد: <b>' + wr + '%</b>\n⚖️ R/R: <b>1:' + ar + '</b>';
  await sendMessage(token, chatId, t, { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_journal' }]] });
}

async function showWatchList(token, chatId, env) {
  var l = await getWatchlist(env, chatId);
  if (!l.length) { await sendMessage(token, chatId, '🔔 خالی', { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_watch' }]] }); return; }
  var t = '<b>🔔 هشدارها</b>\n\n';
  for (var i = 0; i < l.length; i++) { t += '#' + l[i].id + ' ' + l[i].symbol + ' ' + (l[i].condition === 'above' ? '⬆️' : '⬇️') + ' ' + l[i].price + '\n'; }
  await sendMessage(token, chatId, t, { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_watch' }]] });
}

async function startJournalWizard(token, chatId, env) {
  await setUserState(env, chatId, { action: 'journal_add', step: 'symbol', data: {} });
  await sendMessage(token, chatId, '📝 <b>ثبت معامله</b>\n\nمرحله ۱/۵\n\n<b>نماد:</b>', { inline_keyboard: [[{ text: '❌ لغو', callback_data: 'wizard_cancel' }]] });
}

async function handleJournalWizard(token, chatId, text, env, state) {
  var d = state.data || {};
  if (state.step === 'symbol') {
    d.symbol = normalizeSymbol(text); state.data = d; state.step = 'direction';
    await setUserState(env, chatId, state);
    await sendMessage(token, chatId, '📝 ۲/۵ <b>جهت:</b>', { inline_keyboard: [[{ text: '🟢 BUY', callback_data: 'wiz_dir_BUY' }, { text: '🔴 SELL', callback_data: 'wiz_dir_SELL' }], [{ text: '❌ لغو', callback_data: 'wizard_cancel' }]] });
    return;
  }
  if (state.step === 'entry') {
    var e = parseFloat(text.replace(/[^\d.\-]/g, ''));
    if (isNaN(e)) { await sendMessage(token, chatId, '❌ عدد:'); return; }
    d.entry = e; state.data = d; state.step = 'sl';
    await setUserState(env, chatId, state);
    await sendMessage(token, chatId, '📝 ۴/۵ <b>SL:</b>', { inline_keyboard: [[{ text: '❌ لغو', callback_data: 'wizard_cancel' }]] });
    return;
  }
  if (state.step === 'sl') {
    var s = parseFloat(text.replace(/[^\d.\-]/g, ''));
    if (isNaN(s)) { await sendMessage(token, chatId, '❌ عدد:'); return; }
    d.sl = s; state.data = d; state.step = 'tp';
    await setUserState(env, chatId, state);
    await sendMessage(token, chatId, '📝 ۵/۵ <b>TP:</b>', { inline_keyboard: [[{ text: '❌ لغو', callback_data: 'wizard_cancel' }]] });
    return;
  }
  if (state.step === 'tp') {
    var tp = parseFloat(text.replace(/[^\d.\-]/g, ''));
    if (isNaN(tp)) { await sendMessage(token, chatId, '❌ عدد:'); return; }
    d.tp = tp;
    var j = await getJournal(env, chatId);
    j.push({ id: j.length + 1, symbol: d.symbol, direction: d.direction, entry: d.entry, sl: d.sl, tp: d.tp, ts: Date.now(), result: null });
    await saveJournal(env, chatId, j);
    await clearUserState(env, chatId);
    var rr = Math.abs(d.tp - d.entry) / Math.abs(d.entry - d.sl);
    await sendMessage(token, chatId, '✅ <b>ثبت شد</b>\n#' + j.length + ' ' + d.symbol + ' ' + d.direction + '\nR/R: 1:' + rr.toFixed(2), { inline_keyboard: [[{ text: '📓 ژورنال', callback_data: 'menu_journal' }]] });
    return;
  }
}

async function startWatchWizard(token, chatId, env) {
  await setUserState(env, chatId, { action: 'watch_add', step: 'symbol', data: {} });
  await sendMessage(token, chatId, '🔔 <b>افزودن هشدار</b>\n\nمرحله ۱/۳\n\n<b>نماد:</b>', { inline_keyboard: [[{ text: '❌ لغو', callback_data: 'wizard_cancel' }]] });
}

async function handleWatchWizard(token, chatId, text, env, state) {
  var d = state.data || {};
  if (state.step === 'symbol') {
    d.symbol = normalizeSymbol(text); state.data = d; state.step = 'condition';
    await setUserState(env, chatId, state);
    await sendMessage(token, chatId, '🔔 ۲/۳ <b>شرط:</b>', { inline_keyboard: [[{ text: '⬆️ بالاتر', callback_data: 'wiz_cond_above' }], [{ text: '⬇️ پایین‌تر', callback_data: 'wiz_cond_below' }], [{ text: '❌ لغو', callback_data: 'wizard_cancel' }]] });
    return;
  }
  if (state.step === 'price') {
    var p = parseFloat(text.replace(/[^\d.\-]/g, ''));
    if (isNaN(p)) { await sendMessage(token, chatId, '❌ عدد:'); return; }
    d.price = p;
    var l = await getWatchlist(env, chatId);
    var nid = l.length > 0 ? Math.max.apply(null, l.map(function(w) { return w.id; })) + 1 : 1;
    l.push({ id: nid, symbol: d.symbol, condition: d.condition, price: d.price, ts: Date.now() });
    await saveWatchlist(env, chatId, l);
    await clearUserState(env, chatId);
    await sendMessage(token, chatId, '✅ <b>ثبت شد</b>\n#' + nid + ' ' + d.symbol, { inline_keyboard: [[{ text: '🔔 هشدارها', callback_data: 'menu_watch' }]] });
    return;
  }
}

async function checkWatchlist(env) {
  try {
    var token = env.TG_TOKEN, tk = env.TWELVE_KEY;
    var list = await env.KV.list({ prefix: 'watch:' });
    for (var i = 0; i < list.keys.length; i++) {
      var k = list.keys[i].name;
      var cid = k.replace('watch:', '');
      var wl = await env.KV.get(k, 'json');
      if (!wl || !wl.length) continue;
      var rem = [];
      for (var j = 0; j < wl.length; j++) {
        var w = wl[j];
        try {
          var price = await getCurrentPrice(w.symbol, tk);
          var tg = (w.condition === 'above' && price >= w.price) || (w.condition === 'below' && price <= w.price);
          if (tg) {
            await sendMessage(token, cid, '🔔 <b>هشدار!</b>\n\n📌 ' + w.symbol + '\n💰 ' + price, { inline_keyboard: [[{ text: '📊 تحلیل', callback_data: 'sym_' + w.symbol.replace('/', '') }]] });
          } else rem.push(w);
        } catch (e) { rem.push(w); }
      }
      await env.KV.put(k, JSON.stringify(rem));
    }
  } catch (e) { console.error('check: ' + e.message); }
}

// ============================================
// CALLBACK HANDLER
// ============================================

async function handleCallback(token, chatId, mid, data, env) {
  var tk = env.TWELVE_KEY;
  if (data === 'menu_main') { await showMainMenu(token, chatId, mid); return; }
  if (data === 'menu_analyze') { await showSymbolMenu(token, chatId, mid); return; }
  if (data === 'menu_mtf') { await showSymbolMenu(token, chatId, mid); return; }
  if (data === 'menu_image') { await showImageGuide(token, chatId, mid); return; }
  if (data === 'menu_journal') { await showJournalMenu(token, chatId, mid, env); return; }
  if (data === 'menu_watch') { await showWatchMenu(token, chatId, mid, env); return; }
  if (data === 'menu_settings') { await showSettingsMenu(token, chatId, mid); return; }
  if (data === 'menu_status') { await showStatus(token, chatId, mid, env); return; }
  if (data === 'menu_help') { await showHelp(token, chatId, mid); return; }
  if (data === 'wizard_cancel') { await clearUserState(env, chatId); await sendOrEdit(token, chatId, mid, '❌ لغو', { inline_keyboard: [[{ text: '🏠 منو', callback_data: 'menu_main' }]] }); return; }
  if (data === 'sym_custom') { await setUserState(env, chatId, { action: 'custom_symbol', step: 'input', data: {} }); await sendOrEdit(token, chatId, mid, '✏️ نماد:', { inline_keyboard: [[{ text: '❌ لغو', callback_data: 'wizard_cancel' }]] }); return; }
  if (data.indexOf('sym_') === 0) { await showTimeframeMenu(token, chatId, mid, data.replace('sym_', '')); return; }

  if (data.indexOf('mtf_') === 0) {
    var symMTF = data.replace('mtf_', '');
    await showProviderMenu(token, chatId, mid, symMTF, 'MTF', true, env);
    return;
  }

  if (data.indexOf('tf_') === 0) {
    var rest = data.replace('tf_', '');
    var tfm = rest.match(/_([^_]+)$/);
    if (!tfm) return;
    var symRaw = rest.slice(0, -tfm[0].length);
    var tf = tfm[1];
    await showProviderMenu(token, chatId, mid, symRaw, tf, false, env);
    return;
  }

  if (data.indexOf('pvd_') === 0) {
    var rest2 = data.replace('pvd_', '');
    var parts = rest2.split('_');
    if (parts.length < 3) return;
    var provider = parts[0];
    var timeframe = parts[parts.length - 1];
    var symbolRaw = parts.slice(1, -1).join('_');
    var symbol = normalizeSymbol(symbolRaw);

    try {
      await fetch('https://api.telegram.org/bot' + token + '/deleteMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: mid })
      });
    } catch (e) {}

    if (timeframe === 'MTF') {
      await runMultiTFAnalysis(token, chatId, symbol, tk, env, provider);
    } else {
      await runAnalysis(token, chatId, symbol, tk, env, timeframe, provider);
    }
    return;
  }

  if (data === 'journal_add') { await startJournalWizard(token, chatId, env); return; }
  if (data === 'journal_list') { await showJournalList(token, chatId, env); return; }
  if (data === 'journal_stats') { await showJournalStats(token, chatId, env); return; }
  if (data === 'journal_clear') { await saveJournal(env, chatId, []); await sendOrEdit(token, chatId, mid, '🗑️', { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_journal' }]] }); return; }
  if (data.indexOf('wiz_dir_') === 0) {
    var st = await getUserState(env, chatId);
    if (!st || st.action !== 'journal_add') return;
    st.data.direction = data.replace('wiz_dir_', ''); st.step = 'entry';
    await setUserState(env, chatId, st);
    await sendOrEdit(token, chatId, mid, '📝 ۳/۵ <b>Entry:</b>', { inline_keyboard: [[{ text: '❌ لغو', callback_data: 'wizard_cancel' }]] });
    return;
  }
  if (data === 'watch_add') { await startWatchWizard(token, chatId, env); return; }
  if (data === 'watch_list') { await showWatchList(token, chatId, env); return; }
  if (data === 'watch_clear') { await saveWatchlist(env, chatId, []); await sendOrEdit(token, chatId, mid, '🗑️', { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_watch' }]] }); return; }
  if (data.indexOf('wiz_cond_') === 0) {
    var st2 = await getUserState(env, chatId);
    if (!st2 || st2.action !== 'watch_add') return;
    st2.data.condition = data.replace('wiz_cond_', ''); st2.step = 'price';
    await setUserState(env, chatId, st2);
    await sendOrEdit(token, chatId, mid, '🔔 ۳/۳ <b>قیمت:</b>', { inline_keyboard: [[{ text: '❌ لغو', callback_data: 'wizard_cancel' }]] });
    return;
  }
  if (data === 'settings_mode') { await sendOrEdit(token, chatId, mid, '⚙️ حالت:', modeMenu()); return; }
  if (data.indexOf('mode_') === 0) {
    var m = data.replace('mode_', '');
    await env.KV.put('mode:' + chatId, m);
    await sendOrEdit(token, chatId, mid, '✅ ' + m, { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_settings' }]] });
    return;
  }
}

// ============================================
// ACCESS DENIED
// ============================================

async function sendAccessDenied(token, chatId) {
  await sendMessage(token, chatId, '🔒 <b>دسترسی محدود</b>\n\n<b>Chat ID شما:</b>\n<code>' + chatId + '</code>');
}

// ============================================
// MESSAGE HANDLER
// ============================================

async function handleUpdate(update, env) {
  var token = env.TG_TOKEN, tk = env.TWELVE_KEY;

  if (update.message) {
    var chatId = update.message.chat.id;
    var text = (update.message.text || '').trim();

    if (text === '/myid') { await sendMessage(token, chatId, '🆔 Chat ID:\n\n<code>' + chatId + '</code>'); return; }

    if (isSecurityEnabled(env) && !isAdmin(env, chatId)) { await sendAccessDenied(token, chatId); return; }

    if (update.message.photo && update.message.photo.length > 0) {
      await runImageAnalysis(token, chatId, update.message.photo[update.message.photo.length - 1].file_id, env);
      return;
    }
    if (update.message.document && update.message.document.mime_type && update.message.document.mime_type.indexOf('image/') === 0) {
      await runImageAnalysis(token, chatId, update.message.document.file_id, env);
      return;
    }

    var st = await getUserState(env, chatId);
    if (st) {
      if (st.action === 'journal_add') { await handleJournalWizard(token, chatId, text, env, st); return; }
      if (st.action === 'watch_add') { await handleWatchWizard(token, chatId, text, env, st); return; }
      if (st.action === 'custom_symbol') {
        var s = normalizeSymbol(text);
        await clearUserState(env, chatId);
        await showTimeframeMenu(token, chatId, null, s.replace('/', ''));
        return;
      }
    }

    if (text === '/start' || text === '/menu') { await showMainMenu(token, chatId, null); return; }
    if (text === '/help') { await showHelp(token, chatId, null); return; }
    if (text === '/status') { await showStatus(token, chatId, null, env); return; }
    if (text === '/analyze') { await showSymbolMenu(token, chatId, null); return; }
    if (text === '/journal') { await showJournalMenu(token, chatId, null, env); return; }
    if (text === '/watch') { await showWatchMenu(token, chatId, null, env); return; }

    if (text && text.charAt(0) !== '/' && /^[A-Za-z]{2,10}(\/[A-Za-z]{2,10})?$/.test(text.trim())) {
      var s2 = normalizeSymbol(text);
      await showTimeframeMenu(token, chatId, null, s2.replace('/', ''));
      return;
    }

    await sendMessage(token, chatId, '❓ متوجه نشدم', mainMenu());
  }

  if (update.callback_query) {
    var cb = update.callback_query;
    var cbChatId = cb.message.chat.id;
    if (isSecurityEnabled(env) && !isAdmin(env, cbChatId)) { await answerCallback(token, cb.id); await sendAccessDenied(token, cbChatId); return; }
    await answerCallback(token, cb.id);
    await handleCallback(token, cbChatId, cb.message.message_id, cb.data, env);
  }
}

export default {
  async fetch(request, env, ctx) {
    var url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '') return new Response('Everest Bot', { status: 200 });
    if (request.method === 'POST' && url.pathname === '/webhook') {
      try {
        var update = await request.json();
        ctx.waitUntil(handleUpdate(update, env));
      } catch (e) { console.error('Error: ' + e.message); }
      return new Response('OK', { status: 200 });
    }
    return new Response('Not found', { status: 404 });
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(checkWatchlist(env)); }
};
