---
# tinyledger-a05a
title: Migrate from Tailwind CSS to Bulma
status: todo
type: epic
priority: normal
created_at: 2026-02-06T05:01:01Z
updated_at: 2026-02-06T05:03:49Z
---

# Tailwind to Bulma Migration

Replace Tailwind CSS utility classes with Bulma's semantic component system + custom CSS layer, per design.md guidelines (Tier 2/3: Svelte + Bulma).

## Motivation
- design.md prefers semantic classes over utility classes for context-efficiency and readability
- Bulma aligns with philosophy: `.box` instead of `rounded-lg border border-card-border bg-card p-4 shadow-sm`
- Already have Catppuccin CSS variable system that maps well to Bulma's semantic colors

## Approach
- **Embrace Bulma's layout opinions** — don't fight the framework. If Bulma does cards/forms/navbars a certain way, adopt that pattern rather than forcing current Tailwind layout into Bulma classes.
- Visual layout can and should evolve to fit Bulma's system naturally. The goal is a cleaner codebase and better UX, not a pixel-perfect replica of the Tailwind version.
- Prioritize readability and semantic markup over preserving exact current appearance.

## Current State
- 41 Svelte files, ~864 Tailwind utility class occurrences
- Catppuccin color system via CSS custom properties (light/dark)
- Dark mode via `.dark` class on `<html>` with `@custom-variant dark`
- Tailwind v4.1.18 + @tailwindcss/vite

## Target State
- Bulma v1.x via npm with Sass customization
- Catppuccin colors injected via Sass overrides
- Dark mode via `data-theme="dark"` (Bulma native)
- Minimal custom CSS layer — only for patterns Bulma truly can't cover
- Clean, semantic HTML classes throughout
- Layout that feels natural to Bulma rather than forced from Tailwind

## Scope
- ~864 class occurrences across 41 files
- Heaviest files: import (137), settings (136), recurring (77), transaction detail (61)
- Bulma covers ~60% natively; ~40% needs custom CSS (less if we adapt layouts)

## Success Criteria
- [ ] Zero Tailwind dependencies remain
- [ ] All pages render correctly in light and dark mode
- [ ] Mobile responsive behavior preserved
- [ ] Catppuccin color system intact
- [ ] Source code is more readable (semantic classes)
- [ ] No functional regressions (all forms, modals, interactions work)
- [ ] Layout feels native to Bulma, not forced