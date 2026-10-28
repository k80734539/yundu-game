'use strict';
// 戰鬥邏輯：startBattle、指令、傷害、敵人行動
// ---------- battle (ported) ----------
function newE(k,i,n){return{...EN[k],n:k+(n>1?'ABC'[i]:''),mhp:EN[k].hp,ph:Math.random()*6}}
const HEBO_STATE={NORMAL:'NORMAL',CHARGING:'CHARGING',RELEASE:'RELEASE',STAGGERED:'STAGGERED'};
function startBattle(ks,opt){VPT.length=0;G.B={en:ks.map((k,i)=>newE(k,i,ks.length)),opt,ai:-1,ph:'cmd',sel:0,turn:1,msgs:[],after:null,fx:[]};G.prevMode=G.mode;G.mode='battle';G.bT=performance.now();
 if(ks.includes('河伯')){G.B.hebo={state:HEBO_STATE.NORMAL,normals:0,interfered:false,lastAction:null,shift:0,moves:[]};G.B.qi=0;heboRefill(G.B);G.party.forEach(p=>{if(p.e==='bl'){learnSkill(p,'引潮');learnSkill(p,'迷霧')}if(p.e==='qz'){learnSkill(p,'渡水一擊');learnSkill(p,'踏灘');learnSkill(p,'壓浪')}})}
 const B=G.B;G.party.forEach(p=>p.guard=0);B.msgs=[(EN[ks[0]].boss?'頭目戰！':'妖怪出現了！')+' '+B.en.map(e=>e.n).join('、')].concat(opt.intro||[],ks.includes('河伯')?['白苓：「他額頭的符在牽著他……小心他蓄力，那是濁浪的前兆！」','青舟：「看準浪頭，我用竹篙擋。」','青舟：「退潮時我踏灘重擊，漲潮時壓住他的蓄力。」','白苓：「看左邊的水位條，潮水會影響我們誰比較強；下面的珠子滿了，就能合力出招。」']:[]);B.ph='msg';B.after=nextActor}
const alive=a=>a.filter(x=>x.hp>0);
function enemyTargets(B){return B.talisman?.hp>0?B.en.concat(B.talisman):B.en}
const TIDE_N=['退潮','平潮','漲潮'];
const TIDE_MSG=['潮水退去，河床露了出來。物理攻擊更強，河伯變弱。','潮水回到了平靜。','潮水漲起來了。狐火更強，但河伯更凶。'];
const TIDE_TIP=['退潮：物理攻擊更強，河伯變弱','平潮：沒有變化','漲潮：狐火更強，但河伯更凶'];
function tideAt(turn){const o=CFG.hebo.tide.order,sh=(G.B&&G.B.hebo&&G.B.hebo.shift)||0;return o[(Math.max(1,turn)-1+sh)%o.length]}
function addQi(n){const B=G.B;if(B&&B.hebo){const was=B.qi||0;B.qi=Math.min(CFG.hebo.qiMax,was+n);if(was<CFG.hebo.qiMax&&B.qi>=CFG.hebo.qiMax)B.qiFull=1}}
function qiFullLine(m){const B=G.B;if(B&&B.qiFull){B.qiFull=0;m.push('青舟：「渡氣滿了，白苓，一起上！」')}}
function bSkills(u,B){return u.skills.concat(B&&B.hebo&&(B.qi||0)>=CFG.hebo.qiMax&&u.e==='qz'?['雲渡一擊']:[])}
// 撐篙擋浪：濁浪釋放前停下來，玩家在光環縮到圈上的瞬間點一下
function parryGradeAt(now){const B=G.B,P=CFG.hebo.parry,d=Math.abs(now-B.parry.t0-P.dur);return d<=P.perfect?'perfect':d<=P.good?'good':'miss'}
// 擋浪成功的手感：畫面拉近一下、閃光、震動、粒子、大字
function parryJuice(grade){const B=G.B,c=B.parryC||[SW/2,SH/2],now=performance.now(),pf=grade==='perfect';
 B.pop={at:now,txt:pf?'完美！':'擋住！',x:c[0],y:c[1]-30,col:pf?'#ffe27a':'#cfe8ff'};B.zoom={at:now,d:pf?560:360,k:pf?.075:.035,cx:c[0],cy:c[1]};
 if(pf){shake(14,380);flash(240,'255,244,200',.6);burst(c[0],c[1],36,['#fff','#ffe27a','#9fe0ff'],9);playSfx('critical',1.4,1);playSfx('wood',1.6,1.2)}
 else{shake(6,220);flash(120,'200,230,255',.3);burst(c[0],c[1],18,['#fff','#9fe0ff'],6);playSfx('wood',1.3,1)}}
function parryResolve(grade){const B=G.B,P=CFG.hebo.parry;if(!B||!B.parry)return;G.flags.parrySeen=1;if(grade!=='miss')parryJuice(grade);B.parry=null;B.parryGrade=grade;if(grade==='perfect')addQi(P.qiPerfect);else if(grade==='good')addQi(P.qiGood);enemyPhase()}
function parryTap(now){const B=G.B;if(!B||!B.parry)return;parryResolve(parryGradeAt(now))}
function tideNow(B){return B&&B.hebo?tideAt(B.turn):1}
function heboPower(e,B){const T=CFG.hebo.tide,td=tideNow(B);return e.atk*(B.talisman?.hp>0?CFG.hebo.talismanAttackBoost:1)*(td===0?T.atkEbb:td===2?T.atkRise:1)}
// 預告河伯接下來 n 次行動（依目前狀態推演；每一回合的潮位也列出）
const HEBO_MOVE_N={tail:'龍尾',drink:'吞水',whirl:'漩渦',spear:'水柱',roar:'龍吼',charge:'蓄力',wave:'濁浪',stagger:'失衡'};
function atkOf(u){return u.atk*(u.weak?CFG.hebo.roar.weak:1)}
function magOf(u){return u.mag*(u.weak?CFG.hebo.roar.weak:1)}
function skillUsable(u,n,B){if(n==='踏灘')return !B.hebo||tideNow(B)===0;if(n==='壓浪')return !!B.hebo&&tideNow(B)===2&&B.hebo.state===HEBO_STATE.CHARGING;return true}
const SKILL_WHY={踏灘:'現在不是退潮，踏灘使不出來。',壓浪:'要在漲潮、而且河伯正在蓄力的時候，才壓得住浪頭。'};
function rollMove(B){if(B.opt.noMoves)return 'tail';const M=CFG.hebo.moves,r=Math.random(),h=B.en.find(e=>e.e==='hebo');let a=M.whirl;
 if(r<a)return 'whirl';a+=M.drink;if(r<a&&h&&h.hp<h.mhp*.9)return 'drink';a+=M.spear;if(r<a)return 'spear';a+=M.roar;if(r<a)return 'roar';return 'tail'}
// 水柱突刺會先標記一個人（腳下出現水紋）：下一個普通招式若是水柱，就預先決定目標並顯示
function heboMarkSync(B){const H=B.hebo;if(!H)return;const ps=alive(G.party);
 const nextIsSpear=H.state===HEBO_STATE.NORMAL&&H.normals<CFG.hebo.normalBeforeCharge[B.heboPhase2?1:0]&&H.moves&&H.moves[0]==='spear';
 if(!nextIsSpear||!ps.length){H.mark=null;return}
 if(!H.mark||H.mark.hp<=0||!ps.includes(H.mark))H.mark=ps[rnd(ps.length)]}
function heboRefill(B){const H=B.hebo;if(!H)return;H.moves=H.moves||[];while(H.moves.length<4)H.moves.push(rollMove(B))}
// 預告河伯接下來 n 次行動（依目前狀態與已排好的招式推演；每一回合的潮位也列出）
function heboForecast(B,n){const H=B.hebo;if(!H)return[];heboRefill(B);heboMarkSync(B);let s=H.state,k=H.normals,mi=0,ch=!!H.chained;const out=[];
 for(let i=0;i<n;i++){let a;
  if(s===HEBO_STATE.STAGGERED){a='stagger';s=HEBO_STATE.NORMAL;k=0}
  else if(s===HEBO_STATE.CHARGING){a='wave';if(B.heboPhase2&&!B.opt.noMoves&&!ch){ch=true;s=HEBO_STATE.CHARGING}else{ch=false;s=HEBO_STATE.NORMAL;k=0}}
  else if(k>=CFG.hebo.normalBeforeCharge[B.heboPhase2?1:0]){a='charge';s=HEBO_STATE.CHARGING}
  else{a=H.moves[mi++]||'tail';k++}
  out.push({k:a,a:HEBO_MOVE_N[a],tide:tideAt(B.turn+i)})}
 return out}
function hit(t,d,o){const B=G.B;if(B)(B.q=B.q||[]).push(Object.assign({t,d},o||{}))}
function heal(t,h){hit(t,h,{heal:1});return h}
function wr(m,i,k,src,tg){const B=G.B;m[i]=[m[i],{k,src,tg:tg||[],hits:(B.q||[]).splice(0)}]}
function dmg(pw,t,ign,cr){if(t.e==='hebo'&&G.B?.hebo){const T=CFG.hebo.tide,td=tideNow(G.B);if(td===0&&!ign)pw*=T.physEbb;if(td===2&&ign)pw*=T.magicRise}
 let d=Math.max(1,Math.round(pw-(ign?0:t.def+(t.arm||0))+Math.random()*4-1));if(cr)d=Math.round(d*1.6);if(t.guard)d=Math.ceil(d/2);t.hp=Math.max(0,t.hp-d);hit(t,d,{crit:cr,big:cr||(t.mhp>=60&&d>=t.mhp*.3)});return d}
function ko(t,m){if(t.hp>0)return;
 if(t===G.B?.talisman){if(!t.broken){t.broken=1;addQi(CFG.hebo.qiBreak);G.B.talismanBrokenAt=performance.now();G.B.hebo.state=HEBO_STATE.STAGGERED;G.B.hebo.normals=0;G.B.hebo.interfered=false;m.push('控妖符碎裂！河伯的蓄力被打斷，身形失衡！');m.push('白苓：「符裂了！他動不了了，快打！」')}return}
 m.push(t.n+(EN[t.n.replace(/[ABC]$/,'')]?'被打倒了！':'倒下了！'))}
function heboPhase(m){const B=G.B,hebo=B.en.find(e=>e.e=='hebo');if(!hebo||hebo.hp<=0||hebo.hp>hebo.mhp*CFG.hebo.phaseHp||B.heboPhase2)return;
 B.heboPhase2=1;B.talisman={n:'控妖符',e:'talisman',hp:CFG.hebo.talismanHp,mhp:CFG.hebo.talismanHp,def:CFG.hebo.talismanDef,arm:0};
 if(B.hebo.state===HEBO_STATE.NORMAL)B.hebo.normals=0;
 m.push('控妖符的紋路閃了一下……');m.push('額頭的符亮起紫光，河伯失控了！擊破控妖符可解除妖力強化。')}
function act(m){const B=G.B;heboPhase(m);qiFullLine(m);B.msgs=m;B.ph='msg';B.after=()=>{if(!alive(B.en).length)win();else nextActor()}}
function learnSkill(p,n){if(p&&!p.skills.includes(n))p.skills.push(n)}
function nextActor(){const B=G.B;let i=B.ai+1;while(i<G.party.length&&G.party[i].hp<=0)i++;if(i<G.party.length){B.ai=i;B.ph='cmd';B.sel=0}else enemyPhase()}
function heboTurn(e,B,m,ps){const H=B.hebo,mist=k=>{if(!B.mist)return 1;B.mist=0;return CFG.hebo.mist[k]};
 if(H.state===HEBO_STATE.STAGGERED){H.lastAction=HEBO_STATE.STAGGERED;m.push('河伯失衡，這一次無法行動！');return}
 if(H.state===HEBO_STATE.CHARGING){H.state=HEBO_STATE.RELEASE;H.lastAction=HEBO_STATE.RELEASE;const i0=m.length,second=!!H.chained;
  m.push(second?'後浪撲面而來！':H.interfered?'狐火擾亂水流，河伯的「濁浪滔天」威力減弱！':'河伯掀起「濁浪滔天」！');
  const mm=mist('wave'),power=heboPower(e,B)*CFG.hebo.wavePower*(H.interfered?1-CFG.hebo.foxfireWaveReduction:1)*(second?CFG.hebo.chain.power:1)*mm;
  if(mm<1)m.push('迷霧擾亂了河伯的視線，浪頭偏了幾分。');
  const gr=B.parryGrade,PC=CFG.hebo.parry,pm=gr==='perfect'?PC.perfectMul:gr==='good'?PC.goodMul:1;
  if(gr==='perfect')m.push('青舟：「接住了！」');else if(gr==='good')m.push('青舟：「擋住一半……」');else if(!B.opt.noParry&&G.party.some(p=>p.e==='qz'&&p.hp>0))m.push('白苓：「小心！快補血！」');
  ps.forEach(p=>{m.push(p.n+'受到'+dmg(power*pm,p)+'點傷害！');ko(p,m)});wr(m,i0,'wave',e,ps);H.interfered=false;B.parryGrade=null;
  if(gr==='perfect'){const q=G.party.find(p=>p.e==='qz'&&p.hp>0)||ps[0];m.push('浪頭被青舟推了回去，河伯受到'+dmg(atkOf(q)*PC.reflect,e)+'點傷害！');ko(e,m);wr(m,m.length-1,'slash',q,[e])}
  if(B.heboPhase2&&!B.opt.noMoves&&!second){H.chained=1;H.state=HEBO_STATE.CHARGING;m.push('濁浪未退，後浪又在聚集！')}else H.chained=0;
  return}
 if(H.normals>=CFG.hebo.normalBeforeCharge[B.heboPhase2?1:0]){H.state=HEBO_STATE.CHARGING;H.lastAction=HEBO_STATE.CHARGING;H.interfered=false;m.push('河伯捲起河水蓄力！下一次行動將施放「濁浪滔天」！');if(!G.flags.heboChargeSeen){G.flags.heboChargeSeen=1;m.push('白苓：「他在聚水了！下一擊是濁浪，全隊都會被打到！」');m.push('青舟：「交給我，看準光環！」')}return}
 H.lastAction=HEBO_STATE.NORMAL;H.normals++;heboRefill(B);const mv=H.moves.shift()||'tail';heboRefill(B);
 if(mv==='drink'){const i0=m.length,h=Math.min(e.mhp-e.hp,Math.round(e.mhp*CFG.hebo.drinkHeal));e.hp+=h;hit(e,h,{heal:1});m.push('河伯吞下河水，回復了'+h+'點體力！');wr(m,i0,'drink',e,[e]);return}
 if(mv==='whirl'){const i0=m.length,p=ps[rnd(ps.length)],mm=mist('normal');m.push('河伯捲起漩渦，'+p.n+'受到'+dmg(heboPower(e,B)*CFG.hebo.whirlPower*mm,p)+'點傷害！');ko(p,m);if(p.hp>0){p.sealed=1;m.push(p.n+'被漩渦困住，下一回合無法使用法術！')}wr(m,i0,'whirl',e,[p]);return}
 if(mv==='spear'){const i0=m.length,p=(H.mark&&H.mark.hp>0&&ps.includes(H.mark))?H.mark:ps[rnd(ps.length)],mm=mist('normal');H.mark=null;
  if(p.guard){m.push('水柱從'+p.n+'腳下衝出，被防禦擋了下來！')}
  else{m.push('水柱從'+p.n+'腳下衝出，造成'+dmg(heboPower(e,B)*CFG.hebo.spear.power*mm,p)+'點傷害！');ko(p,m)}
  wr(m,i0,'spear',e,[p]);return}
 if(mv==='roar'){const i0=m.length,mm=mist('normal');m.push('河伯仰天長吼，震得全隊手腳發軟，攻擊力下降！');ps.forEach(p=>{m.push(p.n+'受到'+dmg(heboPower(e,B)*CFG.hebo.roar.power*mm,p)+'點傷害！');ko(p,m);if(p.hp>0)p.weak=CFG.hebo.roar.turns});wr(m,i0,'roar',e,ps);return}
 const p=ps[rnd(ps.length)],i0=m.length,mm=mist('normal');
 m.push(e.n+'甩動龍尾，'+p.n+'受到'+dmg(heboPower(e,B)*mm,p)+'點傷害！');ko(p,m);
 if(p.hp>0&&!p.st&&Math.random()<.3){p.st='中毒';m.push(p.n+'中毒了！')}wr(m,i0,'tail',e,[p])}
function enemyPhase(){const B=G.B,m=[];if(!B.parry&&B.parryGrade==null)G.party.forEach(p=>{p.sealed=0;if(p.weak>0)p.weak--});
 if(B.hebo&&B.hebo.state===HEBO_STATE.CHARGING&&B.parryGrade==null&&!B.opt.noParry&&alive(G.party).some(p=>p.e==='qz')&&alive(B.en).some(e=>e.e==='hebo')){B.ph='parry';B.parry={t0:performance.now()};B.msgs=[];return}
 heboPhase(m);qiFullLine(m);
 for(const e of alive(B.en)){const ps=alive(G.party);if(!ps.length)break;
  if(e.e==='hebo'){heboTurn(e,B,m,ps);continue}
  const p=ps[rnd(ps.length)],i0=m.length,K=e.e==='lu'||e.e==='laolu'?'leaf':'splash';
  m.push(e.n+'撲了過來，'+p.n+'受到'+dmg(e.atk,p)+'點傷害！');ko(p,m);
  if(p.hp>0&&!p.st&&e.poison&&Math.random()<e.poison){p.st='中毒';m.push(p.n+'中毒了！')}wr(m,i0,K,e,[p])}
 alive(G.party).forEach(p=>{if(p.st=='中毒'){const d=Math.max(3,Math.round(p.mhp*.06));p.hp=Math.max(1,p.hp-d);hit(p,d);m.push(p.n+'因中毒損失'+d+'HP。');wr(m,m.length-1,'poison',p,[p])}});
 if(B.hebo&&alive(B.en).length)m.push(TIDE_MSG[tideAt(B.turn+1)]);
 B.msgs=m.length?m:['……'];B.ph='msg';B.after=()=>{if(B.hebo?.state===HEBO_STATE.RELEASE||B.hebo?.state===HEBO_STATE.STAGGERED){B.hebo.state=HEBO_STATE.NORMAL;B.hebo.normals=0}B.parryGrade=null;if(!alive(B.en).length){win();return}if(!alive(G.party).length){G.mode='over'}else{B.turn++;G.party.forEach(p=>p.guard=0);B.ai=-1;nextActor()}}}
function win(){const B=G.B,ex=B.en.reduce((s,e)=>s+e.exp,0),m=['勝利！獲得 '+ex+' 經驗值。'];
 if(Math.random()<.35&&!B.opt.onWin){G.inv.魚乾++;m.push('撿到了「魚乾」！')}
 G.party.forEach(p=>{if(p.hp<=0)p.hp=1;p.exp+=ex;while(p.exp>=p.lv*20){p.exp-=p.lv*20;p.lv++;p.mhp+=9;p.mmp+=3;p.atk+=2;p.def+=1;p.mag+=2;p.hp=p.mhp;p.mp=p.mmp;m.push(p.n+'升到了 Lv'+p.lv+'！HP/MP全滿！')}});
 B.won=1;B.msgs=m;B.ph='msg';B.after=()=>{G.B=null;G.mode='map';G.party.forEach(p=>{p.guard=0});if(B.opt.onWin)B.opt.onWin()}}
function exec(t){const B=G.B,u=G.party[B.ai],P=B.pend,m=[];
 if(P.t=='atk'){const cr=Math.random()<.12;if(cr)m.push('會心一擊！');m.push(u.n+(u.n=='陳青舟'?'揮動竹篙':'揮袖一擊')+'，對'+t.n+'造成'+dmg(atkOf(u),t,0,cr)+'點傷害！');ko(t,m);wr(m,0,u.e=='bl'?'claw':'slash',u,[t])}
 else if(P.t=='sk'){const s=SK[P.s];u.mp-=s.mp;
  if(P.s=='橫掃'){m.push(u.n+'使出「橫掃」！竹篙掃過一片水花！');alive(enemyTargets(B)).forEach(e=>{m.push(e.n+'受到'+dmg(atkOf(u)*.85,e)+'點傷害！');ko(e,m)});wr(m,0,'sweep',u)}
  if(P.s=='渡水一擊'){m.push(u.n+'使出「渡水一擊」！水靈纏上竹篙，重擊'+t.n+'，造成'+dmg(atkOf(u)*CFG.skills.渡水一擊.power,t)+'點傷害！');ko(t,m);wr(m,0,'sweep',u,[t])}
  if(P.s=='狐火'){m.push(u.n+'喚出「狐火」！藍色火焰燒向'+t.n+'，造成'+dmg(magOf(u)*2.2,t,1)+'點傷害！');ko(t,m);wr(m,0,'foxfire',u,[t]);
   if(u.e==='bl'&&t.e==='hebo'&&t.hp>0&&B.hebo?.state===HEBO_STATE.CHARGING&&!B.hebo.interfered){B.hebo.interfered=true;addQi(CFG.hebo.qiFox);m.push('狐火擾亂河伯周身的水流，下一次濁浪威力減弱！')}}
  if(P.s=='踏灘'){m.push(u.n+'踏上退去的灘塗，竹篙帶著全身的力道重擊'+t.n+'，造成'+dmg(atkOf(u)*CFG.hebo.stepPower+t.def,t)+'點傷害！');ko(t,m);wr(m,0,'step',u,[t])}
  if(P.s=='壓浪'){const hb=B.en.find(e=>e.e==='hebo');m.push(u.n+'以竹篙壓住湧起的浪頭，濁浪沒能掀起來！');B.hebo.state=HEBO_STATE.STAGGERED;B.hebo.normals=0;B.hebo.interfered=false;addQi(CFG.hebo.qiBreak);wr(m,0,'press',u,[hb||u])}
  if(P.s=='迷霧'){B.mist=1;m.push(u.n+'放出一團迷霧，河伯的視線變得模糊，下一次攻擊威力減弱！');wr(m,0,'mist',u,[B.en.find(e=>e.e==='hebo')||u])}
  if(P.s=='引潮'){if(!B.hebo){m.push('這裡沒有潮水可引。')}else{if(!G.flags.heboPullSeen){G.flags.heboPullSeen=1;m.push('白苓：「我來引一引潮水。」')}B.hebo.shift++;addQi(CFG.hebo.qiPull);m.push(u.n+'引動潮水！潮位轉為「'+TIDE_N[tideNow(B)]+'」。');wr(m,0,'guard',u,[u])}}
  if(P.s=='雲渡一擊'){m.push('青舟與白苓合力使出「雲渡一擊」！');B.qi=0;const o=CFG.hebo.tide.order,cur=(B.turn-1+B.hebo.shift)%o.length,want=o.indexOf(0);B.hebo.shift+=(want-cur+o.length)%o.length;
   alive(B.en).forEach(e=>{const d=Math.round(e.mhp*CFG.hebo.combo.hpFrac);e.hp=Math.max(0,e.hp-d);hit(e,d,{big:1,crit:1});m.push(e.n+'受到'+d+'點傷害！');ko(e,m);
    if(e.e==='hebo'&&e.hp>0){B.hebo.state=HEBO_STATE.STAGGERED;B.hebo.normals=0;B.hebo.interfered=false;m.push('河伯被打得失去平衡，下一次行動無法行動！潮水退去。')}});
   wr(m,0,'sweep',u,alive(B.en))}
  if(P.s=='春霖'){m.push(u.n+'施展「春霖」，細雨灑落全隊。');alive(G.party).forEach(p=>{const h=Math.min(p.mhp-p.hp,22+u.mag);p.hp+=heal(p,h);p.weak=0;m.push(p.n+'回復'+h+'HP。')});wr(m,0,'rain',u,alive(G.party))}}
 else if(P.t=='it'){G.inv[P.k]--;if(P.k=='魚乾'){const h=Math.min(t.mhp-t.hp,40);t.hp+=heal(t,h);m.push(u.n+'使用魚乾，'+t.n+'回復'+h+'HP。');wr(m,0,'item',u,[t])}
  else{t.st='';t.weak=0;const h=Math.min(t.mhp-t.hp,15);t.hp+=heal(t,h);m.push(u.n+'使用清心草，'+t.n+'的異常狀態解除了，回復'+h+'HP。');wr(m,0,'item',u,[t])}}
 act(m)}
function goTarget(kind){const B=G.B;if(kind=='allE'||kind=='allA'||kind=='self')return exec(null);B.tk=kind=='oneE'?'E':'A';B.ph='target';const L=B.tk=='E'?enemyTargets(B):G.party;B.sel=L.findIndex(x=>x.hp>0)}
function bKey(k){const B=G.B,u=G.party[B.ai];
 if(B.ph=='parry'){if(k=='ok')parryTap(performance.now());return}
 if(B.ph=='msg'){if(k=='ok'){const o=B.msgs.shift();if(Array.isArray(o)&&o[1].at==null)startFx(o[1],performance.now());finishBattleMotion(performance.now());if(!B.msgs.length){const f=B.after;B.after=null;f&&f()}}return}
 const lists={cmd:['攻擊','技能','道具','防禦','逃跑'],skill:bSkills(u,B),item:Object.keys(G.inv).filter(i=>G.inv[i]>0&&ITEMS[i])},L=lists[B.ph];
 if(B.ph=='target'){const A=B.tk=='E'?enemyTargets(B):G.party;if(k=='cancel'){B.ph='cmd';B.sel=0;return}
  if(k=='left'||k=='up'||k=='right'||k=='down'){const s=(k=='left'||k=='up')?-1:1;let i=B.sel;do{i=(i+s+A.length)%A.length}while(A[i].hp<=0&&B.tk=='E');B.sel=i}
  if(k=='ok')exec(A[B.sel]);return}
 if(k=='up')B.sel=(B.sel-1+L.length)%L.length;if(k=='down')B.sel=(B.sel+1)%L.length;
 if(k=='cancel'&&B.ph!='cmd'){B.ph='cmd';B.sel=0;return}
 if(k!='ok')return;
 if(B.ph=='cmd'){const c=B.sel;
  if(c==0){B.pend={t:'atk'};goTarget('oneE')}
  else if(c==1){if(u.sealed){B.msgs=[u.n+'被漩渦困住，這回合無法使用法術！'];B.ph='msg';B.after=()=>{B.ph='cmd'};return}B.ph='skill';B.sel=0}
  else if(c==2){if(!lists.item.length){B.msgs=['沒有可用的道具。'];B.ph='msg';B.after=()=>{B.ph='cmd'};return}B.ph='item';B.sel=0}
  else if(c==3){u.guard=1;const gain=Math.min(CFG.guardMp,u.mmp-u.mp);u.mp+=gain;if(B.hebo)addQi(CFG.hebo.qiGuard);const m=[u.n+'擺出防禦架勢，回復'+gain+' MP。'];wr(m,0,'guard',u,[u]);act(m)}
  else{if(B.opt.noEsc){B.msgs=['逃不掉！'];B.ph='msg';B.after=()=>{B.ph='cmd'};return}
   if(Math.random()<.65){B.msgs=['成功逃跑了！'];B.ph='msg';B.after=()=>{G.B=null;G.mode='map';if(B.opt.onEscape)B.opt.onEscape()}}else{B.ai=G.party.length;act(['逃跑失敗！'])}}}
 else if(B.ph=='skill'){const n=L[B.sel],s=SK[n];if(!skillUsable(u,n,B)){B.msgs=[SKILL_WHY[n]||'現在用不了。'];B.ph='msg';B.after=()=>{B.ph='cmd'};return}if(u.mp<s.mp){B.msgs=['法力不足！'];B.ph='msg';B.after=()=>{B.ph='cmd'};return}B.pend={t:'sk',s:n};goTarget(s.tgt)}
 else if(B.ph=='item'){const n=L[B.sel];if(!n)return;B.pend={t:'it',k:n};goTarget(ITEMS[n].tgt)}}
