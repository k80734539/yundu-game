import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {serve,launch,newPage,outDir} from './lib.mjs';
export async function battleFeedback(browser,url){
 for(const [w,h] of [[390,664],[844,390]]){
  const {ctx,pg,jsErrors}=await newPage(browser,w,h,{seed:true});
  try{
   await pg.goto(url);await pg.waitForFunction(()=>ready);
   assert.equal(await pg.evaluate(()=>SFX.ctx),null,'no audio context before a gesture');
   // A real gesture unlocks Web Audio. Measure the actual output, not a mock oscillator.
   await pg.keyboard.press('Shift');await pg.waitForFunction(()=>SFX.ctx?.state==='running');
   await pg.evaluate(()=>{window.audioMeter=SFX.ctx.createAnalyser();audioMeter.fftSize=2048;SFX.bus.connect(audioMeter);soundTone(440,440,.4,.5)});
   await pg.waitForFunction(()=>{const data=new Float32Array(audioMeter.fftSize);audioMeter.getFloatTimeDomainData(data);return data.some(v=>Math.abs(v)>.001)});
   const initial=await pg.locator('#soundBtn').boundingBox();assert.ok(initial.width>=44&&initial.height>=44&&initial.x+initial.width<=w);
   await pg.locator('#soundBtn').focus();await pg.keyboard.press('Enter');assert.equal(await pg.evaluate(()=>SFX.muted),true);
   await pg.waitForFunction(()=>SFX.bus.gain.value===0);
   await pg.reload();await pg.waitForFunction(()=>ready);
   assert.equal(await pg.evaluate(()=>SFX.muted&&SFX.ctx===null),true,'mute survives reload without creating audio');
   await pg.locator('#soundBtn').click();await pg.waitForFunction(()=>SFX.ctx?.state==='running');
   await pg.clock.install({time:0});await pg.clock.pauseAt(1000);
   await pg.evaluate(()=>{press('ok');G_().dlg=null;__sb(['小水妖'],{noEsc:1});const B=G_().B;B.msgs=[];B.ph='cmd';drawBattle(performance.now())});
   const result=await pg.evaluate(()=>{
    const B=G_().B,p=G_().party[0],e=B.en[0],now=performance.now(),hp=e.hp,events=[];
    const original=battleSound;window.battleSound=(...a)=>{events.push(a);original(...a)};
    const sp={k:'slash',src:p,tg:[e],hits:[{t:e,d:10}]};startFx(sp,now);startFx(sp,now);
    const at=B.fx[0].at,early=bRecoil(e,at-1),kick=bRecoil(e,at+20),hold=bRecoil(e,at+45),rest=bRecoil(e,at+280);
    drawVFX(at-1);const before=events.filter(a=>a[1]==='impact').length;drawVFX(at);drawVFX(at+10);
    const frozen=bImpactTime(sp,at+30)===at,resumed=bImpactTime(sp,at+100)===at+45;
    const hit={...B.fx[0],t:p,sp:{src:e},heal:true};B.fx.push(hit);const healing=bRecoil(p,at+20);
    B.fx.pop();B.fx.push({...hit,heal:false});const hero=bRecoil(p,at+20);B.fx.pop();
    return{early,kick,hold,rest,frozen,resumed,healing,hero,before,starts:events.filter(a=>a[1]==='start').length,impacts:events.filter(a=>a[1]==='impact').length,hpSame:e.hp===hp,fxCount:B.fx.length};
   });
   assert.deepEqual(result.early,{dx:0,dy:0});assert.ok(result.kick.dx<0,'enemy recoils away from hero');assert.deepEqual(result.kick,result.hold,'hit reaction holds briefly');
   assert.deepEqual(result.rest,{dx:0,dy:0});assert.deepEqual(result.healing,{dx:0,dy:0});assert.ok(result.hero.dx>0,'hero recoils away from enemy');
   assert.ok(result.frozen&&result.resumed&&result.hpSame);assert.equal(result.before,0);assert.equal(result.starts,1);assert.equal(result.impacts,1);assert.equal(result.fxCount,1);
   await pg.evaluate(()=>{const prior=G_().dlg;G_().dlg={};soundSync();window.soundHiddenInDialogue=document.getElementById('soundBtn').hidden;G_().dlg=prior;soundSync()});assert.equal(await pg.evaluate(()=>soundHiddenInDialogue),true,'audio control does not cover dialogue');
   await pg.clock.runFor(380);await pg.screenshot({path:outDir('battle-feedback',w+'x'+h)+'/impact.png'});
   assert.deepEqual(await jsErrors(),[]);console.log('[battle-feedback '+w+'x'+h+'] real audio, mute persistence, one-shot cues, impact hold, recoil, unchanged HP PASS');
  }finally{await ctx.close()}
 }
 const {ctx,pg,jsErrors}=await newPage(browser,390,664);
 try{await pg.addInitScript(()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined});await pg.goto(url);await pg.waitForFunction(()=>ready);await pg.keyboard.press('Enter');await pg.evaluate(()=>{G_().dlg=null;__sb(['小水妖'],{});drawBattle(performance.now());battleSound('slash','impact')});assert.deepEqual(await jsErrors(),[]);console.log('[battle-feedback unsupported audio] silent fallback PASS')}finally{await ctx.close()}
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();try{await battleFeedback(b,s.url)}finally{await b.close();s.close()}}
