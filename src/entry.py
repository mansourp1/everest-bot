import json
import asyncio
import aiohttp
import io
import re
from PIL import Image, ImageDraw, ImageFont
from workers import WorkerEntrypoint, Response
from google import genai
from google.genai import types

BT3 = chr(96) * 3

SYSTEM_PROMPT = """شما یک تحلیل‌گر ارشد بازارهای مالی با ۱۵ سال تجربه در SMC، ICT و پرایس اکشن هستید.

روش کار - تحلیل مرحله‌به‌مرحله:
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

در انتهای پاسخ، دقیقاً این فرمت را با این ساختار بنویس:

---
Direction: BUY یا SELL یا WAIT
جهت: خرید یا فروش یا انتظار
Regime: TRENDING_UP یا TRENDING_DOWN یا RANGING یا TRANSITIONAL
PlaybookType: TREND_CONTINUATION یا RANGE_FADE یا NONE
ConfidenceScore: عدد بین 0 تا 100
Entry: عدد یا N/A
Stop Loss: عدد یا N/A
TP1: عدد یا N/A
TP2: عدد یا N/A
TP3: عدد یا N/A
R/R: نسبت مثل 1:2.5 یا N/A
---

قوانین:
1. اگر Confidence کمتر از 65 باشد، Direction باید WAIT باشد
2. حد ضرر باید ساختاری باشد
3. در BUY، SL زیر Entry و در SELL، SL بالای Entry
4. نسبت R/R اعلامی باید با محاسبه واقعی مطابقت داشته باشد"""

LIVE_PREFIX = "حالت ورودی: داده OHLCV از Twelve Data.\n\n"


def parse_json_block(text):
    pattern = BT3 + r'json\s*([\s\S]*?)' + BT3
    m = re.search(pattern, text, re.IGNORECASE)
    if not m:
        return None
    try:
        return json.loads(m.group(1).strip())
    except json.JSONDecodeError:
        return None


def parse_rr(rr_str):
    if not rr_str:
        return None
    m = re.search(r'(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)', str(rr_str))
    if m:
        a, b = float(m.group(1)), float(m.group(2))
        return b / a if a > 0 else None
    try:
        return float(rr_str)
    except (ValueError, TypeError):
        return None


def extract_levels(raw_text):
    json_data = parse_json_block(raw_text)
    if json_data:
        return {
            'direction': json_data.get('direction', 'WAIT'),
            'regime': json_data.get('regime'),
            'playbookType': json_data.get('playbook'),
            'confidence': json_data.get('confidence') if isinstance(json_data.get('confidence'), (int, float)) else None,
            'entry': json_data.get('entry'),
            'entryLow': json_data.get('entryLow'),
            'entryHigh': json_data.get('entryHigh'),
            'sl': json_data.get('stopLoss'),
            'tp1': json_data.get('tp1'),
            'tp2': json_data.get('tp2'),
            'tp3': json_data.get('tp3'),
            'rr': json_data.get('rr'),
            'scores': json_data.get('scores', {})
        }
    return regex_extract(raw_text)


def regex_extract(raw_text):
    levels = {
        'direction': 'WAIT', 'regime': None, 'playbookType': None,
        'confidence': None, 'entry': None, 'entryLow': None,
        'entryHigh': None, 'sl': None, 'tp1': None, 'tp2': None,
        'tp3': None, 'rr': None, 'scores': {}
    }

    blocks = re.findall(r'---\s*\n([\s\S]*?)\n\s*---', raw_text)
    text = blocks[-1] if blocks else raw_text

    def find_value(labels):
        for label in labels:
            pattern = r'\*{0,2}' + label + r'\*{0,2}\s*[:=]\s*\*{0,2}\s*([^\n]+)'
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                val = m.group(1).strip()
                if re.match(r'N/?A', val, re.IGNORECASE) or val in ('-', '—'):
                    return None
                cleaned = re.sub(r'[^\d.\-]', '', val.replace('٬', '').replace(',', ''))
                try:
                    return float(cleaned)
                except ValueError:
                    return None
        return None

    levels['entry'] = find_value(['Entry', 'نقطه ورود', 'ورود'])
    levels['sl'] = find_value(['Stop Loss', 'Stop-Loss', 'SL', 'حد ضرر'])
    levels['tp1'] = find_value(['TP1', 'TP 1', 'حد سود 1'])
    levels['tp2'] = find_value(['TP2', 'TP 2', 'حد سود 2'])
    levels['tp3'] = find_value(['TP3', 'TP 3', 'حد سود 3'])
    levels['confidence'] = find_value(['ConfidenceScore', 'امتیاز اطمینان'])

    rr_match = re.search(r'R/R\s*[:=]\s*([\d\.:]+)', text, re.IGNORECASE)
    if rr_match:
        levels['rr'] = rr_match.group(1)

    rm = re.search(r'Regime\s*[:=]\s*(TRENDING_UP|TRENDING_DOWN|RANGING|TRANSITIONAL)', text, re.IGNORECASE)
    if rm:
        levels['regime'] = rm.group(1).upper()

    pm = re.search(r'PlaybookType\s*[:=]\s*(TREND_CONTINUATION|RANGE_FADE|NONE)', text, re.IGNORECASE)
    if pm:
        levels['playbookType'] = pm.group(1).upper()

    levels['direction'] = detect_direction(raw_text)
    return levels


def detect_direction(text):
    if not text:
        return 'WAIT'

    em = re.search(r'(?:^|\n)\s*[-*•]?\s*(?:Direction|Bias)\s*[:=]\s*([^\n]+)', text, re.IGNORECASE | re.MULTILINE)
    if em:
        v = em.group(1).upper()
        if re.search(r'\b(BUY|LONG)\b', v): return 'BUY'
        if re.search(r'\b(SELL|SHORT)\b', v): return 'SELL'
        if re.search(r'\b(WAIT|NEUTRAL)\b', v): return 'WAIT'

    fm = re.search(r'جهت\s*[\u0600-\u06FF\s]{0,40}[:=]\s*[^\n]{0,40}?(خرید|فروش|BUY|SELL)', text, re.IGNORECASE | re.MULTILINE)
    if fm:
        if fm.group(1) in ('خرید', 'BUY'): return 'BUY'
        if fm.group(1) in ('فروش', 'SELL'): return 'SELL'

    tail = text[-2500:]
    td = re.search(r'Direction\s*[:=]\s*(BUY|SELL|WAIT|LONG|SHORT)', tail, re.IGNORECASE)
    if td:
        v = td.group(1).upper()
        if v in ('BUY', 'LONG'): return 'BUY'
        if v in ('SELL', 'SHORT'): return 'SELL'
        return 'WAIT'

    tg = tail.count('🟢')
    tr = tail.count('🔴')
    if tg > 0 and tr == 0: return 'BUY'
    if tr > 0 and tg == 0: return 'SELL'

    return 'WAIT'


def validate_signal(levels, thresholds):
    issues = []
    original_dir = levels.get('direction', 'WAIT')
    min_conf = thresholds.get('minConfidence', 65)
    min_rr = thresholds.get('minRR', 1.5)

    if original_dir != 'WAIT':
        conf = levels.get('confidence')
        if conf is None:
            issues.append('امتیاز اطمینان استخراج نشد - به WAIT تغییر یافت')
            levels['direction'] = 'WAIT'
        elif conf < min_conf:
            issues.append(f'اطمینان {conf}% زیر آستانه {min_conf}% - به WAIT تغییر یافت')
            levels['direction'] = 'WAIT'

    if levels.get('direction') in ('BUY', 'SELL'):
        entry = levels.get('entry') or (
            (levels.get('entryLow', 0) + levels.get('entryHigh', 0)) / 2
            if levels.get('entryLow') and levels.get('entryHigh') else None
        )
        sl = levels.get('sl')

        if entry is None:
            issues.append('Entry موجود نیست - نامعتبر')
            levels['direction'] = 'WAIT'
        elif sl is None:
            issues.append('Stop Loss موجود نیست - نامعتبر')
            levels['direction'] = 'WAIT'
        else:
            if levels['direction'] == 'BUY' and sl >= entry:
                issues.append(f'SL بالاتر از Entry در BUY - نامعتبر')
                levels['direction'] = 'WAIT'
            if levels['direction'] == 'SELL' and sl <= entry:
                issues.append(f'SL پایین‌تر از Entry در SELL - نامعتبر')
                levels['direction'] = 'WAIT'

        if levels.get('direction') != 'WAIT' and entry and sl and levels.get('tp1'):
            risk = abs(entry - sl)
            reward = abs(levels['tp1'] - entry)
            actual_rr = reward / risk if risk > 0 else 0

            if actual_rr < min_rr:
                issues.append(f'R/R محاسبه‌شده 1:{actual_rr:.2f} کمتر از 1:{min_rr} - رد شد')
                levels['direction'] = 'WAIT'
            else:
                stated_rr = parse_rr(levels.get('rr'))
                if stated_rr and abs(stated_rr - actual_rr) / actual_rr > 0.30:
                    issues.append(f'R/R اعلامی با محاسبه واقعی اختلاف داشت - اصلاح شد')
                    levels['rr'] = f'1:{actual_rr:.2f}'
                elif not stated_rr:
                    levels['rr'] = f'1:{actual_rr:.2f}'

    levels['wasDowngraded'] = (original_dir != levels['direction'] and original_dir is not None)
    levels['originalDirection'] = original_dir
    levels['validationIssues'] = issues
    return levels


def klines_to_text(klines, symbol, tf_name):
    if not klines:
        return ''

    last = klines[-1]
    recent = klines[-40:]
    highs = [k['high'] for k in klines]
    lows = [k['low'] for k in klines]
    closes = [k['close'] for k in klines]

    max_h = max(highs)
    min_l = min(lows)

    a20 = sum(closes[-20:]) / 20
    p20 = sum(closes[-40:-20]) / 20
    trend = 'صعودی' if a20 > p20 * 1.002 else 'نزولی' if a20 < p20 * 0.998 else 'خنثی'

    rows = []
    for k in recent[-25:]:
        t = k['datetime'][-8:-3] if len(k.get('datetime', '')) > 8 else ''
        rows.append(f"  {t} | O:{k['open']} H:{k['high']} L:{k['low']} C:{k['close']} V:{k.get('volume', 0):.0f}")

    header = f"=== {tf_name} ({symbol}) ==="
    return header + f"\nقیمت فعلی: {last['close']}\nHigh(200): {max_h} | Low(200): {min_l}\nTrend(40): {trend}\n\n" + '\n'.join(rows)


async def send_message(token, chat_id, text, keyboard=None):
    url = f'https://api.telegram.org/bot{token}/sendMessage'
    payload = {
        'chat_id': chat_id,
        'text': text[:4000],
        'parse_mode': 'HTML',
        'disable_web_page_preview': True
    }
    if keyboard:
        payload['reply_markup'] = keyboard

    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload) as resp:
            return await resp.json()


async def send_photo(token, chat_id, photo_bytes, caption='', keyboard=None):
    url = f'https://api.telegram.org/bot{token}/sendPhoto'

    form = aiohttp.FormData()
    form.add_field('chat_id', str(chat_id))
    form.add_field('photo', photo_bytes, filename='chart.jpg', content_type='image/jpeg')
    if caption:
        form.add_field('caption', caption[:1000])
        form.add_field('parse_mode', 'HTML')
    if keyboard:
        form.add_field('reply_markup', json.dumps(keyboard))

    async with aiohttp.ClientSession() as session:
        async with session.post(url, data=form) as resp:
            return await resp.json()


async def answer_callback(token, callback_id, text=''):
    url = f'https://api.telegram.org/bot{token}/answerCallbackQuery'
    payload = {'callback_query_id': callback_id, 'text': text}
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload) as resp:
            return await resp.json()


async def fetch_twelve_data(symbol, interval, api_key, size=200):
    url = 'https://api.twelvedata.com/time_series'
    params = {
        'symbol': symbol,
        'interval': interval,
        'outputsize': size,
        'apikey': api_key
    }

    async with aiohttp.ClientSession() as session:
        async with session.get(url, params=params) as resp:
            data = await resp.json()

    if data.get('status') == 'error' or data.get('code'):
        raise Exception(data.get('message', 'خطا در دریافت داده'))

    if not data.get('values'):
        raise Exception(f'داده‌ای برای {symbol} در {interval} یافت نشد')

    klines = []
    for v in reversed(data['values']):
        klines.append({
            'datetime': v.get('datetime', ''),
            'open': float(v['open']),
            'high': float(v['high']),
            'low': float(v['low']),
            'close': float(v['close']),
            'volume': float(v.get('volume', 0))
        })

    return klines


async def call_gemini(api_key, prompt, model='gemini-2.5-flash'):
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.2,
            top_p=0.9,
            max_output_tokens=12288
        )
    )
    if response.text:
        return response.text
    raise Exception('پاسخ خالی از Gemini')


def create_chart_image(klines, symbol, levels):
    W, H = 1600, 900
    img = Image.new('RGB', (W, H), color=(10, 10, 30))
    draw = ImageDraw.Draw(img)

    try:
        font_large = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 36)
        font_med = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 20)
        font_small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)
    except OSError:
        font_large = ImageFont.load_default()
        font_med = ImageFont.load_default()
        font_small = ImageFont.load_default()

    draw.rectangle([0, 0, W, 100], fill=(15, 12, 41))
    draw.text((W // 2, 30), f'{symbol} - Analysis', fill='#00c6ff', font=font_large, anchor='mt')

    direction = levels.get('direction', 'WAIT')
    conf = levels.get('confidence')
    dir_text = f'{direction}'
    if conf:
        dir_text += f'  |  Confidence: {conf}%'

    color = '#00c853' if direction == 'BUY' else '#ff1744' if direction == 'SELL' else '#ffc107'
    draw.text((W // 2, 65), dir_text, fill=color, font=font_med, anchor='mt')

    chart_x, chart_y = 50, 120
    chart_w, chart_h = W - 100, 650

    if klines:
        candles = klines[-80:]
        highs = [c['high'] for c in candles]
        lows = [c['low'] for c in candles]
        max_h = max(highs)
        min_l = min(lows)
        price_range = max_h - min_l or 1

        def price_to_y(price):
            return chart_y + int((max_h - price) / price_range * chart_h)

        for i in range(5):
            y = chart_y + i * chart_h // 4
            draw.line([(chart_x, y), (chart_x + chart_w, y)], fill=(40, 40, 60), width=1)
            price = max_h - (i * price_range / 4)
            draw.text((chart_x + chart_w + 5, y - 8), f'{price:.4f}', fill='#888', font=font_small)

        candle_w = chart_w / len(candles)
        for i, c in enumerate(candles):
            cx = chart_x + int(i * candle_w + candle_w / 2)
            color_candle = '#00c853' if c['close'] >= c['open'] else '#ff1744'
            draw.line([(cx, price_to_y(c['high'])), (cx, price_to_y(c['low']))], fill=color_candle, width=2)
            y_open = price_to_y(c['open'])
            y_close = price_to_y(c['close'])
            body_top = min(y_open, y_close)
            body_h = max(abs(y_close - y_open), 2)
            bw = max(int(candle_w * 0.7), 2)
            draw.rectangle([cx - bw // 2, body_top, cx + bw // 2, body_top + body_h], fill=color_candle)

        if direction != 'WAIT':
            level_configs = [
                ('sl', '#ff1744', 'SL'),
                ('tp1', '#00c853', 'TP1'),
                ('tp2', '#00c853', 'TP2'),
                ('tp3', '#00c853', 'TP3'),
                ('entry', '#00c6ff', 'Entry'),
            ]
            for key, lcolor, label in level_configs:
                price = levels.get(key)
                if price and price > 0:
                    y = price_to_y(price)
                    if chart_y <= y <= chart_y + chart_h:
                        draw.line([(chart_x, y), (chart_x + chart_w, y)], fill=lcolor, width=3)
                        draw.text((chart_x + 5, y - 20), f'{label}: {price}', fill=lcolor, font=font_small)

    draw.rectangle([0, H - 50, W, H], fill=(15, 12, 41))
    draw.text((W // 2, H - 30), 'Educational analysis only', fill='#888', font=font_small, anchor='mt')

    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=92)
    return buf.getvalue()


def build_caption(levels, provider='Gemini'):
    c = '<b>تحلیل چارت</b>\n\n'
    direction = levels.get('direction', 'WAIT')
    dir_text = 'خرید' if direction == 'BUY' else 'فروش' if direction == 'SELL' else 'انتظار'
    c += f'<b>جهت:</b> {dir_text}\n'

    regime = levels.get('regime')
    if regime:
        labels = {'TRENDING_UP': 'روند صعودی', 'TRENDING_DOWN': 'روند نزولی',
                  'RANGING': 'رنج', 'TRANSITIONAL': 'گذار'}
        c += f'<b>رژیم:</b> {labels.get(regime, regime)}\n'

    conf = levels.get('confidence')
    if conf is not None:
        c += f'<b>اطمینان:</b> {conf}%\n'

    c += '\n'

    if direction == 'WAIT':
        c += '<i>ستاپ معتبری شناسایی نشد.</i>\n'
    else:
        if levels.get('entryLow') and levels.get('entryHigh'):
            c += f'<b>ورود:</b> <code>{levels["entryLow"]} - {levels["entryHigh"]}</code>\n'
        elif levels.get('entry'):
            c += f'<b>ورود:</b> <code>{levels["entry"]}</code>\n'
        if levels.get('sl'):
            c += f'<b>SL:</b> <code>{levels["sl"]}</code>\n'
        if levels.get('tp1'):
            c += f'<b>TP1:</b> <code>{levels["tp1"]}</code>\n'
        if levels.get('tp2'):
            c += f'<b>TP2:</b> <code>{levels["tp2"]}</code>\n'
        if levels.get('tp3'):
            c += f'<b>TP3:</b> <code>{levels["tp3"]}</code>\n'
        if levels.get('rr'):
            c += f'<b>R/R:</b> <code>{levels["rr"]}</code>\n'

    issues = levels.get('validationIssues', [])
    if issues:
        c += '\n<b>اعتبارسنجی خودکار:</b>\n'
        for iss in issues[:3]:
            c += f'- {iss}\n'

    return c


def tg_format(text):
    cleaned = re.sub(BT3 + r'json[\s\S]*?' + BT3, '', text, flags=re.IGNORECASE)
    cleaned = re.sub(BT3 + r'[\s\S]*?' + BT3, '', cleaned)

    h = cleaned.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    h = re.sub(r'^#{1,4}\s*(.+)$', r'\n---\n<b>\1</b>\n---', h, flags=re.MULTILINE)
    h = re.sub(r'\*\*([^*\n]+)\*\*', r'<b>\1</b>', h)
    h = re.sub(r'^[-•]\s+(.+)$', r'  - \1', h, flags=re.MULTILINE)
    h = re.sub(r'\n{3,}', '\n\n', h)
    return h.strip()


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        url = request.url

        if '/' in url and '/webhook' not in url:
            return Response('Everest Bot is running', status=200)

        if request.method == 'POST' and '/webhook' in url:
            try:
                update = await request.json()
                await self.handle_update(update)
            except Exception as e:
                print(f'Error handling update: {e}')
            return Response('OK', status=200)

        return Response('Not found', status=404)

    async def handle_update(self, update):
        token = self.env.TG_TOKEN
        twelve_key = self.env.TWELVE_KEY
        gemini_key = self.env.GEMINI_KEY
        gemini_model = self.env.GEMINI_MODEL or 'gemini-2.5-flash'

        if 'message' in update:
            msg = update['message']
            chat_id = msg['chat']['id']
            text = msg.get('text', '').strip()

            if text == '/start':
                await send_message(token, chat_id,
                    '<b>Everest AI Terminal</b>\n\n'
                    'به بات تحلیل‌گر خوش آمدید!\n\n'
                    '/analyze - شروع تحلیل\n'
                    '/status - وضعیت اتصالات\n'
                    '/help - راهنما'
                )

            elif text == '/help':
                await send_message(token, chat_id,
                    '<b>راهنما</b>\n\n'
                    'برای تحلیل، از دستور /analyze استفاده کنید.\n\n'
                    '<b>نمادهای پشتیبانی‌شده:</b>\n'
                    '- XAU/USD (طلا)\n'
                    '- EUR/USD (یورو/دلار)\n'
                    '- BTC/USD (بیت‌کوین)\n'
                    '- GBP/USD (پوند/دلار)'
                )

            elif text == '/status':
                gemini_ok = 'OK' if gemini_key else 'NO'
                twelve_ok = 'OK' if twelve_key else 'NO'
                await send_message(token, chat_id,
                    f'<b>وضعیت سیستم</b>\n\n'
                    f'Gemini AI: {gemini_ok}\n'
                    f'Twelve Data: {twelve_ok}\n'
                    f'Telegram: OK'
                )

            elif text == '/analyze':
                keyboard = {
                    'inline_keyboard': [
                        [
                            {'text': 'XAU/USD', 'callback_data': 'analyze_XAUUSD'},
                            {'text': 'EUR/USD', 'callback_data': 'analyze_EURUSD'}
                        ],
                        [
                            {'text': 'BTC/USD', 'callback_data': 'analyze_BTCUSD'},
                            {'text': 'GBP/USD', 'callback_data': 'analyze_GBPUSD'}
                        ]
                    ]
                }
                await send_message(token, chat_id, '<b>نماد را انتخاب کنید:</b>', keyboard)

            elif text.startswith('/analyze '):
                symbol = text.replace('/analyze ', '').strip().upper()
                await self.run_analysis(token, chat_id, symbol, twelve_key, gemini_key, gemini_model)

        elif 'callback_query' in update:
            callback = update['callback_query']
            chat_id = callback['message']['chat']['id']
            data = callback['data']
            callback_id = callback['id']

            await answer_callback(token, callback_id)

            if data.startswith('analyze_'):
                symbol = data.replace('analyze_', '').replace('USD', '/USD')
                await self.run_analysis(token, chat_id, symbol, twelve_key, gemini_key, gemini_model)

    async def run_analysis(self, token, chat_id, symbol, twelve_key, gemini_key, gemini_model, timeframe='1h'):
        try:
            await send_message(token, chat_id, f'در حال تحلیل <b>{symbol}</b>...')

            interval_map = {'4H': '4h', '1H': '1h', '15M': '15min', '1M': '1min'}
            interval = interval_map.get(timeframe.upper(), '1h')

            klines = await fetch_twelve_data(symbol, interval, twelve_key, 200)

            full_prompt = LIVE_PREFIX + f'نماد: {symbol}\n\n'
            full_prompt += klines_to_text(klines, symbol, timeframe.upper()) + '\n\n'

            analysis_text = await call_gemini(gemini_key, SYSTEM_PROMPT + '\n\n' + full_prompt, gemini_model)

            levels = extract_levels(analysis_text)
            thresholds = {'minConfidence': 65, 'minRR': 1.5}
            levels = validate_signal(levels, thresholds)

            chart_bytes = create_chart_image(klines, symbol, levels)
            caption = build_caption(levels, 'Gemini')

            await send_photo(token, chat_id, chart_bytes, caption)

            full_text = tg_format(analysis_text)
            if len(full_text) > 100:
                for i in range(0, len(full_text), 3800):
                    chunk = full_text[i:i+3800]
                    await send_message(token, chat_id, chunk)
                    await asyncio.sleep(0.4)

        except Exception as e:
            error_msg = f'خطا در تحلیل:\n\n<code>{str(e)}</code>'
            await send_message(token, chat_id, error_msg)
