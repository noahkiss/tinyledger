---
# tinyledger-3ks7
title: Mobile filter panel opens off-screen — rethink as inline panel
status: completed
type: bug
priority: normal
created_at: 2026-02-14T18:34:06Z
updated_at: 2026-03-24T18:55:33Z
---

On mobile, the Filters button opens its dropdown panel halfway off-screen (positioned absolute from the button). Should behave more like the search bar — open as an inline panel below the filter toolbar that stays fully visible while the user is filtering. Similar pattern to how search sub-toolbar works.

## Summary of Changes\nAlready implemented — mobile filter panel renders inline below the toolbar (not absolute positioned). Tags section has `max-h-[min(8rem,30vh)] overflow-auto` for scrolling. Verified on iPhone 15 emulation.
