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
  if (c.expose) return s.expT > 0 ? c.expose.mul : c.expose.armor;
  if (c.guard) return s.shield ? 0 : s.expT > 0 ? c.guard.exposeMul : 1;
  return 1;
}
/** 目前是否有狀態要在 Boss 身上顯示（核心外露、護衛中） */
export function gimmickAura(m: Monster): { color: string; text: string } | null {
  const c = cfgOf(m); if (!c || !m.boss) return null; const s = gm(m);
  if (c.expose && s.expT > 0) return { color: '#60f0ff', text: '核心暴露！' };
  if (c.guard && s.shield) return { color: '#b0b0b0', text: '手下擋著，打不到！' };
  if (c.guard && s.expT > 0) return { color: '#ffd060', text: '孤立無援！' };
  return null;
}
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
