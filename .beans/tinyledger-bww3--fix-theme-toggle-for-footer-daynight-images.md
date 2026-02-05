---
# tinyledger-bww3
title: Fix theme toggle for footer day/night images
status: completed
type: bug
created_at: 2026-02-05T19:37:31Z
updated_at: 2026-02-05T19:37:31Z
---

Footer images were not switching between day/night when theme was toggled in settings. Fixed by updating theme.ts to only use .dark class (not .light) and updating app.html to match Tailwind's darkMode: 'selector' configuration.