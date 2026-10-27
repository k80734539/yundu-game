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
   const begin=()=>{__sb(['河伯'],{noEsc:1,noParry:1});G.B.ph='cmd';G.B.ai=0;G.party.forEach(p=>{p.hp=999;p.mhp=999;p.st='';p.guard=0;p.mp=p.mmp})};
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
   // ---- 第二包：撐篙擋浪、引潮、渡氣與合擊
   const beginP=()=>{__sb(['河伯'],{noEsc:1});G.B.ph='cmd';G.B.ai=0;G.party.forEach(p=>{p.hp=999;p.mhp=999;p.st='';p.guard=0;p.mp=p.mmp});G.B.hebo.state=HEBO_STATE.CHARGING;G.B.turn=1};
   const parryRun=(off)=>{beginP();Math.random=()=>0.25;G.B.en[0].hp=G.B.en[0].mhp;enemyPhase();const ph1=G.B.ph;const t0=G.B.parry.t0;parryTap(t0+1000+off);Math.random=old;const lost=999-G.party[0].hp,hh=G.B.en[0].hp,qi=G.B.qi;return{ph1,lost,hh,qi,mhp:G.B.en[0].mhp,grade:G.B.parryGrade,ph:G.B.ph}};
   out.parry={perfect:parryRun(0),good:parryRun(200),miss:parryRun(600),early:parryRun(-700)};
   // 逾時由畫面更新自動判定為失誤（模擬：parry 過期）
   beginP();enemyPhase();const t0=G.B.parry.t0;out.timeoutGrade=parryGradeAt(t0+1000+400);
   // noParry 與青舟倒下時不會停下
   beginP();G.B.opt.noParry=1;enemyPhase();out.noParryPhase=G.B.ph;
   beginP();G.party[0].hp=0;enemyPhase();out.qzDownPhase=G.B.ph;
   // 擋浪反彈打死河伯 → 勝利
   beginP();G.B.en[0].hp=1;enemyPhase();parryTap(G.B.parry.t0+1000);G.B.msgs.length=0;G.B.after();out.reflectWin=G.mode!=='battle'||G.B.won;
   // 引潮：潮位前進一格、預告同步、只有河伯戰可用
   beginP();G.B.hebo.state=HEBO_STATE.NORMAL;const t1=tideNow(G.B);G.B.ai=1;G.B.pend={t:'sk',s:'引潮'};G.party[1].mp=20;exec(null);const oo=CFG.hebo.tide.order;out.pull={exp:oo[(oo.indexOf(t1)+1)%oo.length],before:t1,after:tideNow(G.B),fc:heboForecast(G.B,1)[0].tide,qi:G.B.qi,mp:G.party[1].mp,has:G.party[1].skills.includes('引潮')};
   __sb(['老蘆葦精'],{noEsc:1});G.B.ai=1;G.party[1].mp=20;G.B.pend={t:'sk',s:'引潮'};exec(null);out.pullElsewhere=G.B.msgs.some(m=>String(Array.isArray(m)?m[0]:m).includes('沒有潮水'));
   // 渡氣：滿了才出現合擊，用了清空、河伯失衡、潮位改為退潮
   beginP();G.B.hebo.state=HEBO_STATE.NORMAL;out.comboHidden=!bSkills(G.party[0],G.B).includes('雲渡一擊');G.B.qi=CFG.hebo.qiMax;out.comboShown=bSkills(G.party[0],G.B).includes('雲渡一擊')&&!bSkills(G.party[1],G.B).includes('雲渡一擊');
   G.B.ai=0;G.B.pend={t:'sk',s:'雲渡一擊'};const hp0=G.B.en[0].hp;exec(null);out.combo={dmg:hp0-G.B.en[0].hp,expect:Math.round(G.B.en[0].mhp*CFG.hebo.combo.hpFrac),qi:G.B.qi,state:G.B.hebo.state,tide:tideNow(G.B)};
   // 渡氣來源
   beginP();G.B.hebo.state=HEBO_STATE.NORMAL;G.B.qi=0;G.B.ai=0;G.B.sel=3;G.B.ph='cmd';bKey('ok');out.qiGuard=G.B.qi;
   out.cfg=CFG.hebo;return out;
  });
  assert(Object.values(r.parry).every(x=>x.ph1==='parry'&&x.ph==='msg'),'parry pauses, then resolves into messages');
  assert(r.parry.perfect.lost<r.parry.good.lost&&r.parry.good.lost<r.parry.miss.lost,'perfect<good<miss damage: '+JSON.stringify([r.parry.perfect.lost,r.parry.good.lost,r.parry.miss.lost]));
  assert(r.parry.early.lost===r.parry.miss.lost,'early tap counts as miss');
  assert(r.parry.perfect.hh<r.parry.perfect.mhp&&r.parry.good.hh===r.parry.good.mhp,'only perfect reflects damage');
  assert.deepEqual([r.parry.perfect.qi,r.parry.good.qi,r.parry.miss.qi],[r.cfg.parry.qiPerfect,r.cfg.parry.qiGood,0]);
  assert.equal(r.timeoutGrade,'miss');assert.equal(r.noParryPhase,'msg');assert.equal(r.qzDownPhase,'msg');assert(r.reflectWin,'reflect can win the battle');
  assert(r.pull.has&&r.pull.after===r.pull.exp&&r.pull.fc===r.pull.after,'pull advances tide and forecast follows: '+JSON.stringify(r.pull));assert.equal(r.pull.mp,16);assert.equal(r.pull.qi,r.cfg.qiPull);assert(r.pullElsewhere);
  assert(r.comboHidden&&r.comboShown);assert.deepEqual([r.combo.dmg,r.combo.qi,r.combo.state,r.combo.tide],[r.combo.expect,0,'STAGGERED',0]);assert.equal(r.qiGuard,r.cfg.qiGuard);

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
