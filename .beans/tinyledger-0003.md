---
type: task
status: todo
title: Migrate to Solar Icons via Iconify
parent: tinyledger-0001
---

# Migrate to Solar Icons via Iconify

Replace all inline SVG icons with Solar icon set via Iconify web component for consistency.

## Tasks
- [ ] Add Iconify script to `app.html`
- [ ] Audit all inline SVGs across components and pages
- [ ] Replace each with equivalent Solar icon (bold variant)
- [ ] Ensure consistent sizing (w-5 h-5 for nav, w-6 h-6 for actions)
- [ ] Remove unused SVG code

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

## Files to Modify
- `src/app.html` - Add Iconify script
- All `.svelte` files containing `<svg>` elements
- Components: TimelineEntry, QuickEntryFAB, FilterBar, FiscalYearPicker, etc.

## Notes
- Use `<iconify-icon>` web component, not SVG sprites
- Keep Solar bold variant throughout for consistency
- Reference: https://icon-sets.iconify.design/solar/
