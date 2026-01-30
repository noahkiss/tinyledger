<script lang="ts">
	let { date }: { date: string } = $props();

	// Format date as "Thursday, January 30, 2026"
	let formattedDate = $derived(() => {
		const d = new Date(date + 'T00:00:00'); // Ensure local timezone
		return new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		}).format(d);
	});
</script>

<div class="absolute -left-3 flex items-center">
	<!-- Circle marker on the timeline -->
	<span class="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-200 bg-white">
		<span class="h-2 w-2 rounded-full bg-gray-400"></span>
	</span>
</div>

<time datetime={date} class="mb-2 block text-sm font-medium text-gray-600">
	{formattedDate()}
</time>
