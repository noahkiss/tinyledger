import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'theme';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

/**
 * Get the system's preferred color scheme.
 */
function getSystemTheme(): ResolvedTheme {
	if (!browser) return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Apply theme class to document and update meta theme-color.
 */
function applyTheme(theme: ResolvedTheme) {
	if (!browser) return;

	const root = document.documentElement;
	if (theme === 'dark') {
		root.classList.add('dark');
	} else {
		root.classList.remove('dark');
	}

	// Update theme-color meta for mobile browsers
	const meta = document.querySelector('meta.theme-color-meta');
	if (meta) {
		meta.setAttribute('content', theme === 'dark' ? '#1e1e2e' : '#1e66f5');
	}
}

/**
 * Create a theme store that persists to localStorage.
 */
function createThemeStore() {
	// Get initial value from localStorage (already applied by inline script)
	const initialValue: ThemePreference = browser
		? ((localStorage.getItem(STORAGE_KEY) as ThemePreference) ?? 'system')
		: 'system';

	const { subscribe, set: internalSet } = writable<ThemePreference>(initialValue);

	return {
		subscribe,
		set(value: ThemePreference) {
			if (browser) {
				if (value === 'system') {
					localStorage.removeItem(STORAGE_KEY);
				} else {
					localStorage.setItem(STORAGE_KEY, value);
				}
			}
			internalSet(value);

			// Apply the theme
			const resolved = value === 'system' ? getSystemTheme() : value;
			applyTheme(resolved);
		}
	};
}

export const themePreference = createThemeStore();

/**
 * The resolved theme (what's actually displayed).
 */
export const resolvedTheme = derived(themePreference, ($pref) => {
	if ($pref === 'system') {
		return getSystemTheme();
	}
	return $pref;
});

/**
 * Initialize theme system - listen for system preference changes.
 */
export function initTheme() {
	if (!browser) return;

	// Listen for system preference changes
	const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
	mediaQuery.addEventListener('change', () => {
		// Only update if preference is 'system'
		if (get(themePreference) === 'system') {
			applyTheme(getSystemTheme());
		}
	});
}
