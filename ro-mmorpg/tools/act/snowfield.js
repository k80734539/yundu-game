// 凜冬雪原：出怪、與失落遺跡雙向傳送可走、霜牙狼王戰（預兆、召喚霜狼、首殺）、任務可接
const R = await page.evaluate(() => {
  const G = window.__game, out = {}; G.loop.running = false; const step = 1 / 60, p = G.player;
  const go = (id, x, y, tx, ty) => { G.loadMap(id, x, y); for (const m of G.monsters) m.hp = 1e9; p.hp = p.maxHp = 1e9; p.setPath(G.pf.find(p.x, p.y, tx, ty, 8000, 0)); let n = 0; while (G.map.def.id === id && n++ < 60 * 90) { G.update(step); p.hp = p.maxHp; } return { now: G.map.def.id, secs: +(n / 60).toFixed(1) }; };
  out.ruinsToSnow = go('ruins', 15, 15, 12, 12);
  out.snowToRuins = go('snowfield', 9, 50, 6, 53);
  G.loadMap('snowfield', 40, 20);
  out.spawn = G.monsters.reduce((a, m) => (a[m.def.id] = (a[m.def.id] || 0) + 1, a), {});
  p.maxHp = p.hp = 1e8; p.d.def = 0; p.recalc = () => {}; p.ch.job = 'novice';
  const b = G.monsters.find((m) => m.def.id === 'frost_king'); G.applyDamage(p, b, 1, 'deal'); for (let k = 0; k < 6; k++) G.update(step);
  const ev = []; G.ev.on('bossmove', (e) => ev.push(e.move));
  for (let i = 0; i < 60 * 40; i++) { G.update(step); p.hp = p.maxHp; if (b.hp < b.maxHp * 0.7) b.hp = b.maxHp * 0.7; }
  out.normal = [...new Set(ev)]; b.hp = b.maxHp * 0.4; const n0 = ev.length;
  for (let i = 0; i < 60 * 50; i++) { G.update(step); p.hp = p.maxHp; if (b.hp < b.maxHp * 0.35) b.hp = b.maxHp * 0.35; }
  out.enrage = [...new Set(ev.slice(n0))]; out.summoned = [...new Set(G.monsters.filter((m) => m.summoned).map((m) => m.def.id))];
  const z0 = p.ch.zeny; b.hp = 1; G.applyDamage(p, b, 9e7, 'deal'); for (let i = 0; i < 400; i++) G.update(step);
  out.dead = b.dead; out.zeny = p.ch.zeny - z0;
  G.quests.s['q_cap5'] = { st: 'done', n: 15 }; p.ch.baseLv = 56; G.quests.s['q_cap6'] = { st: 'done', n: 20 };
  const Q = (id) => window.__DB.quest[id] || window.__DB.quest.find?.((q) => q.id === id);
  out.canAccept = [G.quests.canAccept(Q('q_cap6')), G.quests.canAccept(Q('q_mvp_frost'))];
  return out;
});
console.log(JSON.stringify(R));
await page.evaluate(() => { const G = window.__game; G.loadMap('snowfield', 20, 42); G.player.hp = G.player.maxHp = 1e6; });
await sleep(1500);
