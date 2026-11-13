import type { Game } from '../core/Game';
import { DB, STORY, StoryQuest, StoryStep } from '../data';
import { Npc } from '../entities/Npc';
import { gainExp } from './Exp';

/** 主線劇情的存檔狀態（放在 flags.story，跟著存檔走；舊存檔沒有就從序章開始） */
export interface StoryState { q: string | null; step: number; n: number; started: boolean; done: string[]; seen: string[] }

/** 主線：依序進行 data/story.json 的任務；每個任務有幾個步驟（對話、調查點、擊倒、自動演出） */
export class Story {
  /** 正在播放劇情（期間世界暫停） */
  scene = false;
  /** 夜鴉之類暫時出場的角色 */
  private actor: Npc | null = null;
  private autoT = -1;
  constructor(private g: Game) {}

  get st(): StoryState {
    const f = this.g.flags;
    if (!f.story) f.story = { q: STORY.quests[0]?.id ?? null, step: 0, n: 0, started: false, done: [], seen: [] };
    const st = f.story as StoryState;
    if (!st.q) { const nx = STORY.quests.find((q) => !st.done.includes(q.id)); if (nx) { st.q = nx.id; st.step = 0; st.n = 0; st.started = false; } } // 之後加了新章節，舊存檔接著做
    return st;
  }
  get quest(): StoryQuest | null { const id = this.st.q; return id ? STORY.quests.find((q) => q.id === id) || null : null; }
  /** 目前進行中的步驟（任務還沒開始或等級不夠就是 null） */
  get step(): StoryStep | null { const q = this.quest; if (!q || !this.st.started) return null; return q.steps[this.st.step] || null; }
  chapter(id: string) { return STORY.chapters.find((c) => c.id === id); }
  isDone(id: string) { return this.st.done.includes(id); }
  /** 下一章還沒做好（主線全部完成） */
  get finished() { return !this.st.q; }

  /** 每個 frame：等級到了就開始任務；自動演出的倒數；夜鴉淡出 */
  update(dt: number) {
    const g = this.g; if (g.inTitle) return;
    const st = this.st, q = this.quest;
    if (q && !st.started && g.player.ch.baseLv >= (q.reqLv || 1) && !this.chapter(q.chapter)?.todo) this.begin(q);
    const s = this.step;
    if (s?.type === 'auto' && !this.scene && !g.ui.dialog.isOpen && (!s.map || s.map === g.map.def.id)) {
      if (this.autoT < 0) this.autoT = s.delay ?? 1.6;
      this.autoT -= dt;
      if (this.autoT <= 0) { this.autoT = -1; this.playAuto(s); }
    }
    if (this.actor && !this.scene) {
      this.actor.fade = (this.actor.fade ?? 1) - dt * 1.5;
      if (this.actor.fade <= 0) { this.actor.remove = true; this.g.entities = this.g.entities.filter((e) => e !== this.actor); this.g.npcs = this.g.npcs.filter((e) => e !== this.actor); this.actor = null; }
    }
  }
  private begin(q: StoryQuest) {
    const st = this.st; st.started = true; st.step = 0; st.n = 0;
    const ch = this.chapter(q.chapter);
    const firstOfChapter = !st.seen.includes(q.chapter);
    if (firstOfChapter) { st.seen.push(q.chapter); if (ch) this.g.ui.showBanner(ch.name, '主線劇情', 'story', 3.4); }
    this.g.msg(`【主線】${q.name}：${q.steps[0]?.hint || ''}`, 'quest');
    this.g.audio?.sfx('quest');
    this.g.ev.emit('quest');
  }
  /** 這個 NPC 現在有主線要講（頭上顯示金色「!」） */
  wantsNpc(id: string) { const s = this.step; return !!s && s.type === 'talk' && s.npc === id; }
  /** 和 NPC 說話時呼叫：輪到他就播主線，回傳 true（不開一般對話） */
  onTalk(npc: Npc): boolean {
    const s = this.step; if (!s || s.type !== 'talk' || s.npc !== npc.def.id) return false;
    this.play(s.lines || [], () => this.advance());
    return true;
  }
  onKill(mid: string) {
    const s = this.step; if (!s || s.type !== 'kill' || s.target !== mid) return;
    this.st.n++;
    const need = s.count || 1;
    if (this.st.n >= need) this.advance(); else this.g.ev.emit('quest');
  }
  /** 目前這張地圖要顯示的調查點 */
  spotHere(): StoryStep | null { const s = this.step; return s && s.type === 'spot' && s.map === this.g.map.def.id ? s : null; }
  /** 玩家走到調查點旁邊（或點了它） */
  investigate() {
    const s = this.spotHere(); if (!s || this.scene) return;
    this.play(s.lines || [], () => this.advance());
  }
  private playAuto(s: StoryStep) {
    const g = this.g, p = g.player;
    if (s.actor && DB.npc[s.actor]) {
      const spot = g.map.nearestWalkable(Math.floor(p.x + 2), Math.floor(p.y - 1), 4) || [Math.floor(p.x), Math.floor(p.y)];
      const n = new Npc(DB.npc[s.actor], spot[0] + 0.5, spot[1] + 0.5, 0);
      n.face(p.x, p.y); p.face(n.x, n.y); n.fade = 1;
      g.npcs.push(n); g.entities.push(n); this.actor = n;
      for (let i = 0; i < 14; i++) g.fx.glow(n.x, n.y, Math.random() * 60, '#6a4a9a', 0.9, 3, 40);
    }
    this.play(s.lines || [], () => this.advance());
  }
  /** 播放一段劇情；結束（或玩家按 × 跳過）時呼叫 then */
  play(lines: import('../data').SceneItem[], then: () => void) {
    const g = this.g;
    this.scene = true; g.player.stop(); g.player.chase = null; g.talkTarget = null;
    g.ui.dialog.scene(lines, () => { this.scene = false; then(); });
  }
  /** 完成目前步驟，進到下一步或結算任務 */
  advance() {
    const q = this.quest, st = this.st; if (!q) return;
    st.step++; st.n = 0;
    if (st.step < q.steps.length) {
      this.g.msg(`【主線】${q.name}：${q.steps[st.step].hint || ''}`, 'quest');
      this.g.ev.emit('quest'); this.g.save?.saveSoon();
      return;
    }
    this.complete(q);
  }
  private complete(q: StoryQuest) {
    const g = this.g, st = this.st, r = q.reward || {}, ch = g.player.ch;
    st.done.push(q.id);
    const i = STORY.quests.indexOf(q), next = STORY.quests[i + 1];
    st.q = next ? next.id : null; st.step = 0; st.n = 0; st.started = false;
    g.msg(`完成主線：${q.name}！`, 'quest');
    const got: string[] = [];
    if (r.zeny) { ch.zeny += r.zeny; got.push(`${r.zeny.toLocaleString()} Zeny`); }
    if (r.statPts) { ch.statPts += r.statPts; got.push(`能力點數 +${r.statPts}`); }
    for (const [it, n] of r.items || []) { if (g.inv.add(it, n)) got.push(`${DB.item[it].name}×${n}`); else g.msg(`負重已滿，${DB.item[it].name} 掉在地上了`, 'warn'); }
    if (r.charm) got.push(this.giveCharm(r.charm));
    if (got.length) g.msg(`獲得 ${got.join('、')}`, 'item');
    gainExp(g, r.exp || 0, r.jexp || 0);
    g.audio?.sfx('questdone');
    g.fx.dmg(g.player.x, g.player.y, 'CLEAR', 'skill', 150);
    if (q.chapterEnd) {
      const c = this.chapter(q.chapter);
      g.after(1.4, () => {
        g.ui.showBanner(`${c?.name || ''} 完`, next ? '' : '主線待續', 'story', 3.6);
        const nc = next ? this.chapter(next.chapter) : STORY.chapters.find((c) => c.todo);
        if (!next && nc) g.msg(`【主線】${nc.name}——製作中，敬請期待！`, 'quest');
      });
    }
    g.ev.emit('quest'); g.ev.emit('stats'); g.save?.saveSoon();
  }
  /** 晨曦護符升級：背包或身上已經有就直接換成下一階（位置與裝備狀態不變），沒有就給新的 */
  giveCharm(tier: number): string {
    const g = this.g, id = `dawn_charm${tier}`, def = DB.item[id]; if (!def) return '';
    const old = g.inv.items.find((it) => it.id.startsWith('dawn_charm'));
    if (old) { old.id = id; g.player.recalc(); g.ev.emit('inv'); g.ev.emit('stats'); }
    else if (!g.inv.add(id, 1)) { g.msg('負重已滿，晨曦護符先放在噴水池邊……清出空間再回來調查一次噴水池吧。', 'warn'); g.flags.charmOwed = tier; }
    return def.name;
  }
  /** 欠著的護符（當時負重滿了）：之後回噴水池補給 */
  payOwed() { const t = this.g.flags.charmOwed; if (!t) return false; if (this.g.inv.add(`dawn_charm${t}`, 1)) { this.g.flags.charmOwed = 0; this.g.msg(`獲得 ${DB.item['dawn_charm' + t].name}`, 'item'); return true; } return false; }
  /** 引導用：目前主線的一行說明與目標位置（npc／地圖／座標／怪物） */
  target(): { text: string; npc?: string; map?: string; x?: number; y?: number; mon?: string; wait?: number } | null {
    const q = this.quest, st = this.st; if (!q) return null;
    if (!st.started) return { text: `主線「${q.name}」：Lv${q.reqLv} 開始`, wait: q.reqLv };
    const s = this.step; if (!s) return null;
    const pre = `主線「${q.name}」：`;
    if (s.type === 'talk') return { text: pre + (s.hint || ''), npc: s.npc };
    if (s.type === 'spot') return { text: pre + (s.hint || ''), map: s.map, x: s.x! + 0.5, y: s.y! + 0.5 };
    if (s.type === 'kill') return { text: pre + (s.hint || '') + ((s.count || 1) > 1 ? `（${st.n}/${s.count}）` : ''), mon: s.target };
    return { text: pre + (s.hint || ''), map: s.map };
  }
  /** 測試用：直接把主線跳到某個任務的某一步 */
  jump(id: string, step = 0) { const st = this.st; st.q = id; st.step = step; st.n = 0; st.started = true; this.g.ev.emit('quest'); }
}
