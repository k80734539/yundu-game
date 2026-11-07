import { Renderer } from '../render/Renderer';
import { Camera } from './Camera';
import { Input } from './Input';
import { Loop } from './Loop';
import { Events } from './Events';
import { GameMap, buildMap } from '../systems/MapLoader';
import { Ground } from '../render/Ground';
import { Pathfinder } from '../systems/Pathfinding';
import { buildPropRenders, PropR, DrawList, drawProp, drawPropShadow } from '../render/WorldRenderer';
import { isoX, isoY, unIso } from '../render/iso';
import { Effects } from '../render/Effects';
import { Player } from '../entities/Player';
import { Monster } from '../entities/Monster';
import { Actor } from '../entities/Actor';
import { Entity } from '../entities/Entity';
import { whiteOf } from '../render/SpriteFactory';
import { shadowSprite, makeCanvas } from '../render/pixel';
import { DB } from '../data';
import { UI } from '../ui/UI';
import type { MsgKind } from '../ui/Chat';
import { gainExp } from '../systems/Exp';
import { playerVsMonster, monsterVsPlayer } from '../systems/Combat';
import { StatKey, statCost, MAX_STAT } from '../systems/Stats';
import { cellDist, mulberry32 } from './math';

const K_PROP = 0, K_STRIP = 1, K_ACTOR = 2;

/** 遊戲中樞：持有地圖、實體、系統；固定 60Hz 更新、插值繪製 */
export class Game {
  r: Renderer; cam = new Camera(); input: Input; loop: Loop; ev = new Events();
  fx = new Effects();
  map!: GameMap; ground!: Ground; pf!: Pathfinder; props: PropR[] = [];
  player: Player;
  entities: Entity[] = [];
  monsters: Monster[] = [];
  npcs: Actor[] = [];
  warp: { to: string; tx: number; ty: number; t: number; done: boolean } | null = null;
  fade = 0;
  private darkCv: HTMLCanvasElement | null = null;
  lights: { x: number; y: number; r: number }[] = [];
  hitStop = 0;
  time = 0;
  alpha = 1;
  private dl = new DrawList();
  hover: Entity | null = null;
  clickMark = { x: 0, y: 0, t: 0 };
  rnd = mulberry32(Date.now() & 0xffff);
  holdT = 0;
  ui!: UI;
  audio: any = null;
  inv: any = null;

  constructor(canvas: HTMLCanvasElement, public uiRoot: HTMLElement) {
    this.r = new Renderer(canvas);
    this.input = new Input(canvas, this.r);
    this.player = new Player(0, 0);
    this.ui = new UI(this, uiRoot);
    this.loop = new Loop((dt) => this.update(dt), (a, dt) => this.render(a, dt));
    (window as any).__game = this;
  }

  start(mapId: string, x?: number, y?: number) {
    this.loadMap(mapId, x, y);
    this.loop.start();
    this.msg('歡迎來到《晨曦物語》！點擊地面移動，點擊怪物攻擊。', 'sys');
    this.msg('Alt+A 打開能力值視窗分配點數。', 'sys');
    this.ev.emit('stats');
  }
  msg(text: string, kind: MsgKind = 'sys') { this.ui.msg(text, kind); }
  raiseStat(k: StatKey) {
    const ch = this.player.ch, cost = statCost(ch.stats[k]);
    if (ch.statPts < cost || ch.stats[k] >= MAX_STAT) return;
    ch.statPts -= cost; ch.stats[k]++;
    this.player.recalc();
    this.ui.sfx('click');
    this.ev.emit('stats');
  }
  levelUpFx(kind: 'base' | 'job') {
    const p = this.player;
    for (let i = 0; i < 26; i++) this.fx.glow(p.x, p.y, Math.random() * 30, kind === 'base' ? '#ffe070' : '#d8a0ff', 1.2, 2 + (i % 2), 70 + Math.random() * 60);
    this.fx.ring(p.x, p.y, kind === 'base' ? '#ffe070' : '#d8a0ff', 0.8, 50);
    this.fx.dmg(p.x, p.y, kind === 'base' ? 'LV UP' : 'JOB UP', 'crit', 150);
    this.audio?.sfx('levelup');
  }
  command(cmd: string, args: string[]) {
    const p = this.player;
    switch (cmd) {
      case 'help': this.msg('指令：/where 目前位置　/exp 經驗資訊', 'sys'); break;
      case 'where': this.msg(`${this.map.def.name}（${Math.floor(p.x)}, ${Math.floor(p.y)}）`, 'sys'); break;
      case 'exp': this.msg(`Base ${p.ch.baseExp}　Job ${p.ch.jobExp}`, 'sys'); break;
      default: this.msg(`未知指令：/${cmd}`, 'warn');
    }
  }

  // ------------------------------------------------------------ 地圖
  loadMap(id: string, x?: number, y?: number) {
    const def = DB.map[id];
    this.map = buildMap(def);
    this.ground = new Ground(this.map);
    this.pf = new Pathfinder(this.map);
    this.props = buildPropRenders(this.map);
    this.entities = [this.player];
    this.monsters = [];
    this.fx.clear();
    const p = this.player;
    const start = this.map.nearestWalkable(x ?? def.w / 2, y ?? def.h / 2) || [def.w / 2, def.h / 2];
    p.x = p.px = start[0] + 0.5; p.y = p.py = start[1] + 0.5;
    p.stop(); p.chase = null;
    for (const s of def.spawns || []) for (let i = 0; i < s.n; i++) this.spawnMonster(s.m);
    this.cam.follow(p.x, p.y, 0, true);
    this.ground.warm(this.cam.left(this.r.w) - 64, this.cam.top(this.r.h) - 64, this.r.w + 128, this.r.h + 128);
    this.lights = this.props.filter((r) => r.def.anim === 'flame' || r.p.type === 'lamp' || r.def.anim === 'crystal').map((r) => ({ x: r.fx, y: r.fy - (r.p.type === 'lamp' ? 80 : r.def.anim === 'flame' ? 50 : 20), r: r.def.anim === 'crystal' ? 70 : 130 }));
    this.npcs = [];
    this.ui.onMap();
    const lv = def.level ? `建議等級 Lv${def.level[0]}~${def.level[1]}` : '';
    this.ui.showBanner(def.name, lv);
    this.ev.emit('map', def.id);
  }
  /** 傳送：淡出 → 換地圖 → 淡入 */
  warpTo(to: string, tx: number, ty: number) {
    if (this.warp) return;
    this.warp = { to, tx, ty, t: 0, done: false };
    this.player.stop(); this.player.chase = null;
    this.audio?.sfx('warp');
  }
  updateWarp(dt: number) {
    const w = this.warp;
    if (!w) { if (this.fade > 0) this.fade = Math.max(0, this.fade - dt * 3); return; }
    w.t += dt;
    this.fade = Math.min(1, w.t / 0.25);
    if (w.t >= 0.25 && !w.done) { w.done = true; this.loadMap(w.to, w.tx, w.ty); this.warp = null; this.fade = 1; }
  }
  mvpStatus(_id: string): string { return '—'; }
  checkPortals() {
    const p = this.player;
    for (const po of this.map.def.portals) {
      if (Math.abs(p.x - (po.x + 0.5)) < 0.75 && Math.abs(p.y - (po.y + 0.5)) < 0.75) { this.warpTo(po.to, po.tx, po.ty); return; }
    }
  }
  spawnMonster(id: string, at?: [number, number]): Monster | null {
    const def = DB.monster[id]; if (!def) return null;
    const pos = at || this.map.randomWalkable(this.rnd);
    if (!pos) return null;
    const m = new Monster(def, pos[0] + 0.5, pos[1] + 0.5);
    this.entities.push(m); this.monsters.push(m);
    return m;
  }

  // ------------------------------------------------------------ 座標
  screenToWorld(sx: number, sy: number) {
    const L = this.cam.left(this.r.w), T = this.cam.top(this.r.h);
    return unIso(sx + L, sy + T);
  }
  /** 滑鼠下的實體（依繪製順序由前到後） */
  pick(sx: number, sy: number): Entity | null {
    const L = this.cam.left(this.r.w), T = this.cam.top(this.r.h);
    let best: Entity | null = null, bd = -1e9;
    for (const e of this.entities) {
      if (!(e instanceof Actor) || e === this.player || e.dead) continue;
      const b = e.bbox;
      const fx = isoX(e.x, e.y) - L, fy = isoY(e.x, e.y) - T;
      const pad = 4;
      if (sx >= fx + b.x0 - pad && sx <= fx + b.x1 + pad && sy >= fy + b.y0 - pad && sy <= fy + b.y1 + pad) {
        if (e.depth > bd) { bd = e.depth; best = e; }
      }
    }
    return best;
  }

  // ------------------------------------------------------------ 更新
  update(dt: number) {
    this.updateWarp(dt);
    if (this.warp) return;
    this.handleInput(dt);
    if (this.hitStop > 0) { this.hitStop -= dt; this.cam.updateShake(dt); return; } // 打擊停頓：邏輯暫停
    this.time += dt;
    for (const e of this.entities) e.savePrev();
    this.updatePlayer(dt);
    if (!this.player.dead) this.checkPortals();
    for (const m of this.monsters) this.updateMonster(m, dt);
    // 移除淡出完成的實體
    if (this.entities.some((e) => e.remove)) {
      this.entities = this.entities.filter((e) => !e.remove);
      this.monsters = this.monsters.filter((m) => !m.remove);
    }
    this.fx.update(dt);
    this.cam.updateShake(dt);
    if (this.clickMark.t > 0) this.clickMark.t -= dt;
    this.ui.update(dt);
  }

  handleInput(dt: number) {
    const w = this.input.takeWheel();
    if (w) this.r.setZoom(this.r.zoomBias - w);
    for (const c of this.input.takeClicks()) {
      if (c.button !== 0) continue;
      this.onClick(c.x, c.y, false);
    }
    // 按住滑鼠持續往游標方向走（RO 操作）
    if (this.input.down) {
      this.holdT += dt;
      if (this.holdT > 0.25 && !this.player.chase) { this.holdT = 0.05; this.onClick(this.input.mx, this.input.my, true); }
    } else this.holdT = 0;
    this.hover = this.input.over ? this.pick(this.input.mx, this.input.my) : null;
    this.r.canvas.style.cursor = this.hover instanceof Monster ? 'crosshair' : this.hover ? 'pointer' : 'default';
    for (const k of this.input.takeKeys()) this.ui.onKey(k);
  }
  onClick(sx: number, sy: number, hold: boolean) {
    const p = this.player;
    if (p.dead) return;
    const e = hold ? null : this.pick(sx, sy);
    if (e instanceof Monster) { p.chase = e; p.repathT = 0; return; }
    p.chase = null;
    const w = this.screenToWorld(sx, sy);
    this.walkTo(w.x, w.y, !hold);
  }
  walkTo(wx: number, wy: number, mark = true) {
    const p = this.player;
    let tx = Math.floor(wx), ty = Math.floor(wy);
    if (!this.map.canWalk(tx, ty)) { const n = this.map.nearestWalkable(tx, ty, 4); if (!n) return; [tx, ty] = n; }
    const path = this.pf.find(p.x, p.y, tx, ty);
    if (path) {
      if (path.length) { const last = path[path.length - 1]; if (Math.floor(last[0]) === tx && Math.floor(last[1]) === ty && Math.abs(wx - tx - 0.5) < 0.5) path[path.length - 1] = [tx + 0.5, ty + 0.5]; }
      p.setPath(path);
      if (mark) { this.clickMark.x = tx + 0.5; this.clickMark.y = ty + 0.5; this.clickMark.t = 0.6; }
    }
  }

  attackRange(a: Actor) { return a instanceof Monster ? a.def.range : this.player.job.range; }
  attackDelay(a: Actor) { return a instanceof Monster ? a.def.adelay / 1000 : this.player.d.delay; }

  updatePlayer(dt: number) {
    const p = this.player;
    p.updateAnim(dt);
    if (p.dead) return;
    const t = p.chase;
    if (t && (t.dead || t.remove)) p.chase = null;
    if (p.chase) {
      const tg = p.chase;
      const range = this.attackRange(p);
      if (cellDist(p.x, p.y, tg.x, tg.y) <= range && p.atkAnimT < 0) {
        p.path = [];
        if (p.atkCd <= 0) { p.face(tg.x, tg.y); p.target = tg; p.startAttack(Math.min(0.45, this.attackDelay(p) * 0.8)); p.atkCd = this.attackDelay(p); }
      } else if (p.atkAnimT < 0) {
        p.repathT -= dt;
        if (p.repathT <= 0 || !p.path.length) { p.repathT = 0.3; p.setPath(this.pf.find(p.x, p.y, tg.x, tg.y, 3000, range)); }
      }
    }
    if (p.tickAttack(dt) && p.target) this.resolveAttack(p, p.target);
    if (p.atkAnimT < 0) {
      if (p.stepPath(dt)) p.state = 'walk';
      else if (p.state === 'walk') p.state = 'idle';
    }
  }

  updateMonster(m: Monster, dt: number) {
    m.updateAnim(dt);
    if (m.dead) { m.deadT += dt; if (m.deadT > 1.0) m.remove = true; return; }
    if (m.tickAttack(dt) && m.target) this.resolveAttack(m, m.target);
    const p = this.player;
    if (m.aggroOn && (m.aggroOn.dead)) { m.aggroOn = null; m.ai = 'idle'; }
    if (m.aggroOn) {
      const range = this.attackRange(m);
      if (cellDist(m.x, m.y, p.x, p.y) <= range) {
        m.path = [];
        if (m.atkCd <= 0 && m.atkAnimT < 0) { m.face(p.x, p.y); m.target = p; m.startAttack(Math.min(0.5, this.attackDelay(m) * 0.6)); m.atkCd = this.attackDelay(m); }
      } else if (m.atkAnimT < 0) {
        m.repathT -= dt;
        if (m.repathT <= 0) { m.repathT = 0.4; m.setPath(this.pf.find(m.x, m.y, p.x, p.y, 1500, range)); }
      }
    } else {
      m.aiT -= dt;
      if (m.aiT <= 0 && !m.path.length) {
        m.aiT = 2 + this.rnd() * 4;
        const tx = Math.floor(m.homeX + (this.rnd() * 2 - 1) * 5), ty = Math.floor(m.homeY + (this.rnd() * 2 - 1) * 5);
        if (this.map.canWalk(tx, ty)) m.setPath(this.pf.find(m.x, m.y, tx, ty, 400));
      }
    }
    if (m.atkAnimT < 0) {
      const sp = m.speed; if (!m.aggroOn) m.speed = sp * 0.5;
      if (m.stepPath(dt)) m.state = 'walk'; else if (m.state === 'walk') m.state = 'idle';
      m.speed = sp;
    }
  }

  /** 攻擊命中點：RO 式命中／爆擊／防禦公式 */
  resolveAttack(a: Actor, d: Actor) {
    if (d.dead) return;
    const h = -d.bbox.y0 + 10;
    if (a === this.player && d instanceof Monster) {
      const r = playerVsMonster(this.player.d, d.def, this.rnd);
      if (r.kind === 'miss') { this.fx.dmg(d.x, d.y, 'MISS', 'miss', h); d.aggroOn = a; return; }
      this.applyDamage(a, d, r.dmg, r.kind);
    } else if (a instanceof Monster && d === this.player) {
      const r = monsterVsPlayer(a.def, this.player.d, this.rnd);
      if (r.kind === 'miss') { this.fx.dmg(d.x, d.y, r.lucky ? 'LUCKY' : 'MISS', 'miss', h); return; }
      this.applyDamage(a, d, r.dmg, 'take');
    }
  }
  applyDamage(a: Actor | null, d: Actor, dmg: number, kind: 'deal' | 'take' | 'crit' | 'skill') {
    const h = -d.bbox.y0 + 10;
    d.hp -= dmg;
    d.flashT = 0.12; d.hurtT = 0.15;
    this.fx.dmg(d.x, d.y, dmg, d === this.player ? 'take' : kind, h);
    this.fx.burst(d.x, d.y, -d.bbox.y0 * 0.5, kind === 'crit' ? '#ffe070' : '#ffffff', kind === 'crit' ? 14 : 7, kind === 'crit' ? 110 : 70);
    // 打擊停頓與畫面震動
    if (a === this.player || d === this.player) this.hitStop = Math.max(this.hitStop, kind === 'crit' || kind === 'skill' ? 0.09 : 0.045);
    if (kind === 'crit' || kind === 'skill') this.cam.shake(5, 0.25); else if (d === this.player) this.cam.shake(3, 0.18); else this.cam.shake(1.5, 0.1);
    if (d instanceof Monster && a) { d.aggroOn = a; d.ai = 'chase'; }
    if (d.hp <= 0) this.kill(d, a);
  }
  kill(d: Actor, by: Actor | null) {
    d.hp = 0; d.state = 'dead'; d.deadT = 0; d.path = []; d.atkAnimT = -1;
    if (d === this.player) { this.onPlayerDeath(); return; }
    if (d instanceof Monster) {
      if (this.player.chase === d) this.player.chase = null;
      const id = d.def.id;
      setTimeout(() => this.spawnMonster(id), 5000);
      if (by === this.player) gainExp(this, d.def.exp, d.def.jexp);
    }
  }

  /** 玩家死亡（階段 8 會改成回城＋扣經驗） */
  onPlayerDeath() {
    const p = this.player;
    p.chase = null;
    for (const m of this.monsters) if (m.aggroOn === p) { m.aggroOn = null; m.ai = 'idle'; }
    this.msg('你倒下了……3 秒後復活。', 'warn');
    setTimeout(() => { p.state = 'idle'; p.recalc(true); p.deadT = 0; }, 3000);
  }

  // ------------------------------------------------------------ 繪製
  render(alpha: number, dt: number) {
    this.alpha = alpha;
    const r = this.r, c = r.ctx;
    r.begin();
    const p = this.player;
    this.cam.follow(p.ix(alpha), p.iy(alpha), dt);
    this.cam.anchor(isoX(p.ix(alpha), p.iy(alpha)), isoY(p.ix(alpha), p.iy(alpha)));
    const W = r.w, H = r.h, L = this.cam.left(W), T = this.cam.top(H);
    c.fillStyle = '#0c0a12'; c.fillRect(0, 0, W, H);
    this.ground.draw(c, L, T, W, H);
    // 點擊目的地標記
    if (this.clickMark.t > 0) {
      const k = this.clickMark.t / 0.6, x = Math.round(isoX(this.clickMark.x, this.clickMark.y) - L), y = Math.round(isoY(this.clickMark.x, this.clickMark.y) - T);
      c.globalAlpha = k; c.strokeStyle = '#fff6a0'; c.lineWidth = 2;
      const s = 10 + (1 - k) * 8;
      c.beginPath(); c.moveTo(x, y - s * 0.5); c.lineTo(x + s, y); c.lineTo(x, y + s * 0.5); c.lineTo(x - s, y); c.closePath(); c.stroke(); c.globalAlpha = 1;
    }
    this.drawPortals(c, L, T);
    // 可見範圍（等角像素）
    const mx0 = L - 160, mx1 = L + W + 160, my0 = T - 60, my1 = T + H + 240;
    const dl = this.dl; dl.reset();
    // 物件淡出：玩家在後方且重疊
    const pxs = isoX(p.x, p.y), pys = isoY(p.x, p.y);
    for (const pr of this.props) {
      const w = pr.spr.c.width, h = pr.spr.c.height;
      if (pr.dx + w < mx0 || pr.dx > mx1 || pr.dy + h < my0 || pr.dy > my1) continue;
      if (pr.def.tall) {
        const pp = pr.p;
        const behind = pr.strips ? !(p.x >= pp.x + pp.w || p.y >= pp.y + pp.h) : p.x + p.y < pr.depth;
        const overlap = pxs + 22 > pr.dx && pxs - 22 < pr.dx + w && pys > pr.dy && pys - 120 < pr.dy + h - 8;
        const target = behind && overlap ? 0.42 : 1;
        pr.alpha += (target - pr.alpha) * Math.min(1, dt * 10);
      }
      drawPropShadow(c, pr, L, T);
      if (pr.strips) for (let i = 0; i < pr.strips.length; i++) dl.add(pr.strips[i].key, K_STRIP, pr, i);
      else dl.add(pr.depth, K_PROP, pr);
    }
    for (const e of this.entities) {
      if (!(e instanceof Actor)) continue;
      const ex = isoX(e.ix(alpha), e.iy(alpha)), ey = isoY(e.ix(alpha), e.iy(alpha));
      if (ex < mx0 || ex > mx1 || ey < my0 || ey > my1 + 100) continue;
      // 接地陰影
      const b = e.bbox; const rx = Math.max(10, Math.min(48, Math.round((b.x1 - b.x0) * 0.36)));
      const sh = shadowSprite(rx, Math.round(rx * 0.42));
      c.globalAlpha = e.dead ? Math.max(0, 1 - e.deadT) : 1;
      c.drawImage(sh, Math.round(ex - L - sh.width / 2), Math.round(ey - T - sh.height / 2));
      c.globalAlpha = 1;
      dl.add(e.iy(alpha) + e.ix(alpha), K_ACTOR, e);
    }
    dl.sort();
    for (let i = 0; i < dl.n; i++) {
      const d = dl.items[i];
      if (d.kind === K_ACTOR) this.drawActor(c, d.ref, L, T);
      else { drawProp(c, d.ref, L, T, d.kind === K_STRIP ? d.aux : -1); if (d.ref.def.anim && d.kind === K_PROP) this.drawPropAnim(c, d.ref, L, T); }
    }
    this.fx.drawParticles(c, L, T);
    // 頭上資訊（血條、名稱）
    for (const e of this.entities) if (e instanceof Actor) this.drawOverhead(c, e, L, T);
    this.fx.drawTexts(c, L, T);
    this.drawPortalLabels(c, L, T);
    this.drawDarkness(c, L, T, W, H);
    if (this.map.def.tint) { c.fillStyle = this.map.def.tint; c.fillRect(0, 0, W, H); }
    if (this.fade > 0) { c.fillStyle = `rgba(0,0,0,${this.fade})`; c.fillRect(0, 0, W, H); }
  }
  drawPortals(c: CanvasRenderingContext2D, L: number, T: number) {
    const t = this.time;
    for (const po of this.map.def.portals) {
      const x = Math.round(isoX(po.x + 0.5, po.y + 0.5) - L), y = Math.round(isoY(po.x + 0.5, po.y + 0.5) - T);
      if (x < -80 || y < -80 || x > this.r.w + 80 || y > this.r.h + 80) continue;
      for (let i = 0; i < 3; i++) {
        const k = ((t * 0.8 + i / 3) % 1);
        c.globalAlpha = 1 - k; c.strokeStyle = i === 1 ? '#a0e8ff' : '#60a8ff'; c.lineWidth = 2;
        c.beginPath(); c.ellipse(x, y, 8 + k * 26, (8 + k * 26) * 0.5, 0, 0, Math.PI * 2); c.stroke();
      }
      c.globalAlpha = 0.35; c.fillStyle = '#80c8ff'; c.beginPath(); c.ellipse(x, y, 18, 9, 0, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 0.18; c.fillRect(x - 10, y - 70, 20, 70);
      c.globalAlpha = 1;
      if (Math.random() < 0.3) this.fx.glow(po.x + 0.5, po.y + 0.5, 0, Math.random() < 0.5 ? '#c8f0ff' : '#70b8ff', 1.0, 1 + (Math.random() < 0.3 ? 1 : 0), 50 + Math.random() * 40);
    }
  }
  drawPortalLabels(c: CanvasRenderingContext2D, L: number, T: number) {
    const plv = this.player.ch.baseLv;
    for (const po of this.map.def.portals) {
      const x = Math.round(isoX(po.x + 0.5, po.y + 0.5) - L), y = Math.round(isoY(po.x + 0.5, po.y + 0.5) - T);
      if (x < -120 || y < -80 || x > this.r.w + 120 || y > this.r.h + 80) continue;
      const d = DB.map[po.to]; if (!d) continue;
      this.label(c, '→ ' + d.name, x, y - 92, '#ffffff');
      if (d.level) this.label(c, `建議 Lv${d.level[0]}~${d.level[1]}`, x, y - 78, plv < d.level[0] - 2 ? '#ff7a6a' : plv > d.level[1] + 3 ? '#c0c0c0' : '#8aff8a');
    }
  }
  drawPropAnim(c: CanvasRenderingContext2D, r: PropR, L: number, T: number) {
    const x = Math.round(r.fx - L), y = Math.round(r.fy - T), t = this.time;
    if (r.def.anim === 'flame') {
      const f = Math.floor(t * 10 + r.fx) % 3;
      c.fillStyle = '#ff7a20'; c.fillRect(x - 4, y - 54 - f, 8, 9 + f);
      c.fillStyle = '#ffd040'; c.fillRect(x - 2, y - 50 - f, 4, 6 + f);
      c.fillStyle = '#fff8c0'; c.fillRect(x - 1, y - 47, 2, 3);
      if (Math.random() < 0.08) this.fx.glow(r.p.x + 0.5, r.p.y + 0.5, 56, '#ffb040', 0.8, 1, 30);
    } else if (r.def.anim === 'crystal') {
      if (Math.floor(t * 2 + r.fx) % 7 === 0) { c.fillStyle = '#ffffff'; c.fillRect(x - 1, y - 40, 2, 2); c.fillRect(x - 3, y - 39, 6, 1); }
    } else if (r.def.anim === 'water') {
      const f = Math.floor(t * 8) % 4;
      c.fillStyle = '#d8f0ff'; c.fillRect(x - 2, y - 100 + f * 2, 4, 3); c.fillRect(x - 10 - f, y - 82 + f * 3, 2, 2); c.fillRect(x + 8 + f, y - 82 + f * 3, 2, 2);
      c.fillRect(x - 30 + f * 6, y - 26, 3, 1); c.fillRect(x + 20 - f * 5, y - 22, 3, 1);
    }
  }
  /** 地城黑暗：1/4 解析度的遮罩挖出光圈，放大後呈像素階梯感 */
  drawDarkness(c: CanvasRenderingContext2D, L: number, T: number, W: number, H: number) {
    const dark = this.map.def.dark; if (!dark) return;
    const q = 4, w = Math.ceil(W / q), h = Math.ceil(H / q);
    if (!this.darkCv || this.darkCv.width !== w || this.darkCv.height !== h) this.darkCv = makeCanvas(w, h);
    const d = this.darkCv.getContext('2d')!;
    d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, w, h);
    d.fillStyle = `rgba(6,4,14,${dark})`; d.fillRect(0, 0, w, h);
    d.globalCompositeOperation = 'destination-out';
    const hole = (x: number, y: number, r: number, a = 1) => {
      const g = d.createRadialGradient(x / q, y / q, 0, x / q, y / q, r / q);
      g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.55, `rgba(0,0,0,${a * 0.7})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g; d.fillRect((x - r) / q, (y - r) / q, (r * 2) / q, (r * 2) / q);
    };
    const p = this.player, a = this.alpha;
    hole(isoX(p.ix(a), p.iy(a)) - L, isoY(p.ix(a), p.iy(a)) - T - 50, 260);
    const fl = Math.sin(this.time * 9) * 6;
    for (const l of this.lights) { const x = l.x - L, y = l.y - T; if (x > -200 && y > -200 && x < W + 200 && y < H + 200) hole(x, y, l.r + fl, 0.9); }
    for (const po of this.map.def.portals) hole(isoX(po.x + 0.5, po.y + 0.5) - L, isoY(po.x + 0.5, po.y + 0.5) - T, 120, 0.9);
    c.imageSmoothingEnabled = false;
    c.drawImage(this.darkCv, 0, 0, w * q, h * q);
  }

  drawActor(c: CanvasRenderingContext2D, e: Actor, L: number, T: number) {
    const s = e.sheet, a = this.alpha;
    const f = e.frameIndex();
    let x = Math.round(isoX(e.ix(a), e.iy(a)) - L - s.ax), y = Math.round(isoY(e.ix(a), e.iy(a)) - T - s.ay);
    if (e.hurtT > 0 && !e.dead) { x += e.dir === 1 ? 2 : e.dir === 2 ? -2 : 0; y += e.dir === 3 ? 1 : e.dir === 0 ? -1 : 0; }
    const sx = f * s.fw, sy = e.dir * s.fh;
    if (e.dead) c.globalAlpha = e === this.player ? 0.45 : Math.max(0, 1 - e.deadT);
    c.drawImage(s.c, sx, sy, s.fw, s.fh, x, y, s.fw, s.fh);
    if (e.flashT > 0) { // 受擊閃白
      c.globalAlpha = Math.min(1, e.flashT / 0.12) * 0.85 * (e.dead ? Math.max(0, 1 - e.deadT) : 1);
      c.drawImage(whiteOf(s), sx, sy, s.fw, s.fh, x, y, s.fw, s.fh);
    }
    c.globalAlpha = 1;
    if (this.hover === e && !e.dead) { // 滑鼠移上：輕微描亮
      c.globalAlpha = 0.18; c.drawImage(whiteOf(s), sx, sy, s.fw, s.fh, x, y, s.fw, s.fh); c.globalAlpha = 1;
    }
  }
  drawOverhead(c: CanvasRenderingContext2D, e: Actor, L: number, T: number) {
    if (e.dead) return;
    const a = this.alpha;
    const x = Math.round(isoX(e.ix(a), e.iy(a)) - L), y = Math.round(isoY(e.ix(a), e.iy(a)) - T);
    const showBar = e === this.player || e.hp < e.maxHp;
    if (showBar) { // RO 式：血條在腳下
      const w = e === this.player ? 60 : 44, bx = x - w / 2, by = y + 8;
      c.fillStyle = '#1a1020'; c.fillRect(bx - 1, by - 1, w + 2, e === this.player ? 8 : 5);
      c.fillStyle = '#402020'; c.fillRect(bx, by, w, 3);
      const k = Math.max(0, e.hp / e.maxHp);
      c.fillStyle = k > 0.25 ? '#3ce060' : '#ff5040'; c.fillRect(bx, by, Math.round(w * k), 3);
      if (e === this.player && e.maxSp > 0) { c.fillStyle = '#202040'; c.fillRect(bx, by + 3, w, 3); c.fillStyle = '#4090ff'; c.fillRect(bx, by + 3, Math.round(w * Math.max(0, e.sp / e.maxSp)), 3); }
    }
    if (this.hover === e) this.label(c, e.name, x, y + 22, e instanceof Monster ? '#ffffff' : '#a0e0ff');
  }
  label(c: CanvasRenderingContext2D, text: string, x: number, y: number, color = '#fff') {
    c.font = '12px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'top';
    c.fillStyle = '#000'; for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) c.fillText(text, x + ox, y + oy);
    c.fillStyle = color; c.fillText(text, x, y);
  }
}
