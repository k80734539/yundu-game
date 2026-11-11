// MVP 實戰測試：三轉職業、D 階裝備（星隕系列）、指定等級，打指定 MVP。把 CLSNAME 換成 templar/archmage/sniper，LVL 換等級，BOSSID 換 MVP id，MAPID 換地圖，MERCNAME 換傭兵 id 或 ''。
const res = await page.evaluate(() => {
  const CLS = 'CLSNAME', LVL = LVLVAL, BOSS = 'BOSSID', MAP = 'MAPID', MERC = 'MERCNAME';
  const G = window.__game, p = G.player, ch = p.ch, DB = window.__DB; G.loop.running = false; const step = 1 / 60;
  const T1 = { templar: 'swordsman', archmage: 'mage', sniper: 'archer' }[CLS], T2 = { templar: 'paladin', archmage: 'elementalist', sniper: 'ranger' }[CLS];
  ch.baseLv = LVL; ch.job = 'novice'; ch.jobLv = 10; G.changeJob(T1); ch.jobLv = 40; G.changeJob(T2); ch.jobLv = 50; G.changeJob(CLS); ch.jobLv = 50; ch.skills = { basic: 9 }; ch.skillPts = 0; ch.zeny = 1e7;
  let pts = 48; for (let l = 2; l <= LVL; l++) pts += Math.floor(l / 5) + 3; ch.statPts = pts;
  const PL = { swordsman: ['str', 'str', 'vit', 'dex', 'agi'], mage: ['int', 'int', 'dex', 'int', 'vit'], archer: ['dex', 'dex', 'agi', 'dex', 'str'] }[T1];
  for (let k = 0; ch.statPts > 0 && k < 5000; k++) { const b = ch.statPts; G.raiseStat(PL[k % PL.length]); if (ch.statPts === b) { G.raiseStat(PL[0]); if (ch.statPts === b) break; } }
  const SK = { templar: { basic: 9, bash: 10, sword_mastery: 10, battle_spirit: 10, magnum: 5, endure: 3, provoke: 5, pierce: 10, spear_mastery: 10, guard: 5, whirlwind: 5, templar_mastery: 10, holy_smite: 10, judgment_hammer: 10, divine_aegis: 10, heaven_wrath: 5 },
    archmage: { basic: 9, arcane: 10, firebolt: 10, coldbolt: 10, soulstrike: 10, thunderstorm: 10, mana_focus: 10, mana_cycle: 10, meteor: 10, frost_nova: 10, chain_lightning: 10, barrier: 5, arcane_supremacy: 10, arcane_burst: 10, void_lance: 10, mana_surge: 10, cataclysm: 5 },
    sniper: { basic: 9, double_strafe: 10, armor_pierce: 10, owl_eye: 10, eagle_focus: 10, vulture_eye: 5, concentration: 5, arrow_shower: 10, charge_arrow: 10, hunter_instinct: 10, multi_shot: 10, seeker_arrow: 10, falcon: 10, trap: 10, wind_step: 5, sniper_mastery: 10, snipe: 10, rain_of_death: 10, hunters_mark: 10, phantom_volley: 5 } }[CLS];
  ch.skills = SK; for (const k of Object.keys(ch.skills)) if (!DB.skill[k]) delete ch.skills[k];
  const KIT = { templar: ['star_spear', 'star_plate', 'star_helm', 'star_shield', 'star_cloak', 'star_boots', 'star_ring'], archmage: ['star_staff', 'star_robe', 'star_hat', 'star_ward', 'star_cloak', 'star_boots', 'star_earring'], sniper: ['star_bow', 'star_vest', 'star_helm', 'star_cloak', 'star_boots', 'star_glove'] }[CLS];
  G.inv.items.length = 0; G.inv.equip = {}; for (const id of KIT) { G.inv.add(id); const it = G.inv.items.filter((i) => i.id === id).pop(); if (it) G.inv.equipItem(it.uid, CLS, LVL); }
  G.inv.add('white_potion', 80); G.inv.add('blue_potion', 60);
  const learned = Object.keys(ch.skills).filter((k) => k !== 'basic' && DB.skill[k].type === 'active');
  const buffIds = learned.filter((id) => DB.skill[id].effect === 'buff');
  const score = (id) => { const s = DB.skill[id], lv = ch.skills[id]; return ((s.power || [100])[lv - 1] || 100) * (s.hits === 'lv' ? lv : s.hits === 'half' ? Math.ceil(lv / 2) : (typeof s.hits === 'number' ? s.hits : 1)) / (((s.cast || [0])[lv - 1] || 0) + ((s.cd || [0.5])[lv - 1] || 0.5)); };
  const atkIds = learned.filter((id) => !['buff', 'debuff'].includes(DB.skill[id].effect)).sort((a, b) => score(b) - score(a));
  p.recalc(true); p.hp = p.maxHp; p.sp = p.maxSp;
  G.loadMap(MAP, 20, 30); if (MERC) G.mercs.hire(MERC);
  const boss = G.monsters.find((m) => m.def.id === BOSS); p.x = p.px = boss.x; p.y = p.py = boss.y + 6; p.chase = boss;
  let bossMin = 1; const used = {}; const dealt = { n: 0, sum: 0, miss: 0 }; const _ad = G.applyDamage.bind(G); G.applyDamage = (a, d, dmg, kind) => { if (d === boss) { dealt.n++; dealt.sum += dmg; } return _ad(a, d, dmg, kind); }; const _ra = G.resolveAttack.bind(G); G.resolveAttack = (a, d) => { const h0 = boss.hp; _ra(a, d); if (d === boss && boss.hp === h0) dealt.miss++; }; let t = 0, pots = 0, bp = 0, potCd = 0, skT = 0, buffT = 0, minHp = 1, outcome = 'timeout'; const info = { hp: p.maxHp, def: p.d.def, mdef: p.d.mdef, atk: p.d.atkMax, matk: p.d.matkMax };
  while (t < 1500) {
    G.update(step); t += step; potCd -= step; skT -= step; buffT -= step;
    minHp = Math.min(minHp, p.hp / p.maxHp); bossMin = Math.min(bossMin, boss.hp / boss.maxHp);
    if (p.dead) { outcome = 'died@' + Math.round(t); break; }
    if (boss.dead) { outcome = 'win@' + Math.round(t); break; }
    if (potCd <= 0 && p.hp < p.maxHp * 0.5) { const it = G.inv.items.find((i) => i.id === 'white_potion'); if (it) { G.useItem(it.uid); pots++; potCd = 1; } else G.inv.add('white_potion', 1); }
    if (potCd <= 0 && p.sp < p.maxSp * 0.15) { const it = G.inv.items.find((i) => i.id === 'blue_potion'); if (it) { G.useItem(it.uid); bp++; potCd = 1; } else G.inv.add('blue_potion', 1); }
    if (!(p.chase && !p.chase.dead)) p.chase = boss;
    if (buffT <= 0) { for (const id of buffIds) if ((G.skillCd[id] || 0) <= 0 && p.sp > 60) G.useSkill(id); buffT = 5; }
    if (skT <= 0 && !G.skills.cast && p.chase && !p.chase.dead) { for (const id of atkIds) { if ((G.skillCd[id] || 0) <= 0 && p.sp >= DB.skill[id].sp[ch.skills[id] - 1]) { const c0 = G.skillCd[id] || 0; G.useSkill(id); if ((G.skillCd[id] || 0) > c0 || G.skills.cast) { used[id] = (used[id] || 0) + 1; break; } } } skT = 0.1; }
  }
  return { dealt, used, order: atkIds.join(','), CLS, LVL, BOSS, MERC, outcome, bossMinHp: Math.round(bossMin * 100) + '%', pots, bluePots: bp, minHp: +minHp.toFixed(2), info };
});
console.log('RESULT', JSON.stringify(res));
