/**
 * Svelte action that calls a callback when the user clicks outside the element.
 *
 * Usage:
 *   <div use:clickOutside={() => isOpen = false}>...</div>
 */
export function clickOutside(node: HTMLElement, callback: () => void) {
	function handleClick(event: MouseEvent) {
		if (!node.contains(event.target as Node)) {
			callback();
		}
	}

	document.addEventListener('click', handleClick, true);

	return {
		update(newCallback: () => void) {
			callback = newCallback;
		},
		destroy() {
			document.removeEventListener('click', handleClick, true);
		}
	};
}
