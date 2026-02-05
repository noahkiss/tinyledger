<script lang="ts">
	import { goto } from '$app/navigation';
	import { lastWorkspace } from '$lib/stores/lastWorkspace';
	import type { WorkspaceEntry } from '$lib/server/workspace/registry';
	import WorkspaceLogo from './WorkspaceLogo.svelte';

	interface Props {
		currentWorkspaceId: string;
		workspaces: WorkspaceEntry[];
		currentName: string;
		currentType: 'sole_prop' | 'volunteer_org';
		logoFilename: string | null;
	}

	let { currentWorkspaceId, workspaces, currentName, currentType, logoFilename }: Props = $props();

	let isOpen = $state(false);

	function handleSelect(workspaceId: string) {
		if (workspaceId === currentWorkspaceId) {
			isOpen = false;
			return;
		}

		// Update last workspace store
		lastWorkspace.set(workspaceId);

		// Navigate to selected workspace (transactions is now the default)
		goto(`/w/${workspaceId}/transactions`);
		isOpen = false;
	}

	function toggleDropdown() {
		isOpen = !isOpen;
	}

	// Close dropdown when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as Element;
		if (!target.closest('.workspace-selector')) {
			isOpen = false;
		}
	}

	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});
</script>

<div class="workspace-selector relative" data-component="workspace-selector">
	<!-- Trigger: Logo + Name + Dropdown indicator -->
	<button
		type="button"
		onclick={toggleDropdown}
		class="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-2 py-1.5 hover:bg-surface transition-colors"
	>
		<WorkspaceLogo
			workspaceId={currentWorkspaceId}
			{logoFilename}
			name={currentName}
			size="md"
		/>
		<div class="text-left">
			<div class="flex items-center gap-1.5">
				<h1 class="font-semibold text-fg">{currentName}</h1>
				<iconify-icon
					icon="solar:alt-arrow-down-linear"
					class="text-muted transition-transform {isOpen ? 'rotate-180' : ''}"
					width="16"
					height="16"
				></iconify-icon>
			</div>
			<p class="text-xs text-muted">
				{currentType === 'sole_prop' ? 'Sole Proprietor' : 'Volunteer Organization'}
			</p>
		</div>
	</button>

	{#if isOpen}
		<div
			class="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-border bg-card py-1 shadow-lg"
		>
			{#each workspaces as workspace}
				<button
					type="button"
					onclick={() => handleSelect(workspace.id)}
					class="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-sm hover:bg-surface {workspace.id ===
					currentWorkspaceId
						? 'bg-primary/10 text-primary'
						: 'text-fg'}"
				>
					<span class="flex-1 truncate">{workspace.name}</span>
					{#if workspace.id === currentWorkspaceId}
						<iconify-icon icon="solar:check-circle-bold" class="text-primary" width="16" height="16"></iconify-icon>
					{/if}
				</button>
			{/each}

			<div class="my-1 border-t border-card-border"></div>

			<a
				href="/"
				class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-fg hover:bg-surface"
			>
				<iconify-icon icon="solar:add-circle-linear" width="16" height="16"></iconify-icon>
				<span>Create New Workspace</span>
			</a>
		</div>
	{/if}
</div>
