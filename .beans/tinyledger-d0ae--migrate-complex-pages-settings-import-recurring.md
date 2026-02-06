---
# tinyledger-d0ae
title: 'Migrate complex pages: settings, import, recurring'
status: todo
type: task
priority: normal
created_at: 2026-02-06T05:02:58Z
updated_at: 2026-02-06T05:03:28Z
parent: tinyledger-a05a
blocking:
    - tinyledger-40p9
    - tinyledger-wspe
    - tinyledger-qj81
    - tinyledger-nxkc
---

# Complex Page Migration

The three heaviest pages by Tailwind class count. These combine layout, forms, cards, modals, and responsive patterns — best tackled after the component-level beans are done.

## Tasks

### Settings Page (136 classes)
- [ ] Convert section layout to Bulma `.box` containers per settings group
- [ ] Convert form sections to Bulma field/control/input (from forms bean)
- [ ] Convert grid layouts to Bulma `.columns` or `.fixed-grid`
- [ ] Convert tax bracket help table to Bulma `.table`
- [ ] Convert expandable details sections
- [ ] Convert theme toggle button group
- [ ] Convert warning messages to Bulma `.notification.is-warning`
- [ ] Verify all settings save correctly post-migration

### Import Wizard Page (137 classes)
- [ ] Convert step progress indicator
  - Consider Bulma `.steps` (if using bulma-steps extension) or custom
- [ ] Convert file upload step to Bulma `.file` component
- [ ] Convert mapping/preview step with Bulma `.table`
- [ ] Convert column mapping dropdowns to Bulma `.select`
- [ ] Convert tag assignment UI (radio + select combos)
- [ ] Convert results summary with Bulma `.notification` + `.box`
- [ ] Convert responsive grid (3-col status summary) to Bulma `.columns`

### Recurring Templates Page (77 classes)
- [ ] Convert template creation form to Bulma form system
- [ ] Convert toggle buttons (income/expense) to `.buttons.has-addons`
- [ ] Convert RRule pattern section to Bulma `.box`
- [ ] Convert template card list
- [ ] Convert action buttons (edit, pause, delete) to Bulma `.button` variants

### Other Pages
- [ ] Transactions list page (41 classes) — timeline layout, grid buttons, sticky header
- [ ] Transaction detail/edit page (61 classes) — card layout, edit/view toggle, receipt preview
- [ ] Transaction history page (18 classes) — timeline visualization
- [ ] Reports page (21 classes) — header, grid cards, chart containers
- [ ] Taxes page (27 classes) — config state, grid cards, select dropdowns
- [ ] Filings page (23 classes) — status summary, grid cards
- [ ] New transaction page (21 classes) — form layout

## Notes
- Work through these AFTER the component-level beans (forms, cards, buttons, modals) are complete
- The component beans establish the patterns; this bean applies them to full pages
- Test each page individually after migration — both desktop and mobile viewports
- The transaction timeline is custom (vertical line + dots) — will need custom CSS regardless