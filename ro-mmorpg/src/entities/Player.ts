import { Actor } from './Actor';
import type { Look } from '../data';
import { humanSheet } from '../render/SpriteFactory';

export class Player extends Actor {
  kind = 'player' as const;
  look: Look;
  /** 玩家點了怪物後的追擊目標；null 時只是走路 */
  chase: Actor | null = null;
  repathT = 0;
  constructor(x: number, y: number, look: Look) {
    super(x, y);
    this.look = look;
    this.sheet = humanSheet(look);
    this.speed = 5;
    this.name = '冒險者';
  }
  setLook(l: Look) { this.look = l; this.sheet = humanSheet(l); }
}
