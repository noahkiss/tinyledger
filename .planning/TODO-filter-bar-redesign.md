# Filter Bar Redesign

**Created:** 2026-02-04
**Status:** Complete
**Depends on:** TODO-ui-improvements-2026-02-04.md (complete)

## Quick Fixes

### 1. Sort Icon Size
- ✅ Verified: Sort toggle icon already uses 16x16, same as Tags/Methods

### 2. FY Dropdown Styling
- ✅ **Completed 2026-02-04**: Converted from native `<select>` to custom dropdown
- Calendar icon + text + chevron trigger
- Click-outside handling to close
- Checkmark indicator for selected year
- Matches WorkspaceSelector styling pattern

**Files:** `src/lib/components/FiscalYearPicker.svelte`

---

## Filter Row Redesign

### 1. Date Range "Pill" Style
- ✅ **Completed 2026-02-04**: Date inputs converted to dropdown pill
- Calendar icon + compact date range display (e.g., "Jan 1 - Dec 31")
- Dropdown contains From/To date inputs
- "Clear dates" button when filter is active
- Highlights with primary color when filter is active

### 2. Unified Filter Bar
- ✅ **Completed 2026-02-04**: Second row wrapped in card container
- Rounded corners, border, card background
- Vertical dividers between filter groups
- Elements use consistent inner padding/rounding
- Clear button pushed to right edge

### 3. Collapsible Search
- ✅ **Completed 2026-02-04**: Search collapses to icon button
- Click expands to full input field
- Auto-focuses on expand
- Collapses on blur/click-outside when empty
- Stays expanded if search term is present

### 4. Mobile Layout
- ✅ **Completed 2026-02-04**: Implemented Option A variant
- Row 1: Type buttons + collapsible search + count
- Row 2: Icon-only filters on mobile (labels hidden via `hidden sm:inline`)
- Filter bar wraps naturally on narrow screens

**Files:** `src/lib/components/FilterBar.svelte`

---

## Summary

All proposed changes have been implemented:
- Unified card-style filter bar container
- Date range as dropdown pill with compact display
- Collapsible search (icon-only when empty)
- Mobile-friendly layout with responsive text hiding
- Consistent styling across all filter elements
