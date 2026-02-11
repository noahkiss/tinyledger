---
# tinyledger-cr01
title: Fix dead hover states on primary-colored links
status: pending
type: bug
created_at: 2026-02-11T20:30:00Z
updated_at: 2026-02-11T20:30:00Z
---

Multiple links use `hover:text-primary` on elements already colored `text-primary`, making the hover state invisible. These are effectively broken interactive cues.

Locations:
- settings/+page.svelte lines 395, 510, 566, 598 — tax form links, "How to choose?" button
- transactions/[id]/+page.svelte lines 149, 321, 389 — "Back to Transactions", "View History", attachment links

Fix: change hover to `hover:text-primary-hover` or add `hover:underline` to provide visible feedback.
