import type { Game } from '../core/Game';
import type { Monster } from '../entities/Monster';
import { cellDist, dist } from '../core/math';

export const MAX_CHASERS = 3;
const SIGHT = 7, LEASH_HOME = 16, LEASH_TARGET = 13;

export function chasers(g: Game): Monster[] { return g.monsters.filter((m) => m.aggroOn === g.player && !m.dead); }
export function giveUp(m: Monster) { m.aggroOn = null; m.ai = 'return'; m.path = []; m.repathT = 0; }
/** 讓怪物開始追擊玩家；超過上限時讓最遠的追擊者放棄（同時追擊最多 3 隻） */
export function engage(g: Game, m: Monster, force: boolean) {
  if (m.aggroOn === g.player || m.dead || g.player.dead) return;
  const cs = chasers(g);
  if (cs.length >= MAX_CHASERS) {
    if (!force) return;
    cs.sort((a, b) => dist(b.x, b.y, g.player.x, g.player.y) - dist(a.x, a.y, g.player.x, g.player.y));
    giveUp(cs[0]);
  }
  m.aggroOn = g.player; m.ai = 'chase'; m.repathT = 0;
  if (m.isMvp && !m.announcedFight) { m.announcedFight = true; }
}
/** 被攻擊時：自己反擊，同族有 assist 的會來幫忙 */
export function onHurt(g: Game, m: Monster) {
  engage(g, m, true);
  if (m.def.assist) for (const o of g.monsters) if (o !== m && o.def.id === m.def.id && !o.aggroOn && !o.dead && dist(o.x, o.y, m.x, m.y) < 7) engage(g, o, false);
}

export function updateAI(g: Game, m: Monster, dt: number) {
  const p = g.player;
  if (m.atkAnimT >= 0) return;
  // 返回出生點
  if (m.ai === 'return') {
    if (!m.path.length) {
      if (dist(m.x, m.y, m.homeX, m.homeY) < 1.5) { m.ai = 'idle'; return; }
      m.setPath(g.pf.find(m.x, m.y, m.homeX, m.homeY, 2500));
      if (!m.path.length) { m.homeX = m.x; m.homeY = m.y; m.ai = 'idle'; }
    }
    return;
  }
  if (m.aggroOn) {
    if (p.dead || dist(m.x, m.y, m.homeX, m.homeY) > LEASH_HOME + (m.isMvp ? 8 : 0) || dist(m.x, m.y, p.x, p.y) > LEASH_TARGET) { giveUp(m); return; }
    const range = m.def.range;
    if (cellDist(m.x, m.y, p.x, p.y) <= range) {
      m.path = [];
      if (m.atkCd <= 0) {
        m.face(p.x, p.y);
        // MVP 技能
        if (m.def.skills && m.skillCd <= 0) {
          for (const s of m.def.skills) if (g.rnd() < s.chance) { g.monsterSkill(m, s.id); m.skillCd = 5 + g.rnd() * 3; m.atkCd = m.def.adelay / 1000; return; }
          m.skillCd = 1.5;
        }
        m.target = p; m.startAttack(Math.min(0.5, (m.def.adelay / 1000) * 0.6)); m.atkCd = m.def.adelay / 1000; m.ai = 'attack';
      }
    } else {
      m.ai = 'chase';
      m.repathT -= dt;
      if (m.repathT <= 0 || !m.path.length) { m.repathT = 0.35 + g.rnd() * 0.15; m.setPath(g.pf.find(m.x, m.y, p.x, p.y, 1500, range)); }
    }
    return;
  }
  // 主動怪：看到玩家就追（受同時追擊上限限制）
  if (m.def.aggro && !p.dead && g.map.def.type !== 'town' && dist(m.x, m.y, p.x, p.y) <= SIGHT && g.time > g.safeUntil) {
    engage(g, m, false);
    if (m.aggroOn) { g.fx.dmg(m.x, m.y, '!', 'take', -m.bbox.y0 + 16); return; }
  }
  // 閒晃
  m.aiT -= dt;
  if (m.aiT <= 0 && !m.path.length) {
    m.aiT = 2 + g.rnd() * 5;
    if (g.rnd() < 0.7) {
      const tx = Math.floor(m.homeX + (g.rnd() * 2 - 1) * 5), ty = Math.floor(m.homeY + (g.rnd() * 2 - 1) * 5);
      if (g.map.canWalk(tx, ty)) { m.setPath(g.pf.find(m.x, m.y, tx, ty, 400)); m.ai = 'wander'; }
    }
  }
}
