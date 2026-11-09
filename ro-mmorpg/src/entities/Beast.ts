import { Actor } from './Actor';
import type { MercType } from '../data';
import { monsterSheet } from '../render/SpriteFactory';
/** 馴獸師的戰獸：跟著玩家，衝上去咬玩家正在打的怪（不會被攻擊） */
export class Beast extends Actor {
  kind = 'merc' as const;
  cd = 0; pathT = 0;
  constructor(public cfg: NonNullable<MercType['beast']>, x: number, y: number) {
    super(x, y);
    this.name = cfg.name;
    this.sheet = monsterSheet(cfg.look, cfg.frame);
    this.animT = Math.random() * 3;
    this.hp = this.maxHp = 1;
  }
}
