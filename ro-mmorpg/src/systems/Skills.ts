import type { Game } from '../core/Game';
import { Monster } from '../entities/Monster';
import { Projectile, ProjKind } from '../entities/Projectile';
import { DB, SkillDef } from '../data';
import { cellDist } from '../core/math';
import { playerVsMonster, magicVsMonster } from './Combat';

const GHOSTLY = new Set(['zombie', 'skeleton', 'skeleton2', 'wisp', 'wraith']);
const ELEM: Record<string, string[]> = { fire: ['plant', 'bug', 'mushroom', 'flower', 'bee'], water: ['crab', 'golem'], wind: ['bird', 'bat', 'bee'], ghost: ['ghost'] };
export interface CastState { id: string; lv: number; t: number; dur: number; target: Monster | null }
/** 技能施放：選目標、走進射程、詠唱條、冷卻、效果 */
export class SkillSystem {
  cast: CastState | null = null;
  targeting: string | null = null;
  pending: { id: string; target: Monster } | null = null;
  meleeHit: { id: string; lv: number; target: Monster } | null = null;
  constructor(private g: Game) {}
  lv(id: string) { return this.g.player.ch.skills[id] || 0; }
  def(id: string): SkillDef { return DB.skill[id]; }
  /** 從快捷鍵／技能視窗使用 */
  use(id: string) {
    const g = this.g, p = g.player, s = this.def(id), lv = this.lv(id);
    if (!s || !lv) { g.msg('還沒有學會這個技能。', 'warn'); return; }
    if (s.type === 'passive' || p.dead) return;
    if (this.cast) return;
    if ((g.skillCd[id] || 0) > 0) { g.msg(`${s.name} 冷卻中…`, 'warn'); return; }
    if (p.sp < s.sp[lv - 1]) { g.msg('SP 不足！', 'warn'); g.fx.dmg(p.x, p.y, 'SP', 'sp', 130); return; }
    if (s.target === 'enemy') {
      const t = (p.chase instanceof Monster && !p.chase.dead) ? p.chase : (g.hover instanceof Monster ? g.hover : null);
      if (t) this.begin(id, t);
      else { this.targeting = id; g.msg(`${s.name}：請點選目標`, 'sys'); }
    } else this.begin(id, null);
  }
  cancelTargeting() { this.targeting = null; }
  onTargetClick(m: Monster) { const id = this.targeting!; this.targeting = null; this.begin(id, m); }
  range(id: string) { return this.def(id).range || 1; }
  begin(id: string, target: Monster | null) {
    const g = this.g, p = g.player, s = this.def(id), lv = this.lv(id);
    if (target) {
      if (cellDist(p.x, p.y, target.x, target.y) > this.range(id)) { // 走進射程再施放（RO 的做法）
        this.pending = { id, target }; p.chase = null;
        p.setPath(g.pf.find(p.x, p.y, target.x, target.y, 3000, this.range(id)));
        return;
      }
      p.face(target.x, target.y);
    }
    p.path = []; p.chase = target && s.effect !== 'debuff' ? target : p.chase;
    const castT = (s.cast[lv - 1] || 0) * Math.max(0, 1 - p.d.total.dex / 150) * (1 - 0.03 * (p.ch.skills.mana_cycle || 0));
    if (castT > 0.05) {
      this.cast = { id, lv, t: 0, dur: castT, target };
      p.state = 'cast'; p.animT = 0;
      g.audio?.sfx('cast');
      g.fx.ring(p.x, p.y, s.element === 'fire' ? '#ff8040' : s.element === 'water' ? '#60c0ff' : s.element === 'wind' ? '#f0e060' : '#c0a0ff', castT, 46);
    } else this.execute(id, lv, target);
  }
  interrupt() { if (this.cast) { this.cast = null; this.g.player.state = 'idle'; this.g.msg('詠唱被中斷了。', 'warn'); } this.pending = null; }
  update(dt: number) {
    const g = this.g, p = g.player;
    if (this.pending) {
      const { id, target } = this.pending;
      if (target.dead || target.remove) this.pending = null;
      else if (cellDist(p.x, p.y, target.x, target.y) <= this.range(id)) { this.pending = null; this.begin(id, target); }
      else if (!p.path.length) p.setPath(g.pf.find(p.x, p.y, target.x, target.y, 3000, this.range(id)));
    }
    if (this.cast) {
      const c = this.cast;
      c.t += dt;
      if (Math.random() < 0.5) g.fx.glow(p.x, p.y, 10 + Math.random() * 30, '#d8c8ff', 0.6, 1, 50);
      if (c.target && (c.target.dead || c.target.remove)) { this.cast = null; p.state = 'idle'; return; }
      if (c.t >= c.dur) { this.cast = null; p.state = 'idle'; this.execute(c.id, c.lv, c.target); }
    }
  }
  /** 扣 SP、設定冷卻、產生效果 */
  execute(id: string, lv: number, target: Monster | null) {
    const g = this.g, p = g.player, s = this.def(id);
    const sp = s.sp[lv - 1];
    if (p.sp < sp) { g.msg('SP 不足！', 'warn'); return; }
    p.sp -= sp;
    g.skillCd[id] = g.skillCdMax[id] = s.cd[lv - 1] || 0.3;
    g.skillName(s.name);
    g.audio?.sfx('skill_' + s.fx);
    const pw = (s.power?.[lv - 1] ?? 100) / 100;
    const hits = s.hits === 'lv' ? lv : s.hits === 'half' ? Math.ceil(lv / 2) : (typeof s.hits === 'number' ? s.hits : 1);
    switch (s.effect) {
      case 'heal': { const v = s.value?.[lv - 1] || 15; p.hp = Math.min(p.maxHp, p.hp + v); g.fx.dmg(p.x, p.y, v, 'heal', 120); for (let i = 0; i < 10; i++) g.fx.glow(p.x, p.y, 20 + Math.random() * 60, '#ff9090', 0.6, 2, 40); break; }
      case 'melee': {
        if (!target) break;
        p.target = target; p.startAttack(0.36); p.atkCd = Math.max(p.atkCd, 0.36);
        this.meleeHit = { id, lv, target };
        break;
      }
      case 'aoe_self': {
        p.startAttack(0.4);
        g.fx.ring(p.x, p.y, '#ff6020', 0.5, (s.aoe || 2) * 50); g.fx.ring(p.x, p.y, '#ffd040', 0.35, (s.aoe || 2) * 34);
        g.fx.burst(p.x, p.y, 10, '#ff7a20', 40, 160, 'spark', 0.6, 3); g.fx.burst(p.x, p.y, 10, '#ffe080', 20, 120, 'spark', 0.5, 2);
        g.cam.shake(6, 0.3);
        for (const m of g.monstersNear(p.x, p.y, (s.aoe || 2) + 0.5)) { this.phys(m, pw, s, true); g.knockback(m, p.x, p.y, s.knock || 2); }
        break;
      }
      case 'debuff': {
        if (!target) break;
        target.provokeT = s.dur?.[0] ?? 30; target.provokeDef = s.value?.[lv - 1] ?? 5;
        g.engage(target);
        g.fx.dmg(target.x, target.y, '!', 'take', -target.bbox.y0 + 20);
        g.fx.burst(target.x, target.y, -target.bbox.y0 * 0.6, '#ff4040', 12, 60, 'spark', 0.5, 2);
        break;
      }
      case 'buff': {
        const key = id;
        p.buffs[key] = s.value?.[lv - 1] ?? 1; g.buffT[key] = s.dur?.[lv - 1] ?? 30; g.buffMax[key] = g.buffT[key];
        p.recalc();
        const col = id === 'endure' || id === 'guard' ? '#ffd860' : id === 'barrier' ? '#b0a0ff' : '#80ff90';
        for (let i = 0; i < 26; i++) g.fx.glow(p.x, p.y, Math.random() * 40, col, 1.0, 2, 60 + Math.random() * 50);
        g.fx.ring(p.x, p.y, col, 0.6, 44);
        g.ev.emit('stats');
        break;
      }
      case 'bolt': {
        if (!target) break;
        p.startAttack(0.4);
        const kind: ProjKind = id === 'firebolt' ? 'fire' : id === 'coldbolt' ? 'ice' : 'soul';
        for (let i = 0; i < hits; i++) {
          const pr = new Projectile(kind, kind === 'soul' ? p.x : target.x, kind === 'soul' ? p.y : target.y, kind === 'soul' ? 70 : 260, target, () => {
            let mult = pw;
            if (s.element === 'ghost' && GHOSTLY.has(target.def.id)) mult *= 1 + 0.05 * lv;
            const r = this.magic(target, mult, s);
            if (r && id === 'coldbolt' && g.rnd() * 100 < (s.value?.[lv - 1] ?? 0)) { target.frozenT = 3; g.fx.dmg(target.x, target.y, 'FREEZE', 'sp', -target.bbox.y0 + 30); }
            g.fx.burst(target.x, target.y, -target.bbox.y0 * 0.5, kind === 'fire' ? '#ff8030' : kind === 'ice' ? '#a0e0ff' : '#d0a0ff', 10, 90, 'spark', 0.4, 2);
          }, 11, kind !== 'soul', i * (kind === 'soul' ? 0.14 : 0.16));
          g.addProjectile(pr);
        }
        break;
      }
      case 'aoe_target': {
        if (!target) break;
        const cx = target.x, cy = target.y, r = s.aoe || 2;
        if (s.fx === 'meteor') {
          p.startAttack(0.4);
          for (let i = 0; i < hits; i++) g.after(i * 0.35, () => {
            const sx = cx + (g.rnd() - 0.5) * r, sy = cy + (g.rnd() - 0.5) * r;
            g.fx.meteor(sx, sy);
            g.after(0.3, () => { g.fx.ring(sx, sy, '#ff8030', 0.5, r * 45); g.fx.burst(sx, sy, 0, '#ff7020', 30, 160, 'spark', 0.6, 3); g.cam.shake(7, 0.3); g.audio.sfx('skill_fire_burst'); for (const m of g.monstersNear(sx, sy, r + 0.5)) this.magic(m, pw, s); });
          });
        } else if (s.fx === 'frost') {
          p.startAttack(0.4);
          g.fx.ring(cx, cy, '#a0e8ff', 0.6, r * 48); g.fx.ring(cx, cy, '#ffffff', 0.4, r * 30); g.fx.burst(cx, cy, 0, '#c8f0ff', 30, 130, 'spark', 0.6, 2); g.audio.sfx('skill_cold_bolt');
          for (const m of g.monstersNear(cx, cy, r + 0.5)) { const res = this.magic(m, pw, s); if (res && g.rnd() * 100 < (s.value?.[lv - 1] ?? 30)) { m.frozenT = 3; g.fx.dmg(m.x, m.y, 'FREEZE', 'sp', -m.bbox.y0 + 30); } }
        } else if (s.fx === 'trap') {
          p.startAttack(0.35);
          g.fx.ring(cx, cy, '#c8a060', 0.5, r * 40); g.fx.burst(cx, cy, 4, '#a08060', 18, 90, 'dot', 0.5, 3);
          for (const m of g.monstersNear(cx, cy, r + 0.5)) { const res = this.phys(m, pw, s, true); if (res) { m.frozenT = Math.max(m.frozenT, s.value?.[lv - 1] ?? 2); g.fx.dmg(m.x, m.y, 'TRAP', 'skill', -m.bbox.y0 + 30); } }
        } else if (id === 'thunderstorm') {
          p.startAttack(0.4);
          for (let i = 0; i < hits; i++) g.after(i * 0.2, () => {
            const sx = cx + (g.rnd() - 0.5) * r * 1.2, sy = cy + (g.rnd() - 0.5) * r * 1.2;
            g.fx.lightning(sx, sy); g.cam.shake(3, 0.12); g.audio?.sfx('thunder');
            for (const m of g.monstersNear(cx, cy, r + 0.5)) this.magic(m, pw, s);
          });
        } else {
          p.startAttack(0.35);
          for (let i = 0; i < 14; i++) g.after(i * 0.02, () => g.fx.arrowRain(cx + (g.rnd() - 0.5) * r * 2, cy + (g.rnd() - 0.5) * r * 2));
          g.after(0.3, () => { for (const m of g.monstersNear(cx, cy, r + 0.5)) { this.phys(m, pw, s, true); g.knockback(m, p.x, p.y, s.knock || 2); } });
        }
        break;
      }
      case 'chain': {
        if (!target) break;
        p.startAttack(0.4);
        const n = s.value?.[lv - 1] ?? 3, hitList: Monster[] = [];
        let cur: Monster | undefined = target;
        for (let i = 0; i < n && cur; i++) {
          const m: Monster = cur; hitList.push(m);
          g.after(i * 0.15, () => { if (m.dead) return; g.fx.lightning(m.x, m.y); g.audio.sfx('thunder'); this.magic(m, pw, s); });
          cur = g.monstersNear(m.x, m.y, 4).filter((o) => !hitList.includes(o)).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y))[0];
        }
        break;
      }
      case 'arrow': {
        if (!target) break;
        p.target = target; p.startAttack(0.32);
        const n = hits;
        for (let i = 0; i < n; i++) {
          const pr = new Projectile(id === 'charge_arrow' ? 'charge' : 'arrow', p.x, p.y, 70, target, () => {
            this.phys(target, pw, s, false);
            if (s.knock) g.knockback(target, p.x, p.y, Math.floor(2 + lv / 2));
          }, 18, false, i * 0.13);
          g.addProjectile(pr);
        }
        break;
      }
    }
    g.ev.emit('stats');
  }
  elemMult(m: Monster, s: SkillDef) { const e = s.element; return e && ELEM[e]?.includes(m.def.look.body || '') ? 1.25 : 1; }
  phys(m: Monster, mult: number, s: SkillDef, forceHit: boolean) {
    if (m.dead) return null;
    const g = this.g;
    const def = m.provokeT > 0 ? { ...m.def, def: Math.max(0, m.def.def - m.provokeDef) } : m.def;
    const r = playerVsMonster(g.player.d, def, g.rnd, mult * this.elemMult(m, s), true, forceHit);
    if (r.kind === 'miss') { g.fx.dmg(m.x, m.y, 'MISS', 'miss', -m.bbox.y0 + 10); g.engage(m); return null; }
    g.applyDamage(g.player, m, r.dmg, 'skill');
    return r;
  }
  magic(m: Monster, mult: number, s: SkillDef) {
    if (m.dead) return null;
    const g = this.g;
    const r = magicVsMonster(g.player.d, m.def, g.rnd, mult * this.elemMult(m, s));
    g.applyDamage(g.player, m, r.dmg, 'skill');
    return r;
  }
  /** 近戰技能在攻擊動畫命中點結算 */
  resolveMelee() {
    const h = this.meleeHit; this.meleeHit = null; if (!h || h.target.dead) return;
    const s = this.def(h.id), pw = (s.power?.[h.lv - 1] ?? 100) / 100;
    const g = this.g;
    g.fx.burst(h.target.x, h.target.y, -h.target.bbox.y0 * 0.5, '#ffb040', 16, 120, 'spark', 0.4, 3);
    g.fx.ring(h.target.x, h.target.y, '#ffe080', 0.3, 30, -h.target.bbox.y0 * 0.5);
    const n = typeof s.hits === 'number' ? s.hits : 1;
    for (let i = 0; i < n; i++) { if (i === 0) this.phys(h.target, pw, s, true); else g.after(i * 0.12, () => { if (!h.target.dead) { g.fx.burst(h.target.x, h.target.y, -h.target.bbox.y0 * 0.5, '#ffe080', 8, 90, 'spark', 0.3, 2); this.phys(h.target, pw, s, true); } }); }
  }
}
