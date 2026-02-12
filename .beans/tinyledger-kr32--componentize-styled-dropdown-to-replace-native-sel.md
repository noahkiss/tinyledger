---
# tinyledger-kr32
title: Componentize styled dropdown to replace native selects
status: completed
type: task
priority: normal
created_at: 2026-02-12T20:22:35Z
updated_at: 2026-02-12T20:32:50Z
---

Create a reusable Select.svelte component based on the FiscalYearPicker dropdown style (custom button-based with styled dropdown panel, not native OS select). Replace all native <select> elements throughout the app:

## Checklist
- [x] Create Select.svelte component with sm/md size variants
- [x] Replace GranularityToggle native select
- [x] Replace TagSelector native select
- [x] Replace Settings page native selects (workspace type, FY start month, state, federal bracket)
- [x] Replace root page workspace type native select
- [x] Ensure form submission still works via hidden inputs
- [x] Replace QuickEntryForm tag select
- [x] Replace recurring page frequency/custom unit selects
- [x] Replace import page column mapping selects (8 selects)
- [x] Replace import page tag mapping inline select
- [x] Replace settings/tags merge dialog target select
