---
type: task
status: done
title: Update Core Layout and Typography
parent: tinyledger-0001
---

# Update Core Layout and Typography

Refine layout constraints and typography to match manifesto guidelines.

## Tasks
- [x] Set max-width for ultrawide displays (~1200-1400px)
- [x] Verify line-height is 1.5-1.75 for body text
- [x] Ensure minimum 16px body text on mobile
- [x] Constrain line length to 65-75 characters for readability
- [x] Account for fixed navbar height in content padding
- [x] Test at breakpoints: 375px, 768px, 1024px, 1440px

## Current Layout
- `max-w-lg` on landing page (~512px)
- `max-w-4xl` on workspace pages (~896px)

## Proposed Changes
- Landing page: Keep `max-w-lg` (appropriate for simple content)
- Workspace layout: Consider `max-w-5xl` or `max-w-6xl` for more breathing room
- Add explicit `max-w-prose` for text-heavy sections

## Typography Check
- Body font: system default (fine)
- Ensure consistent heading hierarchy
- Code/numbers: Consider JetBrains Mono for amounts (monospace alignment)

## Files to Modify
- `src/routes/+layout.svelte`
- `src/routes/w/[workspace]/+layout.svelte`
- `src/app.css`
