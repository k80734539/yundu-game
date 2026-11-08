import type { Game } from '../core/Game';

interface Step { text: string; done: (g: Game) => boolean }
/** 新手教學：一步一步提示，條件達成自動進到下一步（進度存在 flags.tut） */
export const STEPS: Step[] = [
  { text: '點擊噴水池旁頭上有「!」的導覽員艾莉，和她說話。', done: (g) => !!g.flags.talkedGuide },
  { text: '按 Alt+A 打開能力值視窗，把能力點數分配出去（點「+」）。', done: (g) => g.player.ch.statPts < 24 || g.player.ch.baseLv > 1 },
  { text: '按 Alt+E 打開背包。雙擊道具可以使用或裝備，拖到下方快捷列可以用 F1~F9 使用。', done: (g) => !!g.flags.openedInv },
  { text: '向艾莉接下「初次狩獵」任務（對話選「新手任務」）。', done: (g) => !!g.quests.s.q_tut1 },
  { text: '從城鎮南邊的藍色傳送點前往「南方草原」。', done: (g) => !!g.flags.visited?.prt_fild },
  { text: '點擊怪物會自動走過去攻擊。打倒 5 隻粉紅色的啵啵團！HP 低時按 F1 喝紅色藥水。', done: (g) => g.quests.isDone('q_tut1') || (g.quests.s.q_tut1?.n || 0) >= 5 },
  { text: '回到晨曦鎮，向艾莉回報任務（她頭上會出現綠色「?」）。', done: (g) => g.quests.isDone('q_tut1') },
  { text: '職業等級提升會得到技能點數。按 Alt+S 學習「基本技能」。', done: (g) => (g.player.ch.skills.basic || 0) >= 1 },
  { text: '基本技能 Lv3 以後，按 Insert 可以坐下快速回復 HP／SP。', done: (g) => !!g.flags.sat },
  { text: '職業等級 10、基本技能 Lv9 後，到北邊教堂前找轉職官雷歐，完成轉職試煉就能轉職！', done: (g) => g.player.ch.job !== 'novice' },
];
export class Tutorial {
  t = 0;
  constructor(private g: Game) {}
  get step() { return this.g.flags.tut ?? 0; }
  get off() { return !!this.g.flags.tutOff; }
  update(dt: number) {
    this.t += dt; if (this.t < 0.5) return; this.t = 0;
    const g = this.g;
    let s = this.step, changed = false;
    while (s < STEPS.length && STEPS[s].done(g)) { s++; changed = true; }
    if (changed) {
      g.flags.tut = s;
      if (!this.off) { g.audio.sfx('quest'); if (s >= STEPS.length) g.msg('新手教學完成！祝你冒險愉快。', 'quest'); }
      g.ui.tutorialHint();
    }
  }
  text(): string | null { const s = this.step; if (this.off || s >= STEPS.length) return null; return `新手教學 ${s + 1}/${STEPS.length}：${STEPS[s].text}`; }
}
