import { Actor } from './Actor';
import type { MonsterDef } from '../data';
import { monsterSheet } from '../render/SpriteFactory';
import type { BossState } from '../systems/BossFight';

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
  provokeT = 0; provokeDef = 0;
  frozenT = 0;
  boss: BossState | null = null;   // Boss 戰鬥狀態（只有 data/bossfights.json 有設定的 Boss 才會用到）
  slide: { fx: number; fy: number; tx: number; ty: number; t: number; dur: number } | null = null;
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
