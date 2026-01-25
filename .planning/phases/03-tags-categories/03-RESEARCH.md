# Phase 3: Tags & Categories - Research

**Researched:** 2026-01-25
**Domain:** Tag management, autocomplete/predictive entry, Schedule C pre-seeding
**Confidence:** HIGH

## Summary

Phase 3 implements complete tag management for TinyLedger: on-the-fly tag creation during transaction entry, a tags management page for CRUD operations (including merge), Schedule C category pre-seeding for new workspaces, and predictive entry features (payee autocomplete with fuzzy matching, tag suggestions based on payee history, optional amount pre-fill).

The key technical challenges are: (1) inline tag creation from the TagSelector component that creates tags server-side and updates the component state, (2) tag merge operations that reassign all transactionTags to the target tag before deleting the source, (3) lightweight fuzzy search for payee autocomplete that works efficiently client-side, and (4) aggregating payee history to suggest tags and amounts.

**Primary recommendation:** Use callback props for inline tag creation, microfuzz for lightweight fuzzy search, server-side tag operations with proper foreign key handling, and aggregate queries for payee-based predictions.

## Standard Stack

The established libraries/tools for this phase:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.45.1 | Database operations | Already in use, handles tag CRUD and joins |
| @nozbe/microfuzz | ^1.0.0 | Fuzzy search | 2KB, no dependencies, fast for autocomplete |
| svelte | ^5.45.6 | UI framework | Callback props pattern for component communication |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Intl.Collator | (native) | String sorting | Locale-aware tag name sorting |
| structuredClone | (native) | Deep copy | Copying tag lists for UI state |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| microfuzz | Fuse.js | Fuse.js is 26KB vs 2KB, overkill for short labels |
| microfuzz | fuzzysort | Similar size but microfuzz has better API for our use case |
| Custom autocomplete | svelte-select | Adds dependency; our needs are simple enough to build |
| Callback props | createEventDispatcher | Deprecated in Svelte 5, callbacks are the new pattern |

**Installation:**
```bash
npm install @nozbe/microfuzz
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── routes/
│   └── w/
│       └── [workspace]/
│           ├── settings/
│           │   └── tags/
│           │       ├── +page.svelte        # Tags management page
│           │       └── +page.server.ts     # Tag CRUD actions
│           └── transactions/
│               └── new/
│                   ├── +page.svelte        # Enhanced with payee autocomplete
│                   └── +page.server.ts     # Tag creation, payee history
├── lib/
│   ├── components/
│   │   ├── TagSelector.svelte              # Enhanced with inline creation
│   │   ├── PayeeAutocomplete.svelte        # NEW: Fuzzy search payee input
│   │   └── TagSuggestions.svelte           # NEW: Tag suggestions display
│   ├── data/
│   │   └── schedulec-categories.ts         # Pre-seeded Schedule C categories
│   └── server/
│       └── db/
│           └── seed-tags.ts                # Tag seeding logic for new workspaces
```

### Pattern 1: Callback Props for Inline Tag Creation

**What:** Child component notifies parent when a new tag needs to be created
**When:** TagSelector needs to create a tag that doesn't exist yet (TAGS-01)
**Source:** [Svelte 5 Migration Guide - Component Events](https://svelte.dev/docs/svelte/v5-migration-guide)

```svelte
<!-- src/lib/components/TagSelector.svelte -->
<script lang="ts">
    import type { Tag } from '$lib/server/db/schema';

    type TagAllocation = {
        tagId: number;
        percentage: number;
    };

    let {
        availableTags = [],
        allocations = $bindable<TagAllocation[]>([]),
        onCreateTag,  // Callback for creating new tags
        locked = false  // TAGS-03: Lock mode prevents creation
    }: {
        availableTags: Tag[];
        allocations?: TagAllocation[];
        onCreateTag?: (name: string) => Promise<Tag | null>;
        locked?: boolean;
    } = $props();

    let newTagName = $state('');
    let isCreating = $state(false);

    async function handleCreateTag() {
        if (!onCreateTag || !newTagName.trim() || locked) return;

        isCreating = true;
        try {
            const newTag = await onCreateTag(newTagName.trim());
            if (newTag) {
                // Add new tag to allocations with remaining percentage
                const remaining = 100 - allocations.reduce((sum, a) => sum + a.percentage, 0);
                allocations = [...allocations, {
                    tagId: newTag.id,
                    percentage: remaining > 0 ? remaining : 0
                }];
                newTagName = '';
            }
        } finally {
            isCreating = false;
        }
    }
</script>

{#if !locked}
    <div class="flex gap-2 mt-2">
        <input
            type="text"
            bind:value={newTagName}
            placeholder="New tag name..."
            class="flex-1 rounded-lg border px-3 py-2"
        />
        <button
            type="button"
            onclick={handleCreateTag}
            disabled={isCreating || !newTagName.trim()}
            class="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
            {isCreating ? 'Creating...' : 'Create'}
        </button>
    </div>
{/if}
```

### Pattern 2: Server Action for Tag Creation

**What:** Form action that creates a tag and returns it as JSON
**When:** Called from TagSelector via fetch (TAGS-01)
**Source:** [SvelteKit Form Actions](https://svelte.dev/docs/kit/form-actions)

```typescript
// src/routes/w/[workspace]/transactions/new/+page.server.ts
import { json } from '@sveltejs/kit';
import { tags } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const actions = {
    createTag: async ({ locals, request }) => {
        const db = locals.db!;
        const formData = await request.formData();
        const name = (formData.get('name') as string)?.trim();

        if (!name) {
            return { success: false, error: 'Tag name is required' };
        }

        // Check for duplicate (case-insensitive)
        const existing = db.select().from(tags)
            .where(eq(tags.name, name))
            .get();

        if (existing) {
            return { success: false, error: 'Tag already exists', tag: existing };
        }

        const result = db.insert(tags)
            .values({ name })
            .returning()
            .get();

        return { success: true, tag: result };
    }
};
```

### Pattern 3: Tag Merge Operation

**What:** Reassign all transaction tags to target tag, then delete source tag
**When:** User merges two tags in settings (TAGS-02)
**Source:** [Drizzle ORM Update](https://orm.drizzle.team/docs/update)

```typescript
// src/routes/w/[workspace]/settings/tags/+page.server.ts
import { tags, transactionTags } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const actions = {
    merge: async ({ locals, request }) => {
        const db = locals.db!;
        const formData = await request.formData();
        const sourceId = parseInt(formData.get('sourceId') as string);
        const targetId = parseInt(formData.get('targetId') as string);

        if (sourceId === targetId) {
            return fail(400, { error: 'Cannot merge tag into itself' });
        }

        // Verify both tags exist
        const source = db.select().from(tags).where(eq(tags.id, sourceId)).get();
        const target = db.select().from(tags).where(eq(tags.id, targetId)).get();

        if (!source || !target) {
            return fail(404, { error: 'Tag not found' });
        }

        // Transaction: update all references, then delete source
        // Note: SQLite doesn't have native transactions in drizzle sync mode,
        // but these operations are atomic enough for our use case

        // 1. Update all transaction_tags to point to target
        db.update(transactionTags)
            .set({ tagId: targetId })
            .where(eq(transactionTags.tagId, sourceId))
            .run();

        // 2. Delete source tag (now has no references)
        db.delete(tags)
            .where(eq(tags.id, sourceId))
            .run();

        return { success: true, merged: { from: source.name, to: target.name } };
    },

    rename: async ({ locals, request }) => {
        const db = locals.db!;
        const formData = await request.formData();
        const id = parseInt(formData.get('id') as string);
        const newName = (formData.get('name') as string)?.trim();

        if (!newName) {
            return fail(400, { error: 'Tag name is required' });
        }

        // Check for duplicate name
        const existing = db.select().from(tags)
            .where(eq(tags.name, newName))
            .get();

        if (existing && existing.id !== id) {
            return fail(400, { error: 'A tag with this name already exists' });
        }

        db.update(tags)
            .set({ name: newName })
            .where(eq(tags.id, id))
            .run();

        return { success: true };
    },

    delete: async ({ locals, request }) => {
        const db = locals.db!;
        const formData = await request.formData();
        const id = parseInt(formData.get('id') as string);

        // Check if tag is in use (foreign key is RESTRICT)
        const usageCount = db.select({ count: sql<number>`count(*)` })
            .from(transactionTags)
            .where(eq(transactionTags.tagId, id))
            .get();

        if (usageCount && usageCount.count > 0) {
            return fail(400, {
                error: `Cannot delete tag: used in ${usageCount.count} transaction(s). Merge it instead.`
            });
        }

        db.delete(tags)
            .where(eq(tags.id, id))
            .run();

        return { success: true };
    }
};
```

### Pattern 4: Fuzzy Search with Microfuzz for Payee Autocomplete

**What:** Client-side fuzzy search over payee history
**When:** User types in payee field (PRED-01)
**Source:** [microfuzz GitHub](https://github.com/Nozbe/microfuzz)

```svelte
<!-- src/lib/components/PayeeAutocomplete.svelte -->
<script lang="ts">
    import createFuzzySearch from '@nozbe/microfuzz';

    type PayeeHistory = {
        payee: string;
        lastUsed: string;
        count: number;
        lastAmount: number;
        lastTags: { id: number; name: string; percentage: number }[];
    };

    let {
        payees = [],
        value = $bindable(''),
        onSelect
    }: {
        payees: PayeeHistory[];
        value?: string;
        onSelect?: (payee: PayeeHistory) => void;
    } = $props();

    let showDropdown = $state(false);
    let highlightedIndex = $state(0);
    let inputRef: HTMLInputElement;

    // Create fuzzy search function
    const fuzzySearch = $derived(
        createFuzzySearch(payees, { key: 'payee' })
    );

    // Filter results based on input
    let filteredPayees = $derived(
        value.trim() ? fuzzySearch(value).map(r => r.item) : payees.slice(0, 10)
    );

    function handleSelect(payee: PayeeHistory) {
        value = payee.payee;
        showDropdown = false;
        onSelect?.(payee);
    }

    function handleKeydown(e: KeyboardEvent) {
        if (!showDropdown) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                highlightedIndex = Math.min(highlightedIndex + 1, filteredPayees.length - 1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                highlightedIndex = Math.max(highlightedIndex - 1, 0);
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredPayees[highlightedIndex]) {
                    handleSelect(filteredPayees[highlightedIndex]);
                }
                break;
            case 'Escape':
                showDropdown = false;
                break;
        }
    }
</script>

<div class="relative">
    <input
        type="text"
        bind:this={inputRef}
        bind:value
        name="payee"
        required
        onfocus={() => showDropdown = true}
        onblur={() => setTimeout(() => showDropdown = false, 200)}
        onkeydown={handleKeydown}
        class="w-full rounded-lg border border-gray-300 px-3 py-2"
        autocomplete="off"
    />

    {#if showDropdown && filteredPayees.length > 0}
        <ul class="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
            {#each filteredPayees as payee, i (payee.payee)}
                <li>
                    <button
                        type="button"
                        class="w-full text-left px-3 py-2 hover:bg-gray-100"
                        class:bg-blue-50={i === highlightedIndex}
                        onmousedown={() => handleSelect(payee)}
                    >
                        <div class="font-medium">{payee.payee}</div>
                        <div class="text-sm text-gray-500">
                            Used {payee.count} time(s) - Last: ${(payee.lastAmount / 100).toFixed(2)}
                        </div>
                    </button>
                </li>
            {/each}
        </ul>
    {/if}
</div>
```

### Pattern 5: Aggregate Payee History Query

**What:** Query to get payee usage history with tags and amounts
**When:** Loading transaction form for predictive entry (PRED-01, PRED-02, PRED-03)
**Source:** [Drizzle ORM Aggregations](https://orm.drizzle.team/docs/select#aggregations)

```typescript
// src/routes/w/[workspace]/transactions/new/+page.server.ts
import { transactions, transactionTags, tags } from '$lib/server/db/schema';
import { eq, desc, sql, and, isNull } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
    const db = locals.db!;

    // Get all tags
    const availableTags = db.select().from(tags).orderBy(tags.name).all();

    // Get payee history with aggregated data
    const payeeHistory = db
        .select({
            payee: transactions.payee,
            count: sql<number>`count(*)`,
            lastUsed: sql<string>`max(${transactions.date})`,
            lastAmount: sql<number>`(
                SELECT amount_cents FROM transactions t2
                WHERE t2.payee = ${transactions.payee}
                AND t2.voided_at IS NULL AND t2.deleted_at IS NULL
                ORDER BY t2.date DESC, t2.id DESC LIMIT 1
            )`,
            lastTransactionId: sql<number>`(
                SELECT id FROM transactions t2
                WHERE t2.payee = ${transactions.payee}
                AND t2.voided_at IS NULL AND t2.deleted_at IS NULL
                ORDER BY t2.date DESC, t2.id DESC LIMIT 1
            )`
        })
        .from(transactions)
        .where(and(
            isNull(transactions.voidedAt),
            isNull(transactions.deletedAt)
        ))
        .groupBy(transactions.payee)
        .orderBy(desc(sql`count(*)`))
        .all();

    // For each payee, get the tags from their last transaction
    const payeesWithTags = payeeHistory.map(p => {
        const lastTags = db
            .select({
                id: tags.id,
                name: tags.name,
                percentage: transactionTags.percentage
            })
            .from(transactionTags)
            .innerJoin(tags, eq(transactionTags.tagId, tags.id))
            .where(eq(transactionTags.transactionId, p.lastTransactionId))
            .all();

        return {
            payee: p.payee,
            count: p.count,
            lastUsed: p.lastUsed,
            lastAmount: p.lastAmount,
            lastTags
        };
    });

    return {
        tags: availableTags,
        payeeHistory: payeesWithTags
    };
};
```

### Pattern 6: Schedule C Categories Seed Data

**What:** Pre-defined IRS Schedule C categories for new workspaces
**When:** Creating new workspace (TAGS-04, WKSP-08)
**Source:** [IRS Schedule C Instructions](https://www.irs.gov/instructions/i1040sc)

```typescript
// src/lib/data/schedulec-categories.ts

/**
 * IRS Schedule C expense categories (Part II, Lines 8-27)
 * Pre-seeded into new workspaces to provide standard tax-friendly categorization
 */
export const SCHEDULE_C_CATEGORIES = [
    // Line 8 - Cost of goods sold (typically tracked separately)
    'Cost of Goods Sold',

    // Line 9 - Car and truck expenses
    'Vehicle Expenses',

    // Line 10 - Commissions and fees
    'Commissions & Fees',

    // Line 11 - Contract labor
    'Contract Labor',

    // Line 12 - Depletion (rare for most businesses)
    // Omitted - too specialized

    // Line 13 - Depreciation
    'Depreciation',

    // Line 14 - Employee benefit programs
    'Employee Benefits',

    // Line 15 - Insurance (other than health)
    'Business Insurance',

    // Line 16a/16b - Interest (mortgage and other)
    'Interest Expense',

    // Line 17 - Legal and professional services
    'Legal & Professional',

    // Line 18 - Office expense
    'Office Expenses',

    // Line 19 - Pension and profit-sharing plans
    'Retirement Contributions',

    // Line 20a/20b - Rent or lease
    'Rent & Lease',

    // Line 21 - Repairs and maintenance
    'Repairs & Maintenance',

    // Line 22 - Supplies
    'Supplies',

    // Line 23 - Taxes and licenses
    'Taxes & Licenses',

    // Line 24a - Travel
    'Travel',

    // Line 24b - Meals (deductible portion)
    'Meals & Entertainment',

    // Line 25 - Utilities
    'Utilities',

    // Line 26 - Wages
    'Wages & Salaries',

    // Common additional categories (Line 27b - Other expenses)
    'Advertising & Marketing',
    'Bank & Merchant Fees',
    'Computer & Software',
    'Education & Training',
    'Postage & Shipping',
    'Subscriptions & Dues',
    'Telephone & Internet',

    // Income categories (not on Schedule C expenses, but useful)
    'Sales Revenue',
    'Service Income',
    'Other Income'
] as const;

export type ScheduleCCategory = typeof SCHEDULE_C_CATEGORIES[number];
```

```typescript
// src/lib/server/db/seed-tags.ts
import { tags } from './schema';
import { SCHEDULE_C_CATEGORIES } from '$lib/data/schedulec-categories';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

/**
 * Seed Schedule C categories into a new workspace database
 */
export function seedScheduleCTags(db: BetterSQLite3Database) {
    const existingTags = db.select().from(tags).all();

    // Only seed if no tags exist (new workspace)
    if (existingTags.length === 0) {
        for (const category of SCHEDULE_C_CATEGORIES) {
            db.insert(tags).values({ name: category }).run();
        }
    }
}
```

### Anti-Patterns to Avoid

- **Loading all transactions for payee history:** Use aggregate queries, not fetching all records.

- **Client-side tag creation without server validation:** Always create tags server-side with duplicate checking.

- **Hardcoding percentage validation in multiple places:** Share validation logic between client and server.

- **Using createEventDispatcher in Svelte 5:** Use callback props instead - it's the Svelte 5 pattern.

- **Deleting tags with onDelete: CASCADE on transactionTags:** Use RESTRICT to prevent accidental data loss; require explicit merge or unassignment.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fuzzy string matching | Levenshtein implementation | @nozbe/microfuzz | Handles edge cases, highlighting, 2KB |
| Locale-aware sorting | String.localeCompare | Intl.Collator | More performant for repeated sorts |
| Keyboard navigation | Manual index tracking | Standard pattern with state | Well-documented accessibility pattern |
| Tag deduplication | Manual string comparison | SQL UNIQUE constraint + eq() | Database enforces consistency |

**Key insight:** For autocomplete with short labels (payee names, tag names), a tiny fuzzy library like microfuzz outperforms full-text search libraries while being much smaller.

## Common Pitfalls

### Pitfall 1: Race Condition in Tag Creation

**What goes wrong:** User rapidly creates same tag twice, both succeed
**Why it happens:** Async operations without proper duplicate checking
**How to avoid:** Use database UNIQUE constraint + catch duplicate error
**Warning signs:** Duplicate tags appearing in list

### Pitfall 2: Orphaned Tag Allocations After Merge

**What goes wrong:** Transaction has two allocations pointing to same tag after merge
**Why it happens:** Source and target tag both used on same transaction
**How to avoid:** After merge, aggregate duplicate allocations:
```sql
-- After merge, combine duplicate percentages
UPDATE transaction_tags
SET percentage = (
    SELECT SUM(percentage) FROM transaction_tags t2
    WHERE t2.transaction_id = transaction_tags.transaction_id
    AND t2.tag_id = transaction_tags.tag_id
)
WHERE ...
```
**Warning signs:** Transaction with 150% total allocation

### Pitfall 3: Stale Payee History After Transaction Edit

**What goes wrong:** Payee autocomplete suggests old amounts/tags after edits
**Why it happens:** Payee history cached from page load
**How to avoid:** Invalidate/refetch on form submission success, or accept slight staleness
**Warning signs:** Suggestions don't match recent transactions

### Pitfall 4: Case-Sensitive Tag Duplicates

**What goes wrong:** "Office Supplies" and "office supplies" both exist
**Why it happens:** SQLite default collation is case-sensitive
**How to avoid:** Normalize case on insert, or use COLLATE NOCASE:
```typescript
// Option 1: Normalize on insert
const normalizedName = name.trim();
// Store as-is but check case-insensitively

// Option 2: Add COLLATE NOCASE to column
name: text('name').notNull().unique(), // Add check constraint in migration
```
**Warning signs:** Tags appearing twice with different casing

### Pitfall 5: Dropdown Keyboard Navigation Without Focus Management

**What goes wrong:** Arrow keys scroll page instead of dropdown
**Why it happens:** Missing focus trap and event prevention
**How to avoid:** Call `e.preventDefault()` on arrow keys, maintain highlight index
**Warning signs:** Inconsistent keyboard navigation behavior

## Code Examples

Verified patterns from official sources:

### Creating Tag Inline with Optimistic Update

```svelte
<!-- In parent component (transaction form) -->
<script lang="ts">
    import TagSelector from '$lib/components/TagSelector.svelte';
    import { enhance } from '$app/forms';

    let { data } = $props();
    let availableTags = $state(data.tags);
    let tagAllocations = $state([]);

    async function handleCreateTag(name: string) {
        // Call server action via fetch
        const formData = new FormData();
        formData.set('name', name);

        const response = await fetch('?/createTag', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.type === 'success' && result.data?.tag) {
            // Add to available tags
            availableTags = [...availableTags, result.data.tag];
            return result.data.tag;
        }

        return null;
    }
</script>

<TagSelector
    {availableTags}
    bind:allocations={tagAllocations}
    onCreateTag={handleCreateTag}
/>
```

### Tag Management Page with Merge Dialog

```svelte
<!-- src/routes/w/[workspace]/settings/tags/+page.svelte -->
<script lang="ts">
    import { enhance } from '$app/forms';

    let { data } = $props();
    let mergeSource = $state<number | null>(null);
    let mergeTarget = $state<number | null>(null);
</script>

<h2 class="text-xl font-semibold mb-4">Manage Tags</h2>

<div class="space-y-2">
    {#each data.tags as tag (tag.id)}
        <div class="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <span class="flex-1 font-medium">{tag.name}</span>
            <span class="text-sm text-gray-500">{tag.usageCount} transactions</span>

            <form method="POST" action="?/rename" use:enhance class="flex gap-2">
                <input type="hidden" name="id" value={tag.id} />
                <input type="text" name="name" value={tag.name} class="border rounded px-2 py-1" />
                <button type="submit" class="text-blue-600">Rename</button>
            </form>

            <button
                type="button"
                onclick={() => mergeSource = tag.id}
                class="text-orange-600"
            >
                Merge
            </button>

            {#if tag.usageCount === 0}
                <form method="POST" action="?/delete" use:enhance>
                    <input type="hidden" name="id" value={tag.id} />
                    <button type="submit" class="text-red-600">Delete</button>
                </form>
            {/if}
        </div>
    {/each}
</div>

<!-- Merge Dialog -->
{#if mergeSource !== null}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center">
        <div class="bg-white p-6 rounded-lg max-w-md">
            <h3 class="text-lg font-semibold mb-4">Merge Tag</h3>
            <p class="mb-4">
                Merge "{data.tags.find(t => t.id === mergeSource)?.name}" into:
            </p>

            <form method="POST" action="?/merge" use:enhance>
                <input type="hidden" name="sourceId" value={mergeSource} />
                <select name="targetId" bind:value={mergeTarget} class="w-full border rounded p-2 mb-4">
                    <option value="">Select target tag...</option>
                    {#each data.tags.filter(t => t.id !== mergeSource) as tag}
                        <option value={tag.id}>{tag.name}</option>
                    {/each}
                </select>

                <div class="flex gap-2 justify-end">
                    <button type="button" onclick={() => mergeSource = null} class="px-4 py-2">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!mergeTarget}
                        class="px-4 py-2 bg-orange-600 text-white rounded disabled:opacity-50"
                    >
                        Merge
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}
```

### Workspace Creation with Tag Seeding

```typescript
// In workspace creation logic (hooks.server.ts or similar)
import { seedScheduleCTags } from '$lib/server/db/seed-tags';

// After creating new workspace database...
export function initializeNewWorkspace(db: BetterSQLite3Database) {
    // Run migrations...

    // Seed Schedule C categories
    seedScheduleCTags(db);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| createEventDispatcher | Callback props | Svelte 5 (2024) | Simpler, type-safe communication |
| Full-text search libraries | Lightweight fuzzy (microfuzz) | 2023+ | Much smaller bundle for autocomplete |
| Manual keyboard handling | Standard a11y patterns | Always | Consistent, accessible behavior |
| jQuery autocomplete | Native + framework | 2020+ | No jQuery dependency needed |

**Deprecated/outdated:**
- `createEventDispatcher`: Use callback props in Svelte 5
- `Fuse.js` for small lists: Overkill, use microfuzz for autocomplete
- `on:event` directive for custom events: Use callback props

## Open Questions

Things that couldn't be fully resolved:

1. **Case Sensitivity for Tag Names**
   - What we know: SQLite is case-sensitive by default, want case-insensitive uniqueness
   - What's unclear: Best approach - normalize on insert vs COLLATE NOCASE
   - Recommendation: Normalize display but store original case; check uniqueness case-insensitively

2. **Payee History Update Frequency**
   - What we know: Loaded on page load, may become stale
   - What's unclear: How often users notice stale suggestions
   - Recommendation: Accept staleness for now; refetch on major actions if needed

3. **Lock Tags Mode Persistence**
   - What we know: TAGS-03 requires "lock tags" mode
   - What's unclear: Should be workspace-wide setting or per-session?
   - Recommendation: Add `tagsLocked` boolean to workspace_settings table

## Sources

### Primary (HIGH confidence)
- [Drizzle ORM Docs](https://orm.drizzle.team/docs) - Update, delete, aggregate patterns
- [Svelte 5 Docs](https://svelte.dev/docs/svelte) - $bindable, callback props, component patterns
- [SvelteKit Form Actions](https://svelte.dev/docs/kit/form-actions) - Progressive enhancement
- [IRS Schedule C Instructions](https://www.irs.gov/instructions/i1040sc) - Official expense categories

### Secondary (MEDIUM confidence)
- [microfuzz GitHub](https://github.com/Nozbe/microfuzz) - Fuzzy search API and usage
- [WAI-ARIA Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) - Accessibility standards

### Tertiary (LOW confidence)
- WebSearch results on tag merge patterns - Needs validation during implementation
- Community autocomplete patterns - Verify keyboard navigation works correctly

## Metadata

**Confidence breakdown:**
- Tag CRUD operations: HIGH - Well-documented Drizzle patterns
- Tag merge logic: MEDIUM - Logic is sound but needs testing for edge cases
- Fuzzy search: HIGH - microfuzz is well-documented and small
- Payee predictions: MEDIUM - Query patterns verified but performance needs testing
- Schedule C categories: HIGH - Official IRS source

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (30 days - stable patterns, IRS categories may update annually)
