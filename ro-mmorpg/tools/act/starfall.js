// 星落鎮：傳送雙向可走、NPC 都走得到、E 階商店、任務發布者、傳送服務清單、天穹裝備等級限制
const R = await page.evaluate(() => {
  const G = window.__game, out = {}; G.loop.running = false; const step = 1 / 60, p = G.player;
  const go = (id, x, y, tx, ty) => { G.loadMap(id, x, y); for (const m of G.monsters) m.hp = 1e9; p.hp = p.maxHp = 1e9; const pa = G.pf.find(p.x, p.y, tx, ty, 20000, 0); if (!pa) return { path: false }; p.setPath(pa); let n = 0; while (G.map.def.id === id && n++ < 60 * 120) { G.update(step); p.hp = p.maxHp; } return { now: G.map.def.id, at: [Math.round(p.x), Math.round(p.y)] }; };
  out.volToTown = go('volcano', 48, 14, 52, 8);
  out.townToVol = go('starfall', 6, 22, 2, 22);
  out.townToSky = go('starfall', 6, 22, 41, 22);
  out.skyToTown = go('sky', 47, 47, 49, 50);
  G.loadMap('starfall', 6, 22);
  out.npcs = G.npcs.map((n) => [n.def.id, Math.round(n.x), Math.round(n.y), !!G.pf.find(p.x, p.y, n.x, n.y + 1, 20000, 1)]);
  out.walkable = G.npcs.map((n) => G.map.canWalk(Math.round(n.x), Math.round(n.y)));
  const D = window.__DB, shop = (Array.isArray(D.shop) ? D.shop : Object.values(D.shop)).find((s) => s.id === 'starfall');
  out.shopCount = shop.items.length; out.sample = shop.items.slice(0, 3).map((i) => [D.item[i].name, D.item[i].price, D.item[i].reqLv]);
  p.ch.job = 'templar'; p.ch.baseLv = 80; G.inv.items.length = 0; G.inv.add('zenith_spear'); const it = G.inv.items.find((i) => i.id === 'zenith_spear');
  out.equipLv80 = G.inv.equipItem(it.uid, 'templar', 80); out.equipLv85 = G.inv.equipItem(it.uid, 'templar', 85);
  const Q = (id) => D.quest[id] || D.quest.find?.((q) => q.id === id);
  out.questNpc = ['q_cap8', 'q_mvp_sky', 'q_cap9', 'q_mvp_abyss'].map((q) => Q(q).npc);
  G.flags.visited = { starfall: 1, volcano: 1, aurora: 1 }; G.loadMap('aurora', 25, 30);
  out.mapsInWarp = (window.__DB.map.filter ? window.__DB.map : Object.values(window.__DB.map)).filter((d) => G.flags.visited[d.id] && d.id !== 'aurora').map((d) => d.name);
  return out;
});
console.log(JSON.stringify(R));
