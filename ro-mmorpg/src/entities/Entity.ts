let NEXT_ID = 1;
export type Kind = 'player' | 'monster' | 'npc' | 'item' | 'projectile';
/** 所有實體的基底：位置以格為單位的浮點數，上一幀位置用來插值 */
export abstract class Entity {
  id = NEXT_ID++;
  x = 0; y = 0; px = 0; py = 0;
  remove = false;
  abstract kind: Kind;
  constructor(x: number, y: number) { this.x = this.px = x; this.y = this.py = y; }
  get depth() { return this.x + this.y; }
  savePrev() { this.px = this.x; this.py = this.y; }
  ix(a: number) { return this.px + (this.x - this.px) * a; }
  iy(a: number) { return this.py + (this.y - this.py) * a; }
}
