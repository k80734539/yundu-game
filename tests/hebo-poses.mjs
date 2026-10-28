import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {serve,launch,newPage} from './lib.mjs';

const POSES=['hebo_charge0','hebo_charge1','hebo_stagger','hebo_drink','hebo_whirl','hebo_rage0','hebo_rage1','hebo_wave'];

export async function heboPoses(browser,url){
 const {ctx,pg,jsErrors}=await newPage(browser,390,664,{touch:false});
 try{
  await pg.goto(url);
  await pg.waitForFunction(()=>ready);
  const report=await pg.evaluate(keys=>{
   function bounds(key){
    const im=I[key],c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;
    const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0);const d=x.getImageData(0,0,c.width,c.height).data;
    let minX=c.width,minY=c.height,maxX=-1,maxY=-1,transparent=0,opaque=0;
    for(let i=3;i<d.length;i+=4){const a=d[i],px=((i-3)/4)%c.width,py=Math.floor((i-3)/4/c.width);if(a===0)transparent++;if(a>8){opaque++;minX=Math.min(minX,px);minY=Math.min(minY,py);maxX=Math.max(maxX,px+1);maxY=Math.max(maxY,py+1)}}
    return{key,w:im.naturalWidth,h:im.naturalHeight,b:[minX,minY,maxX,maxY],transparent,opaque};
   }
   return{reference:bounds('hebo_idle0'),poses:keys.map(bounds),fx:bounds('fx_whirl')};
  },POSES);
  const ref=report.reference,refWidth=ref.b[2]-ref.b[0];
  assert.equal(ref.w,512);assert.equal(ref.h,512);
  for(const p of report.poses){
   assert.equal(p.w,512,`${p.key} width`);assert.equal(p.h,512,`${p.key} height`);
   assert.ok(p.transparent>0&&p.opaque>0,`${p.key} must have RGBA transparency and visible pixels`);
   const [x0,y0,x1,y1]=p.b,width=x1-x0;
   assert.ok(Math.abs(y1-476)<=6,`${p.key} bottom anchor ${y1}`);
   assert.ok(Math.abs((x0+x1)/2-256)<=20,`${p.key} center ${(x0+x1)/2}`);
   assert.ok(width>=refWidth*.8&&width<=refWidth*1.25,`${p.key} width ${width} vs ${refWidth}`);
  }
  assert.equal(report.fx.w,512);assert.equal(report.fx.h,512);
  assert.ok(report.fx.transparent>0&&report.fx.opaque>0,'fx_whirl must have transparent RGBA pixels and visible artwork');
  assert.deepEqual(await jsErrors(),[]);
  console.log('[hebo-poses] 8 aligned 512x512 RGBA poses and fx_whirl PASS');
  return true;
 }finally{await ctx.close()}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();try{await heboPoses(b,s.url)}finally{await b.close();s.close()}}
