import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {serve,launch,newPage} from './lib.mjs';

export async function chapter1Mechanics(browser,url){
 const{ctx,pg,jsErrors}=await newPage(browser,844,390,{touch:true,seed:true});
 try{
  await pg.goto(url);await pg.waitForFunction('ready');
  const data=await pg.evaluate(()=>({skill:SK.渡水一擊,keys:Object.keys(CHESTS).filter(k=>k.startsWith('reeds:')),layout:REEDS_LAYOUT.chests.map(c=>c.key)}));
  assert.deepEqual(data.skill,{mp:5,tgt:'oneE',d:'水靈單體重擊'});
  assert.deepEqual(data.keys,['reeds:18,1','reeds:1,7','reeds:5,11']);assert.deepEqual(data.layout,data.keys,'the three original chest keys remain at their intended maze locations');

  const chests=await pg.evaluate(()=>{newGame();G.dlg=null;G.party[0].arm=3;openChest('reeds:1,7');const afterFirst={arm:G.party[0].arm,count:G.inv.護身符,flag:G.flags.charm};G.dlg=null;openChest('reeds:1,7');const afterRepeat={arm:G.party[0].arm,count:G.inv.護身符};G.dlg=null;openChest('reeds:5,11');const note={count:G.inv.刻字布條,flag:G.flags.foundCloth,text:G.dlg.l.map(x=>x[1]).join(' ')};G.dlg=null;openChest('reeds:18,1');return{afterFirst,afterRepeat,note,fish:G.inv.魚乾}});
  assert.deepEqual(chests.afterFirst,{arm:5,count:1,flag:1});assert.deepEqual(chests.afterRepeat,{arm:5,count:1},'reopening an already opened charm chest gives no duplicate defense');assert.equal(chests.note.count,1);assert.equal(chests.note.flag,1);assert.match(chests.note.text,/我爹的字/);assert.match(chests.note.text,/看不出他想寫什麼/);assert.equal(chests.fish,3,'the fish chest still grants two fish on top of the starting one');

  const saves=await pg.evaluate(()=>{const old={ver:SAVE_VER,map:'village',x:400,y:400,dir:'down',party:[mk('陳青舟','qz',60,12,10,3,4,['橫掃'])],inv:{魚乾:0},flags:{},opened:{}};const unfinished=migrateSave(JSON.parse(JSON.stringify(old)));old.flags={boss:1};const cleared=migrateSave(JSON.parse(JSON.stringify(old)));learnSkill(cleared.party[0],'渡水一擊');const reread=migrateSave(JSON.parse(JSON.stringify(cleared)));learnSkill(reread.party[0],'渡水一擊');localStorage.setItem(SAVE_KEY+'1',JSON.stringify(old));loadSave(readSlot('1'));return{unfinished:unfinished.party[0].skills,cleared:cleared.party[0].skills,reread:reread.party[0].skills,loaded:G.party[0].skills}});
  assert.deepEqual(saves.unfinished,['橫掃'],'old saves before the boss do not gain the skill early');assert.deepEqual(saves.cleared,['橫掃','渡水一擊']);assert.equal(saves.reread.filter(k=>k==='渡水一擊').length,1,'boss-cleared saves learn once without changing SAVE_VER');assert.equal(saves.loaded.filter(k=>k==='渡水一擊').length,1,'loading an old boss-cleared save restores the skill once');

  const bossReward=await pg.evaluate(()=>{const defeat=()=>{G.dlg=null;G.scene=null;bossTalk();let n=0;while(G.dlg&&n++<60)press('ok');if(!G.B)throw Error('bossTalk did not start the boss battle');G.B.en[0].hp=0;win();n=0;while(G.B&&G.B.won&&n++<80)press('ok');if(G.B)throw Error('victory did not finish')};newGame();G.dlg=null;G.flags.templeSeal=1;defeat();const first=G.party[0].skills.filter(s=>s==='渡水一擊').length;localStorage.setItem(SAVE_KEY+'2',JSON.stringify(snapshot({map:'village',x:400,y:400,dir:'down'})));loadSave(readSlot('2'));const afterLoad=G.party[0].skills.filter(s=>s==='渡水一擊').length;defeat();return{first,afterLoad,afterReplay:G.party[0].skills.filter(s=>s==='渡水一擊').length,lines:S.bossWin.map(l=>l[1]).join(' ')}});
  assert.deepEqual({first:bossReward.first,afterLoad:bossReward.afterLoad,afterReplay:bossReward.afterReplay},{first:1,afterLoad:1,afterReplay:1},'actual bossTalk victory callback teaches once, survives save/load, and does not duplicate on replay');assert.match(bossReward.lines,/水靈流進竹篙/);assert.match(bossReward.lines,/學會「渡水一擊」/);

  const battle=await pg.evaluate(()=>{newGame();G.dlg=null;G.party[0].skills.push('渡水一擊');__sb(['小水妖'],{noEsc:1});G.B.ph='cmd';G.B.ai=0;G.B.en[0].hp=100;G.party[0].mp=12;__ex({t:'sk',s:'渡水一擊'},G.B.en[0]);const hit={hp:G.B.en[0].hp,mp:G.party[0].mp,fx:G.B.msgs[0]?.[1]?.k};
   __sb(['河伯'],{noEsc:1,noParry:1,noMoves:1});let B=G.B,e=B.en[0];e.hp=e.mhp*CFG.hebo.phaseHp;act(['河伯受傷']);const warning1=B.msgs.filter(m=>m==='控妖符的紋路閃了一下……').length;act(['河伯受傷']);const warning2=B.msgs.filter(m=>m==='控妖符的紋路閃了一下……').length;const phase2=[];for(let i=0;i<3;i++){enemyPhase();phase2.push(B.hebo.lastAction);B.after()}
   __sb(['河伯'],{noEsc:1,noParry:1,noMoves:1});B=G.B;G.party.forEach(p=>{p.hp=p.mhp=999});const phase1=[];for(let i=0;i<4;i++){enemyPhase();phase1.push(B.hebo.lastAction);B.after()}
   __sb(['河伯'],{noEsc:1,noParry:1,noMoves:1});const replay={phaseReset:!G.B.heboPhase2,skillCount:G.party[0].skills.filter(k=>k==='渡水一擊').length};return{hit,warning1,warning2,phase1,phase2,replay}});
  assert.equal(battle.hit.mp,7);assert.equal(battle.hit.fx,'sweep');assert.ok(battle.hit.hp<100,'渡水一擊 damages a single enemy');assert.equal(battle.warning1,1);assert.equal(battle.warning2,0,'the half-health warning triggers once');assert.deepEqual(battle.phase1,['NORMAL','NORMAL','CHARGING','RELEASE'],'first stage gives two attacks, one warning turn, then wave');assert.deepEqual(battle.phase2,['NORMAL','CHARGING','RELEASE'],'second stage gives one attack, one warning turn, then wave');assert.deepEqual(battle.replay,{phaseReset:true,skillCount:1},'replaying the boss resets its stage and does not duplicate the learned skill');
  assert.deepEqual(await jsErrors(),[]);
  console.log('[chapter1-mechanics] skill, legacy save, chest rewards, Hebo phase and replay → PASS');
 }finally{await ctx.close()}
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();try{await chapter1Mechanics(b,s.url)}finally{await b.close();s.close()}}
