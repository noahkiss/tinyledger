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
	class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card md:hidden"
	style="padding-bottom: env(safe-area-inset-bottom, 0px);"
	data-component="bottom-tab-bar"
	aria-label="Main navigation"
>
	<div class="grid grid-cols-5 items-center">
		<!-- Left tabs -->
		{#each leftTabs() as tab}
			{@const active = isActiveTab(tab.href)}
			<a
				href="/w/{workspaceId}/{tab.href}"
				class="flex flex-col items-center justify-center py-2 {active ? 'text-primary' : 'text-muted'}"
				aria-current={active ? 'page' : undefined}
			>
				<iconify-icon icon={active ? tab.iconActive : tab.icon} width="24" height="24"
				></iconify-icon>
				<span class="mt-0.5 text-xs">{tab.label}</span>
			</a>
		{/each}

		<!-- Center Add button -->
		<button
			type="button"
			onclick={() => (showAddMenu = !showAddMenu)}
			class="flex flex-col items-center justify-center py-2 text-primary cursor-pointer"
			aria-label="Add transaction"
		>
			<div
				class="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-md -mt-4"
			>
				<iconify-icon
					icon="solar:add-circle-bold"
					width="28"
					height="28"
					class="transition-transform {showAddMenu ? 'rotate-45' : ''}"
				></iconify-icon>
			</div>
		</button>

		<!-- Right tabs -->
		{#each rightTabs() as tab}
			{@const active = isActiveTab(tab.href)}
			<a
				href="/w/{workspaceId}/{tab.href}"
				class="flex flex-col items-center justify-center py-2 {active ? 'text-primary' : 'text-muted'}"
				aria-current={active ? 'page' : undefined}
			>
				<iconify-icon icon={active ? tab.iconActive : tab.icon} width="24" height="24"
				></iconify-icon>
				<span class="mt-0.5 text-xs">{tab.label}</span>
			</a>
		{/each}
	</div>
</nav>

<!-- Add menu overlay -->
{#if showAddMenu}
	<div
		class="fixed inset-0 z-30 bg-black/30 md:hidden"
		onclick={handleBackdropClick}
		onkeydown={(e) => e.key === 'Escape' && (showAddMenu = false)}
		role="dialog"
		aria-label="Add transaction"
		tabindex="-1"
	>
		<!-- Add menu -->
		<div
			class="fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 gap-4"
			style="padding-bottom: env(safe-area-inset-bottom, 0px);"
		>
			<a
				href="/w/{workspaceId}/transactions/new?type=income"
				class="flex h-14 items-center gap-2 rounded-full bg-success px-5 text-white shadow-lg hover:bg-success-hover active:scale-95"
				onclick={() => (showAddMenu = false)}
			>
				<iconify-icon icon="solar:add-circle-bold" width="24" height="24"></iconify-icon>
				<span class="font-semibold">Income</span>
			</a>
			<a
				href="/w/{workspaceId}/transactions/new?type=expense"
				class="flex h-14 items-center gap-2 rounded-full bg-error px-5 text-white shadow-lg hover:bg-error-hover active:scale-95"
				onclick={() => (showAddMenu = false)}
			>
				<iconify-icon icon="solar:minus-circle-bold" width="24" height="24"></iconify-icon>
				<span class="font-semibold">Expense</span>
			</a>
		</div>
	</div>
{/if}

<!-- Spacer for fixed bottom bar (mobile only) -->
<div class="h-20 md:hidden" aria-hidden="true"></div>
