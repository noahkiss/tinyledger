---
# tinyledger-0hxx
title: Fix iOS home screen icon and favicon paths
status: completed
type: bug
created_at: 2026-02-05T19:38:05Z
updated_at: 2026-02-05T19:38:05Z
---

iOS was showing blank icon when adding app to home screen. Fixed by updating app.html to use correct paths (/apple-touch-icon.png instead of /icons/icon-180.png, /favicon.ico for favicon) and updated apple-mobile-web-app-title to 'TinyLedger'.