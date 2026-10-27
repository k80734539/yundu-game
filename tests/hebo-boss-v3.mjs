import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {serve,launch,newPage,outDir} from './lib.mjs';

export async function heboBossV3(browser,url){
 const {ctx,pg,jsErrors}=await newPage(browser,390,664,{touch:true,seed:true});
 try{
  await pg.goto(url);await pg.waitForFunction('ready');
  const result=await pg.evaluate(()=>{
   newGame();G.dlg=null;G.party.push(mk('白苓','bl',45,24,6,2,11,['狐火','春霖']));
   const heboPowerAtDamage=()=>{G.B.turn--;const v=heboPower(G.B.en[0],G.B);G.B.turn++;return v};
   const begin=()=>{__sb(['河伯'],{noEsc:1});G.B.ph='cmd';G.B.ai=0;G.party.forEach(p=>{p.hp=999;p.mhp=999;p.st='';p.guard=0;p.mp=p.mmp})};
   const turn=()=>{enemyPhase();const B=G.B,r={action:B.hebo?.lastAction||'NORMAL',state:B.hebo?.state,msg:B.msgs.map(x=>Array.isArray(x)?x[0]:x),hp:G.party.map(p=>p.hp),turn:B.turn};B.after();return r};
   begin();const first=[turn(),turn(),turn(),turn(),turn(),turn(),turn(),turn()];
   begin();G.B.en[0].hp=90;const beforeTurn=G.B.turn;act(['命中']);const phase={hp:G.B.talisman?.hp,def:G.B.talisman?.def,buff:heboPower(G.B.en[0],G.B),turn:G.B.turn,warning:G.B.msgs.filter(m=>m==='控妖符的紋路閃了一下……').length};act(['命中']);phase.warningAgain=G.B.msgs.filter(m=>m==='控妖符的紋路閃了一下……').length;phase.noExtraAction=G.B.turn===beforeTurn;
   G.B.ai=0;G.B.ph='cmd';G.B.pend={t:'atk'};G.B.talisman.hp=1;exec(G.B.talisman);const normalBreak={broken:G.B.talisman.broken,state:G.B.hebo.state,buff:heboPower(G.B.en[0],G.B)};
   begin();G.B.en[0].hp=90;act(['命中']);G.B.talisman.hp=1;G.B.ai=0;G.B.pend={t:'sk',s:'橫掃'};exec(null);const sweepBreak={broken:G.B.talisman.broken,state:G.B.hebo.state};
   begin();G.B.en[0].hp=90;act(['命中']);G.B.hebo.state=HEBO_STATE.CHARGING;G.B.talisman.hp=1;G.B.ai=1;G.B.pend={t:'sk',s:'狐火'};exec(G.B.talisman);const foxBreak={broken:G.B.talisman.broken,state:G.B.hebo.state,interfered:G.B.hebo.interfered};const skip=turn(),afterSkip={state:G.B.hebo.state,turn:G.B.turn},normal=turn();
   begin();G.B.en[0].hp=90;act(['命中']);G.B.hebo.state=HEBO_STATE.CHARGING;G.B.ai=1;G.B.pend={t:'sk',s:'狐火'};const oldRandom=Math.random;Math.random=()=>0;exec(G.B.en[0]);const interfere={on:G.B.hebo.interfered,mp:G.party[1].mp,msg:G.B.msgs.some(m=>(Array.isArray(m)?m[0]:m).includes('狐火擾亂'))};const hp0=G.party[0].hp;const reduced=turn();const dealt=hp0-G.party[0].hp;const expected=Math.max(1,Math.round(heboPowerAtDamage()*CFG.hebo.wavePower*(1-CFG.hebo.foxfireWaveReduction)-G.party[0].def-1));
   G.B.hebo.state=HEBO_STATE.CHARGING;G.B.hebo.interfered=false;G.party.forEach(p=>p.hp=999);const full=turn();const fullDealt=999-G.party[0].hp;Math.random=oldRandom;
   begin();G.B.hebo.state=HEBO_STATE.CHARGING;G.party[1].hp=0;G.party[0].mp=0;const blDown=turn();
   begin();G.B.hebo.state=HEBO_STATE.CHARGING;G.party[0].hp=0;const qzDown=turn();
   begin();G.B.ai=0;G.party[0].mp=0;G.B.sel=3;G.B.ph='cmd';bKey('ok');const guardGain=G.party[0].mp;
   begin();G.B.ai=0;G.party[0].mp=G.party[0].mmp-1;G.B.sel=3;G.B.ph='cmd';bKey('ok');const guard={mp:G.party[0].mp,flag:G.party[0].guard};G.party[0].st='中毒';G.party[0].hp=100;G.B.hebo.state=HEBO_STATE.CHARGING;const poison=turn();const guardCleared=G.party[0].guard;
   begin();const oldRandom2=Math.random;Math.random=()=>0;const defender=G.party[0];defender.guard=0;const unguarded=dmg(20,defender);defender.guard=1;const guarded=dmg(20,defender);defender.st='中毒';G.B.hebo.state=HEBO_STATE.CHARGING;const poisonAgain=turn();Math.random=oldRandom2;
   begin();G.B.en[0].hp=1;G.B.ai=0;G.B.pend={t:'atk'};exec(G.B.en[0]);G.B.after();const won=G.B.won;G.B.after();const victory={won,mode:G.mode,battle:G.B};
   __sb(['老蘆葦精'],{noEsc:1});G.party.forEach(p=>{p.hp=999;p.mhp=999;p.st=''});const laolu=Array.from({length:6},()=>turn());
   begin();const reset={state:G.B.hebo.state,talisman:G.B.talisman,interfered:G.B.hebo.interfered,phase:G.B.heboPhase2};
   return{first,phase,normalBreak,sweepBreak,foxBreak,skip,afterSkip,normal,interfere,reduced,dealt,expected,full,fullDealt,blDown,qzDown,guardGain,guard,poison,guardCleared,unguarded,guarded,poisonAgain,victory,laolu,reset};
  });
  assert.deepEqual(result.first.map(x=>x.action),['NORMAL','NORMAL','CHARGING','RELEASE','NORMAL','NORMAL','CHARGING','RELEASE']);
  assert.equal(result.first[2].hp[0],result.first[1].hp[0],'charging causes no immediate damage');
  assert.deepEqual([result.phase.hp,result.phase.def,result.phase.buff,result.phase.warning,result.phase.warningAgain,result.phase.noExtraAction],[24,0,16.8,1,0,true]);
  assert.deepEqual(result.normalBreak,{broken:1,state:'STAGGERED',buff:14});
  assert.deepEqual(result.sweepBreak,{broken:1,state:'STAGGERED'});
  assert.deepEqual(result.foxBreak,{broken:1,state:'STAGGERED',interfered:false});
  assert.equal(result.skip.action,'STAGGERED');assert.equal(result.afterSkip.state,'NORMAL');assert.equal(result.normal.action,'NORMAL','breaking the talisman skips one action only');
  assert.equal(result.interfere.on,true);assert.equal(result.interfere.mp,20);assert.equal(result.interfere.msg,true);
  assert.equal(result.reduced.action,'RELEASE');assert.equal(result.dealt,result.expected);assert(result.fullDealt>result.dealt,'foxfire reduces only this wave');
  assert.equal(result.blDown.action,'RELEASE');assert.equal(result.qzDown.action,'RELEASE');assert(result.qzDown.hp[1]<999,'surviving companion takes a turn');
  assert.equal(result.guardGain,3);assert.deepEqual(result.guard,{mp:12,flag:1});assert(result.poison.msg.some(m=>m.includes('中毒損失')));assert.equal(result.guardCleared,0);
  assert.equal(result.guarded,Math.ceil(result.unguarded/2),'guard keeps its original 50% damage reduction');assert.equal(result.poisonAgain.msg.filter(m=>m.includes('中毒損失')).length,1);assert(result.poisonAgain.msg.every(m=>!m.includes('中毒了！')),'poison does not stack');
  assert.equal(result.victory.won,1);assert.equal(result.victory.mode,'map');assert.equal(result.victory.battle,null);
  assert(result.laolu.every(t=>t.action==='NORMAL'&&t.msg.every(m=>!m.includes('濁浪')&&!m.includes('河伯'))),'reed boss never uses Hebo AI across six turns');
  assert.equal(result.reset.state,'NORMAL');assert.equal(result.reset.talisman,undefined);assert.equal(result.reset.interfered,false);assert.equal(result.reset.phase,undefined);

  for(const [w,h] of [[390,664],[844,390]]){
   await pg.setViewportSize({width:w,height:h});
   await pg.evaluate(()=>{__sb(['河伯'],{noEsc:1,bg:'bg_temple'});G.B.msgs=[];G.B.ph='cmd';G.B.ai=0;G.B.en[0].hp=90;heboPhase([]);G.B.hebo.state=HEBO_STATE.CHARGING;G.B.pend={t:'atk'};G.B.ph='target';G.B.tk='E';G.B.sel=1});
   await pg.waitForTimeout(500);await pg.screenshot({path:outDir('hebo-v3',`${w}x${h}`)+'/charge.png'});
   const targets=await pg.evaluate(()=>({count:enemyTargets(G.B).length,rect:G.B.hit.find(h=>h.w===54&&h.h===54),ui:G.B.L,canvas:[SW,SH]}));
   assert.equal(targets.count,2);assert(targets.rect&&targets.rect.x>=0&&targets.rect.x+targets.rect.w<=w&&targets.rect.y>=0&&targets.rect.y+targets.rect.h<=h,'talisman touch target fits in viewport');
   await pg.touchscreen.tap(targets.rect.x+27,targets.rect.y+27);const tap=await pg.evaluate(()=>({sel:G.B.sel,ph:G.B.ph}));assert.equal(tap.ph,'msg',`touch can attack the talisman ${JSON.stringify({targets,tap})}`);
   await pg.evaluate(()=>{G.B.ph='target';G.B.tk='E';G.B.sel=0;bKey('right')});assert.equal(await pg.evaluate(()=>G.B.sel),1,'keyboard can select talisman');
  }
  const desktop=await newPage(browser,1366,900,{touch:false,seed:true});
  try{await desktop.pg.goto(url);await desktop.pg.waitForFunction('ready');await desktop.pg.evaluate(()=>{newGame();G.dlg=null;__sb(['河伯'],{noEsc:1,bg:'bg_temple'});G.B.msgs=[];G.B.ai=0;G.B.en[0].hp=90;heboPhase([]);G.B.hebo.state=HEBO_STATE.CHARGING;G.B.pend={t:'atk'};G.B.ph='target';G.B.tk='E';G.B.sel=1});await desktop.pg.waitForTimeout(500);
   const rect=await desktop.pg.evaluate(()=>G.B.hit.find(h=>h.w===54&&h.h===54));assert(rect);await desktop.pg.mouse.click(rect.x+27,rect.y+27);assert.equal(await desktop.pg.evaluate(()=>G.B.ph),'msg','desktop mouse can attack talisman');assert.deepEqual(await desktop.jsErrors(),[])}finally{await desktop.ctx.close()}
  assert.deepEqual(await jsErrors(),[]);console.log('[hebo-boss-v3] cadence, talisman, foxfire, defense, poison, defeat, victory, touch/mouse/keyboard, reset → PASS');
 }finally{await ctx.close()}
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();try{await heboBossV3(b,s.url)}finally{await b.close();s.close()}}
