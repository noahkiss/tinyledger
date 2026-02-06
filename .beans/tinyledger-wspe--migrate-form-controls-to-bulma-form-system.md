---
# tinyledger-wspe
title: Migrate form controls to Bulma form system
status: todo
type: task
priority: normal
created_at: 2026-02-06T05:02:08Z
updated_at: 2026-02-06T05:03:27Z
parent: tinyledger-a05a
blocking:
    - tinyledger-e7kb
---

# Form Controls Migration

Convert all form inputs from Tailwind utility styling to Bulma's field/control/input system. This is high-leverage — the same input pattern repeats across many pages.

## Tasks
- [ ] Define base form styling that bridges Bulma forms with Catppuccin colors
  - `.input`, `.select`, `.textarea` colors via Sass overrides or CSS layer
  - Focus states: Bulma uses box-shadow focus by default — customize to match current ring style or adopt Bulma's
  - Placeholder text color
- [ ] Convert CurrencyInput.svelte
  - Use Bulma `.control.has-icons-left` for the $ prefix
  - Replace manual absolute-positioned prefix with Bulma's icon pattern
- [ ] Convert DateInput.svelte to `.field > .control > .input`
- [ ] Convert PayeeAutocomplete.svelte
  - Use Bulma `.dropdown` for autocomplete suggestions
  - Keep existing logic, replace Tailwind positioning classes
- [ ] Convert PaymentMethodSelect.svelte to Bulma `.select` or `.radio` group
- [ ] Convert TagSelector.svelte
  - Allocation rows: Bulma `.field.has-addons` or `.field.is-grouped`
  - Percentage input + select combo
- [ ] Convert AttachmentUpload.svelte to Bulma `.file` component
  - Bulma has a native file upload component with icon + label
- [ ] Convert FilterBar.svelte
  - Search input to Bulma `.input` with icon
  - Filter dropdowns to Bulma `.dropdown`
  - Active filter tags to Bulma `.tag` with `.delete`
  - This is a complex component (35 classes) — take care with responsive behavior
- [ ] Convert FiscalYearPicker.svelte to Bulma `.select` + `.button`
- [ ] Convert GranularityToggle.svelte to Bulma `.buttons.has-addons`

## Pattern Reference
Current Tailwind input pattern:
```
w-full rounded-lg border border-input-border bg-input px-4 py-3 text-fg 
placeholder-muted focus:border-input-focus focus:outline-none focus:ring-2 focus:ring-primary
```

Bulma equivalent:
```html
<div class="field">
  <label class="label">Amount</label>
  <div class="control">
    <input class="input" type="text">
  </div>
</div>
```

## Notes
- Bulma forms are opinionated about structure (field > control > input) — respect this
- `.is-grouped` and `.has-addons` cover most multi-input patterns
- Horizontal forms use `.field.is-horizontal` with `.field-label` + `.field-body`