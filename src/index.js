// ============================================
// EVEREST AI TERMINAL — Telegram Bot v3.8
// + Auto Monitor (Cron)
// + KZ Mode + Crypto + Strictness + Journal
// ============================================

// ---------- Confluence constants ----------
const CONF_KEYS = ['structure', 'smc', 'ict', 'candle', 'liquidity', 'riskReward'];
const CONF_LABELS = {
  structure: 'Market Structure', smc: 'SMC / Order Blocks', ict: 'ICT / FVG',
  candle: 'Candlestick', liquidity: 'Liquidity Sweep', riskReward: 'R/R'
};

const MODEL_TIERS = {
  aiprime: {
    fast: { label: '🚀 سریع', text: 'gpt-4o-mini', vision: 'gpt-4o', desc: '~$0.001', note: 'تحلیل روزمره' },
    premium: { label: '💎 قوی', text: 'claude-sonnet-5', vision: 'claude-sonnet-5', desc: '~$0.045', note: 'ستاپ مهم' },
    deepseek: { label: '🧠 DeepSeek', text: 'deepseek-v4.1-flash', vision: 'deepseek-v4.1-flash', desc: '~$0.003', note: 'تعادل' }
  },
  gapgpt: {
    fast: { label: '🚀 سریع', text: 'gpt-4o-mini', vision: 'gemini-2.0-flash', desc: '~$0.001', note: 'تحلیل روزمره' },
    premium: { label: '💎 قوی', text: 'claude-sonnet-5', vision: 'claude-sonnet-5', desc: '~$0.045', note: 'ستاپ مهم' },
    deepseek: { label: '🧠 DeepSeek', text: 'deepseek-v4.1-flash', vision: 'deepseek-v4.1-flash', desc: '~$0.003', note: 'تعادل' }
  }
};

const STRICTNESS_MODES = {
  hard: { label: '🔴 سختگیر', icon: '🔴', desc: 'همه فیلترها + TP1 الزامی + R/R سخت' },
  easy: { label: '🟢 آسان', icon: '🟢', desc: 'آستانه نرم‌تر + TP1 اختیاری + سیگنال بیشتر' }
};

const KZ_MODES = {
  off: { label: '۲۴/۷', icon: '🌐', desc: 'همیشه بررسی — بی‌توجه به KZ' },
  priority: { label: 'اولویت KZ', icon: '⭐', desc: 'همیشه بررسی + بج اولویت در سیگنال' },
  only: { label: 'فقط KZ', icon: '🔒', desc: 'خارج از KZ بررسی نمی‌شود' }
};

const CRYPTO_BASES = ['BTC','ETH','SOL','BNB','XRP','ADA','DOGE','DOT','AVAX','MATIC','LINK','LTC','ATOM','UNI','NEAR','APT','ARB','OP','TRX','SHIB','PEPE','TON','SUI','INJ','SEI','FIL','ETC','BCH','XLM','HBAR','VET','ALGO','FTM','SAND','MANA','AXS','GALA'];
const BINANCE_INTERVALS = { '1min':'1m','3min':'3m','5min':'5m','15min':'15m','1h':'1h','4h':'4h' };
const TF_MINUTES = { '1min':1,'3min':3,'5min':5,'15min':15,'1h':60,'4h':240 };

function getModelTierConfig(provider, tier, hasImage) {
  const cfg = MODEL_TIERS[provider]?.[tier];
  if (!cfg) return { model: hasImage ? 'gpt-4o' : 'gpt-4o-mini', label: '' };
  return { model: hasImage ? cfg.vision : cfg.text, label: cfg.label, desc: cfg.desc, note: cfg.note };
}

const FORCE_DIRECTIVE = "\n\n" +
"⚠️ **اجباری (STRICT MODE)**: در انتهای پاسخ، دقیقاً این JSON را بده:\n" +
"```json\n" +
"{\"direction\":\"BUY|SELL|WAIT\",\"confluenceScore\":0.0,\"scores\":{\"structure\":0,\"smc\":0,\"ict\":0,\"candle\":0,\"liquidity\":0,\"riskReward\":0},\"confidence\":0,\"entry\":0,\"stopLoss\":0,\"tp1\":0,\"tp2\":0,\"tp3\":0,\"rr\":\"1:0\"}\n" +
"```";

// ============================================
// PROMPTS
// ============================================

const SYSTEM_PROMPT = "شما یک تحلیل‌گر ارشد بازارهای مالی با ۱۵ سال تجربه در SMC، ICT و پرایس اکشن هستید.\n\n" +
"**روش کار**\n۱. استخراج داده خام\n۲. تشخیص رژیم بازار\n۳. شناسایی BOS، CHoCH\n۴. کشف Order Blocks و FVG\n۵. الگوهای کندلی\n۶. امتیازدهی ۶ لایه\n۷. تصمیم نهایی\n\n" +
"**در انتهای پاسخ دقیقاً این فرمت:**\n---\nDirection: [BUY/SELL/WAIT]\nRegime: [TRENDING_UP/TRENDING_DOWN/RANGING/TRANSITIONAL]\nConfidenceScore: [0-100]\nEntry: [عدد یا N/A]\nStop Loss: [عدد یا N/A]\nTP1: [عدد یا N/A]\nTP2: [عدد یا N/A]\nTP3: [عدد یا N/A]\nR/R: [نسبت یا N/A]\n---\n\n" +
"**قوانین:**\n1. اگر Confidence < 65 → WAIT\n2. حد ضرر ساختاری\n3. در BUY، SL زیر Entry · در SELL، SL بالای Entry\n4. R/R با محاسبه واقعی\n5. تحلیل کامل بنویس";

const MULTI_TF_PROMPT = "شما یک تحلیل‌گر ارشد بازارهای مالی هستید.\n\n" +
"**Multi-Timeframe:**\n🎯 HTF (4H): روند اصلی\n🔍 MTF (1H): تأیید ساختار\n📊 LTF (15M): ستاپ\n⏱️ EntryTF (1M): تایمینگ\n\n" +
"**قوانین:** جهت نهایی = جهت 4H · 1M فقط تایمینگ · 4H رنج → WAIT\n\n" +
"**فرمت:**\n---\nDirection: [BUY/SELL/WAIT]\nConfluenceScore: [0-10]\nHTF4H: [BULLISH/BEARISH/RANGING]\nMTF1H: [BULLISH/BEARISH/RANGING]\nLTF15M: [BULLISH/BEARISH/RANGING]\nEntryTF1M: [BULLISH/BEARISH/RANGING]\nConfidenceScore: [0-100]\nEntry: [عدد یا N/A]\nStop Loss: [عدد یا N/A]\nTP1: [عدد یا N/A]\nTP2: [عدد یا N/A]\nTP3: [عدد یا N/A]\nR/R: [نسبت یا N/A]\n---";

const IMAGE_PROMPT = "شما یک تحلیل‌گر ارشد بازارهای مالی با ۱۵ سال تجربه در SMC، ICT و پرایس اکشن هستید.\n\n" +
"**تحلیل چارت از تصویر**\n\n" +
"### ۰. اطلاعات تصویر\n### ۱. رژیم بازار\n### ۲. ساختار بازار\n### ۳. SMC و Order Blocks\n### ۴. الگوهای کندلی\n### ۵. سطوح کلیدی\n### ۶. سناریو معاملاتی\n### ۷. خلاصه اجرایی\n\n" +
"**در انتها:**\n---\nDirection: [BUY/SELL/WAIT]\nSymbol: [نماد یا UNKNOWN]\nTimeframe: [تایم‌فریم یا UNKNOWN]\nRegime: [TRENDING_UP/TRENDING_DOWN/RANGING/TRANSITIONAL]\nConfidenceScore: [0-100]\nEntry: [عدد یا N/A]\nStop Loss: [عدد یا N/A]\nTP1: [عدد یا N/A]\nTP2: [عدد یا N/A]\nTP3: [عدد یا N/A]\nR/R: [نسبت یا N/A]\n---";

const CRYPTO_NOTE = "\n\n**🪙 کریپتو:** بازار ۲۴/۷. ساعات لیکویید بالا (US/EU) بهترین فرصت‌ها";

// ============================================
// ACCESS / UTILS
// ============================================

function isAdmin(env, chatId) { if (!env.ADMIN_CHAT_ID) return true; return String(chatId) === String(env.ADMIN_CHAT_ID); }
function isSecurityEnabled(env) { return !!env.ADMIN_CHAT_ID; }

function withTimeout(promise, ms, label) {
  return Promise.race([promise, new Promise(function(_, reject) { setTimeout(function() { reject(new Error(label + ' timeout (' + ms + 'ms)')); }, ms); })]);
}
function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
function formatTime(dt) {
  if (!dt) return '';
  const s = String(dt);
  const m = s.match(/T(\d{2}):(\d{2})/); if (m) return m[1] + ':' + m[2];
  const m2 = s.match(/(\d{2}):(\d{2})/); if (m2) return m2[1] + ':' + m2[2];
  return s.slice(-8, -3);
}
function num(v) {
  if (v === null || v === undefined || v === '' || v === 'N/A') return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  const clean = String(v).replace(/[,،\s_]/g, '').replace(/^[^\-\d.]*|[^\-\d.]*$/g, '');
  const n = parseFloat(clean); return isNaN(n) ? null : n;
}
function normDir(d) { if (!d) return 'WAIT'; const v = String(d).trim().toUpperCase(); if (v === 'BUY' || v === 'LONG') return 'BUY'; if (v === 'SELL' || v === 'SHORT') return 'SELL'; return 'WAIT'; }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function calcATR(klines, period) {
  period = period || 14;
  if (!klines || klines.length < period + 1) return null;
  const trs = [];
  for (let i = 0; i < period; i++) {
    const k = klines[klines.length - 1 - i]; const prev = klines[klines.length - 2 - i];
    if (!k || !prev) continue;
    trs.push(Math.max(k.high - k.low, Math.abs(k.high - prev.close), Math.abs(k.low - prev.close)));
  }
  if (!trs.length) return null;
  return trs.reduce((a, b) => a + b, 0) / trs.length;
}

// ============================================
// CRYPTO & KILL ZONE
// ============================================

function isCryptoSymbol(sym) {
  const s = String(sym || '').toUpperCase().replace(/[\/\-_]/g, '');
  for (const base of CRYPTO_BASES) { if (s.startsWith(base)) return true; }
  return /\/(USDT|USDC|BUSD|BTC|ETH)$/.test(String(sym || '').toUpperCase());
}

function getLondonHour() { try { return parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: 'numeric', hour12: false }).format(new Date())); } catch (e) { return new Date().getUTCHours(); } }
function getNYHour() { try { return parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(new Date())); } catch (e) { return new Date().getUTCHours() - 5; } }

function getKillZoneInfo() {
  const londonH = getLondonHour(); const nyH = getNYHour();
  const inLondon = londonH >= 7 && londonH < 10;
  const inNY = nyH >= 8 && nyH < 11;
  return { active: inLondon || inNY, london: inLondon, ny: inNY, overlap: inLondon && inNY, londonH, nyH };
}
function getCryptoLiquidityWindow() {
  const nyH = getNYHour();
  return { active: nyH >= 8 && nyH < 18, high: nyH >= 13 && nyH < 17, nyH };
}
function getMarketWindow(symbol) { return isCryptoSymbol(symbol) ? getCryptoLiquidityWindow() : getKillZoneInfo(); }
function getKZShortLabel(symbol) {
  if (isCryptoSymbol(symbol)) { const w = getCryptoLiquidityWindow(); return w.high ? '🪙LIQ+' : w.active ? '🪙LIQ' : '🪙low'; }
  const kz = getKillZoneInfo();
  if (kz.overlap) return '🟢KZ+'; if (kz.london) return '🟢KZ-L'; if (kz.ny) return '🟢KZ-N';
  return '⚪noKZ';
}
function getKZBadge(symbol) {
  if (isCryptoSymbol(symbol)) {
    const w = getCryptoLiquidityWindow();
    if (w.high) return '🪙 <b>کریپتو — لیکویید بالا</b>';
    if (w.active) return '🪙 کریپتو — لیکویید متوسط';
    return '🪙 کریپتو — لیکویید پایین';
  }
  const kz = getKillZoneInfo();
  if (kz.overlap) return '⭐ <b>KZ همپوشانی</b>';
  if (kz.london) return '⭐ <b>KZ لندن</b>';
  if (kz.ny) return '⭐ <b>KZ نیویورک</b>';
  return '⚪ خارج از KZ';
}
function shouldCheckNow(symbol, kzMode) {
  if (kzMode === 'off') return { ok: true, reason: '۲۴/۷' };
  if (kzMode === 'priority') return { ok: true, reason: 'اولویت' };
  if (kzMode === 'only') {
    if (isCryptoSymbol(symbol)) { const w = getCryptoLiquidityWindow(); return w.active ? { ok: true, reason: 'لیکویید' } : { ok: false, reason: 'خارج لیکویید' }; }
    const kz = getKillZoneInfo();
    return kz.active ? { ok: true, reason: 'داخل KZ' } : { ok: false, reason: 'خارج KZ' };
  }
  return { ok: true, reason: 'پیش‌فرض' };
}

// ============================================
// PROVIDERS
// ============================================

const PROVIDER_NAMES = {
  gemini: 'Google Gemini', aiprime: 'AIPrime', github: 'GitHub Models', groq: 'Groq',
  together: 'Together AI', gapgpt: 'GapGPT', openrouter: 'OpenRouter', mistral: 'Mistral AI',
  huggingface: 'HuggingFace', cloudflare: 'Cloudflare AI', nvidia: 'NVIDIA NIM',
  llm7: 'LLM7.io', avalai: 'AvalAI', metis: 'Metis', onexai: '1xAi'
};

function getKey(env, provider) {
  var map = {
    gemini: env.GEMINI_KEY_1 || env.GEMINI_KEY, aiprime: env.AIPRIME_KEY, github: env.GITHUB_MODELS_TOKEN,
    groq: env.GROQ_KEY, together: env.TOGETHER_KEY, gapgpt: env.GAPGPT_KEY, openrouter: env.OPENROUTER_KEY,
    mistral: env.MISTRAL_KEY, huggingface: env.HUGGINGFACE_KEY, cloudflare: env.CLOUDFLARE_KEY,
    nvidia: env.NVIDIA_KEY, llm7: env.LLM7_KEY || 'unused', avalai: env.AVALAI_KEY,
    metis: env.METIS_KEY, onexai: env.ONEXAI_KEY
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
  var all = ['gemini', 'aiprime', 'groq', 'github', 'together', 'gapgpt', 'openrouter', 'mistral', 'huggingface', 'cloudflare', 'nvidia', 'llm7', 'avalai', 'metis', 'onexai'];
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
  if (!text) return null;
  const matches = [...text.matchAll(/```json\s*([\s\S]*?)```/gi)];
  if (matches.length) { try { return JSON.parse(matches[matches.length - 1][1].trim()); } catch (e) {} }
  const m2 = [...text.matchAll(/\{[\s\S]*?"direction"[\s\S]*?\}/g)];
  if (m2.length) { try { return JSON.parse(m2[m2.length - 1][0]); } catch (e) {} }
  return null;
}
function findValue(text, labels) {
  for (var i = 0; i < labels.length; i++) {
    var pattern = new RegExp("\\*{0,2}" + labels[i] + "\\*{0,2}\\s*[:=]\\s*\\*{0,2}\\s*([\\d]+(?:\\.[\\d]+)?)", 'i');
    var m = text.match(pattern);
    if (m) { var n = num(m[1]); if (n !== null) return n; }
  }
  return null;
}
function detectDirection(text) { if (!text) return 'WAIT'; var td = text.match(/Direction\s*[:=]\s*(BUY|SELL|WAIT|LONG|SHORT)/i); if (td) return normDir(td[1]); return 'WAIT'; }
function extractLevels(rawText) {
  var jsonData = parseJsonBlock(rawText);
  if (jsonData) {
    return {
      direction: normDir(jsonData.direction), regime: jsonData.regime || null,
      confidence: num(jsonData.confidence !== undefined ? jsonData.confidence : jsonData.confidenceScore),
      entry: num(jsonData.entry), sl: num(jsonData.stopLoss !== undefined ? jsonData.stopLoss : jsonData.sl),
      tp1: num(jsonData.tp1), tp2: num(jsonData.tp2), tp3: num(jsonData.tp3),
      rr: jsonData.rr || null, confluenceScore: num(jsonData.confluenceScore),
      htf: jsonData.htf4h || null, mtf: jsonData.mtf1h || null, ltf: jsonData.ltf15m || null, entryTf: jsonData.entrytf1m || null,
      detectedSymbol: jsonData.symbol || null, detectedTimeframe: jsonData.timeframe || null, aiScores: jsonData.scores || null
    };
  }
  var blocks = rawText.match(/---\s*\n([\s\S]*?)\n\s*---/g); var text = rawText;
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
    direction: detectDirection(rawText), regime: regimeMatch ? regimeMatch[1].toUpperCase() : null,
    confidence: findValue(text, ['ConfidenceScore', 'امتیاز\\s*اطمینان']),
    entry: findValue(text, ['Entry', 'ورود']), sl: findValue(text, ['Stop[\\s-]?Loss', 'SL', 'حد\\s*ضرر']),
    tp1: findValue(text, ['TP\\s*1']), tp2: findValue(text, ['TP\\s*2']), tp3: findValue(text, ['TP\\s*3']),
    rr: rrMatch ? rrMatch[1] : null, confluenceScore: confMatch ? parseFloat(confMatch[1]) : null,
    htf: htfMatch ? htfMatch[1].toUpperCase() : null, mtf: mtfMatch ? mtfMatch[1].toUpperCase() : null,
    ltf: ltfMatch ? ltfMatch[1].toUpperCase() : null, entryTf: etfMatch ? etfMatch[1].toUpperCase() : null,
    detectedSymbol: symMatch ? symMatch[1].trim() : null, detectedTimeframe: tfMatch2 ? tfMatch2[1].trim() : null,
    aiScores: null
  };
}

// ============================================
// validateSignal
// ============================================

function validateSignal(levels, opts) {
  opts = opts || {};
  var strict = opts.strict || 'hard';
  var minRR = opts.minRR || 1.5;
  var minConfidence = opts.minConfidence || 65;
  var issues = [];
  var originalDir = levels.direction;
  if (strict === 'easy') { minRR = Math.max(1.0, minRR * 0.7); minConfidence = Math.max(55, minConfidence - 5); }

  if (originalDir !== 'WAIT') {
    var conf = levels.confidence;
    if (conf === null || conf === undefined) { issues.push('امتیاز استخراج نشد'); levels.direction = 'WAIT'; }
    else if (conf > 100 || conf < 0) { issues.push('اطمینان نامعتبر'); levels.confidence = null; levels.direction = 'WAIT'; }
    else if (conf < minConfidence) { issues.push('اطمینان ' + conf + '% < ' + minConfidence + '%'); levels.direction = 'WAIT'; }
  }
  if (levels.direction === 'BUY' || levels.direction === 'SELL') {
    var entry = levels.entry, sl = levels.sl;
    if (entry === null) { issues.push('Entry نیست'); levels.direction = 'WAIT'; }
    else if (sl === null) { issues.push('SL نیست'); levels.direction = 'WAIT'; }
    else {
      if (levels.direction === 'BUY' && sl >= entry) { if (strict === 'hard') { issues.push('❌ SL بالای Entry'); levels.direction = 'WAIT'; } else issues.push('⚠️ SL بالای Entry'); }
      if (levels.direction === 'SELL' && sl <= entry) { if (strict === 'hard') { issues.push('❌ SL زیر Entry'); levels.direction = 'WAIT'; } else issues.push('⚠️ SL زیر Entry'); }
    }
    if (levels.direction !== 'WAIT' && entry && sl) {
      if (levels.tp1) {
        var wrongDir = (levels.direction === 'BUY' && levels.tp1 <= entry) || (levels.direction === 'SELL' && levels.tp1 >= entry);
        if (wrongDir) { issues.push('❌ TP1 سمت اشتباه'); levels.direction = 'WAIT'; }
        else {
          var risk = Math.abs(entry - sl); var reward = Math.abs(levels.tp1 - entry);
          var actualRR = risk > 0 ? reward / risk : 0;
          if (actualRR < minRR) { issues.push('R/R ' + actualRR.toFixed(2) + ' < ' + minRR); levels.direction = 'WAIT'; }
          else levels.rr = '1:' + actualRR.toFixed(2);
        }
      } else if (strict === 'hard') { issues.push('⚠️ TP1 نیست'); levels.direction = 'WAIT'; }
    }
    // ATR guard
    if (opts.atr && opts.price && levels.direction !== 'WAIT') {
      if (Math.abs(levels.entry - opts.price) > 3 * opts.atr) { issues.push('❌ Entry > 3×ATR'); levels.direction = 'WAIT'; }
      else if (strict === 'hard' && Math.abs(levels.entry - levels.sl) < 0.5 * opts.atr) { issues.push('❌ SL < 0.5×ATR'); levels.direction = 'WAIT'; }
    }
  }
  levels.validationIssues = issues;
  levels.appliedStrictness = strict;
  return levels;
}

// ============================================
// CONFLUENCE
// ============================================

function extractScores(text) {
  var j = parseJsonBlock(text);
  if (j && j.scores) {
    var s = {}; var ok = 0;
    for (var i = 0; i < CONF_KEYS.length; i++) {
      var k = CONF_KEYS[i]; var v = j.scores[k];
      if (typeof v === 'number' && v >= 0 && v <= 100) { s[k] = v; ok++; }
      else if (typeof v === 'string') { var n = parseFloat(v); if (!isNaN(n)) { s[k] = n; ok++; } }
    }
    if (ok >= 4) return s;
  }
  var pats = {
    structure: /(?:Structure|ساختار)[^\d\n]{0,25}(\d{1,3})/i, smc: /(?:SMC|Order\s*Block|OB)[^\d\n]{0,25}(\d{1,3})/i,
    ict: /(?:ICT|FVG|Fair\s*Value)[^\d\n]{0,25}(\d{1,3})/i, candle: /(?:Candle|کندل|Engulf|Pin|Hammer)[^\d\n]{0,25}(\d{1,3})/i,
    liquidity: /(?:Liquidity|نقدینگی|Sweep)[^\d\n]{0,25}(\d{1,3})/i, riskReward: /(?:R\/R|RiskReward|Risk-Reward)[^\d\n]{0,25}(\d{1,3})/i
  };
  var scores = {}; var found = 0;
  for (var key in pats) { var m = text.match(pats[key]); if (m) { var vv = parseInt(m[1]); if (vv >= 0 && vv <= 100) { scores[key] = vv; found++; } } }
  if (found >= 3) return scores;
  return null;
}
function calculateConfluenceAuto(levels, rawText) {
  var t = (rawText || ''); var scores = {};
  var st = 50;
  if (/\bBOS\b/i.test(t)) st += 12; if (/CHOCH|CHoCH/i.test(t)) st += 10;
  if (/Retest|پولبک/i.test(t)) st += 8; if (/TRENDING_UP|TRENDING_DOWN/i.test(t)) st += 10; if (/RANGING|رنج/i.test(t)) st -= 15;
  scores.structure = Math.max(0, Math.min(100, st));
  var smc = 50; if (/Order\s*Block|\bOB\b/i.test(t)) smc += 18; if (/Premium|Discount/i.test(t)) smc += 8;
  scores.smc = Math.max(0, Math.min(100, smc));
  var ict = 50; if (/FVG|Fair\s*Value\s*Gap/i.test(t)) ict += 22; if (/Imbalance/i.test(t)) ict += 12;
  scores.ict = Math.max(0, Math.min(100, ict));
  var cd = 50; if (/Engulf|پوششی/i.test(t)) cd += 18; if (/Pin\s*Bar/i.test(t)) cd += 15;
  scores.candle = Math.max(0, Math.min(100, cd));
  var lq = 50; if (/Liquidity\s*Sweep|Sweep/i.test(t)) lq += 20; if (/نقدینگی/i.test(t)) lq += 10;
  scores.liquidity = Math.max(0, Math.min(100, lq));
  var rr = 0;
  if (levels.entry && levels.sl && levels.tp1) {
    var risk = Math.abs(levels.entry - levels.sl); var reward = Math.abs(levels.tp1 - levels.entry);
    rr = Math.min(100, Math.round((risk > 0 ? reward / risk : 0) * 33));
  }
  scores.riskReward = rr;
  var avg = (scores.structure + scores.smc + scores.ict + scores.candle + scores.liquidity + scores.riskReward) / 6;
  return { scores: scores, confluence: Math.round((avg / 10) * 10) / 10, auto: true };
}

// ============================================
// KV STATE
// ============================================

async function getConfluenceMode(env, chatId) { try { return (await env.KV.get('confmode:' + chatId)) || 'normal'; } catch (e) { return 'normal'; } }
async function setConfluenceMode(env, chatId, mode) { await env.KV.put('confmode:' + chatId, mode); }
async function getUserModelTier(env, chatId, provider) { try { return (await env.KV.get('tier:' + chatId + ':' + provider)) || 'fast'; } catch (e) { return 'fast'; } }
async function setUserModelTier(env, chatId, provider, tier) { await env.KV.put('tier:' + chatId + ':' + provider, tier); }
async function getStrictness(env, chatId) { try { return (await env.KV.get('strict:' + chatId)) || 'hard'; } catch (e) { return 'hard'; } }
async function setStrictness(env, chatId, mode) { if (!STRICTNESS_MODES[mode]) mode = 'hard'; await env.KV.put('strict:' + chatId, mode); }
async function getKzMode(env, chatId) { try { return (await env.KV.get('kzmode:' + chatId)) || 'priority'; } catch (e) { return 'priority'; } }
async function setKzMode(env, chatId, mode) { if (!KZ_MODES[mode]) mode = 'priority'; await env.KV.put('kzmode:' + chatId, mode); }
async function getUserMode(env, chatId) { try { var m = await env.KV.get('mode:' + chatId); return MODE_CONFIG[m] ? m : 'medium'; } catch (e) { return 'medium'; } }
async function setUserMode(env, chatId, mode) { if (!MODE_CONFIG[mode]) mode = 'medium'; await env.KV.put('mode:' + chatId, mode); }

// ⭐ Monitor KV
async function getMonitor(env, chatId) {
  try { return await env.KV.get('monitor:' + chatId, 'json'); } catch (e) { return null; }
}
async function setMonitor(env, chatId, cfg) {
  await env.KV.put('monitor:' + chatId, JSON.stringify(cfg));
}
async function clearMonitor(env, chatId) {
  await env.KV.delete('monitor:' + chatId);
}

// ============================================
// BUILDERS
// ============================================

function buildPromptForMode(basePrompt, mode) { if (mode === 'force') return basePrompt + FORCE_DIRECTIVE; return basePrompt; }
function buildConfluenceChips(scores, opts) {
  opts = opts || {};
  if (!scores) return '';
  var c = '\n<b>📌 چیپ‌های هم‌گرایی</b>' + (opts.auto ? ' <i>(خودکار)</i>' : '') + ':\n';
  for (var i = 0; i < CONF_KEYS.length; i++) {
    var k = CONF_KEYS[i]; var v = scores[k]; var lbl = CONF_LABELS[k];
    if (v === null || v === undefined) c += '◯ ' + lbl + ' (—)\n';
    else { var icon = v >= 80 ? '🟢' : v >= 60 ? '🟡' : v >= 40 ? '🟠' : '🔴'; c += icon + ' ' + lbl + ' (' + v + ')\n'; }
  }
  return c;
}
function buildConfluenceBlock(confluence, levels) {
  if (!confluence) return '';
  var c = '';
  var cfScore = (confluence.confluence !== null && confluence.confluence !== undefined) ? confluence.confluence : (levels && levels.confluenceScore !== null && levels.confluenceScore !== undefined ? levels.confluenceScore : null);
  if (cfScore === null && confluence.scores) {
    var sum = 0, cnt = 0;
    for (var kk in confluence.scores) { if (typeof confluence.scores[kk] === 'number') { sum += confluence.scores[kk]; cnt++; } }
    if (cnt > 0) cfScore = Math.round((sum / cnt / 10) * 10) / 10;
  }
  if (cfScore !== null && cfScore !== undefined) {
    var e = cfScore >= 8 ? '🔥' : cfScore >= 6 ? '✅' : cfScore >= 4 ? '⚠️' : '❌';
    c += '\n<b>هم‌گرایی:</b> ' + e + ' <b>' + esc(cfScore) + '/10</b>';
    if (confluence.auto) c += ' <i>(خودکار)</i>';
    c += '\n';
  }
  if (confluence.scores) c += buildConfluenceChips(confluence.scores, { auto: confluence.auto });
  if (confluence.warning) c += confluence.warning;
  return c;
}
function buildConfluenceWarning(levels, mode) {
  var w = '';
  if (mode === 'normal') {
    w = '\n⚠️ <b>نمرات هم‌گرایی دریافت نشد</b>\nلطفاً مجدداً تحلیل بگیر یا حالت خودکار را فعال کن.';
    if (levels.direction === 'BUY' || levels.direction === 'SELL') w += '\n\n🚨 <b>سیگنال BUY/SELL داد ولی نمرات نیامد</b>';
  } else if (mode === 'force') w = '\n⚠️ AI از دستور اجباری پیروی نکرد';
  return w;
}

// ============================================
// AI PROVIDERS
// ============================================

async function callGeminiText(env, prompt, imageBase64, imageMime) {
  var keys = getGeminiKeys(env); if (!keys.length) throw new Error('no gemini key');
  var models = ['gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  var parts = [{ text: prompt }];
  if (imageBase64) parts.push({ inline_data: { mime_type: imageMime, data: imageBase64 } });
  var lastErr = '';
  for (var ki = 0; ki < keys.length; ki++) {
    for (var mi = 0; mi < models.length; mi++) {
      var model = models[mi];
      try {
        var res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': keys[ki] },
          body: JSON.stringify({ contents: [{ parts: parts }], generationConfig: { temperature: 0.1, topP: 0.85, maxOutputTokens: 12288 } })
        });
        var data = await res.json();
        if (res.ok) { var t = data.candidates?.[0]?.content?.parts?.[0]?.text; if (t) return t; }
        lastErr = data.error?.message || 'HTTP ' + res.status;
        if (res.status === 400 && /not found/i.test(lastErr)) continue;
        if ([429, 503, 500, 401, 403].indexOf(res.status) === -1) throw new Error(lastErr);
        break;
      } catch (e) { lastErr = e.message; }
    }
  }
  throw new Error('Gemini: ' + lastErr);
}

async function callAIPrimeText(env, prompt, imageBase64, imageMime, chatId) {
  var key = env.AIPRIME_KEY; if (!key) throw new Error('no aiprime key');
  var tier = chatId ? await getUserModelTier(env, chatId, 'aiprime') : 'fast';
  var cfg = getModelTierConfig('aiprime', tier, !!imageBase64);
  var content = imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }] : prompt;
  var res = await fetch('https://api.aiprime.shop/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: content }], temperature: 0.1, max_tokens: 8192 })
  });
  var text = await res.text();
  if (!res.ok) throw new Error('AIPrime ' + res.status + ': ' + text.slice(0, 150));
  try { var data = JSON.parse(text); return data.choices?.[0]?.message?.content || ''; }
  catch (e) { throw new Error('AIPrime JSON: ' + text.slice(0, 150)); }
}

async function callGroqText(env, prompt, imageBase64, imageMime) {
  var key = env.GROQ_KEY; if (!key) throw new Error('no groq key');
  var models = imageBase64 ? ['meta-llama/llama-4-scout-17b-16e-instruct', 'meta-llama/llama-4-maverick-17b-128e-instruct'] : ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'gemma2-9b-it'];
  var lastErr = '';
  for (var i = 0; i < models.length; i++) {
    var content = imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }] : prompt;
    try {
      var res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
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
  var token = env.GITHUB_MODELS_TOKEN; if (!token) throw new Error('no github token');
  var model = env.GITHUB_MODELS_MODEL || 'gpt-4o-mini';
  var content = imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }] : prompt;
  var res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: content }], temperature: 0.1, max_tokens: 8192 })
  });
  var text = await res.text();
  if (!res.ok) throw new Error('GitHub ' + res.status + ': ' + text.slice(0, 150));
  try { var data = JSON.parse(text); return data.choices?.[0]?.message?.content || ''; }
  catch (e) { throw new Error('GitHub JSON: ' + text.slice(0, 150)); }
}

async function callTogetherText(env, prompt, imageBase64, imageMime) {
  var key = env.TOGETHER_KEY; if (!key) throw new Error('no together key');
  var model = imageBase64 ? 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo' : 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
  var content = imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }] : prompt;
  var res = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: content }], temperature: 0.1, max_tokens: 8192 })
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'HTTP ' + res.status);
  return data.choices?.[0]?.message?.content || '';
}

async function callGapGPTText(env, prompt, imageBase64, imageMime, chatId) {
  var key = env.GAPGPT_KEY; if (!key) throw new Error('no gapgpt key');
  var tier = chatId ? await getUserModelTier(env, chatId, 'gapgpt') : 'fast';
  var cfg = getModelTierConfig('gapgpt', tier, !!imageBase64);
  var content = imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }] : prompt;
  var res = await fetch('https://api.gapgpt.app/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: content }], temperature: 0.1, max_tokens: 8192 })
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'HTTP ' + res.status);
  return data.choices?.[0]?.message?.content || '';
}

async function callOpenRouterText(env, prompt, imageBase64, imageMime) {
  var key = env.OPENROUTER_KEY; if (!key) throw new Error('no openrouter key');
  var models = imageBase64 ? ['google/gemini-2.0-flash-exp:free'] : ['deepseek/deepseek-chat', 'meta-llama/llama-3.3-70b-instruct:free'];
  var lastErr = '';
  for (var i = 0; i < models.length; i++) {
    var content = imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }] : prompt;
    try {
      var res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key, 'HTTP-Referer': 'https://everest.bot', 'X-Title': 'Everest' },
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
  var key = env.MISTRAL_KEY; if (!key) throw new Error('no mistral key');
  var model = imageBase64 ? 'pixtral-12b-2409' : 'mistral-small-latest';
  var content = imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: 'data:' + imageMime + ';base64,' + imageBase64 }] : prompt;
  var res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: content }], temperature: 0.1, max_tokens: 8192 })
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || data.message || 'HTTP ' + res.status);
  return data.choices?.[0]?.message?.content || '';
}

async function callHuggingFaceText(env, prompt, imageBase64, imageMime) {
  var key = env.HUGGINGFACE_KEY; if (!key) throw new Error('no hf key');
  var model = imageBase64 ? 'Qwen/Qwen2.5-VL-7B-Instruct' : 'meta-llama/Meta-Llama-3-8B-Instruct';
  var content = imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }] : prompt;
  var res = await fetch('https://api-inference.huggingface.co/models/' + model + '/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: content }], temperature: 0.1, max_tokens: 8192 })
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || data.error || 'HTTP ' + res.status);
  return data.choices?.[0]?.message?.content || '';
}

async function callCloudflareText(env, prompt, imageBase64, imageMime) {
  var key = env.CLOUDFLARE_KEY; if (!key) throw new Error('no cf key');
  var parts = key.split(':'); if (parts.length !== 2) throw new Error('CF_KEY: accountId:token');
  var model = imageBase64 ? '@cf/meta/llama-3.2-11b-vision-instruct' : '@cf/meta/llama-3.1-8b-instruct';
  var content = imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }] : prompt;
  var res = await fetch('https://api.cloudflare.com/client/v4/accounts/' + parts[0] + '/ai/run/' + model, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + parts[1] },
    body: JSON.stringify({ messages: [{ role: 'user', content: content }] })
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.errors?.[0]?.message || 'HTTP ' + res.status);
  return data.result?.response || '';
}

async function callNvidiaText(env, prompt, imageBase64, imageMime) {
  var key = env.NVIDIA_KEY; if (!key) throw new Error('no nvidia key');
  var model = imageBase64 ? 'meta/llama-3.2-90b-vision-instruct' : 'meta/llama-3.3-70b-instruct';
  var content = imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }] : prompt;
  var res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: content }], temperature: 0.1, max_tokens: 8192 })
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'HTTP ' + res.status);
  return data.choices?.[0]?.message?.content || '';
}

async function callLLM7Text(env, prompt, imageBase64, imageMime) {
  var key = env.LLM7_KEY || 'unused';
  var models = ['pro', 'default']; var lastErr = '';
  for (var i = 0; i < models.length; i++) {
    var content = imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }] : prompt;
    try {
      var res = await fetch('https://api.llm7.io/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
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
  var key = env.AVALAI_KEY; if (!key) throw new Error('no avalai key');
  var content = imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }] : prompt;
  var res = await fetch('https://api.avalai.ir/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: 'gemini-2.0-flash', messages: [{ role: 'user', content: content }], temperature: 0.1, max_tokens: 8192 })
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'HTTP ' + res.status);
  return data.choices?.[0]?.message?.content || '';
}

async function callMetisText(env, prompt, imageBase64, imageMime) {
  var key = env.METIS_KEY; if (!key) throw new Error('no metis key');
  var content = imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }] : prompt;
  var res = await fetch('https://api.metisai.ir/openai/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: content }], temperature: 0.1, max_tokens: 8192 })
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'HTTP ' + res.status);
  return data.choices?.[0]?.message?.content || '';
}

async function callOneXAiText(env, prompt, imageBase64, imageMime) {
  var key = env.ONEXAI_KEY; if (!key) throw new Error('no 1xai key');
  var content = imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } }] : prompt;
  var res = await fetch('https://1xai.ir/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: content }], temperature: 0.1, max_tokens: 8192 })
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'HTTP ' + res.status);
  return data.choices?.[0]?.message?.content || '';
}

var PROVIDER_FUNCS = {
  gemini: callGeminiText, aiprime: callAIPrimeText, groq: callGroqText, github: callGitHubText,
  together: callTogetherText, gapgpt: callGapGPTText, openrouter: callOpenRouterText,
  mistral: callMistralText, huggingface: callHuggingFaceText, cloudflare: callCloudflareText,
  nvidia: callNvidiaText, llm7: callLLM7Text, avalai: callAvalAIText, metis: callMetisText, onexai: callOneXAiText
};

async function callWithFallback(env, prompt, imageBase64, imageMime, chatId) {
  var providers = getAvailableProviders(env);
  if (!providers.length) throw new Error('هیچ سرویس AI فعال نیست');
  var hasImage = !!imageBase64;
  if (hasImage) {
    var imgPriority = { gemini: 1, aiprime: 2, gapgpt: 3, groq: 4, openrouter: 5, mistral: 6, together: 7, nvidia: 8, huggingface: 9, github: 10, cloudflare: 11, avalai: 12, metis: 13, onexai: 14, llm7: 15 };
    providers.sort(function(a, b) { return (imgPriority[a] || 99) - (imgPriority[b] || 99); });
  } else {
    var txtPriority = { aiprime: 1, github: 2, groq: 3, together: 4, gapgpt: 5, openrouter: 6, mistral: 7, llm7: 8, avalai: 9, metis: 10, onexai: 11, huggingface: 12, nvidia: 13, cloudflare: 14, gemini: 99 };
    providers.sort(function(a, b) { return (txtPriority[a] || 50) - (txtPriority[b] || 50); });
  }
  var errors = [];
  for (var i = 0; i < providers.length; i++) {
    var p = providers[i];
    try {
      var timeout = (p === 'gapgpt' || p === 'aiprime') ? 30000 : 15000;
      var result = await withTimeout(PROVIDER_FUNCS[p](env, prompt, imageBase64, imageMime, chatId), timeout, p);
      if (result && result.length > 10) return { text: result, provider: PROVIDER_NAMES[p] };
      errors.push(p + ': کوتاه');
    } catch (e) { errors.push(p + ': ' + e.message); }
  }
  throw new Error('همه سرویس‌ها خطا:\n' + errors.slice(0, 6).join('\n'));
}

// ============================================
// DATA FETCHERS
// ============================================

async function fetchBinanceData(symbol, tf) {
  var sym = String(symbol).toUpperCase().replace(/[\/\-_]/g, '');
  var binSym = sym;
  if (binSym.endsWith('USDT')) {} else if (binSym.endsWith('USD')) binSym = binSym.replace(/USD$/, 'USDT');
  else if (binSym.endsWith('USDC')) {} else if (/^[A-Z]+$/.test(binSym)) binSym = binSym + 'USDT';
  var interval = BINANCE_INTERVALS[tf] || '1h';
  var path = '/api/v3/klines?symbol=' + binSym + '&interval=' + interval + '&limit=200';
  var endpoints = [
    'https://api.binance.com' + path,
    'https://data-api.binance.vision' + path,
    'https://api1.binance.com' + path,
    'https://api2.binance.com' + path,
    'https://api3.binance.com' + path
  ];
  var lastErr = '';
  for (var ei = 0; ei < endpoints.length; ei++) {
    try {
      var ctrl = new AbortController();
      var timer = setTimeout(function() { ctrl.abort(); }, 8000);
      var res = await fetch(endpoints[ei], { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) { lastErr = 'HTTP ' + res.status + ' @ ' + ei; continue; }
      var data = await res.json();
      if (!Array.isArray(data) || !data.length) { lastErr = 'empty @ ' + ei; continue; }
      return data.map(function(k) {
        return { datetime: new Date(k[0]).toISOString(), open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] };
      });
    } catch (e) { lastErr = e.message + ' @ ' + ei; }
  }
  throw new Error('Binance: ' + lastErr);
}

async function fetchTwelveData(symbol, interval, apiKey, size) {
  var url = new URL('https://api.twelvedata.com/time_series');
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('interval', interval);
  url.searchParams.set('outputsize', size || 200);
  url.searchParams.set('apikey', apiKey);
  var res = await fetch(url.toString());
  var data = await res.json();
  if (data.status === 'error' || data.code) throw new Error(data.message || 'خطا');
  if (!data.values || !data.values.length) throw new Error('داده‌ای نیست');
  var result = [];
  for (var i = data.values.length - 1; i >= 0; i--) {
    var v = data.values[i];
    result.push({ datetime: v.datetime || '', open: parseFloat(v.open), high: parseFloat(v.high), low: parseFloat(v.low), close: parseFloat(v.close), volume: parseFloat(v.volume || 0) });
  }
  return result;
}

async function getCurrentPrice(symbol, apiKey) {
  if (isCryptoSymbol(symbol)) {
    var s = String(symbol).toUpperCase().replace(/[\/\-_]/g, '');
    if (s.endsWith('USD')) s = s.replace(/USD$/, 'USDT');
    var res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=' + s);
    var d = await res.json();
    if (d.price) return parseFloat(d.price);
    throw new Error('Binance price error');
  }
  var res2 = await fetch('https://api.twelvedata.com/price?symbol=' + encodeURIComponent(symbol) + '&apikey=' + apiKey);
  var data = await res2.json();
  if (data.status === 'error' || data.code) throw new Error(data.message || 'خطا');
  return parseFloat(data.price);
}

async function fetchMarketData(symbol, tf, env, provider) {
  provider = provider || 'auto';
  var tk = env.TWELVE_KEY;
  var isCrypto = isCryptoSymbol(symbol);
  var tdInterval = { '1min':'1min','3min':'5min','5min':'5min','15min':'15min','1h':'1h','4h':'4h' }[tf] || '1h';

  if (provider === 'binance') {
    if (!isCrypto) throw new Error('Binance فقط کریپتو');
    return await withTimeout(fetchBinanceData(symbol, tf), 20000, 'Binance');
  }
  if (provider === 'twelve') {
    if (!tk) throw new Error('Twelve Key خالی');
    return await withTimeout(fetchTwelveData(symbol, tdInterval, tk, 200), 15000, 'Twelve');
  }
  if (provider === 'yahoo') {
    throw new Error('Yahoo غیرفعال — از Binance یا Twelve استفاده کن');
  }
  // auto
  if (isCrypto) {
    try { return await withTimeout(fetchBinanceData(symbol, tf), 20000, 'Binance'); }
    catch (e1) {
      if (tk) return await withTimeout(fetchTwelveData(symbol, tdInterval, tk, 200), 15000, 'Twelve');
      throw new Error('Binance fail. Twelve key بده یا VPN روشن کن');
    }
  }
  if (tk) return await withTimeout(fetchTwelveData(symbol, tdInterval, tk, 200), 15000, 'Twelve');
  throw new Error('Twelve Key لازم است (فارکس/طلا)');
}

function klinesToText(klines, symbol, tfName) {
  if (!klines || !klines.length) return '';
  var last = klines[klines.length - 1];
  var rows = klines.slice(-40).slice(-25).map(function(k) {
    return '  ' + formatTime(k.datetime) + ' | O:' + k.open + ' H:' + k.high + ' L:' + k.low + ' C:' + k.close;
  }).join('\n');
  var isCrypto = isCryptoSymbol(symbol);
  var header = isCrypto ? '=== ' + tfName + ' (' + symbol + ') [CRYPTO] ===' : '=== ' + tfName + ' (' + symbol + ') ===';
  return header + '\nقیمت فعلی: ' + last.close + '\n\n' + rows;
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
  var labels = { '1min':'1 دقیقه','3min':'3 دقیقه','5min':'5 دقیقه','15min':'15 دقیقه','1h':'1 ساعت','4h':'4 ساعت' };
  return labels[tf] || tf;
}
function regimeLabel(r) { return { TRENDING_UP:'📈 صعودی',TRENDING_DOWN:'📉 نزولی',RANGING:'↔️ رنج',TRANSITIONAL:'🔄 گذار' }[r] || ''; }
function directionEmoji(d) {
  if (d === 'BULLISH' || d === 'BUY' || d === 'LONG') return '🟢 صعودی';
  if (d === 'BEARISH' || d === 'SELL' || d === 'SHORT') return '🔴 نزولی';
  if (d === 'RANGING' || d === 'WAIT') return '⚪️ رنج';
  return d || '—';
}

// ============================================
// MODE CONFIG
// ============================================

const MODE_CONFIG = {
  scalping: { label: 'اسکلپی', icon: '⚡', color: '#fbbf24', minConfidence: 70, minRR: 2.0, minConfluence: 7, allowedTFs: ['1min','3min','5min','15min'], note: 'Kill Zone لندن/نیویورک' },
  medium: { label: 'متوسط', icon: '⚖️', color: '#6ea8fe', minConfidence: 65, minRR: 1.5, minConfluence: 6, allowedTFs: ['5min','15min','1h','4h'], note: 'تعادل سرعت/دقت' },
  confident: { label: 'مطمئن', icon: '🛡️', color: '#4ade80', minConfidence: 75, minRR: 2.5, minConfluence: 8, allowedTFs: ['15min','1h','4h'], note: 'کیفیت بالا' }
};

// ============================================
// ⭐ AUTO MONITOR — Core
// ============================================

async function checkAllMonitors(env) {
  try {
    var list = await env.KV.list({ prefix: 'monitor:' });
    if (!list.keys.length) return;
    var token = env.TG_TOKEN;
    var now = Date.now();

    for (var i = 0; i < list.keys.length; i++) {
      var key = list.keys[i].name;
      var chatId = key.replace('monitor:', '');
      try {
        var m = await env.KV.get(key, 'json');
        if (!m || !m.active) continue;

        var tfMs = (TF_MINUTES[m.timeframe] || 5) * 60 * 1000;
        // ⭐ فقط اگر از آخرین check بیشتر از یک TF گذشته
        if (m.lastCheckAt && (now - m.lastCheckAt) < tfMs * 0.9) continue;

        // ⭐ چک KZ Mode
        var kzMode = m.kzMode || (await getKzMode(env, chatId));
        var check = shouldCheckNow(m.symbol, kzMode);
        if (!check.ok) {
          m.lastCheckAt = now;
          m.skippedCount = (m.skippedCount || 0) + 1;
          await env.KV.put(key, JSON.stringify(m));
          continue;
        }

        await runMonitorForUser(env, token, chatId, m);
      } catch (e) {
        console.error('Monitor error for ' + chatId + ': ' + e.message);
      }
      // کمی delay بین کاربران
      await sleep(500);
    }
  } catch (e) {
    console.error('checkAllMonitors: ' + e.message);
  }
}

async function runMonitorForUser(env, token, chatId, m) {
  var symbol = m.symbol;
  var tf = m.timeframe;
  var tfLabel = { '1min':'1m','3min':'3m','5min':'5m','15min':'15m','1h':'1h','4h':'4h' }[tf] || tf;
  var isCrypto = isCryptoSymbol(symbol);
  var symIcon = isCrypto ? '🪙' : '💱';
  var kzTag = getKZShortLabel(symbol);

  try {
    // 1) Fetch klines
    var klines = await fetchMarketData(symbol, tf, env, m.dataProvider || 'auto');
    if (!klines || klines.length < 30) {
      m.lastCheckAt = Date.now();
      await env.KV.put('monitor:' + chatId, JSON.stringify(m));
      return;
    }
    // حذف کندل ناقص
    var last = klines[klines.length - 1];
    var lastT = Date.parse(String(last.datetime).includes('T') ? last.datetime : String(last.datetime).replace(' ', 'T') + 'Z');
    if (Number.isFinite(lastT) && lastT + (TF_MINUTES[tf] || 5) * 60000 > Date.now()) {
      klines.pop();
    }

    var currentPrice = klines[klines.length - 1].close;
    var atr = calcATR(klines, 14);

    // 2) Build prompt
    var promptBody = 'نماد: ' + symbol + '\nتایم‌فریم: ' + tfLabel + '\nقیمت فعلی: ' + currentPrice + '\n\n' + klinesToText(klines, symbol, tfLabel);
    var facts = '\n\n🧮 حقایق محاسبه‌شده محلی:\n- ATR(14)=' + (atr ? atr.toFixed(4) : '?') + '\n';
    if (isCrypto) {
      var w = getCryptoLiquidityWindow();
      facts += '- 🪙 کریپتو (۲۴/۷): ' + (w.high ? 'لیکویید بالا' : w.active ? 'لیکویید متوسط' : 'لیکویید پایین') + '\n';
    } else {
      var kz = getKillZoneInfo();
      facts += '- ' + (kz.active ? '⚠️ داخل KZ — اولویت بالا' : '⚠️ خارج KZ — احتیاط') + '\n';
    }

    // 3) Load user configs
    var strict = m.strictness || (await getStrictness(env, chatId));
    var mode = m.mode || (await getUserMode(env, chatId));
    var confMode = await getConfluenceMode(env, chatId);
    var cfg = MODE_CONFIG[mode] || MODE_CONFIG.medium;

    var sysPrompt = buildPromptForMode(SYSTEM_PROMPT, confMode);
    if (isCrypto) sysPrompt += CRYPTO_NOTE;
    var fullPrompt = sysPrompt + '\n\n' + promptBody + facts;

    // 4) Call AI
    var result;
    var forcedProvider = m.aiProvider && m.aiProvider !== 'auto' ? m.aiProvider : null;
    if (forcedProvider && PROVIDER_FUNCS[forcedProvider]) {
      try {
        var txt = await withTimeout(PROVIDER_FUNCS[forcedProvider](env, fullPrompt, null, null, chatId), 30000, forcedProvider);
        if (txt && txt.length > 10) result = { text: txt, provider: PROVIDER_NAMES[forcedProvider] };
        else throw new Error('کوتاه');
      } catch (e) {
        result = await callWithFallback(env, fullPrompt, null, null, chatId);
      }
    } else {
      result = await callWithFallback(env, fullPrompt, null, null, chatId);
    }

    // 5) Validate
    var levels = validateSignal(extractLevels(result.text), {
      strict: strict, minRR: cfg.minRR, minConfidence: cfg.minConfidence,
      atr: atr, price: currentPrice
    });
    var confluence = await resolveConfluence(env, chatId, levels, result.text);

    // 6) Check confirmed
    var ok = isSignalConfirmed(levels, confluence, strict, cfg);

    // 7) Dedup
    var tol = (atr || 0) * 0.5;
    var p = m.lastSignal;
    var dup = ok && p && p.dir === levels.direction && Math.abs(p.entry - levels.entry) <= tol && (Date.now() - p.t) < (TF_MINUTES[tf] || 5) * 60000 * 6;

    // 8) Update monitor state
    m.lastCheckAt = Date.now();
    m.lastRunAt = Date.now();

    if (ok && !dup) {
      m.lastSignal = { dir: levels.direction, entry: levels.entry, t: Date.now() };
      m.signalCount = (m.signalCount || 0) + 1;
      if (getKillZoneInfo().active || (isCrypto && getCryptoLiquidityWindow().active)) {
        m.kzSignalCount = (m.kzSignalCount || 0) + 1;
      }
      await env.KV.put('monitor:' + chatId, JSON.stringify(m));

      // ⭐ ارسال سیگنال به کاربر
      await sendMonitorSignal(token, chatId, levels, confluence, result, currentPrice, symbol, tf, kzTag);
    } else {
      await env.KV.put('monitor:' + chatId, JSON.stringify(m));
    }
  } catch (e) {
    console.error('Monitor for user ' + chatId + ': ' + e.message);
    m.lastCheckAt = Date.now();
    m.lastError = String(e.message).slice(0, 200);
    await env.KV.put('monitor:' + chatId, JSON.stringify(m));
  }
}

function isSignalConfirmed(levels, confluence, strict, cfg) {
  if (levels.direction !== 'BUY' && levels.direction !== 'SELL') return false;
  if (levels.confidence == null || levels.confidence < cfg.minConfidence) return false;
  if (!levels.entry || !levels.sl) return false;
  if (strict === 'hard') {
    if (!levels.tp1) return false;
    var rr = parseFloat((levels.rr || '').replace('1:', ''));
    if (isNaN(rr) || rr < cfg.minRR) return false;
    if (confluence && confluence.confluence != null && confluence.confluence < cfg.minConfluence) return false;
  }
  return true;
}

async function sendMonitorSignal(token, chatId, levels, confluence, result, currentPrice, symbol, tf, kzTag) {
  var isCrypto = isCryptoSymbol(symbol);
  var symIcon = isCrypto ? '🪙' : '💱';
  var d = levels.direction;
  var dirIcon = d === 'BUY' ? '🟢' : '🔴';
  var kzBadge = getKZBadge(symbol);

  var caption = '🚨 <b>سیگنال مانیتور</b>\n\n' +
    '<b>نماد:</b> ' + symIcon + ' ' + esc(symbol) + '\n' +
    '<b>تایم‌فریم:</b> ' + timeframeLabel(tf) + '\n' +
    '<b>وضعیت:</b> ' + kzBadge + '\n\n' +
    '<b>جهت:</b> ' + dirIcon + ' ' + (d === 'BUY' ? 'خرید' : 'فروش') + '\n' +
    '<b>قیمت فعلی:</b> <code>' + esc(currentPrice) + '</code>\n';

  if (levels.confidence != null) caption += '<b>اطمینان:</b> ' + esc(levels.confidence) + '%\n';
  if (levels.entry != null) caption += '<b>🎯 ورود:</b> <code>' + esc(levels.entry) + '</code>\n';
  if (levels.sl != null) caption += '<b>🛑 SL:</b> <code>' + esc(levels.sl) + '</code>\n';
  if (levels.tp1 != null) caption += '<b>✅ TP1:</b> <code>' + esc(levels.tp1) + '</code>\n';
  if (levels.tp2 != null) caption += '<b>✅ TP2:</b> <code>' + esc(levels.tp2) + '</code>\n';
  if (levels.tp3 != null) caption += '<b>✅ TP3:</b> <code>' + esc(levels.tp3) + '</code>\n';
  if (levels.rr) caption += '<b>⚖️ R/R:</b> <code>' + esc(levels.rr) + '</code>\n';
  if (result.provider) caption += '<b>سرویس:</b> ' + esc(result.provider) + '\n';

  caption += buildConfluenceBlock(confluence, levels);

  var keyboard = { inline_keyboard: [
    [{ text: '⏹️ توقف مانیتور', callback_data: 'mon_stop' }],
    [{ text: '📊 جزئیات کامل', callback_data: 'mon_details' }]
  ]};

  await sendMessage(token, chatId, caption, keyboard);

  // متن کامل تحلیل (اختیاری — اگه طولانی بود)
  var ft = tgFormat(result.text);
  if (ft.length > 100 && ft.length < 3000) {
    await sendMessage(token, chatId, '📖 <b>تحلیل کامل:</b>\n\n' + ft.slice(0, 3500));
  }
}

// ============================================
// KEYBOARDS
// ============================================

function mainMenu() {
  return { inline_keyboard: [
    [{ text: '📊 تحلیل جدید', callback_data: 'menu_analyze' }, { text: '🎯 تحلیل MTF', callback_data: 'menu_mtf' }],
    [{ text: '🤖 مانیتور خودکار', callback_data: 'menu_monitor' }, { text: '📸 تحلیل تصویر', callback_data: 'menu_image' }],
    [{ text: '📓 ژورنال', callback_data: 'menu_journal' }, { text: '🔔 هشدارها', callback_data: 'menu_watch' }],
    [{ text: '⚙️ تنظیمات', callback_data: 'menu_settings' }, { text: '📈 وضعیت', callback_data: 'menu_status' }],
    [{ text: '📖 راهنما', callback_data: 'menu_help' }]
  ]};
}

function symbolMenu() {
  return { inline_keyboard: [
    [{ text: '🥇 XAU/USD', callback_data: 'sym_XAUUSD' }, { text: '💶 EUR/USD', callback_data: 'sym_EURUSD' }],
    [{ text: '💷 GBP/USD', callback_data: 'sym_GBPUSD' }, { text: '💵 USD/JPY', callback_data: 'sym_USDJPY' }],
    [{ text: '₿ BTC/USD', callback_data: 'sym_BTCUSD' }, { text: 'Ξ ETH/USD', callback_data: 'sym_ETHUSD' }],
    [{ text: '◎ SOL/USD', callback_data: 'sym_SOLUSD' }, { text: '🟡 BNB/USD', callback_data: 'sym_BNBUSD' }],
    [{ text: '✕ XRP/USD', callback_data: 'sym_XRPUSD' }, { text: '🐕 DOGE/USD', callback_data: 'sym_DOGEUSD' }],
    [{ text: '✏️ نماد دیگر', callback_data: 'sym_custom' }],
    [{ text: '🏠 منوی اصلی', callback_data: 'menu_main' }]
  ]};
}

function timeframeMenu(symbolRaw) {
  return { inline_keyboard: [
    [{ text: '🎯 تحلیل MTF', callback_data: 'mtf_' + symbolRaw }],
    [{ text: '⏱️ 1 دقیقه', callback_data: 'tf_' + symbolRaw + '_1min' }, { text: '⏱️ 3 دقیقه', callback_data: 'tf_' + symbolRaw + '_3min' }],
    [{ text: '⏱️ 5 دقیقه', callback_data: 'tf_' + symbolRaw + '_5min' }, { text: '⏱️ 15 دقیقه', callback_data: 'tf_' + symbolRaw + '_15min' }],
    [{ text: '🕐 1 ساعت', callback_data: 'tf_' + symbolRaw + '_1h' }, { text: '📅 4 ساعت', callback_data: 'tf_' + symbolRaw + '_4h' }],
    [{ text: '◀️ بازگشت', callback_data: 'menu_analyze' }]
  ]};
}

function providerMenu(providerList, symbolRaw, timeframe, isMTF) {
  var buttons = []; var row = [];
  for (var i = 0; i < providerList.length; i++) {
    var p = providerList[i];
    var icon = { gemini:'🌟',aiprime:'🅰️',groq:'⚡',openrouter:'🔀',mistral:'🌬️',github:'🐙',together:'🤝',gapgpt:'💎',huggingface:'🤗',cloudflare:'☁️',nvidia:'🟢',llm7:'🎁',avalai:'🇮🇷',metis:'🇮🇷',onexai:'🇮🇷' }[p] || '🤖';
    row.push({ text: icon + ' ' + (PROVIDER_NAMES[p] || p), callback_data: 'pvd_' + p + '_' + symbolRaw + '_' + (isMTF ? 'MTF' : timeframe) });
    if (row.length === 2) { buttons.push(row); row = []; }
  }
  if (row.length > 0) buttons.push(row);
  buttons.push([{ text: '◀️ بازگشت', callback_data: isMTF ? 'menu_main' : 'menu_analyze' }]);
  return { inline_keyboard: buttons };
}

function journalMenu() {
  return { inline_keyboard: [
    [{ text: '➕ ثبت معامله', callback_data: 'journal_add' }],
    [{ text: '📋 لیست', callback_data: 'journal_list' }, { text: '📊 آمار', callback_data: 'journal_stats' }],
    [{ text: '🗑️ پاک کردن', callback_data: 'journal_clear' }],
    [{ text: '🏠 منو', callback_data: 'menu_main' }]
  ]};
}

function watchMenu() {
  return { inline_keyboard: [
    [{ text: '➕ افزودن هشدار', callback_data: 'watch_add' }],
    [{ text: '📋 لیست', callback_data: 'watch_list' }],
    [{ text: '🗑️ پاک کردن', callback_data: 'watch_clear' }],
    [{ text: '🏠 منو', callback_data: 'menu_main' }]
  ]};
}

function modeMenu(current) {
  var cur = current || 'medium';
  var m = function(x) { return cur === x ? ' ✅' : ''; };
  return { inline_keyboard: [
    [{ text: '⚡ اسکلپی' + m('scalping'), callback_data: 'mode_scalping' }],
    [{ text: '⚖️ متوسط' + m('medium'), callback_data: 'mode_medium' }],
    [{ text: '🛡️ مطمئن' + m('confident'), callback_data: 'mode_confident' }],
    [{ text: '◀️ بازگشت', callback_data: 'menu_settings' }]
  ]};
}

function confluenceModeMenu(current) {
  var cur = current || 'normal';
  var m = function(x) { return cur === x ? ' ✅' : ''; };
  return { inline_keyboard: [
    [{ text: '🔵 عادی' + m('normal'), callback_data: 'conf_normal' }],
    [{ text: '🟢 خودکار' + m('auto'), callback_data: 'conf_auto' }],
    [{ text: '🔴 اجبار' + m('force'), callback_data: 'conf_force' }],
    [{ text: '◀️ بازگشت', callback_data: 'menu_settings' }]
  ]};
}

function strictnessMenu(current) {
  var cur = current || 'hard';
  var m = function(x) { return cur === x ? ' ✅' : ''; };
  return { inline_keyboard: [
    [{ text: '🔴 سختگیر' + m('hard'), callback_data: 'strict_hard' }],
    [{ text: '🟢 آسان' + m('easy'), callback_data: 'strict_easy' }],
    [{ text: '◀️ بازگشت', callback_data: 'menu_settings' }]
  ]};
}

function kzModeMenu(current) {
  var cur = current || 'priority';
  var m = function(x) { return cur === x ? ' ✅' : ''; };
  return { inline_keyboard: [
    [{ text: '🌐 ۲۴/۷' + m('off'), callback_data: 'kz_off' }],
    [{ text: '⭐ اولویت KZ' + m('priority'), callback_data: 'kz_priority' }],
    [{ text: '🔒 فقط KZ' + m('only'), callback_data: 'kz_only' }],
    [{ text: '◀️ بازگشت', callback_data: 'menu_settings' }]
  ]};
}

function modelTierMenu(cur) {
  var m = function(x) { return cur === x ? ' ✅' : ''; };
  return { inline_keyboard: [
    [{ text: '🚀 سریع' + m('fast'), callback_data: 'tier_fast' }],
    [{ text: '🧠 DeepSeek' + m('deepseek'), callback_data: 'tier_deepseek' }],
    [{ text: '💎 قوی' + m('premium'), callback_data: 'tier_premium' }],
    [{ text: '◀️ بازگشت', callback_data: 'menu_settings' }]
  ]};
}

function modelTierProviderMenu() {
  return { inline_keyboard: [
    [{ text: '🅰️ AIPrime', callback_data: 'tier_prov_aiprime' }],
    [{ text: '💎 GapGPT', callback_data: 'tier_prov_gapgpt' }],
    [{ text: '◀️ بازگشت', callback_data: 'menu_settings' }]
  ]};
}

// ⭐ Monitor keyboards
function monitorSymbolMenu(isCrypto) {
  if (isCrypto) {
    return { inline_keyboard: [
      [{ text: '₿ BTC/USD', callback_data: 'msym_BTCUSD' }, { text: 'Ξ ETH/USD', callback_data: 'msym_ETHUSD' }],
      [{ text: '◎ SOL/USD', callback_data: 'msym_SOLUSD' }, { text: '🟡 BNB/USD', callback_data: 'msym_BNBUSD' }],
      [{ text: '✕ XRP/USD', callback_data: 'msym_XRPUSD' }, { text: '🐕 DOGE/USD', callback_data: 'msym_DOGEUSD' }],
      [{ text: '✏️ نماد دیگر', callback_data: 'msym_custom' }],
      [{ text: '◀️ بازگشت', callback_data: 'menu_monitor' }]
    ]};
  }
  return { inline_keyboard: [
    [{ text: '🥇 XAU/USD', callback_data: 'msym_XAUUSD' }, { text: '💶 EUR/USD', callback_data: 'msym_EURUSD' }],
    [{ text: '💷 GBP/USD', callback_data: 'msym_GBPUSD' }, { text: '💵 USD/JPY', callback_data: 'msym_USDJPY' }],
    [{ text: '🪙 نمادهای کریپتو', callback_data: 'mon_crypto_list' }],
    [{ text: '✏️ نماد دیگر', callback_data: 'msym_custom' }],
    [{ text: '◀️ بازگشت', callback_data: 'menu_monitor' }]
  ]};
}

function monitorTfMenu(symbolRaw) {
  return { inline_keyboard: [
    [{ text: '⏱️ 1 دقیقه', callback_data: 'mtf2_' + symbolRaw + '_1min' }, { text: '⏱️ 5 دقیقه', callback_data: 'mtf2_' + symbolRaw + '_5min' }],
    [{ text: '⏱️ 15 دقیقه', callback_data: 'mtf2_' + symbolRaw + '_15min' }, { text: '🕐 1 ساعت', callback_data: 'mtf2_' + symbolRaw + '_1h' }],
    [{ text: '◀️ بازگشت', callback_data: 'mon_start_wizard' }]
  ]};
}

function monitorAiMenu(symbol, tf) {
  return { inline_keyboard: [
    [{ text: '🤖 خودکار', callback_data: 'mai_auto_' + symbol + '_' + tf }],
    [{ text: '🅰️ AIPrime', callback_data: 'mai_aiprime_' + symbol + '_' + tf }, { text: '💎 GapGPT', callback_data: 'mai_gapgpt_' + symbol + '_' + tf }],
    [{ text: '🌟 Gemini', callback_data: 'mai_gemini_' + symbol + '_' + tf }, { text: '⚡ Groq', callback_data: 'mai_groq_' + symbol + '_' + tf }],
    [{ text: '◀️ بازگشت', callback_data: 'mon_start_wizard' }]
  ]};
}

function monitorDataProviderMenu(symbol, tf, ai) {
  var isCrypto = isCryptoSymbol(symbol);
  return { inline_keyboard: [
    [{ text: isCrypto ? '🟡 Binance (پیشنهاد)' : '📊 Twelve', callback_data: 'mdp_' + (isCrypto ? 'binance' : 'twelve') + '_' + symbol + '_' + tf + '_' + ai }],
    [{ text: '🔄 خودکار (auto)', callback_data: 'mdp_auto_' + symbol + '_' + tf + '_' + ai }],
    [{ text: '◀️ بازگشت', callback_data: 'mon_start_wizard' }]
  ]};
}

// ============================================
// SEND / TELEGRAM
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
  return await (await fetch('https://api.telegram.org/bot' + token + '/sendPhoto', { method: 'POST', body: fd })).json();
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
  var bytes = new Uint8Array(buf); var binary = '';
  for (var i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  return { base64: btoa(binary), size: bytes.length };
}

// ============================================
// CHART IMG
// ============================================

async function buildChartImage(symbol, timeframe, levels, env) {
  if (!env.CHART_IMG_KEY) throw new Error('no chart-img key');
  var symUpper = symbol.toUpperCase().replace('/', '');
  var exchange = 'OANDA';
  if (isCryptoSymbol(symbol)) exchange = 'BINANCE';
  else if (['AAPL','MSFT','TSLA','GOOGL'].indexOf(symUpper) !== -1) exchange = 'NASDAQ';
  var im = { '1min':'1m','3min':'3m','5min':'5m','15min':'15m','1h':'1h','4h':'4h' };
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

function tgFormat(text) {
  var c = text.replace(/```json[\s\S]*?```/gi, '').replace(/```[\s\S]*?```/g, '');
  var h = c.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  h = h.replace(/^#{1,4}\s*(.+)$/gm, '\n━━━━━━━━━━━━━━━\n📌 <b>$1</b>\n━━━━━━━━━━━━━━━');
  h = h.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  h = h.replace(/\n{3,}/g, '\n\n');
  return h.trim();
}

function buildCaption(levels, symbol, timeframe, provider, confluence, strict) {
  var isCrypto = isCryptoSymbol(symbol);
  var symIcon = isCrypto ? '🪙' : '💱';
  var c = '<b>📊 تحلیل چارت</b>\n\n<b>نماد:</b> ' + symIcon + ' ' + esc(symbol) + '\n<b>تایم‌فریم:</b> ' + timeframeLabel(timeframe) + '\n';
  if (provider) c += '<b>سرویس:</b> ' + esc(provider) + '\n';
  if (strict) { var sc = STRICTNESS_MODES[strict]; if (sc) c += '<b>نوع:</b> ' + sc.icon + ' ' + sc.label + '\n'; }
  c += '<b>وضعیت:</b> ' + getKZBadge(symbol) + '\n\n';
  var d = levels.direction || 'WAIT';
  c += '<b>جهت:</b> ' + (d === 'BUY' ? '🟢 خرید' : d === 'SELL' ? '🔴 فروش' : '⏸️ انتظار') + '\n';
  if (levels.regime) c += '<b>رژیم:</b> ' + regimeLabel(levels.regime) + '\n';
  if (levels.confidence != null) c += '<b>اطمینان:</b> ' + esc(levels.confidence) + '%\n';
  c += '\n';
  if (d === 'WAIT') c += '<i>ستاپ معتبری نیست.</i>\n';
  else {
    if (levels.entry) c += '<b>🎯 ورود:</b> <code>' + esc(levels.entry) + '</code>\n';
    if (levels.sl) c += '<b>🛑 SL:</b> <code>' + esc(levels.sl) + '</code>\n';
    if (levels.tp1) c += '<b>✅ TP1:</b> <code>' + esc(levels.tp1) + '</code>\n';
    if (levels.tp2) c += '<b>✅ TP2:</b> <code>' + esc(levels.tp2) + '</code>\n';
    if (levels.tp3) c += '<b>✅ TP3:</b> <code>' + esc(levels.tp3) + '</code>\n';
    if (levels.rr) c += '<b>⚖️ R/R:</b> <code>' + esc(levels.rr) + '</code>\n';
  }
  c += buildConfluenceBlock(confluence, levels);
  return c;
}

function buildMultiTFCaption(levels, symbol, provider, confluence, strict) {
  var isCrypto = isCryptoSymbol(symbol);
  var symIcon = isCrypto ? '🪙' : '💱';
  var c = '<b>🎯 تحلیل MTF</b>\n\n<b>نماد:</b> ' + symIcon + ' ' + esc(symbol) + '\n';
  if (provider) c += '<b>سرویس:</b> ' + esc(provider) + '\n';
  if (strict) { var sc = STRICTNESS_MODES[strict]; if (sc) c += '<b>نوع:</b> ' + sc.icon + ' ' + sc.label + '\n'; }
  c += '<b>وضعیت:</b> ' + getKZBadge(symbol) + '\n\n';
  if (levels.htf || levels.mtf || levels.ltf || levels.entryTf) {
    c += '<b>📊 تایم‌فریم‌ها:</b>\n';
    c += '• 4H: ' + directionEmoji(levels.htf) + '\n';
    c += '• 1H: ' + directionEmoji(levels.mtf) + '\n';
    c += '• 15M: ' + directionEmoji(levels.ltf) + '\n';
    c += '• 1M: ' + directionEmoji(levels.entryTf) + '\n\n';
  }
  var d = levels.direction || 'WAIT';
  c += '<b>جهت:</b> ' + (d === 'BUY' ? '🟢 خرید' : d === 'SELL' ? '🔴 فروش' : '⏸️ انتظار') + '\n';
  if (levels.confidence != null) c += '<b>اطمینان:</b> ' + esc(levels.confidence) + '%\n';
  c += '\n';
  if (d === 'WAIT') c += '<i>هم‌جهت نیستند یا ستاپ معتبر نیست.</i>\n';
  else {
    if (levels.entry) c += '<b>🎯 ورود:</b> <code>' + esc(levels.entry) + '</code>\n';
    if (levels.sl) c += '<b>🛑 SL:</b> <code>' + esc(levels.sl) + '</code>\n';
    if (levels.tp1) c += '<b>✅ TP1:</b> <code>' + esc(levels.tp1) + '</code>\n';
    if (levels.tp2) c += '<b>✅ TP2:</b> <code>' + esc(levels.tp2) + '</code>\n';
    if (levels.tp3) c += '<b>✅ TP3:</b> <code>' + esc(levels.tp3) + '</code>\n';
    if (levels.rr) c += '<b>⚖️ R/R:</b> <code>' + esc(levels.rr) + '</code>\n';
  }
  c += buildConfluenceBlock(confluence, levels);
  return c;
}

function buildImageCaption(levels, provider, confluence, strict) {
  var c = '<b>📸 تحلیل تصویر</b>\n';
  if (provider) c += '<b>سرویس:</b> ' + esc(provider) + '\n';
  if (strict) { var sc = STRICTNESS_MODES[strict]; if (sc) c += '<b>نوع:</b> ' + sc.icon + ' ' + sc.label + '\n'; }
  c += '\n';
  if (levels.detectedSymbol && levels.detectedSymbol !== 'UNKNOWN') c += '<b>نماد:</b> ' + esc(levels.detectedSymbol) + '\n';
  if (levels.detectedTimeframe && levels.detectedTimeframe !== 'UNKNOWN') c += '<b>تایم‌فریم:</b> ' + esc(levels.detectedTimeframe) + '\n';
  c += '\n';
  var d = levels.direction || 'WAIT';
  c += '<b>جهت:</b> ' + (d === 'BUY' ? '🟢 خرید' : d === 'SELL' ? '🔴 فروش' : '⏸️ انتظار') + '\n';
  if (levels.regime) c += '<b>رژیم:</b> ' + regimeLabel(levels.regime) + '\n';
  if (levels.confidence != null) c += '<b>اطمینان:</b> ' + esc(levels.confidence) + '%\n';
  c += '\n';
  if (d === 'WAIT') c += '<i>ستاپ معتبری نیست.</i>\n';
  else {
    if (levels.entry) c += '<b>🎯 ورود:</b> <code>' + esc(levels.entry) + '</code>\n';
    if (levels.sl) c += '<b>🛑 SL:</b> <code>' + esc(levels.sl) + '</code>\n';
    if (levels.tp1) c += '<b>✅ TP1:</b> <code>' + esc(levels.tp1) + '</code>\n';
    if (levels.tp2) c += '<b>✅ TP2:</b> <code>' + esc(levels.tp2) + '</code>\n';
    if (levels.tp3) c += '<b>✅ TP3:</b> <code>' + esc(levels.tp3) + '</code>\n';
    if (levels.rr) c += '<b>⚖️ R/R:</b> <code>' + esc(levels.rr) + '</code>\n';
  }
  c += buildConfluenceBlock(confluence, levels);
  return c;
}

// ============================================
// CONFLUENCE RESOLVER
// ============================================

async function resolveConfluence(env, chatId, levels, rawText) {
  var mode = await getConfluenceMode(env, chatId);
  var result = { mode: mode, scores: null, confluence: null, auto: false, warning: null };
  var aiScores = levels.aiScores || extractScores(rawText);
  if (aiScores && Object.keys(aiScores).length >= 4) {
    var autoFill = calculateConfluenceAuto(levels, rawText);
    for (var i = 0; i < CONF_KEYS.length; i++) {
      var k = CONF_KEYS[i];
      if (aiScores[k] === undefined || aiScores[k] === null) aiScores[k] = autoFill.scores[k];
    }
    var sum = 0;
    for (var j = 0; j < CONF_KEYS.length; j++) sum += (aiScores[CONF_KEYS[j]] || 0);
    var avg = sum / 6 / 10;
    result.scores = aiScores;
    result.confluence = (levels.confluenceScore != null) ? levels.confluenceScore : Math.round(avg * 10) / 10;
    result.auto = false;
    return result;
  }
  if (mode === 'auto' || mode === 'force') {
    var auto = calculateConfluenceAuto(levels, rawText);
    result.scores = auto.scores; result.confluence = auto.confluence; result.auto = true;
    if (mode === 'force') result.warning = '\n⚠️ AI از دستور اجباری پیروی نکرد';
    return result;
  }
  result.warning = buildConfluenceWarning(levels, mode);
  return result;
}

// ============================================
// MENU VIEWS
// ============================================

async function showMainMenu(token, chatId, mid) {
  await sendOrEdit(token, chatId, mid, '🎯 <b>Everest AI Terminal</b>\n\n🌐 ۲۴/۷ · 🪙 کریپتو · 🤖 مانیتور خودکار\n\nاز منو انتخاب کنید:', mainMenu());
}
async function showSymbolMenu(token, chatId, mid) {
  await sendOrEdit(token, chatId, mid, '🎯 <b>نماد:</b>\n\n💱 فارکس · 🪙 کریپتو', symbolMenu());
}
async function showTimeframeMenu(token, chatId, mid, sr) {
  var sym = normalizeSymbol(sr);
  var isCrypto = isCryptoSymbol(sym);
  await sendOrEdit(token, chatId, mid, '⏰ <b>روش تحلیل ' + (isCrypto ? '🪙 ' : '💱 ') + esc(sym) + '</b>', timeframeMenu(sr));
}
async function showProviderMenu(token, chatId, mid, symbolRaw, timeframe, isMTF, env) {
  var available = getAvailableProviders(env);
  if (!available.length) { await sendOrEdit(token, chatId, mid, '❌ هیچ سرویس AI فعالی نیست', { inline_keyboard: [[{ text: '🏠 منو', callback_data: 'menu_main' }]] }); return; }
  var symbolDisplay = normalizeSymbol(symbolRaw);
  var isCrypto = isCryptoSymbol(symbolDisplay);
  var tfDisplay = isMTF ? 'تحلیل MTF' : timeframeLabel(timeframe);
  var confMode = await getConfluenceMode(env, chatId);
  var confLabel = confMode === 'force' ? '🔴 اجبار' : confMode === 'auto' ? '🟢 خودکار' : '🔵 عادی';
  var userModeKey = await getUserMode(env, chatId);
  var userModeCfg = MODE_CONFIG[userModeKey];
  var strict = await getStrictness(env, chatId);
  var strictCfg = STRICTNESS_MODES[strict];
  var kzMode = await getKzMode(env, chatId);
  var kzCfg = KZ_MODES[kzMode];
  var text = '<b>🎯 انتخاب سرویس AI</b>\n\n' +
    '<b>نماد:</b> ' + (isCrypto ? '🪙' : '💱') + ' ' + esc(symbolDisplay) + '\n' +
    '<b>روش:</b> ' + tfDisplay + '\n' +
    '<b>حالت معاملاتی:</b> ' + userModeCfg.icon + ' ' + userModeCfg.label + '\n' +
    '<b>نوع تحلیل:</b> ' + strictCfg.icon + ' ' + strictCfg.label + '\n' +
    '<b>KZ Mode:</b> ' + kzCfg.icon + ' ' + kzCfg.label + '\n' +
    '<b>هم‌گرایی:</b> ' + confLabel + '\n\n<i>کدوم سرویس؟</i>';
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

// ⭐ Monitor Menu
async function showMonitorMenu(token, chatId, mid, env) {
  var m = await getMonitor(env, chatId);
  var isActive = m && m.active;

  var text = '🤖 <b>مانیتور خودکار</b>\n\n';
  if (isActive) {
    var isCrypto = isCryptoSymbol(m.symbol);
    var symIcon = isCrypto ? '🪙' : '💱';
    var kzMode = m.kzMode || 'priority';
    var kzCfg = KZ_MODES[kzMode];
    var strict = m.strictness || 'hard';
    var mode = m.mode || 'medium';
    var modeCfg = MODE_CONFIG[mode];
    var aiLabel = m.aiProvider === 'auto' ? '🤖 خودکار' : (PROVIDER_NAMES[m.aiProvider] || m.aiProvider);
    var dpLabel = { auto: '🔄 خودکار', binance: '🟡 Binance', twelve: '📊 Twelve' }[m.dataProvider] || 'خودکار';

    text += '🟢 <b>فعال</b>\n\n';
    text += '<b>نماد:</b> ' + symIcon + ' ' + esc(m.symbol) + '\n';
    text += '<b>تایم‌فریم:</b> ' + timeframeLabel(m.timeframe) + '\n';
    text += '<b>سرویس AI:</b> ' + aiLabel + '\n';
    text += '<b>منبع داده:</b> ' + dpLabel + '\n';
    text += '<b>حالت:</b> ' + modeCfg.icon + ' ' + modeCfg.label + '\n';
    text += '<b>نوع:</b> ' + STRICTNESS_MODES[strict].icon + ' ' + STRICTNESS_MODES[strict].label + '\n';
    text += '<b>KZ Mode:</b> ' + kzCfg.icon + ' ' + kzCfg.label + '\n\n';
    text += '<b>📊 آمار:</b>\n';
    text += '• سیگنال کل: <b>' + (m.signalCount || 0) + '</b>\n';
    text += '• سیگنال KZ: <b>' + (m.kzSignalCount || 0) + '</b>\n';
    if (m.lastSignal) {
      text += '• آخرین: ' + m.lastSignal.dir + ' @ ' + m.lastSignal.entry + '\n';
    }
    if (m.lastCheckAt) {
      var diff = Math.floor((Date.now() - m.lastCheckAt) / 60000);
      text += '• آخرین بررسی: ' + diff + ' دقیقه پیش\n';
    }
    if (m.lastError) text += '\n⚠️ آخرین خطا: <code>' + esc(m.lastError) + '</code>\n';

    return await sendOrEdit(token, chatId, mid, text, { inline_keyboard: [
      [{ text: '⏹️ توقف مانیتور', callback_data: 'mon_stop' }],
      [{ text: '🔄 تغییر نماد', callback_data: 'mon_start_wizard' }],
      [{ text: '🏠 منو', callback_data: 'menu_main' }]
    ]});
  } else {
    text += '⚪ <b>غیرفعال</b>\n\n';
    text += 'با فعال‌سازی، ربات به‌صورت خودکار بازار را هر X دقیقه بررسی می‌کند و در صورت ستاپ معتبر، سیگنال می‌فرستد.\n\n';
    text += '<b>پیشنهاد:</b>\n🪙 کریپتو: Binance (رایگان)\n💱 فارکس/طلا: Twelve key لازم\n';
    await sendOrEdit(token, chatId, mid, text, { inline_keyboard: [
      [{ text: '▶️ شروع مانیتور', callback_data: 'mon_start_wizard' }],
      [{ text: '📖 راهنما', callback_data: 'mon_help' }],
      [{ text: '🏠 منو', callback_data: 'menu_main' }]
    ]});
  }
}

async function showSettingsMenu(token, chatId, mid, env) {
  var confMode = await getConfluenceMode(env, chatId);
  var confLabel = confMode === 'force' ? '🔴 اجبار' : confMode === 'auto' ? '🟢 خودکار' : '🔵 عادی';
  var userModeKey = await getUserMode(env, chatId);
  var userModeCfg = MODE_CONFIG[userModeKey];
  var strict = await getStrictness(env, chatId);
  var strictCfg = STRICTNESS_MODES[strict];
  var kzMode = await getKzMode(env, chatId);
  var kzCfg = KZ_MODES[kzMode];
  var apTier = await getUserModelTier(env, chatId, 'aiprime');
  var ggTier = await getUserModelTier(env, chatId, 'gapgpt');
  var apLabel = apTier === 'premium' ? '💎' : apTier === 'deepseek' ? '🧠' : '🚀';
  var ggLabel = ggTier === 'premium' ? '💎' : ggTier === 'deepseek' ? '🧠' : '🚀';

  var text = '⚙️ <b>تنظیمات</b>\n\n' +
    '<b>🎯 حالت معاملاتی:</b> ' + userModeCfg.icon + ' ' + userModeCfg.label + '\n' +
    '• اطمینان: ≥' + userModeCfg.minConfidence + '% · R/R: ≥' + userModeCfg.minRR + ' · هم‌گرایی: ≥' + userModeCfg.minConfluence + '\n\n' +
    '<b>🎚️ نوع تحلیل:</b> ' + strictCfg.icon + ' ' + strictCfg.label + '\n' +
    '<i>' + strictCfg.desc + '</i>\n\n' +
    '<b>⚙️ KZ Mode:</b> ' + kzCfg.icon + ' ' + kzCfg.label + '\n' +
    '<i>' + kzCfg.desc + '</i>\n\n' +
    '<b>🧠 هم‌گرایی:</b> ' + confLabel + '\n\n' +
    '<b>💎 سطح مدل:</b> AIPrime ' + apLabel + ' · GapGPT ' + ggLabel + '\n';

  await sendOrEdit(token, chatId, mid, text, {
    inline_keyboard: [
      [{ text: '🎯 حالت معاملاتی', callback_data: 'settings_mode' }],
      [{ text: '🎚️ نوع تحلیل', callback_data: 'settings_strictness' }],
      [{ text: '⚙️ KZ Mode', callback_data: 'settings_kz' }],
      [{ text: '🧠 هم‌گرایی', callback_data: 'settings_confluence' }],
      [{ text: '💎 سطح مدل', callback_data: 'settings_tier' }],
      [{ text: '🏠 منو', callback_data: 'menu_main' }]
    ]
  });
}

async function showStatus(token, chatId, mid, env) {
  var all = ['gemini','aiprime','groq','github','together','gapgpt','openrouter','mistral','huggingface','cloudflare','nvidia','llm7','avalai','metis','onexai'];
  var text = '📈 <b>وضعیت سرویس‌ها</b>\n\n';
  var active = 0;
  for (var i = 0; i < all.length; i++) {
    var p = all[i]; var hasKey;
    if (p === 'gemini') hasKey = getGeminiKeys(env).length > 0;
    else if (p === 'llm7') hasKey = true;
    else hasKey = !!getKey(env, p);
    if (hasKey) active++;
    text += (hasKey ? '✅' : '❌') + ' ' + PROVIDER_NAMES[p] + '\n';
  }
  text += '\n🎯 فعال: <b>' + active + '/' + all.length + '</b>\n';
  text += '🔑 Gemini: <b>' + getGeminiKeys(env).length + '</b>\n';
  text += '📊 TwelveData: ' + (env.TWELVE_KEY ? '✅' : '❌') + '\n';
  text += '🪙 Binance: ✅ (رایگان)\n';
  text += '📸 Chart-Img: ' + (env.CHART_IMG_KEY ? '✅' : '❌') + '\n';
  text += '💾 KV: ' + (env.KV ? '✅' : '❌') + '\n';
  text += '🔒 قفل: ' + (env.ADMIN_CHAT_ID ? '✅' : '❌');
  await sendOrEdit(token, chatId, mid, text, { inline_keyboard: [[{ text: '🏠 منو', callback_data: 'menu_main' }]] });
}

async function showHelp(token, chatId, mid) {
  var t = '📖 <b>راهنما</b>\n\n' +
    '📊 تحلیل · 🎯 MTF · 📸 تصویر\n📓 ژورنال · 🔔 هشدار\n🤖 مانیتور خودکار\n\n' +
    '🎯 <b>حالت معاملاتی:</b>\n⚡ اسکلپی · ⚖️ متوسط · 🛡️ مطمئن\n\n' +
    '🎚️ <b>نوع تحلیل:</b>\n🔴 سختگیر · 🟢 آسان\n\n' +
    '⚙️ <b>KZ Mode:</b>\n🌐 ۲۴/۷ · ⭐ اولویت · 🔒 فقط KZ\n\n' +
    '🪙 <b>کریپتو:</b> BTC/USD، ETH/USD، ... خودکار شناسایی + Binance (رایگان)\n\n' +
    '🤖 <b>مانیتور خودکار:</b>\nاز منو → 🤖 مانیتور خودکار → شروع. ربات هر X دقیقه بازار را چک می‌کند.\n\n' +
    '<b>دستورات:</b>\n/menu /help /status /analyze /journal /watch /monitor /myid';
  await sendOrEdit(token, chatId, mid, t, { inline_keyboard: [[{ text: '🏠 منو', callback_data: 'menu_main' }]] });
}

async function showMonitorHelp(token, chatId, mid) {
  var t = '📖 <b>راهنمای مانیتور خودکار</b>\n\n' +
    '🤖 <b>چطور کار می‌کند؟</b>\n' +
    'ربات هر چند دقیقه (بر اساس تایم‌فریم) بازار را بررسی می‌کند، AI صدا می‌زند، سیگنال را اعتبارسنجی می‌کند و اگر معتبر بود به شما می‌فرستد.\n\n' +
    '⚙️ <b>پیشنهادها:</b>\n' +
    '• 🪙 کریپتو: Binance (رایگان)\n' +
    '• 💱 فارکس/طلا: Twelve key\n' +
    '• 🤖 AI: AIPrime یا GapGPT (خودکار)\n\n' +
    '⚙️ <b>KZ Mode:</b>\n' +
    '• 🌐 ۲۴/۷: همیشه فعال\n• ⭐ اولویت: همیشه + بج\n• 🔒 فقط: خارج KZ sleep\n\n' +
    '⚠️ <b>نکته:</b> ربات به Cron Trigger نیاز دارد (پیش‌فرض: هر ۱ دقیقه).';
  await sendOrEdit(token, chatId, mid, t, { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_monitor' }]] });
}

async function showImageGuide(token, chatId, mid) {
  var t = '📸 <b>تحلیل تصویر</b>\n\nعکس چارت بفرستید!';
  await sendOrEdit(token, chatId, mid, t, { inline_keyboard: [[{ text: '🏠 منو', callback_data: 'menu_main' }]] });
}

// ============================================
// JOURNAL / WATCH FUNCS (مثل قبل)
// ============================================

async function getJournal(env, chatId) { try { return await env.KV.get('journal:' + chatId, 'json') || []; } catch (e) { return []; } }
async function saveJournal(env, chatId, journal) { await env.KV.put('journal:' + chatId, JSON.stringify(journal)); }
async function getWatchlist(env, chatId) { try { return await env.KV.get('watch:' + chatId, 'json') || []; } catch (e) { return []; } }
async function saveWatchlist(env, chatId, list) { await env.KV.put('watch:' + chatId, JSON.stringify(list)); }

async function showJournalList(token, chatId, env) {
  var j = await getJournal(env, chatId);
  if (!j.length) { await sendMessage(token, chatId, '📓 خالی', { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_journal' }]] }); return; }
  var t = '<b>📓 لیست</b>\n\n';
  for (var i = 0; i < Math.min(j.length, 15); i++) {
    var x = j[i]; var s = x.result === 'win' ? '✅' : x.result === 'loss' ? '❌' : '⏳';
    t += s + ' #' + x.id + ' ' + esc(x.symbol) + ' ' + esc(x.direction) + '\n';
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
  var cl = w + l; var wr = cl > 0 ? (w / cl * 100).toFixed(1) : '0';
  var ar = cRR > 0 ? (tRR / cRR).toFixed(2) : '0';
  var t = '<b>📊 آمار</b>\n\n📈 کل: <b>' + j.length + '</b>\n✅ برد: <b>' + w + '</b>\n❌ باخت: <b>' + l + '</b>\n⏳ در انتظار: <b>' + p + '</b>\n\n🎯 نرخ برد: <b>' + wr + '%</b>\n⚖️ R/R: <b>1:' + ar + '</b>';
  await sendMessage(token, chatId, t, { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_journal' }]] });
}

async function showWatchList(token, chatId, env) {
  var l = await getWatchlist(env, chatId);
  if (!l.length) { await sendMessage(token, chatId, '🔔 خالی', { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_watch' }]] }); return; }
  var t = '<b>🔔 هشدارها</b>\n\n';
  for (var i = 0; i < l.length; i++) { t += '#' + l[i].id + ' ' + esc(l[i].symbol) + ' ' + (l[i].condition === 'above' ? '⬆️' : '⬇️') + ' ' + esc(l[i].price) + '\n'; }
  await sendMessage(token, chatId, t, { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_watch' }]] });
}

// ============================================
// WIZARDS
// ============================================

async function setUserState(env, chatId, state) { await env.KV.put('state:' + chatId, JSON.stringify(state), { expirationTtl: 600 }); }
async function getUserState(env, chatId) { try { return await env.KV.get('state:' + chatId, 'json'); } catch (e) { return null; } }
async function clearUserState(env, chatId) { await env.KV.delete('state:' + chatId); }

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
    await sendMessage(token, chatId, '✅ <b>ثبت شد</b>\n#' + j.length + ' ' + esc(d.symbol) + ' ' + esc(d.direction) + '\nR/R: 1:' + rr.toFixed(2), { inline_keyboard: [[{ text: '📓 ژورنال', callback_data: 'menu_journal' }]] });
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
    await sendMessage(token, chatId, '✅ <b>ثبت شد</b>\n#' + nid + ' ' + esc(d.symbol), { inline_keyboard: [[{ text: '🔔 هشدارها', callback_data: 'menu_watch' }]] });
    return;
  }
}

async function checkWatchlist(env) {
  try {
    var token = env.TG_TOKEN;
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
          var price = await withTimeout(getCurrentPrice(w.symbol, env.TWELVE_KEY), 10000, 'Price');
          var tg = (w.condition === 'above' && price >= w.price) || (w.condition === 'below' && price <= w.price);
          if (tg) {
            await sendMessage(token, cid, '🔔 <b>هشدار!</b>\n\n📌 ' + esc(w.symbol) + '\n💰 ' + esc(price), { inline_keyboard: [[{ text: '📊 تحلیل', callback_data: 'sym_' + w.symbol.replace('/', '') }]] });
          } else rem.push(w);
        } catch (e) { rem.push(w); }
      }
      await env.KV.put(k, JSON.stringify(rem));
    }
  } catch (e) { console.error('checkWatchlist: ' + e.message); }
}

// ============================================
// ANALYSIS RUNNERS
// ============================================

async function runAnalysis(token, chatId, symbol, env, timeframe, forcedProvider) {
  try {
    var providerLabel = forcedProvider ? (PROVIDER_NAMES[forcedProvider] || forcedProvider) : 'خودکار';
    var mode = await getConfluenceMode(env, chatId);
    var modeLabel = mode === 'force' ? '🔴 اجبار' : mode === 'auto' ? '🟢 خودکار' : '🔵 عادی';
    var userModeKey = await getUserMode(env, chatId);
    var userModeCfg = MODE_CONFIG[userModeKey];
    var strict = await getStrictness(env, chatId);
    var strictCfg = STRICTNESS_MODES[strict];
    var kzMode = await getKzMode(env, chatId);
    var kzCfg = KZ_MODES[kzMode];
    var isCrypto = isCryptoSymbol(symbol);

    if (userModeCfg.allowedTFs.indexOf(timeframe) === -1) {
      await sendMessage(token, chatId, '⚠️ تایم‌فریم مجاز نیست. مجاز: ' + userModeCfg.allowedTFs.map(timeframeLabel).join(', '), { inline_keyboard: [[{ text: '⚙️ تنظیمات', callback_data: 'menu_settings' }]] });
      return;
    }

    await sendMessage(token, chatId,
      '⏳ تحلیل ' + (isCrypto ? '🪙' : '💱') + ' <b>' + esc(symbol) + '</b>\n' +
      '🤖 <b>' + esc(providerLabel) + '</b>\n' +
      '🎯 ' + userModeCfg.icon + ' ' + userModeCfg.label + ' · 🎚️ ' + strictCfg.icon + ' ' + strictCfg.label + '\n' +
      '⚙️ KZ: ' + kzCfg.icon + ' ' + kzCfg.label + ' · 🧠 ' + modeLabel);

    var klines = await fetchMarketData(symbol, timeframe, env);
    var promptBody = 'نماد: ' + symbol + '\nتایم‌فریم: ' + timeframeLabel(timeframe) + '\n\n' + klinesToText(klines, symbol, timeframeLabel(timeframe));
    var fullPrompt = buildPromptForMode(SYSTEM_PROMPT, mode);
    if (isCrypto) fullPrompt += CRYPTO_NOTE;
    fullPrompt += '\n\n' + promptBody;

    var result;
    if (forcedProvider && PROVIDER_FUNCS[forcedProvider]) {
      try {
        var text = await withTimeout(PROVIDER_FUNCS[forcedProvider](env, fullPrompt, null, null, chatId), 30000, forcedProvider);
        if (text && text.length > 10) result = { text: text, provider: PROVIDER_NAMES[forcedProvider] };
        else throw new Error('پاسخ کوتاه');
      } catch (e) {
        await sendMessage(token, chatId, '❌ ' + esc(forcedProvider) + ' خطا: <code>' + esc(e.message) + '</code>');
        result = await callWithFallback(env, fullPrompt, null, null, chatId);
      }
    } else {
      result = await callWithFallback(env, fullPrompt, null, null, chatId);
    }

    var atr = calcATR(klines, 14);
    var currentPrice = klines[klines.length - 1].close;
    var levels = validateSignal(extractLevels(result.text), {
      strict: strict, minRR: userModeCfg.minRR, minConfidence: userModeCfg.minConfidence,
      atr: atr, price: currentPrice
    });
    var confluence = await resolveConfluence(env, chatId, levels, result.text);

    try { var buf = await buildChartImage(symbol, timeframe, levels, env); await sendPhotoBytes(token, chatId, buf, '📊 ' + symbol + ' - ' + timeframeLabel(timeframe)); } catch (ce) {}

    await sendMessage(token, chatId, buildCaption(levels, symbol, timeframe, result.provider, confluence, strict));
    var ft = tgFormat(result.text);
    if (ft.length > 0) { for (var i = 0; i < ft.length; i += 3800) await sendMessage(token, chatId, ft.slice(i, i + 3800)); }
    await sendMessage(token, chatId, '🏠 بازگشت:', { inline_keyboard: [[{ text: '🏠 منو', callback_data: 'menu_main' }]] });
  } catch (e) { await sendMessage(token, chatId, '❌ خطا: <code>' + esc(e.message) + '</code>'); }
}

async function runMultiTFAnalysis(token, chatId, symbol, env, forcedProvider) {
  try {
    var providerLabel = forcedProvider ? (PROVIDER_NAMES[forcedProvider] || forcedProvider) : 'خودکار';
    var mode = await getConfluenceMode(env, chatId);
    var userModeKey = await getUserMode(env, chatId);
    var userModeCfg = MODE_CONFIG[userModeKey];
    var strict = await getStrictness(env, chatId);
    var strictCfg = STRICTNESS_MODES[strict];
    var kzMode = await getKzMode(env, chatId);
    var kzCfg = KZ_MODES[kzMode];
    var isCrypto = isCryptoSymbol(symbol);
    var modeLabel = mode === 'force' ? '🔴' : mode === 'auto' ? '🟢' : '🔵';

    await sendMessage(token, chatId,
      '🎯 MTF ' + (isCrypto ? '🪙' : '💱') + ' <b>' + esc(symbol) + '</b>\n' +
      '🤖 <b>' + esc(providerLabel) + '</b>\n' +
      '🎯 ' + userModeCfg.icon + ' · 🎚️ ' + strictCfg.icon + ' · ⚙️ ' + kzCfg.icon + ' · 🧠 ' + modeLabel);

    var k4H = await fetchMarketData(symbol, '4h', env);
    var k1H = await fetchMarketData(symbol, '1h', env);
    var k15M = await fetchMarketData(symbol, '15min', env);
    var k1M = await fetchMarketData(symbol, '1min', env);

    var p = 'نماد: ' + symbol + '\n\n🔹 HTF (4H):\n' + klinesToText(k4H, symbol, '4H') + '\n\n🔹 MTF (1H):\n' + klinesToText(k1H, symbol, '1H') + '\n\n🔹 LTF (15M):\n' + klinesToText(k15M, symbol, '15M') + '\n\n🔹 EntryTF (1M):\n' + klinesToText(k1M, symbol, '1M');
    var fullPrompt = buildPromptForMode(MULTI_TF_PROMPT, mode);
    if (isCrypto) fullPrompt += CRYPTO_NOTE;
    fullPrompt += '\n\n' + p;

    var result;
    if (forcedProvider && PROVIDER_FUNCS[forcedProvider]) {
      try {
        var text = await withTimeout(PROVIDER_FUNCS[forcedProvider](env, fullPrompt, null, null, chatId), 30000, forcedProvider);
        if (text && text.length > 10) result = { text: text, provider: PROVIDER_NAMES[forcedProvider] };
        else throw new Error('کوتاه');
      } catch (e) { result = await callWithFallback(env, fullPrompt, null, null, chatId); }
    } else { result = await callWithFallback(env, fullPrompt, null, null, chatId); }

    var atr = calcATR(k15M, 14);
    var currentPrice = k15M[k15M.length - 1].close;
    var levels = validateSignal(extractLevels(result.text), {
      strict: strict, minRR: userModeCfg.minRR, minConfidence: userModeCfg.minConfidence,
      atr: atr, price: currentPrice
    });
    var confluence = await resolveConfluence(env, chatId, levels, result.text);

    try { var buf = await buildChartImage(symbol, '15min', levels, env); await sendPhotoBytes(token, chatId, buf, '📊 ' + symbol + ' - MTF'); } catch (ce) {}

    await sendMessage(token, chatId, buildMultiTFCaption(levels, symbol, result.provider, confluence, strict));
    var ft = tgFormat(result.text);
    if (ft.length > 0) { for (var i = 0; i < ft.length; i += 3800) await sendMessage(token, chatId, ft.slice(i, i + 3800)); }
    await sendMessage(token, chatId, '🏠 بازگشت:', { inline_keyboard: [[{ text: '🏠 منو', callback_data: 'menu_main' }]] });
  } catch (e) { await sendMessage(token, chatId, '❌ MTF: <code>' + esc(e.message) + '</code>'); }
}

async function runImageAnalysis(token, chatId, photoFileId, env) {
  try {
    var mode = await getConfluenceMode(env, chatId);
    var userModeKey = await getUserMode(env, chatId);
    var cfg = MODE_CONFIG[userModeKey];
    var strict = await getStrictness(env, chatId);
    var strictCfg = STRICTNESS_MODES[strict];

    await sendMessage(token, chatId, '📸 دریافت تصویر...\n🎚️ ' + strictCfg.icon);
    var pd = await downloadTelegramPhoto(token, photoFileId);
    if (pd.size > 5 * 1024 * 1024) { await sendMessage(token, chatId, '❌ حجم > ۵ مگابایت'); return; }
    await sendMessage(token, chatId, '🧠 در حال تحلیل...');

    var fullPrompt = buildPromptForMode(IMAGE_PROMPT, mode);
    var result = await callWithFallback(env, fullPrompt, pd.base64, 'image/jpeg', chatId);
    var levels = validateSignal(extractLevels(result.text), {
      strict: strict, minRR: cfg.minRR, minConfidence: cfg.minConfidence
    });
    var confluence = await resolveConfluence(env, chatId, levels, result.text);
    await sendMessage(token, chatId, buildImageCaption(levels, result.provider, confluence, strict));

    var fullText = result.text.replace(/```json[\s\S]*?```/gi, '').replace(/```[\s\S]*?```/g, '');
    var ft = tgFormat(fullText);
    if (ft.length > 20) {
      for (var i = 0; i < ft.length; i += 3800) { await sendMessage(token, chatId, ft.slice(i, i + 3800)); await sleep(400); }
    } else {
      var raw = fullText.trim();
      if (raw.length > 20) { for (var j = 0; j < raw.length; j += 3800) { await sendMessage(token, chatId, raw.slice(j, j + 3800)); await sleep(400); } }
      else await sendMessage(token, chatId, '⚠️ پاسخ فقط JSON بود.');
    }
    await sendMessage(token, chatId, '🏠 بازگشت:', { inline_keyboard: [[{ text: '🏠 منو', callback_data: 'menu_main' }]] });
  } catch (e) { await sendMessage(token, chatId, '❌ تصویر: <code>' + esc(e.message) + '</code>'); }
}

// ============================================
// MONITOR WIZARD
// ============================================

async function startMonitorWizard(token, chatId, env) {
  await sendOrEdit(token, chatId, null, '🤖 <b>راه‌اندازی مانیتور</b>\n\nمرحله ۱/۴\n\n<b>نماد:</b>', monitorSymbolMenu(false));
}

async function finishMonitorSetup(token, chatId, mid, symbol, tf, ai, dp, env) {
  var currentMode = await getUserMode(env, chatId);
  var strict = await getStrictness(env, chatId);
  var kzMode = await getKzMode(env, chatId);
  var cfg = {
    active: true,
    symbol: symbol,
    timeframe: tf,
    aiProvider: ai,
    dataProvider: dp,
    mode: currentMode,
    strictness: strict,
    kzMode: kzMode,
    startAt: Date.now(),
    lastCheckAt: 0,
    signalCount: 0,
    kzSignalCount: 0,
    lastSignal: null,
    lastError: null,
    skippedCount: 0
  };
  await setMonitor(env, chatId, cfg);

  var isCrypto = isCryptoSymbol(symbol);
  var symIcon = isCrypto ? '🪙' : '💱';
  var aiLabel = ai === 'auto' ? '🤖 خودکار' : (PROVIDER_NAMES[ai] || ai);
  var dpLabel = { auto: '🔄 خودکار', binance: '🟡 Binance', twelve: '📊 Twelve' }[dp] || 'خودکار';
  var kzCfg = KZ_MODES[kzMode];

  var msg = '✅ <b>مانیتور فعال شد</b>\n\n' +
    '<b>نماد:</b> ' + symIcon + ' ' + esc(symbol) + '\n' +
    '<b>تایم‌فریم:</b> ' + timeframeLabel(tf) + '\n' +
    '<b>سرویس AI:</b> ' + aiLabel + '\n' +
    '<b>منبع داده:</b> ' + dpLabel + '\n' +
    '<b>حالت:</b> ' + MODE_CONFIG[currentMode].icon + ' ' + MODE_CONFIG[currentMode].label + '\n' +
    '<b>نوع:</b> ' + STRICTNESS_MODES[strict].icon + ' ' + STRICTNESS_MODES[strict].label + '\n' +
    '<b>KZ Mode:</b> ' + kzCfg.icon + ' ' + kzCfg.label + '\n\n' +
    '⏱️ هر ~' + TF_MINUTES[tf] + ' دقیقه بررسی می‌شود.\n' +
    '📩 سیگنال‌های معتبر خودکار ارسال می‌شوند.';

  await sendOrEdit(token, chatId, mid, msg, { inline_keyboard: [
    [{ text: '◀️ مانیتور', callback_data: 'menu_monitor' }],
    [{ text: '⏹️ توقف', callback_data: 'mon_stop' }]
  ]});
}

// ============================================
// CALLBACK HANDLER
// ============================================

async function handleCallback(token, chatId, mid, data, env) {
  // Menus
  if (data === 'menu_main') { await showMainMenu(token, chatId, mid); return; }
  if (data === 'menu_analyze') { await showSymbolMenu(token, chatId, mid); return; }
  if (data === 'menu_mtf') { await showSymbolMenu(token, chatId, mid); return; }
  if (data === 'menu_image') { await showImageGuide(token, chatId, mid); return; }
  if (data === 'menu_journal') { await showJournalMenu(token, chatId, mid, env); return; }
  if (data === 'menu_watch') { await showWatchMenu(token, chatId, mid, env); return; }
  if (data === 'menu_settings') { await showSettingsMenu(token, chatId, mid, env); return; }
  if (data === 'menu_status') { await showStatus(token, chatId, mid, env); return; }
  if (data === 'menu_help') { await showHelp(token, chatId, mid); return; }
  if (data === 'menu_monitor') { await showMonitorMenu(token, chatId, mid, env); return; }
  if (data === 'mon_help') { await showMonitorHelp(token, chatId, mid); return; }
  if (data === 'mon_details') { await showMonitorMenu(token, chatId, mid, env); return; }

  // ⭐ MONITOR WIZARD
  if (data === 'mon_start_wizard') { await startMonitorWizard(token, chatId, env); return; }
  if (data === 'mon_crypto_list') { await sendOrEdit(token, chatId, mid, '🪙 <b>کریپتو:</b>', monitorSymbolMenu(true)); return; }
  if (data === 'mon_stop') {
    await clearMonitor(env, chatId);
    await sendOrEdit(token, chatId, mid, '⏹️ <b>مانیتور متوقف شد</b>', { inline_keyboard: [[{ text: '◀️ مانیتور', callback_data: 'menu_monitor' }], [{ text: '🏠 منو', callback_data: 'menu_main' }]] });
    return;
  }
  if (data.indexOf('msym_') === 0) {
    var symRaw = data.replace('msym_', '');
    if (symRaw === 'custom') {
      await setUserState(env, chatId, { action: 'monitor_custom', step: 'symbol', data: {} });
      await sendOrEdit(token, chatId, mid, '✏️ نماد مانیتور:\n\nمثال: XAU/USD · BTC/USD', { inline_keyboard: [[{ text: '❌ لغو', callback_data: 'wizard_cancel' }]] });
      return;
    }
    await sendOrEdit(token, chatId, mid, '🤖 <b>مرحله ۲/۴ — تایم‌فریم:</b>', monitorTfMenu(symRaw));
    return;
  }
  if (data.indexOf('mtf2_') === 0) {
    var rest = data.replace('mtf2_', '');
    var tfm = rest.match(/_([^_]+)$/);
    if (!tfm) return;
    var symM = rest.slice(0, -tfm[0].length);
    var tfM = tfm[1];
    await sendOrEdit(token, chatId, mid, '🤖 <b>مرحله ۳/۴ — سرویس AI:</b>', monitorAiMenu(symM, tfM));
    return;
  }
  if (data.indexOf('mai_') === 0) {
    var rest2 = data.replace('mai_', '');
    var parts2 = rest2.split('_');
    if (parts2.length < 3) return;
    var ai2 = parts2[0];
    var tf2 = parts2[parts2.length - 1];
    var sym2 = parts2.slice(1, -1).join('_');
    await sendOrEdit(token, chatId, mid, '🤖 <b>مرحله ۴/۴ — منبع داده:</b>', monitorDataProviderMenu(sym2, tf2, ai2));
    return;
  }
  if (data.indexOf('mdp_') === 0) {
    var rest3 = data.replace('mdp_', '');
    var parts3 = rest3.split('_');
    if (parts3.length < 4) return;
    var dp3 = parts3[0];
    var ai3 = parts3[parts3.length - 1];
    var tf3 = parts3[parts3.length - 2];
    var sym3 = parts3.slice(1, -2).join('_');
    var symbol3 = normalizeSymbol(sym3);
    await finishMonitorSetup(token, chatId, mid, symbol3, tf3, ai3, dp3, env);
    return;
  }

  // Symbols / TF
  if (data === 'wizard_cancel') { await clearUserState(env, chatId); await sendOrEdit(token, chatId, mid, '❌ لغو', { inline_keyboard: [[{ text: '🏠 منو', callback_data: 'menu_main' }]] }); return; }
  if (data === 'sym_custom') { await setUserState(env, chatId, { action: 'custom_symbol', step: 'input', data: {} }); await sendOrEdit(token, chatId, mid, '✏️ نماد:\n\nمثال: XAU/USD · BTC/USD', { inline_keyboard: [[{ text: '❌ لغو', callback_data: 'wizard_cancel' }]] }); return; }
  if (data.indexOf('sym_') === 0) { await showTimeframeMenu(token, chatId, mid, data.replace('sym_', '')); return; }
  if (data.indexOf('mtf_') === 0) { await showProviderMenu(token, chatId, mid, data.replace('mtf_', ''), 'MTF', true, env); return; }
  if (data.indexOf('tf_') === 0) {
    var restT = data.replace('tf_', '');
    var tfmT = restT.match(/_([^_]+)$/);
    if (!tfmT) return;
    var symRawT = restT.slice(0, -tfmT[0].length);
    var tfT = tfmT[1];
    await showProviderMenu(token, chatId, mid, symRawT, tfT, false, env);
    return;
  }
  if (data.indexOf('pvd_') === 0) {
    var restP = data.replace('pvd_', '');
    var partsP = restP.split('_');
    if (partsP.length < 3) return;
    var providerP = partsP[0];
    var timeframeP = partsP[partsP.length - 1];
    var symbolRawP = partsP.slice(1, -1).join('_');
    var symbolP = normalizeSymbol(symbolRawP);
    try { await fetch('https://api.telegram.org/bot' + token + '/deleteMessage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, message_id: mid }) }); } catch (e) {}
    if (timeframeP === 'MTF') await runMultiTFAnalysis(token, chatId, symbolP, env, providerP);
    else await runAnalysis(token, chatId, symbolP, env, timeframeP, providerP);
    return;
  }

  // Journal / Watch
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

  // Settings
  if (data === 'settings_mode') { var curMode = await getUserMode(env, chatId); await sendOrEdit(token, chatId, mid, '🎯 <b>حالت معاملاتی</b>', modeMenu(curMode)); return; }
  if (data === 'mode_scalping' || data === 'mode_medium' || data === 'mode_confident') {
    var newMode = data.replace('mode_', '');
    await setUserMode(env, chatId, newMode);
    var cf = MODE_CONFIG[newMode];
    await sendOrEdit(token, chatId, mid, '✅ <b>' + cf.icon + ' ' + cf.label + '</b>\n\n• اطمینان: ' + cf.minConfidence + '%\n• R/R: ' + cf.minRR + '\n• هم‌گرایی: ' + cf.minConfluence + '/10\n• TF: ' + cf.allowedTFs.map(timeframeLabel).join(', '), modeMenu(newMode));
    return;
  }
  if (data === 'settings_strictness') { var curS = await getStrictness(env, chatId); await sendOrEdit(token, chatId, mid, '🎚️ <b>نوع تحلیل</b>', strictnessMenu(curS)); return; }
  if (data === 'strict_hard' || data === 'strict_easy') {
    var newS = data.replace('strict_', '');
    await setStrictness(env, chatId, newS);
    var sc = STRICTNESS_MODES[newS];
    await sendOrEdit(token, chatId, mid, '✅ <b>' + sc.icon + ' ' + sc.label + '</b>\n\n' + sc.desc, strictnessMenu(newS));
    return;
  }
  if (data === 'settings_kz') { var curK = await getKzMode(env, chatId); await sendOrEdit(token, chatId, mid, '⚙️ <b>KZ Mode</b>\n\n🌐 ۲۴/۷ · ⭐ اولویت · 🔒 فقط KZ', kzModeMenu(curK)); return; }
  if (data === 'kz_off' || data === 'kz_priority' || data === 'kz_only') {
    var newK = data.replace('kz_', '');
    await setKzMode(env, chatId, newK);
    var kc = KZ_MODES[newK];
    await sendOrEdit(token, chatId, mid, '✅ KZ Mode: <b>' + kc.icon + ' ' + kc.label + '</b>\n\n' + kc.desc, kzModeMenu(newK));
    return;
  }
  if (data === 'settings_confluence') { var cur = await getConfluenceMode(env, chatId); await sendOrEdit(token, chatId, mid, '🧠 <b>هم‌گرایی</b>', confluenceModeMenu(cur)); return; }
  if (data === 'conf_normal' || data === 'conf_auto' || data === 'conf_force') {
    var nc = data.replace('conf_', '');
    await setConfluenceMode(env, chatId, nc);
    var lbl = nc === 'force' ? '🔴 اجبار' : nc === 'auto' ? '🟢 خودکار' : '🔵 عادی';
    await sendOrEdit(token, chatId, mid, '✅ <b>' + lbl + '</b>', confluenceModeMenu(nc));
    return;
  }
  if (data === 'settings_tier') { await sendOrEdit(token, chatId, mid, '💎 <b>سطح مدل</b>', modelTierProviderMenu()); return; }
  if (data === 'tier_prov_aiprime') { await env.KV.put('last_tier_prov:' + chatId, 'aiprime'); var ap = await getUserModelTier(env, chatId, 'aiprime'); await sendOrEdit(token, chatId, mid, '🅰️ <b>AIPrime</b>', modelTierMenu(ap)); return; }
  if (data === 'tier_prov_gapgpt') { await env.KV.put('last_tier_prov:' + chatId, 'gapgpt'); var gg = await getUserModelTier(env, chatId, 'gapgpt'); await sendOrEdit(token, chatId, mid, '💎 <b>GapGPT</b>', modelTierMenu(gg)); return; }
  if (data === 'tier_fast' || data === 'tier_premium' || data === 'tier_deepseek') {
    var nt = data.replace('tier_', '');
    var ltp = await env.KV.get('last_tier_prov:' + chatId) || 'aiprime';
    await setUserModelTier(env, chatId, ltp, nt);
    var tl = nt === 'premium' ? '💎 قوی' : nt === 'deepseek' ? '🧠 DeepSeek' : '🚀 سریع';
    await sendOrEdit(token, chatId, mid, '✅ <b>' + tl + '</b>', modelTierMenu(nt));
    return;
  }
}

// ============================================
// ACCESS DENIED
// ============================================

async function sendAccessDenied(token, chatId) {
  await sendMessage(token, chatId, '🔒 <b>دسترسی محدود</b>\n\n<b>Chat ID:</b>\n<code>' + chatId + '</code>');
}

// ============================================
// MESSAGE HANDLER
// ============================================

async function handleUpdate(update, env) {
  var token = env.TG_TOKEN;

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
      if (st.action === 'monitor_custom') {
        var ms = normalizeSymbol(text);
        await clearUserState(env, chatId);
        await sendMessage(token, chatId, '🤖 <b>مرحله ۲/۴ — تایم‌فریم:</b>\n\nنماد: ' + esc(ms), monitorTfMenu(ms.replace('/', '')));
        return;
      }
    }

    if (text === '/start' || text === '/menu') { await showMainMenu(token, chatId, null); return; }
    if (text === '/help') { await showHelp(token, chatId, null); return; }
    if (text === '/status') { await showStatus(token, chatId, null, env); return; }
    if (text === '/analyze') { await showSymbolMenu(token, chatId, null); return; }
    if (text === '/journal') { await showJournalMenu(token, chatId, null, env); return; }
    if (text === '/watch') { await showWatchMenu(token, chatId, null, env); return; }
    if (text === '/monitor') { await showMonitorMenu(token, chatId, null, env); return; }

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

// ============================================
// EXPORT
// ============================================

export default {
  async fetch(request, env, ctx) {
    var url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '') return new Response('Everest Bot v3.8 — Auto Monitor', { status: 200 });
    if (request.method === 'POST' && url.pathname === '/webhook') {
      try {
        var update = await request.json();
        ctx.waitUntil(handleUpdate(update, env));
      } catch (e) { console.error('Webhook: ' + e.message); }
      return new Response('OK', { status: 200 });
    }
    return new Response('Not found', { status: 404 });
  },
  async scheduled(event, env, ctx) {
    // ⭐ هر دقیقه اجرا می‌شود
    ctx.waitUntil(Promise.all([checkWatchlist(env), checkAllMonitors(env)]));
  }
};
