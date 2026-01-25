# Phase 2: Core Transactions - Research

**Researched:** 2026-01-25
**Domain:** Transaction CRUD with tags, audit trail, and mobile-friendly input UX
**Confidence:** HIGH

## Summary

Phase 2 implements the core transaction system for TinyLedger: creating, editing, and voiding income/expense transactions with multi-tag allocation. The primary technical challenges are (1) database schema design for transactions with many-to-many tag relationships and percentage allocations, (2) audit trail tracking for edit history, (3) void-first deletion model with soft deletes, and (4) mobile-friendly input components for currency and dates.

The standard approach uses Drizzle ORM for schema definition with foreign keys and indexes, stores currency as integer cents to avoid floating-point errors, implements a transaction history table for audit trails, and uses native HTML5 inputs with progressive enhancement for mobile. Tag allocation uses a junction table with percentage column, validated on the server to ensure 100% allocation.

**Primary recommendation:** Store amounts as integer cents, use a separate `transaction_history` table for audit trail, implement void status as a column rather than separate table, and use native HTML5 date inputs with text-based currency formatting for mobile UX.

## Standard Stack

The established libraries/tools for this phase:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.45.1 | Type-safe ORM | Already in use, schema relations, SQLite support |
| better-sqlite3 | ^12.6.2 | SQLite driver | Already in use, synchronous for fast local ops |
| svelte | ^5.45.6 | UI framework | Already in use, $state/$derived for form state |
| @sveltejs/kit | ^2.49.1 | Full-stack framework | Form actions pattern established in Phase 1 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Intl.NumberFormat | (native) | Currency formatting | Display formatted currency in UI |
| crypto.randomUUID | (native) | ID generation | Transaction IDs for public references |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Integer cents | REAL/float | Float has precision errors for currency - use integers |
| History table | JSON column | JSON loses queryability, harder to audit - use table |
| Native date input | date-fns + picker | Native works on mobile, less bundle - use native |
| currency.js | Custom formatter | Simple needs don't require library - use Intl.NumberFormat |

**Installation:**
```bash
# No new dependencies required - using existing stack + native APIs
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── routes/
│   └── w/
│       └── [workspace]/
│           └── transactions/
│               ├── +page.svelte           # Transaction list (future phase)
│               ├── +page.server.ts         # List loader
│               ├── new/
│               │   ├── +page.svelte        # Create transaction form
│               │   └── +page.server.ts     # Create action
│               └── [id]/
│                   ├── +page.svelte        # View/edit transaction
│                   ├── +page.server.ts     # Edit/void/delete actions
│                   └── history/
│                       └── +page.svelte    # View edit history
├── lib/
│   ├── components/
│   │   ├── CurrencyInput.svelte        # Auto-formatting currency input
│   │   ├── DateInput.svelte            # Flexible date input + picker
│   │   ├── TagSelector.svelte          # Multi-tag with percentages
│   │   └── PaymentMethodSelect.svelte  # Cash/card/check selector
│   └── server/
│       └── db/
│           └── schema.ts               # Extended with transaction tables
```

### Pattern 1: Store Currency as Integer Cents

**What:** Store all monetary amounts as integers representing cents (smallest currency unit)
**When:** Any money-related column in the database
**Why:** Avoids floating-point precision errors that plague financial calculations
**Source:** [Best practices for storing currency](https://cardinalby.github.io/blog/post/best-practices/storing-currency-values-data-types/)

```typescript
// src/lib/server/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const transactions = sqliteTable('transactions', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    publicId: text('public_id').notNull().unique(), // UUID for URLs
    type: text('type', { enum: ['income', 'expense'] }).notNull(),
    amountCents: integer('amount_cents').notNull(), // Store as cents!
    date: text('date').notNull(), // ISO date string YYYY-MM-DD
    payee: text('payee').notNull(),
    description: text('description'),
    paymentMethod: text('payment_method', {
        enum: ['cash', 'card', 'check']
    }).notNull(),
    checkNumber: text('check_number'), // Only for payment_method = 'check'

    // Void/delete tracking (INTG-01, INTG-02)
    voidedAt: text('voided_at'),       // NULL = active, set = voided
    deletedAt: text('deleted_at'),     // Soft delete timestamp

    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
    // Indexes for common queries
    index('transactions_date_idx').on(table.date),
    index('transactions_payee_idx').on(table.payee),
    index('transactions_type_idx').on(table.type),
]);

// Utility functions for cents <-> dollars conversion
export function dollarsToCents(dollars: number): number {
    return Math.round(dollars * 100);
}

export function centsToDollars(cents: number): number {
    return cents / 100;
}
```

### Pattern 2: Many-to-Many Tags with Allocation Percentages

**What:** Junction table for transaction-tag relationship with percentage allocation
**When:** Assigning tags to transactions (TXNS-04)
**Source:** [Drizzle ORM many-to-many relations](https://orm.drizzle.team/docs/relations)

```typescript
// src/lib/server/db/schema.ts
export const tags = sqliteTable('tags', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique(),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Junction table with percentage allocation
export const transactionTags = sqliteTable('transaction_tags', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    transactionId: integer('transaction_id')
        .notNull()
        .references(() => transactions.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
        .notNull()
        .references(() => tags.id, { onDelete: 'restrict' }),
    percentage: integer('percentage').notNull(), // 1-100, must sum to 100
}, (table) => [
    index('transaction_tags_transaction_idx').on(table.transactionId),
    index('transaction_tags_tag_idx').on(table.tagId),
]);

// Drizzle relations for query builder
export const transactionsRelations = relations(transactions, ({ many }) => ({
    tagAllocations: many(transactionTags),
}));

export const transactionTagsRelations = relations(transactionTags, ({ one }) => ({
    transaction: one(transactions, {
        fields: [transactionTags.transactionId],
        references: [transactions.id],
    }),
    tag: one(tags, {
        fields: [transactionTags.tagId],
        references: [tags.id],
    }),
}));
```

### Pattern 3: Audit Trail with History Table

**What:** Separate table tracking all changes to transactions for audit purposes
**When:** Any update to a transaction (TXNS-08, INTG-03)
**Source:** [Database Design for Audit Logging](https://vertabelo.com/blog/database-design-for-audit-logging/)

```typescript
// src/lib/server/db/schema.ts
export const transactionHistory = sqliteTable('transaction_history', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    transactionId: integer('transaction_id')
        .notNull()
        .references(() => transactions.id, { onDelete: 'cascade' }),
    action: text('action', {
        enum: ['created', 'updated', 'voided', 'unvoided', 'deleted']
    }).notNull(),

    // Snapshot of transaction state before change (for updates)
    // Stored as JSON for flexibility
    previousState: text('previous_state', { mode: 'json' }),

    // What changed (for updates)
    changedFields: text('changed_fields', { mode: 'json' }),

    timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Helper to create history entry
export function createHistoryEntry(
    db: DB,
    transactionId: number,
    action: 'created' | 'updated' | 'voided' | 'unvoided' | 'deleted',
    previousState?: object,
    changedFields?: string[]
) {
    db.insert(transactionHistory).values({
        transactionId,
        action,
        previousState: previousState ? JSON.stringify(previousState) : null,
        changedFields: changedFields ? JSON.stringify(changedFields) : null,
    }).run();
}
```

### Pattern 4: Currency Input Component

**What:** Text input that auto-formats currency with dollar sign and decimals
**When:** Amount entry for transactions (INUX-01)
**Source:** [Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)

```svelte
<!-- src/lib/components/CurrencyInput.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';

    let {
        value = $bindable(0),    // Value in cents
        name = 'amount',
        id = 'amount',
        required = false,
        class: className = '',
    }: {
        value?: number;
        name?: string;
        id?: string;
        required?: boolean;
        class?: string;
    } = $props();

    // Display value (formatted string)
    let displayValue = $state('');

    // Format cents to display string
    function formatForDisplay(cents: number): string {
        const dollars = cents / 100;
        return dollars.toFixed(2);
    }

    // Parse display string to cents
    function parseToCents(input: string): number {
        // Remove all non-numeric except decimal
        const cleaned = input.replace(/[^\d.]/g, '');
        const dollars = parseFloat(cleaned) || 0;
        return Math.round(dollars * 100);
    }

    // Initialize display value
    onMount(() => {
        displayValue = formatForDisplay(value);
    });

    // Sync when external value changes
    $effect(() => {
        displayValue = formatForDisplay(value);
    });

    function handleInput(event: Event) {
        const input = event.target as HTMLInputElement;
        displayValue = input.value;
    }

    function handleBlur() {
        // Parse and reformat on blur
        value = parseToCents(displayValue);
        displayValue = formatForDisplay(value);
    }

    function handleFocus(event: Event) {
        const input = event.target as HTMLInputElement;
        // Select all on focus for easy replacement
        input.select();
    }
</script>

<div class="relative">
    <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
    <input
        type="text"
        inputmode="decimal"
        {id}
        {name}
        {required}
        value={displayValue}
        oninput={handleInput}
        onblur={handleBlur}
        onfocus={handleFocus}
        class="pl-7 {className}"
        placeholder="0.00"
    />
    <!-- Hidden input for form submission with cents value -->
    <input type="hidden" name="{name}_cents" value={value} />
</div>
```

### Pattern 5: Flexible Date Input

**What:** Date input that accepts multiple formats and includes native picker
**When:** Transaction date entry (INUX-02, INUX-03, INUX-05)
**Source:** [MDN input type=date](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/date)

```svelte
<!-- src/lib/components/DateInput.svelte -->
<script lang="ts">
    let {
        value = $bindable(''),  // ISO date string YYYY-MM-DD
        name = 'date',
        id = 'date',
        required = false,
        class: className = '',
    }: {
        value?: string;
        name?: string;
        id?: string;
        required?: boolean;
        class?: string;
    } = $props();

    // Warning for dates > 1 year in future
    let showFutureWarning = $derived(() => {
        if (!value) return false;
        const inputDate = new Date(value);
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        return inputDate > oneYearFromNow;
    });

    // Parse flexible date formats
    function parseFlexibleDate(input: string): string | null {
        // Already ISO format
        if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
            return input;
        }

        // Try MM/DD/YYYY or M/D/YYYY
        const slashMatch = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (slashMatch) {
            const [, month, day, year] = slashMatch;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        // Try MMDDYYYY (no slashes)
        const noSlashMatch = input.match(/^(\d{2})(\d{2})(\d{4})$/);
        if (noSlashMatch) {
            const [, month, day, year] = noSlashMatch;
            return `${year}-${month}-${day}`;
        }

        return null;
    }

    function handleInput(event: Event) {
        const input = event.target as HTMLInputElement;
        value = input.value;
    }

    function handleBlur(event: Event) {
        const input = event.target as HTMLInputElement;
        const parsed = parseFlexibleDate(input.value);
        if (parsed) {
            value = parsed;
            input.value = parsed;
        }
    }
</script>

<div>
    <input
        type="date"
        {id}
        {name}
        {required}
        {value}
        oninput={handleInput}
        onblur={handleBlur}
        class={className}
    />
    {#if showFutureWarning}
        <p class="mt-1 text-sm text-amber-600">
            Warning: This date is more than 1 year in the future
        </p>
    {/if}
</div>
```

### Pattern 6: Tag Selector with Percentage Allocation

**What:** Dynamic form for selecting multiple tags with percentage allocation
**When:** Assigning tags during transaction creation/edit (TXNS-04, INUX-04)
**Source:** [Svelte 5 $state with arrays](https://svelte.dev/docs/svelte/%24state)

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
    }: {
        availableTags: Tag[];
        allocations?: TagAllocation[];
    } = $props();

    // Computed validation
    let totalPercentage = $derived(
        allocations.reduce((sum, a) => sum + a.percentage, 0)
    );
    let isValid = $derived(totalPercentage === 100);
    let remainingPercentage = $derived(100 - totalPercentage);

    function addTag() {
        // Default to remaining percentage or 0
        const defaultPercentage = remainingPercentage > 0 ? remainingPercentage : 0;
        allocations = [...allocations, {
            tagId: availableTags[0]?.id ?? 0,
            percentage: defaultPercentage
        }];
    }

    function removeTag(index: number) {
        allocations = allocations.filter((_, i) => i !== index);
    }

    function updateTag(index: number, tagId: number) {
        allocations[index].tagId = tagId;
    }

    function updatePercentage(index: number, percentage: number) {
        allocations[index].percentage = Math.max(0, Math.min(100, percentage));
    }

    // Auto-distribute remaining to last tag
    function distributeRemaining() {
        if (allocations.length === 0) return;
        const lastIdx = allocations.length - 1;
        allocations[lastIdx].percentage += remainingPercentage;
    }
</script>

<div class="space-y-3">
    {#each allocations as allocation, i (i)}
        <div class="flex items-center gap-2">
            <select
                name="tag_{i}"
                value={allocation.tagId}
                onchange={(e) => updateTag(i, parseInt(e.currentTarget.value))}
                class="flex-1 rounded-lg border px-3 py-2"
            >
                {#each availableTags as tag}
                    <option value={tag.id}>{tag.name}</option>
                {/each}
            </select>

            <div class="flex items-center gap-1">
                <input
                    type="number"
                    name="percentage_{i}"
                    value={allocation.percentage}
                    min="0"
                    max="100"
                    oninput={(e) => updatePercentage(i, parseInt(e.currentTarget.value) || 0)}
                    class="w-20 rounded-lg border px-3 py-2 text-center"
                />
                <span class="text-gray-500">%</span>
            </div>

            <button
                type="button"
                onclick={() => removeTag(i)}
                class="rounded p-1 text-red-600 hover:bg-red-50"
                aria-label="Remove tag"
            >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    {/each}

    <div class="flex items-center justify-between">
        <button
            type="button"
            onclick={addTag}
            class="text-sm text-blue-600 hover:text-blue-800"
        >
            + Add Tag
        </button>

        {#if allocations.length > 0}
            <div class="text-sm" class:text-green-600={isValid} class:text-red-600={!isValid}>
                Total: {totalPercentage}%
                {#if !isValid && remainingPercentage > 0}
                    <button
                        type="button"
                        onclick={distributeRemaining}
                        class="ml-2 text-blue-600 hover:underline"
                    >
                        Add {remainingPercentage}% to last
                    </button>
                {/if}
            </div>
        {/if}
    </div>

    {#if allocations.length > 0 && !isValid}
        <p class="text-sm text-red-600">
            Tag percentages must sum to exactly 100%
        </p>
    {/if}
</div>
```

### Pattern 7: Void-First Deletion with Server Actions

**What:** Form actions implementing void-then-delete workflow
**When:** Void/delete operations (INTG-01, TXNS-06, TXNS-07)
**Source:** [SvelteKit form actions](https://svelte.dev/docs/kit/form-actions)

```typescript
// src/routes/w/[workspace]/transactions/[id]/+page.server.ts
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { transactions, transactionHistory } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const actions: Actions = {
    void: async ({ params, locals }) => {
        const db = locals.db!;
        const txn = db.select().from(transactions)
            .where(eq(transactions.publicId, params.id))
            .get();

        if (!txn) {
            return fail(404, { error: 'Transaction not found' });
        }

        if (txn.voidedAt) {
            return fail(400, { error: 'Transaction already voided' });
        }

        // Record history before voiding
        db.insert(transactionHistory).values({
            transactionId: txn.id,
            action: 'voided',
            previousState: JSON.stringify(txn),
        }).run();

        // Void the transaction
        db.update(transactions)
            .set({
                voidedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            })
            .where(eq(transactions.id, txn.id))
            .run();

        return { success: true, action: 'voided' };
    },

    delete: async ({ params, locals }) => {
        const db = locals.db!;
        const txn = db.select().from(transactions)
            .where(eq(transactions.publicId, params.id))
            .get();

        if (!txn) {
            return fail(404, { error: 'Transaction not found' });
        }

        // Can only delete voided transactions (INTG-01)
        if (!txn.voidedAt) {
            return fail(400, {
                error: 'Cannot delete active transaction. Void it first.'
            });
        }

        // Record history before soft delete
        db.insert(transactionHistory).values({
            transactionId: txn.id,
            action: 'deleted',
            previousState: JSON.stringify(txn),
        }).run();

        // Soft delete (INTG-02)
        db.update(transactions)
            .set({
                deletedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            })
            .where(eq(transactions.id, txn.id))
            .run();

        throw redirect(303, `/w/${params.workspace}/transactions`);
    },

    unvoid: async ({ params, locals }) => {
        const db = locals.db!;
        const txn = db.select().from(transactions)
            .where(eq(transactions.publicId, params.id))
            .get();

        if (!txn || !txn.voidedAt) {
            return fail(400, { error: 'Transaction is not voided' });
        }

        // Record history
        db.insert(transactionHistory).values({
            transactionId: txn.id,
            action: 'unvoided',
            previousState: JSON.stringify(txn),
        }).run();

        // Restore transaction
        db.update(transactions)
            .set({
                voidedAt: null,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(transactions.id, txn.id))
            .run();

        return { success: true, action: 'unvoided' };
    },
};
```

### Anti-Patterns to Avoid

- **Storing currency as REAL/float:** Floating-point math causes precision errors. Always use integer cents.

- **Inline CSS for validation states:** Use Tailwind's conditional classes with `class:text-red-600={!isValid}` pattern.

- **Hardcoding enum values:** Define enums in schema and reuse in both TypeScript and UI for single source of truth.

- **Deleting without voiding:** Enforce void-first deletion in the action - don't rely on UI to prevent direct delete.

- **Computed validation in onsubmit:** Use `$derived` for real-time validation feedback, not just on submit.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Currency formatting | Manual string parsing | Intl.NumberFormat | Handles locales, edge cases correctly |
| Date parsing | Regex for every format | Native Date + simple regex | Browser handles validation, we just normalize |
| UUID generation | Math.random() strings | crypto.randomUUID() | Cryptographically secure, proper format |
| Form validation | Custom validation framework | Native HTML5 + $derived | Browser validation + reactive computed |
| Audit logging | Custom event system | History table pattern | Simple, queryable, proven pattern |

**Key insight:** Financial applications look simple but have many edge cases. Store currency as cents, track all changes, and never trust client-side validation alone.

## Common Pitfalls

### Pitfall 1: Currency Rounding Errors

**What goes wrong:** $1.10 + $2.20 = $3.299999999999 due to floating-point
**Why it happens:** IEEE 754 floating-point cannot represent many decimals exactly
**How to avoid:** Store as integer cents, only convert to dollars for display
**Warning signs:** Totals that are off by fractions of a cent, failing equality checks

### Pitfall 2: Tag Allocation Validation Bypass

**What goes wrong:** User submits form with percentages not summing to 100
**Why it happens:** Client-side validation can be bypassed or JS disabled
**How to avoid:** Always validate tag allocation sum on server, return fail(400) if invalid
**Warning signs:** Transactions with 0% or 200% total allocation in database

### Pitfall 3: Missing Audit Trail on Create

**What goes wrong:** Only tracking updates/deletes, not initial creation
**Why it happens:** Developers forget that "created" is also a history event
**How to avoid:** Insert history record with action='created' in create action
**Warning signs:** History missing first entry, can't reconstruct full timeline

### Pitfall 4: Void State Inconsistency

**What goes wrong:** Voided transactions still appear in totals/reports
**Why it happens:** Queries don't filter by voidedAt
**How to avoid:** Add `where(isNull(transactions.voidedAt))` to all active transaction queries
**Warning signs:** Financial totals that include voided transactions

### Pitfall 5: Date Timezone Issues

**What goes wrong:** Transaction dated "2026-01-25" appears as "2026-01-24" in some timezones
**Why it happens:** Storing dates as ISO datetime with timezone, then displaying in local time
**How to avoid:** Store dates as plain "YYYY-MM-DD" strings (text column), never as timestamps
**Warning signs:** Dates off by one day for some users

### Pitfall 6: Lost Edit History on Failed Submit

**What goes wrong:** User edits transaction, submit fails validation, changes lost
**Why it happens:** Form resets to server data on fail
**How to avoid:** Return submitted values in fail() response, repopulate form from `form` prop
**Warning signs:** Users complaining about losing their edits on validation errors

## Code Examples

Verified patterns from official sources:

### Creating a Transaction with Tags

```typescript
// src/routes/w/[workspace]/transactions/new/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { transactions, transactionTags, transactionHistory, tags } from '$lib/server/db/schema';
import type { Actions } from './$types';

export const actions: Actions = {
    default: async ({ request, locals, params }) => {
        const db = locals.db!;
        const formData = await request.formData();

        // Parse form data
        const type = formData.get('type') as 'income' | 'expense';
        const amountCents = parseInt(formData.get('amount_cents') as string);
        const date = formData.get('date') as string;
        const payee = formData.get('payee') as string;
        const description = formData.get('description') as string;
        const paymentMethod = formData.get('paymentMethod') as 'cash' | 'card' | 'check';
        const checkNumber = formData.get('checkNumber') as string | null;

        // Parse tag allocations
        const tagAllocations: { tagId: number; percentage: number }[] = [];
        let i = 0;
        while (formData.has(`tag_${i}`)) {
            tagAllocations.push({
                tagId: parseInt(formData.get(`tag_${i}`) as string),
                percentage: parseInt(formData.get(`percentage_${i}`) as string),
            });
            i++;
        }

        // Validation
        if (!type || !['income', 'expense'].includes(type)) {
            return fail(400, { error: 'Invalid transaction type' });
        }

        if (!amountCents || amountCents <= 0) {
            return fail(400, { error: 'Amount must be greater than 0' });
        }

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return fail(400, { error: 'Invalid date format' });
        }

        if (!payee?.trim()) {
            return fail(400, { error: 'Payee is required' });
        }

        // Validate tag allocations sum to 100%
        if (tagAllocations.length > 0) {
            const total = tagAllocations.reduce((sum, t) => sum + t.percentage, 0);
            if (total !== 100) {
                return fail(400, {
                    error: `Tag allocations must sum to 100% (currently ${total}%)`
                });
            }
        }

        // Create transaction with UUID
        const publicId = crypto.randomUUID();

        const result = db.insert(transactions).values({
            publicId,
            type,
            amountCents,
            date,
            payee: payee.trim(),
            description: description?.trim() || null,
            paymentMethod,
            checkNumber: paymentMethod === 'check' ? checkNumber : null,
        }).returning().get();

        // Insert tag allocations
        for (const allocation of tagAllocations) {
            db.insert(transactionTags).values({
                transactionId: result.id,
                tagId: allocation.tagId,
                percentage: allocation.percentage,
            }).run();
        }

        // Record creation in history
        db.insert(transactionHistory).values({
            transactionId: result.id,
            action: 'created',
        }).run();

        throw redirect(303, `/w/${params.workspace}/transactions/${publicId}`);
    },
};
```

### Editing a Transaction with History

```typescript
// Edit action with full history tracking
edit: async ({ request, params, locals }) => {
    const db = locals.db!;
    const formData = await request.formData();

    // Get existing transaction
    const existing = db.select().from(transactions)
        .where(eq(transactions.publicId, params.id))
        .get();

    if (!existing) {
        return fail(404, { error: 'Transaction not found' });
    }

    if (existing.voidedAt) {
        return fail(400, { error: 'Cannot edit voided transaction' });
    }

    // Parse new values
    const newValues = {
        amountCents: parseInt(formData.get('amount_cents') as string),
        date: formData.get('date') as string,
        payee: (formData.get('payee') as string).trim(),
        description: (formData.get('description') as string)?.trim() || null,
        paymentMethod: formData.get('paymentMethod') as 'cash' | 'card' | 'check',
        checkNumber: formData.get('checkNumber') as string | null,
        updatedAt: new Date().toISOString(),
    };

    // Determine what changed
    const changedFields: string[] = [];
    if (existing.amountCents !== newValues.amountCents) changedFields.push('amount');
    if (existing.date !== newValues.date) changedFields.push('date');
    if (existing.payee !== newValues.payee) changedFields.push('payee');
    if (existing.description !== newValues.description) changedFields.push('description');
    if (existing.paymentMethod !== newValues.paymentMethod) changedFields.push('paymentMethod');

    // Only save history if something changed
    if (changedFields.length > 0) {
        db.insert(transactionHistory).values({
            transactionId: existing.id,
            action: 'updated',
            previousState: JSON.stringify(existing),
            changedFields: JSON.stringify(changedFields),
        }).run();

        db.update(transactions)
            .set(newValues)
            .where(eq(transactions.id, existing.id))
            .run();
    }

    return { success: true };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Float for currency | Integer cents | Always recommended | No precision errors |
| Trigger-based audit | Application-level history table | 2020+ | More control, portable |
| jQuery date pickers | Native HTML5 date input | 2022+ | Mobile-friendly, no dependency |
| Form libraries | Svelte 5 $state + HTML5 validation | 2024 | Simpler, less overhead |

**Deprecated/outdated:**
- `moment.js`: Use native Date or `day.js` if needed - moment is large and unmaintained
- `accounting.js`: Use `Intl.NumberFormat` - native and well-supported
- Custom mask libraries: Use `inputmode="decimal"` for mobile numeric keyboards

## Open Questions

Things that couldn't be fully resolved:

1. **Tag Creation UI in Transaction Form**
   - What we know: Tags can be created on-the-fly (TAGS-01 in Phase 3)
   - What's unclear: Should Phase 2 allow inline tag creation or only selection?
   - Recommendation: Phase 2 implements selection-only; inline creation deferred to Phase 3

2. **Transaction List Pagination**
   - What we know: Timeline view is Phase 5
   - What's unclear: Does Phase 2 need a basic transaction list?
   - Recommendation: Phase 2 creates transactions, minimal list for testing; full timeline in Phase 5

3. **Concurrent Edit Protection**
   - What we know: SQLite with WAL handles concurrent reads well
   - What's unclear: What if two tabs edit same transaction?
   - Recommendation: Use optimistic locking with `updatedAt` comparison for now; proper locking if needed later

## Sources

### Primary (HIGH confidence)
- [Drizzle ORM SQLite docs](https://orm.drizzle.team/docs/column-types/sqlite) - Column types, relations, indexes
- [SvelteKit form actions](https://svelte.dev/docs/kit/form-actions) - use:enhance, validation, fail()
- [Svelte 5 $state and $derived](https://svelte.dev/docs/svelte/%24state) - Reactive primitives
- [MDN Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) - Currency formatting
- [MDN input type=date](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/date) - Native date input

### Secondary (MEDIUM confidence)
- [Best practices for storing currency](https://cardinalby.github.io/blog/post/best-practices/storing-currency-values-data-types/) - Integer cents pattern
- [Database Design for Audit Logging](https://vertabelo.com/blog/database-design-for-audit-logging/) - History table pattern
- [currency.js documentation](https://currency.js.org/) - Reference for currency handling (not using, but informed patterns)

### Tertiary (LOW confidence)
- Form validation patterns from community discussions - Needs testing during implementation
- Mobile date picker UX patterns - Verify on actual devices

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing dependencies, well-documented
- Database schema: HIGH - Verified Drizzle patterns, tested SQLite constraints
- Input components: MEDIUM - Native HTML5 verified, custom formatting needs testing
- Audit trail: MEDIUM - Pattern is standard, specific implementation needs validation

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (30 days - stable stack, established patterns)
