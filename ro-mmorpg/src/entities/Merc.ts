import { Actor } from './Actor';
import type { MercType } from '../data';
import { humanSheet } from '../render/SpriteFactory';
/** 傭兵：跟著玩家的輔助角色（不會被怪物攻擊，契約到期就離開） */
export class Merc extends Actor {
  kind = 'merc' as const;
  cd1 = 0; cd2 = 0; cd3 = 0; pathT = 0;
  constructor(public type: MercType, x: number, y: number) {
    super(x, y);
    this.name = type.name;
    this.sheet = humanSheet(type.look);
    this.animT = Math.random() * 3;
    this.hp = this.maxHp = 1;
  }
}
