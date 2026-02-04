---
type: task
status: done
title: Update Favicon and Branding
parent: tinyledger-0001
---

# Update Favicon and Branding

Replace any default favicons with proper TinyLedger branding.

## Tasks
- [x] Design/generate TinyLedger logo icon (use /image skill)
- [x] Generate favicon set via RealFaviconGenerator
- [x] Add `favicon.ico` (multi-size)
- [x] Add `apple-touch-icon.png` (180x180)
- [x] Create `site.webmanifest` with app metadata
- [x] Update `<head>` in `app.html` with all favicon links
- [x] Set proper `<title>` and `apple-mobile-web-app-title`

## Notes
- Replaced Svelte logo favicon with custom L monogram
- Updated colors to Catppuccin palette (#1e66f5 primary, #eff1f5 background)
- PNG icons already existed, updated SVG sources and manifest colors

## Logo Concept
TinyLedger - consider:
- Minimalist ledger book icon
- Small/tiny motif (the "tiny" in TinyLedger)
- Works in both light and dark contexts
- Clean geometric style per manifesto

## Files to Modify
- `static/` - Add favicon files
- `src/app.html` - Update `<head>` links

## Favicon Files Needed
```
static/
  favicon.ico
  favicon-16x16.png
  favicon-32x32.png
  apple-touch-icon.png
  android-chrome-192x192.png
  android-chrome-512x512.png
  site.webmanifest
```
