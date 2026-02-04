---
type: task
status: done
title: Add Dark Mode Toggle
parent: tinyledger-0001
---

# Add Dark Mode Toggle

Implement user-controllable dark mode with system preference as default.

## Tasks
- [x] Create theme store to track user preference
- [x] Add toggle in settings page
- [x] Persist preference to localStorage
- [x] Sync with `prefers-color-scheme` media query by default
- [x] Apply `.dark` / `.light` class to `<html>` element
- [x] Add theme toggle icon in header (optional, settings may be enough)

## Implementation
```typescript
// $lib/stores/theme.ts
type Theme = 'system' | 'light' | 'dark';
```

System preference detection:
```javascript
window.matchMedia('(prefers-color-scheme: dark)').matches
```

## Files to Modify
- `src/lib/stores/theme.ts` - Create
- `src/app.html` - Add inline script for flash prevention
- `src/routes/w/[workspace]/settings/+page.svelte` - Add toggle
- `src/routes/+layout.svelte` - Apply theme class

## Flash Prevention
Add inline script in `<head>` before CSS loads to set theme class immediately:
```html
<script>
  (function() {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored === 'dark' || (stored !== 'light' && prefersDark) ? 'dark' : 'light';
    document.documentElement.classList.add(theme);
  })();
</script>
```
