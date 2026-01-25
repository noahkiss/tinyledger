<script lang="ts">
	import { goto } from '$app/navigation';
	import { lastWorkspace } from '$lib/stores/lastWorkspace';
	import type { WorkspaceEntry } from '$lib/server/workspace/registry';

	interface Props {
		currentWorkspaceId: string;
		workspaces: WorkspaceEntry[];
	}

	let { currentWorkspaceId, workspaces }: Props = $props();

	let isOpen = $state(false);

	function handleSelect(workspaceId: string) {
		if (workspaceId === currentWorkspaceId) {
			isOpen = false;
			return;
		}

		// Update last workspace store
		lastWorkspace.set(workspaceId);

		// Navigate to selected workspace
		goto(`/w/${workspaceId}/`);
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

<div class="workspace-selector relative">
	<button
		type="button"
		onclick={toggleDropdown}
		class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
	>
		<span>Switch</span>
		<svg
			class="h-4 w-4 transition-transform {isOpen ? 'rotate-180' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if isOpen}
		<div
			class="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
		>
			{#each workspaces as workspace}
				<button
					type="button"
					onclick={() => handleSelect(workspace.id)}
					class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50 {workspace.id ===
					currentWorkspaceId
						? 'bg-blue-50 text-blue-700'
						: 'text-gray-700'}"
				>
					<span class="flex-1 truncate">{workspace.name}</span>
					{#if workspace.id === currentWorkspaceId}
						<svg class="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
								clip-rule="evenodd"
							/>
						</svg>
					{/if}
				</button>
			{/each}

			<div class="my-1 border-t border-gray-100"></div>

			<a
				href="/"
				class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4v16m8-8H4"
					/>
				</svg>
				<span>Create New Workspace</span>
			</a>
		</div>
	{/if}
</div>
