---
# tinyledger-tttp
title: Right-align transaction count on mobile
status: completed
type: bug
priority: normal
created_at: 2026-02-14T18:34:43Z
updated_at: 2026-03-24T18:55:35Z
---

In the filter toolbar on mobile, the '# transactions' count text should be right-aligned instead of its current position. Small layout tweak for mobile breakpoint.

## Summary of Changes\nAlready implemented — transaction count uses `ml-auto` with a `flex-1` spacer before it, pushing it to the right. Verified on iPhone 15 emulation.
