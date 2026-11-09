// 試煉 Boss 實戰：基本 60／二轉職業 50、B 階裝備、能力與技能照一般配點，藥水有限，量勝負、時間、用掉的藥水。把 'CLSNAME' 換成 paladin/elementalist/ranger，MERCNAME 換傭兵 id 或 ''。
const res = await page.evaluate(() => {
  const CLS = 'CLSNAME', MERC = 'MERCNAME';
  const G = window.__game, p = G.player, ch = p.ch, DB = window.__DB; G.loop.running = false; const step = 1 / 60;
  const T1 = { paladin: 'swordsman', elementalist: 'mage', ranger: 'archer' }[CLS], T3 = { paladin: 'templar', elementalist: 'archmage', ranger: 'sniper' }[CLS];
  ch.baseLv = 60; ch.job = 'novice'; ch.jobLv = 10; G.changeJob(T1); ch.jobLv = 40; G.changeJob(CLS); ch.jobLv = 50; ch.skills = { basic: 9 }; ch.skillPts = 0; ch.statPts = 320; ch.zeny = 1e6;
  const PL = { swordsman: ['str', 'str', 'vit', 'dex', 'agi'], mage: ['int', 'int', 'dex', 'int', 'vit'], archer: ['dex', 'dex', 'agi', 'dex', 'str'] }[T1];
  for (let k = 0; ch.statPts > 0 && k < 3000; k++) { const b = ch.statPts; G.raiseStat(PL[k % PL.length]); if (ch.statPts === b) { G.raiseStat(PL[0]); if (ch.statPts === b) break; } }
  const B = { swordsman: { sword_mastery: 10, bash: 10, hp_recovery: 5, provoke: 5, endure: 3, magnum: 5, battle_spirit: 10 }, mage: { arcane: 10, firebolt: 10, coldbolt: 10, soulstrike: 10, thunderstorm: 10, sp_recovery: 10, mana_focus: 10 }, archer: { owl_eye: 10, vulture_eye: 5, double_strafe: 10, concentration: 5, arrow_shower: 10, charge_arrow: 10, eagle_focus: 10 },
    paladin: { spear_mastery: 10, pierce: 10, riding: 5, guard: 5, whirlwind: 5 }, elementalist: { mana_cycle: 10, meteor: 10, frost_nova: 10, chain_lightning: 10, barrier: 5 }, ranger: { hunter_instinct: 10, falcon: 10, multi_shot: 10, seeker_arrow: 10, trap: 10, wind_step: 5 } };
  ch.skills = { basic: 9, ...B[T1], ...B[CLS] }; for (const k of Object.keys(ch.skills)) if (!DB.skill[k]) delete ch.skills[k];
  const KIT = { paladin: ['steel_blade', 'steel_plate', 'steel_helm', 'kite_shield', 'wind_cloak', 'traveler_boots', 'power_ring'], elementalist: ['sage_staff', 'mystic_robe', 'sage_hat', 'spell_ward', 'wind_cloak', 'traveler_boots', 'wisdom_earring'], ranger: ['hunter_bow', 'hunter_vest', 'hunter_cap', 'wind_cloak', 'traveler_boots', 'nimble_glove'] }[CLS];
  G.inv.items.length = 0; G.inv.equip = {}; for (const id of KIT) { G.inv.add(id); const it = G.inv.items.filter((i) => i.id === id).pop(); if (it) G.inv.equipItem(it.uid, CLS, 60); }
  G.inv.add('white_potion', 60); G.inv.add('blue_potion', 40);
  const learned = Object.keys(ch.skills).filter((k) => k !== 'basic' && DB.skill[k].type === 'active');
  const buffIds = learned.filter((id) => DB.skill[id].effect === 'buff');
  const score = (id) => { const s = DB.skill[id], lv = ch.skills[id]; return ((s.power || [100])[lv - 1] || 100) * (s.hits === 'lv' ? lv : s.hits === 'half' ? Math.ceil(lv / 2) : (typeof s.hits === 'number' ? s.hits : 1)) / (((s.cast || [0])[lv - 1] || 0) + ((s.cd || [0.5])[lv - 1] || 0.5)); };
  const atkIds = learned.filter((id) => !['buff', 'debuff'].includes(DB.skill[id].effect)).sort((a, b) => score(b) - score(a));
  p.recalc(true); p.hp = p.maxHp; p.sp = p.maxSp;
  const arena = { paladin: 'trial_templar', elementalist: 'trial_archmage', ranger: 'trial_sniper' }[CLS];
  G.loadMap(arena, 20, 30); if (MERC) G.mercs.hire(MERC);
  const boss = G.monsters.find((m) => m.isMvp); p.x = p.px = boss.x; p.y = p.py = boss.y + 6; p.chase = boss;
  let t = 0, pots = 0, bp = 0, potCd = 0, skT = 0, buffT = 0, minHp = 1, outcome = 'timeout'; const info = { hp: p.maxHp, def: p.d.def, mdef: p.d.mdef, atk: p.d.atkMax, matk: p.d.matkMax };
  while (t < 900) {
    G.update(step); t += step; potCd -= step; skT -= step; buffT -= step;
    minHp = Math.min(minHp, p.hp / p.maxHp);
    if (p.dead) { outcome = 'died@' + Math.round(t); break; }
    if (boss.dead) { outcome = 'win@' + Math.round(t); break; }
    if (potCd <= 0 && p.hp < p.maxHp * 0.5) { const it = G.inv.items.find((i) => i.id === 'white_potion'); if (it) { G.useItem(it.uid); pots++; potCd = 1; } }
    if (potCd <= 0 && p.sp < p.maxSp * 0.15) { const it = G.inv.items.find((i) => i.id === 'blue_potion'); if (it) { G.useItem(it.uid); bp++; potCd = 1; } }
    if (!(p.chase && !p.chase.dead)) p.chase = boss;
    if (buffT <= 0) { for (const id of buffIds) if ((G.skillCd[id] || 0) <= 0 && p.sp > 60) G.useSkill(id); buffT = 5; }
    if (skT <= 0 && !G.skills.cast && p.chase && !p.chase.dead) { for (const id of atkIds) { if ((G.skillCd[id] || 0) <= 0 && p.sp >= DB.skill[id].sp[ch.skills[id] - 1]) { G.useSkill(id); break; } } skT = 0.1; }
  }
  return { CLS, MERC, outcome, bossHpLeft: Math.round(boss.hp / boss.maxHp * 100) + '%', pots, bluePots: bp, minHp: +minHp.toFixed(2), info };
});
console.log('RESULT', JSON.stringify(res));
