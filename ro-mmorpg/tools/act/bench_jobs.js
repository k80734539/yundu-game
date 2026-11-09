// 職業輸出測試（固定、可重複）：基本 45／職業 50、固定技能配置、玩家不死，在失落遺跡連續擊殺 8 隻守衛，量總秒數與 SP 耗盡情形。
// 用法：把檔尾的 'CLSNAME' 換成 swordsman/paladin/mage/elementalist/archer/ranger。秒數越小越強；不含裝備與閃躲，只看相對差距。
const res = await page.evaluate((CLS) => {
  const G = window.__game, p = G.player, ch = G.player.ch, DB = window.__DB;
  G.loop.running = false;
  const T1 = { swordsman: 'swordsman', paladin: 'swordsman', mage: 'mage', elementalist: 'mage', archer: 'archer', ranger: 'archer' }[CLS];
  const T2 = ['paladin', 'elementalist', 'ranger'].includes(CLS) ? CLS : null;
  ch.baseLv = 45; ch.job = 'novice'; ch.jobLv = 10;
  G.changeJob(T1); ch.jobLv = 40; if (T2) G.changeJob(T2); ch.jobLv = 50;
  ch.skillPts = 0; ch.statPts = 280;
  const PL = { swordsman: ['str', 'str', 'vit', 'dex', 'agi'], mage: ['int', 'int', 'dex', 'int', 'vit'], archer: ['dex', 'dex', 'agi', 'dex', 'str'] }[T1];
  for (let k = 0; ch.statPts > 0 && k < 3000; k++) { const b = ch.statPts; G.raiseStat(PL[k % PL.length]); if (ch.statPts === b) { G.raiseStat(PL[0]); if (ch.statPts === b) break; } }
  const B = {
    swordsman: { sword_mastery: 10, bash: 10, hp_recovery: 5, provoke: 5, endure: 3, magnum: 5, battle_spirit: 10 },
    mage: { arcane: 10, firebolt: 10, coldbolt: 10, soulstrike: 10, thunderstorm: 10, sp_recovery: 10, mana_focus: 10 },
    archer: { owl_eye: 10, vulture_eye: 5, double_strafe: 10, concentration: 5, arrow_shower: 10, charge_arrow: 10, eagle_focus: 10 },
    paladin: { spear_mastery: 10, pierce: 10, riding: 5, guard: 5, whirlwind: 5 },
    elementalist: { mana_cycle: 10, meteor: 10, frost_nova: 10, chain_lightning: 10, barrier: 5 },
    ranger: { hunter_instinct: 10, falcon: 10, multi_shot: 10, seeker_arrow: 10, trap: 10, wind_step: 5 },
  };
  ch.skills = { basic: 9, ...B[T1], ...(T2 ? B[T2] : {}) };
  for (const k of Object.keys(ch.skills)) if (!DB.skill[k]) delete ch.skills[k];
  const learned = Object.keys(ch.skills).filter((k) => k !== 'basic' && DB.skill[k].type === 'active');
  const buffIds = learned.filter((id) => DB.skill[id].effect === 'buff');
  const score = (id) => { const s = DB.skill[id], lv = ch.skills[id]; return ((s.power || [100])[lv - 1] || 100) * (s.hits === 'lv' ? lv : s.hits === 'half' ? Math.ceil(lv / 2) : (typeof s.hits === 'number' ? s.hits : 1)) / (((s.cast || [0])[lv - 1] || 0) + ((s.cd || [0.5])[lv - 1] || 0.5)); };
  const atkIds = learned.filter((id) => !['buff', 'debuff'].includes(DB.skill[id].effect)).sort((a, b) => score(b) - score(a));
  p.recalc(true); p.hp = p.maxHp; p.sp = p.maxSp;
  G.loadMap('ruins', 10, 47);
  const step = 1 / 60; let t = 0, kills = 0, skillCasts = 0, buffT = 0, skT = 0, noSp = 0;
  G.ev.on('kill', () => kills++);
  const GOAL = 8, CAP = 400;
  while (kills < GOAL && t < CAP) {
    G.update(step); t += step; buffT -= step; skT -= step;
    p.hp = p.maxHp; if (p.dead) { G.respawn(); continue; }
    if (!(p.chase && !p.chase.dead)) { const ms = G.monsters.filter((m) => !m.dead && !m.isMvp && m.def.id === 'ruin_guard').sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)); if (ms[0]) p.chase = ms[0]; }
    if (buffT <= 0) { for (const id of buffIds) if ((G.skillCd[id] || 0) <= 0 && p.sp > 60) G.useSkill(id); buffT = 5; }
    if (skT <= 0 && !G.skills.cast && p.chase && !p.chase.dead) { let used = false; for (const id of atkIds) { if ((G.skillCd[id] || 0) <= 0 && p.sp >= DB.skill[id].sp[ch.skills[id] - 1]) { G.useSkill(id); skillCasts++; used = true; break; } } if (!used) noSp += 0.1; skT = 0.1; }
  }
  return { cls: CLS, seconds: +t.toFixed(0), done: kills >= GOAL, casts: skillCasts, idleNoSp: +noSp.toFixed(0), hp: p.maxHp, sp: p.maxSp, skills: atkIds.join(',') };
}, 'CLSNAME');
console.log('RESULT', JSON.stringify(res));
