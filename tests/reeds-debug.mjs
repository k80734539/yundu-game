import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {serve,launch,newPage,outDir} from './lib.mjs';

export async function reedsDebug(browser,url,sizes=[[390,664],[844,390]]){
 for(const[W,H]of sizes){const{ctx,pg,jsErrors}=await newPage(browser,W,H,{touch:true,seed:true}),dir=outDir('reeds-debug',`${W}x${H}`);
  try{
   await pg.goto(url+'?debug=col');await pg.waitForFunction('ready');
   const points=await pg.evaluate(()=>{newGame();G.dlg=null;loadMap('reeds',...REEDS_LAYOUT.nodes.spawn,'right');const red=M.walkRed;if(!red)throw Error('?debug=col did not build the reeds road overlay');const c=red.getContext('2d'),checks=[];for(let y=16;y<M.H-16;y+=37)for(let x=16;x<M.W-16;x+=43){const isRed=c.getImageData(x,y,1,1).data[3]>0;checks.push({x,y,isRed,blocked:!!blocked(x,y)})}const gate=REEDS_LAYOUT.gates[0],locked=c.getImageData(gate.x,gate.y,1,1).data[3];G.flags.reedSolved=1;drawWorld(performance.now());const unlocked=M.walkRed.getContext('2d').getImageData(gate.x,gate.y,1,1).data[3];return{world:[M.W,M.H],count:checks.length,matches:checks.every(p=>p.isRed===p.blocked),walkPixel:c.getImageData(100,122,1,1).data[3],blockedPixel:c.getImageData(330,220,1,1).data[3],locked,unlocked,gatePassable:!blocked(gate.x,gate.y)}});
   assert.deepEqual(points.world,[1344,896]);assert.ok(points.count>700);assert.ok(points.matches,'debug pixels match the movement collision test at sampled world coordinates');assert.equal(points.walkPixel,0,'open road is transparent');assert.equal(points.blockedPixel,255,'outside the road union is marked blocked');assert.equal(points.locked,255,'closed root gate is red');assert.equal(points.unlocked,0,'opened root gate is removed from the red overlay');assert.equal(points.gatePassable,true,'opened root gate is passable');
   await pg.screenshot({path:`${dir}/reeds-collision.png`});assert.deepEqual(await jsErrors(),[]);
   console.log(`[reeds-debug ${W}x${H}] ${points.count} world points match blocked(), debug screenshot → PASS`);
  }finally{await ctx.close()}
 }
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();try{await reedsDebug(b,s.url)}finally{await b.close();s.close()}}
