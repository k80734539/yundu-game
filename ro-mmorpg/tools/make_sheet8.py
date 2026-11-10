#!/usr/bin/env python3
"""把「8 方向轉身圖」（PixelLab 匯出的 8 格 GIF，順序：下、右下、右、右上、上、左上、左、左下）轉成遊戲用的 8 列精靈圖：
   192×192 一格、10 格一列（0~1 站立、2~5 走路、6~9 攻擊）、共 8 列，列的順序為 下、左下、左、左上、上、右上、右、右下。
   轉身圖只有靜態姿勢，所以動作先用程式「晃動」烘進去；之後拿到真正的走路／攻擊動畫，再用 --walk / --attack 取代對應格。
用法：python3 tools/make_sheet8.py 輸入.gif 輸出.png [--scale 2]
"""
import sys
from PIL import Image, ImageSequence
FRAME_ORDER = [0, 7, 6, 5, 4, 3, 2, 1]                      # 列 → 轉身圖的第幾格
FWD = [(0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1), (1, 0), (1, 1)]  # 各列「往前」的畫面方向（攻擊衝刺用）
def main():
    a = [x for x in sys.argv[1:] if not x.startswith('--')]; scale = 2
    if '--scale' in sys.argv: scale = int(sys.argv[sys.argv.index('--scale') + 1])
    src, dst = a[0], a[1]
    frames = [f.convert('RGBA').copy() for f in ImageSequence.Iterator(Image.open(src))]
    assert len(frames) == 8, '需要 8 格轉身圖'
    sheet = Image.new('RGBA', (192 * 10, 192 * 8), (0, 0, 0, 0))
    for row, fi in enumerate(FRAME_ORDER):
        fr = frames[fi]; fr = fr.crop(fr.split()[3].getbbox()); fr = fr.resize((fr.width * scale, fr.height * scale), Image.NEAREST)
        fx, fy = FWD[row]
        for f in range(10):
            dx = dy = 0
            if f < 2: dy = -(f % 2)
            elif f < 6: ph = f - 2; dy = [0, -2, 0, -2][ph]; dx = [-1, 0, 1, 0][ph]
            else: k = [-2, 6, 4, 0][f - 6]; dx = fx * k; dy = fy * k // 2
            cell = Image.new('RGBA', (192, 192), (0, 0, 0, 0))
            cell.alpha_composite(fr, ((192 - fr.width) // 2 + dx, 186 - fr.height + dy))
            sheet.alpha_composite(cell, (f * 192, row * 192))
    sheet.save(dst); print('已輸出', dst, sheet.size)
main()
