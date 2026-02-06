<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Get last workspace from localStorage (client-side only)
	let lastWorkspaceId = $state<string | null>(null);

	$effect(() => {
		if (typeof window !== 'undefined') {
			lastWorkspaceId = localStorage.getItem('tinyledger:lastWorkspace');
		}
	});

	// Find last workspace name from list
	const lastWorkspace = $derived(
		lastWorkspaceId ? data.workspaces.find((w) => w.id === lastWorkspaceId) : null
	);
</script>

<svelte:head>
	<title>TinyLedger - Simple Bookkeeping</title>
</svelte:head>

<section class="section">
	<div class="container" style="max-width: 32rem;">
		<!-- Header -->
		<header class="has-text-centered mb-5">
			<h1 class="title is-3">TinyLedger</h1>
			<p class="subtitle is-6 has-text-grey">Simple bookkeeping for small businesses</p>
		</header>

		<!-- Quick resume if last workspace exists -->
		{#if lastWorkspace}
			<div class="notification is-info is-light mb-5">
				<p class="is-size-7 has-text-info">Continue where you left off</p>
				<a
					href="/w/{lastWorkspace.id}/transactions"
					class="button is-primary is-small mt-2"
				>
					Continue to {lastWorkspace.name}
				</a>
			</div>
		{/if}

		<!-- Existing workspaces -->
		{#if data.workspaces.length > 0}
			<section class="mb-5">
				<h2 class="title is-5">Your Workspaces</h2>
				<div class="workspace-list">
					{#each data.workspaces as workspace}
						<a
							href="/w/{workspace.id}/transactions"
							class="box mb-3 workspace-link"
						>
							<span class="has-text-weight-medium">{workspace.name}</span>
							<span class="ml-2 is-size-7 has-text-grey">/{workspace.id}/</span>
						</a>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Create new workspace form -->
		<section>
			<h2 class="title is-5">
				{data.workspaces.length > 0 ? 'Create Another Workspace' : 'Get Started'}
			</h2>

			<form
				method="POST"
				action="?/create"
				use:enhance
				class="box"
			>
				{#if form?.error}
					<div class="notification is-danger is-light">
						<p class="is-size-7">{form.error}</p>
					</div>
				{/if}

				<div class="field">
					<label for="name" class="label">Workspace Name</label>
					<div class="control">
						<input
							type="text"
							id="name"
							name="name"
							value={form?.name ?? ''}
							required
							placeholder="My Business"
							class="input"
						/>
					</div>
				</div>

				<div class="field">
					<label for="type" class="label">Workspace Type</label>
					<div class="control">
						<div class="select is-fullwidth">
							<select
								id="type"
								name="type"
								required
							>
								<option value="sole_prop" selected={form?.type === 'sole_prop'}>Sole Proprietor</option>
								<option value="volunteer_org" selected={form?.type === 'volunteer_org'}>Volunteer Organization</option>
							</select>
						</div>
					</div>
				</div>

				<div class="field">
					<div class="control">
						<button
							type="submit"
							class="button is-primary is-fullwidth"
						>
							Create Workspace
						</button>
					</div>
				</div>
			</form>
		</section>
	</div>
</section>

<style>
	.workspace-link {
		display: block;
		transition: border-color 0.15s ease;
	}
	.workspace-link:hover {
		border-color: var(--color-primary);
	}
</style>
