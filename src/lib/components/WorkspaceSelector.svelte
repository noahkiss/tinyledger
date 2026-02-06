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
		if (!target.closest('[data-component="workspace-selector"]')) {
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

<div class="dropdown" class:is-active={isOpen} data-component="workspace-selector">
	<!-- Trigger: Logo + Name + Dropdown indicator -->
	<div class="dropdown-trigger">
		<button
			type="button"
			onclick={toggleDropdown}
			class="button ws-trigger"
			aria-haspopup="true"
			aria-controls="ws-dropdown-menu"
		>
			<WorkspaceLogo
				workspaceId={currentWorkspaceId}
				{logoFilename}
				name={currentName}
				size="md"
			/>
			<div class="ws-trigger-text">
				<div class="ws-trigger-name">
					<h1>{currentName}</h1>
					<span class="icon is-small" style="color: var(--color-muted)">
						<iconify-icon
							icon="solar:alt-arrow-down-linear"
							class="chevron-icon {isOpen ? 'is-rotated' : ''}"
							width="16"
							height="16"
						></iconify-icon>
					</span>
				</div>
				<p class="ws-trigger-type" style="color: var(--color-muted)">
					{currentType === 'sole_prop' ? 'Sole Proprietor' : 'Volunteer Organization'}
				</p>
			</div>
		</button>
	</div>

	<div class="dropdown-menu" id="ws-dropdown-menu" role="menu">
		<div class="dropdown-content">
			{#each workspaces as workspace}
				<a
					href="#!"
					class="dropdown-item {workspace.id === currentWorkspaceId ? 'is-active' : ''}"
					role="menuitem"
					onclick={(e) => { e.preventDefault(); handleSelect(workspace.id); }}
				>
					<span class="ws-item-name">{workspace.name}</span>
					{#if workspace.id === currentWorkspaceId}
						<span class="icon is-small" style="color: var(--color-primary)">
							<iconify-icon icon="solar:check-circle-bold" width="16" height="16"></iconify-icon>
						</span>
					{/if}
				</a>
			{/each}

			<hr class="dropdown-divider" />

			<a href="/" class="dropdown-item">
				<span class="icon is-small" style="margin-right: 0.5rem">
					<iconify-icon icon="solar:add-circle-linear" width="16" height="16"></iconify-icon>
				</span>
				<span>Create New Workspace</span>
			</a>
		</div>
	</div>
</div>

<style>
	.ws-trigger {
		height: auto;
		padding: 0.375rem 0.5rem;
		border-color: var(--color-border);
		background: transparent;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		white-space: normal;
	}
	.ws-trigger:hover {
		background-color: var(--color-surface);
	}
	.ws-trigger-text {
		text-align: left;
	}
	.ws-trigger-name {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}
	.ws-trigger-name h1 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-foreground);
	}
	.ws-trigger-type {
		font-size: 0.75rem;
	}
	.chevron-icon {
		transition: transform 0.2s;
	}
	.chevron-icon.is-rotated {
		transform: rotate(180deg);
	}
	.dropdown-item {
		display: flex;
		align-items: center;
		font-size: 0.875rem;
	}
	.ws-item-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
