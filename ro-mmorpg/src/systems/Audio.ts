import { mulberry32 } from '../core/math';

/** 音樂主題：全部程式合成（沒有音檔） */
interface Theme { bpm: number; root: number; scale: number[]; prog: number[]; lead: OscillatorType; pad: OscillatorType; drums: number; seed: number; bassOct: number; swing?: number; dark?: boolean }
const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10], PENTA = [0, 2, 4, 7, 9], LYD = [0, 2, 4, 6, 7, 9, 11], PHR = [0, 1, 3, 5, 7, 8, 10], DOR = [0, 2, 3, 5, 7, 9, 10];
const THEMES: Record<string, Theme> = {
  town: { bpm: 100, root: 60, scale: MAJ, prog: [0, 5, 3, 4], lead: 'triangle', pad: 'sine', drums: 1, seed: 11, bassOct: -2 },
  field1: { bpm: 118, root: 62, scale: MAJ, prog: [0, 3, 4, 0], lead: 'square', pad: 'triangle', drums: 2, seed: 23, bassOct: -2 },
  field2: { bpm: 106, root: 64, scale: LYD, prog: [0, 1, 5, 4], lead: 'triangle', pad: 'sine', drums: 1, seed: 37, bassOct: -2, swing: 0.1 },
  beach: { bpm: 112, root: 65, scale: PENTA, prog: [0, 3, 1, 4], lead: 'sine', pad: 'triangle', drums: 2, seed: 41, bassOct: -2, swing: 0.15 },
  swamp: { bpm: 78, root: 57, scale: DOR, prog: [0, 6, 5, 4], lead: 'sine', pad: 'sawtooth', drums: 0, seed: 53, bassOct: -2, dark: true },
  dungeon1: { bpm: 92, root: 55, scale: MIN, prog: [0, 5, 6, 4], lead: 'square', pad: 'triangle', drums: 1, seed: 67, bassOct: -2, dark: true },
  dungeon2: { bpm: 100, root: 52, scale: PHR, prog: [0, 1, 0, 6], lead: 'sawtooth', pad: 'square', drums: 2, seed: 71, bassOct: -2, dark: true },
};
const freq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Web Audio：BGM 依地圖切換並交叉淡入淡出；音效合成；主音量／BGM／音效分開設定 */
export class Audio {
  ctx: AudioContext | null = null;
  master!: GainNode; sfxBus!: GainNode; musicBus!: GainNode;
  vol = { master: 0.8, bgm: 0.55, sfx: 0.8 };
  private cur: { theme: string; gain: GainNode; next: number; step: number; rnd: () => number; melody: number[] } | null = null;
  private old: GainNode[] = [];
  private want = '';
  private timer = 0;
  private last: Record<string, number> = {};
  private noiseBuf: AudioBuffer | null = null;
  constructor() {
    try { const v = JSON.parse(localStorage.getItem('rom.audio') || 'null'); if (v) this.vol = { ...this.vol, ...v }; } catch { /* */ }
    const unlock = () => { this.unlock(); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || (window as any).webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain(); this.musicBus.connect(this.master);
    this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master);
    this.applyVol();
    const n = this.ctx.sampleRate; this.noiseBuf = this.ctx.createBuffer(1, n, n);
    const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.timer = window.setInterval(() => this.schedule(), 50);
    if (this.want) { const w = this.want; this.want = ''; this.bgm(w); }
  }
  applyVol() { if (!this.ctx) return; this.master.gain.value = this.vol.master; this.musicBus.gain.value = this.vol.bgm * 0.5; this.sfxBus.gain.value = this.vol.sfx * 0.7; }
  setVol(k: 'master' | 'bgm' | 'sfx', v: number) { this.vol[k] = v; this.applyVol(); try { localStorage.setItem('rom.audio', JSON.stringify(this.vol)); } catch { /* */ } if (k !== 'bgm') this.sfx('click'); }
  loadVol(v: any) { if (v) { this.vol = { ...this.vol, ...v }; this.applyVol(); } }

  // ---------------- BGM ----------------
  bgm(theme: string) {
    if (!THEMES[theme]) theme = 'town';
    if (!this.ctx) { this.want = theme; return; }
    if (this.cur?.theme === theme) return;
    const t = this.ctx.currentTime;
    if (this.cur) { // 舊的淡出
      const g = this.cur.gain; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + 1.5);
      this.old.push(g); setTimeout(() => { g.disconnect(); this.old = this.old.filter((x) => x !== g); }, 1700);
    }
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 1.8); g.connect(this.musicBus);
    const th = THEMES[theme], rnd = mulberry32(th.seed);
    // 預先產生 32 步的旋律（固定種子：每次進地圖都是同一首）
    const melody: number[] = [];
    let deg = 0;
    for (let i = 0; i < 64; i++) { if (rnd() < 0.3) melody.push(-99); else { deg += Math.floor(rnd() * 5) - 2; deg = Math.max(-2, Math.min(9, deg)); melody.push(deg); } }
    this.cur = { theme, gain: g, next: t + 0.1, step: 0, rnd, melody };
  }
  private schedule() {
    const c = this.ctx, cur = this.cur; if (!c || !cur) return;
    const th = THEMES[cur.theme], spb = 60 / th.bpm / 2; // 八分音符
    while (cur.next < c.currentTime + 0.25) {
      const s = cur.step, bar = Math.floor(s / 8) % 4, beat = s % 8;
      const chord = th.prog[bar];
      const sw = th.swing && s % 2 ? spb * th.swing : 0;
      const t = cur.next + sw;
      const note = (degree: number, oct = 0) => { const sc = th.scale; const o = Math.floor(degree / sc.length); const i = ((degree % sc.length) + sc.length) % sc.length; return th.root + sc[i] + 12 * (o + oct); };
      // 和弦墊音（每小節）
      if (beat === 0) for (const k of [0, 2, 4]) this.tone(cur.gain, freq(note(chord + k, -1)), t, spb * 7.5, th.pad, th.dark ? 0.035 : 0.04, 0.3, 0.6);
      // 貝斯
      if (beat % 2 === 0) this.tone(cur.gain, freq(note(chord + (beat === 4 ? 4 : 0), th.bassOct)), t, spb * 1.6, 'triangle', 0.16, 0.01, 0.2);
      // 旋律
      const m = cur.melody[s % 64];
      if (m > -99) this.tone(cur.gain, freq(note(chord + m, 0)), t, spb * (cur.melody[(s + 1) % 64] === -99 ? 1.8 : 0.9), th.lead, th.lead === 'sine' ? 0.09 : th.lead === 'triangle' ? 0.08 : 0.035, 0.01, 0.4);
      // 鼓
      if (th.drums) {
        if (beat === 0 || beat === 4 || (th.drums > 1 && beat === 6)) this.kick(cur.gain, t);
        if (beat === 2 || beat === 6) this.noise(cur.gain, t, 0.08, th.drums > 1 ? 0.12 : 0.07, 1800, 'bandpass');
        if (th.drums > 1 || beat % 2 === 1) this.noise(cur.gain, t, 0.03, 0.03, 8000, 'highpass');
      } else if (beat === 0) this.noise(cur.gain, t, 1.2, 0.02, 400, 'lowpass');
      cur.next += spb; cur.step++;
    }
  }
  // ---------------- 合成基本元件 ----------------
  private tone(dest: AudioNode, f: number, t: number, dur: number, type: OscillatorType, vol: number, att = 0.005, rel = 0.1, slideTo = 0) {
    const c = this.ctx!; const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.setValueAtTime(vol, t + Math.max(att, dur - rel)); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  private noise(dest: AudioNode, t: number, dur: number, vol: number, fq: number, type: BiquadFilterType, sweep = 0) {
    const c = this.ctx!; if (!this.noiseBuf) return;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(fq, t); if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  private kick(dest: AudioNode, t: number) { this.tone(dest, 150, t, 0.18, 'sine', 0.35, 0.002, 0.15, 40); }

  // ---------------- 音效 ----------------
  sfx(name: string) {
    const c = this.ctx; if (!c) return;
    const now = c.currentTime;
    if (this.last[name] && now - this.last[name] < 0.04) return; // 同一音效太密集時略過
    this.last[name] = now;
    const d = this.sfxBus, t = now + 0.005;
    const T = (f: number, dt: number, dur: number, type: OscillatorType, vol: number, slide = 0) => this.tone(d, f, t + dt, dur, type, vol, 0.003, Math.min(0.1, dur * 0.6), slide);
    const N = (dt: number, dur: number, vol: number, fq: number, type: BiquadFilterType = 'bandpass', sweep = 0) => this.noise(d, t + dt, dur, vol, fq, type, sweep);
    switch (name) {
      case 'hit': N(0, 0.09, 0.5, 900); T(180, 0, 0.08, 'square', 0.12, 70); break;
      case 'crit': N(0, 0.14, 0.6, 1500); T(240, 0, 0.12, 'square', 0.15, 60); T(1400, 0.02, 0.12, 'triangle', 0.12, 2200); break;
      case 'hurt': T(220, 0, 0.16, 'sawtooth', 0.12, 90); N(0, 0.08, 0.3, 500); break;
      case 'miss': N(0, 0.12, 0.18, 3000, 'highpass', 6000); break;
      case 'swing': N(0, 0.1, 0.2, 1200, 'bandpass', 3500); break;
      case 'bow': T(520, 0, 0.12, 'triangle', 0.14, 300); N(0, 0.08, 0.12, 4000, 'highpass'); break;
      case 'magic': T(500, 0, 0.18, 'sine', 0.12, 1200); T(750, 0.02, 0.16, 'sine', 0.06, 1600); break;
      case 'die': T(400, 0, 0.18, 'square', 0.08, 120); N(0.02, 0.15, 0.2, 700); break;
      case 'levelup': [0, 4, 7, 12, 16].forEach((k, i) => T(freq(72 + k), i * 0.08, 0.3, 'triangle', 0.14)); T(freq(84), 0.42, 0.6, 'sine', 0.1); break;
      case 'pickup': T(880, 0, 0.06, 'square', 0.07); T(1320, 0.06, 0.08, 'square', 0.07); break;
      case 'coin': T(1560, 0, 0.08, 'square', 0.06); T(2090, 0.07, 0.15, 'square', 0.06); break;
      case 'potion': T(300, 0, 0.25, 'sine', 0.12, 900); T(500, 0.08, 0.2, 'sine', 0.08, 1200); break;
      case 'heal': [0, 4, 7].forEach((k, i) => T(freq(76 + k), i * 0.06, 0.3, 'sine', 0.1)); break;
      case 'warp': T(200, 0, 0.5, 'sine', 0.12, 1600); T(300, 0.05, 0.45, 'triangle', 0.06, 2400); break;
      case 'click': case 'open': T(name === 'open' ? 900 : 1200, 0, 0.04, 'square', 0.05); break;
      case 'close': T(700, 0, 0.05, 'square', 0.05, 400); break;
      case 'talk': T(660 + Math.random() * 80, 0, 0.04, 'square', 0.03); break;
      case 'equip': T(1800, 0, 0.06, 'square', 0.05); N(0, 0.06, 0.15, 5000, 'highpass'); T(1200, 0.05, 0.08, 'triangle', 0.06); break;
      case 'quest': T(freq(79), 0, 0.12, 'triangle', 0.1); T(freq(84), 0.1, 0.2, 'triangle', 0.1); break;
      case 'questdone': [0, 4, 7, 12].forEach((k, i) => T(freq(67 + k), i * 0.1, 0.35, 'square', 0.06)); break;
      case 'announce': T(freq(84), 0, 0.6, 'sine', 0.12); T(freq(91), 0.15, 0.6, 'sine', 0.08); break;
      case 'death': [0, -3, -7, -12].forEach((k, i) => T(freq(64 + k), i * 0.18, 0.4, 'triangle', 0.12)); break;
      case 'cast': T(400, 0, 0.3, 'sine', 0.05, 800); N(0, 0.3, 0.05, 6000, 'highpass'); break;
      case 'refine_ok': [0, 7, 12, 19].forEach((k, i) => T(freq(76 + k), i * 0.07, 0.25, 'triangle', 0.1)); N(0, 0.08, 0.2, 6000, 'highpass'); break;
      case 'refine_fail': N(0, 0.4, 0.5, 2500, 'bandpass', 300); T(300, 0, 0.4, 'sawtooth', 0.08, 60); break;
      case 'loot_rare': [0, 7, 12].forEach((k, i) => T(freq(79 + k), i * 0.07, 0.35, 'sine', 0.1)); N(0, 0.25, 0.08, 7000, 'highpass'); break;
      case 'loot_legend': [0, 4, 7, 12, 16, 19].forEach((k, i) => T(freq(72 + k), i * 0.06, 0.5, 'triangle', 0.12)); T(freq(96), 0.4, 0.8, 'sine', 0.1); N(0, 0.5, 0.1, 6000, 'highpass'); break;
      case 'thunder': N(0, 0.35, 0.7, 2000, 'lowpass', 200); T(80, 0, 0.3, 'sawtooth', 0.12, 40); break;
      case 'skill_slash': N(0, 0.15, 0.4, 2000, 'bandpass', 600); T(300, 0, 0.12, 'square', 0.12, 100); break;
      case 'skill_fire_burst': N(0, 0.5, 0.7, 800, 'lowpass', 150); T(120, 0, 0.4, 'sawtooth', 0.12, 40); break;
      case 'skill_fire_bolt': N(0, 0.3, 0.3, 1200, 'bandpass', 400); T(600, 0, 0.25, 'sawtooth', 0.05, 200); break;
      case 'skill_cold_bolt': T(1800, 0, 0.2, 'sine', 0.1, 2600); T(2400, 0.05, 0.25, 'triangle', 0.06, 1800); break;
      case 'skill_soul': T(700, 0, 0.25, 'sine', 0.1, 300); T(1050, 0.03, 0.22, 'sine', 0.06, 450); break;
      case 'skill_thunder': T(900, 0, 0.1, 'square', 0.04, 1800); break;
      case 'skill_double': case 'skill_charge': T(600, 0, 0.1, 'triangle', 0.14, 280); T(600, 0.12, 0.1, 'triangle', 0.12, 280); break;
      case 'skill_shower': for (let i = 0; i < 5; i++) N(i * 0.04, 0.06, 0.15, 5000, 'highpass'); break;
      case 'skill_provoke': T(200, 0, 0.2, 'sawtooth', 0.12, 400); break;
      case 'skill_buff_gold': case 'skill_buff_green': [0, 5, 9, 12].forEach((k, i) => T(freq(74 + k), i * 0.05, 0.25, 'sine', 0.08)); break;
      case 'skill_heal': [0, 4, 7].forEach((k, i) => T(freq(76 + k), i * 0.06, 0.3, 'sine', 0.1)); break;
      default: T(800, 0, 0.05, 'square', 0.04);
    }
  }
  ui(name: string) { this.sfx(name); }
}
