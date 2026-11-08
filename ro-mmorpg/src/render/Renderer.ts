/** canvas 尺寸管理：devicePixelRatio、整數倍縮放、關閉平滑 */
export class Renderer {
  ctx: CanvasRenderingContext2D;
  /** 邏輯（遊戲像素）可見寬高 */
  w = 960; h = 540;
  /** 遊戲像素 → 實際像素的整數倍率 */
  scale = 1;
  zoomBias = 0;
  dpr = 1;
  constructor(public canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.dpr = dpr;
    const cw = window.innerWidth, ch = window.innerHeight;
    const bw = Math.round(cw * dpr), bh = Math.round(ch * dpr);
    this.canvas.width = bw; this.canvas.height = bh;
    this.canvas.style.width = cw + 'px'; this.canvas.style.height = ch + 'px';
    // 讓邏輯畫面寬約 640~1400 遊戲像素；只用整數倍
    const target = Math.max(640, Math.min(1400, cw));
    let s = Math.max(1, Math.floor(bw / target));
    // 手機：依短邊決定整數倍率，讓邏輯畫面至少約 520×400，角色不會大到擋住畫面
    const phone = window.matchMedia?.('(pointer: coarse)').matches || cw < 820 || ch < 500;
    if (phone) s = Math.max(1, Math.floor(Math.min(bw / 520, bh / 400)));
    s = Math.max(1, s + this.zoomBias);
    this.scale = s;
    this.w = Math.ceil(bw / s); this.h = Math.ceil(bh / s);
    this.ctx.imageSmoothingEnabled = false;
  }
  setZoom(bias: number) { this.zoomBias = Math.max(-2, Math.min(2, bias)); this.resize(); }
  begin() {
    const c = this.ctx;
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    c.imageSmoothingEnabled = false;
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }
}
