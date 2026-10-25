'use strict';
// 標題、CREDITS、全滅、結局畫面
function drawTitle(now){UI();X.fillStyle='#000';X.fillRect(0,0,SW,SH);const c=cover(I.night,.5,.62),t=now/1000,b=Math.sin(t*1.5)*2,sc=c.s*1.05;
 for(const[k,x,y,r]of[[sprIdle('qz','right'),490,398,0],[sprIdle('bl','left'),560,395,0]])sprDraw(k,c.ox+x*c.s,c.oy+y*c.s+b,sc)
 const fs=FS(),big=Math.min(SW/6.5,74);const ty=SH*(SH>SW?.24:.3);X.fillStyle='rgba(0,0,0,.35)';rr(SW/2-big*2.6,ty-big-10,big*5.2,big*2.1,14);X.fill();
 X.save();X.shadowColor='#000';X.shadowBlur=12;txt('雲渡仙緣',SW/2,ty,big,'#f3dfa0','center');txt('第一章〈夜渡〉',SW/2,ty+big*.75,big*.38,'#cfe','center');X.restore();
 if(G.cred){X.fillStyle='rgba(0,0,20,.82)';X.fillRect(0,0,SW,SH);const L=CREDITS;L.forEach((l,i)=>txt(l,SW/2,SA.t+60+i*(fs+12),i?fs-1:fs+4,i?'#e8e8f0':'#f3dfa0','center'));return}
 if(!SV.p&&Math.floor(t*1.6)%2)txt(JOY.touch?'按 A 開始':'按 Enter／空白鍵 開始',SW/2,SH-SA.b-(JOY.touch?230:70),fs+3,'#fff','center');
 txt('版本 v31',SW-SA.r-94,SA.t+fs+4,fs-3,'#cde','right');if(!SV.p)txt(JOY.touch?'B：素材來源 CREDITS':'C／Esc：素材來源 CREDITS',SW/2,SH-SA.b-(JOY.touch?200:40),fs-3,'#cde','center');
 if(!ready)txt('載入中…',SW/2,SH/2,fs,'#fff','center')}
const CREDITS=['【CREDITS 素材來源】','','角色、場景、道具、敵人、立繪、背景：','本作原創 AI 生成手繪風素材','（色鍵去背後合成）','戰鬥背景：OpenAI image_gen','程式、劇情：《雲渡仙緣》原創','','按 B／C／Esc 返回'];
function drawOver(){UI();X.fillStyle='#200';X.fillRect(0,0,SW,SH);const fs=FS();txt('勝敗乃兵家常事',SW/2,SH*.42,fs*2,'#f88','center');txt('按 A／確定 重新挑戰',SW/2,SH*.42+fs*3,fs,'#fff','center')}
function drawEnd(now){UI();X.fillStyle='#000';X.fillRect(0,0,SW,SH);const a=Math.min(1,(now-G.endT)/1200);X.globalAlpha=a*.35;cover(I.night);X.globalAlpha=a;const fs=FS();
 txt('第一章〈夜渡〉 完',SW/2,SH*.26,fs*2,'#f3dfa0','center');txt('—— 待續：白苓的命運，與倒流的渡雲河 ——',SW/2,SH*.26+fs*2.2,Math.min(fs,SW/26),'#cfe','center');
 const s=Math.min(SW,SH)/260;[sprIdle('qz','down'),sprIdle('bl','down')].forEach((k,i)=>{const im=I[k];sprDraw(k,SW/2+(i-.5)*72*s*.8,SH*.58-2,s)});
 txt(G.party.map(p=>p.n+' Lv'+p.lv).join('　'),SW/2,SH*.58+fs*2,fs,'#aaa','center');txt('按 A／確定 回到標題',SW/2,SH*.58+fs*4.5,fs,'#fff','center');X.globalAlpha=1}
