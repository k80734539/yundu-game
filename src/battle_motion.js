'use strict';
// v22 戰鬥動作：斜角站位三人 pose。影格 480×420 透明 PNG：腳底 y=355、水平中心 x=240、面向左上（背對鏡頭），
// 三人共用同一縮放 BFR.scale。滑步只改畫面座標，不碰戰鬥邏輯（傷害／命中時間仍由 startFx 排程）。
const BFR={w:480,h:420,fx:240,fy:355,scale:.39};
const BPRE={qz:'qzd',bl:'bld',yx:'yxd'};          // 角色 → 影格檔名前綴
const BSLOT={yx:0,qz:1,bl:2};                      // 斜角站位：左上→右下 雲纖、青舟、白苓
const HIT_MS=450;                                  // 受擊 pose 持續時間
const motionEase=p=>{p=Math.max(0,Math.min(1,p));return p*p*(3-2*p)};
// 動作表：delay＝命中延遲（命中時間＝sp.at+delay+VIMP[k]）；seq＝[結束 ms, 影格]；sl＝滑步關鍵影格 [ms, 0~1 佔滑行距離]；pull＝點擊跳過時直接拉到命中
// 青舟普攻 delay 230 ＋ VIMP.slash 110 ＝ 340ms 命中（沿用 v20 的命中／閃光／震動時機）
const BPLAN={
 qz:{slash:{delay:230,dur:650,pull:1,seq:[[200,'charge'],[440,'thrust'],[650,'recover']],sl:[[0,0],[110,0],[340,1],[430,1],[620,0]]},
     sweep:{delay:120,dur:700,pull:1,seq:[[250,'sweepwind'],[560,'sweep'],[700,'recover']],sl:[[0,0],[100,0],[320,.5],[560,.5],[700,0]]}},
 bl:{claw:{delay:200,dur:700,seq:[[200,'cast0'],[460,'cast1'],[700,'recover']]},
     foxfire:{delay:200,dur:950,seq:[[200,'cast0'],[700,'cast1'],[950,'recover']]},
     rain:{delay:0,dur:950,seq:[[950,'spring']]}},
 yx:{slash:{delay:230,dur:650,pull:1,seq:[[180,'charge'],[340,'slash0'],[470,'slash1'],[650,'recover']],sl:[[0,0],[100,0],[340,1],[430,1],[620,0]]},
     skill:{delay:120,dur:700,seq:[[700,'skill']]}}
};
function bPlan(e,k){const P=BPLAN[e];if(!P)return null;if(P[k])return P[k];if(e==='yx'&&(k==='sweep'||k==='foxfire'||k==='rain'))return P.skill;return null}
function bLerp(a,t){if(t<=a[0][0])return a[0][1];for(let i=1;i<a.length;i++)if(t<=a[i][0]){const p=a[i-1],q=a[i];return p[1]+(q[1]-p[1])*motionEase((t-p[0])/(q[0]-p[0]||1))}return a[a.length-1][1]}
// 點擊跳過訊息：還沒命中的衝刺類動作直接跳到命中瞬間（和 v20 行為相同），動作結束
function finishBattleMotion(now){const B=G.B;if(!B||!B.an)return;
 B.an=B.an.filter(a=>{if(!a.plan.pull)return true;const impact=(a.sp.delay||0)+(VIMP[a.sp.k]||150);
  if(now-a.sp.at<impact){a.sp.at=now-impact;for(const f of B.fx)if(f.sp===a.sp&&f.at>now){f.at=now;if(f.t.hp<=0&&B.en.includes(f.t))f.t.dieAt=now}}return false})}
// 目前這位角色該畫哪一格：勝利 > 倒下 > 受擊 > 攻擊／施法動作 > 防禦 > 待機（兩幀每 600ms 交替）
function bPose(p,i,now,F,s,L){const B=G.B,pre=BPRE[p.e]||'qzd';let name,dx=0,dy=0;
 const pend=B.msgs.some(m=>Array.isArray(m)&&m[1].at==null&&m[1].hits.some(h=>h.t===p)),hf=B.fx.find(f=>f.t===p&&!f.heal&&now>=f.at&&now-f.at<HIT_MS);
 B.an=(B.an||[]).filter(a=>now-a.at<a.plan.dur);const a=B.an.find(a=>a.p===p);
 if(B.won)name='win';
 else if(p.hp<=0&&!pend&&!hf)name='down';
 else if(hf)name='hit';
 else if(a){const t=now-a.at;name=(a.plan.seq.find(q=>t<q[0])||a.plan.seq[a.plan.seq.length-1])[1];
  if(a.plan.sl){const T=(a.sp.tg.length?a.sp.tg:B.en).map(o=>B.po(o)).filter(Boolean);
   if(T.length){const tx=T.reduce((m,q)=>m+q[0],0)/T.length,ty=T.reduce((m,q)=>m+q[1],0)/T.length,ax=F[0],ay=F[1]-135*s,vx=tx-ax,vy=ty-ay,d=Math.hypot(vx,vy)||1,ux=vx/d,uy=vy/d,rc=34*(B.u||1),
     all=B.en.filter(o=>o.hp>0||!o.dieAt||now<o.dieAt+650).map(o=>B.po(o)).filter(Boolean);
    // 只衝到敵人「旁邊」：沿衝刺方向找最遠的點，使身體與每隻敵人（半徑近似）都不重疊
    let go=Math.max(0,Math.min(d*.8,300*(B.u||1)));
    for(;go>0;go-=4)if(all.every(q=>Math.hypot(ax+ux*go-q[0],ay+uy*go-q[1])>=Math.max(q[2],q[3])*.5+rc))break;
    const k=bLerp(a.plan.sl,t);dx=ux*go*k;dy=uy*go*k}}}
 else if(p.guard&&p.hp>0)name='guard';
 else name='idle'+((Math.floor(now/600)+i)%2);
 return {name,dx,dy,pre,hit:!!hf}}
