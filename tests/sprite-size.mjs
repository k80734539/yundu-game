import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {PNG} from 'pngjs';
import {serve,launch,newPage,SIZES} from './lib.mjs';

// v20 回歸：v19 漏改「被物件遮住時的半透明剪影」，iPhone 上青舟躲在樹／屋後面會出現 3 倍大的半透明鬼影。
// 注意：v21 起青舟戰鬥圖為 480×360 的 qzb_*（不在此 regex 內），由 qz-battle.mjs／attack-motion.mjs 驗證。
// 這裡監聽每一次 drawImage：凡是畫角色 sprite（qz/bl/yx 的 192px 新圖），目的寬度都必須 <100px（約 68px），
// 並走遍地圖所有物件後方，確認「剪影」確實被畫出且大小正確。另模擬舊快取圖片搭新 JS（72×66／缺第 4 幀）。
const SPY=`(()=>{const o=CanvasRenderingContext2D.prototype.drawImage;window.__di=[];CanvasRenderingContext2D.prototype.drawImage=function(im,...a){try{if(typeof I!=="undefined"){for(const k in I)if(I[k]===im&&/^(qz|bl|yx|wang)_(down|up|left|right)\\d$/.test(k)){const w=a.length===2||a.length===4?(a.length===4?a[2]:im.width):(a.length===8?a[6]:a[2]);window.__di.push({k,w,a:this.globalAlpha,nw:im.naturalWidth})}}}catch(e){}return o.call(this,im,...a)}})()`;

export async function spriteSize(browser,url,sizes=[[390,664],[844,390]]){
 for(const [W,H] of sizes){
  const {ctx,pg,jsErrors}=await newPage(browser,W,H,{seed:true,dpr:3});
  try{
   await pg.addInitScript(SPY);
   await pg.clock.install({time:0});await pg.goto(url);await pg.clock.pauseAt(1000);await pg.clock.runFor(1500);
   await pg.evaluate("press('ok');G_().dlg=null;G_().party.push(mk('白苓','bl',45,24,6,2,11,['狐火','春霖']))");
   // 圖片網址帶 ?v=（資源版本，避免舊 JS／新圖或新 JS／舊圖混用）
   assert.equal(await pg.evaluate("Object.keys(ASSETS).every(k=>I[k].src.includes('?v='+ASSET_V))"),true);
   // 走到每個物件正後方（會被遮住）：剪影必須被畫出，且寬度 <100
   const n=await pg.evaluate("M_().obj.length");
   let ghosts=0;
   for(let i=0;i<n;i++){
    await pg.evaluate(i=>{const o=M_().obj[i];TP(o.x,o.y-30,'down');window.__di=[]},i);await pg.clock.runFor(34);
    const r=await pg.evaluate("window.__di");
    for(const d of r){assert.ok(d.w<100,`sprite ${d.k} drawn ${d.w}px wide (obj ${i}, alpha ${d.a})`);if(d.a<1&&d.k.startsWith('qz_'))ghosts++}
   }
   assert.ok(ghosts>0,'沒有任何物件遮住青舟（測試失效）');
   // 真實按鍵長時間走路：四向、斜向、停下再走，每一幀畫出的角色 sprite 都 <100px，幀序在 0–3 內
   await pg.evaluate("TP(15*T,10*T,'down');window.__di=[]");
   const hold=async(ks,ms)=>{for(const k of ks)await pg.keyboard.down(k);await pg.clock.runFor(ms);for(const k of ks)await pg.keyboard.up(k)};
   const seen=new Set();
   for(let round=0;round<3;round++)for(const ks of[['ArrowDown'],['ArrowLeft'],['ArrowUp'],['ArrowRight'],['ArrowDown','ArrowLeft'],['ArrowUp','ArrowRight'],['ArrowUp','ArrowLeft'],['ArrowDown','ArrowRight']]){
    await hold(ks,1100);await pg.clock.runFor(150);
    for(const d of await pg.evaluate("window.__di.splice(0)")){assert.ok(d.w<100,`walk: ${d.k} drawn ${d.w}px wide (alpha ${d.a})`);seen.add(d.k)}
    const f=await pg.evaluate("G_().f");assert.ok(Number.isFinite(f)&&f>=0,'frame counter '+f);
   }
   assert.ok([...seen].filter(k=>/^qz_/.test(k)).length>=8,'走路幀數不足：'+[...seen]);
   // 一般地圖、戰鬥返回、讀檔後都不會出現超大 sprite
   await pg.evaluate("TP(15*T,12*T,'down');window.__di=[]");await pg.clock.runFor(100);
   await pg.evaluate("G_().party.forEach(p=>p.hp=p.mhp);__sb(['小水妖'],{noEsc:1})");await pg.clock.runFor(800);
   await pg.evaluate("G_().B.en.forEach(e=>{e.hp=0})");
   for(const d of await pg.evaluate("window.__di"))assert.ok(d.w<140,`battle sprite ${d.k} ${d.w}px`);
   assert.deepEqual(await jsErrors(),[]);
   console.log(`[sprite-size ${W}x${H}@3x] ${n} objects, ${ghosts} silhouette draws all <100px → PASS`);
  }finally{await ctx.close()}
 }
 // 舊快取：圖片仍是 72×66、且沒有第 4 幀 → 新 JS 要退回原尺寸，仍能正常畫
 {
  const {ctx,pg,jsErrors}=await newPage(browser,390,664,{seed:true,dpr:3});
  try{
   const png=new PNG({width:72,height:66});for(let i=0;i<72*66;i++){const x=i%72,y=(i/72)|0;if(x>20&&x<52&&y>6&&y<65){png.data[i*4]=60;png.data[i*4+1]=90;png.data[i*4+2]=160;png.data[i*4+3]=255}}
   const buf=PNG.sync.write(png);
   await pg.route(/\/(qz|bl|yx)_(down|up|left|right)\d\.webp/,r=>/\d\.webp/.test(r.request().url())&&/3\.webp/.test(r.request().url())?r.fulfill({status:404,body:''}):r.fulfill({status:200,contentType:'image/png',body:buf}));
   await pg.addInitScript(SPY);
   await pg.clock.install({time:0});await pg.goto(url);await pg.clock.pauseAt(1000);await pg.clock.runFor(1500);
   await pg.evaluate("press('ok');G_().dlg=null");
   await pg.evaluate("window.__di=[];TP(15*T,12*T,'right');G_().f=1.3;G_().moving=1");await pg.clock.runFor(100);
   const r=await pg.evaluate("window.__di.filter(d=>d.k.startsWith('qz_'))");
   assert.ok(r.length>0&&r.every(d=>d.w>=60&&d.w<=80),'stale 72px sprite drawn at '+JSON.stringify(r.slice(0,2)));
   assert.deepEqual((await jsErrors()).filter(e=>!/Failed to load resource/.test(e)),[]);  // 缺第 4 幀的 404 是模擬的
   console.log('[sprite-size stale-cache] old 72×66 images + new JS → drawn at natural size, no errors → PASS');
  }finally{await ctx.close()}
 }
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const s=await serve(),b=await launch();try{await spriteSize(b,s.url)}finally{await b.close();s.close()}
}
