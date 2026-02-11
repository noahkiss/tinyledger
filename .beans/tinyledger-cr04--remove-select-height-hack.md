---
# tinyledger-cr04
title: Remove h-[50px] hack on workspace type select
status: pending
type: bug
created_at: 2026-02-11T20:30:00Z
updated_at: 2026-02-11T20:30:00Z
---

Home page (+page.svelte line 104) workspace type select uses `h-[50px]` — an arbitrary pixel value that breaks the spacing grid. This was added to match the adjacent text input height.

Fix: remove `h-[50px]` and use the same `py-3` padding as the text input above it. This achieves the same visual height without a magic number.
