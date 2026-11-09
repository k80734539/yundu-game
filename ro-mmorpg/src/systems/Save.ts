import type { Game } from '../core/Game';
import { DB } from '../data';

/** 舊版只有一個存檔（rom.save），現在分成 3 個角色欄位 rom.save.s1~s3（各自有 .bak 備份） */
export const LEGACY_KEY = 'rom.save', LEGACY_BAK = 'rom.save.bak', SLOTS = 3;
const keyOf = (n: number) => `rom.save.s${n}`, bakOf = (n: number) => `rom.save.s${n}.bak`, trashOf = (n: number) => `rom.trash.s${n}`;
export interface SlotInfo { slot: number; name: string; job: string; baseLv: number; jobLv: number; map: string; t: number }
/** 目前存檔版本；改存檔格式時 +1 並在 migrations 補一個升級函式 */
export const SAVE_V = 3;
type Data = Record<string, any>;
/** migrations[v]：把第 v 版的資料升到 v+1 */
export const migrations: Record<number, (d: Data) => Data> = {
  // v1 → v2：v1 沒有快捷列與造訪紀錄
  1: (d) => ({ ...d, hotbar: d.hotbar || [{ type: 'item', id: 'red_potion' }, null, null, null, null, null, null, null, null], flags: { visited: {}, ...(d.flags || {}) } }),
  // v2 → v3：儲存點從字串改成物件，新增 MVP 計時
  2: (d) => ({ ...d, savePoint: typeof d.savePoint === 'string' ? { map: d.savePoint, x: 25, y: 30 } : d.savePoint || { map: 'aurora', x: 25, y: 30 }, mvp: d.mvp || {} }),
};
/** FNV-1a 校驗碼：偵測存檔被截斷或手動改壞 */
export function checksum(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16);
}
export function pack(data: Data): string {
  const body = JSON.stringify(data);
  return JSON.stringify({ v: SAVE_V, t: Date.now(), sum: checksum(body), data: body });
}
/** 解析＋驗證＋遷移；失敗回傳 null */
export function unpack(raw: string | null): Data | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    if (typeof o !== 'object' || typeof o.data !== 'string' || typeof o.v !== 'number') return null;
    if (checksum(o.data) !== o.sum) return null;
    let d = JSON.parse(o.data);
    let v = o.v;
    if (v > SAVE_V) return null;
    while (v < SAVE_V) { const m = migrations[v]; if (!m) return null; d = m(d); v++; }
    if (!d.ch || !d.ch.job || !DB.job[d.ch.job]) return null;
    return d;
  } catch { return null; }
}

/** 儲存層：優先 localStorage；不能用時退回記憶體（至少這次遊玩不會壞），並記錄是否真的存得住 */
const mem: Record<string, string> = {};
let lsOk = true;
(() => { try { localStorage.setItem('rom.test', '1'); localStorage.removeItem('rom.test'); } catch { lsOk = false; } })();
const store = {
  get(k: string): string | null { if (lsOk) { try { return localStorage.getItem(k); } catch { lsOk = false; } } return k in mem ? mem[k] : null; },
  set(k: string, v: string) { if (lsOk) { try { localStorage.setItem(k, v); return; } catch { lsOk = false; } } mem[k] = v; },
  del(k: string) { if (lsOk) { try { localStorage.removeItem(k); } catch { lsOk = false; } } delete mem[k]; },
};
const rawTime = (raw: string | null): number => { try { return raw ? JSON.parse(raw).t || 0 : 0; } catch { return 0; } };
export type CloudState = 'pending' | 'on' | 'off';

/** 存檔：每個角色欄位寫進 localStorage（有版本號、校驗碼、備份），並同步到這個頁面的雲端個人空間（db 能力，只有本人讀得到）。
 *  換瀏覽器、換手機、清除網站資料都不會丟失；沒有登入或沒有 db 時只存在這個瀏覽器，畫面上會提醒。 */
export class Save {
  private soonT = -1; private autoT = 0;
  loadedFrom: 'main' | 'backup' | 'new' = 'new';
  pendingMerc: { type: string; left: number } | null = null;
  slot = 1;
  cloud: { state: CloudState; uid: string; db: any; err: string; syncedAt: number } = { state: 'pending', uid: '', db: null, err: '', syncedAt: 0 };
  private pushQ = new Map<number, string | { trashed: string | null }>(); private pushT = -1; private pushing = false;
  onCloudChange: (() => void) | null = null;
  get localOk() { return lsOk; }
  constructor(private g: Game) {
    this.migrateLegacy();
    const flush = () => this.flush();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  }
  /** 舊的單一存檔搬到欄位 1 */
  migrateLegacy() {
    const old = store.get(LEGACY_KEY);
    if (!old) return;
    if (!store.get(keyOf(1))) { store.set(keyOf(1), old); const b = store.get(LEGACY_BAK); if (b) store.set(bakOf(1), b); }
    store.del(LEGACY_KEY); store.del(LEGACY_BAK);
  }
  // ---------------- 雲端 ----------------
  /** 連線到雲端個人空間並和本機合併（較新的那份勝出）。可重複呼叫 */
  async initCloud(): Promise<boolean> {
    try {
      const cl = (window as any).claude;
      if (!cl || typeof cl.use !== 'function') { this.setCloud('off', '不在 Claude 頁面中'); return false; }
      const [user, db] = await Promise.all([cl.use('user'), cl.use('db')]);
      const uid = user ? await user.id() : null;
      if (!db || !uid) { this.setCloud('off', uid ? '沒有雲端權限' : '尚未登入'); return false; }
      this.cloud.db = db; this.cloud.uid = String(uid);
      await this.pullAll();
      this.setCloud('on', '');
      return true;
    } catch (e: any) { this.setCloud('off', String(e?.message || e?.code || e)); return false; }
  }
  private setCloud(state: CloudState, err: string) { this.cloud.state = state; this.cloud.err = err; this.onCloudChange?.(); }
  private ref(n: number) { return this.cloud.db.doc(`data/users/${this.cloud.uid}/save_s${n}`); }
  private async pullAll() {
    for (let n = 1; n <= SLOTS; n++) {
      const snap = await this.ref(n).get();
      const local = store.get(keyOf(n)), lt = rawTime(local);
      if (snap.exists) {
        const c = snap.data() as { raw?: string; t?: number; deleted?: boolean } | undefined;
        const ct = c?.t || 0;
        if (c?.deleted) { // 已刪除：雲端保留原內容，可以在標題畫面「復原」
          if (lt <= ct) { store.del(keyOf(n)); store.del(bakOf(n)); if (c.raw && unpack(c.raw)) store.set(trashOf(n), c.raw); }
          else { if (local) this.queuePush(n, local); }
          continue;
        }
        if (c?.raw && unpack(c.raw) && ct > lt) { if (local && unpack(local)) store.set(bakOf(n), local); store.set(keyOf(n), c.raw); }
        else if (lt > ct && local && unpack(local)) this.queuePush(n, local);
      } else if (local && unpack(local)) this.queuePush(n, local);
    }
    this.cloud.syncedAt = Date.now();
    await this.flush();
  }
  private queuePush(n: number, raw: string | { trashed: string | null }, now = false) { this.pushQ.set(n, raw); this.pushT = now ? 0.01 : Math.min(this.pushT > 0 ? this.pushT : 99, 4); }
  /** 立刻把排隊中的存檔寫到雲端（一次一個，等上一個寫完） */
  async flush() {
    if (this.cloud.state === 'off' || !this.cloud.db || this.pushing) return;
    this.pushing = true;
    try {
      for (const [n, raw] of [...this.pushQ]) {
        this.pushQ.delete(n);
        if (typeof raw !== 'string') { const d = raw.trashed ? unpack(raw.trashed) : null; await this.ref(n).set({ deleted: true, t: Date.now(), ...(raw.trashed ? { raw: raw.trashed, name: d?.ch?.name || '', job: d?.ch?.job || '', lv: d?.ch?.baseLv || 0 } : {}) }); }
        else { const d = unpack(raw); await this.ref(n).set({ raw, t: rawTime(raw) || Date.now(), name: d?.ch?.name || '', job: d?.ch?.job || '', lv: d?.ch?.baseLv || 0 }); }
      }
      this.cloud.syncedAt = Date.now(); if (this.cloud.state !== 'on') this.setCloud('on', '');
    } catch (e: any) { this.cloud.err = String(e?.message || e?.code || e); if (this.cloud.state === 'on') this.onCloudChange?.(); }
    this.pushing = false;
  }
  // ---------------- 讀寫 ----------------
  readSlot(n: number): Data | null {
    const main = store.get(keyOf(n)), bak = store.get(bakOf(n));
    const d = unpack(main); if (d) { this.loadedFrom = 'main'; return d; }
    const b = unpack(bak); if (b) { this.loadedFrom = 'backup'; return b; }
    return null;
  }
  /** 三個欄位的摘要（標題畫面用） */
  list(): (SlotInfo | null)[] {
    const out: (SlotInfo | null)[] = [];
    for (let n = 1; n <= SLOTS; n++) {
      const d = this.readSlot(n);
      out.push(d ? { slot: n, name: d.ch.name, job: d.ch.job, baseLv: d.ch.baseLv, jobLv: d.ch.jobLv, map: d.map, t: rawTime(store.get(keyOf(n))) } : null);
    }
    return out;
  }
  /** 刪除＝移到「垃圾桶」：本機與雲端都保留原內容，標題畫面可以復原；該欄位建立新角色時才會真正蓋掉 */
  deleteSlot(n: number) {
    const raw = store.get(keyOf(n)), old = raw && unpack(raw) ? raw : (() => { const b = store.get(bakOf(n)); return b && unpack(b) ? b : null; })();
    if (old) store.set(trashOf(n), old);
    store.del(keyOf(n)); store.del(bakOf(n));
    if (this.cloud.state !== 'off') { this.queuePush(n, { trashed: old }, true); void this.flush(); }
  }
  /** 每個欄位被刪除、可以復原的角色 */
  trashList(): (SlotInfo | null)[] {
    const out: (SlotInfo | null)[] = [];
    for (let n = 1; n <= SLOTS; n++) {
      const raw = store.get(trashOf(n)); const d = raw && !store.get(keyOf(n)) ? unpack(raw) : null;
      out.push(d ? { slot: n, name: d.ch.name, job: d.ch.job, baseLv: d.ch.baseLv, jobLv: d.ch.jobLv, map: d.map, t: rawTime(raw) } : null);
    }
    return out;
  }
  restoreSlot(n: number): boolean {
    const raw = store.get(trashOf(n)); if (!raw || !unpack(raw) || store.get(keyOf(n))) return false;
    store.set(keyOf(n), raw); store.del(trashOf(n));
    if (this.cloud.state !== 'off') { this.queuePush(n, raw, true); void this.flush(); }
    return true;
  }
  /** 在欄位建立新角色：清掉這個欄位的垃圾桶 */
  clearTrash(n: number) { store.del(trashOf(n)); }
  /** 匯出／匯入：把存檔變成一串文字，可以貼到別的裝置 */
  exportCode(n: number): string | null { const raw = store.get(keyOf(n)); return raw && unpack(raw) ? 'ROM1:' + btoa(unescape(encodeURIComponent(raw))) : null; }
  importCode(n: number, code: string): string | null {
    try {
      const t = code.trim(); if (!t.startsWith('ROM1:')) return '這不是存檔代碼（要以 ROM1: 開頭）';
      const raw = decodeURIComponent(escape(atob(t.slice(5))));
      const d = unpack(raw); if (!d) return '存檔代碼已損壞或版本太新，無法讀取';
      const prev = store.get(keyOf(n)); if (prev && unpack(prev)) store.set(bakOf(n), prev);
      store.set(keyOf(n), raw); if (this.cloud.state !== 'off') { this.queuePush(n, raw, true); void this.flush(); }
      return null;
    } catch { return '存檔代碼格式不正確'; }
  }
  snapshot(): Data {
    const g = this.g, p = g.player;
    return {
      ch: p.ch, hp: Math.ceil(p.hp), sp: Math.ceil(p.sp), inv: g.inv.toJSON(), hotbar: g.hotbar,
      map: g.map.def.id, x: Math.floor(p.x), y: Math.floor(p.y), savePoint: g.savePoint,
      quests: g.quests.s, flags: g.flags, mvp: g.spawner.mvp, audio: g.audio?.vol || null, merc: g.mercs.toJSON(),
    };
  }
  save(manual = false) {
    const prev = store.get(keyOf(this.slot));
    if (prev && unpack(prev)) store.set(bakOf(this.slot), prev); // 只備份「驗證通過」的舊存檔
    const raw = pack(this.snapshot());
    store.set(keyOf(this.slot), raw);
    if (this.cloud.state !== 'off') { this.queuePush(this.slot, raw, manual); if (manual) void this.flush(); }
    if (manual) this.g.msg(this.cloud.state === 'on' ? '已存檔（本機＋雲端）。' : lsOk ? '已存檔（只存在這個瀏覽器）。' : '這個瀏覽器不能保存資料，存檔只在這次遊玩有效！請用「匯出存檔代碼」自行保存。', this.cloud.state === 'on' || lsOk ? 'sys' : 'warn');
  }
  saveSoon() { this.soonT = 1; }
  update(dt: number) {
    if (this.soonT > 0) { this.soonT -= dt; if (this.soonT <= 0) { this.soonT = -1; this.save(); } }
    this.autoT += dt; if (this.autoT >= 30) { this.autoT = 0; this.save(); }
    if (this.pushT > 0) { this.pushT -= dt; if (this.pushT <= 0) { this.pushT = -1; void this.flush(); } }
  }
  /** 一句話說明目前的存檔位置（標題與設定畫面用） */
  statusText(): { text: string; level: 'ok' | 'warn' | 'bad' } {
    if (this.cloud.state === 'on') return { text: '☁ 已連線雲端存檔：換瀏覽器或手機也能繼續', level: 'ok' };
    if (this.cloud.state === 'pending') return { text: '正在連線雲端存檔…', level: 'warn' };
    if (!lsOk) return { text: '⚠ 這個瀏覽器不能保存資料，關掉就會消失！請用「匯出存檔代碼」備份', level: 'bad' };
    return { text: `⚠ 存檔只存在這個瀏覽器（${this.cloud.err || '未連線雲端'}）。換瀏覽器或清除資料會消失，建議用「匯出存檔代碼」備份`, level: 'warn' };
  }
  /** 讀取：主存檔壞了就用備份 */
  read(): Data | null { return this.readSlot(this.slot); }
  hasSave() { return !!this.read(); }
  apply(d: Data) {
    const g = this.g, p = g.player;
    p.ch = { ...p.ch, ...d.ch, stats: { ...p.ch.stats, ...d.ch.stats }, skills: { ...(d.ch.skills || {}) } };
    g.inv.load(d.inv || { items: [], equip: {} });
    g.hotbar = (d.hotbar || []).slice(0, 9); while (g.hotbar.length < 9) g.hotbar.push(null);
    g.savePoint = d.savePoint || g.savePoint;
    g.quests.s = d.quests || {};
    g.flags = { visited: {}, ...(d.flags || {}) };
    g.spawner.init(d.mvp);
    if (d.audio && g.audio) g.audio.loadVol(d.audio);
    p.recalc(); p.refreshLook();
    p.hp = Math.max(1, Math.min(p.maxHp, d.hp ?? p.maxHp)); p.sp = Math.min(p.maxSp, d.sp ?? p.maxSp);
    this.pendingMerc = d.merc ?? null; // 地圖載入完成後再讓傭兵出現
    return { map: DB.map[d.map] ? d.map : 'aurora', x: d.x, y: d.y };
  }
  /** 存檔後回到角色選擇畫面 */
  async toTitle() { this.save(true); await this.flush(); location.reload(); }
}
