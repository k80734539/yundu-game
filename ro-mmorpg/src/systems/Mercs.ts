import { DB, MERCS, type MercType } from '../data';
import { Merc } from '../entities/Merc';
import { Beast } from '../entities/Beast';
import { Monster } from '../entities/Monster';
import type { Game } from '../core/Game';

/** 傭兵系統：雇用、跟隨、各職能的行為（補血／戰鬥之歌／炸彈）、契約倒數、存檔 */
export class MercSystem {
  merc: Merc | null = null;
  beast: Beast | null = null;
  left = 0;               // 契約剩餘秒數
  private songKey = 0;
  constructor(private g: Game) {}
  get active() { return !!this.merc; }
  cost() { return Math.round(MERCS.costBase + this.g.player.ch.baseLv * MERCS.costPerLv); }
  typeOf(id: string): MercType | undefined { return MERCS.types.find((t) => t.id === id); }

  hire(id: string): string | null {
    const t = this.typeOf(id); if (!t) return '沒有這種傭兵。';
    const g = this.g, ch = g.player.ch, price = this.cost();
    if (this.merc) return '你已經雇用了一位傭兵。';
    if (ch.zeny < price) return `Zeny 不足（需要 ${price.toLocaleString()}）。`;
    ch.zeny -= price; g.ev.emit('stats');
    this.start(t, MERCS.contractSec); g.flags.hiredMerc = true;
    g.msg(`雇用了${t.name}，契約 ${Math.round(MERCS.contractSec / 60)} 分鐘。`, 'quest');
    return null;
  }
  /** 開始（或讀檔後恢復）一份契約 */
  start(t: MercType, sec: number) {
    this.dismiss(true);
    this.left = sec;
    this.spawn(t);
    this.applySong();
  }
  spawn(t: MercType) {
    const g = this.g, p = g.player;
    const pos = g.map.nearestWalkable(p.x + 1.5, p.y + 1, 5) || [Math.floor(p.x), Math.floor(p.y)];
    const m = new Merc(t, pos[0] + 0.5, pos[1] + 0.5);
    m.speed = p.speed * 1.15;
    this.merc = m; g.entities.push(m);
    g.fx.ring(m.x, m.y, '#fff0a0', 0.6, 40);
    if (t.beast) { const b = new Beast(t.beast, m.x + 1, m.y + 0.5); b.speed = p.speed * t.beast.speedMul; this.beast = b; g.entities.push(b); }
  }
  dismiss(silent = false) {
    const g = this.g, m = this.merc; if (!m) return;
    m.remove = true; this.merc = null; this.left = 0;
    const b = this.beast; if (b) { b.remove = true; this.beast = null; }
    g.entities = g.entities.filter((e) => e !== m && e !== b);
    delete g.player.buffs.merc_song; g.player.recalc(); g.ev.emit('stats');
    if (!silent) g.msg(`${m.name}離開了。`, 'sys');
  }
  /** 換地圖後：傭兵重新出現在玩家身旁 */
  onMapLoad() {
    const m = this.merc; if (!m) return;
    const t = m.type; this.merc = null; this.spawn(t);
  }
  /** 樂師：戰鬥之歌（強度依等級；打 MVP 時減弱） */
  applySong() {
    const g = this.g, p = g.player, m = this.merc;
    if (!m || !m.type.song) { if (p.buffs.merc_song) { delete p.buffs.merc_song; p.recalc(); } return; }
    const s = m.type.song, vsBoss = g.monsters.some((x) => x.isMvp && x.aggroOn && !x.dead);
    const v = Math.round((s.base + p.ch.baseLv * s.perLv) * (vsBoss ? MERCS.bossFactor : 1));
    if (p.buffs.merc_song !== v) { p.buffs.merc_song = v; p.recalc(); g.ev.emit('stats'); }
  }

  update(dt: number) {
    const g = this.g, m = this.merc, p = g.player; if (!m) return;
    this.left -= dt;
    if (this.left <= 0) { g.msg(`${m.name}的契約到期了。想續約請到傭兵公會。`, 'quest'); this.dismiss(true); return; }
    m.updateAnim(dt);
    m.cd1 -= dt; m.cd2 -= dt; m.cd3 -= dt; m.pathT -= dt;
    // 跟隨
    const d = Math.hypot(p.x - m.x, p.y - m.y);
    if (d > MERCS.teleportDist) { const pos = g.map.nearestWalkable(p.x, p.y, 4); if (pos) { m.x = m.px = pos[0] + 0.5; m.y = m.py = pos[1] + 0.5; m.path = []; g.fx.ring(m.x, m.y, '#fff0a0', 0.5, 30); } }
    else if (d > MERCS.followDist && m.pathT <= 0) { m.pathT = 0.35; m.setPath(g.pf.find(m.x, m.y, p.x, p.y, 1200, MERCS.followDist - 0.6)); }
    if (m.path.length) { m.stepPath(dt); if (m.state !== 'attack') m.state = 'walk'; }
    else if (m.state === 'walk') m.state = 'idle';
    if (m.atkAnimT >= 0) { m.atkAnimT += dt; if (m.atkAnimT >= m.atkAnimDur) { m.atkAnimT = -1; m.state = 'idle'; } }
    if (p.dead) return;
    const t = m.type;
    if (t.heal) this.priest(m, t.heal, dt);
    if (t.spGive) this.spGive(m, t.spGive);
    if (t.song) { this.songKey += dt; if (this.songKey > 1) { this.songKey = 0; this.applySong(); } }
    if (t.bomb) this.bomb(m, t.bomb);
    if (t.beast && this.beast) this.updateBeast(this.beast, t.beast, dt);
  }
  private updateBeast(b: Beast, c: NonNullable<MercType['beast']>, dt: number) {
    const g = this.g, p = g.player;
    b.updateAnim(dt); b.cd -= dt; b.pathT -= dt;
    let tgt: Monster | null = (p.chase instanceof Monster && !p.chase.dead) ? p.chase : null;
    if (!tgt) tgt = g.monsters.filter((x) => !x.dead && x.aggroOn === p).sort((a, o) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(o.x - b.x, o.y - b.y))[0] || null;
    if (tgt && Math.hypot(tgt.x - p.x, tgt.y - p.y) > 14) tgt = null;
    const goal = tgt || p, d = Math.hypot(goal.x - b.x, goal.y - b.y), stop = tgt ? c.range : MERCS.followDist;
    if (d > MERCS.teleportDist) { const pos = g.map.nearestWalkable(p.x, p.y, 4); if (pos) { b.x = b.px = pos[0] + 0.5; b.y = b.py = pos[1] + 0.5; b.path = []; } }
    else if (d > stop && b.pathT <= 0) { b.pathT = 0.3; b.setPath(g.pf.find(b.x, b.y, goal.x, goal.y, 1200, Math.max(0.6, stop - 0.4))); }
    if (b.path.length && d > stop) { b.stepPath(dt); if (b.state !== 'attack') b.state = 'walk'; }
    else if (d > stop && d < 10 && b.pathT > 0.2) { // 找不到路徑時（目標站在難走的格子）直線靠近
      const nx = b.x + ((goal.x - b.x) / d) * b.speed * dt, ny = b.y + ((goal.y - b.y) / d) * b.speed * dt;
      if (g.map.canWalk(nx, ny)) { b.face(goal.x, goal.y); b.x = nx; b.y = ny; if (b.state !== 'attack') b.state = 'walk'; }
    } else { b.path = []; if (b.state === 'walk') b.state = 'idle'; }
    if (b.atkAnimT >= 0) { b.atkAnimT += dt; if (b.atkAnimT >= b.atkAnimDur) { b.atkAnimT = -1; b.state = 'idle'; } }
    if (tgt && d <= stop + 0.4 && b.cd <= 0) {
      b.cd = c.cd; b.face(tgt.x, tgt.y); b.startAttack(0.35);
      const base = p.d.atkMax * c.atkMul + p.ch.baseLv * c.perLv; let dmg = Math.max(1, Math.round(base * (100 - tgt.def.def) / 100) - tgt.def.vit);
      if (tgt.isMvp) dmg = Math.round(dmg * MERCS.bossFactor);
      g.after(0.15, () => { if (!tgt!.dead) { g.applyDamage(p, tgt!, dmg, 'deal'); g.engage(tgt!); g.fx.burst(tgt!.x, tgt!.y, -tgt!.bbox.y0 * 0.5, '#ffffff', 6, 70, 'spark', 0.3, 2); } });
    }
  }
  private priest(m: Merc, h: NonNullable<MercType['heal']>, dt: number) {
    void dt; const g = this.g, p = g.player, k = p.hp / p.maxHp;
    const heal = (pct: number) => {
      const v = Math.round(p.maxHp * pct + h.flat); p.hp = Math.min(p.maxHp, p.hp + v);
      g.fx.dmg(p.x, p.y, v, 'heal', 120); g.fx.ring(p.x, p.y, '#ffe0e0', 0.5, 36);
      for (let i = 0; i < 12; i++) g.fx.glow(p.x, p.y, 20 + Math.random() * 60, '#ffb0b0', 0.6, 2, 40);
      m.face(p.x, p.y); m.startAttack(0.4);
    };
    if (k < h.bigLow && m.cd2 <= 0) { heal(h.bigPct); m.cd2 = h.bigCd; m.cd1 = Math.max(m.cd1, 2); g.msg(`${m.name}施放了治癒術！`, 'sys'); }
    else if (k < h.low && m.cd1 <= 0) { heal(h.pct); m.cd1 = h.cd; }
  }
  private spGive(m: Merc, s: NonNullable<MercType['spGive']>) {
    const g = this.g, p = g.player; if (p.maxSp <= 0 || m.cd3 > 0 || p.sp / p.maxSp >= s.below) return;
    m.cd3 = s.cd; const v = Math.max(1, Math.round(p.maxSp * s.pct)); p.sp = Math.min(p.maxSp, p.sp + v); g.fx.dmg(p.x, p.y, v, 'sp', 135);
  }
  private bomb(m: Merc, b: NonNullable<MercType['bomb']>) {
    const g = this.g, p = g.player; if (m.cd1 > 0) return;
    let tgt: Monster | null = (p.chase instanceof Monster && !p.chase.dead) ? p.chase : null;
    if (!tgt) tgt = g.monsters.filter((x) => !x.dead && x.aggroOn === p).sort((a, c) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(c.x - m.x, c.y - m.y))[0] || null;
    if (!tgt || Math.hypot(tgt.x - m.x, tgt.y - m.y) > b.range) return;
    m.cd1 = b.cd; m.face(tgt.x, tgt.y); m.startAttack(0.4);
    const cx = tgt.x, cy = tgt.y, base = p.d.atkMax * b.atkMul + p.ch.baseLv * b.perLv;
    g.after(0.35, () => {
      g.fx.ring(cx, cy, '#80ff90', 0.5, b.radius * 45); g.fx.burst(cx, cy, 0, '#a0ff80', 26, 130, 'spark', 0.55, 3); g.cam.shake(3, 0.15); g.audio?.sfx('skill_fire_burst');
      for (const x of g.monstersNear(cx, cy, b.radius)) {
        const eff = x.def.def * (1 - b.defIgnore);
        let dmg = Math.max(1, Math.round(base * (100 - eff) / 100) - x.def.vit);
        if (x.isMvp) dmg = Math.round(dmg * MERCS.bossFactor);
        x.provokeT = Math.max(x.provokeT, b.defDownSec); x.provokeDef = Math.max(x.provokeDef, b.defDown);
        g.applyDamage(p, x, dmg, 'skill'); g.engage(x);
      }
    });
  }

  // ---- 存檔 ----
  toJSON() { return this.merc ? { type: this.merc.type.id, left: Math.round(this.left) } : null; }
  restore(d: { type: string; left: number } | null | undefined) {
    this.dismiss(true);
    const t = d && this.typeOf(d.type); if (!t || !d || d.left <= 0) return;
    this.left = d.left; this.spawn(t); this.applySong();
  }
}
void DB;
