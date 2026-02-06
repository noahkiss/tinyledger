<script lang="ts">
	import {
		Chart,
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		CategoryScale,
		Tooltip,
		Legend,
		Filler
	} from 'chart.js';
	import type { ChartEvent, ActiveElement } from 'chart.js';
	import { goto } from '$app/navigation';
	import { formatCurrency } from '$lib/utils/currency';

	// Register required Chart.js components
	Chart.register(
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		CategoryScale,
		Tooltip,
		Legend,
		Filler
	);

	interface Props {
		data: { period: string; net: number }[];
		workspaceId: string;
		fiscalYear: number;
	}

	let { data, workspaceId, fiscalYear }: Props = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	// Get last day of month helper
	function getLastDayOfMonth(year: string, month: string): string {
		const y = parseInt(year, 10);
		const m = parseInt(month, 10);
		const lastDay = new Date(y, m, 0).getDate();
		return lastDay.toString().padStart(2, '0');
	}

	// Format period label for display
	// Monthly: "2026-01" -> "Jan"
	// Quarterly: "2026-Q1" -> "Q1"
	function formatPeriodLabel(period: string): string {
		if (period.includes('Q')) {
			// Quarterly format: "2026-Q1" -> "Q1"
			return period.split('-')[1];
		}
		// Monthly format: "2026-01" -> "Jan"
		const [year, month] = period.split('-');
		const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
		return date.toLocaleString('en-US', { month: 'short' });
	}

	// Get quarter date range
	function getQuarterDateRange(
		year: string,
		quarter: string
	): { from: string; to: string } {
		const q = parseInt(quarter.replace('Q', ''), 10);
		const startMonth = (q - 1) * 3 + 1;
		const endMonth = q * 3;
		const from = `${year}-${startMonth.toString().padStart(2, '0')}-01`;
		const to = `${year}-${endMonth.toString().padStart(2, '0')}-${getLastDayOfMonth(year, endMonth.toString().padStart(2, '0'))}`;
		return { from, to };
	}

	// Click handler: navigate to transactions with date filter
	function handleClick(_event: ChartEvent, elements: ActiveElement[]) {
		if (elements.length === 0) return;
		const period = data[elements[0].index].period;
		let from: string, to: string;

		if (period.includes('Q')) {
			// Quarterly format: "2026-Q1"
			const [year, quarter] = period.split('-');
			({ from, to } = getQuarterDateRange(year, quarter));
		} else {
			// Monthly format: "2026-01"
			const [year, month] = period.split('-');
			from = `${year}-${month}-01`;
			to = `${year}-${month}-${getLastDayOfMonth(year, month)}`;
		}
		goto(`/w/${workspaceId}/transactions?fy=${fiscalYear}&from=${from}&to=${to}`);
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

		chart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: data.map((d) => formatPeriodLabel(d.period)),
				datasets: [
					{
						label: 'Net Income',
						data: data.map((d) => d.net),
						borderColor: '#3b82f6',
						backgroundColor: 'rgba(59, 130, 246, 0.1)',
						borderWidth: 2,
						fill: true,
						pointRadius: 4,
						pointHoverRadius: 6,
						tension: 0.3
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				onClick: handleClick,
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							label: (ctx) => formatCurrency(ctx.parsed.y ?? 0)
						}
					}
				},
				scales: {
					x: {
						grid: { display: false }
					},
					y: {
						grid: { color: 'rgba(0, 0, 0, 0.05)' },
						ticks: {
							callback: (value) =>
								typeof value === 'number' ? formatCurrency(value) : String(value)
						}
					}
				},
				interaction: {
					intersect: false,
					mode: 'index'
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
	<div class="is-flex is-align-items-center is-justify-content-center has-text-grey" style="height: 16rem;">No data available</div>
{:else}
	<div style="height: 16rem;">
		<canvas bind:this={canvas}></canvas>
	</div>
{/if}
