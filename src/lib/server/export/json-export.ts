interface WorkspaceExport {
	exportVersion: '1.0';
	exportedAt: string;
	workspace: {
		name: string;
		type: string;
		businessName?: string;
		ein?: string;
		address?: string;
		phone?: string;
		responsibleParty?: string;
		fiscalYearStartMonth: number;
		foundedYear?: number;
	};
	transactions: Array<{
		publicId: string;
		date: string;
		type: 'income' | 'expense';
		amountCents: number;
		payee: string;
		description?: string;
		paymentMethod: string;
		checkNumber?: string;
		tags: Array<{ name: string; percentage: number }>;
		hasAttachment: boolean;
		attachmentFilename?: string;
		voidedAt?: string;
		createdAt: string;
	}>;
	tags: Array<{
		name: string;
		createdAt: string;
	}>;
	filings: Array<{
		fiscalYear: number;
		formId: string;
		filedAt?: string;
		confirmationNumber?: string;
		notes?: string;
	}>;
}

export function generateFullExport(data: {
	workspace: WorkspaceExport['workspace'];
	transactions: WorkspaceExport['transactions'];
	tags: WorkspaceExport['tags'];
	filings: WorkspaceExport['filings'];
}): string {
	const exportData: WorkspaceExport = {
		exportVersion: '1.0',
		exportedAt: new Date().toISOString(),
		...data
	};

	return JSON.stringify(exportData, null, 2);
}

export type { WorkspaceExport };
