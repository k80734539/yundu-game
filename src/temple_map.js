'use strict';
// 河神廟三張地圖（v52 階段一）：路線資料在 temple_layout.js（由 docs/maps/temple-v52/layout-*.json 產生）。
// 可走＝腳底六點都在「路徑線段（寬 pathWidth）」或「空地橢圓」內；有條件的邊（缺口、淹水、屏障）條件滿足才算路。
// 階段一用草圖當暫時底圖（assets/img/temple_guide_*.png），階段二加機關、戰鬥，階段三換成生好的底圖。
const TEMPLE_KEYS=['shore','court','hall'];
const TEMPLE_IDS={temple_shore:'shore',temple_court:'court',temple_hall:'hall'};
const TEMPLE_ID_OF=k=>TEMPLE_LAYOUTS[k].id;
const TEMPLE_FOOT=[[-8,0],[8,0],[-8,-6],[8,-6],[0,0],[0,-6]];
const TEMPLE_LAMP_COUNT=3;
// 邊／疊水區的開啟條件：pole＝棧橋踏板（templeShorePole）、sluice＝水閘（templeSluice）、lamps＝三燈全亮、seal＝封印削弱。
const TEMPLE_OPEN={
 pole:()=>!!G.flags.templeShorePole,
 sluice:()=>!!G.flags.templeSluice,
 lamps:()=>(G.flags.templeLamps||0)===((1<<TEMPLE_LAMP_COUNT)-1),
 seal:()=>!!G.flags.templeSeal
};
const templeIsOpen=o=>!o||(TEMPLE_OPEN[o]?TEMPLE_OPEN[o]():true);
function templeSegDist(px,py,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy;let t=l2?((px-a[0])*dx+(py-a[1])*dy)/l2:0;t=Math.max(0,Math.min(1,t));return Math.hypot(px-(a[0]+t*dx),py-(a[1]+t*dy))}
function templeWalkable(L,x,y){
 const r=L.pathWidth/2;
 for(const e of L.edges){if(!templeIsOpen(e.open))continue;if(templeSegDist(x,y,L.nodes[e.a],L.nodes[e.b])<=r)return true}
 for(const c of L.clearings)if(((x-c.x)/c.rx)**2+((y-c.y)/c.ry)**2<=1)return true;
 return false}
function templeBlocked(L,x,y){
 const W=L.world.width,H=L.world.height;
 if(x<8||x>W-8||y<8||y>H-4)return true;
 for(const[dx,dy]of TEMPLE_FOOT)if(!templeWalkable(L,x+dx,y+dy))return true;
 for(const o of L.overlays||[])if(!templeIsOpen(o.open)){const[rx,ry,w,h]=o.rect;if(x+8>rx&&x-8<rx+w&&y>ry&&y-6<ry+h)return true}
 const g=L.features.wardGate;if(g&&!templeIsOpen('lamps')){const[rx,ry,w,h]=g.rect;if(x+8>rx&&x-8<rx+w&&y>ry&&y-6<ry+h)return true}
 return false}
// 到達某張圖時的落腳點（節點座標）。
function templePos(key,node){const p=TEMPLE_LAYOUTS[key].nodes[node];return p?[p[0],p[1]]:[672,830]}
function templeTravel(key,node,dir){const[x,y]=templePos(key,node);loadMap(TEMPLE_ID_OF(key),x,y,dir||'up')}
// 舊版單張河神廟（id temple）的存檔／重來點：依旗標搬到新的三張圖之一，並補上之後階段會用到的旗標。
function templeLegacyTarget(){
 const f=G.flags||(G.flags={});
 if(f.boss||f.templeSeal){f.templeLamps=7;for(const k of['templeShorePole','templeShoreFight','templeFightW','templeFightE','templeSluice','templeHallShadow'])f[k]=1;return{id:'temple_hall',node:'arrival'}}
 if(f.steleSeen||f.templeLamps){for(const k of['templeShorePole','templeShoreFight'])f[k]=1;return{id:'temple_court',node:'arrival'}}
 return{id:'temple_shore',node:'arrival'}}
function templeRedLayer(){const L=TEMPLE_LAYOUTS[M.templeMap],W=L.world.width,H=L.world.height,sol=M.sol;
 return walkRedLayer(null,W,H,(x,y)=>!templeBlocked(L,x,y)&&!sol.some(([sx,sy,w,h])=>x+8>sx&&x-8<sx+w&&y>sy&&y-6<sy+h))}
function templeDebugState(){return [G.flags.templeLamps||0,G.flags.templeSeal?1:0,G.flags.templeSluice?1:0,G.flags.templeShorePole?1:0].join(':')}

// 試玩入口：網址加 #temple-shore／#temple-court／#temple-hall，開啟後直接站在該張圖的入口（隊伍與旗標補到「剛走到這裡」的狀態）。
// 只在網址 hash 完全符合時啟動，一般遊玩不受影響；也供測試呼叫 templeJump(key)。
function templeJump(key){
 if(!TEMPLE_LAYOUTS[key])return false;
 newGame();G.dlg=null;const f=G.flags,qz=G.party[0];
 const lv=(p,n)=>{while(p.lv<n){p.lv++;p.mhp+=9;p.mmp+=3;p.atk+=2;p.def+=1;p.mag+=2}p.hp=p.mhp;p.mp=p.mmp};
 const bl=mk('白苓','bl',45,24,6,2,11,['狐火','春霖']);G.party.push(bl);lv(qz,3);lv(bl,3);
 Object.assign(f,{ferry:1,chief:1,quest:1,flood:1,ferryFight:1,fish:1,tal:1,reedSeen:1,reedPole:1,reedSolved:1,reedBoss:1,camp:1});
 G.inv.魚乾=3;G.inv.清心草=2;
 if(key!=='shore'){Object.assign(f,{templeShorePole:1,templeShoreFight:1})}
 if(key==='court'){Object.assign(f,{})}
 if(key==='hall'){Object.assign(f,{steleSeen:1,templeLamps:(1<<TEMPLE_LAMP_COUNT)-1,templeFightW:1,templeFightE:1,templeSluice:1})}
 templeTravel(key,'arrival','up');healParty();
 return true}
function templeHashJump(){if(location.hash==='#hebo'){templeJump('hall');G.party.forEach(p=>{while(p.lv<4){p.lv++;p.mhp+=9;p.mmp+=3;p.atk+=2;p.def+=1;p.mag+=2}p.hp=p.mhp;p.mp=p.mmp});startBattle(['河伯'],{noEsc:1,bg:'bg_temple',onWin:()=>{}});return}
 const m=/^#temple-(shore|court|hall)$/.exec(location.hash||'');if(m)templeJump(m[1])}  // #hebo：直接試打河伯（試玩用）
// 河伯水影沿用河伯的圖，預先疊成偏藍暗的剪影並快取（不用 ctx.filter，iOS 也看得到）。
function templeEnsureShadowSprites(sync){
 if(!I.hebo?.naturalWidth)return;
 const tint=src=>{const c=document.createElement('canvas');c.width=src.naturalWidth||src.width;c.height=src.naturalHeight||src.height;const x=c.getContext('2d');x.drawImage(src,0,0);x.globalCompositeOperation='source-atop';x.fillStyle='rgba(24,44,110,.58)';x.fillRect(0,0,c.width,c.height);const im=new Image();im.src=c.toDataURL('image/png');return im};
 if(!I.hebos)I.hebos=tint(I.hebo);        // 底圖一定要有，戰鬥畫面的備援會用到
 if(typeof EART!=='undefined'&&EART.hebo)EART.hebos=EART.hebo;
 // 各姿勢圖編碼很吃時間：進後殿時一張一張分批做，避免卡頓；要開打前用 sync 一次補齊。
 let delay=0;for(const p of['idle0','idle1','cast','attack','hit','down']){const k='hebos_'+p;if(I[k]||!I['hebo_'+p]?.naturalWidth)continue;
  if(sync)I[k]=tint(I['hebo_'+p]);else{delay+=80;setTimeout(()=>{if(!I[k])I[k]=tint(I['hebo_'+p])},delay)}}}
// 疊水、踏板、鎖門：底圖畫成乾的，由遊戲動態疊上去；條件滿足後淡出／淡入。
function drawTempleOverlays(now){
 const L=TEMPLE_LAYOUTS[M.templeMap];if(!L)return;const A=M.templeAnim||{},fade=(id,since)=>since==null?0:Math.max(0,1-(now-since)/1400);
 const t=now/1000;
 for(const o of L.overlays||[]){
  const open=templeIsOpen(o.open),a=open?fade(o.id,A[o.open]):1;if(a<=0)continue;
  const[x,y,w,h]=o.rect;X.save();X.globalAlpha=.5*a;X.fillStyle='#3a82c8';X.fillRect(x,y,w,h);
  X.globalAlpha=.35*a;X.strokeStyle='#cfe8ff';X.lineWidth=2;
  for(let i=0;i<4;i++){const yy=y+(i+.5)*h/4;X.beginPath();for(let xx=0;xx<=w;xx+=8){const py=yy+Math.sin(t*2.2+xx/22+i)*3;xx?X.lineTo(x+xx,py):X.moveTo(x,py)}X.stroke()}
  X.restore()}
 const gap=L.features.poleGap;
 if(gap){const[x,y,w,h]=gap.rect,open=!!G.flags.templeShorePole,a=open?1-fade('pole',A.pole):0;
  X.save();
  if(!open){X.fillStyle='rgba(20,50,90,.7)';X.fillRect(x,y,w,h)}
  else{X.globalAlpha=Math.max(a,A.pole==null?1:0);X.fillStyle='#9a6f46';X.fillRect(x,y+8,w,h-16);X.strokeStyle='#5f4328';X.lineWidth=2;for(let i=1;i<6;i++){X.beginPath();X.moveTo(x+i*w/6,y+8);X.lineTo(x+i*w/6,y+h-8);X.stroke()}}
  X.restore()}
 const g=L.features.wardGate;
 if(g&&!templeIsOpen('lamps')){const[x,y,w,h]=g.rect;X.save();X.globalAlpha=.55+.15*Math.sin(t*3);X.fillStyle='#7a2f4a';X.fillRect(x,y,w,h);X.strokeStyle='#e7a4c0';X.lineWidth=3;X.strokeRect(x,y,w,h);X.restore()}
 const sb=L.features.sealBarrier;
 if(sb&&!templeIsOpen('seal')){const[x,y,w,h]=sb.rect;X.save();X.globalAlpha=.55+.15*Math.sin(t*3);X.fillStyle='#2b1f3a';X.fillRect(x,y,w,h);X.strokeStyle='#b58bd6';X.lineWidth=3;X.strokeRect(x,y,w,h);X.restore()}
}
function buildTempleMap(key){
 const L=TEMPLE_LAYOUTS[key],W=L.world.width,H=L.world.height,F=L.features,[g,c]=cvs(W,H);
 M={id:L.id,W,H,T:T2,rows:[],obj:[],sol:[],zones:[],inter:[],npcs:[],lights:[],night:1,nightGrade:.18,mapPlate:1,templeMap:key,templeAnim:{}};
 const plate=I['temple_guide_'+key];
 if(plate?.naturalWidth)c.drawImage(plate,0,0,W,H);else{c.fillStyle='#243c51';c.fillRect(0,0,W,H);c.strokeStyle='#bca77c';c.lineCap='round';c.lineWidth=L.pathWidth*2;for(const e of L.edges){c.beginPath();c.moveTo(...L.nodes[e.a]);c.lineTo(...L.nodes[e.b]);c.stroke()}}
 M.ground=g;
 M.blocked=(x,y)=>templeBlocked(L,x,y);
 const zone=(r,enter)=>{const[x,y,w,h]=r;M.zones.push({x0:x,y0:y,x1:x+w,y1:y+h,enter})};
 const chest=f=>{addObj({k:'chest',x:f.x,y:f.y,chest:f.key});M.sol.push([f.x-16,f.y-12,32,12]);M.inter.push({x:f.x,y:f.y+8,r:38,act:()=>openChest(f.key)})};
 const lore=(f,act,r)=>M.inter.push({x:f.x,y:f.y+(f.stand?0:20),r:r||38,act});
 const lamp=(f,bit,act)=>{const x=f.x,y=f.y,lit=bit!=null&&((G.flags.templeLamps||0)&(1<<bit));
  const l=[x,y-24,104,lit?'rgba(191,239,240,.5)':'rgba(110,150,160,.13)'];if(bit!=null)l.lamp=bit;M.lights.push(l);
  if(!lit){const[sx,sy]=f.stand||[x,y+30];M.inter.push({x:sx,y:sy,r:40,lampBit:bit,act:act||(bit!=null?()=>lightTempleLantern(bit):()=>say(S.templeLampDecoy))})}};
 if(key==='shore'){
  zone(L.zones.toCourt,()=>templeTravel('court','arrival','up'));
  lore(F.incenseStele,()=>say(S.templeIncense));
  chest(F.shoreChest);
  zone(F.shoreGuard.trigger,()=>templeFight('shoreGuard'));
  if(!G.flags.templeShorePole)M.inter.push({x:L.nodes.gapW[0],y:L.nodes.gapW[1],r:64,templePole:1,act:templePole});
 }
 if(key==='court'){
  zone(L.zones.fromShore,()=>templeTravel('shore','gate','left'));
  zone(L.zones.toHall,()=>{if(!templeIsOpen('lamps')){G.y+=40;return say(S.templeWardGateLocked)}templeTravel('hall','arrival','up')});
  lore(F.stele,()=>{G.flags.steleSeen=1;say(S.stele.concat(S.templeSteleClue))});
  lamp(F.lampA,0,templeLampA);lamp(F.lampB,1);lamp(F.lampC_right,2);lamp(F.lampC_left,null,templeLampWrong);
  M.inter.push({x:F.sluiceLever.x,y:F.sluiceLever.y+20,r:44,act:templeSluice});
  zone(F.westFight.trigger,()=>templeFight('westFight'));zone(F.eastFight.trigger,()=>templeFight('eastFight'));
  lore(F.cloudStatue,()=>say(S.templeCloudStatue));
  chest(F.secretChest);
 }
 if(key==='hall'){
  zone(L.zones.fromCourt,()=>templeTravel('court','upN','down'));
  lore(F.plaque,plaque);
  chest(F.hallChest);
  lore(F.cloudMark,()=>say(S.templeCloudMark));
  M.inter.push({x:F.shrineSeal.x,y:F.shrineSeal.y+20,r:46,act:templeShrine});
  templeEnsureShadowSprites();
  if(!G.flags.boss){const h=npc('hebo',F.hebo.x,F.hebo.y,'河伯',bossTalk,()=>1);h.boss=1;const it=M.inter[M.inter.length-1];it.r=60;it.y=F.hebo.y+30}
 }
 if(DEBUG_COL){M.walkRed=templeRedLayer();M.walkRedState=templeDebugState()}
 const r=rng(52);M.flies=Array.from({length:30},()=>({x:r()*W,y:r()*H,p:r()*6,v:.3+r()*.5}));
}
