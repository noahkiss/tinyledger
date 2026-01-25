<script lang="ts">
	import type { LayoutData } from './$types';
	import WorkspaceLogo from '$lib/components/WorkspaceLogo.svelte';
	import WorkspaceSelector from '$lib/components/WorkspaceSelector.svelte';
	import { lastWorkspace } from '$lib/stores/lastWorkspace';

	let { data, children }: { data: LayoutData; children: any } = $props();

	// Update last workspace on mount
	$effect(() => {
		lastWorkspace.set(data.workspaceId);
	});
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="border-b border-gray-200 bg-white">
		<div class="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
			<!-- Logo and workspace name -->
			<div class="flex items-center gap-3">
				<WorkspaceLogo
					workspaceId={data.workspaceId}
					logoFilename={data.settings.logoFilename}
					name={data.settings.name}
					size="md"
				/>
				<div>
					<h1 class="font-semibold text-gray-900">{data.settings.name}</h1>
					<p class="text-xs text-gray-500">
						{data.settings.type === 'sole_prop' ? 'Sole Proprietor' : 'Volunteer Organization'}
					</p>
				</div>
			</div>

			<!-- Workspace selector dropdown -->
			<WorkspaceSelector
				currentWorkspaceId={data.workspaceId}
				workspaces={data.allWorkspaces}
			/>
		</div>

		<!-- Navigation -->
		<nav class="mx-auto max-w-4xl px-4">
			<ul class="flex gap-1 text-sm">
				<li>
					<a
						href="/w/{data.workspaceId}/"
						class="inline-block rounded-t-lg border-b-2 border-transparent px-4 py-2 text-gray-600 hover:border-gray-300 hover:text-gray-900"
					>
						Dashboard
					</a>
				</li>
				<li>
					<a
						href="/w/{data.workspaceId}/settings"
						class="inline-block rounded-t-lg border-b-2 border-transparent px-4 py-2 text-gray-600 hover:border-gray-300 hover:text-gray-900"
					>
						Settings
					</a>
				</li>
			</ul>
		</nav>
	</header>

	<!-- Main content -->
	<main class="mx-auto max-w-4xl px-4 py-6">
		{@render children()}
	</main>
</div>
