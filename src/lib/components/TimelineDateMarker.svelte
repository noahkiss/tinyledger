<script lang="ts">
	let { date, dayType = 'neutral' }: { date: string; dayType?: 'income' | 'expense' | 'mixed' | 'neutral' | 'tax' | 'pending' } = $props();

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
	let dotColor = $derived(() => {
		switch (dayType) {
			case 'income':
				return 'var(--color-success)';
			case 'expense':
				return 'var(--color-error)';
			case 'mixed':
				return 'var(--color-primary)';
			case 'tax':
				return 'var(--color-warning)';
			case 'pending':
				return 'var(--color-overlay)';
			default:
				return 'var(--color-overlay)';
		}
	});
</script>

<div class="date-marker" data-component="timeline-date-marker">
	<!-- Circle marker on the timeline -->
	<span class="marker-circle">
		<span class="marker-dot" style="background-color: {dotColor()}"></span>
	</span>
</div>

<time datetime={date} class="is-size-7 has-text-weight-medium date-label mb-2">
	{formattedDate()}
</time>

<style>
	.date-marker {
		position: absolute;
		left: -0.75rem;
		display: flex;
		align-items: center;
	}

	.marker-circle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		border: 2px solid var(--color-border);
		background-color: var(--color-card-bg);
	}

	.marker-dot {
		display: block;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
	}

	.date-label {
		display: block;
		color: var(--color-muted);
	}
</style>
