// 赤鬃山賊王：招式預兆、召喚山賊、狂暴階段、擊殺首殺獎勵與掉落
const R = await page.evaluate(() => {
  const G = window.__game, out = {}; G.loop.running = false; const step = 1 / 60;
  G.loadMap('canyon', 40, 36);
  const p = G.player; p.maxHp = p.hp = 1e7; p.d.def = 0; p.recalc = () => {}; p.ch.job = 'novice';
  const b = G.monsters.find((m) => m.def.id === 'bandit_king'); out.bossExists = !!b;
  G.applyDamage(p, b, 1, 'deal'); for (let k = 0; k < 6; k++) G.update(step);
  const events = []; G.ev.on('bossmove', (e) => events.push(e.move + ':' + e.type));
  for (let i = 0; i < 60 * 40; i++) { G.update(step); p.hp = p.maxHp; if (b.hp < b.maxHp * 0.7) b.hp = b.maxHp * 0.7; }
  out.normalMoves = [...new Set(events)];
  b.hp = b.maxHp * 0.45; const ev2 = events.length;
  for (let i = 0; i < 60 * 50; i++) { G.update(step); p.hp = p.maxHp; if (b.hp < b.maxHp * 0.4) b.hp = b.maxHp * 0.4; }
  out.enrageMoves = [...new Set(events.slice(ev2))];
  out.summoned = G.monsters.filter((m) => m.summoned).map((m) => m.def.id);
  // 擊殺
  const z0 = p.ch.zeny; b.hp = 1; G.applyDamage(p, b, 99999, 'deal'); for (let i = 0; i < 400; i++) G.update(step);
  out.dead = b.dead; out.zenyGain = p.ch.zeny - z0;
  out.drops = G.entities.filter((e) => e.item || e.def).slice(0, 12).map((e) => (e.item && e.item.id) || (e.def && e.def.id) || '?');
  return out;
});
console.log(JSON.stringify(R));
