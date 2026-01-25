<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.settings.name} - TinyLedger</title>
</svelte:head>

<div class="text-center">
	<h2 class="text-xl font-semibold text-gray-800">Welcome to {data.settings.name}</h2>
	<p class="mt-2 text-gray-600">
		Your workspace is ready. Transaction entry will be available in Phase 2.
	</p>

	<div class="mt-8">
		<a
			href="/w/{data.workspaceId}/settings"
			class="inline-block rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 active:bg-blue-800"
		>
			Configure Workspace Settings
		</a>
	</div>
</div>
