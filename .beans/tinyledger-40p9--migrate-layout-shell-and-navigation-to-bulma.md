---
# tinyledger-40p9
title: Migrate layout shell and navigation to Bulma
status: todo
type: task
priority: normal
created_at: 2026-02-06T05:01:47Z
updated_at: 2026-02-06T05:03:27Z
parent: tinyledger-a05a
blocking:
    - tinyledger-e7kb
---

# Layout & Navigation Migration

Convert the app shell — workspace layout, navbar, bottom tab bar, page containers — to Bulma components.

## Tasks
- [ ] Convert workspace layout header to Bulma `.navbar`
  - `.navbar-brand` for workspace logo/selector
  - `.navbar-end` for theme toggle + settings icon
  - Preserve sticky behavior
- [ ] Convert tab navigation to Bulma `.tabs`
  - Desktop: horizontal tabs under navbar
  - Active state styling with Catppuccin primary color
- [ ] Convert BottomTabBar to Bulma-compatible
  - Bulma doesn't have a native bottom bar — keep as custom component
  - Replace Tailwind utilities with Bulma helpers + custom CSS
  - Preserve safe-area-inset-bottom for iOS
  - Keep `is-hidden-desktop` / `is-hidden-touch` responsive visibility
- [ ] Convert page containers to Bulma `.container` + `.section`
  - Replace `mx-auto max-w-*` patterns with `.container`
  - Replace padding utilities with `.section` or Bulma spacing helpers
- [ ] Convert workspace selector dropdown to Bulma `.dropdown`
- [ ] Convert error page to use Bulma `.hero` + `.section`
- [ ] Convert home/landing page layout to Bulma sections

## Components Affected
- routes/w/[workspace]/+layout.svelte
- routes/+layout.svelte
- routes/+page.svelte
- routes/+error.svelte
- lib/components/BottomTabBar.svelte
- lib/components/WorkspaceSelector.svelte
- lib/components/ThemeToggle.svelte (already touched in foundation)

## Notes
- Bulma's navbar has built-in responsive burger menu — evaluate if useful
- `.container` width is controlled by Bulma breakpoint variables
- The workspace layout is the most-viewed component, so get this right