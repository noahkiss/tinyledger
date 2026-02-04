---
type: task
status: done
title: Add data-* Attributes for AI Collaboration
parent: tinyledger-0001
---

# Add data-* Attributes for AI Collaboration

Annotate key UI sections with data-* attributes for easier reference in conversations.

## Why
From frontend-design manifesto: "Use `data-*` attributes so elements can be referenced in conversation"

## Current State
Comprehensive data-component attributes already exist:
- Layout: app-shell, header, nav-tabs, main-content, settings-button
- Components: filter-bar, transaction-card, timeline-date-marker, workspace-selector, bottom-tab-bar, fiscal-year-picker, quarterly-payment-marker
- Transactions: transaction-actions, add-income-button, add-expense-button, fiscal-header, transaction-timeline, timeline-items, pending-instance, empty-state
- Settings: data-section="appearance"

## Tasks
- [x] Audit existing data-* usage for consistency
- [x] Add missing section markers (`data-section`)
- [x] Add state markers (`data-state`) for empty/loading/error states
- [x] Add action markers (`data-action`) for key buttons
- [ ] Document naming conventions in CLAUDE.md (optional, pattern is clear)

## Naming Conventions
```html
<!-- Sections (page regions) -->
<section data-section="transaction-list">
<section data-section="fiscal-summary">

<!-- Components (reusable UI) -->
<div data-component="timeline-entry">
<div data-component="filter-bar">

<!-- States -->
<div data-state="empty">
<div data-state="loading">

<!-- Actions (interactive elements) -->
<button data-action="add-income">
<button data-action="apply-filters">
```

## Files to Review
- All route pages (`+page.svelte`)
- All components in `src/lib/components/`
