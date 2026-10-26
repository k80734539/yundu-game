# 蘆葦蕩迷宮美術

`art_source: host_image`；由 Codex 內建 `image_gen` 生成，未回傳可記錄的模型名稱或費用估算。

- `original.png`：1536×1024 原始水彩全景。參考 `generation-guide.png` 的路線拓樸與既有 `reeds_map_v40.webp` 的色調；提示詞為 `prompt.txt`。
- `assets/img/reeds_map_v43.webp`：等比縮小至 1344×896，WebP quality 92，完整保留 3:2 畫布。生成後依實際路面中心微調地圖資料，詳見 `docs/maps/reeds-v43/layout.json`。
- `roots-original.png`：1672×941 RGBA 原始妖根障礙，原生透明背景，alpha 範圍 0～255。提示詞為 `roots-prompt.txt`。
- `assets/img/reed_roots_v43.webp`：依 alpha≥8 的輪廓裁出 `[23,197,1656,776]`，等比縮至 110×39，置於 128×64 固定畫布，透明物件底部 y=56；無損 WebP。遊戲以畫布下緣為錨，橋上物件 y=466，實際根部落在 y=458 的碰撞下緣。

玩家、同伴、寶箱、妖符、火焰和妖根均未畫入底圖；取得物品或清除妖根後，遊戲可同時移除圖像與相應互動／阻擋。原始 PNG、原始草圖和提示詞保留供後續重製。
