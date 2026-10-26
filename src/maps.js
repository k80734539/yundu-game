'use strict';
// 地圖/場景：手繪斜視地圖、碰撞遮罩、物件、傳送
// ---------- maps ----------
const T=32,T2=48;
const GRID={
reeds:["rrrrrrrrrrrrrrrrrrrr","r..,,,,r....,,,,,,Cr","r.rrrr,r.rr.rrrrrr,r","r.rS.,,,,,r.....r,,r","r.r.rrrr,rrrr.r.r,rr","r...,,Tr,,,,,.r.,,,r","rrrrrr.r,rrrrrr.rr,r","rC,,,,.,,,,,,,,,,r,r","rrrrr,rrrrrrrr,rr,rr","r....,,,,,r.F.,,,,,r","r.rrrrrrr,r.rrrrrr.r","r.,,,C.r,,,,,,,,,,.r","rrrrrrrr,rrrrrrrrrEr","~~~~~~~~~~~~~~~~~~~~","~~~~~~~~~~~~~~~~~~~~"],
temple:["####################","#~~~~~~~~~~~~~~~~~~#","#~~~~~~~~~~~~~~~~~~#","#~~~~~~~~...~~~~~~~#","#...l....i..i....l.#","#..................#","#....i..........i..#","#........AAA.......#","#........AAA.......#","#....i..........i..#","#..................#","#..................#","#........i..i......#","#########...########","#########..#########"]};
let M=null;
const waterY=x=>(G.flags.dawn?22.3:G.flags.flood?21.2:22.5)*T+Math.sin(x/92)*12+Math.sin(x/31)*4;
function cvs(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return[c,c.getContext('2d')]}
function cell(x,y){const R=M.rows;if(!R)return'';const r=R[Math.floor(y/M.T)];return r?(r[Math.floor(x/M.T)]||'#'):'#'}
function addObj(o){o.s=o.s||1;M.obj.push(o);if(o.sol)M.sol.push(o.sol);return o}
function decals(c,R,n,ok,scale){for(let i=0;i<n;i++){const x=R()*M.W,y=R()*M.H;if(!ok(x,y))continue;const im=I['d'+Math.floor(R()*10)],s=(scale||1)*(.7+R()*.5);c.globalAlpha=.85;c.drawImage(im,x-im.width*s/2,y-im.height*s/2,im.width*s,im.height*s)}c.globalAlpha=1}
function blobs(c,R,n,cols){for(let i=0;i<n;i++){const x=R()*M.W,y=R()*M.H,r=60+R()*140,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,cols[i%cols.length]);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r)}}
function buildVillage(){const W=42*T,H=28*T;M={id:'village',W,H,T,obj:[],sol:[],zones:[],inter:[],npcs:[],lights:[]};
 const o=(k,tx,ty,fw,fh,x={})=>addObj({k,x:tx*T,y:ty*T,sol:null,mapPlate:1,...x});
 // 四區圍繞中央廣場展開；房屋留出朝南入口，短籬笆框出院落但不切斷主路。
 o('cottage',8,6.2,5.6,2.2);o('cottage',13.2,7.2,5.6,2.2);o('hall',21,5.8,8,2.2);o('hut',35,6.2,6,2.2);o('cottage',5.2,10,5.6,2.2);
 const yardFences=[[5.3,5.4,1],[10.8,5.4,1],[12,8.6,1],[15.2,8.6,1],[31.6,5.5,1],[37.9,5.5,1],[33,8.7,1],[38,8.7,1],[4,12.1,1],[9,12.1,1]];
 for(const[x,y,s]of yardFences){o('fence',x,y,2.2,.35,{s});M.sol.push([(x-1.05)*T,(y-.12)*T,2.1*T,.35*T])}
 // 樹叢沿聚落邊緣排布，在屋後與巷口形成自然邊界。
 const trees=[[2.4,4,'willow',1.1],[17.2,3.2,'camphor',.85],[29.5,3.4,'willow',1],[40,4.6,'camphor',.9],[2.2,9.2,'willow',.95],[14.8,11.8,'camphor',.8],[28.8,10.2,'camphor',.9],[40,12.3,'willow',1],[3,18.2,'willow',1],[39.4,18,'willow',1.1],[11.2,20.2,'camphor',.85],[32,19.8,'camphor',.9]];
 for(const[x,y,k,s]of trees){o(k,x,y,1.05,.52,{s});M.sol.push([(x-.42)*T,(y-.2)*T,.84*T,.42*T])}
 o('well',16.8,15.2,2.4,1);o('stall',30,14.1,3.6,1.1);o('stall',34.7,14.9,3.6,1.1,{s:.82});
 // 南西側保留一小片菜圃與倉棚，讓住宅巷有生活用途，也把空地切成尺度較親切的小院。
 o('hut',10.5,19,5,1.8,{s:.78});for(const[x,y]of[[7,18],[9.3,18],[11.6,18],[7,20.8]]){o('fence',x,y,1.6,.32,{s:.9});M.sol.push([(x-.78)*T,(y-.12)*T,1.56*T,.32*T])}for(const[x,y]of[[13.2,18.9],[13.2,21]]){o('fence',x,y,1.6,.32,{s:.9});M.sol.push([(x-.15)*T,(y-.72)*T,.3*T,1.44*T])}
 // 廣場、各區路口與河岸棧橋都有暖燈作為方向地標。
 for(const[x,y]of[[18,11.5],[23,11.5],[16,15],[24.5,15],[29,12],[36,12],[13,16.7],[20,19],[25,19],[18.6,22.3],[22.5,22.3]])o('lantern',x,y,.5,.3)
 o('dock',21.4,21.3,0,0,{flat:1});o('boat',23.5,23,3,1.2,{s:1.3,boat:1});
 const[g,c]=cvs(W,H);c.drawImage(I.village_plate_v37,0,0,W,H);
 // 靜態村景美術；碰撞仍以資料定義，確保屋舍、井與攤位不可穿越。
 M.sol.push(
  [1*T,1.2*T,5*T,4*T], [8*T,1.4*T,6*T,4.3*T], [18*T,1.6*T,9*T,4.4*T],
  [31*T,6*T,5*T,4*T], [36*T,1.4*T,5*T,4.4*T], [4*T,6*T,5*T,4*T],
  [1*T,15*T,9*T,6*T], [33*T,14*T,7*T,5*T],
  // 市集南側的灌木帶與院牆不可穿越，保留兩側繞行空間。
  [22*T,15*T,6*T,1.6*T],
  [11.7*T,11.4*T,2*T,1.5*T], [25*T,10.5*T,4*T,2*T], [29*T,11.3*T,3.5*T,1.6*T]
 );
 M.ground=g;M.water=x=>waterY(x);
 M.blocked=(x,y)=>{if(x<12||x>W-12||y<1.6*T||y>H-4)return 1;const onDock=x>19.1*T&&x<23*T&&y>20*T&&y<24.4*T;return y>waterY(x)-4&&!onDock};
 const f=G.flags;
 const ph=phase(),P=(a,b,c)=>[a,b,c][ph-1];
 if(!f.cure){
  npc('wang',21.4*T,19.7*T,'王大叔',()=>{if(ph==1&&!f.ferry){f.ferry=1;say(S.wang1.concat(S.wang1Hint))}else say(P(S.wang1r,S.wang2,S.wang3))});
  npc('chief',21.4*T,8.5*T,'村長',()=>{if(ph==1&&!f.chief){f.chief=1;say(S.chief1)}else say(P(S.chief1r,S.chief2,S.chief3))},()=>!f.chief);
  npc('granny',36.3*T,10.6*T,'阿婆',()=>{if(ph==3)return cure();if(!f.quest){f.quest=1;G.party[0].arm=3;G.inv.魚乾+=3;say(S.granny1.concat(S.granny1Get))}else say(S.granny2)},()=>!f.quest||(ph==3&&!f.cure));
  npc('lin',14.4*T,13.5*T,'林嬸',()=>say(P(S.lin1,S.lin2,S.lin3),null,'lin'));
  npc('zhou',31.5*T,13.5*T,'老周',()=>say(P(S.zhou1,S.zhou2,S.zhou3),null,'zhou'));
  M.inter.push({x:10.8*T,y:5.8*T,r:36,act:()=>say(P(S.home1,S.home2,S.home3))});
  M.inter.push({x:38*T,y:7.7*T,r:30,act:()=>say(ph==2?S.stone2:ph==1?S.stone1:[['','小石頭睡得正香，阿婆守在床邊。']])});
  if(!f.dawn){M.inter.push({x:21*T,y:23.1*T,r:48,act:boardBoat});
  M.zones.push({x0:19.4*T,y0:22.4*T,x1:22.6*T,y1:24.2*T,enter:boardBoat})}
 }else npc('yx',21*T,21.2*T,'雲纖',null);
}
function npc(k,x,y,n,talk,mark){const o={k,x,y,dir:'down',n,talk,mark,npc:1};M.npcs.push(o);M.sol.push([x-11,y-9,22,10]);if(talk)M.inter.push({x,y:y-14,r:30,act:()=>{faceTo(o);talk()}});return o}
function faceTo(o){if(!I[o.k+'_down0'])return;const dx=G.x-o.x,dy=G.y-o.y;o.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up')}
function buildGrid(id){const R=GRID[id],W=20*T2,H=R.length*T2,plateKey=id=='reeds'?'reeds_plate_v40':'temple_plate_v40',hasPlate=!!I[plateKey]?.naturalWidth;M={id,W,H,T:T2,rows:R,obj:[],sol:[],zones:[],inter:[],npcs:[],lights:[],night:1};
 const r=rng(id=='reeds'?3:5),[g,c]=cvs(W,H);
 const fillTex=(k,x,y,w,h)=>{c.fillStyle=c.createPattern(I[k],'repeat');c.fillRect(x,y,w,h)};
 if(id=='reeds'){if(!hasPlate){fillTex('t_mud',0,0,W,H);
  // tall-grass tint
  const[gm,gc]=cvs(W,H);gc.fillStyle='#fff';gc.filter='blur(6px)';R.forEach((row,y)=>[...row].forEach((t,x)=>{if(t==','||t=='r')gc.fillRect(x*T2-4,y*T2-4,T2+8,T2+8)}));
  const[gg,ggc]=cvs(W,H);ggc.drawImage(gm,0,0);ggc.globalCompositeOperation='source-in';ggc.fillStyle=ggc.createPattern(I.t_grass,'repeat');ggc.fillRect(0,0,W,H);c.globalAlpha=.75;c.drawImage(gg,0,0);c.globalAlpha=1;
  blobs(c,r,30,['rgba(20,30,10,.25)','rgba(120,110,60,.15)']);
  decals(c,r,500,(x,y)=>'.,TCE'.includes(cell(x,y)),.9);
   c.fillStyle='rgba(70,60,40,.6)';c.filter='blur(5px)';c.fillRect(0,13*T2-10,W,14);c.filter='none'}
  R.forEach((row,y)=>[...row].forEach((t,x)=>{const cx=x*T2+T2/2,by=y*T2+T2;
    if(t=='r'){if(!hasPlate){const n=1+(r()<.6);for(let i=0;i<n;i++)addObj({k:r()<.6?'reed1':'reed2',x:cx+(r()-.5)*26,y:by-4-r()*14,s:.85+r()*.3,mir:r()<.5,ghost:1,sway:r()*6})}M.sol.push([x*T2+4,y*T2+6,T2-8,T2-8])}
    if(t==','&&!hasPlate)for(let i=0;i<2;i++)addObj({k:'reed2',x:cx+(r()-.5)*30,y:by-6-r()*28,s:.42+r()*.12,mir:r()<.5,sway:r()*6,ghost:0});
   if(t=='C'){const key='reeds:'+x+','+y;addObj({k:'chest',x:cx,y:by-10,chest:key});M.sol.push([cx-16,by-22,32,14]);M.inter.push({x:cx,y:by-20,r:34,act:()=>openChest(key)})}
   if(t=='T'){addObj({k:'tal',x:cx,y:by-12,s:.8,tal:1});M.zones.push({x0:x*T2,y0:y*T2,x1:x*T2+T2,y1:y*T2+T2,enter:talisman})}
    if(t=='S'){if(!hasPlate)addObj({k:'stele',x:cx,y:by-6,s:.6,ghost:1});M.sol.push([cx-12,by-18,24,12]);M.inter.push({x:cx,y:by,r:34,act:loreStone})}
    if(t=='F'){addObj({k:'rock',x:cx,y:by-8,s:.4,fire:1,mapPlate:hasPlate});M.lights.push([cx,by-20,80,'rgba(255,140,60,.4)']);M.zones.push({x0:x*T2,y0:y*T2,x1:x*T2+T2,y1:y*T2+T2,enter:campfire})}
    if(t=='E'){if(!hasPlate)addObj({k:'gate',x:cx,y:by-2,s:.72});M.zones.push({x0:x*T2,y0:y*T2+20,x1:x*T2+T2,y1:y*T2+T2,enter:exitReeds});M.lights.push([cx,by-90,70,'rgba(255,150,70,.25)'])}}));
   if(id=='reeds'){if(!hasPlate){addObj({k:'wreck',x:10.5*T2,y:7.5*T2-8,s:.52,flat:2});addObj({k:'wreck',x:3.2*T2,y:14.3*T2,s:1,flat:2});addObj({k:'rock',x:9.6*T2,y:13.8*T2,s:.8,flat:2})}M.inter.push({x:10.5*T2,y:7.5*T2,r:42,act:reedTrial})}
   if(!hasPlate)for(let i=0;i<14;i++)addObj({k:'lily',x:r()*W,y:13.4*T2+r()*1.5*T2,s:.5+r()*.4,flat:2});
  M.flies=Array.from({length:36},()=>({x:r()*W,y:r()*13*T2,p:r()*6,v:.3+r()*.5}));
  }else{if(!hasPlate){fillTex('t_stone',0,0,W,H);c.fillStyle='rgba(10,8,20,.25)';c.fillRect(0,0,W,H);blobs(c,r,30,['rgba(0,0,0,.25)','rgba(80,120,80,.12)']);
   decals(c,r,90,(x,y)=>cell(x,y)=='.',.7)}
  R.forEach((row,y)=>[...row].forEach((t,x)=>{const cx=x*T2+T2/2,by=y*T2+T2;
    if(t=='#'){if(!hasPlate){const below=R[y+1]?R[y+1][x]:'';if(below=='#'){c.fillStyle='#231d24';c.fillRect(x*T2,y*T2,T2,T2);c.fillStyle='#3a2f33';c.fillRect(x*T2,y*T2,T2,3)}else{c.fillStyle='#231d24';c.fillRect(x*T2,y*T2,T2,T2);addObj({k:'wall',x:cx,y:by+4,s:T2/80*1.04,ghost:0})}}M.sol.push([x*T2,y*T2,T2,T2])}
   if(t=='~'){M.sol.push([x*T2,y*T2,T2,T2-(R[y+1]&&R[y+1][x]!='~'?16:0)])}
    if(t=='i'){if(!hasPlate)addObj({k:'pillar',x:cx,y:by-6,s:.9,ghost:1});M.sol.push([cx-14,by-18,28,14])}
    if(t=='l'){if(!hasPlate)addObj({k:'tlamp',x:cx,y:by-6,ghost:1});M.sol.push([cx-8,by-16,16,10]);M.lights.push([cx+8,by-66,90,'rgba(255,150,70,.45)'])}}));
   if(!hasPlate)addObj({k:'altar',x:10.5*T2,y:9*T2-6,s:1.9,ghost:1});M.sol.push([9*T2+8,7*T2+20,3*T2-16,2*T2-24]);M.lights.push([10.5*T2,7.6*T2,90,'rgba(255,170,90,.35)']);
  M.inter.push({x:10.5*T2,y:6.25*T2,r:42,act:templeSeal});
   if(!hasPlate){addObj({k:'statue',x:5.5*T2,y:3.2*T2+40,s:.9,ghost:1});addObj({k:'statue',x:15.5*T2,y:3.2*T2+40,s:.9,mir:1,ghost:1})}M.sol.push([5.5*T2-18,3.2*T2+28,36,14],[15.5*T2-18,3.2*T2+28,36,14]);
   if(!hasPlate)addObj({k:'ding',x:10.5*T2,y:10.2*T2,s:1});M.sol.push([10.5*T2-20,10.2*T2-14,40,14]);
   if(!hasPlate)addObj({k:'stele',x:2.5*T2,y:8.5*T2,s:.9,ghost:1});M.inter.push({x:2.5*T2,y:8.5*T2+14,r:38,act:stele});M.inter.push({x:10.5*T2,y:10.2*T2+14,r:36,act:plaque});M.sol.push([2.5*T2-18,8.5*T2-14,36,14]);
   if(!hasPlate)addObj({k:'pool',x:16.6*T2,y:9.8*T2,s:.8});M.sol.push([16.6*T2-56,9.8*T2-60,112,58]);
  if(!G.flags.boss){const h=npc('hebo',10.5*T2,4.1*T2,'河伯',bossTalk,()=>1);h.boss=1;M.inter[M.inter.length-1].r=60;M.inter[M.inter.length-1].y=4.1*T2-30}}
 M.ground=g;if(hasPlate){c.clearRect(0,0,W,H);c.drawImage(I[plateKey],0,0,W,H);M.mapPlate=1}
 const sol=id=='reeds'?'~':'';M.blocked=(x,y)=>x<8||x>W-8||y<20||y>H-4||(sol&&sol.includes(cell(x,y)))}
function loadMap(id,x,y,dir){G.map=id;G.x=x;G.y=y;G.dir=dir||'down';G.mode='map';G.steps=0;G.acc=0;G.hist=[];G.bl={x,y,dir:G.dir,f:0};G.f=0;G.lt=performance.now();
 if(id=='village')buildVillage();else buildGrid(id);M.name=NAMES[id];
 for(const z of M.zones)z.in=inZ(z);saveCP({map:id,x,y,dir})}
const inZ=z=>G.x>z.x0&&G.x<z.x1&&G.y>z.y0&&G.y<z.y1;
function blocked(x,y){if(M.blocked(x,y))return 1;for(const s of M.sol)if(x+8>s[0]&&x-8<s[0]+s[2]&&y>s[1]&&y-6<s[1]+s[3])return 1;return 0}
