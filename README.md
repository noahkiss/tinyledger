# TinyLedger

Self-hosted bookkeeping for sole proprietors. Track income and expenses, generate tax reports, attach receipts. No subscription fees, your data stays yours.

## Features

- **Transaction Management** - Record income and expenses with date, amount, description, and categorization
- **Tag-Based Categories** - Flexible tagging system with amount allocation (split transactions across categories)
- **Schedule C Mapping** - Pre-built categories matching IRS Schedule C expense lines
- **Receipt Attachments** - Attach photos of receipts to transactions
- **Tax Reports** - Generate summaries by category for tax filing (YTD, quarterly, annual)
- **Recurring Transactions** - Set up repeating income/expenses
- **CSV Import/Export** - Bulk import from bank statements, export for accountants
- **Multi-Workspace** - Separate ledgers for different businesses or entities
- **Mobile-Friendly** - Responsive design works on any device
- **Offline-Capable** - PWA with offline support
- **Backup/Restore** - Full data backup and restore functionality

## Quick Start (Docker)

Pull and run the latest image:

```bash
docker run -d \
  --name tinyledger \
  -p 3000:3000 \
  -v tinyledger-db:/data/db \
  -v tinyledger-attachments:/data/attachments \
  -e ORIGIN=http://localhost:3000 \
  -e TZ=America/New_York \
  ghcr.io/noahkiss/tinyledger:main
```

Or use Docker Compose:

```yaml
services:
  tinyledger:
    image: ghcr.io/noahkiss/tinyledger:main
    ports:
      - "3000:3000"
    environment:
      - ORIGIN=http://localhost:3000
      - TZ=America/New_York
    volumes:
      - tinyledger-db:/data/db
      - tinyledger-attachments:/data/attachments
    restart: unless-stopped

volumes:
  tinyledger-db:
  tinyledger-attachments:
```

Open http://localhost:3000 in your browser.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ORIGIN` | - | **Required.** The URL where the app is hosted (e.g., `https://ledger.example.com`) |
| `DATA_DIR` | `/data` | Directory for database and attachments |
| `PORT` | `3000` | Server port |
| `BODY_SIZE_LIMIT` | `10M` | Max request body size (for file uploads) |
| `TZ` | `UTC` | Timezone for date handling |

## Development

Prerequisites: Node.js 22+

```bash
# Clone the repo
git clone https://github.com/noahkiss/tinyledger.git
cd tinyledger

# Install dependencies
npm install

# Start dev server
npm run dev
```

The dev server runs at http://localhost:5173 with hot reload.

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Type Checking

```bash
npm run check
```

## Tech Stack

- **Frontend**: SvelteKit 2, Svelte 5, TailwindCSS 4
- **Backend**: SvelteKit (Node adapter)
- **Database**: SQLite via better-sqlite3, Drizzle ORM
- **Reports**: PDFKit for PDF generation, Chart.js for visualizations

## Data Storage

TinyLedger stores all data locally:

- `DATA_DIR/db/` - SQLite databases (one per workspace)
- `DATA_DIR/attachments/` - Receipt images and file attachments

Back up these directories to preserve your data.

## License

MIT
