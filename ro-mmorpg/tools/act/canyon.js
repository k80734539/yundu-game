// 赤岩峽谷：傳送點可走、出怪、四種新怪能繪製、與沼澤／礦坑 B2 互通、任務可接
const r = await page.evaluate(async () => {
  const G = window.__game, out = {};
  const chk = (id, x, y, tx, ty) => { G.loadMap(id, x, y); const p = G.pf.find(G.player.x, G.player.y, tx, ty, 6000, 0); return { path: p ? p.length : null, walk: !!G.map.walk[Math.floor(ty) * G.map.w + Math.floor(tx)] }; };
  G.loadMap('canyon', 9, 10);
  out.spawn = Object.fromEntries(Object.entries(G.monsters.reduce((a, m) => (a[m.def.id] = (a[m.def.id] || 0) + 1, a), {})));
  out.toSwamp = chk('canyon', 9, 10, 6, 8); out.toMine2 = chk('canyon', 9, 10, 53, 51);
  out.swampPortal = chk('swamp', 10, 50, 9, 53); out.mine2Portal = chk('mine2', 50, 49, 52, 50);
  // 傳送：從沼澤走進去
  G.loadMap('swamp', 10, 50); const sp = G.map.def.portals.find((p) => p.to === 'canyon'); G.player.x = sp.x + 0.5; G.player.y = sp.y + 0.5; for (let i = 0; i < 30; i++) G.update(1 / 60);
  out.afterPortal = G.map.def.id;
  const ch = G.player.ch; ch.baseLv = 25; G.quests.s['q_cap4'] = { st: 'done', n: 15 }; G.quests.s['q_herb3'] = { st: 'done', n: 8 };
  const Q = (id) => (Array.isArray(window.__DB.quest) ? window.__DB.quest.find((q) => q.id === id) : window.__DB.quest[id]);
  out.canAccept = [G.quests.canAccept(Q('q_cap4b')), G.quests.canAccept(Q('q_herb4'))];
  return out;
});
console.log(JSON.stringify(r));
await page.evaluate(() => { const G = window.__game; G.loadMap('canyon', 14, 14); G.player.hp = G.player.maxHp; });
await sleep(1500);
