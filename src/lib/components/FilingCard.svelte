<script lang="ts">
	import { enhance } from '$app/forms';

	interface Filing {
		id: string;
		name: string;
		fullName: string;
		description: string;
		deadline: string;
		deadlineLabel: string;
		category: 'federal' | 'state';
		instructionsUrl?: string;
		isComplete: boolean;
		filedAt?: string | null;
		confirmationNumber?: string | null;
		notes?: string | null;
		isPastDue: boolean;
		isUpcoming: boolean;
	}

	interface Props {
		filing: Filing;
		fiscalYear: number;
		showMarkCompleteForm: boolean;
		onToggleForm: () => void;
	}

	let { filing, fiscalYear, showMarkCompleteForm, onToggleForm }: Props = $props();

	// Today's date in YYYY-MM-DD format for default filed date
	const today = new Date().toISOString().slice(0, 10);

	// Get status colors based on filing state
	function getStatusClass(): string {
		if (filing.isComplete) return 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/30';
		if (filing.isPastDue) return 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/30';
		if (filing.isUpcoming) return 'border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/30';
		return 'border-border bg-card';
	}

	// Format filed date for display
	function formatFiledDate(isoDate: string): string {
		const months = [
			'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
			'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
		];
		const [year, month, day] = isoDate.split('T')[0].split('-').map(Number);
		return `${months[month - 1]} ${day}, ${year}`;
	}
</script>

<div class="rounded-xl border p-4 {getStatusClass()}" data-filing-id={filing.id}>
	<!-- Header: name + status badge -->
	<div class="flex items-start justify-between mb-2">
		<div class="flex-1 min-w-0">
			<h3 class="font-semibold text-fg truncate">{filing.name}</h3>
			<p class="text-xs text-muted mt-0.5 line-clamp-2">{filing.description}</p>
		</div>
		<div class="ml-2 flex-shrink-0">
			{#if filing.isComplete}
				<span class="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-800 dark:text-green-300">
					Complete
				</span>
			{:else if filing.isPastDue}
				<span class="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/50 px-2 py-0.5 text-xs font-medium text-red-800 dark:text-red-300">
					Past Due
				</span>
			{:else if filing.isUpcoming}
				<span class="inline-flex items-center rounded-full bg-yellow-100 dark:bg-yellow-900/50 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:text-yellow-300">
					Upcoming
				</span>
			{/if}
		</div>
	</div>

	<!-- Due date line -->
	<p class="text-sm text-muted">Due: {filing.deadlineLabel}</p>

	<!-- Category badge + instructions link -->
	<div class="flex items-center gap-2 mt-2">
		<span class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium {filing.category === 'federal' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}">
			{filing.category === 'federal' ? 'Federal' : 'State'}
		</span>
		{#if filing.instructionsUrl}
			<a
				href={filing.instructionsUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="text-xs text-primary hover:text-primary hover:underline"
			>
				Instructions
			</a>
		{/if}
	</div>

	{#if filing.isComplete}
		<!-- Show filed details -->
		<div class="mt-3 space-y-1 text-sm text-muted border-t border-border pt-3">
			{#if filing.filedAt}
				<p>Filed: {formatFiledDate(filing.filedAt)}</p>
			{/if}
			{#if filing.confirmationNumber}
				<p>Confirmation: {filing.confirmationNumber}</p>
			{/if}
			{#if filing.notes}
				<p class="text-xs text-muted italic">{filing.notes}</p>
			{/if}
		</div>

		<!-- Unmark complete button -->
		<form method="POST" action="?/unmarkComplete" use:enhance class="mt-3">
			<input type="hidden" name="formId" value={filing.id} />
			<input type="hidden" name="fiscalYear" value={fiscalYear} />
			<button
				type="submit"
				class="text-sm text-muted hover:text-fg underline"
			>
				Unmark as complete
			</button>
		</form>
	{:else}
		<!-- Mark complete button/form -->
		{#if showMarkCompleteForm}
			<form method="POST" action="?/markComplete" use:enhance class="mt-3 space-y-3 border-t border-border pt-3">
				<input type="hidden" name="formId" value={filing.id} />
				<input type="hidden" name="fiscalYear" value={fiscalYear} />

				<div>
					<label for="filedAt-{filing.id}" class="block text-xs font-medium text-fg">
						Date Filed
					</label>
					<input
						type="date"
						id="filedAt-{filing.id}"
						name="filedAt"
						value={today}
						class="mt-1 block w-full rounded-md bg-input border-input-border text-sm shadow-sm focus:border-input-focus focus:ring-primary"
					/>
				</div>

				<div>
					<label for="confirmationNumber-{filing.id}" class="block text-xs font-medium text-fg">
						Confirmation Number (optional)
					</label>
					<input
						type="text"
						id="confirmationNumber-{filing.id}"
						name="confirmationNumber"
						placeholder="e.g., 1234567890"
						class="mt-1 block w-full rounded-md bg-input border-input-border text-sm shadow-sm focus:border-input-focus focus:ring-primary"
					/>
				</div>

				<div>
					<label for="notes-{filing.id}" class="block text-xs font-medium text-fg">
						Notes (optional)
					</label>
					<input
						type="text"
						id="notes-{filing.id}"
						name="notes"
						placeholder="e.g., E-filed via TurboTax"
						class="mt-1 block w-full rounded-md bg-input border-input-border text-sm shadow-sm focus:border-input-focus focus:ring-primary"
					/>
				</div>

				<div class="flex gap-2">
					<button
						type="submit"
						class="flex-1 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
					>
						Mark Complete
					</button>
					<button
						type="button"
						onclick={onToggleForm}
						class="rounded-md border border-input-border px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface"
					>
						Cancel
					</button>
				</div>
			</form>
		{:else}
			<button
				type="button"
				onclick={onToggleForm}
				class="mt-3 w-full rounded-md border border-input-border bg-card px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface"
			>
				Mark Complete
			</button>
		{/if}
	{/if}
</div>
