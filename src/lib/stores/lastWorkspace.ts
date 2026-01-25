import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'tinyledger:lastWorkspace';

/**
 * Create a localStorage-backed store for the last used workspace.
 * Syncs to localStorage on change, reads from localStorage on init.
 */
function createLastWorkspaceStore() {
	// Initialize from localStorage if in browser
	const initialValue = browser ? localStorage.getItem(STORAGE_KEY) : null;

	const { subscribe, set: internalSet } = writable<string | null>(initialValue);

	return {
		subscribe,
		set(value: string | null) {
			if (browser) {
				if (value) {
					localStorage.setItem(STORAGE_KEY, value);
				} else {
					localStorage.removeItem(STORAGE_KEY);
				}
			}
			internalSet(value);
		},
		clear() {
			if (browser) {
				localStorage.removeItem(STORAGE_KEY);
			}
			internalSet(null);
		}
	};
}

export const lastWorkspace = createLastWorkspaceStore();
