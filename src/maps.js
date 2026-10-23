'use strict';
// 地圖/場景：手繪斜視地圖、碰撞遮罩、物件、傳送
// ---------- maps ----------
const T=32,T2=48;
const GRID={
reeds:["rrrrrrrrrrrrrrrrrrrr","r..,,,,r....,,,,,,Cr","r.rrrr,r.rr.rrrrrr,r","r.rS.,,,,,r.....r,,r","r.r.rrrr,rrrr.r.r,rr","r...,,Tr,,,,,.r.,,,r","rrrrrr.r,rrrrrr.rr,r","rC,,,,.,,,,,,,,,,r,r","rrrrr,rrrrrrrr,rr,rr","r....,,,,,r.F.,,,,,r","r.rrrrrrr,r.rrrrrr.r","r.,,,C.r,,,,,,,,,,.r","rrrrrrrr,rrrrrrrrrEr","~~~~~~~~~~~~~~~~~~~~","~~~~~~~~~~~~~~~~~~~~"],
temple:["####################","#~~~~~~~~~~~~~~~~~~#","#~~~~~~~~~~~~~~~~~~#","#~~~~~~~~...~~~~~~~#","#...l....i..i....l.#","#..................#","#....i..........i..#","#........AAA.......#","#........AAA.......#","#....i..........i..#","#..................#","#..................#","#........i..i......#","############.......#","############..######"]};
let M=null;
const waterY=x=>17.6*T+Math.sin(x/70)*10+Math.sin(x/23)*4;
function cvs(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return[c,c.getContext('2d')]}
function cell(x,y){const R=M.rows;if(!R)return'';const r=R[Math.floor(y/M.T)];return r?(r[Math.floor(x/M.T)]||'#'):'#'}
function addObj(o){o.s=o.s||1;M.obj.push(o);if(o.sol)M.sol.push(o.sol);return o}
function decals(c,R,n,ok,scale){for(let i=0;i<n;i++){const x=R()*M.W,y=R()*M.H;if(!ok(x,y))continue;const im=I['d'+Math.floor(R()*10)],s=(scale||1)*(.7+R()*.5);c.globalAlpha=.85;c.drawImage(im,x-im.width*s/2,y-im.height*s/2,im.width*s,im.height*s)}c.globalAlpha=1}
function blobs(c,R,n,cols){for(let i=0;i<n;i++){const x=R()*M.W,y=R()*M.H,r=60+R()*140,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,cols[i%cols.length]);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r)}}
function buildVillage(){const W=30*T,H=22*T;M={id:'village',W,H,T,obj:[],sol:[],zones:[],inter:[],npcs:[],lights:[]};
 const o=(k,tx,ty,fw,fh,x={})=>addObj({k,x:tx*T,y:ty*T,sol:fw?[tx*T-fw*T/2,ty*T-fh*T,fw*T,fh*T]:null,...x});
 o('cottage',5,6.2,5.6,2.2);o('hall',15,6.2,8,2.2);o('hut',25,6.2,6,2.2);
 for(let i=0;i<10;i++)o('fence',1.7+i*3.3,1.2,3.3,.5);
 o('willow',3,15.6,1.2,.6);o('willow',27.2,15.4,1.2,.6);o('camphor',9.5,11.4,1,.5);o('camphor',21.5,11.6,1,.5);o('camphor',28,9.6,1,.5);o('camphor',1.6,9.8,1,.5);
 o('well',8,15,2.4,1);o('stall',21.5,15,3.6,1.1);
 for(const[x,y]of[[12.2,8.6],[17.8,8.6],[12.4,14],[17.6,14],[3.6,8.6],[22.6,8.6]]){o('lantern',x,y,.5,.3);M.lights.push([x*T+9,y*T-50,60,'rgba(255,170,90,.35)'])}
 o('dock',15,19.6,0,0,{flat:1});o('boat',17.4,20.3,3,1.2,{s:1.3,boat:1});
 const[g,c]=cvs(W,H);c.fillStyle=c.createPattern(I.t_grass,'repeat');c.fillRect(0,0,W,H);
 const R=rng(7);blobs(c,R,40,['rgba(40,70,20,.22)','rgba(190,200,90,.16)','rgba(20,50,30,.2)']);
 const[m,mc]=cvs(W,H);mc.strokeStyle='#fff';mc.lineCap=mc.lineJoin='round';mc.filter='blur(5px)';
 const line=(w,...p)=>{mc.lineWidth=w;mc.beginPath();mc.moveTo(p[0]*T,p[1]*T);for(let i=2;i<p.length;i+=2)mc.lineTo(p[i]*T,p[i+1]*T);mc.stroke()};
 line(48,1,9.6,8,9.4,15,9.8,22,9.4,29,9.6);line(46,15,6.4,15,9.8,15.2,14,14.9,18);line(36,5,6.4,5.2,9.4);line(36,25,6.4,24.8,9.4);line(30,15,14,10,14.6,8.6,15.6);line(30,15.1,14.2,20,14.8,21.5,15.4);
 const md=mc.getImageData(0,0,W,H).data;
 const[d,dc]=cvs(W,H);dc.drawImage(m,0,0);dc.globalCompositeOperation='source-in';dc.fillStyle=dc.createPattern(I.t_dirt,'repeat');dc.fillRect(0,0,W,H);c.drawImage(d,0,0);
 decals(c,R,420,(x,y)=>md[(Math.floor(y)*W+Math.floor(x))*4+3]<20&&y<waterY(x)-24&&y>1.4*T);
 c.fillStyle='rgba(120,95,60,.55)';c.filter='blur(4px)';c.beginPath();c.moveTo(0,H);for(let x=0;x<=W;x+=8)c.lineTo(x,waterY(x)-10);c.lineTo(W,H);c.fill();c.filter='none';
 M.ground=g;M.water=x=>waterY(x);
 M.blocked=(x,y)=>{if(x<12||x>W-12||y<1.6*T||y>H-4)return 1;const onDock=x>13.2*T&&x<16.8*T&&y<20.6*T;return y>waterY(x)-4&&!onDock};
 const f=G.flags;
 const ph=phase(),P=(a,b,c)=>[a,b,c][ph-1];
 if(!f.cure){
  npc('wang',12*T,16.6*T,'王大叔',()=>{if(ph==1&&!f.ferry){f.ferry=1;say(S.wang1.concat(S.wang1Hint))}else say(P(S.wang1r,S.wang2,S.wang3))});
  npc('chief',13.6*T,8.3*T,'村長',()=>{if(ph==1&&!f.chief){f.chief=1;say(S.chief1)}else say(P(S.chief1r,S.chief2,S.chief3))},()=>!f.chief);
  npc('granny',24.6*T,9.4*T,'阿婆',()=>{if(ph==3)return cure();if(!f.quest){f.quest=1;G.party[0].arm=3;G.inv.魚乾+=3;say(S.granny1.concat(S.granny1Get))}else say(S.granny2)},()=>!f.quest||(ph==3&&!f.cure));
  npc('granny',6.6*T,16.2*T,'林嬸',()=>say(P(S.lin1,S.lin2,S.lin3)));
  npc('wang',19.6*T,16.9*T,'老周',()=>say(P(S.zhou1,S.zhou2,S.zhou3)));
  M.inter.push({x:5*T,y:6.6*T,r:36,act:()=>say(P(S.home1,S.home2,S.home3))});
  M.inter.push({x:27*T,y:6.7*T,r:30,act:()=>say(ph==2?S.stone2:ph==1?S.stone1:[['','小石頭睡得正香，阿婆守在床邊。']])});
  if(!f.dawn){M.inter.push({x:17.6*T,y:19.9*T,r:44,act:boardBoat});
  M.zones.push({x0:13.4*T,y0:19.7*T,x1:16.8*T,y1:20.7*T,enter:boardBoat})}
 }else npc('yx',15*T,16.4*T,'雲纖',null);
}
function npc(k,x,y,n,talk,mark){const o={k,x,y,dir:'down',n,talk,mark,npc:1};M.npcs.push(o);M.sol.push([x-11,y-9,22,10]);if(talk)M.inter.push({x,y:y-14,r:30,act:()=>{faceTo(o);talk()}});return o}
function faceTo(o){if(!I[o.k+'_down0'])return;const dx=G.x-o.x,dy=G.y-o.y;o.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up')}
function buildGrid(id){const R=GRID[id],W=20*T2,H=R.length*T2;M={id,W,H,T:T2,rows:R,obj:[],sol:[],zones:[],inter:[],npcs:[],lights:[],night:1};
 const r=rng(id=='reeds'?3:5),[g,c]=cvs(W,H);
 const fillTex=(k,x,y,w,h)=>{c.fillStyle=c.createPattern(I[k],'repeat');c.fillRect(x,y,w,h)};
 if(id=='reeds'){fillTex('t_mud',0,0,W,H);
  // tall-grass tint
  const[gm,gc]=cvs(W,H);gc.fillStyle='#fff';gc.filter='blur(6px)';R.forEach((row,y)=>[...row].forEach((t,x)=>{if(t==','||t=='r')gc.fillRect(x*T2-4,y*T2-4,T2+8,T2+8)}));
  const[gg,ggc]=cvs(W,H);ggc.drawImage(gm,0,0);ggc.globalCompositeOperation='source-in';ggc.fillStyle=ggc.createPattern(I.t_grass,'repeat');ggc.fillRect(0,0,W,H);c.globalAlpha=.75;c.drawImage(gg,0,0);c.globalAlpha=1;
  blobs(c,r,30,['rgba(20,30,10,.25)','rgba(120,110,60,.15)']);
  decals(c,r,500,(x,y)=>'.,TCE'.includes(cell(x,y)),.9);
  c.fillStyle='rgba(70,60,40,.6)';c.filter='blur(5px)';c.fillRect(0,13*T2-10,W,14);c.filter='none';
  R.forEach((row,y)=>[...row].forEach((t,x)=>{const cx=x*T2+T2/2,by=y*T2+T2;
   if(t=='r'){const n=1+(r()<.6);for(let i=0;i<n;i++)addObj({k:r()<.6?'reed1':'reed2',x:cx+(r()-.5)*26,y:by-4-r()*14,s:.85+r()*.3,mir:r()<.5,ghost:1,sway:r()*6});M.sol.push([x*T2+4,y*T2+6,T2-8,T2-8])}
   if(t==',')for(let i=0;i<2;i++)addObj({k:'reed2',x:cx+(r()-.5)*30,y:by-6-r()*28,s:.42+r()*.12,mir:r()<.5,sway:r()*6,ghost:0});
   if(t=='C'){const key='reeds:'+x+','+y;addObj({k:'chest',x:cx,y:by-10,chest:key});M.sol.push([cx-16,by-22,32,14]);M.inter.push({x:cx,y:by-20,r:34,act:()=>openChest(key)})}
   if(t=='T'){addObj({k:'tal',x:cx,y:by-12,s:.8,tal:1});M.zones.push({x0:x*T2,y0:y*T2,x1:x*T2+T2,y1:y*T2+T2,enter:talisman})}
   if(t=='S'){addObj({k:'stele',x:cx,y:by-6,s:.6,ghost:1});M.sol.push([cx-12,by-18,24,12]);M.inter.push({x:cx,y:by,r:34,act:loreStone})}
   if(t=='F'){addObj({k:'rock',x:cx,y:by-8,s:.4,fire:1});M.lights.push([cx,by-20,80,'rgba(255,140,60,.4)']);M.zones.push({x0:x*T2,y0:y*T2,x1:x*T2+T2,y1:y*T2+T2,enter:campfire})}
   if(t=='E'){addObj({k:'gate',x:cx,y:by-2,s:.72});M.zones.push({x0:x*T2,y0:y*T2+20,x1:x*T2+T2,y1:y*T2+T2,enter:exitReeds});M.lights.push([cx,by-90,70,'rgba(255,150,70,.25)'])}}));
  for(let i=0;i<14;i++)addObj({k:'lily',x:r()*W,y:13.4*T2+r()*1.5*T2,s:.5+r()*.4,flat:2});
  addObj({k:'wreck',x:3.2*T2,y:14.3*T2,s:1,flat:2});addObj({k:'rock',x:9.6*T2,y:13.8*T2,s:.8,flat:2});
  M.flies=Array.from({length:36},()=>({x:r()*W,y:r()*13*T2,p:r()*6,v:.3+r()*.5}));
 }else{fillTex('t_stone',0,0,W,H);c.fillStyle='rgba(10,8,20,.25)';c.fillRect(0,0,W,H);blobs(c,r,30,['rgba(0,0,0,.25)','rgba(80,120,80,.12)']);
  decals(c,r,90,(x,y)=>cell(x,y)=='.',.7);
  R.forEach((row,y)=>[...row].forEach((t,x)=>{const cx=x*T2+T2/2,by=y*T2+T2;
   if(t=='#'){const below=R[y+1]?R[y+1][x]:'';if(below=='#'){c.fillStyle='#231d24';c.fillRect(x*T2,y*T2,T2,T2);c.fillStyle='#3a2f33';c.fillRect(x*T2,y*T2,T2,3)}else{c.fillStyle='#231d24';c.fillRect(x*T2,y*T2,T2,T2);addObj({k:'wall',x:cx,y:by+4,s:T2/80*1.04,ghost:0})}M.sol.push([x*T2,y*T2,T2,T2])}
   if(t=='~'){M.sol.push([x*T2,y*T2,T2,T2-(R[y+1]&&R[y+1][x]!='~'?16:0)])}
   if(t=='i'){addObj({k:'pillar',x:cx,y:by-6,s:.9,ghost:1});M.sol.push([cx-14,by-18,28,14])}
   if(t=='l'){addObj({k:'tlamp',x:cx,y:by-6,ghost:1});M.sol.push([cx-8,by-16,16,10]);M.lights.push([cx+8,by-66,90,'rgba(255,150,70,.45)'])}}));
  addObj({k:'altar',x:10.5*T2,y:9*T2-6,s:1.9,ghost:1});M.sol.push([9*T2+8,7*T2+20,3*T2-16,2*T2-24]);M.lights.push([10.5*T2,7.6*T2,90,'rgba(255,170,90,.35)']);
  addObj({k:'statue',x:5.5*T2,y:3.2*T2+40,s:.9,ghost:1});addObj({k:'statue',x:15.5*T2,y:3.2*T2+40,s:.9,mir:1,ghost:1});M.sol.push([5.5*T2-18,3.2*T2+28,36,14],[15.5*T2-18,3.2*T2+28,36,14]);
  addObj({k:'ding',x:10.5*T2,y:10.2*T2,s:1});M.sol.push([10.5*T2-20,10.2*T2-14,40,14]);
  addObj({k:'stele',x:2.5*T2,y:11.6*T2,s:.9,ghost:1});M.inter.push({x:2.5*T2,y:11.6*T2+14,r:38,act:stele});M.inter.push({x:10.5*T2,y:10.2*T2+14,r:36,act:plaque});M.sol.push([2.5*T2-18,11.6*T2-14,36,14]);
  addObj({k:'pool',x:16.6*T2,y:12.6*T2,s:.8});M.sol.push([16.6*T2-56,12.6*T2-60,112,58]);
  if(!G.flags.boss){const h=npc('hebo',10.5*T2,4.1*T2,'河伯',bossTalk,()=>1);h.boss=1;M.inter[M.inter.length-1].r=60;M.inter[M.inter.length-1].y=4.1*T2-30}}
 M.ground=g;
 const sol=id=='reeds'?'~':'';M.blocked=(x,y)=>x<8||x>W-8||y<20||y>H-4||(sol&&sol.includes(cell(x,y)))}
function loadMap(id,x,y,dir){G.map=id;G.x=x;G.y=y;G.dir=dir||'down';G.mode='map';G.steps=0;G.acc=0;G.hist=[];G.bl={x,y,dir:G.dir,f:0};G.f=0;G.lt=performance.now();
 if(id=='village')buildVillage();else buildGrid(id);M.name=NAMES[id];
 for(const z of M.zones)z.in=inZ(z);saveCP({map:id,x,y,dir})}
const inZ=z=>G.x>z.x0&&G.x<z.x1&&G.y>z.y0&&G.y<z.y1;
function blocked(x,y){if(M.blocked(x,y))return 1;for(const s of M.sol)if(x+8>s[0]&&x-8<s[0]+s[2]&&y>s[1]&&y-6<s[1]+s[3])return 1;return 0}
