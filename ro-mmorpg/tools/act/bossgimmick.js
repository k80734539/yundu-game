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
// Boss 戰字幕：狂暴、瀕死、倒下時各出現一句，並在幾秒後消失
const S = await page.evaluate(async () => {
  const G = window.__game, out = {}, step = 1 / 60; G.loop.running = false;
  G.loadMap('mine2', 29, 26); const p = G.player; p.maxHp = p.hp = 1e7; p.d.def = 0; p.recalc = () => {};
  const b = G.monsters.find((m) => m.def.id === 'golem'); G.applyDamage(p, b, 1, 'deal'); G.hitStop = 0;
  const sub = G.ui.bossbar.sub, run = (n) => { for (let i = 0; i < n; i++) { G.update(step); p.hp = p.maxHp; G.ui.bossbar.update(); } };
  run(30); b.hp = b.maxHp * 0.45; run(10); out.p1 = [sub.style.display, sub.textContent];
  b.hp = b.maxHp * 0.15; run(150); out.p2 = sub.textContent;
  b.hp = 1; G.applyDamage(p, b, 99999, 'deal'); run(10); out.down = sub.textContent; out.name = G.ui.bossbar.name.textContent;
  await new Promise((r) => setTimeout(r, 4300)); G.ui.bossbar.update(); out.gone = sub.style.display;
  return out;
});
console.log(JSON.stringify(S));

// ---- 其餘 6 隻 Boss：啵啵王分裂回血、鋼心舉盾／破綻、湮魔力屏障、影隱身、蒼雷追蹤雷擊、深淵領主虛空牽引 ----
const R2 = await page.evaluate(() => {
  const G = window.__game, out = {}, step = 1 / 60; G.loop.running = false; G.skipStory && G.skipStory(); G.flags.tutOff = true;
  const setup = (map, id) => { const mv = window.__DB.map[map].mvp; G.loadMap(map, mv.x - 2, mv.y + 2); const p = G.player; p.maxHp = p.hp = 1e7; p.d.def = 0; p.recalc = () => {}; p.ch.job = 'novice'; const b = G.monsters.find((m) => m.def.id === id); G.applyDamage(p, b, 1, 'deal'); G.hitStop = 0; for (let k = 0; k < 6; k++) G.update(step); return { p, b }; };
  const calm = (b) => { b.boss.state = 'recover'; b.boss.t = 0; b.boss.dur = 1e9; };
  const hit = (p, b, n = 1000) => { const h0 = b.hp; G.applyDamage(p, b, n, 'deal'); const lost = h0 - b.hp; b.hp = h0; G.hitStop = 0; return lost; };
  const run = (secs, f) => { for (let i = 0; i < secs * 60; i++) { G.update(step); G.player.hp = G.player.maxHp; G.hitStop = 0; if (f && f(i) === 'stop') break; } };
  { const { p, b } = setup('forest', 'kingjelly'); b.hp = b.maxHp * 0.6; run(1); const links = b.boss.gm.links.length; const h0 = b.hp; run(3, () => { calm(b); }); const healing = b.hp - h0; for (const k of b.boss.gm.links) G.kill(k, p); run(0.5); const h1 = b.hp; run(3, () => { calm(b); }); out.jelly = { links, healing: Math.round(healing), afterKill: Math.round(b.hp - h1) }; }
  { const { p, b } = setup('trial_templar', 'trial_templar'); let guard = null, open = null; run(60, () => { const st = b.boss.state; if (st === 'windup' && guard === null) guard = hit(p, b) / 1000; if (st === 'recover' && open === null) open = hit(p, b) / 1000; if (guard !== null && open !== null) return 'stop'; }); out.templar = { guardMul: guard, openMul: open }; }
  { const { p, b } = setup('trial_archmage', 'trial_archmage'); calm(b); const sh0 = b.boss.gm.shieldHP, hp0 = b.hp; const soft = hit(p, b, 5000); const sh1 = b.boss.gm.shieldHP; G.applyDamage(p, b, sh1 + 20000, 'deal'); const broke = b.boss.gm.shieldHP === 0 && b.boss.gm.stagT > 0; const lostAfter = hp0 - b.hp; b.hp = hp0; const staggerMul = hit(p, b) / 1000; out.archmage = { shield: Math.round(sh0), bodyDmgWhileShield: soft, broke, stateAfterBreak: b.boss.state, staggerMul, lostAfterBreak: lostAfter }; }
  { const { p, b } = setup('trial_sniper', 'trial_sniper'); let cloaked = false, mulCloaked = null, back = null; run(40, () => { const s = b.boss.gm; if (s?.cloakOn > 0) { cloaked = true; if (mulCloaked === null) mulCloaked = hit(p, b); } else if (cloaked && back === null) { back = Math.hypot(b.x - p.x, b.y - p.y); return 'stop'; } }); out.sniper = { cloaked, dmgWhileCloaked: mulCloaked, appearDistance: back && +back.toFixed(1) }; }
  { const { p, b } = setup('sky', 'sky_guardian'); let strikes = 0, dmg = 0; run(60, () => { calm(b); const s = b.boss.gm; if (s.trN > 0 || G.hazards.some((h) => h.label === '雷擊')) { strikes = Math.max(strikes, G.hazards.filter((h) => h.label === '雷擊').length); const before = p.hp; G.update(step); if (p.hp < before) dmg += before - p.hp; if (dmg > 0 && s.trN === 0) return 'stop'; } }); out.sky = { strikesSeen: strikes, damageWhenStanding: Math.round(dmg) }; }
  { const { p, b } = setup('abyss', 'abyss_lord'); let pulled = null, d0 = null, burst = false, dmg = 0; run(90, () => { const s = b.boss.gm || {}; if (s.pullT > 0 || burst) calm(b); if (s.pullT > 0) { const d = Math.hypot(b.x - p.x, b.y - p.y); if (d0 === null) d0 = d; pulled = d; } if (G.hazards.some((h) => h.label === '虛空爆裂')) burst = true; if (burst) { const before = p.hp; G.update(step); if (p.hp < before) dmg += before - p.hp; if (G.hazards.length === 0) return 'stop'; } }); out.abyss = { distBefore: d0 && +d0.toFixed(1), distAfterPull: pulled && +pulled.toFixed(1), burst, burstDamageWhenStaying: Math.round(dmg) }; }
  G.hazards = []; return out;
});
console.log(JSON.stringify(R2, null, 1));
