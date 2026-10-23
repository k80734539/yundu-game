'use strict';
// 地圖模式更新：自由移動、跟隨、NPC 互動
// ---------- update ----------
let lastT=performance.now();
function update(dt){if(G.mode!='map'||G.dlg)return;
 let dx=(keys.right?1:0)-(keys.left?1:0),dy=(keys.down?1:0)-(keys.up?1:0);if(dx&&dy){dx*=.707;dy*=.707}
 if(JOY.on){dx=JOY.x;dy=JOY.y}
 const mag=Math.min(1,Math.hypot(dx,dy));if(mag<.05){G.f=0;G.moving=0;return}
 const sp=2.5*dt*Math.min(1,mag*1.25),ox=G.x,oy=G.y;
 const nx=dx/(Math.hypot(dx,dy)||1),ny=dy/(Math.hypot(dx,dy)||1);
 if(!blocked(G.x+nx*sp,G.y))G.x+=nx*sp;if(!blocked(G.x,G.y+ny*sp))G.y+=ny*sp;
 G.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
 const moved=Math.hypot(G.x-ox,G.y-oy);G.moving=moved>.05;if(!G.moving){G.f=0;return}
 G.f+=.11*dt*Math.min(1,mag*1.3);
 G.hist.push([G.x,G.y,G.dir]);while(G.hist.length>14){const h=G.hist.shift();G.bl.x=h[0];G.bl.y=h[1];G.bl.dir=h[2];G.bl.f=G.f-1}
 for(const z of M.zones){const i=inZ(z);if(i&&!z.in){z.in=1;z.enter();if(G.dlg||G.mode!='map')return}z.in=i}
 if(M.id=='reeds'&&cell(G.x,G.y-4)==','){G.acc+=moved;if(G.acc>=40){G.acc-=40;G.steps++;if(G.steps>4&&Math.random()<.14){G.steps=0;const n=1+rnd(3),ks=['小水妖','蘆葦精'];startBattle(Array.from({length:n},()=>ks[rnd(2)]),{bg:'bg_reeds'})}}}}
