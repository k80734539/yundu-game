import type { Game } from '../core/Game';
import { DB } from '../data';

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
/** 進階提示：新手教學完成後，依條件出現（不用照順序），達成或做過就不再出現；× 關掉全部提示 */
interface Tip { id: string; when: (g: Game) => boolean; done: (g: Game) => boolean; text: string }
const tier = (g: Game) => DB.job[g.player.ch.job]?.tier ?? 0;
export const TIPS: Tip[] = [
  { id: 'guide', when: (g) => g.quests.activeList().length > 0 && g.player.ch.baseLv >= 5 && g.player.ch.baseLv < 14, done: (g) => !!g.flags.guideSeen,
    text: '不知道任務怎麼做？看畫面右側任務欄的「📍」：它會告訴你下一步去哪、找誰，並在畫面上畫出方向箭頭（點一下可開關）。' },
  { id: 'merc', when: (g) => tier(g) >= 1 && g.player.ch.baseLv >= 15, done: (g) => !!g.flags.hiredMerc,
    text: '到晨曦鎮東南邊找傭兵團長巴頓：花 Zeny 雇一位輔助傭兵（牧師補血、樂師增益、煉金術士丟炸彈、馴獸師帶戰獸），契約 30 分鐘，不吃經驗。' },
  { id: 'quarter', when: (g) => g.player.ch.baseLv >= 30, done: (g) => !!g.flags.quarterSeen,
    text: '等級 30 以後，到晨曦鎮東邊的軍需官凱爾看看：遠征軍需處賣更強的「星隕」系列武器與防具。' },
  { id: 'starfall', when: (g) => tier(g) >= 3 && g.player.ch.baseLv >= 70, done: (g) => !!g.flags.visited?.starfall,
    text: '熔岩谷東北角的傳送點通往「星落鎮」：有傳送員、旅館、鍛造師，還有 Lv85 以上的「天穹」裝備，再往後就是天空神殿與深淵迴廊。' },
  { id: 'job2', when: (g) => tier(g) === 1 && g.player.ch.jobLv >= 40, done: (g) => tier(g) >= 2,
    text: '職業等級 40 了！回晨曦鎮北邊找轉職官雷歐，完成進階試煉就能再轉職。' },
  { id: 'job3', when: (g) => tier(g) === 2 && g.player.ch.jobLv >= 50 && g.player.ch.baseLv >= 60, done: (g) => tier(g) >= 3,
    text: '職業等級 50、基本等級 60 都到了！找轉職官雷歐挑戰最終轉職試煉（要打倒專屬 Boss），通過就能轉成最高階職業。' },
];
export class Tutorial {
  t = 0; lastTip = '';
  constructor(private g: Game) {}
  get step() { return this.g.flags.tut ?? 0; }
  get off() { return !!this.g.flags.tutOff; }
  update(dt: number) {
    this.t += dt; if (this.t < 0.5) return; this.t = 0;
    const g = this.g;
    let s = this.step, changed = false;
    while (s < STEPS.length && STEPS[s].done(g)) { s++; changed = true; }
    if (s >= STEPS.length) { const id = this.tip()?.id || ''; if (id !== this.lastTip) { this.lastTip = id; g.ui.tutorialHint(); if (id && !this.off) g.audio.sfx('quest'); } }
    if (changed) {
      g.flags.tut = s;
      if (!this.off) { g.audio.sfx('quest'); if (s >= STEPS.length) g.msg('新手教學完成！祝你冒險愉快。', 'quest'); }
      g.ui.tutorialHint();
    }
  }
  tip(): Tip | null { if (this.off || this.step < STEPS.length) return null; return TIPS.find((t) => t.when(this.g) && !t.done(this.g)) || null; }
  text(): string | null { const s = this.step; if (this.off) return null; if (s >= STEPS.length) { const t = this.tip(); return t ? `提示：${t.text}` : null; } return `新手教學 ${s + 1}/${STEPS.length}：${STEPS[s].text}`; }
}
