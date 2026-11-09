// 職業平衡機器人：把檔尾的 'CLSNAME' 換成 swordsman/paladin/mage/elementalist/archer/ranger，基本 45／職業 50、失落遺跡打 240 秒；無裝備、不閃躲，只能看相對差距
const res = await page.evaluate((CLS) => {
  const G = window.__game, p = G.player, ch = p.ch;
  G.loop.running = false;
  const T1 = { swordsman: 'swordsman', paladin: 'swordsman', mage: 'mage', elementalist: 'mage', archer: 'archer', ranger: 'archer' }[CLS];
  const T2 = ['paladin', 'elementalist', 'ranger'].includes(CLS) ? CLS : null;
  ch.baseLv = 45; ch.job = 'novice'; ch.jobLv = 10; ch.skills = { basic: 9 };
  G.changeJob(T1); ch.jobLv = 50; if (T2) { ch.jobLv = 40; G.changeJob(T2); ch.jobLv = 50; }
  // 相同的點數預算：一轉 49+5，二轉再加 49+5
  ch.skillPts = (T2 ? 108 : 54); ch.statPts = 280;
  const PL = { swordsman: ['str', 'str', 'vit', 'dex', 'agi'], mage: ['int', 'int', 'dex', 'int', 'vit'], archer: ['dex', 'dex', 'agi', 'dex', 'str'] }[T1];
  for (let k = 0; ch.statPts > 0 && k < 3000; k++) { const b = ch.statPts; G.raiseStat(PL[k % PL.length]); if (ch.statPts === b) { G.raiseStat(PL[0]); if (ch.statPts === b) break; } }
  const PRI = { swordsman: ['sword_mastery', 'bash', 'hp_recovery', 'provoke', 'endure', 'magnum'], mage: ['arcane', 'firebolt', 'coldbolt', 'soulstrike', 'thunderstorm', 'sp_recovery'], archer: ['owl_eye', 'vulture_eye', 'double_strafe', 'concentration', 'arrow_shower', 'charge_arrow'] }[T1]
    .concat({ paladin: ['spear_mastery', 'pierce', 'riding', 'guard', 'whirlwind'], elementalist: ['mana_cycle', 'meteor', 'frost_nova', 'chain_lightning', 'barrier'], ranger: ['hunter_instinct', 'falcon', 'multi_shot', 'trap', 'wind_step'] }[T2] || []);
  for (let round = 0; round < 6; round++) for (const id of (T2 ? PRI.slice(6).concat(PRI.slice(0, 6)) : PRI)) { let g = 0; while (g++ < 12 && G.learnSkill(id)); }
  const atk = { bash: 1, magnum: 1, firebolt: 1, coldbolt: 1, soulstrike: 1, thunderstorm: 1, double_strafe: 1, arrow_shower: 1, charge_arrow: 1, pierce: 1, whirlwind: 1, meteor: 1, frost_nova: 1, chain_lightning: 1, multi_shot: 1, trap: 1 };
  const buff = ['guard', 'barrier', 'wind_step', 'endure'];
  const learned = Object.keys(ch.skills).filter((k) => ch.skills[k] > 0 && k !== 'basic');
  // 攻擊技能：以「威力×段數 / (詠唱+冷卻)」粗排，強的先放
  const score = (id) => { const s = DB().skill[id], lv = ch.skills[id]; return ((s.power || [100])[lv - 1] || 100) * (s.hits === 'lv' ? lv : s.hits === 'half' ? Math.ceil(lv / 2) : (typeof s.hits === 'number' ? s.hits : 1)) / (((s.cast || [0])[lv - 1] || 0) + ((s.cd || [0.5])[lv - 1] || 0.5)); };
  function DB() { return window.__DB; }
  const atkIds = learned.filter((id) => atk[id]).sort((a, b) => score(b) - score(a));
  const buffIds = learned.filter((id) => buff.includes(id));
  p.recalc(true); p.hp = p.maxHp; p.sp = p.maxSp;
  G.inv.add('white_potion', 60); G.inv.add('blue_potion', 60);
  G.loadMap('ruins', 12, 12);
  let kills = 0, deaths = 0, pots = 0, sp_pots = 0, t = 0; const step = 1 / 60, DUR = 240;
  G.ev.on('kill', () => kills++);
  const usePot = (id) => { const it = G.inv.items.find((i) => i.id === id); if (it) { G.useItem(it.uid); return true; } return false; };
  let potCd = 0, skT = 0, buffT = 0, fast = 0;
  while (t < DUR) {
    G.update(step); t += step; potCd -= step; skT -= step; buffT -= step;
    if (p.dead) { deaths++; G.respawn(); for (let i = 0; i < 30; i++) G.update(step); G.loadMap('ruins', 12, 12); p.hp = p.maxHp; continue; }
    if (potCd <= 0 && p.hp < p.maxHp * 0.45 && usePot('white_potion')) { pots++; potCd = 1; }
    if (potCd <= 0 && p.sp < p.maxSp * 0.15 && usePot('blue_potion')) { sp_pots++; potCd = 1; }
    if (!(p.chase && !p.chase.dead)) {
      const ms = G.monsters.filter((m) => !m.dead && !m.isMvp).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
      if (ms[0]) p.chase = ms[0];
    }
    if (buffT <= 0) { for (const id of buffIds) if ((G.skillCd[id] || 0) <= 0) G.useSkill(id); buffT = 5; }
    if (skT <= 0 && !G.skills.cast && p.chase && !p.chase.dead) { for (const id of atkIds) { if ((G.skillCd[id] || 0) <= 0 && p.sp >= DB().skill[id].sp[ch.skills[id] - 1]) { G.useSkill(id); break; } } skT = 0.1; }
  }
  return { cls: CLS, kills, perMin: +(kills / (DUR / 60)).toFixed(1), deaths, whitePots: pots, bluePots: sp_pots, hp: p.maxHp, sp: p.maxSp, atk: atkIds.join(','), stats: ch.stats };
}, 'CLSNAME');
console.log('RESULT', JSON.stringify(res));
