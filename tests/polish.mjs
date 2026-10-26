import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {serve,launch,newPage,outDir} from './lib.mjs';
import {pathToFileURL} from 'node:url';
export async function polish(b,url){
 for(const [W,H] of [[390,664],[844,390]]){
  const {ctx,pg,jsErrors}=await newPage(b,W,H,{seed:true}),dir=outDir('polish',`${W}x${H}`);
  const run=ms=>pg.clock.runFor(ms),shot=n=>pg.screenshot({path:`${dir}/${n}.png`});
  try{
   await pg.clock.install({time:0});await pg.goto(url);await pg.clock.pauseAt(1000);await run(1700);
   await pg.evaluate("newGame();G_().dlg=null;window.scriptBefore=JSON.stringify(S);window.balanceBefore=JSON.stringify({EN,SK,ITEMS})");
   for(const [key,name] of [['lin','林嬸'],['zhou','老周']]){
    await pg.evaluate(({key,name})=>{G_().dlg=null;loadMap('village',key==='lin'?6.6*T:19.6*T,key==='lin'?17.2*T:17.9*T,'up');M_().npcs.find(n=>n.n===name).talk();},{key,name});
    await run(1600);await shot(key);
    assert.equal(await pg.evaluate(name=>PORT[name],name),key);
    assert.deepEqual(await pg.evaluate(key=>[I[key].naturalWidth,I[key].naturalHeight,I['pt_'+key].naturalWidth],[key][0]),[192,192,512]);
    assert.equal(await pg.evaluate("G_().dlg.l[G_().dlg.i][0]"),name);
   }
   await pg.evaluate("G_().dlg=null;G_().party.push(mk('白苓','bl',45,24,6,2,11,['狐火','春霖']));G_().flags.tal=1;G_().flags.reedSolved=1;loadMap('reeds',12.5*T2,9.5*T2,'down');campfire();window.positionBefore=[G_().x,G_().y];");
   await run(1600);await pg.evaluate('G_().dlg.i=13');await run(1200);await shot('camp');
   assert.equal(await pg.evaluate("activeScene().id"),'camp');
   assert.equal(await pg.evaluate("scenePortrait('白苓','bl')"),'pt_bl_quiet');
   assert.deepEqual(await pg.evaluate('[G_().x,G_().y]'),await pg.evaluate('window.positionBefore'));
   const camera=await pg.evaluate('G_().scene.cam');assert(camera.z>1&&Number.isFinite(camera.cx)&&Number.isFinite(camera.cy));
   const fireClip=await pg.evaluate(()=>{const f=M_().obj.find(o=>o.fire),c=G_().scene.cam,s=WS*c.z;return{x:Math.max(0,(f.x-c.cx)*s-35),y:Math.max(0,(f.y-c.cy)*s-65),width:70,height:70};});
   const a=await pg.screenshot({clip:fireClip});await run(200);const z=await pg.screenshot({clip:fireClip});assert(!a.equals(z),'營火必須持續動畫');
   // 快速跳過所有台詞後必須還原鏡頭狀態，不能新增操作或卡住流程。
   await pg.evaluate("while(G_().dlg)press('ok')");await run(20);assert.equal(await pg.evaluate('activeScene()'),null);
   await pg.evaluate("G_().dlg=null;G_().flags.boss=1;loadMap('temple',10.5*T2,6*T2,'up');G_().lt=performance.now()-4000;M_().npcs=M_().npcs.filter(n=>!n.boss);say(S.bossWin.concat(S.bossSys),null,'hebo');G_().dlg.i=14");
   await run(1250);await shot('hebo');await run(2200);assert(await pg.evaluate('performance.now()-G_().scene.dissolveAt>CIN.dissolve'));
   await pg.evaluate('dawn()');await run(100);const dark=PNG.sync.read(await pg.screenshot());await run(2700);const bright=PNG.sync.read(await pg.screenshot());
   const mean=p=>{let s=0;for(let i=0;i<p.data.length;i+=4)s+=p.data[i]+p.data[i+1]+p.data[i+2];return s/(p.width*p.height*3)};
   assert(mean(bright)>mean(dark)+12,'黎明必須漸亮');await shot('dawn');
   await pg.evaluate("G_().dlg=null;G_().flags.cure=1;loadMap('village',15*T,19.2*T,'up');G_().dawnT=null;say(S.yx.concat(S.teaser),null,'yx');window.npcBefore=M_().npcs.find(n=>n.k==='yx').y");
   await run(1200);await pg.evaluate('G_().dlg.i=1');await run(650);await shot('yunxian');
   assert.equal(await pg.evaluate("M_().npcs.find(n=>n.k==='yx').y"),await pg.evaluate('window.npcBefore'));
   await pg.evaluate("G_().dlg.i=6");await run(1200);await shot('yunxian_stand');
   await pg.evaluate("while(G_().dlg)press('ok')");await run(20);assert.equal(await pg.evaluate('activeScene()'),null);
   await pg.evaluate('startNight();G_().dlg.i=5');await run(1200);assert.equal(await pg.evaluate("scenePortrait('陳青舟','qz')"),'pt_qz_startled');
   await pg.evaluate('G_().dlg.i=9');await run(500);await shot('rescue');
   await pg.evaluate("while(G_().mode==='boat'&&G_().dlg)press('ok')");await run(20);assert.equal(await pg.evaluate('G_().mode'),'battle');
   assert.equal(await pg.evaluate('JSON.stringify(S)'),await pg.evaluate('window.scriptBefore'),'台詞資料不可變動');
   assert.equal(await pg.evaluate('JSON.stringify({EN,SK,ITEMS})'),await pg.evaluate('window.balanceBefore'),'戰鬥數值不可變動');
   // 新素材載入失敗仍可繪製，不使用舊 NPC 借圖，且不產生 JS 例外。
   await pg.evaluate("G_().B=null;G_().dlg=null;loadMap('reeds',12.5*T2,9.5*T2,'down');I.campfire=new Image();drawWorld(performance.now());G_().flags={};loadMap('village',6.6*T,17.2*T,'up');I.lin=new Image();I.pt_lin=new Image();M_().npcs.find(n=>n.k==='lin').talk();drawWorld(performance.now());drawDlg()");
   assert.deepEqual(await jsErrors(),[]);console.log(`[polish ${W}x${H}] NPC art, fire, camera, dissolve, dawn, rescue, skip, fallback; errors=[] → PASS`);
  }finally{await ctx.close()}
 }
 return true;
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();try{await polish(b,s.url)}finally{await b.close();s.close()}}
