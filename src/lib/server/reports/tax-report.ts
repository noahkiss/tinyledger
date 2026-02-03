import PDFDocument from 'pdfkit';
import { format, parse } from 'date-fns';
import { drawTable, drawSectionHeader, drawTagHeader, drawMonthHeader } from './pdf-tables';
import type { TableColumn, TableRow } from './pdf-tables';

/**
 * Transaction data for tax report
 */
export interface TaxReportTransaction {
	date: string; // YYYY-MM-DD
	payee: string;
	amountCents: number;
	hasReceipt: boolean;
}

/**
 * Tag grouping with transactions
 */
export interface TaxReportTag {
	name: string;
	transactions: TaxReportTransaction[];
	totalCents: number;
}

/**
 * Complete tax report data structure
 */
export interface TaxReportData {
	workspace: {
		name: string;
		businessName?: string;
		ein?: string;
		address?: string;
		logoBuffer?: Buffer;
	};
	fiscalYear: number;
	fiscalYearStartMonth: number;
	income: TaxReportTag[];
	expenses: TaxReportTag[];
	summary: {
		totalIncomeCents: number;
		totalExpensesCents: number;
		netIncomeCents: number;
		transactionCount: number;
		receiptCount: number;
		receiptPercentage: number;
	};
}

// Colors
const INCOME_COLOR = '#22c55e'; // Green
const EXPENSE_COLOR = '#ef4444'; // Red

// Page margins
const MARGIN = 72; // 1 inch

/**
 * Format cents as dollar string (e.g., "$1,234.56")
 */
function formatDollars(cents: number): string {
	const dollars = cents / 100;
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD'
	}).format(dollars);
}

/**
 * Format date from YYYY-MM-DD to MM/DD/YYYY
 */
function formatDate(dateStr: string): string {
	const date = parse(dateStr, 'yyyy-MM-dd', new Date());
	return format(date, 'MM/dd/yyyy');
}

/**
 * Get month name and year from date (e.g., "January 2026")
 */
function getMonthYear(dateStr: string): string {
	const date = parse(dateStr, 'yyyy-MM-dd', new Date());
	return format(date, 'MMMM yyyy');
}

/**
 * Group transactions by month, returning sorted Map
 */
function groupByMonth(
	transactions: TaxReportTransaction[]
): Map<string, TaxReportTransaction[]> {
	const groups = new Map<string, TaxReportTransaction[]>();

	for (const t of transactions) {
		const monthKey = getMonthYear(t.date);
		const existing = groups.get(monthKey) || [];
		existing.push(t);
		groups.set(monthKey, existing);
	}

	// Sort by date within each month
	for (const [, txns] of groups) {
		txns.sort((a, b) => a.date.localeCompare(b.date));
	}

	// Return sorted by month (based on first transaction date in each group)
	const sortedEntries = Array.from(groups.entries()).sort((a, b) => {
		const aDate = a[1][0]?.date || '';
		const bDate = b[1][0]?.date || '';
		return aDate.localeCompare(bDate);
	});

	return new Map(sortedEntries);
}

/**
 * Get fiscal year date range as formatted strings
 */
function getFiscalYearDateRange(
	fiscalYear: number,
	startMonth: number
): { startStr: string; endStr: string } {
	// FY number = year the FY ends in
	// If startMonth = 1 (January), FY 2026 = Jan 1, 2026 to Dec 31, 2026
	// If startMonth = 7 (July), FY 2026 = Jul 1, 2025 to Jun 30, 2026

	let startYear: number;
	let endYear: number;
	let endMonth: number;

	if (startMonth === 1) {
		// Calendar year
		startYear = fiscalYear;
		endYear = fiscalYear;
		endMonth = 12;
	} else {
		// Non-calendar year
		startYear = fiscalYear - 1;
		endYear = fiscalYear;
		endMonth = startMonth - 1;
	}

	const startDate = new Date(startYear, startMonth - 1, 1);
	const endDate = new Date(endYear, endMonth, 0); // Day 0 = last day of previous month

	return {
		startStr: format(startDate, 'MMMM d, yyyy'),
		endStr: format(endDate, 'MMMM d, yyyy')
	};
}

/**
 * Render letterhead with logo and business details
 */
function renderLetterhead(
	doc: PDFKit.PDFDocument,
	workspace: TaxReportData['workspace']
): number {
	let currentY = MARGIN;
	const rightX = doc.page.width - MARGIN;
	const contentWidth = rightX - MARGIN;

	// Logo in top-left (if available)
	let logoOffset = 0;
	if (workspace.logoBuffer) {
		try {
			doc.image(workspace.logoBuffer, MARGIN, currentY, {
				fit: [80, 80]
			});
			logoOffset = 90;
		} catch {
			// If logo fails to load, continue without it
		}
	}

	// Business details right-aligned
	const textX = MARGIN + logoOffset;
	const textWidth = contentWidth - logoOffset;

	// Business name (or workspace name)
	doc.fillColor('black').font('Helvetica-Bold').fontSize(14);
	doc.text(workspace.businessName || workspace.name, textX, currentY, {
		width: textWidth,
		align: 'right'
	});
	currentY += 18;

	// EIN if available
	if (workspace.ein) {
		doc.font('Helvetica').fontSize(10).fillColor('#4b5563');
		doc.text(`EIN: ${workspace.ein}`, textX, currentY, {
			width: textWidth,
			align: 'right'
		});
		currentY += 14;
	}

	// Address if available
	if (workspace.address) {
		doc.font('Helvetica').fontSize(10).fillColor('#4b5563');
		// Handle multi-line addresses
		const lines = workspace.address.split('\n');
		for (const line of lines) {
			doc.text(line.trim(), textX, currentY, {
				width: textWidth,
				align: 'right'
			});
			currentY += 12;
		}
	}

	// Ensure we have enough space after logo
	currentY = Math.max(currentY, MARGIN + 85);

	// Horizontal separator line
	currentY += 8;
	doc.strokeColor('#e5e7eb')
		.moveTo(MARGIN, currentY)
		.lineTo(rightX, currentY)
		.stroke();

	return currentY + 16;
}

/**
 * Render report title and date range
 */
function renderTitle(
	doc: PDFKit.PDFDocument,
	fiscalYear: number,
	fiscalYearStartMonth: number,
	startY: number
): number {
	const contentWidth = doc.page.width - MARGIN * 2;

	// Title
	doc.fillColor('black').font('Helvetica-Bold').fontSize(16);
	doc.text(`Tax Report - FY ${fiscalYear}`, MARGIN, startY, {
		width: contentWidth,
		align: 'center'
	});

	// Date range subtitle
	const { startStr, endStr } = getFiscalYearDateRange(fiscalYear, fiscalYearStartMonth);
	doc.font('Helvetica').fontSize(10).fillColor('#6b7280');
	doc.text(`Period: ${startStr} to ${endStr}`, MARGIN, startY + 22, {
		width: contentWidth,
		align: 'center'
	});

	return startY + 50;
}

/**
 * Render a section (income or expenses) with tags grouped by month
 */
function renderSection(
	doc: PDFKit.PDFDocument,
	title: string,
	color: string,
	tags: TaxReportTag[],
	startY: number
): number {
	const contentWidth = doc.page.width - MARGIN * 2;
	let currentY = startY;

	// Section header
	currentY = drawSectionHeader(doc, title, MARGIN, currentY, contentWidth, color);

	if (tags.length === 0) {
		doc.fillColor('#6b7280').font('Helvetica-Oblique').fontSize(10);
		doc.text('No transactions', MARGIN + 8, currentY);
		return currentY + 20;
	}

	// Table columns
	const columns: TableColumn[] = [
		{ header: 'Date', width: 70, align: 'left' },
		{ header: 'Payee', width: 260, align: 'left' },
		{ header: 'Amount', width: 80, align: 'right' },
		{ header: 'Receipt', width: 50, align: 'center' }
	];

	// Process each tag
	for (const tag of tags) {
		// Tag header with total
		currentY = drawTagHeader(
			doc,
			tag.name,
			formatDollars(tag.totalCents),
			MARGIN,
			currentY,
			contentWidth
		);

		// Group transactions by month
		const monthGroups = groupByMonth(tag.transactions);

		for (const [monthName, transactions] of monthGroups) {
			// Month subheader
			currentY = drawMonthHeader(doc, monthName, MARGIN, currentY);

			// Transaction rows
			const rows: TableRow[] = transactions.map((t) => ({
				cells: [
					formatDate(t.date),
					t.payee.length > 35 ? t.payee.substring(0, 32) + '...' : t.payee,
					formatDollars(t.amountCents),
					t.hasReceipt ? 'Y' : '-'
				]
			}));

			currentY = drawTable(doc, columns, rows, MARGIN, currentY);
			currentY += 4; // Small gap after table
		}

		currentY += 8; // Gap between tags
	}

	return currentY;
}

/**
 * Render summary section at end of report
 */
function renderSummary(
	doc: PDFKit.PDFDocument,
	summary: TaxReportData['summary'],
	startY: number
): number {
	const contentWidth = doc.page.width - MARGIN * 2;
	const rightX = doc.page.width - MARGIN;
	let currentY = startY;

	// Check for page break
	if (currentY + 150 > doc.page.height - MARGIN) {
		doc.addPage();
		currentY = MARGIN;
	}

	// Horizontal separator
	currentY += 8;
	doc.strokeColor('#374151')
		.lineWidth(1)
		.moveTo(MARGIN, currentY)
		.lineTo(rightX, currentY)
		.stroke();
	doc.lineWidth(1); // Reset

	currentY += 16;

	// Summary heading
	doc.fillColor('black').font('Helvetica-Bold').fontSize(14);
	doc.text('SUMMARY', MARGIN, currentY);
	currentY += 24;

	// Summary items
	const labelWidth = 150;
	const valueWidth = 120;

	const items = [
		{ label: 'Total Income:', value: formatDollars(summary.totalIncomeCents), color: '#22c55e' },
		{ label: 'Total Expenses:', value: formatDollars(summary.totalExpensesCents), color: '#ef4444' }
	];

	doc.fontSize(11);

	for (const item of items) {
		doc.fillColor('#374151').font('Helvetica');
		doc.text(item.label, MARGIN, currentY, { width: labelWidth });

		doc.fillColor(item.color).font('Helvetica-Bold');
		doc.text(item.value, MARGIN + labelWidth, currentY, {
			width: valueWidth,
			align: 'right'
		});

		currentY += 18;
	}

	// Net Income (highlighted)
	currentY += 4;
	const netColor = summary.netIncomeCents >= 0 ? '#22c55e' : '#ef4444';
	const netPrefix = summary.netIncomeCents >= 0 ? '' : '-';
	const netValue = formatDollars(Math.abs(summary.netIncomeCents));

	doc.fillColor('#374151').font('Helvetica-Bold');
	doc.text('Net Income:', MARGIN, currentY, { width: labelWidth });

	doc.fillColor(netColor).font('Helvetica-Bold').fontSize(12);
	doc.text(`${netPrefix}${netValue}`, MARGIN + labelWidth, currentY, {
		width: valueWidth,
		align: 'right'
	});

	currentY += 28;

	// Transaction and receipt stats
	doc.fontSize(10).fillColor('#6b7280').font('Helvetica');
	doc.text(
		`Total Transactions: ${summary.transactionCount}`,
		MARGIN,
		currentY
	);
	currentY += 14;

	doc.text(
		`Receipts Attached: ${summary.receiptCount} of ${summary.transactionCount} (${summary.receiptPercentage.toFixed(0)}%)`,
		MARGIN,
		currentY
	);

	return currentY + 20;
}

/**
 * Add page numbers to all pages ("Page X of Y")
 */
function addPageNumbers(doc: PDFKit.PDFDocument): void {
	const range = doc.bufferedPageRange();

	for (let i = 0; i < range.count; i++) {
		doc.switchToPage(i);
		doc.fontSize(9).fillColor('#9ca3af').font('Helvetica');
		doc.text(
			`Page ${i + 1} of ${range.count}`,
			0,
			doc.page.height - 40,
			{
				width: doc.page.width,
				align: 'center'
			}
		);
	}
}

/**
 * Generate a tax report PDF
 *
 * @param data - Report data including workspace info, transactions, and summary
 * @returns PDFDocument (call doc.end() to finalize)
 */
export function generateTaxReportPDF(data: TaxReportData): PDFKit.PDFDocument {
	const doc = new PDFDocument({
		bufferPages: true,
		size: 'LETTER',
		margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN }
	});

	// Render letterhead
	let currentY = renderLetterhead(doc, data.workspace);

	// Render title
	currentY = renderTitle(doc, data.fiscalYear, data.fiscalYearStartMonth, currentY);

	// Render income section
	currentY = renderSection(doc, 'INCOME', INCOME_COLOR, data.income, currentY);

	// Add some spacing between sections
	currentY += 16;

	// Render expenses section
	currentY = renderSection(doc, 'EXPENSES', EXPENSE_COLOR, data.expenses, currentY);

	// Render summary
	renderSummary(doc, data.summary, currentY);

	// Add page numbers after all content
	addPageNumbers(doc);

	return doc;
}
