import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {serve,launch,newPage} from './lib.mjs';

export async function chapterOnePacing(browser,url){
 const captures=[];
 for(const [W,H] of [[390,664],[844,390]]){
  const {ctx,pg,jsErrors}=await newPage(browser,W,H,{touch:true,seed:true});
  try{
   await pg.goto(url+'?debug=col');await pg.waitForFunction('ready');
   const pre=await pg.evaluate(()=>{
    newGame();G.dlg=null;G.party.push(mk('白苓','bl',45,24,6,2,11,['狐火','春霖']));
    G.flags.tal=1;G.flags.reedSolved=1;loadMap('reeds',860,553,'right');clearK();keys.right=1;for(let i=0;i<10&&!G.dlg&&!G.B;i++)update(4);clearK();
    return{map:G.map,x:G.x,triggered:!!G.dlg,battle:!!G.B,assets:['laolu_idle0','laolu_idle1','laolu_cast','laolu_attack','laolu_hit','laolu_down'].every(k=>I[k]?.naturalWidth===512),cfg:EN['老蘆葦精'],checkpoint:CFG.reedBoss.checkpoint};
   });
   assert.equal(pre.map,'reeds');assert(pre.triggered,'walking through the south-fork choke starts a fixed story encounter');assert(!pre.battle,'the three-line scene plays before the boss');assert(pre.assets,'the six registered 512px frames load');assert.deepEqual({hp:pre.cfg.hp,atk:pre.cfg.atk,def:pre.cfg.def},{hp:78,atk:11,def:2});
   await pg.evaluate(()=>{for(let i=0;i<8&&G.dlg;i++)press('ok')});await pg.waitForFunction('G.B&&G.B.en[0].e==="laolu"');await pg.waitForTimeout(450);
   await pg.screenshot({path:`docs/art/laolu-v49/battle-${W}x${H}.png`});captures.push(`${W}x${H}`);
   const retry=await pg.evaluate(()=>{G.mode='over';retry();return{map:G.map,pos:[G.x,G.y],cleared:!!G.flags.reedBoss,canMove:!blocked(G.x,G.y)}});
   assert.equal(retry.map,'reeds');assert.deepEqual(retry.pos,pre.checkpoint);assert(!retry.cleared&&retry.canMove,'defeat restarts at the safe reeds entrance without flagging a win');
   const victory=await pg.evaluate(()=>{
    G.dlg=null;TP(860,553,'right');clearK();keys.right=1;for(let i=0;i<10&&!G.dlg&&!G.B;i++)update(4);clearK();for(let i=0;i<8&&G.dlg;i++)press('ok');
    if(!G.B)throw Error('boss did not retrigger after retry');G.B.en[0].hp=0;win();for(let i=0;i<12&&G.B;i++)press('ok');
    const saved=JSON.parse(G.cp);const once=!!G.flags.reedBoss,cp=saved.flags.reedBoss;
    localStorage.setItem(SAVE_KEY+'1',JSON.stringify(snapshot({map:'reeds',x:G.x,y:G.y,dir:G.dir})));loadSave(readSlot('1'));const loaded=!!G.flags.reedBoss;G.dlg=null;
    reedBossTrial();const repeat=!!G.B;
    return{once,cp,loaded,repeat,shortcut:!blocked(670,445),camp:!blocked(718,590)};
   });
   assert(victory.once&&victory.cp&&victory.loaded&&!victory.repeat,'victory persists through save/load once and the fixed encounter cannot repeat');assert(victory.shortcut&&victory.camp,'winning opens the shortcut and allows access to the camp');
   const old=await pg.evaluate(()=>{
    const party=[mk('陳青舟','qz',60,12,10,3,4,['橫掃'])],base={ver:SAVE_VER,map:'temple',x:500,y:500,dir:'down',party,inv:{魚乾:0},opened:{},flags:{templeSeal:1}};
    const temple=migrateSave(JSON.parse(JSON.stringify(base)));base.map='reeds';base.flags={camp:1};const camp=migrateSave(JSON.parse(JSON.stringify(base)));
    return{temple:temple.flags.reedBoss,camp:camp.flags.reedBoss,templeVer:SAVE_VER,campVer:SAVE_VER};
   });
   assert.equal(old.temple,1);assert.equal(old.camp,1);assert.equal(old.templeVer,old.campVer,'old-save migrations preserve SAVE_VER');
   const lamps=await pg.evaluate(()=>{
    G.dlg=null;G.flags={steleSeen:1};loadMap('temple',10*48,12*48,'up');G.dlg=null;
    const targets=CFG.templeLanterns.map(q=>[q.stand[0]*48,q.stand[1]*48]);
    const reachable=targets.map(([x,y])=>!blocked(x,y));const before=G.flags.templeLamps||0;templeSeal();const sealInitiallyBlocked=!G.flags.templeSeal;
    for(let i=0;i<targets.length;i++)lightTempleLantern(i);
    const lights=M.lights.filter(l=>l.lamp!=null).map(l=>l[3]);templeSeal();
    return{targets,reachable,before,sealInitiallyBlocked,mask:G.flags.templeLamps,seal:!!G.flags.templeSeal,lights};
   });
   assert(lamps.reachable.every(Boolean),'each lantern interaction point lies on reachable walk-mask ground: '+JSON.stringify(lamps));assert(lamps.sealInitiallyBlocked&&lamps.mask===7&&lamps.seal,'the seal stays closed until all three lanterns are lit');assert.equal(lamps.lights.length,3);
   assert.deepEqual(await jsErrors(),[]);
  }finally{await ctx.close()}
 }
 console.log(`[chapter1-pacing] fixed reeds boss, safe retry, legacy saves, three reachable lanterns, seal gate and battle captures (${captures.join(', ')}) → PASS`);
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();try{await chapterOnePacing(b,s.url)}finally{await b.close();s.close()}}
