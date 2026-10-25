import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {serve,launch,newPage,SIZES} from './lib.mjs';

// v32：主角 192×192／4 幀循環、村民靜態原圖，以及舊 72×66 素材回退並存
export async function qzSprite(browser,url,sizes=SIZES){
 for(const [W,H] of sizes){
  const {ctx,pg,jsErrors}=await newPage(browser,W,H,{seed:true});
  try{
   await pg.clock.install({time:0});await pg.goto(url);await pg.clock.pauseAt(1000);await pg.clock.runFor(1500);
   await pg.evaluate("press('ok');G_().dlg=null;G_().party.push(mk('白苓','bl',45,24,6,2,11,['狐火','春霖']),mk('雲纖','yx',50,26,6,2,12,['劍氣']))");
   // 三位角色各 16 張新圖都載入，尺寸 192×192
   assert.equal(await pg.evaluate("['qz','bl','yx'].every(c=>['down','up','left','right'].every(d=>[0,1,2,3].every(i=>ASSETS[c+'_'+d+i]&&I[c+'_'+d+i].naturalWidth===192&&I[c+'_'+d+i].naturalHeight===192)))"),true);
   // 王大叔舊 72×66 方向圖仍保留供回退
   assert.equal(await pg.evaluate("['wang'].every(c=>['down','up','left','right'].every(d=>I[c+'_'+d+'0']&&I[c+'_'+d+'0'].naturalWidth===72&&I[c+'_'+d+'0'].naturalHeight===66))"),true);
   // 主角維持四幀循環；新版王大叔使用單張站姿，缺新圖才回退三幀舊素材
   const seq=await pg.evaluate("[0,.5,1,2,3,4,5].map(f=>spriteKey('qz','right',f)).concat(['|'],[0,.5,1,2,3,4].map(f=>spriteKey('bl','left',f)),['|'],[0,.5,1,2,3,4].map(f=>spriteKey('wang','down',f)))");
   assert.deepEqual(seq,['qz_right1','qz_right0','qz_right1','qz_right2','qz_right3','qz_right0','qz_right1','|','bl_left1','bl_left0','bl_left1','bl_left2','bl_left3','bl_left0','|','wang','wang','wang','wang','wang','wang']);
   const legacy=await pg.evaluate(()=>{const image=I.wang;I.wang=null;const seq=[0,.5,1,2,3,4].map(f=>spriteKey('wang','down',f));I.wang=image;return seq});
   assert.deepEqual(legacy,['wang_down0','wang_down0','wang_down1','wang_down0','wang_down2','wang_down0'],'old art still falls back safely');
   // 腳底錨點：新圖最低不透明列縮放後落在地面 y（±1px）；舊圖腳底仍落在 y
   const feet=await pg.evaluate(()=>{const f=(key)=>{const im=I[key],c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);const d=x.getImageData(0,0,c.width,c.height).data;let b=0,t=c.height;for(let y=0;y<c.height;y++)for(let i=0;i<c.width;i++)if(d[(y*c.width+i)*4+3]>40){b=y;if(y<t)t=y}const k=sprK(key);return{foot:(b+1-sprFeet(key))*k+2,height:(b+1-t)*k}};return{qz:f('qz_down1'),qzU:f('qz_up1'),bl:f('bl_down1'),yx:f('yx_down1'),wang:f('wang')}});
   for(const k of['qz','qzU','bl','yx'])assert.ok(Math.abs(feet[k].foot-2)<=1.2&&feet[k].foot<=3.2,`${k} feet ${feet[k].foot}`);
   for(const k of['bl','yx'])assert.ok(Math.abs(feet.qz.height-feet[k].height)<=8,`qz height ${feet.qz.height} vs ${k} ${feet[k].height}`);
   assert.ok(Math.abs(feet.qz.height-feet.wang.height)<=8,`新舊身高 ${feet.qz.height} vs wang ${feet.wang.height}`);
   // 地圖四向走路、跟隨者、戰鬥、夜渡演出都不報錯
   await pg.evaluate("window.__upd=update;window.update=()=>{}");
   for(const d of['down','up','left','right'])for(let f=0;f<5;f++){await pg.evaluate(({d,f})=>{G.dir=d;G.f=f+.3;G.moving=1;G.hist=Array(14).fill([G.x,G.y,d]);G.bl.dir=d;G.bl.f=f},{d,f});await pg.clock.runFor(40)}
   await pg.evaluate("window.update=window.__upd;G_().party.forEach(p=>p.hp=p.mhp);__sb(['小水妖','蘆葦精'],{noEsc:1})");await pg.clock.runFor(900);
   await pg.evaluate("startNight()");await pg.clock.runFor(1500);
   assert.deepEqual(await jsErrors(),[]);console.log(`[qz-sprite ${W}x${H}] 16 frames, 4-frame cycle, feet anchor, new NPC stance + legacy fallback → PASS`);
  }finally{await ctx.close()}
 }
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const s=await serve(),b=await launch();try{await qzSprite(b,s.url)}finally{await b.close();s.close()}
}
