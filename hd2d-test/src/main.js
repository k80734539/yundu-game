import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// ---------- 小工具 ----------
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const rr = (a, b) => a + rnd() * (b - a);
const hsl = (h, s, l) => new THREE.Color().setHSL(h, s, l);
const q = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const LOW = q.get('q') === 'low' || (q.get('q') !== 'high' && (matchMedia('(pointer:coarse)').matches || Math.min(innerWidth, innerHeight) < 600));

// ---------- 渲染器與場景 ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xbcd6e8, 0.006);
const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 400);
camera.position.set(34, 23, 41);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2.2, 1); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.47; controls.minDistance = 12; controls.maxDistance = 70;

// ---------- 像素貼圖（程式畫的 16x16 雜訊，最近鄰放大）----------
function noiseTex(base, var_, n = 16) {
  const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d');
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = 1 + (rnd() - 0.5) * var_; g.fillStyle = `rgb(${Math.min(255, base[0] * v) | 0},${Math.min(255, base[1] * v) | 0},${Math.min(255, base[2] * v) | 0})`; g.fillRect(x, y, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
}
const texNoise = noiseTex([255, 255, 255], 0.28);

// ---------- 體素 ----------
const box = new THREE.BoxGeometry(1, 1, 1);
class Voxels {
  constructor(opts = {}) { this.list = []; this.opts = opts; }
  add(x, y, z, color, s = 1, sy = s, sz = s, tag = 0) { this.list.push({ x, y, z, color: color instanceof THREE.Color ? color : new THREE.Color(color), s, sy, sz, tag }); }
  fill(x0, y0, z0, w, h, d, colorFn) { for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) for (let z = 0; z < d; z++) this.add(x0 + x, y0 + y, z0 + z, colorFn(x, y, z)); }
  build() {
    const mat = new THREE.MeshStandardMaterial({ map: texNoise, roughness: this.opts.rough ?? 0.92, metalness: 0, emissive: this.opts.emissive ?? 0x000000 });
    const m = new THREE.InstancedMesh(box, mat, this.list.length), mx = new THREE.Matrix4(), q0 = new THREE.Quaternion();
    this.list.forEach((v, i) => { mx.compose(new THREE.Vector3(v.x, v.y, v.z), q0, new THREE.Vector3(v.s, v.sy, v.sz)); m.setMatrixAt(i, mx); m.setColorAt(i, v.color); });
    m.castShadow = this.opts.cast ?? true; m.receiveShadow = true; m.userData.list = this.list; scene.add(m); return m;
  }
}

// ---------- 地形 ----------
const N = 64, H = N / 2;
const hgt = (x, z) => Math.floor(1.6 * (Math.sin(x * 0.13) * Math.cos(z * 0.11) + 0.5 * Math.sin(x * 0.31 + z * 0.27)) + 1.6 * Math.max(0, (Math.hypot(x, z) - 20) / 16));
const ground = new Voxels({ rough: 1 });
const isPlaza = (x, z) => Math.hypot(x, z * 1.1) < 7;
const isPath = (x, z) => Math.abs(z - 9 - Math.sin(x * 0.2) * 1.4) < 1.5 && x > -10 || Math.abs(x + 6 + Math.sin(z * 0.2)) < 1.1 && z > -8 && z < 10;
const pond = (x, z) => Math.hypot(x + 15, z - 9) < 4.2;
const grassCells = [];
for (let x = -H; x < H; x++) for (let z = -H; z < H; z++) {
  let h = hgt(x, z); if (isPlaza(x, z) || isPath(x, z)) h = Math.min(h, 0); if (pond(x, z)) h = -1;
  for (let y = Math.min(h, 0) - 1; y <= h; y++) {
    const top = y === h; let c;
    if (pond(x, z) && top) c = hsl(0.55, 0.45, 0.32 + rnd() * 0.03);
    else if (isPlaza(x, z) && top) c = hsl(0.1, 0.06, 0.4 + rnd() * 0.08);
    else if (isPath(x, z) && top) c = hsl(0.09, 0.35, 0.36 + rnd() * 0.05);
    else if (top) c = hsl(0.28 + rnd() * 0.03, 0.5, 0.24 + rnd() * 0.06);
    else c = hsl(0.08, 0.35, 0.2 + rnd() * 0.03);
    ground.add(x, y - 0.5, z, c);
    if (top && !isPlaza(x, z) && !isPath(x, z) && !pond(x, z)) grassCells.push([x, h, z]);
  }
}
ground.build();

// ---------- 建築與小物 ----------
const wood = () => hsl(0.08, 0.4, 0.3 + rnd() * 0.06), plaster = () => hsl(0.12, 0.25, 0.7 + rnd() * 0.06), stone = () => hsl(0.1, 0.05, 0.45 + rnd() * 0.1), dark = () => hsl(0.07, 0.3, 0.16);
const solid = new Voxels(), glowWin = new Voxels({ emissive: 0xffc060, cast: false }), blueFlame = [];
const lights = []; // 夜間會亮的光源 {light, base, kind}
function house(x0, z0, w, d, h, roof, rotChim = true) {
  solid.fill(x0, 0, z0, w, 1, d, stone);
  for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) { const edge = x === 0 || z === 0 || x === w - 1 || z === d - 1; if (edge) solid.add(x0 + x, y, z0 + z, (x + z + y) % 7 === 0 ? wood() : plaster()); }
  for (let k = 0; k < Math.ceil(Math.max(w, d) / 2) + 1; k++) { // 階梯式屋頂
    const y = h + k; for (let x = -1 + k; x <= w - k; x++) for (let z = -1; z <= d; z++) if (k * 2 < w + 1) solid.add(x0 + x, y, z0 + z, hsl(roof[0], roof[1], roof[2] + rnd() * 0.05 - k * 0.012));
  }
  const dx = x0 + Math.floor(w / 2); solid.add(dx, 1, z0 + d - 1, dark()); solid.add(dx, 2, z0 + d - 1, dark());
  for (const wx of [x0 + 1, x0 + w - 2]) { glowWin.add(wx, 2, z0 + d - 1 + 0.02, 0xffd890, 0.9, 0.9, 1.05); }
  if (rotChim) { for (let y = h; y < h + 4; y++) solid.add(x0 + w - 2, y + 1, z0 + 1, stone()); smokeSources.push([x0 + w - 2, h + 5.5, z0 + 1]); }
}
const smokeSources = [];
house(-22, -12, 7, 6, 4, [0.1, 0.45, 0.28]);   // 木屋（左）
house(12, -6, 8, 7, 4, [0.62, 0.45, 0.3]);     // 藍屋頂（右）
house(-8, -18, 6, 5, 3, [0.02, 0.5, 0.33]);

// 樹
const leaves = new Voxels({ cast: true });
function tree(x, z, hgtT = 5 + rnd() * 3, r = 2.6 + rnd() * 1.2) {
  const gy = Math.max(0, hgt(x, z));
  for (let y = 0; y < hgtT; y++) solid.add(x, gy + y + 0.5, z, hsl(0.07, 0.4, 0.2 + rnd() * 0.05));
  const cx = x, cy = gy + hgtT + 1, cz = z;
  for (let i = -4; i <= 4; i++) for (let j = -3; j <= 4; j++) for (let k = -4; k <= 4; k++) {
    const d = Math.hypot(i, (j - 0.5) * 1.15, k) + rnd() * 0.9; if (d < r) leaves.add(cx + i, cy + j, cz + k, new THREE.Color(), 1, 1, 1, rnd());
  }
}
[[-14, -10], [-20, 0], [4, -17], [21, -12], [24, -2], [-2, -25], [-27, -6], [-26, 14], [31, -5], [28, 6], [-12, -22], [13, -20]].forEach(([x, z]) => tree(x, z, 5 + rnd() * 3, 2.8 + rnd() * 1.2));
tree(-3, -10, 8, 4.8); // 大樹

// 中央石碑（晨曦石的暗示）：三層台階＋發光石碑＋兩座藍色火盆
for (let i = 0; i < 3; i++) for (let x = -3 + i; x <= 3 - i; x++) for (let z = -2 + i; z <= 2 - i; z++) solid.add(x, i + 0.5, z - 1, stone());
const steleCore = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: 0x9fe4ff, emissive: 0x5ac8ff, emissiveIntensity: 0.9, roughness: 0.3 }));
for (let y = 0; y < 5; y++) for (let x = -1; x <= 0; x++) solid.add(x + 0.5, 3.5 + y, -1, hsl(0.58, 0.08, 0.5 + rnd() * 0.08));
steleCore.scale.set(0.8, 3.2, 0.3); steleCore.position.set(0, 6.1, -0.45); scene.add(steleCore);
for (const sx of [-3.8, 3.8]) { for (let y = 0; y < 2; y++) solid.add(sx, y + 0.5, -2, stone()); solid.add(sx, 2.2, -2, 0x2a2a3a, 1.5, 0.5, 1.5); blueFlame.push(new THREE.Vector3(sx, 3, -2)); }
// 營火與木頭
const fire = new THREE.Vector3(6.5, 0.5, 4.5);
for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; solid.add(fire.x + Math.cos(a) * 1.1, 0.6, fire.z + Math.sin(a) * 1.1, 0x6a4a30, 0.7, 0.5, 0.7); }
// 路燈
const lamps = [[-6, 5], [-6, 12], [2, 9.5], [10, 9], [-12, 9.5], [3, 6]];
lamps.forEach(([x, z]) => { for (let y = 0; y < 4; y++) solid.add(x, y + 0.5, z, 0x2a2228, 0.35, 1, 0.35); glowWin.add(x, 4.6, z, 0xffe0a0, 0.5, 0.7, 0.5); });
// 木桶、箱子、柵欄、帳篷
[[10.5, 2], [11.5, 2.5], [-1, 14], [14, -1]].forEach(([x, z]) => solid.add(x, 0.5, z, wood(), 0.9));
for (let x = -20; x < -9; x++) { solid.add(x, 0.6, 13, wood(), 0.2, 0.9, 0.2); solid.add(x, 0.9, 13, wood(), 1, 0.15, 0.15); }
for (let k = 0; k < 4; k++) for (let x = -k; x <= k; x++) solid.add(-14 + x, 0.6 + (3 - k) * 0.9, -3, hsl(0.1, 0.25, 0.72), 0.95, 0.95, 4);
solid.build(); glowWin.build(); const leafMesh = leaves.build();

// ---------- 草與花（風吹）----------
const windU = { value: 0.8 }, timeU = { value: 0 };
const grassGeo = new THREE.BoxGeometry(0.12, 0.7, 0.12); grassGeo.translate(0, 0.35, 0);
const grassMat = new THREE.MeshStandardMaterial({ roughness: 1 });
grassMat.onBeforeCompile = (s) => {
  s.uniforms.uTime = timeU; s.uniforms.uWind = windU;
  s.vertexShader = 'uniform float uTime; uniform float uWind;\n' + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  vec4 wp = instanceMatrix * vec4(position, 1.0);
  float sway = sin(uTime * 2.2 + wp.x * 0.7 + wp.z * 0.5) * 0.22 * uWind * position.y;
  transformed.x += sway; transformed.z += sway * 0.6;`);
};
const GN = LOW ? 3800 : 9000, grass = new THREE.InstancedMesh(grassGeo, grassMat, GN), gm = new THREE.Matrix4();
const grassBase = [];
for (let i = 0; i < GN; i++) {
  const [cx, h, cz] = grassCells[Math.floor(rnd() * grassCells.length)]; const x = cx + rnd() - 0.5, z = cz + rnd() - 0.5;
  const nearPath = Math.hypot(x - fire.x, z - fire.z) < 2; if (nearPath) { i--; continue; }
  gm.compose(new THREE.Vector3(x, h, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * 3, 0)), new THREE.Vector3(1, rr(0.5, 1.25), 1));
  grass.setMatrixAt(i, gm); const c = hsl(0.27 + rnd() * 0.07, 0.6, 0.26 + rnd() * 0.14); grassBase.push(c); grass.setColorAt(i, c);
}
grass.castShadow = false; grass.receiveShadow = true; scene.add(grass);
const flowers = new Voxels({ cast: false });
for (let i = 0; i < 160; i++) { const [cx, h, cz] = grassCells[Math.floor(rnd() * grassCells.length)]; flowers.add(cx + rnd() - 0.5, h + 0.55, cz + rnd() - 0.5, [0xd8333a, 0xe8c040, 0xf0f0f0, 0xe070b0][Math.floor(rnd() * 4)], 0.22); }
flowers.build();
// 池塘水面
const water = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.1, 24), new THREE.MeshStandardMaterial({ color: 0x4a9ac8, roughness: 0.08, metalness: 0.5, transparent: true, opacity: 0.82 }));
water.position.set(-15, -0.55, 9); scene.add(water);

// ---------- 角色（2 頭身像素小人，面向鏡頭的看板）----------
function chibi(hair, cloth, cloth2, accent) {
  const c = document.createElement('canvas'); c.width = 24; c.height = 32; const g = c.getContext('2d');
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  R(6, 1, 12, 11, hair); R(5, 4, 14, 9, hair); R(7, 6, 10, 8, '#f8dcc0');           // 頭髮與臉
  R(7, 5, 10, 2, hair); R(6, 7, 2, 7, hair); R(16, 7, 2, 7, hair);                   // 瀏海與鬢角
  R(8, 9, 2, 2, '#2a2438'); R(14, 9, 2, 2, '#2a2438'); R(8, 9, 1, 1, '#fff'); R(14, 9, 1, 1, '#fff'); R(11, 12, 2, 1, '#d88070'); // 眼嘴
  R(10, 14, 4, 1, '#f0cdb0'); R(7, 15, 10, 8, cloth); R(8, 15, 8, 3, cloth2); R(6, 16, 2, 6, cloth); R(16, 16, 2, 6, cloth); // 身體
  R(6, 22, 2, 2, '#f8dcc0'); R(16, 22, 2, 2, '#f8dcc0'); R(8, 23, 8, 2, accent); R(8, 25, 3, 5, '#4a3a58'); R(13, 25, 3, 5, '#4a3a58'); R(8, 29, 3, 2, '#2a2230'); R(13, 29, 3, 2, '#2a2230');
  // 1px 深色描邊
  const id = g.getImageData(0, 0, 24, 32), d = id.data, out = g.createImageData(24, 32); out.data.set(d);
  const A = (x, y) => (x < 0 || y < 0 || x >= 24 || y >= 32 ? 0 : d[(y * 24 + x) * 4 + 3]);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 24; x++) if (!A(x, y) && (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1))) { const i = (y * 24 + x) * 4; out.data[i] = 36; out.data[i + 1] = 28; out.data[i + 2] = 44; out.data[i + 3] = 255; }
  g.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
}
const people = [];
function person(x, z, tex, h = 4.4) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(h * 0.75, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.5, roughness: 1, emissive: 0x403020, emissiveMap: tex }));
  m.position.set(x, h / 2, z); m.castShadow = true; m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
  scene.add(m); const sh = new THREE.Mesh(new THREE.CircleGeometry(0.9, 16), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.28 })); sh.rotation.x = -Math.PI / 2; sh.position.set(x, 0.03, z); scene.add(sh);
  people.push({ m, h, x, z, ph: rnd() * 6 });
}
person(-1.8, 3.4, chibi('#f0d070', '#fdfdfd', '#e8d8a8', '#c8a850'));
person(8.4, 3.2, chibi('#e88a40', '#58a860', '#e8e0b0', '#a07040'));
person(3.2, 10.4, chibi('#4a5a8a', '#c86878', '#f0e0e0', '#a84858'));

// ---------- 光源 ----------
const sun = new THREE.DirectionalLight(0xfff0d0, 3); sun.castShadow = true; sun.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 160 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04; scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xbcd8ff, 0x4a5a3a, 0.7); scene.add(hemi);
const fireLight = new THREE.PointLight(0xff8a30, 0, 22, 1.6); fireLight.position.set(fire.x, 1.8, fire.z); fireLight.castShadow = false; scene.add(fireLight);
const lampLights = lamps.slice(0, 4).map(([x, z]) => { const l = new THREE.PointLight(0xffd090, 0, 16, 1.6); l.position.set(x, 4.8, z); scene.add(l); return l; });
const blueLights = blueFlame.map((p) => { const l = new THREE.PointLight(0x5ac0ff, 0, 14, 1.7); l.position.copy(p).add(new THREE.Vector3(0, 1, 0)); scene.add(l); return l; });
const steleLight = new THREE.PointLight(0x7ad0ff, 0, 18, 1.5); steleLight.position.set(0, 6, 0.5); scene.add(steleLight);

// ---------- 粒子（火焰、煙、螢火蟲、落葉、雨）----------
function glowTex(r, g, b) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(0.4, `rgba(${r},${g},${b},0.45)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
const flameTex = glowTex(255, 150, 50), blueTex = glowTex(90, 190, 255), smokeTex = glowTex(235, 235, 240), flyTex = glowTex(255, 240, 140);
const sprites = [];
function spawnSprite(tex, additive, life, pos, vel, size0, size1, op) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: 0 })); s.position.copy(pos); scene.add(s); sprites.push({ s, life, t: 0, vel, size0, size1, op }); }
function stepSprites(dt) { for (let i = sprites.length - 1; i >= 0; i--) { const p = sprites[i]; p.t += dt; const k = p.t / p.life; if (k >= 1) { scene.remove(p.s); p.s.material.dispose(); sprites.splice(i, 1); continue; } p.s.position.addScaledVector(p.vel, dt); const sz = p.size0 + (p.size1 - p.size0) * k; p.s.scale.set(sz, sz, 1); p.s.material.opacity = p.op * Math.sin(Math.PI * Math.min(1, k * 1.15)); } }
const flies = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: flyTex, size: 0.7, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
const FN = LOW ? 30 : 70, fpos = new Float32Array(FN * 3), fph = []; for (let i = 0; i < FN; i++) { fpos[i * 3] = rr(-24, 24); fpos[i * 3 + 1] = rr(0.8, 4); fpos[i * 3 + 2] = rr(-14, 22); fph.push(rnd() * 6); }
flies.geometry.setAttribute('position', new THREE.BufferAttribute(fpos, 3)); scene.add(flies);
const RN = LOW ? 350 : 900, rainGeo = new THREE.BufferGeometry(), rpos = new Float32Array(RN * 6);
for (let i = 0; i < RN; i++) { const x = rr(-40, 40), y = rr(0, 40), z = rr(-40, 40); rpos.set([x, y, z, x - 0.1, y - 1.3, z], i * 6); }
rainGeo.setAttribute('position', new THREE.BufferAttribute(rpos, 3)); const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xaac8e8, transparent: true, opacity: 0.45 })); rain.visible = false; scene.add(rain);
const FALL = LOW ? 24 : 60, fall = []; for (let i = 0; i < FALL; i++) { const m = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: 0xffffff })); m.scale.setScalar(0.18); m.position.set(rr(-30, 30), rr(2, 18), rr(-30, 24)); fall.push({ m, v: rr(0.5, 1.2), ph: rnd() * 6 }); scene.add(m); }

// ---------- 後製 ----------
const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.35, 0.5, 0.92); composer.addPass(bloom);
const bokeh = new BokehPass(scene, camera, { focus: 44, aperture: 0.0002, maxblur: 0.012 }); composer.addPass(bokeh);
composer.addPass(new OutputPass());
function resize() {
  const w = innerWidth, h = innerHeight, pr = $('pixel').checked ? Math.min(devicePixelRatio, 2) * (LOW ? 0.4 : 0.5) : Math.min(devicePixelRatio, LOW ? 1.5 : 2);
  renderer.setPixelRatio(pr); renderer.setSize(w, h); composer.setPixelRatio(pr); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); $('pixel').onchange = resize;

// ---------- 時間、季節、天氣 ----------
const SEASON = { spring: { leaf: [[0.33, 0.5, 0.36], [0.28, 0.55, 0.42]], fall: 0xffc0d0, tint: 0 }, summer: { leaf: [[0.3, 0.6, 0.28], [0.27, 0.6, 0.34]], fall: 0x9ad060, tint: 0 }, autumn: { leaf: [[0.07, 0.75, 0.42], [0.12, 0.8, 0.46]], fall: 0xe88a30, tint: 1 } };
function applySeason(name) {
  const S = SEASON[name], list = leafMesh.userData.list, col = new THREE.Color();
  list.forEach((v, i) => { const [h, s, l] = S.leaf[v.tag < 0.55 ? 0 : 1]; col.setHSL(h + (v.tag - 0.5) * 0.04, s, l + (v.tag - 0.5) * 0.12); leafMesh.setColorAt(i, col); }); leafMesh.instanceColor.needsUpdate = true;
  grassBase.forEach((c, i) => { const g = c.clone(); if (name === 'autumn') g.offsetHSL(-0.12, -0.15, -0.02); else if (name === 'summer') g.offsetHSL(0.0, 0.05, -0.04); grass.setColorAt(i, g); }); grass.instanceColor.needsUpdate = true;
  fall.forEach((f) => f.m.material.color.set(S.fall));
}
const lerpC = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
const KEYS = [[0, 0x0a1230, 0x6a80c0, 0.08], [5, 0x2a2a5a, 0xff9a70, 0.5], [7, 0xf0b890, 0xffd0a0, 2.2], [10, 0xa8cde8, 0xfff0d8, 3.2], [15, 0xa8cde8, 0xfff0d0, 3.0], [18, 0xf0a070, 0xff9a50, 2.6], [20, 0x3a3060, 0xff7060, 0.6], [22, 0x0a1230, 0x6a80c0, 0.1], [24, 0x0a1230, 0x6a80c0, 0.08]];
function atTime(t) { let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++; const a = KEYS[i], b = KEYS[i + 1], k = (t - a[0]) / (b[0] - a[0]); return { sky: lerpC(a[1], b[1], k), sunC: lerpC(a[2], b[2], k), sunI: a[3] + (b[3] - a[3]) * k }; }
function applyTime(t) {
  const k = atTime(t), elev = Math.sin((t - 6) / 12 * Math.PI), day = Math.max(0, elev), night = Math.min(1, Math.max(0, 0.5 - elev * 2.2));
  scene.background = k.sky; scene.fog.color.copy(k.sky); scene.fog.density = 0.005 + night * 0.004 + (rain.visible ? 0.01 : 0);
  const ang = (t - 6) / 12 * Math.PI; sun.position.set(Math.cos(ang) * 55, Math.max(8, Math.sin(ang) * 55), 28); sun.target.position.set(0, 0, 0);
  sun.color.copy(k.sunC); sun.intensity = k.sunI * (rain.visible ? 0.45 : 1); hemi.intensity = 0.25 + day * 0.65; hemi.color.copy(k.sky).lerp(new THREE.Color(0xbcd8ff), 0.4);
  fireLight.userData.k = 0.25 + night * 1.2; lampLights.forEach((l) => (l.userData.k = night * 1.6)); blueLights.forEach((l) => (l.userData.k = 0.4 + night * 2.2)); steleLight.userData.k = 0.3 + night * 2;
  scene.traverse((o) => { if (o.isInstancedMesh && o.material.emissive && o.material.emissive.getHex() === 0xffc060) o.material.emissiveIntensity = 0.1 + night * 1.6; });
  flies.material.opacity = night * 0.9 + (t > 18 && t < 21 ? 0.3 : 0); renderer.toneMappingExposure = 0.85 + night * 0.35; bloom.strength = 0.25 + night * 0.4;
  $('clock').textContent = `第 1 天　${String(Math.floor(t)).padStart(2, '0')}:${String(Math.floor((t % 1) * 60)).padStart(2, '0')}　${rain.visible ? '雨' : '晴'}`;
  window.__night = night;
}
$('time').oninput = (e) => applyTime(+e.target.value);
$('season').onchange = (e) => applySeason(e.target.value);
$('wind').oninput = (e) => (windU.value = +e.target.value);
$('rain').onchange = (e) => { rain.visible = e.target.checked; applyTime(+$('time').value); };
if (q.get('t')) $('time').value = q.get('t'); if (q.get('season')) $('season').value = q.get('season'); if (q.get('rain')) $('rain').checked = true;
if (LOW && q.get('dof') !== '1') $('dof').checked = false; if (q.get('dof') === '0') $('dof').checked = false; if (q.get('bloom') === '0') $('bloom').checked = false; if (q.get('auto') === '0') $('auto').checked = false; if (q.get('pixel') === '0') $('pixel').checked = false;
$('quality').value = q.get('q') || ''; $('quality').onchange = (e) => { const u = new URL(location.href); if (e.target.value) u.searchParams.set('q', e.target.value); else u.searchParams.delete('q'); location.href = u.toString(); };
rain.visible = $('rain').checked; applySeason($('season').value); resize(); applyTime(+$('time').value);
if (q.get('cam')) { const c = q.get('cam').split(',').map(Number); camera.position.set(c[0], c[1], c[2]); controls.target.set(c[3], c[4], c[5]); }

// ---------- 主迴圈 ----------
const clock = new THREE.Clock(); let acc = 0, T = 0;
function frame() {
  const dt = Math.min(0.05, clock.getDelta()); T += dt; timeU.value = T; acc += dt;
  const night = window.__night ?? 0;
  fireLight.intensity = (fireLight.userData.k ?? 1) * (1 + Math.sin(T * 17) * 0.12 + Math.sin(T * 7.3) * 0.1) * 40;
  lampLights.forEach((l) => (l.intensity = (l.userData.k ?? 0) * 12)); blueLights.forEach((l, i) => (l.intensity = (l.userData.k ?? 0) * 20 * (1 + Math.sin(T * 6 + i) * 0.08))); steleLight.intensity = (steleLight.userData.k ?? 0) * 9 * (1 + Math.sin(T * 1.7) * 0.1);
  steleCore.material.emissiveIntensity = 0.7 + Math.sin(T * 1.7) * 0.25 + night * 0.9;
  // 火焰、煙、藍焰
  if (acc > 0.05) { acc = 0;
    spawnSprite(flameTex, true, 0.7, new THREE.Vector3(fire.x + rr(-0.3, 0.3), fire.y + 0.3, fire.z + rr(-0.3, 0.3)), new THREE.Vector3(rr(-0.2, 0.2), rr(1.4, 2.2), rr(-0.2, 0.2)), 1.3, 0.4, 0.9);
    for (const b of blueFlame) spawnSprite(blueTex, true, 0.9, new THREE.Vector3(b.x + rr(-0.2, 0.2), b.y, b.z + rr(-0.2, 0.2)), new THREE.Vector3(rr(-0.1, 0.1), rr(0.8, 1.5), 0), 1.2, 0.3, 0.85);
    if (rnd() < 0.5) spawnSprite(smokeTex, false, 5, new THREE.Vector3(fire.x, fire.y + 1.5, fire.z), new THREE.Vector3(windU.value * 0.5 + 0.2, 1.2, 0.1), 0.8, 3.2, 0.28);
    for (const s of smokeSources) if (rnd() < 0.35) spawnSprite(smokeTex, false, 6, new THREE.Vector3(s[0], s[1], s[2]), new THREE.Vector3(windU.value * 0.6 + 0.3, 1.1, 0.1), 0.9, 4, 0.34);
  }
  stepSprites(dt);
  // 螢火蟲、落葉、雨
  const fp = flies.geometry.attributes.position; for (let i = 0; i < FN; i++) { fp.array[i * 3] += Math.sin(T * 0.7 + fph[i]) * dt * 0.6; fp.array[i * 3 + 1] += Math.cos(T * 0.9 + fph[i] * 2) * dt * 0.4; fp.array[i * 3 + 2] += Math.cos(T * 0.5 + fph[i]) * dt * 0.6; } fp.needsUpdate = true;
  fall.forEach((f) => { f.m.position.y -= f.v * dt; f.m.position.x += (0.9 * windU.value + Math.sin(T * 1.5 + f.ph) * 0.6) * dt; f.m.position.z += Math.cos(T + f.ph) * 0.3 * dt; f.m.rotation.set(T * 2 + f.ph, T + f.ph, 0); if (f.m.position.y < 0.2) { f.m.position.set(rr(-30, 30), rr(14, 20), rr(-30, 24)); } });
  if (rain.visible) { const a = rainGeo.attributes.position.array; for (let i = 0; i < RN; i++) { const y = (a[i * 6 + 1] - dt * 38); const ny = y < 0 ? y + 40 : y; const dy = ny - a[i * 6 + 1]; a[i * 6 + 1] += dy; a[i * 6 + 4] += dy; } rainGeo.attributes.position.needsUpdate = true; }
  // 角色待機（輕微上下，永遠面向鏡頭）
  for (const p of people) { p.m.position.y = p.h / 2 + Math.abs(Math.sin(T * 2.2 + p.ph)) * 0.12; p.m.rotation.y = Math.atan2(camera.position.x - p.m.position.x, camera.position.z - p.m.position.z); }
  // 運鏡
  if ($('auto').checked && !q.get('cam')) { const a = T * 0.05; controls.target.set(Math.sin(a) * 3, 2.2, 2); camera.position.x += (26 + Math.sin(a * 1.3) * 5 - camera.position.x) * 0.01; }
  controls.update();
  // 景深焦點：對準角色
  const fd = camera.position.distanceTo(new THREE.Vector3(1.5, 2, 4)); bokeh.uniforms.focus.value = fd; bokeh.uniforms.aperture.value = $('dof').checked ? 0.00007 : 0; bokeh.uniforms.maxblur.value = $('dof').checked ? 0.007 : 0;
  bloom.enabled = $('bloom').checked;
  composer.render(); window.__info = { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, low: LOW, dt }; window.__frames = (window.__frames || 0) + 1; requestAnimationFrame(frame);
}
frame();
