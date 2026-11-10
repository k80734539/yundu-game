// 天空神殿／深淵迴廊的 MVP：預兆、召喚、首殺、掉落、兌換、卡片；任務引導路線
const R = await page.evaluate(() => {
  const G = window.__game, out = {}; G.loop.running = false; const step = 1 / 60, p = G.player;
  for (const [map, bid, x, y, minion, ex] of [['sky', 'sky_guardian', 20, 22, 'wind_spirit', 'sky_blade'], ['abyss', 'abyss_lord', 42, 40, 'void_shade', 'abyss_blade']]) {
    G.loadMap(map, x, y); p.maxHp = p.hp = 1e8; p.d.def = 0; p.recalc = () => {}; p.ch.job = 'novice';
    const b = G.monsters.find((m) => m.def.id === bid); G.applyDamage(p, b, 1, 'deal'); for (let k = 0; k < 6; k++) G.update(step);
    const ev = []; const h = (e) => ev.push(e.move); G.ev.on('bossmove', h);
    for (let i = 0; i < 60 * 40; i++) { G.update(step); p.hp = p.maxHp; if (b.hp < b.maxHp * 0.7) b.hp = b.maxHp * 0.7; }
    const normal = [...new Set(ev)]; b.hp = b.maxHp * 0.4; const n0 = ev.length;
    for (let i = 0; i < 60 * 50; i++) { G.update(step); p.hp = p.maxHp; if (b.hp < b.maxHp * 0.35) b.hp = b.maxHp * 0.35; }
    const enrage = [...new Set(ev.slice(n0))], summoned = [...new Set(G.monsters.filter((m) => m.summoned).map((m) => m.def.id))];
    const z0 = p.ch.zeny; b.hp = 1; G.applyDamage(p, b, 9e8, 'deal'); for (let i = 0; i < 400; i++) G.update(step);
    out[map] = { normal, enrage, summoned, minionOk: summoned.includes(minion), dead: b.dead, zeny: p.ch.zeny - z0, exchangeDefined: !!window.__LOOT.exchange.find((r) => r.items.includes(ex)) };
  }
  // 引導：等級 90 的玩家在晨曦鎮、有任務 q_cap8 可接
  G.loadMap('aurora', 27, 30); p.ch.baseLv = 90; G.quests.s['q_cap7'] = { st: 'done', n: 20 };
  const gd = G.guide.get(); out.guideTown = gd && gd.text;
  G.quests.accept('q_cap8'); out.guideActive = G.guide.get() && [G.guide.get().text, G.guide.get().sub];
  return out;
});
console.log(JSON.stringify(R));
