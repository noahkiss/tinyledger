<script lang="ts">
	import type { LayoutData } from './$types';
	import { page } from '$app/stores';
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
		return pathname.startsWith(`${basePath}/${tabHref}`);
	}
</script>

<div class="min-h-screen bg-bg" data-component="app-shell">
	<!-- Header -->
	<header class="border-b border-border bg-card" data-component="header">
		<div class="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
			<!-- Workspace selector (integrated with logo/name) -->
			<div class="flex items-center gap-3">
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
					startMonth={data.fiscalYearStartMonth}
					compact
				/>
			</div>

			<!-- Settings cog -->
			<a
				href="/w/{data.workspaceId}/settings"
				class="rounded-lg p-2 text-muted hover:bg-surface hover:text-fg"
				title="Settings"
				data-component="settings-button"
			>
				<iconify-icon icon="solar:settings-bold" width="20" height="20"></iconify-icon>
			</a>
		</div>

		<!-- Navigation (desktop only - mobile uses bottom tab bar) -->
		<nav class="mx-auto hidden max-w-4xl px-4 md:block" data-component="nav-tabs">
			<ul class="flex gap-1 text-sm">
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
