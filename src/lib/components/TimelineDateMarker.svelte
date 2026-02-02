<script lang="ts">
	let { date, dayType = 'neutral' }: { date: string; dayType?: 'income' | 'expense' | 'mixed' | 'neutral' } = $props();

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

	// Dot color based on transaction types for the day
	let dotColorClass = $derived(() => {
		switch (dayType) {
			case 'income':
				return 'bg-green-500';
			case 'expense':
				return 'bg-red-500';
			case 'mixed':
				return 'bg-blue-500';
			default:
				return 'bg-gray-400';
		}
	});
</script>

<div class="absolute -left-3 flex items-center" data-component="timeline-date-marker">
	<!-- Circle marker on the timeline -->
	<span class="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-200 bg-white">
		<span class="h-2 w-2 rounded-full {dotColorClass()}"></span>
	</span>
</div>

<time datetime={date} class="mb-2 block text-sm font-medium text-gray-600">
	{formattedDate()}
</time>
