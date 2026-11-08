// Boss 戰驗證：每招預兆與間隔、同招不連續超過 2 次、站在範圍外完全閃掉、狂暴階段、擊敗演出、首殺與最快紀錄、重生倒數
const R = await page.evaluate(() => {
  const G = window.__game, BF = window.__BF, out = {};
  G.loop.running = false;
  const step = 1 / 60;
  const setup = (mapId, bossId, px, py) => {
    G.loadMap(mapId, px, py);
    for (const m of G.monsters) if (!m.isMvp) m.remove = true;
    G.monsters = G.monsters.filter((m) => !m.remove); G.entities = G.entities.filter((e) => !e.remove);
    const p = G.player; p.maxHp = p.hp = 1e7; p.d.def = 0; p.recalc = () => {}; p.ch.job = 'novice';
    const b = G.monsters.find((m) => m.def.id === bossId);
    G.applyDamage(p, b, 1, 'deal'); for (let k = 0; k < 6; k++) G.update(step);   // 觸發戰鬥（先吃掉打擊停頓）
    return b;
  };
  // ---------- A. 啵啵王：招式紀錄、間隔、連續次數 ----------
  let b = setup('forest', 'kingjelly', 36, 42);
  const events = []; G.ev.on('bossmove', (e) => events.push(e));
  const states = []; let prev = ''; let idleStart = 0; const gaps = []; const phaseAtGap = [];
  const p = G.player;
  for (let i = 0; i < 60 * 70; i++) {
    G.update(step);
    const st = b.boss && b.boss.state;
    if (st !== prev) { if (prev === 'recover' || prev === 'roar') { idleStart = G.time; } if (st === 'windup' && (prev === 'idle')) { gaps.push(+(G.time - idleStart).toFixed(2)); phaseAtGap.push(b.boss.phase); } prev = st; }
    if (b.hp < b.maxHp * 0.7) b.hp = b.maxHp * 0.7;  // 先在一般階段多觀察
  }
  const seq = events.map((e) => e.move);
  let maxRun = 1, run = 1; for (let i = 1; i < seq.length; i++) { run = seq[i] === seq[i - 1] ? run + 1 : 1; maxRun = Math.max(maxRun, run); }
  const types = new Set(events.map((e) => e.type));
  const wind = {}; for (const e of events) { (wind[e.move] ||= []).push(e.windup); }
  out.A = { moves: [...new Set(seq)], types: [...types], count: seq.length, maxRun, minGap: Math.min(...gaps.slice(1)), firstGrace: gaps[0], windups: Object.fromEntries(Object.entries(wind).map(([k, v]) => [k, [Math.min(...v), Math.max(...v)]])) };
  // ---------- B. 閃避：站在預警外完全不受傷，站在內受傷 ----------
  const dodge = (wantType, stay) => {
    b = setup('forest', 'kingjelly', 36, 42); b.boss.gapT = 0; b.boss.last = ''; b.boss.repeat = 0;
    p.hp = p.maxHp = 1e7;
    for (let i = 0; i < 60 * 40; i++) {
      G.update(step);
      const t = G.telegraphs.find((x) => x.owner === b && x.t >= 0);
      if (t && ((wantType === 'circle' && t.kind === 'circle') || (wantType === 'line' && t.kind === 'line'))) {
        const hp0 = p.hp;
        if (!stay) { // 走出範圍
          if (t.kind === 'circle') { const dx = p.x - t.x, dy = p.y - t.y, raw = Math.hypot(dx, dy), d = raw || 1; const ux = raw < 0.01 ? 1 : dx / d, uy = raw < 0.01 ? 0 : dy / d; p.x = p.px = t.x + ux * (t.r + 1.0); p.y = p.py = t.y + uy * (t.r + 1.0); }
          else { const dx = t.x2 - t.x, dy = t.y2 - t.y, L = Math.hypot(dx, dy); const nx = -dy / L, ny = dx / L; p.x = p.px = p.x + nx * (t.width / 2 + 1.0); p.y = p.py = p.y + ny * (t.width / 2 + 1.0); }
        }
        const dur = t.dur - t.t; let guard = 0;
        while (!t.done && guard++ < 600) G.update(step);
        return { dur: +(t.dur).toFixed(2), kind: t.kind, lost: hp0 - p.hp, moved: !stay };
      }
    }
    return null;
  };
  out.B = { circleOut: dodge('circle', false), circleIn: dodge('circle', true), lineOut: dodge('line', false), lineIn: dodge('line', true) };
  // ---------- C. 狂暴 ----------
  b = setup('forest', 'kingjelly', 36, 42); b.boss.gapT = 99; p.hp = p.maxHp = 1e7;
  const ph0 = b.boss.phase, sp0 = b.speed;
  b.hp = b.maxHp * 0.49; for (let i = 0; i < 30; i++) G.update(step);
  const afterRage = { phase: b.boss.phase, state: b.boss.state, speed: +(b.speed / sp0).toFixed(2) };
  for (let i = 0; i < 100; i++) G.update(step);   // 吼完
  b.boss.gapT = 0; const seqC = []; const evC = []; G.ev.on('bossmove', (e) => evC.push(e)); const gC = [];
  let pv = '', i0 = 0;
  for (let i = 0; i < 60 * 80; i++) { G.update(step); const st = b.boss.state; if (st !== pv) { if (pv === 'recover') i0 = G.time; if (st === 'windup' && pv === 'idle') gC.push(+(G.time - i0).toFixed(2)); pv = st; } if (b.hp < b.maxHp * 0.3) b.hp = b.maxHp * 0.3; }
  out.C = { before: ph0, afterRage, movesAfterRage: [...new Set(evC.map((e) => e.move))], minGapRaged: Math.min(...gC), windupMul: evC.filter((e) => e.type === 'aoe').map((e) => e.windup).slice(0, 2) };
  b.hp = b.maxHp * 0.19; for (let i = 0; i < 20; i++) G.update(step);
  out.C.frenzy = { phase: b.boss.phase, speed: +(b.speed / sp0).toFixed(2), tintPhase: b.boss.phase };
  // ---------- D. 擊敗演出、首殺、最快紀錄、重生倒數 ----------
  b = setup('forest', 'kingjelly', 36, 42);
  for (let i = 0; i < 60 * 5; i++) G.update(step);   // 打了 5 秒
  const z0 = p.ch.zeny;
  G.flags.bossKills = {}; G.flags.bossBest = {};
  b.hp = 5; G.applyDamage(p, b, 999, 'deal');
  out.D = { hitStop: +G.hitStop.toFixed(2), slow: [+G.slowT.toFixed(2), G.slowScale], popup: !!document.getElementById('bossdown'), popupText: document.getElementById('bossdown') && document.getElementById('bossdown').textContent, firstReward: p.ch.zeny - z0 >= 5000, kills: G.flags.bossKills.kingjelly, best: G.flags.bossBest.kingjelly };
  window.__bestFirst = G.flags.bossBest.kingjelly;
  out.D.countdown = G.spawner.countdown('forest'); out.D.respawnCfg = window.__BOSSCFG.global.respawn;
  return out;
});
const OTHERS = await page.evaluate(() => {
  const G = window.__game, out = {}; G.loop.running = false; const step = 1 / 60; const p = G.player;
  for (const [mapId, id, px, py] of [['mine2', 'golem', 25, 27], ['ruins', 'serpent', 36, 14]]) {
    G.loadMap(mapId, px, py); for (const m of G.monsters) if (!m.isMvp) m.remove = true; G.monsters = G.monsters.filter((m) => !m.remove); G.entities = G.entities.filter((e) => !e.remove);
    p.maxHp = p.hp = 1e7; const b = G.monsters.find((m) => m.def.id === id); const ev = []; const off = G.ev.on('bossmove', (e) => ev.push(e));
    G.applyDamage(p, b, 1, 'deal'); for (let k = 0; k < 6; k++) G.update(step);
    const seen = (lo) => { for (let i = 0; i < 60 * 60; i++) { G.update(step); if (b.hp < b.maxHp * lo) b.hp = b.maxHp * lo; } };
    b.hp = b.maxHp * 0.9; seen(0.9); const normal = [...new Set(ev.map((e) => e.move))]; ev.length = 0;
    b.hp = b.maxHp * 0.45; seen(0.4); const raged = [...new Set(ev.map((e) => e.move))]; const w1 = ev.filter((e) => e.type === 'aoe' || e.type === 'barrage').map((e) => e.windup); ev.length = 0;
    b.hp = b.maxHp * 0.15; seen(0.1); const w2 = ev.filter((e) => e.type === 'aoe' || e.type === 'barrage').map((e) => e.windup);
    let run = 1, mx = 1; const all = ev.map((e) => e.move); for (let i = 1; i < all.length; i++) { run = all[i] === all[i - 1] ? run + 1 : 1; mx = Math.max(mx, run); }
    out[id] = { normal, raged, phase: b.boss.phase, minAoeWindupRaged: Math.min(...w1), minAoeWindupFrenzy: Math.min(...w2), maxRun: mx };
    off();
  }
  return out;
});
console.log('BOSS others', JSON.stringify(OTHERS));
for (const k of Object.keys(R)) console.log('BOSS', k, JSON.stringify(R[k]));
await page.screenshot({ path: 'screenshots/Boss_擊敗.png' });
// E. 重生：把倒數改成 0 → 回到森林 → 出現；第二次擊殺不再是首殺，且最快紀錄只會更新為更快的
const E = await page.evaluate(() => {
  const G = window.__game, p = G.player, out = {};
  G.loadMap('forest', 36, 42); for (const m of G.monsters) if (!m.isMvp) m.remove = true;
  G.spawner.mvp.forest.nextAt = Date.now() + 3000;
  out.cdBefore = G.spawner.countdown('forest');
  G.spawner.mvp.forest.nextAt = Date.now() - 1; for (let i = 0; i < 40; i++) G.update(1 / 60);
  const b = G.monsters.find((m) => m.def.id === 'kingjelly' && !m.dead);
  out.respawned = !!b; if (!b) return out;
  const z0 = p.ch.zeny; p.maxHp = p.hp = 1e7; G.applyDamage(p, b, 1, 'deal');
  for (let i = 0; i < 60 * 2; i++) G.update(1 / 60);
  b.hp = 5; G.applyDamage(p, b, 999, 'deal');
  out.second = { firstReward: p.ch.zeny - z0 >= 5000, kills: G.flags.bossKills.kingjelly, best: G.flags.bossBest.kingjelly, firstBest: window.__bestFirst };
  return out;
});
console.log('BOSS E', JSON.stringify(E));
