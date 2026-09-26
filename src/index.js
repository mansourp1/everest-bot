const SYSTEM_PROMPT = "شما یک تحلیل‌گر ارشد بازارهای مالی با ۱۵ سال تجربه در SMC، ICT و پرایس اکشن هستید.\n\n" +
"**روش کار: تحلیل مرحله‌به‌مرحله**\n" +
"۱. استخراج داده خام\n" +
"۲. تشخیص رژیم بازار\n" +
"۳. شناسایی BOS، CHoCH و نواحی نقدینگی\n" +
"۴. کشف Order Blocks و FVG معتبر\n" +
"۵. بررسی الگوهای کندلی\n" +
"۶. امتیازدهی ۶ لایه هم‌گرایی\n" +
"۷. تصمیم نهایی\n\n" +
"**ساختار تحلیل — حتماً همه بخش‌ها را با جزئیات کامل بنویس:**\n\n" +
"### ۰. رژیم بازار (Trending/Ranging/Transitional)\n" +
"### ۱. ساختار بازار (BOS، CHoCH، Retest، نقدینگی)\n" +
"### ۲. SMC (Order Blocks، FVG، Premium/Discount)\n" +
"### ۳. ICT (ساختار داخلی، OTE)\n" +
"### ۴. الگوهای کندلی\n" +
"### ۵. سطوح کلیدی R1/R2/R3، S1/S2/S3\n" +
"### ۶. سناریو معاملاتی با حد ضرر ساختاری\n" +
"### ۷. امتیازدهی ۶ لایه (0-100)\n" +
"### ۸. سناریوی مخالف\n" +
"### ۹. خلاصه اجرایی\n\n" +
"**در انتهای پاسخ دقیقاً این فرمت را بنویس:**\n\n" +
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
"5. تحلیل کامل و مفصل بنویس، حداقل ۵۰۰ کلمه";

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
      rr: jsonData.rr || null
    };
  }
  var blocks = rawText.match(/---\s*\n([\s\S]*?)\n\s*---/g);
  var text = rawText;
  if (blocks && blocks.length) {
    text = blocks[blocks.length - 1];
  }
  var regimeMatch = text.match(/Regime\s*[:=]\s*(TRENDING_UP|TRENDING_DOWN|RANGING|TRANSITIONAL)/i);
  var rrMatch = text.match(/R\/R\s*[:=]\s*([\d\.:]+)/i);
  return {
    direction: detectDirection(rawText),
    regime: regimeMatch ? regimeMatch[1].toUpperCase() : null,
    confidence: findValue(text, ['ConfidenceScore', 'امتیاز\\s*اطمینان']),
    entry: findValue(text, ['Entry', 'ورود']),
    sl: findValue(text, ['Stop[\\s-]?Loss', 'SL', 'حد\\s*ضرر']),
    tp1: findValue(text, ['TP\\s*1']),
    tp2: findValue(text, ['TP\\s*2']),
    tp3: findValue(text, ['TP\\s*3']),
    rr: rrMatch ? rrMatch[1] : null
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

function tgFormat(text) {
  var cleaned = text.replace(/```json[\s\S]*?```/gi, '');
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  var h = cleaned.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  h = h.replace(/^#{1,4}\s*(.+)$/gm, '\n━━━━━━━━━━━━━━━\n📌 <b>$1</b>\n━━━━━━━━━━━━━━━');
  h = h.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  h = h.replace(/\n{3,}/g, '\n\n');
  return h.trim();
}

// دریافت عکس چارت از Chart-Img (env به عنوان پارامتر)
async function buildChartImage(symbol, timeframe, env) {
  if (!env.CHART_IMG_KEY) {
    throw new Error('CHART_IMG_KEY تنظیم نشده');
  }

  // ۱. تعیین صرافی مناسب بر اساس نوع نماد
  var symUpper = symbol.toUpperCase().replace('/', '');
  var exchange = 'OANDA'; // پیش‌فرض برای فارکس و طلا

  if (symUpper === 'BTCUSD' || symUpper === 'ETHUSD' || symUpper.includes('USDT')) {
    exchange = 'BINANCE';
  } else if (symUpper === 'AAPL' || symUpper === 'MSFT' || symUpper === 'TSLA' || symUpper === 'GOOGL') {
    exchange = 'NASDAQ';
  }

  // ۲. نگاشت تایم‌فریم
  var intervalMap = {
    '1min': '1',
    '3min': '3',
    '5min': '5',
    '15min': '15',
    '1h': '60',
    '4h': '240'
  };
  var chartInterval = intervalMap[timeframe] || '60';

  // ۳. ساخت آدرس به صورت رشته‌ای (نه با new URL)
  var apiUrl = 'https://api.chart-img.com/v2/tradingview/advanced-chart';

  // ۴. بدنه درخواست (JSON)
  var requestBody = {
    symbol: exchange + ':' + symUpper,
    interval: chartInterval,
    theme: 'dark',
    width: 1000,
    height: 600,
    studies: [
      { name: 'Volume', forceOverlay: true },
      { name: 'MACD' },
      { name: 'RSI' }
    ]
  };

  // ۵. ارسال درخواست POST
  var res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'x-api-key': env.CHART_IMG_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!res.ok) {
    var errText = await res.text();
    throw new Error('Chart-Img ' + res.status + ': ' + errText.slice(0, 200));
  }

  return await res.arrayBuffer();
}

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

// ارسال عکس با FormData (نه Base64)
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
  var url = 'https://api.telegram.org/bot' + token + '/answerCallbackQuery';
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId })
  });
}

async function fetchTwelveData(symbol, interval, apiKey, size) {
  var url = new URL('https://api.twelvedata.com/time_series');
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('interval', interval);
  url.searchParams.set('outputsize', size || 200);
  url.searchParams.set('apikey', apiKey);
  var res = await fetch(url.toString());
  var data = await res.json();
  if (data.status === 'error' || data.code) {
    throw new Error(data.message || 'خطا در دریافت داده');
  }
  if (!data.values || !data.values.length) {
    throw new Error('داده‌ای یافت نشد');
  }
  var result = [];
  for (var i = data.values.length - 1; i >= 0; i--) {
    var v = data.values[i];
    result.push({
      datetime: v.datetime || '',
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: parseFloat(v.volume || 0)
    });
  }
  return result;
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
          generationConfig: {
            temperature: 0.2,
            topP: 0.9,
            maxOutputTokens: 12288
          }
        })
      });
      var data = await res.json();
      if (res.ok) {
        var text = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
        if (text) return text;
      }
      lastError = (data.error && data.error.message) || ('HTTP ' + res.status);
      if (res.status === 429 || res.status === 503 || res.status === 500) {
        continue;
      }
      if (res.status === 401 || res.status === 403 || res.status === 400) {
        continue;
      }
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

// runAnalysis حالا env هم می‌گیرد
async function runAnalysis(token, chatId, symbol, twelveKey, geminiKeys, geminiModel, timeframe, env) {
  timeframe = timeframe || '1h';
  try {
    await sendMessage(token, chatId, '⏳ در حال تحلیل <b>' + symbol + '</b>...');
    var intervalMap = {
      '1min': '1min',
      '3min': '5min',
      '5min': '5min',
      '15min': '15min',
      '1h': '1h',
      '4h': '4h'
    };
    var interval = intervalMap[timeframe] || '1h';
    var klines = await fetchTwelveData(symbol, interval, twelveKey, 200);

    // ارسال عکس (با await درست و env)
    try {
      var chartBuffer = await buildChartImage(symbol, timeframe, env);
      await sendPhotoBytes(token, chatId, chartBuffer, '📊 ' + symbol + ' - ' + timeframeLabel(timeframe));
    } catch (chartErr) {
      console.error('Chart error: ' + chartErr.message);
      await sendMessage(token, chatId, '⚠️ عکس چارت ارسال نشد: ' + chartErr.message);
    }

    var fullPrompt = 'نماد: ' + symbol + '\nتایم‌فریم: ' + timeframeLabel(timeframe) + '\n\n' + klinesToText(klines, symbol, timeframeLabel(timeframe));
    var analysisText = await callGemini(geminiKeys, SYSTEM_PROMPT + '\n\n' + fullPrompt, geminiModel);
    var levels = extractLevels(analysisText);
    levels = validateSignal(levels);
    var caption = buildCaption(levels, symbol, timeframe);
    await sendMessage(token, chatId, caption);
    var fullText = tgFormat(analysisText);
    if (fullText.length > 100) {
      for (var i = 0; i < fullText.length; i += 3800) {
        var chunk = fullText.slice(i, i + 3800);
        await sendMessage(token, chatId, chunk);
      }
    }
  } catch (e) {
    await sendMessage(token, chatId, '❌ خطا: <code>' + e.message + '</code>');
  }
}

async function handleUpdate(update, env) {
  var token = env.TG_TOKEN;
  var twelveKey = env.TWELVE_KEY;
  var geminiKeys = getGeminiKeys(env);
  var geminiModel = env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  if (update.message) {
    var chatId = update.message.chat.id;
    var text = (update.message.text || '').trim();
    if (text === '/start') {
      await sendMessage(token, chatId, '🎯 <b>Everest AI Terminal</b>\n\n/analyze - تحلیل\n/status - وضعیت\n/help - راهنما\n\n💡 می‌توانید مستقیم نماد را تایپ کنید (مثل GBPJPY)');
      return;
    }
    if (text === '/help') {
      await sendMessage(token, chatId, '📖 راهنما\n\nنمادها: XAU/USD, EUR/USD, BTC/USD, GBPJPY, AAPL, ETH/USD\n\nتایم‌فریم‌ها: 1، 3، 5، 15 دقیقه، 1 و 4 ساعت');
      return;
    }
    if (text === '/status') {
      var geminiOk = geminiKeys.length > 0 ? '✅ (' + geminiKeys.length + ')' : '❌';
      var twelveOk = twelveKey ? '✅' : '❌';
      var chartOk = env.CHART_IMG_KEY ? '✅' : '❌';
      await sendMessage(token, chatId, '🤖 وضعیت:\n\nGemini: ' + geminiOk + '\nTwelveData: ' + twelveOk + '\nChart-Img: ' + chartOk + '\nTelegram: ✅');
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
      await sendMessage(token, chatId, '⏰ تایم‌فریم ' + sym1 + ' را انتخاب کنید:', keyboard1);
      return;
    }
    if (text && text.charAt(0) !== '/' && looksLikeSymbol(text)) {
      var sym2 = normalizeSymbol(text);
      var symbolRaw2 = sym2.replace('/', '');
      var keyboard2 = {
        inline_keyboard: [
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
      await sendMessage(token, chatId, '✅ نماد: <b>' + sym2 + '</b>\n\n⏰ تایم‌فریم را انتخاب کنید:', keyboard2);
      return;
    }
    if (text) {
      await sendMessage(token, chatId, '❓ متوجه نشدم.\n\n/analyze را بزنید یا نماد را تایپ کنید.\n\n/help');
      return;
    }
  }
  if (update.callback_query) {
    var callback = update.callback_query;
    var cbChatId = callback.message.chat.id;
    var data = callback.data;
    await answerCallback(token, callback.id);
    if (data === 'custom_symbol') {
      await sendMessage(token, cbChatId, '✏️ نماد را تایپ کنید:\n\nمثال: GBPJPY, ETH/USD, AAPL, XAG/USD');
      return;
    }
    if (data.indexOf('symbol_') === 0) {
      var symbolRaw3 = data.replace('symbol_', '');
      var symbolDisplay = normalizeSymbol(symbolRaw3);
      var keyboard3 = {
        inline_keyboard: [
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
      await sendMessage(token, cbChatId, '⏰ تایم‌فریم ' + symbolDisplay + ' را انتخاب کنید:', keyboard3);
      return;
    }
    if (data.indexOf('tf_') === 0) {
      var rest = data.replace('tf_', '');
      var tfMatch = rest.match(/_([^_]+)$/);
      if (!tfMatch) return;
      var timeframe = tfMatch[1];
      var symbolRaw4 = rest.slice(0, -tfMatch[0].length);
      var symbol = normalizeSymbol(symbolRaw4);
      // env رو هم پاس می‌دیم
      await runAnalysis(token, cbChatId, symbol, twelveKey, geminiKeys, geminiModel, timeframe, env);
      return;
    }
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
      } catch (e) {
        console.error('Error: ' + e.message);
      }
      return new Response('OK', { status: 200 });
    }
    return new Response('Not found', { status: 404 });
  }
};
