import type { Game } from '../core/Game';
import type { Monster } from '../entities/Monster';
import { BOSSFIGHT, BossMove } from '../data';
import { dist } from '../core/math';
import { bossDamage } from './BossFight';

/** 地上的持續傷害區：毒沼、熔岩池。先有 warn 秒的預警（不傷人），之後持續 life 秒，站在裡面每 tick 秒受一次傷 */
export interface Hazard { x: number; y: number; r: number; age: number; warn: number; life: number; mult: number; tick: number; tickT: number; color: string; owner: Monster; label: string }

/** 每隻主線 Boss 的專屬機制。數字都在 data/bossfights.json 各 Boss 的 gimmick 欄位 */
type Cfg = Record<string, any>;
const cfgOf = (m: Monster): Cfg | undefined => (BOSSFIGHT.bosses[m.def.id] as { gimmick?: Cfg }).gimmick;
const gm = (m: Monster) => (m.boss!.gm ||= {});

function say(g: Game, m: Monster, text: string, col = '#ffe08a') { g.fx.dmg(m.x, m.y, text, 'crit', -m.bbox.y0 + 30); g.fx.ring(m.x, m.y, col, 0.8, 70); }
function spawnHazard(g: Game, m: Monster, x: number, y: number, c: Cfg, label: string, warn = 0) {
  const mine = g.hazards.filter((h) => h.owner === m);
  if (mine.length >= c.max) g.hazards.splice(g.hazards.indexOf(mine[0]), 1);
  g.hazards.push({ x, y, r: c.r, age: 0, warn, life: c.life, mult: c.mult, tick: c.tick, tickT: 0, color: c.color, owner: m, label });
}

/** Boss 出招後：巨像震地後核心外露、巨蛇吐息後留下毒沼 */
export function gimmickOnMove(g: Game, m: Monster, mv: BossMove) {
  const c = cfgOf(m); if (!c) return;
  const s = gm(m);
  if (c.expose && c.expose.on.includes(mv.id)) {
    s.expT = c.expose.sec;
    if (!s.exposedOnce) { s.exposedOnce = true; g.msg(`${m.def.name} 的胸口核心露出來了！趁現在猛攻！`, 'warn'); }
    say(g, m, '核心暴露', '#60f0ff'); g.audio.sfx('boss_warn');
  }
  if (c.pool && c.pool.moves.includes(mv.id)) {
    const t = s.aoeAt;
    if (t) { spawnHazard(g, m, t.x, t.y, c.pool, '毒沼'); if (!s.poolOnce) { s.poolOnce = true; g.msg('地上留下了毒沼，不要站在裡面！', 'warn'); } }
  }
}

/** 玩家對 Boss 的傷害倍率：巨像核心外露 ×2.2（平常 ×0.7 石甲）、山賊王躲在手下後面時無敵 */
export function gimmickDmgMul(m: Monster): number {
  const c = cfgOf(m); if (!c || !m.boss) return 1;
  const s = gm(m);
  if (c.cloak && s.cloakOn > 0) return 0;                                     // 影：隱身時打不到
  if (c.stance) return m.boss.state === 'windup' ? c.stance.guardMul : m.boss.state === 'recover' ? c.stance.openMul : 1; // 鋼心：出招時舉盾、收招時破綻
  if (c.barrier && s.stagT > 0) return c.barrier.staggerMul;
  if (c.expose) return s.expT > 0 ? c.expose.mul : c.expose.armor;
  if (c.guard) return s.shield ? 0 : s.expT > 0 ? c.guard.exposeMul : 1;
  return 1;
}
/** 目前是否有狀態要在 Boss 身上顯示（核心外露、護衛中） */
/** 魔力屏障：先扣屏障值，破了就讓湮暈眩；回傳還要扣在血量上的傷害 */
export function gimmickAbsorb(g: Game, m: Monster, dmg: number): number {
  const c = cfgOf(m); if (!c?.barrier || !m.boss) return dmg; const s = gm(m);
  if (!(s.shieldHP > 0)) return dmg;
  const left = dmg - s.shieldHP;
  if (left < 0) { s.shieldHP -= dmg; g.fx.dmg(m.x, m.y, 'SHIELD', 'miss', -m.bbox.y0 + 10); return 0; }
  s.shieldHP = 0; s.shieldBrokeAt = g.time; s.stagT = c.barrier.stagger;
  m.boss.state = 'recover'; m.boss.t = 0; m.boss.dur = c.barrier.stagger; m.boss.move = null; g.telegraphs = g.telegraphs.filter((t) => t.owner !== m); m.path = [];
  g.fx.ring(m.x, m.y, '#a0e0ff', 0.8, 80); g.fx.dmg(m.x, m.y, '屏障破碎', 'crit', -m.bbox.y0 + 30); g.cam.shake(5, 0.3); g.msg(`${m.def.name} 的魔力屏障被打碎了，暈眩中！`, 'warn');
  return left;
}
export function gimmickAura(m: Monster): { color: string; text: string } | null {
  const c = cfgOf(m); if (!c || !m.boss) return null; const s = gm(m);
  if (c.barrier) { if (s.stagT > 0) return { color: '#ffd060', text: '暈眩中！' }; if (s.shieldHP > 0) return { color: '#80c8ff', text: `魔力屏障 ${Math.ceil(s.shieldHP / m.maxHp * 100)}%` }; }
  if (c.link && s.links?.some((k: Monster) => !k.dead && !k.remove)) return { color: '#ff9ad0', text: '小啵啵在餵王吃黏液！' };
  if (c.stance) { const st = m.boss.state; if (st === 'windup') return { color: '#b0b0b0', text: '舉盾防禦' }; if (st === 'recover') return { color: '#ffd060', text: '破綻！' }; }
  if (c.cloak && s.cloakOn > 0) return { color: '#8070c0', text: '隱身中……' };
  if (c.pull && s.pullT > 0) return { color: '#a040e0', text: '虛空牽引！快跑！' };
  if (c.expose && s.expT > 0) return { color: '#60f0ff', text: '核心暴露！' };
  if (c.guard && s.shield) return { color: '#b0b0b0', text: '手下擋著，打不到！' };
  if (c.guard && s.expT > 0) return { color: '#ffd060', text: '孤立無援！' };
  return null;
}
/** 影是否隱身（繪製時變半透明） */
export const isCloaked = (m: Monster) => !!(m.boss?.gm?.cloakOn > 0);
export function blizzard(m: Monster): { x: number; y: number; r: number } | null {
  const s = m.boss?.gm; return s && s.bOn > 0 && s.safe ? { x: s.safe.x, y: s.safe.y, r: s.safeR } : null;
}

/** 每個 frame（Boss 在戰鬥中）。回傳 true＝這一刻 Boss 不做一般行動（山賊王躲起來時） */
export function gimmickUpdate(g: Game, m: Monster, dt: number): boolean {
  const c = cfgOf(m); if (!c) return false;
  const b = m.boss!, s = gm(m), p = g.player, ph = b.phase;
  if (s.expT > 0) s.expT -= dt;
  // 山賊王：血量到門檻就躲到手下後面，手下打光才現身
  if (c.guard) {
    if (!s.guardDone && m.hp / m.maxHp <= c.guard.at) {
      s.guardDone = true; s.shield = true; s.guards = [];
      g.telegraphs = g.telegraphs.filter((t) => t.owner !== m); b.state = 'idle'; b.gapT = 1.5;
      for (let i = 0; i < c.guard.n; i++) {
        const pos = g.map.nearestWalkable(m.x + (g.rnd() * 5 - 2.5), m.y + (g.rnd() * 5 - 2.5), 5); if (!pos) continue;
        const k = g.spawnMonster(c.guard.minion, pos); if (!k) continue;
        k.summoned = true; k.aggroOn = p; k.ai = 'chase'; s.guards.push(k); g.fx.ring(k.x, k.y, '#ffd060', 0.6, 30);
      }
      say(g, m, '撤退！', '#b0b0b0'); g.msg(`${m.def.name} 躲到手下後面大喊：「上！給我上！」先打倒手下才傷得到他！`, 'warn');
    }
    if (s.shield) {
      if (s.guards.every((k: Monster) => k.dead || k.remove)) { s.shield = false; s.expT = c.guard.exposeSec; say(g, m, '孤立無援', '#ffd060'); g.msg(`${m.def.name} 的手下都倒下了，他慌了！`, 'warn'); }
      m.path = []; m.face(p.x, p.y); return true;
    }
  }
  // 啵啵王：血量到門檻就分裂出小啵啵，牠們活著時王會一直回血
  if (c.link) {
    const lk = c.link; s.linkIdx ||= 0; s.links ||= [];
    if (s.linkIdx < lk.at.length && m.hp / m.maxHp <= lk.at[s.linkIdx]) {
      s.linkIdx++;
      for (let i = 0; i < lk.n; i++) { const pos = g.map.nearestWalkable(m.x + (g.rnd() * 5 - 2.5), m.y + (g.rnd() * 5 - 2.5), 5); if (!pos) continue; const k = g.spawnMonster(lk.minion, pos); if (!k) continue; k.summoned = true; k.aggroOn = p; k.ai = 'chase'; s.links.push(k); g.fx.ring(k.x, k.y, '#ff9ad0', 0.6, 30); }
      say(g, m, '分裂！', '#ff9ad0'); g.msg(`${m.def.name} 分裂出小啵啵，牠們會一直幫王回血——先打倒牠們！`, 'warn');
    }
    const alive = s.links.filter((k: Monster) => !k.dead && !k.remove).length;
    if (alive) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * lk.healPct * alive * dt);
  }
  // 湮：魔力屏障（先打破它）。破了之後 regenAfter 秒會重新凝聚
  if (c.barrier) {
    const bc = c.barrier; if (s.shieldHP === undefined) s.shieldHP = m.maxHp * bc.hp;
    if (s.stagT > 0) s.stagT -= dt;
    if (s.shieldHP <= 0 && !(s.stagT > 0) && g.time - (s.shieldBrokeAt ?? -1e9) > bc.regenAfter) { s.shieldHP = m.maxHp * bc.hp; say(g, m, '屏障重生', '#80c8ff'); }
  }
  // 影：每隔一陣子隱身，再從玩家背後現身出手
  if (c.cloak) {
    const kc = c.cloak; s.cT = (s.cT ?? kc.firstAt) - dt;
    if (s.cloakOn > 0) {
      s.cloakOn -= dt; m.path = []; b.state = 'idle'; b.gapT = 99; // 隱身中不出招
      if (s.cloakOn <= 0) {
        const a = g.rnd() * Math.PI * 2, pos = g.map.nearestWalkable(p.x + Math.cos(a) * kc.appearDist, p.y + Math.sin(a) * kc.appearDist, 4);
        if (pos) { m.x = m.px = pos[0] + 0.5; m.y = m.py = pos[1] + 0.5; } b.gapT = 0.2;
        g.fx.ring(m.x, m.y, '#8070c0', 0.7, 60); say(g, m, '現身', '#8070c0'); g.msg(`${m.def.name} 從你身邊現身了！`, 'warn');
      }
      return true;
    }
    if (s.cT <= 0 && b.state === 'idle') { s.cT = kc.every; s.cloakOn = kc.sec; say(g, m, '隱身', '#8070c0'); g.msg(`${m.def.name} 消失了！小心背後！`, 'warn'); m.path = []; }
  }
  // 蒼雷守護者：追蹤雷擊，雷會一直落在你腳下，停下來就會被劈中
  if (c.tracker) {
    const tc = c.tracker; s.trT = (s.trT ?? tc.firstAt) - dt;
    if (s.trN > 0) { s.trI -= dt; if (s.trI <= 0) { s.trI = tc.interval; s.trN--; g.hazards.push({ x: p.x, y: p.y, r: tc.r, age: 0, warn: tc.warn, life: 0.25, mult: tc.mult, tick: 99, tickT: 0, color: tc.color, owner: m, label: '雷擊' }); g.audio.sfx('thunder'); } }
    else if (s.trT <= 0) { s.trT = tc.every; s.trN = tc.strikes; s.trI = 0; g.msg('烏雲聚集！雷會追著你劈，不要停下來！', 'warn'); g.cam.shake(3, 0.4); }
  }
  // 深淵領主：虛空牽引，把玩家往自己身邊吸，最後在原地炸開
  if (c.pull) {
    const pc = c.pull; s.pullWait = (s.pullWait ?? pc.firstAt) - dt;
    if (s.pullT > 0) {
      s.pullT -= dt; const dx = m.x - p.x, dy = m.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (!p.dead && d > 1.4) { const nx = p.x + (dx / d) * pc.speed * dt, ny = p.y + (dy / d) * pc.speed * dt; if (g.map.canWalk(nx, ny)) { p.x = nx; p.y = ny; p.path = []; } }
      if (s.pullT <= 0) g.hazards.push({ x: m.x, y: m.y, r: pc.burstR, age: 0, warn: 0.9, life: 0.25, mult: pc.mult, tick: 99, tickT: 0, color: pc.color, owner: m, label: '虛空爆裂' });
    } else if (s.pullWait <= 0 && b.state === 'idle') { s.pullWait = pc.every; s.pullT = pc.sec; say(g, m, '牽引', '#a040e0'); g.msg('虛空在吸你！快往外跑，離開中心！', 'warn'); g.audio.sfx('boss_roar'); }
  }
  // 霜牙狼王：暴風雪，只有篝火圈裡不會凍傷
  if (c.blizzard) {
    const bc = c.blizzard, every = bc.every * (ph >= 1 ? bc.enrageMul : 1);
    if (s.bT === undefined) s.bT = bc.firstAt;
    if (s.bOn > 0) {
      s.bOn -= dt; s.tickT = (s.tickT || 0) - dt;
      if (s.tickT <= 0) {
        s.tickT = bc.tick;
        if (!p.dead && dist(p.x, p.y, s.safe.x, s.safe.y) > s.safeR) { g.applyDamage(m, p, Math.max(1, Math.round(bossDamage(m, bc.mult, g))), 'take'); g.fx.dmg(p.x, p.y, '凍傷', 'take', 70); }
      }
      if (s.bOn <= 0) { s.safe = null; s.bT = every; g.msg('暴風雪停了。', 'sys'); }
    } else {
      s.bT -= dt;
      if (s.bT <= 0) {
        const a = g.rnd() * Math.PI * 2, d = 3 + g.rnd() * 3;
        const pos = g.map.nearestWalkable(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 4) || [Math.floor(p.x), Math.floor(p.y)];
        s.safe = { x: pos[0] + 0.5, y: pos[1] + 0.5 }; s.safeR = bc.safeR; s.bOn = bc.sec; s.tickT = 1.0;
        g.msg('暴風雪來襲！快躲進橘色的篝火圈取暖！', 'warn'); g.audio.sfx('boss_roar'); g.cam.shake(4, 0.4);
      }
    }
  }
  // 赤焰地龍：每隔一陣子在玩家附近噴出熔岩池（先有預警）
  if (c.lava) {
    const lc = c.lava, every = ph >= 1 ? lc.enrageEvery : lc.every;
    s.lT = (s.lT ?? lc.firstAt) - dt;
    if (s.lT <= 0) {
      s.lT = every;
      for (let i = 0; i < lc.n; i++) {
        const a = g.rnd() * Math.PI * 2, d = i === 0 ? 0.8 + g.rnd() * 1.2 : 2 + g.rnd() * 3.5;
        const pos = g.map.nearestWalkable(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 3); if (!pos) continue;
        spawnHazard(g, m, pos[0] + 0.5, pos[1] + 0.5, lc, '熔岩', lc.warn);
      }
      if (!s.lavaOnce) { s.lavaOnce = true; g.msg('地面裂開了！橘色圈圈會噴出熔岩，別站在上面！', 'warn'); }
    }
  }
  return false;
}

/** 持續傷害區的計時與傷害（Game.update 每個 frame 呼叫） */
export function updateHazards(g: Game, dt: number) {
  if (!g.hazards.length) return;
  const p = g.player;
  for (const h of g.hazards) {
    h.age += dt;
    if (h.age < h.warn || p.dead) continue;
    h.tickT -= dt;
    if (h.tickT <= 0 && dist(p.x, p.y, h.x, h.y) <= h.r) {
      h.tickT = h.tick;
      g.applyDamage(h.owner, p, Math.max(1, Math.round(bossDamage(h.owner, h.mult, g))), 'take'); g.fx.dmg(p.x, p.y, h.label, 'take', 70);
    }
  }
  g.hazards = g.hazards.filter((h) => h.age < h.warn + h.life && !h.owner.dead && !h.owner.remove && h.owner.boss?.active);
}
