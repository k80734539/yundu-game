#!/usr/bin/env python3
"""產生新城鎮「星落鎮」與 E 階裝備「天穹」系列。要先跑過 gen_sky_abyss.py（本檔會改熔岩谷／天空神殿的傳送點與任務發布者）。可重複執行。"""
import json, copy, re
D = 'data/'
def load(f): return json.load(open(D + f + '.json'))
def save(f, d): open(D + f + '.json', 'w').write(json.dumps(d, ensure_ascii=False, indent=1))
def upsert(lst, obj):
    for i, x in enumerate(lst):
        if x['id'] == obj['id']: lst[i] = obj; return
    lst.append(obj)

# ── E 階裝備：由 D 階（星隕）放大。倍率集中在這裡 ──
K = dict(atk=1.3, matk=1.25, df=1.45, mdef=1.45, bonus=1.5, hp=2.0, price=1.6, reqLv=85)
LBL = dict(str='STR', agi='AGI', vit='VIT', int='INT', dex='DEX', luk='LUK', hp='HP', sp='SP', atk='ATK', matk='MATK', crit='CRIT', flee='FLEE', hit='HIT', def_='DEF', mdef='MDEF')
def zenith(it):
    z = copy.deepcopy(it)
    z['id'] = it['id'].replace('star_', 'zenith_'); z['name'] = it['name'].replace('星隕', '天穹').replace('星輝', '天穹')
    z['price'] = int(round(it['price'] * K['price'] / 1000.0)) * 1000; z['reqLv'] = K['reqLv']
    z['icon'] = {**it['icon'], 'c': '#ffe080'}
    if 'atk' in z: z['atk'] = int(round(z['atk'] * K['atk']))
    if 'matk' in z: z['matk'] = int(round(z['matk'] * K['matk']))
    if z.get('def'): z['def'] = int(round(z['def'] * K['df'])) + 2
    if z.get('mdef'): z['mdef'] = int(round(z['mdef'] * K['mdef']))
    b = {}
    for k, v in (it.get('bonus') or {}).items(): b[k] = int(round(v * (K['hp'] if k in ('hp', 'sp') else K['bonus'])))
    if it['slot'] in ('armor', 'shoes', 'garment') and 'hp' not in b: b['hp'] = 300   # 沒有 HP 的防具也給一點，補玩家血量不成長的缺口
    if b: z['bonus'] = b
    parts = []
    if z.get('matk'): parts.append(f"MATK +{z['matk']}%")
    if z.get('mdef'): parts.append(f"MDEF +{z['mdef']}")
    for k, v in b.items(): parts.append(f"{LBL[k]} +{v}")
    z['desc'] = ('、'.join(parts) if parts else '天穹碎片鍛造。') + '（需 Lv85）'
    return z

NPCS = [
 dict(id='kafra2', name='傳送員 瑟拉', title='服務處', look={"skin": "#f8e0c8", "hair": "#d0d0ff", "cloth": "#6a5ac0", "cloth2": "#ffffff", "pants": "#3a2a7a", "hairStyle": 1, "hat": "ribbon", "body": "robe"},
      text=["歡迎來到星落鎮。這裡是遠征隊的最後一個補給站。", "傳送、儲存點、重新配點都找我。"], opts=[("傳送服務", "warpmenu", None), ("設定儲存點", "save", None), ("重新配點", "reset", None), ("再見", "close", None)]),
 dict(id='inn2', name='旅館老闆 銀', title='旅館', look={"skin": "#e8c8a8", "hair": "#c8c8d8", "cloth": "#7a6aa0", "cloth2": "#ffffff", "pants": "#4a3a6a", "hairStyle": 0, "body": "robe"},
      text=["遠征的人都在我這裡過夜。住一晚 200 Zeny，完全恢復。", "也可以把這裡設為儲存點，倒下時就回到星落鎮。"], opts=[("休息（200 Zeny）", "heal", "200"), ("設定儲存點", "save", None), ("再見", "close", None)]),
 dict(id='tool2', name='補給商 奧圖', title='補給店', shop='tool', look={"skin": "#d8b088", "hair": "#4a3a5a", "cloth": "#5a6a9a", "cloth2": "#e8d8a0", "pants": "#3a3a5a", "hairStyle": 2, "hat": "band"},
      text=["藥水、翅膀、背包，要走遠就多帶一點。"], opts=[("購買", "shop", "tool"), ("出售", "sell", "tool"), ("再見", "close", None)]),
 dict(id='gear2', name='軍需官 索菲亞', title='星落軍需處', shop='starfall', look={"skin": "#e0b898", "hair": "#d8d8e8", "cloth": "#5a3a8a", "cloth2": "#ffe080", "pants": "#2a2a4a", "hairStyle": 2, "body": "armor", "hat": "helm"},
      text=["星落軍需處只賣給走過熔岩谷的人。", "天穹系列要 Lv85 才穿得動。想變強，就多去天空神殿和深淵迴廊走走。"], opts=[("購買", "shop", "starfall"), ("出售", "sell", "starfall"), ("再見", "close", None)]),
 dict(id='refiner2', name='鍛造師 岩', title='精煉與鍛造', shop='refine', look={"skin": "#c89870", "hair": "#2a2a2a", "cloth": "#4a3a5a", "cloth2": "#e0a050", "pants": "#2a2a3a", "hairStyle": 0, "hat": "band"},
      text=["我在這裡等你把 MVP 的核心帶來。", "天空神殿和深淵迴廊的武器，都能在這裡換。"], opts=[("精煉裝備", "refine", None), ("購買礦石", "shop", "refine"), ("分解裝備", "forge", "dismantle"), ("用 Boss 素材兌換裝備", "forge", "exchange"), ("插入卡片", "cards", None), ("再見", "close", None)]),
 dict(id='captain2', name='遠征隊長 凱恩', title='討伐任務', look={"skin": "#e8c0a0", "hair": "#c8c8d8", "cloth": "#4a2a8a", "cloth2": "#ffe080", "pants": "#2a2a4a", "hairStyle": 2, "body": "armor", "hat": "helm", "weapon": "sword", "cape": "#6a4ab0"},
      text=["熔岩谷之後就是天空神殿，再往下是深淵迴廊。", "能走到這裡的人不多。有事交給我。"], opts=[("任務", "quests", None), ("再見", "close", None)]),
]
def main():
    it = load('items'); sh = load('shops'); mp = load('maps'); nq = load('npcs'); qs = load('quests')
    z = []
    for i in [x for x in it if x['id'].startswith('star_')]:
        e = zenith(i); upsert(it, e); z.append(e['id'])
    upsert(sh, {"id": "starfall", "name": "星落軍需處", "items": z})
    for n in NPCS:
        d = {"id": n['id'], "name": n['name'], "title": n['title'], "look": n['look'], "dialog": {"start": {"text": n['text'], "opts": [({"label": l, "act": a, **({"arg": g} if g else {})}) for (l, a, g) in n['opts']]}}}
        if n.get('shop'): d = {"id": d['id'], "name": d['name'], "title": d['title'], "shop": n['shop'], "look": d['look'], "dialog": d['dialog']}
        upsert(nq, d)
    # 地圖：星落鎮 44×44，中央廣場＋東西向主路；西門通熔岩谷、東門通天空神殿
    town = {"id": "starfall", "name": "星落鎮", "type": "town", "w": 44, "h": 44, "seed": 211, "base": "dirt", "bgm": "town", "border": "dead", "pos": [12, 6], "tint": "rgba(170,140,255,0.12)",
            "areas": [{"t": "road", "shape": "circle", "x": 22.5, "y": 22.5, "r": 7}, {"t": "sand", "shape": "blob", "x": 9, "y": 34, "r": 4}, {"t": "sand", "shape": "blob", "x": 36, "y": 10, "r": 3.5}],
            "roads": [{"t": "road", "width": 3.2, "pts": [[2, 22.5], [12, 22.5], [22.5, 22.5], [33, 22.5], [41.5, 22.5]]}, {"t": "road", "width": 2.4, "pts": [[22.5, 22.5], [22.5, 14], [22.5, 9]]}, {"t": "road", "width": 2.4, "pts": [[22.5, 22.5], [22.5, 32], [22.5, 38]]},
                      {"t": "road", "width": 2, "pts": [[14, 22.5], [13, 17], [12, 15]]}, {"t": "road", "width": 2, "pts": [[30, 22.5], [30, 17], [30, 15]]}, {"t": "road", "width": 2, "pts": [[31, 22.5], [32, 28], [32, 31]]}],
            "props": [{"type": "fountain", "x": 22, "y": 22}, {"type": "inn", "x": 12, "y": 12, "v": 0}, {"type": "shop", "x": 30, "y": 12, "v": 1}, {"type": "smith", "x": 33, "y": 31, "v": 3}, {"type": "house", "x": 10, "y": 30, "v": 2}, {"type": "house2", "x": 15, "y": 33, "v": 1},
                      {"type": "house", "x": 29, "y": 36, "v": 0}, {"type": "house2", "x": 36, "y": 15, "v": 2}, {"type": "stall", "x": 17, "y": 18, "v": 0}, {"type": "stall", "x": 27, "y": 27, "v": 2}, {"type": "stall", "x": 27, "y": 18, "v": 1},
                      {"type": "lamp", "x": 19, "y": 19}, {"type": "lamp", "x": 26, "y": 19}, {"type": "lamp", "x": 19, "y": 26}, {"type": "lamp", "x": 26, "y": 26}, {"type": "lamp", "x": 7, "y": 21}, {"type": "lamp", "x": 7, "y": 24}, {"type": "lamp", "x": 38, "y": 21}, {"type": "lamp", "x": 38, "y": 24},
                      {"type": "statue", "x": 21, "y": 11}, {"type": "statue", "x": 24, "y": 11}, {"type": "well", "x": 15, "y": 27}, {"type": "sign", "x": 5, "y": 24}, {"type": "sign", "x": 39, "y": 24}, {"type": "barrel", "x": 13, "y": 20}, {"type": "crate", "x": 14, "y": 20}, {"type": "barrel", "x": 35, "y": 19},
                      {"type": "crate", "x": 36, "y": 19}, {"type": "tent", "x": 38, "y": 29, "v": 0}, {"type": "tent", "x": 6, "y": 28, "v": 0}],
            "scatter": [{"type": "crystal", "n": 16, "on": ["dirt", "sand"]}, {"type": "rock", "n": 24}, {"type": "tuft", "n": 14}, {"type": "stump", "n": 3}],
            "portals": [{"x": 2, "y": 22, "to": "volcano", "tx": 50, "ty": 12}, {"x": 41, "y": 22, "to": "sky", "tx": 47, "ty": 47}],
            "npcs": [{"id": "kafra2", "x": 20, "y": 28, "dir": 0}, {"id": "inn2", "x": 12, "y": 17, "dir": 0}, {"id": "tool2", "x": 30, "y": 17, "dir": 0}, {"id": "gear2", "x": 28, "y": 24, "dir": 0}, {"id": "refiner2", "x": 34, "y": 28, "dir": 0}, {"id": "captain2", "x": 37, "y": 22, "dir": 1}]}
    upsert(mp, town)
    vol = [x for x in mp if x['id'] == 'volcano'][0]; vol['portals'] = [p for p in vol['portals'] if p['to'] not in ('sky', 'starfall')] + [{"x": 52, "y": 8, "to": "starfall", "tx": 6, "ty": 22}]
    sky = [x for x in mp if x['id'] == 'sky'][0]
    for p in sky['portals']:
        if p['to'] in ('volcano', 'starfall'): p['to'] = 'starfall'; p['tx'] = 38; p['ty'] = 22
    for q in qs:
        if q['id'] in ('q_cap8', 'q_mvp_sky', 'q_cap9', 'q_mvp_abyss'): q['npc'] = 'captain2'
    for f, d in (('items', it), ('shops', sh), ('maps', mp), ('npcs', nq), ('quests', qs)): save(f, d)
    print('ok zenith', len(z))
main()
