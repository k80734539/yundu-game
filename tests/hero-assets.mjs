import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {serve,launch,newPage} from './lib.mjs';
export async function heroAssets(browser,url){
 const {ctx,pg,jsErrors}=await newPage(browser,844,390,{seed:true});
 try{await pg.clock.install({time:0});await pg.goto(url);await pg.clock.pauseAt(1000);await pg.clock.runFor(1500);
 const report=await pg.evaluate(()=>{
  function sample(key){const im=I[key],c=document.createElement('canvas');c.width=480;c.height=420;const x=c.getContext('2d');x.drawImage(im,0,0);const d=x.getImageData(0,0,480,420).data;let red=0,solid=0,spill=0,minX=480,minY=420,maxX=0,maxY=0;
   for(let i=0;i<d.length;i+=4){const a=d[i+3],r=d[i],g=d[i+1],b=d[i+2],px=(i/4)%480,py=Math.floor(i/4/480);
    if(a>16){minX=Math.min(minX,px);minY=Math.min(minY,py);maxX=Math.max(maxX,px+1);maxY=Math.max(maxY,py+1)}
    if(a>=220){solid++;if(r>g*1.3&&r>b*1.3&&r>100)red++;if(r>220&&b>220&&g<50)spill++}
   }
   return{key,w:im.naturalWidth,h:im.naturalHeight,bounds:[minX,minY,maxX,maxY],redShare:red/solid,spill}
  }
  const keys=Object.keys(ASSETS).filter(k=>/^(qzd|bld|yxd)_/.test(k));return{frames:keys.map(sample),qz:sample('qzd_idle0'),hit:sample('qzd_hit'),down:sample('qzd_down')}
 });
 assert.equal(report.frames.length,30);
 for(const f of report.frames){assert.equal(f.w,480);assert.equal(f.h,420);assert.ok(f.bounds[0]>2&&f.bounds[1]>2&&f.bounds[2]<478&&f.bounds[3]<418,'no clipped '+f.key);assert.ok(f.bounds[3]<=367,'shared floor root '+f.key);assert.equal(f.spill,0,'no opaque key backdrop '+f.key)}
 assert.ok(report.qz.redShare>.04,'original red headband/skin colors retained');
 assert.ok(report.hit.bounds[3]-report.hit.bounds[1]>report.down.bounds[3]-report.down.bounds[1]+60,'recoil image distinct from kneeling down image');
 assert.deepEqual(await jsErrors(),[]);console.log('[hero-assets] 30 source-color frames, floor alignment, red palette, proper hit/down PASS');
 return true;
 }finally{await ctx.close()}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();try{await heroAssets(b,s.url)}finally{await b.close();s.close()}}
