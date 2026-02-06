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

	// Get status variant
	function getStatusVariant(): 'complete' | 'past-due' | 'upcoming' | 'default' {
		if (filing.isComplete) return 'complete';
		if (filing.isPastDue) return 'past-due';
		if (filing.isUpcoming) return 'upcoming';
		return 'default';
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

<div class="card filing-card" class:status-complete={getStatusVariant() === 'complete'} class:status-past-due={getStatusVariant() === 'past-due'} class:status-upcoming={getStatusVariant() === 'upcoming'} data-filing-id={filing.id}>
	<div class="card-content">
		<!-- Header: name + status badge -->
		<div class="is-flex is-justify-content-space-between is-align-items-start mb-2">
			<div class="filing-name-col">
				<h3 class="has-text-weight-semibold filing-title">{filing.name}</h3>
				<p class="is-size-7 filing-desc mt-1">{filing.description}</p>
			</div>
			<div class="ml-2 is-flex-shrink-0">
				{#if filing.isComplete}
					<span class="tag is-success is-light is-rounded">Complete</span>
				{:else if filing.isPastDue}
					<span class="tag is-danger is-light is-rounded">Past Due</span>
				{:else if filing.isUpcoming}
					<span class="tag is-warning is-light is-rounded">Upcoming</span>
				{/if}
			</div>
		</div>

		<!-- Due date line -->
		<p class="is-size-7 muted-text">Due: {filing.deadlineLabel}</p>

		<!-- Category badge + instructions link -->
		<div class="is-flex is-align-items-center mt-2">
			<span class="tag is-small" class:category-federal={filing.category === 'federal'} class:category-state={filing.category === 'state'}>
				{filing.category === 'federal' ? 'Federal' : 'State'}
			</span>
			{#if filing.instructionsUrl}
				<a
					href={filing.instructionsUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="is-size-7 ml-2 instructions-link"
				>
					Instructions
				</a>
			{/if}
		</div>

		{#if filing.isComplete}
			<!-- Show filed details -->
			<div class="filed-details mt-3 pt-3">
				{#if filing.filedAt}
					<p class="is-size-7 muted-text">Filed: {formatFiledDate(filing.filedAt)}</p>
				{/if}
				{#if filing.confirmationNumber}
					<p class="is-size-7 muted-text">Confirmation: {filing.confirmationNumber}</p>
				{/if}
				{#if filing.notes}
					<p class="is-size-7 muted-text is-italic">{filing.notes}</p>
				{/if}
			</div>

			<!-- Unmark complete button -->
			<form method="POST" action="?/unmarkComplete" use:enhance class="mt-3">
				<input type="hidden" name="formId" value={filing.id} />
				<input type="hidden" name="fiscalYear" value={fiscalYear} />
				<button
					type="submit"
					class="button is-ghost is-small unmark-btn"
				>
					Unmark as complete
				</button>
			</form>
		{:else}
			<!-- Mark complete button/form -->
			{#if showMarkCompleteForm}
				<form method="POST" action="?/markComplete" use:enhance class="mt-3 pt-3 mark-form">
					<input type="hidden" name="formId" value={filing.id} />
					<input type="hidden" name="fiscalYear" value={fiscalYear} />

					<div class="field">
						<label for="filedAt-{filing.id}" class="label is-small">
							Date Filed
						</label>
						<div class="control">
							<input
								type="date"
								id="filedAt-{filing.id}"
								name="filedAt"
								value={today}
								class="input is-small"
							/>
						</div>
					</div>

					<div class="field">
						<label for="confirmationNumber-{filing.id}" class="label is-small">
							Confirmation Number (optional)
						</label>
						<div class="control">
							<input
								type="text"
								id="confirmationNumber-{filing.id}"
								name="confirmationNumber"
								placeholder="e.g., 1234567890"
								class="input is-small"
							/>
						</div>
					</div>

					<div class="field">
						<label for="notes-{filing.id}" class="label is-small">
							Notes (optional)
						</label>
						<div class="control">
							<input
								type="text"
								id="notes-{filing.id}"
								name="notes"
								placeholder="e.g., E-filed via TurboTax"
								class="input is-small"
							/>
						</div>
					</div>

					<div class="field is-grouped">
						<div class="control is-expanded">
							<button
								type="submit"
								class="button is-success is-small is-fullwidth"
							>
								Mark Complete
							</button>
						</div>
						<div class="control">
							<button
								type="button"
								onclick={onToggleForm}
								class="button is-small"
							>
								Cancel
							</button>
						</div>
					</div>
				</form>
			{:else}
				<button
					type="button"
					onclick={onToggleForm}
					class="button is-small is-fullwidth mt-3"
				>
					Mark Complete
				</button>
			{/if}
		{/if}
	</div>
</div>

<style>
	.filing-card {
		border: 1px solid var(--color-card-border);
		border-radius: 0.75rem;
	}

	.status-complete {
		border-color: var(--color-success-muted);
		background-color: color-mix(in srgb, var(--color-success) 5%, var(--color-card-bg));
	}

	.status-past-due {
		border-color: var(--color-error-muted);
		background-color: color-mix(in srgb, var(--color-error) 5%, var(--color-card-bg));
	}

	.status-upcoming {
		border-color: var(--color-warning-muted);
		background-color: color-mix(in srgb, var(--color-warning) 5%, var(--color-card-bg));
	}

	.filing-name-col {
		flex: 1;
		min-width: 0;
	}

	.filing-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.filing-desc {
		color: var(--color-muted);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.muted-text {
		color: var(--color-muted);
	}

	.category-federal {
		background-color: color-mix(in srgb, var(--color-primary) 10%, transparent);
		color: var(--color-primary);
	}

	.category-state {
		background-color: color-mix(in srgb, var(--color-accent) 10%, transparent);
		color: var(--color-accent);
	}

	.instructions-link {
		color: var(--color-primary);
	}

	.instructions-link:hover {
		text-decoration: underline;
	}

	.filed-details {
		border-top: 1px solid var(--color-border);
	}

	.filed-details p {
		margin-bottom: 0.25rem;
	}

	.unmark-btn {
		color: var(--color-muted);
		text-decoration: underline;
		padding: 0;
		height: auto;
	}

	.unmark-btn:hover {
		color: var(--color-foreground);
	}

	.mark-form {
		border-top: 1px solid var(--color-border);
	}
</style>
