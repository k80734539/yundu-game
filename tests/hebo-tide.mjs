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
   const begin=()=>{__sb(['河伯'],{noEsc:1,noParry:1,noMoves:1});G.B.ph='cmd';G.B.ai=0;G.party.forEach(p=>{p.hp=999;p.mhp=999;p.st='';p.guard=0;p.mp=p.mmp})};
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
   begin();enemyPhase();out.tideMsg=G.B.msgs.some(m=>String(Array.isArray(m)?m[0]:m).includes('潮水'));
   // 其他敵人不受潮位影響
   __sb(['老蘆葦精'],{noEsc:1});out.laoluNoTide=G.B.hebo===undefined&&tideNow(G.B)===1;
   // ---- 第二包：撐篙擋浪、引潮、渡氣與合擊
   const beginP=()=>{__sb(['河伯'],{noEsc:1,noMoves:1});G.B.ph='cmd';G.B.ai=0;G.party.forEach(p=>{p.hp=999;p.mhp=999;p.st='';p.guard=0;p.mp=p.mmp});G.B.hebo.state=HEBO_STATE.CHARGING;G.B.turn=1};
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
   // 河伯姿勢：蓄力／失衡／階段二待機／濁浪釋放，圖都存在
   beginP();const B0=G.B,hb=B0.en[0],nowT=1000;
   const pz={};B0.hebo.state=HEBO_STATE.NORMAL;pz.normal=enemyPose(hb,nowT);B0.hebo.state=HEBO_STATE.CHARGING;pz.charge=enemyPose(hb,nowT);B0.hebo.state=HEBO_STATE.STAGGERED;pz.stagger=enemyPose(hb,nowT);
   B0.hebo.state=HEBO_STATE.NORMAL;B0.heboPhase2=1;pz.rage=enemyPose(hb,nowT);B0.heboPhase2=0;
   B0.vx=[{src:hb,k:'wave',at:nowT-10}];pz.wave=enemyPose(hb,nowT);B0.vx=[];
   out.poses=pz;out.poseImgs=['charge0','charge1','stagger','rage0','rage1','wave'].map(k=>!!I['hebo_'+k]?.naturalWidth);
   // ---- 變招：吞水、漩渦；預告與實際行動一致（含隨機招式）
   {const mkB=()=>{__sb(['河伯'],{noEsc:1,noParry:1});G.B.ph='cmd';G.B.ai=0;G.party.forEach(p=>{p.hp=999;p.mhp=999;p.st='';p.guard=0;p.sealed=0;p.mp=p.mmp})};
    mkB();const H=G.B.hebo;H.moves=['drink','whirl','tail','tail'];G.B.en[0].hp=300;const hp0=G.B.en[0].hp;
    const fc=heboForecast(G.B,2).map(o=>o.k);enemyPhase();out.drink={fc,healed:G.B.en[0].hp-hp0,expect:Math.round(G.B.en[0].mhp*CFG.hebo.drinkHeal),pose:null};G.B.after();
    const fc2=heboForecast(G.B,1).map(o=>o.k);enemyPhase();out.whirl={fc:fc2,sealed:G.party.filter(p=>p.sealed).length};
    const sealedP=G.party.find(p=>p.sealed);G.B.after();
    out.sealStillThere=G.party.filter(p=>p.sealed).length;
    G.B.ph='cmd';G.B.ai=G.party.indexOf(sealedP);G.B.sel=1;bKey('ok');out.sealBlocked=G.B.ph==='msg'&&String(G.B.msgs[0]).includes('無法使用法術');
    G.B.msgs.length=0;G.B.after();
    enemyPhase();out.sealCleared=G.party.filter(p=>p.sealed).length;
    // 隨機招式：預告第一項 = 實際行動
    Math.random=(()=>{let s=7;return()=>(s=(s*16807)%2147483647)/2147483647})();mkB();G.B.opt.noMoves=0;G.B.hebo.moves=[];heboRefill(G.B);G.B.en[0].hp=G.B.en[0].mhp*.9;
    const seq2=[];for(let i=0;i<10&&G.B.hebo;i++){const f=heboForecast(G.B,2),a0=f[0].k;enemyPhase();if(G.B.ph==='parry'){G.B.opt.noParry=1;enemyPhase()}const real=G.B.msgs.map(m=>String(Array.isArray(m)?m[0]:m)).join('|');const kind=/吞下河水/.test(real)?'drink':/水柱從/.test(real)?'spear':/仰天長吼/.test(real)?'roar':/漩渦/.test(real)?'whirl':/龍尾/.test(real)?'tail':/濁浪/.test(real)&&/掀起|威力/.test(real)?'wave':/蓄力/.test(real)?'charge':/失衡/.test(real)?'stagger':'?';seq2.push([a0,kind]);G.party.forEach(p=>{p.hp=999;p.sealed=0});G.B.after()}
    out.seq2=seq2;Math.random=old}
   // ---- 第三包：青舟與白苓的招式、水柱突刺、龍吼、濁浪連環
   {const mk2=()=>{__sb(['河伯'],{noEsc:1,noParry:1,noMoves:1});G.B.ph='cmd';G.B.ai=0;G.party.forEach(p=>{p.hp=999;p.mhp=999;p.st='';p.guard=0;p.sealed=0;p.weak=0;p.mp=p.mmp});G.B.hebo.state=HEBO_STATE.NORMAL;G.B.en[0].hp=G.B.en[0].mhp};
    const old2=Math.random;
    mk2();out.learned={qz:G.party[0].skills.slice(),bl:G.party[1].skills.slice()};
    // 踏灘：只有退潮能用，無視防禦
    G.B.turn=3;out.stepEbb=skillUsable(G.party[0],'踏灘',G.B);G.B.turn=1;out.stepMid=skillUsable(G.party[0],'踏灘',G.B);
    G.B.turn=3;G.B.ai=0;G.B.pend={t:'sk',s:'踏灘'};Math.random=()=>0.25;const hp1=G.B.en[0].hp;exec(G.B.en[0]);Math.random=old2;out.step={dmg:hp1-G.B.en[0].hp,mp:G.party[0].mp,mmp:G.party[0].mmp};
    // 壓浪：漲潮且河伯蓄力才能用，使河伯失衡
    mk2();G.B.turn=2;G.B.hebo.state=HEBO_STATE.CHARGING;out.pressOk=skillUsable(G.party[0],'壓浪',G.B);G.B.hebo.state=HEBO_STATE.NORMAL;out.pressNoCharge=skillUsable(G.party[0],'壓浪',G.B);
    G.B.hebo.state=HEBO_STATE.CHARGING;G.B.turn=1;out.pressMid=skillUsable(G.party[0],'壓浪',G.B);G.B.turn=2;G.B.ai=0;G.B.pend={t:'sk',s:'壓浪'};exec(null);out.press={state:G.B.hebo.state};
    // 選單：不可用招式回覆原因且不扣 MP
    mk2();G.B.turn=1;G.B.ai=0;G.B.ph='skill';G.B.sel=G.party[0].skills.indexOf('踏灘');const mp0=G.party[0].mp;bKey('ok');out.stepBlocked={ph:G.B.ph,mp:G.party[0].mp===mp0,msg:String(G.B.msgs[0]).includes('不是退潮')};
    // 迷霧：下一次攻擊減弱，只用一次
    mk2();Math.random=()=>0.25;const base=(()=>{G.B.hebo.moves=['tail','tail','tail','tail'];G.party.forEach(p=>p.hp=999);enemyPhase();const lost=999-Math.min(...G.party.map(p=>p.hp));G.B.after();return lost})();
    mk2();G.B.mist=1;G.B.hebo.moves=['tail','tail','tail','tail'];G.party.forEach(p=>p.hp=999);Math.random=()=>0.25;enemyPhase();const lostMist=999-Math.min(...G.party.map(p=>p.hp));Math.random=old2;out.mist={base,lostMist,used:G.B.mist};
    // 水柱：標記預告、被標記者防禦完全擋下、未防禦吃重傷
    mk2();G.B.opt.noMoves=0;G.B.hebo.moves=['spear','tail','tail','tail'];const f=heboForecast(G.B,1)[0];out.spearF=f.k;out.mark=!!G.B.hebo.mark;const target=G.B.hebo.mark;target.guard=1;const th=target.hp;enemyPhase();out.spearGuard=th-target.hp;G.B.after();
    mk2();G.B.opt.noMoves=0;G.B.hebo.moves=['spear','tail','tail','tail'];heboForecast(G.B,1);const t2=G.B.hebo.mark;t2.guard=0;const th2=t2.hp;Math.random=()=>0.25;enemyPhase();Math.random=old2;out.spearHit=th2-t2.hp;
    // 龍吼：全隊虛弱，攻擊力下降，春霖解除，兩回合後自然消失
    mk2();G.B.opt.noMoves=0;G.B.hebo.moves=['roar','tail','tail','tail'];G.party.forEach(p=>p.hp=999);enemyPhase();out.roar={weak:G.party.map(p=>p.weak),atk:Math.round(atkOf(G.party[0])*10)/10,base:G.party[0].atk};
    G.B.after();enemyPhase();out.roarTick=G.party.map(p=>p.weak);G.B.after();enemyPhase();G.B.after();enemyPhase();out.roarGone=G.party.map(p=>p.weak);
    mk2();G.party.forEach(p=>p.weak=3);G.B.ai=1;G.B.pend={t:'sk',s:'春霖'};exec(null);out.cleanse=G.party.map(p=>p.weak);
    // 濁浪連環：階段二的第一波之後再來第二波（可再擋一次）
    mk2();G.B.opt.noMoves=0;G.B.heboPhase2=1;G.B.talisman=null;G.B.opt.noParry=0;G.B.hebo.state=HEBO_STATE.CHARGING;G.B.hebo.chained=0;
    const fc3=heboForecast(G.B,3).map(o=>o.k);enemyPhase();const p1=G.B.ph;parryResolve('miss');const st1={state:G.B.hebo.state,chained:G.B.hebo.chained};G.B.msgs.length=0;G.B.after();enemyPhase();const p2=G.B.ph;parryResolve('miss');const st2={state:G.B.hebo.state,chained:G.B.hebo.chained};
    out.chain={fc3,p1,p2,st1,st2};
    // 強制二階段時的預告也要與連環一致
    Math.random=old2}
   out.cfg=CFG.hebo;return out;
  });
  assert(Object.values(r.parry).every(x=>x.ph1==='parry'&&x.ph==='msg'),'parry pauses, then resolves into messages');
  assert(r.parry.perfect.lost<r.parry.good.lost&&r.parry.good.lost<r.parry.miss.lost,'perfect<good<miss damage: '+JSON.stringify([r.parry.perfect.lost,r.parry.good.lost,r.parry.miss.lost]));
  assert(r.parry.early.lost===r.parry.miss.lost,'early tap counts as miss');
  assert(r.parry.perfect.hh<r.parry.perfect.mhp&&r.parry.good.hh===r.parry.good.mhp,'only perfect reflects damage');
  assert.deepEqual([r.parry.perfect.qi,r.parry.good.qi,r.parry.miss.qi],[r.cfg.parry.qiPerfect,r.cfg.parry.qiGood,0]);
  assert.equal(r.timeoutGrade,'miss');assert.equal(r.noParryPhase,'msg');assert.equal(r.qzDownPhase,'msg');assert(r.reflectWin,'reflect can win the battle');
  assert(r.pull.has&&r.pull.after===r.pull.exp&&r.pull.fc===r.pull.after,'pull advances tide and forecast follows: '+JSON.stringify(r.pull));assert.equal(r.pull.mp,16);assert.equal(r.pull.qi,r.cfg.qiPull);assert(r.pullElsewhere);
  assert.equal(r.poses.charge.slice(0,6),'charge');assert.equal(r.poses.stagger,'stagger');assert(r.poses.rage.startsWith('rage'));assert.equal(r.poses.wave,'wave');assert(r.poses.normal.startsWith('idle'));assert(r.poseImgs.every(Boolean),'new hebo pose images loaded');
  assert.deepEqual(r.drink.fc,['drink','whirl']);assert.equal(r.drink.healed,r.drink.expect);assert.deepEqual(r.whirl.fc,['whirl']);assert.equal(r.whirl.sealed,1);assert.equal(r.sealStillThere,1,'seal lasts through the next player phase');assert(r.sealBlocked,'sealed hero cannot open skills');assert.equal(r.sealCleared,0,'seal ends after that turn');
  assert(r.seq2.length>=8&&r.seq2.every(([f,a])=>f===a),'forecast with random moves matches actions: '+JSON.stringify(r.seq2));assert(new Set(r.seq2.map(x=>x[0])).size>=3,'random moves actually vary');
  assert.deepEqual(r.learned.qz.filter(k=>['渡水一擊','踏灘','壓浪'].includes(k)),['渡水一擊','踏灘','壓浪']);assert(r.learned.bl.includes('迷霧'));
  assert(r.stepEbb&&!r.stepMid,'踏灘 only in ebb tide');assert(r.step.dmg>0&&r.step.mp===r.step.mmp-6,'踏灘 costs 6 MP and hits: '+JSON.stringify(r.step));
  assert(r.pressOk&&!r.pressNoCharge&&!r.pressMid,'壓浪 needs rising tide + charging');assert.equal(r.press.state,'STAGGERED');
  assert(r.stepBlocked.ph==='msg'&&r.stepBlocked.mp&&r.stepBlocked.msg,'blocked skill explains and costs nothing');
  assert(r.mist.lostMist<r.mist.base&&r.mist.used===0,'迷霧 weakens and is consumed: '+JSON.stringify(r.mist));
  assert.equal(r.spearF,'spear');assert(r.mark,'spear marks its target ahead of time');assert.equal(r.spearGuard,0,'guarding the marked hero blocks the spear');assert(r.spearHit>0,'unguarded target gets hit');
  assert.deepEqual(r.roar.weak,[3,3]);assert(r.roar.atk<r.roar.base,'weak lowers attack');assert(r.roarGone.every(w=>w===0),'weak wears off');assert(r.cleanse.every(w=>w===0),'春霖 cleanses weak');
  assert.equal(r.chain.fc3.join(),'wave,wave,tail','forecast shows the chained second wave');assert.equal(r.chain.p1,'parry');assert.equal(r.chain.p2,'parry','second wave opens a second parry');assert.deepEqual([r.chain.st1.state,r.chain.st1.chained],['CHARGING',1]);assert.equal(r.chain.st2.chained,0);
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
