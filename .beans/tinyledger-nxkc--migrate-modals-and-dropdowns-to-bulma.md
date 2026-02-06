---
# tinyledger-nxkc
title: Migrate modals and dropdowns to Bulma
status: todo
type: task
priority: normal
created_at: 2026-02-06T05:02:38Z
updated_at: 2026-02-06T05:03:28Z
parent: tinyledger-a05a
blocking:
    - tinyledger-e7kb
---

# Modals & Dropdowns Migration

Convert overlay components from manual Tailwind positioning to Bulma's built-in modal and dropdown components.

## Tasks
- [ ] Convert tag management modal (settings/tags/+page.svelte) to Bulma `.modal`
  - `.modal-background` for overlay
  - `.modal-card` with `.modal-card-head`, `.modal-card-body`, `.modal-card-foot`
  - Delete button → `.delete` element in header
- [ ] Convert merge tag dialog to Bulma `.modal`
- [ ] Convert QuickEntryForm modal to Bulma `.modal`
- [ ] Convert void/delete confirmation dialogs to Bulma `.modal`
- [ ] Convert FilterBar dropdown menus to Bulma `.dropdown`
  - `.dropdown-trigger` for the button
  - `.dropdown-menu` > `.dropdown-content` > `.dropdown-item` for options
  - Active state: `.is-active` on `.dropdown` container
- [ ] Convert WorkspaceSelector dropdown to Bulma `.dropdown`

## Pattern Reference
Current modal pattern:
```html
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
  <div class="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
```

Bulma equivalent:
```html
<div class="modal is-active">
  <div class="modal-background"></div>
  <div class="modal-card">
    <header class="modal-card-head">...</header>
    <section class="modal-card-body">...</section>
    <footer class="modal-card-foot">...</footer>
  </div>
</div>
```

## Notes
- Bulma modals are controlled via `.is-active` class — works well with Svelte reactivity
- Dropdowns also use `.is-active` toggle — replace any click-outside logic or keep existing
- Bulma modals include built-in centering and backdrop — removes need for custom positioning
- Z-index is handled by Bulma for both modals and dropdowns