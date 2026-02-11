---
# tinyledger-cr08
title: Replace bottom-24 magic number in add menu positioning
status: pending
type: enhancement
created_at: 2026-02-11T20:30:00Z
updated_at: 2026-02-11T20:30:00Z
---

BottomTabBar.svelte line 160: the add transaction menu uses `fixed bottom-24` which hardcodes the tab bar height. If the bar height changes (safe-area-inset, tab count, font scaling), the menu position breaks silently.

Consider anchoring the menu relative to the nav bar element rather than using a magic pixel value, or define the tab bar height as a CSS custom variable that both the bar and menu reference.
