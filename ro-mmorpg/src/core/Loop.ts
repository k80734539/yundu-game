/** requestAnimationFrame + deltaTime，固定 60Hz 邏輯更新，剩餘時間做插值 */
export class Loop {
  static readonly STEP = 1 / 60;
  private acc = 0;
  private last = 0;
  running = false;
  fps = 60;
  /** 繪製幀率上限（邏輯更新永遠 60Hz）。高更新率螢幕（90/120Hz）也不會畫超過這個數字 */
  renderFps = 60;
  renders = 0;                       // 累計繪製次數（效能量測用）
  private lastRender = 0; private renderDt = 0;
  private fpsAcc = 0; private fpsN = 0;
  constructor(private update: (dt: number) => void, private render: (alpha: number, dt: number) => void) {}
  start() {
    this.running = true;
    this.last = performance.now();
    const tick = (now: number) => {
      if (!this.running) return;
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (dt > 0.25) dt = 0.25; // 分頁切走回來時避免螺旋
      this.acc += dt;
      let n = 0;
      while (this.acc >= Loop.STEP && n < 8) { this.update(Loop.STEP); this.acc -= Loop.STEP; n++; }
      if (n >= 8) this.acc = 0;
      this.renderDt += dt;
      if (now - this.lastRender >= 1000 / this.renderFps - 2) {
        this.lastRender = now; this.render(this.acc / Loop.STEP, this.renderDt); this.renderDt = 0; this.renders++;
        this.fpsN++;
      }
      this.fpsAcc += dt;
      if (this.fpsAcc >= 1) { this.fps = Math.round(this.fpsN / this.fpsAcc); this.fpsAcc = 0; this.fpsN = 0; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
