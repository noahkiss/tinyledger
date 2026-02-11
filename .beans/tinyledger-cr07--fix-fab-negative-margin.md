---
# tinyledger-cr07
title: Replace FAB negative margin with transform
status: pending
type: enhancement
created_at: 2026-02-11T20:30:00Z
updated_at: 2026-02-11T20:30:00Z
---

BottomTabBar.svelte line 121: the center add button uses `-mt-4` to float above the tab bar. This is a negative margin hack that disrupts layout flow and extends the hit target outside the nav container.

Replace with `transform: translateY(-1rem)` (Tailwind: `-translate-y-4`) which achieves the same visual result without affecting layout. The parent flex item keeps its natural size.
