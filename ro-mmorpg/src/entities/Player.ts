import { Actor } from './Actor';
import type { Look } from '../data';
import { DB } from '../data';
import { humanSheet } from '../render/SpriteFactory';
import { CHAR_SHEETS } from '../render/CharSheets';
import { CharData, Derived, derive, EquipInfo } from '../systems/Stats';

export function newChar(name = '冒險者'): CharData {
  return { name, job: 'novice', baseLv: 1, jobLv: 1, baseExp: 0, jobExp: 0, stats: { str: 5, agi: 5, vit: 5, int: 5, dex: 5, luk: 5 }, statPts: 24, skillPts: 0, skills: {}, zeny: 100 };
}

export class Player extends Actor {
  kind = 'player' as const;
  look!: Look;
  ch: CharData;
  d!: Derived;
  buffs: Record<string, number> = {};
  /** 玩家點了怪物後的追擊目標；null 時只是走路 */
  chase: Actor | null = null;
  repathT = 0;
  equipsFn: () => EquipInfo[] = () => [];
  constructor(x: number, y: number, ch?: CharData) {
    super(x, y);
    this.ch = ch || newChar();
    this.speed = 5;
    this.refreshLook();
    this.recalc(true);
  }
  get job() { return DB.job[this.ch.job]; }
  refreshLook(weapon?: string) {
    const L: Look = { ...this.job.look, weapon: weapon ?? this.weaponType() };
    if (L.style === 'knight' && this.equipsFn().some((e) => e.item.slot === 'shield')) L.shield = true; // 劍士系：有裝盾就畫出來
    if (CHAR_SHEETS[this.job.id]) L.sheet = CHAR_SHEETS[this.job.id]; // 有美術圖的職業用圖片精靈圖
    if (JSON.stringify(L) !== JSON.stringify(this.look)) { this.look = L; this.sheet = humanSheet(L); }
  }
  weaponType(): string { const w = this.equipsFn().find((e) => e.item.slot === 'weapon'); return w?.item.wtype || 'none'; }
  /** 重新計算衍生數值；full=true 時補滿 HP/SP */
  recalc(full = false) {
    this.name = this.ch.name;
    this.d = derive(this.ch, this.equipsFn(), this.buffs);
    this.maxHp = this.d.maxHp; this.maxSp = this.d.maxSp;
    this.speed = 5 * (1 + 0.03 * (this.ch.skills.riding || 0) + this.d.move / 100); // 騎乘＋移動速度詞條
    if (full) { this.hp = this.maxHp; this.sp = this.maxSp; }
    this.hp = Math.min(this.hp, this.maxHp); this.sp = Math.min(this.sp, this.maxSp);
  }
}
