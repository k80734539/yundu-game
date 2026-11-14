// 主線 Boss 專屬機制：巨像核心外露、巨蛇毒沼、山賊王躲手下、霜牙狼王暴風雪、赤焰地龍熔岩池
const R = await page.evaluate(() => {
  const G = window.__game, out = {}, step = 1 / 60; G.loop.running = false; G.skipStory && G.skipStory(); G.flags.tutOff = true;
  const setup = (map, id, x, y) => { G.loadMap(map, x, y); const p = G.player; p.maxHp = p.hp = 1e7; p.d.def = 0; p.recalc = () => {}; p.ch.job = 'novice'; const b = G.monsters.find((m) => m.def.id === id); G.applyDamage(p, b, 1, 'deal'); for (let k = 0; k < 6; k++) G.update(step); return { p, b }; };
  const run = (secs, f) => { for (let i = 0; i < secs * 60; i++) { G.update(step); G.player.hp = G.player.maxHp; if (f) f(i); } };
  const hit = (p, b, n = 1000) => { const h0 = b.hp; G.applyDamage(p, b, n, 'deal'); const lost = h0 - b.hp; b.hp = h0; G.hitStop = 0; return lost; };
  const calm = (b) => { b.boss.state = 'recover'; b.boss.t = 0; b.boss.dur = 1e9; }; // 讓 Boss 不出招，只量機制本身的傷害
  { // 巨像：平常 ×0.7，核心外露 ×2.2
    const { p, b } = setup('mine2', 'golem', 29, 26); const base = hit(p, b); let exposed = 0, peak = 0;
    run(40, (i) => { if (i % 20 === 0) { const l = hit(p, b); if (l > base * 1.5) exposed++; peak = Math.max(peak, l); } });
    out.golem = { base, peak, exposedFrames: exposed, aura: !!(b.boss.gm.exposedOnce) };
  }
  { // 巨蛇：吐息後留下毒沼，站著會受傷
    const { p, b } = setup('ruins', 'serpent', 39, 15); let pools = 0, dmg = 0; const hp0 = () => G.player.hp;
    for (let i = 0; i < 60 * 60; i++) { G.update(step); pools = Math.max(pools, G.hazards.length); if (G.hazards.length && !dmg) { calm(b); const h = G.hazards[0]; p.x = p.px = h.x; p.y = p.py = h.y; p.hp = p.maxHp; for (let k = 0; k < 90; k++) { calm(b); const before = p.hp; G.update(step); if (p.hp < before) dmg += before - p.hp; p.hp = p.maxHp; } } else p.hp = p.maxHp; }
    out.serpent = { pools, poolDamage: dmg };
  }
  { // 山賊王：70% 躲起來無敵，手下全倒才現身
    const { p, b } = setup('canyon', 'bandit_king', 42, 38); b.hp = b.maxHp * 0.69; run(1);
    out.bandit = { shield: b.boss.gm.shield, guards: b.boss.gm.guards.length, dmgWhileShield: hit(p, b), moves: 0 };
    for (const k of b.boss.gm.guards) G.kill(k, p); run(0.5);
    out.bandit.afterGuards = { shield: b.boss.gm.shield, mul: hit(p, b) / 1000 };
  }
  { // 霜牙狼王：暴風雪，圈外凍傷、圈內不傷
    const { p, b } = setup('snowfield', 'frost_king', 44, 16); const gmS = () => b.boss.gm; let out_dmg = 0, in_dmg = 0, started = false;
    const probe = (inside) => { const s = gmS().safe; p.x = p.px = inside ? s.x : s.x + 6; p.y = p.py = s.y; p.path = []; let d = 0; for (let k = 0; k < 180; k++) { calm(b); const hp = p.hp; G.update(step); if (p.hp < hp) d += hp - p.hp; p.hp = p.maxHp; } return d; };
    for (let i = 0; i < 60 * 40 && !started; i++) { G.update(step); p.hp = p.maxHp; if (gmS().bOn > 0) started = true; }
    if (started) { const keep = gmS().bOn; gmS().bOn = 99; in_dmg = probe(true); out_dmg = probe(false); }
    out.frost = { started, inCircleDmg: in_dmg, outCircleDmg: out_dmg };
  }
  { // 赤焰地龍：熔岩池先預警再傷人
    const { p, b } = setup('volcano', 'flame_wyrm', 46, 14); let warned = false, active = false, maxN = 0;
    run(30, () => { for (const h of G.hazards) { if (h.age < h.warn) warned = true; else active = true; } maxN = Math.max(maxN, G.hazards.length); });
    out.wyrm = { warned, active, maxN };
  }
  G.hazards = []; return out;
});
console.log(JSON.stringify(R, null, 1));
