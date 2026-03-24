---
# tinyledger-cr03
title: Standardize primary button hover to use theme token
status: completed
type: bug
priority: normal
created_at: 2026-02-11T20:30:00Z
updated_at: 2026-02-11T22:02:39Z
---

Primary buttons use two different hover implementations:
- `hover:bg-primary-hover` (settings save button, most places) — uses the theme token, correct
- `hover:bg-primary/90` (transaction detail Edit/Save buttons) — opacity hack, doesn't match dark mode behavior

Standardize all primary buttons to `hover:bg-primary-hover`. Also check success, error, and warning button hovers for the same `/90` pattern.
