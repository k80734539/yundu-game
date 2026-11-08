import type { Game } from '../core/Game';
import type { Monster } from '../entities/Monster';
import { BOSSFIGHT, BossMove, DB } from '../data';
import { cellDist, dist } from '../core/math';

/** 地上的預警區：圓形（範圍技）或矩形（衝刺路線）。到時間才結算傷害，玩家在區外就完全不受傷 */
export interface Telegraph {
  kind: 'circle' | 'line';
  x: number; y: number; r: number;          // 圓心與半徑
  x2: number; y2: number; width: number;    // 線：終點與寬度
  t: number; dur: number; owner: Monster; mult: number; color: string; done?: boolean;
}
export interface BossState {
  active: boolean; phase: 0 | 1 | 2; state: 'idle' | 'windup' | 'roar' | 'recover'; t: number; dur: number;
  move: BossMove | null; last: string; repeat: number; gapT: number; startT: number | null;
  dashTo: { x: number; y: number } | null;
}
const G = BOSSFIGHT.global;
export const hasBossFight = (m: Monster) => m.isMvp && !!BOSSFIGHT.bosses[m.def.id];
const newState = (): BossState => ({ active: false, phase: 0, state: 'idle', t: 0, dur: 0, move: null, last: '', repeat: 0, gapT: 1, startT: null, dashTo: null });

/** 離開戰鬥（玩家死亡、跑太遠）：Boss 回滿血、回到一般階段、計時歸零 */
export function resetBoss(g: Game, m: Monster) {
  m.boss = newState(); m.hp = m.maxHp; m.speed = m.def.speed;
  g.telegraphs = g.telegraphs.filter((t) => t.owner !== m);
}
export function bossDamage(m: Monster, mult: number, g: Game): number {
  const p = g.player, a = m.def.atk, atk = (a[0] + g.rnd() * (a[1] - a[0])) * mult;
  return Math.max(1, Math.round((atk * (100 - p.d.def)) / 100) - p.d.softDef);
}
const phaseCfg = (b: BossState) => G.phases[b.phase];
function moveList(m: Monster, b: BossState): BossMove[] {
  const c = BOSSFIGHT.bosses[m.def.id];
  return b.phase > 0 ? [...c.moves, ...c.enrageMoves] : c.moves;
}
/** 預兆時間：設定值 × 階段倍率，但不會低於最小預兆時間（範圍技至少 0.8 秒） */
export function windupOf(mv: BossMove, b: BossState): number {
  const w = mv.windup * phaseCfg(b).windupMul;
  return Math.max(G.minWindup[mv.type], mv.type === 'melee' ? w / phaseCfg(b).aspd : w);
}
function eligible(m: Monster, mv: BossMove, d: number): boolean {
  if (mv.type === 'melee') return d <= m.def.range + 0.7;
  return d >= (mv.minDist ?? 0) && d <= (mv.maxDist ?? 9);
}
function pickMove(g: Game, m: Monster, b: BossState): BossMove | null {
  const d = dist(m.x, m.y, g.player.x, g.player.y);
  let list = moveList(m, b).filter((mv) => eligible(m, mv, d));
  if (b.repeat >= G.maxRepeat) { const alt = list.filter((mv) => mv.id !== b.last); list = alt; } // 同一招最多連續 2 次
  if (!list.length) return null;
  let tot = list.reduce((s, mv) => s + mv.weight, 0), x = g.rnd() * tot;
  for (const mv of list) { x -= mv.weight; if (x < 0) return mv; }
  return list[0];
}
function setPhase(g: Game, m: Monster, b: BossState, ph: 1 | 2) {
  b.phase = ph; m.speed = m.def.speed * phaseCfg(b).moveMul;
  b.state = 'roar'; b.t = 0; b.dur = ph === 1 ? G.roar.enrage : G.roar.frenzy; b.move = null; m.path = []; b.gapT = 0;
  g.telegraphs = g.telegraphs.filter((t) => t.owner !== m); // 吼叫時清掉舊預警，給玩家喘息
  const col = ph === 1 ? '#ff3020' : '#ff1030';
  g.fx.ring(m.x, m.y, col, 0.9, 120); g.fx.ring(m.x, m.y, '#ffffff', 0.6, 70);
  g.fx.burst(m.x, m.y, -m.bbox.y0 * 0.5, col, 40, 200, 'spark', 0.8, 3);
  g.cam.shake(ph === 1 ? 8 : 6, 0.6); g.audio.sfx('boss_roar');
  g.fx.dmg(m.x, m.y, ph === 1 ? 'RAGE!' : 'FRENZY!', 'take', -m.bbox.y0 + 24);
  g.msg(ph === 1 ? `${m.def.name} 發出怒吼，進入狂暴狀態！攻擊速度提升，並使出新招式！` : `${m.def.name} 瀕死狂暴，攻勢更猛了！`, 'warn');
  g.ev.emit('bossphase', { id: m.def.id, phase: ph });
}
/** 沿方向走到最遠的可走位置（衝刺終點） */
function rayEnd(g: Game, x: number, y: number, dx: number, dy: number, len: number): { x: number; y: number } {
  let ex = x, ey = y;
  for (let s = 0.25; s <= len; s += 0.25) { const nx = x + dx * s, ny = y + dy * s; if (!g.map.canWalk(nx, ny)) break; ex = nx; ey = ny; }
  return { x: ex, y: ey };
}
function startMove(g: Game, m: Monster, b: BossState, mv: BossMove) {
  const p = g.player, w = windupOf(mv, b);
  b.move = mv; b.state = 'windup'; b.t = 0; b.dur = w; m.path = []; m.face(p.x, p.y);
  b.repeat = b.last === mv.id ? b.repeat + 1 : 1; b.last = mv.id;
  const col = '#ff2a1a', mult = mv.mult ?? 1;
  if (mv.type === 'aoe') {
    const c = mv.center === 'self' ? m : p;
    g.telegraphs.push({ kind: 'circle', x: c.x, y: c.y, r: mv.radius!, x2: 0, y2: 0, width: 0, t: 0, dur: w, owner: m, mult, color: col });
  } else if (mv.type === 'barrage') {
    const n = mv.count!, step = mv.interval!;
    for (let i = 0; i < n; i++) {
      const a = g.rnd() * Math.PI * 2, rr = i === 0 ? 0 : g.rnd() * mv.spread!;
      let cx = p.x + Math.cos(a) * rr, cy = p.y + Math.sin(a) * rr;
      if (!g.map.canWalk(cx, cy)) { cx = p.x; cy = p.y; }
      g.telegraphs.push({ kind: 'circle', x: cx, y: cy, r: mv.radius!, x2: 0, y2: 0, width: 0, t: -i * step, dur: w, owner: m, mult, color: col });
    }
    b.dur = w + (n - 1) * step;
  } else if (mv.type === 'charge') {
    let dx = p.x - m.x, dy = p.y - m.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const end = rayEnd(g, m.x, m.y, dx, dy, mv.length!);
    b.dashTo = end;
    g.telegraphs.push({ kind: 'line', x: m.x, y: m.y, r: 0, x2: end.x, y2: end.y, width: mv.width!, t: 0, dur: w, owner: m, mult, color: col });
  } else if (mv.type === 'summon') {
    g.fx.ring(m.x, m.y, '#ff80c0', w, 50);
  }
  g.audio.sfx('boss_warn');
  g.ev.emit('bossmove', { id: m.def.id, move: mv.id, type: mv.type, windup: w, phase: b.phase, t: g.time });
}
function execute(g: Game, m: Monster, b: BossState) {
  const mv = b.move!, p = g.player;
  m.target = null; // 傷害由 Boss 自己結算，不走一般攻擊的命中流程
  if (mv.type === 'melee') {
    m.startAttack(0.3 / phaseCfg(b).aspd);
    if (!p.dead && cellDist(m.x, m.y, p.x, p.y) <= m.def.range + 0.7) g.applyDamage(m, p, bossDamage(m, mv.mult ?? 0.5, g), 'take');
    else g.fx.dmg(m.x, m.y, 'MISS', 'miss', -m.bbox.y0 + 10);
  } else if (mv.type === 'aoe') m.startAttack(0.45);
  else if (mv.type === 'barrage') m.startAttack(0.45);
  else if (mv.type === 'charge' && b.dashTo) {
    const to = b.dashTo; m.slide = { fx: m.x, fy: m.y, tx: to.x, ty: to.y, t: 0, dur: mv.dashTime ?? 0.3 };
    g.fx.burst(m.x, m.y, 4, '#d8c8a0', 16, 120, 'dot', 0.5, 3); b.dashTo = null;
  } else if (mv.type === 'summon') g.monsterSkill(m, 'summon');
  b.state = 'recover'; b.t = 0; b.dur = mv.recover + (mv.type === 'charge' ? mv.dashTime ?? 0.3 : 0);
}
/** 戰鬥中的 Boss 行為；沒有進入戰鬥（aggroOn 為空）時回傳 false，交給一般 AI 處理閒晃／發現玩家 */
export function bossUpdate(g: Game, m: Monster, dt: number): boolean {
  if (!m.aggroOn) return false;
  const b = (m.boss ||= newState()), p = g.player;
  if (!b.active) {
    b.active = true; b.startT = g.time; b.gapT = 1.0;
    g.announce(`【Boss 戰】${m.def.name} 現身了！`); g.ev.emit('bossstart', { id: m.def.id });
  }
  // 狂暴階段：血量低於 50% → 怒吼；低於 20% → 再加快
  const ratio = m.hp / m.maxHp;
  if (b.phase < 2 && ratio <= G.frenzyAt && b.state !== 'roar') setPhase(g, m, b, 2);
  else if (b.phase < 1 && ratio <= G.enrageAt && b.state !== 'roar') setPhase(g, m, b, 1);
  if (b.state === 'windup') {
    b.t += dt; m.path = []; if (b.move!.type !== 'charge') m.face(p.x, p.y);
    if (b.t >= b.dur) execute(g, m, b);
  } else if (b.state === 'roar' || b.state === 'recover') {
    b.t += dt; m.path = [];
    if (b.t >= b.dur) { b.state = 'idle'; b.gapT = phaseCfg(b).gap; }
  } else {
    b.gapT -= dt;
    const d = dist(m.x, m.y, p.x, p.y), range = m.def.range;
    if (b.gapT <= 0) { const mv = pickMove(g, m, b); if (mv) { startMove(g, m, b, mv); return true; } }
    // 還在間隔，或沒有合適的招式：追向玩家
    if (cellDist(m.x, m.y, p.x, p.y) <= range) { m.path = []; m.face(p.x, p.y); }
    else { m.repathT -= dt; if (m.repathT <= 0 || !m.path.length) { m.repathT = 0.35 + g.rnd() * 0.15; m.setPath(g.pf.find(m.x, m.y, p.x, p.y, 1500, range)); } }
    void d;
  }
  return true;
}
export const fightTime = (m: Monster, g: Game) => (m.boss && m.boss.startT !== null ? g.time - m.boss.startT : 0);
export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
export { DB };
