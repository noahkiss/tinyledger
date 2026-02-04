# Filter Bar Redesign

**Created:** 2026-02-04
**Status:** Planned
**Depends on:** TODO-ui-improvements-2026-02-04.md (in testing)

## Quick Fixes

### 1. Sort Icon Size
- Sort toggle icon is slightly smaller than neighbors
- Match size to Tags/Methods dropdown icons (16x16)

### 2. FY Dropdown Styling
- Convert from native `<select>` to custom dropdown (like All Methods)
- Match height of WorkspaceSelector
- Use same styling pattern: icon + text + chevron

**Files:** `src/lib/components/FiscalYearPicker.svelte`, `src/routes/w/[workspace]/+layout.svelte`

---

## Filter Row Redesign

### Current State
- Row is left-weighted with loose elements
- Tags dropdown | Date inputs | Methods dropdown | Sort toggle | Clear
- Search bar on separate row above

### Proposed Changes

#### 1. Date Range "Pill" Style
- Wrap date inputs in styled container (like Tags/Methods buttons)
- Calendar icon on far left
- Icon divider between from/to dates (instead of dash)
- Same border/bg treatment as other filter buttons

```
[📅 2025-01-01 | 2025-12-31 ▼]
```

#### 2. Unified Filter Bar
- Style entire row as a contained bar (similar to income/expense summary bar)
- Rounded corners, subtle border, card background
- Elements evenly distributed or grouped logically

#### 3. Collapsible Search
- Search starts as icon-only button
- Click expands input, pushes/minimizes other elements
- Click away or blur collapses back to icon
- Keeps filter row cleaner when not searching

#### 4. Mobile Layout Options

**Option A: Two Rows**
- Row 1: Type buttons (All/Income/Expense) + Search icon
- Row 2: Tags | Dates | Methods | Sort

**Option B: Icon-Only**
- All filters collapse to icons on mobile
- Tap to expand each filter
- Could use bottom sheet for filter options

**Option C: Hybrid**
- Type buttons stay visible
- Other filters collapse to "Filters" button
- Opens filter panel/sheet with all options

---

## Visual Reference

### Desktop
```
┌─────────────────────────────────────────────────────────────────┐
│ [All] [Income] [Expense]  [🔍]  [🏷 Tags ▼] [📅 Jan 1 | Dec 31] [💳 All ▼] [↕] │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile (Option A)
```
┌─────────────────────────────┐
│ [All] [Income] [Expense] [🔍]│
├─────────────────────────────┤
│ [🏷] [📅] [💳] [↕] [✕ Clear] │
└─────────────────────────────┘
```

---

## Implementation Notes

- Use same dropdown pattern established for Methods
- Consider `click-outside` directive for search collapse
- Date pill may need custom component or wrapper
- Test touch targets on mobile (44px minimum)
- Respect existing URL param behavior for all filters

## Files to Modify

- `src/lib/components/FilterBar.svelte` - Main redesign
- `src/lib/components/FiscalYearPicker.svelte` - Custom dropdown conversion
- `src/routes/w/[workspace]/+layout.svelte` - FY picker height matching
- `src/app.css` - Any new utility classes if needed
