import type { RRule } from 'rrule';
import { parseRRuleString } from './patterns';

export interface PendingInstance {
	templateId: number;
	templatePublicId: string;
	date: string; // YYYY-MM-DD
	type: 'income' | 'expense';
	payee: string;
	amountCents: number;
	description: string | null;
	patternDescription: string;
}

/**
 * Get pending instances for a template within date range.
 * Excludes already confirmed (transactions exist) and skipped instances.
 */
export function getPendingInstances(
	rule: RRule,
	startDate: Date,
	endDate: Date,
	confirmedDates: Set<string>,
	skippedDates: Set<string>
): string[] {
	const occurrences = rule.between(startDate, endDate, true);

	return occurrences
		.map((d) => d.toISOString().split('T')[0])
		.filter((date) => !confirmedDates.has(date) && !skippedDates.has(date));
}

/**
 * Get next occurrence date for a template.
 */
export function getNextOccurrence(
	rruleString: string,
	confirmedDates: Set<string>,
	skippedDates: Set<string>
): string | null {
	const rule = parseRRuleString(rruleString);
	const now = new Date();
	const sixMonthsLater = new Date();
	sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

	const pending = getPendingInstances(rule, now, sixMonthsLater, confirmedDates, skippedDates);
	return pending.length > 0 ? pending[0] : null;
}

/**
 * Get all pending instances for display in timeline.
 * Returns instances for the fiscal year, from today forward.
 */
export function getAllPendingForTimeline(
	templates: Array<{
		id: number;
		publicId: string;
		type: 'income' | 'expense';
		payee: string;
		amountCents: number;
		description: string | null;
		rruleString: string;
		patternDescription: string;
		active: boolean;
	}>,
	confirmedByTemplate: Map<number, Set<string>>,
	skippedByTemplate: Map<number, Set<string>>,
	fiscalYearStart: string,
	fiscalYearEnd: string
): PendingInstance[] {
	const instances: PendingInstance[] = [];
	const startDate = new Date(fiscalYearStart);
	const endDate = new Date(fiscalYearEnd);
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	// Only show future instances (from today forward within FY)
	const effectiveStart = startDate > today ? startDate : today;

	for (const template of templates) {
		if (!template.active) continue;

		const rule = parseRRuleString(template.rruleString);
		const confirmed = confirmedByTemplate.get(template.id) || new Set();
		const skipped = skippedByTemplate.get(template.id) || new Set();

		const dates = getPendingInstances(rule, effectiveStart, endDate, confirmed, skipped);

		for (const date of dates) {
			instances.push({
				templateId: template.id,
				templatePublicId: template.publicId,
				date,
				type: template.type,
				payee: template.payee,
				amountCents: template.amountCents,
				description: template.description,
				patternDescription: template.patternDescription
			});
		}
	}

	// Sort by date
	instances.sort((a, b) => a.date.localeCompare(b.date));
	return instances;
}
