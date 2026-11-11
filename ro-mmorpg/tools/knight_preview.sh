#!/bin/bash
# 劍士系精靈圖預覽：建置 → 匯出整張精靈圖 → 排成「三個方向 × 10 格」的檢查圖（2 倍放大）。用法：tools/knight_preview.sh [職業id] [輸出檔]
set -e
JOB=${1:-swordsman}; OUT=${2:-screenshots/劍士_精靈圖.png}; TMP=$(mktemp -d)
npm run build 2>&1 | grep -i "error" && exit 1
sed "s/JOBNAME/$JOB/;s#OUTPATH#$TMP/sheet.png#" tools/act/sheetdump.js > $TMP/sd.js
node tools/shot.mjs _sd $TMP/sd.js > /dev/null 2>&1 || true; rm -f screenshots/_sd.png
python3 - "$TMP/sheet.png" "$OUT" <<'PY'
import sys
from PIL import Image
im=Image.open(sys.argv[1]); W=Image.new('RGB',(192*10,192*3))
for j,r in enumerate((0,1,3)): W.paste(im.crop((0,r*192,1920,r*192+192)),(0,j*192))
W.save(sys.argv[2]); print('saved',sys.argv[2],W.size)
PY
