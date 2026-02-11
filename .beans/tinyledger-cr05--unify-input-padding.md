---
# tinyledger-cr05
title: Unify input padding across forms
status: pending
type: enhancement
created_at: 2026-02-11T20:30:00Z
updated_at: 2026-02-11T20:30:00Z
---

Two input padding patterns exist without a clear reason:
- `px-3 py-2` — new transaction form, filter bar, edit form (compact)
- `px-4 py-3` — settings page, home page (spacious)

Either unify to one padding or formalize both as named variants (compact/default). If keeping both, document the intent in .interface-design/system.md so the choice is explicit rather than accidental.

Recommendation: `px-3 py-2` for inline/toolbar contexts (filter bar), `px-4 py-3` for standalone form pages (settings, create workspace). Standardize the new transaction form and edit form to match their page context.
