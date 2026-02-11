---
# tinyledger-cr02
title: Standardize focus ring treatment across all inputs
status: pending
type: bug
created_at: 2026-02-11T20:30:00Z
updated_at: 2026-02-11T20:30:00Z
---

Three different focus ring patterns are used for form inputs:
1. `focus:ring-1 focus:ring-primary` — FilterBar, taxes, filings inputs
2. `focus:ring-2 focus:ring-primary` — settings page inputs
3. `focus:ring-2 focus:ring-input-focus/50` — home page inputs

Pick one and apply everywhere. Recommendation: `focus:ring-2 focus:ring-primary/50` — visible enough for a11y, subtle enough to not dominate. Update all input, select, and textarea focus states to match.
