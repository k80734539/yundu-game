'use strict';
// 蘆葦蕩迷宮：可行走道路與地標由同一份 REEDS_LAYOUT 定義。
function reedsWalkable(x,y){const a=REEDS_LAYOUT;return a.walkRects.some(([rx,ry,w,h])=>x>=rx&&x<=rx+w&&y>=ry&&y<=ry+h)||a.clearings.some(c=>((x-c.x)/c.rx)**2+((y-c.y)/c.ry)**2<=1)}
function buildReedsMaze(){const a=REEDS_LAYOUT,W=a.world.width,H=a.world.height,[g,c]=cvs(W,H);
 M={id:'reeds',W,H,T:T2,rows:[],obj:[],sol:[],zones:[],inter:[],npcs:[],lights:[],night:1,nightGrade:.18,mapPlate:1,maze:1};
 if(I.reeds_plate_v43?.naturalWidth)c.drawImage(I.reeds_plate_v43,0,0,W,H);else{c.fillStyle=c.createPattern(I.t_marsh,'repeat');c.fillRect(0,0,W,H);c.fillStyle=c.createPattern(I.t_mud,'repeat');for(const[x,y,w,h]of a.walkRects)c.fillRect(x,y,w,h)}
 M.ground=g;
 M.blocked=(x,y)=>{if(x<8||x>W-8||y<8||y>H-4)return true;
  if(![[-8,0],[8,0],[-8,-6],[8,-6],[0,0],[0,-6]].every(([dx,dy])=>reedsWalkable(x+dx,y+dy)))return true;
  return !G.flags.reedSolved&&a.gates.some(({rect:[rx,ry,w,h]})=>x+8>rx&&x-8<rx+w&&y>ry&&y-6<ry+h)};
 const zone=(r,enter)=>{const[x,y,w,h]=r;M.zones.push({x0:x,y0:y,x1:x+w,y1:y+h,enter})};
 for(const p of a.chests){addObj({k:'chest',x:p.x,y:p.y,chest:p.key});M.sol.push([p.x-16,p.y-12,32,12]);M.inter.push({x:p.x,y:p.y+8,r:38,act:()=>openChest(p.key)})}
 M.sol.push(a.stone.solid,a.campfire.solid);
 M.inter.push({x:a.stone.interact[0],y:a.stone.interact[1],r:38,act:loreStone});
 addObj({k:'tal',x:a.talisman.x,y:a.talisman.y,s:.8,tal:1});zone(a.talisman.zone,talisman);
 for(const p of a.gates){addObj({k:'reed_roots_v43',x:p.x,y:p.y+21,rootGate:1,ghost:0});if(!G.flags.reedSolved)M.inter.push({x:p.x,y:p.y-20,r:44,act:reedTrial,rootGate:1})}
 addObj({k:'rock',x:a.campfire.x,y:a.campfire.y,s:.4,fire:1,mapPlate:1});
 M.lights.push([a.campfire.x,a.campfire.y-16,100,'rgba(255,150,70,.42)']);zone(a.campfire.zone,campfire);
 zone(a.exit.zone,exitReeds);M.lights.push([1280,725,70,'rgba(255,150,70,.24)']);
 M.encounterAt=(x,y)=>reedsWalkable(x,y)&&!(x<335&&y<190)&&Math.hypot(x-a.campfire.x,y-a.campfire.y)>138&&x<1230;
 const r=rng(43);M.flies=Array.from({length:44},()=>({x:r()*W,y:r()*H,p:r()*6,v:.3+r()*.5}));
}
