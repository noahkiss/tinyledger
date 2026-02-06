<script lang="ts">
	import type { LayoutData } from './$types';
	import { page } from '$app/stores';
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
</script>

<div class="app-shell" data-component="app-shell">
	<!-- Header -->
	<header class="app-header" data-component="header">
		<div class="container header-inner">
			<!-- Workspace selector (integrated with logo/name) -->
			<div class="header-left">
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
			<div class="header-right">
				<ThemeToggle />
				<a
					href="/w/{data.workspaceId}/settings"
					class="icon-button"
					title="Settings"
					data-component="settings-button"
				>
					<iconify-icon icon="solar:settings-bold" width="20" height="20"></iconify-icon>
				</a>
			</div>
		</div>

		<!-- Navigation (desktop only - mobile uses bottom tab bar) -->
		<nav class="container is-hidden-mobile" data-component="nav-tabs">
			<div class="tabs nav-tabs">
				<ul>
					{#each navTabs as tab}
						<li class={isActiveTab(tab.href) ? 'is-active' : ''}>
							<a href="/w/{data.workspaceId}/{tab.href}">
								{tab.label}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		</nav>
	</header>

	<!-- Main content -->
	<main class="container main-content" data-component="main-content">
		{@render children()}
	</main>

	<!-- Bottom Tab Bar (mobile only) -->
	<BottomTabBar workspaceId={data.workspaceId} workspaceType={data.settings.type} />
</div>

<style>
	.app-shell {
		min-height: 100vh;
		background-color: var(--color-background);
	}

	.app-header {
		border-bottom: 1px solid var(--color-border);
		background-color: var(--color-card-bg);
	}

	.header-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 0.75rem;
		padding-bottom: 0.75rem;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.icon-button {
		padding: 0.5rem;
		border-radius: 0.5rem;
		color: var(--color-muted);
		transition: background-color 0.15s, color 0.15s;
	}

	.icon-button:hover {
		background-color: var(--color-surface);
		color: var(--color-foreground);
	}

	/* Desktop nav tabs */
	.nav-tabs {
		margin-bottom: 0;
	}

	.nav-tabs :global(ul) {
		border-bottom: none;
	}

	.nav-tabs :global(li a) {
		border-bottom-width: 2px;
		color: var(--color-muted);
		font-size: 0.875rem;
		padding: 0.5rem 1rem;
	}

	.nav-tabs :global(li a:hover) {
		border-bottom-color: var(--color-border);
		color: var(--color-foreground);
	}

	.nav-tabs :global(li.is-active a) {
		border-bottom-color: var(--color-primary);
		color: var(--color-primary);
		font-weight: 500;
	}

	.main-content {
		padding-top: 1.5rem;
		padding-bottom: 1.5rem;
	}
</style>
