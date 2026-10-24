// v21：陳青舟戰鬥彩繪姿勢（qzb_*）— 大小、姿勢切換、不被切片、名稱疊在角色上方
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {serve,launch,newPage,SIZES} from './lib.mjs';
const SPY=`(()=>{const o=CanvasRenderingContext2D.prototype.drawImage,c=CanvasRenderingContext2D.prototype.clip,f=CanvasRenderingContext2D.prototype.fillText;window.__log=[];window.__clip=0;
CanvasRenderingContext2D.prototype.drawImage=function(im,...a){try{for(const k in I)if(I[k]===im){if(/^qzb_/.test(k)||/^bl_(up|left)\\d$/.test(k))window.__log.push(['img',k,a.length,a.length>=4?a[a.length-2]:0,a.length>=4?a[a.length-1]:0]);break}}catch(e){}return o.call(this,im,...a)};
CanvasRenderingContext2D.prototype.clip=function(...a){window.__clip++;return c.apply(this,a)};
CanvasRenderingContext2D.prototype.fillText=function(t,...a){window.__log.push(['txt',String(t)]);return f.call(this,t,...a)}})()`;
export async function qzBattle(browser,url,sizes=SIZES){
 for(const [W,H] of sizes){
  const {ctx,pg,jsErrors}=await newPage(browser,W,H,{seed:true});
  try{
   await pg.clock.install({time:0});await pg.goto(url);await pg.clock.pauseAt(1000);await pg.clock.runFor(1500);
   await pg.evaluate("press('ok');G_().dlg=null;G_().party.push(mk('白苓','bl',45,24,6,2,11,['狐火','春霖']))");
   await pg.evaluate(SPY);
   const setup=async()=>{await pg.evaluate(()=>{__sb(['小水妖','小水妖','蘆葦精'],{noEsc:1});const B=G_().B;Math.random=()=>.5;B.msgs=[];B.ph='cmd';B.ai=0;B.en.forEach(e=>e.hp=e.mhp=9999);G_().party.forEach(p=>p.hp=p.mhp)});await pg.clock.runFor(500)};
   const frame=async()=>pg.evaluate(()=>{window.__log=[];drawBattle(performance.now());return window.__log.slice()});
   const qzKey=l=>l.filter(e=>e[0]==='img'&&e[1].startsWith('qzb_')).map(e=>e[1]);
   await setup();
   // 大小：青舟約為白苓的 1.0–1.25 倍
   let l=await frame();const qz=l.find(e=>e[1]?.startsWith('qzb_')),bl=l.find(e=>/^bl_/.test(e[1]||''));
   assert.ok(qz&&bl,'qz/bl drawn');const ratio=(qz[4]*180/360)/(bl[4]*166/192);
   assert.ok(ratio>=1&&ratio<=1.25,`qz/bl figure ratio ${ratio.toFixed(2)}`);
   assert.ok(qz[2]===4&&Math.abs(qz[3]-qz[4]*480/360)<.01,'qzb frame drawn whole (no sub-rect slicing)');
   // 待機：idle0/idle1 每 600ms 輪替
   const k0=qzKey(l)[0];await pg.clock.runFor(600);const k1=qzKey(await frame())[0];
   assert.deepEqual([k0,k1].sort(),['qzb_idle0','qzb_idle1']);
   // 受擊 → 倒下 → 勝利
   await pg.evaluate("G_().B.fx.push({t:G_().party[0],d:3,at:performance.now()-10,sp:{}})");
   assert.equal(qzKey(await frame())[0],'qzb_hit');
   await pg.clock.runFor(600);await pg.evaluate("G_().party[0].hp=0");assert.equal(qzKey(await frame())[0],'qzb_down');
   await pg.evaluate("G_().party[0].hp=30;G_().B.fx=[];G_().B.en.forEach(e=>{e.hp=0;e.dieAt=performance.now()-2000})");assert.equal(qzKey(await frame())[0],'qzb_win');
   // 失誤 B：名稱／血條疊在角色之後畫，且全程沒有任何 clip（不再切角色圖）
   await setup();await pg.evaluate("press('ok');press('right');press('ok')");
   await pg.evaluate("window.__clip=0");
   for(let t=0;t<=650;t+=65){
    const lg=await frame();const lastImg=Math.max(...lg.map((e,i)=>e[0]==='img'&&e[1].startsWith('qzb_')?i:-1));
    const firstLab=lg.findIndex(e=>e[0]==='txt'&&/^小水妖|蘆葦精/.test(e[1]));
    assert.ok(lastImg>=0&&firstLab>lastImg,`labels must be drawn after the character (t=${t})`);
    await pg.clock.runFor(65);
   }
   assert.equal(await pg.evaluate("window.__clip"),0,'battle drawing must not clip');
   assert.deepEqual(await jsErrors(),[]);console.log(`[qz-battle ${W}x${H}] scale ${ratio.toFixed(2)}×, idle/hit/down/win, no clip, labels on top → PASS`);
  }finally{await ctx.close()}
 }
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const s=await serve(),b=await launch();try{await qzBattle(b,s.url)}finally{await b.close();s.close()}
}
