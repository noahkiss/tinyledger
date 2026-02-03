# Phase 8: Report Generation & Data - Research

**Researched:** 2026-02-03
**Domain:** PDF generation, CSV import/export, recurring transactions, ZIP archiving
**Confidence:** HIGH

## Summary

This phase requires four major capabilities: (1) PDF report generation with branded letterhead and tables, (2) CSV import with column mapping and validation, (3) CSV/JSON data export with ZIP packaging for attachments, and (4) recurring transaction management with flexible patterns. The research identifies a standard stack of well-maintained libraries that integrate cleanly with the existing SvelteKit/Node.js architecture.

The primary challenge is PDF table generation - PDFKit is the industry standard but lacks native table support. The pdfkit-table plugin (0.1.99) addresses this but shows inactive maintenance. An alternative approach is to hand-roll simple table layouts using PDFKit's primitive operations, which provides more control for the specific tax report format needed.

For recurring transactions, the rrule library (2.8.1) provides iCalendar-compliant recurrence patterns with natural language output, perfectly matching the requirement for flexible patterns (weekly, biweekly, monthly, quarterly, yearly, custom intervals).

**Primary recommendation:** Use PDFKit with custom table rendering, PapaParse for CSV operations, Archiver for ZIP creation, rrule for recurring patterns, and date-fns for date parsing in CSV imports.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pdfkit | 0.17.2 | PDF document generation | Industry standard for Node.js PDF, supports fonts, images, vector graphics, page buffering |
| papaparse | 5.5.3 | CSV parsing and generation | Fastest browser/Node CSV parser, RFC 4180 compliant, auto-delimiter detection, streaming |
| archiver | 7.0.1 | ZIP archive creation | Streaming interface, handles large files, mature and actively maintained |
| rrule | 2.8.1 | Recurring event patterns | iCalendar RFC compliant, natural language output, handles all recurrence patterns |
| date-fns | 4.1.0 | Date parsing/formatting | Modular, immutable, TypeScript-native, parse() with format patterns |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pdfkit-table | 0.1.99 | Table plugin for PDFKit | Only if complex table layouts needed; maintenance is inactive |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PDFKit | jsPDF | jsPDF is client-side focused; PDFKit is better for server-side generation |
| PDFKit | pdf-lib | pdf-lib is better for modifying existing PDFs; PDFKit better for creating from scratch |
| PapaParse | csv-parse | csv-parse is Node-only; PapaParse works in both browser and Node |
| Archiver | jszip | jszip requires loading entire file in memory; Archiver streams |
| rrule | Custom implementation | rrule handles edge cases (DST, leap years, etc.) that are easy to get wrong |

**Installation:**
```bash
npm install pdfkit papaparse archiver rrule date-fns
npm install --save-dev @types/pdfkit
```

Note: PapaParse, archiver, rrule, and date-fns include TypeScript types.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── server/
│   │   ├── reports/
│   │   │   ├── tax-report.ts      # PDF generation logic
│   │   │   └── csv-export.ts      # Data export logic
│   │   ├── import/
│   │   │   ├── csv-parser.ts      # CSV import with mapping
│   │   │   └── date-detector.ts   # Multi-format date parsing
│   │   └── recurring/
│   │       ├── patterns.ts        # rrule wrappers
│   │       └── instances.ts       # Generate pending instances
│   └── utils/
│       └── pdf-tables.ts          # Custom table rendering
├── routes/
│   └── w/[workspace]/
│       ├── export/
│       │   ├── tax-report/+server.ts   # PDF download endpoint
│       │   ├── csv/+server.ts          # CSV export endpoint
│       │   └── full/+server.ts         # ZIP full export endpoint
│       ├── import/
│       │   └── +page.svelte            # CSV import UI with mapping
│       └── recurring/
│           └── +page.svelte            # Recurring transaction management
```

### Pattern 1: Streaming PDF Response

**What:** Generate PDFs server-side and stream directly to browser
**When to use:** PDF export endpoints
**Example:**
```typescript
// Source: SvelteKit docs + PDFKit docs
import type { RequestHandler } from './$types';
import PDFDocument from 'pdfkit';
import { Readable } from 'node:stream';

export const GET: RequestHandler = async ({ params }) => {
  const doc = new PDFDocument({
    bufferPages: true,  // Enable page switching for footers
    size: 'LETTER',     // 8.5" x 11"
    margins: { top: 72, bottom: 72, left: 72, right: 72 }
  });

  // Generate content...
  renderTaxReport(doc, reportData);

  // Add page numbers after all pages created
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(10).text(
      `Page ${i + 1} of ${range.count}`,
      0, doc.page.height - 50,
      { align: 'center' }
    );
  }

  doc.end();

  // Convert to web-compatible stream
  const stream = Readable.toWeb(doc) as ReadableStream;

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="TaxReport-FY${fiscalYear}.pdf"`
    }
  });
};
```

### Pattern 2: Custom PDF Table Rendering

**What:** Draw tables using PDFKit primitives (no external table plugin)
**When to use:** Tax report generation with specific formatting
**Example:**
```typescript
// Source: PDFKit docs - text positioning and vector graphics
interface TableColumn {
  header: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

interface TableRow {
  cells: string[];
}

function drawTable(
  doc: PDFKit.PDFDocument,
  columns: TableColumn[],
  rows: TableRow[],
  startX: number,
  startY: number
): number {
  const rowHeight = 20;
  const headerBg = '#f3f4f6';
  let currentY = startY;

  // Draw header row
  let currentX = startX;
  doc.rect(startX, currentY, columns.reduce((sum, c) => sum + c.width, 0), rowHeight)
     .fill(headerBg);

  doc.fillColor('black').font('Helvetica-Bold').fontSize(10);
  for (const col of columns) {
    doc.text(col.header, currentX + 4, currentY + 5, {
      width: col.width - 8,
      align: col.align || 'left'
    });
    currentX += col.width;
  }
  currentY += rowHeight;

  // Draw data rows
  doc.font('Helvetica').fontSize(9);
  for (const row of rows) {
    // Check for page break
    if (currentY + rowHeight > doc.page.height - 72) {
      doc.addPage();
      currentY = 72;
    }

    currentX = startX;
    for (let i = 0; i < columns.length; i++) {
      doc.text(row.cells[i] || '', currentX + 4, currentY + 5, {
        width: columns[i].width - 8,
        align: columns[i].align || 'left'
      });
      currentX += columns[i].width;
    }

    // Row border
    doc.moveTo(startX, currentY + rowHeight)
       .lineTo(startX + columns.reduce((sum, c) => sum + c.width, 0), currentY + rowHeight)
       .stroke('#e5e7eb');

    currentY += rowHeight;
  }

  return currentY;
}
```

### Pattern 3: CSV Import with Column Mapping

**What:** Parse CSV, let user map columns, validate, preview, then import
**When to use:** Transaction CSV import
**Example:**
```typescript
// Source: PapaParse docs
import Papa from 'papaparse';
import { parse, isValid } from 'date-fns';

interface ParseResult {
  headers: string[];
  preview: Record<string, string>[];
  totalRows: number;
  errors: Papa.ParseError[];
}

export function parseCSVPreview(csvText: string, previewRows = 20): ParseResult {
  const result = Papa.parse(csvText, {
    header: true,
    preview: previewRows + 1, // +1 to check if there are more
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim()
  });

  // Count total rows (re-parse without preview limit)
  const fullResult = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: 'greedy'
  });

  return {
    headers: result.meta.fields || [],
    preview: result.data.slice(0, previewRows) as Record<string, string>[],
    totalRows: fullResult.data.length,
    errors: result.errors
  };
}

// Date formats to try, in order of likelihood
const DATE_FORMATS = [
  'yyyy-MM-dd',      // ISO: 2026-01-15
  'MM/dd/yyyy',      // US: 01/15/2026
  'M/d/yyyy',        // US short: 1/15/2026
  'MM-dd-yyyy',      // US with dashes
  'dd/MM/yyyy',      // European: 15/01/2026
  'dd-MM-yyyy',      // European with dashes
  'MMM d, yyyy',     // Text: Jan 15, 2026
  'MMMM d, yyyy',    // Full text: January 15, 2026
];

export function parseDate(dateStr: string): string | null {
  const trimmed = dateStr.trim();

  for (const fmt of DATE_FORMATS) {
    const parsed = parse(trimmed, fmt, new Date());
    if (isValid(parsed)) {
      // Return as YYYY-MM-DD (our standard format)
      return parsed.toISOString().split('T')[0];
    }
  }
  return null;
}
```

### Pattern 4: Recurring Transaction with rrule

**What:** Define recurrence patterns, generate pending instances
**When to use:** Recurring transaction management
**Example:**
```typescript
// Source: rrule docs
import { RRule, RRuleSet, Frequency } from 'rrule';

interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  interval?: number;  // For custom: every N periods
  customUnit?: 'day' | 'week' | 'month';
  byWeekday?: number[];  // 0=Mon, 6=Sun
  endDate?: string;
}

export function createRRule(pattern: RecurringPattern, startDate: string): RRule {
  const dtstart = new Date(startDate + 'T00:00:00');

  let freq: Frequency;
  let interval = 1;

  switch (pattern.frequency) {
    case 'daily':
      freq = RRule.DAILY;
      break;
    case 'weekly':
      freq = RRule.WEEKLY;
      break;
    case 'biweekly':
      freq = RRule.WEEKLY;
      interval = 2;
      break;
    case 'monthly':
      freq = RRule.MONTHLY;
      break;
    case 'quarterly':
      freq = RRule.MONTHLY;
      interval = 3;
      break;
    case 'yearly':
      freq = RRule.YEARLY;
      break;
    case 'custom':
      freq = pattern.customUnit === 'day' ? RRule.DAILY :
             pattern.customUnit === 'week' ? RRule.WEEKLY : RRule.MONTHLY;
      interval = pattern.interval || 1;
      break;
  }

  const options: Partial<rrule.Options> = {
    freq,
    interval,
    dtstart,
  };

  if (pattern.endDate) {
    options.until = new Date(pattern.endDate + 'T23:59:59');
  }

  if (pattern.byWeekday) {
    options.byweekday = pattern.byWeekday;
  }

  return new RRule(options);
}

// Get pending instances for display (e.g., next 6 months)
export function getPendingInstances(rule: RRule, limit = 12): Date[] {
  const now = new Date();
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  return rule.between(now, sixMonthsLater, true).slice(0, limit);
}
```

### Pattern 5: ZIP Archive Streaming

**What:** Create ZIP with data files and attachment folder
**When to use:** Full data export endpoint
**Example:**
```typescript
// Source: Archiver docs
import archiver from 'archiver';
import { Readable } from 'node:stream';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const archive = archiver('zip', { zlib: { level: 6 } });

  // Add JSON data export
  const jsonData = JSON.stringify(await getFullExportData(params.workspace), null, 2);
  archive.append(jsonData, { name: 'data.json' });

  // Add CSV export
  const csvData = await generateCSVExport(params.workspace);
  archive.append(csvData, { name: 'transactions.csv' });

  // Add attachments folder
  const attachmentsDir = `./data/attachments/${params.workspace}`;
  archive.directory(attachmentsDir, 'attachments');

  archive.finalize();

  // Convert to web stream
  const stream = Readable.toWeb(archive) as ReadableStream;

  const filename = `${params.workspace}-export-${new Date().toISOString().split('T')[0]}.zip`;

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
};
```

### Anti-Patterns to Avoid

- **Loading entire PDF in memory before streaming:** Use PDFKit's pipe() immediately
- **Parsing entire CSV at once for large files:** Use streaming with step callback
- **Building ZIP in temp file then sending:** Stream directly with archiver
- **Hand-rolling recurrence logic:** Edge cases (DST, leap years, month boundaries) are notoriously hard
- **Assuming date format from CSV:** Always provide explicit column mapping UI

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Recurrence patterns | Custom date arithmetic | rrule | DST transitions, leap years, "last Friday of month" patterns |
| CSV parsing | String.split() | PapaParse | Quoted fields, escaped quotes, newlines in fields, BOM handling |
| Date parsing | RegExp patterns | date-fns parse() | Locale variations, ambiguous formats (01/02/03) |
| ZIP creation | Node zlib + tar | Archiver | Directory handling, streaming, compression options |
| PDF tables | Nested loops of text() calls | Custom wrapper or pdfkit-table | Column alignment, page breaks, row height calculation |

**Key insight:** Date/time handling and file format parsing have countless edge cases. Libraries that handle these have years of bug fixes that you'd replicate slowly and painfully.

## Common Pitfalls

### Pitfall 1: PDF Page Overflow

**What goes wrong:** Table rows split across pages awkwardly, text cut off
**Why it happens:** Not checking remaining space before drawing
**How to avoid:** Check `doc.y` against `doc.page.height - margin` before each row; call `doc.addPage()` when needed
**Warning signs:** PDF looks fine with small data, breaks with larger datasets

### Pitfall 2: CSV Date Ambiguity

**What goes wrong:** "01/02/2026" parsed as Jan 2 (US) vs Feb 1 (EU)
**Why it happens:** Auto-detecting date format without user confirmation
**How to avoid:** Always show preview with parsed dates; let user confirm or override format
**Warning signs:** Transaction dates off by days/months after import

### Pitfall 3: Memory Exhaustion on Large Exports

**What goes wrong:** Server OOM when exporting workspace with many attachments
**Why it happens:** Loading all attachments into memory before zipping
**How to avoid:** Use archiver's streaming `.file()` or `.directory()` methods
**Warning signs:** Exports work for small workspaces, fail for large ones

### Pitfall 4: Timezone Issues in Recurring Transactions

**What goes wrong:** Recurring transaction scheduled for "every Monday" fires on Sunday/Tuesday
**Why it happens:** Not handling timezone in rrule dtstart
**How to avoid:** Store dates as YYYY-MM-DD (no time), compute occurrences in local context
**Warning signs:** Off-by-one errors near DST transitions

### Pitfall 5: PDF Font Missing

**What goes wrong:** PDF shows squares/boxes instead of text
**Why it happens:** Using custom font not embedded in PDF
**How to avoid:** Stick to standard fonts (Helvetica, Times, Courier) or embed .ttf files with `doc.registerFont()`
**Warning signs:** Works in dev, fails in production; works on Mac, fails on Linux

## Code Examples

### Tax Report PDF Header (Letterhead)

```typescript
// Source: PDFKit docs - images, text positioning
async function renderLetterhead(
  doc: PDFKit.PDFDocument,
  workspace: WorkspaceSettings,
  logoBuffer: Buffer | null
): void {
  const margin = 72; // 1 inch
  let currentY = margin;

  // Logo in top-left (if available)
  if (logoBuffer) {
    doc.image(logoBuffer, margin, currentY, {
      fit: [80, 80],
      align: 'left',
      valign: 'top'
    });
  }

  // Business details right-aligned
  const rightX = doc.page.width - margin;
  doc.font('Helvetica-Bold').fontSize(14);
  doc.text(workspace.businessName || workspace.name, margin + 100, currentY, {
    width: rightX - margin - 100,
    align: 'right'
  });

  currentY += 20;
  doc.font('Helvetica').fontSize(10).fillColor('#666666');

  if (workspace.address) {
    doc.text(workspace.address, margin + 100, currentY, {
      width: rightX - margin - 100,
      align: 'right'
    });
    currentY += 12;
  }

  // EIN if available (format: XX-XXXXXXX)
  // Note: EIN would be a workspace setting - not currently in schema
  // Placeholder for future implementation

  currentY += 20;
  doc.moveTo(margin, currentY).lineTo(rightX, currentY).stroke('#e5e7eb');

  doc.y = currentY + 20;
}
```

### CSV Export (Transactions to CSV)

```typescript
// Source: PapaParse docs - unparse
import Papa from 'papaparse';

interface ExportTransaction {
  date: string;
  type: 'income' | 'expense';
  payee: string;
  amount: number; // in dollars
  tags: string;
  description: string;
  hasReceipt: boolean;
}

export function generateTransactionsCSV(transactions: ExportTransaction[]): string {
  const data = transactions.map(t => ({
    Date: t.date,
    Type: t.type,
    Payee: t.payee,
    Amount: t.amount.toFixed(2),
    Tags: t.tags,
    Description: t.description || '',
    'Has Receipt': t.hasReceipt ? 'Yes' : 'No'
  }));

  return Papa.unparse(data, {
    quotes: true,  // Wrap all fields in quotes for safety
    newline: '\n'  // Unix line endings
  });
}
```

### Full JSON Export Schema

```typescript
// Recommended export structure for data portability
interface WorkspaceExport {
  exportVersion: '1.0';
  exportedAt: string;  // ISO timestamp
  workspace: {
    name: string;
    type: string;
    businessName?: string;
    address?: string;
    fiscalYearStartMonth: number;
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
    attachmentFilename?: string;  // References file in attachments/ folder
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
  }>;
  // Recurring templates (new for this phase)
  recurringTemplates?: Array<{
    id: string;
    type: 'income' | 'expense';
    amountCents: number;
    payee: string;
    tags: Array<{ name: string; percentage: number }>;
    pattern: RecurringPattern;
    nextDate: string;
    endDate?: string;
  }>;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| pdfmake for PDF | PDFKit for server-side | Still valid | PDFKit offers more control for Node.js |
| csv-parse for Node | PapaParse universal | PapaParse 5.x | One library for browser + server |
| moment.js for dates | date-fns | 2020+ | date-fns is smaller, immutable, tree-shakeable |
| adm-zip for zipping | Archiver | archiver 5.x+ | Streaming support for large archives |

**Deprecated/outdated:**
- moment.js: In maintenance mode, date-fns recommended for new projects
- pdfkit-table: Last updated 2023, inactive maintenance - consider custom tables

## Open Questions

1. **EIN field in workspace settings**
   - What we know: PDF letterhead should include EIN per user decisions
   - What's unclear: EIN not in current workspace_settings schema
   - Recommendation: Add `ein` text field to workspace_settings in a migration, make it optional

2. **Recurring transaction DB schema**
   - What we know: Need to store templates and track confirmed/voided instances
   - What's unclear: Best schema structure for this
   - Recommendation: Create `recurring_templates` table with rrule string, and add `recurringTemplateId` + `status` to transactions

3. **PDF font licensing**
   - What we know: PDFKit includes standard 14 fonts (Helvetica, Times, Courier variants)
   - What's unclear: Whether we need any non-standard fonts
   - Recommendation: Stick to Helvetica family for simplicity; it's professional and universally available

## Sources

### Primary (HIGH confidence)
- Context7 `/foliojs/pdfkit` - Document generation, page buffering, text positioning, images
- Context7 `/mholt/papaparse` - CSV parsing, unparse, configuration options
- Context7 `/archiverjs/node-archiver` - ZIP creation, streaming, Express integration
- Context7 `/jkbrzt/rrule` - Recurrence rules, iCalendar compliance, date generation
- Context7 `/sveltejs/kit` - API endpoints, Response streaming, file downloads
- npm registry - Current package versions verified 2026-02-03

### Secondary (MEDIUM confidence)
- SvelteKit GitHub discussions - File streaming patterns with adapter-node
- date-fns GitHub Gist - Multi-format date parsing patterns

### Tertiary (LOW confidence)
- WebSearch results for pdfkit-table maintenance status

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via Context7/npm, current versions confirmed
- Architecture: HIGH - Patterns from official documentation and existing codebase conventions
- Pitfalls: HIGH - Common issues documented in library docs and community resources

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days - stable domain, mature libraries)
