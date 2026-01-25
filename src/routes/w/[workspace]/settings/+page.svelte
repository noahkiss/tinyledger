<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import WorkspaceLogo from '$lib/components/WorkspaceLogo.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Preview for logo upload
	let logoPreviewUrl = $state<string | null>(null);

	function handleLogoChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (file) {
			// Create preview URL
			logoPreviewUrl = URL.createObjectURL(file);
		} else {
			logoPreviewUrl = null;
		}
	}

	// Cleanup preview URL on unmount
	$effect(() => {
		return () => {
			if (logoPreviewUrl) {
				URL.revokeObjectURL(logoPreviewUrl);
			}
		};
	});
</script>

<svelte:head>
	<title>Settings - {data.settings.name} - TinyLedger</title>
</svelte:head>

<div>
	<h2 class="mb-6 text-xl font-semibold text-gray-800">Workspace Settings</h2>

	<form
		method="POST"
		action="?/save"
		enctype="multipart/form-data"
		use:enhance
		class="space-y-6 rounded-lg border border-gray-200 bg-white p-6"
	>
		{#if form?.error}
			<div class="rounded-lg bg-red-50 p-3 text-sm text-red-800">
				{form.error}
			</div>
		{/if}

		{#if form?.success}
			<div class="rounded-lg bg-green-50 p-3 text-sm text-green-800">Settings saved successfully!</div>
		{/if}

		<!-- Logo section -->
		<div>
			<label for="logo" class="block text-sm font-medium text-gray-700">Logo</label>
			<div class="mt-2 flex items-center gap-4">
				{#if logoPreviewUrl}
					<img
						src={logoPreviewUrl}
						alt="Logo preview"
						class="h-16 w-16 rounded-lg object-cover"
					/>
				{:else}
					<WorkspaceLogo
						workspaceId={data.workspaceId}
						logoFilename={data.settings.logoFilename}
						name={data.settings.name}
						size="lg"
					/>
				{/if}
				<div>
					<input
						type="file"
						id="logo"
						name="logo"
						accept="image/*"
						onchange={handleLogoChange}
						class="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
					/>
					<p class="mt-1 text-xs text-gray-500">PNG, JPG, or GIF. Will be resized to 128x128.</p>
				</div>
			</div>
		</div>

		<!-- Basic info -->
		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label for="name" class="block text-sm font-medium text-gray-700">Workspace Name</label>
				<input
					type="text"
					id="name"
					name="name"
					value={data.settings.name}
					required
					class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<div>
				<label for="type" class="block text-sm font-medium text-gray-700">Workspace Type</label>
				<select
					id="type"
					name="type"
					required
					class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					<option value="sole_prop" selected={data.settings.type === 'sole_prop'}
						>Sole Proprietor</option
					>
					<option value="volunteer_org" selected={data.settings.type === 'volunteer_org'}
						>Volunteer Organization</option
					>
				</select>
			</div>
		</div>

		<!-- Business details -->
		<div>
			<label for="businessName" class="block text-sm font-medium text-gray-700">Business Name</label>
			<input
				type="text"
				id="businessName"
				name="businessName"
				value={data.settings.businessName ?? ''}
				placeholder="Legal business name"
				class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
		</div>

		<div>
			<label for="address" class="block text-sm font-medium text-gray-700">Business Address</label>
			<textarea
				id="address"
				name="address"
				rows="2"
				placeholder="Street address, city, state, ZIP"
				class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
				>{data.settings.address ?? ''}</textarea
			>
		</div>

		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label for="phone" class="block text-sm font-medium text-gray-700">Phone Number</label>
				<input
					type="tel"
					id="phone"
					name="phone"
					value={data.settings.phone ?? ''}
					placeholder="(555) 555-5555"
					class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<div>
				<label for="foundedYear" class="block text-sm font-medium text-gray-700">Founded Year</label>
				<input
					type="number"
					id="foundedYear"
					name="foundedYear"
					value={data.settings.foundedYear ?? ''}
					min="1800"
					max={new Date().getFullYear()}
					placeholder="2020"
					class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>
		</div>

		<div>
			<label for="responsibleParty" class="block text-sm font-medium text-gray-700"
				>Responsible Party</label
			>
			<input
				type="text"
				id="responsibleParty"
				name="responsibleParty"
				value={data.settings.responsibleParty ?? ''}
				placeholder="Owner/manager name"
				class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
		</div>

		<div class="flex justify-end gap-3 pt-4">
			<a
				href="/w/{data.workspaceId}/"
				class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
			>
				Cancel
			</a>
			<button
				type="submit"
				class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 active:bg-blue-800"
			>
				Save Settings
			</button>
		</div>
	</form>

	<!-- Tags Management Link -->
	<div class="mt-6 rounded-lg border border-gray-200 bg-white p-6">
		<h3 class="text-lg font-medium text-gray-900">Tags & Categories</h3>
		<p class="mt-1 text-sm text-gray-500">
			Manage expense categories, rename or merge tags, and control tag creation.
		</p>
		<a
			href="/w/{data.workspaceId}/settings/tags"
			class="mt-4 inline-flex items-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
		>
			Manage Tags
			<svg class="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</a>
	</div>
</div>
