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

<main class="min-h-screen bg-gray-50 px-4 py-8">
	<div class="mx-auto max-w-lg">
		<!-- Header -->
		<header class="mb-8 text-center">
			<h1 class="text-3xl font-bold text-gray-900">TinyLedger</h1>
			<p class="mt-2 text-gray-600">Simple bookkeeping for small businesses</p>
		</header>

		<!-- Quick resume if last workspace exists -->
		{#if lastWorkspace}
			<div class="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
				<p class="text-sm text-blue-800">Continue where you left off</p>
				<a
					href="/w/{lastWorkspace.id}/transactions"
					class="mt-2 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 active:bg-blue-800"
				>
					Continue to {lastWorkspace.name}
				</a>
			</div>
		{/if}

		<!-- Existing workspaces -->
		{#if data.workspaces.length > 0}
			<section class="mb-8">
				<h2 class="mb-3 text-lg font-semibold text-gray-800">Your Workspaces</h2>
				<ul class="space-y-2">
					{#each data.workspaces as workspace}
						<li>
							<a
								href="/w/{workspace.id}/transactions"
								class="block rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:bg-blue-50 active:bg-blue-100"
							>
								<span class="font-medium text-gray-900">{workspace.name}</span>
								<span class="ml-2 text-sm text-gray-500">/{workspace.id}/</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<!-- Create new workspace form -->
		<section>
			<h2 class="mb-3 text-lg font-semibold text-gray-800">
				{data.workspaces.length > 0 ? 'Create Another Workspace' : 'Get Started'}
			</h2>

			<form
				method="POST"
				action="?/create"
				use:enhance
				class="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
			>
				{#if form?.error}
					<div class="rounded-lg bg-red-50 p-3 text-sm text-red-800">
						{form.error}
					</div>
				{/if}

				<div>
					<label for="name" class="block text-sm font-medium text-gray-700"> Workspace Name </label>
					<input
						type="text"
						id="name"
						name="name"
						value={form?.name ?? ''}
						required
						placeholder="My Business"
						class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<div>
					<label for="type" class="block text-sm font-medium text-gray-700"> Workspace Type </label>
					<select
						id="type"
						name="type"
						required
						class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="sole_prop" selected={form?.type === 'sole_prop'}>Sole Proprietor</option>
						<option value="volunteer_org" selected={form?.type === 'volunteer_org'}
							>Volunteer Organization</option
						>
					</select>
				</div>

				<button
					type="submit"
					class="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 active:bg-blue-800"
				>
					Create Workspace
				</button>
			</form>
		</section>
	</div>
</main>
