---
type: task
status: done
title: Replace FAB with Bottom Tab Bar
parent: tinyledger-0001
---

# Replace FAB with Bottom Tab Bar

Remove the floating action button and implement mobile-friendly bottom navigation following Ionic patterns.

## Why
The frontend-design manifesto explicitly calls out FABs as an anti-pattern ("No floating action buttons in bottom-right (ugly)"). Bottom tab bars provide better mobile UX.

## Tasks
- [x] Remove `QuickEntryFAB.svelte` component
- [x] Create `BottomTabBar.svelte` component
- [x] Move navigation from header tabs to bottom bar on mobile
- [x] Add quick-add actions to bottom bar (Income/Expense buttons)
- [x] Keep header tabs on desktop (responsive breakpoint)
- [x] Update layout to account for fixed bottom bar height

## Bottom Tab Structure
```
[ Transactions ] [ Reports ] [ + Add ] [ Taxes ] [ Settings ]
```

The center "Add" tab can open a modal/sheet for income/expense choice, or directly go to new transaction.

## Files to Modify
- `src/lib/components/QuickEntryFAB.svelte` - Delete
- `src/lib/components/BottomTabBar.svelte` - Create
- `src/routes/w/[workspace]/+layout.svelte` - Integrate bottom bar
- `src/routes/w/[workspace]/transactions/+page.svelte` - Remove FAB usage

## Responsive Behavior
- Mobile (<768px): Bottom tab bar, hide header nav tabs
- Desktop (>=768px): Header tabs, no bottom bar

## Notes
- Touch targets must be 44x44px minimum
- Consider safe area insets for iOS (env(safe-area-inset-bottom))
