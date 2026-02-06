---
# tinyledger-e7kb
title: Set up Bulma foundation and remove Tailwind
status: todo
type: task
priority: high
created_at: 2026-02-06T05:01:28Z
updated_at: 2026-02-06T05:01:28Z
parent: tinyledger-a05a
---

# Foundation: Install Bulma, bridge colors, remove Tailwind

The critical first bean — everything else depends on this.

## Tasks
- [ ] Install Bulma v1.x and sass as npm dependencies
- [ ] Remove @tailwindcss/vite, tailwindcss from dependencies
- [ ] Remove tailwind.config.ts
- [ ] Create Sass entry point that customizes Bulma with Catppuccin colors
  - Map Catppuccin palette to Bulma's HSL variable system (`$primary`, `$success`, `$danger`, etc.)
  - Override `$scheme-main`, `$text`, `$background` etc. for both light and dark
  - Keep existing `--color-*` CSS custom properties alongside for transition period
- [ ] Update vite.config.ts: remove tailwindcss() plugin, configure Sass
- [ ] Switch dark mode from `.dark` class to `data-theme="dark"` (Bulma native)
  - Update ThemeToggle.svelte to set `data-theme` attribute instead of `.dark` class
  - Update any `dark:` conditional logic in components
- [ ] Create custom utility CSS layer for patterns Bulma doesn't cover:
  - Opacity modifiers (`.bg-primary-10`, `.bg-primary-50`)
  - Focus ring utilities (`.focus-ring`)
  - Transition utilities (`.transition-colors`, `.transition-all`)
  - Shadow utilities (`.shadow-sm`, `.shadow-md`, `.shadow-lg`)
  - Border radius beyond Bulma's default (`.rounded-xl`, `.rounded-full`)
  - Transform utilities needed by existing components
  - Z-index scale (`.z-10`, `.z-40`, `.z-50`)
  - Positioning helpers (`.inset-0`, `.top-full`)
- [ ] Rewrite app.css base styles to work with Bulma's reset (minireset.css)
  - Preserve responsive typography, font smoothing, reduced motion
  - Remove @import "tailwindcss" and @custom-variant dark
  - Keep/adapt @theme block semantic tokens
- [ ] Verify Bulma CSS loads correctly in dev server
- [ ] Verify dark mode toggle works with new data-theme approach

## Key Decisions
- Use Sass customization (compile-time) rather than runtime CSS variable overrides for Bulma colors
  - Reason: Bulma's HSL variable system (--bulma-*-h/s/l) is awkward to override at runtime
  - Sass `@use "bulma/sass" with (...)` gives clean control
- Custom utility layer goes in a separate `utilities.css` or `_utilities.scss` file
- Keep `--color-*` CSS custom properties for components that reference them directly

## Risk
- Bulma's reset (minireset.css) will change base element styling — test thoroughly
- Dark mode selector change affects ThemeToggle, footer images, and any dark: conditionals
- This bean will temporarily break all component styling — expected, fixed by subsequent beans

## Files Modified
- package.json (deps)
- vite.config.ts
- src/app.css (major rewrite)
- src/lib/components/ThemeToggle.svelte
- New: src/styles/bulma-custom.scss (or similar)
- New: src/styles/utilities.scss
- Delete: tailwind.config.ts