<script lang="ts">
	import type { LayoutData } from './$types';
	import { page, navigating } from '$app/stores';
	import WorkspaceSelector from '$lib/components/WorkspaceSelector.svelte';
	import BottomTabBar from '$lib/components/BottomTabBar.svelte';
	import FiscalYearPicker from '$lib/components/FiscalYearPicker.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
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
		return pathname.startsWith(`${basePath}/${tabHref}`);
	}

	const isSettingsActive = $derived($page.url.pathname.startsWith(`/w/${data.workspaceId}/settings`));
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
			<!-- Workspace selector (integrated with logo/name) -->
			<div class="flex items-stretch gap-3">
				<WorkspaceSelector
					currentWorkspaceId={data.workspaceId}
					workspaces={data.allWorkspaces}
					currentName={data.settings.name}
					currentType={data.settings.type}
					logoFilename={data.settings.logoFilename}
				/>

				<!-- Fiscal Year picker -->
				<FiscalYearPicker
					fiscalYear={data.fiscalYear}
					availableYears={data.availableFiscalYears}
				/>
			</div>

			<ThemeToggle />
		</div>

		<!-- Navigation (desktop only - mobile uses bottom tab bar) -->
		<nav class="mx-auto hidden max-w-4xl px-4 md:block" data-component="nav-tabs">
			<ul class="flex items-center gap-1 text-sm">
				{#each navTabs as tab}
					<li>
						<a
							href="/w/{data.workspaceId}/{tab.href}"
							class="inline-block rounded-t-lg border-b-2 px-4 py-2 {isActiveTab(tab.href)
								? 'border-primary text-primary font-medium'
								: 'border-transparent text-muted hover:border-border hover:text-fg'}"
						>
							{tab.label}
						</a>
					</li>
				{/each}
				<li class="ml-auto">
					<a
						href="/w/{data.workspaceId}/settings"
						class="inline-flex items-center rounded-t-lg border-b-2 px-3 py-2 {isSettingsActive
							? 'border-primary text-primary'
							: 'border-transparent text-muted hover:border-border hover:text-fg'}"
						title="Settings"
					>
						<iconify-icon icon={isSettingsActive ? 'solar:settings-bold' : 'solar:settings-linear'} width="18" height="18"></iconify-icon>
					</a>
				</li>
			</ul>
		</nav>
	</header>

	<!-- Main content -->
	<main class="mx-auto max-w-4xl px-4 py-6" data-component="main-content">
		{@render children()}
	</main>

	<!-- Bottom Tab Bar (mobile only) -->
	<BottomTabBar workspaceId={data.workspaceId} workspaceType={data.settings.type} />
</div>
