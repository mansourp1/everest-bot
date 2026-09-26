const SYSTEM_PROMPT = "شما یک تحلیل‌گر ارشد بازارهای مالی با ۱۵ سال تجربه در SMC، ICT و پرایس اکشن هستید.\n\n" +
"**روش کار**\n" +
"۱. استخراج داده خام\n" +
"۲. تشخیص رژیم بازار\n" +
"۳. شناسایی BOS، CHoCH و نقدینگی\n" +
"۴. کشف Order Blocks و FVG\n" +
"۵. بررسی الگوهای کندلی\n" +
"۶. امتیازدهی ۶ لایه\n" +
"۷. تصمیم نهایی\n\n" +
"**در انتهای پاسخ دقیقاً این فرمت را بنویس:**\n" +
"---\n" +
"Direction: [BUY/SELL/WAIT]\n" +
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
"1. اگر Confidence کمتر از 65 باشد، Direction باید WAIT باشد\n" +
"2. حد ضرر باید ساختاری باشد\n" +
"3. در BUY، SL زیر Entry و در SELL، SL بالای Entry\n" +
"4. R/R اعلامی با محاسبه واقعی مطابقت داشته باشد\n" +
"5. تحلیل کامل و مفصل بنویس";

const MULTI_TF_PROMPT = "شما یک تحلیل‌گر ارشد بازارهای مالی با ۱۵ سال تجربه در SMC، ICT و پرایس اکشن هستید.\n\n" +
"**تحلیل Multi-Timeframe با ۴ تایم‌فریم**\n\n" +
"🎯 HTF (4H) — روند اصلی (قطعی)\n" +
"🔍 MTF (1H) — تأیید ساختار\n" +
"📊 LTF (15M) — ستاپ معاملاتی\n" +
"⏱️ EntryTF (1M) — فقط تایمینگ\n\n" +
"**قوانین:**\n" +
"1. جهت نهایی = جهت 4H (بدون استثنا)\n" +
"2. 1M فقط تایمینگ ورود است\n" +
"3. اگر 4H رنج بود → WAIT\n\n" +
"**در انتهای پاسخ دقیقاً این فرمت را بنویس:**\n" +
"---\n" +
"Direction: [BUY/SELL/WAIT]\n" +
"ConfluenceScore: [0-10]\n" +
"HTF4H: [BULLISH/BEARISH/RANGING]\n" +
"MTF1H: [BULLISH/BEARISH/RANGING]\n" +
"LTF15M: [BULLISH/BEARISH/RANGING]\n" +
"EntryTF1M: [BULLISH/BEARISH/RANGING]\n" +
"ConfidenceScore: [0-100]\n" +
"Entry: [عدد یا N/A]\n" +
"Stop Loss: [عدد یا N/A]\n" +
"TP1: [عدد یا N/A]\n" +
"TP2: [عدد یا N/A]\n" +
"TP3: [عدد یا N/A]\n" +
"R/R: [نسبت یا N/A]\n" +
"---";

// ⭐ پرامپت مخصوص تحلیل تصویر
const IMAGE_PROMPT = "شما یک تحلیل‌گر ارشد بازارهای مالی با ۱۵ سال تجربه در SMC، ICT و پرایس اکشن هستید.\n\n" +
"**وظیفه: تحلیل چارت از روی تصویر ارسالی**\n\n" +
"**مراحل تحلیل:**\n" +
"1. تشخیص نماد و تایم‌فریم از روی تصویر (اگر قابل خواندن است)\n" +
"2. کالیبراسیون محور Y — پیدا کردن قیمت‌ها\n" +
"3. تشخیص رژیم بازار (Trending/Ranging/Transitional)\n" +
"4. شناسایی ساختار بازار (BOS، CHoCH، Retest)\n" +
"5. کشف Order Blocks و FVG\n" +
"6. بررسی الگوهای کندلی\n" +
"7. تعیین سطوح کلیدی (حمایت و مقاومت)\n" +
"8. سناریو معاملاتی\n\n" +
"**کالیبراسیون محور Y (خیلی مهم):**\n" +
"دو نقطه واقعی روی محور قیمت پیدا کن (بالاترین و پایین‌ترین)\n" +
"و درصد فاصله‌شان از بالای تصویر را تخمین بزن.\n" +
"این کار برای تبدیل پیکسل به قیمت ضروری است.\n\n" +
"**ساختار تحلیل:**\n" +
"### ۰. اطلاعات تصویر\n" +
"نماد، تایم‌فریم، رنج قیمتی\n\n" +
"### ۱. رژیم بازار\n\n" +
"### ۲. ساختار بازار (BOS، CHoCH)\n\n" +
"### ۳. SMC (Order Blocks، FVG)\n\n" +
"### ۴. الگوهای کندلی\n\n" +
"### ۵. سطوح کلیدی\n\n" +
"### ۶. سناریو معاملاتی\n\n" +
"### ۷. خلاصه اجرایی\n\n" +
"**در انتهای پاسخ دقیقاً این فرمت را بنویس:**\n" +
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
"1. اگر Confidence کمتر از 65 باشد → WAIT\n" +
"2. حد ضرر ساختاری\n" +
"3. در BUY، SL زیر Entry و در SELL، SL بالای Entry\n" +
"4. اگر نماد یا تایم‌فریم قابل تشخیص نبود → UNKNOWN بنویس\n" +
"5. اگر محور Y قابل خواندن نبود → از تخمین نسبی استفاده کن";

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
  if (m) {
    var a = parseFloat(m[1]); var b = parseFloat(m[2]);
    return a > 0 ? b / a : null;
  }
  var n = parseFloat(rrStr);
  return isNaN(n) ? null : n;
}

function findValue(text, labels) {
  for (var i = 0; i < labels.length; i++) {
    var label = labels[i];
    var pattern = new RegExp("\\*{0,2}" + label + "\\*{0,2}\\s*[:=]\\s*\\*{0,2}\\s*([^\\n]+)", 'i');
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
    if (conf === null || conf === undefined) {
      issues.push('امتیاز اطمینان استخراج نشد');
      levels.direction = 'WAIT';
    } else if (conf < 65) {
      issues.push('اطمینان ' + conf + '% زیر آستانه 65%');
      levels.direction = 'WAIT';
    }
  }
  if (levels.direction === 'BUY' || levels.direction === 'SELL') {
    var entry = levels.entry, sl = levels.sl;
    if (entry === null) { issues.push('Entry موجود نیست'); levels.direction = 'WAIT'; }
    else if (sl === null) { issues.push('Stop Loss موجود نیست'); levels.direction = 'WAIT'; }
    else {
      if (levels.direction === 'BUY' && sl >= entry) { issues.push('SL بالاتر از Entry'); levels.direction = 'WAIT'; }
      if (levels.direction === 'SELL' && sl <= entry) { issues.push('SL پایین‌تر از Entry'); levels.direction = 'WAIT'; }
    }
    if (levels.direction !== 'WAIT' && entry && sl && levels.tp1) {
      var risk = Math.abs(entry - sl), reward = Math.abs(levels.tp1 - entry);
      var actualRR = risk > 0 ? reward / risk : 0;
      if (actualRR < 1.5) { issues.push('R/R ' + actualRR.toFixed(2) + ' کمتر از 1.5'); levels.direction = 'WAIT'; }
      else levels.rr = '1:' + actualRR.toFixed(2);
    }
  }
  levels.validationIssues = issues;
  return levels;
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
  var labels = {
    '1min': '1 دقیقه', '3min': '3 دقیقه', '5min': '5 دقیقه',
    '15min': '15 دقیقه', '1h': '1 ساعت', '4h': '4 ساعت'
  };
  return labels[tf] || tf;
}

function regimeLabel(r) {
  var labels = {
    TRENDING_UP: '📈 روند صعودی', TRENDING_DOWN: '📉 روند نزولی',
    RANGING: '↔️ رنج', TRANSITIONAL: '🔄 گذار'
  };
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
      [
        { text: '📊 تحلیل جدید', callback_data: 'menu_analyze' },
        { text: '🎯 تحلیل MTF', callback_data: 'menu_mtf' }
      ],
      [
        { text: '📸 تحلیل تصویر', callback_data: 'menu_image' },
        { text: '📓 ژورنال', callback_data: 'menu_journal' }
      ],
      [
        { text: '🔔 هشدارها', callback_data: 'menu_watch' },
        { text: '⚙️ تنظیمات', callback_data: 'menu_settings' }
      ],
      [
        { text: '📈 وضعیت', callback_data: 'menu_status' },
        { text: '📖 راهنما', callback_data: 'menu_help' }
      ]
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
      [{ text: '⚡ اسکلپی (سیگنال بیشتر)', callback_data: 'mode_scalping' }],
      [{ text: '⚖️ متوسط (تعادل)', callback_data: 'mode_medium' }],
      [{ text: '🛡️ مطمئن (کیفیت بالا)', callback_data: 'mode_confident' }],
      [{ text: '◀️ بازگشت', callback_data: 'menu_settings' }]
    ]
  };
}

// ============================================
// USER STATE
// ============================================

async function setUserState(env, chatId, state) {
  await env.KV.put('state:' + chatId, JSON.stringify(state), { expirationTtl: 600 });
}

async function getUserState(env, chatId) {
  try { return await env.KV.get('state:' + chatId, 'json'); } catch (e) { return null; }
}

async function clearUserState(env, chatId) {
  await env.KV.delete('state:' + chatId);
}

// ============================================
// KV HELPERS
// ============================================

async function getJournal(env, chatId) {
  try { return await env.KV.get('journal:' + chatId, 'json') || []; } catch (e) { return []; }
}
async function saveJournal(env, chatId, journal) { await env.KV.put('journal:' + chatId, JSON.stringify(journal)); }
async function getWatchlist(env, chatId) {
  try { return await env.KV.get('watch:' + chatId, 'json') || []; } catch (e) { return []; }
}
async function saveWatchlist(env, chatId, list) { await env.KV.put('watch:' + chatId, JSON.stringify(list)); }

// ============================================
// MENU VIEWS
// ============================================

async function showMainMenu(token, chatId, messageId) {
  await sendOrEdit(token, chatId, messageId,
    '🎯 <b>Everest AI Terminal</b>\n\nاز منوی زیر انتخاب کنید:',
    mainMenu());
}

async function showSymbolMenu(token, chatId, messageId) {
  await sendOrEdit(token, chatId, messageId,
    '🎯 <b>نماد را انتخاب کنید</b>',
    symbolMenu());
}

async function showTimeframeMenu(token, chatId, messageId, symbolRaw) {
  var display = normalizeSymbol(symbolRaw);
  await sendOrEdit(token, chatId, messageId,
    '⏰ <b>روش تحلیل ' + display + '</b>',
    timeframeMenu(symbolRaw));
}

async function showJournalMenu(token, chatId, messageId, env) {
  var journal = await getJournal(env, chatId);
  var text = '📓 <b>ژورنال معاملات</b>\n\n';
  if (journal.length) {
    var wins = 0, losses = 0;
    for (var i = 0; i < journal.length; i++) {
      if (journal[i].result === 'win') wins++;
      if (journal[i].result === 'loss') losses++;
    }
    text += '📈 کل: <b>' + journal.length + '</b>\n✅ برد: <b>' + wins + '</b>\n❌ باخت: <b>' + losses + '</b>\n\n';
  } else {
    text += '<i>هنوز معامله‌ای ثبت نشده</i>\n\n';
  }
  await sendOrEdit(token, chatId, messageId, text, journalMenu());
}

async function showWatchMenu(token, chatId, messageId, env) {
  var list = await getWatchlist(env, chatId);
  var text = '🔔 <b>هشدارهای قیمتی</b>\n\n';
  if (list.length) text += '📊 ' + list.length + ' هشدار فعال\n⏱️ بررسی خودکار هر ۵ دقیقه\n\n';
  else text += '<i>هیچ هشداری تنظیم نشده</i>\n\n';
  await sendOrEdit(token, chatId, messageId, text, watchMenu());
}

async function showSettingsMenu(token, chatId, messageId) {
  await sendOrEdit(token, chatId, messageId,
    '⚙️ <b>تنظیمات</b>',
    { inline_keyboard: [[{ text: '🎯 حالت تحلیل', callback_data: 'settings_mode' }], [{ text: '🏠 منوی اصلی', callback_data: 'menu_main' }]] });
}

async function showStatus(token, chatId, messageId, env) {
  var geminiKeys = getGeminiKeys(env);
  var geminiOk = geminiKeys.length > 0 ? '✅ (' + geminiKeys.length + ')' : '❌';
  var twelveOk = env.TWELVE_KEY ? '✅' : '❌';
  var chartOk = env.CHART_IMG_KEY ? '✅' : '❌';
  var kvOk = env.KV ? '✅' : '❌';
  var text = '🤖 <b>وضعیت سیستم</b>\n\n' +
    '• Gemini AI: ' + geminiOk + '\n' +
    '• Twelve Data: ' + twelveOk + '\n' +
    '• Chart-Img: ' + chartOk + '\n' +
    '• حافظه KV: ' + kvOk + '\n' +
    '• Telegram: ✅';
  await sendOrEdit(token, chatId, messageId, text, { inline_keyboard: [[{ text: '🏠 منوی اصلی', callback_data: 'menu_main' }]] });
}

async function showHelp(token, chatId, messageId) {
  var text = '📖 <b>راهنما</b>\n\n' +
    '<b>📊 تحلیل:</b>\n' +
    '• تحلیل تک تایم‌فریم (Live)\n' +
    '• تحلیل MTF (۴ تایم‌فریم)\n' +
    '• تحلیل تصویر ارسالی 📸\n\n' +
    '<b>📓 ژورنال:</b>\n' +
    '• ثبت معاملات\n' +
    '• پیگیری نتایج\n' +
    '• آمار عملکرد\n\n' +
    '<b>🔔 هشدار:</b>\n' +
    '• هشدار بالای/زیر قیمت\n' +
    '• بررسی خودکار هر ۵ دقیقه\n\n' +
    '<b>📸 تحلیل تصویر:</b>\n' +
    'فقط عکس چارت را بفرستید، بات خودکار تشخیص می‌دهد!\n\n' +
    '<b>دستورات:</b>\n' +
    '• /menu — منوی اصلی\n' +
    '• /help — راهنما';
  await sendOrEdit(token, chatId, messageId, text, { inline_keyboard: [[{ text: '🏠 منوی اصلی', callback_data: 'menu_main' }]] });
}

async function showImageGuide(token, chatId, messageId) {
  var text = '📸 <b>تحلیل تصویر چارت</b>\n\n' +
    'فقط کافیه <b>عکس چارت</b> رو برام بفرستی!\n\n' +
    '<b>💡 نکات برای بهترین نتیجه:</b>\n' +
    '• محور Y (قیمت) کاملاً واضح باشد\n' +
    '• تصویر با کیفیت و خوانا باشد\n' +
    '• چارت خالی (بدون اندیکاتورهای زیاد) بهتر است\n' +
    '• نماد و تایم‌فریم اگر مشخص باشد، بهتر\n\n' +
    '<b>🎯 چی تحلیل می‌شه؟</b>\n' +
    '• ساختار بازار (BOS/CHoCH)\n' +
    '• Order Blocks و FVG\n' +
    '• الگوهای کندلی\n' +
    '• سطوح Entry/SL/TP\n' +
    '• رژیم بازار';
  await sendOrEdit(token, chatId, messageId, text,
    { inline_keyboard: [[{ text: '🏠 منوی اصلی', callback_data: 'menu_main' }]] });
}

// ============================================
// SEND/EDIT
// ============================================

async function sendOrEdit(token, chatId, messageId, text, keyboard) {
  if (messageId) {
    try {
      var res = await fetch('https://api.telegram.org/bot' + token + '/editMessageText', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId, message_id: messageId,
          text: text.slice(0, 4000), parse_mode: 'HTML',
          disable_web_page_preview: true, reply_markup: keyboard
        })
      });
      var data = await res.json();
      if (data.ok) return data;
    } catch (e) {}
  }
  return await sendMessage(token, chatId, text, keyboard);
}

async function sendMessage(token, chatId, text, keyboard) {
  var url = 'https://api.telegram.org/bot' + token + '/sendMessage';
  var payload = {
    chat_id: chatId, text: text.slice(0, 4000),
    parse_mode: 'HTML', disable_web_page_preview: true
  };
  if (keyboard) payload.reply_markup = keyboard;
  var res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function sendPhotoBytes(token, chatId, imageBuffer, caption) {
  var formData = new FormData();
  formData.append('chat_id', String(chatId));
  formData.append('caption', (caption || '').slice(0, 1000));
  formData.append('parse_mode', 'HTML');
  formData.append('photo', new Blob([imageBuffer], { type: 'image/png' }), 'chart.png');
  var res = await fetch('https://api.telegram.org/bot' + token + '/sendPhoto', { method: 'POST', body: formData });
  return res.json();
}

async function answerCallback(token, callbackId) {
  await fetch('https://api.telegram.org/bot' + token + '/answerCallbackQuery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId })
  });
}

// ============================================
// TELEGRAM FILE DOWNLOAD
// ============================================

async function downloadTelegramPhoto(token, fileId) {
  // مرحله ۱: دریافت file_path از تلگرام
  var res = await fetch('https://api.telegram.org/bot' + token + '/getFile?file_id=' + fileId);
  var data = await res.json();
  if (!data.ok) throw new Error('خطا در دریافت file path: ' + (data.description || ''));
  var filePath = data.result.file_path;

  // مرحله ۲: دانلود فایل
  var fileRes = await fetch('https://api.telegram.org/file/bot' + token + '/' + filePath);
  if (!fileRes.ok) throw new Error('خطا در دانلود فایل');
  var arrayBuffer = await fileRes.arrayBuffer();

  // مرحله ۳: تبدیل به base64
  var bytes = new Uint8Array(arrayBuffer);
  var binary = '';
  var chunkSize = 8192;
  for (var i = 0; i < bytes.length; i += chunkSize) {
    var chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
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
    result.push({
      datetime: v.datetime || '',
      open: parseFloat(v.open), high: parseFloat(v.high),
      low: parseFloat(v.low), close: parseFloat(v.close),
      volume: parseFloat(v.volume || 0)
    });
  }
  return result;
}

async function getCurrentPrice(symbol, apiKey) {
  var url = 'https://api.twelvedata.com/price?symbol=' + encodeURIComponent(symbol) + '&apikey=' + apiKey;
  var res = await fetch(url);
  var data = await res.json();
  if (data.status === 'error' || data.code) throw new Error(data.message || 'خطا');
  return parseFloat(data.price);
}

async function callGemini(apiKeys, prompt, model) {
  model = model || 'gemini-3.5-flash-lite';
  var keys = Array.isArray(apiKeys) ? apiKeys.filter(Boolean) : [apiKeys];
  if (!keys.length) throw new Error('هیچ کلید Gemini تنظیم نشده');
  var lastError = null;
  for (var i = 0; i < keys.length; i++) {
    var apiKey = keys[i];
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;
    try {
      var res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, topP: 0.85, maxOutputTokens: 12288 }
        })
      });
      var data = await res.json();
      if (res.ok) {
        var text = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
        if (text) return text;
      }
      lastError = (data.error && data.error.message) || ('HTTP ' + res.status);
      if (res.status === 429 || res.status === 503 || res.status === 500 || res.status === 401 || res.status === 403 || res.status === 400) continue;
      throw new Error(lastError);
    } catch (e) {
      lastError = e.message;
      continue;
    }
  }
  throw new Error('همه کلیدها خطا دادند: ' + lastError);
}

// ⭐ Gemini Vision برای تحلیل تصویر
async function callGeminiVision(apiKeys, imageBase64, mimeType, prompt, model) {
  model = model || 'gemini-3.5-flash-lite';
  var keys = Array.isArray(apiKeys) ? apiKeys.filter(Boolean) : [apiKeys];
  if (!keys.length) throw new Error('هیچ کلید Gemini تنظیم نشده');
  var lastError = null;
  for (var i = 0; i < keys.length; i++) {
    var apiKey = keys[i];
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;
    try {
      var res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } }
            ]
          }],
          generationConfig: { temperature: 0.1, topP: 0.85, maxOutputTokens: 12288 }
        })
      });
      var data = await res.json();
      if (res.ok) {
        var text = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
        if (text) return text;
      }
      lastError = (data.error && data.error.message) || ('HTTP ' + res.status);
      if (res.status === 429 || res.status === 503 || res.status === 500 || res.status === 401 || res.status === 403 || res.status === 400) continue;
      throw new Error(lastError);
    } catch (e) {
      lastError = e.message;
      continue;
    }
  }
  throw new Error('همه کلیدها خطا دادند: ' + lastError);
}

function getGeminiKeys(env) {
  var keys = [];
  if (env.GEMINI_KEY_1) keys.push(env.GEMINI_KEY_1);
  if (env.GEMINI_KEY_2) keys.push(env.GEMINI_KEY_2);
  if (env.GEMINI_KEY_3) keys.push(env.GEMINI_KEY_3);
  if (env.GEMINI_KEY) keys.push(env.GEMINI_KEY);
  return keys;
}

// ============================================
// CHART IMAGE
// ============================================

async function buildChartImage(symbol, timeframe, levels, env) {
  if (!env.CHART_IMG_KEY) throw new Error('CHART_IMG_KEY تنظیم نشده');
  var symUpper = symbol.toUpperCase().replace('/', '');
  var exchange = 'OANDA';
  if (symUpper === 'BTCUSD' || symUpper === 'ETHUSD' || symUpper.indexOf('USDT') !== -1) exchange = 'BINANCE';
  else if (symUpper === 'AAPL' || symUpper === 'MSFT' || symUpper === 'TSLA' || symUpper === 'GOOGL') exchange = 'NASDAQ';

  var intervalMap = { '1min': '1m', '3min': '3m', '5min': '5m', '15min': '15m', '1h': '1h', '4h': '4h' };
  var chartInterval = intervalMap[timeframe] || '1h';

  var horizontalLines = [];
  if (levels && levels.direction !== 'WAIT') {
    if (levels.entry) horizontalLines.push({ price: levels.entry, color: '#00c6ff', label: 'Entry', lineWidth: 2, lineStyle: 'solid' });
    if (levels.sl) horizontalLines.push({ price: levels.sl, color: '#ff1744', label: 'SL', lineWidth: 2, lineStyle: 'dashed' });
    if (levels.tp1) horizontalLines.push({ price: levels.tp1, color: '#00c853', label: 'TP1', lineWidth: 2, lineStyle: 'dashed' });
    if (levels.tp2) horizontalLines.push({ price: levels.tp2, color: '#00c853', label: 'TP2', lineWidth: 2, lineStyle: 'dashed' });
    if (levels.tp3) horizontalLines.push({ price: levels.tp3, color: '#00c853', label: 'TP3', lineWidth: 2, lineStyle: 'dashed' });
  }

  var requestBody = {
    symbol: exchange + ':' + symUpper, interval: chartInterval,
    theme: 'dark', width: 800, height: 600,
    studies: [
      { name: 'Volume', forceOverlay: true },
      { name: 'MACD' },
      { name: 'Relative Strength Index' }
    ]
  };
  if (horizontalLines.length > 0) requestBody.horizontalLines = horizontalLines;

  var res = await fetch('https://api.chart-img.com/v2/tradingview/advanced-chart', {
    method: 'POST',
    headers: { 'x-api-key': env.CHART_IMG_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });
  if (!res.ok) {
    var errText = await res.text();
    throw new Error('Chart-Img ' + res.status + ': ' + errText.slice(0, 200));
  }
  return await res.arrayBuffer();
}

// ============================================
// FORMATTING
// ============================================

function buildCaption(levels, symbol, timeframe) {
  var c = '<b>📊 تحلیل چارت</b>\n\n';
  c += '<b>نماد:</b> ' + symbol + '\n<b>تایم‌فریم:</b> ' + timeframeLabel(timeframe) + '\n\n';
  var direction = levels.direction || 'WAIT';
  var dirText = direction === 'BUY' ? '🟢 خرید' : direction === 'SELL' ? '🔴 فروش' : '⏸️ انتظار';
  c += '<b>جهت:</b> ' + dirText + '\n';
  if (levels.regime) c += '<b>رژیم:</b> ' + regimeLabel(levels.regime) + '\n';
  if (levels.confidence !== null && levels.confidence !== undefined) c += '<b>اطمینان:</b> ' + levels.confidence + '%\n';
  c += '\n';
  if (direction === 'WAIT') c += '<i>ستاپ معتبری شناسایی نشد.</i>\n';
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

function buildImageCaption(levels) {
  var c = '<b>📸 تحلیل تصویر</b>\n\n';
  if (levels.detectedSymbol && levels.detectedSymbol !== 'UNKNOWN') c += '<b>نماد:</b> ' + levels.detectedSymbol + '\n';
  if (levels.detectedTimeframe && levels.detectedTimeframe !== 'UNKNOWN') c += '<b>تایم‌فریم:</b> ' + levels.detectedTimeframe + '\n';
  c += '\n';
  var direction = levels.direction || 'WAIT';
  var dirText = direction === 'BUY' ? '🟢 خرید' : direction === 'SELL' ? '🔴 فروش' : '⏸️ انتظار';
  c += '<b>جهت:</b> ' + dirText + '\n';
  if (levels.regime) c += '<b>رژیم:</b> ' + regimeLabel(levels.regime) + '\n';
  if (levels.confidence !== null && levels.confidence !== undefined) c += '<b>اطمینان:</b> ' + levels.confidence + '%\n';
  c += '\n';
  if (direction === 'WAIT') c += '<i>ستاپ معتبری شناسایی نشد.</i>\n';
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

function buildMultiTFCaption(levels, symbol) {
  var c = '<b>🎯 تحلیل Multi-Timeframe</b>\n\n<b>نماد:</b> ' + symbol + '\n\n';
  if (levels.htf || levels.mtf || levels.ltf || levels.entryTf) {
    c += '<b>📊 تحلیل تایم‌فریم‌ها:</b>\n';
    c += '• 4H: ' + directionEmoji(levels.htf) + '\n';
    c += '• 1H: ' + directionEmoji(levels.mtf) + '\n';
    c += '• 15M: ' + directionEmoji(levels.ltf) + '\n';
    c += '• 1M: ' + directionEmoji(levels.entryTf) + '\n\n';
  }
  if (levels.confluenceScore !== null && levels.confluenceScore !== undefined) {
    var score = levels.confluenceScore;
    var scoreEmoji = score >= 8 ? '🔥' : score >= 6 ? '✅' : score >= 4 ? '⚠️' : '❌';
    c += '<b>هم‌گرایی:</b> ' + scoreEmoji + ' <b>' + score + '/10</b>\n\n';
  }
  var direction = levels.direction || 'WAIT';
  var dirText = direction === 'BUY' ? '🟢 خرید' : direction === 'SELL' ? '🔴 فروش' : '⏸️ انتظار';
  c += '<b>جهت نهایی:</b> ' + dirText + '\n';
  if (levels.confidence !== null && levels.confidence !== undefined) c += '<b>اطمینان:</b> ' + levels.confidence + '%\n';
  c += '\n';
  if (direction === 'WAIT') c += '<i>تایم‌فریم‌ها هم‌جهت نیستند.</i>\n';
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
  var cleaned = text.replace(/```json[\s\S]*?```/gi, '');
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  var h = cleaned.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  h = h.replace(/^#{1,4}\s*(.+)$/gm, '\n━━━━━━━━━━━━━━━\n📌 <b>$1</b>\n━━━━━━━━━━━━━━━');
  h = h.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  h = h.replace(/\n{3,}/g, '\n\n');
  return h.trim();
}

// ============================================
// ANALYSIS
// ============================================

async function runAnalysis(token, chatId, symbol, twelveKey, geminiKeys, geminiModel, timeframe, env) {
  try {
    await sendMessage(token, chatId, '⏳ در حال تحلیل <b>' + symbol + '</b>...');
    var intervalMap = { '1min': '1min', '3min': '5min', '5min': '5min', '15min': '15min', '1h': '1h', '4h': '4h' };
    var interval = intervalMap[timeframe] || '1h';
    var klines = await fetchTwelveData(symbol, interval, twelveKey, 200);
    var fullPrompt = 'نماد: ' + symbol + '\nتایم‌فریم: ' + timeframeLabel(timeframe) + '\n\n' + klinesToText(klines, symbol, timeframeLabel(timeframe));
    var analysisText = await callGemini(geminiKeys, SYSTEM_PROMPT + '\n\n' + fullPrompt, geminiModel);
    var levels = extractLevels(analysisText);
    levels = validateSignal(levels);

    try {
      var chartBuffer = await buildChartImage(symbol, timeframe, levels, env);
      await sendPhotoBytes(token, chatId, chartBuffer, '📊 ' + symbol + ' - ' + timeframeLabel(timeframe));
    } catch (chartErr) { console.error('Chart error: ' + chartErr.message); }

    await sendMessage(token, chatId, buildCaption(levels, symbol, timeframe));
    var fullText = tgFormat(analysisText);
    if (fullText.length > 100) {
      for (var i = 0; i < fullText.length; i += 3800) {
        await sendMessage(token, chatId, fullText.slice(i, i + 3800));
      }
    }
    await sendMessage(token, chatId, '🏠 بازگشت:', {
      inline_keyboard: [[{ text: '🏠 منوی اصلی', callback_data: 'menu_main' }]]
    });
  } catch (e) {
    await sendMessage(token, chatId, '❌ خطا: <code>' + e.message + '</code>');
  }
}

async function runMultiTFAnalysis(token, chatId, symbol, twelveKey, geminiKeys, geminiModel, env) {
  try {
    await sendMessage(token, chatId, '🎯 در حال تحلیل MTF <b>' + symbol + '</b>\n📊 4H + 1H + 15M + 1M');
    var k4H = await fetchTwelveData(symbol, '4h', twelveKey, 150);
    var k1H = await fetchTwelveData(symbol, '1h', twelveKey, 150);
    var k15M = await fetchTwelveData(symbol, '15min', twelveKey, 150);
    var k1M = await fetchTwelveData(symbol, '1min', twelveKey, 150);

    var fullPrompt = 'نماد: ' + symbol + '\n\n';
    fullPrompt += '🔹 HTF (4H):\n' + klinesToText(k4H, symbol, '4H') + '\n\n';
    fullPrompt += '🔹 MTF (1H):\n' + klinesToText(k1H, symbol, '1H') + '\n\n';
    fullPrompt += '🔹 LTF (15M):\n' + klinesToText(k15M, symbol, '15M') + '\n\n';
    fullPrompt += '🔹 EntryTF (1M):\n' + klinesToText(k1M, symbol, '1M') + '\n\n';

    var analysisText = await callGemini(geminiKeys, MULTI_TF_PROMPT + '\n\n' + fullPrompt, geminiModel);
    var levels = extractLevels(analysisText);
    levels = validateSignal(levels);

    try {
      var chartBuffer = await buildChartImage(symbol, '15min', levels, env);
      await sendPhotoBytes(token, chatId, chartBuffer, '📊 ' + symbol + ' - MTF');
    } catch (chartErr) {}

    await sendMessage(token, chatId, buildMultiTFCaption(levels, symbol));
    var fullText = tgFormat(analysisText);
    if (fullText.length > 100) {
      for (var i = 0; i < fullText.length; i += 3800) {
        await sendMessage(token, chatId, fullText.slice(i, i + 3800));
      }
    }
    await sendMessage(token, chatId, '🏠 بازگشت:', {
      inline_keyboard: [[{ text: '🏠 منوی اصلی', callback_data: 'menu_main' }]]
    });
  } catch (e) {
    await sendMessage(token, chatId, '❌ خطا MTF: <code>' + e.message + '</code>');
  }
}

// ⭐ تحلیل تصویر ارسالی
async function runImageAnalysis(token, chatId, photoFileId, env) {
  var geminiKeys = getGeminiKeys(env);
  var geminiModel = env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  try {
    await sendMessage(token, chatId, '📸 دریافت تصویر...');

    // دانلود عکس از تلگرام
    var photoData = await downloadTelegramPhoto(token, photoFileId);

    if (photoData.size > 5 * 1024 * 1024) {
      await sendMessage(token, chatId, '❌ حجم تصویر بیشتر از ۵ مگابایت است. لطفاً تصویر کوچکتری بفرستید.');
      return;
    }

    await sendMessage(token, chatId, '🧠 در حال تحلیل تصویر...\n⏳ ممکنه ۲۰-۳۰ ثانیه طول بکشه');

    // ارسال به Gemini Vision
    var analysisText = await callGeminiVision(geminiKeys, photoData.base64, 'image/jpeg', IMAGE_PROMPT, geminiModel);

    var levels = extractLevels(analysisText);
    levels = validateSignal(levels);

    // ارسال کپشن
    await sendMessage(token, chatId, buildImageCaption(levels));

    // ارسال تحلیل کامل
    var fullText = tgFormat(analysisText);
    if (fullText.length > 100) {
      for (var i = 0; i < fullText.length; i += 3800) {
        await sendMessage(token, chatId, fullText.slice(i, i + 3800));
      }
    }

    await sendMessage(token, chatId, '🏠 بازگشت:', {
      inline_keyboard: [[{ text: '🏠 منوی اصلی', callback_data: 'menu_main' }]]
    });

  } catch (e) {
    await sendMessage(token, chatId, '❌ خطا در تحلیل تصویر: <code>' + e.message + '</code>');
  }
}

// ============================================
// JOURNAL
// ============================================

async function showJournalList(token, chatId, env) {
  var journal = await getJournal(env, chatId);
  if (!journal.length) {
    await sendMessage(token, chatId, '📓 ژورنال خالی است', {
      inline_keyboard: [[{ text: '◀️ بازگشت', callback_data: 'menu_journal' }]]
    });
    return;
  }
  var text = '<b>📓 لیست معاملات</b>\n\n';
  for (var i = 0; i < Math.min(journal.length, 15); i++) {
    var t = journal[i];
    var status = t.result === 'win' ? '✅' : t.result === 'loss' ? '❌' : '⏳';
    text += status + ' <b>#' + t.id + '</b> ' + t.symbol + ' ' + (t.direction === 'BUY' ? '🟢' : '🔴') + '\n';
    text += '   E:<code>' + t.entry + '</code> SL:<code>' + t.sl + '</code> TP:<code>' + t.tp + '</code>\n\n';
  }
  await sendMessage(token, chatId, text, { inline_keyboard: [[{ text: '◀️ بازگشت', callback_data: 'menu_journal' }]] });
}

async function showJournalStats(token, chatId, env) {
  var journal = await getJournal(env, chatId);
  if (!journal.length) {
    await sendMessage(token, chatId, '📓 هنوز معامله‌ای ثبت نشده', {
      inline_keyboard: [[{ text: '◀️ بازگشت', callback_data: 'menu_journal' }]]
    });
    return;
  }
  var wins = 0, losses = 0, pending = 0;
  var symbolStats = {};
  var totalRR = 0, rrCount = 0;

  for (var i = 0; i < journal.length; i++) {
    var tr = journal[i];
    if (tr.result === 'win') wins++;
    else if (tr.result === 'loss') losses++;
    else pending++;
    if (tr.result === 'win' || tr.result === 'loss') {
      if (!symbolStats[tr.symbol]) symbolStats[tr.symbol] = { win: 0, loss: 0 };
      symbolStats[tr.symbol][tr.result]++;
    }
    var r = Math.abs(tr.tp - tr.entry) / Math.abs(tr.entry - tr.sl);
    if (!isNaN(r) && isFinite(r)) { totalRR += r; rrCount++; }
  }
  var closed = wins + losses;
  var winRate = closed > 0 ? (wins / closed * 100).toFixed(1) : '0';
  var avgRR = rrCount > 0 ? (totalRR / rrCount).toFixed(2) : '0';

  var text = '<b>📊 آمار عملکرد</b>\n\n' +
    '📈 کل: <b>' + journal.length + '</b>\n' +
    '✅ برد: <b>' + wins + '</b>\n' +
    '❌ باخت: <b>' + losses + '</b>\n' +
    '⏳ در انتظار: <b>' + pending + '</b>\n\n' +
    '🎯 نرخ برد: <b>' + winRate + '%</b>\n' +
    '⚖️ میانگین R/R: <b>1:' + avgRR + '</b>\n\n';

  var bestSymbol = null, bestRate = -1;
  for (var s in symbolStats) {
    var total = symbolStats[s].win + symbolStats[s].loss;
    var rate = total > 0 ? symbolStats[s].win / total : 0;
    if (rate > bestRate && total >= 2) { bestRate = rate; bestSymbol = s + ' (' + (rate * 100).toFixed(0) + '%)'; }
  }
  if (bestSymbol) text += '🏆 بهترین: <b>' + bestSymbol + '</b>\n';

  await sendMessage(token, chatId, text, { inline_keyboard: [[{ text: '◀️ بازگشت', callback_data: 'menu_journal' }]] });
}

// ============================================
// WATCHLIST
// ============================================

async function showWatchList(token, chatId, env) {
  var list = await getWatchlist(env, chatId);
  if (!list.length) {
    await sendMessage(token, chatId, '🔔 هیچ هشداری تنظیم نشده', {
      inline_keyboard: [[{ text: '◀️ بازگشت', callback_data: 'menu_watch' }]]
    });
    return;
  }
  var text = '<b>🔔 لیست هشدارها</b>\n\n';
  for (var i = 0; i < list.length; i++) {
    var w = list[i];
    text += '#' + w.id + ' ' + w.symbol + ' — ' + (w.condition === 'above' ? '⬆️' : '⬇️') + ' <code>' + w.price + '</code>\n';
  }
  await sendMessage(token, chatId, text, { inline_keyboard: [[{ text: '◀️ بازگشت', callback_data: 'menu_watch' }]] });
}

// ============================================
// WIZARDS
// ============================================

async function startJournalWizard(token, chatId, env) {
  await setUserState(env, chatId, { action: 'journal_add', step: 'symbol', data: {} });
  await sendMessage(token, chatId, '📝 <b>ثبت معامله</b>\n\nمرحله ۱/۵\n\n<b>نماد:</b>',
    { inline_keyboard: [[{ text: '❌ لغو', callback_data: 'wizard_cancel' }]] });
}

async function handleJournalWizard(token, chatId, text, env, state) {
  var data = state.data || {};
  if (state.step === 'symbol') {
    data.symbol = normalizeSymbol(text);
    state.data = data; state.step = 'direction';
    await setUserState(env, chatId, state);
    await sendMessage(token, chatId, '📝 مرحله ۲/۵\n\n<b>جهت:</b>', {
      inline_keyboard: [
        [{ text: '🟢 BUY', callback_data: 'wiz_dir_BUY' }, { text: '🔴 SELL', callback_data: 'wiz_dir_SELL' }],
        [{ text: '❌ لغو', callback_data: 'wizard_cancel' }]
      ]
    });
    return;
  }
  if (state.step === 'entry') {
    var entry = parseFloat(text.replace(/[^\d.\-]/g, ''));
    if (isNaN(entry)) { await sendMessage(token, chatId, '❌ عدد نامعتبر:'); return; }
    data.entry = entry; state.data = data; state.step = 'sl';
    await setUserState(env, chatId, state);
    await sendMessage(token, chatId, '📝 مرحله ۴/۵\n\n<b>حد ضرر (SL):</b>',
      { inline_keyboard: [[{ text: '❌ لغو', callback_data: 'wizard_cancel' }]] });
    return;
  }
  if (state.step === 'sl') {
    var sl = parseFloat(text.replace(/[^\d.\-]/g, ''));
    if (isNaN(sl)) { await sendMessage(token, chatId, '❌ عدد نامعتبر:'); return; }
    data.sl = sl; state.data = data; state.step = 'tp';
    await setUserState(env, chatId, state);
    await sendMessage(token, chatId, '📝 مرحله ۵/۵\n\n<b>حد سود (TP):</b>',
      { inline_keyboard: [[{ text: '❌ لغو', callback_data: 'wizard_cancel' }]] });
    return;
  }
  if (state.step === 'tp') {
    var tp = parseFloat(text.replace(/[^\d.\-]/g, ''));
    if (isNaN(tp)) { await sendMessage(token, chatId, '❌ عدد نامعتبر:'); return; }
    data.tp = tp;

    var journal = await getJournal(env, chatId);
    journal.push({
      id: journal.length + 1, symbol: data.symbol, direction: data.direction,
      entry: data.entry, sl: data.sl, tp: data.tp, ts: Date.now(), result: null
    });
    await saveJournal(env, chatId, journal);
    await clearUserState(env, chatId);

    var rr = Math.abs(data.tp - data.entry) / Math.abs(data.entry - data.sl);
    await sendMessage(token, chatId,
      '✅ <b>ثبت شد</b>\n\n#' + journal.length + ' ' + data.symbol + ' ' + data.direction + '\n' +
      'E:<code>' + data.entry + '</code> SL:<code>' + data.sl + '</code> TP:<code>' + data.tp + '</code>\n' +
      'R/R: 1:' + rr.toFixed(2),
      { inline_keyboard: [[{ text: '📓 ژورنال', callback_data: 'menu_journal' }]] });
    return;
  }
}

async function startWatchWizard(token, chatId, env) {
  await setUserState(env, chatId, { action: 'watch_add', step: 'symbol', data: {} });
  await sendMessage(token, chatId, '🔔 <b>افزودن هشدار</b>\n\nمرحله ۱/۳\n\n<b>نماد:</b>',
    { inline_keyboard: [[{ text: '❌ لغو', callback_data: 'wizard_cancel' }]] });
}

async function handleWatchWizard(token, chatId, text, env, state) {
  var data = state.data || {};
  if (state.step === 'symbol') {
    data.symbol = normalizeSymbol(text);
    state.data = data; state.step = 'condition';
    await setUserState(env, chatId, state);
    await sendMessage(token, chatId, '🔔 مرحله ۲/۳\n\n<b>شرط:</b>', {
      inline_keyboard: [
        [{ text: '⬆️ بالاتر از', callback_data: 'wiz_cond_above' }],
        [{ text: '⬇️ پایین‌تر از', callback_data: 'wiz_cond_below' }],
        [{ text: '❌ لغو', callback_data: 'wizard_cancel' }]
      ]
    });
    return;
  }
  if (state.step === 'price') {
    var price = parseFloat(text.replace(/[^\d.\-]/g, ''));
    if (isNaN(price)) { await sendMessage(token, chatId, '❌ عدد نامعتبر:'); return; }
    data.price = price;

    var list = await getWatchlist(env, chatId);
    var newId = list.length > 0 ? Math.max.apply(null, list.map(function(w) { return w.id; })) + 1 : 1;
    list.push({ id: newId, symbol: data.symbol, condition: data.condition, price: data.price, ts: Date.now() });
    await saveWatchlist(env, chatId, list);
    await clearUserState(env, chatId);

    await sendMessage(token, chatId,
      '✅ <b>هشدار ثبت شد</b>\n\n#' + newId + ' ' + data.symbol + '\n' +
      (data.condition === 'above' ? '⬆️ بالای' : '⬇️ زیر') + ' <code>' + data.price + '</code>\n\n' +
      '⏱️ بررسی هر ۵ دقیقه',
      { inline_keyboard: [[{ text: '🔔 هشدارها', callback_data: 'menu_watch' }]] });
    return;
  }
}

// ============================================
// WATCHLIST CHECKER
// ============================================

async function checkWatchlist(env) {
  try {
    var token = env.TG_TOKEN;
    var twelveKey = env.TWELVE_KEY;
    var list = await env.KV.list({ prefix: 'watch:' });
    for (var i = 0; i < list.keys.length; i++) {
      var key = list.keys[i].name;
      var chatId = key.replace('watch:', '');
      var watchlist = await env.KV.get(key, 'json');
      if (!watchlist || !watchlist.length) continue;
      var remaining = [];
      for (var j = 0; j < watchlist.length; j++) {
        var w = watchlist[j];
        try {
          var price = await getCurrentPrice(w.symbol, twelveKey);
          var triggered = (w.condition === 'above' && price >= w.price) || (w.condition === 'below' && price <= w.price);
          if (triggered) {
            await sendMessage(token, chatId,
              '🔔 <b>هشدار فعال شد!</b>\n\n' +
              '📌 ' + w.symbol + '\n' +
              (w.condition === 'above' ? 'بالای' : 'زیر') + ' <code>' + w.price + '</code>\n' +
              '💰 قیمت فعلی: <code>' + price + '</code>',
              { inline_keyboard: [[{ text: '📊 تحلیل', callback_data: 'sym_' + w.symbol.replace('/', '') }]] });
          } else {
            remaining.push(w);
          }
        } catch (e) { remaining.push(w); }
      }
      await env.KV.put(key, JSON.stringify(remaining));
    }
  } catch (e) { console.error('Watchlist check error: ' + e.message); }
}

// ============================================
// CALLBACK HANDLER
// ============================================

async function handleCallback(token, chatId, messageId, data, env) {
  var twelveKey = env.TWELVE_KEY;
  var geminiKeys = getGeminiKeys(env);
  var geminiModel = env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  if (data === 'menu_main') { await showMainMenu(token, chatId, messageId); return; }
  if (data === 'menu_analyze') { await showSymbolMenu(token, chatId, messageId); return; }
  if (data === 'menu_mtf') { await showSymbolMenu(token, chatId, messageId); return; }
  if (data === 'menu_image') { await showImageGuide(token, chatId, messageId); return; }
  if (data === 'menu_journal') { await showJournalMenu(token, chatId, messageId, env); return; }
  if (data === 'menu_watch') { await showWatchMenu(token, chatId, messageId, env); return; }
  if (data === 'menu_settings') { await showSettingsMenu(token, chatId, messageId); return; }
  if (data === 'menu_status') { await showStatus(token, chatId, messageId, env); return; }
  if (data === 'menu_help') { await showHelp(token, chatId, messageId); return; }

  if (data === 'wizard_cancel') {
    await clearUserState(env, chatId);
    await sendOrEdit(token, chatId, messageId, '❌ لغو شد', {
      inline_keyboard: [[{ text: '🏠 منوی اصلی', callback_data: 'menu_main' }]]
    });
    return;
  }

  if (data === 'sym_custom') {
    await setUserState(env, chatId, { action: 'custom_symbol', step: 'input', data: {} });
    await sendOrEdit(token, chatId, messageId, '✏️ <b>نماد را تایپ کنید</b>',
      { inline_keyboard: [[{ text: '❌ لغو', callback_data: 'wizard_cancel' }]] });
    return;
  }

  if (data.indexOf('sym_') === 0) {
    var symbolRaw = data.replace('sym_', '');
    await showTimeframeMenu(token, chatId, messageId, symbolRaw);
    return;
  }

  if (data.indexOf('mtf_') === 0) {
    var symbolMTF = normalizeSymbol(data.replace('mtf_', ''));
    await runMultiTFAnalysis(token, chatId, symbolMTF, twelveKey, geminiKeys, geminiModel, env);
    return;
  }

  if (data.indexOf('tf_') === 0) {
    var rest = data.replace('tf_', '');
    var tfMatch = rest.match(/_([^_]+)$/);
    if (!tfMatch) return;
    var timeframe = tfMatch[1];
    var symbolRaw4 = rest.slice(0, -tfMatch[0].length);
    var symbol = normalizeSymbol(symbolRaw4);
    await runAnalysis(token, chatId, symbol, twelveKey, geminiKeys, geminiModel, timeframe, env);
    return;
  }

  if (data === 'journal_add') { await startJournalWizard(token, chatId, env); return; }
  if (data === 'journal_list') { await showJournalList(token, chatId, env); return; }
  if (data === 'journal_stats') { await showJournalStats(token, chatId, env); return; }
  if (data === 'journal_clear') {
    await saveJournal(env, chatId, []);
    await sendOrEdit(token, chatId, messageId, '🗑️ پاک شد', {
      inline_keyboard: [[{ text: '◀️ بازگشت', callback_data: 'menu_journal' }]]
    });
    return;
  }

  if (data.indexOf('wiz_dir_') === 0) {
    var state = await getUserState(env, chatId);
    if (!state || state.action !== 'journal_add') return;
    state.data.direction = data.replace('wiz_dir_', '');
    state.step = 'entry';
    await setUserState(env, chatId, state);
    await sendOrEdit(token, chatId, messageId, '📝 مرحله ۳/۵\n\n<b>قیمت ورود (Entry):</b>',
      { inline_keyboard: [[{ text: '❌ لغو', callback_data: 'wizard_cancel' }]] });
    return;
  }

  if (data === 'watch_add') { await startWatchWizard(token, chatId, env); return; }
  if (data === 'watch_list') { await showWatchList(token, chatId, env); return; }
  if (data === 'watch_clear') {
    await saveWatchlist(env, chatId, []);
    await sendOrEdit(token, chatId, messageId, '🗑️ پاک شد', {
      inline_keyboard: [[{ text: '◀️ بازگشت', callback_data: 'menu_watch' }]]
    });
    return;
  }

  if (data.indexOf('wiz_cond_') === 0) {
    var state2 = await getUserState(env, chatId);
    if (!state2 || state2.action !== 'watch_add') return;
    state2.data.condition = data.replace('wiz_cond_', '');
    state2.step = 'price';
    await setUserState(env, chatId, state2);
    await sendOrEdit(token, chatId, messageId, '🔔 مرحله ۳/۳\n\n<b>قیمت هدف:</b>',
      { inline_keyboard: [[{ text: '❌ لغو', callback_data: 'wizard_cancel' }]] });
    return;
  }

  if (data === 'settings_mode') {
    await sendOrEdit(token, chatId, messageId, '⚙️ حالت تحلیل:', modeMenu());
    return;
  }
  if (data.indexOf('mode_') === 0) {
    var mode = data.replace('mode_', '');
    await env.KV.put('mode:' + chatId, mode);
    await sendOrEdit(token, chatId, messageId, '✅ حالت: <b>' + mode + '</b>',
      { inline_keyboard: [[{ text: '◀️ بازگشت', callback_data: 'menu_settings' }]] });
    return;
  }
}

// ============================================
// MESSAGE HANDLER
// ============================================

async function handleUpdate(update, env) {
  var token = env.TG_TOKEN;
  var twelveKey = env.TWELVE_KEY;
  var geminiKeys = getGeminiKeys(env);
  var geminiModel = env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  if (update.message) {
    var chatId = update.message.chat.id;
    var text = (update.message.text || '').trim();

    // ⭐ چک کردن عکس
    if (update.message.photo && update.message.photo.length > 0) {
      // بزرگترین سایز عکس
      var largestPhoto = update.message.photo[update.message.photo.length - 1];
      await runImageAnalysis(token, chatId, largestPhoto.file_id, env);
      return;
    }

    // ⭐ چک کردن عکس به صورت فایل (document)
    if (update.message.document && update.message.document.mime_type && update.message.document.mime_type.indexOf('image/') === 0) {
      await runImageAnalysis(token, chatId, update.message.document.file_id, env);
      return;
    }

    // چک Wizard state
    var state = await getUserState(env, chatId);
    if (state) {
      if (state.action === 'journal_add') { await handleJournalWizard(token, chatId, text, env, state); return; }
      if (state.action === 'watch_add') { await handleWatchWizard(token, chatId, text, env, state); return; }
      if (state.action === 'custom_symbol') {
        var sym = normalizeSymbol(text);
        await clearUserState(env, chatId);
        await showTimeframeMenu(token, chatId, null, sym.replace('/', ''));
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
      var symTyped = normalizeSymbol(text);
      await showTimeframeMenu(token, chatId, null, symTyped.replace('/', ''));
      return;
    }

    await sendMessage(token, chatId, '❓ متوجه نشدم\n\n💡 می‌توانید عکس چارت هم بفرستید!', mainMenu());
  }

  if (update.callback_query) {
    var callback = update.callback_query;
    await answerCallback(token, callback.id);
    await handleCallback(token, callback.message.chat.id, callback.message.message_id, callback.data, env);
  }
}

export default {
  async fetch(request, env, ctx) {
    var url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '') {
      return new Response('Everest Bot is running', { status: 200 });
    }
    if (request.method === 'POST' && url.pathname === '/webhook') {
      try {
        var update = await request.json();
        ctx.waitUntil(handleUpdate(update, env));
      } catch (e) { console.error('Error: ' + e.message); }
      return new Response('OK', { status: 200 });
    }
    return new Response('Not found', { status: 404 });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(checkWatchlist(env));
  }
};
