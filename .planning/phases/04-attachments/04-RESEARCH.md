# Phase 4: Attachments - Research

**Researched:** 2026-01-25
**Domain:** File upload, storage, and serving in SvelteKit with workspace isolation
**Confidence:** HIGH

## Summary

This phase implements a receipt attachment system for transactions, allowing users to upload, view, download, and replace receipt images. The application already has established patterns for workspace-namespaced file storage (logos) that should be extended for attachments.

Key findings:
- SvelteKit handles file uploads through form actions with `request.formData()` accessing `File` objects
- The existing `sharp` library (already installed) is ideal for image processing and format normalization
- Filesystem storage with workspace namespacing follows the established `data/` directory pattern
- Browser-side preview should use `URL.createObjectURL()` for efficiency
- File naming for bulk export uses ISO 8601 date format: `YYYY-MM-DD_Payee_Amount.ext`

**Primary recommendation:** Store attachments on filesystem at `data/attachments/{workspaceId}/{transactionPublicId}.{ext}`, re-encode images through Sharp for security, track metadata in a new `attachments` database table.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sharp | ^0.34.5 | Image processing, format conversion | Already installed, high-performance, re-encodes images for security |
| SvelteKit | ^2.49.1 | Form actions with file upload handling | Native `request.formData()` for File access |
| node:fs | Built-in | Filesystem operations | Standard Node.js API for file read/write |
| node:path | Built-in | Path manipulation | Standard for safe path construction |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| crypto | Built-in | UUID generation | Already used for transaction publicId |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Filesystem storage | SQLite BLOB | BLOB suitable for small files (<1MB), but filesystem better for serving and potential large receipts |
| Sharp re-encoding | Direct save | Re-encoding strips EXIF/malicious content, normalizes format |
| Single file per transaction | Multiple attachments | Single file simpler, matches Phase 4 requirements |

**Installation:**
```bash
# No new packages needed - sharp already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── server/
│   │   └── storage/
│   │       ├── logo.ts              # Existing logo storage
│   │       └── attachment.ts        # NEW: Attachment storage module
│   └── components/
│       └── AttachmentUpload.svelte  # NEW: Upload component with preview
├── routes/
│   ├── api/
│   │   └── attachment/
│   │       └── [workspace]/
│   │           └── [transactionId]/
│   │               └── +server.ts   # NEW: Serve attachments
│   └── w/[workspace]/
│       └── transactions/
│           ├── new/                 # Add attachment upload to form
│           └── [id]/                # Add attachment view/replace
data/
├── attachments/                     # NEW: Attachment storage
│   └── {workspaceId}/
│       └── {transactionPublicId}.{ext}
└── workspaces/
    └── {workspaceId}.db             # Add attachments table
```

### Pattern 1: Attachment Storage Module (Mirror Logo Pattern)
**What:** Centralized module for attachment CRUD operations
**When to use:** All attachment operations
**Example:**
```typescript
// Source: Existing pattern from src/lib/server/storage/logo.ts
import sharp from 'sharp';
import { writeFileSync, existsSync, mkdirSync, unlinkSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const DATA_DIR = process.env.DATA_DIR ?? './data';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

function getAttachmentsDir(workspaceId: string): string {
  return join(DATA_DIR, 'attachments', workspaceId);
}

function getAttachmentPath(workspaceId: string, transactionPublicId: string, ext: string): string {
  return join(getAttachmentsDir(workspaceId), `${transactionPublicId}${ext}`);
}

export async function saveAttachment(
  workspaceId: string,
  transactionPublicId: string,
  file: File
): Promise<{ filename: string; mimeType: string; sizeBytes: number }> {
  // Validate MIME type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`);
  }

  // Validate size
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`File too large. Maximum: ${MAX_SIZE_BYTES / 1024 / 1024}MB`);
  }

  // Ensure directory exists
  const dir = getAttachmentsDir(workspaceId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Delete existing attachment if any
  deleteAttachment(workspaceId, transactionPublicId);

  // Read and re-encode through Sharp (security: strips EXIF, validates image)
  const buffer = Buffer.from(await file.arrayBuffer());
  const image = sharp(buffer);
  const metadata = await image.metadata();

  // Determine output format (normalize to common formats)
  let ext: string;
  let processedBuffer: Buffer;

  if (metadata.format === 'gif') {
    // Preserve GIF (animated support)
    processedBuffer = await image.gif().toBuffer();
    ext = '.gif';
  } else {
    // Convert everything else to JPEG for consistency
    processedBuffer = await image.jpeg({ quality: 90 }).toBuffer();
    ext = '.jpg';
  }

  const filename = `${transactionPublicId}${ext}`;
  const filepath = getAttachmentPath(workspaceId, transactionPublicId, ext);

  writeFileSync(filepath, processedBuffer);

  return {
    filename,
    mimeType: ext === '.gif' ? 'image/gif' : 'image/jpeg',
    sizeBytes: processedBuffer.length
  };
}
```

### Pattern 2: Form Action with File Upload
**What:** Handle file upload in SvelteKit form action
**When to use:** Transaction create/edit with attachment
**Example:**
```typescript
// Source: SvelteKit docs - https://svelte.dev/docs/kit/form-actions
export const actions = {
  default: async ({ request, params, locals }) => {
    const formData = await request.formData();

    // Get file from form
    const attachment = formData.get('attachment') as File | null;

    if (attachment && attachment.size > 0) {
      try {
        const result = await saveAttachment(
          params.workspace,
          transactionPublicId,
          attachment
        );
        // Store metadata in database
      } catch (err) {
        return fail(400, { error: err.message });
      }
    }
  }
};
```

### Pattern 3: Client-Side Preview with URL.createObjectURL
**What:** Efficient file preview without reading entire file
**When to use:** Before upload, show user what they selected
**Example:**
```svelte
<!-- Source: MDN/JS-Craft best practices -->
<script lang="ts">
  let files = $state<FileList | undefined>();
  let previewUrl = $state<string | null>(null);

  $effect(() => {
    // Cleanup previous URL to prevent memory leaks
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (files && files.length > 0) {
      previewUrl = URL.createObjectURL(files[0]);
    } else {
      previewUrl = null;
    }
  });

  // Cleanup on component destroy
  $effect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  });
</script>

<input type="file" accept="image/*" bind:files name="attachment" />
{#if previewUrl}
  <img src={previewUrl} alt="Preview" class="max-w-xs rounded-lg" />
{/if}
```

### Pattern 4: Serve Attachments via API Route
**What:** Dedicated endpoint to serve attachment files
**When to use:** Display attachments in UI, enable downloads
**Example:**
```typescript
// Source: Existing pattern from src/routes/api/logo/[workspace]/[filename]/+server.ts
import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { getAttachmentBuffer, getAttachmentMimeType } from '$lib/server/storage/attachment';

export const GET: RequestHandler = async ({ params, url }) => {
  const { workspace, transactionId } = params;
  const download = url.searchParams.get('download') === 'true';
  const exportName = url.searchParams.get('exportName');

  const { buffer, mimeType, filename } = getAttachmentBuffer(workspace, transactionId);

  if (!buffer) {
    throw error(404, 'Attachment not found');
  }

  const headers: Record<string, string> = {
    'Content-Type': mimeType,
    'Cache-Control': 'private, max-age=3600'
  };

  if (download) {
    // Use export name if provided, otherwise original filename
    const downloadName = exportName || filename;
    headers['Content-Disposition'] = `attachment; filename="${downloadName}"`;
  }

  return new Response(new Uint8Array(buffer), { headers });
};
```

### Anti-Patterns to Avoid
- **Storing files in static/**: Disappears after build, not workspace-isolated
- **Trusting Content-Type header**: Always re-encode images through Sharp
- **Using FileReader for previews**: URL.createObjectURL is more efficient
- **Storing large files in SQLite BLOB**: Filesystem better for serving
- **Not cleaning up object URLs**: Causes memory leaks

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image format detection | Parse file headers manually | Sharp `metadata()` | Handles edge cases, security |
| Image re-encoding | Simple file copy | Sharp pipeline | Strips EXIF, validates, normalizes |
| MIME type detection | Check extension only | Sharp metadata + validation | Extensions can be spoofed |
| File preview | FileReader.readAsDataURL | URL.createObjectURL | Better performance, less memory |
| Path construction | String concatenation | node:path.join | Cross-platform, safe |

**Key insight:** Sharp already handles image processing correctly - re-encoding through it validates images and strips potentially malicious content without needing separate security libraries.

## Common Pitfalls

### Pitfall 1: Content-Type Spoofing
**What goes wrong:** Accepting uploads based on Content-Type header alone allows malicious files
**Why it happens:** Content-Type is client-controlled and trivially spoofed
**How to avoid:** Always re-encode images through Sharp - it will throw on invalid/malicious input
**Warning signs:** Accepting file.type without validation

### Pitfall 2: Memory Leaks from Object URLs
**What goes wrong:** Browser memory grows unbounded with repeated uploads
**Why it happens:** URL.createObjectURL creates persistent references
**How to avoid:** Always call URL.revokeObjectURL when URL is no longer needed, use Svelte 5 `$effect` cleanup
**Warning signs:** Memory usage growing during development, leaked object URLs in DevTools

### Pitfall 3: Path Traversal Attacks
**What goes wrong:** Attacker manipulates filename to access/overwrite arbitrary files
**Why it happens:** Using user-provided filenames in paths
**How to avoid:** Always use application-generated IDs (transactionPublicId) for filenames, never user input
**Warning signs:** Using original filename in storage path

### Pitfall 4: Missing enctype on Forms
**What goes wrong:** File uploads send empty File objects
**Why it happens:** Default form encoding doesn't handle files
**How to avoid:** Always use `enctype="multipart/form-data"` on forms with file inputs
**Warning signs:** file.size === 0 when file was selected

### Pitfall 5: Forgetting Workspace Isolation
**What goes wrong:** Attachments accessible across workspaces
**Why it happens:** Not including workspaceId in storage path or API validation
**How to avoid:** Follow existing pattern: `data/attachments/{workspaceId}/`, validate workspace access
**Warning signs:** API routes without workspace parameter validation

## Code Examples

Verified patterns from official sources:

### Database Schema Extension
```typescript
// Source: Existing pattern from schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';
import { transactions } from './schema';

export const attachments = sqliteTable('attachments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  transactionId: integer('transaction_id')
    .notNull()
    .unique()  // One attachment per transaction
    .references(() => transactions.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),  // e.g., "abc-123-def.jpg"
  originalName: text('original_name').notNull(),  // User's original filename
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  transaction: one(transactions, {
    fields: [attachments.transactionId],
    references: [transactions.id]
  })
}));
```

### Export Filename Generation
```typescript
// Source: ISO 8601 best practices, Harvard Data Management guidelines
export function generateExportFilename(
  date: string,           // YYYY-MM-DD
  payee: string,
  amountCents: number,
  ext: string
): string {
  // Sanitize payee: remove special chars, replace spaces with underscores
  const sanitizedPayee = payee
    .replace(/[^a-zA-Z0-9\s-]/g, '')  // Remove special chars
    .replace(/\s+/g, '_')              // Spaces to underscores
    .substring(0, 30);                 // Limit length

  // Format amount: dollars with no decimals for simplicity
  const amountDollars = Math.round(amountCents / 100);

  // Format: YYYY-MM-DD_Payee_$Amount.ext
  return `${date}_${sanitizedPayee}_$${amountDollars}${ext}`;
}

// Example: "2026-01-25_Office_Depot_$125.jpg"
```

### AttachmentUpload Component
```svelte
<!-- Component for file upload with preview -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    name?: string;
    existingUrl?: string | null;
    onRemove?: () => void;
    class?: string;
  }

  let {
    name = 'attachment',
    existingUrl = null,
    onRemove,
    class: className = ''
  }: Props = $props();

  let files = $state<FileList | undefined>();
  let previewUrl = $state<string | null>(null);
  let dragOver = $state(false);

  // Create preview URL when file selected
  $effect(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (files && files.length > 0) {
      previewUrl = URL.createObjectURL(files[0]);
    } else {
      previewUrl = null;
    }
  });

  // Cleanup on unmount
  $effect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  });

  function clearSelection() {
    files = new DataTransfer().files;
    previewUrl = null;
  }

  const displayUrl = $derived(previewUrl || existingUrl);
</script>

<div class="space-y-2 {className}">
  <input
    type="file"
    {name}
    accept="image/jpeg,image/png,image/webp,image/gif"
    bind:files
    class="hidden"
    id="{name}-input"
  />

  {#if displayUrl}
    <div class="relative inline-block">
      <img src={displayUrl} alt="Receipt preview" class="max-w-xs rounded-lg shadow-sm" />
      <button
        type="button"
        onclick={previewUrl ? clearSelection : onRemove}
        class="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  {:else}
    <label
      for="{name}-input"
      class="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 hover:border-gray-400"
      class:border-blue-500={dragOver}
      ondragover={(e) => { e.preventDefault(); dragOver = true; }}
      ondragleave={() => dragOver = false}
      ondrop={(e) => {
        e.preventDefault();
        dragOver = false;
        if (e.dataTransfer?.files) {
          files = e.dataTransfer.files;
        }
      }}
    >
      <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      <span class="mt-2 text-sm text-gray-500">Click or drag to upload receipt</span>
      <span class="text-xs text-gray-400">JPEG, PNG, WebP, GIF up to 10MB</span>
    </label>
  {/if}
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FileReader.readAsDataURL | URL.createObjectURL | Widely adopted 2020+ | Better performance, less memory |
| Trust Content-Type header | Re-encode through imaging library | Security best practice | Prevents malicious uploads |
| Store files in web root | Serve via API endpoints | SvelteKit pattern | Proper access control |
| Base64 encoding for transport | Native File/Blob handling | Modern browsers | Smaller payload, faster |

**Deprecated/outdated:**
- Using `formidable` or `multer`: SvelteKit handles multipart natively via `request.formData()`
- Storing files in `static/`: Disappears after build, no runtime access

## Open Questions

Things that couldn't be fully resolved:

1. **PDF support**
   - What we know: Sharp doesn't process PDFs, would need separate library
   - What's unclear: Whether Phase 4 requirements include PDFs (only mentions "receipt attachment")
   - Recommendation: Start with images only (JPEG, PNG, WebP, GIF), add PDF support as future enhancement if needed

2. **Multiple attachments per transaction**
   - What we know: Requirements say "receipt attachment" (singular)
   - What's unclear: Whether users might need multiple receipts per transaction
   - Recommendation: Implement single attachment first (matches requirements), schema allows future extension

## Sources

### Primary (HIGH confidence)
- [SvelteKit official docs](https://svelte.dev/docs/kit) - Form actions, request handling
- [Sharp documentation](https://sharp.pixelplumbing.com/) - Image processing API
- [Svelte 5 docs](https://svelte.dev/docs) - bind:files, $state, $effect

### Secondary (MEDIUM confidence)
- [MDN FileReader](https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL) - File API reference
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) - Security validation
- [Harvard Data Management - File Naming](https://datamanagement.hms.harvard.edu/plan-design/file-naming-conventions) - ISO 8601 date format

### Tertiary (LOW confidence)
- [SvelteKit file upload tutorials](https://www.okupter.com/blog/sveltekit-file-upload) - Community patterns (verified with official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using already-installed Sharp, established patterns from existing logo storage
- Architecture: HIGH - Direct extension of existing workspace-namespaced storage pattern
- Pitfalls: HIGH - Security patterns well-documented by OWASP, memory management in Svelte 5 docs

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (30 days - stable domain, established patterns)
