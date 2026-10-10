// ============================================
// EVEREST BOT v4.1 — Final
// + Entry Type Detection (LIMIT/MARKET/STOP)
// + Auto Monitor (multi-symbol, precise cron)
// + KZ Mode + Crypto + Strictness + Confluence
// + FIX: buildPromptForMode defined
// ============================================

const CONF_KEYS = ['structure', 'smc', 'ict', 'candle', 'liquidity', 'riskReward'];
const CONF_LABELS = {
  structure: 'Market Structure', smc: 'SMC / Order Blocks', ict: 'ICT / FVG',
  candle: 'Candlestick', liquidity: 'Liquidity Sweep', riskReward: 'R/R'
};

const MODEL_TIERS = {
  aiprime: {
    fast: { label: '🚀 سریع', text: 'gpt-4o-mini', vision: 'gpt-4o' },
    premium: { label: '💎 قوی', text: 'claude-sonnet-5', vision: 'claude-sonnet-5' },
    deepseek: { label: '🧠 DeepSeek', text: 'deepseek-v4.1-flash', vision: 'deepseek-v4.1-flash' }
  },
  gapgpt: {
    fast: { label: '🚀 سریع', text: 'gpt-4o-mini', vision: 'gemini-2.0-flash' },
    premium: { label: '💎 قوی', text: 'claude-sonnet-5', vision: 'claude-sonnet-5' },
    deepseek: { label: '🧠 DeepSeek', text: 'deepseek-v4.1-flash', vision: 'deepseek-v4.1-flash' }
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
const TF_LABELS = { '1min':'1 دقیقه','3min':'3 دقیقه','5min':'5 دقیقه','15min':'15 دقیقه','1h':'1 ساعت','4h':'4 ساعت' };
const TD_INTERVALS = { '1min':'1min','3min':'5min','5min':'5min','15min':'15min','1h':'1h','4h':'4h' };

const MODE_CONFIG = {
  scalping: { label: 'اسکلپی', icon: '⚡', color: '#fbbf24', minConfidence: 70, minRR: 2.0, minConfluence: 7, allowedTFs: ['1min','3min','5min','15min'] },
  medium: { label: 'متوسط', icon: '⚖️', color: '#6ea8fe', minConfidence: 65, minRR: 1.5, minConfluence: 6, allowedTFs: ['5min','15min','1h','4h'] },
  confident: { label: 'مطمئن', icon: '🛡️', color: '#4ade80', minConfidence: 75, minRR: 2.5, minConfluence: 8, allowedTFs: ['15min','1h','4h'] }
};

function getModelTierConfig(provider, tier, hasImage) {
  const cfg = MODEL_TIERS[provider]?.[tier];
  if (!cfg) return { model: hasImage ? 'gpt-4o' : 'gpt-4o-mini', label: '' };
  return { model: hasImage ? cfg.vision : cfg.text, label: cfg.label };
}

const FORCE_DIRECTIVE = "\n\n" +
"⚠️ **اجباری**: JSON انتهای پاسخ:\n" +
"```json\n" +
"{\"direction\":\"BUY|SELL|WAIT\",\"confluenceScore\":0.0,\"scores\":{\"structure\":0,\"smc\":0,\"ict\":0,\"candle\":0,\"liquidity\":0,\"riskReward\":0},\"confidence\":0,\"entry\":0,\"stopLoss\":0,\"tp1\":0,\"tp2\":0,\"tp3\":0,\"rr\":\"1:0\"}\n" +
"```";

// ⭐ FIX: این تابع در v4.0 جا افتاده بود
function buildPromptForMode(basePrompt, mode) {
  if (mode === 'force') return basePrompt + FORCE_DIRECTIVE;
  return basePrompt;
}

// ============================================
// PROMPTS
// ============================================

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
  return Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error(l + ' timeout (' + ms + 'ms)')), ms))]);
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function formatTime(dt) {
  if (!dt) return '';
  const s = String(dt);
  const m = s.match(/T(\d{2}):(\d{2})/);
  if (m) return m[1] + ':' + m[2];
  const m2 = s.match(/(\d{2}):(\d{2})/);
  if (m2) return m2[1] + ':' + m2[2];
  return s.slice(-8, -3);
}
function num(v) {
  if (v === null || v === undefined || v === '' || v === 'N/A') return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  const clean = String(v).replace(/[,،\s_]/g, '').replace(/^[^\-\d.]*|[^\-\d.]*$/g, '');
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}
function normDir(d) {
  if (!d) return 'WAIT';
  const v = String(d).trim().toUpperCase();
  if (v === 'BUY' || v === 'LONG') return 'BUY';
  if (v === 'SELL' || v === 'SHORT') return 'SELL';
  return 'WAIT';
}
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function calcATR(klines, period) {
  period = period || 14;
  if (!klines || klines.length < period + 1) return null;
  const trs = [];
  for (let i = 0; i < period; i++) {
    const k = klines[klines.length - 1 - i];
    const prev = klines[klines.length - 2 - i];
    if (!k || !prev) continue;
    trs.push(Math.max(k.high - k.low, Math.abs(k.high - prev.close), Math.abs(k.low - prev.close)));
  }
  if (!trs.length) return null;
  return trs.reduce((a, b) => a + b, 0) / trs.length;
}
function dropForming(klines, tf) {
  const a = klines.slice();
  const last = a[a.length - 1];
  if (!last || !last.datetime) return a;
  const t = Date.parse(String(last.datetime).includes('T') ? last.datetime : String(last.datetime).replace(' ', 'T') + 'Z');
  if (Number.isFinite(t) && t + (TF_MINUTES[tf] || 5) * 60000 > Date.now()) a.pop();
  return a;
}

// ⭐ ENTRY TYPE DETECTION — core
function detectEntryType(levels, currentPrice) {
  if (!levels.entry || !currentPrice || levels.direction === 'WAIT') {
    return { type: 'N/A', action: '—', icon: '⚪️', cls: '', desc: '', pct: 0, currentPrice: currentPrice || 0 };
  }
  const diff = levels.entry - currentPrice;
  const pct = Math.abs(diff) / currentPrice * 100;
  if (pct < 0.1) {
    return { type: 'MARKET', action: levels.direction + ' MARKET', icon: '⚡', cls: 'market',
      desc: 'قیمت فعلی ≈ Entry — با Market وارد شو', pct, currentPrice };
  }
  if (levels.direction === 'BUY') {
    if (diff < 0) return { type: 'BUY LIMIT', action: 'BUY LIMIT', icon: '🔵', cls: 'limit',
      desc: `منتظر ریزش ${pct.toFixed(2)}٪ به ${levels.entry} — سفارش Limit بذار`, pct, currentPrice };
    return { type: 'BUY STOP', action: 'BUY STOP', icon: '🟡', cls: 'stop',
      desc: `منتظر شکست ${pct.toFixed(2)}٪ بالای ${levels.entry} — سفارش Stop بذار`, pct, currentPrice };
  }
  if (levels.direction === 'SELL') {
    if (diff > 0) return { type: 'SELL LIMIT', action: 'SELL LIMIT', icon: '🔵', cls: 'limit',
      desc: `منتظر رشد ${pct.toFixed(2)}٪ به ${levels.entry} — سفارش Limit بذار`, pct, currentPrice };
    return { type: 'SELL STOP', action: 'SELL STOP', icon: '🟡', cls: 'stop',
      desc: `منتظر شکست ${pct.toFixed(2)}٪ زیر ${levels.entry} — سفارش Stop بذار`, pct, currentPrice };
  }
  return { type: 'LIMIT', action: levels.direction + ' LIMIT', icon: '🔵', cls: 'limit', desc: '', pct, currentPrice };
}

function buildEntryTypeLine(levels, currentPrice) {
  const et = detectEntryType(levels, currentPrice);
  if (et.type === 'N/A') return '';
  let c = '\n';
  c += `${et.icon} <b>${esc(et.action)}</b> @ <code>${esc(levels.entry)}</code>\n`;
  c += `   <i>${esc(et.desc)}</i>\n`;
  if (currentPrice) c += `   📍 قیمت فعلی: <code>${currentPrice.toFixed(2)}</code>\n`;
  return c;
}

// ============================================
// CRYPTO & KILL ZONE
// ============================================

function isCryptoSymbol(sym) {
  const s = String(sym || '').toUpperCase().replace(/[\/\-_]/g, '');
  for (const base of CRYPTO_BASES) if (s.startsWith(base)) return true;
  return /\/(USDT|USDC|BUSD|BTC|ETH)$/.test(String(sym || '').toUpperCase());
}

function getLondonHour() {
  try { return parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: 'numeric', hour12: false }).format(new Date())); }
  catch (e) { return new Date().getUTCHours(); }
}
function getNYHour() {
  try { return parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(new Date())); }
  catch (e) { return new Date().getUTCHours() - 5; }
}

function getKillZoneInfo() {
  const londonH = getLondonHour(), nyH = getNYHour();
  const inLondon = londonH >= 7 && londonH < 10;
  const inNY = nyH >= 8 && nyH < 11;
  return { active: inLondon || inNY, london: inLondon, ny: inNY, overlap: inLondon && inNY, londonH, nyH };
}
function getCryptoLiquidityWindow() {
  const nyH = getNYHour();
  return { active: nyH >= 8 && nyH < 18, high: nyH >= 13 && nyH < 17, nyH };
}
function getKZShortLabel(symbol) {
  if (isCryptoSymbol(symbol)) { const w = getCryptoLiquidityWindow(); return w.high ? '🪙LIQ+' : w.active ? '🪙LIQ' : '🪙low'; }
  const kz = getKillZoneInfo();
  if (kz.overlap) return '🟢KZ+';
  if (kz.london) return '🟢KZ-L';
  if (kz.ny) return '🟢KZ-N';
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
  if (kz.overlap) return '⭐ <b>KZ همپوشانی (اولویت بالا)</b>';
  if (kz.london) return '⭐ <b>KZ لندن (اولویت بالا)</b>';
  if (kz.ny) return '⭐ <b>KZ نیویورک (اولویت بالا)</b>';
  return '⚪ خارج از KZ (احتیاط)';
}
function shouldCheckNow(symbol, kzMode) {
  if (kzMode === 'off') return { ok: true, reason: '۲۴/۷' };
  if (kzMode === 'priority') return { ok: true, reason: 'اولویت' };
  if (kzMode === 'only') {
    if (isCryptoSymbol(symbol)) {
      const w = getCryptoLiquidityWindow();
      return w.active ? { ok: true, reason: 'لیکویید' } : { ok: false, reason: 'خارج لیکویید' };
    }
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
function getKey(env, p) {
  const m = {
    gemini: env.GEMINI_KEY_1 || env.GEMINI_KEY, aiprime: env.AIPRIME_KEY, github: env.GITHUB_MODELS_TOKEN,
    groq: env.GROQ_KEY, together: env.TOGETHER_KEY, gapgpt: env.GAPGPT_KEY, openrouter: env.OPENROUTER_KEY,
    mistral: env.MISTRAL_KEY, huggingface: env.HUGGINGFACE_KEY, cloudflare: env.CLOUDFLARE_KEY,
    nvidia: env.NVIDIA_KEY, llm7: env.LLM7_KEY || 'unused', avalai: env.AVALAI_KEY,
    metis: env.METIS_KEY, onexai: env.ONEXAI_KEY
  };
  return m[p] || '';
}
function getGeminiKeys(env) {
  const k = [];
  if (env.GEMINI_KEY_1) k.push(env.GEMINI_KEY_1);
  if (env.GEMINI_KEY_2) k.push(env.GEMINI_KEY_2);
  if (env.GEMINI_KEY_3) k.push(env.GEMINI_KEY_3);
  if (env.GEMINI_KEY) k.push(env.GEMINI_KEY);
  return k;
}
function getAvailableProviders(env) {
  return ['gemini','aiprime','groq','github','together','gapgpt','openrouter','mistral','huggingface','cloudflare','nvidia','llm7','avalai','metis','onexai']
    .filter(p => {
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
async function saveJournal(env, c, j) { await env.KV.put('journal:' + c, JSON.stringify(j)); }
async function getWatchlist(env, c) { try { return await env.KV.get('watch:' + c, 'json') || []; } catch (e) { return []; } }
async function saveWatchlist(env, c, l) { await env.KV.put('watch:' + c, JSON.stringify(l)); }

async function getConfluenceMode(env, c) { try { return (await env.KV.get('confmode:' + c)) || 'auto'; } catch (e) { return 'auto'; } }
async function setConfluenceMode(env, c, m) { await env.KV.put('confmode:' + c, m); }
async function getUserMode(env, c) { try { const m = await env.KV.get('mode:' + c); return MODE_CONFIG[m] ? m : 'medium'; } catch (e) { return 'medium'; } }
async function setUserMode(env, c, m) { if (!MODE_CONFIG[m]) m = 'medium'; await env.KV.put('mode:' + c, m); }
async function getUserModelTier(env, c, p) { try { return (await env.KV.get('tier:' + c + ':' + p)) || 'fast'; } catch (e) { return 'fast'; } }
async function setUserModelTier(env, c, p, t) { await env.KV.put('tier:' + c + ':' + p, t); }
async function getStrictness(env, c) { try { return (await env.KV.get('strictness:' + c)) || 'hard'; } catch (e) { return 'hard'; } }
async function setStrictness(env, c, s) { if (!STRICTNESS_MODES[s]) s = 'hard'; await env.KV.put('strictness:' + c, s); }
async function getKzMode(env, c) { try { return (await env.KV.get('kzmode:' + c)) || 'priority'; } catch (e) { return 'priority'; } }
async function setKzMode(env, c, m) { if (!KZ_MODES[m]) m = 'priority'; await env.KV.put('kzmode:' + c, m); }
async function getMonitors(env, c) { try { return await env.KV.get('monitors:' + c, 'json') || []; } catch (e) { return []; } }
async function saveMonitors(env, c, l) { await env.KV.put('monitors:' + c, JSON.stringify(l)); }

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
  for (const l of labels) {
    const p = new RegExp("\\*{0,2}" + l + "\\*{0,2}\\s*[:：=]\\s*\\*{0,2}\\s*([-\\d,،]+(?:\\.\\d+)?)", 'i');
    const m = text.match(p);
    if (m) { const v = num(m[1]); if (v !== null) return v; }
  }
  return null;
}
function detectDirection(text) {
  if (!text) return 'WAIT';
  const td = text.match(/Direction\s*[:：=]\s*(BUY|SELL|WAIT|LONG|SHORT)/i);
  if (td) return normDir(td[1]);
  return 'WAIT';
}
function extractLevels(rawText) {
  const j = parseJsonBlock(rawText);
  if (j) {
    return {
      direction: normDir(j.direction), regime: j.regime || null,
      confidence: num(j.confidence !== undefined ? j.confidence : j.confidenceScore),
      entry: num(j.entry), sl: num(j.stopLoss !== undefined ? j.stopLoss : j.sl),
      tp1: num(j.tp1), tp2: num(j.tp2), tp3: num(j.tp3),
      rr: j.rr || null, confluenceScore: num(j.confluenceScore),
      htf: j.htf4h || null, mtf: j.mtf1h || null, ltf: j.ltf15m || null, entryTf: j.entrytf1m || null,
      detectedSymbol: j.symbol || null, detectedTimeframe: j.timeframe || null,
      aiScores: j.scores || null, validationIssues: []
    };
  }
  const blocks = rawText.match(/---\s*\n([\s\S]*?)\n\s*---/g);
  let text = rawText;
  if (blocks && blocks.length) text = blocks[blocks.length - 1];
  const regimeMatch = text.match(/Regime\s*[:：]\s*(TRENDING_UP|TRENDING_DOWN|RANGING|TRANSITIONAL)/i);
  const rrMatch = text.match(/R\/R\s*[:：=]\s*([\d\.:]+)/i);
  const confMatch = text.match(/ConfluenceScore\s*[:：=]\s*([\d\.]+)/i);
  const htfMatch = text.match(/HTF4H\s*[:：=]\s*(BULLISH|BEARISH|RANGING)/i);
  const mtfMatch = text.match(/MTF1H\s*[:：=]\s*(BULLISH|BEARISH|RANGING)/i);
  const ltfMatch = text.match(/LTF15M\s*[:：=]\s*(BULLISH|BEARISH|RANGING)/i);
  const etfMatch = text.match(/EntryTF1M\s*[:：=]\s*(BULLISH|BEARISH|RANGING)/i);
  const symMatch = text.match(/Symbol\s*[:：=]\s*([^\n]+)/i);
  const tfMatch2 = text.match(/Timeframe\s*[:：=]\s*([^\n]+)/i);
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

function validateSignal(levels, opts) {
  opts = opts || {};
  const strict = opts.strict || 'hard';
  let minRR = opts.minRR || 1.5;
  let minConfidence = opts.minConfidence || 65;
  const issues = [];
  const originalDir = levels.direction;

  if (strict === 'easy') {
    minRR = Math.max(1.0, minRR * 0.7);
    minConfidence = Math.max(55, minConfidence - 5);
  }

  if (originalDir !== 'WAIT') {
    const conf = levels.confidence;
    if (conf === null || conf === undefined) { issues.push('⚠️ امتیاز نیست'); levels.direction = 'WAIT'; }
    else if (conf > 100 || conf < 0) { issues.push('⚠️ امتیاز نامعتبر'); levels.confidence = null; levels.direction = 'WAIT'; }
    else if (conf < minConfidence) { issues.push(`⚠️ اطمینان ${conf}% < ${minConfidence}%`); levels.direction = 'WAIT'; }
  }

  if (levels.direction === 'BUY' || levels.direction === 'SELL') {
    const entry = levels.entry, sl = levels.sl;
    if (entry === null) { issues.push('⚠️ Entry نیست'); levels.direction = 'WAIT'; }
    else if (sl === null) { issues.push('⚠️ SL نیست'); levels.direction = 'WAIT'; }
    else {
      if (levels.direction === 'BUY' && sl >= entry) { issues.push('❌ SL بالای Entry'); levels.direction = 'WAIT'; }
      if (levels.direction === 'SELL' && sl <= entry) { issues.push('❌ SL زیر Entry'); levels.direction = 'WAIT'; }
    }
    if (levels.direction !== 'WAIT' && entry && sl) {
      if (levels.tp1) {
        const wrongDir = (levels.direction === 'BUY' && levels.tp1 <= entry) || (levels.direction === 'SELL' && levels.tp1 >= entry);
        if (wrongDir) { issues.push('❌ TP1 سمت اشتباه'); levels.direction = 'WAIT'; }
        else {
          const risk = Math.abs(entry - sl), reward = Math.abs(levels.tp1 - entry);
          const actualRR = risk > 0 ? reward / risk : 0;
          if (actualRR < minRR) { issues.push(`❌ R/R 1:${actualRR.toFixed(2)} < 1:${minRR}`); levels.direction = 'WAIT'; }
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

// ============================================
// CONFLUENCE
// ============================================

function extractScores(text) {
  const j = parseJsonBlock(text);
  if (j && j.scores) {
    const s = {};
    let ok = 0;
    for (const k of CONF_KEYS) {
      const v = j.scores[k];
      if (typeof v === 'number' && v >= 0 && v <= 100) { s[k] = v; ok++; }
      else if (typeof v === 'string') { const n = parseFloat(v); if (!isNaN(n)) { s[k] = n; ok++; } }
    }
    if (ok >= 4) return s;
  }
  const pats = {
    structure: /(?:Structure|ساختار)[^\d\n]{0,25}(\d{1,3})/i,
    smc: /(?:SMC|Order\s*Block|OB)[^\d\n]{0,25}(\d{1,3})/i,
    ict: /(?:ICT|FVG|Fair\s*Value)[^\d\n]{0,25}(\d{1,3})/i,
    candle: /(?:Candle|کندل|Engulf|Pin|Hammer)[^\d\n]{0,25}(\d{1,3})/i,
    liquidity: /(?:Liquidity|نقدینگی|Sweep)[^\d\n]{0,25}(\d{1,3})/i,
    riskReward: /(?:R\/R|RiskReward|Risk-Reward)[^\d\n]{0,25}(\d{1,3})/i
  };
  const scores = {};
  let found = 0;
  for (const key in pats) {
    const m = text.match(pats[key]);
    if (m) { const vv = parseInt(m[1]); if (vv >= 0 && vv <= 100) { scores[key] = vv; found++; } }
  }
  if (found >= 3) return scores;
  return null;
}
function calculateConfluenceAuto(levels, rawText) {
  const t = String(rawText || '');
  const tClean = t.replace(/(?:FVG|OB|BOS|CHOCH|Order\s*Block|Sweep)\s*(?:وجود\s*ندارد|نیست|no|not|absent)/gi, '');
  const s = {};
  let st = 50;
  if (/\bBOS\b/i.test(tClean)) st += 12;
  if (/CHOCH|CHoCH/i.test(tClean)) st += 10;
  if (/Retest|پولبک/i.test(tClean)) st += 8;
  if (/TRENDING_UP|TRENDING_DOWN/i.test(tClean)) st += 10;
  if (/RANGING|رنج/i.test(tClean)) st -= 15;
  s.structure = Math.max(0, Math.min(100, st));
  let smc = 50;
  if (/Order\s*Block|\bOB\b/i.test(tClean)) smc += 18;
  if (/Premium|Discount/i.test(tClean)) smc += 8;
  s.smc = Math.max(0, Math.min(100, smc));
  let ict = 50;
  if (/FVG|Fair\s*Value\s*Gap/i.test(tClean)) ict += 22;
  if (/Imbalance/i.test(tClean)) ict += 12;
  s.ict = Math.max(0, Math.min(100, ict));
  let cd = 50;
  if (/Engulf|پوششی/i.test(tClean)) cd += 18;
  if (/Pin\s*Bar/i.test(tClean)) cd += 15;
  s.candle = Math.max(0, Math.min(100, cd));
  let lq = 50;
  if (/Liquidity\s*Sweep|Sweep/i.test(tClean)) lq += 20;
  if (/نقدینگی/i.test(tClean)) lq += 10;
  s.liquidity = Math.max(0, Math.min(100, lq));
  let rr = 0;
  if (levels.entry && levels.sl && levels.tp1) {
    const r = Math.abs(levels.entry - levels.sl);
    const rw = Math.abs(levels.tp1 - levels.entry);
    rr = Math.min(100, Math.round((r > 0 ? rw / r : 0) * 33));
  }
  s.riskReward = rr;
  const avg = (s.structure + s.smc + s.ict + s.candle + s.liquidity + s.riskReward) / 6;
  return { scores: s, confluence: Math.round((avg / 10) * 10) / 10, auto: true };
}
async function resolveConfluence(env, chatId, levels, rawText) {
  const mode = await getConfluenceMode(env, chatId);
  const result = { mode, scores: null, confluence: null, auto: false, warning: null };
  const aiScores = levels.aiScores || extractScores(rawText);
  if (aiScores && Object.keys(aiScores).length >= 4) {
    const af = calculateConfluenceAuto(levels, rawText);
    for (const k of CONF_KEYS) if (aiScores[k] == null) aiScores[k] = af.scores[k];
    let sum = 0;
    for (const k of CONF_KEYS) sum += (aiScores[k] || 0);
    result.scores = aiScores;
    result.confluence = (levels.confluenceScore != null) ? levels.confluenceScore : Math.round((sum / 6 / 10) * 10) / 10;
    result.auto = false;
    return result;
  }
  if (mode === 'auto' || mode === 'force') {
    const a = calculateConfluenceAuto(levels, rawText);
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

async function callGeminiText(env, prompt, imgB64, imgMime) {
  const keys = getGeminiKeys(env);
  if (!keys.length) throw new Error('no key');
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  const parts = [{ text: prompt }];
  if (imgB64) parts.push({ inline_data: { mime_type: imgMime, data: imgB64 } });
  let last = '';
  for (const k of keys) {
    for (const m of models) {
      try {
        const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': k },
          body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.15, topP: 0.9, maxOutputTokens: 12000 } })
        });
        const d = await r.json();
        if (r.ok) { const t = d?.candidates?.[0]?.content?.parts?.[0]?.text; if (t) return t; }
        last = d?.error?.message || 'HTTP ' + r.status;
        if (r.status === 400 && /not found/i.test(last)) continue;
        if ([429,401,403].includes(r.status)) break;
      } catch (e) { last = e.message; }
    }
  }
  throw new Error('Gemini: ' + last);
}

async function callAIPrimeText(env, prompt, imgB64, imgMime, chatId) {
  const key = env.AIPRIME_KEY; if (!key) throw new Error('no key');
  const tier = chatId ? await getUserModelTier(env, chatId, 'aiprime') : 'fast';
  const cfg = getModelTierConfig('aiprime', tier, !!imgB64);
  const c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  const r = await fetch('https://api.aiprime.shop/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || 'HTTP ' + r.status);
  return d.choices?.[0]?.message?.content || '';
}

async function callGroqText(env, prompt, imgB64, imgMime) {
  const key = env.GROQ_KEY; if (!key) throw new Error('no key');
  const models = imgB64 ? ['meta-llama/llama-4-scout-17b-16e-instruct'] : ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it'];
  let last = '';
  for (const m of models) {
    try {
      const c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model: m, messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
      });
      const d = await r.json();
      if (r.ok) { const t = d?.choices?.[0]?.message?.content; if (t) return t; }
      last = d?.error?.message || 'HTTP ' + r.status;
    } catch (e) { last = e.message; }
  }
  throw new Error('Groq: ' + last);
}

async function callGitHubText(env, prompt, imgB64, imgMime) {
  const t = env.GITHUB_MODELS_TOKEN; if (!t) throw new Error('no token');
  const c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  const r = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || 'HTTP ' + r.status);
  return d.choices?.[0]?.message?.content || '';
}

async function callTogetherText(env, prompt, imgB64, imgMime) {
  const key = env.TOGETHER_KEY; if (!key) throw new Error('no key');
  const model = imgB64 ? 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo' : 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
  const c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  const r = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || 'HTTP ' + r.status);
  return d.choices?.[0]?.message?.content || '';
}

async function callGapGPTText(env, prompt, imgB64, imgMime, chatId) {
  const key = env.GAPGPT_KEY; if (!key) throw new Error('no key');
  const tier = chatId ? await getUserModelTier(env, chatId, 'gapgpt') : 'fast';
  const cfg = getModelTierConfig('gapgpt', tier, !!imgB64);
  const c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  const r = await fetch('https://api.gapgpt.app/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || 'HTTP ' + r.status);
  return d.choices?.[0]?.message?.content || '';
}

async function callOpenRouterText(env, prompt, imgB64, imgMime) {
  const key = env.OPENROUTER_KEY; if (!key) throw new Error('no key');
  const models = imgB64 ? ['google/gemini-2.0-flash-exp:free'] : ['deepseek/deepseek-chat-v3.1:free', 'meta-llama/llama-3.3-70b-instruct:free'];
  let last = '';
  for (const m of models) {
    try {
      const c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key, 'HTTP-Referer': 'https://everest.bot', 'X-Title': 'Everest' },
        body: JSON.stringify({ model: m, messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
      });
      const d = await r.json();
      if (r.ok) { const t = d?.choices?.[0]?.message?.content; if (t) return t; }
      last = d?.error?.message || 'HTTP ' + r.status;
    } catch (e) { last = e.message; }
  }
  throw new Error('OR: ' + last);
}

async function callMistralText(env, prompt, imgB64, imgMime) {
  const key = env.MISTRAL_KEY; if (!key) throw new Error('no key');
  const model = imgB64 ? 'pixtral-12b-2409' : 'mistral-small-latest';
  const c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: 'data:' + imgMime + ';base64,' + imgB64 }] : prompt;
  const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || 'HTTP ' + r.status);
  return d.choices?.[0]?.message?.content || '';
}

async function callAvalAIText(env, prompt, imgB64, imgMime) {
  const key = env.AVALAI_KEY; if (!key) throw new Error('no key');
  const c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  const r = await fetch('https://api.avalai.ir/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: 'gemini-2.0-flash', messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || 'HTTP ' + r.status);
  return d.choices?.[0]?.message?.content || '';
}

async function callHuggingFaceText(env, prompt, imgB64, imgMime) {
  const key = env.HUGGINGFACE_KEY; if (!key) throw new Error('no key');
  const model = imgB64 ? 'Qwen/Qwen2.5-VL-7B-Instruct' : 'meta-llama/Meta-Llama-3-8B-Instruct';
  const c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  const r = await fetch('https://api-inference.huggingface.co/models/' + model + '/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || 'HTTP ' + r.status);
  return d.choices?.[0]?.message?.content || '';
}

async function callCloudflareText(env, prompt, imgB64, imgMime) {
  const key = env.CLOUDFLARE_KEY; if (!key) throw new Error('no key');
  const [acc, tok] = key.split(':');
  const model = imgB64 ? '@cf/meta/llama-3.2-11b-vision-instruct' : '@cf/meta/llama-3.1-8b-instruct';
  const c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  const r = await fetch('https://api.cloudflare.com/client/v4/accounts/' + acc + '/ai/run/' + model, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
    body: JSON.stringify({ messages: [{ role: 'user', content: c }] })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.errors?.[0]?.message || 'HTTP ' + r.status);
  return d.result?.response || '';
}

async function callNvidiaText(env, prompt, imgB64, imgMime) {
  const key = env.NVIDIA_KEY; if (!key) throw new Error('no key');
  const model = imgB64 ? 'meta/llama-3.2-90b-vision-instruct' : 'meta/llama-3.3-70b-instruct';
  const c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  const r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || 'HTTP ' + r.status);
  return d.choices?.[0]?.message?.content || '';
}

async function callLLM7Text(env, prompt, imgB64, imgMime) {
  const key = env.LLM7_KEY || 'unused';
  const models = ['pro', 'default'];
  let last = '';
  for (const m of models) {
    try {
      const c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
      const r = await fetch('https://api.llm7.io/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model: m, messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
      });
      const d = await r.json();
      if (r.ok) { const t = d?.choices?.[0]?.message?.content; if (t) return t; }
      last = d?.error?.message || 'HTTP ' + r.status;
    } catch (e) { last = e.message; }
  }
  throw new Error('LLM7: ' + last);
}

async function callMetisText(env, prompt, imgB64, imgMime) {
  const key = env.METIS_KEY; if (!key) throw new Error('no key');
  const c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  const r = await fetch('https://api.metisai.ir/openai/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || 'HTTP ' + r.status);
  return d.choices?.[0]?.message?.content || '';
}

async function callOneXAiText(env, prompt, imgB64, imgMime) {
  const key = env.ONEXAI_KEY; if (!key) throw new Error('no key');
  const c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  const r = await fetch('https://1xai.ir/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 10000 })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || 'HTTP ' + r.status);
  return d.choices?.[0]?.message?.content || '';
}

const PROVIDER_FUNCS = {
  gemini: callGeminiText, aiprime: callAIPrimeText, groq: callGroqText, github: callGitHubText,
  together: callTogetherText, gapgpt: callGapGPTText, openrouter: callOpenRouterText,
  mistral: callMistralText, huggingface: callHuggingFaceText, cloudflare: callCloudflareText,
  nvidia: callNvidiaText, llm7: callLLM7Text, avalai: callAvalAIText, metis: callMetisText, onexai: callOneXAiText
};

async function callWithFallback(env, prompt, imgB64, imgMime, chatId, forcedProvider) {
  let providers;
  if (forcedProvider && forcedProvider !== 'auto' && PROVIDER_FUNCS[forcedProvider] &&
      (forcedProvider === 'gemini' ? getGeminiKeys(env).length > 0 : getKey(env, forcedProvider))) {
    providers = [forcedProvider];
  } else {
    providers = getAvailableProviders(env);
    const hasImg = !!imgB64;
    const pri = hasImg
      ? { gemini:1, aiprime:2, gapgpt:3, groq:4, openrouter:5, mistral:6, together:7, nvidia:8, huggingface:9, github:10, cloudflare:11, avalai:12, metis:13, onexai:14, llm7:15 }
      : { aiprime:1, gapgpt:2, github:3, groq:4, together:5, openrouter:6, mistral:7, llm7:8, avalai:9, metis:10, onexai:11, huggingface:12, nvidia:13, cloudflare:14, gemini:99 };
    providers.sort((a, b) => (pri[a] || 50) - (pri[b] || 50));
  }
  if (!providers.length) throw new Error('هیچ سرویس فعال نیست');
  const errs = [];
  for (const p of providers) {
    try {
      const timeout = (p === 'gapgpt' || p === 'aiprime') ? 30000 : 18000;
      const r = await withTimeout(PROVIDER_FUNCS[p](env, prompt, imgB64, imgMime, chatId), timeout, p);
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
  let sym = String(symbol).toUpperCase().replace(/[\/\-_]/g, '');
  if (sym.endsWith('USDT')) {}
  else if (sym.endsWith('USD')) sym = sym.replace(/USD$/, 'USDT');
  else if (sym.endsWith('USDC')) {}
  else if (/^[A-Z]+$/.test(sym)) sym = sym + 'USDT';
  const interval = BINANCE_INTERVALS[tf] || '1h';
  const path = '/api/v3/klines?symbol=' + sym + '&interval=' + interval + '&limit=200';
  const endpoints = [
    'https://api.binance.com' + path,
    'https://data-api.binance.vision' + path,
    'https://api1.binance.com' + path,
    'https://api2.binance.com' + path,
    'https://api3.binance.com' + path
  ];
  let last = '';
  for (const url of endpoints) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) { last = 'HTTP ' + r.status; continue; }
      const d = await r.json();
      if (!Array.isArray(d) || !d.length) { last = 'empty'; continue; }
      return d.map(k => ({ datetime: new Date(k[0]).toISOString(), open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] }));
    } catch (e) { last = e.message; }
  }
  throw new Error('Binance: ' + last);
}

async function fetchTwelveData(symbol, interval, apiKey, size) {
  const url = new URL('https://api.twelvedata.com/time_series');
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('interval', interval);
  url.searchParams.set('outputsize', size || 200);
  url.searchParams.set('apikey', apiKey);
  const r = await fetch(url.toString());
  const d = await r.json();
  if (d.status === 'error' || d.code) throw new Error(d.message || 'Twelve error');
  if (!d.values || !d.values.length) throw new Error('Twelve: empty');
  const result = [];
  for (let i = d.values.length - 1; i >= 0; i--) {
    const v = d.values[i];
    result.push({ datetime: v.datetime || '', open: parseFloat(v.open), high: parseFloat(v.high), low: parseFloat(v.low), close: parseFloat(v.close), volume: parseFloat(v.volume || 0) });
  }
  return result;
}

async function getCurrentPrice(symbol, apiKey) {
  if (isCryptoSymbol(symbol)) {
    let s = String(symbol).toUpperCase().replace(/[\/\-_]/g, '');
    if (s.endsWith('USD')) s = s.replace(/USD$/, 'USDT');
    const r = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=' + s);
    const d = await r.json();
    if (d.price) return parseFloat(d.price);
    throw new Error('Binance price error');
  }
  const r = await fetch('https://api.twelvedata.com/price?symbol=' + encodeURIComponent(symbol) + '&apikey=' + apiKey);
  const d = await r.json();
  if (d.status === 'error' || d.code) throw new Error(d.message || 'Twelve price error');
  return parseFloat(d.price);
}

async function fetchMarketData(symbol, tf, env, provider) {
  provider = provider || 'auto';
  const tk = env.TWELVE_KEY;
  const isCrypto = isCryptoSymbol(symbol);
  const tdInterval = TD_INTERVALS[tf] || '1h';

  if (provider === 'binance') {
    if (!isCrypto) throw new Error('Binance فقط کریپتو');
    return await withTimeout(fetchBinanceData(symbol, tf), 20000, 'Binance');
  }
  if (provider === 'twelve') {
    if (!tk) throw new Error('Twelve Key خالی');
    return await withTimeout(fetchTwelveData(symbol, tdInterval, tk, 200), 18000, 'Twelve');
  }
  if (isCrypto) {
    try { return await withTimeout(fetchBinanceData(symbol, tf), 20000, 'Binance'); }
    catch (e1) {
      if (tk) return await withTimeout(fetchTwelveData(symbol, tdInterval, tk, 200), 18000, 'Twelve');
      throw new Error('Binance fail و Twelve key نداری. VPN روشن کن یا Twelve key بده');
    }
  }
  if (tk) return await withTimeout(fetchTwelveData(symbol, tdInterval, tk, 200), 18000, 'Twelve');
  throw new Error('Twelve Key لازم است (فارکس/طلا)');
}

function klinesToText(klines, symbol, tfName) {
  if (!klines || !klines.length) return '';
  const last = klines[klines.length - 1];
  const rows = klines.slice(-40).slice(-25).map(k => {
    const t = k.datetime ? formatTime(k.datetime) : '';
    return '  ' + t + ' | O:' + k.open + ' H:' + k.high + ' L:' + k.low + ' C:' + k.close;
  }).join('\n');
  const isCrypto = isCryptoSymbol(symbol);
  const header = isCrypto ? '=== ' + tfName + ' (' + symbol + ') [CRYPTO] ===' : '=== ' + tfName + ' (' + symbol + ') ===';
  return header + '\nقیمت فعلی: ' + last.close + '\n\n' + rows;
}

function normalizeSymbol(s) {
  if (!s) return '';
  const c = s.trim().toUpperCase();
  if (c.indexOf('/') !== -1) return c;
  const m = c.match(/^([A-Z]+)(USD|EUR|GBP|JPY|CHF|AUD|CAD|NZD)$/);
  if (m) return m[1] + '/' + m[2];
  return c;
}
function timeframeLabel(tf) { return TF_LABELS[tf] || tf; }
function regimeLabel(r) { return { TRENDING_UP:'📈 صعودی',TRENDING_DOWN:'📉 نزولی',RANGING:'↔️ رنج',TRANSITIONAL:'🔄 گذار' }[r] || ''; }
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
  return { inline_keyboard: [
    [{ text: '📊 تحلیل جدید', callback_data: 'menu_analyze' }, { text: '🎯 MTF', callback_data: 'menu_mtf' }],
    [{ text: '🤖 مانیتور خودکار', callback_data: 'menu_monitor' }, { text: '📸 تصویر', callback_data: 'menu_image' }],
    [{ text: '📓 ژورنال', callback_data: 'menu_journal' }, { text: '🔔 هشدار', callback_data: 'menu_watch' }],
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
    [{ text: '🏠 منو', callback_data: 'menu_main' }]
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
  const b = []; let row = [];
  for (const p of list) {
    const ic = { gemini:'🌟',aiprime:'🅰️',groq:'⚡',openrouter:'🔀',mistral:'🌬️',github:'🐙',together:'🤝',gapgpt:'💎',huggingface:'🤗',cloudflare:'☁️',nvidia:'🟢',llm7:'🎁',avalai:'🇮🇷',metis:'🇮🇷',onexai:'🇮🇷' }[p] || '🤖';
    row.push({ text: ic + ' ' + (PROVIDER_NAMES[p] || p), callback_data: 'pvd_' + p + '_' + sr + '_' + (isMTF ? 'MTF' : tf) });
    if (row.length === 2) { b.push(row); row = []; }
  }
  if (row.length) b.push(row);
  b.push([{ text: '◀️ بازگشت', callback_data: isMTF ? 'menu_main' : 'menu_analyze' }]);
  return { inline_keyboard: b };
}

function journalMenu() { return { inline_keyboard: [
  [{ text: '➕ ثبت معامله', callback_data: 'journal_add' }],
  [{ text: '📋 لیست', callback_data: 'journal_list' }, { text: '📊 آمار', callback_data: 'journal_stats' }],
  [{ text: '🗑️ پاک', callback_data: 'journal_clear' }],
  [{ text: '🏠 منو', callback_data: 'menu_main' }]
]}; }
function watchMenu() { return { inline_keyboard: [
  [{ text: '➕ هشدار', callback_data: 'watch_add' }],
  [{ text: '📋 لیست', callback_data: 'watch_list' }],
  [{ text: '🗑️ پاک', callback_data: 'watch_clear' }],
  [{ text: '🏠 منو', callback_data: 'menu_main' }]
]}; }
function modeMenu(cur) { const m = x => cur === x ? ' ✅' : ''; return { inline_keyboard: [
  [{ text: '⚡ اسکلپی' + m('scalping'), callback_data: 'mode_scalping' }],
  [{ text: '⚖️ متوسط' + m('medium'), callback_data: 'mode_medium' }],
  [{ text: '🛡️ مطمئن' + m('confident'), callback_data: 'mode_confident' }],
  [{ text: '◀️ بازگشت', callback_data: 'menu_settings' }]
]}; }
function confluenceModeMenu(cur) { const m = x => cur === x ? ' ✅' : ''; return { inline_keyboard: [
  [{ text: '🔵 عادی' + m('normal'), callback_data: 'conf_normal' }],
  [{ text: '🟢 خودکار' + m('auto'), callback_data: 'conf_auto' }],
  [{ text: '🔴 اجبار' + m('force'), callback_data: 'conf_force' }],
  [{ text: '◀️ بازگشت', callback_data: 'menu_settings' }]
]}; }
function strictnessMenu(cur) { const m = x => cur === x ? ' ✅' : ''; return { inline_keyboard: [
  [{ text: '🔴 سختگیر' + m('hard'), callback_data: 'strict_hard' }],
  [{ text: '🟢 آسان' + m('easy'), callback_data: 'strict_easy' }],
  [{ text: '◀️ بازگشت', callback_data: 'menu_settings' }]
]}; }
function kzModeMenu(cur) { const m = x => cur === x ? ' ✅' : ''; return { inline_keyboard: [
  [{ text: '🌐 ۲۴/۷' + m('off'), callback_data: 'kz_off' }],
  [{ text: '⭐ اولویت KZ' + m('priority'), callback_data: 'kz_priority' }],
  [{ text: '🔒 فقط KZ' + m('only'), callback_data: 'kz_only' }],
  [{ text: '◀️ بازگشت', callback_data: 'menu_settings' }]
]}; }
function modelTierMenu(cur) { const m = x => cur === x ? ' ✅' : ''; return { inline_keyboard: [
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
  [{ text: '📖 راهنمای مانیتور', callback_data: 'mon_help' }],
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
  const isCrypto = isCryptoSymbol(sym);
  return { inline_keyboard: [
    [{ text: isCrypto ? '🟡 Binance (پیشنهاد)' : '📊 Twelve (پیشنهاد)', callback_data: 'mdp_' + (isCrypto ? 'binance' : 'twelve') + '_' + sym + '_' + tf + '_' + ai }],
    [{ text: '🔄 خودکار', callback_data: 'mdp_auto_' + sym + '_' + tf + '_' + ai }],
    [{ text: '◀️ بازگشت', callback_data: 'mon_add' }]
  ]};
}

// ============================================
// SEND
// ============================================

async function sendOrEdit(t, c, mid, text, kb) {
  if (mid) {
    try {
      const r = await fetch('https://api.telegram.org/bot' + t + '/editMessageText', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: c, message_id: mid, text: text.slice(0, 4000), parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: kb })
      });
      const d = await r.json();
      if (d.ok) return d;
    } catch (e) {}
  }
  return await sendMessage(t, c, text, kb);
}
async function sendMessage(t, c, text, kb) {
  const p = { chat_id: c, text: text.slice(0, 4000), parse_mode: 'HTML', disable_web_page_preview: true };
  if (kb) p.reply_markup = kb;
  const r = await fetch('https://api.telegram.org/bot' + t + '/sendMessage', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p)
  });
  return r.json();
}
async function answerCallback(t, cid) {
  await fetch('https://api.telegram.org/bot' + t + '/answerCallbackQuery', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callback_query_id: cid })
  });
}
async function downloadTelegramPhoto(t, fid) {
  const r1 = await fetch('https://api.telegram.org/bot' + t + '/getFile?file_id=' + fid);
  const d1 = await r1.json();
  if (!d1.ok) throw new Error('getFile');
  const r2 = await fetch('https://api.telegram.org/file/bot' + t + '/' + d1.result.file_path);
  const buf = await r2.arrayBuffer();
  const b = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < b.length; i += 8192) bin += String.fromCharCode.apply(null, b.subarray(i, i + 8192));
  return { base64: btoa(bin), size: b.length };
}

// ============================================
// FORMATTING
// ============================================

function tgFormat(text) {
  const c = text.replace(/```json[\s\S]*?```/gi, '').replace(/```[\s\S]*?```/g, '');
  let h = c.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  h = h.replace(/^#{1,4}\s*(.+)$/gm, '\n━━━━━━━━━━━━━━━\n📌 <b>$1</b>\n━━━━━━━━━━━━━━━');
  h = h.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  h = h.replace(/\n{3,}/g, '\n\n');
  return h.trim();
}
function buildConfBlock(conf, levels) {
  if (!conf) return '';
  let c = '';
  let score = conf.confluence != null ? conf.confluence : (levels ? levels.confluenceScore : null);
  if (score == null && conf.scores) {
    let sum = 0, cnt = 0;
    for (const k in conf.scores) if (typeof conf.scores[k] === 'number') { sum += conf.scores[k]; cnt++; }
    if (cnt) score = Math.round((sum / cnt / 10) * 10) / 10;
  }
  if (score != null) {
    const e = score >= 8 ? '🔥' : score >= 6 ? '✅' : score >= 4 ? '⚠️' : '❌';
    c += '\n<b>هم‌گرایی:</b> ' + e + ' <b>' + score + '/10</b>' + (conf.auto ? ' <i>(خودکار)</i>' : '') + '\n';
  }
  if (conf.scores) {
    c += '\n📌 <b>چیپ‌های هم‌گرایی:</b>\n';
    for (const k of CONF_KEYS) {
      const v = conf.scores[k];
      if (v == null) c += '◯ ' + CONF_LABELS[k] + '\n';
      else { const ic = v >= 80 ? '🟢' : v >= 60 ? '🟡' : v >= 40 ? '🟠' : '🔴'; c += ic + ' ' + CONF_LABELS[k] + ' (' + v + ')\n'; }
    }
  }
  if (conf.warning) c += conf.warning;
  return c;
}

function buildCaption(levels, symbol, tf, provider, conf, currentPrice) {
  const isCrypto = isCryptoSymbol(symbol);
  const symIcon = isCrypto ? '🪙' : '💱';
  let c = '<b>📊 تحلیل</b>\n\n<b>نماد:</b> ' + symIcon + ' ' + symbol + '\n<b>TF:</b> ' + timeframeLabel(tf) + '\n';
  if (provider) c += '<b>سرویس:</b> ' + esc(provider) + '\n';
  c += '<b>وضعیت:</b> ' + getKZBadge(symbol) + '\n\n';
  const d = levels.direction || 'WAIT';
  c += '<b>جهت:</b> ' + (d === 'BUY' ? '🟢 خرید' : d === 'SELL' ? '🔴 فروش' : '⏸️ انتظار') + '\n';
  if (levels.regime) c += '<b>رژیم:</b> ' + regimeLabel(levels.regime) + '\n';
  if (levels.confidence != null) c += '<b>اطمینان:</b> ' + levels.confidence + '%\n';
  if (d !== 'WAIT' && levels.entry != null && currentPrice) c += buildEntryTypeLine(levels, currentPrice);
  c += '\n';
  if (d === 'WAIT') c += '<i>ستاپ معتبر نیست.</i>\n';
  else {
    if (levels.entry != null) c += '<b>🎯 ورود:</b> <code>' + levels.entry + '</code>\n';
    if (levels.sl != null) c += '<b>🛑 SL:</b> <code>' + levels.sl + '</code>\n';
    if (levels.tp1 != null) c += '<b>✅ TP1:</b> <code>' + levels.tp1 + '</code>\n';
    if (levels.tp2 != null) c += '<b>✅ TP2:</b> <code>' + levels.tp2 + '</code>\n';
    if (levels.tp3 != null) c += '<b>✅ TP3:</b> <code>' + levels.tp3 + '</code>\n';
    if (levels.rr) c += '<b>⚖️ R/R:</b> <code>' + levels.rr + '</code>\n';
  }
  if (conf) c += buildConfBlock(conf, levels);
  return c;
}

function buildMTFCaption(levels, symbol, provider, conf, currentPrice) {
  const isCrypto = isCryptoSymbol(symbol);
  const symIcon = isCrypto ? '🪙' : '💱';
  let c = '<b>🎯 MTF</b>\n\n<b>نماد:</b> ' + symIcon + ' ' + symbol + '\n';
  if (provider) c += '<b>سرویس:</b> ' + esc(provider) + '\n';
  c += '<b>وضعیت:</b> ' + getKZBadge(symbol) + '\n\n';
  if (levels.htf || levels.mtf || levels.ltf || levels.entryTf) {
    c += '<b>📊 TF:</b>\n• 4H: ' + directionEmoji(levels.htf) + '\n• 1H: ' + directionEmoji(levels.mtf) + '\n• 15M: ' + directionEmoji(levels.ltf) + '\n• 1M: ' + directionEmoji(levels.entryTf) + '\n\n';
  }
  const d = levels.direction || 'WAIT';
  c += '<b>جهت:</b> ' + (d === 'BUY' ? '🟢' : d === 'SELL' ? '🔴' : '⏸️') + '\n';
  if (levels.confidence != null) c += '<b>اطمینان:</b> ' + levels.confidence + '%\n';
  if (d !== 'WAIT' && levels.entry != null && currentPrice) c += buildEntryTypeLine(levels, currentPrice);
  c += '\n';
  if (d !== 'WAIT') {
    if (levels.entry != null) c += '<b>🎯 ورود:</b> <code>' + levels.entry + '</code>\n';
    if (levels.sl != null) c += '<b>🛑 SL:</b> <code>' + levels.sl + '</code>\n';
    if (levels.tp1 != null) c += '<b>✅ TP1:</b> <code>' + levels.tp1 + '</code>\n';
    if (levels.rr) c += '<b>⚖️ R/R:</b> <code>' + levels.rr + '</code>\n';
  }
  if (conf) c += buildConfBlock(conf, levels);
  return c;
}

function buildImageCaption(levels, provider, conf, currentPrice) {
  let c = '<b>📸 تصویر</b>\n';
  if (provider) c += '<b>سرویس:</b> ' + esc(provider) + '\n';
  c += '\n';
  if (levels.detectedSymbol && levels.detectedSymbol !== 'UNKNOWN') c += '<b>نماد:</b> ' + levels.detectedSymbol + '\n';
  const d = levels.direction || 'WAIT';
  c += '<b>جهت:</b> ' + (d === 'BUY' ? '🟢' : d === 'SELL' ? '🔴' : '⏸️') + '\n';
  if (levels.confidence != null) c += '<b>اطمینان:</b> ' + levels.confidence + '%\n';
  if (d !== 'WAIT' && levels.entry != null && currentPrice) c += buildEntryTypeLine(levels, currentPrice);
  c += '\n';
  if (d !== 'WAIT') {
    if (levels.entry != null) c += '<b>🎯 ورود:</b> <code>' + levels.entry + '</code>\n';
    if (levels.sl != null) c += '<b>🛑 SL:</b> <code>' + levels.sl + '</code>\n';
    if (levels.tp1 != null) c += '<b>✅ TP1:</b> <code>' + levels.tp1 + '</code>\n';
    if (levels.rr) c += '<b>⚖️ R/R:</b> <code>' + levels.rr + '</code>\n';
  }
  if (conf) c += buildConfBlock(conf, levels);
  return c;
}

// ============================================
// MENU VIEWS
// ============================================

async function showMainMenu(t, c, mid) {
  await sendOrEdit(t, c, mid, '🎯 <b>Everest v4.1</b>\n\n🆕 Entry Type (LIMIT/MARKET/STOP)\n🌐 KZ Mode · 🪙 کریپتو · 🤖 مانیتور\n\nاز منو:', mainMenu());
}
async function showSymbolMenu(t, c, mid) { await sendOrEdit(t, c, mid, '🎯 <b>نماد:</b>\n\n💱 فارکس · 🪙 کریپتو', symbolMenu()); }
async function showTimeframeMenu(t, c, mid, sr) {
  const sym = normalizeSymbol(sr);
  const isCrypto = isCryptoSymbol(sym);
  await sendOrEdit(t, c, mid, '⏰ <b>روش تحلیل ' + (isCrypto ? '🪙 ' : '💱 ') + sym + '</b>', timeframeMenu(sr));
}
async function showProviderMenu(t, c, mid, sr, tf, isMTF, env) {
  const av = getAvailableProviders(env);
  if (!av.length) { await sendOrEdit(t, c, mid, '❌ سرویس فعال نیست', { inline_keyboard: [[{ text: '🏠', callback_data: 'menu_main' }]] }); return; }
  const st = await getStrictness(env, c);
  const kzMode = await getKzMode(env, c);
  const mode = await getUserMode(env, c);
  const cfg = MODE_CONFIG[mode];
  const text = '<b>🎯 انتخاب AI</b>\n\n' +
    '<b>نماد:</b> ' + normalizeSymbol(sr) + '\n' +
    '<b>روش:</b> ' + (isMTF ? 'MTF' : timeframeLabel(tf)) + '\n' +
    '<b>حالت:</b> ' + cfg.icon + ' ' + cfg.label + '\n' +
    '<b>نوع:</b> ' + STRICTNESS_MODES[st].icon + ' ' + STRICTNESS_MODES[st].label + '\n' +
    '<b>KZ Mode:</b> ' + KZ_MODES[kzMode].icon + ' ' + KZ_MODES[kzMode].label;
  await sendOrEdit(t, c, mid, text, providerMenu(av, sr, tf, isMTF));
}

async function showJournalMenu(t, c, mid, env) {
  const j = await getJournal(env, c);
  let txt = '📓 <b>ژورنال</b>\n\n';
  if (j.length) {
    const w = j.filter(x => x.result === 'win').length;
    const l = j.filter(x => x.result === 'loss').length;
    txt += '📈 ' + j.length + ' معامله\n✅ ' + w + ' برد\n❌ ' + l + ' باخت\n';
  } else txt += '<i>خالی</i>';
  await sendOrEdit(t, c, mid, txt, journalMenu());
}
async function showWatchMenu(t, c, mid, env) {
  const l = await getWatchlist(env, c);
  await sendOrEdit(t, c, mid, '🔔 <b>هشدارها</b>\n\n' + (l.length ? l.length + ' هشدار فعال' : '<i>خالی</i>'), watchMenu());
}

async function showMonitorMenu(t, c, mid, env) {
  const list = await getMonitors(env, c);
  let txt = '🤖 <b>مانیتور خودکار</b>\n\n';
  if (list.length) {
    txt += '📋 ' + list.length + ' مانیتور:\n\n';
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      const isCrypto = isCryptoSymbol(m.symbol);
      txt += (m.active ? '🟢' : '⏸️') + ' #' + (i + 1) + ' ' + (isCrypto ? '🪙' : '💱') + ' <b>' + m.symbol + '</b> ' + timeframeLabel(m.timeframe) + '\n';
      if (m.signalCount) txt += '   📊 ' + m.signalCount + ' سیگنال';
      if (m.kzSignalCount) txt += ' · ' + m.kzSignalCount + ' KZ';
      txt += '\n';
    }
  } else {
    txt += '⚪ <b>غیرفعال</b>\n\n';
    txt += 'با فعال‌سازی، ربات هر کندل بسته، بازار را تحلیل می‌کند و در صورت ستاپ معتبر، سیگنال با <b>نوع ورود</b> می‌فرستد.\n\n';
    txt += '<b>🆕 سیگنال شامل:</b>\n• 🔵 BUY LIMIT / 🟡 BUY STOP\n• ⚡ MARKET\n• 🎯 Entry + SL + TP + R/R\n';
  }
  await sendOrEdit(t, c, mid, txt, monitorMenu());
}

async function showMonitorList(t, c, mid, env) {
  const list = await getMonitors(env, c);
  if (!list.length) { await sendOrEdit(t, c, mid, '📋 خالی', { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_monitor' }]] }); return; }
  const b = list.map((m, i) => [{
    text: (m.active ? '🟢' : '⏸️') + ' #' + (i + 1) + ' ' + m.symbol + ' ' + timeframeLabel(m.timeframe),
    callback_data: 'mon_view_' + i
  }]);
  b.push([{ text: '◀️ بازگشت', callback_data: 'menu_monitor' }]);
  let txt = '📋 <b>لیست مانیتورها</b>\n\n';
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    txt += '#' + (i + 1) + ' ' + (m.active ? '🟢' : '⏸️') + ' <b>' + m.symbol + '</b> ' + timeframeLabel(m.timeframe) + '\n';
    txt += '   📊 ' + (m.signalCount || 0) + ' سیگنال';
    if (m.lastSignal) txt += ' · آخرین: ' + m.lastSignal.dir;
    txt += '\n';
  }
  await sendOrEdit(t, c, mid, txt, { inline_keyboard: b });
}

async function showMonitorView(t, c, mid, env, idx) {
  const list = await getMonitors(env, c);
  if (!list[idx]) { await sendOrEdit(t, c, mid, '❌', { inline_keyboard: [[{ text: '◀️', callback_data: 'mon_list' }]] }); return; }
  const m = list[idx];
  const isCrypto = isCryptoSymbol(m.symbol);
  const kzMode = await getKzMode(env, c);
  const strict = await getStrictness(env, c);
  const mode = await getUserMode(env, c);
  const cfg = MODE_CONFIG[mode];

  let txt = '🤖 <b>مانیتور #' + (idx + 1) + '</b>\n\n';
  txt += '<b>نماد:</b> ' + (isCrypto ? '🪙' : '💱') + ' ' + m.symbol + '\n';
  txt += '<b>TF:</b> ' + timeframeLabel(m.timeframe) + '\n';
  txt += '<b>سرویس AI:</b> ' + (m.aiProvider === 'auto' ? '🤖 خودکار' : (PROVIDER_NAMES[m.aiProvider] || m.aiProvider)) + '\n';
  txt += '<b>منبع داده:</b> ' + ({ auto: '🔄 خودکار', binance: '🟡 Binance', twelve: '📊 Twelve' }[m.dataProvider] || m.dataProvider) + '\n';
  txt += '<b>وضعیت:</b> ' + (m.active ? '🟢 فعال' : '⏸️ متوقف') + '\n';
  txt += '<b>حالت:</b> ' + cfg.icon + ' ' + cfg.label + '\n';
  txt += '<b>نوع:</b> ' + STRICTNESS_MODES[strict].icon + ' ' + STRICTNESS_MODES[strict].label + '\n';
  txt += '<b>KZ Mode:</b> ' + KZ_MODES[kzMode].icon + ' ' + KZ_MODES[kzMode].label + '\n\n';
  txt += '<b>📊 آمار:</b>\n';
  txt += '• سیگنال کل: <b>' + (m.signalCount || 0) + '</b>\n';
  txt += '• سیگنال KZ: <b>' + (m.kzSignalCount || 0) + '</b>\n';
  if (m.lastSignal) txt += '• آخرین: ' + m.lastSignal.dir + ' @ ' + m.lastSignal.entry + '\n';
  if (m.lastCheckAt) {
    const mins = Math.floor((Date.now() - m.lastCheckAt) / 60000);
    txt += '• آخرین بررسی: ' + mins + ' دقیقه پیش\n';
  }
  if (m.lastError) txt += '\n⚠️ خطا: <code>' + esc(m.lastError) + '</code>\n';

  await sendOrEdit(t, c, mid, txt, { inline_keyboard: [
    [{ text: m.active ? '⏸️ توقف' : '▶️ شروع', callback_data: 'mon_toggle_' + idx }],
    [{ text: '🔄 شروع مجدد', callback_data: 'mon_restart_' + idx }],
    [{ text: '🗑️ حذف', callback_data: 'mon_del_' + idx }],
    [{ text: '◀️ بازگشت', callback_data: 'mon_list' }]
  ]});
}

async function showSettingsMenu(t, c, mid, env) {
  const cm = await getConfluenceMode(env, c);
  const cl = cm === 'force' ? '🔴' : cm === 'auto' ? '🟢' : '🔵';
  const um = await getUserMode(env, c);
  const uc = MODE_CONFIG[um];
  const aT = await getUserModelTier(env, c, 'aiprime');
  const gT = await getUserModelTier(env, c, 'gapgpt');
  const aL = aT === 'premium' ? '💎' : aT === 'deepseek' ? '🧠' : '🚀';
  const gL = gT === 'premium' ? '💎' : gT === 'deepseek' ? '🧠' : '🚀';
  const st = await getStrictness(env, c);
  const kz = await getKzMode(env, c);

  const text = '⚙️ <b>تنظیمات</b>\n\n' +
    '<b>🎚️ نوع:</b> ' + STRICTNESS_MODES[st].icon + ' ' + STRICTNESS_MODES[st].label + '\n' +
    '<b>⚙️ KZ Mode:</b> ' + KZ_MODES[kz].icon + ' ' + KZ_MODES[kz].label + '\n' +
    '<b>🎯 حالت:</b> ' + uc.icon + ' ' + uc.label + '\n' +
    '<b>🧠 هم‌گرایی:</b> ' + cl + '\n' +
    '<b>مدل:</b> A ' + aL + ' · G ' + gL;

  await sendOrEdit(t, c, mid, text, { inline_keyboard: [
    [{ text: '🎚️ نوع تحلیل', callback_data: 'settings_strict' }],
    [{ text: '⚙️ KZ Mode', callback_data: 'settings_kz' }],
    [{ text: '🎯 حالت معاملاتی', callback_data: 'settings_mode' }],
    [{ text: '🧠 هم‌گرایی', callback_data: 'settings_confluence' }],
    [{ text: '🎚️ سطح مدل', callback_data: 'settings_tier' }],
    [{ text: '🏠', callback_data: 'menu_main' }]
  ]});
}

async function showStatus(t, c, mid, env) {
  const all = ['gemini','aiprime','groq','github','together','gapgpt','openrouter','mistral','huggingface','cloudflare','nvidia','llm7','avalai','metis','onexai'];
  let txt = '📈 <b>وضعیت</b>\n\n';
  let act = 0;
  for (const p of all) {
    let hk;
    if (p === 'gemini') hk = getGeminiKeys(env).length > 0;
    else if (p === 'llm7') hk = true;
    else hk = !!getKey(env, p);
    if (hk) act++;
    txt += (hk ? '✅' : '❌') + ' ' + PROVIDER_NAMES[p] + '\n';
  }
  txt += '\n🎯 ' + act + '/' + all.length + '\n';
  txt += '📊 Twelve: ' + (env.TWELVE_KEY ? '✅' : '❌') + '\n';
  txt += '🪙 Binance: ✅ (رایگان)\n';
  txt += '💾 KV: ' + (env.KV ? '✅' : '❌');
  await sendOrEdit(t, c, mid, txt, { inline_keyboard: [[{ text: '🏠', callback_data: 'menu_main' }]] });
}

async function showHelp(t, c, mid) {
  const txt = '📖 <b>راهنما v4.1</b>\n\n' +
    '🆕 <b>Entry Type Detection:</b>\n' +
    '🔵 <b>LIMIT</b> — منتظر پول‌بک\n' +
    '⚡ <b>MARKET</b> — قیمت ≈ Entry\n' +
    '🟡 <b>STOP</b> — منتظر شکست\n\n' +
    '🤖 <b>مانیتور خودکار:</b>\nمنو → 🤖 مانیتور → ➕ جدید\nسیگنال‌ها با <b>نوع ورود</b> می‌آیند\n\n' +
    '🎚️ <b>نوع:</b> 🔴 سختگیر · 🟢 آسان\n' +
    '⚙️ <b>KZ Mode:</b> 🌐 ۲۴/۷ · ⭐ اولویت · 🔒 فقط KZ\n\n' +
    '<b>دستورات:</b>\n/menu /monitor /analyze /journal /watch /status /myid';
  await sendOrEdit(t, c, mid, txt, { inline_keyboard: [[{ text: '🏠', callback_data: 'menu_main' }]] });
}

async function showMonitorHelp(t, c, mid) {
  const txt = '📖 <b>راهنمای مانیتور</b>\n\n' +
    '🤖 <b>چطور کار می‌کند؟</b>\n' +
    'هر کندل بسته، ربات بازار را از منبع داده می‌گیرد، به AI می‌دهد، اعتبارسنجی می‌کند و اگر معتبر بود با <b>نوع ورود دقیق</b> می‌فرستد.\n\n' +
    '🎯 <b>Entry Type در سیگنال:</b>\n' +
    '• 🔵 <b>BUY LIMIT</b> @ 2645 — سفارش Limit بذار\n' +
    '• 🟡 <b>BUY STOP</b> @ 2655 — منتظر شکست\n' +
    '• ⚡ <b>MARKET</b> — قیمت = Entry\n\n' +
    '⚙️ <b>پیشنهاد طلا:</b>\n• منبع: Twelve\n• AI: AIPrime\n• KZ: ⭐ اولویت\n• نوع: 🔴 سختگیر';
  await sendOrEdit(t, c, mid, txt, { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_monitor' }]] });
}

async function showImageGuide(t, c, mid) {
  await sendOrEdit(t, c, mid, '📸 <b>تحلیل تصویر</b>\n\nعکس چارت بفرستید!', { inline_keyboard: [[{ text: '🏠', callback_data: 'menu_main' }]] });
}

// ============================================
// ANALYSIS RUNNERS
// ============================================

async function runAnalysis(t, c, symbol, env, tf, forcedProvider) {
  try {
    const pl = forcedProvider ? (PROVIDER_NAMES[forcedProvider] || forcedProvider) : 'خودکار';
    const mode = await getConfluenceMode(env, c);
    const um = await getUserMode(env, c);
    const uc = MODE_CONFIG[um];
    const st = await getStrictness(env, c);
    const kzMode = await getKzMode(env, c);
    const isCrypto = isCryptoSymbol(symbol);

    if (uc.allowedTFs.indexOf(tf) === -1) {
      await sendMessage(t, c, '⚠️ TF مجاز نیست. مجاز: ' + uc.allowedTFs.map(timeframeLabel).join(', '), { inline_keyboard: [[{ text: '⚙️', callback_data: 'menu_settings' }]] });
      return;
    }

    await sendMessage(t, c, '⏳ <b>' + symbol + '</b>\n🤖 ' + pl + '\n🎯 ' + uc.icon + ' · 🎚️ ' + STRICTNESS_MODES[st].icon + ' · ⚙️ ' + KZ_MODES[kzMode].icon);

    let klines = await fetchMarketData(symbol, tf, env);
    klines = dropForming(klines, tf);
    const currentPrice = klines[klines.length - 1]?.close;
    const atr = calcATR(klines, 14);

    const body = 'نماد: ' + symbol + '\nTF: ' + TF_LABELS[tf] + '\n\n' + klinesToText(klines, symbol, TF_LABELS[tf]);
    let fullPrompt = buildPromptForMode(SYSTEM_PROMPT, mode);
    if (isCrypto) fullPrompt += CRYPTO_NOTE;
    fullPrompt += '\n\n' + body;

    let result;
    if (forcedProvider && PROVIDER_FUNCS[forcedProvider]) {
      try {
        const txt = await withTimeout(PROVIDER_FUNCS[forcedProvider](env, fullPrompt, null, null, c), 30000, forcedProvider);
        if (txt && txt.length > 10) result = { text: txt, provider: PROVIDER_NAMES[forcedProvider] };
        else throw new Error('کوتاه');
      } catch (e) {
        await sendMessage(t, c, '❌ ' + forcedProvider + ': ' + e.message);
        result = await callWithFallback(env, fullPrompt, null, null, c);
      }
    } else result = await callWithFallback(env, fullPrompt, null, null, c);

    const levels = validateSignal(extractLevels(result.text), {
      strict: st, minRR: uc.minRR, minConfidence: uc.minConfidence,
      atr, price: currentPrice
    });
    const conf = await resolveConfluence(env, c, levels, result.text);

    await sendMessage(t, c, buildCaption(levels, symbol, TF_LABELS[tf], result.provider, conf, currentPrice));
    const ft = tgFormat(result.text);
    if (ft.length) for (let i = 0; i < ft.length; i += 3800) { await sendMessage(t, c, ft.slice(i, i + 3800)); await sleep(300); }
    await sendMessage(t, c, '🏠', { inline_keyboard: [[{ text: '🏠', callback_data: 'menu_main' }]] });
  } catch (e) { await sendMessage(t, c, '❌ <code>' + esc(e.message) + '</code>'); }
}

async function runMultiTFAnalysis(t, c, symbol, env, forcedProvider) {
  try {
    const pl = forcedProvider ? (PROVIDER_NAMES[forcedProvider] || forcedProvider) : 'خودکار';
    const mode = await getConfluenceMode(env, c);
    const st = await getStrictness(env, c);
    const um = await getUserMode(env, c);
    const uc = MODE_CONFIG[um];
    const isCrypto = isCryptoSymbol(symbol);

    await sendMessage(t, c, '🎯 MTF <b>' + symbol + '</b>\n🤖 ' + pl);

    let k4 = await fetchMarketData(symbol, '4h', env);
    let k1 = await fetchMarketData(symbol, '1h', env);
    let k15 = await fetchMarketData(symbol, '15min', env);
    let k1m = await fetchMarketData(symbol, '1min', env);
    k4 = dropForming(k4, '4h'); k1 = dropForming(k1, '1h'); k15 = dropForming(k15, '15min'); k1m = dropForming(k1m, '1min');
    const currentPrice = k1[k1.length - 1]?.close;
    const atr = calcATR(k15, 14);

    const p = 'نماد: ' + symbol + '\n\n4H:\n' + klinesToText(k4, symbol, '4H') + '\n\n1H:\n' + klinesToText(k1, symbol, '1H') + '\n\n15M:\n' + klinesToText(k15, symbol, '15M') + '\n\n1M:\n' + klinesToText(k1m, symbol, '1M');
    let fullPrompt = buildPromptForMode(MULTI_TF_PROMPT, mode);
    if (isCrypto) fullPrompt += CRYPTO_NOTE;
    fullPrompt += '\n\n' + p;

    let result;
    if (forcedProvider && PROVIDER_FUNCS[forcedProvider]) {
      try {
        const txt = await withTimeout(PROVIDER_FUNCS[forcedProvider](env, fullPrompt, null, null, c), 30000, forcedProvider);
        if (txt && txt.length > 10) result = { text: txt, provider: PROVIDER_NAMES[forcedProvider] };
        else throw new Error('کوتاه');
      } catch (e) { result = await callWithFallback(env, fullPrompt, null, null, c); }
    } else result = await callWithFallback(env, fullPrompt, null, null, c);

    const levels = validateSignal(extractLevels(result.text), {
      strict: st, minRR: uc.minRR, minConfidence: uc.minConfidence, atr, price: currentPrice
    });
    const conf = await resolveConfluence(env, c, levels, result.text);

    await sendMessage(t, c, buildMTFCaption(levels, symbol, result.provider, conf, currentPrice));
    const ft = tgFormat(result.text);
    if (ft.length) for (let i = 0; i < ft.length; i += 3800) { await sendMessage(t, c, ft.slice(i, i + 3800)); await sleep(300); }
    await sendMessage(t, c, '🏠', { inline_keyboard: [[{ text: '🏠', callback_data: 'menu_main' }]] });
  } catch (e) { await sendMessage(t, c, '❌ MTF: <code>' + esc(e.message) + '</code>'); }
}

async function runImageAnalysis(t, c, fid, env) {
  try {
    const mode = await getConfluenceMode(env, c);
    const st = await getStrictness(env, c);
    const um = await getUserMode(env, c);
    const uc = MODE_CONFIG[um];

    await sendMessage(t, c, '📸 دریافت...');
    const pd = await downloadTelegramPhoto(t, fid);
    if (pd.size > 5 * 1024 * 1024) { await sendMessage(t, c, '❌ > ۵MB'); return; }
    await sendMessage(t, c, '🧠 تحلیل...');

    let fullPrompt = buildPromptForMode(IMAGE_PROMPT, mode);
    const result = await callWithFallback(env, fullPrompt, pd.base64, 'image/jpeg', c);
    const levels = validateSignal(extractLevels(result.text), { strict: st, minRR: uc.minRR, minConfidence: uc.minConfidence });
    const conf = await resolveConfluence(env, c, levels, result.text);
    await sendMessage(t, c, buildImageCaption(levels, result.provider, conf, null));

    const clean = result.text.replace(/```json[\s\S]*?```/gi, '').replace(/```[\s\S]*?```/g, '');
    const ft = tgFormat(clean);
    if (ft.length > 20) for (let i = 0; i < ft.length; i += 3800) { await sendMessage(t, c, ft.slice(i, i + 3800)); await sleep(400); }
    await sendMessage(t, c, '🏠', { inline_keyboard: [[{ text: '🏠', callback_data: 'menu_main' }]] });
  } catch (e) { await sendMessage(t, c, '❌ <code>' + esc(e.message) + '</code>'); }
}

// ============================================
// MONITOR WIZARD
// ============================================

async function startMonitorWizard(t, c, env) {
  await setUserState(env, c, { action: 'mon_add', step: 'symbol', data: {} });
  await sendOrEdit(t, c, null, '🤖 <b>مانیتور جدید</b>\n\nمرحله ۱/۴ — <b>نماد:</b>', monitorSymbolMenu(false));
}

async function finishMonitorSetup(t, c, mid, symbol, tf, ai, dp, env) {
  const strict = await getStrictness(env, c);
  const mode = await getUserMode(env, c);
  const kzMode = await getKzMode(env, c);

  const list = await getMonitors(env, c);
  list.push({
    symbol, timeframe: tf, aiProvider: ai, dataProvider: dp,
    mode, strictness: strict, kzMode,
    active: true,
    startAt: Date.now(),
    lastCheckAt: 0,
    signalCount: 0,
    kzSignalCount: 0,
    lastSignal: null,
    lastSignalKey: null,
    lastError: null,
    skippedCount: 0
  });
  await saveMonitors(env, c, list);

  const isCrypto = isCryptoSymbol(symbol);
  const aiLabel = ai === 'auto' ? '🤖 خودکار' : (PROVIDER_NAMES[ai] || ai);
  const dpLabel = { auto: '🔄 خودکار', binance: '🟡 Binance', twelve: '📊 Twelve' }[dp] || dp;

  const msg = '✅ <b>مانیتور فعال شد</b>\n\n' +
    '<b>نماد:</b> ' + (isCrypto ? '🪙' : '💱') + ' ' + symbol + '\n' +
    '<b>تایم‌فریم:</b> ' + timeframeLabel(tf) + '\n' +
    '<b>سرویس AI:</b> ' + aiLabel + '\n' +
    '<b>منبع داده:</b> ' + dpLabel + '\n' +
    '<b>حالت:</b> ' + MODE_CONFIG[mode].icon + ' ' + MODE_CONFIG[mode].label + '\n' +
    '<b>نوع:</b> ' + STRICTNESS_MODES[strict].icon + ' ' + STRICTNESS_MODES[strict].label + '\n' +
    '<b>KZ Mode:</b> ' + KZ_MODES[kzMode].icon + ' ' + KZ_MODES[kzMode].label + '\n\n' +
    '📩 سیگنال‌ها با <b>نوع ورود دقیق</b> می‌آیند:\n' +
    '🔵 LIMIT · ⚡ MARKET · 🟡 STOP\n\n' +
    '⏱️ هر ~' + TF_MINUTES[tf] + ' دقیقه چک می‌شود';

  await sendOrEdit(t, c, mid, msg, { inline_keyboard: [
    [{ text: '📋 لیست', callback_data: 'mon_list' }],
    [{ text: '🏠 منو', callback_data: 'menu_main' }]
  ]});
}

// ============================================
// CRON MONITOR CHECK
// ============================================

async function checkAllMonitors(env) {
  try {
    const token = env.TG_TOKEN;
    const list = await env.KV.list({ prefix: 'monitors:' });
    const now = Date.now();

    for (const key of list.keys) {
      const chatId = key.name.replace('monitors:', '');
      const monitors = await env.KV.get(key.name, 'json') || [];
      if (!monitors.length) continue;

      const strict = await getStrictness(env, chatId);
      const mode = await getUserMode(env, chatId);
      const kzMode = await getKzMode(env, chatId);
      const cfg = MODE_CONFIG[mode];

      let changed = false;
      for (let i = 0; i < monitors.length; i++) {
        const m = monitors[i];
        if (!m.active) continue;

        const tfMs = (TF_MINUTES[m.timeframe] || 5) * 60 * 1000;
        if (m.lastCheckAt && (now - m.lastCheckAt) < tfMs * 0.9) continue;

        const kzCheck = shouldCheckNow(m.symbol, kzMode);
        if (!kzCheck.ok) {
          m.lastCheckAt = now;
          m.skippedCount = (m.skippedCount || 0) + 1;
          changed = true;
          continue;
        }

        try {
          await runMonitorForUser(env, token, chatId, m, strict, mode, cfg);
          m.lastCheckAt = Date.now();
          m.lastError = null;
          changed = true;
        } catch (e) {
          console.error('Monitor for ' + chatId + ': ' + e.message);
          m.lastCheckAt = Date.now();
          m.lastError = String(e.message).slice(0, 200);
          changed = true;
        }
        await sleep(400);
      }

      if (changed) await env.KV.put(key.name, JSON.stringify(monitors));
    }
  } catch (e) { console.error('checkAllMonitors: ' + e.message); }
}

async function runMonitorForUser(env, token, chatId, m, strict, mode, cfg) {
  const symbol = m.symbol;
  const tf = m.timeframe;
  const isCrypto = isCryptoSymbol(symbol);

  let klines = await fetchMarketData(symbol, tf, env, m.dataProvider || 'auto');
  if (!klines || klines.length < 30) return;
  klines = dropForming(klines, tf);

  const currentPrice = klines[klines.length - 1].close;
  const atr = calcATR(klines, 14);

  let promptBody = 'نماد: ' + symbol + '\nتایم‌فریم: ' + timeframeLabel(tf) + '\nقیمت فعلی: ' + currentPrice + '\n\n' + klinesToText(klines, symbol, timeframeLabel(tf));
  let facts = '\n\n🧮 حقایق محاسبه‌شده محلی:\n- ATR(14)=' + (atr ? atr.toFixed(4) : '?') + '\n';
  if (isCrypto) {
    const w = getCryptoLiquidityWindow();
    facts += '- 🪙 کریپتو: ' + (w.high ? 'لیکویید بالا' : w.active ? 'لیکویید متوسط' : 'لیکویید پایین') + '\n';
  } else {
    const kz = getKillZoneInfo();
    facts += '- ' + (kz.active ? '⚠️ داخل KZ — اولویت بالا' : '⚠️ خارج KZ — احتیاط') + '\n';
  }

  const confMode = await getConfluenceMode(env, chatId);
  let sysPrompt = buildPromptForMode(SYSTEM_PROMPT, confMode);
  if (isCrypto) sysPrompt += CRYPTO_NOTE;
  const fullPrompt = sysPrompt + '\n\n' + promptBody + facts;

  let result;
  const forcedProvider = m.aiProvider && m.aiProvider !== 'auto' ? m.aiProvider : null;
  if (forcedProvider && PROVIDER_FUNCS[forcedProvider]) {
    try {
      const txt = await withTimeout(PROVIDER_FUNCS[forcedProvider](env, fullPrompt, null, null, chatId), 30000, forcedProvider);
      if (txt && txt.length > 10) result = { text: txt, provider: PROVIDER_NAMES[forcedProvider] };
      else throw new Error('کوتاه');
    } catch (e) { result = await callWithFallback(env, fullPrompt, null, null, chatId); }
  } else result = await callWithFallback(env, fullPrompt, null, null, chatId);

  const levels = validateSignal(extractLevels(result.text), {
    strict, minRR: cfg.minRR, minConfidence: cfg.minConfidence,
    atr, price: currentPrice
  });
  const confluence = await resolveConfluence(env, chatId, levels, result.text);

  const ok = isSignalConfirmed(levels, confluence, strict, cfg);

  const tol = (atr || 0) * 0.5;
  const p = m.lastSignal;
  const dup = ok && p && p.dir === levels.direction && Math.abs(p.entry - levels.entry) <= tol && (Date.now() - p.t) < (TF_MINUTES[tf] || 5) * 60000 * 6;

  if (ok && !dup) {
    m.lastSignal = { dir: levels.direction, entry: levels.entry, t: Date.now() };
    m.signalCount = (m.signalCount || 0) + 1;
    const kzActive = isCrypto ? getCryptoLiquidityWindow().active : getKillZoneInfo().active;
    if (kzActive) m.kzSignalCount = (m.kzSignalCount || 0) + 1;
    m.lastSignalKey = levels.direction + '_' + Math.round(levels.entry * 10) / 10;

    await sendMonitorSignal(token, chatId, levels, confluence, result, currentPrice, symbol, tf);
  }
}

function isSignalConfirmed(levels, confluence, strict, cfg) {
  if (levels.direction !== 'BUY' && levels.direction !== 'SELL') return false;
  if (levels.confidence == null || levels.confidence < cfg.minConfidence) return false;
  if (!levels.entry || !levels.sl) return false;
  if (strict === 'hard') {
    if (!levels.tp1) return false;
    const rr = parseFloat((levels.rr || '').replace('1:', ''));
    if (isNaN(rr) || rr < cfg.minRR) return false;
    if (confluence && confluence.confluence != null && confluence.confluence < cfg.minConfluence) return false;
  }
  return true;
}

async function sendMonitorSignal(token, chatId, levels, confluence, result, currentPrice, symbol, tf) {
  const isCrypto = isCryptoSymbol(symbol);
  const symIcon = isCrypto ? '🪙' : '💱';
  const d = levels.direction;
  const dirIcon = d === 'BUY' ? '🟢' : '🔴';
  const kzBadge = getKZBadge(symbol);
  const et = detectEntryType(levels, currentPrice);

  let caption = '🚨 <b>سیگنال مانیتور</b>\n\n';
  caption += '<b>نماد:</b> ' + symIcon + ' ' + symbol + '\n';
  caption += '<b>تایم‌فریم:</b> ' + timeframeLabel(tf) + '\n';
  caption += '<b>وضعیت:</b> ' + kzBadge + '\n\n';

  caption += '<b>جهت:</b> ' + dirIcon + ' ' + (d === 'BUY' ? 'خرید' : 'فروش') + '\n';
  caption += '<b>قیمت فعلی:</b> <code>' + currentPrice.toFixed(2) + '</code>\n';
  if (levels.confidence != null) caption += '<b>اطمینان:</b> ' + levels.confidence + '%\n';
  caption += '\n';

  // Entry Type — prominent
  caption += '━━━━━━━━━━━━━━━\n';
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

  const keyboard = { inline_keyboard: [
    [{ text: '📖 تحلیل کامل', callback_data: 'mon_details' }],
    [{ text: '⏹️ توقف مانیتور', callback_data: 'mon_stop_all' }]
  ]};

  await sendMessage(token, chatId, caption, keyboard);

  const ft = tgFormat(result.text);
  if (ft.length > 100 && ft.length < 3500) {
    await sendMessage(token, chatId, '📖 <b>تحلیل کامل AI:</b>\n\n' + ft.slice(0, 3500));
  }
}

// ============================================
// JOURNAL / WATCH
// ============================================

async function showJournalList(t, c, env) {
  const j = await getJournal(env, c);
  if (!j.length) { await sendMessage(t, c, '📓 خالی', { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_journal' }]] }); return; }
  let txt = '<b>📓 لیست</b>\n\n';
  for (let i = 0; i < Math.min(j.length, 15); i++) {
    const x = j[i];
    const s = x.result === 'win' ? '✅' : x.result === 'loss' ? '❌' : '⏳';
    txt += s + ' #' + x.id + ' ' + x.symbol + ' ' + x.direction + '\n';
  }
  await sendMessage(t, c, txt, { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_journal' }]] });
}
async function showJournalStats(t, c, env) {
  const j = await getJournal(env, c);
  if (!j.length) { await sendMessage(t, c, '📓 خالی', { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_journal' }]] }); return; }
  const w = j.filter(x => x.result === 'win').length;
  const l = j.filter(x => x.result === 'loss').length;
  const p = j.filter(x => !x.result).length;
  const cl = w + l;
  const wr = cl > 0 ? (w / cl * 100).toFixed(1) : '0';
  await sendMessage(t, c, '<b>📊 آمار</b>\n\n📈 ' + j.length + '\n✅ ' + w + '\n❌ ' + l + '\n⏳ ' + p + '\n\nنرخ برد: <b>' + wr + '%</b>', { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_journal' }]] });
}
async function showWatchList(t, c, env) {
  const l = await getWatchlist(env, c);
  if (!l.length) { await sendMessage(t, c, '🔔 خالی', { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_watch' }]] }); return; }
  let txt = '<b>🔔</b>\n\n';
  for (const x of l) txt += '#' + x.id + ' ' + x.symbol + ' ' + (x.condition === 'above' ? '⬆️' : '⬇️') + ' ' + x.price + '\n';
  await sendMessage(t, c, txt, { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_watch' }]] });
}

// ============================================
// HANDLE CALLBACKS
// ============================================

async function handleCallback(t, c, mid, data, env) {
  if (data === 'menu_main') { await showMainMenu(t, c, mid); return; }
  if (data === 'menu_analyze') { await showSymbolMenu(t, c, mid); return; }
  if (data === 'menu_mtf') { await showSymbolMenu(t, c, mid); return; }
  if (data === 'menu_image') { await showImageGuide(t, c, mid); return; }
  if (data === 'menu_journal') { await showJournalMenu(t, c, mid, env); return; }
  if (data === 'menu_watch') { await showWatchMenu(t, c, mid, env); return; }
  if (data === 'menu_settings') { await showSettingsMenu(t, c, mid, env); return; }
  if (data === 'menu_status') { await showStatus(t, c, mid, env); return; }
  if (data === 'menu_help') { await showHelp(t, c, mid); return; }
  if (data === 'menu_monitor') { await showMonitorMenu(t, c, mid, env); return; }

  if (data === 'mon_help') { await showMonitorHelp(t, c, mid); return; }
  if (data === 'mon_list') { await showMonitorList(t, c, mid, env); return; }
  if (data === 'mon_add') { await startMonitorWizard(t, c, env); return; }
  if (data === 'mon_stop_all') { await saveMonitors(env, c, []); await sendOrEdit(t, c, mid, '⏹️ همه مانیتورها حذف شدند', { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_monitor' }]] }); return; }
  if (data === 'mon_crypto_list') { await sendOrEdit(t, c, mid, '🪙 <b>کریپتو:</b>', monitorSymbolMenu(true)); return; }

  if (data.indexOf('mon_view_') === 0) { await showMonitorView(t, c, mid, env, parseInt(data.replace('mon_view_', ''))); return; }
  if (data.indexOf('mon_toggle_') === 0) {
    const idx = parseInt(data.replace('mon_toggle_', ''));
    const list = await getMonitors(env, c);
    if (list[idx]) { list[idx].active = !list[idx].active; await saveMonitors(env, c, list); }
    await showMonitorView(t, c, mid, env, idx);
    return;
  }
  if (data.indexOf('mon_restart_') === 0) {
    const idx = parseInt(data.replace('mon_restart_', ''));
    const list = await getMonitors(env, c);
    if (list[idx]) { list[idx].lastCheckAt = 0; list[idx].lastError = null; list[idx].active = true; await saveMonitors(env, c, list); }
    await showMonitorView(t, c, mid, env, idx);
    return;
  }
  if (data.indexOf('mon_del_') === 0) {
    const idx = parseInt(data.replace('mon_del_', ''));
    const list = await getMonitors(env, c);
    list.splice(idx, 1);
    await saveMonitors(env, c, list);
    await sendOrEdit(t, c, mid, '🗑️ حذف شد', { inline_keyboard: [[{ text: '◀️', callback_data: 'mon_list' }]] });
    return;
  }
  if (data === 'mon_details') { await showMonitorMenu(t, c, mid, env); return; }

  // Monitor wizard
  if (data === 'mon_cancel') { await clearUserState(env, c); await sendOrEdit(t, c, mid, '❌ لغو', { inline_keyboard: [[{ text: '🏠', callback_data: 'menu_main' }]] }); return; }
  if (data.indexOf('msym_') === 0) {
    const symRaw = data.replace('msym_', '');
    if (symRaw === 'custom') {
      await setUserState(env, c, { action: 'mon_add', step: 'symbol_custom', data: {} });
      await sendOrEdit(t, c, mid, '✏️ نماد:\n\nمثال: XAU/USD · BTC/USD', { inline_keyboard: [[{ text: '❌ لغو', callback_data: 'mon_cancel' }]] });
      return;
    }
    await setUserState(env, c, { action: 'mon_add', step: 'tf', data: { symbol: symRaw } });
    await sendOrEdit(t, c, mid, '🤖 <b>مرحله ۲/۴ — تایم‌فریم:</b>\n\nنماد: ' + normalizeSymbol(symRaw), monitorTfMenu(symRaw));
    return;
  }
  if (data.indexOf('mtf2_') === 0) {
    const rest = data.replace('mtf2_', '');
    const tfm = rest.match(/_([^_]+)$/);
    if (!tfm) return;
    const symRaw = rest.slice(0, -tfm[0].length);
    const tf = tfm[1];
    await setUserState(env, c, { action: 'mon_add', step: 'ai', data: { symbol: symRaw, timeframe: tf } });
    await sendOrEdit(t, c, mid, '🤖 <b>مرحله ۳/۴ — سرویس AI:</b>', monitorAiMenu(symRaw, tf));
    return;
  }
  if (data.indexOf('mai_') === 0) {
    const rest = data.replace('mai_', '');
    const parts = rest.split('_');
    if (parts.length < 3) return;
    const ai = parts[0];
    const tf = parts[parts.length - 1];
    const sym = parts.slice(1, -1).join('_');
    await setUserState(env, c, { action: 'mon_add', step: 'dp', data: { symbol: sym, timeframe: tf, aiProvider: ai } });
    await sendOrEdit(t, c, mid, '🤖 <b>مرحله ۴/۴ — منبع داده:</b>', monitorDataMenu(sym, tf, ai));
    return;
  }
  if (data.indexOf('mdp_') === 0) {
    const rest = data.replace('mdp_', '');
    const parts = rest.split('_');
    if (parts.length < 4) return;
    const dp = parts[0];
    const ai = parts[parts.length - 1];
    const tf = parts[parts.length - 2];
    const sym = parts.slice(1, -2).join('_');
    const symbol = normalizeSymbol(sym);
    await clearUserState(env, c);
    await finishMonitorSetup(t, c, mid, symbol, tf, ai, dp, env);
    return;
  }

  // Symbol/analysis
  if (data === 'wizard_cancel') { await clearUserState(env, c); await sendOrEdit(t, c, mid, '❌', { inline_keyboard: [[{ text: '🏠', callback_data: 'menu_main' }]] }); return; }
  if (data === 'sym_custom') { await setUserState(env, c, { action: 'custom_symbol', step: 'input', data: {} }); await sendOrEdit(t, c, mid, '✏️ نماد:', { inline_keyboard: [[{ text: '❌', callback_data: 'wizard_cancel' }]] }); return; }
  if (data.indexOf('sym_') === 0) { await showTimeframeMenu(t, c, mid, data.replace('sym_', '')); return; }
  if (data.indexOf('mtf_') === 0) { await showProviderMenu(t, c, mid, data.replace('mtf_', ''), 'MTF', true, env); return; }
  if (data.indexOf('tf_') === 0) {
    const rest = data.replace('tf_', '');
    const tfm = rest.match(/_([^_]+)$/);
    if (!tfm) return;
    await showProviderMenu(t, c, mid, rest.slice(0, -tfm[0].length), tfm[1], false, env);
    return;
  }
  if (data.indexOf('pvd_') === 0) {
    const rest = data.replace('pvd_', '');
    const parts = rest.split('_');
    if (parts.length < 3) return;
    const prov = parts[0];
    const tf = parts[parts.length - 1];
    const sr = parts.slice(1, -1).join('_');
    const symbol = normalizeSymbol(sr);
    try { await fetch('https://api.telegram.org/bot' + t + '/deleteMessage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: c, message_id: mid }) }); } catch (e) {}
    if (tf === 'MTF') await runMultiTFAnalysis(t, c, symbol, env, prov);
    else await runAnalysis(t, c, symbol, env, tf, prov);
    return;
  }

  // Journal/Watch
  if (data === 'journal_add') { await setUserState(env, c, { action: 'journal_add', step: 'symbol', data: {} }); await sendOrEdit(t, c, mid, '📝 ۱/۵ نماد:', { inline_keyboard: [[{ text: '❌', callback_data: 'wizard_cancel' }]] }); return; }
  if (data === 'journal_list') { await showJournalList(t, c, env); return; }
  if (data === 'journal_stats') { await showJournalStats(t, c, env); return; }
  if (data === 'journal_clear') { await saveJournal(env, c, []); await sendOrEdit(t, c, mid, '🗑️', { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_journal' }]] }); return; }
  if (data.indexOf('wiz_dir_') === 0) {
    const st = await getUserState(env, c);
    if (!st || st.action !== 'journal_add') return;
    st.data.direction = data.replace('wiz_dir_', ''); st.step = 'entry';
    await setUserState(env, c, st);
    await sendOrEdit(t, c, mid, '📝 ۳/۵ Entry:', { inline_keyboard: [[{ text: '❌', callback_data: 'wizard_cancel' }]] });
    return;
  }
  if (data === 'watch_add') { await setUserState(env, c, { action: 'watch_add', step: 'symbol', data: {} }); await sendOrEdit(t, c, mid, '🔔 ۱/۳ نماد:', { inline_keyboard: [[{ text: '❌', callback_data: 'wizard_cancel' }]] }); return; }
  if (data === 'watch_list') { await showWatchList(t, c, env); return; }
  if (data === 'watch_clear') { await saveWatchlist(env, c, []); await sendOrEdit(t, c, mid, '🗑️', { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_watch' }]] }); return; }
  if (data.indexOf('wiz_cond_') === 0) {
    const st = await getUserState(env, c);
    if (!st || st.action !== 'watch_add') return;
    st.data.condition = data.replace('wiz_cond_', ''); st.step = 'price';
    await setUserState(env, c, st);
    await sendOrEdit(t, c, mid, '🔔 ۳/۳ قیمت:', { inline_keyboard: [[{ text: '❌', callback_data: 'wizard_cancel' }]] });
    return;
  }

  // Settings
  if (data === 'settings_strict') { const cur = await getStrictness(env, c); await sendOrEdit(t, c, mid, '🎚️ <b>نوع تحلیل</b>', strictnessMenu(cur)); return; }
  if (data === 'strict_hard' || data === 'strict_easy') {
    const m = data.replace('strict_', '');
    await setStrictness(env, c, m);
    const lbl = m === 'hard' ? '🔴 سختگیر' : '🟢 آسان';
    await sendOrEdit(t, c, mid, '✅ ' + lbl, strictnessMenu(m));
    return;
  }
  if (data === 'settings_kz') { const cur = await getKzMode(env, c); await sendOrEdit(t, c, mid, '⚙️ <b>KZ Mode</b>', kzModeMenu(cur)); return; }
  if (data === 'kz_off' || data === 'kz_priority' || data === 'kz_only') {
    const m = data.replace('kz_', '');
    await setKzMode(env, c, m);
    const kc = KZ_MODES[m];
    await sendOrEdit(t, c, mid, '✅ ' + kc.icon + ' ' + kc.label + '\n\n' + kc.desc, kzModeMenu(m));
    return;
  }
  if (data === 'settings_mode') { const cur = await getUserMode(env, c); await sendOrEdit(t, c, mid, '🎯 <b>حالت</b>', modeMenu(cur)); return; }
  if (data.indexOf('mode_') === 0) {
    const m = data.replace('mode_', '');
    await setUserMode(env, c, m);
    const cfg = MODE_CONFIG[m];
    await sendOrEdit(t, c, mid, '✅ ' + cfg.icon + ' ' + cfg.label, modeMenu(m));
    return;
  }
  if (data === 'settings_confluence') { const cur = await getConfluenceMode(env, c); await sendOrEdit(t, c, mid, '🧠 <b>هم‌گرایی</b>', confluenceModeMenu(cur)); return; }
  if (data.indexOf('conf_') === 0) {
    const m = data.replace('conf_', '');
    await setConfluenceMode(env, c, m);
    await sendOrEdit(t, c, mid, '✅ ' + m, confluenceModeMenu(m));
    return;
  }
  if (data === 'settings_tier') { await sendOrEdit(t, c, mid, '🎚️ <b>سطح مدل</b>', modelTierProviderMenu()); return; }
  if (data === 'tier_prov_aiprime') { await env.KV.put('last_tier_prov:' + c, 'aiprime'); const cur = await getUserModelTier(env, c, 'aiprime'); await sendOrEdit(t, c, mid, '🅰️ ' + MODEL_TIERS.aiprime[cur].label, modelTierMenu(cur)); return; }
  if (data === 'tier_prov_gapgpt') { await env.KV.put('last_tier_prov:' + c, 'gapgpt'); const cur = await getUserModelTier(env, c, 'gapgpt'); await sendOrEdit(t, c, mid, '💎 ' + MODEL_TIERS.gapgpt[cur].label, modelTierMenu(cur)); return; }
  if (data === 'tier_fast' || data === 'tier_premium' || data === 'tier_deepseek') {
    const nt = data.replace('tier_', '');
    const lp = await env.KV.get('last_tier_prov:' + c) || 'aiprime';
    await setUserModelTier(env, c, lp, nt);
    const tl = nt === 'premium' ? '💎 قوی' : nt === 'deepseek' ? '🧠 DeepSeek' : '🚀 سریع';
    await sendOrEdit(t, c, mid, '✅ ' + tl, modelTierMenu(nt));
    return;
  }
}

async function sendAccessDenied(t, c) {
  await sendMessage(t, c, '🔒 <b>دسترسی محدود</b>\n\n<b>Chat ID:</b>\n<code>' + c + '</code>');
}

// ============================================
// MESSAGE HANDLER
// ============================================

async function handleUpdate(update, env) {
  const token = env.TG_TOKEN;

  if (update.message) {
    const c = update.message.chat.id;
    const text = (update.message.text || '').trim();

    if (text === '/myid') { await sendMessage(token, c, '🆔 <code>' + c + '</code>'); return; }
    if (isSecurityEnabled(env) && !isAdmin(env, c)) { await sendAccessDenied(token, c); return; }

    if (update.message.photo && update.message.photo.length) {
      await runImageAnalysis(token, c, update.message.photo[update.message.photo.length - 1].file_id, env);
      return;
    }
    if (update.message.document && update.message.document.mime_type && update.message.document.mime_type.indexOf('image/') === 0) {
      await runImageAnalysis(token, c, update.message.document.file_id, env);
      return;
    }

    const st = await getUserState(env, c);
    if (st) {
      if (st.action === 'journal_add') {
        const d = st.data || {};
        if (st.step === 'symbol') {
          d.symbol = normalizeSymbol(text);
          st.data = d; st.step = 'direction';
          await setUserState(env, c, st);
          await sendMessage(token, c, '📝 ۲/۵ جهت:', { inline_keyboard: [[{ text: '🟢 BUY', callback_data: 'wiz_dir_BUY' }, { text: '🔴 SELL', callback_data: 'wiz_dir_SELL' }]] });
          return;
        }
        if (st.step === 'entry') {
          const e = parseFloat(text.replace(/[^\d.\-]/g, ''));
          if (isNaN(e)) { await sendMessage(token, c, '❌ عدد:'); return; }
          d.entry = e; st.data = d; st.step = 'sl';
          await setUserState(env, c, st);
          await sendMessage(token, c, '📝 ۴/۵ SL:');
          return;
        }
        if (st.step === 'sl') {
          const s = parseFloat(text.replace(/[^\d.\-]/g, ''));
          if (isNaN(s)) { await sendMessage(token, c, '❌ عدد:'); return; }
          d.sl = s; st.data = d; st.step = 'tp';
          await setUserState(env, c, st);
          await sendMessage(token, c, '📝 ۵/۵ TP:');
          return;
        }
        if (st.step === 'tp') {
          const tp = parseFloat(text.replace(/[^\d.\-]/g, ''));
          if (isNaN(tp)) { await sendMessage(token, c, '❌ عدد:'); return; }
          d.tp = tp;
          const j = await getJournal(env, c);
          j.push({ id: j.length + 1, symbol: d.symbol, direction: d.direction, entry: d.entry, sl: d.sl, tp: d.tp, ts: Date.now(), result: null });
          await saveJournal(env, c, j);
          await clearUserState(env, c);
          const rr = Math.abs(d.tp - d.entry) / Math.abs(d.entry - d.sl);
          await sendMessage(token, c, '✅ #' + j.length + '\nR/R: 1:' + rr.toFixed(2), { inline_keyboard: [[{ text: '📓', callback_data: 'menu_journal' }]] });
          return;
        }
      }
      if (st.action === 'watch_add') {
        const d = st.data || {};
        if (st.step === 'symbol') {
          d.symbol = normalizeSymbol(text); st.data = d; st.step = 'condition';
          await setUserState(env, c, st);
          await sendMessage(token, c, '🔔 ۲/۳ شرط:', { inline_keyboard: [[{ text: '⬆️', callback_data: 'wiz_cond_above' }, { text: '⬇️', callback_data: 'wiz_cond_below' }]] });
          return;
        }
        if (st.step === 'price') {
          const p = parseFloat(text.replace(/[^\d.\-]/g, ''));
          if (isNaN(p)) { await sendMessage(token, c, '❌ عدد:'); return; }
          d.price = p;
          const l = await getWatchlist(env, c);
          const nid = l.length ? Math.max(...l.map(w => w.id)) + 1 : 1;
          l.push({ id: nid, symbol: d.symbol, condition: d.condition, price: d.price, ts: Date.now() });
          await saveWatchlist(env, c, l);
          await clearUserState(env, c);
          await sendMessage(token, c, '✅ #' + nid, { inline_keyboard: [[{ text: '🔔', callback_data: 'menu_watch' }]] });
          return;
        }
      }
      if (st.action === 'custom_symbol') {
        const s = normalizeSymbol(text);
        await clearUserState(env, c);
        await showTimeframeMenu(token, c, null, s.replace('/', ''));
        return;
      }
      if (st.action === 'mon_add' && st.step === 'symbol_custom') {
        const s = normalizeSymbol(text);
        await setUserState(env, c, { action: 'mon_add', step: 'tf', data: { symbol: s } });
        await sendMessage(token, c, '🤖 <b>مرحله ۲/۴ — تایم‌فریم:</b>\n\nنماد: ' + s, monitorTfMenu(s.replace('/', '')));
        return;
      }
    }

    if (text === '/start' || text === '/menu') { await showMainMenu(token, c, null); return; }
    if (text === '/help') { await showHelp(token, c, null); return; }
    if (text === '/status') { await showStatus(token, c, null, env); return; }
    if (text === '/analyze') { await showSymbolMenu(token, c, null); return; }
    if (text === '/journal') { await showJournalMenu(token, c, null, env); return; }
    if (text === '/watch') { await showWatchMenu(token, c, null, env); return; }
    if (text === '/monitor') { await showMonitorMenu(token, c, null, env); return; }

    if (text && text.charAt(0) !== '/' && /^[A-Za-z]{2,10}(\/[A-Za-z]{2,10})?$/.test(text)) {
      await showTimeframeMenu(token, c, null, normalizeSymbol(text).replace('/', ''));
      return;
    }

    await sendMessage(token, c, '❓ متوجه نشدم', mainMenu());
  }

  if (update.callback_query) {
    const cb = update.callback_query;
    const cid = cb.message.chat.id;
    if (isSecurityEnabled(env) && !isAdmin(env, cid)) { await answerCallback(token, cb.id); await sendAccessDenied(token, cid); return; }
    await answerCallback(token, cb.id);
    await handleCallback(token, cid, cb.message.message_id, cb.data, env);
  }
}

// ============================================
// WATCHLIST CRON
// ============================================

async function checkWatchlist(env) {
  try {
    const token = env.TG_TOKEN;
    const list = await env.KV.list({ prefix: 'watch:' });
    for (const key of list.keys) {
      const k = key.name;
      const cid = k.replace('watch:', '');
      const wl = await env.KV.get(k, 'json');
      if (!wl || !wl.length) continue;
      const rem = [];
      for (const w of wl) {
        try {
          const price = await withTimeout(getCurrentPrice(w.symbol, env.TWELVE_KEY), 10000, 'Price');
          const hit = (w.condition === 'above' && price >= w.price) || (w.condition === 'below' && price <= w.price);
          if (hit) {
            await sendMessage(token, cid, '🔔 <b>هشدار!</b>\n📌 ' + w.symbol + '\n💰 ' + price, { inline_keyboard: [[{ text: '📊 تحلیل', callback_data: 'sym_' + w.symbol.replace('/', '') }]] });
          } else rem.push(w);
        } catch (e) { rem.push(w); }
      }
      await env.KV.put(k, JSON.stringify(rem));
    }
  } catch (e) { console.error('checkWatchlist: ' + e.message); }
}

// ============================================
// EXPORT
// ============================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '') return new Response('Everest Bot v4.1 — Entry Type + Auto Monitor', { status: 200 });
    if (request.method === 'POST' && url.pathname === '/webhook') {
      try {
        const update = await request.json();
        ctx.waitUntil(handleUpdate(update, env));
      } catch (e) { console.error('Webhook: ' + e.message); }
      return new Response('OK', { status: 200 });
    }
    return new Response('Not found', { status: 404 });
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(Promise.all([
      checkWatchlist(env),
      checkAllMonitors(env)
    ]));
  }
};
