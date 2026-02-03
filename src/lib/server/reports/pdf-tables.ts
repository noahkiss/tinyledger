import type PDFDocument from 'pdfkit';

/**
 * Column definition for table rendering
 */
export interface TableColumn {
	header: string;
	width: number;
	align?: 'left' | 'center' | 'right';
}

/**
 * Row definition for table rendering
 */
export interface TableRow {
	cells: string[];
}

const ROW_HEIGHT = 18;
const HEADER_FONT_SIZE = 10;
const DATA_FONT_SIZE = 9;
const HEADER_BG = '#f3f4f6';
const BORDER_COLOR = '#e5e7eb';

/**
 * Draw a table with header row (gray bg) and data rows
 * Handles page breaks automatically
 *
 * @param doc - PDFKit document
 * @param columns - Column definitions
 * @param rows - Data rows
 * @param startX - X position to start table
 * @param startY - Y position to start table
 * @param bottomMargin - Bottom margin for page break detection (default 72)
 * @returns Final Y position after table
 */
export function drawTable(
	doc: PDFKit.PDFDocument,
	columns: TableColumn[],
	rows: TableRow[],
	startX: number,
	startY: number,
	bottomMargin = 72
): number {
	const tableWidth = columns.reduce((sum, c) => sum + c.width, 0);
	let currentY = startY;

	// Draw header row
	doc.rect(startX, currentY, tableWidth, ROW_HEIGHT).fill(HEADER_BG);

	let currentX = startX;
	doc.fillColor('black').font('Helvetica-Bold').fontSize(HEADER_FONT_SIZE);

	for (const col of columns) {
		doc.text(col.header, currentX + 4, currentY + 4, {
			width: col.width - 8,
			align: col.align || 'left',
			lineBreak: false
		});
		currentX += col.width;
	}
	currentY += ROW_HEIGHT;

	// Draw header bottom border
	doc.strokeColor(BORDER_COLOR)
		.moveTo(startX, currentY)
		.lineTo(startX + tableWidth, currentY)
		.stroke();

	// Draw data rows
	doc.font('Helvetica').fontSize(DATA_FONT_SIZE);

	for (const row of rows) {
		// Check for page break
		if (currentY + ROW_HEIGHT > doc.page.height - bottomMargin) {
			doc.addPage();
			currentY = 72; // Reset to top margin

			// Redraw header on new page
			doc.rect(startX, currentY, tableWidth, ROW_HEIGHT).fill(HEADER_BG);

			currentX = startX;
			doc.fillColor('black').font('Helvetica-Bold').fontSize(HEADER_FONT_SIZE);

			for (const col of columns) {
				doc.text(col.header, currentX + 4, currentY + 4, {
					width: col.width - 8,
					align: col.align || 'left',
					lineBreak: false
				});
				currentX += col.width;
			}
			currentY += ROW_HEIGHT;

			doc.strokeColor(BORDER_COLOR)
				.moveTo(startX, currentY)
				.lineTo(startX + tableWidth, currentY)
				.stroke();

			doc.font('Helvetica').fontSize(DATA_FONT_SIZE);
		}

		// Draw row cells
		currentX = startX;
		doc.fillColor('black');

		for (let i = 0; i < columns.length; i++) {
			const cellText = row.cells[i] || '';
			doc.text(cellText, currentX + 4, currentY + 4, {
				width: columns[i].width - 8,
				align: columns[i].align || 'left',
				lineBreak: false
			});
			currentX += columns[i].width;
		}

		// Row bottom border
		currentY += ROW_HEIGHT;
		doc.strokeColor(BORDER_COLOR)
			.moveTo(startX, currentY)
			.lineTo(startX + tableWidth, currentY)
			.stroke();
	}

	return currentY;
}

/**
 * Draw a section header (full width colored bar with white text)
 *
 * @param doc - PDFKit document
 * @param text - Header text
 * @param startX - X position
 * @param startY - Y position
 * @param width - Width of header bar
 * @param color - Background color (hex)
 * @param bottomMargin - Bottom margin for page break detection
 * @returns Y position after header
 */
export function drawSectionHeader(
	doc: PDFKit.PDFDocument,
	text: string,
	startX: number,
	startY: number,
	width: number,
	color: string,
	bottomMargin = 72
): number {
	const headerHeight = 24;

	// Check for page break
	if (startY + headerHeight > doc.page.height - bottomMargin) {
		doc.addPage();
		startY = 72;
	}

	// Draw colored background
	doc.rect(startX, startY, width, headerHeight).fill(color);

	// Draw white text
	doc.fillColor('white').font('Helvetica-Bold').fontSize(12);
	doc.text(text, startX + 8, startY + 6, {
		width: width - 16,
		align: 'left'
	});

	return startY + headerHeight + 8; // Add some spacing after header
}

/**
 * Draw a subheader (tag name with total)
 *
 * @param doc - PDFKit document
 * @param text - Subheader text
 * @param total - Total amount text
 * @param startX - X position
 * @param startY - Y position
 * @param width - Width of subheader
 * @param bottomMargin - Bottom margin for page break detection
 * @returns Y position after subheader
 */
export function drawTagHeader(
	doc: PDFKit.PDFDocument,
	text: string,
	total: string,
	startX: number,
	startY: number,
	width: number,
	bottomMargin = 72
): number {
	const headerHeight = 20;

	// Check for page break
	if (startY + headerHeight > doc.page.height - bottomMargin) {
		doc.addPage();
		startY = 72;
	}

	// Light gray background
	doc.rect(startX, startY, width, headerHeight).fill('#f9fafb');

	// Tag name on left (bold)
	doc.fillColor('#374151').font('Helvetica-Bold').fontSize(10);
	doc.text(text, startX + 8, startY + 5, {
		width: width / 2,
		align: 'left'
	});

	// Total on right
	doc.text(total, startX + width / 2, startY + 5, {
		width: width / 2 - 8,
		align: 'right'
	});

	return startY + headerHeight + 4;
}

/**
 * Draw a month subheader (italic month name)
 *
 * @param doc - PDFKit document
 * @param text - Month text (e.g., "January 2026")
 * @param startX - X position
 * @param startY - Y position
 * @param bottomMargin - Bottom margin for page break detection
 * @returns Y position after subheader
 */
export function drawMonthHeader(
	doc: PDFKit.PDFDocument,
	text: string,
	startX: number,
	startY: number,
	bottomMargin = 72
): number {
	const headerHeight = 16;

	// Check for page break
	if (startY + headerHeight > doc.page.height - bottomMargin) {
		doc.addPage();
		startY = 72;
	}

	doc.fillColor('#6b7280').font('Helvetica-Oblique').fontSize(9);
	doc.text(text, startX + 8, startY + 3);

	return startY + headerHeight;
}
