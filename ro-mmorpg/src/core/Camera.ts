import { isoX, isoY } from '../render/iso';
/** 相機：以等角像素為單位，lerp 平滑跟隨、震動 */
export class Camera {
  x = 0; y = 0;           // 畫面中心對應的等角像素
  shakeT = 0; shakeMag = 0;
  ox = 0; oy = 0;         // 本幀震動偏移
  follow(wx: number, wy: number, dt: number, snap = false) {
    const tx = isoX(wx, wy), ty = isoY(wx, wy) - 40;
    if (snap) { this.x = tx; this.y = ty; this.anchor(isoX(wx, wy), isoY(wx, wy)); return; }
    const k = 1 - Math.pow(0.0008, dt); // 與幀率無關的 lerp
    this.x += (tx - this.x) * k; this.y += (ty - this.y) * k;
    if (Math.abs(tx - this.x) < 0.05) this.x = tx;
    if (Math.abs(ty - this.y) < 0.05) this.y = ty;
  }
  shake(mag: number, t = 0.25) { if (mag >= this.shakeMag || this.shakeT <= 0) { this.shakeMag = mag; this.shakeT = t; } }
  updateShake(dt: number) {
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const m = this.shakeMag * Math.max(0, this.shakeT) / 0.25;
      this.ox = Math.round((Math.random() * 2 - 1) * m); this.oy = Math.round((Math.random() * 2 - 1) * m);
    } else { this.ox = this.oy = 0; this.shakeMag = 0; }
  }
  private bx = 0; private by = 0; private offX = 0; private offY = 0;
  /** 每幀繪製前呼叫：把「相機相對主角的偏移」取整數，主角與背景就不會各自取整而抖動 */
  anchor(ipx: number, ipy: number) {
    this.bx = Math.round(ipx); this.by = Math.round(ipy - 40);
    this.offX = Math.round(this.x - ipx); this.offY = Math.round(this.y - (ipy - 40));
  }
  /** 左上角（整數），世界像素 → 螢幕 = iso - left */
  left(w: number) { return this.bx + this.offX - Math.round(w / 2) - this.ox; }
  top(h: number) { return this.by + this.offY - Math.round(h / 2) - this.oy; }
}
