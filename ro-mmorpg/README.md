# 晨曦物語 — RO 風格單機網頁 MMORPG

純 HTML5 Canvas + TypeScript + Vite（不使用遊戲引擎）。45 度等角、Q 版像素風、點擊移動、六圍公式、轉職、卡片、精煉、MVP。

```
cd ro-mmorpg
npm install
npm run dev      # http://localhost:5173
npm run build    # 輸出 dist/
```

- 架構：ARCHITECTURE.md　進度：PROGRESS.md　決定紀錄：DECISIONS.md　驗收清單：TEST_CHECKLIST.md
- 內容資料全部在 `data/*.json`（地圖、怪物、道具、技能、職業、任務、NPC、商店）。
- 角色與怪物圖目前由程式生成（192×192、4 列×10 格、腳底 96,186），之後可直接換成同規格的美術圖。
- 操作：點擊移動／攻擊／撿取／對話；Alt+E 背包、Alt+Q 裝備、Alt+A 能力值、Alt+S 技能、Alt+U 任務、M 世界地圖、F1~F9 快捷列、Insert 坐下、Enter 聊天、Esc 設定。
