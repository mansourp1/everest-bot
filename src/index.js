// ============================================
// EVEREST BOT v8.0
// + Expiry Watchdog (UNFILLED vs EXPIRED)
// + Text: AIPrime | Image: Gemini → GapGPT → AIPrime
// + Custom Vision API + Local Filter MSS/BOS
// + TP1 Final (never reverses to LOSS)
// ============================================

const CONF_KEYS = ['structure', 'smc', 'ict', 'candle', 'liquidity', 'riskReward'];
const CONF_LABELS = {
  structure: 'Market Structure', smc: 'SMC / Order Blocks', ict: 'ICT / FVG',
  candle: 'Candlestick', liquidity: 'Liquidity Sweep', riskReward: 'R/R'
};

const VISION_STRICT = false;

const MODEL_TIERS = {
  aiprime: {
    fast: { label: '🚀 سریع', text: 'gpt-4o-mini', vision: 'gpt-4o' },
    premium: { label: '💎 قوی', text: 'claude-sonnet-5', vision: 'claude-sonnet-5' },
    deepseek: { label: '🧠 DeepSeek', text: 'deepseek-v4.1-flash', vision: 'deepseek-v4.1-flash' }
  },
  gapgpt: {
    fast: { label: '🚀 سریع', text: 'gpt-4o-mini', vision: 'gpt-4o' },
    premium: { label: '💎 قوی', text: 'claude-sonnet-5', vision: 'claude-sonnet-5' },
    deepseek: { label: '🧠 DeepSeek', text: 'deepseek-v4.1-flash', vision: 'deepseek-v4.1-flash' }
  }
};

const VISION_MODELS_BY_PROVIDER = {
  gemini: ['gemini-2.5-flash', 'gemini-2.0-flash'],
  aiprime: ['gpt-4o', 'gpt-4o-mini'],
  gapgpt: ['gpt-4o', 'gpt-4o-mini']
};

// TTL انقضا بر اساس TF
const EXPIRY_TTL_BY_TF = {
  '1min': 20, '3min': 15, '5min': 12, '15min': 10, '1h': 8, '4h': 6
};
const EXPIRY_TTL_DEFAULT = 12;
const EXPIRY_WARN_PCT = 0.75;

// Filled timeout (سفارش پر شده که به TP/SL نرسید)
const FILLED_TIMEOUT_BY_TF = {
  '1min': 40, '3min': 30, '5min': 24, '15min': 20, '1h': 16, '4h': 12
};

const STRICTNESS_MODES = {
  hard: { label: '🔴 سختگیر', icon: '🔴', desc: 'همه فیلترها + TP1 الزامی + R/R سخت' },
  easy: { label: '🟢 آسان', icon: '🟢', desc: 'آستانه نرم‌تر + TP1 اختیاری + سیگنال بیشتر' },
  both: { label: '⚖️ هر دو', icon: '⚖️', desc: 'ارزیابی دوگانه: سخت + آسان' }
};

const KZ_MODES = {
  off: { label: '۲۴/۷', icon: '🌐', desc: 'بی‌توجه به KZ' },
  priority: { label: 'اولویت KZ', icon: '⭐', desc: 'همیشه + بج اولویت' },
  only: { label: 'فقط KZ', icon: '🔒', desc: 'skip خارج از KZ' }
};

const CRYPTO_BASES = ['BTC','ETH','SOL','BNB','XRP','ADA','DOGE','DOT','AVAX','MATIC','LINK','LTC','ATOM','UNI','NEAR','APT','ARB','OP','TRX','SHIB','PEPE','TON','SUI','INJ','SEI','FIL','ETC','BCH','XLM','HBAR','VET','ALGO','FTM','SAND','MANA','AXS','GALA'];
const BINANCE_INTERVALS = { '1min':'1m','3min':'3m','5min':'5m','15min':'15m','1h':'1h','4h':'4h' };
const TF_MINUTES = { '1min':1,'3min':3,'5min':5,'15min':15,'1h':60,'4h':240 };
const TF_LABELS = { '1min':'1 دقیقه','3min':'3 دقیقه','5min':'5 دقیقه','15min':'15 دقیقه','1h':'1 ساعت','4h':'4 ساعت' };
const TD_INTERVALS = { '1min':'1min','3min':'5min','5min':'5min','15min':'15min','1h':'1h','4h':'4h' };

const MODE_CONFIG = {
  scalping:  { label: 'اسکلپی', icon: '⚡', color: '#fbbf24', minConfidence: 70, minRR: 2.0, minConfluence: 5.0, allowedTFs: ['1min','3min','5min','15min'] },
  medium:    { label: 'متوسط',  icon: '⚖️', color: '#6ea8fe', minConfidence: 65, minRR: 1.5, minConfluence: 4.5, allowedTFs: ['5min','15min','1h','4h'] },
  confident: { label: 'مطمئن',  icon: '🛡️', color: '#4ade80', minConfidence: 75, minRR: 2.5, minConfluence: 6.0, allowedTFs: ['15min','1h','4h'] }
};

function getModelTierConfig(provider, tier, hasImage) {
  var cfg = MODEL_TIERS[provider] && MODEL_TIERS[provider][tier];
  if (!cfg) return { model: hasImage ? 'gpt-4o' : 'gpt-4o-mini', label: '' };
  return { model: hasImage ? cfg.vision : cfg.text, label: cfg.label };
}

const FORCE_DIRECTIVE = "\n\n⚠️ **اجباری**: JSON انتهای پاسخ:\n```json\n" +
"{\"direction\":\"BUY|SELL|WAIT\",\"confluenceScore\":0.0,\"scores\":{\"structure\":0,\"smc\":0,\"ict\":0,\"candle\":0,\"liquidity\":0,\"riskReward\":0},\"confidence\":0,\"entry\":0,\"stopLoss\":0,\"tp1\":0,\"tp2\":0,\"tp3\":0,\"rr\":\"1:0\"}\n```";

function buildPromptForMode(basePrompt, mode) {
  if (mode === 'force') return basePrompt + FORCE_DIRECTIVE;
  return basePrompt;
}

const SYSTEM_PROMPT = "شما یک تحلیل‌گر ارشد بازارهای مالی با ۱۵ سال تجربه در SMC، ICT و پرایس اکشن هستید.\n\n" +
"**روش کار**\n۱. استخراج داده خام\n۲. تشخیص رژیم بازار\n۳. شناسایی BOS، CHoCH\n۴. کشف Order Blocks و FVG\n۵. الگوهای کندلی\n۶. امتیازدهی ۶ لایه\n۷. تصمیم نهایی\n\n" +
"**در انتهای پاسخ دقیقاً این فرمت:**\n---\nDirection: [BUY/SELL/WAIT]\nRegime: [TRENDING_UP/TRENDING_DOWN/RANGING/TRANSITIONAL]\nConfidenceScore: [0-100]\nEntry: [عدد یا N/A]\nStop Loss: [عدد یا N/A]\nTP1: [عدد یا N/A]\nTP2: [عدد یا N/A]\nTP3: [عدد یا N/A]\nR/R: [نسبت یا N/A]\n---\n\n" +
"**قوانین:**\n1. اگر Confidence < 65 → WAIT\n2. حد ضرر ساختاری\n3. در BUY، SL زیر Entry · در SELL، SL بالای Entry\n4. R/R با محاسبه واقعی\n5. تحلیل ۵۰۰ کلمه بنویس";

const MULTI_TF_PROMPT = "شما یک تحلیل‌گر ارشد هستید.\n\n" +
"**MTF:**\n🎯 HTF (4H): روند اصلی\n🔍 MTF (1H): تأیید\n📊 LTF (15M): ستاپ\n⏱️ EntryTF (1M): تایمینگ\n\n" +
"**فرمت:**\n---\nDirection: [BUY/SELL/WAIT]\nConfluenceScore: [0-10]\nHTF4H: [BULLISH/BEARISH/RANGING]\nMTF1H: [BULLISH/BEARISH/RANGING]\nLTF15M: [BULLISH/BEARISH/RANGING]\nEntryTF1M: [BULLISH/BEARISH/RANGING]\nConfidenceScore: [0-100]\nEntry: [عدد یا N/A]\nStop Loss: [عدد یا N/A]\nTP1: [عدد یا N/A]\nTP2: [عدد یا N/A]\nTP3: [عدد یا N/A]\nR/R: [نسبت یا N/A]\n---";

const IMAGE_PROMPT = "شما یک تحلیل‌گر ارشد هستید.\n\n**تحلیل چارت ۵۰۰ کلمه**\n\n" +
"**فرمت:**\n---\nDirection: [BUY/SELL/WAIT]\nSymbol: [نماد یا UNKNOWN]\nTimeframe: [TF یا UNKNOWN]\nRegime: [...]\nConfidenceScore: [0-100]\nEntry: [عدد یا N/A]\nStop Loss: [عدد یا N/A]\nTP1: [عدد یا N/A]\nTP2: [عدد یا N/A]\nTP3: [عدد یا N/A]\nR/R: [نسبت یا N/A]\n---";

const CRYPTO_NOTE = "\n\n**🪙 کریپتو:** بازار ۲۴/۷. ساعات لیکویید بالا (US/EU) بهترین فرصت";

// ============================================
// UTILS
// ============================================

function isAdmin(env, c) { if (!env.ADMIN_CHAT_ID) return true; return String(c) === String(env.ADMIN_CHAT_ID); }
function isSecurityEnabled(env) { return !!env.ADMIN_CHAT_ID; }

function withTimeout(p, ms, l) {
  return Promise.race([p, new Promise(function(_, r) { setTimeout(function() { r(new Error(l + ' timeout (' + ms + 'ms)')); }, ms); })]);
}
function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

async function fetchWithTimeout(url, opts, timeoutMs, label) {
  var ctrl = new AbortController();
  var t = setTimeout(function() { ctrl.abort(); }, timeoutMs || 12000);
  try {
    var r = await fetch(url, Object.assign({}, opts || {}, { signal: ctrl.signal }));
    clearTimeout(t);
    return r;
  } catch (e) {
    clearTimeout(t);
    throw new Error((label || 'fetch') + ': ' + (e.message || 'timeout'));
  }
}

function formatTime(dt) {
  if (!dt) return '';
  var s = String(dt);
  var m = s.match(/T(\d{2}):(\d{2})/); if (m) return m[1] + ':' + m[2];
  var m2 = s.match(/(\d{2}):(\d{2})/); if (m2) return m2[1] + ':' + m2[2];
  return s.slice(-8, -3);
}
function num(v) {
  if (v === null || v === undefined || v === '' || v === 'N/A' || v === 'n/a') return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  var clean = String(v).replace(/[,،\s_]/g, '').replace(/^[^\-\d.]*|[^\-\d.]*$/g, '');
  var n = parseFloat(clean); return isNaN(n) ? null : n;
}
function normDir(d) { if (!d) return 'WAIT'; var v = String(d).trim().toUpperCase(); if (v === 'BUY' || v === 'LONG') return 'BUY'; if (v === 'SELL' || v === 'SHORT') return 'SELL'; return 'WAIT'; }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function calcATR(klines, period) {
  period = period || 14;
  if (!klines || klines.length < period + 1) return null;
  var trs = [];
  for (var i = 0; i < period; i++) {
    var k = klines[klines.length - 1 - i]; var prev = klines[klines.length - 2 - i];
    if (!k || !prev) continue;
    trs.push(Math.max(k.high - k.low, Math.abs(k.high - prev.close), Math.abs(k.low - prev.close)));
  }
  if (!trs.length) return null;
  return trs.reduce(function(a, b) { return a + b; }, 0) / trs.length;
}
function dropForming(klines, tf) {
  var a = klines.slice();
  var last = a[a.length - 1];
  if (!last || !last.datetime) return a;
  var t = Date.parse(String(last.datetime).includes('T') ? last.datetime : String(last.datetime).replace(' ', 'T') + 'Z');
  if (Number.isFinite(t) && t + (TF_MINUTES[tf] || 5) * 60000 > Date.now()) a.pop();
  return a;
}

// ✅ v8: TTL و expiry info
function getExpiryTTL(tf) { return EXPIRY_TTL_BY_TF[tf] || EXPIRY_TTL_DEFAULT; }
function getFilledTimeoutTTL(tf) { return FILLED_TIMEOUT_BY_TF[tf] || 24; }

function getExpiryInfo(signal) {
  var ttl = getExpiryTTL(signal.tf);
  var tfm = (TF_MINUTES[signal.tf] || 5) * 60000;
  var elapsed = Date.now() - signal.t;
  var elapsedCandles = elapsed / tfm;
  var remainingCandles = Math.max(0, ttl - elapsedCandles);
  var remainingMs = Math.max(0, ttl * tfm - elapsed);
  return {
    ttl: ttl,
    elapsedCandles: Math.round(elapsedCandles * 10) / 10,
    remainingCandles: Math.round(remainingCandles * 10) / 10,
    remainingMs: remainingMs,
    expired: elapsedCandles >= ttl,
    warning: elapsedCandles >= ttl * EXPIRY_WARN_PCT
  };
}

function getFilledExpiryInfo(signal) {
  var ttl = getFilledTimeoutTTL(signal.tf);
  var tfm = (TF_MINUTES[signal.tf] || 5) * 60000;
  var startT = signal.fillT || signal.t;
  var elapsed = Date.now() - startT;
  var elapsedCandles = elapsed / tfm;
  var remainingCandles = Math.max(0, ttl - elapsedCandles);
  var remainingMs = Math.max(0, ttl * tfm - elapsed);
  return {
    ttl: ttl,
    elapsedCandles: Math.round(elapsedCandles * 10) / 10,
    remainingCandles: Math.round(remainingCandles * 10) / 10,
    remainingMs: remainingMs,
    expired: elapsedCandles >= ttl
  };
}

function formatRemainingTime(ms) {
  if (ms <= 0) return '0';
  var sec = Math.floor(ms / 1000);
  var min = Math.floor(sec / 60);
  var hour = Math.floor(min / 60);
  if (hour > 0) return hour + 'ساعت ' + (min % 60) + 'دقیقه';
  if (min > 0) return min + 'دقیقه';
  return sec + 'ثانیه';
}

function localStructure(kl, L) {
  L = L || 5;
  var ph = null, pl = null, state = 0, events = [];
  for (var i = 0; i < kl.length; i++) {
    var c = i - L;
    if (c >= L) {
      var H = true, Lw = true;
      for (var j = 1; j <= L; j++) {
        if (kl[c - j].high > kl[c].high || kl[c + j].high > kl[c].high) H = false;
        if (kl[c - j].low < kl[c].low || kl[c + j].low < kl[c].low) Lw = false;
      }
      if (H) ph = kl[c].high;
      if (Lw) pl = kl[c].low;
    }
    if (i > 0) {
      var cl = kl[i].close, pc = kl[i - 1].close;
      if (ph != null && cl > ph && pc <= ph) { events.push({ idx: i, type: state === 1 ? 'BOS' : 'MSS', dir: 'BUY', level: ph }); state = 1; }
      else if (pl != null && cl < pl && pc >= pl) { events.push({ idx: i, type: state === -1 ? 'BOS' : 'MSS', dir: 'SELL', level: pl }); state = -1; }
    }
  }
  var recent = null;
  var lastIdx = kl.length - 1;
  for (var k = events.length - 1; k >= 0; k--) {
    if (lastIdx - events[k].idx <= 6) { recent = events[k]; break; }
  }
  return { state: state, ph: ph, pl: pl, fresh: recent };
}

function detectEntryType(levels, currentPrice) {
  if (!levels.entry || !currentPrice || levels.direction === 'WAIT') {
    return { type: 'N/A', action: '—', icon: '⚪️', cls: '', desc: '', pct: 0, currentPrice: currentPrice || 0 };
  }
  var diff = levels.entry - currentPrice;
  var pct = Math.abs(diff) / currentPrice * 100;
  var thresholdPct = 0.1;
  var atr = levels._atr;
  if (atr && atr > 0 && currentPrice > 0) {
    thresholdPct = Math.max(0.05, (atr / currentPrice * 100) * 0.15);
  }
  if (pct < thresholdPct) {
    return { type: 'MARKET', action: levels.direction + ' MARKET', icon: '⚡', cls: 'market', desc: 'قیمت فعلی ≈ Entry — با Market وارد شو', pct: pct, currentPrice: currentPrice };
  }
  if (levels.direction === 'BUY') {
    if (diff < 0) return { type: 'BUY LIMIT', action: 'BUY LIMIT', icon: '🔵', cls: 'limit', desc: 'منتظر ریزش ' + pct.toFixed(2) + '٪ به ' + levels.entry + ' — سفارش Limit بذار', pct: pct, currentPrice: currentPrice };
    return { type: 'BUY STOP', action: 'BUY STOP', icon: '🟡', cls: 'stop', desc: 'منتظر شکست ' + pct.toFixed(2) + '٪ بالای ' + levels.entry + ' — سفارش Stop بذار', pct: pct, currentPrice: currentPrice };
  }
  if (levels.direction === 'SELL') {
    if (diff > 0) return { type: 'SELL LIMIT', action: 'SELL LIMIT', icon: '🔵', cls: 'limit', desc: 'منتظر رشد ' + pct.toFixed(2) + '٪ به ' + levels.entry + ' — سفارش Limit بذار', pct: pct, currentPrice: currentPrice };
    return { type: 'SELL STOP', action: 'SELL STOP', icon: '🟡', cls: 'stop', desc: 'منتظر شکست ' + pct.toFixed(2) + '٪ زیر ' + levels.entry + ' — سفارش Stop بذار', pct: pct, currentPrice: currentPrice };
  }
  return { type: 'LIMIT', action: levels.direction + ' LIMIT', icon: '🔵', cls: 'limit', desc: '', pct: pct, currentPrice: currentPrice };
}

function isCryptoSymbol(sym) {
  var s = String(sym || '').toUpperCase().replace(/[\/\-_]/g, '');
  for (var i = 0; i < CRYPTO_BASES.length; i++) if (s.indexOf(CRYPTO_BASES[i]) === 0) return true;
  return /\/(USDT|USDC|BUSD|BTC|ETH)$/.test(String(sym || '').toUpperCase());
}
function getLondonHour() { try { return parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: 'numeric', hour12: false }).format(new Date())); } catch (e) { return new Date().getUTCHours(); } }
function getNYHour() { try { return parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(new Date())); } catch (e) { return new Date().getUTCHours() - 5; } }

function getKillZoneInfo() {
  var londonH = getLondonHour(), nyH = getNYHour();
  var inLondon = londonH >= 7 && londonH < 10;
  var inNY = nyH >= 8 && nyH < 11;
  return { active: inLondon || inNY, london: inLondon, ny: inNY, overlap: inLondon && inNY, londonH: londonH, nyH: nyH };
}
function getCryptoLiquidityWindow() {
  var nyH = getNYHour();
  return { active: nyH >= 8 && nyH < 18, high: nyH >= 13 && nyH < 17, nyH: nyH };
}
function getKZShortLabel(symbol) {
  if (isCryptoSymbol(symbol)) { var w = getCryptoLiquidityWindow(); return w.high ? '🪙LIQ+' : w.active ? '🪙LIQ' : '🪙low'; }
  var kz = getKillZoneInfo();
  if (kz.overlap) return '🟢KZ+'; if (kz.london) return '🟢KZ-L'; if (kz.ny) return '🟢KZ-N';
  return '⚪noKZ';
}
function getKZBadge(symbol) {
  if (isCryptoSymbol(symbol)) {
    var w = getCryptoLiquidityWindow();
    if (w.high) return '🪙 <b>کریپتو — لیکویید بالا</b>';
    if (w.active) return '🪙 کریپتو — لیکویید متوسط';
    return '🪙 کریپتو — لیکویید پایین';
  }
  var kz = getKillZoneInfo();
  if (kz.overlap) return '⭐ <b>KZ همپوشانی (اولویت بالا)</b>';
  if (kz.london) return '⭐ <b>KZ لندن (اولویت بالا)</b>';
  if (kz.ny) return '⭐ <b>KZ نیویورک (اولویت بالا)</b>';
  return '⚪ خارج از KZ (احتیاط)';
}
function shouldCheckNow(symbol, kzMode) {
  if (kzMode === 'off') return { ok: true, reason: '۲۴/۷' };
  if (kzMode === 'priority') return { ok: true, reason: 'اولویت' };
  if (kzMode === 'only') {
    if (isCryptoSymbol(symbol)) { var w = getCryptoLiquidityWindow(); return w.active ? { ok: true, reason: 'لیکویید' } : { ok: false, reason: 'خارج لیکویید' }; }
    var kz = getKillZoneInfo();
    return kz.active ? { ok: true, reason: 'داخل KZ' } : { ok: false, reason: 'خارج KZ' };
  }
  return { ok: true, reason: 'پیش‌فرض' };
}

// ============================================
// PROVIDERS
// ============================================

const PROVIDER_NAMES = {
  customvision: '⭐ Custom Vision',
  gemini: 'Google Gemini', aiprime: 'AIPrime', github: 'GitHub Models', groq: 'Groq',
  together: 'Together AI', gapgpt: 'GapGPT', openrouter: 'OpenRouter', mistral: 'Mistral AI',
  huggingface: 'HuggingFace', cloudflare: 'Cloudflare AI', nvidia: 'NVIDIA NIM',
  llm7: 'LLM7.io', avalai: 'AvalAI', metis: 'Metis', onexai: '1xAi'
};
function getKey(env, p) {
  var m = {
    gemini: env.GEMINI_KEY_1 || env.GEMINI_KEY, aiprime: env.AIPRIME_KEY, github: env.GITHUB_MODELS_TOKEN,
    groq: env.GROQ_KEY, together: env.TOGETHER_KEY, gapgpt: env.GAPGPT_KEY, openrouter: env.OPENROUTER_KEY,
    mistral: env.MISTRAL_KEY, huggingface: env.HUGGINGFACE_KEY, cloudflare: env.CLOUDFLARE_KEY,
    nvidia: env.NVIDIA_KEY, llm7: env.LLM7_KEY || 'unused', avalai: env.AVALAI_KEY,
    metis: env.METIS_KEY, onexai: env.ONEXAI_KEY,
    customvision: env.CUSTOM_VISION_KEY
  };
  return m[p] || '';
}
function getGeminiKeys(env) {
  var k = [];
  if (env.GEMINI_KEY_1) k.push(env.GEMINI_KEY_1);
  if (env.GEMINI_KEY_2) k.push(env.GEMINI_KEY_2);
  if (env.GEMINI_KEY_3) k.push(env.GEMINI_KEY_3);
  if (env.GEMINI_KEY) k.push(env.GEMINI_KEY);
  return k;
}
function isCustomVisionReady(env) { return !!(env.CUSTOM_VISION_URL && env.CUSTOM_VISION_KEY && env.CUSTOM_VISION_MODEL); }
function getAvailableProviders(env) {
  return ['customvision','gemini','aiprime','groq','github','together','gapgpt','openrouter','mistral','huggingface','cloudflare','nvidia','llm7','avalai','metis','onexai'].filter(function(p) {
    if (p === 'customvision') return isCustomVisionReady(env);
    if (p === 'gemini') return getGeminiKeys(env).length > 0;
    if (p === 'llm7') return true;
    return !!getKey(env, p);
  });
}

// ============================================
// KV STATE
// ============================================

async function setUserState(env, c, s) { await env.KV.put('state:' + c, JSON.stringify(s), { expirationTtl: 600 }); }
async function getUserState(env, c) { try { return await env.KV.get('state:' + c, 'json'); } catch (e) { return null; } }
async function clearUserState(env, c) { await env.KV.delete('state:' + c); }
async function getJournal(env, c) { try { return await env.KV.get('journal:' + c, 'json') || []; } catch (e) { return []; } }
async function saveJournal(env, c, j) { await env.KV.put('journal:' + c, JSON.stringify(j.slice(-500))); }
async function getWatchlist(env, c) { try { return await env.KV.get('watch:' + c, 'json') || []; } catch (e) { return []; } }
async function saveWatchlist(env, c, l) { await env.KV.put('watch:' + c, JSON.stringify(l)); }

async function getConfluenceMode(env, c) { try { return (await env.KV.get('confmode:' + c)) || 'auto'; } catch (e) { return 'auto'; } }
async function setConfluenceMode(env, c, m) { await env.KV.put('confmode:' + c, m); }
async function getUserMode(env, c) { try { var m = await env.KV.get('mode:' + c); return MODE_CONFIG[m] ? m : 'medium'; } catch (e) { return 'medium'; } }
async function setUserMode(env, c, m) { if (!MODE_CONFIG[m]) m = 'medium'; await env.KV.put('mode:' + c, m); }
async function getUserModelTier(env, c, p) { try { return (await env.KV.get('tier:' + c + ':' + p)) || 'fast'; } catch (e) { return 'fast'; } }
async function setUserModelTier(env, c, p, t) { await env.KV.put('tier:' + c + ':' + p, t); }
async function getStrictness(env, c) { try { return (await env.KV.get('strictness:' + c)) || 'hard'; } catch (e) { return 'hard'; } }
async function setStrictness(env, c, s) { if (!STRICTNESS_MODES[s]) s = 'hard'; await env.KV.put('strictness:' + c, s); }
async function getKzMode(env, c) { try { return (await env.KV.get('kzmode:' + c)) || 'priority'; } catch (e) { return 'priority'; } }
async function setKzMode(env, c, m) { if (!KZ_MODES[m]) m = 'priority'; await env.KV.put('kzmode:' + c, m); }
async function getMonitors(env, c) { try { return await env.KV.get('monitors:' + c, 'json') || []; } catch (e) { return []; } }
async function saveMonitors(env, c, l) { await env.KV.put('monitors:' + c, JSON.stringify(l)); }
async function getLocalFilter(env, c) { try { var v = await env.KV.get('localfilter:' + c); return v === null ? 'on' : v; } catch (e) { return 'on'; } }
async function setLocalFilter(env, c, v) { await env.KV.put('localfilter:' + c, v); }

// ============================================
// PARSING
// ============================================

function parseJsonBlock(text) {
  if (!text) return null;
  var matches = text.match(/```json\s*([\s\S]*?)```/gi);
  if (matches && matches.length) {
    var last = matches[matches.length - 1].replace(/```json\s*/i, '').replace(/```$/, '').trim();
    try { return JSON.parse(last); } catch (e) {}
  }
  var m2 = text.match(/\{[\s\S]*?"direction"[\s\S]*?\}/g);
  if (m2 && m2.length) { try { return JSON.parse(m2[m2.length - 1]); } catch (e) {} }
  return null;
}
function findValue(text, labels) {
  for (var i = 0; i < labels.length; i++) {
    var p = new RegExp('\\*{0,2}' + labels[i] + '\\*{0,2}\\s*[:：=]\\s*\\*{0,2}\\s*([-\\d,،]+(?:\\.\\d+)?)', 'i');
    var m = text.match(p);
    if (m) { var v = num(m[1]); if (v !== null) return v; }
  }
  return null;
}
function detectDirection(text) {
  if (!text) return 'WAIT';
  var td = text.match(/Direction\s*[:：=]\s*(BUY|SELL|WAIT|LONG|SHORT)/i);
  if (td) return normDir(td[1]);
  return 'WAIT';
}
function extractLevels(rawText) {
  var j = parseJsonBlock(rawText);
  if (j) {
    return {
      direction: normDir(j.direction), regime: j.regime || null,
      confidence: num(j.confidence !== undefined && j.confidence !== null ? j.confidence : j.confidenceScore),
      entry: num(j.entry), sl: num(j.stopLoss !== undefined ? j.stopLoss : j.sl),
      tp1: num(j.tp1), tp2: num(j.tp2), tp3: num(j.tp3),
      rr: j.rr || null, confluenceScore: num(j.confluenceScore),
      htf: j.htf4h || null, mtf: j.mtf1h || null, ltf: j.ltf15m || null, entryTf: j.entrytf1m || null,
      detectedSymbol: j.symbol || null, detectedTimeframe: j.timeframe || null,
      aiScores: j.scores || null, validationIssues: []
    };
  }
  var blocks = rawText.match(/---\s*\n([\s\S]*?)\n\s*---/g);
  var text = rawText;
  if (blocks && blocks.length) text = blocks[blocks.length - 1];
  var regimeMatch = text.match(/Regime\s*[:：]\s*(TRENDING_UP|TRENDING_DOWN|RANGING|TRANSITIONAL)/i);
  var rrMatch = text.match(/R\/R\s*[:：=]\s*([\d\.:]+)/i);
  var confMatch = text.match(/ConfluenceScore\s*[:：=]\s*([\d\.]+)/i);
  var htfMatch = text.match(/HTF4H\s*[:：=]\s*(BULLISH|BEARISH|RANGING)/i);
  var mtfMatch = text.match(/MTF1H\s*[:：=]\s*(BULLISH|BEARISH|RANGING)/i);
  var ltfMatch = text.match(/LTF15M\s*[:：=]\s*(BULLISH|BEARISH|RANGING)/i);
  var etfMatch = text.match(/EntryTF1M\s*[:：=]\s*(BULLISH|BEARISH|RANGING)/i);
  var symMatch = text.match(/Symbol\s*[:：=]\s*([^\n]+)/i);
  var tfMatch2 = text.match(/Timeframe\s*[:：=]\s*([^\n]+)/i);
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
    detectedTimeframe: tfMatch2 ? tfMatch2[1].trim() : null,
    aiScores: null, validationIssues: []
  };
}

// ============================================
// VALIDATE
// ============================================

function validateSignalSingle(levels, opts) {
  opts = opts || {};
  var strict = opts.strict || 'hard';
  var minRR = opts.minRR || 1.5;
  var minConfidence = opts.minConfidence || 65;
  var issues = [];
  var originalDir = levels.direction;

  if (strict === 'easy') {
    minRR = Math.max(1.0, minRR * 0.7);
    minConfidence = Math.max(55, minConfidence - 5);
  }

  if (originalDir !== 'WAIT') {
    var conf = levels.confidence;
    if (conf === null || conf === undefined) { issues.push('⚠️ امتیاز نیست'); levels.direction = 'WAIT'; }
    else if (conf > 100 || conf < 0) { issues.push('⚠️ امتیاز نامعتبر'); levels.confidence = null; levels.direction = 'WAIT'; }
    else if (conf < minConfidence) { issues.push('⚠️ اطمینان ' + conf + '% < ' + minConfidence + '%'); levels.direction = 'WAIT'; }
  }

  if (levels.direction === 'BUY' || levels.direction === 'SELL') {
    var entry = levels.entry, sl = levels.sl;
    if (entry === null) { issues.push('⚠️ Entry نیست'); levels.direction = 'WAIT'; }
    else if (sl === null) { issues.push('⚠️ SL نیست'); levels.direction = 'WAIT'; }
    else {
      if (levels.direction === 'BUY' && sl >= entry) { issues.push('❌ SL بالای Entry'); levels.direction = 'WAIT'; }
      if (levels.direction === 'SELL' && sl <= entry) { issues.push('❌ SL زیر Entry'); levels.direction = 'WAIT'; }
    }
    if (levels.direction !== 'WAIT' && entry && sl) {
      if (levels.tp1) {
        var wrongDir = (levels.direction === 'BUY' && levels.tp1 <= entry) || (levels.direction === 'SELL' && levels.tp1 >= entry);
        if (wrongDir) { issues.push('❌ TP1 سمت اشتباه'); levels.direction = 'WAIT'; }
        else {
          var risk = Math.abs(entry - sl), reward = Math.abs(levels.tp1 - entry);
          var actualRR = risk > 0 ? reward / risk : 0;
          if (actualRR < minRR) { issues.push('❌ R/R 1:' + actualRR.toFixed(2) + ' < 1:' + minRR); levels.direction = 'WAIT'; }
          else levels.rr = '1:' + actualRR.toFixed(2);
        }
      } else if (strict === 'hard') { issues.push('⚠️ TP1 نیست'); levels.direction = 'WAIT'; }
    }
    if (opts.atr && opts.price && levels.direction !== 'WAIT') {
      if (Math.abs(levels.entry - opts.price) > 3 * opts.atr) { issues.push('❌ Entry > 3×ATR'); levels.direction = 'WAIT'; }
      else if (strict === 'hard' && Math.abs(levels.entry - levels.sl) < 0.5 * opts.atr) { issues.push('❌ SL < 0.5×ATR'); levels.direction = 'WAIT'; }
    }
  }

  levels.validationIssues = issues;
  levels.appliedStrictness = strict;
  return levels;
}

function validateSignal(levels, opts) {
  opts = opts || {};
  var mode = opts.strict || 'hard';

  if (mode === 'hard' || mode === 'easy') return validateSignalSingle(levels, opts);

  if (mode === 'both') {
    var hardLv = JSON.parse(JSON.stringify(levels));
    var easyLv = JSON.parse(JSON.stringify(levels));
    var hardRes = validateSignalSingle(hardLv, Object.assign({}, opts, { strict: 'hard' }));
    var easyRes = validateSignalSingle(easyLv, Object.assign({}, opts, { strict: 'easy' }));

    var result = easyRes;
    result.appliedStrictness = 'both';
    result.dualEval = {
      hard: { approved: hardRes.direction !== 'WAIT', direction: hardRes.direction, confidence: hardRes.confidence, rr: hardRes.rr || null, issues: hardRes.validationIssues || [] },
      easy: { approved: easyRes.direction !== 'WAIT', direction: easyRes.direction, confidence: easyRes.confidence, rr: easyRes.rr || null, issues: easyRes.validationIssues || [] }
    };
    if (!result.dualEval.hard.approved && !result.dualEval.easy.approved) result.direction = 'WAIT';
    return result;
  }

  return validateSignalSingle(levels, opts);
}

// ============================================
// CONFLUENCE
// ============================================

function extractScores(text) {
  var j = parseJsonBlock(text);
  if (j && j.scores) {
    var s = {}, ok = 0;
    for (var i = 0; i < CONF_KEYS.length; i++) {
      var v = num(j.scores[CONF_KEYS[i]]);
      if (v != null && v >= 0 && v <= 100) { s[CONF_KEYS[i]] = v; ok++; }
    }
    if (ok >= 4) return s;
  }
  return null;
}

function calculateConfluenceAuto(levels, rawText) {
  var t = String(rawText || '');
  var tClean = t.replace(/(?:FVG|OB|BOS|CHOCH|Order\s*Block|Sweep)\s*(?:وجود\s*ندارد|نیست|no|not|absent)/gi, '');
  var s = {};
  var st = 55;
  if (/\bBOS\b/i.test(tClean)) st += 12;
  if (/CHOCH|CHoCH/i.test(tClean)) st += 10;
  if (/Retest|پولبک/i.test(tClean)) st += 8;
  if (/TRENDING_UP|TRENDING_DOWN/i.test(tClean)) st += 10;
  if (/RANGING|رنج/i.test(tClean)) st -= 15;
  s.structure = Math.max(0, Math.min(100, st));

  var smc = 55;
  if (/Order\s*Block|\bOB\b/i.test(tClean)) smc += 18;
  if (/Premium|Discount/i.test(tClean)) smc += 8;
  s.smc = Math.max(0, Math.min(100, smc));

  var ict = 55;
  if (/FVG|Fair\s*Value\s*Gap/i.test(tClean)) ict += 22;
  if (/Imbalance/i.test(tClean)) ict += 12;
  s.ict = Math.max(0, Math.min(100, ict));

  var cd = 55;
  if (/Engulf|پوششی/i.test(tClean)) cd += 18;
  if (/Pin\s*Bar/i.test(tClean)) cd += 15;
  s.candle = Math.max(0, Math.min(100, cd));

  var lq = 55;
  if (/Liquidity\s*Sweep|Sweep/i.test(tClean)) lq += 20;
  if (/نقدینگی/i.test(tClean)) lq += 10;
  s.liquidity = Math.max(0, Math.min(100, lq));

  var rr = 50;
  if (levels.entry && levels.sl && levels.tp1) {
    var r = Math.abs(levels.entry - levels.sl);
    var rw = Math.abs(levels.tp1 - levels.entry);
    var rrRatio = r > 0 ? rw / r : 0;
    rr = Math.min(100, Math.round(Math.min(rrRatio, 4) * 25 + 25));
  }
  s.riskReward = rr;

  var avg = (s.structure + s.smc + s.ict + s.candle + s.liquidity + s.riskReward) / 6;
  var normalized = 4 + ((avg - 40) / 50) * 5;
  var confluence = Math.max(3, Math.min(9, Math.round(normalized * 10) / 10));
  return { scores: s, confluence: confluence, auto: true };
}

async function resolveConfluence(env, chatId, levels, rawText) {
  var mode = await getConfluenceMode(env, chatId);
  var result = { mode: mode, scores: null, confluence: null, auto: false, warning: null };
  var aiScores = levels.aiScores || extractScores(rawText);
  if (aiScores && Object.keys(aiScores).length >= 4) {
    var af = calculateConfluenceAuto(levels, rawText);
    for (var i = 0; i < CONF_KEYS.length; i++) if (aiScores[CONF_KEYS[i]] == null) aiScores[CONF_KEYS[i]] = af.scores[CONF_KEYS[i]];
    var sum = 0;
    for (var j = 0; j < CONF_KEYS.length; j++) sum += (aiScores[CONF_KEYS[j]] || 0);
    result.scores = aiScores;
    result.confluence = (levels.confluenceScore != null) ? levels.confluenceScore : Math.round((sum / 6 / 10) * 10) / 10;
    result.auto = false;
    return result;
  }
  if (mode === 'auto' || mode === 'force') {
    var a = calculateConfluenceAuto(levels, rawText);
    result.scores = a.scores;
    result.confluence = a.confluence;
    result.auto = true;
    if (mode === 'force') result.warning = '\n⚠️ AI از دستور اجباری پیروی نکرد';
    return result;
  }
  result.warning = '\n⚠️ نمرات هم‌گرایی دریافت نشد.';
  return result;
}

// ============================================
// AI CALLERS
// ============================================

async function callCustomVisionText(env, prompt, imgB64, imgMime) {
  var baseUrl = env.CUSTOM_VISION_URL;
  var key = env.CUSTOM_VISION_KEY;
  var model = env.CUSTOM_VISION_MODEL;
  if (!baseUrl || !key || !model) throw new Error('Custom Vision config ناقص');
  if (!/\/chat\/completions\/?$/.test(baseUrl)) baseUrl = baseUrl.replace(/\/+$/, '') + '/chat/completions';
  var c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  var r = await fetchWithTimeout(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
  }, 30000, 'CustomVision');
  var d = await r.json();
  if (!r.ok) throw new Error(d && d.error ? d.error.message : 'HTTP ' + r.status);
  return d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '';
}

async function callGeminiText(env, prompt, imgB64, imgMime) {
  var keys = getGeminiKeys(env);
  if (!keys.length) throw new Error('no key');
  var hasImage = !!imgB64;
  var models = hasImage ? VISION_MODELS_BY_PROVIDER.gemini : ['gemini-2.5-flash', 'gemini-2.0-flash'];
  var parts = [{ text: prompt }];
  if (imgB64) parts.push({ inline_data: { mime_type: imgMime, data: imgB64 } });
  var last = '';
  for (var ki = 0; ki < keys.length; ki++) {
    for (var mi = 0; mi < models.length; mi++) {
      try {
        var r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + models[mi] + ':generateContent', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': keys[ki] },
          body: JSON.stringify({ contents: [{ parts: parts }], generationConfig: { temperature: 0.15, topP: 0.9, maxOutputTokens: 12000 } })
        });
        var d = await r.json();
        if (r.ok) {
          var cand = d && d.candidates && d.candidates[0];
          var t = null;
          if (cand && cand.content && cand.content.parts) {
            for (var pi = 0; pi < cand.content.parts.length; pi++) {
              var pt = cand.content.parts[pi];
              if (pt.text && !pt.thought) t = (t || '') + pt.text;
            }
          }
          if (t && t.length > 10) return t;
        }
        last = d && d.error ? d.error.message : 'HTTP ' + r.status;
        if (r.status === 404 || /not found|not supported/i.test(last)) continue;
        if ([429, 401, 403].indexOf(r.status) !== -1) break;
      } catch (e) { last = e.message; }
    }
  }
  throw new Error('Gemini: ' + last);
}

async function callAIPrimeText(env, prompt, imgB64, imgMime, chatId) {
  var key = env.AIPRIME_KEY;
  if (!key) throw new Error('no AIPRIME_KEY');
  var hasImage = !!imgB64;
  var content = hasImage ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  var modelsToTry;
  if (hasImage) modelsToTry = VISION_MODELS_BY_PROVIDER.aiprime;
  else {
    var tier = chatId ? await getUserModelTier(env, chatId, 'aiprime') : 'fast';
    var cfg = getModelTierConfig('aiprime', tier, false);
    modelsToTry = [cfg.model];
  }
  var lastErr = '';
  for (var mi = 0; mi < modelsToTry.length; mi++) {
    var model = modelsToTry[mi];
    try {
      var r = await fetch('https://api.aiprime.shop/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model: model, messages: [{ role: 'user', content: content }], temperature: 0.15, max_tokens: 10000 })
      });
      var d = await r.json();
      if (r.ok) {
        var t = d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : null;
        if (t && t.length > 10) return t;
        lastErr = model + ': empty';
        continue;
      }
      var errMsg = d && d.error ? (d.error.message || JSON.stringify(d.error)) : 'HTTP ' + r.status;
      lastErr = model + ': ' + errMsg;
      if (/vision|not support|does not support|model.*not found|invalid.*model/i.test(errMsg)) continue;
      if (r.status === 401 || r.status === 403) throw new Error('AIPrime auth: ' + errMsg);
      continue;
    } catch (e) { lastErr = model + ': ' + e.message; continue; }
  }
  throw new Error('AIPrime: ' + lastErr);
}

async function callGapGPTText(env, prompt, imgB64, imgMime, chatId) {
  var key = env.GAPGPT_KEY;
  if (!key) throw new Error('no GAPGPT_KEY');
  var hasImage = !!imgB64;
  var content = hasImage ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  var modelsToTry;
  if (hasImage) modelsToTry = VISION_MODELS_BY_PROVIDER.gapgpt;
  else {
    var tier = chatId ? await getUserModelTier(env, chatId, 'gapgpt') : 'fast';
    var cfg = getModelTierConfig('gapgpt', tier, false);
    modelsToTry = [cfg.model];
  }
  var lastErr = '';
  for (var mi = 0; mi < modelsToTry.length; mi++) {
    var model = modelsToTry[mi];
    try {
      var r = await fetch('https://api.gapgpt.app/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model: model, messages: [{ role: 'user', content: content }], temperature: 0.15, max_tokens: 10000 })
      });
      var d = await r.json();
      if (r.ok) {
        var t = d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : null;
        if (t && t.length > 10) return t;
        lastErr = model + ': empty';
        continue;
      }
      var errMsg = d && d.error ? (d.error.message || JSON.stringify(d.error)) : 'HTTP ' + r.status;
      lastErr = model + ': ' + errMsg;
      if (/vision|not support|does not support|no available channel|not found|invalid.*model/i.test(errMsg)) continue;
      if (r.status === 401 || r.status === 403) throw new Error('GapGPT auth: ' + errMsg);
      continue;
    } catch (e) { lastErr = model + ': ' + e.message; continue; }
  }
  throw new Error('GapGPT: ' + lastErr);
}

async function callGroqText(env, prompt, imgB64, imgMime) {
  var key = env.GROQ_KEY; if (!key) throw new Error('no key');
  var models = imgB64 ? ['meta-llama/llama-4-scout-17b-16e-instruct'] : ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
  var last = '';
  for (var i = 0; i < models.length; i++) {
    try {
      var c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
      var r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model: models[i], messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
      });
      var d = await r.json();
      if (r.ok) { var t = d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : null; if (t) return t; }
      last = d && d.error ? d.error.message : 'HTTP ' + r.status;
    } catch (e) { last = e.message; }
  }
  throw new Error('Groq: ' + last);
}

async function callGitHubText(env, prompt, imgB64, imgMime) {
  var t = env.GITHUB_MODELS_TOKEN; if (!t) throw new Error('no token');
  var c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  var r = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
  });
  var d = await r.json();
  if (!r.ok) throw new Error(d && d.error ? d.error.message : 'HTTP ' + r.status);
  return d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '';
}

async function callTogetherText(env, prompt, imgB64, imgMime) {
  var key = env.TOGETHER_KEY; if (!key) throw new Error('no key');
  var model = imgB64 ? 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo' : 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
  var c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  var r = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
  });
  var d = await r.json();
  if (!r.ok) throw new Error(d && d.error ? d.error.message : 'HTTP ' + r.status);
  return d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '';
}

async function callOpenRouterText(env, prompt, imgB64, imgMime) {
  var key = env.OPENROUTER_KEY; if (!key) throw new Error('no key');
  var models = imgB64 ? ['google/gemini-2.0-flash-exp:free'] : ['deepseek/deepseek-chat-v3.1:free', 'meta-llama/llama-3.3-70b-instruct:free'];
  var last = '';
  for (var i = 0; i < models.length; i++) {
    try {
      var c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
      var r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key, 'HTTP-Referer': 'https://everest.bot', 'X-Title': 'Everest' },
        body: JSON.stringify({ model: models[i], messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
      });
      var d = await r.json();
      if (r.ok) { var t = d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : null; if (t) return t; }
      last = d && d.error ? d.error.message : 'HTTP ' + r.status;
    } catch (e) { last = e.message; }
  }
  throw new Error('OR: ' + last);
}

async function callMistralText(env, prompt, imgB64, imgMime) {
  var key = env.MISTRAL_KEY; if (!key) throw new Error('no key');
  var model = imgB64 ? 'pixtral-12b-2409' : 'mistral-small-latest';
  var c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: 'data:' + imgMime + ';base64,' + imgB64 }] : prompt;
  var r = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
  });
  var d = await r.json();
  if (!r.ok) throw new Error(d && d.error ? d.error.message : 'HTTP ' + r.status);
  return d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '';
}

async function callAvalAIText(env, prompt, imgB64, imgMime) {
  var key = env.AVALAI_KEY; if (!key) throw new Error('no key');
  var c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  var r = await fetch('https://api.avalai.ir/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: 'gemini-2.0-flash', messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
  });
  var d = await r.json();
  if (!r.ok) throw new Error(d && d.error ? d.error.message : 'HTTP ' + r.status);
  return d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '';
}

async function callHuggingFaceText(env, prompt, imgB64, imgMime) {
  var key = env.HUGGINGFACE_KEY; if (!key) throw new Error('no key');
  var model = imgB64 ? 'Qwen/Qwen2.5-VL-7B-Instruct' : 'meta-llama/Meta-Llama-3-8B-Instruct';
  var c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  var r = await fetch('https://api-inference.huggingface.co/models/' + model + '/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
  });
  var d = await r.json();
  if (!r.ok) throw new Error(d && d.error ? d.error.message : 'HTTP ' + r.status);
  return d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '';
}

async function callCloudflareText(env, prompt, imgB64, imgMime) {
  var key = env.CLOUDFLARE_KEY; if (!key) throw new Error('no key');
  var parts = key.split(':');
  if (parts.length !== 2) throw new Error('CF_KEY: accountId:token');
  var model = imgB64 ? '@cf/meta/llama-3.2-11b-vision-instruct' : '@cf/meta/llama-3.1-8b-instruct';
  var c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  var r = await fetch('https://api.cloudflare.com/client/v4/accounts/' + parts[0] + '/ai/run/' + model, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + parts[1] },
    body: JSON.stringify({ messages: [{ role: 'user', content: c }] })
  });
  var d = await r.json();
  if (!r.ok) throw new Error(d && d.errors && d.errors[0] ? d.errors[0].message : 'HTTP ' + r.status);
  return d && d.result ? d.result.response : '';
}

async function callNvidiaText(env, prompt, imgB64, imgMime) {
  var key = env.NVIDIA_KEY; if (!key) throw new Error('no key');
  var model = imgB64 ? 'meta/llama-3.2-90b-vision-instruct' : 'meta/llama-3.3-70b-instruct';
  var c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  var r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
  });
  var d = await r.json();
  if (!r.ok) throw new Error(d && d.error ? d.error.message : 'HTTP ' + r.status);
  return d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '';
}

async function callLLM7Text(env, prompt, imgB64, imgMime) {
  var key = env.LLM7_KEY || 'unused';
  var models = ['pro', 'default'];
  var last = '';
  for (var i = 0; i < models.length; i++) {
    try {
      var c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
      var r = await fetch('https://api.llm7.io/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model: models[i], messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
      });
      var d = await r.json();
      if (r.ok) { var t = d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : null; if (t) return t; }
      last = d && d.error ? d.error.message : 'HTTP ' + r.status;
    } catch (e) { last = e.message; }
  }
  throw new Error('LLM7: ' + last);
}

async function callMetisText(env, prompt, imgB64, imgMime) {
  var key = env.METIS_KEY; if (!key) throw new Error('no key');
  var c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  var r = await fetch('https://api.metisai.ir/openai/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
  });
  var d = await r.json();
  if (!r.ok) throw new Error(d && d.error ? d.error.message : 'HTTP ' + r.status);
  return d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '';
}

async function callOneXAiText(env, prompt, imgB64, imgMime) {
  var key = env.ONEXAI_KEY; if (!key) throw new Error('no key');
  var c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  var r = await fetch('https://1xai.ir/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
  });
  var d = await r.json();
  if (!r.ok) throw new Error(d && d.error ? d.error.message : 'HTTP ' + r.status);
  return d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '';
}

var PROVIDER_FUNCS = {
  customvision: callCustomVisionText,
  gemini: callGeminiText, aiprime: callAIPrimeText, groq: callGroqText, github: callGitHubText,
  together: callTogetherText, gapgpt: callGapGPTText, openrouter: callOpenRouterText,
  mistral: callMistralText, huggingface: callHuggingFaceText, cloudflare: callCloudflareText,
  nvidia: callNvidiaText, llm7: callLLM7Text, avalai: callAvalAIText, metis: callMetisText, onexai: callOneXAiText
};

async function callWithFallback(env, prompt, imgB64, imgMime, chatId, forcedProvider) {
  var hasImg = !!imgB64;
  var providers;

  if (forcedProvider && forcedProvider !== 'auto' && PROVIDER_FUNCS[forcedProvider] &&
      (forcedProvider === 'gemini' ? getGeminiKeys(env).length > 0 : getKey(env, forcedProvider))) {
    providers = [forcedProvider];
  } else if (hasImg) {
    providers = [];
    if (getGeminiKeys(env).length > 0) providers.push('gemini');
    if (env.GAPGPT_KEY) providers.push('gapgpt');
    if (env.AIPRIME_KEY) providers.push('aiprime');
    if (isCustomVisionReady(env)) providers.push('customvision');
    if (!VISION_STRICT) {
      var others = getAvailableProviders(env).filter(function(p) {
        return ['gemini', 'gapgpt', 'aiprime', 'customvision'].indexOf(p) === -1;
      });
      var pri = { groq: 1, openrouter: 2, mistral: 3, together: 4, nvidia: 5, huggingface: 6, github: 7, cloudflare: 8, avalai: 9, metis: 10, onexai: 11, llm7: 12 };
      others.sort(function(a, b) { return (pri[a] || 50) - (pri[b] || 50); });
      providers = providers.concat(others);
    }
  } else {
    providers = getAvailableProviders(env);
    var pri2 = { aiprime: 1, gapgpt: 2, github: 3, groq: 4, together: 5, openrouter: 6, mistral: 7, llm7: 8, avalai: 9, metis: 10, onexai: 11, huggingface: 12, nvidia: 13, cloudflare: 14, gemini: 99, customvision: 100 };
    providers.sort(function(a, b) { return (pri2[a] || 50) - (pri2[b] || 50); });
  }
  if (!providers.length) throw new Error('هیچ سرویس فعال نیست');
  var errs = [];
  for (var i = 0; i < providers.length; i++) {
    var p = providers[i];
    try {
      var timeout = (p === 'gapgpt' || p === 'aiprime' || p === 'customvision') ? 30000 : 18000;
      var r = await withTimeout(PROVIDER_FUNCS[p](env, prompt, imgB64, imgMime, chatId), timeout, p);
      if (r && r.length > 10) return { text: r, provider: PROVIDER_NAMES[p] };
      errs.push(p + ': کوتاه');
    } catch (e) { errs.push(p + ': ' + e.message); }
  }
  throw new Error('همه سرویس‌ها خطا:\n' + errs.slice(0, 6).join('\n'));
}

// ============================================
// DATA FETCHERS
// ============================================

async function fetchBinanceData(symbol, tf) {
  var sym = String(symbol).toUpperCase().replace(/[\/\-_]/g, '');
  if (sym.indexOf('USDT') !== sym.length - 4) {
    if (sym.indexOf('USD') === sym.length - 3) sym = sym.replace(/USD$/, 'USDT');
    else if (/^[A-Z]+$/.test(sym)) sym = sym + 'USDT';
  }
  var interval = BINANCE_INTERVALS[tf] || '1h';
  var path = '/api/v3/klines?symbol=' + sym + '&interval=' + interval + '&limit=300';
  var endpoints = ['https://api.binance.com' + path, 'https://data-api.binance.vision' + path, 'https://api1.binance.com' + path];
  var last = '';
  for (var i = 0; i < endpoints.length; i++) {
    try {
      var ctrl = new AbortController();
      var timer = setTimeout(function() { ctrl.abort(); }, 8000);
      var r = await fetch(endpoints[i], { signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) { last = 'HTTP ' + r.status; continue; }
      var d = await r.json();
      if (!Array.isArray(d) || !d.length) { last = 'empty'; continue; }
      return d.map(function(k) { return { datetime: new Date(k[0]).toISOString(), open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] }; });
    } catch (e) { last = e.message; }
  }
  throw new Error('Binance: ' + last);
}

async function fetchTwelveData(symbol, interval, apiKey, size) {
  var url = new URL('https://api.twelvedata.com/time_series');
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('interval', interval);
  url.searchParams.set('outputsize', size || 300);
  url.searchParams.set('timezone', 'UTC');
  url.searchParams.set('apikey', apiKey);
  var r = await fetchWithTimeout(url.toString(), null, 12000, 'Twelve');
  var d = await r.json();
  if (d.status === 'error' || d.code) throw new Error(d.message || 'Twelve error');
  if (!d.values || !d.values.length) throw new Error('Twelve: empty');
  var result = [];
  for (var i = d.values.length - 1; i >= 0; i--) {
    var v = d.values[i];
    result.push({ datetime: v.datetime || '', open: parseFloat(v.open), high: parseFloat(v.high), low: parseFloat(v.low), close: parseFloat(v.close), volume: parseFloat(v.volume || 0) });
  }
  return result;
}

async function getCurrentPrice(symbol, apiKey) {
  if (isCryptoSymbol(symbol)) {
    var s = String(symbol).toUpperCase().replace(/[\/\-_]/g, '');
    if (s.endsWith('USD')) s = s.replace(/USD$/, 'USDT');
    var r = await fetchWithTimeout('https://api.binance.com/api/v3/ticker/price?symbol=' + s, null, 10000, 'Binance');
    var d = await r.json();
    if (d.price) return parseFloat(d.price);
    throw new Error('Binance price error');
  }
  var r2 = await fetchWithTimeout('https://api.twelvedata.com/price?symbol=' + encodeURIComponent(symbol) + '&apikey=' + apiKey, null, 10000, 'Twelve');
  var d2 = await r2.json();
  if (d2.status === 'error' || d2.code) throw new Error(d2.message || 'Twelve price error');
  return parseFloat(d2.price);
}

async function fetchMarketData(symbol, tf, env, provider) {
  provider = provider || 'auto';
  var tk = env.TWELVE_KEY;
  var isCrypto = isCryptoSymbol(symbol);
  var tdInterval = TD_INTERVALS[tf] || '1h';

  if (provider === 'binance') {
    if (!isCrypto) throw new Error('Binance فقط کریپتو');
    return await withTimeout(fetchBinanceData(symbol, tf), 20000, 'Binance');
  }
  if (provider === 'twelve') {
    if (!tk) throw new Error('Twelve Key خالی');
    return await withTimeout(fetchTwelveData(symbol, tdInterval, tk, 300), 18000, 'Twelve');
  }
  if (isCrypto) {
    try { return await withTimeout(fetchBinanceData(symbol, tf), 20000, 'Binance'); }
    catch (e1) {
      if (tk) return await withTimeout(fetchTwelveData(symbol, tdInterval, tk, 300), 18000, 'Twelve');
      throw new Error('Binance fail و Twelve key نداری');
    }
  }
  if (tk) return await withTimeout(fetchTwelveData(symbol, tdInterval, tk, 300), 18000, 'Twelve');
  throw new Error('Twelve Key لازم است (فارکس/طلا)');
}

function klinesToText(klines, symbol, tfName) {
  if (!klines || !klines.length) return '';
  var last = klines[klines.length - 1];
  var slice = klines.slice(-60);
  var rows = slice.map(function(k) {
    var t = k.datetime ? formatTime(k.datetime) : '';
    return '  ' + t + ' | O:' + k.open + ' H:' + k.high + ' L:' + k.low + ' C:' + k.close;
  }).join('\n');
  var isCrypto = isCryptoSymbol(symbol);
  var header = isCrypto ? '=== ' + tfName + ' (' + symbol + ') [CRYPTO] ===' : '=== ' + tfName + ' (' + symbol + ') ===';
  return header + '\nقیمت فعلی: ' + last.close + '\n\n' + rows;
}

function normalizeSymbol(s) {
  if (!s) return '';
  var c = s.trim().toUpperCase();
  if (c.indexOf('/') !== -1) return c;
  var m = c.match(/^([A-Z]+)(USD|EUR|GBP|JPY|CHF|AUD|CAD|NZD)$/);
  if (m) return m[1] + '/' + m[2];
  return c;
}
function timeframeLabel(tf) { return TF_LABELS[tf] || tf; }
function regimeLabel(r) { var m = { TRENDING_UP:'📈 صعودی',TRENDING_DOWN:'📉 نزولی',RANGING:'↔️ رنج',TRANSITIONAL:'🔄 گذار' }; return m[r] || ''; }
function directionEmoji(d) {
  if (d === 'BULLISH' || d === 'BUY' || d === 'LONG') return '🟢 صعودی';
  if (d === 'BEARISH' || d === 'SELL' || d === 'SHORT') return '🔴 نزولی';
  if (d === 'RANGING' || d === 'WAIT') return '⚪️ رنج';
  return d || '—';
}

// ============================================
// AUTO JOURNAL
// ============================================

async function autoJournalAdd(env, chatId, levels, provider, symbol, tf, currentPrice) {
  try {
    var a = await getJournal(env, chatId) || [];
    var kz = getKillZoneInfo();
    var isCrypto = isCryptoSymbol(symbol);
    var cryptoW = isCrypto ? getCryptoLiquidityWindow() : null;
    var id = a.length ? (a[a.length - 1].id || 0) + 1 : 1;
    var tehran = new Date(Date.now() + 3.5 * 3600 * 1000);
    var day = tehran.toISOString().slice(0, 10);
    a.push({
      id: id, t: Date.now(),
      sym: symbol, tf: tf,
      dir: levels.direction,
      entry: levels.entry, sl: levels.sl,
      tp1: levels.tp1, tp2: levels.tp2, tp3: levels.tp3,
      confidence: levels.confidence,
      provider: provider || '?',
      status: 'OPEN', filled: false,
      currentPrice: currentPrice,
      kzIn: isCrypto ? (cryptoW ? cryptoW.active : false) : kz.active,
      kzZone: isCrypto ? (cryptoW && cryptoW.high ? 'crypto-high' : (cryptoW && cryptoW.active) ? 'crypto-mid' : 'crypto-low') : (kz.overlap ? 'overlap' : kz.london ? 'london' : kz.ny ? 'ny' : 'none'),
      isCrypto: isCrypto,
      dual: levels.dualEval ? { h: levels.dualEval.hard.approved, e: levels.dualEval.easy.approved } : null,
      mode: 'monitor',
      day: day
    });
    await saveJournal(env, chatId, a);
    console.log('[AUTO-JOURNAL] ' + chatId + ' #' + id + ' ' + levels.direction + ' ' + symbol + ' @' + levels.entry);
    return true;
  } catch (e) { console.error('autoJournalAdd:', e.message); return false; }
}

function calcRRR(s, tpNum) {
  var tp = tpNum === 1 ? s.tp1 : tpNum === 2 ? s.tp2 : s.tp3;
  if (tp == null) return 0;
  var risk = Math.abs(s.entry - s.sl);
  var reward = Math.abs(tp - s.entry);
  return risk > 0 ? reward / risk : 0;
}

// ✅ v8: TP1 نهایی + ارتقا به TP2/TP3
async function resolveJournalForChat(env, chatId, klines, symbol, tf) {
  try {
    var a = await getJournal(env, chatId) || [];
    var ch = false;
    var tfm = (TF_MINUTES[tf] || 5) * 60 * 1000;
    for (var i = 0; i < a.length; i++) {
      var s = a[i];
      if (s.status !== 'OPEN' && s.status !== 'WIN') continue;
      if (s.sym !== symbol) continue;
      if (s.tf !== tf) continue;
      if (s.tp1 == null) continue;

      for (var j = 0; j < klines.length; j++) {
        var k = klines[j];
        var kt = Date.parse(String(k.datetime).includes('T') ? k.datetime : String(k.datetime).replace(' ', 'T') + 'Z');
        if (!Number.isFinite(kt)) continue;
        if (kt < s.t - tfm) continue;

        if (s.status === 'WIN') {
          if (s.whichTP < 3 && s.tp3 != null) {
            var tp3Up = s.dir === 'BUY' ? k.high >= s.tp3 : k.low <= s.tp3;
            if (tp3Up) { s.whichTP = 3; s.closeP = s.tp3; s.closeT = kt; s.rr = calcRRR(s, 3); ch = true; }
          } else if (s.whichTP < 2 && s.tp2 != null) {
            var tp2Up = s.dir === 'BUY' ? k.high >= s.tp2 : k.low <= s.tp2;
            if (tp2Up) { s.whichTP = 2; s.closeP = s.tp2; s.closeT = kt; s.rr = calcRRR(s, 2); ch = true; }
          }
          continue;
        }

        if (!s.filled) {
          if (!(k.low <= s.entry && k.high >= s.entry)) continue;
          s.filled = true; s.fillT = kt; ch = true;
        }

        var slHit = s.dir === 'BUY' ? k.low <= s.sl : k.high >= s.sl;
        if (slHit) { s.status = 'LOSS'; s.closeT = kt; s.closeP = k.close; s.whichTP = 0; s.rr = -1; ch = true; break; }

        var tp3Hit = s.tp3 != null ? (s.dir === 'BUY' ? k.high >= s.tp3 : k.low <= s.tp3) : false;
        var tp2Hit = s.tp2 != null ? (s.dir === 'BUY' ? k.high >= s.tp2 : k.low <= s.tp2) : false;
        var tp1Hit = s.tp1 != null ? (s.dir === 'BUY' ? k.high >= s.tp1 : k.low <= s.tp1) : false;

        if (tp3Hit) { s.status = 'WIN'; s.closeT = kt; s.closeP = s.tp3; s.whichTP = 3; s.rr = calcRRR(s, 3); ch = true; }
        else if (tp2Hit) { s.status = 'WIN'; s.closeT = kt; s.closeP = s.tp2; s.whichTP = 2; s.rr = calcRRR(s, 2); ch = true; }
        else if (tp1Hit) { s.status = 'WIN'; s.closeT = kt; s.closeP = s.tp1; s.whichTP = 1; s.rr = calcRRR(s, 1); ch = true; }
      }
    }
    if (ch) { await saveJournal(env, chatId, a); console.log('[RESOLVE] ' + chatId + ' journal updated'); }
    return ch;
  } catch (e) { console.error('resolveJournal:', e.message); return false; }
}

// ✅ v8: EXPIRY WATCHDOG — UNFILLED جدا از EXPIRED
async function runExpiryWatchdog(env) {
  try {
    var token = env.TG_TOKEN;
    if (!token) return;
    var list = await env.KV.list({ prefix: 'journal:' });
    var now = Date.now();
    var totalUnfilled = 0, totalExpired = 0, totalWarned = 0;

    for (var ki = 0; ki < list.keys.length; ki++) {
      var key = list.keys[ki].name;
      var chatId = key.replace('journal:', '');
      var journal = await env.KV.get(key, 'json') || [];
      if (!journal.length) continue;

      var changed = false;
      var unfilledSignals = [];
      var expiredSignals = [];
      var warnedSignals = [];

      for (var i = 0; i < journal.length; i++) {
        var s = journal[i];
        if (s.status !== 'OPEN') continue;

        // سفارش پر نشده
        if (!s.filled) {
          var info = getExpiryInfo(s);
          if (info.expired) {
            s.status = 'UNFILLED';
            s.closeT = now;
            s.closeReason = 'unfilled_timeout';
            changed = true;
            unfilledSignals.push(s);
          } else if (info.warning && !s.warned) {
            s.warned = true;
            changed = true;
            warnedSignals.push({ s: s, info: info });
          }
        }
        // سفارش پر شده که به TP/SL نرسید
        else if (s.fillT) {
          var finfo = getFilledExpiryInfo(s);
          if (finfo.expired) {
            s.status = 'EXPIRED';
            s.closeT = now;
            s.closeReason = 'filled_no_tp_sl';
            changed = true;
            expiredSignals.push(s);
          }
        }
      }

      if (changed) {
        await env.KV.put(key, JSON.stringify(journal));
        totalUnfilled += unfilledSignals.length;
        totalExpired += expiredSignals.length;
        totalWarned += warnedSignals.length;
      }

      // نوتیفیکیشن سفارش پر نشده
      for (var k = 0; k < unfilledSignals.length; k++) {
        var us = unfilledSignals[k];
        var msg = '🚫 <b>سفارش لیمیت پر نشد — کنسل شد</b>\n\n';
        msg += '<b>نماد:</b> ' + (us.isCrypto ? '🪙' : '💱') + ' ' + esc(us.sym) + '\n';
        msg += '<b>TF:</b> ' + timeframeLabel(us.tf) + '\n';
        msg += '<b>جهت:</b> ' + (us.dir === 'BUY' ? '🟢 خرید' : '🔴 فروش') + '\n';
        msg += '<b>Entry انتظار:</b> <code>' + esc(us.entry) + '</code>\n';
        if (us.currentPrice) msg += '<b>قیمت فعلی:</b> <code>' + esc(us.currentPrice) + '</code>\n';
        msg += '\n━━━━━━━━━━━━━━━\n';
        msg += '⚠️ قیمت در <b>' + getExpiryTTL(us.tf) + ' کندل</b> به Entry نرسید\n';
        msg += '📝 ثبت‌شده به عنوان <b>UNFILLED</b> — خارج از وین‌ریت';
        var kb = { inline_keyboard: [
          [{ text: '📓 ژورنال', callback_data: 'menu_journal' }],
          [{ text: '📊 تحلیل جدید', callback_data: 'menu_analyze' }]
        ]};
        try { await sendMessage(token, chatId, msg, kb); } catch(e) { console.error('Unfilled notif: ' + e.message); }
      }

      // نوتیفیکیشن سفارش پر شده که بسته نشد
      for (var m = 0; m < expiredSignals.length; m++) {
        var es = expiredSignals[m];
        var msg2 = '⌛ <b>سیگنال منقضی شد (بسته نشد)</b>\n\n';
        msg2 += '<b>نماد:</b> ' + (es.isCrypto ? '🪙' : '💱') + ' ' + esc(es.sym) + '\n';
        msg2 += '<b>جهت:</b> ' + (es.dir === 'BUY' ? '🟢 خرید' : '🔴 فروش') + '\n';
        msg2 += '<b>Entry:</b> <code>' + esc(es.entry) + '</code>\n';
        msg2 += '<b>وضعیت:</b> پر شده در ' + new Date(es.fillT).toLocaleTimeString('fa-IR').slice(0,5) + '\n';
        msg2 += '\n━━━━━━━━━━━━━━━\n';
        msg2 += '⚠️ بعد از پر شدن، در <b>' + getFilledTimeoutTTL(es.tf) + ' کندل</b> به TP/SL نرسید';
        try { await sendMessage(token, chatId, msg2); } catch(e) {}
      }

      // هشدار نزدیک انقضا
      for (var n = 0; n < warnedSignals.length; n++) {
        var ws = warnedSignals[n].s;
        var wi = warnedSignals[n].info;
        var wMsg = '⚠️ <b>نزدیک انقضا</b>\n\n';
        wMsg += '<b>نماد:</b> ' + (ws.isCrypto ? '🪙' : '💱') + ' ' + esc(ws.sym) + '\n';
        wMsg += '<b>جهت:</b> ' + (ws.dir === 'BUY' ? '🟢 خرید' : '🔴 فروش') + '\n';
        wMsg += '<b>Entry:</b> <code>' + esc(ws.entry) + '</code>\n';
        if (ws.currentPrice) wMsg += '<b>قیمت فعلی:</b> <code>' + esc(ws.currentPrice) + '</code>\n';
        wMsg += '\n⏳ <b>' + wi.remainingCandles + ' کندل</b> تا کنسلی سفارش مونده';
        try { await sendMessage(token, chatId, wMsg); } catch(e) {}
      }
    }

    if (totalUnfilled || totalExpired || totalWarned) {
      console.log('[WATCHDOG] unfilled=' + totalUnfilled + ' expired=' + totalExpired + ' warned=' + totalWarned);
    }
  } catch (e) { console.error('runExpiryWatchdog: ' + e.message); }
}

async function sendDailyReport(env, chatId, dayKey) {
  try {
    var token = env.TG_TOKEN;
    var a = await getJournal(env, chatId) || [];
    var daySignals = a.filter(function(s) { return s.day === dayKey; });
    if (!daySignals.length) return;
    var wins = daySignals.filter(function(s) { return s.status === 'WIN'; });
    var losses = daySignals.filter(function(s) { return s.status === 'LOSS'; });
    var open = daySignals.filter(function(s) { return s.status === 'OPEN'; });
    var expired = daySignals.filter(function(s) { return s.status === 'EXPIRED'; });
    var unfilled = daySignals.filter(function(s) { return s.status === 'UNFILLED'; });
    var closed = wins.length + losses.length;
    var wr = closed ? Math.round(wins.length / closed * 100) : 0;
    var rSum = 0;
    daySignals.forEach(function(s) { if (s.status === 'WIN') rSum += (s.rr || 0); else if (s.status === 'LOSS') rSum -= 1; });
    var bothOK = daySignals.filter(function(s) { return s.dual && s.dual.h && s.dual.e; }).length;
    var onlyEasy = daySignals.filter(function(s) { return s.dual && s.dual.e && !s.dual.h; }).length;
    var onlyHard = daySignals.filter(function(s) { return s.dual && s.dual.h && !s.dual.e; }).length;
    var wrIcon = wr >= 60 ? '🟢' : wr >= 45 ? '🟡' : '🔴';
    var rIcon = rSum >= 0 ? '📈' : '📉';
    var txt = '📊 <b>گزارش روزانه — ' + dayKey + '</b>\n\n';
    txt += '━━━━━━━━━━━━━━━\n';
    txt += '<b>📈 کل سیگنال:</b> ' + daySignals.length + '\n';
    txt += '✅ برد: <b>' + wins.length + '</b>\n';
    txt += '❌ باخت: <b>' + losses.length + '</b>\n';
    txt += '⏳ باز: ' + open.length + '\n';
    txt += '🚫 پر نشده (کنسل): ' + unfilled.length + '\n';
    txt += '⌛ منقضی (پر شده): ' + expired.length + '\n';
    txt += '━━━━━━━━━━━━━━━\n';
    txt += wrIcon + ' <b>وین ریت:</b> ' + wr + '% <i>(از ' + closed + ' معامله)</i>\n';
    txt += rIcon + ' <b>مجموع R:</b> ' + rSum.toFixed(2) + '\n';
    txt += '━━━━━━━━━━━━━━━\n';
    if (bothOK || onlyEasy || onlyHard) {
      txt += '\n🎚️ <b>تفکیک ارزیابی:</b>\n';
      if (bothOK) txt += '🏆 هر دو تأیید: ' + bothOK + '\n';
      if (onlyEasy) txt += '⚖️ فقط آسان: ' + onlyEasy + '\n';
      if (onlyHard) txt += '⚖️ فقط سخت: ' + onlyHard + '\n';
    }
    txt += '\n📋 <b>آخرین سیگنال‌ها:</b>\n';
    daySignals.slice(-10).forEach(function(s) {
      var ic = s.status === 'WIN' ? '✅' : s.status === 'LOSS' ? '❌' : s.status === 'OPEN' ? '⏳' : s.status === 'UNFILLED' ? '🚫' : '⌛';
      var t = new Date(s.t).toLocaleTimeString('fa-IR').slice(0, 5);
      txt += ic + ' ' + t + ' ' + s.sym + ' ' + s.dir + ' @' + s.entry;
      if (s.rr != null) txt += ' (' + (s.rr >= 0 ? '+' : '') + s.rr.toFixed(2) + 'R)';
      txt += '\n';
    });
    await sendMessage(token, chatId, txt, { inline_keyboard: [[{ text: '📊 وضعیت', callback_data: 'menu_status' }], [{ text: '📓 ژورنال', callback_data: 'menu_journal' }]] });
  } catch (e) { console.error('sendDailyReport:', e.message); }
}

// ============================================
// KEYBOARDS
// ============================================

function mainMenu() {
  return { inline_keyboard: [
    [{ text: '📊 تحلیل جدید', callback_data: 'menu_analyze' }, { text: '🎯 MTF', callback_data: 'menu_mtf' }],
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
    [{ text: '✏️ نماد دیگر', callback_data: 'sym_custom' }],
    [{ text: '🏠 منوی اصلی', callback_data: 'menu_main' }]
  ]};
}
function timeframeMenu(sr) {
  return { inline_keyboard: [
    [{ text: '🎯 MTF', callback_data: 'mtf_' + sr }],
    [{ text: '⏱️ 1 دقیقه', callback_data: 'tf_' + sr + '_1min' }, { text: '⏱️ 3 دقیقه', callback_data: 'tf_' + sr + '_3min' }],
    [{ text: '⏱️ 5 دقیقه', callback_data: 'tf_' + sr + '_5min' }, { text: '⏱️ 15 دقیقه', callback_data: 'tf_' + sr + '_15min' }],
    [{ text: '🕐 1 ساعت', callback_data: 'tf_' + sr + '_1h' }, { text: '📅 4 ساعت', callback_data: 'tf_' + sr + '_4h' }],
    [{ text: '◀️ بازگشت', callback_data: 'menu_analyze' }]
  ]};
}
function providerMenu(list, sr, tf, isMTF) {
  var b = []; var row = [];
  for (var i = 0; i < list.length; i++) {
    var p = list[i];
    var ic = { customvision:'⭐',gemini:'🌟',aiprime:'🅰️',groq:'⚡',openrouter:'🔀',mistral:'🌬️',github:'🐙',together:'🤝',gapgpt:'💎',huggingface:'🤗',cloudflare:'☁️',nvidia:'🟢',llm7:'🎁',avalai:'🇮🇷',metis:'🇮🇷',onexai:'🇮🇷' }[p] || '🤖';
    row.push({ text: ic + ' ' + (PROVIDER_NAMES[p] || p), callback_data: 'pvd_' + p + '_' + sr + '_' + (isMTF ? 'MTF' : tf) });
    if (row.length === 2) { b.push(row); row = []; }
  }
  if (row.length) b.push(row);
  b.push([{ text: '◀️ بازگشت', callback_data: isMTF ? 'menu_main' : 'menu_analyze' }]);
  return { inline_keyboard: b };
}
function journalMenu() { return { inline_keyboard: [
  [{ text: '📋 لیست معاملات', callback_data: 'journal_list' }, { text: '📊 آمار', callback_data: 'journal_stats' }],
  [{ text: '📅 گزارش روزانه', callback_data: 'journal_daily' }],
  [{ text: '🗑️ پاک کردن', callback_data: 'journal_clear' }],
  [{ text: '🏠 منو', callback_data: 'menu_main' }]
]}; }
function watchMenu() { return { inline_keyboard: [
  [{ text: '➕ هشدار', callback_data: 'watch_add' }],
  [{ text: '📋 لیست', callback_data: 'watch_list' }],
  [{ text: '🗑️ پاک کردن', callback_data: 'watch_clear' }],
  [{ text: '🏠 منو', callback_data: 'menu_main' }]
]}; }
function modeMenu(cur) { var m = function(x) { return cur === x ? ' ✅' : ''; }; return { inline_keyboard: [
  [{ text: '⚡ اسکلپی' + m('scalping'), callback_data: 'mode_scalping' }],
  [{ text: '⚖️ متوسط' + m('medium'), callback_data: 'mode_medium' }],
  [{ text: '🛡️ مطمئن' + m('confident'), callback_data: 'mode_confident' }],
  [{ text: '◀️ بازگشت', callback_data: 'menu_settings' }]
]}; }
function confluenceModeMenu(cur) { var m = function(x) { return cur === x ? ' ✅' : ''; }; return { inline_keyboard: [
  [{ text: '🔵 عادی' + m('normal'), callback_data: 'conf_normal' }],
  [{ text: '🟢 خودکار' + m('auto'), callback_data: 'conf_auto' }],
  [{ text: '🔴 اجبار' + m('force'), callback_data: 'conf_force' }],
  [{ text: '◀️ بازگشت', callback_data: 'menu_settings' }]
]}; }
function strictnessMenu(cur) { var m = function(x) { return cur === x ? ' ✅' : ''; }; return { inline_keyboard: [
  [{ text: '🔴 سختگیر' + m('hard'), callback_data: 'strict_hard' }],
  [{ text: '🟢 آسان' + m('easy'), callback_data: 'strict_easy' }],
  [{ text: '⚖️ هر دو' + m('both'), callback_data: 'strict_both' }],
  [{ text: '◀️ بازگشت', callback_data: 'menu_settings' }]
]}; }
function kzModeMenu(cur) { var m = function(x) { return cur === x ? ' ✅' : ''; }; return { inline_keyboard: [
  [{ text: '🌐 ۲۴/۷' + m('off'), callback_data: 'kz_off' }],
  [{ text: '⭐ اولویت KZ' + m('priority'), callback_data: 'kz_priority' }],
  [{ text: '🔒 فقط KZ' + m('only'), callback_data: 'kz_only' }],
  [{ text: '◀️ بازگشت', callback_data: 'menu_settings' }]
]}; }
function localFilterMenu(cur) { var m = function(x) { return cur === x ? ' ✅' : ''; }; return { inline_keyboard: [
  [{ text: '✅ فعال (صرفه‌جویی توکن)' + m('on'), callback_data: 'lf_on' }],
  [{ text: '❌ غیرفعال (هر کندل)' + m('off'), callback_data: 'lf_off' }],
  [{ text: '◀️ بازگشت', callback_data: 'menu_settings' }]
]}; }
function modelTierMenu(cur) { var m = function(x) { return cur === x ? ' ✅' : ''; }; return { inline_keyboard: [
  [{ text: '🚀 سریع' + m('fast'), callback_data: 'tier_fast' }],
  [{ text: '🧠 DeepSeek' + m('deepseek'), callback_data: 'tier_deepseek' }],
  [{ text: '💎 قوی' + m('premium'), callback_data: 'tier_premium' }],
  [{ text: '◀️ بازگشت', callback_data: 'menu_settings' }]
]}; }
function modelTierProviderMenu() { return { inline_keyboard: [
  [{ text: '🅰️ AIPrime', callback_data: 'tier_prov_aiprime' }],
  [{ text: '💎 GapGPT', callback_data: 'tier_prov_gapgpt' }],
  [{ text: '◀️ بازگشت', callback_data: 'menu_settings' }]
]}; }
function monitorMenu() { return { inline_keyboard: [
  [{ text: '➕ مانیتور جدید', callback_data: 'mon_add' }],
  [{ text: '📋 لیست مانیتورها', callback_data: 'mon_list' }],
  [{ text: '📖 راهنما', callback_data: 'mon_help' }],
  [{ text: '🏠 منو', callback_data: 'menu_main' }]
]}; }
function monitorSymbolMenu(isCrypto) {
  if (isCrypto) return { inline_keyboard: [
    [{ text: '₿ BTC/USD', callback_data: 'msym_BTCUSD' }, { text: 'Ξ ETH/USD', callback_data: 'msym_ETHUSD' }],
    [{ text: '◎ SOL/USD', callback_data: 'msym_SOLUSD' }, { text: '🟡 BNB/USD', callback_data: 'msym_BNBUSD' }],
    [{ text: '✕ XRP/USD', callback_data: 'msym_XRPUSD' }, { text: '🐕 DOGE/USD', callback_data: 'msym_DOGEUSD' }],
    [{ text: '✏️ نماد دیگر', callback_data: 'msym_custom' }],
    [{ text: '◀️ بازگشت', callback_data: 'menu_monitor' }]
  ]};
  return { inline_keyboard: [
    [{ text: '🥇 XAU/USD', callback_data: 'msym_XAUUSD' }, { text: '💶 EUR/USD', callback_data: 'msym_EURUSD' }],
    [{ text: '💷 GBP/USD', callback_data: 'msym_GBPUSD' }, { text: '💵 USD/JPY', callback_data: 'msym_USDJPY' }],
    [{ text: '🪙 کریپتو', callback_data: 'mon_crypto_list' }],
    [{ text: '✏️ نماد دیگر', callback_data: 'msym_custom' }],
    [{ text: '◀️ بازگشت', callback_data: 'menu_monitor' }]
  ]};
}
function monitorTfMenu(symRaw) {
  return { inline_keyboard: [
    [{ text: '⏱️ 1 دقیقه', callback_data: 'mtf2_' + symRaw + '_1min' }, { text: '⏱️ 3 دقیقه', callback_data: 'mtf2_' + symRaw + '_3min' }],
    [{ text: '⏱️ 5 دقیقه', callback_data: 'mtf2_' + symRaw + '_5min' }, { text: '⏱️ 15 دقیقه', callback_data: 'mtf2_' + symRaw + '_15min' }],
    [{ text: '🕐 1 ساعت', callback_data: 'mtf2_' + symRaw + '_1h' }, { text: '📅 4 ساعت', callback_data: 'mtf2_' + symRaw + '_4h' }],
    [{ text: '◀️ بازگشت', callback_data: 'mon_add' }]
  ]};
}
function monitorAiMenu(sym, tf) {
  return { inline_keyboard: [
    [{ text: '🤖 خودکار', callback_data: 'mai_auto_' + sym + '_' + tf }],
    [{ text: '🅰️ AIPrime', callback_data: 'mai_aiprime_' + sym + '_' + tf }, { text: '💎 GapGPT', callback_data: 'mai_gapgpt_' + sym + '_' + tf }],
    [{ text: '🌟 Gemini', callback_data: 'mai_gemini_' + sym + '_' + tf }, { text: '⚡ Groq', callback_data: 'mai_groq_' + sym + '_' + tf }],
    [{ text: '◀️ بازگشت', callback_data: 'mon_add' }]
  ]};
}
function monitorDataMenu(sym, tf, ai) {
  var isCrypto = isCryptoSymbol(sym);
  return { inline_keyboard: [
    [{ text: isCrypto ? '🟡 Binance (پیشنهاد)' : '📊 Twelve (پیشنهاد)', callback_data: 'mdp_' + (isCrypto ? 'binance' : 'twelve') + '_' + sym + '_' + tf + '_' + ai }],
    [{ text: '🔄 خودکار', callback_data: 'mdp_auto_' + sym + '_' + tf + '_' + ai }],
    [{ text: '◀️ بازگشت', callback_data: 'mon_add' }]
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
  for (var i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  return { base64: btoa(binary), size: bytes.length };
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
function buildConfBlock(conf, levels) {
  if (!conf) return '';
  var c = '';
  var score = conf.confluence != null ? conf.confluence : (levels ? levels.confluenceScore : null);
  if (score == null && conf.scores) {
    var sum = 0, cnt = 0;
    for (var k in conf.scores) if (typeof conf.scores[k] === 'number') { sum += conf.scores[k]; cnt++; }
    if (cnt) score = Math.round((sum / cnt / 10) * 10) / 10;
  }
  if (score != null) {
    var e = score >= 8 ? '🔥' : score >= 6 ? '✅' : score >= 4 ? '⚠️' : '❌';
    c += '\n<b>هم‌گرایی:</b> ' + e + ' <b>' + score + '/10</b>' + (conf.auto ? ' <i>(خودکار)</i>' : '') + '\n';
  }
  if (conf.scores) {
    c += '\n📌 <b>چیپ‌ها:</b>\n';
    for (var i = 0; i < CONF_KEYS.length; i++) {
      var v = conf.scores[CONF_KEYS[i]];
      if (v == null) c += '◯ ' + CONF_LABELS[CONF_KEYS[i]] + '\n';
      else { var ic = v >= 80 ? '🟢' : v >= 60 ? '🟡' : v >= 40 ? '🟠' : '🔴'; c += ic + ' ' + CONF_LABELS[CONF_KEYS[i]] + ' (' + v + ')\n'; }
    }
  }
  if (conf.warning) c += conf.warning;
  return c;
}
function buildDualEvalBlock(levels) {
  if (!levels.dualEval) return '';
  var h = levels.dualEval.hard, e = levels.dualEval.easy;
  var c = '\n🎚️ <b>ارزیابی دوگانه:</b>\n';
  c += '━━━━━━━━━━━━━━━\n';
  c += (h.approved ? '✅' : '❌') + ' <b>سختگیر:</b> ' + (h.approved ? 'تأیید' : 'رد');
  if (h.issues && h.issues.length && !h.approved) {
    var clean = h.issues[0].replace(/[❌⚠️]\s*/g, '').trim();
    c += '\n   <i>→ ' + esc(clean) + '</i>';
  }
  c += '\n';
  c += (e.approved ? '✅' : '❌') + ' <b>آسان:</b>    ' + (e.approved ? 'تأیید' : 'رد');
  if (e.issues && e.issues.length && !e.approved) {
    var clean2 = e.issues[0].replace(/[❌⚠️]\s*/g, '').trim();
    c += '\n   <i>→ ' + esc(clean2) + '</i>';
  }
  c += '\n━━━━━━━━━━━━━━━\n';
  if (h.approved && e.approved) c += '🏆 <b>هر دو تأیید</b> — بالاترین کیفیت';
  else if (e.approved && !h.approved) c += '⚠️ فقط آسان تأیید — با احتیاط';
  else if (h.approved && !e.approved) c += '⚠️ فقط سخت تأیید';
  else c += '❌ هیچ‌کدوم تأیید نکردن';
  c += '\n';
  return c;
}
function buildEntryTypeBlock(levels, currentPrice) {
  var et = detectEntryType(levels, currentPrice);
  if (et.type === 'N/A') return '';
  var c = '\n' + et.icon + ' <b>' + esc(et.action) + '</b> @ <code>' + esc(levels.entry) + '</code>\n';
  c += '   <i>' + esc(et.desc) + '</i>\n';
  if (currentPrice) c += '   📍 فعلی: <code>' + currentPrice.toFixed(2) + '</code>\n';
  return c;
}

function buildCaption(levels, symbol, tf, provider, conf, currentPrice) {
  var isCrypto = isCryptoSymbol(symbol);
  var symIcon = isCrypto ? '🪙' : '💱';
  var c = '<b>📊 تحلیل</b>\n\n<b>نماد:</b> ' + symIcon + ' ' + esc(symbol) + '\n<b>TF:</b> ' + timeframeLabel(tf) + '\n';
  if (provider) c += '<b>سرویس:</b> ' + esc(provider) + '\n';
  c += '<b>وضعیت:</b> ' + getKZBadge(symbol) + '\n\n';
  if (levels.dualEval) c += buildDualEvalBlock(levels);
  var d = levels.direction || 'WAIT';
  c += '\n<b>جهت:</b> ' + (d === 'BUY' ? '🟢 خرید' : d === 'SELL' ? '🔴 فروش' : '⏸️ انتظار') + '\n';
  if (levels.regime) c += '<b>رژیم:</b> ' + regimeLabel(levels.regime) + '\n';
  if (levels.confidence != null) c += '<b>اطمینان:</b> ' + esc(levels.confidence) + '%\n';
  if (d !== 'WAIT' && levels.entry != null && currentPrice) c += buildEntryTypeBlock(levels, currentPrice);
  c += '\n';
  if (d === 'WAIT') c += '<i>ستاپ معتبری نیست.</i>\n';
  else {
    if (levels.entry != null) c += '<b>🎯 ورود:</b> <code>' + esc(levels.entry) + '</code>\n';
    if (levels.sl != null) c += '<b>🛑 SL:</b> <code>' + esc(levels.sl) + '</code>\n';
    if (levels.tp1 != null) c += '<b>✅ TP1:</b> <code>' + esc(levels.tp1) + '</code>\n';
    if (levels.tp2 != null) c += '<b>✅ TP2:</b> <code>' + esc(levels.tp2) + '</code>\n';
    if (levels.tp3 != null) c += '<b>✅ TP3:</b> <code>' + esc(levels.tp3) + '</code>\n';
    if (levels.rr) c += '<b>⚖️ R/R:</b> <code>' + esc(levels.rr) + '</code>\n';
  }
  if (conf) c += buildConfBlock(conf, levels);
  return c;
}

function buildMTFCaption(levels, symbol, provider, conf, currentPrice) {
  var isCrypto = isCryptoSymbol(symbol);
  var symIcon = isCrypto ? '🪙' : '💱';
  var c = '<b>🎯 MTF</b>\n\n<b>نماد:</b> ' + symIcon + ' ' + esc(symbol) + '\n';
  if (provider) c += '<b>سرویس:</b> ' + esc(provider) + '\n';
  c += '<b>وضعیت:</b> ' + getKZBadge(symbol) + '\n\n';
  if (levels.dualEval) c += buildDualEvalBlock(levels);
  if (levels.htf || levels.mtf || levels.ltf || levels.entryTf) {
    c += '\n<b>📊 TF:</b>\n• 4H: ' + directionEmoji(levels.htf) + '\n• 1H: ' + directionEmoji(levels.mtf) + '\n• 15M: ' + directionEmoji(levels.ltf) + '\n• 1M: ' + directionEmoji(levels.entryTf) + '\n\n';
  }
  var d = levels.direction || 'WAIT';
  c += '<b>جهت:</b> ' + (d === 'BUY' ? '🟢 خرید' : d === 'SELL' ? '🔴 فروش' : '⏸️ انتظار') + '\n';
  if (levels.confidence != null) c += '<b>اطمینان:</b> ' + esc(levels.confidence) + '%\n';
  if (d !== 'WAIT' && levels.entry != null && currentPrice) c += buildEntryTypeBlock(levels, currentPrice);
  c += '\n';
  if (d !== 'WAIT') {
    if (levels.entry != null) c += '<b>🎯 ورود:</b> <code>' + esc(levels.entry) + '</code>\n';
    if (levels.sl != null) c += '<b>🛑 SL:</b> <code>' + esc(levels.sl) + '</code>\n';
    if (levels.tp1 != null) c += '<b>✅ TP1:</b> <code>' + esc(levels.tp1) + '</code>\n';
    if (levels.rr) c += '<b>⚖️ R/R:</b> <code>' + esc(levels.rr) + '</code>\n';
  }
  if (conf) c += buildConfBlock(conf, levels);
  return c;
}

function buildImageCaption(levels, provider, conf, currentPrice) {
  var c = '<b>📸 تحلیل تصویر</b>\n';
  if (provider) c += '<b>سرویس:</b> ' + esc(provider) + '\n';
  c += '\n';
  if (levels.detectedSymbol && levels.detectedSymbol !== 'UNKNOWN') c += '<b>نماد:</b> ' + esc(levels.detectedSymbol) + '\n';
  if (levels.dualEval) c += buildDualEvalBlock(levels);
  var d = levels.direction || 'WAIT';
  c += '\n<b>جهت:</b> ' + (d === 'BUY' ? '🟢 خرید' : d === 'SELL' ? '🔴 فروش' : '⏸️ انتظار') + '\n';
  if (levels.confidence != null) c += '<b>اطمینان:</b> ' + esc(levels.confidence) + '%\n';
  if (d !== 'WAIT' && levels.entry != null && currentPrice) c += buildEntryTypeBlock(levels, currentPrice);
  c += '\n';
  if (d !== 'WAIT') {
    if (levels.entry != null) c += '<b>🎯 ورود:</b> <code>' + esc(levels.entry) + '</code>\n';
    if (levels.sl != null) c += '<b>🛑 SL:</b> <code>' + esc(levels.sl) + '</code>\n';
    if (levels.tp1 != null) c += '<b>✅ TP1:</b> <code>' + esc(levels.tp1) + '</code>\n';
    if (levels.rr) c += '<b>⚖️ R/R:</b> <code>' + esc(levels.rr) + '</code>\n';
  }
  if (conf) c += buildConfBlock(conf, levels);
  return c;
}

// ============================================
// MENU VIEWS
// ============================================

async function showMainMenu(token, chatId, mid) {
  await sendOrEdit(token, chatId, mid, '🎯 <b>Everest v8.0</b>\n\n📊 Auto Journal + گزارش شبانه\n🌐 KZ Mode · 🪙 کریپتو · 🎯 Entry Type\n🔍 فیلتر محلی MSS/BOS\n⏳ Expiry Watchdog (UNFILLED/EXPIRED)\n⭐ Custom Vision API\n\nاز منو انتخاب کنید:', mainMenu());
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
  var j = await getJournal(env, chatId) || [];
  var t = '📓 <b>ژورنال (Auto)</b>\n\n';
  if (j.length) {
    var w = 0, l = 0, op = 0, uf = 0, pending = 0;
    for (var i = 0; i < j.length; i++) {
      if (j[i].status === 'WIN') w++;
      else if (j[i].status === 'LOSS') l++;
      else if (j[i].status === 'OPEN') { op++; if (!j[i].filled) pending++; }
      else if (j[i].status === 'UNFILLED') uf++;
    }
    t += '📈 ' + j.length + ' سیگنال ثبت‌شده\n✅ ' + w + ' برد · ❌ ' + l + ' باخت · ⏳ ' + op + ' باز';
    if (pending) t += ' (🚫 ' + pending + ' معلق)';
    t += '\n🚫 ' + uf + ' پر نشده\n\n';
    t += '<i>سیگنال‌های مانیتور خودکار ثبت می‌شن</i>';
  } else t += '<i>خالی — منتظر سیگنال مانیتور</i>';
  await sendOrEdit(token, chatId, mid, t, journalMenu());
}

async function showWatchMenu(token, chatId, mid, env) {
  var l = await getWatchlist(env, chatId);
  var t = '🔔 <b>هشدارها</b>\n\n';
  if (l.length) t += l.length + ' هشدار فعال\n';
  else t += '<i>خالی</i>\n\n';
  await sendOrEdit(token, chatId, mid, t, watchMenu());
}

async function showMonitorMenu(token, chatId, mid, env) {
  var list = await getMonitors(env, chatId);
  var t = '🤖 <b>مانیتور خودکار</b>\n\n';
  var lf = await getLocalFilter(env, chatId);
  var lfLabel = lf === 'on' ? '🔍 فیلتر محلی: ✅ فعال' : '🔍 فیلتر محلی: ❌ غیرفعال';
  if (list.length) {
    t += '📋 ' + list.length + ' مانیتور:\n\n';
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      var isCrypto = isCryptoSymbol(m.symbol);
      t += (m.active ? '🟢' : '⏸️') + ' #' + (i + 1) + ' ' + (isCrypto ? '🪙' : '💱') + ' <b>' + m.symbol + '</b> ' + timeframeLabel(m.timeframe) + '\n';
    }
    t += '\n' + lfLabel + '\n\n<i>هر سیگنال تأییدشده خودکار در ژورنال ثبت می‌شه</i>';
  } else {
    t += '⚪ <b>غیرفعال</b>\n\nهر کندل بسته بررسی می‌شه و در صورت ستاپ معتبر، سیگنال با نوع ورود دقیق می‌آید.\n\n' + lfLabel + '\n\n🆕 <b>Auto Journal + Expiry Watchdog:</b> همه سیگنال‌ها خودکار ثبت می‌شن. سفارش پر نشده → UNFILLED. سفارش پر شده که بسته نشه → EXPIRED.';
  }
  await sendOrEdit(token, chatId, mid, t, monitorMenu());
}

async function showMonitorList(token, chatId, mid, env) {
  var list = await getMonitors(env, chatId);
  if (!list.length) { await sendOrEdit(token, chatId, mid, '📋 خالی', { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_monitor' }]] }); return; }
  var b = list.map(function(m, i) {
    return [{ text: (m.active ? '🟢' : '⏸️') + ' #' + (i + 1) + ' ' + m.symbol + ' ' + timeframeLabel(m.timeframe), callback_data: 'mon_view_' + i }];
  });
  b.push([{ text: '◀️ بازگشت', callback_data: 'menu_monitor' }]);
  await sendOrEdit(token, chatId, mid, '📋 <b>لیست مانیتورها</b>', { inline_keyboard: b });
}

async function showMonitorView(token, chatId, mid, env, idx) {
  var list = await getMonitors(env, chatId);
  if (!list[idx]) { await sendOrEdit(token, chatId, mid, '❌', { inline_keyboard: [[{ text: '◀️', callback_data: 'mon_list' }]] }); return; }
  var m = list[idx];
  var isCrypto = isCryptoSymbol(m.symbol);
  var kzMode = m.kzMode || await getKzMode(env, chatId);
  var strict = m.strictness || await getStrictness(env, chatId);
  var mode = m.mode || await getUserMode(env, chatId);
  var cfg = MODE_CONFIG[mode];
  var stCfg = STRICTNESS_MODES[strict] || STRICTNESS_MODES.hard;
  var t = '🤖 <b>مانیتور #' + (idx + 1) + '</b>\n\n';
  t += '<b>نماد:</b> ' + (isCrypto ? '🪙' : '💱') + ' ' + m.symbol + '\n';
  t += '<b>TF:</b> ' + timeframeLabel(m.timeframe) + '\n';
  t += '<b>AI:</b> ' + (m.aiProvider === 'auto' ? '🤖 خودکار' : (PROVIDER_NAMES[m.aiProvider] || m.aiProvider)) + '\n';
  t += '<b>داده:</b> ' + ({ auto: '🔄', binance: '🟡 Binance', twelve: '📊 Twelve' }[m.dataProvider] || m.dataProvider) + '\n';
  t += '<b>وضعیت:</b> ' + (m.active ? '🟢 فعال' : '⏸️ متوقف') + '\n';
  t += '<b>حالت:</b> ' + cfg.icon + ' ' + cfg.label + '\n';
  t += '<b>نوع:</b> ' + stCfg.icon + ' ' + stCfg.label + '\n';
  t += '<b>KZ:</b> ' + KZ_MODES[kzMode].icon + ' ' + KZ_MODES[kzMode].label + '\n\n';
  t += '<b>📊 آمار:</b>\n• کل: ' + (m.signalCount || 0) + '\n• KZ: ' + (m.kzSignalCount || 0) + '\n';
  if (m.skippedCount) t += '• skip: ' + m.skippedCount + '\n';
  if (m.lastSignal) t += '• آخرین: ' + m.lastSignal.dir + ' @ ' + m.lastSignal.entry + '\n';
  if (m.lastCheckAt) { var mins = Math.floor((Date.now() - m.lastCheckAt) / 60000); t += '• آخرین بررسی: ' + mins + ' دقیقه پیش\n'; }
  if (m.lastError) t += '\n⚠️ خطا: <code>' + esc(m.lastError) + '</code>\n';
  await sendOrEdit(token, chatId, mid, t, { inline_keyboard: [
    [{ text: m.active ? '⏸️ توقف' : '▶️ شروع', callback_data: 'mon_toggle_' + idx }],
    [{ text: '🔄 شروع مجدد', callback_data: 'mon_restart_' + idx }],
    [{ text: '🗑️ حذف', callback_data: 'mon_del_' + idx }],
    [{ text: '◀️', callback_data: 'mon_list' }]
  ]});
}

async function showSettingsMenu(token, chatId, mid, env) {
  var cm = await getConfluenceMode(env, chatId);
  var cl = cm === 'force' ? '🔴' : cm === 'auto' ? '🟢' : '🔵';
  var um = await getUserMode(env, chatId);
  var uc = MODE_CONFIG[um];
  var aT = await getUserModelTier(env, chatId, 'aiprime');
  var gT = await getUserModelTier(env, chatId, 'gapgpt');
  var aL = aT === 'premium' ? '💎' : aT === 'deepseek' ? '🧠' : '🚀';
  var gL = gT === 'premium' ? '💎' : gT === 'deepseek' ? '🧠' : '🚀';
  var st = await getStrictness(env, chatId);
  var stCfg = STRICTNESS_MODES[st];
  var kz = await getKzMode(env, chatId);
  var lf = await getLocalFilter(env, chatId);
  var lfIcon = lf === 'on' ? '🔍 فعال' : '🔍 غیرفعال';
  var cvReady = isCustomVisionReady(env) ? '⭐ ✅' : '⭐ ❌';
  var text = '⚙️ <b>تنظیمات v8.0</b>\n\n' +
    '<b>🎚️ نوع:</b> ' + stCfg.icon + ' ' + stCfg.label + '\n' +
    '<i>' + stCfg.desc + '</i>\n\n' +
    '<b>⚙️ KZ Mode:</b> ' + KZ_MODES[kz].icon + ' ' + KZ_MODES[kz].label + '\n' +
    '<b>🎯 حالت:</b> ' + uc.icon + ' ' + uc.label + '\n' +
    '<b>🧠 هم‌گرایی:</b> ' + cl + '\n' +
    '<b>' + lfIcon + '</b>\n' +
    '<b>Custom Vision:</b> ' + cvReady + '\n' +
    '<b>مدل:</b> A ' + aL + ' · G ' + gL;
  await sendOrEdit(token, chatId, mid, text, {
    inline_keyboard: [
      [{ text: '🎚️ نوع تحلیل', callback_data: 'settings_strict' }],
      [{ text: '⚙️ KZ Mode', callback_data: 'settings_kz' }],
      [{ text: '🎯 حالت معاملاتی', callback_data: 'settings_mode' }],
      [{ text: '🧠 هم‌گرایی', callback_data: 'settings_confluence' }],
      [{ text: '🔍 فیلتر محلی', callback_data: 'settings_localfilter' }],
      [{ text: '🎚️ سطح مدل', callback_data: 'settings_tier' }],
      [{ text: '🏠', callback_data: 'menu_main' }]
    ]
  });
}

async function showStatus(token, chatId, mid, env) {
  var all = ['customvision','gemini','aiprime','groq','github','together','gapgpt','openrouter','mistral','huggingface','cloudflare','nvidia','llm7','avalai','metis','onexai'];
  var text = '📈 <b>وضعیت v8.0</b>\n\n';
  var active = 0;
  for (var i = 0; i < all.length; i++) {
    var p = all[i]; var hasKey;
    if (p === 'customvision') hasKey = isCustomVisionReady(env);
    else if (p === 'gemini') hasKey = getGeminiKeys(env).length > 0;
    else if (p === 'llm7') hasKey = true;
    else hasKey = !!getKey(env, p);
    if (hasKey) active++;
    text += (hasKey ? '✅' : '❌') + ' ' + PROVIDER_NAMES[p] + '\n';
  }
  text += '\n🎯 ' + active + '/' + all.length + '\n';
  text += '📊 Twelve: ' + (env.TWELVE_KEY ? '✅' : '❌') + '\n';
  text += '🪙 Binance: ✅\n';
  text += '💾 KV: ' + (env.KV ? '✅' : '❌') + '\n';
  text += '📓 Journal: ' + (env.KV ? '✅ Auto' : '❌') + '\n';
  var lf = await getLocalFilter(env, chatId);
  text += '🔍 Local Filter: ' + (lf === 'on' ? '✅' : '❌') + '\n';
  text += '⏳ Watchdog: ' + (env.KV ? '✅ هر دقیقه' : '❌') + '\n';
  text += '⭐ Vision Strict: ' + (VISION_STRICT ? '✅' : '❌');
  await sendOrEdit(token, chatId, mid, text, { inline_keyboard: [[{ text: '🏠', callback_data: 'menu_main' }]] });
}

async function showHelp(token, chatId, mid) {
  var t = '📖 <b>راهنما v8.0</b>\n\n' +
    '📊 <b>Auto Journal:</b>\nهر سیگنال تأییدشده خودکار ثبت می‌شه.\n\n' +
    '⏳ <b>Expiry Watchdog:</b>\nدو نوع انقضا داریم:\n' +
    '• 🚫 <b>UNFILLED</b> = سفارش لیمیت که پر نشد\n' +
    '  TTL: 1m→20 · 3m→15 · 5m→12 · 15m→10 · 1h→8 · 4h→6 کندل\n' +
    '• ⌛ <b>EXPIRED</b> = سفارش پر شد ولی SL/TP نزد\n' +
    '  TTL: 1m→40 · 5m→24 · 15m→20 · 1h→16 · 4h→12 کندل\n\n' +
    '📈 <b>وین‌ریت:</b> فقط از WIN+LOSS محاسبه می‌شه\n' +
    '(UNFILLED و EXPIRED خارج از آمار)\n\n' +
    '⭐ <b>Vision:</b> Gemini → GapGPT → AIPrime\n\n' +
    '🎚️ <b>نوع:</b> 🔴 سختگیر · 🟢 آسان · ⚖️ هر دو\n\n' +
    '<b>دستورات:</b>\n/menu /monitor /analyze /journal /watch /status';
  await sendOrEdit(token, chatId, mid, t, { inline_keyboard: [[{ text: '🏠', callback_data: 'menu_main' }]] });
}

async function showMonitorHelp(token, chatId, mid) {
  var t = '📖 <b>راهنمای مانیتور v8.0</b>\n\n' +
    '🤖 هر کندل بسته، بازار تحلیل می‌شه.\n\n' +
    '🔍 <b>فیلتر محلی MSS/BOS:</b>\nصرفه‌جویی زیاد توکن.\n\n' +
    '📓 <b>Auto Journal + Watchdog:</b>\nسیگنال‌ها خودکار ثبت می‌شن:\n' +
    '• سفارش لیمیت پر نشد → 🚫 UNFILLED\n' +
    '• سفارش پر شد ولی به TP/SL نرسید → ⌛ EXPIRED\n\n' +
    '⏳ <b>TTL انقضای سفارش پر نشده:</b>\n' +
    '• 1m: ۲۰ کندل\n• 3m: ۱۵\n• 5m: ۱۲\n• 15m: ۱۰\n• 1h: ۸\n• 4h: ۶\n\n' +
    '⏰ <b>TTL سفارش پرشده:</b>\n' +
    '• 1m: ۴۰\n• 5m: ۲۴\n• 15m: ۲۰\n• 1h: ۱۶\n• 4h: ۱۲\n\n' +
    '🎯 <b>آستانه‌ها:</b>\n• اسکلپی: CF ≥ 5.0\n• متوسط: CF ≥ 4.5\n• مطمئن: CF ≥ 6.0';
  await sendOrEdit(token, chatId, mid, t, { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_monitor' }]] });
}

async function showImageGuide(token, chatId, mid) {
  await sendOrEdit(token, chatId, mid, '📸 <b>تحلیل تصویر</b>\n\nعکس چارت بفرستید!\n\n⭐ Gemini → GapGPT → AIPrime', { inline_keyboard: [[{ text: '🏠', callback_data: 'menu_main' }]] });
}

// ============================================
// JOURNAL VIEWS
// ============================================

async function showJournalList(token, chatId, env) {
  var j = await getJournal(env, chatId) || [];
  if (!j.length) { await sendMessage(token, chatId, '📓 خالی', { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_journal' }]] }); return; }
  var t = '<b>📓 آخرین سیگنال‌ها</b>\n\n';
  var recent = j.slice(-15).reverse();
  for (var i = 0; i < recent.length; i++) {
    var x = recent[i];
    var ic = x.status === 'WIN' ? '✅' : x.status === 'LOSS' ? '❌' : x.status === 'OPEN' ? '⏳' : x.status === 'UNFILLED' ? '🚫' : '⌛';
    var time = new Date(x.t).toLocaleTimeString('fa-IR').slice(0, 5);
    t += ic + ' ' + time + ' ' + esc(x.sym) + ' ' + esc(x.dir) + ' @' + x.entry;
    if (x.status === 'OPEN' && !x.filled) {
      var info = getExpiryInfo(x);
      if (info.remainingMs > 0) t += ' <i>(' + formatRemainingTime(info.remainingMs) + ' مونده)</i>';
    }
    if (x.status === 'OPEN' && x.filled) {
      var finfo = getFilledExpiryInfo(x);
      if (finfo.remainingMs > 0) t += ' <i>(open · ' + formatRemainingTime(finfo.remainingMs) + ')</i>';
    }
    if (x.rr != null) t += ' (' + (x.rr >= 0 ? '+' : '') + x.rr.toFixed(2) + 'R)';
    t += '\n';
  }
  await sendMessage(token, chatId, t, { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_journal' }]] });
}

async function showJournalStats(token, chatId, env) {
  var j = await getJournal(env, chatId) || [];
  if (!j.length) { await sendMessage(token, chatId, '📓 خالی', { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_journal' }]] }); return; }
  var w = 0, l = 0, op = 0, ex = 0, uf = 0, rSum = 0;
  for (var i = 0; i < j.length; i++) {
    var x = j[i];
    if (x.status === 'WIN') { w++; rSum += (x.rr || 0); }
    else if (x.status === 'LOSS') { l++; rSum -= 1; }
    else if (x.status === 'OPEN') op++;
    else if (x.status === 'UNFILLED') uf++;
    else ex++;
  }
  var cl = w + l;
  var wr = cl ? Math.round(w / cl * 100) : 0;
  var t = '<b>📊 آمار کل</b>\n\n📈 کل: <b>' + j.length + '</b>\n✅ برد: <b>' + w + '</b>\n❌ باخت: <b>' + l + '</b>\n⏳ باز: <b>' + op + '</b>\n🚫 پر نشده: <b>' + uf + '</b>\n⌛ منقضی: <b>' + ex + '</b>\n\n🎯 وین ریت: <b>' + wr + '%</b> <i>(از ' + cl + ' معامله)</i>\n⚖️ مجموع R: <b>' + rSum.toFixed(2) + '</b>';
  await sendMessage(token, chatId, t, { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_journal' }]] });
}

async function showJournalDaily(token, chatId, env) {
  var j = await getJournal(env, chatId) || [];
  var todayTehran = new Date(Date.now() + 3.5 * 3600 * 1000).toISOString().slice(0, 10);
  var day = j.filter(function(s) { return s.day === todayTehran; });
  if (!day.length) { await sendMessage(token, chatId, '📅 امروز سیگنالی نداری', { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_journal' }]] }); return; }
  var w = day.filter(function(s) { return s.status === 'WIN'; }).length;
  var l = day.filter(function(s) { return s.status === 'LOSS'; }).length;
  var op = day.filter(function(s) { return s.status === 'OPEN'; }).length;
  var uf = day.filter(function(s) { return s.status === 'UNFILLED'; }).length;
  var ex = day.filter(function(s) { return s.status === 'EXPIRED'; }).length;
  var rSum = 0;
  day.forEach(function(s) { if (s.status === 'WIN') rSum += (s.rr || 0); else if (s.status === 'LOSS') rSum -= 1; });
  var cl = w + l;
  var wr = cl ? Math.round(w / cl * 100) : 0;
  var t = '<b>📅 گزارش امروز — ' + todayTehran + '</b>\n\n📈 کل: <b>' + day.length + '</b>\n✅ برد: ' + w + '\n❌ باخت: ' + l + '\n⏳ باز: ' + op + '\n🚫 پر نشده: ' + uf + '\n⌛ منقضی: ' + ex + '\n\n🎯 وین ریت: <b>' + wr + '%</b>\n⚖️ مجموع R: <b>' + rSum.toFixed(2) + '</b>';
  await sendMessage(token, chatId, t, { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_journal' }]] });
}

// ============================================
// ANALYSIS RUNNERS
// ============================================

async function runAnalysis(token, chatId, symbol, env, tf, forcedProvider) {
  try {
    var pl = forcedProvider ? (PROVIDER_NAMES[forcedProvider] || forcedProvider) : 'خودکار';
    var mode = await getConfluenceMode(env, chatId);
    var um = await getUserMode(env, chatId);
    var uc = MODE_CONFIG[um];
    var st = await getStrictness(env, chatId);
    var kzMode = await getKzMode(env, chatId);
    var isCrypto = isCryptoSymbol(symbol);

    if (uc.allowedTFs.indexOf(tf) === -1) {
      await sendMessage(token, chatId, '⚠️ TF مجاز نیست. مجاز: ' + uc.allowedTFs.map(timeframeLabel).join(', '), { inline_keyboard: [[{ text: '⚙️', callback_data: 'menu_settings' }]] });
      return;
    }

    await sendMessage(token, chatId, '⏳ <b>' + symbol + '</b>\n🤖 ' + pl + '\n🎯 ' + uc.icon + ' · 🎚️ ' + STRICTNESS_MODES[st].icon + ' · ⚙️ ' + KZ_MODES[kzMode].icon);

    var klines = await fetchMarketData(symbol, tf, env);
    klines = dropForming(klines, tf);
    var currentPrice = klines[klines.length - 1].close;
    var atr = calcATR(klines, 14);

    var body = 'نماد: ' + symbol + '\nTF: ' + TF_LABELS[tf] + '\n\n' + klinesToText(klines, symbol, TF_LABELS[tf]);
    var fullPrompt = buildPromptForMode(SYSTEM_PROMPT, mode);
    if (isCrypto) fullPrompt += CRYPTO_NOTE;
    fullPrompt += '\n\n' + body;

    var result;
    if (forcedProvider && PROVIDER_FUNCS[forcedProvider]) {
      try {
        var txt = await withTimeout(PROVIDER_FUNCS[forcedProvider](env, fullPrompt, null, null, chatId), 30000, forcedProvider);
        if (txt && txt.length > 10) result = { text: txt, provider: PROVIDER_NAMES[forcedProvider] };
        else throw new Error('پاسخ کوتاه');
      } catch (e) {
        await sendMessage(token, chatId, '❌ ' + forcedProvider + ': ' + e.message);
        result = await callWithFallback(env, fullPrompt, null, null, chatId);
      }
    } else result = await callWithFallback(env, fullPrompt, null, null, chatId);

    var levels = validateSignal(extractLevels(result.text), {
      strict: st, minRR: uc.minRR, minConfidence: uc.minConfidence,
      atr: atr, price: currentPrice
    });
    levels._atr = atr;
    var conf = await resolveConfluence(env, chatId, levels, result.text);

    await sendMessage(token, chatId, buildCaption(levels, symbol, TF_LABELS[tf], result.provider, conf, currentPrice));
    var ft = tgFormat(result.text);
    if (ft.length) for (var i = 0; i < ft.length; i += 3800) { await sendMessage(token, chatId, ft.slice(i, i + 3800)); await sleep(300); }
    await sendMessage(token, chatId, '🏠', { inline_keyboard: [[{ text: '🏠', callback_data: 'menu_main' }]] });
  } catch (e) { await sendMessage(token, chatId, '❌ <code>' + esc(e.message) + '</code>'); }
}

async function runMultiTFAnalysis(token, chatId, symbol, env, forcedProvider) {
  try {
    var pl = forcedProvider ? (PROVIDER_NAMES[forcedProvider] || forcedProvider) : 'خودکار';
    var mode = await getConfluenceMode(env, chatId);
    var st = await getStrictness(env, chatId);
    var um = await getUserMode(env, chatId);
    var uc = MODE_CONFIG[um];
    var isCrypto = isCryptoSymbol(symbol);

    await sendMessage(token, chatId, '🎯 MTF <b>' + symbol + '</b>\n🤖 ' + pl);

    var k4 = await fetchMarketData(symbol, '4h', env);
    var k1 = await fetchMarketData(symbol, '1h', env);
    var k15 = await fetchMarketData(symbol, '15min', env);
    var k1m = await fetchMarketData(symbol, '1min', env);
    k4 = dropForming(k4, '4h'); k1 = dropForming(k1, '1h'); k15 = dropForming(k15, '15min'); k1m = dropForming(k1m, '1min');
    var currentPrice = k1[k1.length - 1].close;
    var atr = calcATR(k15, 14);

    var p = 'نماد: ' + symbol + '\n\n4H:\n' + klinesToText(k4, symbol, '4H') + '\n\n1H:\n' + klinesToText(k1, symbol, '1H') + '\n\n15M:\n' + klinesToText(k15, symbol, '15M') + '\n\n1M:\n' + klinesToText(k1m, symbol, '1M');
    var fullPrompt = buildPromptForMode(MULTI_TF_PROMPT, mode);
    if (isCrypto) fullPrompt += CRYPTO_NOTE;
    fullPrompt += '\n\n' + p;

    var result;
    if (forcedProvider && PROVIDER_FUNCS[forcedProvider]) {
      try {
        var txt = await withTimeout(PROVIDER_FUNCS[forcedProvider](env, fullPrompt, null, null, chatId), 30000, forcedProvider);
        if (txt && txt.length > 10) result = { text: txt, provider: PROVIDER_NAMES[forcedProvider] };
        else throw new Error('کوتاه');
      } catch (e) { result = await callWithFallback(env, fullPrompt, null, null, chatId); }
    } else result = await callWithFallback(env, fullPrompt, null, null, chatId);

    var levels = validateSignal(extractLevels(result.text), {
      strict: st, minRR: uc.minRR, minConfidence: uc.minConfidence, atr: atr, price: currentPrice
    });
    levels._atr = atr;
    var conf = await resolveConfluence(env, chatId, levels, result.text);

    await sendMessage(token, chatId, buildMTFCaption(levels, symbol, result.provider, conf, currentPrice));
    var ft = tgFormat(result.text);
    if (ft.length) for (var i = 0; i < ft.length; i += 3800) { await sendMessage(token, chatId, ft.slice(i, i + 3800)); await sleep(300); }
    await sendMessage(token, chatId, '🏠', { inline_keyboard: [[{ text: '🏠', callback_data: 'menu_main' }]] });
  } catch (e) { await sendMessage(token, chatId, '❌ MTF: <code>' + esc(e.message) + '</code>'); }
}

async function runImageAnalysis(token, chatId, photoFileId, env) {
  try {
    var mode = await getConfluenceMode(env, chatId);
    var st = await getStrictness(env, chatId);
    var um = await getUserMode(env, chatId);
    var uc = MODE_CONFIG[um];

    await sendMessage(token, chatId, '📸 دریافت تصویر...');
    var pd = await downloadTelegramPhoto(token, photoFileId);
    if (pd.size > 5 * 1024 * 1024) { await sendMessage(token, chatId, '❌ > ۵MB'); return; }
    await sendMessage(token, chatId, '⭐ تحلیل با Gemini → GapGPT → AIPrime...');

    var fullPrompt = buildPromptForMode(IMAGE_PROMPT, mode);
    var result = await callWithFallback(env, fullPrompt, pd.base64, 'image/jpeg', chatId);
    var levels = validateSignal(extractLevels(result.text), { strict: st, minRR: uc.minRR, minConfidence: uc.minConfidence });
    var conf = await resolveConfluence(env, chatId, levels, result.text);
    await sendMessage(token, chatId, buildImageCaption(levels, result.provider, conf, null));

    var clean = result.text.replace(/```json[\s\S]*?```/gi, '').replace(/```[\s\S]*?```/g, '');
    var ft = tgFormat(clean);
    if (ft.length > 20) for (var i = 0; i < ft.length; i += 3800) { await sendMessage(token, chatId, ft.slice(i, i + 3800)); await sleep(400); }
    await sendMessage(token, chatId, '🏠', { inline_keyboard: [[{ text: '🏠', callback_data: 'menu_main' }]] });
  } catch (e) { await sendMessage(token, chatId, '❌ <code>' + esc(e.message) + '</code>'); }
}

// ============================================
// MONITOR WIZARD
// ============================================

async function startMonitorWizard(token, chatId, env) {
  await setUserState(env, chatId, { action: 'mon_add', step: 'symbol', data: {} });
  await sendOrEdit(token, chatId, null, '🤖 <b>مانیتور جدید</b>\n\nمرحله ۱/۴ — <b>نماد:</b>', monitorSymbolMenu(false));
}

async function finishMonitorSetup(token, chatId, mid, symbol, tf, ai, dp, env) {
  var strict = await getStrictness(env, chatId);
  var mode = await getUserMode(env, chatId);
  var kzMode = await getKzMode(env, chatId);
  var list = await getMonitors(env, chatId);
  list.push({
    symbol: symbol, timeframe: tf, aiProvider: ai, dataProvider: dp,
    mode: mode, strictness: strict, kzMode: kzMode,
    active: true, startAt: Date.now(), lastCheckAt: 0,
    signalCount: 0, kzSignalCount: 0, skippedCount: 0,
    lastSignal: null, lastSignalKey: null, lastError: null
  });
  await saveMonitors(env, chatId, list);
  var isCrypto = isCryptoSymbol(symbol);
  var aiLabel = ai === 'auto' ? '🤖 خودکار' : (PROVIDER_NAMES[ai] || ai);
  var dpLabel = { auto: '🔄 خودکار', binance: '🟡 Binance', twelve: '📊 Twelve' }[dp] || dp;
  var stCfg = STRICTNESS_MODES[strict];
  var cfg = MODE_CONFIG[mode];
  var msg = '✅ <b>مانیتور فعال شد</b>\n\n' +
    '<b>نماد:</b> ' + (isCrypto ? '🪙' : '💱') + ' ' + symbol + '\n' +
    '<b>TF:</b> ' + timeframeLabel(tf) + '\n' +
    '<b>AI:</b> ' + aiLabel + '\n' +
    '<b>داده:</b> ' + dpLabel + '\n' +
    '<b>حالت:</b> ' + cfg.icon + ' ' + cfg.label + '\n' +
    '<b>نوع:</b> ' + stCfg.icon + ' ' + stCfg.label + '\n' +
    '<b>KZ:</b> ' + KZ_MODES[kzMode].icon + ' ' + KZ_MODES[kzMode].label + '\n\n' +
    '🎯 آستانه CF: <b>' + cfg.minConfluence + '</b>\n' +
    '⏳ کنسلی سفارش پر نشده: <b>' + getExpiryTTL(tf) + ' کندل</b>\n' +
    '⏰ انقضای سفارش پرشده: <b>' + getFilledTimeoutTTL(tf) + ' کندل</b>\n' +
    '📓 سیگنال‌ها خودکار در ژورنال ثبت می‌شن\n' +
    '🔔 در هر دو حالت بهت اطلاع می‌دیم';
  await sendOrEdit(token, chatId, mid, msg, { inline_keyboard: [
    [{ text: '📋 لیست', callback_data: 'mon_list' }],
    [{ text: '🏠 منو', callback_data: 'menu_main' }]
  ]});
}

// ============================================
// CRON MONITOR CHECK
// ============================================

async function checkAllMonitors(env) {
  try {
    var token = env.TG_TOKEN;
    var list = await env.KV.list({ prefix: 'monitors:' });
    var now = Date.now();

    var tehran = new Date(Date.now() + 3.5 * 3600 * 1000);
    var tehranH = tehran.getUTCHours();
    var tehranM = tehran.getUTCMinutes();
    var dayKey = tehran.toISOString().slice(0, 10);
    var yesterdayKey = new Date(Date.now() + 3.5 * 3600 * 1000 - 24 * 3600 * 1000).toISOString().slice(0, 10);
    var shouldReport = (tehranH === 23 && tehranM >= 30 && tehranM < 35);

    for (var ki = 0; ki < list.keys.length; ki++) {
      var key = list.keys[ki].name;
      var chatId = key.replace('monitors:', '');
      var monitors = await env.KV.get(key, 'json') || [];

      var yKey = 'dailyreport:' + chatId + ':' + yesterdayKey;
      var ySent = await env.KV.get(yKey);
      if (!ySent) {
        try {
          var journalAll = await getJournal(env, chatId) || [];
          var hasYesterday = journalAll.some(function(s) { return s.day === yesterdayKey; });
          if (hasYesterday) {
            await sendDailyReport(env, chatId, yesterdayKey);
            await env.KV.put(yKey, '1', { expirationTtl: 86400 * 7 });
          }
        } catch (e) { console.error('Catchup report: ' + e.message); }
      }

      if (!monitors.length) continue;

      var defaultStrict = await getStrictness(env, chatId);
      var defaultMode = await getUserMode(env, chatId);
      var defaultKzMode = await getKzMode(env, chatId);
      var localFilter = await getLocalFilter(env, chatId);

      var changed = false;
      for (var i = 0; i < monitors.length; i++) {
        var m = monitors[i];
        if (!m.active) continue;

        var tfMs = (TF_MINUTES[m.timeframe] || 5) * 60 * 1000;
        if (m.lastCheckAt && (now - m.lastCheckAt) < tfMs * 0.9) continue;

        var strict = m.strictness || defaultStrict;
        var mode = m.mode || defaultMode;
        var kzMode = m.kzMode || defaultKzMode;
        var cfg = MODE_CONFIG[mode];

        var kzCheck = shouldCheckNow(m.symbol, kzMode);
        if (!kzCheck.ok) {
          m.lastCheckAt = now;
          m.skippedCount = (m.skippedCount || 0) + 1;
          changed = true;
          continue;
        }

        try {
          await runMonitorForUser(env, token, chatId, m, strict, mode, cfg, localFilter);
          m.lastCheckAt = Date.now();
          m.lastError = null;
          changed = true;
        } catch (e) {
          console.error('Monitor ' + chatId + ': ' + e.message);
          m.lastCheckAt = Date.now();
          m.lastError = String(e.message).slice(0, 200);
          changed = true;
        }
        await sleep(400);
      }

      if (changed) await env.KV.put(key, JSON.stringify(monitors));

      if (shouldReport) {
        var reportKey = 'dailyreport:' + chatId + ':' + dayKey;
        var already = await env.KV.get(reportKey);
        if (!already) {
          try {
            await sendDailyReport(env, chatId, dayKey);
            await env.KV.put(reportKey, '1', { expirationTtl: 86400 * 7 });
          } catch (e) { console.error('Night report: ' + e.message); }
        }
      }
    }
  } catch (e) { console.error('checkAllMonitors: ' + e.message); }
}

async function runMonitorForUser(env, token, chatId, m, strict, mode, cfg, localFilter) {
  var symbol = m.symbol;
  var tf = m.timeframe;
  var isCrypto = isCryptoSymbol(symbol);

  var klines = await fetchMarketData(symbol, tf, env, m.dataProvider || 'auto');
  if (!klines || klines.length < 30) return;
  klines = dropForming(klines, tf);

  try {
    await resolveJournalForChat(env, chatId, klines, symbol, tf);
  } catch (e) { console.error('resolveJournal in monitor: ' + e.message); }

  if (localFilter === 'on') {
    var ls = localStructure(klines, 5);
    if (!ls.fresh) {
      m.skippedCount = (m.skippedCount || 0) + 1;
      return;
    }
  }

  var currentPrice = klines[klines.length - 1].close;
  var atr = calcATR(klines, 14);

  var promptBody = 'نماد: ' + symbol + '\nتایم‌فریم: ' + timeframeLabel(tf) + '\nقیمت فعلی: ' + currentPrice + '\n\n' + klinesToText(klines, symbol, timeframeLabel(tf));
  var facts = '\n\n🧮 محلی:\n- ATR(14)=' + (atr ? atr.toFixed(4) : '?') + '\n';
  if (isCrypto) {
    var w = getCryptoLiquidityWindow();
    facts += '- 🪙 کریپتو: ' + (w.high ? 'لیکویید بالا' : w.active ? 'لیکویید متوسط' : 'لیکویید پایین') + '\n';
  } else {
    var kz = getKillZoneInfo();
    facts += '- ' + (kz.active ? '⚠️ داخل KZ — اولویت بالا' : '⚠️ خارج KZ — احتیاط') + '\n';
  }

  var confMode = await getConfluenceMode(env, chatId);
  var sysPrompt = buildPromptForMode(SYSTEM_PROMPT, confMode);
  if (isCrypto) sysPrompt += CRYPTO_NOTE;
  var fullPrompt = sysPrompt + '\n\n' + promptBody + facts;

  var result;
  var forcedProvider = m.aiProvider && m.aiProvider !== 'auto' ? m.aiProvider : null;
  if (forcedProvider && PROVIDER_FUNCS[forcedProvider]) {
    try {
      var txt = await withTimeout(PROVIDER_FUNCS[forcedProvider](env, fullPrompt, null, null, chatId), 30000, forcedProvider);
      if (txt && txt.length > 10) result = { text: txt, provider: PROVIDER_NAMES[forcedProvider] };
      else throw new Error('کوتاه');
    } catch (e) { result = await callWithFallback(env, fullPrompt, null, null, chatId); }
  } else result = await callWithFallback(env, fullPrompt, null, null, chatId);

  var levels = validateSignal(extractLevels(result.text), {
    strict: strict, minRR: cfg.minRR, minConfidence: cfg.minConfidence,
    atr: atr, price: currentPrice
  });
  levels._atr = atr;
  var confluence = await resolveConfluence(env, chatId, levels, result.text);

  var ok = isSignalConfirmed(levels, confluence, strict, cfg);

  var tol = (atr || 0) * 0.5;
  var p = m.lastSignal;
  var dup = ok && p && p.dir === levels.direction && Math.abs(p.entry - levels.entry) <= tol && (Date.now() - p.t) < (TF_MINUTES[tf] || 5) * 60000 * 2;

  console.log('[MON ' + chatId + '] ' + symbol + ' ' + tf + ' | dir=' + levels.direction + ' conf=' + levels.confidence + ' rr=' + (levels.rr || '—') + ' cf=' + (confluence && confluence.confluence != null ? confluence.confluence : '—') + ' | ' + (ok ? (dup ? 'DUP' : 'SIGNAL ✅') : 'skip'));

  if (ok && !dup) {
    m.lastSignal = { dir: levels.direction, entry: levels.entry, t: Date.now() };
    m.signalCount = (m.signalCount || 0) + 1;
    var kzActive = isCrypto ? getCryptoLiquidityWindow().active : getKillZoneInfo().active;
    if (kzActive) m.kzSignalCount = (m.kzSignalCount || 0) + 1;
    m.lastSignalKey = levels.direction + '_' + levels.entry + '_' + levels.sl;

    await autoJournalAdd(env, chatId, levels, result.provider, symbol, tf, currentPrice);
    await sendMonitorSignal(token, chatId, levels, confluence, result, currentPrice, symbol, tf);
  }
}

function isSignalConfirmed(levels, confluence, strict, cfg) {
  if (levels.direction !== 'BUY' && levels.direction !== 'SELL') return false;
  if (!levels.entry || !levels.sl) return false;

  var minConf = cfg.minConfidence;
  var minRR = cfg.minRR;
  var minCF = cfg.minConfluence;

  if (strict === 'easy') {
    minConf = Math.max(55, minConf - 5);
    minRR = Math.max(1.0, minRR * 0.7);
    minCF = Math.max(3.5, minCF - 2);
  }

  if (levels.confidence == null || levels.confidence < minConf) return false;

  if (levels.rr) {
    var rr = parseFloat(String(levels.rr).replace('1:', ''));
    if (!isNaN(rr) && rr < minRR) return false;
  } else if (strict === 'hard') {
    return false;
  }

  if (strict === 'both') {
    if (!levels.dualEval) return false;
    if (!levels.dualEval.easy.approved && !levels.dualEval.hard.approved) return false;
    var isEasyOnly = levels.dualEval.easy.approved && !levels.dualEval.hard.approved;
    var cfThreshold = isEasyOnly ? Math.max(3.0, minCF - 2.5) : minCF;
    if (confluence && confluence.confluence != null && confluence.confluence < cfThreshold) return false;
    return true;
  }

  if (strict === 'hard' && !levels.tp1) return false;

  if (confluence && confluence.confluence != null && confluence.confluence < minCF) return false;

  return true;
}

async function sendMonitorSignal(token, chatId, levels, confluence, result, currentPrice, symbol, tf) {
  var isCrypto = isCryptoSymbol(symbol);
  var symIcon = isCrypto ? '🪙' : '💱';
  var d = levels.direction;
  var dirIcon = d === 'BUY' ? '🟢' : '🔴';
  var kzBadge = getKZBadge(symbol);
  var et = detectEntryType(levels, currentPrice);

  var caption = '🚨 <b>سیگنال مانیتور</b>\n\n';
  caption += '<b>نماد:</b> ' + symIcon + ' ' + symbol + '\n';
  caption += '<b>TF:</b> ' + timeframeLabel(tf) + '\n';
  caption += '<b>وضعیت:</b> ' + kzBadge + '\n';

  if (levels.dualEval) caption += buildDualEvalBlock(levels);

  caption += '\n<b>جهت:</b> ' + dirIcon + ' ' + (d === 'BUY' ? 'خرید' : 'فروش') + '\n';
  caption += '<b>قیمت فعلی:</b> <code>' + currentPrice.toFixed(2) + '</code>\n';
  if (levels.confidence != null) caption += '<b>اطمینان:</b> ' + levels.confidence + '%\n';
  caption += '\n━━━━━━━━━━━━━━━\n';
  caption += et.icon + ' <b>' + et.action + '</b>\n';
  caption += '<i>' + et.desc + '</i>\n';
  caption += '━━━━━━━━━━━━━━━\n\n';

  caption += '<b>🎯 Entry:</b> <code>' + levels.entry + '</code>\n';
  if (levels.sl != null) caption += '<b>🛑 SL:</b> <code>' + levels.sl + '</code>\n';
  if (levels.tp1 != null) caption += '<b>✅ TP1:</b> <code>' + levels.tp1 + '</code>\n';
  if (levels.tp2 != null) caption += '<b>✅ TP2:</b> <code>' + levels.tp2 + '</code>\n';
  if (levels.tp3 != null) caption += '<b>✅ TP3:</b> <code>' + levels.tp3 + '</code>\n';
  if (levels.rr) caption += '<b>⚖️ R/R:</b> <code>' + levels.rr + '</code>\n';
  caption += '<b>سرویس:</b> ' + esc(result.provider) + '\n';

  caption += buildConfBlock(confluence, levels);

  if (et.type && et.type.indexOf('LIMIT') !== -1) {
    caption += '\n⏳ <b>سفارش معلق:</b> تا ' + getExpiryTTL(tf) + ' کندل اعتبار داره';
    caption += '\n🔔 اگه پر نشه، خودکار بهت اطلاع می‌دیم';
  }

  caption += '\n📝 <b>ثبت خودکار در ژورنال</b>';

  var keyboard = { inline_keyboard: [
    [{ text: '📓 ژورنال', callback_data: 'menu_journal' }],
    [{ text: '⏹️ توقف مانیتور', callback_data: 'mon_stop_all' }]
  ]};

  await sendMessage(token, chatId, caption, keyboard);

  var ft = tgFormat(result.text);
  if (ft.length > 100 && ft.length < 3500) {
    await sendMessage(token, chatId, '📖 <b>تحلیل کامل:</b>\n\n' + ft.slice(0, 3500));
  }
}

// ============================================
// WATCHLIST
// ============================================

async function showWatchList(token, chatId, env) {
  var l = await getWatchlist(env, chatId);
  if (!l.length) { await sendMessage(token, chatId, '🔔 خالی', { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_watch' }]] }); return; }
  var t = '<b>🔔</b>\n\n';
  for (var i = 0; i < l.length; i++) t += '#' + l[i].id + ' ' + esc(l[i].symbol) + ' ' + (l[i].condition === 'above' ? '⬆️' : '⬇️') + ' ' + esc(l[i].price) + '\n';
  await sendMessage(token, chatId, t, { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_watch' }]] });
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
            await sendMessage(token, cid, '🔔 <b>' + esc(w.symbol) + '</b> @ ' + price, { inline_keyboard: [[{ text: '📊 تحلیل', callback_data: 'sym_' + w.symbol.replace('/', '') }]] });
          } else rem.push(w);
        } catch (e) { rem.push(w); }
      }
      await env.KV.put(k, JSON.stringify(rem));
    }
  } catch (e) { console.error('checkWatchlist: ' + e.message); }
}

// ============================================
// CALLBACK HANDLER
// ============================================

async function handleCallback(token, chatId, mid, data, env) {
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
  if (data === 'mon_list') { await showMonitorList(token, chatId, mid, env); return; }
  if (data === 'mon_add') { await startMonitorWizard(token, chatId, env); return; }
  if (data === 'mon_stop_all') { await saveMonitors(env, chatId, []); await sendOrEdit(token, chatId, mid, '⏹️ همه حذف شدند', { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_monitor' }]] }); return; }
  if (data === 'mon_crypto_list') { await sendOrEdit(token, chatId, mid, '🪙', monitorSymbolMenu(true)); return; }

  if (data.indexOf('mon_view_') === 0) { await showMonitorView(token, chatId, mid, env, parseInt(data.replace('mon_view_', ''))); return; }
  if (data.indexOf('mon_toggle_') === 0) {
    var idx = parseInt(data.replace('mon_toggle_', ''));
    var list = await getMonitors(env, chatId);
    if (list[idx]) { list[idx].active = !list[idx].active; await saveMonitors(env, chatId, list); }
    await showMonitorView(token, chatId, mid, env, idx);
    return;
  }
  if (data.indexOf('mon_restart_') === 0) {
    var idx2 = parseInt(data.replace('mon_restart_', ''));
    var list2 = await getMonitors(env, chatId);
    if (list2[idx2]) { list2[idx2].lastCheckAt = 0; list2[idx2].lastError = null; list2[idx2].active = true; await saveMonitors(env, chatId, list2); }
    await showMonitorView(token, chatId, mid, env, idx2);
    return;
  }
  if (data.indexOf('mon_del_') === 0) {
    var idx3 = parseInt(data.replace('mon_del_', ''));
    var list3 = await getMonitors(env, chatId);
    list3.splice(idx3, 1);
    await saveMonitors(env, chatId, list3);
    await sendOrEdit(token, chatId, mid, '🗑️', { inline_keyboard: [[{ text: '◀️', callback_data: 'mon_list' }]] });
    return;
  }
  if (data === 'mon_cancel') { await clearUserState(env, chatId); await sendOrEdit(token, chatId, mid, '❌', { inline_keyboard: [[{ text: '🏠', callback_data: 'menu_main' }]] }); return; }

  if (data.indexOf('msym_') === 0) {
    var symRaw = data.replace('msym_', '');
    if (symRaw === 'custom') {
      await setUserState(env, chatId, { action: 'mon_add', step: 'symbol_custom', data: {} });
      await sendOrEdit(token, chatId, mid, '✏️ نماد:', { inline_keyboard: [[{ text: '❌', callback_data: 'mon_cancel' }]] });
      return;
    }
    await setUserState(env, chatId, { action: 'mon_add', step: 'tf', data: { symbol: symRaw } });
    await sendOrEdit(token, chatId, mid, '🤖 ۲/۴ TF:', monitorTfMenu(symRaw));
    return;
  }
  if (data.indexOf('mtf2_') === 0) {
    var rest = data.replace('mtf2_', '');
    var tfm = rest.match(/_([^_]+)$/);
    if (!tfm) return;
    var symR = rest.slice(0, -tfm[0].length);
    var tfM = tfm[1];
    await setUserState(env, chatId, { action: 'mon_add', step: 'ai', data: { symbol: symR, timeframe: tfM } });
    await sendOrEdit(token, chatId, mid, '🤖 ۳/۴ AI:', monitorAiMenu(symR, tfM));
    return;
  }
  if (data.indexOf('mai_') === 0) {
    var rest2 = data.replace('mai_', '');
    var parts2 = rest2.split('_');
    if (parts2.length < 3) return;
    var ai = parts2[0];
    var tf2 = parts2[parts2.length - 1];
    var sym2 = parts2.slice(1, -1).join('_');
    await setUserState(env, chatId, { action: 'mon_add', step: 'dp', data: { symbol: sym2, timeframe: tf2, aiProvider: ai } });
    await sendOrEdit(token, chatId, mid, '🤖 ۴/۴ داده:', monitorDataMenu(sym2, tf2, ai));
    return;
  }
  if (data.indexOf('mdp_') === 0) {
    var rest3 = data.replace('mdp_', '');
    var parts3 = rest3.split('_');
    if (parts3.length < 4) return;
    var dp = parts3[0];
    var ai3 = parts3[parts3.length - 1];
    var tf3 = parts3[parts3.length - 2];
    var sym3 = parts3.slice(1, -2).join('_');
    var symbol3 = normalizeSymbol(sym3);
    await clearUserState(env, chatId);
    await finishMonitorSetup(token, chatId, mid, symbol3, tf3, ai3, dp, env);
    return;
  }

  if (data === 'wizard_cancel') { await clearUserState(env, chatId); await sendOrEdit(token, chatId, mid, '❌', { inline_keyboard: [[{ text: '🏠', callback_data: 'menu_main' }]] }); return; }
  if (data === 'sym_custom') { await setUserState(env, chatId, { action: 'custom_symbol', step: 'input', data: {} }); await sendOrEdit(token, chatId, mid, '✏️ نماد:', { inline_keyboard: [[{ text: '❌', callback_data: 'wizard_cancel' }]] }); return; }
  if (data.indexOf('sym_') === 0) { await showTimeframeMenu(token, chatId, mid, data.replace('sym_', '')); return; }
  if (data.indexOf('mtf_') === 0) { await showProviderMenu(token, chatId, mid, data.replace('mtf_', ''), 'MTF', true, env); return; }
  if (data.indexOf('tf_') === 0) {
    var restT = data.replace('tf_', '');
    var tfmT = restT.match(/_([^_]+)$/);
    if (!tfmT) return;
    await showProviderMenu(token, chatId, mid, restT.slice(0, -tfmT[0].length), tfmT[1], false, env);
    return;
  }
  if (data.indexOf('pvd_') === 0) {
    var restP = data.replace('pvd_', '');
    var partsP = restP.split('_');
    if (partsP.length < 3) return;
    var prov = partsP[0];
    var tfP = partsP[partsP.length - 1];
    var srP = partsP.slice(1, -1).join('_');
    var symbolP = normalizeSymbol(srP);
    try { await fetch('https://api.telegram.org/bot' + token + '/deleteMessage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, message_id: mid }) }); } catch (e) {}
    if (tfP === 'MTF') await runMultiTFAnalysis(token, chatId, symbolP, env, prov);
    else await runAnalysis(token, chatId, symbolP, env, tfP, prov);
    return;
  }

  if (data === 'journal_list') { await showJournalList(token, chatId, env); return; }
  if (data === 'journal_stats') { await showJournalStats(token, chatId, env); return; }
  if (data === 'journal_daily') { await showJournalDaily(token, chatId, env); return; }
  if (data === 'journal_clear') { await saveJournal(env, chatId, []); await sendOrEdit(token, chatId, mid, '🗑️', { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_journal' }]] }); return; }

  if (data === 'watch_add') { await setUserState(env, chatId, { action: 'watch_add', step: 'symbol', data: {} }); await sendOrEdit(token, chatId, mid, '🔔 ۱/۳ نماد:', { inline_keyboard: [[{ text: '❌', callback_data: 'wizard_cancel' }]] }); return; }
  if (data === 'watch_list') { await showWatchList(token, chatId, env); return; }
  if (data === 'watch_clear') { await saveWatchlist(env, chatId, []); await sendOrEdit(token, chatId, mid, '🗑️', { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_watch' }]] }); return; }
  if (data.indexOf('wiz_cond_') === 0) {
    var stW = await getUserState(env, chatId);
    if (!stW || stW.action !== 'watch_add') return;
    stW.data.condition = data.replace('wiz_cond_', ''); stW.step = 'price';
    await setUserState(env, chatId, stW);
    await sendOrEdit(token, chatId, mid, '🔔 ۳/۳ قیمت:', { inline_keyboard: [[{ text: '❌', callback_data: 'wizard_cancel' }]] });
    return;
  }

  if (data === 'settings_strict') {
    var curSt = await getStrictness(env, chatId);
    await sendOrEdit(token, chatId, mid, '🎚️ <b>نوع تحلیل</b>\n\n🔴 سختگیر · 🟢 آسان · ⚖️ هر دو', strictnessMenu(curSt));
    return;
  }
  if (data === 'strict_hard' || data === 'strict_easy' || data === 'strict_both') {
    var mSt = data.replace('strict_', '');
    await setStrictness(env, chatId, mSt);
    var scSt = STRICTNESS_MODES[mSt];
    await sendOrEdit(token, chatId, mid, '✅ <b>' + scSt.icon + ' ' + scSt.label + '</b>\n\n' + scSt.desc, strictnessMenu(mSt));
    return;
  }
  if (data === 'settings_kz') { var curK = await getKzMode(env, chatId); await sendOrEdit(token, chatId, mid, '⚙️ KZ Mode', kzModeMenu(curK)); return; }
  if (data === 'kz_off' || data === 'kz_priority' || data === 'kz_only') {
    var mK = data.replace('kz_', '');
    await setKzMode(env, chatId, mK);
    var kc = KZ_MODES[mK];
    await sendOrEdit(token, chatId, mid, '✅ ' + kc.icon + ' ' + kc.label, kzModeMenu(mK));
    return;
  }
  if (data === 'settings_localfilter') { var curLF = await getLocalFilter(env, chatId); await sendOrEdit(token, chatId, mid, '🔍 <b>فیلتر محلی MSS/BOS</b>\n\nاگه فعال باشه، AI فقط وقتی صدا زده می‌شه که در ۶ کندل اخیر BOS/MSS جدید شکل گرفته باشه.', localFilterMenu(curLF)); return; }
  if (data === 'lf_on' || data === 'lf_off') {
    var mLF = data.replace('lf_', '');
    await setLocalFilter(env, chatId, mLF);
    await sendOrEdit(token, chatId, mid, '✅ ' + (mLF === 'on' ? 'فیلتر محلی فعال' : 'فیلتر محلی غیرفعال'), localFilterMenu(mLF));
    return;
  }
  if (data === 'settings_mode') { var curM = await getUserMode(env, chatId); await sendOrEdit(token, chatId, mid, '🎯 حالت', modeMenu(curM)); return; }
  if (data.indexOf('mode_') === 0) {
    var mM = data.replace('mode_', '');
    await setUserMode(env, chatId, mM);
    var cfgM = MODE_CONFIG[mM];
    await sendOrEdit(token, chatId, mid, '✅ ' + cfgM.icon + ' ' + cfgM.label, modeMenu(mM));
    return;
  }
  if (data === 'settings_confluence') { var curC = await getConfluenceMode(env, chatId); await sendOrEdit(token, chatId, mid, '🧠', confluenceModeMenu(curC)); return; }
  if (data.indexOf('conf_') === 0) {
    var mC = data.replace('conf_', '');
    await setConfluenceMode(env, chatId, mC);
    await sendOrEdit(token, chatId, mid, '✅ ' + mC, confluenceModeMenu(mC));
    return;
  }
  if (data === 'settings_tier') { await sendOrEdit(token, chatId, mid, '🎚️ مدل', modelTierProviderMenu()); return; }
  if (data === 'tier_prov_aiprime') { await env.KV.put('last_tier_prov:' + chatId, 'aiprime'); var curA = await getUserModelTier(env, chatId, 'aiprime'); await sendOrEdit(token, chatId, mid, '🅰️', modelTierMenu(curA)); return; }
  if (data === 'tier_prov_gapgpt') { await env.KV.put('last_tier_prov:' + chatId, 'gapgpt'); var curG = await getUserModelTier(env, chatId, 'gapgpt'); await sendOrEdit(token, chatId, mid, '💎', modelTierMenu(curG)); return; }
  if (data === 'tier_fast' || data === 'tier_premium' || data === 'tier_deepseek') {
    var nt = data.replace('tier_', '');
    var lp = await env.KV.get('last_tier_prov:' + chatId) || 'aiprime';
    await setUserModelTier(env, chatId, lp, nt);
    await sendOrEdit(token, chatId, mid, '✅', modelTierMenu(nt));
    return;
  }
}

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

    if (text === '/myid') { await sendMessage(token, chatId, '🆔 <code>' + chatId + '</code>'); return; }
    if (isSecurityEnabled(env) && !isAdmin(env, chatId)) { await sendAccessDenied(token, chatId); return; }

    if (update.message.photo && update.message.photo.length) {
      await runImageAnalysis(token, chatId, update.message.photo[update.message.photo.length - 1].file_id, env);
      return;
    }
    if (update.message.document && update.message.document.mime_type && update.message.document.mime_type.indexOf('image/') === 0) {
      await runImageAnalysis(token, chatId, update.message.document.file_id, env);
      return;
    }

    var st = await getUserState(env, chatId);
    if (st) {
      if (st.action === 'watch_add') {
        var dW = st.data || {};
        if (st.step === 'symbol') {
          dW.symbol = normalizeSymbol(text); st.data = dW; st.step = 'condition';
          await setUserState(env, chatId, st);
          await sendMessage(token, chatId, '🔔 ۲/۳ شرط:', { inline_keyboard: [[{ text: '⬆️', callback_data: 'wiz_cond_above' }, { text: '⬇️', callback_data: 'wiz_cond_below' }]] });
          return;
        }
        if (st.step === 'price') {
          var pW = parseFloat(text.replace(/[^\d.\-]/g, ''));
          if (isNaN(pW)) { await sendMessage(token, chatId, '❌'); return; }
          dW.price = pW;
          var lW = await getWatchlist(env, chatId);
          var nid = lW.length ? Math.max.apply(null, lW.map(function(w) { return w.id; })) + 1 : 1;
          lW.push({ id: nid, symbol: dW.symbol, condition: dW.condition, price: dW.price, ts: Date.now() });
          await saveWatchlist(env, chatId, lW);
          await clearUserState(env, chatId);
          await sendMessage(token, chatId, '✅ #' + nid, { inline_keyboard: [[{ text: '🔔', callback_data: 'menu_watch' }]] });
          return;
        }
      }
      if (st.action === 'custom_symbol') {
        var sC = normalizeSymbol(text);
        await clearUserState(env, chatId);
        await showTimeframeMenu(token, chatId, null, sC.replace('/', ''));
        return;
      }
      if (st.action === 'mon_add' && st.step === 'symbol_custom') {
        var sM = normalizeSymbol(text);
        await setUserState(env, chatId, { action: 'mon_add', step: 'tf', data: { symbol: sM } });
        await sendMessage(token, chatId, '🤖 ۲/۴ TF:', monitorTfMenu(sM.replace('/', '')));
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

    if (text && text.charAt(0) !== '/' && /^[A-Za-z]{2,10}(\/[A-Za-z]{2,10})?$/.test(text)) {
      await showTimeframeMenu(token, chatId, null, normalizeSymbol(text).replace('/', ''));
      return;
    }

    await sendMessage(token, chatId, '❓', mainMenu());
  }

  if (update.callback_query) {
    var cb = update.callback_query;
    var cid = cb.message.chat.id;
    if (isSecurityEnabled(env) && !isAdmin(env, cid)) { await answerCallback(token, cb.id); await sendAccessDenied(token, cid); return; }
    await answerCallback(token, cb.id);
    await handleCallback(token, cid, cb.message.message_id, cb.data, env);
  }
}

// ============================================
// EXPORT
// ============================================

export default {
  async fetch(request, env, ctx) {
    var url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '') return new Response('Everest Bot v8.0 — UNFILLED/EXPIRED Watchdog', { status: 200 });
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
    ctx.waitUntil(Promise.all([
      checkWatchlist(env),
      checkAllMonitors(env),
      runExpiryWatchdog(env)
    ]));
  }
};
