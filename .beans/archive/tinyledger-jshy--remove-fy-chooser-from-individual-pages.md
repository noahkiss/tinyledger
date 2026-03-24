---
# tinyledger-jshy
title: Remove FY chooser from individual pages
status: completed
type: task
priority: normal
created_at: 2026-02-12T20:22:28Z
updated_at: 2026-02-12T20:32:50Z
---

Since the FY chooser exists in the global header, remove duplicate FY selectors from:
- Reports page (FiscalYearPicker component)
- Taxes page (native select)
- Filings page (native select)

Also remove associated handleFYChange functions and unused imports.