---
type: task
status: done
title: Implement Catppuccin Color System
parent: tinyledger-0001
---

# Implement Catppuccin Color System

Set up CSS custom properties for Catppuccin Mocha (dark) and Latte (light) palettes with semantic color roles.

## Tasks
- [x] Add CSS variables for Catppuccin colors in `app.css`
- [x] Define semantic roles (background, foreground, muted, surface, primary, success, warning, error, accent, subtle)
- [x] Set up media query for `prefers-color-scheme`
- [x] Create `.light` / `.dark` class overrides for manual toggle
- [x] Update Tailwind config to use CSS variables
- [x] Migrate all components from hardcoded gray/blue to semantic tokens

## Color Mapping

| Role | Mocha (Dark) | Latte (Light) |
|------|--------------|---------------|
| Background | `#1e1e2e` | `#eff1f5` |
| Foreground | `#cdd6f4` | `#4c4f69` |
| Muted | `#a6adc8` | `#acb0be` |
| Surface | `#353748` | `#d8dae1` |
| Primary | `#89b4fa` | `#1e66f5` |
| Success | `#a6e3a1` | `#40a02b` |
| Warning | `#f9e2af` | `#df8e1d` |
| Error | `#f38ba8` | `#d20f39` |
| Accent | `#f5c2e7` | `#ea76cb` |
| Subtle | `#94e2d5` | `#179299` |

## Files Modified
- `src/app.css` - CSS variables and @theme block
- 31 component/page files - migrated from hardcoded colors to semantic tokens

## Notes
- Kept Tailwind utility class approach (still have class explosion)
- Future consideration: migrate to Pico/Bulma per design.md guidelines
- Commit: df60813
