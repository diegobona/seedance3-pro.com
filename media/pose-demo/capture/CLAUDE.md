# AI Creative Studio | SEEDANCE 3.0

Source: http://localhost:4310/app?model=pose-to-image

To create a video from this capture, use the `product-launch-video` skill.

## What's in This Capture

| File | Contents |
|------|----------|
| `screenshots/contact-sheet.jpg` | **View this first.** All scroll screenshots in labeled grid — see the entire page at a glance |
| `screenshots/scroll-*.png` | Individual viewport screenshots if you need detail on a specific section. |
| `extracted/tokens.json` | Design tokens: 20 colors, 1 fonts, 4 headings, 0 CTAs |
| `extracted/design-styles.json` | Computed styles from live DOM: typography hierarchy, button/card/nav styles, spacing scale, border-radius, box shadows. Primary data source for DESIGN.md. |
| `extracted/asset-descriptions.md` | One-line description of every downloaded asset. Read this for asset selection — only open individual files for safe-zone checking. |
| `extracted/visible-text.txt` | Page text in DOM order, prefixed with HTML tag (`[h1]`, `[p]`, `[a]`). Use as context — rephrase freely. |
| `extracted/shaders.json` | WebGL shader source (GLSL). |
| `assets/contact-sheet.jpg` | All downloaded images in one labeled grid. |
| `assets/svgs/contact-sheet.jpg` | SVGs rendered as thumbnails in labeled grid |
| `assets/` | Individual downloaded images, SVGs, and font files. |

## Brand Summary

- **Colors**: #F5F3ED (bg-light), #090A0C (bg-dark), #D8FF73 (bg-light), #FFFFFF (bg-light), #0D0F12 (surface-dark), #121419 (surface-dark), #AAA9A5 (neutral), #000000 (bg-dark), #747570 (neutral), #17190F (surface-dark)
- **Fonts**: Inter (400,700,750,760,800,850,900)
