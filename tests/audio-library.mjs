import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {serve,launch,newPage,outDir} from './lib.mjs';
export async function audioLibrary(browser,url){
 const {ctx,pg,jsErrors}=await newPage(browser,390,664,{seed:true});let requested=0;
 pg.on('request',r=>{if(r.url().includes('/assets/audio/'))requested++});
 try{
  await pg.goto(url);await pg.waitForFunction(()=>ready);assert.equal(requested,0,'audio is lazy until a gesture');assert.equal(await pg.evaluate(()=>SFX.ctx),null);
  await pg.keyboard.press('Shift');await pg.waitForFunction(()=>MUSIC.current?.key==='mist');
  await pg.waitForFunction(()=>Object.keys(AUDIO_ASSETS).filter(k=>!MUSIC_KEYS.includes(k)&&!['river','insects'].includes(k)).every(k=>SFX.buffers.has(k)));
  await pg.evaluate(()=>{window.musicMeter=SFX.ctx.createAnalyser();MUSIC.bus.connect(musicMeter);musicMeter.fftSize=2048});
  await pg.waitForFunction(()=>{const a=new Float32Array(2048);musicMeter.getFloatTimeDomainData(a);return a.some(x=>Math.abs(x)>.001)});
  const manifest=JSON.parse(fs.readFileSync('docs/audio/manifest-v33.json','utf8'));
  for(const row of manifest.files.filter(f=>f.kind==='sfx')){
   const duration=await pg.evaluate(k=>SFX.buffers.get(k).duration,row.key);assert.ok(Math.abs(duration-row.duration)<.08,'decoded clip length '+row.key);
   assert.ok(row.decodedPeak<1,'encoded output does not clip '+row.key);
  }
  await pg.evaluate(()=>{window.effectMeter=SFX.ctx.createAnalyser();SFX.bus.connect(effectMeter);effectMeter.fftSize=2048;playSfx('wood')});
  await pg.waitForFunction(()=>{const a=new Float32Array(2048);effectMeter.getFloatTimeDomainData(a);return a.some(x=>Math.abs(x)>.001)});
  await pg.locator('#soundBtn').click();await pg.locator('#musicToggle').click();await pg.waitForFunction(()=>MUSIC.bus.gain.value===0);
  assert.equal(await pg.evaluate(()=>SFX.muted),false,'music mute leaves SFX enabled');
  await pg.locator('#sfxToggle').click();assert.equal(await pg.evaluate(()=>SFX.muted&&MUSIC.muted),true);
  await pg.reload();await pg.waitForFunction(()=>ready);assert.equal(await pg.evaluate(()=>SFX.ctx===null&&SFX.muted&&MUSIC.muted),true,'both preferences persist without autoplay');
  await pg.locator('#soundBtn').click();await pg.locator('#musicToggle').click();await pg.locator('#soundClose').click();
  await pg.waitForFunction(()=>MUSIC.current?.key==='mist');assert.equal(await pg.evaluate(()=>SFX.bus.gain.value),0,'music alone creates a muted SFX bus');
  await pg.locator('#soundBtn').click();await pg.locator('#sfxToggle').click();await pg.locator('#soundClose').click();
  const music=async(key)=>{await pg.waitForFunction(k=>MUSIC.current?.key===k,key);assert.ok(await pg.evaluate(()=>MUSIC.cache.size<=2),'music cache stays bounded');assert.equal(await pg.evaluate(()=>MUSIC.current.source.loop),true)};
  await pg.evaluate(()=>{newGame();G_().dlg=null;loadMap('village',15*T,12*T,'down')});await music('village');await pg.waitForFunction(()=>AMBIENT.current?.key==='river');
  await pg.locator('#svBtn').click();await pg.locator('#svBox .svI').nth(4).click();assert.equal(await pg.evaluate(()=>SV.p),'settings');await pg.screenshot({path:outDir('audio-library','390x664')+'/settings.png'});await pg.keyboard.press('Escape');await pg.keyboard.press('Escape');
  await pg.evaluate(()=>startNight());await music('night');
  await pg.evaluate(()=>{G_().dlg=null;G_().scene=null;loadMap('reeds',12.5*T2,9.5*T2,'down')});await pg.waitForFunction(()=>AMBIENT.current?.key==='insects');
  await pg.evaluate(()=>{G_().flags.tal=1;G_().flags.reedSolved=1;G_().party.push(mk('白苓','bl',45,24,6,2,11,['狐火','春霖']));campfire()});await music('mist_alt');
  await pg.evaluate(()=>{G_().dlg=null;__sb(['小水妖'],{})});await music('battle');assert.equal(await pg.evaluate(()=>AMBIENT.current),null,'battle removes exploration ambience');
  await pg.evaluate(()=>__sb(['河伯'],{}));await music('boss');
  // Back-to-back transitions must not let a late decode start an obsolete track.
  await pg.evaluate(()=>{G_().mode='end';audioSyncTracks();G_().mode='map';G_().B=null;G_().scene=null;loadMap('village',15*T,12*T,'down');audioSyncTracks()});await music('village');
  await pg.evaluate(()=>{window.loopBeforePause=MUSIC.current.source;playSfx('wood');Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});await pg.waitForFunction(()=>SFX.ctx.state==='suspended');
  await pg.evaluate(()=>delete document.hidden);await pg.keyboard.press('Shift');await pg.waitForFunction(()=>SFX.ctx.state==='running');assert.equal(await pg.evaluate(()=>MUSIC.current.source===loopBeforePause),true,'suspended loop resumes without duplicating the music');
  await pg.keyboard.press('m');await pg.keyboard.press('ArrowDown');await pg.keyboard.press('ArrowDown');await pg.keyboard.press('ArrowDown');await pg.keyboard.press('ArrowDown');await pg.keyboard.press('Enter');assert.equal(await pg.evaluate(()=>SV.p),'settings');await pg.keyboard.press('Escape');await pg.keyboard.press('Escape');assert.equal(await pg.evaluate(()=>SV.p),null);
  const fallback=await pg.evaluate(()=>{const b=SFX.buffers.get('wood'),fn=synthBattleSound;let calls=0;SFX.buffers.delete('wood');SFX.failed.add('wood');window.synthBattleSound=(...a)=>{calls++;fn(...a)};battleSound('slash','impact',false,G_().party[0]);SFX.buffers.set('wood',b);SFX.failed.delete('wood');window.synthBattleSound=fn;return calls});assert.equal(fallback,1,'missing recording uses existing synthesized fallback');
  const triggers=await pg.evaluate(()=>{const original=playSfx,keys=[];window.playSfx=(...a)=>{keys.push(a[0]);return original(...a)};for(const [k,stage] of [['slash','start'],['slash','impact'],['foxfire','start'],['foxfire','impact'],['rain','impact'],['splash','impact'],['leaf','impact'],['wave','impact'],['item','impact']])battleSound(k,stage,false,{e:'qz'},k==='slash'&&stage==='impact');__sb(['小水妖'],{});const B=G_().B;B.ph='msg';B.msgs=['陳青舟升到了 Lv3！'];B.en[0].hp=0;B.en[0].dieAt=performance.now()-10;drawBattle(performance.now());drawBattle(performance.now());window.playSfx=original;return keys});
  for(const key of ['pole','wood','critical','gather','fox','heal','water','leaf','wave','item'])assert.ok(triggers.includes(key),'recorded battle route '+key);assert.equal(triggers.filter(k=>k==='level').length,1,'level cue matches displayed message once');assert.equal(triggers.filter(k=>k==='down').length,1,'dissolve cue plays once');
  assert.deepEqual(await jsErrors(),[]);console.log('[audio-library] all supplied effects decode, actual music/SFX output, independent mute persistence, six score routes, ambience, bounded cache, transition race and fallback PASS');
 }finally{await ctx.close()}
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();try{await audioLibrary(b,s.url)}finally{await b.close();s.close()}}
