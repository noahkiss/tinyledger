<script lang="ts">
	import {
		Chart,
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		CategoryScale
	} from 'chart.js';

	// Register only what we need for sparklines
	Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale);

	interface Props {
		data: number[];
		class?: string;
	}

	let { data, class: className = '' }: Props = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	$effect(() => {
		// Cleanup previous chart instance
		if (chart) {
			chart.destroy();
			chart = null;
		}

		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Read theme-aware colors
		const styles = getComputedStyle(document.documentElement);
		const trendColor =
			data.length >= 2 && data[data.length - 1] < data[0]
				? styles.getPropertyValue('--color-error').trim()
				: styles.getPropertyValue('--color-success').trim();

		chart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: data.map((_, i) => i.toString()),
				datasets: [
					{
						data: data,
						borderColor: trendColor,
						borderWidth: 2,
						fill: false,
						pointRadius: 0,
						tension: 0.3
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					tooltip: { enabled: false }
				},
				scales: {
					x: { display: false },
					y: { display: false }
				},
				interaction: {
					intersect: false,
					mode: 'index'
				},
				events: []
			}
		});

		// Cleanup on unmount or when dependencies change
		return () => {
			chart?.destroy();
			chart = null;
		};
	});
</script>

<div class="h-8 w-24 {className}">
	<canvas bind:this={canvas}></canvas>
</div>
