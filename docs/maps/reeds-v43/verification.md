# v43 驗證記錄

使用專案既有 Playwright，瀏覽器為本機 Google Chrome（`CHROME_PATH`）。

- `node tests/reeds-maze.mjs`：390×664／844×390 實際控制器走路、三寶箱、兩座根橋、十處岸邊、斜向搖桿、營火回復／安全 checkpoint、河神廟轉場均 PASS。另測未開橋舊存檔位於南區時返回入口，保留任務及寶箱進度。
- `npm run test:play`：390×664／844×390 完整第一章至結局 PASS，含隨機遭遇；JavaScript errors=[]。
- `npm test`：完整回歸 ALL PASS，含新迷宮測試、村莊可達性、音樂、村民、夜渡、戰鬥、觸控、五尺寸畫面、特效、存檔、演出與角色縮放。
- `map_bundle.py validate`：開橋／封橋兩份 bundle 均 pass，errors=0，warnings=0。
- `map_nav.py check`：開橋 pass，6/6 目標可達、0 thin gaps。封橋的 6 個開橋前目標亦全部可達，僅南區依設計被隔離；警告原樣列於 README.md。
- `build_scene_preview.py` 產生兩份預覽，使用 Chrome 執行 `window.__scene.traverseAll()`，兩份 ok=true、各 6 個目標皆完成，Y-sort probe pass，瀏覽器 errors=[]。結果存於 preview*/chrome-verification.json 與 scene-snapshot.json。

人工檢視底圖與導航遮罩、兩種手機方向的實際遊戲截圖；精簡截圖為 game-landscape.webp 和 game-portrait.webp。底圖／路線仍需初次玩家實際操作回饋，不把導航可達性當作逐像素辨識美術。
