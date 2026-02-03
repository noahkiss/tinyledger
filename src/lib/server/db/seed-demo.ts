import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { randomUUID } from 'crypto';

/**
 * Seed demo data for screenshots and testing.
 * Creates realistic transactions for a freelance consultant.
 */
export function seedDemoData(db: BetterSQLite3Database<typeof schema>): void {
	// Check if already seeded (has transactions)
	const existing = db.select().from(schema.transactions).limit(1).all();
	if (existing.length > 0) {
		return; // Already seeded
	}

	// Get tag IDs (seeded by seedScheduleCTags)
	const allTags = db.select().from(schema.tags).all();
	const tagMap = new Map(allTags.map((t) => [t.name, t.id]));

	// Helper to get tag ID
	const getTagId = (name: string): number => {
		const id = tagMap.get(name);
		if (!id) throw new Error(`Tag not found: ${name}`);
		return id;
	};

	// Helper to convert dollars to cents
	const cents = (dollars: number): number => Math.round(dollars * 100);

	// Generate dates relative to current year for fresh screenshots
	const year = new Date().getFullYear();
	const date = (month: number, day: number): string =>
		`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

	// Demo transactions - mix of income and expenses for a freelance consultant
	const demoTransactions: Array<{
		type: 'income' | 'expense';
		amountCents: number;
		date: string;
		payee: string;
		description: string | null;
		paymentMethod: 'cash' | 'card' | 'check';
		checkNumber?: string;
		tags: Array<{ name: string; percentage: number }>;
	}> = [
		// Income - Client payments
		{
			type: 'income',
			amountCents: cents(4500),
			date: date(1, 15),
			payee: 'Acme Corp',
			description: 'January consulting retainer',
			paymentMethod: 'check',
			checkNumber: '1001',
			tags: [{ name: 'Service Income', percentage: 100 }]
		},
		{
			type: 'income',
			amountCents: cents(2800),
			date: date(1, 28),
			payee: 'TechStart Inc',
			description: 'Website audit project',
			paymentMethod: 'card',
			tags: [{ name: 'Service Income', percentage: 100 }]
		},
		{
			type: 'income',
			amountCents: cents(4500),
			date: date(2, 15),
			payee: 'Acme Corp',
			description: 'February consulting retainer',
			paymentMethod: 'check',
			checkNumber: '1042',
			tags: [{ name: 'Service Income', percentage: 100 }]
		},
		{
			type: 'income',
			amountCents: cents(1200),
			date: date(2, 20),
			payee: 'Local Business Council',
			description: 'Workshop presentation fee',
			paymentMethod: 'check',
			checkNumber: '5521',
			tags: [{ name: 'Service Income', percentage: 100 }]
		},

		// Expenses - Office & Supplies
		{
			type: 'expense',
			amountCents: cents(89.99),
			date: date(1, 5),
			payee: 'Office Depot',
			description: 'Printer paper and toner',
			paymentMethod: 'card',
			tags: [{ name: 'Office Expenses', percentage: 100 }]
		},
		{
			type: 'expense',
			amountCents: cents(149.99),
			date: date(1, 12),
			payee: 'Amazon',
			description: 'Ergonomic keyboard and mouse',
			paymentMethod: 'card',
			tags: [{ name: 'Office Expenses', percentage: 100 }]
		},

		// Expenses - Software subscriptions
		{
			type: 'expense',
			amountCents: cents(12.99),
			date: date(1, 1),
			payee: 'GitHub',
			description: 'Pro subscription - January',
			paymentMethod: 'card',
			tags: [{ name: 'Subscriptions & Dues', percentage: 100 }]
		},
		{
			type: 'expense',
			amountCents: cents(20),
			date: date(1, 1),
			payee: 'Anthropic',
			description: 'Claude Pro - January',
			paymentMethod: 'card',
			tags: [{ name: 'Computer & Software', percentage: 100 }]
		},
		{
			type: 'expense',
			amountCents: cents(12.99),
			date: date(2, 1),
			payee: 'GitHub',
			description: 'Pro subscription - February',
			paymentMethod: 'card',
			tags: [{ name: 'Subscriptions & Dues', percentage: 100 }]
		},
		{
			type: 'expense',
			amountCents: cents(20),
			date: date(2, 1),
			payee: 'Anthropic',
			description: 'Claude Pro - February',
			paymentMethod: 'card',
			tags: [{ name: 'Computer & Software', percentage: 100 }]
		},

		// Expenses - Travel
		{
			type: 'expense',
			amountCents: cents(342.5),
			date: date(1, 22),
			payee: 'Delta Airlines',
			description: 'Flight to client meeting - Chicago',
			paymentMethod: 'card',
			tags: [{ name: 'Travel', percentage: 100 }]
		},
		{
			type: 'expense',
			amountCents: cents(189),
			date: date(1, 22),
			payee: 'Marriott',
			description: 'Hotel - Chicago client meeting',
			paymentMethod: 'card',
			tags: [{ name: 'Travel', percentage: 100 }]
		},
		{
			type: 'expense',
			amountCents: cents(47.82),
			date: date(1, 23),
			payee: 'Uber',
			description: 'Airport transfers - Chicago trip',
			paymentMethod: 'card',
			tags: [{ name: 'Travel', percentage: 100 }]
		},

		// Expenses - Meals (business)
		{
			type: 'expense',
			amountCents: cents(86.5),
			date: date(1, 23),
			payee: 'Gibson\'s Steakhouse',
			description: 'Client dinner - Acme Corp',
			paymentMethod: 'card',
			tags: [{ name: 'Meals & Entertainment', percentage: 100 }]
		},
		{
			type: 'expense',
			amountCents: cents(32.4),
			date: date(2, 8),
			payee: 'Corner Bakery',
			description: 'Lunch meeting - TechStart',
			paymentMethod: 'card',
			tags: [{ name: 'Meals & Entertainment', percentage: 100 }]
		},

		// Expenses - Professional services
		{
			type: 'expense',
			amountCents: cents(350),
			date: date(2, 1),
			payee: 'Johnson CPA',
			description: 'Quarterly bookkeeping review',
			paymentMethod: 'check',
			checkNumber: '1051',
			tags: [{ name: 'Legal & Professional', percentage: 100 }]
		},

		// Expenses - Advertising
		{
			type: 'expense',
			amountCents: cents(150),
			date: date(1, 10),
			payee: 'LinkedIn',
			description: 'Premium subscription - Q1',
			paymentMethod: 'card',
			tags: [{ name: 'Advertising & Marketing', percentage: 100 }]
		},

		// Expenses - Insurance
		{
			type: 'expense',
			amountCents: cents(125),
			date: date(1, 15),
			payee: 'Hiscox',
			description: 'Professional liability insurance - January',
			paymentMethod: 'card',
			tags: [{ name: 'Business Insurance', percentage: 100 }]
		},
		{
			type: 'expense',
			amountCents: cents(125),
			date: date(2, 15),
			payee: 'Hiscox',
			description: 'Professional liability insurance - February',
			paymentMethod: 'card',
			tags: [{ name: 'Business Insurance', percentage: 100 }]
		},

		// Expenses - Utilities (home office portion)
		{
			type: 'expense',
			amountCents: cents(85),
			date: date(1, 20),
			payee: 'Verizon',
			description: 'Business phone line - January',
			paymentMethod: 'card',
			tags: [{ name: 'Telephone & Internet', percentage: 100 }]
		},
		{
			type: 'expense',
			amountCents: cents(85),
			date: date(2, 20),
			payee: 'Verizon',
			description: 'Business phone line - February',
			paymentMethod: 'card',
			tags: [{ name: 'Telephone & Internet', percentage: 100 }]
		}
	];

	// Insert transactions with tags and history
	for (const txn of demoTransactions) {
		const publicId = randomUUID();

		// Insert transaction
		const result = db
			.insert(schema.transactions)
			.values({
				publicId,
				type: txn.type,
				amountCents: txn.amountCents,
				date: txn.date,
				payee: txn.payee,
				description: txn.description,
				paymentMethod: txn.paymentMethod,
				checkNumber: txn.checkNumber ?? null
			})
			.run();

		const transactionId = Number(result.lastInsertRowid);

		// Insert tag allocations
		for (const tag of txn.tags) {
			db.insert(schema.transactionTags)
				.values({
					transactionId,
					tagId: getTagId(tag.name),
					percentage: tag.percentage
				})
				.run();
		}

		// Insert history record
		db.insert(schema.transactionHistory)
			.values({
				transactionId,
				action: 'created',
				previousState: null,
				changedFields: null
			})
			.run();
	}

	// Update workspace settings with business info for richer screenshots
	db.update(schema.workspaceSettings)
		.set({
			businessName: 'Summit Consulting LLC',
			state: 'PA',
			taxConfigured: true,
			federalBracketRate: 22,
			localEitRate: 100, // 1%
			updatedAt: new Date().toISOString()
		})
		.where(eq(schema.workspaceSettings.id, 1))
		.run();
}
