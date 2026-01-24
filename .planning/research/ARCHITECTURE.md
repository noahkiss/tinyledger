# Architecture Patterns

**Domain:** Self-hosted SvelteKit + SQLite Ledger Application
**Researched:** 2026-01-24
**Confidence:** HIGH (Context7 + official docs verified)

## Recommended Architecture

TinyLedger follows a workspace-isolated architecture where each workspace (tenant) has its own SQLite database file. The application uses SvelteKit's file-based routing with server-side form actions for data mutations, and filesystem storage for attachments.

```
                    +------------------+
                    |   Docker Host    |
                    |  (Tailscale)     |
                    +--------+---------+
                             |
                    +--------v---------+
                    |  SvelteKit App   |
                    |  (Node.js)       |
                    +--------+---------+
                             |
           +-----------------+------------------+
           |                 |                  |
    +------v------+   +------v------+    +------v------+
    | Workspace A |   | Workspace B |    | Workspace C |
    |  SQLite DB  |   |  SQLite DB  |    |  SQLite DB  |
    +-------------+   +-------------+    +-------------+
           |                 |                  |
    +------v------+   +------v------+    +------v------+
    | Attachments |   | Attachments |    | Attachments |
    |  /data/a/   |   |  /data/b/   |    |  /data/c/   |
    +-------------+   +-------------+    +-------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `src/routes/` | Page rendering, form actions, URL routing | Load functions, $lib modules |
| `src/lib/server/db/` | Database connection management, query execution | SQLite files, better-sqlite3 |
| `src/lib/server/workspace/` | Workspace resolution, multi-tenant isolation | Database layer, hooks |
| `src/lib/server/storage/` | File upload handling, attachment management | Filesystem, form actions |
| `src/hooks.server.ts` | Request interception, workspace context injection | All server routes via `event.locals` |
| `src/lib/components/` | Reusable UI components | Page components |
| `src/lib/stores/` | Client-side reactive state (minimal) | Page components |

### Data Flow

```
1. Request arrives at SvelteKit server
                    |
                    v
2. hooks.server.ts intercepts request
   - Parses workspace ID from URL path (/w/[workspace]/...)
   - Opens/caches workspace-specific SQLite connection
   - Injects db + workspace into event.locals
                    |
                    v
3. +page.server.ts load function runs
   - Accesses db via event.locals.db
   - Queries transactions for fiscal year (from URL params)
   - Returns data to page
                    |
                    v
4. +page.svelte renders with data
   - Displays timeline/feed of transactions
   - Forms use method="POST" with use:enhance
                    |
                    v
5. Form submission triggers action
   - +page.server.ts action validates input
   - Writes to database via event.locals.db
   - Handles file upload to workspace attachment directory
   - Returns result (or redirects)
                    |
                    v
6. Page updates via progressive enhancement
   - Form state updates without full reload
   - Data invalidates and reloads
```

## Project Structure

Based on [SvelteKit official documentation](https://svelte.dev/docs/kit/project-structure) and community best practices.

```
/
├── src/
│   ├── routes/
│   │   ├── +page.svelte           # Landing/workspace selector
│   │   ├── +layout.svelte         # Root layout (html, head, body)
│   │   └── w/
│   │       └── [workspace]/       # Dynamic workspace segment
│   │           ├── +layout.svelte # Workspace layout (nav, sidebar)
│   │           ├── +layout.server.ts # Workspace data loader
│   │           ├── +page.svelte   # Transaction timeline (main view)
│   │           ├── +page.server.ts # Timeline load + actions
│   │           ├── transaction/
│   │           │   └── [id]/
│   │           │       ├── +page.svelte    # Transaction detail
│   │           │       └── +page.server.ts # Transaction CRUD
│   │           ├── new/
│   │           │   ├── +page.svelte        # New transaction form
│   │           │   └── +page.server.ts     # Create action
│   │           └── settings/
│   │               └── +page.svelte        # Workspace settings
│   │
│   ├── lib/
│   │   ├── components/            # Reusable Svelte components
│   │   │   ├── TransactionCard.svelte
│   │   │   ├── Timeline.svelte
│   │   │   ├── FileUpload.svelte
│   │   │   ├── FilterBar.svelte
│   │   │   └── ui/               # Generic UI components
│   │   │
│   │   ├── server/               # Server-only code ($lib/server)
│   │   │   ├── db/
│   │   │   │   ├── index.ts      # Connection factory
│   │   │   │   ├── schema.sql    # DDL for workspace DBs
│   │   │   │   └── queries/      # Prepared statement definitions
│   │   │   │
│   │   │   ├── workspace/
│   │   │   │   ├── index.ts      # Workspace resolution
│   │   │   │   └── cache.ts      # Connection caching
│   │   │   │
│   │   │   └── storage/
│   │   │       └── attachments.ts # File upload/retrieval
│   │   │
│   │   ├── types/                # Shared TypeScript types
│   │   │   ├── transaction.ts
│   │   │   └── workspace.ts
│   │   │
│   │   └── utils/                # Shared utilities
│   │       ├── date.ts           # Fiscal year helpers
│   │       └── format.ts         # Currency/number formatting
│   │
│   ├── hooks.server.ts           # Server hooks (workspace injection)
│   └── app.d.ts                  # App-level type declarations
│
├── static/                       # Static assets (favicon, etc.)
├── data/                         # Persistent data (Docker volume)
│   ├── workspaces/               # Workspace SQLite files
│   │   ├── workspace-a.db
│   │   └── workspace-b.db
│   └── attachments/              # Uploaded files by workspace
│       ├── workspace-a/
│       └── workspace-b/
│
├── svelte.config.js
├── vite.config.ts
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Patterns to Follow

### Pattern 1: Workspace Context via hooks.server.ts

**What:** Inject workspace-scoped database connection into every request via `event.locals`
**When:** Every request to `/w/[workspace]/...` routes
**Confidence:** HIGH (verified with [SvelteKit hooks documentation](https://svelte.dev/docs/kit/hooks))

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { getWorkspaceDb } from '$lib/server/workspace';

export const handle: Handle = async ({ event, resolve }) => {
    const workspaceMatch = event.url.pathname.match(/^\/w\/([^\/]+)/);

    if (workspaceMatch) {
        const workspaceId = workspaceMatch[1];
        // Get or create cached connection for this workspace
        event.locals.workspace = workspaceId;
        event.locals.db = getWorkspaceDb(workspaceId);
    }

    return resolve(event);
};
```

```typescript
// src/app.d.ts
import type { Database } from 'better-sqlite3';

declare global {
    namespace App {
        interface Locals {
            workspace?: string;
            db?: Database;
        }
    }
}
```

### Pattern 2: Form Actions for Data Mutations

**What:** Use SvelteKit form actions (not API routes) for all data mutations
**When:** Creating, updating, deleting transactions; uploading attachments
**Confidence:** HIGH (verified with [SvelteKit form actions docs](https://svelte.dev/docs/kit/form-actions))

Form actions provide progressive enhancement - forms work without JavaScript and enhance when JS is available.

```typescript
// src/routes/w/[workspace]/new/+page.server.ts
import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const actions: Actions = {
    default: async ({ request, locals }) => {
        const data = await request.formData();
        const description = data.get('description');
        const amount = data.get('amount');

        // Validation
        if (!description || typeof description !== 'string') {
            return fail(400, { error: 'Description required', description, amount });
        }

        // Insert using workspace-scoped db from locals
        const stmt = locals.db!.prepare(
            'INSERT INTO transactions (description, amount, date) VALUES (?, ?, ?)'
        );
        const result = stmt.run(description, amount, new Date().toISOString());

        throw redirect(303, `/w/${locals.workspace}/transaction/${result.lastInsertRowid}`);
    }
};
```

```svelte
<!-- src/routes/w/[workspace]/new/+page.svelte -->
<script>
    import { enhance } from '$app/forms';
    let { form } = $props();
</script>

<form method="POST" use:enhance>
    <input name="description" value={form?.description ?? ''} />
    {#if form?.error}
        <p class="error">{form.error}</p>
    {/if}
    <input name="amount" type="number" step="0.01" />
    <button type="submit">Create Transaction</button>
</form>
```

### Pattern 3: Load Functions for Data Fetching

**What:** Use `+page.server.ts` load functions with URL search params for filtering
**When:** Loading transaction timeline with fiscal year filter
**Confidence:** HIGH (verified with [SvelteKit load documentation](https://svelte.dev/docs/kit/load))

```typescript
// src/routes/w/[workspace]/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    const fiscalYear = url.searchParams.get('year') ?? getCurrentFiscalYear();
    const category = url.searchParams.get('category');

    let query = `
        SELECT * FROM transactions
        WHERE fiscal_year = ?
    `;
    const params: any[] = [fiscalYear];

    if (category) {
        query += ' AND category = ?';
        params.push(category);
    }

    query += ' ORDER BY date DESC';

    const transactions = locals.db!.prepare(query).all(...params);

    return {
        transactions,
        filters: { fiscalYear, category }
    };
};
```

### Pattern 4: File Upload to Filesystem

**What:** Handle file uploads in form actions, save to workspace-specific directory
**When:** Attaching receipts/documents to transactions
**Confidence:** MEDIUM (verified pattern from [community examples](https://travishorn.com/uploading-and-saving-files-with-sveltekit))

```typescript
// src/lib/server/storage/attachments.ts
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

const DATA_DIR = process.env.DATA_DIR ?? './data';

export async function saveAttachment(
    workspaceId: string,
    file: File
): Promise<string> {
    const dir = join(DATA_DIR, 'attachments', workspaceId);
    await mkdir(dir, { recursive: true });

    const ext = extname(file.name);
    const filename = `${randomUUID()}${ext}`;
    const filepath = join(dir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    return filename;
}
```

```typescript
// In form action
export const actions: Actions = {
    default: async ({ request, locals }) => {
        const data = await request.formData();
        const file = data.get('attachment') as File | null;

        let attachmentPath: string | null = null;
        if (file && file.size > 0) {
            attachmentPath = await saveAttachment(locals.workspace!, file);
        }

        // Save transaction with attachment path...
    }
};
```

### Pattern 5: Multi-Tenant Database Connection Caching

**What:** Cache SQLite database connections per workspace to avoid repeated file opens
**When:** Any request to a workspace route
**Confidence:** HIGH (verified with [better-sqlite3 documentation](https://github.com/WiseLibs/better-sqlite3))

```typescript
// src/lib/server/workspace/cache.ts
import Database from 'better-sqlite3';
import { join } from 'node:path';

const DATA_DIR = process.env.DATA_DIR ?? './data';
const connectionCache = new Map<string, Database.Database>();

export function getWorkspaceDb(workspaceId: string): Database.Database {
    // Return cached connection if exists
    if (connectionCache.has(workspaceId)) {
        return connectionCache.get(workspaceId)!;
    }

    // Create new connection
    const dbPath = join(DATA_DIR, 'workspaces', `${workspaceId}.db`);
    const db = new Database(dbPath);

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');

    // Initialize schema if needed
    initializeSchema(db);

    connectionCache.set(workspaceId, db);
    return db;
}

function initializeSchema(db: Database.Database): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            fiscal_year TEXT NOT NULL,
            category TEXT,
            attachment_path TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_transactions_fiscal_year
        ON transactions(fiscal_year);

        CREATE INDEX IF NOT EXISTS idx_transactions_date
        ON transactions(date DESC);
    `);
}
```

### Pattern 6: URL-Based State for Filtering

**What:** Store filter state (fiscal year, category) in URL search params
**When:** Timeline filtering that should be bookmarkable/shareable
**Confidence:** HIGH (verified with [SvelteKit URL patterns](https://www.okupter.com/blog/sveltekit-query-parameters))

```svelte
<!-- src/lib/components/FilterBar.svelte -->
<script>
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';

    let { fiscalYears, categories } = $props();

    function updateFilter(key: string, value: string) {
        const url = new URL($page.url);
        if (value) {
            url.searchParams.set(key, value);
        } else {
            url.searchParams.delete(key);
        }
        goto(url.toString(), { replaceState: true, noScroll: true });
    }
</script>

<div class="filter-bar">
    <select onchange={(e) => updateFilter('year', e.target.value)}>
        {#each fiscalYears as year}
            <option value={year} selected={year === $page.url.searchParams.get('year')}>
                {year}
            </option>
        {/each}
    </select>

    <select onchange={(e) => updateFilter('category', e.target.value)}>
        <option value="">All Categories</option>
        {#each categories as cat}
            <option value={cat}>{cat}</option>
        {/each}
    </select>
</div>
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Global Database Connection

**What:** Using a single shared database connection in a module-level variable
**Why bad:** In multi-tenant architecture, this leads to data leaks between workspaces. Even for single-tenant, SvelteKit server can handle multiple concurrent requests.
**Instead:** Use `event.locals` to scope database connections to requests, with a connection cache keyed by workspace ID.

Source: [SvelteKit state management docs](https://svelte.dev/docs/kit/state-management)

### Anti-Pattern 2: API Routes for Form Submissions

**What:** Creating `+server.ts` endpoints for form submissions instead of form actions
**Why bad:** Loses progressive enhancement (requires JavaScript), more boilerplate code, manual error handling.
**Instead:** Use form actions in `+page.server.ts` with `use:enhance` for progressive enhancement.

Source: [SvelteKit form actions documentation](https://svelte.dev/docs/kit/form-actions)

### Anti-Pattern 3: Client-Side Data Fetching for Initial Load

**What:** Using `onMount` or effects to fetch data that should be available on page load
**Why bad:** Causes loading spinners, poor SEO, data not available during SSR.
**Instead:** Use `+page.server.ts` load functions. Data is fetched on server, available immediately.

### Anti-Pattern 4: Storing Filter State in Svelte Stores

**What:** Using `writable()` stores for filter state that should be URL-based
**Why bad:** State lost on refresh, URLs not bookmarkable/shareable, back button doesn't work.
**Instead:** Use URL search params. Update via `goto()` with `replaceState: true`.

### Anti-Pattern 5: Blocking Database Operations in Event Loop

**What:** Using async SQLite libraries or making blocking calls without consideration
**Why bad:** Node.js event loop blocked, degraded performance under load.
**Why better-sqlite3 is OK:** better-sqlite3's synchronous API is actually faster than async alternatives because it avoids Promise overhead and operates entirely in C++. The synchronous nature is fine for SQLite's fast local file operations.

Source: [better-sqlite3 documentation](https://github.com/WiseLibs/better-sqlite3)

## Docker Deployment Architecture

**Confidence:** HIGH (verified with [official adapter-node docs](https://svelte.dev/docs/kit/adapter-node))

```dockerfile
# Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY package.json .

# Create data directory for volumes
RUN mkdir -p /app/data/workspaces /app/data/attachments

EXPOSE 3000
ENV NODE_ENV=production
ENV DATA_DIR=/app/data

CMD ["node", "build"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  tinyledger:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - tinyledger-data:/app/data
    environment:
      - NODE_ENV=production
      - ORIGIN=http://localhost:3000
    restart: unless-stopped

volumes:
  tinyledger-data:
```

### Key Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `PORT` | Server port | 3000 |
| `ORIGIN` | Deployment URL (required for CSRF) | - |
| `DATA_DIR` | Path to data directory | ./data |
| `BODY_SIZE_LIMIT` | Max upload size | 512kb (increase for attachments) |

## Scalability Considerations

| Concern | Self-hosted (1-10 users) | Notes |
|---------|--------------------------|-------|
| Database | SQLite per workspace is ideal | No external dependencies, fast, reliable |
| Connections | Cache in memory | Connection pool unnecessary for SQLite |
| File storage | Local filesystem | Docker volume, backup regularly |
| Concurrency | SQLite WAL mode | Handles concurrent reads well |
| Backups | Copy .db files | SQLite files are self-contained |

For TinyLedger's self-hosted use case with Tailscale access (limited users), this architecture is appropriate. SQLite with WAL mode handles concurrent reads excellently, and the connection caching prevents repeated file opens.

## Build Order Implications

Based on component dependencies, the recommended build order is:

```
Phase 1: Foundation
├── Project scaffolding (SvelteKit + Tailwind)
├── Database layer ($lib/server/db)
├── Workspace resolution ($lib/server/workspace)
└── Server hooks (hooks.server.ts)

Phase 2: Core Data Flow
├── Schema design (transactions table)
├── Root layout structure
├── Workspace layout with nav
└── Basic transaction list (load function)

Phase 3: CRUD Operations
├── New transaction form + action
├── Transaction detail view
├── Edit transaction
└── Delete transaction

Phase 4: File Handling
├── Attachment storage ($lib/server/storage)
├── File upload in transaction form
├── Attachment display/download

Phase 5: Timeline & Filtering
├── Fiscal year URL param handling
├── FilterBar component
├── Category filtering
└── Timeline UI polish

Phase 6: Polish & Deployment
├── Mobile responsive styling
├── Error handling
├── Dockerfile + compose
└── Production configuration
```

**Rationale:**
1. Foundation first - hooks and workspace resolution are used by all routes
2. Data flow next - need to prove the load/action pattern works before building features
3. CRUD before files - simpler, validates core patterns
4. Files before timeline - timeline filtering is polish, files are core functionality
5. Timeline polish uses all prior work
6. Deployment last - validates everything works in production mode

## Sources

- [SvelteKit Project Structure](https://svelte.dev/docs/kit/project-structure) - HIGH confidence
- [SvelteKit Hooks](https://svelte.dev/docs/kit/hooks) - HIGH confidence
- [SvelteKit Form Actions](https://svelte.dev/docs/kit/form-actions) - HIGH confidence
- [SvelteKit State Management](https://svelte.dev/docs/kit/state-management) - HIGH confidence
- [better-sqlite3 API](https://github.com/WiseLibs/better-sqlite3) - HIGH confidence (Context7)
- [SvelteKit adapter-node](https://svelte.dev/docs/kit/adapter-node) - HIGH confidence
- [Multi-tenant SQLite patterns](https://medium.com/@dmitry.s.mamonov/database-per-tenant-consider-sqlite-9239113c936c) - MEDIUM confidence
- [SvelteKit file upload](https://travishorn.com/uploading-and-saving-files-with-sveltekit) - MEDIUM confidence
- [Tailwind responsive design](https://tailwindcss.com/docs/responsive-design) - HIGH confidence
