import { Actor } from './Actor';
import type { NpcDef } from '../data';
import { humanSheet } from '../render/SpriteFactory';
export class Npc extends Actor {
  kind = 'npc' as const;
  baseDir: number;
  talkT = 0;
  fade?: number; // 主線演出暫時出場的角色淡出用（1→0）
  constructor(public def: NpcDef, x: number, y: number, dir = 0) {
    super(x, y);
    this.name = def.name;
    this.sheet = humanSheet(def.look);
    this.dir = this.baseDir = dir;
    this.animT = Math.random() * 3;
  }
}
