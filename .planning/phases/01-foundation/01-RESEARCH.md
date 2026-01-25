# Phase 1: Foundation - Research

**Researched:** 2026-01-24
**Domain:** SvelteKit + SQLite multi-tenant workspace architecture
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundation for TinyLedger: a SvelteKit project with workspace-isolated SQLite databases. The primary technical challenges are (1) dynamic database connection management based on URL path, (2) proper SQLite configuration for performance, and (3) workspace CRUD with logo upload and dimension enforcement.

The standard approach uses SvelteKit's `hooks.server.ts` to intercept requests, parse workspace ID from the URL path (`/w/[workspace]/...`), and inject a workspace-scoped database connection into `event.locals`. Each workspace has its own SQLite file with WAL mode enabled for concurrent read performance. Logo uploads use the Sharp library for dimension enforcement before storage.

**Primary recommendation:** Use `hooks.server.ts` for workspace context injection, Drizzle ORM with better-sqlite3 for type-safe database access, and Sharp for image processing. Store last-used workspace in localStorage with a persisted Svelte store pattern.

## Standard Stack

The established libraries/tools for this phase:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @sveltejs/kit | ^2.50.0 | Full-stack framework | File-based routing, SSR, form actions, hooks system |
| svelte | ^5.47.0 | UI framework | Compiles to vanilla JS, smallest runtime |
| better-sqlite3 | ^12.6.2 | SQLite driver | Synchronous API (faster than async), WAL support |
| drizzle-orm | ^0.45.1 | Type-safe ORM | SQL-like syntax, TypeScript inference, lightweight |
| drizzle-kit | ^0.31.x | Migrations CLI | Generate/push migrations from TypeScript schema |
| sharp | ^0.33.x | Image processing | Fastest Node.js image resize, dimension enforcement |
| tailwindcss | ^4.1.x | Utility CSS | Mobile-first, zero-runtime, v4 Vite integration |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @sveltejs/adapter-node | ^5.x | Node adapter | Required for Docker deployment |
| @tailwindcss/vite | ^4.1.x | Vite plugin | First-party Tailwind v4 integration |
| @types/better-sqlite3 | ^7.x | TypeScript types | Type definitions for better-sqlite3 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| better-sqlite3 | libsql | libsql supports remote Turso, but adds complexity for local-only use |
| Drizzle ORM | raw SQL | Loses type safety and migration management |
| Sharp | Jimp | Sharp is 10x faster but requires native binaries |
| localStorage | Cookie | localStorage is simpler for client-only preference storage |

**Installation:**
```bash
npm install better-sqlite3 drizzle-orm sharp
npm install -D drizzle-kit @types/better-sqlite3 tailwindcss @tailwindcss/vite @sveltejs/adapter-node
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── routes/
│   ├── +page.svelte              # Landing/workspace selector
│   ├── +layout.svelte            # Root layout
│   └── w/
│       └── [workspace]/          # Dynamic workspace segment
│           ├── +layout.svelte    # Workspace layout (header, nav)
│           ├── +layout.server.ts # Workspace data loader
│           ├── +page.svelte      # Placeholder (redirects to timeline later)
│           └── settings/
│               ├── +page.svelte        # Workspace settings form
│               └── +page.server.ts     # Settings CRUD actions
├── lib/
│   ├── components/               # Reusable Svelte components
│   │   ├── WorkspaceSelector.svelte
│   │   ├── WorkspaceLogo.svelte
│   │   └── ui/                   # Generic UI components
│   ├── server/                   # Server-only code ($lib/server)
│   │   ├── db/
│   │   │   ├── index.ts          # Connection factory
│   │   │   ├── schema.ts         # Drizzle schema definitions
│   │   │   └── migrate.ts        # Schema initialization
│   │   ├── workspace/
│   │   │   ├── index.ts          # Workspace resolution
│   │   │   └── cache.ts          # Connection caching
│   │   └── storage/
│   │       └── logo.ts           # Logo upload/resize
│   ├── stores/
│   │   └── lastWorkspace.ts      # localStorage-backed store
│   └── types/
│       └── workspace.ts          # Workspace TypeScript types
├── hooks.server.ts               # Server hooks (workspace injection)
└── app.d.ts                      # App-level type declarations
```

### Pattern 1: Workspace Context via hooks.server.ts

**What:** Inject workspace-scoped database connection into every request via `event.locals`
**When:** Every request to `/w/[workspace]/...` routes
**Source:** [SvelteKit hooks documentation](https://svelte.dev/docs/kit/hooks)

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { getWorkspaceDb, workspaceExists } from '$lib/server/workspace';
import { error } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    const workspaceMatch = event.url.pathname.match(/^\/w\/([^\/]+)/);

    if (workspaceMatch) {
        const workspaceId = workspaceMatch[1];

        // Validate workspace exists
        if (!workspaceExists(workspaceId)) {
            throw error(404, 'Workspace not found');
        }

        // Inject workspace context into locals
        event.locals.workspaceId = workspaceId;
        event.locals.db = getWorkspaceDb(workspaceId);
    }

    return resolve(event);
};
```

```typescript
// src/app.d.ts
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from '$lib/server/db/schema';

declare global {
    namespace App {
        interface Locals {
            workspaceId?: string;
            db?: BetterSQLite3Database<typeof schema>;
        }
    }
}

export {};
```

### Pattern 2: Database Connection Caching

**What:** Cache SQLite connections per workspace to avoid repeated file opens
**When:** Any request to a workspace route
**Source:** [better-sqlite3 documentation](https://github.com/WiseLibs/better-sqlite3)

```typescript
// src/lib/server/workspace/cache.ts
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import * as schema from '$lib/server/db/schema';
import { initializeSchema } from '$lib/server/db/migrate';

const DATA_DIR = process.env.DATA_DIR ?? './data';
const connectionCache = new Map<string, BetterSQLite3Database<typeof schema>>();

export function getWorkspaceDb(workspaceId: string): BetterSQLite3Database<typeof schema> {
    // Return cached connection if exists
    if (connectionCache.has(workspaceId)) {
        return connectionCache.get(workspaceId)!;
    }

    // Ensure directory exists
    const workspacesDir = join(DATA_DIR, 'workspaces');
    if (!existsSync(workspacesDir)) {
        mkdirSync(workspacesDir, { recursive: true });
    }

    // Create new connection
    const dbPath = join(workspacesDir, `${workspaceId}.db`);
    const sqlite = new Database(dbPath);

    // Enable WAL mode for better concurrency (CRITICAL for performance)
    sqlite.pragma('journal_mode = WAL');

    // Set busy timeout for concurrent access
    sqlite.pragma('busy_timeout = 5000');

    // Wrap with Drizzle ORM
    const db = drizzle(sqlite, { schema });

    // Initialize schema if new database
    initializeSchema(db);

    connectionCache.set(workspaceId, db);
    return db;
}

export function workspaceExists(workspaceId: string): boolean {
    const dbPath = join(DATA_DIR, 'workspaces', `${workspaceId}.db`);
    return existsSync(dbPath);
}

export function createWorkspace(workspaceId: string): BetterSQLite3Database<typeof schema> {
    // This will create the database file and initialize schema
    return getWorkspaceDb(workspaceId);
}
```

### Pattern 3: Drizzle Schema for Workspaces

**What:** Define workspace metadata table with Drizzle ORM
**When:** Storing workspace configuration
**Source:** [Drizzle ORM SQLite docs](https://orm.drizzle.team/docs/column-types/sqlite)

```typescript
// src/lib/server/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Workspace metadata (stored in each workspace's own DB)
export const workspaceSettings = sqliteTable('workspace_settings', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    type: text('type', { enum: ['sole_prop', 'volunteer_org'] }).notNull(),
    businessName: text('business_name'),
    address: text('address'),
    phone: text('phone'),
    responsibleParty: text('responsible_party'),
    foundedYear: integer('founded_year'),
    logoFilename: text('logo_filename'),  // null = use abbreviation
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Type exports for use in application
export type WorkspaceSettings = typeof workspaceSettings.$inferSelect;
export type NewWorkspaceSettings = typeof workspaceSettings.$inferInsert;
```

### Pattern 4: Logo Upload with Dimension Enforcement

**What:** Process uploaded logo images to enforce dimensions using Sharp
**When:** User uploads workspace logo
**Source:** [Sharp resize documentation](https://sharp.pixelplumbing.com/api-resize/)

```typescript
// src/lib/server/storage/logo.ts
import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const DATA_DIR = process.env.DATA_DIR ?? './data';
const LOGO_SIZE = 128; // Enforced square dimensions

export interface LogoUploadResult {
    filename: string;
    width: number;
    height: number;
}

export async function processLogoUpload(
    workspaceId: string,
    file: File
): Promise<LogoUploadResult> {
    const dir = join(DATA_DIR, 'logos', workspaceId);
    await mkdir(dir, { recursive: true });

    const filename = `${randomUUID()}.png`;
    const filepath = join(dir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());

    // Resize and enforce dimensions using Sharp
    await sharp(buffer)
        .resize(LOGO_SIZE, LOGO_SIZE, {
            fit: 'cover',       // Crop to fill dimensions
            position: 'center'  // Center crop
        })
        .png()
        .toFile(filepath);

    return {
        filename,
        width: LOGO_SIZE,
        height: LOGO_SIZE
    };
}
```

### Pattern 5: localStorage-Backed Store for Last Workspace

**What:** Persist last-used workspace ID in localStorage using Svelte store
**When:** Remembering user's workspace preference across sessions
**Source:** [svelte-persisted-store](https://github.com/joshnuss/svelte-persisted-store)

```typescript
// src/lib/stores/lastWorkspace.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'tinyledger_last_workspace';

function createLastWorkspaceStore() {
    // Initialize from localStorage if in browser
    const initialValue = browser
        ? localStorage.getItem(STORAGE_KEY) ?? ''
        : '';

    const store = writable<string>(initialValue);

    // Sync to localStorage on change
    if (browser) {
        store.subscribe((value) => {
            if (value) {
                localStorage.setItem(STORAGE_KEY, value);
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        });
    }

    return store;
}

export const lastWorkspace = createLastWorkspaceStore();
```

### Pattern 6: Form Actions for Workspace CRUD

**What:** Use SvelteKit form actions for workspace creation/updates
**When:** Creating or editing workspace settings
**Source:** [SvelteKit form actions](https://svelte.dev/docs/kit/form-actions)

```typescript
// src/routes/w/[workspace]/settings/+page.server.ts
import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { workspaceSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { processLogoUpload } from '$lib/server/storage/logo';

export const load: PageServerLoad = async ({ locals }) => {
    const settings = locals.db!.select()
        .from(workspaceSettings)
        .limit(1)
        .get();

    return { settings };
};

export const actions: Actions = {
    update: async ({ request, locals }) => {
        const data = await request.formData();

        const name = data.get('name');
        const type = data.get('type');

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return fail(400, { error: 'Name is required' });
        }

        if (type !== 'sole_prop' && type !== 'volunteer_org') {
            return fail(400, { error: 'Invalid workspace type' });
        }

        // Handle logo upload if provided
        const logoFile = data.get('logo') as File | null;
        let logoFilename: string | null = null;

        if (logoFile && logoFile.size > 0) {
            const result = await processLogoUpload(locals.workspaceId!, logoFile);
            logoFilename = result.filename;
        }

        // Update workspace settings
        locals.db!.update(workspaceSettings)
            .set({
                name: name.trim(),
                type,
                businessName: data.get('businessName')?.toString() || null,
                address: data.get('address')?.toString() || null,
                phone: data.get('phone')?.toString() || null,
                responsibleParty: data.get('responsibleParty')?.toString() || null,
                foundedYear: data.get('foundedYear')
                    ? parseInt(data.get('foundedYear') as string)
                    : null,
                ...(logoFilename && { logoFilename }),
                updatedAt: new Date().toISOString()
            })
            .where(eq(workspaceSettings.id, 1))
            .run();

        return { success: true };
    }
};
```

### Anti-Patterns to Avoid

- **Global Database Connection:** Never store a single shared database connection in a module-level variable. In multi-tenant architecture, this leads to data leaks between workspaces. Use `event.locals` scoped to each request.

- **API Routes for Form Submissions:** Don't create `+server.ts` endpoints for form submissions. Use form actions in `+page.server.ts` with `use:enhance` for progressive enhancement.

- **Storing Filter State in Svelte Stores:** Don't use `writable()` stores for filter/navigation state. Use URL search params so state survives refresh and is bookmarkable.

- **Forgetting WAL Mode:** Always enable WAL mode (`db.pragma('journal_mode = WAL')`) for SQLite. Without it, concurrent reads block and performance suffers dramatically.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image resizing | Manual canvas/ImageMagick | Sharp | 10x faster, handles edge cases, maintains aspect ratio |
| Type-safe SQL | Raw SQL strings | Drizzle ORM | TypeScript inference, migration management, no runtime overhead |
| Database migrations | Manual ALTER TABLE | drizzle-kit | Automatic diff, rollback capability, schema versioning |
| localStorage sync | Manual event listeners | Persisted store pattern | Handles SSR, tab sync, type safety |
| UUID generation | Custom random | crypto.randomUUID() | Cryptographically secure, built-in |

**Key insight:** SQLite looks simple but has many gotchas (WAL mode, busy timeout, connection management). Drizzle + better-sqlite3 abstracts these correctly.

## Common Pitfalls

### Pitfall 1: SSR Hydration Mismatch with localStorage

**What goes wrong:** Accessing `localStorage` directly causes hydration mismatch errors because localStorage doesn't exist during SSR.
**Why it happens:** SvelteKit renders on server first where `window` is undefined.
**How to avoid:** Always guard localStorage access with `browser` check from `$app/environment`.
**Warning signs:** Console errors about hydration mismatch, flickering content.

### Pitfall 2: Swallowing Redirect Errors

**What goes wrong:** Form actions that catch errors also catch SvelteKit's redirect throws, causing redirects to fail silently.
**Why it happens:** SvelteKit uses `throw redirect()` which is caught by generic `catch` blocks.
**How to avoid:** In try/catch blocks, rethrow any error you didn't handle: `if (!(e instanceof Error) || !('status' in e)) throw e;`
**Warning signs:** Redirects not working after form submission.

### Pitfall 3: Database File Not Found in Production

**What goes wrong:** Database path is relative and works in dev but fails in Docker.
**Why it happens:** Working directory differs between dev and production builds.
**How to avoid:** Use absolute paths via `DATA_DIR` environment variable, always resolve with `path.join()`.
**Warning signs:** "SQLITE_CANTOPEN" errors in production logs.

### Pitfall 4: Missing WAL Mode

**What goes wrong:** Multiple concurrent reads cause "database is locked" errors.
**Why it happens:** Default SQLite journal mode (DELETE) uses exclusive locking.
**How to avoid:** Always set `db.pragma('journal_mode = WAL')` immediately after opening connection.
**Warning signs:** Intermittent "SQLITE_BUSY" or "database is locked" errors.

### Pitfall 5: Blocking the Event Loop

**What goes wrong:** Long-running SQLite queries block Node.js event loop, causing request timeouts.
**Why it happens:** better-sqlite3 is synchronous by design.
**How to avoid:** Ensure queries are indexed and fast. If queries take >50ms, consider pagination or background processing.
**Warning signs:** Slow response times, timeouts, poor concurrency.

### Pitfall 6: File Upload Without enctype

**What goes wrong:** File uploads silently fail, returning null/empty.
**Why it happens:** HTML forms default to `application/x-www-form-urlencoded` which doesn't support files.
**How to avoid:** Always add `enctype="multipart/form-data"` to forms with file inputs.
**Warning signs:** `file.size === 0` or file is null despite user selecting a file.

## Code Examples

Verified patterns from official sources:

### SvelteKit Form with File Upload

```svelte
<!-- Source: SvelteKit docs -->
<script>
    import { enhance } from '$app/forms';
    let { data, form } = $props();
</script>

<form method="POST" action="?/update" use:enhance enctype="multipart/form-data">
    <label>
        Workspace Name
        <input name="name" value={data.settings?.name ?? ''} required />
    </label>

    <label>
        Type
        <select name="type" required>
            <option value="sole_prop" selected={data.settings?.type === 'sole_prop'}>
                Sole Proprietor
            </option>
            <option value="volunteer_org" selected={data.settings?.type === 'volunteer_org'}>
                Volunteer Organization
            </option>
        </select>
    </label>

    <label>
        Logo (128x128, will be cropped)
        <input name="logo" type="file" accept="image/*" />
    </label>

    {#if form?.error}
        <p class="error">{form.error}</p>
    {/if}

    <button type="submit">Save Settings</button>
</form>
```

### Workspace Header with Switcher

```svelte
<!-- Workspace dropdown in header -->
<script>
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { lastWorkspace } from '$lib/stores/lastWorkspace';

    let { workspaces, currentWorkspace } = $props();

    function switchWorkspace(workspaceId: string) {
        lastWorkspace.set(workspaceId);
        goto(`/w/${workspaceId}`);
    }
</script>

<header class="flex items-center justify-between p-4 bg-white border-b">
    <div class="flex items-center gap-3">
        <!-- Logo or abbreviation -->
        {#if currentWorkspace.logoFilename}
            <img
                src="/api/logo/{currentWorkspace.id}/{currentWorkspace.logoFilename}"
                alt=""
                class="w-10 h-10 rounded"
            />
        {:else}
            <div class="w-10 h-10 rounded bg-blue-500 flex items-center justify-center text-white font-bold">
                {currentWorkspace.name.slice(0, 2).toUpperCase()}
            </div>
        {/if}

        <!-- Workspace switcher dropdown -->
        <select
            class="font-medium text-lg border-none bg-transparent"
            onchange={(e) => switchWorkspace(e.currentTarget.value)}
        >
            {#each workspaces as ws}
                <option value={ws.id} selected={ws.id === currentWorkspace.id}>
                    {ws.name}
                </option>
            {/each}
        </select>
    </div>

    <nav>
        <!-- Navigation items -->
    </nav>
</header>
```

### Drizzle Schema Initialization

```typescript
// src/lib/server/db/migrate.ts
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import type * as schema from './schema';

export function initializeSchema(db: BetterSQLite3Database<typeof schema>): void {
    // Create tables if they don't exist
    db.run(sql`
        CREATE TABLE IF NOT EXISTS workspace_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('sole_prop', 'volunteer_org')),
            business_name TEXT,
            address TEXT,
            phone TEXT,
            responsible_party TEXT,
            founded_year INTEGER,
            logo_filename TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
    `);

    // Insert default settings row if empty (singleton pattern)
    const existing = db.run(sql`SELECT COUNT(*) as count FROM workspace_settings`);
    if (!existing) {
        db.run(sql`
            INSERT INTO workspace_settings (name, type)
            VALUES ('New Workspace', 'sole_prop')
        `);
    }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| svelte-chartjs wrapper | Chart.js direct integration | 2025 | Wrapper doesn't support Svelte 5, use Chart.js directly |
| Tailwind v3 PostCSS | Tailwind v4 Vite plugin | 2024 | 5x faster builds, simpler config, no PostCSS needed |
| Prisma ORM | Drizzle ORM | 2024 | No query engine binary, lighter Docker images |
| async SQLite drivers | better-sqlite3 sync | 2023 | Synchronous is faster for SQLite's fast local ops |

**Deprecated/outdated:**
- `svelte-chartjs`: Unmaintained, doesn't support Svelte 5. Use Chart.js directly.
- PostCSS for Tailwind: Tailwind v4 uses Vite plugin, no PostCSS config needed.

## Open Questions

Things that couldn't be fully resolved:

1. **Global Workspace Registry**
   - What we know: Each workspace has its own SQLite file
   - What's unclear: Where to store the list of all workspaces for the landing page dropdown
   - Recommendation: Create a `workspaces.json` file in DATA_DIR or a separate `registry.db`. Research during implementation.

2. **Logo Serving Strategy**
   - What we know: Logos stored in filesystem at `data/logos/{workspaceId}/`
   - What's unclear: Whether to serve via SvelteKit route or static adapter
   - Recommendation: Use a `+server.ts` route for now (`/api/logo/[workspace]/[filename]`), can optimize later with Nginx direct serving.

3. **Connection Cache Cleanup**
   - What we know: Connection cache prevents repeated file opens
   - What's unclear: Whether long-running servers need connection cleanup
   - Recommendation: For small user base (self-hosted), cache indefinitely. Add cleanup if memory issues arise.

## Sources

### Primary (HIGH confidence)
- [SvelteKit hooks documentation](https://svelte.dev/docs/kit/hooks) - Server handle function, event.locals injection
- [SvelteKit form actions](https://svelte.dev/docs/kit/form-actions) - Form handling, file uploads
- [SvelteKit project structure](https://svelte.dev/docs/kit/project-structure) - Directory conventions
- [Drizzle ORM SQLite docs](https://orm.drizzle.team/docs/quick-sqlite/better-sqlite3) - Schema definition, connection setup
- [better-sqlite3 performance docs](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/performance.md) - WAL mode, busy_timeout
- [Sharp resize API](https://sharp.pixelplumbing.com/api-resize/) - Dimension enforcement, fit options

### Secondary (MEDIUM confidence)
- [SvelteKit multi-tenancy discussion](https://github.com/sveltejs/kit/discussions/8699) - Community patterns for workspace isolation
- [svelte-persisted-store](https://github.com/joshnuss/svelte-persisted-store) - localStorage sync pattern
- [Rodney Lab localStorage guide](https://rodneylab.com/using-local-storage-sveltekit/) - Browser environment checks

### Tertiary (LOW confidence)
- Multi-tenant SQLite patterns from blog posts - Needs validation during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified via Context7 and official docs
- Architecture patterns: HIGH - Based on SvelteKit official documentation
- Database configuration: HIGH - better-sqlite3 and Drizzle docs verified
- Pitfalls: MEDIUM - Based on community discussions and general SQLite knowledge

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (30 days - stable stack)
