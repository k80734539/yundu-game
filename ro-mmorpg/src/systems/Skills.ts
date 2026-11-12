import { Effects } from '../render/Effects';
import type { Game } from '../core/Game';
import { Monster } from '../entities/Monster';
import { Projectile, ProjKind } from '../entities/Projectile';
import { DB, SkillDef } from '../data';
import { cellDist } from '../core/math';
import { playerVsMonster, magicVsMonster } from './Combat';

/** 技能箭的殘影顏色 */
const ARROW_COLOR: Record<string, string> = { double_strafe: '#bfe8ff', multi_shot: '#d8f08a', seeker_arrow: '#70ff90', snipe: '#60ffc0', phantom_volley: '#c8a0ff' };
const GHOSTLY = new Set(['zombie', 'skeleton', 'skeleton2', 'wisp', 'wraith']);
export const ELEM: Record<string, string[]> = { fire: ['plant', 'bug', 'mushroom', 'flower', 'bee'], water: ['crab', 'golem'], wind: ['bird', 'bat', 'bee'], ghost: ['ghost'] };
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
      g.fx.magicCircle(p.x, p.y, s.element === 'fire' ? '#ff8040' : s.element === 'water' ? '#60c0ff' : s.element === 'wind' ? '#f0e060' : '#c0a0ff', castT + 0.2, 46); // 腳下的魔法陣，顏色看屬性
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
        this.aoeSelfFx(id, s.aoe || 2);
        g.cam.shake(6, 0.3);
        for (const m of g.monstersNear(p.x, p.y, (s.aoe || 2) + 0.5)) { this.phys(m, pw, s, true); g.knockback(m, p.x, p.y, s.knock || 2); }
        break;
      }
      case 'debuff': {
        if (!target) break;
        target.provokeT = s.dur?.[0] ?? 30; target.provokeDef = s.value?.[lv - 1] ?? 5;
        g.engage(target);
        { // 挑釁：朝目標喊出三道聲波，目標頭上冒出怒氣符號
          const ang = Effects.screenAngle(target.x - p.x, target.y - p.y), tz = -target.bbox.y0;
          p.face(target.x, target.y);
          for (let i = 0; i < 3; i++) g.after(i * 0.07, () => g.fx.wave(p.x, p.y, 70, ang, i === 1 ? '#ffffff' : '#ff5040', 12, 60 + i * 26, 0.38));
          g.after(0.18, () => { g.fx.anger(target.x, target.y, tz + 26); g.fx.ring(target.x, target.y, '#ff4040', 0.45, 34); g.fx.burst(target.x, target.y, tz * 0.6, '#ff4040', 12, 70, 'spark', 0.5, 2); });
        }
        break;
      }
      case 'buff': {
        const key = id;
        p.buffs[key] = s.value?.[lv - 1] ?? 1; g.buffT[key] = s.dur?.[lv - 1] ?? 30; g.buffMax[key] = g.buffT[key];
        p.recalc();
        const col = id === 'endure' || id === 'guard' ? '#ffd860' : id === 'barrier' ? '#b0a0ff' : '#80ff90';
        for (let i = 0; i < 26; i++) g.fx.glow(p.x, p.y, Math.random() * 40, col, 1.0, 2, 60 + Math.random() * 50);
        g.fx.ring(p.x, p.y, col, 0.6, 44);
        if (id === 'concentration') { g.fx.reticle(p.x, p.y, 96, '#80ff90', 26, 0.6); g.fx.star(p.x, p.y, 96, '#c8ffd0', 18, 0.3); }                                                            // 集中：準星收束在眼前
        if (id === 'hunters_mark') { g.fx.reticle(p.x, p.y, 60, '#ff5a50', 46, 0.7); g.fx.reticle(p.x, p.y, 60, '#ffffff', 30, 0.5); g.fx.pillar(p.x, p.y, '#ff8070', 0.5, 12, 110); }   // 獵魔印記：紅色準星
        if (id === 'wind_step') { g.fx.slash(p.x, p.y, 20, 0, { r: 40, th: 12, span: 6.1, flat: 0.5, color: '#b8ffd8', color2: '#ffffff', life: 0.4 }); g.after(0.12, () => g.fx.slash(p.x, p.y, 50, 3.1, { r: 30, th: 9, span: 6.1, flat: 0.5, color: '#e0fff0', color2: '#ffffff', life: 0.36, sgn: -1 })); }   // 疾風步：繞著身體的兩道風
        if (id === 'barrier' || id === 'mana_surge') { g.fx.bubble(p.x, p.y, id === 'barrier' ? '#b0a0ff' : '#80e8ff', 1.2); g.fx.magicCircle(p.x, p.y, col, 0.8, 40); } // 魔力屏障／魔力奔流：光罩＋魔法陣
        if (id === 'endure' || id === 'guard' || id === 'divine_aegis') { // 霸體／守護：金色光柱＋兩道往外的光環
          g.fx.pillar(p.x, p.y, col, 0.75, 24, 130); g.after(0.12, () => g.fx.ring(p.x, p.y, '#ffffff', 0.45, 60)); g.fx.star(p.x, p.y, 70, col, 30, 0.3); g.cam.shake(2, 0.12);
        }
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
            const tz = -target.bbox.y0 * 0.5, last = i === hits - 1;
            if (kind === 'fire') { g.fx.burst(target.x, target.y, tz, '#ff8030', 10, 100, 'spark', 0.4, 2); g.fx.star(target.x, target.y, tz, '#ffb040', 20, 0.18); if (last) { g.fx.flameRing(target.x, target.y, 30, 0.4); g.cam.shake(3, 0.15); } }
            else if (kind === 'ice') { g.fx.shards(target.x, target.y, tz, '#bfe8ff', 7); g.fx.star(target.x, target.y, tz, '#dff4ff', 20, 0.18); if (last) { g.fx.ring(target.x, target.y, '#bfe8ff', 0.4, 36); g.fx.shards(target.x, target.y, tz, '#ffffff', 8); } }
            else { g.fx.burst(target.x, target.y, tz, '#d0a0ff', 10, 90, 'spark', 0.4, 2); g.fx.star(target.x, target.y, tz, '#d8a8ff', 22, 0.2); g.fx.ring(target.x, target.y, '#c090ff', 0.3, 26, tz); }
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
            g.after(0.3, () => { g.fx.flameRing(sx, sy, r * 30, 0.55); g.fx.star(sx, sy, 8, '#ffd060', 44, 0.26); g.fx.ring(sx, sy, '#ff8030', 0.5, r * 45); g.fx.burst(sx, sy, 0, '#ff7020', 30, 160, 'spark', 0.6, 3); g.cam.shake(7, 0.3); g.audio.sfx('skill_fire_burst'); for (const m of g.monstersNear(sx, sy, r + 0.5)) this.magic(m, pw, s); });
          });
        } else if (s.fx === 'frost') {
          p.startAttack(0.4);
          g.fx.iceSpikes(cx, cy, r * 40, 1.0); g.fx.shards(cx, cy, 10, '#ffffff', 14); g.cam.shake(4, 0.2);
          g.fx.ring(cx, cy, '#a0e8ff', 0.6, r * 48); g.fx.ring(cx, cy, '#ffffff', 0.4, r * 30); g.fx.burst(cx, cy, 0, '#c8f0ff', 30, 130, 'spark', 0.6, 2); g.audio.sfx('skill_cold_bolt');
          for (const m of g.monstersNear(cx, cy, r + 0.5)) { const res = this.magic(m, pw, s); if (res && g.rnd() * 100 < (s.value?.[lv - 1] ?? 30)) { m.frozenT = 3; g.fx.dmg(m.x, m.y, 'FREEZE', 'sp', -m.bbox.y0 + 30); } }
        } else if (s.fx === 'trap') {
          p.startAttack(0.35);
          g.fx.trapSnap(cx, cy, r * 22, 0.8); g.fx.star(cx, cy, 14, '#e8eef8', 26, 0.2); g.cam.shake(3, 0.14);
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
          { // 箭雨／滅絕箭雨：先在地上標出範圍，再落下一陣箭；範圍越大箭越多
            const big = id === 'rain_of_death', col = big ? '#60ffc0' : '#e8d8b0', n = Math.round(10 + r * r * 3);
            g.fx.reticle(cx, cy, 0, big ? '#60ffc0' : '#ffffff', r * 22, 0.5); g.fx.ring(cx, cy, col, 0.5, r * 45);
            for (let i = 0; i < n; i++) g.after(i * (0.3 / n) + (big ? g.rnd() * 0.25 : 0), () => { const a = g.rnd() * 6.28, d = Math.sqrt(g.rnd()) * r; g.fx.arrowRain(cx + Math.cos(a) * d, cy + Math.sin(a) * d, col); });
            g.after(0.3, () => { g.fx.burst(cx, cy, 2, '#c8b890', 16 + r * 4, 90, 'dot', 0.4, 2); if (big) { g.fx.ring(cx, cy, '#ffffff', 0.4, r * 40); g.cam.shake(5, 0.25); } });
          }
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
          g.after(i * 0.15, () => { if (m.dead) return; g.fx.lightning(m.x, m.y, id === 'void_lance' ? '#c090ff' : '#fff8a0'); g.audio.sfx('thunder'); this.magic(m, pw, s); });
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
            this.arrowHitFx(id, target, i === n - 1);
            this.phys(target, pw, s, false);
            if (s.knock) g.knockback(target, p.x, p.y, Math.floor(2 + lv / 2));
          }, 18, false, i * 0.13);
          pr.color = ARROW_COLOR[id] || ''; pr.big = id === 'snipe';
          g.addProjectile(pr);
        }
        { // 放箭瞬間：弦震；狙擊另外有一道彈道光
          const ang = Effects.screenAngle(target.x - p.x, target.y - p.y);
          g.fx.wave(p.x, p.y, 60, ang, ARROW_COLOR[id] || '#ffffff', 10, id === 'snipe' ? 54 : 36, 0.2);
          if (id === 'snipe') { g.fx.beam(p.x, p.y, 62, target.x, target.y, -target.bbox.y0 * 0.5, '#60ffc0', 0.3, 8); g.fx.reticle(target.x, target.y, -target.bbox.y0 * 0.5, '#60ffc0', 22, 0.35); g.cam.shake(3, 0.12); }
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
  /** 技能箭命中時的特效 */
  arrowHitFx(id: string, t: Monster, last: boolean) {
    const g = this.g, tz = -t.bbox.y0 * 0.5, col = id === 'charge_arrow' ? '#ffb060' : ARROW_COLOR[id] || '#ffffff';
    g.fx.star(t.x, t.y, tz, col, id === 'snipe' ? 40 : id === 'charge_arrow' ? 30 : 20, 0.2);
    g.fx.burst(t.x, t.y, tz, col, id === 'snipe' ? 20 : 8, 110, 'spark', 0.35, 2);
    if (id === 'snipe') { g.fx.ring(t.x, t.y, col, 0.35, 46, tz); g.fx.ring(t.x, t.y, '#ffffff', 0.25, 28, tz); g.cam.shake(5, 0.2); }
    else if (id === 'charge_arrow') { g.fx.ring(t.x, t.y, col, 0.3, 36, tz); g.cam.shake(3, 0.14); }
    else if (id === 'seeker_arrow') g.fx.reticle(t.x, t.y, tz, col, 16, 0.3);
    else if (last && (id === 'multi_shot' || id === 'phantom_volley')) g.fx.ring(t.x, t.y, col, 0.3, 32, tz);
  }
  /** 近戰技能命中時的特效（依技能分別設計） */
  meleeFx(id: string, t: Monster) {
    const g = this.g, p = g.player, tz = -t.bbox.y0 * 0.5;
    const ang = Effects.screenAngle(t.x - p.x, t.y - p.y);
    if (id === 'bash') { // 重擊：兩道交叉的橘金色大刀光＋目標身上的星芒與衝擊環
      g.fx.slash(p.x, p.y, 48, ang, { r: 58, th: 22, span: 2.7, color: '#ff9a20', color2: '#fff6c8', life: 0.3, sgn: 1 });
      g.after(0.05, () => g.fx.slash(p.x, p.y, 44, ang, { r: 46, th: 14, span: 2.2, color: '#ffd040', color2: '#ffffff', life: 0.24, sgn: -1 }));
      g.fx.star(t.x, t.y, tz, '#ffc030', 40, 0.28);
      g.fx.ring(t.x, t.y, '#ffe080', 0.32, 44, tz); g.fx.ring(t.x, t.y, '#ffffff', 0.22, 26, tz);
      g.fx.burst(t.x, t.y, tz, '#ffb040', 22, 150, 'spark', 0.45, 3); g.fx.burst(t.x, t.y, tz, '#fff0b0', 10, 90, 'spark', 0.35, 2);
      g.cam.shake(5, 0.2);
    } else if (id === 'pierce') { // 穿刺突擊：往前的突刺氣流
      for (let i = 0; i < 3; i++) g.after(i * 0.12, () => { g.fx.wave(p.x, p.y, 46, ang, i % 2 ? '#ffffff' : '#bfe8ff', 20, 78, 0.22); g.fx.star(t.x, t.y, tz, '#dff4ff', 20, 0.16); });
      g.fx.burst(t.x, t.y, tz, '#dff4ff', 12, 120, 'spark', 0.35, 2);
    } else if (id === 'holy_smite') { // 聖光斬：金白刀光＋目標腳下的光柱
      g.fx.slash(p.x, p.y, 48, ang, { r: 54, th: 18, span: 2.6, color: '#ffe890', color2: '#ffffff', life: 0.28 });
      g.fx.pillar(t.x, t.y, '#ffe890', 0.5, 14, 110); g.fx.star(t.x, t.y, tz, '#fff0a0', 34, 0.26);
      g.fx.burst(t.x, t.y, tz, '#fff0a0', 16, 120, 'spark', 0.4, 2);
    } else {
      g.fx.slash(p.x, p.y, 46, ang, { r: 48, th: 15, span: 2.4, color: '#ffe080', color2: '#ffffff', life: 0.24 });
      g.fx.star(t.x, t.y, tz, '#ffe080', 26, 0.22);
      g.fx.burst(t.x, t.y, tz, '#ffb040', 16, 120, 'spark', 0.4, 3);
      g.fx.ring(t.x, t.y, '#ffe080', 0.3, 30, tz);
    }
  }
  /** 以自己為中心的範圍技特效；R 是世界座標的半徑（格），畫面上橫向約 45px／格 */
  aoeSelfFx(id: string, R: number) {
    const g = this.g, p = g.player, r = R * 45;
    if (id === 'magnum') { // 爆裂斬：貼地轉一圈的火刀光＋往外擴散的火焰環＋飛濺的火星
      g.fx.slash(p.x, p.y, 26, 0, { r: r * 0.62, th: 20, span: 6.1, flat: 0.5, color: '#ff7a20', color2: '#fff0a0', life: 0.34 });
      g.fx.flameRing(p.x, p.y, r, 0.6);
      g.fx.ring(p.x, p.y, '#ffd040', 0.4, r * 0.8);
      g.fx.burst(p.x, p.y, 10, '#ff7a20', 36, 170, 'spark', 0.6, 3); g.fx.burst(p.x, p.y, 10, '#ffe080', 18, 120, 'spark', 0.5, 2);
      for (let i = 0; i < 14; i++) g.after(0.05 + i * 0.02, () => { const a = g.rnd() * 6.28, d = R * (0.4 + g.rnd() * 0.6); g.fx.glow(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 4, i % 3 ? '#ff9a30' : '#fff0a0', 0.7, 2, 50 + g.rnd() * 40); });
    } else if (id === 'whirlwind') { // 旋風斬：兩道反向的貼地刀光
      g.fx.slash(p.x, p.y, 30, 0, { r: r * 0.7, th: 18, span: 6.1, flat: 0.5, color: '#bfe8ff', color2: '#ffffff', life: 0.32 });
      g.after(0.1, () => g.fx.slash(p.x, p.y, 44, 3.1, { r: r * 0.55, th: 14, span: 6.1, flat: 0.5, color: '#e8f6ff', color2: '#ffffff', life: 0.3, sgn: -1 }));
      g.fx.ring(p.x, p.y, '#dff4ff', 0.4, r * 0.8); g.fx.burst(p.x, p.y, 10, '#dff4ff', 26, 150, 'spark', 0.5, 2);
    } else { // 審判之錘、天罰等：金色衝擊
      g.fx.pillar(p.x, p.y, '#ffe890', 0.6, 20 + R * 3, 150); g.fx.star(p.x, p.y, 10, '#ffe890', 30 + R * 6, 0.3);
      g.fx.ring(p.x, p.y, '#ffd040', 0.5, r); g.fx.ring(p.x, p.y, '#ffffff', 0.35, r * 0.66);
      g.fx.burst(p.x, p.y, 10, '#ffe080', 36, 170, 'spark', 0.6, 3);
      if (id === 'heaven_wrath') for (let i = 0; i < 8; i++) g.after(0.08 + i * 0.05, () => { const a = (i / 8) * 6.28, d = R * 0.7; g.fx.pillar(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, '#fff0a0', 0.45, 10, 130); });
    }
  }
  /** 近戰技能在攻擊動畫命中點結算 */
  resolveMelee() {
    const h = this.meleeHit; this.meleeHit = null; if (!h || h.target.dead) return;
    const s = this.def(h.id), pw = (s.power?.[h.lv - 1] ?? 100) / 100;
    const g = this.g;
    this.meleeFx(h.id, h.target);
    const n = typeof s.hits === 'number' ? s.hits : 1;
    for (let i = 0; i < n; i++) { if (i === 0) this.phys(h.target, pw, s, true); else g.after(i * 0.12, () => { if (!h.target.dead) { g.fx.burst(h.target.x, h.target.y, -h.target.bbox.y0 * 0.5, '#ffe080', 8, 90, 'spark', 0.3, 2); this.phys(h.target, pw, s, true); } }); }
  }
}
