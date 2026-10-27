from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / 'docs' / 'art' / 'laolu-v49' / 'source.png'
out = root / 'assets' / 'img'
sheet = Image.open(source).convert('RGBA')
assert sheet.size == (1536, 1024), sheet.size
names = ['idle0', 'idle1', 'cast', 'attack', 'hit', 'down']
for index, pose in enumerate(names):
    x, y = (index % 3) * 512, (index // 3) * 512
    frame = sheet.crop((x, y, x + 512, y + 512))
    alpha = frame.getchannel('A')
    bbox = alpha.getbbox()
    assert bbox, pose
    sprite = frame.crop(bbox)
    ratio = min(450 / sprite.width, 450 / sprite.height)
    sprite = sprite.resize((round(sprite.width * ratio), round(sprite.height * ratio)), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    canvas.alpha_composite(sprite, ((512 - sprite.width) // 2, 474 - sprite.height))
    canvas.save(out / f'laolu_{pose}.webp', 'WEBP', lossless=True, method=6)
    if pose == 'idle0':
        canvas.save(out / 'laolu.webp', 'WEBP', lossless=True, method=6)
