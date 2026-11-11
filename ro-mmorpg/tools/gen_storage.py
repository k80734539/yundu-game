#!/usr/bin/env python3
"""倉庫管理員（晨曦鎮、星落鎮各一位）。可重複執行。倉庫格數／手續費在 data/storage.json。"""
import json
D = 'data/'
def load(f): return json.load(open(D + f + '.json'))
def save(f, d): open(D + f + '.json', 'w').write(json.dumps(d, ensure_ascii=False, indent=1))
def upsert(lst, o, key='id'):
    for i, x in enumerate(lst):
        if x[key] == o[key]: lst[i] = o; return
    lst.append(o)
npcs = load('npcs'); maps = load('maps')
def npc(id, name, look, text):
    return {"id": id, "name": name, "title": "倉庫", "look": look, "dialog": {"start": {"text": text, "opts": [{"label": "使用倉庫", "act": "storage"}, {"label": "再見", "act": "close"}]}}}
upsert(npcs, npc('store', '倉庫管理員 魯伯', {"skin": "#e8c8a0", "hair": "#7a5a3a", "cloth": "#6a5a3a", "cloth2": "#d8c890", "pants": "#4a3a2a", "hairStyle": 0, "hat": "band"},
    ["冒險者的行李都可以放在我這裡。", "晨曦鎮和星落鎮的倉庫是通的，放在這邊，到那邊也拿得到。"]))
upsert(npcs, npc('store2', '倉庫管理員 諾亞', {"skin": "#d8b898", "hair": "#c8c8d8", "cloth": "#5a4a7a", "cloth2": "#e0d0a0", "pants": "#3a2a4a", "hairStyle": 1, "hat": "band"},
    ["遠征帶回來的戰利品，先放我這裡吧。", "這裡和晨曦鎮的倉庫是同一個，東西都在。"]))
for mid, n in (('aurora', {"id": "store", "x": 20, "y": 33, "dir": 0}), ('starfall', {"id": "store2", "x": 26, "y": 31, "dir": 0})):
    m = [x for x in maps if x['id'] == mid][0]; m['npcs'] = [x for x in m['npcs'] if x['id'] != n['id']] + [n]
save('npcs', npcs); save('maps', maps); print('ok')
