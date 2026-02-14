<script lang="ts">
	import { Chart, BarController, BarElement, LinearScale, CategoryScale, Tooltip } from 'chart.js';
	import type { ChartEvent, ActiveElement } from 'chart.js';
	import { goto } from '$app/navigation';
	import { formatCurrency } from '$lib/utils/currency';

	// Register required Chart.js components
	Chart.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip);

	interface Props {
		data: { tagId: number; tagName: string; totalCents: number }[];
		workspaceId: string;
		fiscalYear: number;
	}

	let { data, workspaceId, fiscalYear }: Props = $props();

	let canvas = $state<HTMLCanvasElement | undefined>();
	let chart: Chart | null = null;

	// Color palette read from CSS vars (theme-aware)
	function getChartPalette(): string[] {
		const styles = getComputedStyle(document.documentElement);
		const get = (name: string) => styles.getPropertyValue(name).trim();
		return [
			get('--color-primary'),
			get('--color-success'),
			get('--color-warning'),
			get('--color-error'),
			get('--color-accent'),
			get('--color-subtle'),
			get('--color-primary-muted'),
			get('--color-success-muted')
		];
	}

	// Dynamic height based on number of tags
	const chartHeight = $derived(Math.min(Math.max(data.length * 32, 192), 384));

	// Click handler: navigate to transactions with tag filter
	function handleClick(_event: ChartEvent, elements: ActiveElement[]) {
		if (elements.length === 0) return;
		const tagId = data[elements[0].index].tagId;
		// Don't navigate for "Other" pseudo-tag
		if (tagId === -1) return;
		goto(`/w/${workspaceId}/transactions?fy=${fiscalYear}&tag=${tagId}`);
	}

	$effect(() => {
		// Cleanup previous chart instance
		if (chart) {
			chart.destroy();
			chart = null;
		}

		if (!canvas || data.length === 0) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Assign colors from palette, cycling if needed
		const colorPalette = getChartPalette();
		const barColors = data.map((_, i) => colorPalette[i % colorPalette.length]);

		chart = new Chart(ctx, {
			type: 'bar',
			data: {
				labels: data.map((d) => d.tagName),
				datasets: [
					{
						label: 'Spending',
						data: data.map((d) => d.totalCents),
						backgroundColor: barColors,
						borderRadius: 4
					}
				]
			},
			options: {
				indexAxis: 'y', // Horizontal bar chart
				responsive: true,
				maintainAspectRatio: false,
				onClick: handleClick,
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							label: (ctx) => formatCurrency(ctx.parsed.x ?? 0)
						}
					}
				},
				scales: {
					x: {
						grid: { color: 'rgba(0, 0, 0, 0.05)' },
						ticks: {
							callback: (value) =>
								typeof value === 'number' ? formatCurrency(value) : String(value)
						}
					},
					y: {
						grid: { display: false }
					}
				}
			}
		});

		// Cleanup on unmount or when dependencies change
		return () => {
			chart?.destroy();
			chart = null;
		};
	});
</script>

{#if data.length === 0}
	<div class="flex h-48 items-center justify-center text-muted">No expense data</div>
{:else}
	<div style="height: {chartHeight}px">
		<canvas bind:this={canvas}></canvas>
	</div>
{/if}
