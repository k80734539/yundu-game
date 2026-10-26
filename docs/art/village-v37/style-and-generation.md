# 村莊整幅場景圖（v37）

- 遊戲素材：`assets/img/village_map_v37.webp`，1344×896 RGB WebP，約 574 KB。
- 原始圖：`village-map-generated.png`，1536×1024 RGB PNG。
- 用途：蘆花渡村完整靜態場景底圖；角色／村民、互動提示、HUD 與水紋仍由遊戲即時繪製。
- 風格依據：使用者提供的水彩手繪村景參考；本專案 `docs/art/style-guide.md` 的斜視角、淡墨線、柔和手繪色彩。參考圖只作風格依據，構圖與建築均重新生成。
- 生成方式：OpenAI 內建 image_gen 生成無人物、無 UI 的 3:2 村莊場景，再等比例縮放至遊戲世界 42×28 格。

## 提示詞

> Paint one coherent complete small Chinese riverside village from a high oblique game-map view, hand-painted ink and watercolor with detailed foliage, warm dirt, tiled roofs, stonework and calm river. Fill the 3:2 frame edge to edge. A broad dirt main lane runs vertically from upper edge through center to a wooden dock near lower-center shore; a broad cross-lane runs horizontally at about 45 percent image height. Place a large timber-and-tile village hall upper-center, smaller homes upper-left, upper-right and far-left, a circular stone well left-center, produce stalls right-center, fenced yards along the lower sides, a wooden dock centered at the south bank, a small tied rowboat just right of it, and river along the bottom 20-25 percent. Trees and shrubs frame the edges but leave roads and plaza open. Oblique 3/4 top-down, no horizon. Moss greens, warm ochre earth, weathered gray-brown tile, pale plaster, calm blue-green river, soft upper-left daylight. Watercolor washes, paper texture, fine hand-inked edges. No characters, animals, UI, text, icons, labels, borders or watermark; avoid photorealism, 3D, pixel art, flat vector and cluttered roads.
