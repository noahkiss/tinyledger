# Domain Pitfalls: Bookkeeping Apps for Sole Proprietors

**Domain:** Self-hosted bookkeeping/ledger app for sole proprietors
**Researched:** 2025-01-24
**Confidence:** MEDIUM-HIGH (verified across multiple authoritative sources)

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or legal/tax compliance issues.

---

### Pitfall 1: Hard Deleting Financial Transactions

**What goes wrong:** Developers implement standard CRUD delete operations, permanently removing transactions from the database.

**Why it happens:** Standard web app patterns default to hard deletion. Developers don't realize financial records have different retention requirements.

**Consequences:**
- IRS audit exposure: The IRS requires business records for 3-7 years depending on situation
- Broken audit trails: Cannot prove what was recorded when
- Accounting discrepancies: Historical reports no longer match filed tax returns
- CPA/accountant frustration when reviewing books

**Prevention:**
```
1. Implement void-first deletion model (TinyLedger already plans this)
2. Voided transactions remain visible with strikethrough, excluded from totals
3. "Delete" only available on already-voided items
4. Even "deleted" items soft-delete with `deleted_at` timestamp
5. Add edit history/audit trail for all transactions
```

**Detection:** Review your DELETE statements. If any touch transaction tables without a `deleted_at` update, you have this problem.

**Phase:** Core transaction schema design (Phase 1/Foundation)

**Source:** [Marty Friedel - Deleting Data: Soft, Hard or Audit](https://www.martyfriedel.com/blog/deleting-data-soft-hard-or-audit), [QuickBooks - Void vs Delete](https://www.fondo.com/blog/delete-in-quickbooks-vs-void)

---

### Pitfall 2: Double-Counting in Tag-Based Reports

**What goes wrong:** When a transaction has multiple tags, it appears in full in each tag's report, inflating totals.

**Why it happens:** Simple tag implementations store tags as a many-to-many relationship without allocation percentages. Reporting sums all transactions per tag.

**Consequences:**
- Category reports show inflated numbers (e.g., $500 expense appears as $500 in "Office" and $500 in "Marketing")
- Tax category totals don't add up to net income
- CPA gets confused reports
- User loses trust in the system

**Prevention:**
```
1. Tag allocation model: Each tag assignment includes percentage or fixed amount
2. Example: $500 expense with tags ["Office: 60%", "Marketing: 40%"]
3. Reports show $300 Office, $200 Marketing
4. UI enforces allocations sum to 100%
5. Default behavior: single tag = 100%, multiple tags = prompt for allocation
```

**Detection:** Create a transaction with 2+ tags. Run reports for each tag. If the same amount appears in both, you have this problem.

**Phase:** Tag system design (Phase 1/Foundation)

**Source:** [QuickBooks Community - Tag Split Limitation](https://quickbooks.intuit.com/learn-support/en-us/install/can-i-tag-a-split-transaction-with-two-tags-and-have-each-tag/00/558647), [QuickBooks Double-Entry Guide](https://quickbooks.intuit.com/r/bookkeeping/complete-guide-to-double-entry-bookkeeping/)

---

### Pitfall 3: SQLite BUSY Errors Under Concurrent Access

**What goes wrong:** App returns "database is locked" or SQLITE_BUSY errors when multiple requests hit the database simultaneously.

**Why it happens:**
- Developers don't enable WAL mode
- Transactions start as reads then upgrade to writes (classic SQLite mistake)
- No busy_timeout configured
- Long-running transactions hold locks

**Consequences:**
- Random 500 errors during normal use
- Lost transactions when users retry
- Corrupted data if app doesn't handle errors gracefully
- Poor user experience ("the app is broken")

**Prevention:**
```javascript
// 1. Enable WAL mode immediately after opening DB
db.pragma('journal_mode = WAL');

// 2. Set busy timeout (60s for safety)
db.pragma('busy_timeout = 60000');

// 3. Use BEGIN IMMEDIATE for any transaction that will write
db.exec('BEGIN IMMEDIATE');
// ... do work ...
db.exec('COMMIT');

// 4. Keep transactions short - do all prep work before BEGIN
// 5. Handle checkpoint starvation for high-read scenarios
setInterval(() => {
  const walSize = fs.statSync('db.sqlite-wal')?.size || 0;
  if (walSize > 50 * 1024 * 1024) { // 50MB threshold
    db.pragma('wal_checkpoint(RESTART)');
  }
}, 30000);
```

**Detection:** Load test with 10+ concurrent requests. If you see SQLITE_BUSY errors, you have this problem.

**Phase:** Database connection setup (Phase 1/Foundation)

**Source:** [SQLite WAL Mode](https://sqlite.org/wal.html), [Bert Hubert - SQLITE_BUSY Despite Timeout](https://berthub.eu/articles/posts/a-brief-post-on-sqlite3-database-locked-despite-timeout/), [better-sqlite3 Performance Docs](https://github.com/wiselibs/better-sqlite3/blob/master/docs/performance.md)

---

### Pitfall 4: Pennsylvania Local Tax Complexity Underestimation

**What goes wrong:** Developer implements flat PA state tax (3.07%) and ignores local Earned Income Tax (EIT), resulting in incorrect tax estimates.

**Why it happens:** Most states have simple tax structures. PA has 3,000+ local taxing jurisdictions with rates from 0.5% to 3.75%.

**Consequences:**
- Tax estimates off by 1-4% of net income
- User sets aside wrong amount, owes at tax time
- App appears broken/inaccurate
- Users lose trust and abandon app

**Prevention:**
```
1. Require local EIT rate as workspace setting (not optional)
2. Display clear warning that rate varies by municipality
3. Link to official PA DCED lookup tool
4. Calculate: Federal + PA State (3.07%) + Local EIT + SE Tax (15.3% of 92.35%)
5. Show breakdown in tax estimates so user can verify
6. Consider LST ($52/year max) for completeness
```

**Detection:** Compare your tax estimate to a manual calculation for someone in Philadelphia (3.75% local) vs rural PA (0.5% local). If estimates don't account for this variance, you have this problem.

**Phase:** Tax calculation feature (Phase 2/Tax Features)

**Source:** [PA DCED Local Income Tax Info](https://dced.pa.gov/local-government/local-income-tax-information/), [Symmetry - PA State and Local Taxes](https://www.symmetry.com/payroll-tax-insights/the-breakdown-of-pennsylvania-state-and-local-taxes)

---

### Pitfall 5: Self-Employment Tax Calculation Errors

**What goes wrong:** App calculates SE tax as 15.3% of net income instead of 15.3% of 92.35% of net income.

**Why it happens:** SE tax has a non-obvious calculation: you pay on 92.35% of net (the "employer half" is deductible).

**Consequences:**
- Overestimates tax liability by ~7.65%
- User saves too much (annoying) or reports wrong estimates to CPA
- Incorrect quarterly estimate payments

**Prevention:**
```javascript
// Correct SE tax calculation
const netIncome = income - expenses;
const seBaseAmount = netIncome * 0.9235; // Only 92.35% is subject to SE tax
const seTax = seBaseAmount * 0.153; // 15.3% (12.4% Social Security + 2.9% Medicare)

// Also note: SE tax is partially deductible from income tax
const seDeduction = seTax / 2; // Can deduct half of SE tax from AGI
```

**Detection:** Calculate SE tax on $100,000 net income. Correct answer: $14,130. If you get $15,300, you have this problem.

**Phase:** Tax calculation feature (Phase 2/Tax Features)

**Source:** [IRS Self-Employed Individuals Tax Center](https://www.irs.gov/businesses/small-businesses-self-employed/self-employed-individuals-tax-center), [TurboTax Quarterly Tax Guide](https://turbotax.intuit.com/tax-tips/self-employment-taxes/a-guide-to-paying-quarterly-taxes/L6p8C53xQ)

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or degraded user experience.

---

### Pitfall 6: SvelteKit SSR/Client Hydration Mismatches

**What goes wrong:** App throws hydration errors, components render differently on server vs client, or content flickers on load.

**Why it happens:**
- Using browser-only APIs (window, localStorage) during SSR
- Date/time formatting differs between server and client
- Random values or timestamps in render
- Safari auto-linking phone numbers (changes DOM structure)

**Consequences:**
- Console errors on every page load
- Flash of incorrect content
- Broken styling or functionality
- SEO penalties from inconsistent content

**Prevention:**
```svelte
<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  let lastWorkspace = null;

  // WRONG: localStorage accessed during SSR
  // let lastWorkspace = localStorage.getItem('lastWorkspace');

  // RIGHT: Defer browser-only code to onMount
  onMount(() => {
    lastWorkspace = localStorage.getItem('lastWorkspace');
  });

  // RIGHT: Guard browser APIs
  $: if (browser) {
    localStorage.setItem('lastWorkspace', currentWorkspace);
  }
</script>

<!-- Prevent Safari phone number auto-linking -->
<meta name="format-detection" content="telephone=no">
```

**Detection:** Run app in dev mode and watch console for hydration warnings. Test in Safari mobile.

**Phase:** All phases with UI work

**Source:** [Svelte Runtime Warnings](https://svelte.dev/docs/svelte/runtime-warnings), [SvelteKit Hydration Issues](https://github.com/sveltejs/svelte/issues/17357)

---

### Pitfall 7: File Upload Form Action Routing Confusion

**What goes wrong:** Form submissions with file uploads fail silently or route to wrong endpoint.

**Why it happens:** SvelteKit routes fetch requests to +server.js by default when it exists alongside +page.server.js. File uploads need special handling.

**Consequences:**
- Receipt uploads fail mysteriously
- Data submitted to wrong endpoint
- Hours of debugging
- Poor user experience

**Prevention:**
```svelte
<!-- Option 1: Use native form submission (works with progressive enhancement) -->
<form method="POST" action="?/uploadReceipt" enctype="multipart/form-data">
  <input type="file" name="receipt" accept="image/*,.pdf" />
  <button type="submit">Upload</button>
</form>

<!-- Option 2: If using fetch, add the magic header -->
<script>
  async function handleUpload(event) {
    const formData = new FormData(event.target);
    const response = await fetch('?/uploadReceipt', {
      method: 'POST',
      body: formData,
      headers: {
        'x-sveltekit-action': 'true' // Routes to +page.server.js action
      }
    });
  }
</script>
```

**Detection:** Create a route with both +server.js and +page.server.js. Submit a form. If it hits the server endpoint instead of form action, you have this problem.

**Phase:** Receipt upload feature (Phase 2/Attachments)

**Source:** [SvelteKit Form Actions Docs](https://github.com/sveltejs/kit/blob/main/documentation/docs/20-core-concepts/30-form-actions.md)

---

### Pitfall 8: Orphaned Attachment Files

**What goes wrong:** Transaction is voided/deleted but attachment file remains on disk, or attachment is deleted but transaction still references it.

**Why it happens:**
- File operations and database operations not atomic
- No cleanup job for orphaned files
- Delete logic misses file cleanup step

**Consequences:**
- Disk usage grows unbounded
- Broken image links in UI
- Backup includes garbage files
- Storage costs increase

**Prevention:**
```
1. Store attachment metadata in DB (filename, path, size, hash, transaction_id)
2. On transaction void: keep attachment (it's evidence)
3. On transaction hard-delete: soft-delete attachment record, keep file
4. Periodic cleanup job: delete files where attachment record is soft-deleted AND older than retention period
5. On app startup: scan for orphaned files (files not in DB) and log warnings
6. Never delete files synchronously with transaction delete - use job queue
```

**Detection:** Delete several transactions with attachments. Check if files remain on disk with no DB reference.

**Phase:** Attachment system (Phase 2/Attachments)

**Source:** [Komprise - Orphaned Data Management](https://www.komprise.com/glossary_terms/orphaned-data/)

---

### Pitfall 9: SQLite Migration Rollback Failures

**What goes wrong:** Migration fails partway through, leaving database in inconsistent state. Rollback doesn't work because SQLite has limited transactional DDL support.

**Why it happens:**
- Complex migrations bundled together
- No backup before migration
- ALTER TABLE limitations in SQLite (can't drop columns before 3.35)
- No testing of rollback scripts

**Consequences:**
- Corrupted database
- App won't start
- Data loss
- Manual recovery needed

**Prevention:**
```
1. ALWAYS backup database before migration
   cp database.sqlite database.sqlite.backup-$(date +%Y%m%d%H%M%S)

2. One logical change per migration file

3. Use SQLite's user_version pragma for versioning
   PRAGMA user_version = 5;

4. Wrap migrations in transactions where possible
   BEGIN IMMEDIATE;
   -- migration SQL --
   PRAGMA user_version = 6;
   COMMIT;

5. For complex changes (table recreation), use temp table pattern:
   CREATE TABLE new_table (...);
   INSERT INTO new_table SELECT ... FROM old_table;
   DROP TABLE old_table;
   ALTER TABLE new_table RENAME TO old_table;

6. Test migrations on copy of production data before deploying

7. Keep rollback script for each migration (even if manual)
```

**Detection:** Intentionally fail a migration halfway through. Can you recover without restoring from backup?

**Phase:** Database layer setup (Phase 1/Foundation)

**Source:** [JetBrains - Database Migrations in the Real World](https://blog.jetbrains.com/idea/2025/02/database-migrations-in-the-real-world/), [SQLite Forum - Migration Strategies](https://www.sqliteforum.com/p/sqlite-versioning-and-migration-strategies)

---

### Pitfall 10: Tenant Data Isolation Leakage

**What goes wrong:** Request intended for Workspace A accidentally accesses Workspace B's data.

**Why it happens:**
- Tenant ID stored in global/shared state
- Async context not properly propagated
- Database connection caching issues
- URL parameters trusted without validation

**Consequences:**
- User sees another workspace's transactions (catastrophic for multi-tenant)
- Data written to wrong workspace
- Trust destroyed
- Potential legal liability

**Prevention:**
```
TinyLedger's separate-DB-per-tenant approach largely prevents this, but still:

1. Derive workspace from URL path, not query param or body
   /workspace/abc123/transactions (good)
   /transactions?workspace=abc123 (risky)

2. Validate workspace access on every request (even without auth)
   - Check workspace exists
   - Could add simple workspace-specific access code for extra safety

3. Never store active workspace in global state
   - Pass through request context only

4. File attachments: namespace by workspace ID in path
   /data/workspaces/{workspace_id}/attachments/
   Never allow .. traversal

5. Database connection: open per-request or validate path matches request
   const db = openDatabase(`/data/workspaces/${workspaceId}/db.sqlite`);
```

**Detection:** In one browser tab, load Workspace A. In another tab, load Workspace B. Make rapid requests to both. Verify data never crosses.

**Phase:** Multi-tenant architecture (Phase 1/Foundation)

**Source:** [Security Boulevard - Tenant Isolation](https://securityboulevard.com/2025/12/tenant-isolation-in-multi-tenant-systems-architecture-identity-and-security/), [InstaTunnel - Multi-Tenant Leakage](https://instatunnel.my/blog/multi-tenant-leakage-when-row-level-security-fails-in-saas)

---

## Minor Pitfalls

Mistakes that cause annoyance but are easily fixable.

---

### Pitfall 11: Currency Input Formatting Frustrations

**What goes wrong:** Users enter "100", expect $100.00, get $1.00. Or can't enter cents. Or formatting behaves inconsistently.

**Why it happens:** Currency input is surprisingly complex - decimal positions, locale formatting, keyboard behavior on mobile all vary.

**Prevention:**
```
1. Accept multiple formats: 100, 100.00, 100.0, $100
2. Strip non-numeric characters on blur, reformat
3. Store as integer cents internally (10000 = $100.00)
4. Display formatted on blur, raw on focus
5. On mobile: use inputmode="decimal" (not type="number")
6. Test with: 100, 100.00, 100.5, .50, $100, 1,000
```

**Phase:** Transaction entry UI (Phase 1/Core)

---

### Pitfall 12: Date Input Timezone Confusion

**What goes wrong:** User in EST enters Jan 15, transaction shows as Jan 14 or Jan 16.

**Why it happens:** JavaScript Date objects include time. Midnight in one timezone is different day in UTC.

**Prevention:**
```javascript
// Store dates as YYYY-MM-DD strings, not timestamps
// Parse and format in local timezone only

// WRONG
const date = new Date(inputValue); // Timezone chaos
db.insert({ date: date.toISOString() });

// RIGHT
const dateString = inputValue; // "2025-01-15"
db.insert({ date: dateString }); // Store as-is
```

**Phase:** Transaction entry UI (Phase 1/Core)

---

### Pitfall 13: Receipt OCR Over-Trust

**What goes wrong:** App attempts to auto-fill transaction from receipt OCR and gets amounts wrong, causing incorrect entries.

**Why it happens:** OCR accuracy varies widely. Thermal receipt fading, angles, poor lighting all reduce accuracy.

**Consequences:**
- User trusts auto-filled data, submits incorrect transaction
- Tax reports have errors
- Worse UX than no OCR at all

**Prevention:**
```
1. If implementing OCR, NEVER auto-submit
2. Show OCR results as suggestions with clear "verify" prompt
3. Highlight extracted fields in different color
4. Default to manual entry, OCR as "assist" feature
5. Consider: is OCR worth the complexity? Manual entry might be faster for 10-second goal.
```

**Phase:** If implementing OCR (consider out of scope for v1)

**Source:** [Unstract - Best OCR for Bookkeeping](https://unstract.com/blog/best-ocr-for-bookkeeping/)

---

### Pitfall 14: Feature Creep Destroying Simplicity

**What goes wrong:** App accumulates features until it's as complex as QuickBooks, defeating the core value proposition.

**Why it happens:**
- "Just one more feature" syndrome
- Trying to handle edge cases
- Copying competitors
- User requests for power features

**Consequences:**
- 10-second entry becomes 60-second entry
- New users overwhelmed
- Mobile UX degraded
- Maintenance burden explodes

**Prevention:**
```
Guard rails:
1. Every feature must pass: "Does this help 10-second entry?"
2. Maintain "Out of Scope" list and stick to it
3. "Power user" features go to settings, not main flow
4. Track time-to-entry metric - if it increases, investigate
5. When adding feature, consider removing one

Red flags:
- "Full accounting" features (invoicing, payroll, inventory)
- Complex reporting beyond tax summaries
- Integrations (bank sync, accounting software export)
- Multi-user collaboration
```

**Phase:** All phases - ongoing discipline

**Source:** [RunEleven - Bookkeeping Software](https://www.runeleven.com/blog/best-bookkeeping-software-for-small-businesses)

---

### Pitfall 15: Inadequate SQLite Backup Strategy

**What goes wrong:** Database corruption or disk failure loses all user data because backups weren't configured or don't work.

**Why it happens:**
- Assuming Docker volume persistence is enough
- Copying database file while in use (may be corrupted)
- Not testing backup restoration

**Prevention:**
```bash
# 1. Use SQLite's .backup command (safe for active DB)
sqlite3 database.sqlite ".backup '/backups/db-$(date +%Y%m%d).sqlite'"

# 2. Or use VACUUM INTO (creates consistent copy)
sqlite3 database.sqlite "VACUUM INTO '/backups/db-$(date +%Y%m%d).sqlite'"

# 3. Enable WAL mode (improves backup consistency)

# 4. Test restoration monthly:
cp /backups/latest.sqlite /tmp/test-restore.sqlite
sqlite3 /tmp/test-restore.sqlite "PRAGMA integrity_check;"

# 5. Backup attachments directory too
tar -czf /backups/attachments-$(date +%Y%m%d).tar.gz /data/attachments/

# 6. Store backups off-device (NAS, cloud, different disk)
```

**Phase:** Deployment/infrastructure (Phase 1/Foundation)

**Source:** [SQLite Backup API](https://www.sqlite.org/backup.html), [Oldmoe - Backup Strategies for SQLite](https://oldmoe.blog/2024/04/30/backup-strategies-for-sqlite-in-production/)

---

## UX-Specific Pitfalls

Mobile financial app UX mistakes to avoid.

---

### Pitfall 16: Cluttered Mobile Interface

**What goes wrong:** Desktop-designed interface is cramped on mobile, requiring zooming/scrolling for basic tasks.

**Prevention:**
- Large touch targets (minimum 44x44px)
- One primary action per screen
- Progressive disclosure - hide complexity until needed
- Bottom navigation for thumb reach
- Test on actual phone, not just browser dev tools

**Source:** [ProCreator - UX Mistakes in Mobile Banking](https://procreator.design/blog/ux-mistakes-avoid-mobile-banking-app-design/)

---

### Pitfall 17: Missing Confirmation for Destructive Actions

**What goes wrong:** User accidentally voids a transaction with a single tap. No undo, panic ensues.

**Prevention:**
- Confirmation dialog for void/delete
- Show "Undo" toast for 5 seconds after action
- Make destructive buttons visually distinct (not primary color)
- Require swipe-to-delete on mobile (not single tap)

**Source:** [Eleken - Fintech UX Best Practices](https://www.eleken.co/blog-posts/fintech-ux-best-practices)

---

### Pitfall 18: Jargon in Interface

**What goes wrong:** Interface uses accounting terms users don't understand ("credit", "debit", "accrual", "ledger entry").

**Prevention:**
- "Income" and "Expense" instead of "Credit/Debit"
- "Void" with explanation ("keeps record, removes from totals")
- Tooltips for tax terms (SE tax, EIT, quarterly estimates)
- Test with non-accountant users

**Source:** [Netguru - Financial App Design](https://www.netguru.com/blog/financial-app-design)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Database setup | BUSY errors (#3) | Enable WAL + busy_timeout immediately |
| Schema design | Migration rollback (#9) | Backup before migrate, single-change migrations |
| Transaction model | Hard delete (#1) | Void-first from day one |
| Tag system | Double-counting (#2) | Allocation percentages required |
| Multi-tenant | Data leakage (#10) | Separate DBs, path-based isolation |
| Tax calculation | SE tax wrong (#5) | Use 92.35% base, test against known values |
| Tax calculation | Local EIT ignored (#4) | Require local rate in workspace setup |
| File uploads | Orphaned files (#8) | DB metadata + cleanup job |
| SvelteKit UI | Hydration errors (#6) | Guard browser APIs, use onMount |
| Form actions | Upload routing (#7) | Use x-sveltekit-action header |
| Attachments | OCR over-trust (#13) | Manual-first, OCR as assist only |
| All phases | Feature creep (#14) | Stick to "10-second entry" test |

---

## Confidence Notes

| Pitfall | Confidence | Source Type |
|---------|------------|-------------|
| Financial deletion rules | HIGH | IRS requirements, accounting best practices |
| SQLite concurrency | HIGH | Official SQLite docs, better-sqlite3 docs |
| PA tax complexity | HIGH | Official PA DCED sources |
| SE tax calculation | HIGH | IRS documentation |
| SvelteKit hydration | MEDIUM | Official Svelte docs, GitHub issues |
| Multi-tenant isolation | MEDIUM | Industry security research |
| UX patterns | MEDIUM | Multiple design resources |
| OCR reliability | MEDIUM | Industry analysis |

---

## Sources Summary

**Official/Authoritative:**
- [SQLite WAL Mode Documentation](https://sqlite.org/wal.html)
- [SQLite Backup API](https://www.sqlite.org/backup.html)
- [IRS Self-Employed Tax Center](https://www.irs.gov/businesses/small-businesses-self-employed/self-employed-individuals-tax-center)
- [PA DCED Local Income Tax Information](https://dced.pa.gov/local-government/local-income-tax-information/)
- [SvelteKit Form Actions](https://github.com/sveltejs/kit/blob/main/documentation/docs/20-core-concepts/30-form-actions.md)
- [Svelte Runtime Warnings](https://svelte.dev/docs/svelte/runtime-warnings)
- [better-sqlite3 Performance Documentation](https://github.com/wiselibs/better-sqlite3/blob/master/docs/performance.md)

**Technical Analysis:**
- [Bert Hubert - SQLITE_BUSY Despite Timeout](https://berthub.eu/articles/posts/a-brief-post-on-sqlite3-database-locked-despite-timeout/)
- [JetBrains - Database Migrations in Real World](https://blog.jetbrains.com/idea/2025/02/database-migrations-in-the-real-world/)
- [Security Boulevard - Tenant Isolation](https://securityboulevard.com/2025/12/tenant-isolation-in-multi-tenant-systems-architecture-identity-and-security/)
- [Marty Friedel - Soft Delete vs Hard Delete](https://www.martyfriedel.com/blog/deleting-data-soft-hard-or-audit)

**UX/Design:**
- [ProCreator - Mobile Banking UX Mistakes](https://procreator.design/blog/ux-mistakes-avoid-mobile-banking-app-design/)
- [Eleken - Fintech UX Best Practices](https://www.eleken.co/blog-posts/fintech-ux-best-practices)
- [Netguru - Financial App Design](https://www.netguru.com/blog/financial-app-design)
