---
# tinyledger-fgtc
title: 'Fix: editing transactions drops tag allocations'
status: completed
type: bug
created_at: 2026-03-24T18:55:46Z
updated_at: 2026-03-24T18:55:46Z
---

TagSelector component didn't pass name prop to Select, so hidden tag_X form fields were never rendered. Server-side edit action received no tag data and wiped all tag allocations on save.

## Summary of Changes
Added `name="tag_{i}"` to the Select component in TagSelector.svelte (line 140). This generates the hidden `<input name="tag_0" ...>` field that the form action expects. Verified end-to-end: tag persists through edit → save round-trip.
