import { hex, css, shade, makeCanvas, ctx2d, crispOutline, pxEllipse, RGB } from './pixel';

/** 24×24 道具／技能圖示，程式繪製，1px 外框、左上光源 */
const cache = new Map<string, HTMLCanvasElement>();
export function iconCanvas(k: string, color = '#ccc', c2 = ''): HTMLCanvasElement {
  const key = k + color + c2;
  let cv = cache.get(key); if (cv) return cv;
  cv = makeCanvas(24, 24); const c = ctx2d(cv);
  const col = hex(color); const L = css(shade(col, 0.35)), D = css(shade(col, -0.35)), B = css(col);
  const E = (x: number, y: number, rx: number, ry: number, base: RGB) => { c.fillStyle = css(shade(base, -0.3)); pxEllipse(c, x, y, rx, ry); c.fillStyle = css(base); pxEllipse(c, x - rx * 0.12, y - ry * 0.14, rx * 0.84, ry * 0.82); c.fillStyle = css(shade(base, 0.4)); pxEllipse(c, x - rx * 0.4, y - ry * 0.4, Math.max(1, rx * 0.28), Math.max(1, ry * 0.25)); };
  const R = (x: number, y: number, w: number, h: number, s: string) => { c.fillStyle = s; c.fillRect(x, y, w, h); };
  const line = (x0: number, y0: number, x1: number, y1: number, w: number, s: string) => { c.strokeStyle = s; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
  switch (k) {
    case 'potion': R(10, 3, 4, 4, '#c8a070'); R(10, 3, 2, 4, '#e0c090'); E(12, 15, 7, 7, col); R(8, 11, 2, 3, '#fff'); break;
    case 'apple': E(12, 14, 7, 7, col); R(12, 4, 1, 4, '#5a3a1a'); E(15, 6, 3, 1.5, hex('#4ab040')); break;
    case 'carrot': c.fillStyle = B; c.beginPath(); c.moveTo(6, 8); c.lineTo(18, 20); c.lineTo(10, 6); c.fill(); R(8, 9, 2, 1, D); R(11, 13, 2, 1, D); line(9, 6, 7, 2, 2, '#4ab040'); line(9, 6, 12, 2, 2, '#4ab040'); break;
    case 'meat': line(15, 15, 20, 20, 3, '#f0e8d8'); E(11, 11, 7, 6, col); R(8, 9, 3, 2, L); break;
    case 'herb': for (let i = 0; i < 3; i++) E(8 + i * 4, 10 + (i % 2) * 3, 3, 6, col); line(12, 20, 12, 14, 2, '#3a7a2a'); break;
    case 'wing': E(8, 12, 6, 8, col); E(16, 12, 6, 8, shade(col, -0.1)); R(11, 6, 2, 12, '#5a4a3a'); break;
    case 'blob': E(12, 15, 8, 6, col); R(8, 12, 3, 2, '#fff'); break;
    case 'fluff': E(9, 13, 5, 5, col); E(15, 12, 5, 5, col); E(12, 9, 5, 5, col); break;
    case 'feather': line(6, 20, 18, 4, 2, '#8a6a3a'); for (let i = 0; i < 6; i++) { line(8 + i * 2, 17 - i * 2.4, 13 + i * 2, 18 - i * 2.4, 2, B); line(8 + i * 2, 17 - i * 2.4, 6 + i * 2, 12 - i * 2.4, 2, L); } break;
    case 'spore': E(12, 10, 8, 5, col); R(10, 13, 4, 7, '#f0e0c0'); R(8, 8, 2, 2, '#fff'); R(14, 7, 2, 2, '#fff'); break;
    case 'petal': for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; E(12 + Math.cos(a) * 5, 12 + Math.sin(a) * 5, 4, 4, col); } E(12, 12, 3, 3, hex('#f8e070')); break;
    case 'stinger': c.fillStyle = B; c.beginPath(); c.moveTo(5, 19); c.lineTo(19, 5); c.lineTo(9, 21); c.fill(); R(6, 16, 3, 3, '#3a3a3a'); break;
    case 'shell': E(12, 13, 8, 7, col); for (let i = -2; i <= 2; i++) line(12, 20, 12 + i * 3.5, 7, 1, D); break;
    case 'claw': E(10, 13, 6, 7, col); E(16, 9, 4, 5, col); R(13, 10, 2, 4, D); break;
    case 'scale': for (let i = 0; i < 3; i++) E(8 + i * 4, 9 + i * 4, 5, 4, i % 2 ? shade(col, -0.1) : col); break;
    case 'batwing': c.fillStyle = B; c.beginPath(); c.moveTo(3, 8); c.lineTo(12, 12); c.lineTo(21, 8); c.lineTo(18, 16); c.lineTo(12, 14); c.lineTo(6, 16); c.fill(); break;
    case 'tooth': c.fillStyle = B; c.beginPath(); c.moveTo(8, 5); c.lineTo(16, 5); c.lineTo(13, 20); c.lineTo(11, 20); c.fill(); R(9, 6, 2, 6, L); break;
    case 'core': E(12, 12, 7, 7, hex('#6a6058')); E(12, 12, 4, 4, col); break;
    case 'bone': line(7, 17, 17, 7, 4, B); E(6, 16, 3, 3, col); E(8, 19, 3, 3, col); E(16, 5, 3, 3, col); E(19, 8, 3, 3, col); break;
    case 'bandage': E(12, 12, 8, 8, col); E(12, 12, 3, 3, hex('#8a8070')); line(5, 9, 19, 9, 1, D); line(5, 15, 19, 15, 1, D); break;
    case 'soul': E(12, 13, 6, 7, col); c.fillStyle = B; c.beginPath(); c.moveTo(8, 10); c.lineTo(12, 2); c.lineTo(16, 10); c.fill(); R(10, 12, 2, 2, '#2a2050'); R(13, 12, 2, 2, '#2a2050'); break;
    case 'ore': E(12, 14, 8, 6, col); R(7, 11, 3, 2, '#fff'); R(14, 15, 2, 2, D); break;
    case 'crystal': c.fillStyle = D; c.beginPath(); c.moveTo(12, 2); c.lineTo(18, 9); c.lineTo(12, 22); c.lineTo(6, 9); c.fill(); c.fillStyle = L; c.beginPath(); c.moveTo(12, 2); c.lineTo(12, 22); c.lineTo(6, 9); c.fill(); break;
    case 'crown': c.fillStyle = B; c.beginPath(); c.moveTo(4, 18); c.lineTo(4, 7); c.lineTo(8, 12); c.lineTo(12, 5); c.lineTo(16, 12); c.lineTo(20, 7); c.lineTo(20, 18); c.fill(); R(11, 12, 3, 3, '#e04a4a'); R(4, 16, 16, 2, D); break;
    case 'dagger': line(5, 19, 9, 15, 3, '#6a4428'); line(9, 15, 18, 6, 4, B); line(9, 14, 17, 6, 1, '#fff'); line(7, 12, 12, 17, 2, '#e0b040'); break;
    case 'sword': line(4, 20, 7, 17, 3, '#6a4428'); line(7, 17, 20, 4, 4, B); line(7, 16, 19, 4, 1, '#fff'); line(4, 13, 11, 20, 2, '#e0b040'); break;
    case 'staff': line(5, 21, 16, 8, 3, '#8a5a30'); E(17, 6, 4, 4, col); R(15, 4, 2, 2, '#fff'); break;
    case 'bow': c.strokeStyle = B; c.lineWidth = 3; c.beginPath(); c.arc(6, 12, 13, -1.1, 1.1); c.stroke(); line(12, 1, 12, 23, 1, '#f0f0e0'); break;
    case 'shirt': c.fillStyle = B; c.beginPath(); c.moveTo(4, 7); c.lineTo(9, 4); c.lineTo(15, 4); c.lineTo(20, 7); c.lineTo(18, 11); c.lineTo(17, 10); c.lineTo(17, 21); c.lineTo(7, 21); c.lineTo(7, 10); c.lineTo(6, 11); c.fill(); R(7, 10, 3, 11, L); R(11, 5, 2, 3, D); break;
    case 'mail': R(6, 5, 12, 16, B); R(6, 5, 4, 16, L); for (let y = 7; y < 20; y += 3) for (let x = 7; x < 18; x += 3) R(x, y, 1, 1, D); E(5, 7, 3, 3, col); E(19, 7, 3, 3, col); break;
    case 'robe': c.fillStyle = B; c.beginPath(); c.moveTo(9, 3); c.lineTo(15, 3); c.lineTo(20, 22); c.lineTo(4, 22); c.fill(); R(11, 4, 2, 18, '#e8c050'); R(6, 12, 3, 9, L); break;
    case 'ribbon': E(7, 11, 5, 4, col); E(17, 11, 5, 4, col); E(12, 12, 2, 2, shade(col, -0.2)); line(11, 13, 8, 20, 2, B); line(13, 13, 16, 20, 2, B); break;
    case 'cap': E(12, 12, 8, 6, col); R(4, 14, 16, 3, D); break;
    case 'helm': E(12, 13, 8, 8, col); R(4, 13, 16, 2, D); R(11, 6, 2, 8, L); break;
    case 'shield': E(12, 12, 8, 9, col); E(12, 12, 3, 3, hex('#e0c050')); break;
    case 'cape': c.fillStyle = B; c.beginPath(); c.moveTo(8, 4); c.lineTo(16, 4); c.lineTo(20, 21); c.lineTo(4, 21); c.fill(); R(7, 8, 3, 12, L); R(8, 4, 8, 2, D); break;
    case 'shoes': E(9, 15, 6, 4, col); R(3, 15, 10, 4, B); R(9, 6, 5, 10, B); R(9, 6, 2, 10, L); E(17, 17, 5, 3, shade(col, -0.1)); break;
    case 'clip': R(5, 10, 14, 4, B); R(5, 10, 14, 1, L); E(12, 12, 3, 3, hex('#e85a8a')); break;
    case 'ring': c.strokeStyle = B; c.lineWidth = 3; c.beginPath(); c.arc(12, 14, 6, 0, Math.PI * 2); c.stroke(); E(12, 7, 3, 3, hex('#e04a4a')); break;
    case 'glove': E(12, 14, 6, 7, col); for (let i = 0; i < 4; i++) R(7 + i * 3, 4, 2, 7, B); R(17, 10, 3, 5, B); break;
    case 'earring': line(12, 3, 12, 9, 1, '#e8c050'); E(12, 13, 4, 6, col); break;
    case 'brooch': E(12, 12, 7, 7, hex('#e8c050')); E(12, 12, 4, 4, col); break;
    case 'card': R(5, 3, 14, 18, '#f8f0d8'); R(6, 4, 12, 9, '#a0b0d0'); R(6, 14, 12, 1, '#c0a060'); R(6, 16, 9, 1, '#c0a060'); R(6, 18, 11, 1, '#c0a060'); E(12, 8, 3, 3, col); break;
    // 技能
    case 'sk_first': R(10, 4, 4, 16, '#fff'); R(4, 10, 16, 4, '#fff'); R(10, 4, 4, 16, B); R(4, 10, 16, 4, B); R(11, 5, 2, 14, '#fff'); R(5, 11, 14, 2, '#fff'); break;
    case 'sk_basic': E(12, 12, 8, 8, col); R(9, 9, 2, 2, '#fff'); R(13, 9, 2, 2, '#fff'); R(9, 15, 6, 1, '#2a2a3a'); break;
    case 'sk_bash': line(4, 20, 18, 6, 4, '#c8d0dc'); for (let i = 0; i < 5; i++) line(17, 7, 17 + Math.cos(i) * 6, 7 + Math.sin(i * 1.3) * 6, 2, B); break;
    case 'sk_magnum': for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; line(12, 12, 12 + Math.cos(a) * 10, 12 + Math.sin(a) * 10, 2, i % 2 ? '#ffd040' : B); } E(12, 12, 4, 4, hex('#fff0a0')); break;
    case 'sk_provoke': E(12, 12, 8, 8, col); R(7, 9, 4, 2, '#2a1a1a'); R(13, 9, 4, 2, '#2a1a1a'); R(8, 15, 8, 2, '#2a1a1a'); break;
    case 'sk_endure': E(12, 13, 8, 9, col); R(8, 9, 8, 2, L); R(11, 7, 2, 12, '#fff'); break;
    case 'sk_fire': for (let i = 0; i < 3; i++) { c.fillStyle = ['#e03a1a', '#f08a2a', '#ffe060'][i]; c.beginPath(); c.moveTo(12, 3 + i * 4); c.lineTo(19 - i * 2, 20); c.lineTo(5 + i * 2, 20); c.fill(); } break;
    case 'sk_cold': for (let i = 0; i < 3; i++) line(12, 12, 12 + Math.cos(i * 1.05) * 10, 12 + Math.sin(i * 1.05) * 10, 2, B), line(12, 12, 12 - Math.cos(i * 1.05) * 10, 12 - Math.sin(i * 1.05) * 10, 2, B); E(12, 12, 3, 3, hex('#ffffff')); break;
    case 'sk_soul': for (let i = 0; i < 4; i++) E(6 + i * 4, 18 - i * 4, 3, 3, col); break;
    case 'sk_thunder': c.fillStyle = B; c.beginPath(); c.moveTo(14, 2); c.lineTo(6, 13); c.lineTo(11, 13); c.lineTo(8, 22); c.lineTo(18, 9); c.lineTo(13, 9); c.fill(); break;
    case 'sk_double': line(3, 9, 20, 9, 2, '#d8c8a0'); line(3, 15, 20, 15, 2, '#d8c8a0'); c.fillStyle = B; c.beginPath(); c.moveTo(21, 9); c.lineTo(16, 6); c.lineTo(16, 12); c.fill(); c.beginPath(); c.moveTo(21, 15); c.lineTo(16, 12); c.lineTo(16, 18); c.fill(); break;
    case 'sk_shower': for (let i = 0; i < 4; i++) { line(5 + i * 4, 3, 5 + i * 4, 15 + (i % 2) * 3, 2, '#d8c8a0'); R(4 + i * 4, 15 + (i % 2) * 3, 3, 3, B); } break;
    case 'sk_conc': E(12, 12, 9, 6, hex('#ffffff')); E(12, 12, 4, 4, col); R(11, 11, 2, 2, '#000'); break;
    case 'sk_charge': line(3, 12, 18, 12, 3, '#d8c8a0'); c.fillStyle = B; c.beginPath(); c.moveTo(22, 12); c.lineTo(15, 7); c.lineTo(15, 17); c.fill(); for (let i = 0; i < 3; i++) line(4 + i * 3, 6 + i * 6, 2 + i * 3, 8 + i * 6, 1, '#fff'); break;
    default: E(12, 12, 8, 8, col);
  }
  crispOutline(c, 0, 0, 24, 24, [30, 22, 34], 90);
  cache.set(key, cv);
  return cv;
}
const urlCache = new Map<string, string>();
export function iconURL(k: string, color = '#ccc', c2 = ''): string {
  const key = k + color + c2;
  let u = urlCache.get(key); if (!u) { u = iconCanvas(k, color, c2).toDataURL(); urlCache.set(key, u); }
  return u;
}
