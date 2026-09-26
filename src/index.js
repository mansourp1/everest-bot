const SYSTEM_PROMPT = "شما یک تحلیل‌گر ارشد بازارهای مالی با ۱۵ سال تجربه در SMC، ICT و پرایس اکشن هستید.\n\n" +
"**روش کار: تحلیل مرحله‌به‌مرحله**\n" +
"۱. استخراج داده خام\n" +
"۲. تشخیص رژیم بازار\n" +
"۳. شناسایی BOS، CHoCH و نواحی نقدینگی\n" +
"۴. کشف Order Blocks و FVG معتبر\n" +
"۵. بررسی الگوهای کندلی\n" +
"۶. امتیازدهی ۶ لایه هم‌گرایی\n" +
"۷. تصمیم نهایی\n\n" +
"**ساختار تحلیل:**\n" +
"### ۰. رژیم بازار\n" +
"### ۱. ساختار بازار\n" +
"### ۲. SMC\n" +
"### ۳. ICT\n" +
"### ۴. الگوهای کندلی\n" +
"### ۵. سطوح کلیدی\n" +
"### ۶. سناریو معاملاتی\n" +
"### ۷. امتیازدهی ۶ لایه\n" +
"### ۸. سناریوی مخالف\n" +
"### ۹. خلاصه اجرایی\n\n" +
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

// ⭐ MTF با ۴ تایم‌فریم
const MULTI_TF_PROMPT = "شما یک تحلیل‌گر ارشد بازارهای مالی با ۱۵ سال تجربه در SMC، ICT و پرایس اکشن هستید.\n\n" +
"**وظیفه: تحلیل Multi-Timeframe با ۴ تایم‌فریم**\n\n" +
"شما داده چهار تایم‌فریم دریافت می‌کنید:\n" +
"- HTF (4H): روند اصلی — جهت‌گیری کلی\n" +
"- MTF (1H): ساختار میانی — تأیید یا رد روند\n" +
"- LTF (15M): ستاپ معاملاتی — نواحی ورود\n" +
"- EntryTF (1M): نقطه ورود دقیق — تایمینگ نهایی\n\n" +
"**روش کار:**\n" +
"۱. جهت کلی از 4H استخراج شود\n" +
"۲. 1H و 15M برای تأیید ساختار بررسی شوند\n" +
"۳. نقطه ورود دقیق از 1M استخراج شود\n" +
"۴. Confluence Score از 0 تا 10 محاسبه کن\n" +
"۵. سیگنال معتبر فقط وقتی است که 3 از 4 تایم‌فریم هم‌جهت باشند\n" +
"۶. حد ضرر ساختاری از 15M یا 1H، و Entry دقیق از 1M\n\n" +
"**ساختار تحلیل:**\n" +
"### 📊 HTF (4H) — روند اصلی\n" +
"### 📊 MTF (1H) — ساختار میانی\n" +
"### 📊 LTF (15M) — ستاپ\n" +
"### 🎯 EntryTF (1M) — نقطه ورود دقیق\n" +
"### 🎯 هم‌گرایی (Confluence)\n" +
"### 💼 سناریو معاملاتی\n" +
"### ⚠️ سناریوی مخالف\n\n" +
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
"---\n\n" +
"**قوانین:**\n" +
"1. حداقل ۳ از ۴ تایم‌فریم باید هم‌جهت باشند\n" +
"2. Entry باید از تایم‌فریم 1M استخراج شود\n" +
"3. Stop Loss باید ساختاری باشد (از 15M یا 1H)\n" +
"4. R/R حداقل 1:2\n" +
"5. تحلیل کامل و مفصل بنویس";

// ============================================
// KV HELPERS
// ============================================

async function getJournal(env, chatId) {
  try {
    var data = await env.KV.get('journal:' + chatId, 'json');
    return data || [];
  } catch (e) {
    return [];
  }
}

async function saveJournal(env, chatId, journal) {
  await env.KV.put('journal:' + chatId, JSON.stringify(journal));
}

async function getWatchlist(env, chatId) {
  try {
    var data = await env.KV.get('watch:' + chatId, 'json');
    return data || [];
  } catch (e) {
    return [];
  }
}

async function saveWatchlist(env, chatId, watchlist) {
  await env.KV.put('watch:' + chatId, JSON.stringify(watchlist));
}

// ============================================
// PARSING FUNCTIONS
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
    var a = parseFloat(m[1]);
    var b = parseFloat(m[2]);
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
  var fm = text.match(/جهت\s*[\u0600-\u06FF\s]{0,40}[:=]\s*[^\n]{0,40}?(خرید|فروش)/im);
  if (fm) {
    if (fm[1] === 'خرید') return 'BUY';
    if (fm[1] === 'فروش') return 'SELL';
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
      tp1: jsonData.tp1 || null,
      tp2: jsonData.tp2 || null,
      tp3: jsonData.tp3 || null,
      rr: jsonData.rr || null,
      confluenceScore: jsonData.confluenceScore || null,
      htf: jsonData.htf4h || null,
      mtf: jsonData.mtf1h || null,
      ltf: jsonData.ltf15m || null,
      entryTf: jsonData.entrytf1m || null
    };
  }
  var blocks = rawText.match(/---\s*\n([\s\S]*?)\n\s*---/g);
  var text = rawText;
  if (blocks && blocks.length) {
    text = blocks[blocks.length - 1];
  }
  var regimeMatch = text.match(/Regime\s*[:=]\s*(TRENDING_UP|TRENDING_DOWN|RANGING|TRANSITIONAL)/i);
  var rrMatch = text.match(/R\/R\s*[:=]\s*([\d\.:]+)/i);
  var confMatch = text.match(/ConfluenceScore\s*[:=]\s*([\d\.]+)/i);
  var htfMatch = text.match(/HTF4H\s*[:=]\s*(BULLISH|BEARISH|RANGING)/i);
  var mtfMatch = text.match(/MTF1H\s*[:=]\s*(BULLISH|BEARISH|RANGING)/i);
  var ltfMatch = text.match(/LTF15M\s*[:=]\s*(BULLISH|BEARISH|RANGING)/i);
  var etfMatch = text.match(/EntryTF1M\s*[:=]\s*(BULLISH|BEARISH|RANGING)/i);
  return {
    direction: detectDirection(rawText),
    regime: regimeMatch ? regimeMatch[1].toUpperCase() : null,
    confidence: findValue(text, ['ConfidenceScore', 'امتیاز\\s*اطمینان']),
    entry: findValue(text, ['Entry', 'ورود']),
    sl: findValue(text, ['Stop[\\s-]?Loss', 'SL', 'حد\\s*ضرر']),
    tp1: findValue(text, ['TP\\s*1']),
    tp2: findValue(text, ['TP\\s*2']),
    tp3: findValue(text, ['TP\\s*3']),
    rr: rrMatch ? rrMatch[1] : null,
    confluenceScore: confMatch ? parseFloat(confMatch[1]) : null,
    htf: htfMatch ? htfMatch[1].toUpperCase() : null,
    mtf: mtfMatch ? mtfMatch[1].toUpperCase() : null,
    ltf: ltfMatch ? ltfMatch[1].toUpperCase() : null,
    entryTf: etfMatch ? etfMatch[1].toUpperCase() : null
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
    var entry = levels.entry;
    var sl = levels.sl;
    if (entry === null) {
      issues.push('Entry موجود نیست');
      levels.direction = 'WAIT';
    } else if (sl === null) {
      issues.push('Stop Loss موجود نیست');
      levels.direction = 'WAIT';
    } else {
      if (levels.direction === 'BUY' && sl >= entry) {
        issues.push('SL بالاتر از Entry در BUY');
        levels.direction = 'WAIT';
      }
      if (levels.direction === 'SELL' && sl <= entry) {
        issues.push('SL پایین‌تر از Entry در SELL');
        levels.direction = 'WAIT';
      }
    }
    if (levels.direction !== 'WAIT' && entry && sl && levels.tp1) {
      var risk = Math.abs(entry - sl);
      var reward = Math.abs(levels.tp1 - entry);
      var actualRR = risk > 0 ? reward / risk : 0;
      if (actualRR < 1.5) {
        issues.push('R/R ' + actualRR.toFixed(2) + ' کمتر از 1.5');
        levels.direction = 'WAIT';
      } else {
        levels.rr = '1:' + actualRR.toFixed(2);
      }
    }
  }
  levels.validationIssues = issues;
  return levels;
}

function klinesToText(klines, symbol, tfName) {
  if (!klines || !klines.length) return '';
  var last = klines[klines.length - 1];
  var recent = klines.slice(-40);
  var rows = recent.slice(-25).map(function(k) {
    var t = k.datetime ? k.datetime.slice(-8, -3) : '';
    return '  ' + t + ' | O:' + k.open + ' H:' + k.high + ' L:' + k.low + ' C:' + k.close;
  }).join('\n');
  return '=== ' + tfName + ' (' + symbol + ') ===\n' +
    'قیمت فعلی: ' + last.close + '\n\n' + rows;
}

function normalizeSymbol(sym) {
  if (!sym) return '';
  var cleaned = sym.trim().toUpperCase();
  if (cleaned.indexOf('/') !== -1) return cleaned;
  var match = cleaned.match(/^([A-Z]+)(USD|EUR|GBP|JPY|CHF|AUD|CAD|NZD)$/);
  if (match) return match[1] + '/' + match[2];
  return cleaned;
}

function looksLikeSymbol(text) {
  if (!text) return false;
  var cleaned = text.trim();
  return /^[A-Za-z]{2,10}(\/[A-Za-z]{2,10})?$/.test(cleaned);
}

function timeframeLabel(tf) {
  var labels = {
    '1min': '1 دقیقه',
    '3min': '3 دقیقه',
    '5min': '5 دقیقه',
    '15min': '15 دقیقه',
    '1h': '1 ساعت',
    '4h': '4 ساعت'
  };
  return labels[tf] || tf;
}

function regimeLabel(r) {
  var labels = {
    TRENDING_UP: '📈 روند صعودی',
    TRENDING_DOWN: '📉 روند نزولی',
    RANGING: '↔️ رنج',
    TRANSITIONAL: '🔄 گذار'
  };
  return labels[r] || '';
}

function directionEmoji(d) {
  if (d === 'BULLISH' || d === 'BUY' || d === 'LONG') return '🟢 صعودی';
  if (d === 'BEARISH' || d === 'SELL' || d === 'SHORT') return '🔴 نزولی';
  if (d === 'RANGING' || d === 'WAIT') return '⚪️ رنج';
  return d || '—';
}

function buildCaption(levels, symbol, timeframe) {
  var c = '<b>📊 تحلیل چارت</b>\n\n';
  c += '<b>نماد:</b> ' + symbol + '\n';
  c += '<b>تایم‌فریم:</b> ' + timeframeLabel(timeframe) + '\n\n';
  var direction = levels.direction || 'WAIT';
  var dirText = direction === 'BUY' ? '🟢 خرید' : direction === 'SELL' ? '🔴 فروش' : '⏸️ انتظار';
  c += '<b>جهت:</b> ' + dirText + '\n';
  if (levels.regime) c += '<b>رژیم:</b> ' + regimeLabel(levels.regime) + '\n';
  if (levels.confidence !== null && levels.confidence !== undefined) {
    c += '<b>اطمینان:</b> ' + levels.confidence + '%\n';
  }
  c += '\n';
  if (direction === 'WAIT') {
    c += '<i>ستاپ معتبری شناسایی نشد.</i>\n';
  } else {
    if (levels.entry) c += '<b>🎯 ورود:</b> <code>' + levels.entry + '</code>\n';
    if (levels.sl) c += '<b>🛑 SL:</b> <code>' + levels.sl + '</code>\n';
    if (levels.tp1) c += '<b>✅ TP1:</b> <code>' + levels.tp1 + '</code>\n';
    if (levels.tp2) c += '<b>✅ TP2:</b> <code>' + levels.tp2 + '</code>\n';
    if (levels.tp3) c += '<b>✅ TP3:</b> <code>' + levels.tp3 + '</code>\n';
    if (levels.rr) c += '<b>⚖️ R/R:</b> <code>' + levels.rr + '</code>\n';
  }
  if (levels.validationIssues && levels.validationIssues.length) {
    c += '\n<b>⚠️ اعتبارسنجی:</b>\n';
    levels.validationIssues.slice(0, 3).forEach(function(iss) {
      c += '• ' + iss + '\n';
    });
  }
  return c;
}

function buildMultiTFCaption(levels, symbol) {
  var c = '<b>🎯 تحلیل Multi-Timeframe</b>\n\n';
  c += '<b>نماد:</b> ' + symbol + '\n\n';
  if (levels.htf || levels.mtf || levels.ltf || levels.entryTf) {
    c += '<b>📊 تحلیل تایم‌فریم‌ها:</b>\n';
    c += '• 4H (روند): ' + directionEmoji(levels.htf) + '\n';
    c += '• 1H (ساختار): ' + directionEmoji(levels.mtf) + '\n';
    c += '• 15M (ستاپ): ' + directionEmoji(levels.ltf) + '\n';
    c += '• 1M (ورود): ' + directionEmoji(levels.entryTf) + '\n\n';
  }
  if (levels.confluenceScore !== null && levels.confluenceScore !== undefined) {
    var score = levels.confluenceScore;
    var scoreEmoji = score >= 8 ? '🔥' : score >= 6 ? '✅' : score >= 4 ? '⚠️' : '❌';
    c += '<b>هم‌گرایی:</b> ' + scoreEmoji + ' <b>' + score + '/10</b>\n\n';
  }
  var direction = levels.direction || 'WAIT';
  var dirText = direction === 'BUY' ? '🟢 خرید' : direction === 'SELL' ? '🔴 فروش' : '⏸️ انتظار';
  c += '<b>جهت نهایی:</b> ' + dirText + '\n';
  if (levels.confidence !== null && levels.confidence !== undefined) {
    c += '<b>اطمینان:</b> ' + levels.confidence + '%\n';
  }
  c += '\n';
  if (direction === 'WAIT') {
    c += '<i>تایم‌فریم‌ها هم‌جهت نیستند.</i>\n';
  } else {
    if (levels.entry) c += '<b>🎯 ورود:</b> <code>' + levels.entry + '</code>\n';
    if (levels.sl) c += '<b>🛑 SL:</b> <code>' + levels.sl + '</code>\n';
    if (levels.tp1) c += '<b>✅ TP1:</b> <code>' + levels.tp1 + '</code>\n';
    if (levels.tp2) c += '<b>✅ TP2:</b> <code>' + levels.tp2 + '</code>\n';
    if (levels.tp3) c += '<b>✅ TP3:</b> <code>' + levels.tp3 + '</code>\n';
    if (levels.rr) c += '<b>⚖️ R/R:</b> <code>' + levels.rr + '</code>\n';
  }
  if (levels.validationIssues && levels.validationIssues.length) {
    c += '\n<b>⚠️ اعتبارسنجی:</b>\n';
    levels.validationIssues.slice(0, 3).forEach(function(iss) {
      c += '• ' + iss + '\n';
    });
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
// CHART IMAGE
// ============================================

async function buildChartImage(symbol, timeframe, levels, env) {
  if (!env.CHART_IMG_KEY) throw new Error('CHART_IMG_KEY تنظیم نشده');

  var symUpper = symbol.toUpperCase().replace('/', '');
  var exchange = 'OANDA';
  if (symUpper === 'BTCUSD' || symUpper === 'ETHUSD' || symUpper.includes('USDT')) {
    exchange = 'BINANCE';
  } else if (symUpper === 'AAPL' || symUpper === 'MSFT' || symUpper === 'TSLA' || symUpper === 'GOOGL') {
    exchange = 'NASDAQ';
  }

  var intervalMap = {
    '1min': '1m', '3min': '3m', '5min': '5m',
    '15min': '15m', '1h': '1h', '4h': '4h'
  };
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
    symbol: exchange + ':' + symUpper,
    interval: chartInterval,
    theme: 'dark',
    width: 800,
    height: 600,
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
// TELEGRAM API
// ============================================

async function sendMessage(token, chatId, text, keyboard) {
  var url = 'https://api.telegram.org/bot' + token + '/sendMessage';
  var payload = {
    chat_id: chatId,
    text: text.slice(0, 4000),
    parse_mode: 'HTML',
    disable_web_page_preview: true
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
  var res = await fetch('https://api.telegram.org/bot' + token + '/sendPhoto', {
    method: 'POST',
    body: formData
  });
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
          generationConfig: { temperature: 0.2, topP: 0.9, maxOutputTokens: 12288 }
        })
      });
      var data = await res.json();
      if (res.ok) {
        var text = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
        if (text) return text;
      }
      lastError = (data.error && data.error.message) || ('HTTP ' + res.status);
      if (res.status === 429 || res.status === 503 || res.status === 500) continue;
      if (res.status === 401 || res.status === 403 || res.status === 400) continue;
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
// JOURNAL COMMANDS
// ============================================

async function handleJournalCommand(token, chatId, args, env) {
  var sub = (args[0] || '').toLowerCase();
  var journal = await getJournal(env, chatId);

  // /journal (بدون زیردستور)
  if (!sub || sub === 'help') {
    await sendMessage(token, chatId,
      '<b>📓 ژورنال معاملات</b>\n\n' +
      '<b>ثبت معامله جدید:</b>\n' +
      '<code>/journal add XAUUSD BUY 2650 2642 2665</code>\n' +
      '(نماد، جهت، ورود، SL، TP)\n\n' +
      '<b>ثبت نتیجه:</b>\n' +
      '<code>/journal win 1</code>\n' +
      '<code>/journal loss 1</code>\n' +
      '(شماره معامله از لیست)\n\n' +
      '<b>مشاهده:</b>\n' +
      '<code>/journal list</code> — لیست معاملات\n' +
      '<code>/journal stats</code> — آمار عملکرد\n' +
      '<code>/journal clear</code> — پاک کردن همه'
    );
    return;
  }

  if (sub === 'add') {
    if (args.length < 6) {
      await sendMessage(token, chatId, '❌ فرمت: <code>/journal add SYMBOL DIRECTION ENTRY SL TP</code>');
      return;
    }
    var symbol = normalizeSymbol(args[1]);
    var direction = args[2].toUpperCase();
    var entry = parseFloat(args[3]);
    var sl = parseFloat(args[4]);
    var tp = parseFloat(args[5]);

    if (direction !== 'BUY' && direction !== 'SELL') {
      await sendMessage(token, chatId, '❌ جهت باید BUY یا SELL باشد');
      return;
    }
    if (isNaN(entry) || isNaN(sl) || isNaN(tp)) {
      await sendMessage(token, chatId, '❌ اعداد نامعتبر');
      return;
    }

    journal.push({
      id: journal.length + 1,
      symbol: symbol,
      direction: direction,
      entry: entry,
      sl: sl,
      tp: tp,
      ts: Date.now(),
      result: null
    });
    await saveJournal(env, chatId, journal);

    var rr = Math.abs(tp - entry) / Math.abs(entry - sl);
    await sendMessage(token, chatId,
      '✅ <b>معامله ثبت شد</b>\n\n' +
      '📌 شماره: <b>#' + journal.length + '</b>\n' +
      '🔹 نماد: ' + symbol + '\n' +
      '🔹 جهت: ' + (direction === 'BUY' ? '🟢 خرید' : '🔴 فروش') + '\n' +
      '🔹 ورود: <code>' + entry + '</code>\n' +
      '🔹 SL: <code>' + sl + '</code>\n' +
      '🔹 TP: <code>' + tp + '</code>\n' +
      '🔹 R/R: 1:' + rr.toFixed(2)
    );
    return;
  }

  if (sub === 'win' || sub === 'loss') {
    if (args.length < 2) {
      await sendMessage(token, chatId, '❌ فرمت: <code>/journal ' + sub + ' ID</code>');
      return;
    }
    var tradeId = parseInt(args[1]);
    var found = null;
    for (var i = 0; i < journal.length; i++) {
      if (journal[i].id === tradeId) {
        found = journal[i];
        journal[i].result = sub;
        break;
      }
    }
    if (!found) {
      await sendMessage(token, chatId, '❌ معامله با شماره ' + tradeId + ' پیدا نشد');
      return;
    }
    await saveJournal(env, chatId, journal);
    await sendMessage(token, chatId,
      (sub === 'win' ? '🎉' : '😢') + ' <b>نتیجه ثبت شد</b>\n\n' +
      'معامله #' + tradeId + ' → ' + (sub === 'win' ? 'سود ✅' : 'ضرر ❌')
    );
    return;
  }

  if (sub === 'list') {
    if (!journal.length) {
      await sendMessage(token, chatId, '📓 ژورنال خالی است');
      return;
    }
    var text = '<b>📓 لیست معاملات</b>\n\n';
    for (var j = 0; j < Math.min(journal.length, 20); j++) {
      var t = journal[j];
      var status = t.result === 'win' ? '✅' : t.result === 'loss' ? '❌' : '⏳';
      text += status + ' <b>#' + t.id + '</b> ' + t.symbol + ' ' + t.direction + '\n';
      text += '   E: <code>' + t.entry + '</code> SL: <code>' + t.sl + '</code> TP: <code>' + t.tp + '</code>\n\n';
    }
    if (journal.length > 20) text += '... (' + (journal.length - 20) + ' معامله دیگر)\n';
    await sendMessage(token, chatId, text);
    return;
  }

  if (sub === 'stats') {
    if (!journal.length) {
      await sendMessage(token, chatId, '📓 هنوز معامله‌ای ثبت نشده');
      return;
    }
    var wins = 0, losses = 0, pending = 0;
    var symbolStats = {};
    var totalRR = 0, rrCount = 0;

    for (var k = 0; k < journal.length; k++) {
      var tr = journal[k];
      if (tr.result === 'win') wins++;
      else if (tr.result === 'loss') losses++;
      else pending++;

      if (tr.result === 'win' || tr.result === 'loss') {
        if (!symbolStats[tr.symbol]) symbolStats[tr.symbol] = { win: 0, loss: 0 };
        if (tr.result === 'win') symbolStats[tr.symbol].win++;
        else symbolStats[tr.symbol].loss++;
      }

      var r = Math.abs(tr.tp - tr.entry) / Math.abs(tr.entry - tr.sl);
      if (!isNaN(r) && isFinite(r)) { totalRR += r; rrCount++; }
    }

    var closed = wins + losses;
    var winRate = closed > 0 ? (wins / closed * 100).toFixed(1) : '0';
    var avgRR = rrCount > 0 ? (totalRR / rrCount).toFixed(2) : '0';

    var text = '<b>📊 آمار عملکرد</b>\n\n';
    text += '📈 کل معاملات: <b>' + journal.length + '</b>\n';
    text += '✅ برد: <b>' + wins + '</b>\n';
    text += '❌ باخت: <b>' + losses + '</b>\n';
    text += '⏳ در انتظار: <b>' + pending + '</b>\n\n';
    text += '🎯 نرخ برد: <b>' + winRate + '%</b>\n';
    text += '⚖️ میانگین R/R: <b>1:' + avgRR + '</b>\n\n';

    var bestSymbol = null, bestRate = -1;
    for (var s in symbolStats) {
      var total = symbolStats[s].win + symbolStats[s].loss;
      var rate = total > 0 ? symbolStats[s].win / total : 0;
      if (rate > bestRate && total >= 2) {
        bestRate = rate;
        bestSymbol = s + ' (' + (rate * 100).toFixed(0) + '%)';
      }
    }
    if (bestSymbol) text += '🏆 بهترین نماد: <b>' + bestSymbol + '</b>\n';

    await sendMessage(token, chatId, text);
    return;
  }

  if (sub === 'clear') {
    await saveJournal(env, chatId, []);
    await sendMessage(token, chatId, '🗑️ ژورنال پاک شد');
    return;
  }

  await sendMessage(token, chatId, '❓ زیردستور نامعتبر. /journal help را بزن');
}

// ============================================
// WATCHLIST COMMANDS
// ============================================

async function handleWatchCommand(token, chatId, args, env) {
  var sub = (args[0] || '').toLowerCase();
  var watchlist = await getWatchlist(env, chatId);

  if (!sub || sub === 'help') {
    await sendMessage(token, chatId,
      '<b>🔔 هشدار قیمتی</b>\n\n' +
      '<b>تنظیم هشدار:</b>\n' +
      '<code>/watch add XAUUSD above 2660</code>\n' +
      '<code>/watch add EURUSD below 1.0800</code>\n' +
      '(فقط above یا below)\n\n' +
      '<b>مدیریت:</b>\n' +
      '<code>/watch list</code> — لیست هشدارها\n' +
      '<code>/watch remove ID</code> — حذف\n' +
      '<code>/watch clear</code> — پاک کردن همه\n\n' +
      '⏱️ بررسی خودکار هر ۵ دقیقه'
    );
    return;
  }

  if (sub === 'add') {
    if (args.length < 4) {
      await sendMessage(token, chatId, '❌ فرمت: <code>/watch add SYMBOL above/below PRICE</code>');
      return;
    }
    var symbol = normalizeSymbol(args[1]);
    var condition = args[2].toLowerCase();
    var targetPrice = parseFloat(args[3]);

    if (condition !== 'above' && condition !== 'below') {
      await sendMessage(token, chatId, '❌ شرط باید above یا below باشد');
      return;
    }
    if (isNaN(targetPrice)) {
      await sendMessage(token, chatId, '❌ قیمت نامعتبر');
      return;
    }

    watchlist.push({
      id: watchlist.length > 0 ? Math.max.apply(null, watchlist.map(function(w) { return w.id; })) + 1 : 1,
      symbol: symbol,
      condition: condition,
      price: targetPrice,
      ts: Date.now()
    });
    await saveWatchlist(env, chatId, watchlist);

    await sendMessage(token, chatId,
      '🔔 <b>هشدار ثبت شد</b>\n\n' +
      'نماد: ' + symbol + '\n' +
      'شرط: ' + (condition === 'above' ? 'بالاتر از' : 'پایین‌تر از') + ' <code>' + targetPrice + '</code>'
    );
    return;
  }

  if (sub === 'list') {
    if (!watchlist.length) {
      await sendMessage(token, chatId, '🔔 هیچ هشداری تنظیم نشده');
      return;
    }
    var text = '<b>🔔 لیست هشدارها</b>\n\n';
    for (var i = 0; i < watchlist.length; i++) {
      var w = watchlist[i];
      text += '#' + w.id + ' ' + w.symbol + ' — ' +
              (w.condition === 'above' ? '⬆️ بالای' : '⬇️ زیر') +
              ' <code>' + w.price + '</code>\n';
    }
    await sendMessage(token, chatId, text);
    return;
  }

  if (sub === 'remove') {
    if (args.length < 2) {
      await sendMessage(token, chatId, '❌ فرمت: <code>/watch remove ID</code>');
      return;
    }
    var removeId = parseInt(args[1]);
    var newList = watchlist.filter(function(w) { return w.id !== removeId; });
    if (newList.length === watchlist.length) {
      await sendMessage(token, chatId, '❌ هشدار با شماره ' + removeId + ' پیدا نشد');
      return;
    }
    await saveWatchlist(env, chatId, newList);
    await sendMessage(token, chatId, '✅ هشدار #' + removeId + ' حذف شد');
    return;
  }

  if (sub === 'clear') {
    await saveWatchlist(env, chatId, []);
    await sendMessage(token, chatId, '🗑️ همه هشدارها پاک شدند');
    return;
  }

  await sendMessage(token, chatId, '❓ زیردستور نامعتبر. /watch help را بزن');
}

// ============================================
// WATCHLIST CHECKER (Cron)
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
          var triggered = false;
          if (w.condition === 'above' && price >= w.price) triggered = true;
          if (w.condition === 'below' && price <= w.price) triggered = true;

          if (triggered) {
            await sendMessage(token, chatId,
              '🔔 <b>هشدار فعال شد!</b>\n\n' +
              '📌 نماد: <b>' + w.symbol + '</b>\n' +
              '🎯 شرط: ' + (w.condition === 'above' ? 'بالای' : 'زیر') + ' <code>' + w.price + '</code>\n' +
              '💰 قیمت فعلی: <code>' + price + '</code>\n\n' +
              '📊 برای تحلیل کامل: <code>' + w.symbol + '</code> را تایپ کنید'
            );
          } else {
            remaining.push(w);
          }
        } catch (e) {
          remaining.push(w);
        }
      }
      await env.KV.put(key, JSON.stringify(remaining));
    }
  } catch (e) {
    console.error('Watchlist check error: ' + e.message);
  }
}

// ============================================
// ANALYSIS FUNCTIONS
// ============================================

async function runAnalysis(token, chatId, symbol, twelveKey, geminiKeys, geminiModel, timeframe, env) {
  timeframe = timeframe || '1h';
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
    } catch (chartErr) {
      console.error('Chart error: ' + chartErr.message);
    }

    var caption = buildCaption(levels, symbol, timeframe);
    await sendMessage(token, chatId, caption);
    var fullText = tgFormat(analysisText);
    if (fullText.length > 100) {
      for (var i = 0; i < fullText.length; i += 3800) {
        await sendMessage(token, chatId, fullText.slice(i, i + 3800));
      }
    }
  } catch (e) {
    await sendMessage(token, chatId, '❌ خطا: <code>' + e.message + '</code>');
  }
}

async function runMultiTFAnalysis(token, chatId, symbol, twelveKey, geminiKeys, geminiModel, env) {
  try {
    await sendMessage(token, chatId,
      '🎯 در حال تحلیل Multi-Timeframe <b>' + symbol + '</b>\n\n' +
      '📊 4H + 1H + 15M + 1M\n' +
      '⏳ کمی طول می‌کشه...'
    );

    var klines4H = await fetchTwelveData(symbol, '4h', twelveKey, 150);
    var klines1H = await fetchTwelveData(symbol, '1h', twelveKey, 150);
    var klines15M = await fetchTwelveData(symbol, '15min', twelveKey, 150);
    var klines1M = await fetchTwelveData(symbol, '1min', twelveKey, 150);

    var fullPrompt = 'نماد: ' + symbol + '\n\n';
    fullPrompt += '🔹 HTF (4H):\n' + klinesToText(klines4H, symbol, '4H') + '\n\n';
    fullPrompt += '🔹 MTF (1H):\n' + klinesToText(klines1H, symbol, '1H') + '\n\n';
    fullPrompt += '🔹 LTF (15M):\n' + klinesToText(klines15M, symbol, '15M') + '\n\n';
    fullPrompt += '🔹 EntryTF (1M):\n' + klinesToText(klines1M, symbol, '1M') + '\n\n';
    fullPrompt += 'لطفاً تحلیل MTF انجام بده.';

    var analysisText = await callGemini(geminiKeys, MULTI_TF_PROMPT + '\n\n' + fullPrompt, geminiModel);
    var levels = extractLevels(analysisText);
    levels = validateSignal(levels);

    try {
      var chartBuffer = await buildChartImage(symbol, '15min', levels, env);
      await sendPhotoBytes(token, chatId, chartBuffer, '📊 ' + symbol + ' - MTF');
    } catch (chartErr) {
      console.error('Chart error: ' + chartErr.message);
    }

    await sendMessage(token, chatId, buildMultiTFCaption(levels, symbol));
    var fullText = tgFormat(analysisText);
    if (fullText.length > 100) {
      for (var i = 0; i < fullText.length; i += 3800) {
        await sendMessage(token, chatId, fullText.slice(i, i + 3800));
      }
    }
  } catch (e) {
    await sendMessage(token, chatId, '❌ خطا MTF: <code>' + e.message + '</code>');
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

    if (text === '/start') {
      await sendMessage(token, chatId,
        '🎯 <b>Everest AI Terminal</b>\n\n' +
        '<b>دستورات:</b>\n' +
        '• /analyze — منوی تحلیل\n' +
        '• /journal — ژورنال معاملات\n' +
        '• /watch — هشدار قیمتی\n' +
        '• /status — وضعیت\n' +
        '• /help — راهنما\n\n' +
        '💡 می‌توانید مستقیم نماد را تایپ کنید'
      );
      return;
    }
    if (text === '/help') {
      await sendMessage(token, chatId,
        '📖 <b>راهنما</b>\n\n' +
        '<b>تحلیل:</b>\n' +
        '• /analyze — منوی نماد\n' +
        '• تایپ مستقیم نماد (مثل XAUUSD)\n\n' +
        '<b>ژورنال:</b> /journal help\n' +
        '<b>هشدار:</b> /watch help'
      );
      return;
    }
    if (text === '/status') {
      var geminiOk = geminiKeys.length > 0 ? '✅ (' + geminiKeys.length + ')' : '❌';
      var twelveOk = twelveKey ? '✅' : '❌';
      var chartOk = env.CHART_IMG_KEY ? '✅' : '❌';
      var kvOk = env.KV ? '✅' : '❌';
      await sendMessage(token, chatId,
        '🤖 وضعیت:\n\n' +
        '• Gemini: ' + geminiOk + '\n' +
        '• TwelveData: ' + twelveOk + '\n' +
        '• Chart-Img: ' + chartOk + '\n' +
        '• KV (Storage): ' + kvOk + '\n' +
        '• Telegram: ✅'
      );
      return;
    }

    // ژورنال
    if (text.indexOf('/journal') === 0) {
      var jArgs = text.split(/\s+/).slice(1);
      await handleJournalCommand(token, chatId, jArgs, env);
      return;
    }

    // Watchlist
    if (text.indexOf('/watch') === 0) {
      var wArgs = text.split(/\s+/).slice(1);
      await handleWatchCommand(token, chatId, wArgs, env);
      return;
    }

    if (text === '/analyze') {
      var keyboard = {
        inline_keyboard: [
          [
            { text: '🥇 XAU/USD', callback_data: 'symbol_XAUUSD' },
            { text: '💶 EUR/USD', callback_data: 'symbol_EURUSD' }
          ],
          [
            { text: '₿ BTC/USD', callback_data: 'symbol_BTCUSD' },
            { text: '💷 GBP/USD', callback_data: 'symbol_GBPUSD' }
          ],
          [
            { text: '✏️ نماد دیگر', callback_data: 'custom_symbol' }
          ]
        ]
      };
      await sendMessage(token, chatId, '🎯 نماد را انتخاب کنید:', keyboard);
      return;
    }
    if (text.indexOf('/analyze ') === 0) {
      var parts = text.replace('/analyze ', '').trim().split(/\s+/);
      var sym1 = normalizeSymbol(parts[0]);
      var symbolRaw1 = sym1.replace('/', '');
      var keyboard1 = {
        inline_keyboard: [
          [{ text: '🎯 تحلیل MTF (4H+1H+15M+1M)', callback_data: 'mtf_' + symbolRaw1 }],
          [
            { text: '⏱️ 1 دقیقه', callback_data: 'tf_' + symbolRaw1 + '_1min' },
            { text: '⏱️ 3 دقیقه', callback_data: 'tf_' + symbolRaw1 + '_3min' }
          ],
          [
            { text: '⏱️ 5 دقیقه', callback_data: 'tf_' + symbolRaw1 + '_5min' },
            { text: '⏱️ 15 دقیقه', callback_data: 'tf_' + symbolRaw1 + '_15min' }
          ],
          [
            { text: '🕐 1 ساعت', callback_data: 'tf_' + symbolRaw1 + '_1h' },
            { text: '📅 4 ساعت', callback_data: 'tf_' + symbolRaw1 + '_4h' }
          ]
        ]
      };
      await sendMessage(token, chatId, '⏰ روش تحلیل ' + sym1 + ' را انتخاب کنید:', keyboard1);
      return;
    }
    if (text && text.charAt(0) !== '/' && looksLikeSymbol(text)) {
      var sym2 = normalizeSymbol(text);
      var symbolRaw2 = sym2.replace('/', '');
      var keyboard2 = {
        inline_keyboard: [
          [{ text: '🎯 تحلیل MTF (4H+1H+15M+1M)', callback_data: 'mtf_' + symbolRaw2 }],
          [
            { text: '⏱️ 1 دقیقه', callback_data: 'tf_' + symbolRaw2 + '_1min' },
            { text: '⏱️ 3 دقیقه', callback_data: 'tf_' + symbolRaw2 + '_3min' }
          ],
          [
            { text: '⏱️ 5 دقیقه', callback_data: 'tf_' + symbolRaw2 + '_5min' },
            { text: '⏱️ 15 دقیقه', callback_data: 'tf_' + symbolRaw2 + '_15min' }
          ],
          [
            { text: '🕐 1 ساعت', callback_data: 'tf_' + symbolRaw2 + '_1h' },
            { text: '📅 4 ساعت', callback_data: 'tf_' + symbolRaw2 + '_4h' }
          ]
        ]
      };
      await sendMessage(token, chatId, '✅ نماد: <b>' + sym2 + '</b>\n\n⏰ روش تحلیل را انتخاب کنید:', keyboard2);
      return;
    }
    if (text) {
      await sendMessage(token, chatId, '❓ متوجه نشدم.\n\n/analyze یا /help');
      return;
    }
  }

  if (update.callback_query) {
    var callback = update.callback_query;
    var cbChatId = callback.message.chat.id;
    var data = callback.data;
    await answerCallback(token, callback.id);

    if (data === 'custom_symbol') {
      await sendMessage(token, cbChatId, '✏️ نماد را تایپ کنید:\n\nمثال: GBPJPY, ETH/USD, AAPL');
      return;
    }
    if (data.indexOf('symbol_') === 0) {
      var symbolRaw3 = data.replace('symbol_', '');
      var symbolDisplay = normalizeSymbol(symbolRaw3);
      var keyboard3 = {
        inline_keyboard: [
          [{ text: '🎯 تحلیل MTF (4H+1H+15M+1M)', callback_data: 'mtf_' + symbolRaw3 }],
          [
            { text: '⏱️ 1 دقیقه', callback_data: 'tf_' + symbolRaw3 + '_1min' },
            { text: '⏱️ 3 دقیقه', callback_data: 'tf_' + symbolRaw3 + '_3min' }
          ],
          [
            { text: '⏱️ 5 دقیقه', callback_data: 'tf_' + symbolRaw3 + '_5min' },
            { text: '⏱️ 15 دقیقه', callback_data: 'tf_' + symbolRaw3 + '_15min' }
          ],
          [
            { text: '🕐 1 ساعت', callback_data: 'tf_' + symbolRaw3 + '_1h' },
            { text: '📅 4 ساعت', callback_data: 'tf_' + symbolRaw3 + '_4h' }
          ]
        ]
      };
      await sendMessage(token, cbChatId, '⏰ روش تحلیل ' + symbolDisplay + ' را انتخاب کنید:', keyboard3);
      return;
    }
    if (data.indexOf('mtf_') === 0) {
      var symbolMTF = normalizeSymbol(data.replace('mtf_', ''));
      await runMultiTFAnalysis(token, cbChatId, symbolMTF, twelveKey, geminiKeys, geminiModel, env);
      return;
    }
    if (data.indexOf('tf_') === 0) {
      var rest = data.replace('tf_', '');
      var tfMatch = rest.match(/_([^_]+)$/);
      if (!tfMatch) return;
      var timeframe = tfMatch[1];
      var symbolRaw4 = rest.slice(0, -tfMatch[0].length);
      var symbol = normalizeSymbol(symbolRaw4);
      await runAnalysis(token, cbChatId, symbol, twelveKey, geminiKeys, geminiModel, timeframe, env);
      return;
    }
  }
}

// ============================================
// EXPORT
// ============================================

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
      } catch (e) {
        console.error('Error: ' + e.message);
      }
      return new Response('OK', { status: 200 });
    }
    return new Response('Not found', { status: 404 });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(checkWatchlist(env));
  }
};
