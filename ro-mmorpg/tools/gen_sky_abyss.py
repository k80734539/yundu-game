#!/usr/bin/env python3
"""產生 Lv78~99 的兩張新地圖（天空神殿、深淵迴廊）及其怪物、MVP、道具、任務、掉落。可重複執行（依 id 覆寫）。
數字都集中在這支檔最上面的表，要調平衡改這裡再重跑。"""
import json, copy
D = 'data/'
def load(f): return json.load(open(D + f + '.json'))
def save(f, d): open(D + f + '.json', 'w').write(json.dumps(d, ensure_ascii=False, indent=1))
def upsert(lst, obj, key='id'):
    for i, x in enumerate(lst):
        if x[key] == obj[key]: lst[i] = obj; return
    lst.append(obj)

# ── 怪物：id, 名稱, 等級, hp, atk, def, mdef, exp, 外觀, 材料(id,名稱,說明,icon), 卡片(slot, 敘述, bonus) ──
def mob(id, name, lv, hp, atk, df, mdf, exp, look, rng=1, spd=2.6, adelay=1300, frame=192, aggro=True, mat=None, card=None):
    d = {"id": id, "name": name, "lv": lv, "hp": hp, "atk": atk, "def": df, "mdef": mdf, "str": lv + 10, "agi": 40, "vit": round(lv * 0.7), "int": 20, "dex": lv + 20, "luk": 15,
         "exp": exp, "jexp": exp // 2, "range": rng, "adelay": adelay, "speed": spd, "aggro": aggro, "frame": frame, "look": look,
         "drops": [{"item": mat[0], "rate": 0.6}, {"item": 'white_potion', "rate": 0.08}, {"item": card[0], "rate": 0.008}]}
    return d
SKY = [
 dict(id='cloud_hawk', name='雲翼鷹', lv=79, hp=9000, atk=[320, 400], df=40, mdf=45, exp=12000, look={"body": "bird", "color": "#e8f0ff", "color2": "#ffd860", "scale": 2.3}, spd=3.6, adelay=1150, frame=160,
      mat=('cloud_feather', '雲羽', '雲上鷹隼的白色羽毛。', 'feather', '#e8f0ff'), card=('cloud_hawk_card', '雲翼鷹卡片', 'garment', '可插入披風的卡片。FLEE +30、移動加快。', {"flee": 30, "agi": 5})),
 dict(id='temple_guardian', name='神殿石像衛', lv=82, hp=12000, atk=[340, 420], df=60, mdf=40, exp=18000, look={"body": "golem", "color": "#e8e4d8", "color2": "#ffd860", "scale": 1.9}, spd=1.9, adelay=1500, frame=224,
      mat=('holy_stone', '聖石碎片', '神殿石像身上剝落的白色石塊。', 'ore', '#f0ece0'), card=('temple_guardian_card', '神殿石像衛卡片', 'shield', '可插入盾牌的卡片。DEF +8、MDEF +10。', {"def": 8, "mdef": 10})),
 dict(id='wind_spirit', name='風之靈', lv=85, hp=10500, atk=[360, 440], df=25, mdf=75, exp=28000, look={"body": "ghost", "color": "#a0e8ff", "scale": 2.3}, rng=3, spd=3.2, adelay=1250, frame=160,
      mat=('wind_essence', '風之精華', '凝聚的風，在手中打轉。', 'soul', '#a0e8ff'), card=('wind_spirit_card', '風之靈卡片', 'garment', '可插入披風的卡片。INT +7、MATK +45。', {"int": 7, "matk": 45})),
 dict(id='winged_sentinel', name='天翼侍衛', lv=88, hp=14000, atk=[380, 460], df=50, mdf=50, exp=42000, look={"body": "humanoid", "skin": "#f0d8c0", "hair": "#fff0b0", "cloth": "#f4f0e8", "cloth2": "#e0b030", "pants": "#c8c0b0", "eye": "#60c0ff", "weapon": "sword", "hat": "helm", "body2": "armor", "scale": 1.25}, spd=2.7, adelay=1300, frame=224,
      mat=('sentinel_crest', '侍衛徽章', '天翼侍衛的金色徽章。', 'brooch', '#ffd860'), card=('winged_sentinel_card', '天翼侍衛卡片', 'armor', '可插入鎧甲的卡片。VIT +6、HP +600。', {"vit": 6, "hp": 600})),
]
ABYSS = [
 dict(id='shadow_bat', name='暗影蝠', lv=90, hp=11000, atk=[400, 490], df=40, mdf=50, exp=60000, look={"body": "bat", "color": "#3a2a5a", "scale": 2.4}, spd=3.8, adelay=1100, frame=160,
      mat=('shadow_wing', '影蝠翼', '漆黑的蝠翼，摸起來冰冷。', 'batwing', '#5a3a8a'), card=('shadow_bat_card', '暗影蝠卡片', 'garment', '可插入披風的卡片。FLEE +35。', {"flee": 35})),
 dict(id='abyss_worm', name='深淵蠕蟲', lv=93, hp=14000, atk=[420, 510], df=50, mdf=40, exp=100000, look={"body": "snake", "color": "#5a2a7a", "color2": "#c070ff", "scale": 2.0}, spd=2.4, adelay=1400, frame=192,
      mat=('worm_fang', '蠕蟲毒牙', '深淵蠕蟲的紫色毒牙。', 'tooth', '#a050e0'), card=('abyss_worm_card', '深淵蠕蟲卡片', 'weapon', '可插入武器的卡片。ATK +45、HP +500。', {"atk": 45, "hp": 500})),
 dict(id='void_shade', name='虛空幽影', lv=96, hp=12000, atk=[440, 530], df=25, mdf=80, exp=150000, look={"body": "ghost", "color": "#9040d0", "scale": 2.5}, rng=3, spd=3.1, adelay=1250, frame=160,
      mat=('void_shard', '虛空碎片', '像是把一小塊黑暗拿在手裡。', 'crystal', '#8040c0'), card=('void_shade_card', '虛空幽影卡片', 'head', '可插入頭部裝備的卡片。MATK +60、SP +100。', {"matk": 60, "sp": 100})),
 dict(id='fallen_knight', name='墮落騎士', lv=99, hp=16000, atk=[460, 560], df=55, mdf=50, exp=240000, look={"body": "humanoid", "skin": "#b8a8c0", "hair": "#2a1a3a", "cloth": "#3a2a4a", "cloth2": "#a060e0", "pants": "#1a1a2a", "eye": "#ff40a0", "weapon": "sword", "hat": "helm", "body2": "armor", "scale": 1.3}, spd=2.7, adelay=1300, frame=224,
      mat=('fallen_crest', '墮落紋章', '騎士團墜入深淵後，紋章變成了紫色。', 'brooch', '#a060e0'), card=('fallen_knight_card', '墮落騎士卡片', 'armor', '可插入鎧甲的卡片。DEF +10、HP +900。', {"def": 10, "hp": 900})),
]
MVPS = {
 'sky_guardian': dict(name='蒼雷守護者', lv=88, hp=380000, atk=[560, 700], df=60, mdf=70, vit=100, exp=150000, look={"body": "golem", "color": "#f0ece0", "color2": "#60c8ff", "scale": 4.2}, mat=('sky_core', '蒼天之核', '蒼雷守護者胸口的雷核，可在鍛造處換取專屬武器。', 'core', '#60c8ff'), cnt=28,
      card=('sky_guardian_card', '蒼雷守護者卡片', '可插入武器的卡片。ATK +75、CRIT +10。', {"atk": 75, "crit": 10}), zeny=[150000, 220000], first={"exp": 2000000, "jexp": 800000, "zeny": 600000},
      weapons=[('sky_blade', '蒼雷劍', 'sword', 'sword', 235, None, ["swordsman", "paladin", "templar"], {"str": 6, "vit": 3}, '劍身流動著雷光。'), ('sky_staff', '蒼雷法杖', 'staff', 'staff', 115, 66, ["mage", "elementalist", "archmage"], {"int": 6}, 'MATK +66%。'), ('sky_bow', '蒼雷弓', 'bow', 'bow', 212, None, ["archer", "ranger", "sniper"], {"dex": 6}, '箭矢帶著閃電。'), ('sky_lance', '蒼雷槍', 'sword', 'spear', 275, None, ["paladin", "templar"], {"str": 6}, '槍尖是蒼雷守護者的雷刃。')],
      color='#60c8ff', title='蒼雷',
      moves=[('attack', '雷拳', 'melee', 4, 0.5), ('tail', '雷環', 'aoe', 3, 2.1), ('bolt', '落雷', 'aoe', 3, 2.4), ('charge', '雷霆衝鋒', 'charge', 3, 2.0)], enr=[('summon', '召喚風靈', 'summon'), ('storm', '雷暴', 'barrage')], minion='wind_spirit'),
 'abyss_lord': dict(name='深淵領主', lv=99, hp=480000, atk=[600, 760], df=70, mdf=85, vit=110, exp=400000, look={"body": "ghost", "color": "#7030c0", "color2": "#ff40a0", "scale": 4.5}, mat=('abyss_core', '深淵之核', '深淵領主的黑暗核心，可在鍛造處換取專屬武器。', 'core', '#a040ff'), cnt=30,
      card=('abyss_lord_card', '深淵領主卡片', '可插入武器的卡片。ATK +90、CRIT +12。', {"atk": 90, "crit": 12}), zeny=[250000, 350000], first={"exp": 6000000, "jexp": 2400000, "zeny": 1000000},
      weapons=[('abyss_blade', '深淵斷劍', 'sword', 'sword', 275, None, ["swordsman", "paladin", "templar"], {"str": 7, "vit": 4}, '斷裂的劍身吸走了周圍的光。'), ('abyss_staff', '深淵權杖', 'staff', 'staff', 130, 76, ["mage", "elementalist", "archmage"], {"int": 7}, 'MATK +76%。'), ('abyss_bow', '深淵之弓', 'bow', 'bow', 245, None, ["archer", "ranger", "sniper"], {"dex": 7}, '沒有弦，射出的是影子。'), ('abyss_lance', '深淵長槍', 'sword', 'spear', 320, None, ["paladin", "templar"], {"str": 7}, '槍尖在黑暗中看不見。')],
      color='#a040ff', title='深淵',
      moves=[('attack', '暗爪', 'melee', 4, 0.5), ('tail', '虛空環', 'aoe', 3, 2.2), ('bolt', '深淵爆裂', 'aoe', 3, 2.5), ('charge', '墜影突襲', 'charge', 3, 2.1)], enr=[('summon', '召喚幽影', 'summon'), ('storm', '黑暗流星', 'barrage')], minion='void_shade'),
}
def main():
    mo = load('monsters'); it = load('items'); mp = load('maps'); bf = load('bossfights'); lo = load('loot'); qs = load('quests')
    for grp in (SKY, ABYSS):
        for s in grp:
            m = mob(s['id'], s['name'], s['lv'], s['hp'], s['atk'], s['df'], s['mdf'], s['exp'], s['look'], s.get('rng', 1), s.get('spd', 2.6), s.get('adelay', 1300), s.get('frame', 192), mat=s['mat'], card=s['card'])
            upsert(mo, m)
            mid, mn, md, ik, ic = s['mat']; upsert(it, {"id": mid, "name": mn, "type": "etc", "price": int(s['lv'] * 3.5), "weight": 1, "desc": md, "icon": {"k": ik, "c": ic}})
            cid, cn, slot, cd, cb = s['card']; upsert(it, {"id": cid, "name": cn, "type": "card", "price": 20, "weight": 1, "desc": cd, "icon": {"k": "card", "c": "#e8c050"}, "cardFor": slot, "bonus": cb})
    for bid, b in MVPS.items():
        mid, mn, md, ik, ic = b['mat']; cid, cn, cd, cb = b['card']
        look = b['look']
        upsert(mo, {"id": bid, "name": b['name'], "lv": b['lv'], "hp": b['hp'], "atk": b['atk'], "def": b['df'], "mdef": b['mdf'], "str": 150, "agi": 40, "vit": b['vit'], "int": 20, "dex": 150, "luk": 15,
                    "exp": b['exp'], "jexp": b['exp'] // 2, "range": 1, "adelay": 1500, "speed": 2.3, "aggro": True, "frame": 320, "look": look,
                    "drops": [{"item": mid, "rate": 0.6}, {"item": 'white_potion', "rate": 0.8}, {"item": cid, "rate": 0.05}], "mvp": True, "skills": [{"id": "stomp", "chance": 0.25}, {"id": "summon", "chance": 0.2}]})
        upsert(it, {"id": mid, "name": mn, "type": "etc", "price": 20000, "weight": 1, "desc": md, "icon": {"k": ik, "c": ic}})
        upsert(it, {"id": cid, "name": cn, "type": "card", "price": 20, "weight": 1, "desc": cd, "icon": {"k": "card", "c": "#e8c050"}, "cardFor": "weapon", "bonus": cb})
        ex = []
        for (wid, wn, icon, wtype, atk, matk, jobs, bonus, desc) in b['weapons']:
            w = {"id": wid, "name": wn, "type": "weapon", "price": 40000, "weight": 100, "desc": desc, "icon": {"k": icon, "c": b['color']}, "slot": "weapon", "wtype": wtype, "atk": atk, "wlv": 3, "slots": 1, "jobs": jobs, "bossEx": bid, "bonus": bonus}
            if matk: w["matk"] = matk
            upsert(it, w); ex.append(wid)
        lo['boss'][bid] = {"zeny": b['zeny'], "material": mid, "materialCount": [2, 4], "equipChance": 0.3, "exclusiveChance": 0.08, "cardChance": 0.01, "card": cid, "exclusives": ex}
        for r in lo['exchange']:
            if r['cost'].keys() == {mid}: lo['exchange'].remove(r); break
        lo['exchange'].append({"cost": {mid: b['cnt']}, "items": ex})
        moves = []
        for (i, n, t, w, mult) in b['moves']:
            if t == 'melee': moves.append({"id": i, "name": n, "type": "melee", "weight": w, "mult": mult, "windup": 0.45, "recover": 0.3})
            elif i == 'tail': moves.append({"id": i, "name": n, "type": "aoe", "center": "self", "radius": 4.0, "weight": w, "mult": mult, "windup": 0.9, "recover": 0.6, "maxDist": 7})
            elif t == 'aoe': moves.append({"id": i, "name": n, "type": "aoe", "center": "target", "radius": 2.6, "weight": w, "mult": mult, "windup": 1.0, "recover": 0.6, "maxDist": 10})
            else: moves.append({"id": i, "name": n, "type": "charge", "length": 11, "width": 1.6, "weight": w, "mult": mult, "windup": 0.8, "dashTime": 0.26, "recover": 0.7, "minDist": 0, "maxDist": 13})
        enr = [{"id": "summon", "name": b['enr'][0][1], "type": "summon", "weight": 3, "windup": 1.0, "recover": 0.5, "maxDist": 14},
               {"id": "meteor", "name": b['enr'][1][1], "type": "barrage", "radius": 1.8, "count": 7, "interval": 0.32, "spread": 3.4, "weight": 3, "mult": 2.1, "windup": 0.9, "recover": 0.7, "maxDist": 11}]
        bf['bosses'][bid] = {"moves": moves, "enrageMoves": enr, "firstKill": {**b['first'], "items": [["white_potion", 20], ["oridecon", 20], ["elunium", 20]]}}
    # 地圖：天空神殿＝遺跡水平鏡射、深淵迴廊＝遺跡垂直鏡射（保證連通）
    ru = [x for x in mp if x['id'] == 'ruins'][0]
    def mirror(src, nid, name, seed, flipx, base, bgm, lvl, pos, dark, tint, spawns, mvp, portals, extra_scatter):
        m = copy.deepcopy(src)
        for k in ('portals', 'spawns', 'mvp', 'props'): m.pop(k, None)
        W = H = 60
        fx = (lambda x: W - 1 - x) if flipx else (lambda x: x)
        fy = (lambda y: y) if flipx else (lambda y: H - 1 - y)
        m['rooms'] = [[(W - r[0] - r[2]) if flipx else r[0], r[1] if flipx else (H - r[1] - r[3]), r[2], r[3]] for r in src['rooms']]
        m['corridors'] = [{**c, "pts": [[fx(p[0]), fy(p[1])] for p in c['pts']]} for c in src['corridors']]
        m['props'] = [{**p, "x": fx(p['x']), "y": fy(p['y'])} for p in src['props'] if p['type'] != 'torch'] + [{"type": "torch", "x": fx(p['x']), "y": fy(p['y'])} for p in src['props'] if p['type'] == 'torch']
        m.update({"id": nid, "name": name, "seed": seed, "base": base, "bgm": bgm, "level": lvl, "pos": pos, "dark": dark, "tint": tint, "scatter": extra_scatter,
                  "portals": portals, "spawns": spawns, "mvp": mvp})
        return m
    fxs = lambda x: 59 - x
    sky = mirror(ru, 'sky', '天空神殿', 131, True, 'floor', 'field2', [78, 88], [11, 3], 0.0, 'rgba(190,220,255,0.18)',
        [{"m": "cloud_hawk", "n": 9}, {"m": "temple_guardian", "n": 7}, {"m": "wind_spirit", "n": 7}, {"m": "winged_sentinel", "n": 6}],
        {"m": "sky_guardian", "x": fxs(41), "y": 13, "respawn": 3000},
        [{"x": fxs(10), "y": 50, "to": "volcano", "tx": 50, "ty": 12}, {"x": fxs(12), "y": 12, "to": "abyss", "tx": 10, "ty": 12}],
        [{"type": "crystal", "n": 18, "on": ["floor"]}, {"type": "rock", "n": 6, "on": ["floor"]}])
    ab = mirror(ru, 'abyss', '深淵迴廊', 149, False, 'cave', 'dungeon2', [88, 99], [13, 4], 0.6, 'rgba(120,50,200,0.22)',
        [{"m": "shadow_bat", "n": 9}, {"m": "abyss_worm", "n": 7}, {"m": "void_shade", "n": 7}, {"m": "fallen_knight", "n": 6}],
        {"m": "abyss_lord", "x": 41, "y": 59 - 13, "respawn": 3600},
        [{"x": 10, "y": 9, "to": "sky", "tx": fxs(12) - 3, "ty": 15}],
        [{"type": "crystal", "n": 20, "on": ["cave"]}, {"type": "rock", "n": 14, "on": ["cave"]}])
    for m in (sky, ab): upsert(mp, m)
    vol = [x for x in mp if x['id'] == 'volcano'][0]
    vol['pos'] = [10, 5]  # 與凜冬雪原 [9,3] 錯開，世界地圖縮圖才不會重疊
    vol['portals'] = [p for p in vol['portals'] if p['to'] != 'sky'] + [{"x": 52, "y": 8, "to": "sky", "tx": fxs(10) - 2 + 0, "ty": 47}]
    # 任務（衛兵隊長 巴德）
    upsert(qs, {"id": "q_cap8", "name": "天空神殿的先遣", "npc": "captain", "type": "kill", "target": "temple_guardian", "count": 20,
                "desc": "熔岩谷盡頭的山壁後面，出現了一道通往雲端的石階。神殿石像衛守在入口。擊敗 20 隻神殿石像衛。",
                "done": "天空神殿的入口暫時打通了，這是報酬。", "reward": {"exp": 4000000, "jexp": 1500000, "zeny": 400000}, "reqLv": 78, "prev": "q_cap7"})
    upsert(qs, {"id": "q_mvp_sky", "name": "討伐蒼雷守護者", "npc": "captain", "type": "kill", "target": "sky_guardian", "count": 1,
                "desc": "天空神殿深處的蒼雷守護者引來了雷雲。牠一動，整片神殿都在發亮。",
                "done": "蒼雷守護者倒下了，雲層裂開了一道縫。", "reward": {"exp": 12000000, "jexp": 3000000, "zeny": 1200000, "items": [["elunium", 15], ["oridecon", 15]]}, "reqLv": 85, "prev": "q_cap8"})
    upsert(qs, {"id": "q_cap9", "name": "深淵迴廊的先遣", "npc": "captain", "type": "kill", "target": "fallen_knight", "count": 15,
                "desc": "雲層的裂縫下面是一條看不見底的迴廊，墮落騎士在那裡徘徊。擊敗 15 隻墮落騎士。",
                "done": "深淵迴廊的入口守住了，這是報酬。", "reward": {"exp": 20000000, "jexp": 6000000, "zeny": 800000}, "reqLv": 88, "prev": "q_mvp_sky"})
    upsert(qs, {"id": "q_mvp_abyss", "name": "討伐深淵領主", "npc": "captain", "type": "kill", "target": "abyss_lord", "count": 1,
                "desc": "深淵迴廊的盡頭，有一個吞掉光的影子。沒有人回來說牠長什麼樣子。",
                "done": "深淵領主倒下了……你已經走到這個世界的盡頭。", "reward": {"exp": 40000000, "jexp": 10000000, "zeny": 2500000, "items": [["elunium", 25], ["oridecon", 25]]}, "reqLv": 95, "prev": "q_cap9"})
    for f, d in (('monsters', mo), ('items', it), ('maps', mp), ('bossfights', bf), ('loot', lo), ('quests', qs)): save(f, d)
    print('ok', len(mo), len(it), len(mp))
main()
