<script lang="ts">
	import { page } from '$app/stores';

	type NavTab = {
		href: string;
		label: string;
		icon: string;
		iconActive: string;
	};

	let {
		workspaceId,
		workspaceType = 'sole_prop'
	}: {
		workspaceId: string;
		workspaceType: 'sole_prop' | 'volunteer_org';
	} = $props();

	// State for the add menu
	let showAddMenu = $state(false);

	// Navigation tabs (Settings handled by header cog)
	const baseNavTabs: NavTab[] = [
		{
			href: 'transactions',
			label: 'Transactions',
			icon: 'solar:document-text-linear',
			iconActive: 'solar:document-text-bold'
		},
		{
			href: 'reports',
			label: 'Reports',
			icon: 'solar:chart-2-linear',
			iconActive: 'solar:chart-2-bold'
		}
	];

	// Build nav tabs based on workspace type
	const navTabs = $derived(() => {
		const tabs = [...baseNavTabs];
		if (workspaceType === 'sole_prop') {
			tabs.push({
				href: 'taxes',
				label: 'Taxes',
				icon: 'solar:calculator-linear',
				iconActive: 'solar:calculator-bold'
			});
		}
		tabs.push({
			href: 'filings',
			label: 'Filings',
			icon: 'solar:archive-linear',
			iconActive: 'solar:archive-bold'
		});
		return tabs;
	});

	// Check if a tab is active
	function isActiveTab(tabHref: string): boolean {
		const pathname = $page.url.pathname;
		const basePath = `/w/${workspaceId}`;
		if (tabHref === 'transactions') {
			return (
				pathname === basePath ||
				pathname === `${basePath}/` ||
				pathname.startsWith(`${basePath}/transactions`)
			);
		}
		return pathname.startsWith(`${basePath}/${tabHref}`);
	}

	// Split tabs into left and right groups (for center add button)
	const leftTabs = $derived(() => navTabs().slice(0, 2));
	const rightTabs = $derived(() => navTabs().slice(2));

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			showAddMenu = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && showAddMenu) {
			showAddMenu = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Bottom Tab Bar (mobile only) -->
<nav
	class="bottom-tab-bar"
	style="padding-bottom: env(safe-area-inset-bottom, 0px);"
	data-component="bottom-tab-bar"
>
	<div class="tab-grid">
		<!-- Left tabs -->
		{#each leftTabs() as tab}
			{@const active = isActiveTab(tab.href)}
			<a
				href="/w/{workspaceId}/{tab.href}"
				class="tab-link"
				class:is-active={active}
			>
				<iconify-icon icon={active ? tab.iconActive : tab.icon} width="24" height="24"
				></iconify-icon>
				<span class="tab-label">{tab.label}</span>
			</a>
		{/each}

		<!-- Center Add button -->
		<button
			type="button"
			onclick={() => (showAddMenu = !showAddMenu)}
			class="tab-link tab-add-trigger"
			aria-label="Add transaction"
		>
			<div class="add-button">
				<iconify-icon
					icon="solar:add-circle-bold"
					width="28"
					height="28"
					class="add-icon {showAddMenu ? 'is-rotated' : ''}"
				></iconify-icon>
			</div>
		</button>

		<!-- Right tabs -->
		{#each rightTabs() as tab}
			{@const active = isActiveTab(tab.href)}
			<a
				href="/w/{workspaceId}/{tab.href}"
				class="tab-link"
				class:is-active={active}
			>
				<iconify-icon icon={active ? tab.iconActive : tab.icon} width="24" height="24"
				></iconify-icon>
				<span class="tab-label">{tab.label}</span>
			</a>
		{/each}
	</div>
</nav>

<!-- Add menu overlay -->
{#if showAddMenu}
	<div
		class="add-overlay"
		onclick={handleBackdropClick}
		onkeydown={(e) => e.key === 'Escape' && (showAddMenu = false)}
		role="button"
		tabindex="-1"
		aria-label="Close menu"
	>
		<!-- Add menu -->
		<div
			class="add-menu"
			style="padding-bottom: env(safe-area-inset-bottom, 0px);"
		>
			<a
				href="/w/{workspaceId}/transactions/new?type=income"
				class="add-menu-btn add-menu-btn--income"
				onclick={() => (showAddMenu = false)}
			>
				<iconify-icon icon="solar:add-circle-bold" width="24" height="24"></iconify-icon>
				<span class="add-menu-label">Income</span>
			</a>
			<a
				href="/w/{workspaceId}/transactions/new?type=expense"
				class="add-menu-btn add-menu-btn--expense"
				onclick={() => (showAddMenu = false)}
			>
				<iconify-icon icon="solar:minus-circle-bold" width="24" height="24"></iconify-icon>
				<span class="add-menu-label">Expense</span>
			</a>
		</div>
	</div>
{/if}

<!-- Spacer for fixed bottom bar (mobile only) -->
<div class="bottom-spacer" aria-hidden="true"></div>

<style>
	/* Bottom tab bar - mobile only */
	.bottom-tab-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 40;
		border-top: 1px solid var(--color-border);
		background-color: var(--color-card-bg);
	}
	.tab-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		align-items: center;
	}
	.tab-link {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 0.5rem 0;
		color: var(--color-muted);
		cursor: pointer;
		background: none;
		border: none;
		text-decoration: none;
	}
	.tab-link.is-active {
		color: var(--color-primary);
	}
	.tab-label {
		margin-top: 0.125rem;
		font-size: 0.75rem;
	}

	/* Center add button */
	.tab-add-trigger {
		color: var(--color-primary);
	}
	.add-button {
		display: flex;
		height: 3rem;
		width: 3rem;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		background-color: var(--color-primary);
		color: white;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
		margin-top: -1rem;
	}
	.add-icon {
		transition: transform 0.2s;
	}
	.add-icon.is-rotated {
		transform: rotate(45deg);
	}

	/* Overlay backdrop */
	.add-overlay {
		position: fixed;
		inset: 0;
		z-index: 30;
		background: rgba(0, 0, 0, 0.3);
	}

	/* Add menu floating buttons */
	.add-menu {
		position: fixed;
		bottom: 6rem;
		left: 50%;
		z-index: 40;
		display: flex;
		transform: translateX(-50%);
		gap: 1rem;
	}
	.add-menu-btn {
		display: flex;
		height: 3.5rem;
		align-items: center;
		gap: 0.5rem;
		border-radius: 9999px;
		padding: 0 1.25rem;
		color: white;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
		text-decoration: none;
	}
	.add-menu-btn:active {
		transform: scale(0.95);
	}
	.add-menu-btn--income {
		background-color: var(--color-success);
	}
	.add-menu-btn--income:hover {
		filter: brightness(0.9);
	}
	.add-menu-btn--expense {
		background-color: var(--color-error);
	}
	.add-menu-btn--expense:hover {
		filter: brightness(0.9);
	}
	.add-menu-label {
		font-weight: 600;
	}

	/* Spacer - mobile only */
	.bottom-spacer {
		height: 5rem;
	}

	/* Hide on desktop */
	@media (min-width: 769px) {
		.bottom-tab-bar,
		.add-overlay,
		.bottom-spacer {
			display: none;
		}
	}
</style>
