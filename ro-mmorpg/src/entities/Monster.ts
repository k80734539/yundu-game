import { Actor } from './Actor';
import type { MonsterDef } from '../data';
import { monsterSheet } from '../render/SpriteFactory';

export type AIState = 'idle' | 'wander' | 'chase' | 'attack' | 'return';
export class Monster extends Actor {
  kind = 'monster' as const;
  ai: AIState = 'idle';
  aiT = 0;
  homeX: number; homeY: number;
  repathT = 0;
  spawnIdx = -1;
  aggroOn: Actor | null = null;
  lastHitBy = 0;
  isMvp: boolean;
  skillCd = 2;
  summoned = false;
  announcedFight = false;
  constructor(public def: MonsterDef, x: number, y: number) {
    super(x, y);
    this.homeX = x; this.homeY = y;
    this.name = def.name;
    this.sheet = monsterSheet(def.look, def.frame);
    this.maxHp = this.hp = def.hp;
    this.speed = def.speed;
    this.isMvp = !!def.mvp;
    this.dir = Math.floor(Math.random() * 4);
    this.animT = Math.random() * 3;
    this.aiT = Math.random() * 2;
  }
}
