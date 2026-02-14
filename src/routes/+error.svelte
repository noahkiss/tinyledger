<script lang="ts">
	import { page } from '$app/stores';
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-bg px-4 text-center" data-component="error-page">
	<!-- Penny looking apologetic -->
	<img
		src="/brand/mascot-sitting-transparent.png"
		alt="Penny the Hedgehog"
		class="mb-6 w-48 opacity-80 md:w-64"
	/>

	<!-- Error code -->
	<h1 class="mb-2 text-6xl font-bold text-muted md:text-8xl">
		{$page.status}
	</h1>

	<!-- Error message -->
	<p class="mb-6 text-lg text-muted md:text-xl">
		{#if $page.status === 404}
			Penny couldn't find that page.
		{:else if $page.status >= 500}
			Something went wrong on our end.
		{:else}
			{$page.error?.message || "Something went wrong."}
		{/if}
	</p>

	<!-- Actions -->
	<div class="flex gap-3">
		<a
			href="/"
			class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
		>
			Go home
		</a>
		<button
			onclick={() => history.back()}
			class="rounded-md bg-surface px-4 py-2 text-sm font-medium text-fg hover:bg-surface-alt"
		>
			Go back
		</button>
	</div>
</div>
