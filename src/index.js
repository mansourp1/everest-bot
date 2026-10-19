// ============================================
// EVEREST BOT v8.2.3
// + Real Model Names (AIPrime's actual /v1/models)
// + Auto-Discovery + Working Model Cache
// + Reasoning-safe: max_tokens 32000, finish_reason check, reasoning_content detection
// + Calibration Engine (Brier + Reliability)
// + Regime Router (local deterministic)
// + Adversarial Reviewer
// + Portfolio Risk Gate
// + Opportunity Cost Ledger
// + Schema Validator (strict)
// + Signal Passport
// + Expiry Watchdog (UNFILLED vs EXPIRED)
// + Text: AIPrime | Image: Gemini → GapGPT → AIPrime
// + Custom Vision API + Local Filter MSS/BOS
// ============================================

const CONF_KEYS = ['structure', 'smc', 'ict', 'candle', 'liquidity', 'riskReward'];
const CONF_LABELS = {
  structure: 'Market Structure', smc: 'SMC / Order Blocks', ict: 'ICT / FVG',
  candle: 'Candlestick', liquidity: 'Liquidity Sweep', riskReward: 'R/R'
};

const VISION_STRICT = false;

// 🔧 v8.2.3 — Real model names from AIPrime's actual /v1/models list
const MODEL_TIERS = {
  aiprime: {
    fast: { label: '🚀 سریع', text: 'gpt-4o-mini', vision: 'gpt-4o' },
    premium: { label: '💎 قوی', text: 'claude-sonnet-5.5', vision: 'claude-sonnet-5.5' },
    deepseek: { label: '🧠 DeepSeek', text: 'deepseek-v3.2', vision: 'gpt-4o' }
  },
  gapgpt: {
    fast: { label: '🚀 سریع', text: 'gpt-4o-mini', vision: 'gpt-4o' },
    premium: { label: '💎 قوی', text: 'claude-sonnet-5.5', vision: 'claude-sonnet-5.5' },
    deepseek: { label: '🧠 DeepSeek', text: 'deepseek-v3.2', vision: 'gpt-4o' }
  }
};

// 🔧 v8.2.3 — Fallback chains with REAL models
const MODEL_FALLBACK_CHAINS = {
  aiprime: {
    fast: ['gpt-4o-mini', 'gpt-4o', 'gemini-2.5-flash', 'claude-haiku-4.5', 'gemini-2.5-pro'],
    deepseek: ['deepseek-v3.2', 'deepseek-v3.1', 'deepseek-v4.1-flash', 'deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-v4.1-flash-1017', 'deepseek-r1'],
    premium: ['claude-sonnet-5.5', 'claude-sonnet-5', 'claude-opus-5.5', 'claude-sonnet-4.6', 'claude-opus-5', 'claude-sonnet-4.5', 'gpt-5.5', 'gpt-5.4']
  },
  gapgpt: {
    fast: ['gpt-4o-mini', 'gpt-4o', 'gemini-2.5-flash'],
    deepseek: ['deepseek-v3.2', 'deepseek-v3.1', 'deepseek-v4.1-flash', 'deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-r1'],
    premium: ['claude-sonnet-5.5', 'claude-sonnet-5', 'claude-opus-5.5', 'claude-sonnet-4.6', 'gpt-5.5']
  }
};

const VISION_MODELS_BY_PROVIDER = {
  gemini: ['gemini-2.5-flash', 'gemini-2.0-flash'],
  aiprime: ['gpt-4o', 'gpt-4o-mini', 'claude-sonnet-5.5'],
  gapgpt: ['gpt-4o', 'gpt-4o-mini']
};

const EXPIRY_TTL_BY_TF = {
  '1min': 20, '3min': 15, '5min': 12, '15min': 10, '1h': 8, '4h': 6
};
const EXPIRY_TTL_DEFAULT = 12;
const EXPIRY_WARN_PCT = 0.75;

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

// ============================================
// v8.2.3 — MODEL DISCOVERY + CACHE
// ============================================

async function getDiscoveredModels(env, chatId, provider) {
  try { return await env.KV.get('models:' + chatId + ':' + provider, 'json'); } catch (e) { return null; }
}
async function setDiscoveredModels(env, chatId, provider, models) {
  try { await env.KV.put('models:' + chatId + ':' + provider, JSON.stringify(models), { expirationTtl: 86400 * 7 }); } catch (e) {}
}
async function getWorkingModel(env, chatId, provider, tier) {
  try { return await env.KV.get('workmodel:' + chatId + ':' + provider + ':' + tier); } catch (e) { return null; }
}
async function setWorkingModel(env, chatId, provider, tier, model) {
  try { await env.KV.put('workmodel:' + chatId + ':' + provider + ':' + tier, model, { expirationTtl: 86400 * 30 }); } catch (e) {}
}
async function resetModelCacheFor(env, chatId, provider) {
  try {
    await env.KV.delete('models:' + chatId + ':' + provider);
    await env.KV.delete('workmodel:' + chatId + ':' + provider + ':fast');
    await env.KV.delete('workmodel:' + chatId + ':' + provider + ':deepseek');
    await env.KV.delete('workmodel:' + chatId + ':' + provider + ':premium');
  } catch (e) {}
}

async function discoverProviderModels(env, chatId, provider, key) {
  if (!key) return null;
  var base = provider === 'aiprime' ? 'https://api.aiprime.shop/v1' : provider === 'gapgpt' ? 'https://api.gapgpt.app/v1' : '';
  if (!base) return null;
  try {
    var r = await fetchWithTimeout(base + '/models', { headers: { 'Authorization': 'Bearer ' + key } }, 12000, 'Discovery');
    if (!r.ok) return null;
    var d = await r.json();
    var ids = (d.data || []).map(function(m) { return m.id; }).filter(Boolean);
    if (ids.length) {
      await setDiscoveredModels(env, chatId, provider, ids);
      console.log('[Discovery] ' + provider + '/' + chatId + ' → ' + ids.length + ' models');
      return ids;
    }
    return null;
  } catch (e) {
    console.warn('[Discovery] ' + provider + ': ' + e.message);
    return null;
  }
}

async function getModelCandidates(env, chatId, provider, tier, hasImage) {
  if (hasImage) return VISION_MODELS_BY_PROVIDER[provider] || ['gpt-4o'];
  var saved = await getWorkingModel(env, chatId, provider, tier);
  if (saved) return [saved];
  var discovered = await getDiscoveredModels(env, chatId, provider);
  if (discovered && discovered.length) {
    var patterns = {
      fast: /gpt-4o-mini|gemini.*flash|haiku|llama.*8b|mistral-small/i,
      deepseek: /^deepseek-v3\.(2|1)$|^deepseek-v4\.1-flash$|^deepseek-v4-flash$|^deepseek-v3\.2$|^deepseek-v3\.1$/i,
      premium: /claude-sonnet-5\.5|claude-sonnet-5$|claude-sonnet-4\.6|claude-opus-5\.5|claude-opus-5$/i
    };
    var pat = patterns[tier] || patterns.fast;
    var matches = discovered.filter(function(m) { return pat.test(m); });
    if (matches.length) {
      console.log('[Pick] ' + provider + '/' + tier + ' → ' + matches[0] + ' (discovered)');
      return matches;
    }
    var loose = discovered.filter(function(m) {
      return (tier === 'deepseek' && /deepseek/i.test(m)) ||
             (tier === 'premium' && /claude.*sonnet/i.test(m)) ||
             (tier === 'fast' && /gpt-4o-mini/i.test(m));
    });
    if (loose.length) return loose;
  }
  var chain = MODEL_FALLBACK_CHAINS[provider] && MODEL_FALLBACK_CHAINS[provider][tier];
  console.log('[Pick] ' + provider + '/' + tier + ' → fallback chain (' + ((chain && chain.length) || 0) + ')');
  return chain || ['gpt-4o-mini'];
}

// ============================================
// v8.2 CONSTANTS
// ============================================
const CALIB_MIN_SAMPLES = 20;
const CALIB_BUCKET_MIN = 8;
const PORTFOLIO_DEFAULTS = {
  maxDailyLossRR: -3,
  maxPerSymbol: 2,
  maxPerMarket: 5,
  maxTotal: 8,
  maxCorrelatedAlts: 2
};

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
// PROVIDER KEY NORMALIZER
// ============================================
function normalizeProviderKey(providerName) {
  var s = String(providerName || '').toLowerCase();
  if (s.indexOf('aiprime') !== -1) return 'aiprime';
  if (s.indexOf('gemini') !== -1) return 'gemini';
  if (s.indexOf('gapgpt') !== -1) return 'gapgpt';
  if (s.indexOf('groq') !== -1) return 'groq';
  if (s.indexOf('github') !== -1) return 'github';
  if (s.indexOf('together') !== -1) return 'together';
  if (s.indexOf('openrouter') !== -1) return 'openrouter';
  if (s.indexOf('mistral') !== -1) return 'mistral';
  if (s.indexOf('avalai') !== -1) return 'avalai';
  if (s.indexOf('metis') !== -1) return 'metis';
  if (s.indexOf('onexai') !== -1) return 'onexai';
  if (s.indexOf('customvision') !== -1) return 'customvision';
  if (s.indexOf('huggingface') !== -1) return 'huggingface';
  if (s.indexOf('cloudflare') !== -1) return 'cloudflare';
  if (s.indexOf('nvidia') !== -1) return 'nvidia';
  if (s.indexOf('llm7') !== -1) return 'llm7';
  return 'unknown';
}

// ============================================
// REGIME DETECTION
// ============================================
function calcEMA(arr, period) {
  if (!arr.length || period < 1) return [];
  var k = 2 / (period + 1);
  var ema = [arr[0]];
  for (var i = 1; i < arr.length; i++) ema.push(arr[i] * k + ema[i - 1] * (1 - k));
  return ema;
}

function computeLocalRegime(kl) {
  if (!kl || kl.length < 30) return { regime: 'UNKNOWN', emaSlope: 0, atrPct: 50, adx: 0, lastAtr: 0 };
  var closes = kl.map(function(k) { return k.close; });
  var ema20 = calcEMA(closes, 20);
  var slope20 = ema20.length > 2 ? ((ema20[ema20.length - 1] - ema20[ema20.length - 3]) / ema20[ema20.length - 3]) * 100 : 0;
  var atrs = [];
  for (var i = 20; i <= kl.length; i += 3) {
    var a = calcATR(kl.slice(0, i), 14);
    if (a) atrs.push(a);
  }
  var lastAtr = calcATR(kl, 14) || 0;
  var atrPct = 50;
  if (atrs.length >= 5) {
    var below = atrs.filter(function(x) { return x < lastAtr; }).length;
    atrPct = Math.round(below / atrs.length * 100);
  }
  var trSum = 0, dmP = 0, dmM = 0, window = Math.min(kl.length - 1, 30);
  for (var j = kl.length - window; j < kl.length; j++) {
    if (j < 1) continue;
    var up = kl[j].high - kl[j - 1].high;
    var dn = kl[j - 1].low - kl[j].low;
    if (up > dn && up > 0) dmP += up;
    if (dn > up && dn > 0) dmM += dn;
    trSum += Math.max(kl[j].high - kl[j].low, Math.abs(kl[j].high - kl[j - 1].close), Math.abs(kl[j].low - kl[j - 1].close));
  }
  var diP = trSum ? dmP / trSum * 100 : 0;
  var diM = trSum ? dmM / trSum * 100 : 0;
  var dx = (diP + diM) ? (Math.abs(diP - diM) / (diP + diM)) * 100 : 0;
  var adx = Math.round(dx);
  var regime = 'RANGING';
  if (atrPct > 85) regime = 'HIGH_VOL';
  else if (atrPct < 20 && adx < 15) regime = 'COMPRESSION';
  else if (Math.abs(slope20) > 0.03 && adx > 20) regime = slope20 > 0 ? 'TRENDING_UP' : 'TRENDING_DOWN';
  return { regime: regime, emaSlope: Math.round(slope20 * 100) / 100, atrPct: atrPct, adx: adx, lastAtr: lastAtr };
}

// ============================================
// ADVERSARIAL CHECK
// ============================================
function adversarialCheck(levels, klines, regime, atr) {
  var issues = [];
  if (levels.direction !== 'BUY' && levels.direction !== 'SELL') return { passed: true, issues: [] };
  var last = klines[klines.length - 1];
  if (levels.entry != null && levels.sl != null && atr > 0) {
    var risk = Math.abs(levels.entry - levels.sl);
    if (risk < 0.35 * atr) issues.push('SL < 0.35×ATR (شکار استاپ)');
    if (risk > 3.5 * atr) issues.push('SL > 3.5×ATR (ریسک زیاد)');
  }
  if (levels.entry != null && levels.sl != null && levels.tp1 != null) {
    var rr = Math.abs(levels.tp1 - levels.entry) / Math.abs(levels.entry - levels.sl);
    if (rr < 1.2) issues.push('R/R < 1.2');
  }
  if (regime.regime === 'TRENDING_UP' && levels.direction === 'SELL') issues.push('فروش در روند صعودی');
  if (regime.regime === 'TRENDING_DOWN' && levels.direction === 'BUY') issues.push('خرید در روند نزولی');
  if (levels.entry != null && last && atr > 0 && Math.abs(levels.entry - last.close) > 4.5 * atr) issues.push('Entry > 4.5×ATR از قیمت');
  var recent = klines.slice(-5);
  if (recent.length >= 5) {
    var net = recent[recent.length - 1].close - recent[0].close;
    var range = Math.max.apply(null, recent.map(function(k) { return k.high; })) - Math.min.apply(null, recent.map(function(k) { return k.low; }));
    if (range > 0) {
      var m = net / range;
      if (levels.direction === 'BUY' && m < -0.65) issues.push('مومنتوم نزولی شدید');
      if (levels.direction === 'SELL' && m > 0.65) issues.push('مومنتوم صعودی شدید');
    }
  }
  if (regime.atrPct > 92) issues.push('نوسان >92 پرسنتیل');
  return { passed: issues.length === 0, issues: issues };
}

// ============================================
// SCHEMA VALIDATOR
// ============================================
function strictSchemaValidate(levels) {
  var issues = [];
  if (!levels || typeof levels !== 'object') return { passed: false, issues: ['levels null'] };
  var dir = levels.direction;
  if (!dir) issues.push('direction missing');
  else if (['BUY', 'SELL', 'WAIT'].indexOf(dir) === -1) issues.push('direction invalid: ' + dir);
  if (levels.confidence != null) {
    if (!isFinite(levels.confidence)) issues.push('confidence not finite');
    else if (levels.confidence < 0 || levels.confidence > 100) issues.push('confidence out of [0,100]: ' + levels.confidence);
  }
  ['entry', 'sl', 'tp1', 'tp2', 'tp3'].forEach(function(k) {
    var v = levels[k];
    if (v == null) return;
    if (typeof v !== 'number' || !isFinite(v)) { issues.push(k + ' invalid number'); return; }
    if (v < 0) issues.push(k + ' negative: ' + v);
    if (v === 0) issues.push(k + ' is zero');
  });
  if (levels.entry != null && levels.sl != null && levels.entry > 0 && levels.sl > 0) {
    if (levels.entry === levels.sl) issues.push('entry equals SL');
    var ratio = Math.max(levels.entry, levels.sl) / Math.min(levels.entry, levels.sl);
    if (ratio > 50) issues.push('entry/SL ratio >50');
  }
  ['tp1', 'tp2', 'tp3'].forEach(function(k) {
    var v = levels[k];
    if (v == null || levels.entry == null) return;
    if (levels.entry <= 0) return;
    var r = v / levels.entry;
    if (r > 100 || r < 0.01) issues.push(k + ' extreme ratio vs entry');
  });
  if (levels.direction === 'BUY' && levels.entry != null && levels.sl != null && levels.sl >= levels.entry) issues.push('BUY sl>=entry');
  if (levels.direction === 'SELL' && levels.entry != null && levels.sl != null && levels.sl <= levels.entry) issues.push('SELL sl<=entry');
  if (levels.direction === 'BUY' && levels.entry != null && levels.tp1 != null && levels.tp1 <= levels.entry) issues.push('BUY tp1<=entry');
  if (levels.direction === 'SELL' && levels.entry != null && levels.tp1 != null && levels.tp1 >= levels.entry) issues.push('SELL tp1>=entry');
  return { passed: issues.length === 0, issues: issues };
}

function validateSignalStrict(levels, opts) {
  var schema = strictSchemaValidate(levels);
  if (!schema.passed) {
    levels.direction = 'WAIT';
    levels.validationIssues = (levels.validationIssues || []).concat(schema.issues.map(function(i) { return '🔴 Schema: ' + i; }));
    levels._schemaFailed = true;
    return levels;
  }
  return validateSignal(levels, opts);
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
// CALIBRATION
// ============================================
async function calibrationLoad(env, chatId) {
  try { return await env.KV.get('calib:' + chatId, 'json') || {}; } catch (e) { return {}; }
}
async function calibrationSave(env, chatId, data) {
  try { await env.KV.put('calib:' + chatId, JSON.stringify(data)); } catch (e) {}
}
async function calibrationRecord(env, chatId, provider, tier, regime, predictedConf, outcome) {
  if (predictedConf == null || !isFinite(predictedConf)) return;
  var d = await calibrationLoad(env, chatId);
  var key = normalizeProviderKey(provider) + '|' + (tier || 'fast') + '|' + (regime || 'UNKNOWN');
  if (!d[key]) d[key] = { records: [] };
  d[key].records.push({ c: predictedConf, o: outcome ? 1 : 0, t: Date.now() });
  if (d[key].records.length > 500) d[key].records = d[key].records.slice(-500);
  await calibrationSave(env, chatId, d);
}
async function calibrationStats(env, chatId, provider, tier, regime) {
  var d = await calibrationLoad(env, chatId);
  var key = normalizeProviderKey(provider) + '|' + (tier || 'fast') + '|' + (regime || 'UNKNOWN');
  var records = (d[key] && d[key].records) || [];
  if (!records.length) return null;
  var n = records.length;
  var brier = records.reduce(function(s, r) { return s + Math.pow(r.c / 100 - r.o, 2); }, 0) / n;
  var buckets = {};
  records.forEach(function(r) {
    var bin = Math.floor(r.c / 10) * 10;
    if (!buckets[bin]) buckets[bin] = { n: 0, wins: 0 };
    buckets[bin].n++;
    buckets[bin].wins += r.o;
  });
  return { n: n, brier: brier, buckets: buckets };
}
async function isCalibApplyOn(env, chatId) {
  try { var v = await env.KV.get('calibtoggle:' + chatId); return v !== '0'; } catch (e) { return true; }
}
async function setCalibApply(env, chatId, on) {
  await env.KV.put('calibtoggle:' + chatId, on ? '1' : '0');
}
async function calibrateConfidence(env, chatId, provider, tier, regime, rawConf) {
  if (!(await isCalibApplyOn(env, chatId))) return { conf: rawConf, adjusted: false, n: 0 };
  if (rawConf == null) return { conf: rawConf, adjusted: false, n: 0 };
  var stats = await calibrationStats(env, chatId, provider, tier, regime);
  if (!stats || stats.n < CALIB_MIN_SAMPLES) return { conf: rawConf, adjusted: false, n: stats ? stats.n : 0 };
  var bin = Math.floor(rawConf / 10) * 10;
  var b = stats.buckets[bin];
  if (!b || b.n < CALIB_BUCKET_MIN) return { conf: rawConf, adjusted: false, n: b ? b.n : 0 };
  var actual = b.wins / b.n * 100;
  return { conf: Math.round(actual), adjusted: true, n: b.n, raw: rawConf };
}
async function renderCalibrationSummary(env, chatId) {
  var d = await calibrationLoad(env, chatId);
  var keys = Object.keys(d);
  if (!keys.length) return '⚪ هنوز داده‌ای نیست';
  var byProv = {};
  keys.forEach(function(k) {
    var parts = k.split('|');
    var prov = parts[0];
    var recs = (d[k].records || []);
    if (!byProv[prov]) byProv[prov] = [];
    byProv[prov] = byProv[prov].concat(recs);
  });
  var lines = [];
  Object.keys(byProv).forEach(function(prov) {
    var recs = byProv[prov];
    if (!recs.length) return;
    var n = recs.length;
    var brier = recs.reduce(function(s, r) { return s + Math.pow(r.c / 100 - r.o, 2); }, 0) / n;
    var bIcon = brier < 0.15 ? '🟢' : brier < 0.22 ? '🟡' : '🔴';
    lines.push(bIcon + ' <b>' + esc(prov) + '</b>: n=' + n + ' Brier=' + brier.toFixed(3));
  });
  return lines.join('\n');
}

// ============================================
// OPPORTUNITY LEDGER
// ============================================
async function opLedgerLoad(env, chatId) {
  try { return await env.KV.get('oppledger:' + chatId, 'json') || []; } catch (e) { return []; }
}
async function opLedgerSave(env, chatId, arr) {
  try { await env.KV.put('oppledger:' + chatId, JSON.stringify(arr.slice(-300))); } catch (e) {}
}
async function logRejectedSignal(env, chatId, levels, reason, currentPrice, opts) {
  try {
    if (!levels || (levels.direction !== 'BUY' && levels.direction !== 'SELL')) return;
    if (levels.entry == null || levels.sl == null || levels.tp1 == null) return;
    opts = opts || {};
    var a = await opLedgerLoad(env, chatId);
    var sym = opts.symbol || '?';
    var tf = opts.tf || '?';
    var id = a.length ? (a[a.length - 1].id || 0) + 1 : 1;
    a.push({
      id: id, t: Date.now(), sym: sym, tf: tf,
      dir: levels.direction, entry: levels.entry, sl: levels.sl,
      tp1: levels.tp1, tp2: levels.tp2, tp3: levels.tp3,
      confidence: levels.confidence, provider: opts.provider || '?',
      reason: reason, status: 'OPEN', filled: false, currentPrice: currentPrice,
      isCrypto: isCryptoSymbol(sym),
      day: new Date(Date.now() + 3.5 * 3600 * 1000).toISOString().slice(0, 10)
    });
    await opLedgerSave(env, chatId, a);
  } catch (e) { console.error('logRejectedSignal:', e.message); }
}
async function resolveRejectedSignals(env, chatId, klines, symbol, tf) {
  try {
    var a = await opLedgerLoad(env, chatId);
    var ch = false;
    var tfm = (TF_MINUTES[tf] || 5) * 60000;
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
        if (s.status === 'WIN') continue;
        if (!s.filled) {
          if (!(k.low <= s.entry && k.high >= s.entry)) continue;
          s.filled = true; ch = true;
        }
        var slHit = s.dir === 'BUY' ? k.low <= s.sl : k.high >= s.sl;
        var tp1Hit = s.dir === 'BUY' ? k.high >= s.tp1 : k.low <= s.tp1;
        if (slHit) { s.status = 'LOSS'; s.rr = -1; ch = true; break; }
        if (tp1Hit) { s.status = 'WIN'; s.whichTP = 1; s.rr = Math.abs(s.tp1 - s.entry) / Math.abs(s.entry - s.sl); ch = true; }
      }
    }
    if (ch) await opLedgerSave(env, chatId, a);
    return ch;
  } catch (e) { console.error('resolveRejectedSignals:', e.message); return false; }
}

// ============================================
// PORTFOLIO RISK GATE
// ============================================
async function getPortfolioConfig(env, chatId) {
  try {
    var c = await env.KV.get('prcfg:' + chatId, 'json');
    if (c) return c;
  } catch (e) {}
  return Object.assign({}, PORTFOLIO_DEFAULTS);
}
async function setPortfolioConfig(env, chatId, cfg) {
  await env.KV.put('prcfg:' + chatId, JSON.stringify(cfg));
}
async function getPortfolioState(env, chatId) {
  var a = await getJournal(env, chatId) || [];
  var open = a.filter(function(s) { return s.status === 'OPEN' || (s.status === 'WIN' && s.whichTP < 3); });
  var today = new Date(Date.now() + 3.5 * 3600 * 1000).toISOString().slice(0, 10);
  var todaySignals = a.filter(function(s) { return s.day === today; });
  var todayRSum = 0;
  todaySignals.forEach(function(s) {
    if (s.status === 'WIN') todayRSum += (s.rr || 0);
    else if (s.status === 'LOSS') todayRSum -= 1;
  });
  var openBySymbol = {}, openByMarket = {}, openCrypto = 0;
  open.forEach(function(s) {
    var sym = s.sym || s.symbol || '?';
    var market = s.market || (isCryptoSymbol(sym) ? 'crypto' : 'forex');
    openBySymbol[sym] = (openBySymbol[sym] || 0) + 1;
    openByMarket[market] = (openByMarket[market] || 0) + 1;
    if (isCryptoSymbol(sym)) openCrypto++;
  });
  var hasBTC = open.some(function(s) {
    var ss = (s.sym || s.symbol || '').toUpperCase().replace(/[\/\-_]/g, '');
    return ss.indexOf('BTC') === 0;
  });
  return {
    open: open, openBySymbol: openBySymbol, openByMarket: openByMarket,
    openCrypto: openCrypto, hasBTC: hasBTC,
    todayRSum: todayRSum, totalOpen: open.length
  };
}
async function portfolioCheck(env, chatId, newSignal) {
  var cfg = await getPortfolioConfig(env, chatId);
  var state = await getPortfolioState(env, chatId);
  var issues = [];
  if (state.todayRSum <= cfg.maxDailyLossRR) {
    issues.push('سقف ضرر روزانه (' + cfg.maxDailyLossRR + 'R) — فعلی ' + state.todayRSum.toFixed(2) + 'R');
  }
  var sym = newSignal.sym || '?';
  var market = newSignal.market || (isCryptoSymbol(sym) ? 'crypto' : 'forex');
  if ((state.openBySymbol[sym] || 0) >= cfg.maxPerSymbol) {
    issues.push('پوزیشن باز هم‌نماد: ' + (state.openBySymbol[sym] || 0) + '/' + cfg.maxPerSymbol);
  }
  if ((state.openByMarket[market] || 0) >= cfg.maxPerMarket) {
    issues.push('پوزیشن این بازار: ' + (state.openByMarket[market] || 0) + '/' + cfg.maxPerMarket);
  }
  if (state.totalOpen >= cfg.maxTotal) {
    issues.push('کل پوزیشن باز: ' + state.totalOpen + '/' + cfg.maxTotal);
  }
  if (isCryptoSymbol(sym) && state.hasBTC && sym.toUpperCase().replace(/[\/\-_]/g, '').indexOf('BTC') !== 0 && state.openCrypto >= cfg.maxCorrelatedAlts) {
    issues.push('همبستگی آلت‌کوین با BTC باز: ' + state.openCrypto + '/' + cfg.maxCorrelatedAlts);
  }
  return { ok: issues.length === 0, issues: issues, state: state };
}

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
// AI CALLERS — v8.2.3 REASONING-SAFE
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
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 32000 })
  }, 60000, 'CustomVision');
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
          body: JSON.stringify({ contents: [{ parts: parts }], generationConfig: { temperature: 0.15, topP: 0.9, maxOutputTokens: 32000 } })
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
  var tier = chatId ? await getUserModelTier(env, chatId, 'aiprime') : 'fast';

  // Lazy discovery on first text call
  if (!hasImage && chatId) {
    var discovered = await getDiscoveredModels(env, chatId, 'aiprime');
    if (!discovered) {
      try { await discoverProviderModels(env, chatId, 'aiprime', key); } catch (e) {}
    }
  }

  var candidates = await getModelCandidates(env, chatId, 'aiprime', tier, hasImage);
  var lastErr = '';
  for (var mi = 0; mi < candidates.length; mi++) {
    var model = candidates[mi];
    try {
      var r = await fetch('https://api.aiprime.shop/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model: model, messages: [{ role: 'user', content: content }], temperature: 0.2, max_tokens: 32000 })
      });
      var d = await r.json();
      if (r.ok) {
        var choice = d && d.choices && d.choices[0];
        var msg = choice && choice.message;
        var t = msg ? msg.content : null;
        var reasoning = msg ? msg.reasoning_content : null;
        var finish = choice ? choice.finish_reason : null;
        var usage = d && d.usage;
        if (usage) {
          var rt = (usage.completion_tokens_details && usage.completion_tokens_details.reasoning_tokens) || 0;
          console.log('[AIPrime:' + model + '] finish=' + finish + ' | completion=' + (usage.completion_tokens || '?') + ' | reasoning=' + rt + ' | len=' + (t ? t.length : 0));
        }
        if (finish === 'length') {
          lastErr = model + ': پاسخ قطع (max_tokens/reasoning)';
          console.warn('[AIPrime] TRUNC. content:', (t || '').slice(0, 120));
          continue;
        }
        if ((!t || t.length < 10) && reasoning && reasoning.length > 100) {
          lastErr = model + ': reasoning-only';
          continue;
        }
        if (t && t.length > 10) {
          var hasJson = /\{[\s\S]*?"direction"[\s\S]*?\}/i.test(t);
          var hasSections = /#{2,4}\s+\S/.test(t);
          var wordCount = t.split(/\s+/).length;
          if (!hasJson && !hasSections && wordCount < 80) {
            lastErr = model + ': کوتاه (' + wordCount + ' کلمه)';
            console.warn('[AIPrime] TOO SHORT:', t);
            continue;
          }
          if (!hasImage && chatId && tier) {
            try { await setWorkingModel(env, chatId, 'aiprime', tier, model); } catch (e) {}
          }
          return t;
        }
        lastErr = model + ': خالی';
        continue;
      }
      var errMsg = d && d.error ? (d.error.message || JSON.stringify(d.error)) : 'HTTP ' + r.status;
      lastErr = model + ': ' + errMsg;
      if (/vision|not support|does not support|model.*not found|invalid.*model|not available/i.test(errMsg)) continue;
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
  var tier = chatId ? await getUserModelTier(env, chatId, 'gapgpt') : 'fast';

  if (!hasImage && chatId) {
    var discovered = await getDiscoveredModels(env, chatId, 'gapgpt');
    if (!discovered) {
      try { await discoverProviderModels(env, chatId, 'gapgpt', key); } catch (e) {}
    }
  }

  var candidates = await getModelCandidates(env, chatId, 'gapgpt', tier, hasImage);
  var lastErr = '';
  for (var mi = 0; mi < candidates.length; mi++) {
    var model = candidates[mi];
    try {
      var r = await fetch('https://api.gapgpt.app/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model: model, messages: [{ role: 'user', content: content }], temperature: 0.2, max_tokens: 32000 })
      });
      var d = await r.json();
      if (r.ok) {
        var choice = d && d.choices && d.choices[0];
        var msg = choice && choice.message;
        var t = msg ? msg.content : null;
        var reasoning = msg ? msg.reasoning_content : null;
        var finish = choice ? choice.finish_reason : null;
        var usage = d && d.usage;
        if (usage) {
          var rt = (usage.completion_tokens_details && usage.completion_tokens_details.reasoning_tokens) || 0;
          console.log('[GapGPT:' + model + '] finish=' + finish + ' | completion=' + (usage.completion_tokens || '?') + ' | reasoning=' + rt + ' | len=' + (t ? t.length : 0));
        }
        if (finish === 'length') {
          lastErr = model + ': پاسخ قطع';
          console.warn('[GapGPT] TRUNC:', (t || '').slice(0, 120));
          continue;
        }
        if ((!t || t.length < 10) && reasoning && reasoning.length > 100) {
          lastErr = model + ': reasoning-only';
          continue;
        }
        if (t && t.length > 10) {
          var hasJson = /\{[\s\S]*?"direction"[\s\S]*?\}/i.test(t);
          var hasSections = /#{2,4}\s+\S/.test(t);
          var wordCount = t.split(/\s+/).length;
          if (!hasJson && !hasSections && wordCount < 80) {
            lastErr = model + ': کوتاه';
            continue;
          }
          if (!hasImage && chatId && tier) {
            try { await setWorkingModel(env, chatId, 'gapgpt', tier, model); } catch (e) {}
          }
          return t;
        }
        lastErr = model + ': خالی';
        continue;
      }
      var errMsg = d && d.error ? (d.error.message || JSON.stringify(d.error)) : 'HTTP ' + r.status;
      lastErr = model + ': ' + errMsg;
      if (/vision|not support|does not support|no available channel|not found|invalid.*model|not available/i.test(errMsg)) continue;
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
        body: JSON.stringify({ model: models[i], messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 32000 })
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
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 32000 })
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
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 32000 })
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
        body: JSON.stringify({ model: models[i], messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 32000 })
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
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 32000 })
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
    body: JSON.stringify({ model: 'gemini-2.0-flash', messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 32000 })
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
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 32000 })
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
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 32000 })
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
        body: JSON.stringify({ model: models[i], messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 32000 })
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
    body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 32000 })
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
    body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 32000 })
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
      // v8.2.3: 180s for reasoning-capable providers
      var timeout = (p === 'gapgpt' || p === 'aiprime' || p === 'customvision') ? 180000 : 60000;
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
// DISPLAY HELPERS
// ============================================
function buildRegimeBlock(levels) {
  if (!levels._regime) return '';
  var rg = levels._regime;
  var ic = { TRENDING_UP:'📈', TRENDING_DOWN:'📉', RANGING:'↔️', HIGH_VOL:'🌪️', COMPRESSION:'🗜️', UNKNOWN:'❓' }[rg.regime] || '🧭';
  return '\n🧭 <b>رژیم محلی:</b> ' + ic + ' ' + rg.regime + ' · ADX ' + rg.adx + ' · ATR% ' + rg.atrPct + ' · Slope ' + rg.emaSlope + '%\n';
}
function buildAdversarialBlock(levels) {
  if (!levels._adversarial || levels._adversarial.passed) return '';
  var c = '\n🛡️ <b>Adversarial Reviewer:</b>\n';
  levels._adversarial.issues.forEach(function(i) { c += '• ' + esc(i) + '\n'; });
  return c;
}
function buildCalibBadge(levels) {
  if (!levels._calibrated) return '';
  return '\n🎯 <b>کالیبراسیون:</b> ' + levels._confRaw + '% → ' + levels.confidence + '%\n';
}

// ============================================
// AUTO JOURNAL
// ============================================

async function autoJournalAdd(env, chatId, levels, provider, symbol, tf, currentPrice, opts) {
  try {
    opts = opts || {};
    var a = await getJournal(env, chatId) || [];
    var kz = getKillZoneInfo();
    var isCrypto = isCryptoSymbol(symbol);
    var cryptoW = isCrypto ? getCryptoLiquidityWindow() : null;
    var id = a.length ? (a[a.length - 1].id || 0) + 1 : 1;
    var tehran = new Date(Date.now() + 3.5 * 3600 * 1000);
    var day = tehran.toISOString().slice(0, 10);
    var providerKey = normalizeProviderKey(provider);
    a.push({
      id: id, t: Date.now(),
      sym: symbol, tf: tf,
      dir: levels.direction,
      entry: levels.entry, sl: levels.sl,
      tp1: levels.tp1, tp2: levels.tp2, tp3: levels.tp3,
      confidence: levels.confidence,
      provider: provider || '?',
      providerKey: providerKey,
      status: 'OPEN', filled: false,
      currentPrice: currentPrice,
      kzIn: isCrypto ? (cryptoW ? cryptoW.active : false) : kz.active,
      kzZone: isCrypto ? (cryptoW && cryptoW.high ? 'crypto-high' : (cryptoW && cryptoW.active) ? 'crypto-mid' : 'crypto-low') : (kz.overlap ? 'overlap' : kz.london ? 'london' : kz.ny ? 'ny' : 'none'),
      isCrypto: isCrypto,
      dual: levels.dualEval ? { h: levels.dualEval.hard.approved, e: levels.dualEval.easy.approved } : null,
      mode: 'monitor',
      strictness: opts.strictness || null,
      day: day,
      passport: {
        atr: opts.atr != null ? Math.round(opts.atr * 10000) / 10000 : null,
        regime: opts.regime ? opts.regime.regime : null,
        regimeDetail: opts.regime ? { emaSlope: opts.regime.emaSlope, atrPct: opts.regime.atrPct, adx: opts.regime.adx } : null,
        adversarial: opts.adversarial ? { passed: opts.adversarial.passed, issues: opts.adversarial.issues || [] } : null,
        localStructure: opts.localStructure ? { state: opts.localStructure.state, type: opts.localStructure.fresh ? opts.localStructure.fresh.type : null, dir: opts.localStructure.fresh ? opts.localStructure.fresh.dir : null } : null,
        aiProvider: provider,
        modelTier: opts.modelTier || null,
        promptVersion: 'v8.2.3',
        candleCount: opts.candleCount || 0,
        confidenceRaw: opts.confidenceRaw != null ? opts.confidenceRaw : levels.confidence,
        confidenceAdjusted: opts.confidenceAdjusted === true
      },
      calibrated: false
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

async function resolveJournalForChat(env, chatId, klines, symbol, tf) {
  try {
    var a = await getJournal(env, chatId) || [];
    var ch = false;
    var tfm = (TF_MINUTES[tf] || 5) * 60 * 1000;
    var calibQueue = [];
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
        if (slHit) {
          s.status = 'LOSS'; s.closeT = kt; s.closeP = k.close; s.whichTP = 0; s.rr = -1; ch = true;
          if (!s.calibrated) {
            var ppL = s.passport || {};
            calibQueue.push({ provider: s.providerKey || normalizeProviderKey(s.provider), tier: ppL.modelTier, regime: ppL.regime, conf: s.confidence, outcome: false });
            s.calibrated = true;
          }
          break;
        }

        var tp3Hit = s.tp3 != null ? (s.dir === 'BUY' ? k.high >= s.tp3 : k.low <= s.tp3) : false;
        var tp2Hit = s.tp2 != null ? (s.dir === 'BUY' ? k.high >= s.tp2 : k.low <= s.tp2) : false;
        var tp1Hit = s.tp1 != null ? (s.dir === 'BUY' ? k.high >= s.tp1 : k.low <= s.tp1) : false;

        if (tp3Hit) { s.status = 'WIN'; s.closeT = kt; s.closeP = s.tp3; s.whichTP = 3; s.rr = calcRRR(s, 3); ch = true; }
        else if (tp2Hit) { s.status = 'WIN'; s.closeT = kt; s.closeP = s.tp2; s.whichTP = 2; s.rr = calcRRR(s, 2); ch = true; }
        else if (tp1Hit) { s.status = 'WIN'; s.closeT = kt; s.closeP = s.tp1; s.whichTP = 1; s.rr = calcRRR(s, 1); ch = true; }
        if ((tp3Hit || tp2Hit || tp1Hit) && !s.calibrated) {
          var ppW = s.passport || {};
          calibQueue.push({ provider: s.providerKey || normalizeProviderKey(s.provider), tier: ppW.modelTier, regime: ppW.regime, conf: s.confidence, outcome: true });
          s.calibrated = true;
        }
      }
    }
    if (ch) { await saveJournal(env, chatId, a); console.log('[RESOLVE] ' + chatId + ' journal updated'); }
    for (var ci = 0; ci < calibQueue.length; ci++) {
      var cr = calibQueue[ci];
      await calibrationRecord(env, chatId, cr.provider, cr.tier, cr.regime, cr.conf, cr.outcome);
    }
    return ch;
  } catch (e) { console.error('resolveJournal:', e.message); return false; }
}

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
    var byRegime = {};
    daySignals.forEach(function(s) {
      if (s.passport && s.passport.regime) {
        var rg = s.passport.regime;
        if (!byRegime[rg]) byRegime[rg] = { total: 0, win: 0, loss: 0 };
        byRegime[rg].total++;
        if (s.status === 'WIN') byRegime[rg].win++;
        if (s.status === 'LOSS') byRegime[rg].loss++;
      }
    });
    var rgKeys = Object.keys(byRegime);
    if (rgKeys.length) {
      txt += '\n🧭 <b>تفکیک رژیم:</b>\n';
      rgKeys.forEach(function(k) {
        var b = byRegime[k];
        var cl = b.win + b.loss;
        var w = cl ? Math.round(b.win / cl * 100) : 0;
        var ic = { TRENDING_UP:'📈',TRENDING_DOWN:'📉',RANGING:'↔️',HIGH_VOL:'🌪️',COMPRESSION:'🗜️' }[k] || '❓';
        txt += ic + ' ' + esc(k) + ': ' + b.total + ' سیگنال · WR ' + (cl ? w + '%' : '—') + '\n';
      });
    }
    txt += '\n📋 <b>آخرین سیگنال‌ها:</b>\n';
    daySignals.slice(-10).forEach(function(s) {
      var ic = s.status === 'WIN' ? '✅' : s.status === 'LOSS' ? '❌' : s.status === 'OPEN' ? '⏳' : s.status === 'UNFILLED' ? '🚫' : '⌛';
      var t = new Date(s.t).toLocaleTimeString('fa-IR').slice(0, 5);
      var rgIcon = s.passport && s.passport.regime ? ' ' + ({ TRENDING_UP:'📈',TRENDING_DOWN:'📉',RANGING:'↔️',HIGH_VOL:'🌪️',COMPRESSION:'🗜️' }[s.passport.regime] || '') : '';
      txt += ic + ' ' + t + ' ' + s.sym + ' ' + s.dir + rgIcon + ' @' + s.entry;
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
  [{ text: '🔬 فرصت‌سنج', callback_data: 'journal_opp' }],
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
  [{ text: '✅ فعال' + m('on'), callback_data: 'lf_on' }],
  [{ text: '❌ غیرفعال' + m('off'), callback_data: 'lf_off' }],
  [{ text: '◀️ بازگشت', callback_data: 'menu_settings' }]
]}; }
function modelTierMenu(cur) { var m = function(x) { return cur === x ? ' ✅' : ''; }; return { inline_keyboard: [
  [{ text: '🚀 سریع' + m('fast'), callback_data: 'tier_fast' }],
  [{ text: '🧠 DeepSeek' + m('deepseek'), callback_data: 'tier_deepseek' }],
  [{ text: '💎 قوی' + m('premium'), callback_data: 'tier_premium' }],
  [{ text: '🔄 پاک‌کردن کش مدل', callback_data: 'tier_reset' }],
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
    [{ text: isCrypto ? '🟡 Binance' : '📊 Twelve', callback_data: 'mdp_' + (isCrypto ? 'binance' : 'twelve') + '_' + sym + '_' + tf + '_' + ai }],
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
  c += '<b>وضعیت:</b> ' + getKZBadge(symbol) + '\n';
  c += buildRegimeBlock(levels);
  c += buildAdversarialBlock(levels);
  c += buildCalibBadge(levels);
  c += '\n';
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
  c += '<b>وضعیت:</b> ' + getKZBadge(symbol) + '\n';
  c += buildRegimeBlock(levels);
  c += buildAdversarialBlock(levels);
  c += '\n';
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
  c += buildAdversarialBlock(levels);
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
  await sendOrEdit(token, chatId, mid, '🎯 <b>Everest v8.2.3</b>\n\n📊 Auto Journal + گزارش شبانه\n🧭 رژیم · 🛡️ Adversarial · 🎯 Calibration\n🌐 KZ Mode · 🪙 کریپتو · 🎯 Entry Type\n🔍 فیلتر محلی MSS/BOS\n⏳ Expiry Watchdog\n🔬 Opportunity Ledger\n🆕 <b>Real Model Names + Auto-Discovery</b>\n\nاز منو انتخاب کنید:', mainMenu());
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
    t += '📈 ' + j.length + ' سیگنال\n✅ ' + w + ' برد · ❌ ' + l + ' باخت · ⏳ ' + op + ' باز';
    if (pending) t += ' (🚫 ' + pending + ' معلق)';
    t += '\n🚫 ' + uf + ' پر نشده\n\n';
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
    t += '⚪ <b>غیرفعال</b>\n\nهر کندل بسته بررسی می‌شه.\n\n' + lfLabel + '\n\n🆕 <b>v8.2.3:</b> Real Model Names + Auto-Discovery';
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
  var calibOn = await isCalibApplyOn(env, chatId);
  var text = '⚙️ <b>تنظیمات v8.2.3</b>\n\n' +
    '<b>🎚️ نوع:</b> ' + stCfg.icon + ' ' + stCfg.label + '\n' +
    '<b>⚙️ KZ Mode:</b> ' + KZ_MODES[kz].icon + ' ' + KZ_MODES[kz].label + '\n' +
    '<b>🎯 حالت:</b> ' + uc.icon + ' ' + uc.label + '\n' +
    '<b>🧠 هم‌گرایی:</b> ' + cl + '\n' +
    '<b>' + lfIcon + '</b>\n' +
    '<b>Custom Vision:</b> ' + cvReady + '\n' +
    '<b>🎯 کالیبراسیون:</b> ' + (calibOn ? '🟢 فعال' : '⚪ غیرفعال') + '\n' +
    '<b>مدل:</b> A ' + aL + ' · G ' + gL;
  await sendOrEdit(token, chatId, mid, text, {
    inline_keyboard: [
      [{ text: '🎚️ نوع تحلیل', callback_data: 'settings_strict' }],
      [{ text: '⚙️ KZ Mode', callback_data: 'settings_kz' }],
      [{ text: '🎯 حالت معاملاتی', callback_data: 'settings_mode' }],
      [{ text: '🧠 هم‌گرایی', callback_data: 'settings_confluence' }],
      [{ text: '🔍 فیلتر محلی', callback_data: 'settings_localfilter' }],
      [{ text: '🎚️ سطح مدل', callback_data: 'settings_tier' }],
      [{ text: '🎯 کالیبراسیون', callback_data: 'settings_calib' }],
      [{ text: '🛡️ ریسک پورتفوی', callback_data: 'settings_portfolio' }],
      [{ text: '🏠', callback_data: 'menu_main' }]
    ]
  });
}

async function showStatus(token, chatId, mid, env) {
  var all = ['customvision','gemini','aiprime','groq','github','together','gapgpt','openrouter','mistral','huggingface','cloudflare','nvidia','llm7','avalai','metis','onexai'];
  var text = '📈 <b>وضعیت v8.2.3</b>\n\n';
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
  text += '⏳ Watchdog: ' + (env.KV ? '✅ هر دقیقه' : '❌') + '\n';

  text += '\n━━━━━━━━━━━━━━━\n';
  text += '🆕 <b>Model Cache:</b>\n';
  var aipModels = await getDiscoveredModels(env, chatId, 'aiprime');
  var gapModels = await getDiscoveredModels(env, chatId, 'gapgpt');
  text += 'AIPrime: ' + (aipModels ? aipModels.length + ' مدل کشف' : 'کشف‌نشده') + '\n';
  text += 'GapGPT: ' + (gapModels ? gapModels.length + ' مدل کشف' : 'کشف‌نشده') + '\n';
  var aFast = await getWorkingModel(env, chatId, 'aiprime', 'fast');
  var aDeep = await getWorkingModel(env, chatId, 'aiprime', 'deepseek');
  var aPrem = await getWorkingModel(env, chatId, 'aiprime', 'premium');
  if (aFast || aDeep || aPrem) {
    text += 'A کارت‌ها: ' + [aFast || '—', aDeep || '—', aPrem || '—'].join(' · ') + '\n';
  }

  text += '\n━━━━━━━━━━━━━━━\n';
  var prState = await getPortfolioState(env, chatId);
  var prCfg = await getPortfolioConfig(env, chatId);
  var prIcon = prState.todayRSum <= prCfg.maxDailyLossRR ? '🔴' : prState.todayRSum < 0 ? '🟡' : '🟢';
  text += prIcon + ' پورتفوی: ' + prState.todayRSum.toFixed(2) + 'R · ' + prState.totalOpen + '/' + prCfg.maxTotal + ' باز\n';

  await sendOrEdit(token, chatId, mid, text, { inline_keyboard: [[{ text: '🏠', callback_data: 'menu_main' }]] });
}

async function showHelp(token, chatId, mid) {
  var t = '📖 <b>راهنما v8.2.3</b>\n\n' +
    '📊 <b>Auto Journal:</b>\nهر سیگنال تأییدشده خودکار ثبت می‌شه.\n\n' +
    '🆕 <b>v8.2.3:</b>\nReal Model Names (deepseek-v3.2, claude-sonnet-5.5, gpt-4o-mini)\nAuto-Discovery از /v1/models\nmax_tokens=32000\nreasoning-safe\n\n' +
    '🆕 <b>v8.2 Pipeline:</b>\nAI → Schema → Adversarial → Filter → Portfolio Gate → Journal → Calibration\n\n' +
    '⏳ <b>Expiry Watchdog:</b>\n• 🚫 UNFILLED = سفارش لیمیت پر نشد\n• ⌛ EXPIRED = پر شد ولی TP/SL نزد\n\n' +
    '🎯 <b>Calibration:</b>\nBrier Score + Reliability Curve\n\n' +
    '🛡️ <b>Portfolio Gate:</b>\nضرر روزانه · هم‌نماد · هر بازار · کل · همبستگی آلت‌کوین\n\n' +
    '⭐ <b>Vision:</b> Gemini → GapGPT → AIPrime\n\n' +
    '<b>دستورات:</b>\n/menu /monitor /analyze /journal /watch /status';
  await sendOrEdit(token, chatId, mid, t, { inline_keyboard: [[{ text: '🏠', callback_data: 'menu_main' }]] });
}

async function showMonitorHelp(token, chatId, mid) {
  var t = '📖 <b>راهنمای مانیتور v8.2.3</b>\n\n' +
    '🤖 هر کندل بسته، بازار تحلیل می‌شه.\n\n' +
    '🔍 <b>فیلتر محلی MSS/BOS:</b>\nصرفه‌جویی توکن.\n\n' +
    '🧭 <b>رژیم محلی:</b>\nقبل از AI (EMA + ATR + ADX)\n\n' +
    '🛡️ <b>Adversarial:</b>\n۶ قانون قطعی — رد قبل از ثبت\n\n' +
    '🎯 <b>Calibration:</b>\nconfidence تعدیل‌شده با Brier\n\n' +
    '🆕 <b>Real Model Names:</b>\nAIPrime: deepseek-v3.2, claude-sonnet-5.5, gpt-4o-mini\nGapGPT: همان‌ها (Auto-Discovered)\n\n' +
    '📓 <b>Auto Journal + Watchdog:</b>\nسیگنال‌ها خودکار با Passport ثبت می‌شن';
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
    var rgI = x.passport && x.passport.regime ? ' ' + ({ TRENDING_UP:'📈',TRENDING_DOWN:'📉',RANGING:'↔️',HIGH_VOL:'🌪️',COMPRESSION:'🗜️' }[x.passport.regime] || '') : '';
    t += ic + ' ' + time + ' ' + esc(x.sym) + ' ' + esc(x.dir) + rgI + ' @' + x.entry;
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

async function showOpportunityReport(token, chatId, env) {
  var rej = await opLedgerLoad(env, chatId);
  var all = await getJournal(env, chatId) || [];
  var rejClosed = rej.filter(function(s) { return s.status === 'WIN' || s.status === 'LOSS'; });
  var rejWins = rejClosed.filter(function(s) { return s.status === 'WIN'; }).length;
  var rejLoss = rejClosed.filter(function(s) { return s.status === 'LOSS'; }).length;
  var rejWR = rejClosed.length ? Math.round(rejWins / rejClosed.length * 100) : 0;
  var accClosed = all.filter(function(s) { return s.status === 'WIN' || s.status === 'LOSS'; });
  var accWins = accClosed.filter(function(s) { return s.status === 'WIN'; }).length;
  var accLoss = accClosed.filter(function(s) { return s.status === 'LOSS'; }).length;
  var accWR = accClosed.length ? Math.round(accWins / accClosed.length * 100) : 0;
  var t = '🔬 <b>فرصت‌سنج v8.2.3</b>\n\n';
  t += '✅ <b>Accepted:</b>\n';
  t += '• کل بسته: ' + accClosed.length + '\n';
  t += '• برد/باخت: ' + accWins + '/' + accLoss + '\n';
  t += '• وین ریت: <b>' + accWR + '%</b>\n\n';
  t += '🚫 <b>Rejected:</b>\n';
  t += '• کل: ' + rej.length + ' · بسته: ' + rejClosed.length + '\n';
  t += '• برد/باخت: ' + rejWins + '/' + rejLoss + '\n';
  t += '• وین ریت: <b>' + rejWR + '%</b>\n\n';
  if (rejClosed.length >= 10 && rejWR > accWR + 10) {
    t += '⚠️ <b>هشدار:</b> فیلترها بیش از حد سختگیرن\n\n';
  }
  t += '📋 <b>آخرین رد‌شده‌ها:</b>\n';
  if (!rej.length) t += '<i>هنوز رد‌شده‌ای نیست</i>\n';
  else {
    rej.slice(-5).reverse().forEach(function(s) {
      var ic = s.status === 'WIN' ? '✅' : s.status === 'LOSS' ? '❌' : s.status === 'OPEN' ? '⏳' : '?';
      t += ic + ' ' + esc(s.sym) + ' ' + esc(s.dir) + ' @' + s.entry + ' — ' + esc(s.reason) + '\n';
    });
  }
  await sendMessage(token, chatId, t, { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_journal' }]] });
}

async function showCalibMenu(token, chatId, mid, env) {
  var on = await isCalibApplyOn(env, chatId);
  var summary = await renderCalibrationSummary(env, chatId);
  var t = '🎯 <b>Calibration Engine</b>\n\n';
  t += 'وضعیت: ' + (on ? '🟢 فعال' : '⚪ غیرفعال') + '\n\n';
  t += summary + '\n\n';
  t += '<i>با n≥20 و bucket n≥8، confidence تصحیح می‌شه</i>';
  await sendOrEdit(token, chatId, mid, t, { inline_keyboard: [
    [{ text: on ? '⚪ غیرفعال کردن' : '🟢 فعال کردن', callback_data: on ? 'calib_off' : 'calib_on' }],
    [{ text: '◀️', callback_data: 'menu_settings' }]
  ]});
}

async function showPortfolioState(token, chatId, mid, env) {
  var cfg = await getPortfolioConfig(env, chatId);
  var state = await getPortfolioState(env, chatId);
  var t = '🛡️ <b>وضعیت پورتفوی</b>\n\n';
  var lossColor = state.todayRSum <= cfg.maxDailyLossRR ? '🔴' : state.todayRSum < 0 ? '🟡' : '🟢';
  t += lossColor + ' <b>ضرر روزانه:</b> ' + state.todayRSum.toFixed(2) + 'R / ' + cfg.maxDailyLossRR + 'R\n';
  t += '🔓 <b>پوزیشن باز:</b> ' + state.totalOpen + ' / ' + cfg.maxTotal + '\n';
  var mk = Object.keys(state.openByMarket);
  if (mk.length) {
    t += '📊 <b>به تفکیک بازار:</b>\n';
    mk.forEach(function(m) { t += '  • ' + esc(m) + ': ' + state.openByMarket[m] + '/' + cfg.maxPerMarket + '\n'; });
  }
  t += '🪙 <b>کریپتو باز:</b> ' + state.openCrypto + (state.hasBTC ? ' (BTC: ✅)' : '') + '\n';
  t += '\n<i>قوانین:</i>\n';
  t += '• هم‌نماد: max ' + cfg.maxPerSymbol + '\n';
  t += '• هر بازار: max ' + cfg.maxPerMarket + '\n';
  t += '• کل: max ' + cfg.maxTotal + '\n';
  t += '• آلت‌کوین همبسته: max ' + cfg.maxCorrelatedAlts + '\n';
  await sendOrEdit(token, chatId, mid, t, { inline_keyboard: [[{ text: '◀️', callback_data: 'menu_settings' }]] });
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
        var txt = await withTimeout(PROVIDER_FUNCS[forcedProvider](env, fullPrompt, null, null, chatId), 180000, forcedProvider);
        if (txt && txt.length > 10) result = { text: txt, provider: PROVIDER_NAMES[forcedProvider] };
        else throw new Error('پاسخ کوتاه');
      } catch (e) {
        await sendMessage(token, chatId, '❌ ' + forcedProvider + ': ' + e.message);
        result = await callWithFallback(env, fullPrompt, null, null, chatId);
      }
    } else result = await callWithFallback(env, fullPrompt, null, null, chatId);

    var levels = validateSignalStrict(extractLevels(result.text), {
      strict: st, minRR: uc.minRR, minConfidence: uc.minConfidence,
      atr: atr, price: currentPrice
    });
    levels._atr = atr;
    var regime = computeLocalRegime(klines);
    levels._regime = regime;
    var adv = adversarialCheck(levels, klines, regime, atr);
    levels._adversarial = adv;

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
        var txt = await withTimeout(PROVIDER_FUNCS[forcedProvider](env, fullPrompt, null, null, chatId), 180000, forcedProvider);
        if (txt && txt.length > 10) result = { text: txt, provider: PROVIDER_NAMES[forcedProvider] };
        else throw new Error('کوتاه');
      } catch (e) { result = await callWithFallback(env, fullPrompt, null, null, chatId); }
    } else result = await callWithFallback(env, fullPrompt, null, null, chatId);

    var levels = validateSignalStrict(extractLevels(result.text), {
      strict: st, minRR: uc.minRR, minConfidence: uc.minConfidence, atr: atr, price: currentPrice
    });
    levels._atr = atr;
    var regime = computeLocalRegime(k15);
    levels._regime = regime;
    var adv = adversarialCheck(levels, k15, regime, atr);
    levels._adversarial = adv;
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
    var levels = validateSignalStrict(extractLevels(result.text), { strict: st, minRR: uc.minRR, minConfidence: uc.minConfidence });
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
  var msg = '✅ <b>مانیتور فعال شد (v8.2.3)</b>\n\n' +
    '<b>نماد:</b> ' + (isCrypto ? '🪙' : '💱') + ' ' + symbol + '\n' +
    '<b>TF:</b> ' + timeframeLabel(tf) + '\n' +
    '<b>AI:</b> ' + aiLabel + '\n' +
    '<b>داده:</b> ' + dpLabel + '\n' +
    '<b>حالت:</b> ' + cfg.icon + ' ' + cfg.label + '\n' +
    '<b>نوع:</b> ' + stCfg.icon + ' ' + stCfg.label + '\n' +
    '<b>KZ:</b> ' + KZ_MODES[kzMode].icon + ' ' + KZ_MODES[kzMode].label + '\n\n' +
    '🎯 آستانه CF: <b>' + cfg.minConfluence + '</b>\n' +
    '⏳ کنسلی سفارش پر نشده: <b>' + getExpiryTTL(tf) + ' کندل</b>\n' +
    '⏰ انقضای سفارش پرشده: <b>' + getFilledTimeoutTTL(tf) + ' کندل</b>\n\n' +
    '🆕 <b>v8.2.3:</b>\nReal Model Names + Auto-Discovery + max_tokens 32000';
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
    await resolveRejectedSignals(env, chatId, klines, symbol, tf);
  } catch (e) { console.error('resolveJournal in monitor: ' + e.message); }

  var ls = localStructure(klines, 5);
  if (localFilter === 'on' && !ls.fresh) {
    m.skippedCount = (m.skippedCount || 0) + 1;
    return;
  }

  var currentPrice = klines[klines.length - 1].close;
  var atr = calcATR(klines, 14);
  var regime = computeLocalRegime(klines);

  var promptBody = 'نماد: ' + symbol + '\nتایم‌فریم: ' + timeframeLabel(tf) + '\nقیمت فعلی: ' + currentPrice + '\n\n' + klinesToText(klines, symbol, timeframeLabel(tf));
  var facts = '\n\n🧮 محلی:\n- ATR(14)=' + (atr ? atr.toFixed(4) : '?') + '\n';
  if (isCrypto) {
    var w = getCryptoLiquidityWindow();
    facts += '- 🪙 کریپتو: ' + (w.high ? 'لیکویید بالا' : w.active ? 'لیکویید متوسط' : 'لیکویید پایین') + '\n';
  } else {
    var kz = getKillZoneInfo();
    facts += '- ' + (kz.active ? '⚠️ داخل KZ — اولویت بالا' : '⚠️ خارج KZ — احتیاط') + '\n';
  }
  facts += '- 🧭 رژیم: ' + regime.regime + ' (ADX:' + regime.adx + ', ATR%:' + regime.atrPct + ', Slope:' + regime.emaSlope + '%)\n';

  var confMode = await getConfluenceMode(env, chatId);
  var sysPrompt = buildPromptForMode(SYSTEM_PROMPT, confMode);
  if (isCrypto) sysPrompt += CRYPTO_NOTE;
  var fullPrompt = sysPrompt + '\n\n' + promptBody + facts;

  var result;
  var forcedProvider = m.aiProvider && m.aiProvider !== 'auto' ? m.aiProvider : null;
  if (forcedProvider && PROVIDER_FUNCS[forcedProvider]) {
    try {
      var txt = await withTimeout(PROVIDER_FUNCS[forcedProvider](env, fullPrompt, null, null, chatId), 180000, forcedProvider);
      if (txt && txt.length > 10) result = { text: txt, provider: PROVIDER_NAMES[forcedProvider] };
      else throw new Error('کوتاه');
    } catch (e) { result = await callWithFallback(env, fullPrompt, null, null, chatId); }
  } else result = await callWithFallback(env, fullPrompt, null, null, chatId);

  var rawLevels = extractLevels(result.text);
  var originalDir = rawLevels.direction;
  var levels = validateSignalStrict(rawLevels, {
    strict: strict, minRR: cfg.minRR, minConfidence: cfg.minConfidence,
    atr: atr, price: currentPrice
  });
  levels._atr = atr;
  levels._regime = regime;

  var adv = adversarialCheck(levels, klines, regime, atr);
  levels._adversarial = adv;
  var alreadyLogged = false;

  if ((levels.direction === 'BUY' || levels.direction === 'SELL') && !adv.passed) {
    await logRejectedSignal(env, chatId, levels, 'adversarial:' + adv.issues[0], currentPrice, { symbol: symbol, tf: tf, provider: result.provider });
    levels.direction = 'WAIT';
    levels.validationIssues = (levels.validationIssues || []).concat(adv.issues.map(function(i) { return '🛡️ ' + i; }));
    alreadyLogged = true;
  }

  var confluence = await resolveConfluence(env, chatId, levels, result.text);
  var ok = isSignalConfirmed(levels, confluence, strict, cfg, regime);

  if (ok) {
    var pr = await portfolioCheck(env, chatId, { sym: symbol, market: isCrypto ? 'crypto' : 'forex' });
    if (!pr.ok) {
      await logRejectedSignal(env, chatId, rawLevels, 'portfolio:' + pr.issues[0], currentPrice, { symbol: symbol, tf: tf, provider: result.provider });
      levels.validationIssues = (levels.validationIssues || []).concat(pr.issues.map(function(i) { return '🛡️ ' + i; }));
      alreadyLogged = true;
      ok = false;
    }
  }

  if (!ok && !alreadyLogged && (originalDir === 'BUY' || originalDir === 'SELL') && rawLevels.entry != null && rawLevels.sl != null && rawLevels.tp1 != null) {
    var reason = levels._schemaFailed ? 'schema' : 'filter';
    await logRejectedSignal(env, chatId, rawLevels, reason, currentPrice, { symbol: symbol, tf: tf, provider: result.provider });
  }

  var tol = (atr || 0) * 0.5;
  var p = m.lastSignal;
  var dup = ok && p && p.dir === levels.direction && Math.abs(p.entry - levels.entry) <= tol && (Date.now() - p.t) < (TF_MINUTES[tf] || 5) * 60000 * 2;

  console.log('[MON ' + chatId + '] ' + symbol + ' ' + tf + ' | dir=' + levels.direction + ' conf=' + levels.confidence + ' rr=' + (levels.rr || '—') + ' cf=' + (confluence && confluence.confluence != null ? confluence.confluence : '—') + ' reg=' + regime.regime + ' | ' + (ok ? (dup ? 'DUP' : 'SIGNAL ✅') : 'skip'));

  if (ok && !dup) {
    m.lastSignal = { dir: levels.direction, entry: levels.entry, t: Date.now() };
    m.signalCount = (m.signalCount || 0) + 1;
    var kzActive = isCrypto ? getCryptoLiquidityWindow().active : getKillZoneInfo().active;
    if (kzActive) m.kzSignalCount = (m.kzSignalCount || 0) + 1;
    m.lastSignalKey = levels.direction + '_' + levels.entry + '_' + levels.sl;

    var providerKey = normalizeProviderKey(result.provider);
    var tier = await getUserModelTier(env, chatId, providerKey);
    var confRaw = levels.confidence;
    var calib = await calibrateConfidence(env, chatId, providerKey, tier, regime.regime, levels.confidence);
    if (calib.adjusted) {
      levels.confidence = calib.conf;
      levels._calibrated = true;
      levels._confRaw = confRaw;
    }

    await autoJournalAdd(env, chatId, levels, result.provider, symbol, tf, currentPrice, {
      atr: atr, regime: regime, adversarial: adv, localStructure: ls,
      candleCount: klines.length, confidenceRaw: confRaw,
      confidenceAdjusted: calib.adjusted, modelTier: tier, strictness: strict
    });
    await sendMonitorSignal(token, chatId, levels, confluence, result, currentPrice, symbol, tf);
  }
}

function isSignalConfirmed(levels, confluence, strict, cfg, regime) {
  if (levels.direction !== 'BUY' && levels.direction !== 'SELL') return false;
  if (!levels.entry || !levels.sl) return false;

  var minConf = cfg.minConfidence;
  var minRR = cfg.minRR;
  var minCF = cfg.minConfluence;

  if (regime) {
    if (regime.regime === 'HIGH_VOL') { minConf += 5; minCF += 1; }
    if (regime.regime === 'COMPRESSION') { minCF += 0.5; }
    if (regime.regime === 'TRENDING_UP' && levels.direction === 'SELL') { minCF += 1.5; }
    if (regime.regime === 'TRENDING_DOWN' && levels.direction === 'BUY') { minCF += 1.5; }
  }

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

  var caption = '🚨 <b>سیگنال مانیتور (v8.2.3)</b>\n\n';
  caption += '<b>نماد:</b> ' + symIcon + ' ' + symbol + '\n';
  caption += '<b>TF:</b> ' + timeframeLabel(tf) + '\n';
  caption += '<b>وضعیت:</b> ' + kzBadge + '\n';
  caption += buildRegimeBlock(levels);
  caption += buildCalibBadge(levels);

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

  caption += '\n📝 <b>ثبت در ژورنال با Passport</b>';

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
  if (data === 'journal_opp') { await showOpportunityReport(token, chatId, env); return; }
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
  if (data === 'settings_localfilter') { var curLF = await getLocalFilter(env, chatId); await sendOrEdit(token, chatId, mid, '🔍 <b>فیلتر محلی MSS/BOS</b>', localFilterMenu(curLF)); return; }
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
  if (data === 'tier_reset') {
    var lp2 = await env.KV.get('last_tier_prov:' + chatId) || 'aiprime';
    await resetModelCacheFor(env, chatId, lp2);
    var curT = await getUserModelTier(env, chatId, lp2);
    await sendOrEdit(token, chatId, mid, '🔄 کش ' + PROVIDER_NAMES[lp2] + ' پاک شد', modelTierMenu(curT));
    return;
  }

  if (data === 'settings_calib') { await showCalibMenu(token, chatId, mid, env); return; }
  if (data === 'calib_on') { await setCalibApply(env, chatId, true); await showCalibMenu(token, chatId, mid, env); return; }
  if (data === 'calib_off') { await setCalibApply(env, chatId, false); await showCalibMenu(token, chatId, mid, env); return; }
  if (data === 'settings_portfolio') { await showPortfolioState(token, chatId, mid, env); return; }
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
// PROMPTS (unchanged)
// ============================================
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
// EXPORT
// ============================================

export default {
  async fetch(request, env, ctx) {
    var url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '') return new Response('Everest Bot v8.2.3 — Real Model Names + Auto-Discovery', { status: 200 });
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
