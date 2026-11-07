import type { Game } from '../core/Game';
import { DB } from '../data';
import { expNeed, jobExpNeed, statPointsForLevel } from './Stats';

/** 經驗值與升級：Base 升級得能力點數並補滿 HP/SP，Job 升級得技能點數 */
export function gainExp(g: Game, base: number, job: number, quiet = false) {
  const p = g.player, ch = p.ch;
  if (base > 0) {
    ch.baseExp += base;
    let up = 0;
    while (ch.baseLv < 99 && ch.baseExp >= expNeed(ch.baseLv)) {
      ch.baseExp -= expNeed(ch.baseLv); ch.baseLv++; up++;
      ch.statPts += statPointsForLevel(ch.baseLv);
    }
    if (up) {
      p.recalc(true);
      g.levelUpFx('base');
      g.msg(`基本等級提升到 ${ch.baseLv}！獲得能力點數。`, 'sys');
    }
  }
  if (job > 0) {
    const jd = DB.job[ch.job];
    if (ch.jobLv < jd.maxJob) {
      ch.jobExp += job;
      let up = 0;
      while (ch.jobLv < jd.maxJob && ch.jobExp >= jobExpNeed(ch.job, ch.jobLv)) {
        ch.jobExp -= jobExpNeed(ch.job, ch.jobLv); ch.jobLv++; ch.skillPts++; up++;
      }
      if (ch.jobLv >= jd.maxJob) ch.jobExp = 0;
      if (up) {
        p.recalc();
        g.levelUpFx('job');
        g.msg(`職業等級提升到 ${ch.jobLv}！獲得技能點數。`, 'sys');
        if (ch.job === 'novice' && ch.jobLv >= 10) g.msg('職業等級已達 10，可以到晨曦鎮找轉職官轉職了！', 'quest');
      }
    }
  }
  if (!quiet && (base || job)) g.msg(`獲得經驗值 ${base} / 職業經驗 ${job}`, 'exp');
  g.ev.emit('stats');
}
