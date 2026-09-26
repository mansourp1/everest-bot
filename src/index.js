// ============================================
// EVEREST TELEGRAM BOT - Cloudflare Worker
// ============================================

const SYSTEM_PROMPT = `شما یک تحلیل‌گر ارشد بازارهای مالی با ۱۵ سال تجربه در SMC، ICT و پرایس اکشن هستید.

روش کار:
1. استخراج داده خام
2. تشخیص رژیم بازار
3. شناسایی BOS، CHoCH و نواحی نقدینگی
4. کشف Order Blocks و FVG معتبر
5. بررسی الگوهای کندلی
6. امتیازدهی ۶ لایه هم‌گرایی
7. تصمیم نهایی

ساختار تحلیل:
۰. رژیم بازار (Trending/Ranging/Transitional)
۱. ساختار بازار (BOS، CHoCH، Retest، نقدینگی)
۲. SMC (Order Blocks، FVG، Premium/Discount)
۳. ICT (ساختار داخلی، OTE)
۴. الگوهای کندلی
۵. سطوح کلیدی R1/R2/R3، S1/S2/S3
۶. سناریو معاملاتی با حد ضرر ساختاری
۷. امتیازدهی ۶ لایه (0-100)
۸. سناریوی مخالف
۹. خلاصه اجرایی

در انتهای پاسخ، دقیقاً این فرمت را بنویس:

---
Direction: [BUY/SELL/WAIT]
جهت: [خرید/فروش/انتظار]
Regime: [TRENDING_UP/TRENDING_DOWN/RANGING/TRANSITIONAL]
PlaybookType: [TREND_CONTINUATION/RANGE_FADE/NONE]
ConfidenceScore: [0-100]
Entry: [عدد یا N/A]
Stop Loss: [عدد یا N/A]
TP1: [عدد یا N/A]
TP2: [عدد یا N/A]
TP3: [عدد یا N/A]
R/R: [نسبت مثل 1:2.5 یا N/A]
---

قوانین:
1. اگر Confidence < 65 باشد، Direction = WAIT
2. حد ضرر باید ساختاری باشد
3. در BUY، SL زیر Entry و در SELL، SL بالای Entry
4. R/R اعلامی با محاسبه واقعی مطابقت داشته باشد`;

const LIVE_PREFIX = "حالت ورودی: داده OHLCV از Twelve Data.\n\n";

function parseJsonBlock(text) {
  const match = text.match(/```json\s*([\s\S]*?)```/i);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch (e) {
    return null;
  }
}

function parseRR(rrStr) {
  if (!rrStr) return null;
  const m = String(rrStr).match(/(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)/);
  if (m) {
    const a = parseFloat(m[1]);
    const b = parseFloat(m[2]);
    return a > 0 ? b / a : null;
  }
  const n = parseFloat(rrStr);
  return isNaN(n) ? null : n;
}

function findValue(text, labels) {
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const pattern = new RegExp("\\*{0,2}" + label + "\\*{0,2}\\s*[:=]\\s*\\*{0,2}\\s*([^\\n]+)", 'i');
    const m = text.match(pattern);
    if (m) {
      const val = m[1].trim();
      if (/N\/?A/i.test(val) || val === '-' || val === '—') return null;
      const cleaned = val.replace(/[^\d.\-]/g, '');
      const num = parseFloat(cleaned);
      if (!isNaN(num)) return num;
    }
  }
  return null;
}

function detectDirection(text) {
  if (!text) return 'WAIT';

  const em = text.match(/(?:^|\n)\s*[-*•]?\s*(?:Direction|Bias)\s*[:=]\s*([^\n]+)/im);
  if (em) {
    const v = em[1].toUpperCase();
    if (/\b(BUY|LONG)\b/.test(v)) return 'BUY';
    if (/\b(SELL|SHORT)\b/.test(v)) return 'SELL';
    if (/\b(WAIT|NEUTRAL)\b/.test(v)) return 'WAIT';
  }

  const fm = text.match(/جهت\s*[\u0600-\u06FF\s]{0,40}[:=]\s*[^\n]{0,40}?(خرید|فروش|BUY|SELL)/im);
  if (fm) {
    if (fm[1] === 'خرید' || fm[1] === 'BUY') return 'BUY';
    if (fm[1] === 'فروش' || fm[1] === 'SELL') return 'SELL';
  }

  const tail = text.slice(-2500);
  const td = tail.match(/Direction\s*[:=]\s*(BUY|SELL|WAIT|LONG|SHORT)/i);
  if (td) {
    const v = td[1].toUpperCase();
    if (v === 'BUY' || v === 'LONG') return 'BUY';
    if (v === 'SELL' || v === 'SHORT') return 'SELL';
    return 'WAIT';
  }

  const tg = (tail.match(/🟢/g) || []).length;
  const tr = (tail.match(/🔴/g) || []).length;
  if (tg > 0 && tr === 0) return 'BUY';
  if (tr > 0 && tg === 0) return 'SELL';

  return 'WAIT';
}

function extractLevels(rawText) {
  const jsonData = parseJsonBlock(rawText);
  if (jsonData) {
    return {
      direction: jsonData.direction || 'WAIT',
      regime: jsonData.regime,
      playbookType: jsonData.playbook,
      confidence: typeof jsonData.confidence === 'number' ? jsonData.confidence : null,
      entry: jsonData.entry,
      entryLow: jsonData.entryLow,
      entryHigh: jsonData.entryHigh,
      sl: jsonData.stopLoss,
      tp1: jsonData.tp1,
      tp2: jsonData.tp2,
      tp3: jsonData.tp3,
      rr: jsonData.rr,
      scores: jsonData.scores || {}
    };
  }

  const blocks = Array.from(rawText.matchAll(/---\s*\n([\s\S]*?)\n\s*---/g));
  const text = blocks.length ? blocks[blocks.length - 1][1] : rawText;

  const regimeMatch = text.match(/Regime\s*[:=]\s*(TRENDING_UP|TRENDING_DOWN|RANGING|TRANSITIONAL)/i);
  const playbookMatch = text.match(/PlaybookType\s*[:=]\s*(TREND_CONTINUATION|RANGE_FADE|NONE)/i);
  const rrMatch = text.match(/R\/R\s*[:=]\s*([\d\.:]+)/i);

  return {
    direction: detectDirection(rawText),
    regime: regimeMatch ? regimeMatch[1].toUpperCase() : null,
    playbookType: playbookMatch ? playbookMatch[1].toUpperCase() : null,
    confidence: findValue(text, ['ConfidenceScore', 'امتیاز\\s*اطمینان']),
    entry: findValue(text, ['Entry', 'نقطه\\s*ورود', 'ورود']),
    entryLow: null,
    entryHigh: null,
    sl: findValue(text, ['Stop[\\s-]?Loss', 'SL', 'حد\\s*ضرر']),
    tp1: findValue(text, ['TP\\s*1', 'حد\\s*سود\\s*1']),
    tp2: findValue(text, ['TP\\s*2', 'حد\\s*سود\\s*2']),
    tp3: findValue(text, ['TP\\s*3', 'حد\\s*سود\\s*3']),
    rr: rrMatch ? rrMatch[1] : null,
    scores: {}
  };
}

function validateSignal(levels, thresholds) {
  const issues = [];
  const originalDir = levels.direction;
  const minConf = thresholds.minConfidence || 65;
  const minRR = thresholds.minRR || 1.5;

  if (originalDir !== 'WAIT') {
    const conf = levels.confidence;
    if (conf === null || conf === undefined) {
      issues.push('امتیاز اطمینان استخراج نشد');
      levels.direction = 'WAIT';
    } else if (conf < minConf) {
      issues.push('اطمینان ' + conf + '% زیر آستانه ' + minConf + '%');
      levels.direction = 'WAIT';
    }
  }

  if (levels.direction === 'BUY' || levels.direction === 'SELL') {
    const entry = levels.entry || (levels.entryLow && levels.entryHigh ? (levels.entryLow + levels.entryHigh) / 2 : null);
    const sl = levels.sl;

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
      const risk = Math.abs(entry - sl);
      const reward = Math.abs(levels.tp1 - entry);
      const actualRR = risk > 0 ? reward / risk : 0;

      if (actualRR < minRR) {
        issues.push('R/R محاسبه‌شده ' + actualRR.toFixed(2) + ' کمتر از ' + minRR);
        levels.direction = 'WAIT';
      } else {
        const statedRR = parseRR(levels.rr);
        if (statedRR && Math.abs(statedRR - actualRR) / actualRR > 0.30) {
          issues.push('R/R اصلاح شد');
          levels.rr = '1:' + actualRR.toFixed(2);
        } else if (!statedRR) {
          levels.rr = '1:' + actualRR.toFixed(2);
        }
      }
    }
  }

  levels.wasDowngraded = originalDir !== levels.direction && originalDir !== null;
  levels.originalDirection = originalDir;
  levels.validationIssues = issues;
  return levels;
}

function klinesToText(klines, symbol, tfName) {
  if (!klines || !klines.length) return '';

  const last = klines[klines.length - 1];
  const recent = klines.slice(-40);
  const highs = klines.map(function(k) { return k.high; });
  const lows = klines.map(function(k) { return k.low; });
  const closes = klines.map(function(k) { return k.close; });

  const maxH = Math.max.apply(null, highs);
  const minL = Math.min.apply(null, lows);

  const a20 = closes.slice(-20).reduce(function(a, b) { return a + b; }, 0) / 20;
  const p20 = closes.slice(-40, -20).reduce(function(a, b) { return a + b; }, 0) / 20;
  const trend = a20 > p20 * 1.002 ? 'صعودی' : a20 < p20 * 0.998 ? 'نزولی' : 'خنثی';

  const rows = recent.slice(-25).map(function(k) {
    const t = k.datetime ? k.datetime.slice(-8, -3) : '';
    return '  ' + t + ' | O:' + k.open + ' H:' + k.high + ' L:' + k.low + ' C:' + k.close + ' V:' + Math.round(k.volume || 0);
  }).join('\n');

  return '=== ' + tfName + ' (' + symbol + ') ===\n' +
    'قیمت فعلی: ' + last.close + '\n' +
    'High(200): ' + maxH + ' | Low(200): ' + minL + '\n' +
    'Trend(40): ' + trend + '\n\n' +
    rows;
}

function normalizeSymbol(sym) {
  if (!sym) return '';
  const cleaned = sym.trim().toUpperCase();
  if (cleaned.indexOf('/') !== -1) return cleaned;
  const match = cleaned.match(/^([A-Z]+)(USD|EUR|GBP|JPY|CHF|AUD|CAD|NZD)$/);
  if (match) return match[1] + '/' + match[2];
  return cleaned;
}

function looksLikeSymbol(text) {
  if (!text) return false;
  const cleaned = text.trim();
  return /^[A-Za-z]{2,10}(\/[A-Za-z]{2,10})?$/.test(cleaned) ||
         /^[A-Za-z]{2,10}-[A-Za-z]{2,10}$/.test(cleaned);
}

async function sendMessage(token, chatId, text, keyboard) {
  const url = 'https://api.telegram.org/bot' + token + '/sendMessage';
  const payload = {
    chat_id: chatId,
    text: text.slice(0, 4000),
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };
  if (keyboard) payload.reply_markup = keyboard;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function sendPhoto(token, chatId, photoUrl, caption) {
  const url = 'https://api.telegram.org/bot' + token + '/sendPhoto';
  const payload = {
    chat_id: chatId,
    photo: photoUrl,
    caption: (caption || '').slice(0, 1000),
    parse_mode: 'HTML'
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function answerCallback(token, callbackId, text) {
  const url = 'https://api.telegram.org/bot' + token + '/answerCallbackQuery';
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text: text || '' })
  });
}

async function fetchTwelveData(symbol, interval, apiKey, size) {
  size = size || 200;
  const url = new URL('https://api.twelvedata.com/time_series');
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('interval', interval);
  url.searchParams.set('outputsize', size);
  url.searchParams.set('apikey', apiKey);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.status === 'error' || data.code) {
    throw new Error(data.message || 'خطا در دریافت داده');
  }

  if (!data.values || !data.values.length) {
    throw new Error('داده‌ای برای ' + symbol + ' در ' + interval + ' یافت نشد');
  }

  return data.values.reverse().map(function(v) {
    return {
      datetime: v.datetime || '',
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: parseFloat(v.volume || 0)
    };
  });
}

async function callGemini(apiKeys, prompt, model) {
  model = model || 'gemini-3.5-flash-lite';
  const keys = Array.isArray(apiKeys) ? apiKeys.filter(Boolean) : [apiKeys].filter(Boolean);

  if (!keys.length) {
    throw new Error('هیچ کلید Gemini تنظیم نشده');
  }

  let lastError = null;

  for (let i = 0; i < keys.length; i++) {
    const apiKey = keys[i];
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;

    try {
      const res = await fetch(url, {
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

      const data = await res.json();

      if (res.ok) {
        const text = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
        if (text) {
          console.log('Gemini success with key ' + (i + 1) + '/' + keys.length);
          return text;
        }
      }

      lastError = (data.error && data.error.message) || ('HTTP ' + res.status);

      if (res.status === 429 || res.status === 503 || res.status === 500 ||
          lastError.indexOf('quota') !== -1 || lastError.indexOf('rate') !== -1 ||
          lastError.indexOf('demand') !== -1 || lastError.indexOf('overloaded') !== -1) {
        console.log('Key ' + (i + 1) + ' failed, trying next...');
        continue;
      }

      if (res.status === 401 || res.status === 403 || res.status === 400) {
        console.log('Key ' + (i + 1) + ' invalid, trying next...');
        continue;
      }

      throw new Error(lastError);

    } catch (e) {
      lastError = e.message;
      console.log('Key ' + (i + 1) + ' error: ' + e.message);
      continue;
    }
  }

  throw new Error('همه کلیدهای Gemini خطا دادند. آخرین خطا: ' + lastError);
}

function buildChartUrl(symbol, timeframe, klines) {
  const recent = klines.slice(-50);
  const closes = recent.map(function(k) { return k.close; });
  const labels = recent.map(function(k) {
    if (!k.datetime) return '';
    return k.datetime.length > 11 ? k.datetime.slice(11, 16) : k.datetime;
  });

  const chartConfig = {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: symbol + ' - ' + timeframeLabel(timeframe),
        data: closes,
        borderColor: '#00c6ff',
        backgroundColor: 'rgba(0, 198, 255, 0.15)',
        borderWidth: 2,
        pointRadius: 0,
        fill: true
      }]
    }
  };

  const encoded = encodeURIComponent(JSON.stringify(chartConfig));
  return 'https://quickchart.io/chart?c=' + encoded + '&w=900&h=450&bkg=%231a1a3e&format=png';
}

function regimeLabel(r) {
  const labels = {
    TRENDING_UP: '📈 روند صعودی',
    TRENDING_DOWN: '📉 روند نزولی',
    RANGING: '↔️ رنج',
    TRANSITIONAL: '🔄 گذار'
  };
  return labels[r] || '';
}

function timeframeLabel(tf) {
  const labels = {
    '1min': '1 دقیقه',
    '3min': '3 دقیقه',
    '5min': '5 دقیقه',
    '15min': '15 دقیقه',
    '1h': '1 ساعت',
    '4h': '4 ساعت'
  };
  return labels[tf] || tf;
}

function buildCaption(levels, symbol, timeframe) {
  let c = '<b>📊 تحلیل چارت</b>\n\n';
  c += '<b>نماد:</b> ' + symbol + '\n';
  c += '<b>تایم‌فریم:</b> ' + timeframeLabel(timeframe) + '\n\n';

  const direction = levels.direction || 'WAIT';
  const dirText = direction === 'BUY' ? '🟢 خرید' : direction === 'SELL' ? '🔴 فروش' : '⏸️ انتظار';
  c += '<b>جهت:</b> ' + dirText + '\n';

  if (levels.regime) {
    c += '<b>رژیم:</b> ' + regimeLabel(levels.regime) + '\n';
  }

  if (levels.confidence !== null && levels.confidence !== undefined) {
    c += '<b>اطمینان:</b> ' + levels.confidence + '%\n';
  }

  c += '\n';

  if (direction === 'WAIT') {
    c += '<i>ستاپ معتبری شناسایی نشد.</i>\n';
  } else {
    if (levels.entryLow && levels.entryHigh) {
      c += '<b>🎯 ورود:</b> <code>' + levels.entryLow + ' - ' + levels.entryHigh + '</code>\n';
    } else if (levels.entry) {
      c += '<b>🎯 ورود:</b> <code>' + levels.entry + '</code>\n';
    }
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
  let cleaned = text.replace(/```json[\s\S]*?```/gi, '');
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');

  let h = cleaned.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  h = h.replace(/^#{1,4}\s*(.+)$/gm, '\n━━━━━━━━━━━━━━━\n📌 <b>$1</b>\n━━━━━━━━━━━━━━━');
  h = h.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  h = h.replace(/^[-•]\s+(.+)$/gm, '  ▫️ $1');
  h = h.replace(/\n{3,}/g, '\n\n');
  return h.trim();
}

function getGeminiKeys(env) {
  const keys = [];
  if (env.GEMINI_KEY_1) keys.push(env.GEMINI_KEY_1);
  if (env.GEMINI_KEY_2) keys.push(env.GEMINI_KEY_2);
  if (env.GEMINI_KEY_3) keys.push(env.GEMINI_KEY_3);
  if (env.GEMINI_KEY_4) keys.push(env.GEMINI_KEY_4);
  if (env.GEMINI_KEY) keys.push(env.GEMINI_KEY);
  return keys;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '') {
      return new Response('Everest Bot is running', { status: 200 });
    }

    if (request.method === 'POST' && url.pathname === '/webhook') {
      try {
        const update = await request.json();
        ctx.waitUntil(handleUpdate(update, env));
      } catch (e) {
        console.error('Error handling update: ' + e.message);
      }
      return new Response('OK', { status: 200 });
    }

    return new Response('Not found', { status: 404 });
  }
};

async function handleUpdate(update, env) {
  const token = env.TG_TOKEN;
  const twelveKey = env.TWELVE_KEY;
  const geminiKeys = getGeminiKeys(env);
  const geminiModel = env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  if (update.message) {
    const chatId = update.message.chat.id;
    const text = (update.message.text || '').trim();

    if (text === '/start') {
      await sendMessage(token, chatId,
        '🎯 <b>Everest AI Terminal</b>\n\n' +
        'به بات تحلیل‌گر خوش آمدید!\n\n' +
        '/analyze - منوی تحلیل\n' +
        '/status - وضعیت اتصالات\n' +
        '/help - راهنما\n\n' +
        '💡 <b>می‌توانید مستقیم نماد را تایپ کنید</b>\n' +
        'مثال: <code>GBPJPY</code> یا <code>ETH/USD</code> یا <code>AAPL</code>'
      );
      return;
    }

    if (text === '/help') {
      await sendMessage(token, chatId,
        '📖 <b>راهنما</b>\n\n' +
        'برای تحلیل، از /analyze استفاده کنید یا مستقیم نماد را تایپ کنید.\n\n' +
        '<b>نمونه نمادها:</b>\n' +
        '• <code>XAU/USD</code> (طلا)\n' +
        '• <code>EUR/USD</code> (یورو/دلار)\n' +
        '• <code>BTC/USD</code> (بیت‌کوین)\n' +
        '• <code>GBPJPY</code> (پوند/ین)\n' +
        '• <code>AAPL</code> (سهام اپل)\n' +
        '• <code>ETH/USD</code> (اتریوم)\n\n' +
        '<b>تایم‌فریم‌ها:</b>\n' +
        '1 دقیقه، 3 دقیقه، 5 دقیقه، 15 دقیقه، 1 ساعت، 4 ساعت'
      );
      return;
    }

    if (text === '/status') {
      const geminiOk = geminiKeys.length > 0 ? '✅ (' + geminiKeys.length + ' کلید)' : '❌';
      const twelveOk = twelveKey ? '✅' : '❌';
      await sendMessage(token, chatId,
        '🤖 <b>وضعیت سیستم</b>\n\n' +
        '• Gemini AI: ' + geminiOk + '\n' +
        '• Twelve Data: ' + twelveOk + '\n' +
        '• Telegram: ✅'
      );
      return;
    }

    if (text === '/analyze') {
      const keyboard = {
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
      await sendMessage(token, chatId, '🎯 <b>نماد را انتخاب کنید:</b>', keyboard);
      return;
    }

    if (text.indexOf('/analyze ') === 0) {
      const parts = text.replace('/analyze ', '').trim().split(/\s+/);
      const sym = normalizeSymbol(parts[0]);
      const symbolRaw = sym.replace('/', '');
      const keyboard = {
        inline_keyboard: [
          [
            { text: '⏱️ 1 دقیقه', callback_data: 'tf_' + symbolRaw + '_1min' },
            { text: '⏱️ 3 دقیقه', callback_data: 'tf_' + symbolRaw + '_3min' }
          ],
          [
            { text: '⏱️ 5 دقیقه', callback_data: 'tf_' + symbolRaw + '_5min' },
            { text: '⏱️ 15 دقیقه', callback_data: 'tf_' + symbolRaw + '_15min' }
          ],
          [
            { text: '🕐 1 ساعت', callback_data: 'tf_' + symbolRaw + '_1h' },
            { text: '📅 4 ساعت', callback_data: 'tf_' + symbolRaw + '_4h' }
          ]
        ]
      };
      await sendMessage(token, chatId, '⏰ <b>تایم‌فریم تحلیل ' + sym + ' را انتخاب کنید:</b>', keyboard);
      return;
    }

    if (text && text.charAt(0) !== '/' && looksLikeSymbol(text)) {
      const sym = normalizeSymbol(text);
      const symbolRaw = sym.replace('/', '');
      const keyboard = {
        inline_keyboard: [
          [
            { text: '⏱️ 1 دقیقه', callback_data: 'tf_' + symbolRaw + '_1min' },
            { text: '⏱️ 3 دقیقه', callback_data: 'tf_' + symbolRaw + '_3min' }
          ],
          [
            { text: '⏱️ 5 دقیقه', callback_data: 'tf_' + symbolRaw + '_5min' },
            { text: '⏱️ 15 دقیقه', callback_data: 'tf_' + symbolRaw + '_15min' }
          ],
          [
            { text: '🕐 1 ساعت', callback_data: 'tf_' + symbolRaw + '_1h' },
            { text: '📅 4 ساعت', callback_data: 'tf_' + symbolRaw + '_4h' }
          ]
        ]
      };
      await sendMessage(token, chatId,
        '✅ نماد شناسایی شد: <b>' + sym + '</b>\n\n⏰ <b>تایم‌فریم را انتخاب کنید:</b>',
        keyboard
      );
      return;
    }

    if (text) {
      await sendMessage(token, chatId,
        '❓ متوجه نشدم.\n\n' +
        'برای تحلیل:\n' +
        '• دستور /analyze را بزنید\n' +
        '• یا مستقیم نماد را تایپ کنید (مثل <code>GBPJPY</code>)\n\n' +
        'راهنما: /help'
      );
      return;
    }
  }

  if (update.callback_query) {
    const callback = update.callback_query;
    const chatId = callback.message.chat.id;
    const data = callback.data;

    await answerCallback(token, callback.id);

    if (data === 'custom_symbol') {
      await sendMessage(token, chatId,
        '✏️ <b>نماد مورد نظر را تایپ کنید</b>\n\n' +
        'مثال‌ها:\n' +
        '• <code>GBPJPY</code>\n' +
        '• <code>ETH/USD</code>\n' +
        '• <code>AAPL</code>\n' +
        '• <code>XAG/USD</code>'
      );
      return;
    }

    if (data.indexOf('symbol_') === 0) {
      const symbolRaw = data.replace('symbol_', '');
      const symbolDisplay = normalizeSymbol(symbolRaw);
      const keyboard = {
        inline_keyboard: [
          [
            { text: '⏱️ 1 دقیقه', callback_data: 'tf_' + symbolRaw + '_1min' },
            { text: '⏱️ 3 دقیقه', callback_data: 'tf_' + symbolRaw + '_3min' }
          ],
          [
            { text: '⏱️ 5 دقیقه', callback_data: 'tf_' + symbolRaw + '_5min' },
            { text: '⏱️ 15 دقیقه', callback_data: 'tf_' + symbolRaw + '_15min' }
          ],
          [
            { text: '🕐 1 ساعت', callback_data: 'tf_' + symbolRaw + '_1h' },
            { text: '📅 4 ساعت', callback_data: 'tf_' + symbolRaw + '_4h' }
          ]
        ]
      };
      await sendMessage(token, chatId,
        '⏰ <b>تایم‌فریم تحلیل ' + symbolDisplay + ' را انتخاب کنید:</b>',
        keyboard
      );
      return;
    }

    if (data.indexOf('tf_') === 0) {
      const rest = data.replace('tf_', '');
      const tfMatch = rest.match(/_([^_]+)$/);
      if (!tfMatch) return;

      const timeframe = tfMatch[1];
      const symbolRaw = rest.slice(0, -tfMatch[0].length);
      const symbol = normalizeSymbol(symbolRaw);

      await runAnalysis(token, chatId, symbol, twelveKey, geminiKeys, geminiModel, timeframe);
      return;
    }
  }
}

async function runAnalysis(token, chatId, symbol, twelveKey, geminiKeys, geminiModel, timeframe) {
  timeframe = timeframe || '1h';
  try {
    await sendMessage(token, chatId,
      '⏳ در حال تحلیل <b>' + symbol + '</b>\nتایم‌فریم: <b>' + timeframeLabel(timeframe) + '</b>...'
    );

    const intervalMap = {
      '1min': '1min',
      '3min': '5min',
      '5min': '5min',
      '15min': '15min',
      '1h': '1h',
      '4h': '4h'
    };

    const interval = intervalMap[timeframe] || '1h';
    const klines = await fetchTwelveData(symbol, interval, twelveKey, 200);

    try {
      const chartUrl = buildChartUrl(symbol, timeframe, klines);
      await sendPhoto(token, chatId, chartUrl, '📊 چارت ' + symbol + ' - ' + timeframeLabel(timeframe));
    } catch (chartErr) {
      console.error('Chart error: ' + chartErr.message);
    }

    const fullPrompt = LIVE_PREFIX +
      'نماد: ' + symbol + '\n' +
      'تایم‌فریم: ' + timeframeLabel(timeframe) + '\n\n' +
      klinesToText(klines, symbol, timeframeLabel(timeframe)) + '\n\n';

    const analysisText = await callGemini(
      geminiKeys,
      SYSTEM_PROMPT + '\n\n' + fullPrompt,
      geminiModel
    );

    let levels = extractLevels(analysisText);
    levels = validateSignal(levels, { minConfidence: 65, minRR: 1.5 });

    const caption = buildCaption(levels, symbol, timeframe);
    await sendMessage(token, chatId, caption);

    const fullText = tgFormat(analysisText);
    if (fullText.length > 100) {
      for (let i = 0; i < fullText.length; i += 3800) {
        const chunk = fullText.slice(i, i + 3800);
        await sendMessage(token, chatId, chunk);
        await new Promise(function(r) { setTimeout(r, 400); });
      }
    }
  } catch (e) {
    await sendMessage(token, chatId, '❌ خطا در تحلیل:\n\n<code>' + e.message + '</code>');
  }
}
