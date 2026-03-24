---
# tinyledger-dulv
title: Custom dropdowns should scroll when taller than viewport
status: completed
type: bug
priority: normal
created_at: 2026-02-14T18:33:25Z
updated_at: 2026-03-24T18:55:32Z
---

Custom dropdown components (Select, tag picker, etc.) don't support scrolling when their content exceeds available screen height. Should cap max-height relative to viewport and scroll overflow.

## Summary of Changes\nAlready implemented — DropdownPanel uses `max-h-[min(15rem,50vh)] overflow-y-auto` which caps height and scrolls. Verified with 29 tags in the Tags filter dropdown.
