// ============================================
// EVEREST BOT v8.6 — Telegram Worker
// v8.6: Scalp/Swing Mode + MT5 Bridge + Gemini 3.8 + Binance Mirror
// ============================================

const CONF_KEYS = ['structure', 'smc', 'ict', 'candle', 'liquidity', 'riskReward'];
const CONF_LABELS = { structure: 'Market Structure', smc: 'SMC / OB', ict: 'ICT / FVG', candle: 'Candlestick', liquidity: 'Liquidity', riskReward: 'R/R' };

const PORTFOLIO_DEFAULTS = { maxDailyLossRR: -3, maxPerSymbol: 2, maxPerMarket: 5, maxTotal: 8, maxCorrelatedAlts: 2 };
const CALIB_MIN_SAMPLES = 20;
const CALIB_BUCKET_MIN = 8;

const MODEL_TIERS = {
  aiprime: {
    fast: { label: '🚀 سریع', text: 'gpt-4o-mini', vision: 'gpt-4o' },
    deepseek: { label: '🧠 DeepSeek', text: 'deepseek-v3.2', vision: 'gpt-4o' },
    premium: { label: '💎 Claude', text: 'claude-sonnet-5.5', vision: 'claude-sonnet-5.5' }
  },
  gapgpt: {
    fast: { label: '🚀 سریع', text: 'gpt-4o-mini', vision: 'gpt-4o' },
    deepseek: { label: '🧠 DeepSeek', text: 'deepseek-v3.2', vision: 'gpt-4o' },
    premium: { label: '💎 Claude', text: 'claude-sonnet-5.5', vision: 'claude-sonnet-5.5' }
  }
};

const MODEL_FALLBACK_CHAINS = {
  aiprime: {
    fast: ['gpt-4o-mini', 'gpt-4o', 'gemini-2.5-flash'],
    deepseek: ['deepseek-v4.1-flash', 'deepseek-v4-flash', 'deepseek-v3.2', 'deepseek-reasoner'],
    premium: ['claude-sonnet-5.5', 'claude-sonnet-5', 'claude-sonnet-4.6']
  },
  gapgpt: {
    fast: ['gpt-4o-mini', 'gpt-4o', 'gemini-2.5-flash'],
    deepseek: ['deepseek-v4.1-flash', 'deepseek-v4-flash', 'deepseek-reasoner', 'deepseek-v3.2'],
    premium: ['claude-sonnet-5.5', 'claude-sonnet-5', 'claude-sonnet-4.6']
  }
};

const VISION_MODELS_BY_PROVIDER = {
  gemini: ['gemini-3.8-flash', 'gemini-2.5-flash'],
  aiprime: ['gpt-4o', 'gpt-4o-mini', 'claude-sonnet-5.5'],
  gapgpt: ['gpt-4o', 'gpt-4o-mini']
};

function getMaxTokens(model) {
  var m = String(model || '').toLowerCase();
  if (/gpt-4o-mini|gpt-3\.5/.test(m)) return 4000;
  if (/deepseek-r1|deepseek-reasoner/.test(m)) return 12000;
  if (/gemini/.test(m)) return 12000;
  if (/claude/.test(m)) return 8000;
  if (/deepseek/.test(m)) return 32000;
  if (/gpt-4o$/.test(m)) return 16000;
  return 8000;
}

const EXPIRY_TTL_BY_TF = { '1min': 20, '3min': 15, '5min': 12, '15min': 10, '1h': 8, '4h': 6 };
const EXPIRY_TTL_DEFAULT = 12;
const EXPIRY_WARN_PCT = 0.75;
const FILLED_TIMEOUT_BY_TF = { '1min': 40, '3min': 30, '5min': 24, '15min': 20, '1h': 16, '4h': 12 };
const FILLED_TIMEOUT_DEFAULT = 24;

const STRICTNESS_MODES = {
  hard: { label: '🔴 سختگیر', icon: '🔴', desc: 'همه فیلترها + TP1 الزامی + R/R سخت' },
  easy: { label: '🟢 آسان', icon: '🟢', desc: 'آستانه نرم‌تر' },
  both: { label: '⚖️ هر دو', icon: '⚖️', desc: 'ارزیابی دوگانه' }
};
const KZ_MODES = {
  off: { label: '۲۴/۷', icon: '🌐', desc: 'بی‌توجه' },
  priority: { label: 'اولویت KZ', icon: '⭐', desc: 'همیشه' },
  only: { label: 'فقط KZ', icon: '🔒', desc: 'skip' }
};
const FALLBACK_MODES = {
  strict: { label: '🔴 سختگیر', icon: '🔴', desc: 'اگر مدل انتخابی شکست خورد، سیگنال نمی‌دهد' },
  warn: { label: '🟡 با هشدار', icon: '🟡', desc: 'از مدل پایین‌تر با هشدار استفاده می‌کند' }
};

const CRYPTO_BASES = ['BTC','ETH','SOL','BNB','XRP','ADA','DOGE','DOT','AVAX','MATIC','LINK','LTC','ATOM','UNI','NEAR','APT','ARB','OP','TRX','SHIB','PEPE','TON','SUI','INJ','SEI','FIL','ETC','BCH','XLM','HBAR','VET','ALGO','FTM','SAND','MANA','AXS','GALA'];
const BINANCE_INTERVALS = { '1min':'1m','3min':'3m','5min':'5m','15min':'15m','1h':'1h','4h':'4h' };
const TF_MINUTES = { '1min':1,'3min':3,'5min':5,'15min':15,'1h':60,'4h':240 };
const TF_LABELS = { '1min':'1 دقیقه','3min':'3 دقیقه','5min':'5 دقیقه','15min':'15 دقیقه','1h':'1 ساعت','4h':'4 ساعت' };
const TD_INTERVALS = { '1min':'1min','3min':'5min','5min':'5min','15min':'15min','1h':'1h','4h':'4h' };

// ═══ v8.6 — MODE CONFIG (Scalp/Swing) ═══
const MODE_CONFIG = {
  scalping:  { label: 'اسکلپ', icon: '⚡', color: '#fbbf24', minConfidence: 55, minRR: 1.0, minConfluence: 2.5, targetRange: { min: 0.8, max: 3.5 }, allowedTFs: ['1min','3min','5min','15min'], promptRules: 'SCALPING' },
  swing:     { label: 'سوئینگ', icon: '🌊', color: '#22d3ee', minConfidence: 65, minRR: 1.5, minConfluence: 4.5, targetRange: null, allowedTFs: ['15min','1h','4h'], promptRules: 'STANDARD' }
};

// ═══ v8.6 — SCALPING RULES ═══
var SCALPING_RULES = "MODE: SCALPING. Analysis TF 1m-5m. Goal: fast micro-move 1-3 ATR.\n\nSCALPING OVERRIDES:\n- Min confluence: 2 factors (structure + zone is ENOUGH).\n- Min reward to TP1: 1.0× risk (1.5× preferred).\n- Stop distance as tight as 0.3× ATR.\n- Entry within 0.5× ATR of current price.\n- TP1 reachable within 15-30 candles of analysis TF.\n- Skip HTF bias check unless HTF is strongly against.\n- Prioritize: micro-liquidity sweeps, single-candle FVGs, micro OBs, engulfing patterns.\n- CONFIDENCE: start 50; +10 clean 1m structure; +5 tight FVG; +5 sweep; +5 displacement. Max 75. WAIT if: ATR>2× its 20-period average, or last 5 candles overlap, or no clear structural level nearby.\n- GOLD (XAUUSD): TP1 $1.00-$3.00 from entry. TP2 $3-6. SL $0.50-$1.50. If nearest level gives <$1 reward → WAIT. If 1m ATR >$3 → WAIT.\n- FX MAJORS: TP1 8-25 pips. SL 5-15 pips.\n- CRYPTO: TP1 0.15-0.4% of price. SL 0.1-0.25%.";

const AI_SHORT_BUDGET = 22000;
const AI_LONG_BUDGET = 280000;
const JOB_PROCESSING_TTL_MS = 5 * 60 * 1000;
const JOB_MAX_ATTEMPTS = 3;
const DISCOVERY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const OAI_BASES = { aiprime: 'https://api.aiprime.shop/v1', gapgpt: 'https://api.gapgpt.app/v1' };
const ERR_FA = {
  auth: 'کلید نامعتبر', quota: 'اعتبار/سهمیه', rate: 'محدودیت نرخ',
  perm: 'مجوز مدل در پلن نیست', missing: 'مدل در گیت‌وی نیست',
  param: 'پارامتر ناسازگار', upstream: 'خطای بالادست', other: 'نامشخص'
};

// ═══ v8.6 — GLOBAL CACHES ═══
var _strictCache = 'hard';
var _modeCache = 'swing';

// ═══ MT5 DEFAULTS ═══
var MT5_DEFAULTS = {
  endpoint: 'https://your-tunnel.trycloudflare.com/webhook',
  lot: 0.01,
  deviation: 20,
  auto: false,
  demoOnly: true
};

// ============================================
// UTILS
// ============================================
function isAdmin(env, c) {
  if (!env.ADMIN_CHAT_ID) return true;
  return String(env.ADMIN_CHAT_ID).split(',').map(function(x){return x.trim();}).indexOf(String(c)) !== -1;
}
function isSecurityEnabled(env) { return !!env.ADMIN_CHAT_ID; }
function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
function withTimeout(p, ms, l) {
  return Promise.race([p, new Promise(function(_, r) { setTimeout(function() { r(new Error(l + ' timeout')); }, ms); })]);
}
async function fetchWithTimeout(url, opts, timeoutMs, label) {
  var ctrl = new AbortController();
  var t = setTimeout(function() { ctrl.abort(); }, timeoutMs || 12000);
  try {
    var r = await fetch(url, Object.assign({}, opts || {}, { signal: ctrl.signal }));
    clearTimeout(t);
    return r;
  } catch (e) { clearTimeout(t); throw new Error((label || 'fetch') + ': ' + (e.message || 'timeout')); }
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
  var eff = klines.effTf || tf;
  var a = klines.slice();
  a.effTf = eff;
  var last = a[a.length - 1];
  if (!last || !last.datetime) return a;
  var t = Date.parse(String(last.datetime).includes('T') ? last.datetime : String(last.datetime).replace(' ', 'T') + 'Z');
  if (Number.isFinite(t) && t + (TF_MINUTES[eff] || 5) * 60000 > Date.now()) a.pop();
  return a;
}

function getExpiryTTL(tf) { return EXPIRY_TTL_BY_TF[tf] || EXPIRY_TTL_DEFAULT; }
function getFilledTimeoutTTL(tf) { return FILLED_TIMEOUT_BY_TF[tf] || FILLED_TIMEOUT_DEFAULT; }
function getExpiryInfo(signal) {
  var ttl = getExpiryTTL(signal.tf), tfm = (TF_MINUTES[signal.tf] || 5) * 60000;
  var ec = (Date.now() - signal.t) / tfm;
  return { ttl: ttl, elapsedCandles: Math.round(ec*10)/10, remainingCandles: Math.round(Math.max(0, ttl - ec)*10)/10, remainingMs: Math.max(0, ttl*tfm - (Date.now() - signal.t)), expired: ec >= ttl, warning: ec >= ttl * EXPIRY_WARN_PCT };
}
function getFilledExpiryInfo(signal) {
  var ttl = getFilledTimeoutTTL(signal.tf), tfm = (TF_MINUTES[signal.tf] || 5) * 60000;
  var startT = signal.fillT || signal.t;
  var ec = (Date.now() - startT) / tfm;
  return { ttl: ttl, elapsedCandles: Math.round(ec*10)/10, remainingCandles: Math.round(Math.max(0, ttl - ec)*10)/10, remainingMs: Math.max(0, ttl*tfm - (Date.now() - startT)), expired: ec >= ttl };
}
function formatRemainingTime(ms) {
  if (ms <= 0) return '0';
  var s = Math.floor(ms/1000), m = Math.floor(s/60), h = Math.floor(m/60);
  if (h > 0) return h+'ساعت '+(m%60)+'دقیقه';
  if (m > 0) return m+'دقیقه';
  return s+'ثانیه';
}

function localStructure(kl, L, K) {
  L = L || 5; K = K || 2;
  var ph = null, pl = null, state = 0, events = [];
  for (var i = 0; i < kl.length; i++) {
    var c = i - L;
    if (c >= L) {
      var H = true, Lw = true;
      for (var j = 1; j <= L; j++) {
        if (kl[c-j].high > kl[c].high || kl[c+j].high > kl[c].high) H = false;
        if (kl[c-j].low < kl[c].low || kl[c+j].low < kl[c].low) Lw = false;
      }
      if (H) ph = kl[c].high;
      if (Lw) pl = kl[c].low;
    }
    if (i > 0) {
      var cl = kl[i].close, pc = kl[i-1].close;
      if (ph != null && cl > ph && pc <= ph) { events.push({ idx: i, type: state === 1 ? 'BOS' : 'MSS', dir: 'BUY', level: ph }); state = 1; }
      else if (pl != null && cl < pl && pc >= pl) { events.push({ idx: i, type: state === -1 ? 'BOS' : 'MSS', dir: 'SELL', level: pl }); state = -1; }
    }
  }
  var recent = null;
  var lastIdx = kl.length - 1;
  for (var k = events.length - 1; k >= 0; k--) {
    if (lastIdx - events[k].idx <= (K - 1)) { recent = events[k]; break; }
  }
  return { state: state, ph: ph, pl: pl, fresh: recent };
}

function detectEntryType(levels, currentPrice) {
  if (!levels.entry || !currentPrice || levels.direction === 'WAIT') return { type: 'N/A', action: '—', icon: '⚪️', cls: '', desc: '', pct: 0, currentPrice: currentPrice || 0 };
  var diff = levels.entry - currentPrice;
  var pct = Math.abs(diff) / currentPrice * 100;
  var thresholdPct = 0.1;
  var atr = levels._atr;
  if (atr && atr > 0 && currentPrice > 0) thresholdPct = Math.max(0.05, (atr/currentPrice*100)*0.15);
  if (pct < thresholdPct) return { type: 'MARKET', action: levels.direction+' MARKET', icon: '⚡', cls: 'market', desc: 'قیمت ≈ Entry', pct: pct, currentPrice: currentPrice };
  if (levels.direction === 'BUY') {
    if (diff < 0) return { type: 'BUY LIMIT', action: 'BUY LIMIT', icon: '🔵', cls: 'limit', desc: 'منتظر ریزش '+pct.toFixed(2)+'٪', pct: pct, currentPrice: currentPrice };
    return { type: 'BUY STOP', action: 'BUY STOP', icon: '🟡', cls: 'stop', desc: 'منتظر شکست '+pct.toFixed(2)+'٪', pct: pct, currentPrice: currentPrice };
  }
  if (levels.direction === 'SELL') {
    if (diff > 0) return { type: 'SELL LIMIT', action: 'SELL LIMIT', icon: '🔵', cls: 'limit', desc: 'منتظر رشد '+pct.toFixed(2)+'٪', pct: pct, currentPrice: currentPrice };
    return { type: 'SELL STOP', action: 'SELL STOP', icon: '🟡', cls: 'stop', desc: 'منتظر شکست '+pct.toFixed(2)+'٪', pct: pct, currentPrice: currentPrice };
  }
  return { type: 'LIMIT', action: levels.direction+' LIMIT', icon: '🔵', cls: 'limit', desc: '', pct: pct, currentPrice: currentPrice };
}

function isCryptoSymbol(sym) {
  var s = String(sym || '').toUpperCase().replace(/[\/\-_]/g, '');
  for (var i = 0; i < CRYPTO_BASES.length; i++) if (s.indexOf(CRYPTO_BASES[i]) === 0) return true;
  return /\/(USDT|USDC|BUSD|BTC|ETH)$/.test(String(sym || '').toUpperCase());
}
function getLondonHour() { try { return parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: 'numeric', hour12: false }).format(new Date())); } catch (e) { return new Date().getUTCHours(); } }
function getNYHour() { try { return parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(new Date())); } catch (e) { return new Date().getUTCHours() - 5; } }
function getKillZoneInfo() {
  var l = getLondonHour(), n = getNYHour();
  var inL = l >= 7 && l < 10, inN = n >= 8 && n < 11;
  return { active: inL || inN, london: inL, ny: inN, overlap: inL && inN, londonH: l, nyH: n };
}
function getCryptoLiquidityWindow() { var n = getNYHour(); return { active: n >= 8 && n < 18, high: n >= 13 && n < 17, nyH: n }; }
function getKZBadge(symbol) {
  if (isCryptoSymbol(symbol)) {
    var w = getCryptoLiquidityWindow();
    if (w.high) return '🪙 <b>کریپتو — لیکویید بالا</b>';
    if (w.active) return '🪙 کریپتو — لیکوید متوسط';
    return '🪙 کریپتو — لیکوید پایین';
  }
  var kz = getKillZoneInfo();
  if (kz.overlap) return '⭐ <b>KZ همپوشانی</b>';
  if (kz.london) return '⭐ <b>KZ لندن</b>';
  if (kz.ny) return '⭐ <b>KZ نیویورک</b>';
  return '⚪ خارج KZ';
}
function shouldCheckNow(symbol, kzMode) {
  if (kzMode === 'off') return { ok: true, reason: '۲۴/۷' };
  if (kzMode === 'priority') return { ok: true, reason: 'اولویت' };
  if (kzMode === 'only') {
    if (isCryptoSymbol(symbol)) { var w = getCryptoLiquidityWindow(); return w.active ? { ok: true, reason: 'لیکویید' } : { ok: false, reason: 'خارج' }; }
    var kz = getKillZoneInfo();
    return kz.active ? { ok: true, reason: 'داخل KZ' } : { ok: false, reason: 'خارج' };
  }
  return { ok: true, reason: 'پیش‌فرض' };
}

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
// v8.6 — MT5 BRIDGE
// ============================================
async function getMT5Config(env, chatId) {
  try {
    var c = await env.KV.get('mt5cfg:' + chatId, 'json');
    return c || Object.assign({}, MT5_DEFAULTS);
  } catch (e) {
    return Object.assign({}, MT5_DEFAULTS);
  }
}
async function setMT5Config(env, chatId, cfg) {
  await env.KV.put('mt5cfg:' + chatId, JSON.stringify(cfg));
}
async function mt5SendSignal(env, chatId, payload) {
  var cfg = await getMT5Config(env, chatId);
  if (cfg.demoOnly) return { ok: false, demo: true, message: 'حالت دمو — ارسال نشد' };
  if (!cfg.endpoint || cfg.endpoint.indexOf('127.0.0.1') !== -1 || cfg.endpoint.indexOf('localhost') !== -1) {
    return { ok: false, error: 'Endpoint عمومی نیست — Cloudflare به localhost دسترسی ندارد' };
  }
  try {
    var ctrl = new AbortController();
    var t = setTimeout(function() { ctrl.abort(); }, 8000);
    var r = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    clearTimeout(t);
    return await r.json();
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
async function mt5AutoSend(env, chatId, levels, symbol) {
  var cfg = await getMT5Config(env, chatId);
  if (!cfg.auto) return null;
  if (levels.direction !== 'BUY' && levels.direction !== 'SELL') return null;
  if (levels.entry == null || levels.sl == null) return null;
  var mtSymbol = String(symbol).replace(/[\/\-_\s]/g, '').toUpperCase();
  return await mt5SendSignal(env, chatId, {
    symbol: mtSymbol,
    direction: levels.direction,
    entry: levels.entry,
    sl: levels.sl,
    tp1: levels.tp1 || null,
    tp2: levels.tp2 || null,
    tp3: levels.tp3 || null,
    lot: cfg.lot,
    deviation: cfg.deviation,
    comment: 'Everest TG ' + (_modeCache || 'swing'),
    timestamp: Date.now()
  });
}
async function mt5Test(env, chatId) {
  var cfg = await getMT5Config(env, chatId);
  if (cfg.endpoint.indexOf('127.0.0.1') !== -1 || cfg.endpoint.indexOf('localhost') !== -1) {
    return { ok: false, error: 'endpoint باید عمومی باشد (ngrok/cloudflared)' };
  }
  var base = cfg.endpoint.replace(/\/webhook\/?$/, '');
  var urls = [base + '/ping', base + '/health', base];
  for (var i = 0; i < urls.length; i++) {
    try {
      var ctrl = new AbortController();
      var t = setTimeout(function() { ctrl.abort(); }, 5000);
      var r = await fetch(urls[i], { signal: ctrl.signal });
      clearTimeout(t);
      if (r.ok) {
        var d = await r.json();
        return { ok: true, data: d, url: urls[i] };
      }
    } catch (e) {}
  }
  return { ok: false };
}
async function mt5TestSend(env, chatId) {
  var cfg = await getMT5Config(env, chatId);
  return await mt5SendSignal(env, chatId, {
    symbol: 'XAUUSD', direction: 'BUY',
    entry: null, sl: null, tp1: null,
    lot: cfg.lot, deviation: cfg.deviation,
    comment: 'Everest test', _test: true
  });
}

// ═══ v8.6 — checkTargetRange (Scalp) ═══
function checkTargetRange(levels, cfg, currentPrice, atr, tf, symbol) {
  if (!cfg || !cfg.targetRange) return { ok: true };
  if (levels.direction !== 'BUY' && levels.direction !== 'SELL') return { ok: true };
  if (levels.tp1 == null || levels.entry == null) return { ok: true };
  var distance = Math.abs(levels.tp1 - levels.entry);
  var r = cfg.targetRange;
  var actualMin = r.min, actualMax = r.max;
  var sym = (symbol || '').toUpperCase();
  if (/^(EUR|GBP|USD|JPY|AUD|NZD|CAD|CHF)/.test(sym) && !/XAU|XAG|GOLD|SILVER/.test(sym)) {
    var pip = sym.indexOf('JPY') !== -1 ? 0.01 : 0.0001;
    actualMin = 8 * pip; actualMax = 30 * pip;
  } else if (isCryptoSymbol(sym)) {
    actualMin = currentPrice * 0.001; actualMax = currentPrice * 0.005;
  }
  if (distance < actualMin) return { ok: false, reason: 'TP نزدیک (' + distance.toFixed(2) + ' < ' + actualMin.toFixed(2) + ')' };
  if (distance > actualMax) return { ok: false, reason: 'TP دور (' + distance.toFixed(2) + ' > ' + actualMax.toFixed(2) + ')' };
  if (atr && currentPrice) {
    var atrPct = (atr / currentPrice) * 100;
    if (tf === '1min' && atrPct > 0.08) return { ok: false, reason: 'ATR بالا (' + atrPct.toFixed(2) + '%)' };
    if (atr > distance * 0.9) return { ok: false, reason: 'ATR > 0.9×TP' };
  }
  return { ok: true, distance: distance };
}

// ============================================
// CHART RENDERING
// ============================================
function findLocalSR(klines) {
  var L = 3, highs = [], lows = [];
  for (var i = L; i < klines.length - L; i++) {
    var h = klines[i].high, l = klines[i].low, isH = true, isL = true;
    for (var j = 1; j <= L; j++) {
      if (klines[i-j].high >= h || klines[i+j].high >= h) isH = false;
      if (klines[i-j].low <= l || klines[i+j].low <= l) isL = false;
    }
    if (isH) highs.push(h);
    if (isL) lows.push(l);
  }
  var cp = klines[klines.length-1].close;
  var above = highs.filter(function(x){ return x > cp; }).sort(function(a,b){ return a-b; }).slice(0, 2);
  var below = lows.filter(function(x){ return x < cp; }).sort(function(a,b){ return b-a; }).slice(0, 2);
  return { support: below, resistance: above };
}

function buildChartConfig(klines, levels, symbol, tf, chartType) {
  chartType = chartType || 'candlestick';
  var slice = klines.slice(-70);
  if (slice.length < 20) return null;

  var cp = klines[klines.length-1].close;
  var priceWindow = Math.max(Math.abs(cp) * 0.15, 0.01);
  function inRange(p) { return isFinite(p) && Math.abs(p - cp) <= priceWindow; }

  function xOf(k) {
    var s = String(k.datetime || '').trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s + 'T00:00:00';
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(s)) return s.replace(' ', 'T').slice(0, 19);
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(s)) return s.replace(' ', 'T') + ':00';
    return s;
  }

  var candleData = [], lineData = [], firstX = null, lastX = null;
  slice.forEach(function(k) {
    var xStr = xOf(k);
    if (!xStr) return;
    var xNum = Date.parse(xStr);
    if (!Number.isFinite(xNum)) return;
    if (firstX === null) firstX = xNum;
    lastX = xNum;
    candleData.push({ x: xNum, o: +k.open, h: +k.high, l: +k.low, c: +k.close });
    lineData.push({ x: xNum, y: +k.close });
  });
  if (candleData.length < 20) return null;

  var annotations = {}, idx = 0;
  function addAnn(v) { annotations['a' + (idx++)] = v; }
  function addLine(price, color, label, bg, bold) {
    if (!inRange(price)) return;
    addAnn({ type: 'line', xMin: firstX, xMax: lastX, yMin: price, yMax: price,
      borderColor: color, borderWidth: bold ? 2 : 1, borderDash: [8, 4],
      label: { display: true, content: label, position: 'end', backgroundColor: bg, color: '#fff',
        font: { size: bold ? 11 : 9, weight: bold ? 'bold' : 'normal' }, padding: 3, borderRadius: 4 } });
  }
  function addBox(top, bottom, bg, border, label, color) {
    if (!inRange(top) && !inRange(bottom)) return;
    if (!isFinite(top) || !isFinite(bottom)) return;
    addAnn({ type: 'box', xMin: firstX, xMax: lastX,
      yMin: Math.min(top, bottom), yMax: Math.max(top, bottom),
      backgroundColor: bg, borderColor: border, borderWidth: 1,
      label: { display: true, content: label, position: 'start', color: color,
        font: { size: 9, weight: 'bold' }, backgroundColor: 'rgba(0,0,0,0.5)', padding: 2, borderRadius: 3 } });
  }

  if (levels.direction === 'BUY' || levels.direction === 'SELL') {
    if (levels.entry != null) addLine(levels.entry, '#22d3ee', 'Entry ' + levels.entry, '#0891b2', true);
    if (levels.sl != null) addLine(levels.sl, '#ef4444', 'SL ' + levels.sl, '#dc2626', true);
    if (levels.tp1 != null) addLine(levels.tp1, '#22c55e', 'TP1 ' + levels.tp1, '#16a34a', false);
    if (levels.tp2 != null) addLine(levels.tp2, '#4ade80', 'TP2 ' + levels.tp2, '#16a34a', false);
    if (levels.tp3 != null) addLine(levels.tp3, '#86efac', 'TP3 ' + levels.tp3, '#16a34a', false);
  }
  (levels.support || []).slice(0, 3).forEach(function(p, i) { addLine(p, 'rgba(34,197,94,0.55)', 'S' + (i+1), '#16a34a', false); });
  (levels.resistance || []).slice(0, 3).forEach(function(p, i) { addLine(p, 'rgba(239,68,68,0.55)', 'R' + (i+1), '#dc2626', false); });
  (levels.orderBlocks || []).slice(0, 3).forEach(function(ob) {
    if (!ob || !isFinite(ob.top) || !isFinite(ob.bottom)) return;
    var isBull = ob.type === 'bullish';
    addBox(ob.top, ob.bottom,
      isBull ? 'rgba(34,197,94,0.13)' : 'rgba(239,68,68,0.13)',
      isBull ? 'rgba(34,197,94,0.55)' : 'rgba(239,68,68,0.55)',
      isBull ? 'OB ▲' : 'OB ▼', isBull ? '#4ade80' : '#fb7185');
  });
  (levels.fvg || []).slice(0, 3).forEach(function(f) {
    if (!f || !isFinite(f.top) || !isFinite(f.bottom)) return;
    var isBull = f.type === 'bullish';
    addBox(f.top, f.bottom,
      isBull ? 'rgba(59,130,246,0.10)' : 'rgba(245,158,11,0.10)',
      isBull ? 'rgba(59,130,246,0.45)' : 'rgba(245,158,11,0.45)',
      isBull ? 'FVG ▲' : 'FVG ▼', isBull ? '#60a5fa' : '#fbbf24');
  });

  var titleTxt = symbol + ' · ' + tf + ' · ' + (levels.direction || 'WAIT');
  if (levels.confidence != null) titleTxt += ' · ' + levels.confidence + '%';

  var isCandle = chartType === 'candlestick';
  var dataset = isCandle
    ? { label: symbol, data: candleData, color: { up: '#22c55e', down: '#ef4444', unchanged: '#94a3b8' } }
    : { label: symbol, data: lineData, borderColor: '#6ea8fe', backgroundColor: 'rgba(110,168,254,0.08)', borderWidth: 2, pointRadius: 0, fill: true };

  return {
    type: isCandle ? 'candlestick' : 'line',
    data: { datasets: [dataset] },
    options: {
      animation: false,
      plugins: {
        legend: { display: false },
        title: { display: true, text: titleTxt, color: '#e5e7eb', font: { size: 14, weight: 'bold' } },
        annotation: { annotations: annotations }
      },
      scales: {
        x: { type: 'time', time: { tooltipFormat: 'yyyy-MM-dd HH:mm' },
          ticks: { color: '#94a3b8', maxRotation: 45, autoSkip: true, maxTicksLimit: 12 },
          grid: { color: 'rgba(148,163,184,0.08)' } },
        y: { position: 'right', ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.08)' } }
      }
    }
  };
}

async function _quickChartPost(config) {
  try {
    return await fetchWithTimeout('https://quickchart.io/chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: '4', chart: config, width: 1000, height: 600, format: 'png', backgroundColor: '#0a101e' })
    }, 20000, 'QuickChart');
  } catch (e) {
    console.error('[Chart] qc fetch: ' + e.message);
    return null;
  }
}

async function sendChartPhoto(token, chatId, klines, levels, symbol, tf, caption, keyboard) {
  if (!klines || klines.length < 20) return null;

  var cfg = null;
  try { cfg = buildChartConfig(klines, levels, symbol, tf, 'candlestick'); }
  catch (e) { console.error('[Chart] candle build: ' + e.message); }

  var qcRes = cfg ? await _quickChartPost(cfg) : null;
  if (qcRes && !qcRes.ok) {
    try { var b1 = await qcRes.text(); console.error('[Chart] candle 400 body: ' + b1.slice(0, 400)); } catch (e) {}
  }

  if (!qcRes || !qcRes.ok) {
    console.warn('[Chart] candlestick failed → trying line chart');
    var cfg2 = null;
    try { cfg2 = buildChartConfig(klines, levels, symbol, tf, 'line'); }
    catch (e) { console.error('[Chart] line build: ' + e.message); return null; }
    qcRes = cfg2 ? await _quickChartPost(cfg2) : null;
    if (qcRes && !qcRes.ok) {
      try { var b2 = await qcRes.text(); console.error('[Chart] line 400 body: ' + b2.slice(0, 400)); } catch (e) {}
    }
    if (!qcRes || !qcRes.ok) {
      console.error('[Chart] ❌ both candle & line failed');
      return null;
    }
  }

  var blob;
  try { blob = await qcRes.blob(); }
  catch (e) { console.error('[Chart] blob: ' + e.message); return null; }

  var formData = new FormData();
  formData.append('chat_id', String(chatId));
  formData.append('photo', blob, 'chart.png');
  if (caption) {
    formData.append('caption', String(caption).slice(0, 1020));
    formData.append('parse_mode', 'HTML');
  }
  if (keyboard) formData.append('reply_markup', JSON.stringify(keyboard));

  try {
    var tgRes = await fetch('https://api.telegram.org/bot' + token + '/sendPhoto', { method: 'POST', body: formData });
    var tgData = await tgRes.json();
    if (!tgData.ok) {
      console.error('[Chart] tg: ' + JSON.stringify(tgData).slice(0, 200));
      return null;
    }
    console.log('[Chart] ✅ sent ' + symbol + ' ' + tf);
    return tgData;
  } catch (e) { console.error('[Chart] tg fetch: ' + e.message); return null; }
}

// ============================================
// MODEL DISCOVERY + CACHE
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
async function getBadModels(env, chatId, p) {
  try { return (await env.KV.get('bad:' + chatId + ':' + p, 'json')) || {}; } catch (e) { return {}; }
}
async function markBadModel(env, chatId, p, m) {
  try {
    var b = await getBadModels(env, chatId, p);
    b[m] = Date.now();
    await env.KV.put('bad:' + chatId + ':' + p, JSON.stringify(b), { expirationTtl: 10800 });
  } catch (e) {}
}
async function resetModelCacheFor(env, chatId, provider) {
  try {
    await env.KV.delete('models:' + chatId + ':' + provider);
    await env.KV.delete('bad:' + chatId + ':' + provider);
    ['fast','deepseek','premium'].forEach(function(t){
      env.KV.delete('workmodel:' + chatId + ':' + provider + ':' + t).catch(function(){});
    });
  } catch (e) {}
}
async function discoverProviderModels(env, chatId, provider, key) {
  if (!key) return null;
  var base = OAI_BASES[provider];
  if (!base) return null;
  try {
    var r = await fetchWithTimeout(base + '/models', { headers: { 'Authorization': 'Bearer ' + key } }, 12000, 'Discovery');
    if (!r.ok) return null;
    var d = await r.json();
    var ids = (d.data || []).map(function(m) { return m.id; }).filter(Boolean);
    if (ids.length) {
      await setDiscoveredModels(env, chatId, provider, ids);
      console.log('[Discovery] ' + provider + '/' + chatId + ' → ' + ids.length);
      return ids;
    }
    return null;
  } catch (e) { console.warn('[Discovery] ' + provider + ': ' + e.message); return null; }
}

function normModelId(m) { return String(m).toLowerCase().replace(/^[^\/]*\//, '').replace(/[._]/g, '-'); }
function exactFromList(list, name) {
  if (!list) return null;
  var n = normModelId(name), i;
  for (i = 0; i < list.length; i++) if (list[i] === name) return list[i];
  for (i = 0; i < list.length; i++) if (normModelId(list[i]) === n) return list[i];
  return null;
}

async function getTierCandidates(env, chatId, provider, tier, hasImage) {
  var discovered = await getDiscoveredModels(env, chatId, provider);
  var bad = await getBadModels(env, chatId, provider);
  var out = [], seen = {};
  function add(m) {
    if (!m || seen[m]) return;
    if (bad[m] && Date.now() - bad[m] < 3 * 3600 * 1000) return;
    seen[m] = 1; out.push(m);
  }

  if (hasImage) {
    var tv = MODEL_TIERS[provider] && MODEL_TIERS[provider][tier] && MODEL_TIERS[provider][tier].vision;
    var vis = (VISION_MODELS_BY_PROVIDER[provider] || ['gpt-4o']).slice();
    if (tv) { vis = vis.filter(function(x) { return x !== tv; }); vis.unshift(tv); }
    vis.forEach(function(m) { var ex = discovered ? exactFromList(discovered, m) : m; add(ex || (discovered ? null : m)); });
    return out.length ? out.slice(0, 3) : vis.slice(0, 3);
  }

  var saved = await getWorkingModel(env, chatId, provider, tier);
  if (saved) add(saved);

  var chain = (MODEL_FALLBACK_CHAINS[provider] && MODEL_FALLBACK_CHAINS[provider][tier]) || ['gpt-4o-mini'];
  var blacklist = /deepseek-r1|deepseek-v4-pro|deepseek-v4\.1-flash-1017|deepseek-v4-pro-0813/i;

  chain.forEach(function(m) {
    if (discovered && discovered.length) {
      var ex = exactFromList(discovered, m);
      if (ex) add(ex);
    } else { add(m); }
  });

  if (discovered && discovered.length) {
    var patterns = {
      fast: /gpt-4o-mini|gpt-3\.5|gemini.*flash|haiku|llama.*8b|mistral-small/i,
      deepseek: /deepseek-v4\.1-flash|deepseek-v4-flash|deepseek-v3\.2|deepseek-reasoner/i,
      premium: /claude-sonnet|claude-opus/i
    };
    var pat = patterns[tier] || patterns.fast;
    discovered.forEach(function(m) {
      if (pat.test(m) && !blacklist.test(m) && !(tier === 'premium' && /haiku/i.test(m))) add(m);
    });
  }

  if (!out.length) chain.forEach(add);
  console.log('[Pick] ' + provider + '/' + tier + ' → ' + out.length + ': ' + out.slice(0, 5).join(', '));
  return out.length ? out.slice(0, 4) : ['gpt-4o-mini'];
}

// ============================================
// REGIME + ADVERSARIAL
// ============================================
function calcEMA(arr, period) {
  if (!arr.length || period < 1) return [];
  var k = 2 / (period + 1), ema = [arr[0]];
  for (var i = 1; i < arr.length; i++) ema.push(arr[i]*k + ema[i-1]*(1-k));
  return ema;
}
function computeLocalRegime(kl, tf) {
  tf = tf || '5min';
  if (!kl || kl.length < 30) return { regime: 'UNKNOWN', emaSlope: 0, atrPct: 50, adx: 0, lastAtr: 0 };
  var closes = kl.map(function(k) { return k.close; });
  var ema20 = calcEMA(closes, 20);
  var slope20 = ema20.length > 2 ? ((ema20[ema20.length-1] - ema20[ema20.length-3]) / ema20[ema20.length-3]) * 100 : 0;
  var atrs = [];
  for (var i = 20; i <= kl.length; i += 3) { var a = calcATR(kl.slice(0, i), 14); if (a) atrs.push(a); }
  var lastAtr = calcATR(kl, 14) || 0;
  var atrPct = 50;
  if (atrs.length >= 5) atrPct = Math.round(atrs.filter(function(x) { return x < lastAtr; }).length / atrs.length * 100);
  var period = 14, n = kl.length;
  var trs = [], pDMs = [], nDMs = [];
  for (var j = 1; j < n; j++) {
    var up = kl[j].high - kl[j-1].high, dn = kl[j-1].low - kl[j].low;
    trs.push(Math.max(kl[j].high - kl[j].low, Math.abs(kl[j].high - kl[j-1].close), Math.abs(kl[j].low - kl[j-1].close)));
    pDMs.push((up > dn && up > 0) ? up : 0);
    nDMs.push((dn > up && dn > 0) ? dn : 0);
  }
  var adx = 0;
  if (trs.length >= period + 1) {
    var sTR = 0, sPDM = 0, sNDM = 0;
    for (var k = 0; k < period; k++) { sTR += trs[k]; sPDM += pDMs[k]; sNDM += nDMs[k]; }
    var dxs = [];
    for (var k2 = period; k2 < trs.length; k2++) {
      sTR = sTR - sTR/period + trs[k2];
      sPDM = sPDM - sPDM/period + pDMs[k2];
      sNDM = sNDM - sNDM/period + nDMs[k2];
      var pdi = sTR ? (sPDM/sTR)*100 : 0, ndi = sTR ? (sNDM/sTR)*100 : 0;
      dxs.push((pdi+ndi) ? Math.abs(pdi-ndi)/(pdi+ndi)*100 : 0);
    }
    if (dxs.length >= period) {
      var s = 0; for (var k3 = 0; k3 < period; k3++) s += dxs[k3];
      adx = s / period;
      for (var k4 = period; k4 < dxs.length; k4++) adx = (adx*(period-1) + dxs[k4]) / period;
    }
  }
  var adxR = Math.round(adx);
  var tfm = TF_MINUTES[tf] || 5;
  var slopeThresh = 0.03 * Math.sqrt(Math.max(1, tfm) / 5);
  var regime = 'RANGING';
  if (atrPct > 85) regime = 'HIGH_VOL';
  else if (atrPct < 20 && adxR < 15) regime = 'COMPRESSION';
  else if (Math.abs(slope20) > slopeThresh && adxR > 20) regime = slope20 > 0 ? 'TRENDING_UP' : 'TRENDING_DOWN';
  return { regime: regime, emaSlope: Math.round(slope20*100)/100, atrPct: atrPct, adx: adxR, lastAtr: lastAtr };
}

function getPriceScaleHint(symbol, price) {
  var s = String(symbol || '').toUpperCase();
  if (s.indexOf('XAU') !== -1) return 2;
  if (s.indexOf('BTC') !== -1) return 2;
  if (s.indexOf('ETH') !== -1) return 2;
  if (s.indexOf('SOL') !== -1) return 2;
  if (s.indexOf('JPY') !== -1) return 3;
  if (/EUR|GBP|AUD|NZD|CAD|CHF/.test(s) && s.indexOf('JPY') === -1) return 5;
  if (price > 1000) return 2;
  if (price > 100) return 2;
  if (price > 1) return 4;
  return 5;
}

function buildDynamicContext(klines, symbol, tf, opts) {
  opts = opts || {};
  if (!klines || klines.length < 5) return '';
  var first = klines[0], last = klines[klines.length - 1];
  var highs = [], lows = [];
  for (var i = 0; i < klines.length; i++) { highs.push(klines[i].high); lows.push(klines[i].low); }
  var minLow = Math.min.apply(null, lows);
  var maxHigh = Math.max.apply(null, highs);
  var cp = last.close;
  var atr = calcATR(klines, 14) || (maxHigh - minLow) / 10;
  var scale = getPriceScaleHint(symbol, cp);
  var rg = opts.regime || computeLocalRegime(klines, tf);
  var recent = klines.slice(-20);
  var recHighs = [], recLows = [];
  for (var j = 0; j < recent.length; j++) { recHighs.push(recent[j].high); recLows.push(recent[j].low); }
  var recHigh = Math.max.apply(null, recHighs);
  var recLow = Math.min.apply(null, recLows);
  var sr = findLocalSR(klines);
  var txt = '\n\n═══════════════════════════════════════════\n';
  txt += 'LOCAL FACTS (computed by software — GROUND TRUTH, do not recompute)\n';
  txt += '═══════════════════════════════════════════\n';
  txt += 'Symbol: ' + symbol + ' · Timeframe: ' + tf + '\n';
  txt += 'Candle count: ' + klines.length + '\n';
  txt += 'Last close: ' + cp.toFixed(scale) + '\n';
  txt += 'ATR(14): ' + atr.toFixed(scale) + ' (' + (atr / cp * 100).toFixed(2) + '%)\n';
  if (rg) txt += 'Regime (local): ' + rg.regime + ' · ADX=' + rg.adx + ' · ATR%=' + rg.atrPct + '\n';
  txt += 'Swing (last 20): High=' + recHigh.toFixed(scale) + ' · Low=' + recLow.toFixed(scale) + '\n';
  if (sr.support && sr.support.length) txt += 'Local support: ' + sr.support.map(function(p){ return p.toFixed(scale); }).join(' · ') + '\n';
  if (sr.resistance && sr.resistance.length) txt += 'Local resistance: ' + sr.resistance.map(function(p){ return p.toFixed(scale); }).join(' · ') + '\n';
  txt += '\n⚠️ EVERY price in output must be inside [' + minLow.toFixed(scale) + ' , ' + maxHigh.toFixed(scale) + '].\n';
  txt += '⚠️ Correct decimal precision: ' + scale + ' decimals.\n';
  txt += '⚠️ DO NOT recompute these.\n';
  return txt;
}

function crossCheckAILewels(levels, klines, atr, currentPrice) {
  var warnings = [];
  if (!levels || typeof levels !== 'object') return warnings;
  var hasRealAtr = atr != null && atr > 0.001;
  if (atr == null || atr <= 0) atr = 1e-9;
  if (levels.direction !== 'BUY' && levels.direction !== 'SELL' && levels.direction !== 'WAIT') { warnings.push('direction نامعتبر → WAIT'); levels.direction = 'WAIT'; }
  if (levels.direction === 'WAIT') { levels._crossWarnings = warnings; return warnings; }
  if (levels.entry == null || levels.sl == null) { warnings.push('Entry یا SL نیست → WAIT'); levels.direction = 'WAIT'; levels._crossWarnings = warnings; return warnings; }
  if (levels.direction === 'BUY') {
    if (levels.sl >= levels.entry) { warnings.push('BUY: SL≥Entry → WAIT'); levels.direction = 'WAIT'; }
    else if (levels.tp1 != null && levels.tp1 <= levels.entry) { warnings.push('BUY: TP1≤Entry → WAIT'); levels.direction = 'WAIT'; }
  } else if (levels.direction === 'SELL') {
    if (levels.sl <= levels.entry) { warnings.push('SELL: SL≤Entry → WAIT'); levels.direction = 'WAIT'; }
    else if (levels.tp1 != null && levels.tp1 >= levels.entry) { warnings.push('SELL: TP1≥Entry → WAIT'); levels.direction = 'WAIT'; }
  }
  if (levels.direction !== 'WAIT') {
    var tps = [];
    if (levels.tp1 != null) tps.push({v: levels.tp1, k: 'tp1'});
    if (levels.tp2 != null) tps.push({v: levels.tp2, k: 'tp2'});
    if (levels.tp3 != null) tps.push({v: levels.tp3, k: 'tp3'});
    for (var i = 1; i < tps.length; i++) {
      var wrong = (levels.direction === 'BUY' && tps[i].v <= tps[i - 1].v) ||
                  (levels.direction === 'SELL' && tps[i].v >= tps[i - 1].v);
      if (wrong) { warnings.push('ترتیب TP نادرست: ' + tps[i].k + ' → nulled'); levels[tps[i].k] = null; }
    }
  }
  if (levels.direction !== 'WAIT' && klines && klines.length) {
    var minL = Infinity, maxH = -Infinity;
    for (var ki = 0; ki < klines.length; ki++) {
      if (klines[ki].low < minL) minL = klines[ki].low;
      if (klines[ki].high > maxH) maxH = klines[ki].high;
    }
    var tolerance = atr * 5;
    var toCheck = ['entry', 'sl', 'tp1', 'tp2', 'tp3'];
    for (var li = 0; li < toCheck.length; li++) {
      var lk = toCheck[li];
      if (levels[lk] == null) continue;
      if (levels[lk] < minL - tolerance || levels[lk] > maxH + tolerance) {
        warnings.push(lk + ' خارج از بازه داده → WAIT');
        levels.direction = 'WAIT';
        break;
      }
    }
  }
  if (currentPrice != null && hasRealAtr && levels.direction !== 'WAIT' && levels.entry != null) {
    var dist = Math.abs(levels.entry - currentPrice);
    if (dist > 3 * atr) { warnings.push('Entry > ۳×ATR از قیمت فعلی → WAIT'); levels.direction = 'WAIT'; }
  }
  if (hasRealAtr && levels.direction !== 'WAIT' && levels.entry != null && levels.sl != null) {
    var slDist = Math.abs(levels.entry - levels.sl);
    if (slDist < 0.3 * atr) warnings.push('SL خیلی نزدیک (<۰.۳×ATR)');
    else if (slDist > 3 * atr) warnings.push('SL خیلی دور (>۳×ATR)');
  }
  if (levels.direction !== 'WAIT' && levels.entry != null && levels.sl != null && levels.tp1 != null) {
    var risk = Math.abs(levels.entry - levels.sl);
    var reward = Math.abs(levels.tp1 - levels.entry);
    if (risk > 0) {
      var realRR = '1:' + (reward / risk).toFixed(2);
      if (levels.rr !== realRR) { warnings.push('R/R اصلاح: ' + (levels.rr || '?') + ' → ' + realRR); levels.rr = realRR; }
    }
  }
  if (levels.confidence != null && levels.confidence > 85) {
    if (levels.tp2 == null || levels.tp3 == null) { warnings.push('Confidence>۸۵ اما TP2/TP3 ناقص → ۸۰'); levels.confidence = 80; }
  }
  if (levels.entry === levels.sl) { warnings.push('Entry=SL → WAIT'); levels.direction = 'WAIT'; }
  if (levels.sl === levels.tp1 && levels.tp1 != null) { warnings.push('SL=TP1 → WAIT'); levels.direction = 'WAIT'; }
  if (levels.direction === 'WAIT' && levels.confidence != null && levels.confidence > 54) { warnings.push('WAIT confidence سقف ۵۴'); levels.confidence = 54; }
  levels._crossWarnings = warnings;
  return warnings;
}

function adversarialCheck(levels, klines, regime, atr) {
  var issues = [], warnings = [];
  if (levels.direction !== 'BUY' && levels.direction !== 'SELL') return { passed: true, issues: [], warnings: [] };
  var last = klines[klines.length - 1];
  if (levels.entry != null && levels.sl != null && atr > 0) {
    var risk = Math.abs(levels.entry - levels.sl);
    if (risk < 0.35*atr) issues.push('SL < 0.35×ATR');
    if (risk > 3.5*atr) issues.push('SL > 3.5×ATR');
  }
  if (levels.entry != null && levels.sl != null && levels.tp1 != null) {
    var rr = Math.abs(levels.tp1 - levels.entry) / Math.abs(levels.entry - levels.sl);
    if (rr < 1.2) issues.push('R/R < 1.2');
  }
  if (regime.regime === 'TRENDING_UP' && levels.direction === 'SELL') warnings.push('SELL خلاف روند');
  if (regime.regime === 'TRENDING_DOWN' && levels.direction === 'BUY') warnings.push('BUY خلاف روند');
  if (levels.entry != null && last && atr > 0 && Math.abs(levels.entry - last.close) > 4.5*atr) issues.push('Entry > 4.5×ATR');
  var recent = klines.slice(-5);
  if (recent.length >= 5) {
    var net = recent[recent.length-1].close - recent[0].close;
    var range = Math.max.apply(null, recent.map(function(k){return k.high;})) - Math.min.apply(null, recent.map(function(k){return k.low;}));
    if (range > 0) {
      var m = net/range;
      if (levels.direction === 'BUY' && m < -0.65) warnings.push('مومنتوم نزولی');
      if (levels.direction === 'SELL' && m > 0.65) warnings.push('مومنتوم صعودی');
    }
  }
  if (regime.atrPct > 92) issues.push('نوسان >92p');
  return { passed: issues.length === 0, issues: issues, warnings: warnings };
}
function strictSchemaValidate(levels) {
  var issues = [];
  if (!levels || typeof levels !== 'object') return { passed: false, issues: ['levels null'] };
  var dir = levels.direction;
  if (!dir) issues.push('direction missing');
  else if (['BUY','SELL','WAIT'].indexOf(dir) === -1) issues.push('direction invalid');
  if (levels.confidence != null && (!isFinite(levels.confidence) || levels.confidence < 0 || levels.confidence > 100)) issues.push('confidence invalid');
  ['entry','sl','tp1','tp2','tp3'].forEach(function(k) {
    var v = levels[k]; if (v == null) return;
    if (typeof v !== 'number' || !isFinite(v)) { issues.push(k+' invalid'); return; }
    if (v <= 0) issues.push(k+' not positive');
  });
  if (levels.direction === 'BUY' && levels.entry != null && levels.sl != null && levels.sl >= levels.entry) issues.push('BUY sl>=entry');
  if (levels.direction === 'SELL' && levels.entry != null && levels.sl != null && levels.sl <= levels.entry) issues.push('SELL sl<=entry');
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
  customvision: '⭐ Custom Vision', gemini: 'Google Gemini', aiprime: 'AIPrime',
  github: 'GitHub Models', groq: 'Groq', together: 'Together AI', gapgpt: 'GapGPT',
  openrouter: 'OpenRouter', mistral: 'Mistral AI', huggingface: 'HuggingFace',
  cloudflare: 'Cloudflare AI', nvidia: 'NVIDIA NIM', llm7: 'LLM7.io',
  avalai: 'AvalAI', metis: 'Metis', onexai: '1xAi'
};
function getKey(env, p) {
  var m = {
    gemini: env.GEMINI_KEY_1 || env.GEMINI_KEY, aiprime: env.AIPRIME_KEY, github: env.GITHUB_MODELS_TOKEN,
    groq: env.GROQ_KEY, together: env.TOGETHER_KEY, gapgpt: env.GAPGPT_KEY, openrouter: env.OPENROUTER_KEY,
    mistral: env.MISTRAL_KEY, huggingface: env.HUGGINGFACE_KEY, cloudflare: env.CLOUDFLARE_KEY,
    nvidia: env.NVIDIA_KEY, llm7: env.LLM7_KEY || 'unused', avalai: env.AVALAI_KEY,
    metis: env.METIS_KEY, onexai: env.ONEXAI_KEY, customvision: env.CUSTOM_VISION_KEY
  };
  var v = String(m[p] || '').trim();
  v = v.replace(/^["'`]|["'`]$/g, '').replace(/^Bearer\s+/i, '').trim();
  return v;
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
async function getUserMode(env, c) { try { var m = await env.KV.get('mode:' + c); return MODE_CONFIG[m] ? m : 'swing'; } catch (e) { return 'swing'; } }
async function setUserMode(env, c, m) { if (!MODE_CONFIG[m]) m = 'swing'; await env.KV.put('mode:' + c, m); }
async function getUserModelTier(env, c, p) { try { return (await env.KV.get('tier:' + c + ':' + p)) || 'fast'; } catch (e) { return 'fast'; } }
async function setUserModelTier(env, c, p, t) { await env.KV.put('tier:' + c + ':' + p, t); }
async function getStrictness(env, c) { try { return (await env.KV.get('strictness:' + c)) || 'hard'; } catch (e) { return 'hard'; } }
async function setStrictness(env, c, s) { if (!STRICTNESS_MODES[s]) s = 'hard'; await env.KV.put('strictness:' + c, s); }
async function getKzMode(env, c) { try { return (await env.KV.get('kzmode:' + c)) || 'priority'; } catch (e) { return 'priority'; } }
async function setKzMode(env, c, m) { if (!KZ_MODES[m]) m = 'priority'; await env.KV.put('kzmode:' + c, m); }
async function getMonitors(env, c) {
  try {
    var l = await env.KV.get('monitors:' + c, 'json') || [];
    var ch = false;
    for (var i = 0; i < l.length; i++) { if (!l[i].id) { l[i].id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5); ch = true; } }
    if (ch) await env.KV.put('monitors:' + c, JSON.stringify(l));
    return l;
  } catch (e) { return []; }
}
async function saveMonitors(env, c, l) { await env.KV.put('monitors:' + c, JSON.stringify(l)); }
async function getLocalFilter(env, c) { try { var v = await env.KV.get('localfilter:' + c); return v === null ? 'on' : v; } catch (e) { return 'on'; } }
async function setLocalFilter(env, c, v) { await env.KV.put('localfilter:' + c, v); }
async function getFallbackMode(env, c) { try { var v = await env.KV.get('fallbackmode:' + c); return FALLBACK_MODES[v] ? v : 'strict'; } catch (e) { return 'strict'; } }
async function setFallbackMode(env, c, m) { if (!FALLBACK_MODES[m]) m = 'strict'; await env.KV.put('fallbackmode:' + c, m); }

// ============================================
// CALIBRATION
// ============================================
async function calibrationLoad(env, chatId) { try { return await env.KV.get('calib:' + chatId, 'json') || {}; } catch (e) { return {}; } }
async function calibrationSave(env, chatId, data) { try { await env.KV.put('calib:' + chatId, JSON.stringify(data)); } catch (e) {} }
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
  var brier = records.reduce(function(s, r) { return s + Math.pow(r.c/100 - r.o, 2); }, 0) / n;
  var buckets = {};
  records.forEach(function(r) {
    var bin = Math.floor(r.c/10)*10;
    if (!buckets[bin]) buckets[bin] = { n: 0, wins: 0 };
    buckets[bin].n++; buckets[bin].wins += r.o;
  });
  return { n: n, brier: brier, buckets: buckets };
}
async function isCalibApplyOn(env, chatId) { try { var v = await env.KV.get('calibtoggle:' + chatId); return v !== '0'; } catch (e) { return true; } }
async function setCalibApply(env, chatId, on) { await env.KV.put('calibtoggle:' + chatId, on ? '1' : '0'); }
async function calibrateConfidence(env, chatId, provider, tier, regime, rawConf) {
  if (!(await isCalibApplyOn(env, chatId))) return { conf: rawConf, adjusted: false, n: 0 };
  if (rawConf == null) return { conf: rawConf, adjusted: false, n: 0 };
  var stats = await calibrationStats(env, chatId, provider, tier, regime);
  if (!stats || stats.n < CALIB_MIN_SAMPLES) return { conf: rawConf, adjusted: false, n: stats ? stats.n : 0 };
  var bin = Math.floor(rawConf/10)*10, b = stats.buckets[bin];
  if (!b || b.n < CALIB_BUCKET_MIN) return { conf: rawConf, adjusted: false, n: b ? b.n : 0 };
  return { conf: Math.round(b.wins/b.n*100), adjusted: true, n: b.n, raw: rawConf };
}

// ============================================
// OPPORTUNITY LEDGER
// ============================================
async function opLedgerLoad(env, chatId) { try { return await env.KV.get('oppledger:' + chatId, 'json') || []; } catch (e) { return []; } }
async function opLedgerSave(env, chatId, arr) { try { await env.KV.put('oppledger:' + chatId, JSON.stringify(arr.slice(-300))); } catch (e) {} }
async function logRejectedSignal(env, chatId, levels, reason, currentPrice, opts) {
  try {
    if (!levels || (levels.direction !== 'BUY' && levels.direction !== 'SELL')) return;
    if (levels.entry == null || levels.sl == null || levels.tp1 == null) return;
    opts = opts || {};
    var a = await opLedgerLoad(env, chatId);
    var id = a.length ? (a[a.length-1].id || 0) + 1 : 1;
    a.push({ id: id, t: Date.now(), sym: opts.symbol || '?', tf: opts.tf || '?', dir: levels.direction, entry: levels.entry, sl: levels.sl, tp1: levels.tp1, tp2: levels.tp2, tp3: levels.tp3, confidence: levels.confidence, provider: opts.provider || '?', reason: reason, status: 'OPEN', filled: false, currentPrice: currentPrice, isCrypto: isCryptoSymbol(opts.symbol || ''), day: new Date(Date.now()+3.5*3600*1000).toISOString().slice(0,10) });
    await opLedgerSave(env, chatId, a);
  } catch (e) {}
}
async function resolveRejectedSignals(env, chatId, klines, symbol, tf) {
  try {
    var a = await opLedgerLoad(env, chatId);
    var ch = false, tfm = (TF_MINUTES[tf] || 5) * 60000;
    for (var i = 0; i < a.length; i++) {
      var s = a[i];
      if (s.status !== 'OPEN' && s.status !== 'WIN') continue;
      if (s.sym !== symbol || s.tf !== tf) continue;
      if (s.tp1 == null) continue;
      for (var j = 0; j < klines.length; j++) {
        var k = klines[j];
        var kt = Date.parse(String(k.datetime).includes('T') ? k.datetime : String(k.datetime).replace(' ','T')+'Z');
        if (!Number.isFinite(kt) || kt < s.t - tfm) continue;
        if (s.status === 'WIN') continue;
        if (!s.filled) { if (!(k.low <= s.entry && k.high >= s.entry)) continue; s.filled = true; ch = true; }
        var slHit = s.dir === 'BUY' ? k.low <= s.sl : k.high >= s.sl;
        var tp1Hit = s.dir === 'BUY' ? k.high >= s.tp1 : k.low <= s.tp1;
        if (slHit) { s.status = 'LOSS'; s.rr = -1; ch = true; break; }
        if (tp1Hit) { s.status = 'WIN'; s.whichTP = 1; s.rr = Math.abs(s.tp1 - s.entry) / Math.abs(s.entry - s.sl); ch = true; }
      }
    }
    if (ch) await opLedgerSave(env, chatId, a);
    return ch;
  } catch (e) { return false; }
}

// ============================================
// PORTFOLIO
// ============================================
async function getPortfolioConfig(env, chatId) {
  try { var c = await env.KV.get('prcfg:' + chatId, 'json'); if (c) return Object.assign({}, PORTFOLIO_DEFAULTS, c); } catch (e) {}
  return Object.assign({}, PORTFOLIO_DEFAULTS);
}
async function setPortfolioConfig(env, chatId, cfg) { await env.KV.put('prcfg:' + chatId, JSON.stringify(cfg)); }
async function getPortfolioState(env, chatId) {
  var a = await getJournal(env, chatId) || [];
  var open = a.filter(function(s) { return s.status === 'OPEN'; });
  var today = new Date(Date.now()+3.5*3600*1000).toISOString().slice(0,10);
  var todayRSum = 0;
  a.filter(function(s) { return s.day === today; }).forEach(function(s) {
    if (s.status === 'WIN') todayRSum += (s.rr || 0);
    else if (s.status === 'LOSS') todayRSum -= 1;
    else if (s.status === 'EXPIRED') todayRSum += (s.rr || 0);
  });
  var openBySymbol = {}, openByMarket = {}, openCrypto = 0;
  open.forEach(function(s) {
    var sym = s.sym || '?';
    var market = s.market || (isCryptoSymbol(sym) ? 'crypto' : 'forex');
    openBySymbol[sym] = (openBySymbol[sym] || 0) + 1;
    openByMarket[market] = (openByMarket[market] || 0) + 1;
    if (isCryptoSymbol(sym)) openCrypto++;
  });
  var hasBTC = open.some(function(s) { var ss = (s.sym || '').toUpperCase().replace(/[\/\-_]/g,''); return ss.indexOf('BTC') === 0; });
  return { open: open, openBySymbol: openBySymbol, openByMarket: openByMarket, openCrypto: openCrypto, hasBTC: hasBTC, todayRSum: todayRSum, totalOpen: open.length };
}
async function portfolioCheck(env, chatId, newSignal) {
  var cfg = await getPortfolioConfig(env, chatId);
  var state = await getPortfolioState(env, chatId);
  var issues = [];
  if (state.todayRSum <= cfg.maxDailyLossRR) issues.push('سقف ضرر روزانه');
  var sym = newSignal.sym || '?';
  var market = newSignal.market || (isCryptoSymbol(sym) ? 'crypto' : 'forex');
  if ((state.openBySymbol[sym] || 0) >= cfg.maxPerSymbol) issues.push('هم‌نماد');
  if ((state.openByMarket[market] || 0) >= cfg.maxPerMarket) issues.push('این بازار');
  if (state.totalOpen >= cfg.maxTotal) issues.push('کل '+state.totalOpen+'/'+cfg.maxTotal);
  if (isCryptoSymbol(sym) && state.hasBTC && sym.toUpperCase().replace(/[\/\-_]/g,'').indexOf('BTC') !== 0 && state.openCrypto >= cfg.maxCorrelatedAlts) issues.push('آلت‌کوین همبسته');
  return { ok: issues.length === 0, issues: issues, state: state };
}

// ============================================
// PARSING
// ============================================
function extractBalanced(t, st) {
  var depth = 0, inStr = false, esc = false;
  for (var i = st; i < t.length; i++) {
    var ch = t.charAt(i);
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return t.slice(st, i + 1); }
  }
  return null;
}
function stripJsonComments(x) {
  var out = '', inStr = false, esc = false;
  for (var i = 0; i < x.length; i++) {
    var ch = x.charAt(i), nx = x.charAt(i + 1);
    if (inStr) { out += ch; if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') { inStr = true; out += ch; continue; }
    if (ch === '/' && nx === '/') { while (i < x.length && x.charAt(i) !== '\n') i++; out += '\n'; continue; }
    if (ch === '/' && nx === '*') { i += 2; while (i < x.length && !(x.charAt(i) === '*' && x.charAt(i + 1) === '/')) i++; i++; continue; }
    out += ch;
  }
  return out;
}
function tryParseJson(x) {
  if (!x) return null;
  x = String(x).trim();
  try { return JSON.parse(x); } catch (e) {}
  var y = stripJsonComments(x).replace(/,\s*([}\]])/g, '$1');
  try { return JSON.parse(y); } catch (e) {}
  return null;
}
function parseJsonBlock(text) {
  if (!text) return null;
  var fence = /```[a-zA-Z]*\s*([\s\S]*?)```/g, m, found = null;
  while ((m = fence.exec(text)) !== null) {
    var o = tryParseJson(m[1]);
    if (o && typeof o === 'object' && !Array.isArray(o) && ('direction' in o)) found = o;
  }
  if (found) return found;
  var idx = text.length;
  while (true) {
    idx = text.lastIndexOf('"direction"', idx - 1);
    if (idx < 0) break;
    var st = text.lastIndexOf('{', idx), guard = 0;
    while (st > -1 && guard++ < 6) {
      var seg = extractBalanced(text, st);
      if (seg) { var o2 = tryParseJson(seg); if (o2 && typeof o2 === 'object' && ('direction' in o2)) return o2; }
      st = text.lastIndexOf('{', st - 1);
    }
    if (idx <= 0) break;
  }
  return null;
}

function parseOrderBlocksAndFVG(text) {
  var orderBlocks = [];
  var fvg = [];
  if (!text) return { orderBlocks: orderBlocks, fvg: fvg };
  var allBlocks = [];
  var blockRegex = /type\s*:\s*['"]?(bullish|bearish)['"]?\s*,\s*top\s*:\s*['"]?([\d.]+)['"]?\s*,\s*bottom\s*:\s*['"]?([\d.]+)['"]?/gi;
  var m;
  while ((m = blockRegex.exec(text)) !== null) {
    var t = parseFloat(m[2]), b = parseFloat(m[3]);
    if (!isFinite(t) || !isFinite(b) || t === b) continue;
    allBlocks.push({ index: m.index, type: m[1].toLowerCase(), top: Math.max(t, b), bottom: Math.min(t, b) });
  }
  for (var i = 0; i < allBlocks.length; i++) {
    var block = allBlocks[i];
    var before = text.slice(Math.max(0, block.index - 500), block.index).toLowerCase();
    var obMarkers = ['orderblocks', 'order blocks', 'orderblock', 'order block', 'order_blocks', 'بلوک‌های سفارش', 'بلوک های سفارش', 'بلوک سفارش', 'ob:', 'ob :', ' ob', 'ob '];
    var fvgMarkers = ['fvg', 'fair value gap', 'fairvaluegap', 'fair value gaps', 'fairvaluegaps'];
    var lastOB = -1, lastFVG = -1;
    for (var oi = 0; oi < obMarkers.length; oi++) { var p = before.lastIndexOf(obMarkers[oi]); if (p > lastOB) lastOB = p; }
    for (var fi = 0; fi < fvgMarkers.length; fi++) { var pf = before.lastIndexOf(fvgMarkers[fi]); if (pf > lastFVG) lastFVG = pf; }
    var entry = { type: block.type, top: block.top, bottom: block.bottom };
    if (lastFVG > lastOB) fvg.push(entry);
    else orderBlocks.push(entry);
  }
  return { orderBlocks: orderBlocks.slice(0, 3), fvg: fvg.slice(0, 3) };
}

function cleanZones(a) {
  if (!Array.isArray(a)) return [];
  var out = [];
  for (var i = 0; i < a.length && out.length < 3; i++) {
    var z = a[i]; if (!z || typeof z !== 'object') continue;
    var tp = num(z.top), bt = num(z.bottom), ty = String(z.type || '').toLowerCase();
    if (tp == null || bt == null || !isFinite(tp) || !isFinite(bt) || tp <= 0 || bt <= 0 || tp === bt) continue;
    if (ty !== 'bullish' && ty !== 'bearish') continue;
    out.push({ type: ty, top: Math.max(tp, bt), bottom: Math.min(tp, bt) });
  }
  return out;
}
function cleanPrices(a) {
  if (!Array.isArray(a)) return [];
  var out = [];
  for (var i = 0; i < a.length && out.length < 3; i++) {
    var v = num(a[i]);
    if (v != null && isFinite(v) && v > 0 && out.indexOf(v) === -1) out.push(v);
  }
  return out;
}
function finalizeLevels(o) {
  if (o.direction === 'WAIT') { o.entry = null; o.sl = null; o.tp1 = null; o.tp2 = null; o.tp3 = null; o.rr = null; return o; }
  if (o.tp1 == null) o.rr = null;
  var up = o.direction === 'BUY';
  if (o.tp1 != null && o.tp2 != null && (up ? o.tp2 <= o.tp1 : o.tp2 >= o.tp1)) o.tp2 = null;
  var prev = o.tp2 != null ? o.tp2 : o.tp1;
  if (o.tp3 != null && prev != null && (up ? o.tp3 <= prev : o.tp3 >= prev)) o.tp3 = null;
  return o;
}
function normRegime(r) {
  var v = String(r || '').toUpperCase();
  return /^(TRENDING_UP|TRENDING_DOWN|RANGING|TRANSITIONAL)$/.test(v) ? v : null;
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
  var td = text.match(/\*{0,2}Direction\*{0,2}\s*[:：=]\s*\*{0,2}\s*(BUY|SELL|WAIT|LONG|SHORT)\b/i);
  return td ? normDir(td[1]) : 'WAIT';
}
function extractLevels(rawText) {
  var j = parseJsonBlock(rawText);
  var parsedText = parseOrderBlocksAndFVG(rawText);
  if (j) {
    var jOB = cleanZones(j.orderBlocks);
    var jFVG = cleanZones(j.fvg);
    return finalizeLevels({
      direction: normDir(j.direction), regime: normRegime(j.regime),
      confidence: num(j.confidence != null ? j.confidence : j.confidenceScore),
      entry: num(j.entry), sl: num(j.stopLoss != null ? j.stopLoss : j.sl),
      tp1: num(j.tp1), tp2: num(j.tp2), tp3: num(j.tp3),
      rr: j.rr || null, confluenceScore: num(j.confluenceScore),
      detectedSymbol: j.symbol || null, detectedTimeframe: j.timeframe || null,
      aiScores: j.scores || null, validationIssues: [],
      lastPrice: num(j.lastPrice), atrEstimate: num(j.atrEstimate),
      quality: (j.quality && typeof j.quality === 'object') ? j.quality : null,
      support: cleanPrices(j.support), resistance: cleanPrices(j.resistance),
      orderBlocks: jOB.length ? jOB : cleanZones(parsedText.orderBlocks),
      fvg: jFVG.length ? jFVG : cleanZones(parsedText.fvg)
    });
  }
  return finalizeLevels({
    direction: detectDirection(rawText), regime: null, confidence: null,
    entry: null, sl: null, tp1: null, tp2: null, tp3: null, rr: null,
    confluenceScore: null, aiScores: null, validationIssues: [],
    lastPrice: null, atrEstimate: null, quality: null,
    support: [], resistance: [], orderBlocks: [], fvg: []
  });
}

// ═══ VALIDATE ═══
function validateSignalSingle(levels, opts) {
  opts = opts || {};
  var strict = opts.strict || 'hard';
  var minRR = opts.minRR || 1.5, minConfidence = opts.minConfidence || 65;
  var issues = [], originalDir = levels.direction;
  if (strict === 'easy') { minRR = Math.max(1.0, minRR*0.7); minConfidence = Math.max(50, minConfidence-5); }
  if (originalDir !== 'WAIT') {
    var conf = levels.confidence;
    if (conf == null) { issues.push('⚠️ امتیاز نیست'); levels.direction = 'WAIT'; }
    else if (conf > 100 || conf < 0) { issues.push('⚠️ امتیاز نامعتبر'); levels.confidence = null; levels.direction = 'WAIT'; }
    else if (conf < minConfidence) { issues.push('⚠️ اطمینان '+conf+'% < '+minConfidence+'%'); levels.direction = 'WAIT'; }
  }
  if (levels.direction === 'BUY' || levels.direction === 'SELL') {
    var entry = levels.entry, sl = levels.sl;
    if (entry == null) { issues.push('⚠️ Entry نیست'); levels.direction = 'WAIT'; }
    else if (sl == null) { issues.push('⚠️ SL نیست'); levels.direction = 'WAIT'; }
    else {
      if (levels.direction === 'BUY' && sl >= entry) { issues.push('❌ SL بالای Entry'); levels.direction = 'WAIT'; }
      if (levels.direction === 'SELL' && sl <= entry) { issues.push('❌ SL زیر Entry'); levels.direction = 'WAIT'; }
    }
    if (levels.direction !== 'WAIT' && entry && sl) {
      if (levels.tp1) {
        var wrongDir = (levels.direction === 'BUY' && levels.tp1 <= entry) || (levels.direction === 'SELL' && levels.tp1 >= entry);
        if (wrongDir) { issues.push('❌ TP1 سمت اشتباه'); levels.direction = 'WAIT'; }
        else {
          var risk = Math.abs(entry-sl), reward = Math.abs(levels.tp1-entry);
          var actualRR = risk > 0 ? reward/risk : 0;
          if (actualRR < minRR) { issues.push('❌ R/R 1:'+actualRR.toFixed(2)+' < 1:'+minRR); levels.direction = 'WAIT'; }
          else levels.rr = '1:' + actualRR.toFixed(2);
        }
      } else if (strict === 'hard') { issues.push('⚠️ TP1 نیست'); levels.direction = 'WAIT'; }
    }
    if (opts.atr && opts.price && levels.direction !== 'WAIT') {
      if (Math.abs(levels.entry - opts.price) > 3*opts.atr) { issues.push('❌ Entry > 3×ATR'); levels.direction = 'WAIT'; }
      else if (strict === 'hard' && Math.abs(levels.entry - levels.sl) < 0.5*opts.atr) { issues.push('❌ SL < 0.5×ATR'); levels.direction = 'WAIT'; }
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
    var hL = JSON.parse(JSON.stringify(levels)), eL = JSON.parse(JSON.stringify(levels));
    var hR = validateSignalSingle(hL, Object.assign({}, opts, { strict: 'hard' }));
    var eR = validateSignalSingle(eL, Object.assign({}, opts, { strict: 'easy' }));
    var result = eR;
    result.appliedStrictness = 'both';
    result.dualEval = {
      hard: { approved: hR.direction !== 'WAIT', direction: hR.direction, confidence: hR.confidence, rr: hR.rr || null, issues: hR.validationIssues || [] },
      easy: { approved: eR.direction !== 'WAIT', direction: eR.direction, confidence: eR.confidence, rr: eR.rr || null, issues: eR.validationIssues || [] }
    };
    if (!result.dualEval.hard.approved && !result.dualEval.easy.approved) result.direction = 'WAIT';
    return result;
  }
  return validateSignalSingle(levels, opts);
}
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
  var t = String(rawText || '').replace(/```[\s\S]*?```/g, '').replace(/(?:FVG|OB|BOS|CHOCH|Order\s*Block|Sweep)\s*(?:وجود\s*ندارد|نیست|no|not|absent)/gi, '');
  var hasBOS = /\bBOS\b/i.test(t), hasCHoCH = /CHOCH|CHoCH/i.test(t), hasRetest = /Retest|پولبک/i.test(t);
  var hasOB = /Order\s*Block|\bOB\b/i.test(t), hasPD = /Premium|Discount/i.test(t);
  var hasFVG = /FVG|Fair\s*Value\s*Gap/i.test(t), hasImb = /Imbalance/i.test(t);
  var hasEngulf = /Engulf|پوششی/i.test(t), hasPin = /Pin\s*Bar|Hammer|Doji/i.test(t);
  var hasSweep = /Liquidity\s*Sweep|Sweep/i.test(t), hasLiq = /نقدینگی/i.test(t);
  var s = {};
  s.structure = (hasBOS || hasCHoCH) ? Math.min(100, 55 + (hasBOS?12:0) + (hasCHoCH?10:0) + (hasRetest?8:0)) : 15;
  s.smc = (hasOB || hasPD) ? Math.min(100, 55 + (hasOB?18:0) + (hasPD?8:0)) : 15;
  s.ict = (hasFVG || hasImb) ? Math.min(100, 55 + (hasFVG?22:0) + (hasImb?12:0)) : 15;
  s.candle = (hasEngulf || hasPin) ? Math.min(100, 55 + (hasEngulf?18:0) + (hasPin?15:0)) : 15;
  s.liquidity = (hasSweep || hasLiq) ? Math.min(100, 55 + (hasSweep?20:0) + (hasLiq?10:0)) : 15;
  var rr = 20;
  if (levels.entry && levels.sl && levels.tp1) {
    var r = Math.abs(levels.entry - levels.sl), rw = Math.abs(levels.tp1 - levels.entry);
    var rrRatio = r > 0 ? rw/r : 0;
    rr = Math.min(100, Math.round(Math.min(rrRatio, 4)*25 + 25));
  }
  s.riskReward = rr;
  var avg = (s.structure+s.smc+s.ict+s.candle+s.liquidity+s.riskReward)/6;
  var n = avg < 25 ? 2 : Math.max(2, Math.min(9, avg/10));
  return { scores: s, confluence: Math.round(n*10)/10, auto: true, hasEvidence: hasBOS||hasCHoCH||hasOB||hasPD||hasFVG||hasImb||hasEngulf||hasPin||hasSweep||hasLiq };
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
    result.confluence = (levels.confluenceScore != null) ? levels.confluenceScore : Math.round((sum/6/10)*10)/10;
    return result;
  }
  if (mode === 'auto' || mode === 'force') {
    var a = calculateConfluenceAuto(levels, rawText);
    result.scores = a.scores; result.confluence = a.confluence; result.auto = true;
    if (!a.hasEvidence) result.warning = '\n⚠️ هیچ الگوی SMC/ICT شناسایی نشد';
    return result;
  }
  result.warning = '\n⚠️ نمرات دریافت نشد.';
  return result;
}

// ═══ AI CALLERS ═══
function classifyErr(st, msg) {
  var m = String(msg || '').toLowerCase();
  if (st === 401) { if (/invalid.*api.*key|unauthorized|authentication|api.?key.*invalid|invalid.?key/i.test(m)) return 'auth'; return 'perm'; }
  if (st === 402 || /quota|balance|credit|insufficient|billing|payment|اعتبار|سهمیه/.test(m)) return 'quota';
  if (st === 429 || /rate.?limit|too many/.test(m)) return 'rate';
  if (st === 403 || /permission|not allowed|forbidden|no access/.test(m)) return 'perm';
  if (st === 404 || /not found|no available channel|does not exist|invalid.*model|unknown model|not available/.test(m)) return 'missing';
  if (st === 400 && /unsupported|max_tokens|max_completion|temperature|parameter/.test(m)) return 'param';
  if (st >= 500 || st === 0) return 'upstream';
  return 'other';
}
async function oaiOnce(base, key, model, content, mt, ms) {
  var ctrl = new AbortController();
  var to = setTimeout(function() { ctrl.abort(); }, ms);
  try {
    var rsn = /^(gpt-5|o\d)/i.test(String(model).replace(/^.*\//, ''));
    var body = { model: model, messages: [{ role: 'user', content: content }] };
    if (rsn) body.max_completion_tokens = mt;
    else { body.temperature = 0.2; body.max_tokens = mt; }
    var r = await fetch(base + '/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify(body), signal: ctrl.signal
    });
    var raw = await r.text(), d = null;
    try { d = JSON.parse(raw); } catch (e) {}
    return { status: r.status, ok: r.ok, d: d, raw: raw };
  } finally { clearTimeout(to); }
}
function oaiErrMsg(res) {
  return (res.d && res.d.error) ? (res.d.error.message || JSON.stringify(res.d.error))
    : String(res.raw || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 140);
}
async function callOAICompat(env, pkey, prompt, imgB64, imgMime, chatId, opts) {
  opts = opts || {};
  var key = getKey(env, pkey), name = PROVIDER_NAMES[pkey];
  if (!key) throw new Error(name + ' کلید تنظیم نشده');
  var base = OAI_BASES[pkey];
  var hasImage = !!imgB64;
  var content = hasImage
    ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }]
    : prompt;
  var tier = chatId ? await getUserModelTier(env, chatId, pkey) : 'fast';
  var long = !!opts.long;
  if (long && chatId && !hasImage) {
    var dsc = await getDiscoveredModels(env, chatId, pkey);
    if (!dsc) { try { await discoverProviderModels(env, chatId, pkey, key); } catch (e) {} }
  }
  var cands = await getTierCandidates(env, chatId, pkey, tier, hasImage);
  var perTimeout = long ? 100000 : 18000;
  var maxAttempts = long ? 3 : 2;
  var budget = opts.budget || (long ? AI_LONG_BUDGET : AI_SHORT_BUDGET);
  var fb = chatId ? await getFallbackMode(env, chatId) : 'strict';
  var errs = [], start = Date.now();

  async function attempt(model, allowRetry) {
    var left = budget - (Date.now() - start);
    if (left < 4000) { errs.push(model + ': بودجه‌ی زمانی تمام'); return null; }
    var mt = getMaxTokens(model), res;
    try {
      res = await oaiOnce(base, key, model, content, mt, Math.min(perTimeout, left));
      if (allowRetry && !res.ok && mt > 3500) {
        var kind0 = classifyErr(res.status, oaiErrMsg(res));
        if (kind0 === 'quota' || kind0 === 'param') { mt = 3500; res = await oaiOnce(base, key, model, content, mt, Math.min(perTimeout, Math.max(4000, budget - (Date.now() - start)))); }
      }
    } catch (e) {
      errs.push(model + ': ' + (e.name === 'AbortError' ? 'timeout ' + Math.round(perTimeout/1000) + 's' : e.message));
      return { kind: 'upstream' };
    }
    if (res.ok && res.d) {
      var ch = res.d.choices && res.d.choices[0], msg = ch && ch.message;
      var t = msg ? msg.content : null, rs = msg ? msg.reasoning_content : null, fin = ch ? ch.finish_reason : null;
      if (fin === 'length') { errs.push(model + ': پاسخ قطع (mt=' + mt + ')'); return { kind: 'other' }; }
      if ((!t || t.length < 10) && rs && rs.length > 100) { errs.push(model + ': reasoning-only'); return { kind: 'other' }; }
      if (t && t.length > 10) return { ok: true, text: t, model: model };
      errs.push(model + ': خالی'); return { kind: 'other' };
    }
    var em = oaiErrMsg(res), kind = classifyErr(res.status, em);
    errs.push(model + ': [' + res.status + ' ' + ERR_FA[kind] + '] ' + String(em).slice(0, 120));
    if (kind === 'missing' || kind === 'perm') await markBadModel(env, chatId, pkey, model);
    return { kind: kind };
  }

  for (var mi = 0; mi < Math.min(cands.length, maxAttempts); mi++) {
    var r = await attempt(cands[mi], true);
    if (r && r.ok) {
      if (chatId && !hasImage) { try { await setWorkingModel(env, chatId, pkey, tier, r.model); } catch (e) {} }
      return { text: r.text, model: r.model, tier: tier };
    }
    if (!r) break;
    if (r.kind === 'auth' || r.kind === 'quota' || r.kind === 'rate') break;
  }
  if (fb === 'warn' && tier !== 'fast' && !hasImage) {
    var fastC = await getTierCandidates(env, chatId, pkey, 'fast', false);
    if (fastC[0]) {
      var rf = await attempt(fastC[0], false);
      if (rf && rf.ok) return { text: rf.text, model: rf.model, tier: 'fast', emergencyFallback: true, requestedTier: tier };
    }
  }
  throw new Error(name + ' tier=' + tier + ' :: ' + errs.join(' | '));
}
async function callAIPrimeText(env, prompt, imgB64, imgMime, chatId, opts) { return callOAICompat(env, 'aiprime', prompt, imgB64, imgMime, chatId, opts); }
async function callGapGPTText(env, prompt, imgB64, imgMime, chatId, opts) { return callOAICompat(env, 'gapgpt', prompt, imgB64, imgMime, chatId, opts); }

async function callGeminiText(env, prompt, imgB64, imgMime) {
  var keys = getGeminiKeys(env);
  if (!keys.length) throw new Error('no key');
  var models = imgB64 ? VISION_MODELS_BY_PROVIDER.gemini : ['gemini-3.8-flash', 'gemini-2.5-flash'];
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
          var cand = d && d.candidates && d.candidates[0], t = null;
          if (cand && cand.content && cand.content.parts) {
            for (var pi = 0; pi < cand.content.parts.length; pi++) {
              var pt = cand.content.parts[pi];
              if (pt.text && !pt.thought) t = (t || '') + pt.text;
            }
          }
          if (t && t.length > 10) return { text: t, model: models[mi], tier: 'fast' };
        }
        last = d && d.error ? d.error.message : 'HTTP ' + r.status;
        if (r.status === 404 || /not found|not supported|no longer available/i.test(last)) continue;
        if ([429, 401, 403].indexOf(r.status) !== -1) break;
      } catch (e) { last = e.message; }
    }
  }
  throw new Error('Gemini: ' + last);
}
async function callGroqText(env, prompt, imgB64, imgMime) {
  var key = env.GROQ_KEY; if (!key) throw new Error('no key');
  var models = imgB64 ? ['meta-llama/llama-4-scout-17b-16e-instruct'] : ['llama-3.3-70b-versatile'];
  var last = '';
  for (var i = 0; i < models.length; i++) {
    try {
      var c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
      var r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model: models[i], messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: getMaxTokens(models[i]) })
      });
      var d = await r.json();
      if (r.ok) { var t = d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : null; if (t) return { text: t, model: models[i], tier: 'fast' }; }
      last = d && d.error ? d.error.message : 'HTTP ' + r.status;
    } catch (e) { last = e.message; }
  }
  throw new Error('Groq: ' + last);
}
async function callGitHubText(env, prompt, imgB64, imgMime) {
  var tk = env.GITHUB_MODELS_TOKEN; if (!tk) throw new Error('no token');
  var c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  var r = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tk },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 4000 })
  });
  var d = await r.json();
  if (!r.ok) throw new Error(d && d.error ? d.error.message : 'HTTP ' + r.status);
  return { text: d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '', model: 'gpt-4o-mini', tier: 'fast' };
}
async function callTogetherText(env, prompt, imgB64, imgMime) {
  var key = env.TOGETHER_KEY; if (!key) throw new Error('no key');
  var model = imgB64 ? 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo' : 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
  var c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  var r = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: getMaxTokens(model) })
  });
  var d = await r.json();
  if (!r.ok) throw new Error(d && d.error ? d.error.message : 'HTTP ' + r.status);
  return { text: d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '', model: model, tier: 'fast' };
}
async function callOpenRouterText(env, prompt, imgB64, imgMime) {
  var key = env.OPENROUTER_KEY; if (!key) throw new Error('no key');
  var models = imgB64 ? ['google/gemini-2.0-flash-exp:free'] : ['meta-llama/llama-3.3-70b-instruct:free'];
  var last = '';
  for (var i = 0; i < models.length; i++) {
    try {
      var c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
      var r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model: models[i], messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: getMaxTokens(models[i]) })
      });
      var d = await r.json();
      if (r.ok) { var t = d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : null; if (t) return { text: t, model: models[i], tier: 'fast' }; }
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
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: getMaxTokens(model) })
  });
  var d = await r.json();
  if (!r.ok) throw new Error(d && d.error ? d.error.message : 'HTTP ' + r.status);
  return { text: d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '', model: model, tier: 'fast' };
}
async function callAvalAIText(env, prompt, imgB64, imgMime) {
  var key = env.AVALAI_KEY; if (!key) throw new Error('no key');
  var c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  var r = await fetch('https://api.avalai.ir/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: 'gemini-2.0-flash', messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 8000 })
  });
  var d = await r.json();
  if (!r.ok) throw new Error(d && d.error ? d.error.message : 'HTTP ' + r.status);
  return { text: d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '', model: 'gemini-2.0-flash', tier: 'fast' };
}
async function callHuggingFaceText(env, prompt, imgB64, imgMime) {
  var key = env.HUGGINGFACE_KEY; if (!key) throw new Error('no key');
  var model = imgB64 ? 'Qwen/Qwen2.5-VL-7B-Instruct' : 'meta-llama/Meta-Llama-3-8B-Instruct';
  var c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  var r = await fetch('https://api-inference.huggingface.co/models/' + model + '/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: 4000 })
  });
  var d = await r.json();
  if (!r.ok) throw new Error(d && d.error ? d.error.message : 'HTTP ' + r.status);
  return { text: d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '', model: model, tier: 'fast' };
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
  return { text: d && d.result ? d.result.response : '', model: model, tier: 'fast' };
}
async function callNvidiaText(env, prompt, imgB64, imgMime) {
  var key = env.NVIDIA_KEY; if (!key) throw new Error('no key');
  var model = imgB64 ? 'meta/llama-3.2-90b-vision-instruct' : 'meta/llama-3.3-70b-instruct';
  var c = imgB64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + imgMime + ';base64,' + imgB64 } }] : prompt;
  var r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: c }], temperature: 0.15, max_tokens: getMaxTokens(model) })
  });
  var d = await r.json();
  if (!r.ok) throw new Error(d && d.error ? d.error.message : 'HTTP ' + r.status);
  return { text: d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '', model: model, tier: 'fast' };
}
async function callLLM7Text(env, prompt) {
  var key = env.LLM7_KEY || 'unused';
  var r = await fetch('https://api.llm7.io/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: 'pro', messages: [{ role: 'user', content: prompt }], temperature: 0.15, max_tokens: 8000 })
  });
  var d = await r.json();
  if (!r.ok) throw new Error(d && d.error ? d.error.message : 'HTTP ' + r.status);
  return { text: d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '', model: 'pro', tier: 'fast' };
}
async function callMetisText(env, prompt) {
  var key = env.METIS_KEY; if (!key) throw new Error('no key');
  var r = await fetch('https://api.metisai.ir/openai/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: prompt }], temperature: 0.15, max_tokens: 8000 })
  });
  var d = await r.json();
  if (!r.ok) throw new Error(d && d.error ? d.error.message : 'HTTP ' + r.status);
  return { text: d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '', model: 'gemini-2.5-flash', tier: 'fast' };
}
async function callOneXAiText(env, prompt) {
  var key = env.ONEXAI_KEY; if (!key) throw new Error('no key');
  var r = await fetch('https://1xai.ir/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: prompt }], temperature: 0.15, max_tokens: 8000 })
  });
  var d = await r.json();
  if (!r.ok) throw new Error(d && d.error ? d.error.message : 'HTTP ' + r.status);
  return { text: d && d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '', model: 'gemini-2.5-flash', tier: 'fast' };
}

var PROVIDER_FUNCS = {
  aiprime: callAIPrimeText, gapgpt: callGapGPTText,
  gemini: callGeminiText, groq: callGroqText, github: callGitHubText,
  together: callTogetherText, openrouter: callOpenRouterText, mistral: callMistralText,
  huggingface: callHuggingFaceText, cloudflare: callCloudflareText, nvidia: callNvidiaText,
  llm7:
