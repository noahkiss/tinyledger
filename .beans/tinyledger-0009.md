---
type: task
status: done
title: Component Polish Pass
parent: tinyledger-0001
---

# Component Polish Pass

Systematically update individual components to use new color system and patterns.

## Components to Update

### High Priority (user-facing daily)
- [x] `TimelineEntry.svelte` - Transaction cards
- [x] `FilterBar.svelte` - Filter controls
- [x] `transactions/+page.svelte` - Main page (header, buttons, empty state)
- [ ] `FiscalYearPicker.svelte` - Year selector (future pass)
- [ ] `SummaryCard.svelte` - Dashboard stats (future pass)
- [ ] `CurrencyInput.svelte` - Amount entry (future pass)

### Medium Priority
- [ ] `TagSelector.svelte` - Tag pills and selection (future pass)
- [ ] `PayeeAutocomplete.svelte` - Autocomplete dropdown (future pass)
- [ ] `DateInput.svelte` - Date picker styling (future pass)
- [ ] `PaymentMethodSelect.svelte` - Dropdown styling (future pass)
- [ ] `WorkspaceSelector.svelte` - Workspace switcher (future pass)

### Lower Priority
- [ ] Remaining components (future pass)

## Per-Component Checklist
- [x] Uses semantic color variables (not hardcoded colors)
- [x] Uses Solar icons (no inline SVGs)
- [x] Has appropriate data-* attributes
- [x] Works in both light and dark mode
- [x] Hover states don't cause layout shift
- [x] Touch targets >= 44px where applicable

## Notes
Core components updated with semantic tokens. Remaining components can be updated incrementally.
