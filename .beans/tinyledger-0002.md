---
type: task
status: todo
title: Implement Catppuccin Color System
parent: tinyledger-0001
---

# Implement Catppuccin Color System

Set up CSS custom properties for Catppuccin Mocha (dark) and Latte (light) palettes with semantic color roles.

## Tasks
- [ ] Add CSS variables for Catppuccin colors in `app.css`
- [ ] Define semantic roles (background, foreground, muted, surface, primary, success, warning, error, accent, subtle)
- [ ] Set up media query for `prefers-color-scheme`
- [ ] Create `.light` / `.dark` class overrides for manual toggle
- [ ] Update Tailwind config to use CSS variables

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

## Files to Modify
- `src/app.css` - Add CSS variables
- `tailwind.config.js` - Reference CSS variables
- `src/app.html` - Add script for theme detection

## Notes
- Keep existing Tailwind for layout utilities (flex, grid, spacing)
- Replace color utilities with semantic classes
