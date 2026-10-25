import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {serve,launch,newPage,outDir,SIZES} from './lib.mjs';

// v22 斜角站位戰鬥：素材、版面（不重疊／觸控目標 ≥44px／縮放一致）、各角色動作時間軸、受擊／倒下／勝利 pose、跳過與縮放
// （取代 v17–v21 的 attack-motion.mjs：舊的底部面板＋竹篙版面已不存在）
const KEYS={qzd:['idle0','idle1','charge','thrust','recover','sweepwind','sweep','hit','down','win'],
 bld:['idle0','idle1','cast0','cast1','recover','spring','guard','hit','down','win'],
 yxd:['idle0','idle1','charge','slash0','slash1','recover','skill','hit','down','win']};
export async function diagBattle(browser,url,sizes=[[390,844],[375,553],[844,390]]){
 for(const [W,H] of sizes){
  const {ctx,pg,jsErrors}=await newPage(browser,W,H,{seed:true,dpr:2});const dir=outDir('diag-battle',`${W}x${H}`);
  try{
   await pg.clock.install({time:0});await pg.goto(url);await pg.clock.pauseAt(1000);await pg.clock.runFor(1500);
   await pg.evaluate("press('ok');G_().dlg=null;G_().party.push(mk('白苓','bl',45,24,6,2,11,['狐火','春霖']),mk('雲纖','yx',50,26,6,2,12,['劍氣']))");
   // 1) 素材：30 張 480×420 影格＋3 張戰鬥頭像；舊對話頭像與舊 v17–v21 素材
   assert.equal(await pg.evaluate(K=>Object.entries(K).every(([p,a])=>a.every(n=>ASSETS[p+'_'+n]&&I[p+'_'+n].naturalWidth===480&&I[p+'_'+n].naturalHeight===420)),KEYS),true,'30 diagonal frames 480×420');
   assert.equal(await pg.evaluate("['qz','bl','yx'].every(c=>I['pt_'+c+'_battle'].naturalWidth>=128&&I['pt_'+c].naturalWidth>0)"),true,'battle avatars + dialogue portraits');
   assert.equal(await pg.evaluate("['qz_pole','qz_atk_windup','qz_atk_strike','qz_atk_recover'].every(k=>!(k in ASSETS))"),true,'v20 pole art removed');
   assert.equal(await pg.evaluate("Object.keys(ASSETS).every(k=>I[k].src.includes('?v='+ASSET_V))&&ASSET_V===33"),true);
   const setup=async(names=['小水妖','小水妖','蘆葦精'],ko=false)=>{await pg.evaluate(({names,ko})=>{__sb(names,{noEsc:1});
    const B=G_().B;Math.random=()=>.5;G_().party.forEach(p=>{p.hp=p.mhp;p.mp=p.mmp;p.guard=0});B.msgs=[];B.ph='cmd';B.ai=0;B.sel=0;B.an=[];B.en.forEach(e=>e.hp=e.mhp=ko?1:9999)},{names,ko});await pg.clock.runFor(700)};
   const step=async(ms)=>{await pg.clock.runFor(ms)};
   // v24 supplied enemy art: complete six-pose sets and impact-driven state selection.
   assert.equal(await pg.evaluate(()=>['shui','lu','hebo'].every(k=>['idle0','idle1','cast','attack','hit','down'].every(p=>I[k+'_'+p]?.naturalWidth===512))),true,'18 enemy poses loaded');
   await setup();
   assert.equal(await pg.evaluate(()=>{const B=G_().B,e=B.en[0],now=performance.now();
    const idle=/^idle[01]$/.test(enemyPose(e,now));
    B.vx=[{src:e,k:'splash',at:now}];const wind=enemyPose(e,now)==='cast',attack=enemyPose(e,now+170)==='attack';
    B.fx=[{t:e,at:now+200}];const before=enemyPose(e,now+199)==='attack',hit=enemyPose(e,now+200)==='hit';
    e.hp=0;e.dieAt=now+200;const down=enemyPose(e,now+200)==='down';
    const old=I[e.e+'_down'];I[e.e+'_down']=null;const fallback=enemyImage(e,now+200,100,200,1).pose==='fallback';I[e.e+'_down']=old;
    return idle&&wind&&attack&&before&&hit&&down&&fallback}),true,'enemy states follow VFX timing; missing art falls back');
   // 2) 版面
   await setup();
   const lay=await pg.evaluate(()=>{const B=G_().B,L=B.L;return{port:L.port,feet:L.feet,en:B.en.map(e=>B.po(e)),cards:B.cards,hit:B.hit.map(h=>({x:h.x,y:h.y,w:h.w,h:h.h})),s:L.s,SW:window.innerWidth,SH:window.innerHeight}});
   assert.equal(lay.cards.length,3);
   assert.ok(lay.feet[0][0]<lay.feet[1][0]&&lay.feet[1][0]<lay.feet[2][0]&&lay.feet[0][1]>lay.feet[1][1]&&lay.feet[1][1]>lay.feet[2][1],'party diagonal from front-left to back-right (雲纖,青舟,白苓)');
   if(lay.port){
    assert.ok(Math.max(...lay.en.map(q=>q[0]))<lay.feet[1][0]&&Math.max(...lay.en.map(q=>q[1]))<lay.feet[2][1],'enemies upper-left')}
   for(const c of lay.cards){assert.ok(c.x>=0&&c.x+c.w<=lay.SW&&c.y+c.h<=lay.SH&&c.h>=44,'card inside screen')}
   assert.ok(lay.cards[0].x+lay.cards[0].w<=lay.cards[1].x&&lay.cards[1].x+lay.cards[1].w<=lay.cards[2].x,'cards do not overlap');
   assert.equal(lay.hit.length,5,'攻 技 道 防 逃');
   for(const h of lay.hit){assert.ok(h.w>=44&&h.h>=44,`touch target ${h.w}×${h.h}`);assert.ok(h.x>=0&&h.y>=0&&h.x+h.w<=lay.SW&&h.y+h.h<=lay.SH);
    for(const c of lay.cards)assert.ok(h.x+h.w<=c.x||c.x+c.w<=h.x||h.y+h.h<=c.y||c.y+c.h<=h.y,'button overlaps card')}
   assert.ok(lay.hit[4].x<lay.SW*.3&&lay.hit[4].y<lay.SH*.3,'逃 at top-left');
   assert.ok(lay.hit[0].x>lay.SW*.6&&lay.hit[0].y>lay.SH*.1&&lay.hit[0].y<lay.SH*.5,'攻 at right-edge middle/upper');
   for(let i=1;i<4;i++)assert.ok(lay.hit[i].y>lay.hit[i-1].y,'buttons stack downward');
   // v22b：角色縮小、站位散開、指令鈕不遮任何角色、敵我不重疊
   const R=q=>({x:q[0]-q[2]/2,y:q[1]-q[3]/2,w:q[2],h:q[3]}),hit2=(a,b)=>!(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);
   const rects=await pg.evaluate(()=>{const B=G_().B;return{p:G_().party.map(p=>B.po(p)),e:B.en.map(e=>B.po(e)),U:B.L.U}});
   const pr=rects.p.map(q=>R([q[0],q[1],q[2]*.62,q[3]*.9])),er=rects.e.map(R);
   for(let i=0;i<pr.length;i++)for(let j=i+1;j<pr.length;j++)assert.ok(!hit2(pr[i],pr[j]),`party ${i}/${j} overlap`);
   for(let i=0;i<er.length;i++)for(let j=i+1;j<er.length;j++)assert.ok(!hit2(er[i],er[j]),`enemy ${i}/${j} overlap`);
   for(const a of pr)for(const b of er)assert.ok(!hit2(a,b),'party overlaps enemy at rest');
   for(const q of rects.p){assert.ok(q[0]-q[2]*.3>=0&&q[0]+q[2]*.3<=lay.SW,'party inside screen horizontally')}
   for(const h of lay.hit)for(const a of [...pr,...er])assert.ok(!hit2(h,a)||h===lay.hit[4],'command button covers a character');
   if(lay.port){const U=rects.U;for(let i=0;i<2;i++)assert.ok(lay.feet[i+1][0]-lay.feet[i][0]>=40*U,'party diagonal horizontal separation');
    assert.ok(lay.feet[0][1]-lay.feet[1][1]>=85*U&&lay.feet[1][1]-lay.feet[2][1]>=85*U,'party diagonal depth separation');
    const ph=270*lay.s;assert.ok(ph>=lay.SH*.1&&ph<=lay.SH*.15,'party height ≈ SH/8 '+ph);
    assert.ok(Math.abs(lay.en[0][3]-70*U)<8*U&&Math.abs(lay.en[2][3]-100*U)<10*U,'enemy heights '+lay.en.map(q=>q[3]))}
   await pg.screenshot({path:`${dir}/layout.png`});
   // 共用縮放：三人影格都以 BFR.scale×480×420（×畫面係數）畫出
   await pg.evaluate(()=>{const o=CanvasRenderingContext2D.prototype.drawImage;window.__sp=[];window.__so=o;CanvasRenderingContext2D.prototype.drawImage=function(im,...a){for(const k of ['qzd','bld','yxd'])for(const n of ['idle0','idle1'])if(I[k+'_'+n]===im)window.__sp.push({k,w:a[2],h:a[3]});return o.call(this,im,...a)}});
   await step(50);
   const sc=await pg.evaluate(()=>{CanvasRenderingContext2D.prototype.drawImage=window.__so;return{r:window.__sp,s:G_().B.L.s}});
   assert.ok(sc.r.length>=3,'three party sprites drawn');for(const d of sc.r){assert.ok(Math.abs(d.w-480*sc.s)<.01&&Math.abs(d.h-420*sc.s)<.01,`sprite scale ${d.k} ${d.w}`)}
   // 待機：兩幀每 600ms 交替
   const idle=[];for(let i=0;i<5;i++){idle.push(await pg.evaluate("G_().B.pose[0]"));await step(600)}
   assert.ok(idle.every(n=>/^idle[01]$/.test(n))&&idle.some((n,i)=>i&&n!==idle[i-1]),'idle alternates '+idle);
   assert.ok(idle.every((n,i)=>!i||n!==idle[i-1]),'idle alternates every 600ms '+idle);
   // 3) 動作時間軸
   const collapse=a=>a.map(n=>n.replace(/idle[01]/,'idle')).filter((n,i,b)=>!i||n!==b[i-1]);
   // 青舟普攻：charge → thrust → recover → idle，且命中時間 340ms、傷害只算一次
   await setup();
   const imp=await pg.evaluate(()=>{const B=G_().B;press('ok');press('ok');drawBattle(performance.now());return{d:B.vx[0].k,imp:B.fx[0].at-B.vx[0].at,hp:B.en.map(e=>e.hp)}});
   assert.equal(imp.d,'slash');assert.equal(imp.imp,340);
   const qs=[],pos=[];for(let t=0;t<900;t+=40){await step(40);const q=await pg.evaluate(()=>{const B=G_().B,F=B.feetOf(G_().party[0]),a=(B.an||[])[0];return{p:B.pose[0],hp:B.en.map(e=>e.hp),an:!!a}});qs.push(q.p);if(t===300||t===0)pos.push(q.p);assert.deepEqual(q.hp,imp.hp,'drawing never applies damage again')}
   {const c=collapse(qs);assert.deepEqual(c.filter(n=>n!=='idle'),['charge','thrust','recover'],'qz attack timeline '+c);assert.equal(c.at(-1),'idle')}
   assert.ok(qs.includes('charge')&&qs.includes('thrust')&&qs.includes('recover'));
   // 滑步：命中時最靠近敵人（離原位 >40px），結束回到原位；只改畫面座標
   await setup();await pg.evaluate("press('ok');press('ok')");
   const dist=[];for(let t=0;t<800;t+=40){await step(40);dist.push(await pg.evaluate(()=>{const B=G_().B,p=G_().party[0],F=B.feetOf(p),ps=bPose(p,1,performance.now(),F,B.L.s,B.L);return Math.hypot(ps.dx,ps.dy)}))}
   assert.ok(Math.max(...dist)>40,'qz slides toward enemy '+Math.max(...dist));assert.ok(dist.at(-1)<1,'qz returns to stance');
   // 衝刺只到敵人旁邊：身體（約 ±24×±50px）不得與任何敵人圖重疊（普攻與橫掃）
   for(const [setupArgs,keys] of [[[],"press('ok');press('ok')"],[[],"press('down');press('ok');press('ok')"]]){
    await setup(...setupArgs);await pg.evaluate("G_().B.ai=0;"+keys);let worst=1e9;
    for(let t=0;t<800;t+=40){await step(40);const c=await pg.evaluate(()=>{const B=G_().B,p=G_().party[0],F=B.feetOf(p),ps=bPose(p,1,performance.now(),F,B.L.s,B.L),u=B.L.U,bx=F[0]+ps.dx,by=F[1]+ps.dy-52*u;
     return B.en.filter(e=>e.hp>0).map(e=>{const q=B.po(e),dx=Math.max(0,Math.abs(bx-q[0])-(q[2]/2+24*u)),dy=Math.max(0,Math.abs(by-q[1])-(q[3]/2+50*u));return Math.hypot(dx,dy)+(dx>0||dy>0?0:-1)})});
     worst=Math.min(worst,...c)}
    assert.ok(worst>=-1+1e-9&&worst>=0,'qz dash stops beside enemies '+worst)}
   // 橫掃：sweepwind → sweep → recover
   await setup();await pg.evaluate("press('down');press('ok');press('ok')");const sw=[];for(let t=0;t<1100;t+=40){await step(40);sw.push(await pg.evaluate("G_().B.pose[0]"))}
   assert.ok(['sweepwind','sweep','recover'].every(n=>sw.includes(n))&&sw.indexOf('sweepwind')<sw.indexOf('sweep')&&sw.indexOf('sweep')<sw.indexOf('recover'),'sweep '+collapse(sw));
   // 白苓：普攻 cast0→cast1→recover；狐火；春霖 spring；防禦 guard
   await setup();await pg.evaluate("G_().B.ai=1;press('ok');press('ok')");let bs=[];for(let t=0;t<1000;t+=40){await step(40);bs.push(await pg.evaluate("G_().B.pose[1]"))}
   assert.ok(['cast0','cast1','recover'].every(n=>bs.includes(n))&&bs.indexOf('cast0')<bs.indexOf('cast1')&&bs.indexOf('cast1')<bs.indexOf('recover'),'bl attack '+collapse(bs));
   await setup();await pg.evaluate("G_().B.ai=1;press('down');press('ok');press('ok');press('ok')");bs=[];for(let t=0;t<1300;t+=40){await step(40);bs.push(await pg.evaluate("G_().B.pose[1]"))}
   assert.ok(['cast0','cast1','recover'].every(n=>bs.includes(n)),'bl foxfire '+collapse(bs));
   await setup();await pg.evaluate("G_().party[0].hp=10;G_().B.ai=1;press('down');press('ok');press('down');press('ok')");bs=[];for(let t=0;t<600;t+=40){await step(40);bs.push(await pg.evaluate("G_().B.pose[1]"))}
   assert.ok(bs.includes('spring'),'bl spring '+collapse(bs));
   await setup();await pg.evaluate("G_().B.ai=1;press('down');press('down');press('down');press('ok')");await step(2400);
   assert.equal(await pg.evaluate("G_().party[1].guard&&G_().B.pose[1]"),'guard','bl guard pose stays');
   // 雲纖：普攻 charge→slash0→slash1→recover，同樣 340ms 命中；技能 skill
   await setup();await pg.evaluate("G_().B.ai=2;press('ok');press('ok')");let ys=[];for(let t=0;t<900;t+=40){await step(40);ys.push(await pg.evaluate("G_().B.pose[2]"))}
   assert.ok(['charge','slash0','slash1','recover'].every(n=>ys.includes(n))&&ys.indexOf('charge')<ys.indexOf('slash0')&&ys.indexOf('slash0')<ys.indexOf('slash1')&&ys.indexOf('slash1')<ys.indexOf('recover'),'yx attack '+collapse(ys));
   await setup();await pg.evaluate("G_().B.ai=2;G_().party[2].skills=['橫掃'];press('down');press('ok');press('ok')");ys=[];for(let t=0;t<900;t+=40){await step(40);ys.push(await pg.evaluate("G_().B.pose[2]"))}
   assert.ok(ys.includes('skill'),'yx skill '+collapse(ys));
   // 受擊：敵人攻擊時被打的人 hit（≈450ms），之後回待機；KO 後 down 並保持；勝利 win
   await setup();await pg.evaluate("G_().B.turn=1;__ep()");let hs=[];for(let t=0;t<1500;t+=40){await step(40);hs.push(await pg.evaluate("G_().B.pose"))}
   assert.ok(hs.some(p=>Object.values(p).includes('hit')),'someone plays hit');assert.ok(Object.values(hs.at(-1)).every(n=>/^idle/.test(n)),'hit ends in idle');
   await setup();await pg.evaluate("G_().party[0].hp=0");await step(3000);assert.equal(await pg.evaluate("G_().B.pose[0]"),'down');
   await pg.screenshot({path:`${dir}/down.png`});
   await setup(['小水妖'],true);await pg.evaluate("press('ok');press('ok')");
   for(let i=0;i<60&&!(await pg.evaluate("!!G_().B&&G_().B.won"));i++){await step(80);await pg.evaluate("{const B=G_().B;if(B&&B.ph==='msg'&&!B.won)press('ok')}")}
   await step(300);assert.deepEqual(await pg.evaluate("Object.values(G_().B.pose)"),['win','win','win']);await pg.screenshot({path:`${dir}/win.png`});
   await pg.evaluate("press('ok')");await step(300);assert.equal(await pg.evaluate("G_().mode"),'map');
   // 跳過：訊息中連點，動作直接結束，特效時間已到，傷害只有一次
   await setup();await pg.evaluate("press('ok');press('ok');press('ok')");
   assert.equal(await pg.evaluate("G_().B.fx.length"),1);assert.equal(await pg.evaluate("G_().B.fx[0].at<=performance.now()"),true);
   // 縮放視窗中途攻擊不報錯，結束後回到待機
   await setup();await pg.evaluate("press('ok');press('ok')");await step(200);await pg.setViewportSize({width:H,height:W});await step(500);await pg.setViewportSize({width:W,height:H});await step(900);
   assert.match(await pg.evaluate("G_().B.pose[0]"),/^idle/);
   // 缺圖時退回 idle，不中斷戰鬥
   await setup();await pg.evaluate("I.qzd_charge=null;I.qzd_thrust=null;I.qzd_recover=null;press('ok');press('ok')");await step(1200);
   // Boss 單隻、版面不報錯
   await setup(['河伯']);await pg.screenshot({path:`${dir}/boss.png`});
   assert.deepEqual(await jsErrors(),[]);console.log(`[diag-battle ${W}x${H}] assets, layout, scale, idle, qz/bl/yx timelines, hit/down/win, skip, resize → PASS`);
  }finally{await ctx.close()}
 }
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const s=await serve(),b=await launch();try{await diagBattle(b,s.url)}finally{await b.close();s.close()}
}
