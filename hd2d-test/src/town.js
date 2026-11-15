// 晨曦鎮 3D 版：直接讀《晨曦物語》的真實地圖資料（地形、物件、NPC），用 HD-2D 風格重新呈現。
// 能走路（點地面）、點 NPC 對話。戰鬥與其他系統還沒接。
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { DB } from '../../ro-mmorpg/src/data/index.ts';
import { buildMap } from '../../ro-mmorpg/src/systems/MapLoader.ts';
import { Pathfinder } from '../../ro-mmorpg/src/systems/Pathfinding.ts';
import { humanSheet } from '../../ro-mmorpg/src/render/SpriteFactory.ts';
import { dirFromWorldDelta } from '../../ro-mmorpg/src/render/iso.ts';
import { T } from '../../ro-mmorpg/src/render/textures.ts';

const q = new URLSearchParams(location.search), $ = (id) => document.getElementById(id);
const LOW = q.get('q') === 'low' || (q.get('q') !== 'high' && (matchMedia('(pointer:coarse)').matches || Math.min(innerWidth, innerHeight) < 600));
let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const rr = (a, b) => a + rnd() * (b - a), hsl = (h, s, l) => new THREE.Color().setHSL(h, s, l);

// ---------- 資料 ----------
const def = DB.map.aurora, map = buildMap(def), pf = new Pathfinder(map), W = map.w, H = map.h;

// ---------- 渲染器 ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.info.autoReset = false; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0xbcd6e8, 0.006);
const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 400);
let zoom = LOW ? 44 : 42; const camDir = new THREE.Vector3(1, 0.95, 1.05).normalize();
const camTarget = new THREE.Vector3(W / 2, 1.5, H / 2);

// ---------- 體素 ----------
const box = new THREE.BoxGeometry(1, 1, 1);
function noiseTex() { const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = 215 + rnd() * 40; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 1, 1); } const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t; }
const texNoise = noiseTex();
class Voxels {
  constructor(o = {}) { this.l = []; this.o = o; }
  add(x, y, z, c, s = 1, sy = s, sz = s, tag = 0) { this.l.push({ x, y, z, c: c instanceof THREE.Color ? c : new THREE.Color(c), s, sy, sz, tag }); }
  build() {
    if (!this.l.length) return null;
    const m = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ map: texNoise, roughness: this.o.rough ?? 0.92, emissive: this.o.emissive ?? 0 }), this.l.length), mx = new THREE.Matrix4(), q0 = new THREE.Quaternion();
    this.l.forEach((v, i) => { mx.compose(new THREE.Vector3(v.x, v.y, v.z), q0, new THREE.Vector3(v.s, v.sy, v.sz)); m.setMatrixAt(i, mx); m.setColorAt(i, v.c); });
    m.castShadow = this.o.cast ?? true; m.receiveShadow = true; m.userData.l = this.l; scene.add(m); return m;
  }
}
const ground = new Voxels({ rough: 1 }), solid = new Voxels(), glow = new Voxels({ emissive: 0xffc060, cast: false }), leaves = new Voxels(), flowers = new Voxels({ cast: false });
const wood = () => hsl(0.08, 0.4, 0.3 + rnd() * 0.06), plaster = () => hsl(0.12, 0.25, 0.72 + rnd() * 0.06), stone = () => hsl(0.1, 0.05, 0.46 + rnd() * 0.1), dark = () => hsl(0.07, 0.3, 0.16);

// ---------- 地形（真實地圖的 terrain）----------
const MARGIN = 16, tAt = (x, z) => (x >= 0 && z >= 0 && x < W && z < H ? map.terrain[z * W + x] : -1);
function cellH(x, z) {
  const t = tAt(x, z); if (t === T.water) return -1;
  if (t >= 0) return 0;
  const d = Math.max(-x, x - (W - 1), -z, z - (H - 1)); return Math.floor(Math.max(0, d - 2) * 0.32 + (Math.sin(x * 0.4) * Math.cos(z * 0.37) + 1) * 0.5 * Math.min(2, d * 0.2));
}
const grassCells = [];
for (let x = -MARGIN; x < W + MARGIN; x++) for (let z = -MARGIN; z < H + MARGIN; z++) {
  const h = cellH(x, z), nh = Math.min(cellH(x + 1, z), cellH(x - 1, z), cellH(x, z + 1), cellH(x, z - 1)), t = tAt(x, z);
  for (let y = Math.min(h, nh); y <= h; y++) {
    const top = y === h; let c;
    if (!top) c = hsl(0.08, 0.35, 0.2 + rnd() * 0.03);
    else if (t === T.water) c = hsl(0.55, 0.45, 0.3 + rnd() * 0.03);
    else if (t === T.road) c = hsl(0.1, 0.08, 0.42 + rnd() * 0.1);
    else if (t === T.sand) c = hsl(0.12, 0.45, 0.62 + rnd() * 0.05);
    else if (t === T.dirt) c = hsl(0.08, 0.35, 0.34 + rnd() * 0.05);
    else if (t === T.deepgrass) c = hsl(0.3, 0.55, 0.2 + rnd() * 0.06);
    else c = hsl(0.28 + rnd() * 0.03, 0.5, 0.24 + rnd() * 0.07);
    ground.add(x, y - 0.5, z, c);
    if (top && (t === T.grass || t === T.deepgrass || t < 0) && !(t >= 0 && map.propAt[z * W + x] >= 0 && 0)) grassCells.push([x, h, z]);
  }
}

// ---------- 物件 → 3D ----------
const lampSpots = [], smoke = [], fires = [], blueFx = [];
function blob(x, y, z, r, tagSeed = 1) { for (let i = -3; i <= 3; i++) for (let j = -2; j <= 3; j++) for (let k = -3; k <= 3; k++) { const d = Math.hypot(i, (j - 0.5) * 1.15, k) + rnd() * 0.9; if (d < r) leaves.add(x + i, y + j, z + k, new THREE.Color(), 1, 1, 1, rnd()); } }
function tree(x, z, v, small) { const h = (small ? 3.2 : 4) + (v % 3), r = small ? 2 : 2.3 + (v % 2) * 0.4; for (let y = 0; y < h; y++) solid.add(x, y + 0.5, z, hsl(0.07, 0.4, 0.2 + rnd() * 0.05)); blob(x, h + 0.8, z, r); }
function pine(x, z, v) { const h = 6 + (v % 3); for (let y = 0; y < 2; y++) solid.add(x, y + 0.5, z, hsl(0.07, 0.4, 0.17)); for (let k = 0; k < h - 1; k++) { const r = Math.max(0, 2.6 - k * 0.4); for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) if (Math.hypot(i, j) + rnd() * 0.5 < r) leaves.add(x + i, 2 + k + 0.5, z + j, new THREE.Color(), 1, 1, 1, 0.9 + rnd() * 0.1); } }
function building(kind, v, x0, z0, w, d) {
  const wallH = kind === 'church' ? 5 : kind === 'inn' ? 4 : 3;
  const roofHue = { house: [0.04, 0.62, 0.1][v % 3], shop: 0.6, inn: 0.0, smith: 0.62, church: 0.62 }[kind];
  const roofS = kind === 'smith' ? 0.08 : 0.5, roofL = kind === 'smith' ? 0.22 : kind === 'church' ? 0.34 : 0.32;
  const wallC = kind === 'smith' ? stone : kind === 'inn' ? () => hsl(0.09, 0.3, 0.55 + rnd() * 0.06) : plaster;
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) solid.add(x0 + x, 0.5, z0 + z, stone());
  for (let y = 1; y <= wallH; y++) for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) { if (x === 0 || z === 0 || x === w - 1 || z === d - 1) solid.add(x0 + x, y + 0.5, z0 + z, (x + z + y) % 6 === 0 ? wood() : wallC()); }
  for (let k = 0; k < Math.ceil(d / 2) + 1; k++) for (let x = -1; x <= w; x++) for (let z = k - 1; z <= d - k; z++) solid.add(x0 + x, wallH + 1.5 + k, z0 + z, hsl(roofHue, roofS, roofL + rnd() * 0.05 - k * 0.012));
  const dx = x0 + Math.floor(w / 2), dz = z0 + d - 1; solid.add(dx, 1.5, dz + 0.04, dark(), 1, 1, 1); solid.add(dx, 2.5, dz + 0.04, dark(), 1, 1, 1);
  for (const wx of [x0 + 1, x0 + w - 2]) if (wx !== dx) { solid.add(wx, 2.5, dz + 0.05, 0x3a2a20, 1.15, 1.15, 1); glow.add(wx, 2.5, dz + 0.08, 0xffd890, 0.8, 0.8, 1.05); }
  if (kind !== 'church') { for (let y = wallH; y < wallH + 4; y++) solid.add(x0 + w - 2, y + 1.5, z0 + 1, stone()); smoke.push([x0 + w - 2, wallH + 6, z0 + 1]); }
  if (kind === 'smith') fires.push([x0 + w + 0.5, 0.8, z0 + 1.5]);
  if (kind === 'shop') solid.add(dx + 1.5, 3.2, dz + 0.9, wood(), 1.4, 0.8, 0.15);
  if (kind === 'church') { for (let y = 0; y < 6; y++) for (let x = 0; x < 2; x++) for (let z = 0; z < 2; z++) solid.add(x0 + 1 + x, wallH + 1.5 + y, z0 + d - 3 + z, plaster()); for (let k = 0; k < 3; k++) solid.add(x0 + 1.5, wallH + 7.5 + k, z0 + d - 2.5, 0x5a6aa0, 2 - k * 0.6, 1, 2 - k * 0.6); glow.add(x0 + 1.5, wallH + 4.5, z0 + d - 1.9, 0xffe0a0, 0.9, 1.2, 0.2); }
}
function placeProp(p) {
  const x = p.x, z = p.y, t = p.type, v = p.v;
  const ring = Math.min(x, z, W - 1 - x, H - 1 - z), border = ring < 2, nearCam = x >= W - 7 || z >= H - 7; // 靠近鏡頭的那兩側邊界不蓋高樹，免得擋住畫面
  if (nearCam && (t === 'tree' || t === 'pine') && ring < 7) { for (let i = 0; i < 2; i++) solid.add(x + rr(0.2, 0.8), 0.45, z + rr(0.2, 0.8), hsl(0.1, 0.04, 0.38 + rnd() * 0.12), rr(0.7, 1.1), rr(0.6, 0.9), rr(0.7, 1.1)); if (rnd() < 0.5) leaves.add(x + 0.5, 0.7, z + 0.5, new THREE.Color(), 1.1, 1.1, 1.1, rnd()); return; }
  if (t === 'tree') { if (border && LOW && (x + z) % 2) return; tree(x + 0.5, z + 0.5, v, border); }
  else if (t === 'pine') pine(x + 0.5, z + 0.5, v);
  else if (t === 'bush') { for (let i = -1; i <= 1; i++) for (let j = 0; j <= 1; j++) for (let k = -1; k <= 1; k++) if (Math.hypot(i, j * 1.4, k) + rnd() * 0.5 < 1.5) leaves.add(x + 0.5 + i * 0.8, j + 0.9, z + 0.5 + k * 0.8, new THREE.Color(), 0.9, 0.9, 0.9, rnd()); }
  else if (t === 'flowers') { for (let i = 0; i < 4; i++) flowers.add(x + rr(0.1, 0.9), 0.5, z + rr(0.1, 0.9), [0xd8333a, 0xe8c040, 0xf0f0f0, 0xe070b0][(v + i) % 4], 0.22); }
  else if (t === 'rock') for (let i = 0; i < 3; i++) solid.add(x + rr(0.2, 0.8), 0.4 + (i > 1 ? 0.6 : 0), z + rr(0.2, 0.8), hsl(0.1, 0.04, 0.38 + rnd() * 0.12), rr(0.6, 1.1), rr(0.5, 1), rr(0.6, 1.1));
  else if (t === 'reeds') for (let i = 0; i < 4; i++) solid.add(x + rr(0, 1), 1.2, z + rr(0, 1), hsl(0.2, 0.4, 0.35), 0.12, rr(1.4, 2.2), 0.12);
  else if (t === 'lamp') { for (let y = 0; y < 4; y++) solid.add(x + 0.5, y + 0.5, z + 0.5, 0x2a2228, 0.3, 1, 0.3); glow.add(x + 0.5, 4.6, z + 0.5, 0xffe0a0, 0.55, 0.75, 0.55); lampSpots.push(new THREE.Vector3(x + 0.5, 4.8, z + 0.5)); }
  else if (t === 'well') { for (let a = 0; a < 8; a++) { const g = a / 8 * Math.PI * 2; solid.add(x + 0.5 + Math.cos(g) * 0.9, 0.5, z + 0.5 + Math.sin(g) * 0.9, stone(), 0.8); solid.add(x + 0.5 + Math.cos(g) * 0.9, 1.3, z + 0.5 + Math.sin(g) * 0.9, stone(), 0.8, 0.8, 0.8); } for (const s of [-0.9, 0.9]) solid.add(x + 0.5 + s, 2.4, z + 0.5, wood(), 0.2, 2.2, 0.2); for (let k = -1; k <= 1; k++) solid.add(x + 0.5 + k * 0.7, 3.6, z + 0.5, 0xa84a30, 0.9, 0.25, 1.8); }
  else if (t === 'fountain') { for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { if (i === 1 && j === 1) continue; solid.add(x + i + 0.5, 0.9, z + j + 0.5, stone(), 1, 1.2, 1); } solid.add(x + 1.5, -0.1, z + 1.5, 0x3a86c0, 1, 1, 1); for (let y = 0; y < 3; y++) solid.add(x + 1.5, 1.2 + y, z + 1.5, stone(), 0.6, 1, 0.6); blueFx.push([x + 1.5, 4.3, z + 1.5]); }
  else if (t === 'fence') { solid.add(x + 0.5, 0.6, z + 0.5, wood(), 0.2, 1.1, 0.2); solid.add(x + 0.5, 0.9, z + 0.5, wood(), 1, 0.15, 0.15); }
  else if (t === 'crate') solid.add(x + 0.5, 0.5, z + 0.5, wood(), 0.9);
  else if (t === 'barrel') { solid.add(x + 0.5, 0.55, z + 0.5, hsl(0.08, 0.45, 0.28), 0.8, 1.0, 0.8); solid.add(x + 0.5, 0.55, z + 0.5, 0x4a3a30, 0.86, 0.15, 0.86); }
  else if (t === 'sign') { solid.add(x + 0.5, 1, z + 0.5, wood(), 0.2, 2, 0.2); solid.add(x + 0.5, 1.9, z + 0.5, wood(), 1.3, 0.6, 0.16); }
  else if (t === 'statue') { solid.add(x + 0.5, 0.6, z + 0.5, stone(), 1.1, 1.2, 1.1); solid.add(x + 0.5, 2, z + 0.5, hsl(0.1, 0.05, 0.6), 0.6, 1.6, 0.5); solid.add(x + 0.5, 3.1, z + 0.5, hsl(0.1, 0.05, 0.62), 0.55); }
  else if (t === 'stall') { for (const dx of [0.1, 1.9]) for (let y = 0; y < 3; y++) solid.add(x + dx, y + 0.5, z + 0.15, wood(), 0.25, 1, 0.25); const cA = [0xd84a3a, 0x3a6ad8, 0x3aa85a][v % 3]; for (let i = 0; i < 2; i++) for (let k = 0; k < 2; k++) solid.add(x + i + 0.5, 3.3 + k * 0.05, z + k * 0.9 + 0.3, (i + k) % 2 ? cA : 0xf4ecd8, 1, 0.2, 0.95); for (let i = 0; i < 2; i++) solid.add(x + i + 0.5, 1.0, z + 0.4, wood(), 1, 0.9, 0.8); for (let i = 0; i < 4; i++) solid.add(x + 0.3 + i * 0.45, 1.7, z + 0.4, [0xd8333a, 0xe8c040, 0x6ab04a, 0xe8873a][(i + v) % 4], 0.35); }
  else if (t === 'tent') { for (let k = 0; k < 3; k++) for (let i = -k; i <= k; i++) solid.add(x + 1 + i * 0.5, 0.6 + (2 - k) * 0.85, z + 1, hsl(0.1, 0.25, 0.7), 0.6, 0.9, 2.6); }
  else if (['house', 'house2', 'shop', 'inn', 'smith', 'church'].includes(t)) building(t === 'house2' ? 'house' : t, v, x, z, p.w, p.h);
  else if (t === 'torch') { solid.add(x + 0.5, 1, z + 0.5, wood(), 0.2, 2, 0.2); fires.push([x + 0.5, 2.2, z + 0.5]); }
}
for (const p of map.props) placeProp(p);
solid.build(); glow.build(); const leafMesh = leaves.build(); flowers.build(); ground.build();
// 道路上的墊腳碎石、傳送點
const portalFx = def.portals.map((p) => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.12, 8, 24), new THREE.MeshStandardMaterial({ color: 0xff80e0, emissive: 0xff40c0, emissiveIntensity: 1.4 })); m.rotation.x = Math.PI / 2; m.position.set(p.x + 0.5, 0.4, p.y + 0.5); scene.add(m); return m; });
// 水面
{ let minx = 1e9, maxx = -1, minz = 1e9, maxz = -1; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (map.terrain[z * W + x] === T.water) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); minz = Math.min(minz, z); maxz = Math.max(maxz, z); }
  if (maxx >= 0) { const w = new THREE.Mesh(new THREE.PlaneGeometry(maxx - minx + 1, maxz - minz + 1), new THREE.MeshStandardMaterial({ color: 0x4a9ac8, roughness: 0.08, metalness: 0.5, transparent: true, opacity: 0.8 })); w.rotation.x = -Math.PI / 2; w.position.set((minx + maxx) / 2 + 0.5, -0.45, (minz + maxz) / 2 + 0.5); scene.add(w); window.__water = w; } }

// ---------- 草（風吹）----------
const windU = { value: 0.8 }, timeU = { value: 0 };
const gGeo = new THREE.BoxGeometry(0.12, 0.7, 0.12); gGeo.translate(0, 0.35, 0);
const gMat = new THREE.MeshStandardMaterial({ roughness: 1 });
gMat.onBeforeCompile = (s) => { s.uniforms.uTime = timeU; s.uniforms.uWind = windU; s.vertexShader = 'uniform float uTime; uniform float uWind;\n' + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n vec4 wp = instanceMatrix * vec4(position, 1.0); float sway = sin(uTime * 2.2 + wp.x * 0.7 + wp.z * 0.5) * 0.22 * uWind * position.y; transformed.x += sway; transformed.z += sway * 0.6;`); };
const GN = LOW ? 3500 : 8000, grass = new THREE.InstancedMesh(gGeo, gMat, GN), gm = new THREE.Matrix4(), gBase = [];
for (let i = 0, tries = 0; i < GN && tries < GN * 20; tries++) {
  const [cx, h, cz] = grassCells[Math.floor(rnd() * grassCells.length)], x = cx + rnd() - 0.5, z = cz + rnd() - 0.5;
  if (cx >= 0 && cz >= 0 && cx < W && cz < H && map.propAt[cz * W + cx] >= 0) continue;
  gm.compose(new THREE.Vector3(x, h, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * 3, 0)), new THREE.Vector3(1, rr(0.5, 1.2), 1));
  grass.setMatrixAt(i, gm); const c = hsl(0.27 + rnd() * 0.07, 0.6, 0.26 + rnd() * 0.14); gBase.push(c); grass.setColorAt(i, c); i++;
}
grass.count = gBase.length; grass.receiveShadow = true; scene.add(grass);
// 樹葉顏色（春）
{ const l = leafMesh.userData.l, c = new THREE.Color(); l.forEach((v, i) => { c.setHSL(0.31 + (v.tag - 0.5) * 0.04, 0.5, 0.34 + (v.tag - 0.5) * 0.12); leafMesh.setColorAt(i, c); }); leafMesh.instanceColor.needsUpdate = true; }

// ---------- 角色（真實精靈圖當看板）----------
const PX = 30; // 精靈圖 1 像素 = 1/30 格
class Billboard {
  constructor(sheet, ghost = false) {
    this.sheet = sheet; this.cv = document.createElement('canvas'); this.cv.width = sheet.fw; this.cv.height = sheet.fh; this.ctx = this.cv.getContext('2d'); this.key = '';
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.magFilter = this.tex.minFilter = THREE.NearestFilter; this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(sheet.fw / PX, sheet.fh / PX), new THREE.MeshStandardMaterial({ map: this.tex, transparent: true, alphaTest: 0.5, roughness: 1, emissive: 0x9a8670, emissiveMap: this.tex }));
    this.mesh.castShadow = true; this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: this.tex, alphaTest: 0.5 });
    this.mesh.userData.bb = this; this.footY = (sheet.fh / 2 - (sheet.fh - sheet.ay)) / PX; scene.add(this.mesh);
    if (ghost) { this.ghost = new THREE.Mesh(this.mesh.geometry, new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, opacity: 0.4, depthTest: false, depthWrite: false })); this.ghost.renderOrder = 20; scene.add(this.ghost); }
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.8, 14), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.3 })); this.shadow.rotation.x = -Math.PI / 2; scene.add(this.shadow);
  }
  frame(dir, f) { const k = dir * 100 + f; if (k === this.key) return; this.key = k; this.ctx.clearRect(0, 0, this.cv.width, this.cv.height); this.ctx.drawImage(this.sheet.c, f * this.sheet.fw, dir * this.sheet.fh, this.sheet.fw, this.sheet.fh, 0, 0, this.sheet.fw, this.sheet.fh); this.tex.needsUpdate = true; }
  place(x, z, bob = 0) { this.mesh.position.set(x, this.footY + bob, z); this.shadow.position.set(x, 0.04, z); this.mesh.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - z); if (this.ghost) { this.ghost.position.copy(this.mesh.position); this.ghost.rotation.copy(this.mesh.rotation); } }
}
const npcs = [];
for (const n of def.npcs) { const nd = DB.npc[n.id]; if (!nd) continue; const b = new Billboard(humanSheet(nd.look)); b.frame(n.dir ?? 0, 0); b.place(n.x + 0.5, n.y + 0.5); npcs.push({ id: n.id, def: nd, x: n.x + 0.5, y: n.y + 0.5, bb: b, ph: rnd() * 6 }); }
const heroLook = DB.job.novice.look, hero = { x: 27.5, y: 29.5, dir: 0, path: [], animT: 0, bb: new Billboard(humanSheet(heroLook), true), talk: null };
const labels = document.createElement('div'); labels.id = 'labels'; document.body.appendChild(labels);
const mkLabel = (text, cls = '') => { const d = document.createElement('div'); d.className = 'lab ' + cls; d.textContent = text; labels.appendChild(d); return d; };
npcs.forEach((n) => { n.lab = mkLabel(n.def.name.replace(/（.*/, '')); if (n.id === 'guide') n.mark = mkLabel('!', 'mark'); });
hero.lab = mkLabel('你', 'me');
const portalLabs = def.portals.map((p) => mkLabel('→ ' + (DB.map[p.to]?.name || p.to), 'portal'));

// ---------- 光 ----------
const sun = new THREE.DirectionalLight(0xfff0d0, 3); sun.castShadow = true; sun.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 230 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04; scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xbcd8ff, 0x4a5a3a, 0.7); scene.add(hemi);
const lampLights = [0, 1, 2, 3, 4].map(() => { const l = new THREE.PointLight(0xffd090, 0, 18, 1.6); scene.add(l); return l; });
// ---------- 粒子 ----------
function glowTex(r, g, b) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(0.4, `rgba(${r},${g},${b},0.45)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
const flameTex = glowTex(255, 150, 50), blueTex = glowTex(110, 200, 255), smokeTex = glowTex(235, 235, 240), flyTex = glowTex(255, 240, 140);
const sprites = [];
function spawn(tex, add, life, pos, vel, s0, s1, op) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: 0 })); s.position.copy(pos); scene.add(s); sprites.push({ s, life, t: 0, vel, s0, s1, op }); }
function stepSprites(dt) { for (let i = sprites.length - 1; i >= 0; i--) { const p = sprites[i]; p.t += dt; const k = p.t / p.life; if (k >= 1) { scene.remove(p.s); p.s.material.dispose(); sprites.splice(i, 1); continue; } p.s.position.addScaledVector(p.vel, dt); const sz = p.s0 + (p.s1 - p.s0) * k; p.s.scale.set(sz, sz, 1); p.s.material.opacity = p.op * Math.sin(Math.PI * Math.min(1, k * 1.15)); } }
const FN = LOW ? 30 : 70, fpos = new Float32Array(FN * 3), fph = []; for (let i = 0; i < FN; i++) { fpos.set([rr(4, W - 4), rr(0.8, 4), rr(4, H - 4)], i * 3); fph.push(rnd() * 6); }
const flies = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: flyTex, size: 0.7, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); flies.geometry.setAttribute('position', new THREE.BufferAttribute(fpos, 3)); scene.add(flies);
const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, fog: false }), clouds = [];
for (let i = 0; i < 6; i++) { const g = new THREE.Group(), n = 5 + Math.floor(rnd() * 4); for (let k = 0; k < n; k++) { const b = new THREE.Mesh(box, cloudMat); b.scale.set(rr(4, 8), rr(1.4, 2.4), rr(3, 6)); b.position.set(k * 3.2 - n * 1.6, rr(-0.4, 0.5), rr(-2, 2)); b.castShadow = true; g.add(b); } g.position.set(rr(-20, 80), rr(34, 40), rr(-20, 70)); scene.add(g); clouds.push(g); }

// ---------- 後製 ----------
const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.35, 0.5, 0.92); composer.addPass(bloom);
const bokeh = new BokehPass(scene, camera, { focus: 40, aperture: 0.00007, maxblur: 0.007 }); composer.addPass(bokeh); composer.addPass(new OutputPass());
function resize() { const w = innerWidth, h = innerHeight, pr = $('pixel').checked ? Math.min(devicePixelRatio, 2) * (LOW ? 0.4 : 0.5) : Math.min(devicePixelRatio, LOW ? 1.5 : 2); renderer.setPixelRatio(pr); renderer.setSize(w, h); composer.setPixelRatio(pr); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); $('pixel').onchange = resize;

// ---------- 時間 ----------
const lerpC = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
const KEYS = [[0, 0x0a1230, 0x6a80c0, 0.08], [5, 0x2a2a5a, 0xff9a70, 0.5], [7, 0xf0b890, 0xffd0a0, 2.2], [10, 0xa8cde8, 0xfff0d8, 3.2], [15, 0xa8cde8, 0xfff0d0, 3.0], [18, 0xf0a070, 0xff9a50, 2.6], [20, 0x3a3060, 0xff7060, 0.6], [22, 0x0a1230, 0x6a80c0, 0.1], [24, 0x0a1230, 0x6a80c0, 0.08]];
let night = 0;
function applyTime(t) {
  let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++; const a = KEYS[i], b = KEYS[i + 1], k = (t - a[0]) / (b[0] - a[0]);
  const sky = lerpC(a[1], b[1], k), sunC = lerpC(a[2], b[2], k), sunI = a[3] + (b[3] - a[3]) * k, elev = Math.sin((t - 6) / 12 * Math.PI), day = Math.max(0, elev); night = Math.min(1, Math.max(0, 0.5 - elev * 2.2));
  scene.background = sky; scene.fog.color.copy(sky); scene.fog.density = 0.005 + night * 0.004;
  const ang = (t - 6) / 12 * Math.PI; sun.position.set(W / 2 + Math.cos(ang) * 70, Math.max(10, Math.sin(ang) * 70), H / 2 + 30); sun.target.position.set(W / 2, 0, H / 2); sun.color.copy(sunC); sun.intensity = sunI;
  hemi.intensity = 0.25 + day * 0.65; hemi.color.copy(sky).lerp(new THREE.Color(0xbcd8ff), 0.4); glow.build; scene.traverse((o) => { if (o.isInstancedMesh && o.material.emissive && o.material.emissive.getHex() === 0xffc060) o.material.emissiveIntensity = 0.1 + night * 1.6; });
  flies.material.opacity = night * 0.9; renderer.toneMappingExposure = 0.85 + night * 0.35; bloom.strength = 0.25 + night * 0.4;
  $('clock').textContent = `晨曦鎮　${String(Math.floor(t)).padStart(2, '0')}:${String(Math.floor((t % 1) * 60)).padStart(2, '0')}`;
}
$('time').oninput = (e) => applyTime(+e.target.value); $('wind').oninput = (e) => (windU.value = +e.target.value);
if (q.get('t')) $('time').value = q.get('t'); if (LOW && q.get('dof') !== '1') $('dof').checked = false; if (q.get('pixel') === '0') $('pixel').checked = false;
$('quality').value = q.get('q') || ''; $('quality').onchange = (e) => { const u = new URL(location.href); if (e.target.value) u.searchParams.set('q', e.target.value); else u.searchParams.delete('q'); location.href = u.toString(); };
$('ph').onclick = () => { $('panel').classList.toggle('c'); $('ph').textContent = '光影設定 ' + ($('panel').classList.contains('c') ? '▸' : '▾'); }; if (LOW && q.get('panel') !== '1') $('ph').onclick();
resize(); applyTime(+$('time').value);

// ---------- 對話 ----------
const dlg = $('dlg'), dname = $('dname'), dtext = $('dtext'), dopts = $('dopts'); let dState = null;
function say(npc, id) {
  const node = npc.def.dialog[id]; if (!node) return closeDlg();
  const pages = Array.isArray(node.text) ? node.text : [node.text]; dState = { npc, pages, i: 0, node }; dlg.style.display = 'block'; dname.textContent = npc.def.name; dopts.innerHTML = ''; showPage();
}
function showPage() { const s = dState; dtext.textContent = s.pages[s.i]; dopts.innerHTML = ''; if (s.i < s.pages.length - 1) return; const n = s.node; if (n.opts) n.opts.forEach((o, k) => { const b = document.createElement('div'); b.className = 'opt'; b.textContent = `${k + 1}. ${o.label}`; b.onclick = (e) => { e.stopPropagation(); if (o.go) say(s.npc, o.go); else { toast(`（「${o.label}」是原遊戲的功能，3D 版還沒接上）`); closeDlg(); } }; dopts.appendChild(b); }); else if (n.go) { /* 下一頁後接續 */ } }
function advance() { const s = dState; if (!s) return; if (s.i < s.pages.length - 1) { s.i++; showPage(); return; } const n = s.node; if (n.opts) return; if (n.go) return say(s.npc, n.go); if (n.act && n.act !== 'close') toast(`（「${n.act}」是原遊戲的功能，3D 版還沒接上）`); closeDlg(); }
function closeDlg() { dState = null; dlg.style.display = 'none'; }
dlg.onclick = advance; addEventListener('keydown', (e) => { if (!dState) return; if (e.key === 'Enter' || e.key === ' ') advance(); else if (e.key === 'Escape') closeDlg(); else if (/^[1-9]$/.test(e.key)) dopts.children[+e.key - 1]?.click(); });
let toastT = 0; function toast(t) { const el = $('toast'); el.textContent = t; el.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => (el.style.opacity = 0), 2600); }

// ---------- 輸入：點地面走路、點 NPC 對話、滾輪縮放 ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function pointer(cx, cy) {
  ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(npcs.map((n) => n.bb.mesh), false)[0];
  if (hit) { const n = npcs.find((o) => o.bb.mesh === hit.object); hero.talk = n; walkTo(n.x, n.y, 1); return; }
  const p = new THREE.Vector3(); if (!ray.ray.intersectPlane(plane, p)) return; hero.talk = null; walkTo(p.x, p.z, 0);
}
function walkTo(tx, ty, stop) {
  let cx = Math.floor(tx), cy = Math.floor(ty); if (!map.canWalk(cx, cy) && !stop) { const n = map.nearestWalkable(cx, cy, 5); if (!n) return; [cx, cy] = n; }
  const path = pf.find(hero.x, hero.y, stop ? tx : cx + 0.5, stop ? ty : cy + 0.5, 4000, stop); if (path) hero.path = path.slice(); closeDlg();
}
let down = null; renderer.domElement.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY, performance.now()]));
renderer.domElement.addEventListener('pointerup', (e) => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 8 && performance.now() - down[2] < 600) pointer(e.clientX, e.clientY); down = null; });
addEventListener('wheel', (e) => { zoom = Math.min(80, Math.max(16, zoom * (1 + Math.sign(e.deltaY) * 0.08))); }, { passive: true });
let pinch = 0; addEventListener('touchmove', (e) => { if (e.touches.length === 2) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); if (pinch) zoom = Math.min(80, Math.max(16, zoom * (pinch / d))); pinch = d; } }, { passive: true }); addEventListener('touchend', () => (pinch = 0));

// ---------- 主迴圈 ----------
const clock = new THREE.Clock(); let T0 = 0, acc = 0; const SPEED = 5;
const proj = new THREE.Vector3();
function place2D(el, x, y, z) { proj.set(x, y, z).project(camera); const vis = proj.z < 1; el.style.display = vis ? 'block' : 'none'; if (vis) el.style.transform = `translate(${((proj.x + 1) / 2 * innerWidth) | 0}px, ${((1 - proj.y) / 2 * innerHeight) | 0}px) translate(-50%, -100%)`; }
const sheetOf = hero.bb.sheet;
function frame() {
  const dt = Math.min(0.05, clock.getDelta()); T0 += dt; timeU.value = T0; acc += dt;
  // 主角移動
  let moving = false;
  if (hero.path.length) { const [tx, ty] = hero.path[0], dx = tx - hero.x, dy = ty - hero.y, d = Math.hypot(dx, dy), st = SPEED * dt; hero.dir = dirFromWorldDelta(dx, dy, hero.dir); moving = true; if (d <= st) { hero.x = tx; hero.y = ty; hero.path.shift(); } else { hero.x += (dx / d) * st; hero.y += (dy / d) * st; } }
  hero.animT += dt; hero.bb.frame(hero.dir, moving ? 2 + (Math.floor(hero.animT * SPEED * 2.1) % 4) : 0); hero.bb.place(hero.x, hero.y, moving ? Math.abs(Math.sin(hero.animT * 12)) * 0.06 : 0);
  if (hero.talk && !hero.path.length) { const n = hero.talk; hero.talk = null; hero.dir = dirFromWorldDelta(n.x - hero.x, n.y - hero.y, hero.dir); const nd = dirFromWorldDelta(hero.x - n.x, hero.y - n.y, 0); n.bb.frame(nd, 0); say(n, 'start'); }
  for (const n of npcs) n.bb.place(n.x, n.y, Math.abs(Math.sin(T0 * 2 + n.ph)) * 0.04);
  // 傳送點提示
  for (const p of def.portals) if (Math.hypot(hero.x - (p.x + 0.5), hero.y - (p.y + 0.5)) < 1.2 && !hero.portalHint) { hero.portalHint = true; toast(`這裡通往「${DB.map[p.to]?.name || p.to}」（3D 版還沒接上其他地圖）`); } else if (Math.hypot(hero.x - (p.x + 0.5), hero.y - (p.y + 0.5)) > 3) hero.portalHint = false;
  portalFx.forEach((m, i) => { m.rotation.z += dt * 1.5; m.position.y = 0.45 + Math.sin(T0 * 2 + i) * 0.1; });
  // 鏡頭跟隨
  camTarget.x += (hero.x - camTarget.x) * Math.min(1, dt * 4); camTarget.z += (hero.y - camTarget.z) * Math.min(1, dt * 4);
  camera.position.copy(camTarget).addScaledVector(camDir, zoom); camera.lookAt(camTarget.x, 1.8, camTarget.z);
  // 路燈（最近的 5 盞亮點光源）
  const near = lampSpots.slice().sort((a, b) => a.distanceToSquared(camTarget) - b.distanceToSquared(camTarget)).slice(0, lampLights.length);
  lampLights.forEach((l, i) => { if (near[i]) l.position.copy(near[i]); l.intensity = night * 12; });
  // 粒子
  if (acc > 0.06) { acc = 0;
    for (const f of fires) spawn(flameTex, true, 0.7, new THREE.Vector3(f[0] + rr(-0.2, 0.2), f[1], f[2] + rr(-0.2, 0.2)), new THREE.Vector3(0, rr(1.2, 2), 0), 1.0, 0.3, 0.9);
    for (const b of blueFx) spawn(blueTex, true, 1.1, new THREE.Vector3(b[0] + rr(-0.3, 0.3), b[1], b[2] + rr(-0.3, 0.3)), new THREE.Vector3(rr(-0.3, 0.3), rr(-1.5, -0.6), rr(-0.3, 0.3)), 0.6, 0.3, 0.7);
    for (const s of smoke) if (rnd() < 0.3) spawn(smokeTex, false, 6, new THREE.Vector3(s[0], s[1], s[2]), new THREE.Vector3(windU.value * 0.6 + 0.3, 1.1, 0.1), 0.9, 4, 0.34);
  }
  stepSprites(dt);
  const fp = flies.geometry.attributes.position; for (let i = 0; i < FN; i++) { fp.array[i * 3] += Math.sin(T0 * 0.7 + fph[i]) * dt * 0.6; fp.array[i * 3 + 1] += Math.cos(T0 * 0.9 + fph[i] * 2) * dt * 0.4; fp.array[i * 3 + 2] += Math.cos(T0 * 0.5 + fph[i]) * dt * 0.6; } fp.needsUpdate = true;
  clouds.forEach((c, i) => { c.position.x += dt * (0.8 + i * 0.12) * (0.5 + windU.value * 0.5); if (c.position.x > 90) c.position.x = -40; });
  if (window.__water) window.__water.material.opacity = 0.78 + Math.sin(T0 * 1.3) * 0.04;
  // 標籤
  npcs.forEach((n) => { place2D(n.lab, n.x, 3.6 + n.bb.footY * 0.0, n.y); if (n.mark) place2D(n.mark, n.x, 4.9 + Math.sin(T0 * 4) * 0.15, n.y); });
  place2D(hero.lab, hero.x, 3.6, hero.y); def.portals.forEach((p, i) => place2D(portalLabs[i], p.x + 0.5, 2.2, p.y + 0.5));
  bokeh.uniforms.focus.value = camera.position.distanceTo(camTarget); bokeh.uniforms.aperture.value = $('dof').checked ? 0.00007 : 0; bokeh.uniforms.maxblur.value = $('dof').checked ? 0.007 : 0; bloom.enabled = $('bloom').checked;
  renderer.info.reset(); composer.render(); window.__info = { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, low: LOW }; window.__frames = (window.__frames || 0) + 1; window.__camera = camera; window.__hero = hero; window.__npcs = npcs; window.__say = say;
  requestAnimationFrame(frame);
}
window.__map = map; frame();
