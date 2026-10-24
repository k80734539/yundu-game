'use strict';
// 核心：canvas、visualViewport/safe-area 尺寸、圖片載入、亂數
// ===== 雲渡仙緣 第一章〈夜渡〉 — layered free-roam engine =====
const cv=document.getElementById('c'),X=cv.getContext('2d');
const DV={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
let SW=640,SH=480,K=1,WS=1,VW=640,VH=480,SA={t:0,r:0,b:0,l:0};
const probe=document.createElement('div');probe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';document.body.appendChild(probe);
function fit(){K=Math.min(devicePixelRatio||1,2);const vv=window.visualViewport;SW=Math.round(vv?vv.width:innerWidth);SH=Math.round(Math.min(innerHeight,vv?vv.height:1e9));cv.style.width=SW+'px';cv.style.height=SH+'px';document.documentElement.style.height=document.body.style.height=SH+'px';if(window.JOYfit)JOYfit(SW,SH);cv.width=Math.round(SW*K);cv.height=Math.round(SH*K);
 const cs=getComputedStyle(probe);SA={t:parseFloat(cs.paddingTop)||0,r:parseFloat(cs.paddingRight)||0,b:parseFloat(cs.paddingBottom)||0,l:parseFloat(cs.paddingLeft)||0};
 WS=Math.min(SW,SH)/(JOY.touch?(SH>SW?430:380):470);VW=SW/WS;VH=SH/WS}
fit();addEventListener('resize',fit);if(window.visualViewport){visualViewport.addEventListener('resize',fit);visualViewport.addEventListener('scroll',()=>scrollTo(0,0))}setInterval(()=>{const vv=window.visualViewport,h=Math.round(Math.min(innerHeight,vv?vv.height:1e9));if(h!=SH||Math.round(vv?vv.width:innerWidth)!=SW)fit()},500);addEventListener('orientationchange',()=>setTimeout(fit,200));
const I={};let toLoad=0,ready=false;
for(const k in ASSETS){toLoad++;const im=new Image();im.onload=im.onerror=()=>{if(--toLoad==0){ready=true}};im.src=ASSETS[k]+'?v='+ASSET_V;I[k]=im}
const rnd=n=>Math.floor(Math.random()*n);
function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const tm=()=>performance.now()/400;
