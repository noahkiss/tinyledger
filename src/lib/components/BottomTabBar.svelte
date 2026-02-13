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
	const navTabs = $derived.by(() => {
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
		tabs.push({
			href: 'settings',
			label: 'Settings',
			icon: 'solar:settings-linear',
			iconActive: 'solar:settings-bold'
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
</script>

<!-- Bottom Tab Bar (mobile only) -->
<nav
	class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card md:hidden"
	style="padding-bottom: env(safe-area-inset-bottom, 0px);"
	data-component="bottom-tab-bar"
	aria-label="Main navigation"
>
	<div class="flex items-center justify-around">
		{#each navTabs as tab}
			{@const active = isActiveTab(tab.href)}
			<a
				href="/w/{workspaceId}/{tab.href}"
				class="flex min-w-0 flex-1 flex-col items-center justify-center py-2 {active ? 'text-primary' : 'text-muted'}"
				aria-current={active ? 'page' : undefined}
			>
				<iconify-icon icon={active ? tab.iconActive : tab.icon} width="22" height="22"
				></iconify-icon>
				<span class="mt-0.5 truncate text-[10px]">{tab.label}</span>
			</a>
		{/each}
	</div>
</nav>

<!-- Spacer for fixed bottom bar (mobile only) -->
<div class="h-16 md:hidden" aria-hidden="true"></div>
