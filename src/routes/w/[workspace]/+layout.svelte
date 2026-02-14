<script lang="ts">
	import type { LayoutData } from './$types';
	import { page, navigating } from '$app/stores';
	import WorkspaceSelector from '$lib/components/WorkspaceSelector.svelte';
	import BottomTabBar from '$lib/components/BottomTabBar.svelte';
	import FiscalYearPicker from '$lib/components/FiscalYearPicker.svelte';
	import { lastWorkspace } from '$lib/stores/lastWorkspace';

	let { data, children }: { data: LayoutData; children: any } = $props();

	// Update last workspace on mount
	$effect(() => {
		lastWorkspace.set(data.workspaceId);
	});

	// Navigation tabs (Dashboard removed - Transactions is home)
	// Taxes tab only shown for sole_prop workspaces
	// Filings tab visible to all workspace types
	const baseNavTabs = [
		{ href: 'transactions', label: 'Transactions' },
		{ href: 'reports', label: 'Reports' }
	];

	// Derived: add Taxes tab for sole_prop only, Filings for all
	// Order: Transactions | Reports | Taxes (sole_prop only) | Filings
	const navTabs = $derived(
		data.settings.type === 'sole_prop'
			? [...baseNavTabs, { href: 'taxes', label: 'Taxes' }, { href: 'filings', label: 'Filings' }]
			: [...baseNavTabs, { href: 'filings', label: 'Filings' }]
	);

	// Determine active tab from current path
	function isActiveTab(tabHref: string): boolean {
		const pathname = $page.url.pathname;
		const basePath = `/w/${data.workspaceId}`;
		// Check if we're on this tab's path
		if (tabHref === 'transactions') {
			// Transactions is active for base path OR /transactions/*
			return pathname === basePath || pathname === `${basePath}/` || pathname.startsWith(`${basePath}/transactions`);
		}
		if (tabHref === 'settings') {
			return pathname.startsWith(`${basePath}/settings`);
		}
		return pathname.startsWith(`${basePath}/${tabHref}`);
	}
</script>

<div class="min-h-screen bg-bg" data-component="app-shell">
	<!-- Navigation progress bar -->
	{#if $navigating}
		<div class="fixed top-0 left-0 right-0 z-50 h-0.5 bg-surface-alt">
			<div class="nav-progress-bar h-full bg-primary"></div>
		</div>
	{/if}

	<!-- Header -->
	<header class="border-b border-border bg-card" data-component="header">
		<div class="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
			<!-- Left: Workspace selector + Fiscal Year picker (spread on mobile) -->
			<div class="flex flex-1 items-stretch justify-between gap-3 md:flex-initial md:justify-start">
				<WorkspaceSelector
					currentWorkspaceId={data.workspaceId}
					workspaces={data.allWorkspaces}
					currentName={data.settings.name}
					currentType={data.settings.type}
					logoFilename={data.settings.logoFilename}
				/>

				<FiscalYearPicker
					fiscalYear={data.fiscalYear}
					availableYears={data.availableFiscalYears}
				/>
			</div>

			<!-- Right: Pill nav tabs (desktop only) -->
			<nav class="hidden items-center gap-1 md:flex" data-component="nav-tabs">
				{#each navTabs as tab}
					<a
						href="/w/{data.workspaceId}/{tab.href}"
						class="inline-flex h-8 items-center rounded-md px-3 text-sm font-medium transition-colors {isActiveTab(tab.href)
							? 'bg-primary/10 text-primary'
							: 'text-muted hover:bg-surface-alt hover:text-fg'}"
					>
						{tab.label}
					</a>
				{/each}
				<a
					href="/w/{data.workspaceId}/settings"
					class="inline-flex h-8 items-center justify-center rounded-md px-2 text-sm transition-colors {isActiveTab('settings')
						? 'bg-primary/10 text-primary'
						: 'text-muted hover:bg-surface-alt hover:text-fg'}"
					title="Settings"
				>
					<iconify-icon icon={isActiveTab('settings') ? 'solar:settings-bold' : 'solar:settings-linear'} width="16" height="16"></iconify-icon>
				</a>
			</nav>
		</div>
	</header>

	<!-- Main content -->
	<main class="mx-auto max-w-4xl px-4 py-6" data-component="main-content">
		{@render children()}
	</main>

	<!-- Bottom Tab Bar (mobile only) -->
	<BottomTabBar workspaceId={data.workspaceId} workspaceType={data.settings.type} />
</div>
