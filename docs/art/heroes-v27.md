# v27 主角原始姿勢圖重匯入

使用者提供白苓、雲纖、陳青舟三張 1536×1024、2×5、桃紅底原始姿勢圖。本次 art_source: existing；route: supplied sheets → generate2dsprite soft chroma matte → ownership slicing → registered premultiplied resize → lossless WebP。沒有重新生成角色，也沒有另加色調、去飽和或暗化。

原圖檔名、姿勢順序及註冊規則在 heroes-v27/import-plan.json；原始 PNG 以 qzd/bld/yxd-original.png 保存。舊版 30 張 WebP 保存在 before/，可直接比對。qz-color-comparison.png 是原始解鍵圖與舊影格的顏色參考（不同解析度）；qz-runtime-comparison.png 才是同一 480×420 畫布的遊戲影格比較。

問題確認：舊青舟紅色頭帶與膚色飽和度流失；舊 qzd_hit 與 qzd_down 完全相同；舊 qzd_idle0 可見圖形延伸到 y=412，超過共用腳底基準 y=355。新圖恢復原始色彩、採正確後仰受擊姿勢並重新對齊。

## 切圖與註冊

原圖右側無損補 4 px 桃紅背景，使 1540×1024 可分為 2×5。assemble_frames.py 以 soft matte 去背、ownership 保留跨格竹篙、劍、髮帶與狐尾，不用硬格線裁斷物件。各 *-keyed/animation.json 有來源雜湊、元件歸屬、色鍵與無損包裝檢查。其 status=needs-visual-review；10 張是動作姿勢銀行，不是用來循環播放的一支動畫，因此 loop_seam 只作數值記錄。

輸出 assets/img/{qzd,bld,yxd}_*.webp，共 30 張，480×420 RGBA、共用腳底 (240,355)。每位角色由待機原圖建立一個固定倍率，以待機身高 270 px 為基準，所有動作共用，不把倒下圖拉成站姿大小。BFR.scale=.39、動作時序與戰鬥數值保持不變。qz 後仰／跪倒／勝利指定腳底，避免竹篙端點被當成鞋底。完整倍率、來源錨點、輸出邊界及 clippedAlpha=0 見 registration.json；流程可由 tools/import-hero-sources.py 重現。

採 premultiplied LANCZOS 縮放再轉無損 WebP，保留抗鋸齒透明邊緣，避免黑邊。沒有全局顏色校正。色鍵會去除邊緣桃紅污染，所以不聲稱每個 RGBA 都與原圖完全相同。

## 品質記錄

color-qa.json：不透明遮罩向內縮 3 px 後，與原始 PNG 對應像素 RGB 完全一致的比例為青舟 99.5209%、白苓 99.7853%、雲纖 99.7882%；平均每通道差異分別 0.01817、0.00722、0.00480（0–255）。最大像素差異也完整記錄，未隱藏。三份包裝 QA 沒有 warn/fail；視覺仍需人工檢視。

poses-preview.png 為三人全部 30 張的深灰底總覽，已檢視竹篙、劍、尾巴、方向、原色與站立面。tests/hero-assets.mjs 確認所有影格載入、尺寸、可見圖形沒有裁切或不透明桃紅背景、腳底範圍，以及青舟受擊與倒下圖確實不同。既有戰鬥動作測試會檢查待機、攻擊、受擊、倒下、勝利、衝刺與縮放。

版本與快取升為 27；背景素材仍引用已存在的 bg_*_v26.webp。原圖來源與製作方式補入 CREDITS.txt。底部卡片／對話頭像及地圖 sprite 不在本次處理範圍。

2026-10-25 驗收：完整 npm test → ALL PASS，包含主角素材、三背景／六尺寸落點、六尺寸站位、三尺寸動作、直橫通關、觸控、特效、存檔、演出、地圖角色縮放與舊快取回退。18 組 v26／v27 截圖差異 1.63%–4.59%，集中於角色；已檢視淺／深底 alpha-review.png 與遊戲實際畫面。
