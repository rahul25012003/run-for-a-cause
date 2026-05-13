---
name: pwa-icon-rebuild
description: Regenerate the PWA PNG icons (192x192 + 512x512 + maskable) from the brand SVG. Use after editing the brand mark or when icons need higher quality.
allowed-tools: PowerShell, Bash
---

# Rebuild PWA icons

Pillow-based generator (already installed in the backend venv).
Output: `frontend/public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`.

## Command

```powershell
cd C:\Users\Rahul\run-for-a-cause
.\backend\.venv\Scripts\python.exe -c @"
from PIL import Image, ImageDraw

def make_icon(size, out, maskable=False):
    img = Image.new('RGB', (size, size), (240, 133, 52))
    d = ImageDraw.Draw(img)
    for i in range(size):
        c = (
            int(240 - (240-201) * i / size),
            int(133 - (133-82) * i / size),
            int(52 - (52-11) * i / size),
        )
        d.line([(0, i), (size, i)], fill=c)
    cx, cy = size / 2, size / 2
    inset = size * 0.30 if maskable else size * 0.20
    d.ellipse(
        [cx - size*0.18, cy - size*0.32, cx - size*0.04, cy - size*0.18],
        fill='white',
    )
    pts = [
        (cx - size*0.22, cy + size*0.18),
        (cx, cy - size*0.05),
        (cx + size*0.06, cy + size*0.05),
        (cx + size*0.22, cy - size*0.10),
        (cx + size*0.10, cy + size*0.30),
        (cx - size*0.10, cy + size*0.30),
    ]
    d.polygon(pts, fill='white')
    img.save(out, 'PNG', optimize=True)
    print(f'wrote {out}')

make_icon(192, 'frontend/public/icon-192.png')
make_icon(512, 'frontend/public/icon-512.png')
make_icon(512, 'frontend/public/icon-maskable-512.png', maskable=True)
"@
```

## After

The `manifest.webmanifest` already references these paths. Reload any
page in Chrome / Edge / Android — DevTools → Application → Manifest →
Icons should show all three.

## When to upgrade

For production, replace this Pillow output with proper Figma exports.
The current generator is "good enough for dev" but a designed icon
ships better in the install prompt.
