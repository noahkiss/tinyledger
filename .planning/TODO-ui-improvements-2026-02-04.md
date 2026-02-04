# UI Improvements - Transactions Page

**Created:** 2026-02-04
**Status:** Complete
**Context:** Post v1.0, ad-hoc UX improvements

## Summary

Multiple UX improvements to the transactions page covering header reorganization, dark mode colors, sorting, filter styling, floating bar layout, and quarterly payment skip feature.

## Implemented Changes

### 1. Fiscal Year Picker in Header
- Moved from transactions sticky bar to main header
- Positioned next to WorkspaceSelector
- Added `compact` prop for shorter "FY 2025" format
- FY selection persists across tab navigation via URL param

**Files:**
- `src/routes/w/[workspace]/+layout.svelte`
- `src/routes/w/[workspace]/+layout.server.ts`
- `src/lib/components/FiscalYearPicker.svelte`

### 2. Dark Mode Color Fixes
- Success: `#22c55e` (green-500) → hover `#16a34a`
- Error: `#ef4444` (red-500) → hover `#dc2626`
- Primary: `#60a5fa` (blue-400) → hover `#3b82f6`
- Fixes readability of Income/Expense buttons with white text

**Files:**
- `src/app.css`

### 3. Transaction Sorting Toggle
- Added `?sort=asc|desc` URL param (default: `asc` = oldest first/chronological)
- Toggle button with Solar sort icons in FilterBar
- Timeline grouping respects sort order

**Files:**
- `src/routes/w/[workspace]/transactions/+page.server.ts`
- `src/routes/w/[workspace]/transactions/+page.svelte`
- `src/lib/components/FilterBar.svelte`

### 4. Methods Dropdown Styling
- Converted native `<select>` to custom dropdown
- Matches Tags dropdown styling with icon and checkmark selection

**Files:**
- `src/lib/components/FilterBar.svelte`

### 5. Date Filter Defaults
- Date inputs show FY start/end when no filters applied
- Added `fyStart` and `fyEnd` props to FilterBar

**Files:**
- `src/lib/components/FilterBar.svelte`
- `src/routes/w/[workspace]/transactions/+page.svelte`

### 6. Floating Summary Bar Rearrangement
- Removed FY picker (moved to header)
- **Mobile**: Icon-based layout with Solar icons: `+$X / -$Y = $Z`
- **Desktop**: Income/Expense on left, Net on right with separator

**Files:**
- `src/routes/w/[workspace]/transactions/+page.svelte`

### 7. Quarterly Payments Skip Feature
- Added `skipped_at` column to `quarterly_payments` table
- "Skip" button appears for past-due unpaid quarters
- Skipped amount rolls forward to next quarter's recommended
- "Skipped" badge and muted styling for skipped quarters

**Files:**
- `src/lib/server/db/schema.ts`
- `src/lib/server/db/migrate.ts`
- `src/routes/w/[workspace]/transactions/+page.server.ts`
- `src/routes/w/[workspace]/taxes/+page.server.ts`
- `src/lib/components/QuarterlyPaymentMarker.svelte`

## Testing Checklist

- [x] Dark mode: Income/Expense buttons have readable white text (verified via CSS)
- [x] FY picker visible in header, persists across tab navigation (verified via code)
- [x] Transactions sticky bar shows mobile icon format on narrow screens (verified via code)
- [x] Sort toggle changes transaction order (oldest first by default) (verified via code)
- [x] Date filters show FY range when cleared (verified via code)
- [x] Methods dropdown matches Tags styling (verified via code)
- [x] Past-due quarterly payments show "Skip" button (verified via code)
- [x] Skipped quarter amount rolls to next quarter display (verified via code)

**Verified:** 2026-02-04 via code review and successful build
