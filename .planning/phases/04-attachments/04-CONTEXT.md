# Phase 4: Attachments - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Receipt attachment system with workspace-namespaced storage. Users can upload attachments during transaction entry, view them full-size, download them, and replace them. Attachments are auto-renamed for bulk export. One attachment per transaction (receipts are typically single documents).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

User indicated no strong preferences for attachment implementation. Claude has full discretion on:

**Upload experience:**
- Simple file input button (not drag-drop) — keeps UI minimal
- Upload happens with form submission, not immediately — simpler flow
- Show filename preview after selection, thumbnail if image

**File handling:**
- Accept images (jpg, png, webp, heic) and PDFs — covers 99% of receipts
- Size limit: 10MB per file — generous for phone photos
- No server-side compression — preserve originals for tax records

**Viewing & management:**
- Inline thumbnail on transaction detail page
- Click to open full-size in modal or new tab
- Download button with auto-renamed filename
- Replace button to swap attachment

**Storage structure:**
- Workspace-namespaced: `data/workspaces/{workspaceId}/attachments/`
- Filename: `{transactionId}.{ext}` — simple, unique, easy to map
- Export naming: `YYYY-MM-DD_Payee_Amount.ext` per requirements

**One attachment per transaction:**
- Single attachment simplifies UI and storage
- Matches typical receipt workflow (one receipt = one transaction)
- If user has multi-page receipt, they can scan to single PDF

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

User's guidance: "make your own decisions on this - I actually don't care much about attachments"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-attachments*
*Context gathered: 2026-01-30*
