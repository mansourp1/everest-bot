// ============================================
// EVEREST TELEGRAM BOT - Cloudflare Worker
// ============================================

const SYSTEM_PROMPT = `شما یک تحلیل‌گر ارشد بازارهای مالی با ۱۵ سال تجربه در SMC، ICT و پرایس اکشن هستید.

**روش کار: تحلیل مرحله‌به‌مرحله**
1. استخراج داده خام
2. تشخیص رژیم بازار
3. شناسایی BOS، CHoCH و نواحی نقدینگی
4. کشف Order Blocks و FVG معتبر
5. بررسی الگوهای کندلی
6. امتیازدهی ۶ لایه هم‌گرایی
7. تصمیم نهایی

**ساختار تحلیل:**
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

**در انتهای پاسخ، دقیقاً این فرمت را بنویس:**

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

**قوانین:**
1. اگر Confidence < 65 باشد، Direction = WAIT
2. حد ضرر باید ساختاری باشد
3. در BUY، SL زیر Entry و در SELL، SL بالای Entry
4. R/R اعلامی با محاسبه واقعی مطابقت داشته باشد`;

const LIVE_PREFIX = "حالت ورودی: داده OHLCV از Twelve Data.\n\n";

// ============================================
// PARSING FUNCTIONS
// ============================================

function parseJsonBlock(text) {
  const match = text.match(/```json\s*([\s\S]*?)```/i);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
}

function parseRR(rrStr) {
  if (!rrStr) return null;
  const m = String(rrStr).match(/(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)/);
  if (m) {
    const a = parseFloat(m[1]), b = parseFloat(m[2]);
    return a > 0 ? b / a : null;
  }
  const n = parseFloat(rrStr);
  return isNaN(n) ? null : n;
}

function findValue(text, labels) {
  for (const label of labels) {
    const pattern = new RegExp(`\\*{0,2}${label}\\*{0,2}\\s*[:=]\\s*\\*{0,2}\\s*([^\\n]+)`, 'i');
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

  const blocks = [...rawText.matchAll(/---\s*\n([\s\S]*?)\n\s*---/g)];
  const text = blocks.length ? blocks[blocks.length - 1][1] : rawText;

  return {
    direction: detectDirection(rawText),
    regime: (text.match(/Regime\s*[:=]\s*(TRENDING_UP|TRENDING_DOWN|RANGING|TRANSITIONAL)/i) || [])[1]?.toUpperCase() || null,
    playbookType: (text.match(/PlaybookType\s*[:=]\s*(TREND_CONTINUATION|RANGE_FADE|NONE)/i) || [])[1]?.toUpperCase() || null,
    confidence: findValue(text, ['ConfidenceScore', 'امتیاز\\s*اطمینان']),
    entry: findValue(text, ['Entry', 'نقطه\\s*ورود', 'ورود']),
    entryLow: null,
    entryHigh: null,
    sl: findValue(text, ['Stop[\\s-]?Loss', 'SL', 'حد\\s*ضرر']),
    tp1: findValue(text, ['TP\\s*1', 'حد\\s*سود\\s*1']),
    tp2: findValue(text, ['TP\\s*2', 'حد\\s*سود\\s*2']),
    tp3: findValue(text, ['TP\\s*3', 'حد\\s*سود\\s*3']),
    rr: (text.match(/R\/R\s*[:=]\s*([\d\.:]+)/i) || [])[1] || null,
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
      issues.push('امتیاز اطمینان استخراج نشد - به WAIT تغییر یافت');
      levels.direction = 'WAIT';
    } else if (conf < minConf) {
      issues.push(`اطمینان ${conf}% زیر آستانه ${minConf}% - به WAIT تغییر یافت`);
      levels.direction = 'WAIT';
    }
  }

  if (levels.direction === 'BUY' || levels.direction === 'SELL') {
    const entry = levels.entry || (levels.entryLow && levels.entryHigh ? (levels.entryLow + levels.entryHigh) / 2 : null);
    const sl = levels.sl;

    if (entry === null) {
      issues.push('Entry موجود نیست - نامعتبر');
      levels.direction = 'WAIT';
    } else if (sl === null) {
      issues.push('Stop Loss موجود نیست - نامعتبر');
      levels.direction = 'WAIT';
    } else {
      if (levels.direction === 'BUY' && sl >= entry) {
        issues.push('SL بالاتر از Entry در BUY - نامعتبر');
        levels.direction = 'WAIT';
      }
      if (levels.direction === 'SELL' && sl <= entry) {
        issues.push('SL پایین‌تر از Entry در SELL - نامعتبر');
        levels.direction = 'WAIT';
      }
    }

    if (levels.direction !== 'WAIT' && entry && sl && levels.tp1) {
      const risk = Math.abs(entry - sl);
      const reward = Math.abs(levels.tp1 - entry);
      const actualRR = risk > 0 ? reward / risk : 0;

      if (actualRR < minRR) {
        issues.push(`R/R محاسبه‌شده 1:${actualRR.toFixed(2)} کمتر از 1:${minRR} - رد شد`);
        levels.direction = 'WAIT';
      } else {
        const statedRR = parseRR(levels.rr);
        if (statedRR && Math.abs(statedRR - actualRR) / actualRR > 0.30) {
          issues.push('R/R اعلامی با محاسبه واقعی اختلاف داشت - اصلاح شد');
          levels.rr = `1:${actualRR.toFixed(2)}`;
        } else if (!statedRR) {
          levels.rr = `1:${actualRR.toFixed(2)}`;
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
  const highs = klines.map(k => k.high);
  const lows = klines.map(k => k.low);
  const closes = klines.map(k => k.close);

  const maxH = Math.max(...highs);
  const minL = Math.min(...lows);

  const a20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const p20 = closes.slice(-40, -20).reduce((a, b) => a + b, 0) / 20;
  const trend = a20 > p20 * 1.002 ? 'صعودی' : a20 < p20 * 0.998 ? 'نزولی' : 'خنثی';

  const rows = recent.slice(-25).map(k => {
    const t = k.datetime ? k.datetime.slice(-8, -3) : '';
    return `  ${t} | O:${k.open} H:${k.high} L:${k.low} C:${k.close} V:${Math.round(k.volume || 0)}`;
  }).join('\n');

  return `=== ${tfName} (${symbol}) ===
قیمت فعلی: ${last.close}
High(200): ${maxH} | Low(200): ${minL}
Trend(40): ${trend}

${rows}`;
}

// ============================================
// TELEGRAM API
// ============================================

async function sendMessage(token, chatId, text, keyboard = null) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
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

async function answerCallback(token, callbackId, text = '') {
  const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text })
  });
}

// ============================================
// EXTERNAL APIs
// ============================================

async function fetchTwelveData(symbol, interval, apiKey, size = 200) {
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
    throw new Error(`داده‌ای برای ${symbol} در ${interval} یافت نشد`);
  }

  return data.values.reverse().map(v => ({
    datetime: v.datetime || '',
    open: parseFloat(v.open),
    high: parseFloat(v.high),
    low: parseFloat(v.low),
    close: parseFloat(v.close),
    volume: parseFloat(v.volume || 0)
  }));
}

async function callGemini(apiKey, prompt, model = 'gemini-2.5-flash') {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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

  if (!res.ok) {
    throw new Error(data.error?.message || `HTTP ${res.status}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('پاسخ خالی از Gemini');
  return text;
}

// ============================================
// FORMATTING
// ============================================

function regimeLabel(r) {
  const labels = {
    TRENDING_UP: '📈 روند صعودی',
    TRENDING_DOWN: '📉 روند نزولی',
    RANGING: '↔️ رنج',
    TRANSITIONAL: '🔄 گذار'
  };
  return labels[r] || '';
}

function buildCaption(levels) {
  let c = '<b>📊 تحلیل چارت</b>\n\n';
  const direction = levels.direction || 'WAIT';
  const dirText = direction === 'BUY' ? '🟢 خرید' : direction === 'SELL' ? '🔴 فروش' : '⏸️ انتظار';
  c += `<b>جهت:</b> ${dirText}\n`;

  if (levels.regime) {
    c += `<b>رژیم:</b> ${regimeLabel(levels.regime)}\n`;
  }

  if (levels.confidence !== null && levels.confidence !== undefined) {
    c += `<b>اطمینان:</b> ${levels.confidence}%\n`;
  }

  c += '\n';

  if (direction === 'WAIT') {
    c += '<i>ستاپ معتبری شناسایی نشد.</i>\n';
  } else {
    if (levels.entryLow && levels.entryHigh) {
      c += `<b>🎯 ورود:</b> <code>${levels.entryLow} - ${levels.entryHigh}</code>\n`;
    } else if (levels.entry) {
      c += `<b>🎯 ورود:</b> <code>${levels.entry}</code>\n`;
    }
    if (levels.sl) c += `<b>🛑 SL:</b> <code>${levels.sl}</code>\n`;
    if (levels.tp1) c += `<b>✅ TP1:</b> <code>${levels.tp1}</code>\n`;
    if (levels.tp2) c += `<b>✅ TP2:</b> <code>${levels.tp2}</code>\n`;
    if (levels.tp3) c += `<b>✅ TP3:</b> <code>${levels.tp3}</code>\n`;
    if (levels.rr) c += `<b>⚖️ R/R:</b> <code>${levels.rr}</code>\n`;
  }

  if (levels.validationIssues && levels.validationIssues.length) {
    c += '\n<b>⚠️ اعتبارسنجی خودکار:</b>\n';
    levels.validationIssues.slice(0, 3).forEach(iss => {
      c += `• ${iss}\n`;
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

// ============================================
// MAIN WORKER
// ============================================

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
        console.error('Error handling update:', e);
      }
      return new Response('OK', { status: 200 });
    }

    return new Response('Not found', { status: 404 });
  }
};

async function handleUpdate(update, env) {
  const token = env.TG_TOKEN;
  const twelveKey = env.TWELVE_KEY;
  const geminiKey = env.GEMINI_KEY;
  const geminiModel = env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (update.message) {
    const chatId = update.message.chat.id;
    const text = (update.message.text || '').trim();

    if (text === '/start') {
      await sendMessage(token, chatId,
        '🎯 <b>Everest AI Terminal</b>\n\n' +
        'به بات تحلیل‌گر خوش آمدید!\n\n' +
        '/analyze - شروع تحلیل\n' +
        '/status - وضعیت اتصالات\n' +
        '/help - راهنما'
      );
      return;
    }

    if (text === '/help') {
      await sendMessage(token, chatId,
        '📖 <b>راهنما</b>\n\n' +
        'برای تحلیل، از /analyze استفاده کنید.\n\n' +
        '<b>نمادهای پشتیبانی‌شده:</b>\n' +
        '• XAU/USD (طلا)\n' +
        '• EUR/USD (یورو/دلار)\n' +
        '• BTC/USD (بیت‌کوین)\n' +
        '• GBP/USD (پوند/دلار)'
      );
      return;
    }

    if (text === '/status') {
      const geminiOk = geminiKey ? '✅' : '❌';
      const twelveOk = twelveKey ? '✅' : '❌';
      await sendMessage(token, chatId,
        `🤖 <b>وضعیت سیستم</b>\n\n` +
        `• Gemini AI: ${geminiOk}\n` +
        `• Twelve Data: ${twelveOk}\n` +
        `• Telegram: ✅`
      );
      return;
    }

    if (text === '/analyze') {
      const keyboard = {
        inline_keyboard: [
          [
            { text: '🥇 XAU/USD', callback_data: 'analyze_XAUUSD' },
            { text: '💶 EUR/USD', callback_data: 'analyze_EURUSD' }
          ],
          [
            { text: '₿ BTC/USD', callback_data: 'analyze_BTCUSD' },
            { text: '💷 GBP/USD', callback_data: 'analyze_GBPUSD' }
          ]
        ]
      };
      await sendMessage(token, chatId, '🎯 <b>نماد را انتخاب کنید:</b>', keyboard);
      return;
    }

    if (text.startsWith('/analyze ')) {
      const symbol = text.replace('/analyze ', '').trim().toUpperCase();
      await runAnalysis(token, chatId, symbol, twelveKey, geminiKey, geminiModel);
      return;
    }
  }

  if (update.callback_query) {
    const callback = update.callback_query;
    const chatId = callback.message.chat.id;
    const data = callback.data;

    await answerCallback(token, callback.id);

    if (data.startsWith('analyze_')) {
      const symbol = data.replace('analyze_', '').replace('USD', '/USD');
      await runAnalysis(token, chatId, symbol, twelveKey, geminiKey, geminiModel);
    }
  }
}

async function runAnalysis(token, chatId, symbol, twelveKey, geminiKey, geminiModel, timeframe = '1h') {
  try {
    await sendMessage(token, chatId, `⏳ در حال تحلیل <b>${symbol}</b>...`);

    const intervalMap = { '4H': '4h', '1H': '1h', '15M': '15min', '1M': '1min' };
    const interval = intervalMap[timeframe.toUpperCase()] || '1h';

    const klines = await fetchTwelveData(symbol, interval, twelveKey, 200);

    const fullPrompt = LIVE_PREFIX + `نماد: ${symbol}\n\n` + klinesToText(klines, symbol, timeframe.toUpperCase()) + '\n\n';

    const analysisText = await callGemini(geminiKey, SYSTEM_PROMPT + '\n\n' + fullPrompt, geminiModel);

    let levels = extractLevels(analysisText);
    levels = validateSignal(levels, { minConfidence: 65, minRR: 1.5 });

    const caption = buildCaption(levels);
    await sendMessage(token, chatId, caption);

    const fullText = tgFormat(analysisText);
    if (fullText.length > 100) {
      for (let i = 0; i < fullText.length; i += 3800) {
        const chunk = fullText.slice(i, i + 3800);
        await sendMessage(token, chatId, chunk);
        await new Promise(r => setTimeout(r, 400));
      }
    }
  } catch (e) {
    await sendMessage(token, chatId, `❌ خطا در تحلیل:\n\n<code>${e.message}</code>`);
  }
}
