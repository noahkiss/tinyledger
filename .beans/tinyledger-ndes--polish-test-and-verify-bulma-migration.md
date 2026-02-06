---
# tinyledger-ndes
title: Polish, test, and verify Bulma migration
status: todo
type: task
priority: normal
created_at: 2026-02-06T05:03:17Z
updated_at: 2026-02-06T05:03:28Z
parent: tinyledger-a05a
blocking:
    - tinyledger-d0ae
---

# Post-Migration Polish & Verification

Final pass to catch regressions, remove Tailwind artifacts, and verify the migration is complete.

## Tasks
- [ ] Visual regression check — compare all pages light vs dark at mobile + desktop
- [ ] Remove any remaining Tailwind utility classes (grep for common patterns)
- [ ] Remove unused CSS custom properties from old @theme block
- [ ] Verify mobile responsive behavior at 375px, 768px, 1024px, 1440px
- [ ] Verify dark mode toggle works correctly on all pages
- [ ] Verify iOS PWA appearance (safe areas, home screen icon)
- [ ] Test all form submissions (new transaction, edit, settings, import, recurring)
- [ ] Test all modal/dropdown interactions
- [ ] Run svelte-check — ensure no type errors introduced
- [ ] Run npm run build — verify production build succeeds
- [ ] Check bundle size — compare before/after (Tailwind vs Bulma)
- [ ] Update screenshots workflow if needed
- [ ] Capture new screenshots for docs
- [ ] Clean up any transitional code (--color-* variables if fully migrated to Bulma tokens)
- [ ] Update CLAUDE.md if any dev workflow changed
- [ ] Update design.md notes if any patterns evolved during migration

## Verification Checklist
- [ ] Zero Tailwind imports, configs, or dependencies remain
- [ ] All 41 Svelte files use Bulma/semantic classes
- [ ] Homepage renders correctly (light + dark)
- [ ] Transaction list + timeline renders correctly
- [ ] Transaction detail view/edit works
- [ ] New transaction form works
- [ ] Settings page — all sections functional
- [ ] Import wizard — all steps work
- [ ] Recurring templates — CRUD works
- [ ] Reports page with charts renders
- [ ] Taxes + Filings pages render
- [ ] FilterBar dropdowns work
- [ ] Bottom tab bar on mobile works
- [ ] QuickEntry FAB + form works

## Notes
- This should be the very last bean in the migration
- Consider deploying to a staging environment before production