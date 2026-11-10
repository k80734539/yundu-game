// 天空神殿／深淵迴廊（現在熔岩谷與天空神殿之間隔著星落鎮，所以 volToSky／skyToVol 會落在 starfall）：傳送雙向可走、出怪、怪物位置可走、MVP 在房間內、任務鏈
const R = await page.evaluate(() => {
  const G = window.__game, out = {}; G.loop.running = false; const step = 1 / 60, p = G.player;
  const go = (id, x, y, tx, ty) => { G.loadMap(id, x, y); for (const m of G.monsters) m.hp = 1e9; p.hp = p.maxHp = 1e9; const pa = G.pf.find(p.x, p.y, tx, ty, 20000, 0); if (!pa) return { path: false }; p.setPath(pa); let n = 0; while (G.map.def.id === id && n++ < 60 * 120) { G.update(step); p.hp = p.maxHp; } return { now: G.map.def.id, at: [Math.round(p.x), Math.round(p.y)], secs: +(n / 60).toFixed(1) }; };
  const volcano = window.__DB.map.volcano || window.__DB.map.find?.((m) => m.id === 'volcano');
  out.volcanoWalk52_8 = (G.loadMap('volcano', 40, 20), G.map.canWalk(52, 8));
  out.volToSky = go('volcano', 48, 14, 52, 8);
  out.skyToVol = go('sky', 47, 47, 49, 50);
  out.skyToAbyss = go('sky', 44, 15, 47, 12);
  out.abyssToSky = go('abyss', 10, 12, 10, 9);
  for (const id of ['sky', 'abyss']) { G.loadMap(id, id === 'sky' ? 47 : 10, id === 'sky' ? 47 : 12); out[id] = G.monsters.reduce((a, m) => (a[m.def.id] = (a[m.def.id] || 0) + 1, a), {}); const b = G.monsters.find((m) => m.isMvp); out[id + 'Mvp'] = b ? { x: Math.round(b.x), y: Math.round(b.y), walk: G.map.canWalk(Math.round(b.x), Math.round(b.y)), path: !!G.pf.find(p.x, p.y, b.x, b.y, 20000, 1) } : null; }
  const Q = (id) => window.__DB.quest[id] || window.__DB.quest.find?.((q) => q.id === id);
  G.quests.s['q_cap7'] = { st: 'done', n: 20 }; p.ch.baseLv = 78; out.q8 = G.quests.canAccept(Q('q_cap8'));
  G.quests.s['q_cap8'] = { st: 'done', n: 20 }; p.ch.baseLv = 85; out.q9 = G.quests.canAccept(Q('q_mvp_sky'));
  G.quests.s['q_mvp_sky'] = { st: 'done', n: 1 }; p.ch.baseLv = 88; out.q10 = G.quests.canAccept(Q('q_cap9'));
  G.quests.s['q_cap9'] = { st: 'done', n: 15 }; p.ch.baseLv = 95; out.q11 = G.quests.canAccept(Q('q_mvp_abyss'));
  return out;
});
console.log(JSON.stringify(R));
