# Phase 9: Mobile & Deployment - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the app installable to iOS home screen as a PWA and production-ready with Docker deployment. Includes manifest configuration, container setup, and backup documentation. No offline data sync — app requires network connection.

</domain>

<decisions>
## Implementation Decisions

### PWA Install Experience
- Install discovery via Settings page only — no banner prompts
- Home screen app name: "Ledger" (short, always fits)
- Icon style: Abstract L monogram (minimal, modern)
- Splash screen: Icon + app name centered on theme color background

### Offline Behavior
- No offline support — app requires network connection
- Clear offline indicator when disconnected (banner: "You're offline — connect to continue")
- No service worker caching for assets — always fetch fresh

### Docker Configuration
- Separate volume mounts: one for databases, one for attachments
- Multi-stage Dockerfile build (smaller runtime image)
- Extensive environment variables with sensible defaults:
  - ORIGIN, DATA_DIR, BODY_SIZE_LIMIT, LOG_LEVEL
  - PORT, TZ, and any backup-related settings

### Backup Strategy
- Manual backup only — document procedures, no automated scheduling
- Separate BACKUP.md with full restore verification steps
- Distinct sections for database backup vs attachment backup

### Claude's Discretion
- Base image choice (Alpine vs Debian slim based on dependencies)
- Specific offline indicator UI design
- Icon design details within "abstract L monogram" direction
- Default values for environment variables

</decisions>

<specifics>
## Specific Ideas

- App name "Ledger" chosen to always fit under home screen icon
- User prefers extensive configurability but with sensible defaults that work out of box
- Backup documentation should be separate file, not buried in README

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-mobile-deployment*
*Context gathered: 2026-02-03*
