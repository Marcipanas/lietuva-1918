"""Regenerate the PWA icons: an isometric tile with a white church and a red roof on dark pine, with the tricolour.
Run: python3 tools/make-icons.py  (needs Pillow)"""
from PIL import Image, ImageDraw
def icon(size, maskable=False):
    s = size; im = Image.new('RGBA', (s, s), (15, 33, 29, 255)); d = ImageDraw.Draw(im)
    pad = s * (0.18 if maskable else 0.08)
    if not maskable:
        im = Image.new('RGBA', (s, s), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=(15, 33, 29, 255))
    cx, cy, w = s / 2, s * 0.6, (s - 2 * pad) * 0.5
    d.polygon([(cx, cy - w / 2), (cx + w, cy), (cx, cy + w / 2), (cx - w, cy)], fill=(137, 174, 99, 255))
    u = w / 6
    # nave
    d.polygon([(cx - 2.2 * u, cy - 0.2 * u), (cx, cy + 0.9 * u), (cx, cy - 1.6 * u), (cx - 2.2 * u, cy - 2.7 * u)], fill=(221, 214, 200, 255))
    d.polygon([(cx, cy + 0.9 * u), (cx + 1.4 * u, cy + 0.2 * u), (cx + 1.4 * u, cy - 2.3 * u), (cx, cy - 1.6 * u)], fill=(239, 234, 224, 255))
    d.polygon([(cx - 2.2 * u, cy - 2.7 * u), (cx, cy - 1.6 * u), (cx + 1.4 * u, cy - 2.3 * u), (cx - 0.6 * u, cy - 3.9 * u)], fill=(154, 59, 44, 255))
    # tower and spire
    d.polygon([(cx + 0.5 * u, cy - 1.0 * u), (cx + 1.3 * u, cy - 0.6 * u), (cx + 1.3 * u, cy - 4.6 * u), (cx + 0.5 * u, cy - 5.0 * u)], fill=(242, 237, 227, 255))
    d.polygon([(cx + 0.5 * u, cy - 5.0 * u), (cx + 1.3 * u, cy - 4.6 * u), (cx + 0.95 * u, cy - 7.4 * u)], fill=(100, 146, 122, 255))
    # tricolour
    bw, bh, bx, by = s * 0.42, s * 0.035, cx - s * 0.21, s * (0.16 if maskable else 0.12)
    for n, c in enumerate([(253, 185, 19), (15, 123, 79), (193, 39, 45)]):
        d.rectangle([bx, by + n * bh, bx + bw, by + (n + 1) * bh], fill=c + (255,))
    return im
icon(192).save('icons/icon-192.png'); icon(512).save('icons/icon-512.png')
icon(512, True).save('icons/icon-maskable-512.png'); icon(180, True).convert('RGB').save('icons/apple-touch-icon.png')
print('icons written')
