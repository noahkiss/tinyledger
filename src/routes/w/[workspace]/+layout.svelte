<script lang="ts">
	import type { LayoutData } from './$types';
	import { page } from '$app/stores';
	import WorkspaceSelector from '$lib/components/WorkspaceSelector.svelte';
	import { lastWorkspace } from '$lib/stores/lastWorkspace';

	let { data, children }: { data: LayoutData; children: any } = $props();

	// Update last workspace on mount
	$effect(() => {
		lastWorkspace.set(data.workspaceId);
	});

	// Navigation tabs (Dashboard removed - Transactions is home)
	// Taxes tab only shown for sole_prop workspaces
	const baseNavTabs = [
		{ href: 'transactions', label: 'Transactions' },
		{ href: 'reports', label: 'Reports' }
	];

	// Derived: add Taxes tab for sole_prop workspaces only
	const navTabs = $derived(
		data.settings.type === 'sole_prop'
			? [...baseNavTabs, { href: 'taxes', label: 'Taxes' }]
			: baseNavTabs
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

<div class="min-h-screen bg-gray-50" data-component="app-shell">
	<!-- Header -->
	<header class="border-b border-gray-200 bg-white" data-component="header">
		<div class="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
			<!-- Workspace selector (integrated with logo/name) -->
			<WorkspaceSelector
				currentWorkspaceId={data.workspaceId}
				workspaces={data.allWorkspaces}
				currentName={data.settings.name}
				currentType={data.settings.type}
				logoFilename={data.settings.logoFilename}
			/>

			<!-- Settings cog -->
			<a
				href="/w/{data.workspaceId}/settings"
				class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
				title="Settings"
				data-component="settings-button"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
			</a>
		</div>

		<!-- Navigation -->
		<nav class="mx-auto max-w-4xl px-4" data-component="nav-tabs">
			<ul class="flex gap-1 text-sm">
				{#each navTabs as tab}
					<li>
						<a
							href="/w/{data.workspaceId}/{tab.href}"
							class="inline-block rounded-t-lg border-b-2 px-4 py-2 {isActiveTab(tab.href)
								? 'border-blue-500 text-blue-600 font-medium'
								: 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900'}"
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
</div>
