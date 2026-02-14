<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import Select from '$lib/components/Select.svelte';

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

<main class="min-h-screen bg-bg px-4 py-8">
	<div class="mx-auto max-w-lg">
		<!-- Header -->
		<header class="mb-8 text-center">
			<h1 class="text-3xl font-bold text-fg">TinyLedger</h1>
			<p class="mt-2 text-muted">Simple bookkeeping for small businesses</p>
		</header>

		<!-- Quick resume if last workspace exists -->
		{#if lastWorkspace}
			<div class="mb-6 rounded-lg border border-primary/30 bg-primary/10 p-4">
				<p class="text-sm text-primary">Continue where you left off</p>
				<a
					href="/w/{lastWorkspace.id}/transactions"
					class="mt-2 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover active:opacity-90"
				>
					Continue to {lastWorkspace.name}
				</a>
			</div>
		{/if}

		<!-- Existing workspaces -->
		{#if data.workspaces.length > 0}
			<section class="mb-8">
				<h2 class="mb-3 text-lg font-semibold text-fg">Your Workspaces</h2>
				<ul class="space-y-2">
					{#each data.workspaces as workspace}
						<li>
							<a
								href="/w/{workspace.id}/transactions"
								class="block rounded-lg border border-card-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-surface-alt"
							>
								<span class="font-medium text-fg">{workspace.name}</span>
								<span class="ml-2 text-sm text-muted">/{workspace.id}/</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<!-- Create new workspace form -->
		<section>
			<h2 class="mb-3 text-lg font-semibold text-fg">
				{data.workspaces.length > 0 ? 'Create Another Workspace' : 'Get Started'}
			</h2>

			<form
				method="POST"
				action="?/create"
				use:enhance
				class="space-y-4 rounded-lg border border-card-border bg-card p-6"
			>
				{#if form?.error}
					<div class="rounded-md bg-error/10 p-3 text-sm text-error">
						{form.error}
					</div>
				{/if}

				<div>
					<label for="name" class="block text-sm font-medium text-fg"> Workspace Name </label>
					<input
						type="text"
						id="name"
						name="name"
						value={form?.name ?? ''}
						required
						placeholder="My Business"
						class="mt-1 block w-full rounded-md border border-input-border bg-input px-4 py-3 text-fg placeholder-muted focus:border-input-focus focus:outline-none focus:ring-2 focus:ring-primary/50"
					/>
				</div>

				<div>
					<label for="type" class="block text-sm font-medium text-fg"> Workspace Type </label>
					<div class="mt-1">
						<Select
							id="type"
							name="type"
							value={form?.type ?? 'sole_prop'}
							options={[
								{ value: 'sole_prop', label: 'Sole Proprietor' },
								{ value: 'volunteer_org', label: 'Volunteer Organization' }
							]}
							required
						/>
					</div>
				</div>

				<button
					type="submit"
					class="w-full rounded-md bg-primary px-4 py-3 font-medium text-white hover:bg-primary-hover active:opacity-90"
				>
					Create Workspace
				</button>
			</form>
		</section>
	</div>
</main>
