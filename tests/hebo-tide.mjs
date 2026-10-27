import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {serve,launch,newPage,outDir} from './lib.mjs';

// 河伯戰第一包：潮位（退/平/漲）與行動預告。潮位決定傷害倍率，預告和實際行動一致。
export async function heboTide(browser,url){
 const {ctx,pg,jsErrors}=await newPage(browser,390,664,{touch:true,seed:true});
 try{
  await pg.goto(url);await pg.waitForFunction('ready');
  const r=await pg.evaluate(()=>{
   newGame();G.dlg=null;G.party.push(mk('白苓','bl',45,24,6,2,11,['狐火','春霖']));
   const begin=()=>{__sb(['河伯'],{noEsc:1});G.B.ph='cmd';G.B.ai=0;G.party.forEach(p=>{p.hp=999;p.mhp=999;p.st='';p.guard=0;p.mp=p.mmp})};
   const out={};
   begin();out.order=[1,2,3,4,5,6].map(t=>tideAt(t));out.intro=G.B.msgs.some(m=>String(m).includes('潮水'));
   // 傷害倍率：固定亂數，只比較倍率
   const old=Math.random;Math.random=()=>0.25;
   const base=(td,ign)=>{begin();G.B.turn=[3,1,2][td];const h=G.B.en[0];h.def=0;return dmg(100,h,ign)};
   out.phys=[0,1,2].map(td=>base(td,0));out.magic=[0,1,2].map(td=>base(td,1));
   // 河伯攻擊倍率
   begin();out.atk=[0,1,2].map(td=>{G.B.turn=[3,1,2][td];return Math.round(heboPower(G.B.en[0],G.B)*100)/100});
   Math.random=old;
   // 預告與實際一致：逐回合比對預告第一項與河伯真實行動
   begin();const seq=[];for(let i=0;i<8;i++){const f=heboForecast(G.B,2);enemyPhase();const act=G.B.hebo.lastAction;seq.push([f[0].a,act,f[0].tide===tideAt(G.B.turn)]);G.B.after()}
   out.seq=seq;
   // 兩項預告：第二項等於下一回合的第一項
   begin();let ok=true;for(let i=0;i<8;i++){const f=heboForecast(G.B,2);enemyPhase();G.B.after();const g=heboForecast(G.B,1);if(f[1].a!==g[0].a)ok=false}out.chain=ok;
   // 回合末提示潮位轉換
   begin();enemyPhase();out.tideMsg=G.B.msgs.some(m=>String(Array.isArray(m)?m[0]:m).startsWith('潮水轉為'));
   // 其他敵人不受潮位影響
   __sb(['老蘆葦精'],{noEsc:1});out.laoluNoTide=G.B.hebo===undefined&&tideNow(G.B)===1;
   return out;
  });
  assert.deepEqual(r.order,[1,2,0,1,2,0]);assert(r.intro,'intro mentions tide');
  assert(r.phys[0]>r.phys[1]&&r.phys[1]===r.phys[2],'ebb boosts physical only: '+JSON.stringify(r.phys));
  assert(r.magic[2]>r.magic[1]&&r.magic[0]===r.magic[1],'rise boosts magic only: '+JSON.stringify(r.magic));
  assert(r.atk[0]<r.atk[1]&&r.atk[1]<r.atk[2],'hebo attack scales with tide: '+JSON.stringify(r.atk));
  const name={NORMAL:'龍尾',CHARGING:'蓄力',RELEASE:'濁浪',STAGGERED:'失衡'};
  assert(r.seq.every(([f,a,t])=>f===name[a]&&t),'forecast matches action: '+JSON.stringify(r.seq));
  assert(r.chain,'second forecast slot becomes next first slot');assert(r.tideMsg);assert(r.laoluNoTide);
  for(const [w,h] of [[390,664],[844,390]]){
   await pg.setViewportSize({width:w,height:h});
   await pg.evaluate(()=>{__sb(['河伯'],{noEsc:1,bg:'bg_temple'});G.B.msgs=[];G.B.ph='cmd';G.B.ai=0});
   await pg.waitForTimeout(600);await pg.screenshot({path:outDir('hebo-tide',`${w}x${h}`)+'/panel.png'});
  }
  assert.deepEqual(await jsErrors(),[]);console.log('[hebo-tide] order, multipliers, forecast = actual, UI no errors → PASS');
 }finally{await ctx.close()}
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();try{await heboTide(b,s.url)}finally{await b.close();s.close()}}
