'use strict';
// 戰鬥邏輯：startBattle、指令、傷害、敵人行動
// ---------- battle (ported) ----------
function newE(k,i,n){return{...EN[k],n:k+(n>1?'ABC'[i]:''),mhp:EN[k].hp,ph:Math.random()*6}}
function startBattle(ks,opt){VPT.length=0;G.B={en:ks.map((k,i)=>newE(k,i,ks.length)),opt,ai:-1,ph:'cmd',sel:0,turn:1,msgs:[],after:null,fx:[]};G.prevMode=G.mode;G.mode='battle';G.bT=performance.now();
 const B=G.B;G.party.forEach(p=>p.guard=0);B.msgs=[(EN[ks[0]].boss?'頭目戰！':'妖怪出現了！')+' '+B.en.map(e=>e.n).join('、')].concat(opt.intro||[]);B.ph='msg';B.after=nextActor}
const alive=a=>a.filter(x=>x.hp>0);
function hit(t,d,o){const B=G.B;if(B)(B.q=B.q||[]).push(Object.assign({t,d},o||{}))}
function heal(t,h){hit(t,h,{heal:1});return h}
function wr(m,i,k,src,tg){const B=G.B;m[i]=[m[i],{k,src,tg:tg||[],hits:(B.q||[]).splice(0)}]}
function dmg(pw,t,ign,cr){let d=Math.max(1,Math.round(pw-(ign?0:t.def+(t.arm||0))+Math.random()*4-1));if(cr)d=Math.round(d*1.6);if(t.guard)d=Math.ceil(d/2);t.hp=Math.max(0,t.hp-d);hit(t,d,{crit:cr,big:cr||(t.mhp>=60&&d>=t.mhp*.3)});return d}
function ko(t,m){if(t.hp<=0)m.push(t.n+(EN[t.n.replace(/[ABC]$/,'')]?'被打倒了！':'倒下了！'))}
function act(m){const B=G.B,hebo=B.en.find(e=>e.e=='hebo');if(hebo&&hebo.hp<hebo.mhp*CFG.hebo.phaseHp&&!B.heboPhase2){B.heboPhase2=1;m.push('控妖符的紋路閃了一下……')}B.msgs=m;B.ph='msg';B.after=()=>{if(!alive(B.en).length)win();else nextActor()}}
function learnSkill(p,n){if(p&&!p.skills.includes(n))p.skills.push(n)}
function nextActor(){const B=G.B;let i=B.ai+1;while(i<G.party.length&&G.party[i].hp<=0)i++;if(i<G.party.length){B.ai=i;B.ph='cmd';B.sel=0}else enemyPhase()}
function enemyPhase(){const B=G.B,m=[];
 for(const e of alive(B.en)){const ps=alive(G.party);if(!ps.length)break;const i0=m.length;let K,TG;
  if(e.boss&&B.turn%(B.heboPhase2?CFG.hebo.phaseWaveInterval:CFG.hebo.waveInterval)==0){K='wave';TG=ps;m.push('河伯掀起「濁浪滔天」！');ps.forEach(p=>{m.push(p.n+'受到'+dmg(e.atk*.85,p)+'點傷害！');ko(p,m)})}
  else{const p=ps[rnd(ps.length)];K=e.boss?'tail':e.e=='lu'?'leaf':'splash';TG=[p];m.push(e.n+(e.boss?'甩動龍尾':'撲了過來')+'，'+p.n+'受到'+dmg(e.atk,p)+'點傷害！');ko(p,m);
   if(p.hp>0&&!p.st&&(e.poison&&Math.random()<e.poison||e.boss&&Math.random()<.3)){p.st='中毒';m.push(p.n+'中毒了！')}}wr(m,i0,K,e,TG)}
 alive(G.party).forEach(p=>{if(p.st=='中毒'){const d=Math.max(3,Math.round(p.mhp*.06));p.hp=Math.max(1,p.hp-d);hit(p,d);m.push(p.n+'因中毒損失'+d+'HP。');wr(m,m.length-1,'poison',p,[p])}});
 B.msgs=m.length?m:['……'];B.ph='msg';B.after=()=>{if(!alive(G.party).length){G.mode='over'}else{B.turn++;G.party.forEach(p=>p.guard=0);B.ai=-1;nextActor()}}}
function win(){const B=G.B,ex=B.en.reduce((s,e)=>s+e.exp,0),m=['勝利！獲得 '+ex+' 經驗值。'];
 if(Math.random()<.35&&!B.opt.onWin){G.inv.魚乾++;m.push('撿到了「魚乾」！')}
 G.party.forEach(p=>{if(p.hp<=0)p.hp=1;p.exp+=ex;while(p.exp>=p.lv*20){p.exp-=p.lv*20;p.lv++;p.mhp+=9;p.mmp+=3;p.atk+=2;p.def+=1;p.mag+=2;p.hp=p.mhp;p.mp=p.mmp;m.push(p.n+'升到了 Lv'+p.lv+'！HP/MP全滿！')}});
 B.won=1;B.msgs=m;B.ph='msg';B.after=()=>{G.B=null;G.mode='map';G.party.forEach(p=>{p.guard=0});if(B.opt.onWin)B.opt.onWin()}}
function exec(t){const B=G.B,u=G.party[B.ai],P=B.pend,m=[];
 if(P.t=='atk'){const cr=Math.random()<.12;if(cr)m.push('會心一擊！');m.push(u.n+(u.n=='陳青舟'?'揮動竹篙':'揮袖一擊')+'，對'+t.n+'造成'+dmg(u.atk,t,0,cr)+'點傷害！');ko(t,m);wr(m,0,u.e=='bl'?'claw':'slash',u,[t])}
 else if(P.t=='sk'){const s=SK[P.s];u.mp-=s.mp;
  if(P.s=='橫掃'){m.push(u.n+'使出「橫掃」！竹篙掃過一片水花！');alive(B.en).forEach(e=>{m.push(e.n+'受到'+dmg(u.atk*.85,e)+'點傷害！');ko(e,m)});wr(m,0,'sweep',u)}
  if(P.s=='渡水一擊'){m.push(u.n+'使出「渡水一擊」！水靈纏上竹篙，重擊'+t.n+'，造成'+dmg(u.atk*CFG.skills.渡水一擊.power,t)+'點傷害！');ko(t,m);wr(m,0,'sweep',u,[t])}
  if(P.s=='狐火'){m.push(u.n+'喚出「狐火」！藍色火焰燒向'+t.n+'，造成'+dmg(u.mag*2.2,t,1)+'點傷害！');ko(t,m);wr(m,0,'foxfire',u,[t])}
  if(P.s=='春霖'){m.push(u.n+'施展「春霖」，細雨灑落全隊。');alive(G.party).forEach(p=>{const h=Math.min(p.mhp-p.hp,22+u.mag);p.hp+=heal(p,h);m.push(p.n+'回復'+h+'HP。')});wr(m,0,'rain',u,alive(G.party))}}
 else if(P.t=='it'){G.inv[P.k]--;if(P.k=='魚乾'){const h=Math.min(t.mhp-t.hp,40);t.hp+=heal(t,h);m.push(u.n+'使用魚乾，'+t.n+'回復'+h+'HP。');wr(m,0,'item',u,[t])}
  else{t.st='';const h=Math.min(t.mhp-t.hp,15);t.hp+=heal(t,h);m.push(u.n+'使用清心草，'+t.n+'的異常狀態解除了，回復'+h+'HP。');wr(m,0,'item',u,[t])}}
 act(m)}
function goTarget(kind){const B=G.B;if(kind=='allE'||kind=='allA')return exec(null);B.tk=kind=='oneE'?'E':'A';B.ph='target';const L=B.tk=='E'?B.en:G.party;B.sel=L.findIndex(x=>x.hp>0)}
function bKey(k){const B=G.B,u=G.party[B.ai];
 if(B.ph=='msg'){if(k=='ok'){const o=B.msgs.shift();if(Array.isArray(o)&&o[1].at==null)startFx(o[1],performance.now());finishBattleMotion(performance.now());if(!B.msgs.length){const f=B.after;B.after=null;f&&f()}}return}
 const lists={cmd:['攻擊','技能','道具','防禦','逃跑'],skill:u.skills,item:Object.keys(G.inv).filter(i=>G.inv[i]>0&&ITEMS[i])},L=lists[B.ph];
 if(B.ph=='target'){const A=B.tk=='E'?B.en:G.party;if(k=='cancel'){B.ph='cmd';B.sel=0;return}
  if(k=='left'||k=='up'||k=='right'||k=='down'){const s=(k=='left'||k=='up')?-1:1;let i=B.sel;do{i=(i+s+A.length)%A.length}while(A[i].hp<=0&&B.tk=='E');B.sel=i}
  if(k=='ok')exec(A[B.sel]);return}
 if(k=='up')B.sel=(B.sel-1+L.length)%L.length;if(k=='down')B.sel=(B.sel+1)%L.length;
 if(k=='cancel'&&B.ph!='cmd'){B.ph='cmd';B.sel=0;return}
 if(k!='ok')return;
 if(B.ph=='cmd'){const c=B.sel;
  if(c==0){B.pend={t:'atk'};goTarget('oneE')}
  else if(c==1){B.ph='skill';B.sel=0}
  else if(c==2){if(!lists.item.length){B.msgs=['沒有可用的道具。'];B.ph='msg';B.after=()=>{B.ph='cmd'};return}B.ph='item';B.sel=0}
  else if(c==3){u.guard=1;const m=[u.n+'擺出防禦架勢。'];wr(m,0,'guard',u,[u]);act(m)}
  else{if(B.opt.noEsc){B.msgs=['逃不掉！'];B.ph='msg';B.after=()=>{B.ph='cmd'};return}
   if(Math.random()<.65){B.msgs=['成功逃跑了！'];B.ph='msg';B.after=()=>{G.B=null;G.mode='map';if(B.opt.onEscape)B.opt.onEscape()}}else{B.ai=G.party.length;act(['逃跑失敗！'])}}}
 else if(B.ph=='skill'){const n=L[B.sel],s=SK[n];if(u.mp<s.mp){B.msgs=['法力不足！'];B.ph='msg';B.after=()=>{B.ph='cmd'};return}B.pend={t:'sk',s:n};goTarget(s.tgt)}
 else if(B.ph=='item'){const n=L[B.sel];if(!n)return;B.pend={t:'it',k:n};goTarget(ITEMS[n].tgt)}}
