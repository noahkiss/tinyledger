---
# tinyledger-cr06
title: Extract shared click-outside Svelte action
status: completed
type: enhancement
priority: normal
created_at: 2026-02-11T20:30:00Z
updated_at: 2026-02-11T22:06:42Z
---

Click-outside handling is repeated 3+ times with slight variations:
- WorkspaceSelector: `document.addEventListener('click', handleClickOutside)` in `$effect()`
- FilterBar: same pattern for tag, date, and method dropdowns (plus search)
- FiscalYearPicker: same pattern

Extract to a shared Svelte action (e.g., `$lib/actions/clickOutside.ts`) that can be used as `use:clickOutside={() => isOpen = false}`. Reduces ~30 lines of duplicated logic per component.
