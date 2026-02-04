---
type: task
status: done
title: Migrate to Solar Icons via Iconify
parent: tinyledger-0001
---

# Migrate to Solar Icons via Iconify

Replace all inline SVG icons with Solar icon set via Iconify web component for consistency.

## Tasks
- [x] Add Iconify script to `app.html`
- [x] Audit all inline SVGs across components and pages
- [x] Replace each with equivalent Solar icon (bold variant)
- [x] Ensure consistent sizing (w-5 h-5 for nav, w-6 h-6 for actions)
- [x] Remove unused SVG code

## Icon Mapping (examples)

| Current Usage | Solar Icon |
|---------------|------------|
| Plus (+) for income | `solar:add-circle-bold` |
| Minus (-) for expense | `solar:minus-circle-bold` |
| Settings cog | `solar:settings-bold` |
| Document/receipt | `solar:document-bold` |
| Filter | `solar:filter-bold` |
| Calendar | `solar:calendar-bold` |
| Check/confirm | `solar:check-circle-bold` |
| Trash/delete | `solar:trash-bin-bold` |
| Edit/pencil | `solar:pen-bold` |
| Search | `solar:magnifer-bold` |

## Files Modified
- `src/app.html` - Added Iconify script
- All components now use `<iconify-icon>` web component
- No inline SVGs remaining

## Notes
- Using Solar bold variant throughout for consistency
- Commit: 5be4999
