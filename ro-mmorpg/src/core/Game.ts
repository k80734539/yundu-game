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
import { whiteOf, tintOf } from '../render/SpriteFactory';
import { shadowSprite, makeCanvas } from '../render/pixel';
import { DB, QUESTS, JOBS } from '../data';
import { UI } from '../ui/UI';
import type { MsgKind } from '../ui/Chat';
import { gainExp } from '../systems/Exp';
import { playerVsMonster, monsterVsPlayer } from '../systems/Combat';
import { StatKey, statCost, MAX_STAT } from '../systems/Stats';
import { updateAI, onHurt, giveUp } from '../systems/AI';
import { Telegraph, bossDamage, hasBossFight, fightTime, fmtTime } from '../systems/BossFight';
import { BOSSFIGHT } from '../data';
import { Spawner } from '../systems/Spawner';
import { Inventory } from '../systems/Inventory';
import { GroundItem } from '../entities/GroundItem';
import { iconCanvas } from '../render/IconArt';
import { MercSystem } from '../systems/Mercs';
import { Npc } from '../entities/Npc';
import { Merc } from '../entities/Merc';
import type { HotSlot } from '../ui/Hotbar';
import type { PropInst } from '../systems/MapLoader';
import { Quests } from '../systems/Quests';
import type { Dialog } from '../ui/Dialog';
import { textImage } from '../render/Font';
import { SkillSystem, ELEM } from '../systems/Skills';
import { Loot, RAR, RANK, rarityOf, rollGear, isGear } from '../systems/Loot';
import { LOOT } from '../data';
import { Projectile } from '../entities/Projectile';
import { engage as aiEngage } from '../systems/AI';
import { magicVsMonster } from '../systems/Combat';
import { Save } from '../systems/Save';
import debugJson from '../../data/debug.json';
import { Audio } from '../systems/Audio';
import { Tutorial } from '../systems/Tutorial';
import { refineRate, refineMaterial, refineFee } from '../systems/Refine';
import { expNeed, jobExpNeed } from '../systems/Stats';
import { cellDist, mulberry32 } from './math';

const K_PROP = 0, K_STRIP = 1, K_ACTOR = 2, K_ITEM = 3, K_PROJ = 4;

/** 遊戲中樞：持有地圖、實體、系統；固定 60Hz 更新、插值繪製 */
export class Game {
  r: Renderer; cam = new Camera(); input: Input; loop: Loop; ev = new Events();
  fx = new Effects();
  map!: GameMap; ground!: Ground; pf!: Pathfinder; props: PropR[] = [];
  player: Player;
  entities: Entity[] = [];
  monsters: Monster[] = [];
  npcs: Npc[] = [];
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
  audio: Audio = new Audio();
  save!: Save;
  inv: Inventory;
  spawner: Spawner;
  items: GroundItem[] = [];
  pickTarget: GroundItem | null = null;
  telegraphs: Telegraph[] = [];
  perf: 'smooth' | 'auto' | 'saver' = 'smooth'; private calmT = 0;
  slowT = 0; slowScale = 1;   // 擊敗 Boss 的慢動作
  safeUntil = 0;
  hotbar: (HotSlot | null)[] = [{ type: 'item', id: 'red_potion' }, null, null, null, null, null, null, null, { type: 'item', id: 'butterfly_wing' }];
  skillCd: Record<string, number> = {}; skillCdMax: Record<string, number> = {};
  savePoint = { map: 'aurora', x: 29, y: 27 };
  talkTarget: Npc | null = null;
  quests: Quests;
  flags: Record<string, any> = { visited: {} };
  skills: SkillSystem;
  mercs: MercSystem;
  loot: Loot;
  buffT: Record<string, number> = {}; buffMax: Record<string, number> = {};
  projectiles: Projectile[] = [];
  timers: { t: number; fn: () => void }[] = [];
  shout: { text: string; t: number } | null = null;
  combatT = 0;            // 距離上次戰鬥的秒數（脫離戰鬥回血）
  regenT = 0; spRegenT = 0;
  inTitle = true;
  tutorial: Tutorial;
  showFps = false;
  private propGrid = new Map<number, PropR[]>();
  private frameId = 0;
  private seen = new WeakMap<PropR, number>();

  constructor(canvas: HTMLCanvasElement, public uiRoot: HTMLElement) {
    this.r = new Renderer(canvas);
    this.input = new Input(canvas, this.r);
    this.player = new Player(0, 0);
    this.inv = new Inventory(() => Math.floor(this.player.d.weight / 10), () => { this.player.recalc(); this.player.refreshLook(); this.ev.emit('inv'); this.ev.emit('stats'); });
    this.player.equipsFn = () => this.inv.equipInfos();
    this.spawner = new Spawner(this);
    this.quests = new Quests(this);
    this.skills = new SkillSystem(this);
    this.mercs = new MercSystem(this);
    this.loot = new Loot(this);
    this.save = new Save(this);
    this.tutorial = new Tutorial(this);
    window.addEventListener('beforeunload', () => { if (!this.inTitle) this.save.save(); });
    this.ev.on('kill', (id: string) => this.quests.onKill(id));
    this.ev.on('pickup', (id: string) => this.quests.onPickup(id));
    this.spawner.init();
    this.ui = new UI(this, uiRoot);
    this.newGameItems();
    try { const v = localStorage.getItem('rom.perf'); this.perf = v === 'smooth' || v === 'auto' || v === 'saver' ? v : (window.matchMedia?.('(pointer: coarse)').matches ? 'auto' : 'smooth'); } catch { /* */ }
    try { const v = localStorage.getItem('rom.res'); this.r.low = v === 'low' || (v !== 'high' && !!window.matchMedia?.('(pointer: coarse)').matches); if (this.r.low) this.r.resize(); } catch { /* */ }
    this.loop = new Loop((dt) => this.update(dt), (a, dt) => this.render(a, dt));
    (window as any).__game = this; (window as any).__DB = DB; (window as any).__LOOT = LOOT; (window as any).__GI = GroundItem; (window as any).__BOSSCFG = BOSSFIGHT;
  }

  /** 開機：先載入城鎮當標題背景 */
  boot() {
    this.loadMap('aurora', 29, 27); this.loop.start();
    this.save.onCloudChange = () => { this.ui.refreshTitle(); this.ui.wins.options?.render(); };
    void this.save.initCloud();
    setTimeout(() => { if (this.save.cloud.state === 'pending') { this.save.cloud.state = 'off'; this.save.cloud.err = '連線逾時'; this.ui.refreshTitle(); } }, 8000);
  }
  /** 標題畫面按下開始：continue=true 讀檔，否則新角色 */
  begin(cont: boolean, name = '冒險者', slot = 1) {
    this.inTitle = false;
    this.save.slot = slot;
    if (cont) {
      const d = this.save.read();
      if (d) {
        const pos = this.save.apply(d);
        this.mercs.dismiss(true);
        this.loadMap(pos.map, pos.x, pos.y);
        this.mercs.restore(this.save.pendingMerc); this.save.pendingMerc = null;
        this.msg(`歡迎回來，${this.player.ch.name}！${this.save.loadedFrom === 'backup' ? '（主存檔損壞，已從備份還原）' : ''}`, 'sys');
      }
    } else {
      this.save.clearTrash(slot);
      this.mercs.dismiss(true);
      this.player.ch.name = name || '冒險者';
      this.newGameItems();
      this.spawner.init();
      this.loadMap('aurora', 29, 27);
      this.msg(`歡迎來到《晨曦物語》，${this.player.ch.name}！點擊地面移動，點擊怪物攻擊。`, 'sys');
      this.msg('先去找噴水池旁頭上有「!」的導覽員艾莉談談吧。', 'quest');
      this.save.save();
    }
    this.spawner.announceAlive();
    if (this.debug.infiniteRedPotion) { this.topUpRedPotion(); this.msg('【測試模式】紅色藥水無限（輸入 /infpotion 可關閉）', 'sys'); }
    this.ev.emit('stats'); this.ev.emit('inv'); this.ev.emit('quest');
    this.ui.tutorialHint();
  }
  start(mapId: string, x?: number, y?: number) { this.inTitle = false; this.loadMap(mapId, x, y); this.loop.start(); this.ev.emit('stats'); }
  msg(text: string, kind: MsgKind = 'sys') { this.ui.msg(text, kind); }
  newGameItems() {
    this.inv.items = []; this.inv.equip = {};
    this.inv.add('knife'); this.inv.add('cotton_shirt'); this.inv.add('red_potion', 5); this.inv.add('butterfly_wing', 1); this.inv.add('apple', 3);
    for (const it of [...this.inv.items]) if (it.id === 'knife' || it.id === 'cotton_shirt') this.inv.equipItem(it.uid, 'novice', 1);
    this.player.recalc(true);
  }
  // ------------------------------------------------------------ 道具
  useOrEquip(uid: number) {
    const it = this.inv.get(uid); if (!it) return;
    const d = DB.item[it.id];
    if (d.type === 'use') this.useItem(uid);
    else if (d.type === 'weapon' || d.type === 'armor') {
      const slot = this.inv.slotOf(uid);
      if (slot) { this.inv.unequip(slot); this.ui.sfx('equip'); return; }
      const hadShield = this.inv.equip.shield !== undefined, hadWeapon = this.inv.equip.weapon !== undefined;
      const err = this.inv.equipItem(uid, this.player.ch.job, this.player.ch.baseLv);
      if (err) this.msg(err, 'warn'); else {
        this.msg(`裝備了 ${this.inv.displayName(it)}`, 'item'); this.ui.sfx('equip');
        if (hadShield && this.inv.equip.shield === undefined) this.msg('弓是雙手武器，已自動卸下盾牌。', 'warn');
        if (hadWeapon && this.inv.equip.weapon === undefined) this.msg('弓是雙手武器，裝上盾牌會卸下弓；沒有武器時攻擊力會大幅下降。', 'warn');
      }
    } else if (d.type === 'card') this.ui.open('cards');
  }
  useItem(uid: number): boolean {
    const it = this.inv.get(uid); if (!it) return false;
    const d = DB.item[it.id], p = this.player;
    if (d.type !== 'use' || p.dead) return false;
    if (d.heal || d.healSp) {
      if (d.heal) { const v = Math.round(d.heal * (0.9 + this.rnd() * 0.2) * (1 + p.d.total.vit / 100)); p.hp = Math.min(p.maxHp, p.hp + v); this.fx.dmg(p.x, p.y, v, 'heal', 120); }
      if (d.healSp) { const v = Math.round(d.healSp * (1 + p.d.total.int / 100)); p.sp = Math.min(p.maxSp, p.sp + v); this.fx.dmg(p.x, p.y, v, 'sp', 135); }
      for (let i = 0; i < 8; i++) this.fx.glow(p.x, p.y, 20 + Math.random() * 60, d.healSp ? '#80b8ff' : '#90ff90', 0.6, 2, 40);
      this.audio.sfx('potion');
    } else if (d.buff === 'flywing') {
      const pos = this.map.randomWalkable(this.rnd); if (!pos) return false;
      this.teleport(pos[0], pos[1]);
    } else if (d.buff === 'butterfly') {
      this.warpTo(this.savePoint.map, this.savePoint.x, this.savePoint.y);
    }
    if (d.id === 'red_potion' && this.debug.infiniteRedPotion) this.topUpRedPotion(); // 測試用：紅色藥水不會用完
    else this.inv.remove(uid, 1);
    return true;
  }
  debug = { ...debugJson } as { infiniteRedPotion: boolean; redPotionStock: number };
  /** 無限紅水：補到庫存數量，並確保快捷列 F1 有紅色藥水 */
  topUpRedPotion() {
    if (!this.debug.infiniteRedPotion) return;
    const n = this.debug.redPotionStock - this.inv.count('red_potion');
    if (n > 0) this.inv.add('red_potion', n);
    if (!this.hotbar[0]) { this.hotbar[0] = { type: 'item', id: 'red_potion' }; this.ui.hot.render(); }
  }
  teleport(x: number, y: number) {
    const p = this.player;
    this.fx.ring(p.x, p.y, '#a0e0ff', 0.5, 40);
    p.x = p.px = x + 0.5; p.y = p.py = y + 0.5; p.stop(); p.chase = null;
    for (const m of this.monsters) if (m.aggroOn === p) giveUp(m, this);
    this.cam.follow(p.x, p.y, 0, true);
    this.fx.ring(p.x, p.y, '#a0e0ff', 0.5, 40);
    this.audio.sfx('warp');
  }
  useHot(i: number) {
    const s = this.hotbar[i]; if (!s) return;
    if (s.type === 'item') {
      const it = this.inv.items.find((x) => x.id === s.id);
      if (!it) { this.msg(`沒有 ${DB.item[s.id].name}了`, 'warn'); return; }
      this.useOrEquip(it.uid);
    } else this.useSkill(s.id);
  }
  buy(id: string, n: number) {
    const d = DB.item[id], cost = d.price * n, ch = this.player.ch;
    if (ch.zeny < cost) { this.msg('Zeny 不足！', 'warn'); return; }
    if (!this.inv.add(id, n)) { this.msg('負重不足，無法購買！', 'warn'); return; }
    ch.zeny -= cost; this.msg(`購買了 ${d.name} ×${n}（-${cost} Z）`, 'item'); this.audio.sfx('coin'); this.ev.emit('stats'); this.ev.emit('inv');
  }
  sell(uid: number, n: number) {
    const it = this.inv.get(uid); if (!it || this.inv.isEquipped(uid)) return;
    n = Math.min(n, it.n);
    const d = DB.item[it.id], gain = Math.floor(d.price / 2) * n;
    this.inv.remove(uid, n); this.player.ch.zeny += gain;
    this.msg(`出售了 ${d.name} ×${n}（+${gain} Z）`, 'item'); this.audio.sfx('coin'); this.ev.emit('stats'); this.ev.emit('inv');
  }
  dropItem(uid: number) {
    const it = this.inv.get(uid); if (!it) return;
    const d = DB.item[it.id], p = this.player;
    if (this.inv.isEquipped(uid)) { this.msg('請先卸下裝備再丟棄。', 'warn'); return; }
    const n = it.n;
    this.inv.remove(uid, n);
    const g = new GroundItem(d, n, p.x + (this.rnd() - 0.5), p.y + 0.6, p.x, p.y, { refine: it.refine, cards: it.cards, rar: it.rar, roll: it.roll, aff: it.aff, src: it.src });
    this.items.push(g);
    this.msg(`丟棄了 ${d.name} ×${n}`, 'item');
  }
  // ------------------------------------------------------------ 技能（施放系統在階段 7 完成）
  /** 這個職業可以學的技能（含前一階職業的技能） */
  skillList(): string[] { let j = this.player.job; const out: string[] = []; for (;;) { out.unshift(...j.skills); if (!j.prev) break; j = DB.job[j.prev]; } return out; }
  canLearn(id: string): boolean {
    const ch = this.player.ch, s = DB.skill[id];
    if (!s || ch.skillPts <= 0 || (ch.skills[id] || 0) >= s.maxLv) return false;
    if (!this.skillList().includes(id)) return false;
    if (this.missingReq(id).length) return false;
    return true;
  }
  /** 技能樹：還沒達成的前置條件（例：爆裂斬需要重擊 Lv5） */
  missingReq(id: string): { id: string; lv: number; name: string }[] {
    const ch = this.player.ch, s = DB.skill[id];
    return (s?.req || []).filter((r) => (ch.skills[r.id] || 0) < r.lv).map((r) => ({ ...r, name: DB.skill[r.id]?.name || r.id }));
  }
  learnSkill(id: string) {
    if (!this.canLearn(id)) return;
    const ch = this.player.ch; ch.skills[id] = (ch.skills[id] || 0) + 1; ch.skillPts--;
    this.msg(`學會了 ${DB.skill[id].name} Lv${ch.skills[id]}`, 'sys'); this.ui.sfx('click');
    this.ev.emit('stats');
  }
  skillCdRatio(id: string) { const t = this.skillCd[id] || 0; return t > 0 ? t / (this.skillCdMax[id] || 1) : 0; }
  useSkill(id: string) { this.skills.use(id); }
  skillName(name: string) { this.shout = { text: name + '!!', t: 1.1 }; }
  after(sec: number, fn: () => void) { this.timers.push({ t: sec, fn }); }
  addProjectile(p: Projectile) { this.projectiles.push(p); }
  monstersNear(x: number, y: number, r: number) { return this.monsters.filter((m) => !m.dead && Math.hypot(m.x - x, m.y - y) <= r); }
  engage(m: Monster) { aiEngage(this, m, true); }
  /** 擊退：沿著遠離 (fx,fy) 的方向滑行 n 格，遇到障礙停下 */
  knockback(m: Monster, fx: number, fy: number, n: number) {
    if (m.dead || m.isMvp) return;
    let dx = m.x - fx, dy = m.y - fy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    let tx = m.x, ty = m.y;
    for (let i = 0; i < n * 4; i++) { const nx = tx + dx * 0.25, ny = ty + dy * 0.25; if (!this.map.canWalk(nx, ny)) break; tx = nx; ty = ny; }
    if (Math.hypot(tx - m.x, ty - m.y) < 0.2) return;
    m.slide = { fx: m.x, fy: m.y, tx, ty, t: 0, dur: 0.22 }; m.path = []; m.atkAnimT = -1;
  }
  // ------------------------------------------------------------ 轉職
  jobMenu(d: Dialog) {
    const ch = this.player.ch, cur = this.player.job;
    if (cur.tier >= 3) { d.say(`你已經是${cur.name}了，這是目前最高的職業。繼續在這條路上精進吧！`); return; }
    // 已在進行的試煉
    const active = QUESTS.find((q) => q.trial && this.quests.isActive(q.id));
    if (active) {
      const jd = DB.job[active.trial!];
      if (this.quests.complete(active)) {
        d.say([active.done, `那麼，從今天起你就是${jd.name}了！`], () => {
          this.quests.turnIn(active.id); this.changeJob(active.trial!);
          d.say([`我送你一件${jd.tier >= 2 ? '專屬武器' : '入門武器'}，好好使用新的技能吧。`, '新職業的技能有前置條件，先學基礎的技能，才能學更強的。']);
        });
      } else {
        d.say([`你正在進行「${active.name}」：${active.desc}`, `目前進度：${this.quests.progress(active)} / ${active.count}`], () => d.choose([
          ...(active.arena ? [{ label: '前往試煉之間', fn: () => { d.close(); this.loadMap(active.arena!, 20, 30); } }] : []),
          { label: '我會繼續努力', fn: () => d.close() },
          ...(cur.tier === 0 ? [{ label: '我想改選別的職業', fn: () => { this.quests.abandon(active.id); this.jobMenu(d); } }] : []),
        ]));
      }
      return;
    }
    const offer = (job: string) => {
      const jd = DB.job[job], q = QUESTS.find((x) => x.trial === job)!;
      d.say([`想成為${jd.name}，就要先通過試煉。`, q.desc, '轉職之後就不能回頭了，確定要接受試煉嗎？'], () => d.choose([
        { label: `接受「${q.name}」`, fn: () => { this.quests.accept(q.id); d.say('完成後再來找我。祝你好運！'); } },
        { label: '再想想', fn: () => d.close() },
      ]));
    };
    if (cur.tier === 1) { // 二轉
      const next = JOBS.jobs.find((j) => j.prev === ch.job)!;
      if (ch.jobLv < 40) { d.say([`${cur.name}的下一步是「${next.name}」。`, `二轉需要職業等級 40（目前 ${ch.jobLv}）。繼續修練吧！`]); return; }
      d.say([`你的${cur.name}之路已經很扎實了。`, `下一步是「${next.name}」。`], () => d.choose([
        { label: `我想成為${next.name}`, fn: () => offer(next.id) },
        { label: '再想想', fn: () => d.close() },
      ]));
      return;
    }
    if (cur.tier === 2) { // 三轉
      const next = JOBS.jobs.find((j) => j.prev === ch.job)!;
      if (ch.jobLv < 50 || ch.baseLv < 70) { d.say([`${cur.name}的終點是「${next.name}」。`, `三轉需要職業等級 50（目前 ${ch.jobLv}）、基本等級 70（目前 ${ch.baseLv}）。繼續修練吧！`]); return; }
      d.say([`你的${cur.name}之路已經走到了盡頭。`, `真正的終點是「${next.name}」，不過要先通過專屬的試煉。`], () => d.choose([
        { label: `我想成為${next.name}`, fn: () => offer(next.id) },
        { label: '再想想', fn: () => d.close() },
      ]));
      return;
    }
    const basic = ch.skills.basic || 0;
    if (ch.jobLv < 10 || basic < 9) {
      d.say([`轉職需要：職業等級 10（目前 ${ch.jobLv}）、基本技能 Lv9（目前 Lv${basic}）。`, '技能點數可以在技能視窗分配到「基本技能」。等你準備好再來吧！']);
      return;
    }
    d.say('你已經有資格選擇自己的道路了。想成為哪一種冒險者？', () => d.choose([
      { label: '劍士（近戰、耐打）', fn: () => offer('swordsman') },
      { label: '法師（遠距魔法、詠唱）', fn: () => offer('mage') },
      { label: '弓箭手（遠距射箭）', fn: () => offer('archer') },
      { label: '再想想', fn: () => d.close() },
    ]));
  }
  changeJob(job: string) {
    const ch = this.player.ch, p = this.player;
    ch.job = job; ch.jobLv = 1; ch.jobExp = 0;
    const bonus = JOBS.jobChangePts?.[DB.job[job].tier] || 0; // 轉職贈送技能點，讓新職業一轉完就能用技能
    if (bonus) { ch.skillPts += bonus; this.msg(`轉職獎勵：獲得 ${bonus} 點技能點！`, 'sys'); }
    const gift = ({ swordsman: 'sword', mage: 'rod', archer: 'bow', paladin: 'long_spear', elementalist: 'elem_staff', ranger: 'ranger_bow', templar: 'holy_lance', archmage: 'archmage_rod', sniper: 'sniper_bow' } as Record<string, string>)[job];
    // 卸下不能用的裝備
    for (const it of [...this.inv.items]) { const s = this.inv.slotOf(it.uid); const d = DB.item[it.id]; if (s && d.jobs && !d.jobs.includes(job)) this.inv.unequip(s); }
    if (this.inv.add(gift)) { const it = this.inv.items.filter((i) => i.id === gift).pop()!; this.inv.equipItem(it.uid, job, ch.baseLv); }
    p.recalc(true); p.refreshLook();
    this.levelUpFx('job');
    for (let i = 0; i < 40; i++) this.fx.glow(p.x, p.y, Math.random() * 100, '#ffffff', 1.4, 2, 90);
    this.announce(`【公告】${ch.name} 轉職成為${DB.job[job].name}！`);
    this.ev.emit('stats'); this.ev.emit('inv');
    this.save?.saveSoon();
  }
  // ------------------------------------------------------------ 重新配點
  /** Lv20 以下免費，之後 5000 Zeny */
  resetCost() { return this.player.ch.baseLv <= 20 ? 0 : 5000; }
  resetSkills(): string {
    const ch = this.player.ch, cost = this.resetCost();
    let n = 0; for (const [id, lv] of Object.entries(ch.skills)) if (id !== 'basic') n += lv;
    if (!n) return '你還沒有可以重置的技能點。';
    if (ch.zeny < cost) return `重置需要 ${cost} Zeny。`;
    ch.zeny -= cost;
    ch.skills = ch.skills.basic ? { basic: ch.skills.basic } : {};
    ch.skillPts += n;
    for (const k of Object.keys(this.buffT)) { delete this.buffT[k]; delete this.player.buffs[k]; }
    this.hotbar = this.hotbar.map((h) => (h && h.type === 'skill' && !ch.skills[h.id] ? null : h));
    this.player.recalc(); this.ui.hot.render(); this.ev.emit('stats'); this.save.saveSoon();
    this.msg(`技能點已重置，取回 ${n} 點（基本技能保留）。`, 'sys');
    return `完成了！你取回了 ${n} 點技能點，可以重新分配。`;
  }
  resetStats(): string {
    const ch = this.player.ch, cost = this.resetCost();
    let n = 0;
    for (const k of Object.keys(ch.stats) as StatKey[]) { for (let x = 5; x < ch.stats[k]; x++) n += statCost(x); }
    if (!n) return '你的能力值還是初始狀態。';
    if (ch.zeny < cost) return `重置需要 ${cost} Zeny。`;
    ch.zeny -= cost;
    for (const k of Object.keys(ch.stats) as StatKey[]) ch.stats[k] = 5;
    ch.statPts += n;
    this.player.recalc(); this.ev.emit('stats'); this.save.saveSoon();
    this.msg(`能力值已重置，取回 ${n} 點能力點數。`, 'sys');
    return `完成了！六項能力回到 5，取回 ${n} 點能力點數。`;
  }
  // ------------------------------------------------------------ 狀態
  toggleSit() {
    const p = this.player;
    if (p.dead) return;
    if (p.state === 'sit') { p.state = 'idle'; return; }
    if ((p.ch.skills.basic || 0) < 3) { this.msg('需要「基本技能」Lv3 才能坐下。', 'warn'); return; }
    p.stop(); p.chase = null; this.skills.interrupt(); p.atkAnimT = -1; p.state = 'sit'; this.flags.sat = true;
    this.msg('坐下休息中…（HP/SP 恢復加快，再按 Insert 站起來）', 'sys');
  }
  /** 自然回復：脫離戰鬥 5 秒後開始；坐下時回復量加倍、間隔縮短（RO） */
  updateRegen(dt: number) {
    const p = this.player; if (p.dead || this.inTitle) return;
    this.combatT += dt;
    const sit = p.state === 'sit';
    if (this.combatT < 5 && !sit) return;
    this.regenT += dt; this.spRegenT += dt;
    const hpI = sit ? 1.5 : 3, spI = sit ? 2 : 4;
    if (this.regenT >= hpI) { this.regenT = 0; if (p.hp < p.maxHp) { const v = p.d.hpRegen * (sit ? 2 : 1); p.hp = Math.min(p.maxHp, p.hp + v); if (sit) this.fx.dmg(p.x, p.y, v, 'heal', 110); } }
    if (this.spRegenT >= spI) { this.spRegenT = 0; if (p.sp < p.maxSp) { const v = p.d.spRegen * (sit ? 2 : 1); p.sp = Math.min(p.maxSp, p.sp + v); } }
  }
  // ------------------------------------------------------------ 精煉、卡片
  refine(uid: number) {
    const it = this.inv.get(uid); if (!it) return;
    const d = DB.item[it.id], mat = refineMaterial(d), fee = refineFee(d), ch = this.player.ch;
    if (it.refine >= 10 || this.inv.count(mat) < 1 || ch.zeny < fee) return;
    this.inv.removeId(mat, 1); ch.zeny -= fee;
    const rate = refineRate(d, it.refine);
    const p = this.player;
    if (this.rnd() * 100 < rate) {
      it.refine++;
      this.msg(`精煉成功！${this.inv.displayName(it)}`, 'item');
      for (let i = 0; i < 24; i++) this.fx.glow(p.x, p.y, Math.random() * 90, '#fff0a0', 1, 2, 70);
      this.fx.dmg(p.x, p.y, 'SUCCESS', 'heal', 150); this.audio.sfx('refine_ok');
      if (it.refine >= 7) this.announce(`【公告】${ch.name} 把 ${d.name} 精煉到了 +${it.refine}！`);
    } else {
      this.msg(`精煉失敗……${d.name} 碎掉了。`, 'warn');
      this.fx.burst(p.x, p.y, 60, '#a0a0b0', 24, 120, 'dot', 0.6, 3);
      this.fx.dmg(p.x, p.y, 'FAIL', 'take', 150); this.audio.sfx('refine_fail');
      this.inv.remove(uid, 1);
    }
    this.player.recalc(); this.ev.emit('inv'); this.ev.emit('stats'); this.save.saveSoon();
  }
  insertCard(cardUid: number, eqUid: number) {
    const c = this.inv.get(cardUid), e = this.inv.get(eqUid); if (!c || !e) return;
    const cd = DB.item[c.id], ed = DB.item[e.id];
    if ((ed.slots || 0) <= e.cards.length) return;
    e.cards.push(c.id); this.inv.remove(cardUid, 1);
    this.msg(`把 ${cd.name} 插入了 ${ed.name}！`, 'item'); this.audio.sfx('refine_ok');
    this.player.recalc(); this.ev.emit('inv'); this.ev.emit('stats'); this.save.saveSoon();
  }
  updateBuffs(dt: number) {
    const p = this.player; let changed = false;
    for (const k of Object.keys(this.buffT)) {
      this.buffT[k] -= dt;
      if (this.buffT[k] <= 0) { delete this.buffT[k]; delete p.buffs[k]; changed = true; this.msg(`${DB.skill[k]?.name || k} 效果結束了。`, 'sys'); }
    }
    if (changed) { p.recalc(); this.ev.emit('stats'); }
  }
  // ------------------------------------------------------------ NPC
  spawnNpcs() {
    this.npcs = [];
    for (const n of this.map.def.npcs || []) {
      const def = DB.npc[n.id]; if (!def) continue;
      const npc = new Npc(def, n.x + 0.5, n.y + 0.5, n.dir ?? 0);
      this.ensureNpcVisible(npc);
      this.npcs.push(npc); this.entities.push(npc);
    }
  }
  /** NPC 不能被建築擋住：若在建築後方且重疊，就移到附近不被擋的格子 */
  npcHiddenBy(npc: Npc): PropInst | null {
    const b = npc.bbox, nx = isoX(npc.x, npc.y), ny = isoY(npc.x, npc.y);
    for (const pr of this.props) {
      if (!pr.def.tall || !pr.strips) continue;
      const pp = pr.p;
      const behind = !(npc.x >= pp.x + pp.w || npc.y >= pp.y + pp.h);
      if (!behind) continue;
      const w = pr.spr.c.width, h = pr.spr.c.height;
      if (nx + b.x1 > pr.dx && nx + b.x0 < pr.dx + w && ny + b.y1 > pr.dy && ny + b.y0 < pr.dy + h - 4) return pp;
    }
    return null;
  }
  ensureNpcVisible(npc: Npc) {
    if (!this.npcHiddenBy(npc)) return;
    const ox = Math.floor(npc.x), oy = Math.floor(npc.y);
    for (let r = 1; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = ox + dx, y = oy + dy;
      if (!this.map.canWalk(x, y)) continue;
      const ppx = npc.x, ppy = npc.y; npc.x = npc.px = x + 0.5; npc.y = npc.py = y + 0.5;
      if (!this.npcHiddenBy(npc)) {
        console.warn(`NPC ${npc.def.id} 被建築擋住，已從 (${ox},${oy}) 移到 (${x},${y})`);
        this.map.walk[oy * this.map.w + ox] = 1; this.map.walk[y * this.map.w + x] = 0;
        return;
      }
      npc.x = npc.px = ppx; npc.y = npc.py = ppy;
    }
  }
  dialogClosed() { /* 對話結束 */ }
  fullHeal() {
    const p = this.player; p.hp = p.maxHp; p.sp = p.maxSp;
    for (let i = 0; i < 16; i++) this.fx.glow(p.x, p.y, Math.random() * 80, '#a0ffb0', 0.9, 2, 50);
    this.fx.dmg(p.x, p.y, 'FULL', 'heal', 130); this.audio.sfx('heal');
  }
  /** 轉職選單（階段 7） */
  talkTo(npc: Npc) {
    const p = this.player;
    npc.face(p.x, p.y); p.face(npc.x, npc.y);
    npc.talkT = 4;
    if (npc.def.id === 'guide') this.flags.talkedGuide = true;
    this.ui.talk(npc);
  }
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
    this.audio.sfx('levelup');
  }
  command(cmd: string, args: string[]) {
    const p = this.player;
    switch (cmd) {
      case 'help': this.msg('指令：/where 位置　/exp 經驗　/sit 坐下　/save 存檔　/fps 效能資訊', 'sys'); break;
      case 'where': this.msg(`${this.map.def.name}（${Math.floor(p.x)}, ${Math.floor(p.y)}）`, 'sys'); break;
      case 'exp': this.msg(`Base ${p.ch.baseExp}　Job ${p.ch.jobExp}`, 'sys'); break;
      case 'fps': this.showFps = !this.showFps; break;
      case 'infpotion': this.debug.infiniteRedPotion = !this.debug.infiniteRedPotion; this.topUpRedPotion(); this.msg(`紅色藥水無限：${this.debug.infiniteRedPotion ? '開' : '關'}`, 'sys'); break;
      case 'save': this.save.save(true); break;
      case 'sit': this.toggleSit(); break;
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
    // 物件空間格子：繪製時只看畫面附近的格子
    this.propGrid.clear();
    for (const pr of this.props) {
      const x0 = Math.floor(pr.dx / 512), x1 = Math.floor((pr.dx + pr.spr.c.width) / 512), y0 = Math.floor(pr.dy / 512), y1 = Math.floor((pr.dy + pr.spr.c.height) / 512);
      for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) { const k = (gx + 1000) * 4096 + gy + 1000; let a = this.propGrid.get(k); if (!a) { a = []; this.propGrid.set(k, a); } a.push(pr); }
    }
    this.entities = [this.player];
    this.monsters = [];
    this.fx.clear();
    const p = this.player;
    const start = this.map.nearestWalkable(x ?? def.w / 2, y ?? def.h / 2) || [def.w / 2, def.h / 2];
    p.x = p.px = start[0] + 0.5; p.y = p.py = start[1] + 0.5;
    p.stop(); p.chase = null;
    this.items = []; this.pickTarget = null; this.telegraphs = []; this.projectiles = []; this.timers = [];
    this.skills.cast = null; this.skills.pending = null; this.skills.targeting = null;
    this.safeUntil = this.time + 2; // 剛換地圖 2 秒內主動怪不會追
    this.spawner.onMapLoad();
    this.cam.follow(p.x, p.y, 0, true);
    this.ground.warm(this.cam.left(this.r.w) - 64, this.cam.top(this.r.h) - 64, this.r.w + 128, this.r.h + 128);
    this.lights = this.props.filter((r) => r.def.anim === 'flame' || r.p.type === 'lamp' || r.def.anim === 'crystal').map((r) => ({ x: r.fx, y: r.fy - (r.p.type === 'lamp' ? 80 : r.def.anim === 'flame' ? 50 : 20), r: r.def.anim === 'crystal' ? 70 : 130 }));
    this.spawnNpcs();
    this.mercs?.onMapLoad();
    this.talkTarget = null;
    this.flags.visited[def.id] = true;
    this.ui.onMap();
    this.audio.bgm(def.bgm);
    const lv = def.level ? `建議等級 Lv${def.level[0]}~${def.level[1]}` : '';
    this.ui.showBanner(def.name, lv);
    this.ev.emit('map', def.id);
    if (!this.inTitle) this.save?.saveSoon();
  }
  /** 傳送：淡出 → 換地圖 → 淡入 */
  warpTo(to: string, tx: number, ty: number) {
    if (this.warp) return;
    this.warp = { to, tx, ty, t: 0, done: false };
    this.player.stop(); this.player.chase = null;
    this.audio.sfx('warp');
  }
  updateWarp(dt: number) {
    const w = this.warp;
    if (!w) { if (this.fade > 0) this.fade = Math.max(0, this.fade - dt * 3); return; }
    w.t += dt;
    this.fade = Math.min(1, w.t / 0.25);
    if (w.t >= 0.25 && !w.done) { w.done = true; this.loadMap(w.to, w.tx, w.ty); this.warp = null; this.fade = 1; }
  }
  mvpStatus(id: string): string { return this.spawner.status(id); }
  announce(text: string) { this.msg(text, 'ann'); this.ui.showBanner(text, '', 'ann', 4); this.audio.sfx('announce'); }
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
    for (const it of this.items) {
      const fx = isoX(it.x, it.y) - L, fy = isoY(it.x, it.y) - T;
      if (sx >= fx - 14 && sx <= fx + 14 && sy >= fy - 22 && sy <= fy + 6 && it.depth + 0.5 > bd) { bd = it.depth + 0.5; best = it; }
    }
    if (best) return best;
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
    if (this.slowT > 0) { this.slowT -= dt; dt *= this.slowScale; if (this.slowT <= 0) this.slowScale = 1; } // 慢動作（只在擊敗 Boss 時）
    this.time += dt;
    for (const e of this.entities) e.savePrev();
    this.updatePlayer(dt);
    if (!this.player.dead) this.checkPortals();
    for (const m of this.monsters) this.updateMonster(m, dt);
    this.mercs.update(dt);
    for (const n of this.npcs) { n.updateAnim(dt); if (n.talkT > 0) { n.talkT -= dt; if (n.talkT <= 0) n.dir = n.baseDir; } }
    for (const k in this.skillCd) if (this.skillCd[k] > 0) this.skillCd[k] -= dt;
    // 移除淡出完成的實體
    if (this.entities.some((e) => e.remove)) {
      this.entities = this.entities.filter((e) => !e.remove);
      this.monsters = this.monsters.filter((m) => !m.remove);
    }
    this.updateTelegraphs(dt);
    this.updateBuffs(dt);
    this.updateRegen(dt);
    if (!this.inTitle) this.tutorial.update(dt);
    if (!this.inTitle) this.save.update(dt);
    if (this.shout) { this.shout.t -= dt; if (this.shout.t <= 0) this.shout = null; }
    if (this.timers.length) { const due = this.timers.filter((t) => (t.t -= dt) <= 0); if (due.length) { this.timers = this.timers.filter((t) => t.t > 0); for (const t of due) t.fn(); } }
    if (this.projectiles.length) this.projectiles = this.projectiles.filter((pr) => !pr.step(dt));
    this.spawner.update(dt);
    for (const it of this.items) { it.t += dt; if (it.t > it.life) it.remove = true; }
    if (this.items.some((i) => i.remove)) this.items = this.items.filter((i) => !i.remove);
    this.fx.update(dt);
    this.cam.updateShake(dt);
    if (this.clickMark.t > 0) this.clickMark.t -= dt;
    this.ui.update(dt);
    this.updatePerf(dt);
  }
  /** 畫面更新率：流暢＝60；省電＝30；自動＝移動、戰鬥、施法時 60，站著不動（沒有怪物追你）時降到 30，少耗電、手機不容易發燙 */
  setPerf(m: 'smooth' | 'auto' | 'saver') { this.perf = m; try { localStorage.setItem('rom.perf', m); } catch { /* */ } this.calmT = 0; }
  updatePerf(dt: number) {
    if (this.perf === 'smooth') { this.loop.renderFps = 60; return; }
    if (this.perf === 'saver') { this.loop.renderFps = 30; return; }
    const p = this.player;
    const busy = p.state !== 'idle' || this.input.down || p.path.length > 0 || this.monsters.some((m) => m.aggroOn && !m.dead) || this.telegraphs.length > 0 ||
      this.projectiles.length > 0 || this.skills.cast !== null || this.fx.parts.activeCount > 30 || this.warp !== null || this.fade > 0 || this.hitStop > 0 || this.slowT > 0 || this.ui.dialog.isOpen;
    if (busy) this.calmT = 0; else this.calmT += dt;
    this.loop.renderFps = this.calmT > 1.5 ? 30 : 60;
  }

  handleInput(dt: number) {
    if (this.inTitle) { this.input.takeClicks(); this.input.takeKeys(); this.input.takeWheel(); return; }
    const w = this.input.takeWheel();
    if (w) this.r.setZoom(this.r.zoomBias - w);
    for (const c of this.input.takeClicks()) {
      if (c.button !== 0) continue;
      if (this.ui.dialog.isOpen) { this.ui.dialog.advance(); continue; }
      this.onClick(c.x, c.y, false);
    }
    // 按住滑鼠持續往游標方向走（RO 操作）
    if (this.input.down && !this.ui.dialog.isOpen) {
      this.holdT += dt;
      if (this.holdT > 0.25 && !this.player.chase) { this.holdT = 0.05; this.onClick(this.input.mx, this.input.my, true); }
    } else this.holdT = 0;
    this.hover = this.input.over ? this.pick(this.input.mx, this.input.my) : null;
    this.r.canvas.style.cursor = this.skills.targeting ? 'cell' : this.hover instanceof Monster ? 'crosshair' : this.hover ? 'pointer' : 'default';
    for (const k of this.input.takeKeys()) this.ui.onKey(k);
  }
  onClick(sx: number, sy: number, hold: boolean) {
    const p = this.player;
    if (p.dead) return;
    const e = hold ? null : this.pick(sx, sy);
    if (this.skills.targeting) {
      if (e instanceof Monster) this.skills.onTargetClick(e); else { this.skills.cancelTargeting(); this.msg('取消施放。', 'sys'); }
      return;
    }
    if (this.skills.cast) { if (hold) return; this.skills.interrupt(); }
    if (p.state === 'sit') p.state = 'idle';
    this.skills.pending = null;
    if (e instanceof Monster) { p.chase = e; p.repathT = 0; this.pickTarget = null; return; }
    if (e instanceof GroundItem) { p.chase = null; this.pickTarget = e; this.talkTarget = null; this.walkTo(e.x, e.y, false); return; }
    if (e instanceof Npc) { p.chase = null; this.pickTarget = null; this.talkTarget = e; p.setPath(this.pf.find(p.x, p.y, e.x, e.y, 3000, 1)); return; }
    p.chase = null; this.pickTarget = null; this.talkTarget = null;
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

  attackRange(a: Actor) {
    if (a instanceof Monster) return a.def.range;
    const j = this.player.job;
    if (j.attack === 'arrow') return this.player.weaponType() === 'bow' ? j.range + Math.min(3, Math.floor((this.player.ch.skills.vulture_eye || 0) / 3)) : 1;
    return j.range;
  }
  attackMode(): 'melee' | 'magic' | 'arrow' { const j = this.player.job; if (j.attack === 'arrow' && this.player.weaponType() !== 'bow') return 'melee'; return j.attack; }
  attackDelay(a: Actor) { return a instanceof Monster ? a.def.adelay / 1000 : this.player.d.delay; }

  updatePlayer(dt: number) {
    const p = this.player;
    p.updateAnim(dt);
    if (p.dead) return;
    this.skills.update(dt);
    if (this.skills.cast) { p.tickAttack(dt); return; }
    const t = p.chase;
    if (t && (t.dead || t.remove)) p.chase = null;
    if (p.chase) {
      const tg = p.chase;
      const range = this.attackRange(p);
      if (this.skills.pending) { /* 正在走向技能目標 */ }
      else if (cellDist(p.x, p.y, tg.x, tg.y) <= range && p.atkAnimT < 0) {
        p.path = [];
        if (p.atkCd <= 0) { p.face(tg.x, tg.y); p.target = tg; p.startAttack(Math.min(0.45, this.attackDelay(p) * 0.8)); p.atkCd = this.attackDelay(p); if (this.attackMode() === 'melee') this.audio.sfx('swing'); }
      } else if (p.atkAnimT < 0) {
        p.repathT -= dt;
        if (p.repathT <= 0 || !p.path.length) { p.repathT = 0.3; p.setPath(this.pf.find(p.x, p.y, tg.x, tg.y, 3000, range)); }
      }
    }
    if (this.talkTarget) {
      const n = this.talkTarget;
      if (Math.max(Math.abs(n.x - p.x), Math.abs(n.y - p.y)) <= 2.2) { p.path = []; this.talkTarget = null; this.talkTo(n); }
      else if (!p.path.length) this.talkTarget = null;
    }
    if (this.pickTarget) {
      const it = this.pickTarget;
      if (!this.items.includes(it)) this.pickTarget = null;
      else if (Math.hypot(it.x - p.x, it.y - p.y) < 1.6) { p.path = []; this.pickUp(it); this.pickTarget = null; }
    }
    if (p.tickAttack(dt)) {
      if (this.skills.meleeHit) this.skills.resolveMelee();
      else if (p.target) this.playerAttackHit(p.target);
    }
    if (p.atkAnimT < 0) {
      if (p.stepPath(dt)) p.state = 'walk';
      else if (p.state === 'walk') p.state = 'idle';
    }
  }

  updateMonster(m: Monster, dt: number) {
    m.updateAnim(dt);
    if (m.dead) { m.deadT += dt; if (m.deadT > 1.0) m.remove = true; return; }
    if (m.provokeT > 0) m.provokeT -= dt;
    if (m.slide) { // 被擊退中
      const s = m.slide; s.t += dt; const k = Math.min(1, s.t / s.dur), e = 1 - (1 - k) * (1 - k);
      m.x = s.fx + (s.tx - s.fx) * e; m.y = s.fy + (s.ty - s.fy) * e;
      if (k >= 1) m.slide = null;
      return;
    }
    if (m.isMvp) m.frozenT = 0; // Boss 不會被冰凍（否則招式計時會停住）
    if (m.frozenT > 0) { m.frozenT -= dt; m.atkAnimT = -1; return; }
    if (m.tickAttack(dt) && m.target) this.resolveAttack(m, m.target);
    if (m.aggroOn && m.aggroOn.dead) giveUp(m, this);
    updateAI(this, m, dt);
    if (m.atkAnimT < 0) {
      const sp = m.speed;
      if (m.ai === 'wander') m.speed = sp * 0.5; else if (m.ai === 'return') m.speed = sp * 1.4;
      if (m.stepPath(dt)) m.state = 'walk'; else if (m.state === 'walk') m.state = 'idle';
      m.speed = sp;
      if (!m.path.length && m.ai === 'wander') m.ai = 'idle';
    }
  }
  /** MVP 技能：召喚手下、範圍重擊（先出現紅色預警圈） */
  monsterSkill(m: Monster, id: string) {
    if (id === 'summon') {
      const minion = m.def.id === 'golem' ? 'rockling' : m.def.id === 'bandit_king' ? 'bandit' : m.def.id === 'frost_king' ? 'frost_wolf' : m.def.id === 'flame_wyrm' ? 'magma_slime' : 'jelly';
      const alive = this.monsters.filter((x) => x.summoned && !x.dead).length;
      if (alive >= 4) return;
      for (let i = 0; i < 2; i++) {
        const pos = this.map.nearestWalkable(m.x + (this.rnd() * 4 - 2), m.y + (this.rnd() * 4 - 2), 4);
        if (!pos) continue;
        const s = this.spawnMonster(minion, pos); if (s) { s.summoned = true; this.fx.ring(s.x, s.y, '#ff80c0', 0.6, 30); }
      }
      this.fx.dmg(m.x, m.y, '!', 'take', -m.bbox.y0 + 10);
      this.msg(`${m.def.name} 召喚了手下！`, 'warn');
    } else {
      const r = id === 'stomp' ? 3 : 2.5;
      this.telegraphs.push({ kind: 'circle', x: m.x, y: m.y, r, x2: 0, y2: 0, width: 0, t: 0, dur: 0.9, owner: m, mult: id === 'stomp' ? 1.6 : 1.4, color: '#ff3020' });
      m.startAttack(0.9);
    }
  }
  /** 預警區倒數；時間到才結算，玩家那一刻在範圍外就完全不受傷 */
  updateTelegraphs(dt: number) {
    const p = this.player;
    for (const t of this.telegraphs) {
      t.t += dt;
      if (t.t < t.dur || t.done) continue;
      t.done = true;
      if (t.owner.dead) continue;
      let hit = false;
      if (t.kind === 'circle') {
        this.fx.ring(t.x, t.y, '#ffb060', 0.5, t.r * 40);
        this.fx.burst(t.x, t.y, 0, '#c8a070', 24, 140, 'dot', 0.6, 3);
        this.cam.shake(7, 0.35); this.audio.sfx('skill_fire_burst');
        hit = !p.dead && Math.hypot(p.x - t.x, p.y - t.y) <= t.r;
      } else {
        const dx = t.x2 - t.x, dy = t.y2 - t.y, len2 = dx * dx + dy * dy || 1;
        for (let i = 0; i <= 8; i++) this.fx.burst(t.x + (dx * i) / 8, t.y + (dy * i) / 8, 4, '#d8c8a0', 4, 90, 'dot', 0.4, 3);
        this.cam.shake(5, 0.25);
        const k = Math.max(0, Math.min(1, ((p.x - t.x) * dx + (p.y - t.y) * dy) / len2));
        hit = !p.dead && Math.hypot(p.x - (t.x + dx * k), p.y - (t.y + dy * k)) <= t.width / 2;
      }
      if (hit) this.applyDamage(t.owner, p, bossDamage(t.owner, t.mult, this), 'take');
    }
    this.telegraphs = this.telegraphs.filter((t) => !t.done);
  }
  /** 擊敗 Boss：停頓 0.2 秒＋慢動作、「擊敗！」與戰鬥時間、首殺獎勵、最快紀錄 */
  bossVictory(m: Monster) {
    if (!hasBossFight(m)) return;
    const id = m.def.id, cfg = BOSSFIGHT.bosses[id], V = BOSSFIGHT.global.victory;
    const secs = fightTime(m, this);
    const best = (this.flags.bossBest ||= {}) as Record<string, number>, kills = (this.flags.bossKills ||= {}) as Record<string, number>;
    const first = !kills[id]; kills[id] = (kills[id] || 0) + 1;
    const record = secs > 0 && (best[id] === undefined || secs < best[id]);
    if (record) best[id] = secs;
    if (first) {
      const r = cfg.firstKill, p = this.player;
      p.ch.zeny += r.zeny; gainExp(this, r.exp, r.jexp, true);
      const names: string[] = [`${r.zeny.toLocaleString()} Zeny`, `經驗 ${r.exp}`];
      for (const [it, n] of r.items) {
        if (!this.inv.add(it, n)) this.items.push(new GroundItem(DB.item[it], n, p.x + (this.rnd() - 0.5), p.y + 0.6, p.x, p.y));
        names.push(`${DB.item[it].name} ×${n}`);
      }
      this.msg(`★ 首殺獎勵：${names.join('、')}`, 'quest');
    }
    this.msg(`擊敗 ${m.def.name}！戰鬥時間 ${fmtTime(secs)}${record ? '（新的最快紀錄！）' : best[id] !== undefined ? `（最快 ${fmtTime(best[id])}）` : ''}`, 'quest');
    this.hitStop = Math.max(this.hitStop, V.hitStop); this.slowT = V.slowTime; this.slowScale = V.slowScale;
    this.cam.shake(6, 0.5); this.audio.sfx('boss_down');
    this.telegraphs = this.telegraphs.filter((t) => t.owner !== m);
    this.ui.bossDown(m.def.name, fmtTime(secs), first, record, best[id] !== undefined ? fmtTime(best[id]) : '');
    this.ev.emit('bossdown', { id, secs, first, record });
    this.save.saveSoon();
  }
  /** 玩家普通攻擊：近戰直接結算；法師發出魔力彈；弓箭手射箭 */
  playerAttackHit(t: Actor) {
    const mode = this.attackMode(), p = this.player;
    if (mode === 'melee' || !(t instanceof Monster)) { this.resolveAttack(p, t); return; }
    if (mode === 'arrow') {
      this.addProjectile(new Projectile('arrow', p.x, p.y, 70, t, () => {
        this.resolveAttack(p, t);
        const fl = p.ch.skills.falcon || 0; // 獵鷹追加攻擊
        if (fl && !t.dead && this.rnd() * 100 < 3 * fl) this.after(0.18, () => {
          if (t.dead) return;
          this.fx.burst(t.x, t.y, -t.bbox.y0 * 0.7, '#c8a070', 12, 100, 'spark', 0.4, 2);
          this.fx.dmg(t.x, t.y, 'FALCON', 'skill', -t.bbox.y0 + 34);
          const r = playerVsMonster(p.d, t.def, this.rnd, 1 + 0.1 * fl, true, true);
          this.applyDamage(p, t, r.dmg, 'skill');
        });
      }, 18));
      this.audio.sfx('bow');
    }
    else {
      this.addProjectile(new Projectile('orb', p.x, p.y, 80, t, () => {
        if (t.dead) return;
        const r = magicVsMonster(p.d, t.def, this.rnd, 0.6);
        this.fx.burst(t.x, t.y, -t.bbox.y0 * 0.5, '#c0a0ff', 8, 70, 'spark', 0.35, 2);
        this.applyDamage(p, t, r.dmg, 'deal');
      }, 12));
      this.audio.sfx('magic');
    }
  }
  /** 攻擊命中點：RO 式命中／爆擊／防禦公式 */
  resolveAttack(a: Actor, d: Actor) {
    if (d.dead) return;
    const h = -d.bbox.y0 + 10;
    if (a === this.player && d instanceof Monster) {
      const r = playerVsMonster(this.player.d, d.def, this.rnd);
      if (r.kind === 'miss') { this.fx.dmg(d.x, d.y, 'MISS', 'miss', h); this.audio.sfx('miss'); onHurt(this, d); return; }
      this.applyDamage(a, d, r.dmg, r.kind);
    } else if (a instanceof Monster && d === this.player) {
      const r = monsterVsPlayer(a.def, this.player.d, this.rnd);
      if (r.kind === 'miss') { this.fx.dmg(d.x, d.y, r.lucky ? 'LUCKY' : 'MISS', 'miss', h); this.audio.sfx('miss'); return; }
      this.applyDamage(a, d, r.dmg, 'take');
    }
  }
  applyDamage(a: Actor | null, d: Actor, dmg: number, kind: 'deal' | 'take' | 'crit' | 'skill') {
    const h = -d.bbox.y0 + 10;
    if (a === this.player && d instanceof Monster) {
      // 屬性傷害詞條：對該屬性弱點的怪物加成
      const pd = this.player.d; let bonus = 0;
      for (const [el, v] of Object.entries(pd.elem)) if (ELEM[el]?.includes(d.def.look.body || '')) bonus += v;
      if (bonus) dmg = Math.round(dmg * (1 + bonus / 100));
      // 吸血詞條
      if (pd.lifesteal > 0 && !this.player.dead) { const heal = Math.floor(Math.min(dmg, d.hp) * pd.lifesteal / 100); if (heal > 0) this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal); }
    }
    d.hp -= dmg;
    if (a === this.player || d === this.player) this.combatT = 0;
    if (d === this.player && this.player.state === 'sit') this.player.state = 'idle';
    d.flashT = 0.12; d.hurtT = d === this.player && (this.player.buffs.endure || this.player.buffs.guard) ? 0 : 0.15;
    this.fx.dmg(d.x, d.y, dmg, d === this.player ? 'take' : kind, h);
    this.audio.sfx(d === this.player ? 'hurt' : kind === 'crit' ? 'crit' : 'hit');
    this.fx.burst(d.x, d.y, -d.bbox.y0 * 0.5, kind === 'crit' ? '#ffe070' : '#ffffff', kind === 'crit' ? 14 : 7, kind === 'crit' ? 110 : 70);
    // 打擊停頓與畫面震動
    if (a === this.player || d === this.player) this.hitStop = Math.max(this.hitStop, kind === 'crit' || kind === 'skill' ? 0.09 : 0.045);
    if (kind === 'crit' || kind === 'skill') this.cam.shake(5, 0.25); else if (d === this.player) this.cam.shake(3, 0.18); else this.cam.shake(1.5, 0.1);
    if (d instanceof Monster && a === this.player) onHurt(this, d);
    if (d.hp <= 0) this.kill(d, a);
  }
  kill(d: Actor, by: Actor | null) {
    d.hp = 0; d.state = 'dead'; d.deadT = 0; d.path = []; d.atkAnimT = -1;
    if (d === this.player) { this.onPlayerDeath(); return; }
    if (d instanceof Monster) {
      this.audio.sfx('die');
      if (this.player.chase === d) this.player.chase = null;
      this.spawner.onKill(d);
      if (by === this.player && !d.summoned) {
        gainExp(this, d.def.exp, d.def.jexp);
        for (const id of ['battle_spirit', 'eagle_focus', 'mana_focus']) { const lv = this.player.ch.skills[id] || 0; if (lv) this.player.sp = Math.min(this.player.maxSp, this.player.sp + (DB.skill[id].value?.[lv - 1] || 0)); } // 擊倒回復 SP 的被動
        this.dropLoot(d);
        if (d.isMvp) { this.mvpReward(d); this.bossVictory(d); }
        this.ev.emit('kill', d.def.id);
      }
    }
  }
  /** 依掉落表擲骰，掉在怪物周圍 */
  /** 依掉落表擲骰，掉在怪物周圍；裝備在掉落時決定稀有度、撿到時才擲數值 */
  dropLoot(m: Monster) {
    let k = 0;
    const list: { id: string; n: number; rar?: import('../data').Rarity }[] = [];
    if (m.isMvp && LOOT.boss[m.def.id]) list.push(...this.loot.bossDrops(m.def.id));
    else for (const dr of m.def.drops) if (this.rnd() < dr.rate && DB.item[dr.item]) list.push({ id: dr.item, n: 1, rar: this.loot.monsterRarity(DB.item[dr.item]) });
    const zd = (LOOT as any).zenyDrop; // 一般怪物依等級掉 Zeny
    if (zd && !m.isMvp && this.rnd() < zd.chance) list.push({ id: 'zeny', n: Math.max(1, Math.round(m.def.lv * zd.perLevel * (zd.spread[0] + this.rnd() * (zd.spread[1] - zd.spread[0])))) });
    for (const e of list) {
      const def = DB.item[e.id]; if (!def) continue;
      const a = k * 2.1 + this.rnd(), rr = k === 0 ? 0.2 : 0.6 + this.rnd() * 0.6;
      let tx = m.x + Math.cos(a) * rr, ty = m.y + Math.sin(a) * rr;
      if (!this.map.canWalk(tx, ty)) { tx = m.x; ty = m.y; }
      const it = new GroundItem(def, e.n, tx, ty, m.x, m.y, isGear(def) ? { rar: e.rar || 'common', src: m.isMvp ? m.def.id : undefined } : {});
      this.items.push(it); k++;
      this.dropFx(it, m);
    }
  }
  /** 稀有掉落特效：紫色以上光柱＋音效；橘、紅色停頓＋震動＋全螢幕提示 */
  dropFx(it: GroundItem, m: Monster) {
    const rar = rarityOf({ id: it.def.id, rar: it.extra.rar });
    const rk = RANK[rar], name = RAR[rar].name;
    if (rk >= RANK[LOOT.fx.pillarFrom]) {
      this.msg(`★ ${m.def.name} 掉落了【${name}】${it.def.name}！`, rk >= RANK.legend ? 'ann' : 'quest');
      this.after(0.45, () => { this.audio.sfx(rk >= RANK[LOOT.fx.bigFrom] ? 'loot_legend' : 'loot_rare'); this.fx.ring(it.x, it.y, RAR[rar].color, 0.7, 40); });
    }
    if (rk >= RANK[LOOT.fx.bigFrom]) {
      this.after(0.45, () => {
        this.hitStop = Math.max(this.hitStop, LOOT.fx.hitStop); this.cam.shake(LOOT.fx.shake, 0.3);
        this.ui.bigLoot(rar === 'boss' ? '獲得 Boss 專屬寶物！' : '獲得傳說寶物！', it.def.name, RAR[rar].color);
      });
    }
  }  mvpReward(m: Monster) {
    const p = this.player;
    // RO：MVP 經驗＋直接進背包的 MVP 獎勵
    const bonus = Math.round(m.def.exp * 0.5);
    gainExp(this, bonus, 0, true);
    this.fx.dmg(p.x, p.y, 'MVP', 'crit', 170);
    const prize = m.def.drops[0];
    if (prize && this.inv.add(prize.item, 1)) this.msg(`MVP 獎勵：獲得 ${DB.item[prize.item].name}！（MVP 經驗 ${bonus}）`, 'quest');
  }
  pickUp(it: GroundItem) {
    if (it.def.id === 'zeny') { // 金幣直接加錢
      this.player.ch.zeny += it.n; this.items = this.items.filter((x) => x !== it);
      this.msg(`獲得 ${it.n.toLocaleString()} Zeny`, 'item'); this.audio.sfx('coin'); this.ev.emit('stats'); return;
    }
    let extra = it.extra;
    if (isGear(it.def) && !extra.roll && !extra.aff) extra = { ...extra, ...rollGear(it.def, extra.rar || 'common', this.rnd) }; // 撿到才擲數值
    if (this.inv.add(it.def.id, it.n, extra)) {
      this.items = this.items.filter((x) => x !== it);
      const rar = rarityOf({ id: it.def.id, rar: extra.rar });
      this.msg(`獲得 ${RANK[rar] ? '【' + RAR[rar].name + '】' : ''}${it.def.name}${it.n > 1 ? ' ×' + it.n : ''}`, RANK[rar] >= 2 ? 'quest' : 'item');
      this.audio.sfx('pickup');
      this.ev.emit('pickup', it.def.id);
      this.save.saveSoon();
    } else this.msg('負重已滿，無法撿取！', 'warn');
  }
  /** 玩家死亡：怪物脫離；非初心者扣 1% Base/Job 經驗；按鈕回到儲存點 */
  onPlayerDeath() {
    const p = this.player, ch = p.ch;
    p.chase = null; this.skills.interrupt(); this.skills.targeting = null;
    for (const m of this.monsters) if (m.aggroOn === p) giveUp(m, this);
    let lostB = 0, lostJ = 0;
    if (ch.job !== 'novice') {
      lostB = Math.min(ch.baseExp, Math.floor(expNeed(ch.baseLv) * 0.01));
      lostJ = Math.min(ch.jobExp, Math.floor(jobExpNeed(ch.job, ch.jobLv) * 0.01) || 0);
      ch.baseExp -= lostB; ch.jobExp -= lostJ;
    }
    this.msg(ch.job === 'novice' ? '你倒下了……（初心者不會損失經驗）' : `你倒下了……損失經驗 ${lostB} / 職業經驗 ${lostJ}`, 'warn');
    this.audio.sfx('death');
    this.ui.showDeath(lostB, lostJ);
    this.ev.emit('stats');
  }
  respawn() {
    const p = this.player;
    p.state = 'idle'; p.deadT = 0; p.recalc();
    p.hp = Math.max(1, Math.floor(p.maxHp * 0.5)); p.sp = Math.floor(p.maxSp * 0.5);
    this.combatT = 0;
    this.warpTo(this.savePoint.map, this.savePoint.x, this.savePoint.y);
    this.ev.emit('stats');
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
    for (const t of this.telegraphs) { // 預警區：紅色，越接近出招越亮
      if (t.t < 0) continue;
      const k = Math.min(1, t.t / t.dur), flash = k > 0.75 && Math.floor(this.time * 14) % 2 === 0;
      if (t.kind === 'circle') {
        const x = Math.round(isoX(t.x, t.y) - L), y = Math.round(isoY(t.x, t.y) - T);
        c.globalAlpha = 0.18 + k * 0.32; c.fillStyle = t.color; c.beginPath(); c.ellipse(x, y, t.r * 45.25, t.r * 22.6, 0, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 0.45 + k * 0.4; c.fillStyle = flash ? '#ffd0c0' : '#ff5a40'; c.beginPath(); c.ellipse(x, y, t.r * 45.25 * k, t.r * 22.6 * k, 0, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1; c.strokeStyle = flash ? '#ffffff' : '#ff2a1a'; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, t.r * 45.25, t.r * 22.6, 0, 0, Math.PI * 2); c.stroke();
      } else {
        const dx = t.x2 - t.x, dy = t.y2 - t.y, len = Math.hypot(dx, dy) || 1, nx = (-dy / len) * (t.width / 2), ny = (dx / len) * (t.width / 2);
        const P = (wx: number, wy: number): [number, number] => [Math.round(isoX(wx, wy) - L), Math.round(isoY(wx, wy) - T)];
        const poly = (f: number) => { const a = P(t.x + nx, t.y + ny), b = P(t.x - nx, t.y - ny), cc = P(t.x + dx * f - nx, t.y + dy * f - ny), d = P(t.x + dx * f + nx, t.y + dy * f + ny); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(d[0], d[1]); c.lineTo(cc[0], cc[1]); c.lineTo(b[0], b[1]); c.closePath(); };
        c.globalAlpha = 0.18 + k * 0.2; c.fillStyle = t.color; poly(1); c.fill();
        c.globalAlpha = 0.5 + k * 0.4; c.fillStyle = flash ? '#ffd0c0' : '#ff5a40'; poly(k); c.fill();
        c.globalAlpha = 1; c.strokeStyle = flash ? '#ffffff' : '#ff2a1a'; c.lineWidth = 3; poly(1); c.stroke();
      }
      c.globalAlpha = 1;
    }
    // 可見範圍（等角像素）
    const mx0 = L - 160, mx1 = L + W + 160, my0 = T - 60, my1 = T + H + 240;
    const dl = this.dl; dl.reset();
    // 物件淡出：玩家在後方且重疊
    const pxs = isoX(p.x, p.y), pys = isoY(p.x, p.y);
    this.frameId++;
    const gx0 = Math.floor(mx0 / 512), gx1 = Math.floor(mx1 / 512), gy0 = Math.floor(my0 / 512), gy1 = Math.floor(my1 / 512);
    const vis: PropR[] = [];
    for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
      const a = this.propGrid.get((gx + 1000) * 4096 + gy + 1000); if (!a) continue;
      for (const pr of a) if (this.seen.get(pr) !== this.frameId) { this.seen.set(pr, this.frameId); vis.push(pr); }
    }
    let drawnProps = 0;
    for (const pr of vis) {
      const w = pr.spr.c.width, h = pr.spr.c.height;
      if (pr.dx + w < mx0 || pr.dx > mx1 || pr.dy + h < my0 || pr.dy > my1) continue;
      if (pr.def.tall) {
        const pp = pr.p;
        const behind = pr.strips ? !(p.x >= pp.x + pp.w || p.y >= pp.y + pp.h) : p.x + p.y < pr.depth;
        const overlap = pxs + 22 > pr.dx && pxs - 22 < pr.dx + w && pys > pr.dy && pys - 120 < pr.dy + h - 8;
        const target = behind && overlap ? 0.42 : 1;
        pr.alpha += (target - pr.alpha) * Math.min(1, dt * 10);
      }
      drawPropShadow(c, pr, L, T); drawnProps++;
      if (pr.strips) for (let i = 0; i < pr.strips.length; i++) dl.add(pr.strips[i].key, K_STRIP, pr, i);
      else dl.add(pr.depth, K_PROP, pr);
    }
    for (const it of this.items) {
      const ex = isoX(it.ox, it.oy), ey = isoY(it.ox, it.oy);
      if (ex < mx0 || ex > mx1 || ey < my0 || ey > my1) continue;
      const sh = shadowSprite(9, 4); c.drawImage(sh, Math.round(ex - L - sh.width / 2), Math.round(ey - T - sh.height / 2));
      dl.add(it.oy + it.ox - 0.05, K_ITEM, it);
    }
    for (const pr of this.projectiles) if (pr.t >= 0) dl.add(pr.ix(alpha) + pr.iy(alpha) + 0.02, K_PROJ, pr);
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
      const aura = e === this.player && !e.dead ? (this.player.look && this.player.look.aura) : null;
      if (aura) { // 三轉專屬光環：腳下發光的橢圓＋脈動
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 3), ax0 = Math.round(ex - L), ay0 = Math.round(ey - T);
        c.save(); c.globalCompositeOperation = 'lighter';
        const gr = c.createRadialGradient(ax0, ay0, 2, ax0, ay0, 46); gr.addColorStop(0, aura + 'aa'); gr.addColorStop(0.6, aura + '40'); gr.addColorStop(1, aura + '00');
        c.fillStyle = gr; c.globalAlpha = 0.55 + 0.25 * pulse; c.beginPath(); c.ellipse(ax0, ay0, 46 + pulse * 3, 20 + pulse * 1.5, 0, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 0.8; c.strokeStyle = aura; c.lineWidth = 1; c.beginPath(); c.ellipse(ax0, ay0, 30 + pulse * 2, 12 + pulse, 0, 0, Math.PI * 2); c.stroke();
        c.restore();
      }
      dl.add(e.iy(alpha) + e.ix(alpha), K_ACTOR, e);
    }
    dl.sort();
    for (let i = 0; i < dl.n; i++) {
      const d = dl.items[i];
      if (d.kind === K_ACTOR) this.drawActor(c, d.ref, L, T);
      else if (d.kind === K_ITEM) this.drawItem(c, d.ref, L, T);
      else if (d.kind === K_PROJ) this.drawProjectile(c, d.ref, L, T);
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
    if (this.showFps) {
      c.font = '11px monospace'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(W - 230, H - 70, 224, 56);
      c.fillStyle = '#8f8'; c.fillText(`FPS ${this.loop.fps}  scale ${this.r.scale}x  ${W}x${H}`, W - 224, H - 66);
      c.fillText(`物件 ${drawnProps}/${this.props.length}  實體 ${this.entities.length}  地板塊 ${this.ground.chunkCount}`, W - 224, H - 52);
      c.fillText(`粒子 ${this.fx.parts.activeCount}/${this.fx.parts.items.length}  飄字 ${this.fx.texts.activeCount}/${this.fx.texts.items.length}`, W - 224, H - 38);
      c.fillText(`繪製清單 ${dl.n}  投射物 ${this.projectiles.length}`, W - 224, H - 24);
    }
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
    if (e.state === 'sit') { // 坐姿：裁掉腿部、身體下移（sheet 規格維持 10 格）
      const cut = 28;
      c.drawImage(s.c, sx, sy, s.fw, s.fh - cut, x, y + cut - 6, s.fw, s.fh - cut);
      return;
    }
    if (e.dead) c.globalAlpha = e === this.player ? 0.45 : Math.max(0, 1 - e.deadT);
    c.drawImage(s.c, sx, sy, s.fw, s.fh, x, y, s.fw, s.fh);
    if (e instanceof Monster && e.frozenT > 0) { c.globalAlpha = 0.45; c.drawImage(whiteOf(s), sx, sy, s.fw, s.fh, x, y, s.fw, s.fh); c.globalAlpha = 0.25; c.fillStyle = '#60b0ff'; c.fillRect(x + s.ax + e.bbox.x0, y + s.ay + e.bbox.y0, e.bbox.x1 - e.bbox.x0, e.bbox.y1 - e.bbox.y0); c.globalAlpha = 1; }
    if (e instanceof Monster && e.boss && !e.dead) { // Boss：狂暴時身體變紅；蓄力時閃白並微微顫動
      const b = e.boss;
      if (b.phase > 0) { c.globalAlpha = (b.phase === 1 ? 0.32 : 0.48) * (0.85 + 0.15 * Math.sin(this.time * 7)); c.drawImage(tintOf(s, '#ff1a10'), sx, sy, s.fw, s.fh, x, y, s.fw, s.fh); c.globalAlpha = 1; }
      if (b.state === 'windup' && Math.floor(this.time * 16) % 2 === 0) { c.globalAlpha = 0.55; c.drawImage(whiteOf(s), sx, sy, s.fw, s.fh, x, y, s.fw, s.fh); c.globalAlpha = 1; }
    }
    if (e.flashT > 0) { // 受擊閃白
      c.globalAlpha = Math.min(1, e.flashT / 0.12) * 0.85 * (e.dead ? Math.max(0, 1 - e.deadT) : 1);
      c.drawImage(whiteOf(s), sx, sy, s.fw, s.fh, x, y, s.fw, s.fh);
    }
    c.globalAlpha = 1;
    if (this.hover === e && !e.dead) { // 滑鼠移上：輕微描亮
      c.globalAlpha = 0.18; c.drawImage(whiteOf(s), sx, sy, s.fw, s.fh, x, y, s.fw, s.fh); c.globalAlpha = 1;
    }
  }
  drawProjectile(c: CanvasRenderingContext2D, pr: Projectile, L: number, T: number) {
    const a = this.alpha;
    const x = Math.round(isoX(pr.ix(a), pr.iy(a)) - L), y = Math.round(isoY(pr.ix(a), pr.iy(a)) - T - (pr.pz + (pr.z - pr.pz) * a));
    switch (pr.pk) {
      case 'arrow': case 'charge': {
        const tx = isoX(pr.target.x, pr.target.y) - L, ty = isoY(pr.target.x, pr.target.y) - T - pr.tz;
        const ang = Math.atan2(ty - y, tx - x), len = pr.pk === 'charge' ? 22 : 16;
        c.strokeStyle = '#2a1a10'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - Math.cos(ang) * len, y - Math.sin(ang) * len); c.lineTo(x, y); c.stroke();
        c.strokeStyle = pr.pk === 'charge' ? '#ffb060' : '#d8c8a0'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - Math.cos(ang) * len, y - Math.sin(ang) * len); c.lineTo(x, y); c.stroke();
        c.fillStyle = '#ffffff'; c.fillRect(x - 1, y - 1, 3, 3);
        if (pr.pk === 'charge') this.fx.glow(pr.x, pr.y, pr.z, '#ffb060', 0.25, 2, 0);
        break;
      }
      case 'orb': case 'soul': {
        const col = pr.pk === 'soul' ? '#d8a0ff' : '#a0c8ff';
        c.globalAlpha = 0.4; c.fillStyle = col; c.fillRect(x - 7, y - 7, 14, 14); c.globalAlpha = 1;
        c.fillStyle = col; c.fillRect(x - 4, y - 4, 8, 8); c.fillStyle = '#ffffff'; c.fillRect(x - 2, y - 2, 4, 4);
        if (Math.random() < 0.6) this.fx.glow(pr.x, pr.y, pr.z, col, 0.3, 1, 0);
        break;
      }
      case 'fire': case 'ice': {
        const col = pr.pk === 'fire' ? ['#e03a10', '#ff9a30', '#fff0a0'] : ['#3a8ae0', '#a0e0ff', '#ffffff'];
        c.fillStyle = col[0]; c.fillRect(x - 5, y - 22, 10, 26); c.fillStyle = col[1]; c.fillRect(x - 3, y - 14, 6, 16); c.fillStyle = col[2]; c.fillRect(x - 2, y - 4, 4, 6);
        this.fx.glow(pr.x, pr.y, pr.z + 20, col[1], 0.3, 2, 30);
        break;
      }
    }
  }
  drawItem(c: CanvasRenderingContext2D, it: GroundItem, L: number, T: number) {
    const ic = iconCanvas(it.def.icon.k, it.def.icon.c);
    const x = Math.round(isoX(it.ox, it.oy) - L - 12), y = Math.round(isoY(it.ox, it.oy) - T - 20 - it.z);
    const rar = rarityOf({ id: it.def.id, rar: it.extra.rar }), rk = RANK[rar], col = RAR[rar].color;
    if (rk >= RANK[LOOT.fx.pillarFrom] && it.t > 0.4) { // 同色光柱
      const gx = Math.round(isoX(it.ox, it.oy) - L), gy = Math.round(isoY(it.ox, it.oy) - T), hgt = rk >= RANK.legend ? 150 : 100;
      const pul = 0.25 + Math.sin(this.time * 4) * 0.08;
      c.globalAlpha = pul; c.fillStyle = col; c.fillRect(gx - 7, gy - hgt, 14, hgt); c.globalAlpha = pul + 0.25; c.fillRect(gx - 3, gy - hgt, 6, hgt);
      c.globalAlpha = 0.6; c.beginPath(); c.ellipse(gx, gy, 18, 8, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
      if (Math.random() < 0.25) this.fx.glow(it.x, it.y, Math.random() * hgt * 0.7, col, 0.8, 1, 50);
    }
    if (it.life - it.t < 5 && Math.floor(it.t * 6) % 2) c.globalAlpha = 0.4;
    if (rk >= 1) { c.fillStyle = '#10101a'; c.fillRect(x - 3, y - 3, 30, 30); c.fillStyle = col; c.fillRect(x - 2, y - 2, 28, 28); c.fillStyle = 'rgba(16,16,26,.75)'; c.fillRect(x - 1, y - 1, 26, 26); }
    c.drawImage(ic, x, y);
    c.globalAlpha = 1;
    // 名稱：精良以上一直顯示且用稀有度色；普通只在滑鼠移上時顯示（低調）
    if (rk >= 1 || this.hover === it) this.label(c, (rk >= 1 ? `【${RAR[rar].name}】` : '') + it.def.name + (it.n > 1 ? ' ×' + it.n : ''), x + 12, y - 18, col);
  }
  drawOverhead(c: CanvasRenderingContext2D, e: Actor, L: number, T: number) {
    if (e.dead) return;
    const a = this.alpha;
    const x = Math.round(isoX(e.ix(a), e.iy(a)) - L), y = Math.round(isoY(e.ix(a), e.iy(a)) - T);
    const mvp = e instanceof Monster && e.isMvp;
    const showBar = e === this.player || e.hp < e.maxHp || mvp;
    if (mvp) this.label(c, '【MVP】' + e.name + (e instanceof Monster && e.boss && e.boss.phase > 0 ? '（狂暴）' : ''), x, y + 22, '#ff7060');
    if (e instanceof Monster && e.boss && e.boss.state === 'windup' && e.boss.move) this.label(c, e.boss.move.name + '！', x, y + e.bbox.y0 - 16, '#ff6a4a');
    if (showBar) { // RO 式：血條在腳下
      const w = e === this.player ? 60 : mvp ? 90 : 44, bx = x - w / 2, by = y + 8;
      c.fillStyle = '#1a1020'; c.fillRect(bx - 1, by - 1, w + 2, e === this.player ? 8 : 5);
      c.fillStyle = '#402020'; c.fillRect(bx, by, w, 3);
      const k = Math.max(0, e.hp / e.maxHp);
      c.fillStyle = k > 0.25 ? '#3ce060' : '#ff5040'; c.fillRect(bx, by, Math.round(w * k), 3);
      if (e === this.player && e.maxSp > 0) { c.fillStyle = '#202040'; c.fillRect(bx, by + 3, w, 3); c.fillStyle = '#4090ff'; c.fillRect(bx, by + 3, Math.round(w * Math.max(0, e.sp / e.maxSp)), 3); }
    }
    if (e === this.player) {
      const cs = this.skills.cast;
      if (cs) { // 詠唱條（頭上）
        const top = y + e.bbox.y0 - 14, w = 64, k = Math.min(1, cs.t / cs.dur);
        c.fillStyle = '#1a1020'; c.fillRect(x - w / 2 - 1, top - 1, w + 2, 7);
        c.fillStyle = '#3a3a5a'; c.fillRect(x - w / 2, top, w, 5);
        c.fillStyle = '#7af0ff'; c.fillRect(x - w / 2, top, Math.round(w * k), 5);
        c.fillStyle = '#ffffff'; c.fillRect(x - w / 2, top, Math.round(w * k), 1);
        this.label(c, DB.skill[cs.id].name, x, top - 16, '#c8f0ff');
      } else if (this.shout) this.label(c, this.shout.text, x, y + e.bbox.y0 - 22 - (1.1 - this.shout.t) * 10, '#ffd860');
    }
    if (e instanceof Monster && e.frozenT > 0) { /* 冰凍圖示由 drawActor 處理 */ }
    if (e instanceof Merc) { const lm = Math.max(0, Math.ceil(this.mercs.left / 60)); this.label(c, `${e.name}（剩 ${lm} 分）`, x, y + 14, '#ffe8a0'); }
    if (e instanceof Npc) {
      this.label(c, e.name, x, y + 14, '#a8e8ff');
      const mk = this.quests.mark(e.def.id);
      if (mk) { const img = textImage(mk, mk === '?' ? '#60ff80' : '#ffe040', 3); c.drawImage(img, Math.round(x - img.width / 2), Math.round(y + e.bbox.y0 - 30 + Math.sin(this.time * 4) * 3)); }
      return;
    }
    if (this.hover === e && !mvp) this.label(c, e instanceof Monster ? `${e.name} Lv${e.def.lv}` : e.name, x, y + 22, e instanceof Monster ? '#ffffff' : '#a0e0ff');
  }
  label(c: CanvasRenderingContext2D, text: string, x: number, y: number, color = '#fff') {
    c.font = '12px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'top';
    c.fillStyle = '#000'; for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) c.fillText(text, x + ox, y + oy);
    c.fillStyle = color; c.fillText(text, x, y);
  }
}
