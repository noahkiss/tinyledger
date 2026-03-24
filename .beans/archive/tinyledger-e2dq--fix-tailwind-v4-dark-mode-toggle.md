---
# tinyledger-e2dq
title: Fix Tailwind v4 dark mode toggle
status: completed
type: bug
created_at: 2026-02-05T22:22:07Z
updated_at: 2026-02-05T22:22:07Z
---

dark: utilities (dark:hidden, dark:block) were not responding to .dark class because Tailwind v4 defaults to prefers-color-scheme media queries. Added @custom-variant dark directive to app.css. Also fixed rrule CJS named export error causing 500s on workspace pages.