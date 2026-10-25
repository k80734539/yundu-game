# v28 戰鬥與對話半身頭像

依使用者提供三張角色四視角 JPG（1280×853）製作，art_source: existing。前三張分別為青舟、白苓、雲纖；第四張只參考「人物露出底部資訊列、紅色 HP／藍色 MP」的版面構圖，不複製外部遊戲人物或美術。沒有重新生成角色、改臉、換服裝或套夜景色調。

## 素材

assets/img/pt_{qz,bl,yx}_v28.webp 為最右側三分之四正面的去背半身圖，保留頭頂／狐耳／髮冠、下巴、雙肩與上胸。三張均為 512×512 RGBA，對話與戰鬥鍵共用相同圖片，避免混用舊像素青舟或不同畫風頭像。舊檔留存。

pt_qz_front_v28.webp、pt_bl_front_v28.webp 為原圖正面視角，對應既有情境鍵 pt_qz_startled、pt_bl_quiet。來源未提供表情差分，因此不聲稱這兩張是新繪製的驚訝／悲傷圖；保留原本情境切換、運鏡與淡入效果。

原始 JPG、轉換 PNG、keyed/ 中的四視角、crop-plan.json 及來源 SHA256 均保存於 portraits-v28/。tools/import-portraits.py 可從保存的 keyed 圖重做頭像；輸入階段使用 generate2dsprite assemble_frames 的 soft chroma key + ownership slicing，保留跨格髮帶與長髮。

JPEG 桃紅背景的邊緣色污在裁切／premultiplied LANCZOS 縮放後，以 2 px edge-only despill 修正；R-B>20 且 G>110 的暖粉色／膚色受保護，alpha 不變，不做全局去色。完整資料在 matte-qa.json。最終 opaque_key_px 皆為 0；outer_ring_spill_fraction 依序約 qz 0、bl .0049、yx .0003、qz_front .0002、bl_front .0062（皆低於 .01）；來源包裝 QA 沒有 warn/fail，狀態 needs-visual-review，仍需目視確認。

## 版面

橫式戰鬥：人物在卡片左側，名字／HP／MP 在右側；去背頭像自然露出資訊列。直式：人像置中、名字與生命同列、法力第二列。資訊列上緣至少避開人像上方 66%，保留整張臉；HP/MP 採紅藍雙行數字，不讓細條線穿過數字。活躍角色有淡金外光與細框，倒下頭像仍保留原本降低透明度效果。

卡片觸控範圍包含露出資訊列的整張頭像，選隊友使用道具時可直接點頭像。敵人名稱／血條的安全界線使用新的頭像上緣。隊伍站位、數值、命中時間與戰鬥規則不變。

對話使用相同半身圖，移除三位主角的方框頭像邊線；NPC 的既有框式頭像維持。文字、換行寬度與對話框位置不變。

版本及圖片快取升為 28；背景檔名 _v26.webp 與 v27 戰鬥姿勢圖保持不變。來源補入 CREDITS.txt。

## 驗收

tests/portrait-ui.mjs 覆蓋 390×664、375×553、430×750、664×390、844×390、1024×768：透明半身素材、對話／戰鬥共用來源、沒有不透明桃紅背景、畫面內完整可見，以及點浮出資訊列的頭像確實選中正確隊友。

修正前截圖在 tests/baseline-v27/portrait-ui/，修正後在 tests/out/portrait-ui/；包含每尺寸一場戰鬥與三位主角的對話。互動驗證會推進少量時鐘，因此動態場景可能有相位差；以頭像及資訊列區域為主要視覺判準。portraits-preview.png 為五張素材總覽，game-preview.jpg 為實際戰鬥＋對話預覽。

2026-10-25 驗收：完整 npm test → ALL PASS。移除穿過數字的細線後，另重新執行六尺寸 portrait-ui，均 PASS；24 組前後畫面比較結果見 screenshot-comparison.json。已目視檢查直式／寬橫式／4:3 橫式、對話與底部人像，臉部與肩膀可見且數值清楚。
