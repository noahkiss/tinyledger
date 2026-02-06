---
# tinyledger-qj81
title: Migrate cards, buttons, and content blocks to Bulma
status: todo
type: task
priority: normal
created_at: 2026-02-06T05:02:26Z
updated_at: 2026-02-06T05:03:28Z
parent: tinyledger-a05a
blocking:
    - tinyledger-e7kb
---

# Cards, Buttons & Content Blocks Migration

Convert repeated card/button/badge patterns from Tailwind utilities to Bulma semantic components.

## Tasks

### Buttons
- [ ] Define button color mapping in Sass:
  - Primary action → `.button.is-primary`
  - Secondary/outline → `.button.is-outlined` or `.button.is-light`
  - Danger → `.button.is-danger`
  - Success (income) → `.button.is-success`
  - Small buttons → `.button.is-small`
  - Full-width → `.button.is-fullwidth`
- [ ] Convert all `<button>` and `<a>` styled as buttons across all pages
- [ ] Convert button groups to `.buttons.has-addons` where applicable

### Cards
- [ ] Map current card pattern to Bulma:
  - Simple cards (`rounded-lg border bg-card p-4 shadow-sm`) → `.box`
  - Structured cards (header + content + footer) → `.card` with subclasses
  - Hero/summary cards (gradient bg) → `.box` with custom gradient class
- [ ] Convert SummaryCard.svelte — hero variant uses gradient, default uses `.box`
- [ ] Convert TimelineEntry.svelte — link card with hover states
- [ ] Convert FilingCard.svelte — card with embedded form
- [ ] Convert TaxBreakdownCard.svelte — card with tabular content
- [ ] Convert QuarterlyPaymentMarker.svelte — status card with color indicators

### Badges & Tags
- [ ] Convert status badges to Bulma `.tag`
  - Voided → `.tag.is-danger`
  - Income → `.tag.is-success`
  - Expense → `.tag.is-warning` or `.tag.is-danger`
  - Category tags → `.tag` with custom colors
- [ ] Convert `rounded-full px-3 py-1` badge pattern to `.tag.is-rounded`

### Tables
- [ ] Convert settings tax bracket table to Bulma `.table`
- [ ] Convert import preview tables to Bulma `.table.is-striped`
- [ ] Convert transaction history detail tables

### Notifications
- [ ] Convert warning banners (yellow) to Bulma `.notification.is-warning`
- [ ] Convert info/disclaimer banners to Bulma `.notification.is-info`

## Notes
- Bulma `.box` is the closest to current card pattern — rounded, padded, shadowed
- `.card` is more structured (header/content/footer) — use when card has distinct sections
- Button sizing and colors are very well-covered by Bulma natively