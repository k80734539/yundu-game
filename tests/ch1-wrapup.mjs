import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {serve,launch,newPage} from './lib.mjs';

async function beginFerryFight(pg){
 return pg.evaluate(()=>{
  newGame();G.dlg=null;G.flags.chief=1;G.flags.quest=1;G.flags.flood=1;G.flags.ferryFight=0;G.inv.魚乾=0;
  G.x=21*T;G.y=23*T;boardBoat();
  const cb=G.dlg&&G.dlg.cb;G.dlg=null;if(cb)cb();
  return{map:G.map,battle:!!G.B,enemies:G.B?.en.map(e=>e.e),intro:G.B?.opt.intro,checkpoint:JSON.parse(G.cp).o};
 })
}
export async function chapterOneWrapup(browser,url){
 const {ctx,pg,jsErrors}=await newPage(browser,390,664,{touch:true,seed:true});
 try{
  await pg.goto(url+'?v=51');await pg.waitForFunction('ready');
  const start=await beginFerryFight(pg);
  assert(start.battle&&start.enemies.length===2&&start.enemies.every(e=>e==='shui'),'the first eligible boarding attempt starts a fixed two-water-demon battle');
  assert.equal(start.checkpoint.map,'village','defeat checkpoint is in the village');
  assert.deepEqual([start.checkpoint.x,start.checkpoint.y],[20*32,14*32],'defeat checkpoint is the safe village starting area, away from the boarding trigger');
  assert(start.intro.join(' ').includes('攻擊')&&start.intro.join(' ').includes('橫掃'),'the opening fight carries the basic battle tutorial');
  const won=await pg.evaluate(()=>{
   G.B.msgs=[];G.B.en.forEach(e=>e.hp=0);win();for(let i=0;i<30&&G.B;i++)bKey('ok');
   const after={done:!!G.flags.ferryFight,fish:G.inv.魚乾};
   G.dlg=null;boardBoat();return{...after,retriggered:!!G.B,boardDialog:!!G.dlg};
  });
  assert(won.done&&won.fish===1,'victory completes the event and grants one fish jerky');
  assert(!won.retriggered&&won.boardDialog,'a later boarding attempt does not repeat the fight');

  const escaped=await pg.evaluate(()=>{
   const oldRandom=Math.random;Math.random=()=>0;
   newGame();G.dlg=null;G.flags.chief=1;G.flags.quest=1;G.flags.flood=1;G.x=21*T;G.y=23*T;boardBoat();
   const cb=G.dlg.cb;G.dlg=null;cb();G.B.ai=0;G.B.ph='cmd';G.B.sel=4;bKey('ok');bKey('ok');Math.random=oldRandom;
   return{done:!!G.flags.ferryFight,fish:G.inv.魚乾,battle:!!G.B};
  });
  assert(escaped.done&&!escaped.fish&&!escaped.battle,'successful escape completes the event without a reward');

  const retry=await pg.evaluate(()=>{
   newGame();G.dlg=null;G.flags.chief=1;G.flags.quest=1;G.flags.flood=1;G.x=21*T;G.y=23*T;boardBoat();
   const cb=G.dlg.cb;G.dlg=null;cb();G.mode='over';retry();
   return{map:G.map,done:!!G.flags.ferryFight,position:[G.x,G.y],checkpoint:JSON.parse(G.cp).o};
  });
  assert.equal(retry.map,'village');assert(!retry.done,'defeat leaves the event available to retry');
  assert.deepEqual(retry.position,[retry.checkpoint.x,retry.checkpoint.y],'defeat returns to the saved village checkpoint');

  const oldSave=await pg.evaluate(()=>{
   const d={ver:SAVE_VER,map:'village',x:21*T,y:23*T,dir:'down',boat:0,party:[mk('陳青舟','qz',60,12,10,3,4,['橫掃'])],inv:{魚乾:0},flags:{flood:1},opened:{}};
   return migrateSave(d).flags.ferryFight;
  });
  assert.equal(oldSave,1,'old saves that reached the flood event skip the new encounter');
  const tutorial=await pg.evaluate(()=>{
   newGame();G.dlg=null;startNight();const cb=G.dlg.cb;G.dlg=null;cb();
   return{night:G.B.opt.intro,opening:S.ferryFight.flat().join(' '),startNight:String(startNight)};
  });
  assert(tutorial.night.join(' ').includes('進階提示'),'the night battle keeps only the advanced hint');
  assert(!tutorial.night.join(' ').includes('橫掃')&&!tutorial.night.join(' ').includes('選「攻擊」'),'the same basic tutorial is not repeated at night');

  const layout=await pg.evaluate(()=>{
   newGame();G.dlg=null;G.party.push(mk('白苓','bl',45,24,6,2,11,['狐火','春霖']),mk('雲纖','yx',48,20,9,4,8,['劍氣']));
   startBattle(['小水妖','小水妖','小水妖']);const L=bLayout(3),u=L.U;
   const touch=Math.max(46,L.bd+6),button={x:L.bx-touch/2,y:L.by-touch/2,w:touch,h:3*L.bs+touch};
   const actors=G.party.map(p=>{const F=L.feet[bSlot(p,Math.max(0,G.party.indexOf(p)))],w=95*L.s,h=270*L.s;return{x:F[0]-w/2,y:F[1]-h,w,h,bottom:F[1]}});
   const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
   const enemies=L.en(3,false).map(q=>{const e=EN['小水妖'],im=I[e.e],s=.58*L.eu,w=im.width*s,h=im.height*s;return{x:q[0]-w/2,y:q[1]-h/2,w,h}});
   return{scale:L.s,expected:BFR.scale*L.U*CFG.battleUi.landscapeScale,touch,button,actors,enemies,cardsTop:L.cy,enemyActorOverlap:enemies.some(e=>actors.some(a=>overlap(a,e))),buttonActorOverlap:actors.some(a=>overlap(a,button)),actorsHitCards:actors.some(a=>a.bottom>L.cy)};
  });
  assert.equal(layout.scale,layout.expected,'landscape characters use the shared BFR scale multiplier');
  assert(layout.touch>=44&&!layout.buttonActorOverlap,'landscape command hit targets stay touch-sized and clear of party sprites');
  assert(!layout.enemyActorOverlap&&!layout.actorsHitCards,'landscape enemies, party sprites, and bottom cards do not overlap');

  const {ctx:ctx2,pg:portrait,jsErrors:portraitErrors}=await newPage(browser,390,664,{touch:true,seed:true});
  try{
   await portrait.goto(url+'?v=51');await portrait.waitForFunction('ready');
   const vertical=await portrait.evaluate(()=>{const L=bLayout(3);return{scale:L.s,expected:BFR.scale*L.U}});
   assert.equal(vertical.scale,vertical.expected,'portrait party scale remains unchanged');
   assert.deepEqual(portraitErrors,[],'portrait layout has no JavaScript errors');
  }finally{await ctx2.close()}
  assert.deepEqual(jsErrors,[],'wrap-up scenarios have no JavaScript errors');
  return true;
 }catch(e){console.error('ch1-wrapup:',e);return false}
 finally{await ctx.close()}
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();const ok=await chapterOneWrapup(b,s.url);await b.close();s.close();console.log(ok?'ch1-wrapup PASS':'ch1-wrapup FAIL');process.exit(ok?0:1)}
