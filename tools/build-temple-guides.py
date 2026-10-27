"""由 docs/maps/temple-v52/layout-*.json 產生三張路線草圖（給生圖用，也給人看）。
用法：python3 tools/build-temple-guides.py
只畫路線與地標，不是美術：路面寬度、位置以草圖為準，底圖要貼合它。"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/maps/temple-v52'
FONT = None
for p in ('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',):
    if Path(p).exists():
        FONT = p
def font(n): return ImageFont.truetype(FONT, n) if FONT else ImageFont.load_default()

WATER, PATH, CLEAR = '#243c51', '#bca77c', '#c8b58c'
UPPER, UPPERCLEAR = '#d9c79a', '#e4d4aa'
KIND = {'lantern': ('#ffd36a', '燈籠'), 'lore': ('#c9ddda', '碑'), 'chest': ('#ece09c', '寶箱'),
        'fight': ('#e8707a', '戰鬥'), 'boss': ('#ff9a4a', '河伯'), 'seal': ('#e8a4ed', '封印'),
        'decor': ('#7aa0b8', '景'), 'gate': ('#ff6b6b', '鎖門'),
        'pole': ('#d8a35a', '撐篙'), 'lever': ('#9ad0ff', '水閘')}

def draw(name):
    data = json.loads((OUT / f'layout-{name}.json').read_text(encoding='utf-8'))
    w, h = data['world']['width'], data['world']['height']
    im = Image.new('RGB', (w, h), WATER)
    d = ImageDraw.Draw(im)
    pw = data['paintedPathWidth']
    upper = set(data.get('upper', []))
    for e in data['edges']:
        a, b = e[0], e[1]
        opt = e[2] if len(e) > 2 else {}
        pa, pb = tuple(data['nodes'][a]), tuple(data['nodes'][b])
        kind = opt.get('kind')
        col = UPPER if (a in upper and b in upper) else PATH
        if kind == 'flooded':
            col = '#6f8ea8'
        if kind == 'gap':
            for sx, sy in (pa, pb):
                d.ellipse((sx - 30, sy - 30, sx + 30, sy + 30), fill=PATH)
            d.line([pa, pb], fill='#e8707a', width=6)
            mx, my = (pa[0] + pb[0]) // 2, (pa[1] + pb[1]) // 2
            d.text((mx - 40, my - 44), '缺口(撐篙)', fill='#ffb4a8', font=font(18))
            continue
        if kind == 'barrier':
            d.line([pa, pb], fill='#8a6a6a', width=pw)
            mx, my = (pa[0] + pb[0]) // 2, (pa[1] + pb[1]) // 2
            d.text((mx + 60, my - 10), '封印屏障', fill='#ffb4a8', font=font(18))
            continue
        d.line([pa, pb], fill=col, width=pw)
        for x, y in (pa, pb):
            d.ellipse((x - pw / 2, y - pw / 2, x + pw / 2, y + pw / 2), fill=col)
        if kind == 'stairs':
            n = 7
            for i in range(n + 1):
                t = i / n
                x = pa[0] + (pb[0] - pa[0]) * t
                y = pa[1] + (pb[1] - pa[1]) * t
                d.line((x - 44, y, x + 44, y), fill='#6a5a3a', width=3)
            d.text(((pa[0] + pb[0]) // 2 + 54, (pa[1] + pb[1]) // 2 - 10), '階梯(上下層)', fill='white', font=font(18))
        if kind == 'flooded':
            mx, my = (pa[0] + pb[0]) // 2, (pa[1] + pb[1]) // 2
            d.text((mx + 14, my - 10), '淹水→' + opt.get('open', ''), fill='#dff0ff', font=font(18))
    for c in data['clearings']:
        col = UPPERCLEAR if c['id'] in upper or any(c['x'] == data['nodes'][n][0] and c['y'] == data['nodes'][n][1] and n in upper for n in data['nodes']) else CLEAR
        d.ellipse((c['x'] - c['rx'] - 12, c['y'] - c['ry'] - 12, c['x'] + c['rx'] + 12, c['y'] + c['ry'] + 12), fill=col)
    for o in data.get('overlays', []):
        x, y, ww, hh = o['rect']
        ov = Image.new('RGBA', (ww, hh), (60, 140, 220, 120))
        im.paste(ov, (x, y), ov)
        d.rectangle((x, y, x + ww, y + hh), outline='#9ad0ff', width=3)
        d.text((x + 6, y + 6), '疊水區(%s)' % o['open'], fill='#dff0ff', font=font(16))
    for s in data.get('solids', []):
        d.ellipse((s['x'] - s['rx'], s['y'] - s['ry'], s['x'] + s['rx'], s['y'] + s['ry']), fill='#5b6d7a', outline='#e6eef2', width=3)
        d.text((s['x'] - 22, s['y'] - 10), '水井', fill='white', font=font(18))
    for key, (x, y, ww, hh) in data.get('zones', {}).items():
        d.rectangle((x, y, x + ww, y + hh), outline='#83debe', width=4)
        d.text((x + 4, y + 4), '出入口 ' + key, fill='#83debe', font=font(18))
    for f in data.get('features', []):
        col, label = KIND.get(f['kind'], ('#ffffff', f['kind']))
        if 'rect' in f:
            x, y, ww, hh = f['rect']
            d.rectangle((x, y, x + ww, y + hh), fill=col, outline='white', width=3)
            d.text((x, y - 22), label + ' ' + f['id'], fill='white', font=font(18))
            continue
        x, y = f['x'], f['y']
        if 'trigger' in f:
            tx, ty, tw, th = f['trigger']
            d.rectangle((tx, ty, tx + tw, ty + th), outline=col, width=3)
        d.ellipse((x - 13, y - 13, x + 13, y + 13), fill=col, outline='white', width=2)
        d.text((x - 36, y + 18), label + ' ' + f['id'], fill='white', font=font(18))
        if 'stand' in f:
            sx, sy = f['stand']
            d.line((x, y, sx, sy), fill=col, width=2)
            d.ellipse((sx - 5, sy - 5, sx + 5, sy + 5), outline=col, width=2)
    for k, (x, y) in data['nodes'].items():
        d.ellipse((x - 4, y - 4, x + 4, y + 4), fill='#3b2f1d')
    d.rectangle((0, 0, 420, 70), fill='#10202c')
    d.text((14, 8), f"{data['title']}  {w}×{h}", fill='white', font=font(26))
    d.text((14, 42), '米色=下層路面 淺黃=上層 藍斜=疊水區（碰撞寬 %d）' % data['pathWidth'], fill='#cfe0ea', font=font(16))
    im.save(OUT / f'guide-{name}.png')
    return data

def overview():
    names = ['shore', 'court', 'hall']
    ims = [Image.open(OUT / f'guide-{n}.png').resize((448, 299)) for n in names]
    sheet = Image.new('RGB', (448 * 3 + 80, 299 + 90), '#10202c')
    d = ImageDraw.Draw(sheet)
    for i, im in enumerate(ims):
        sheet.paste(im, (i * (448 + 40), 70))
    for i in range(2):
        x = 448 + i * (448 + 40) + 4
        d.text((x, 70 + 120), '→', fill='#ffd36a', font=font(32))
    d.text((10, 10), '河神廟三張地圖：廟前淺灘（兩條路）→ 鎮水中庭（上下兩層、三種點燈）→ 水府後殿（環形走廊、神龕、河伯）', fill='white', font=font(20))
    sheet.save(OUT / 'overview.png')

for n in ('shore', 'court', 'hall'):
    draw(n)
overview()
print('guides written to', OUT)
