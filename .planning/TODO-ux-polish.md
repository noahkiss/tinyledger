# UX Polish Tasks

**Created:** 2026-02-02
**Context:** Post Phase 6, before Phase 7

These are UX improvements identified during Phase 6 review. Run before Phase 7.

## Tasks

### 1. Active tab indicator
Add visual indicator for current page in navigation tabs.
- File: `src/routes/w/[workspace]/+layout.svelte`
- Add `border-blue-500` or similar to active nav link
- Use `$page.url.pathname` to detect current route

### 2. Transactions sticky header rounded corners
The sticky header on transactions page doesn't have rounded corners like other elements.
- File: `src/routes/w/[workspace]/transactions/+page.svelte`
- Add `rounded-xl` or matching border radius to the sticky header element

### 3. Remove Dashboard, make Transactions the default
Dashboard page has no functionality and isn't scheduled to get any.
- Delete or redirect `/w/[workspace]/` to `/w/[workspace]/transactions`
- Remove "Dashboard" tab from navigation
- Update any links pointing to dashboard

### 4. Settings as cog icon
Replace Settings tab with a cog icon in the header area.
- File: `src/routes/w/[workspace]/+layout.svelte`
- Remove Settings from tab list
- Add cog icon button in header (near workspace selector area)

### 5. Workspace switcher on name/logo click
Make the workspace name/logo area clickable to open the dropdown.
- File: `src/routes/w/[workspace]/+layout.svelte`
- Remove separate "Switch" dropdown button
- Make the workspace logo + name area the dropdown trigger
- Should look/function like a dropdown selector

### 6. Semantic naming for UI elements
Add `data-component` attributes to key elements for easier reference in discussions.
- Pattern: `data-component="header"`, `data-component="nav-tabs"`, etc.
- Apply to: header, nav, main content areas, major components
- Makes it easier to reference specific UI elements

## Command to Run

After `/clear`:
```
Review and implement the UX polish tasks in .planning/TODO-ux-polish.md
```
