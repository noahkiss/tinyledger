import Papa from 'papaparse';

interface ExportTransaction {
	publicId: string;
	date: string;
	type: 'income' | 'expense';
	payee: string;
	amountCents: number;
	description?: string;
	paymentMethod: string;
	checkNumber?: string;
	tags: string; // Comma-separated: "Tag1 (50%), Tag2 (50%)"
	hasReceipt: boolean;
	voidedAt?: string;
}

export function generateTransactionsCSV(transactions: ExportTransaction[]): string {
	const data = transactions.map((t) => ({
		ID: t.publicId,
		Date: t.date,
		Type: t.type.charAt(0).toUpperCase() + t.type.slice(1),
		Payee: t.payee,
		Amount: (t.amountCents / 100).toFixed(2),
		Description: t.description || '',
		'Payment Method': t.paymentMethod.charAt(0).toUpperCase() + t.paymentMethod.slice(1),
		'Check Number': t.checkNumber || '',
		Tags: t.tags,
		'Has Receipt': t.hasReceipt ? 'Yes' : 'No',
		Voided: t.voidedAt ? 'Yes' : 'No'
	}));

	return Papa.unparse(data, {
		quotes: true,
		newline: '\n'
	});
}

export type { ExportTransaction };
