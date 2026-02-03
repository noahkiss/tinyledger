# TinyLedger - Claude Code Instructions

## Project Overview
Personal bookkeeping app for sole proprietors and small volunteer organizations. SvelteKit frontend with SQLite databases (one per workspace).

## Tech Stack
- SvelteKit 2 + TypeScript
- Drizzle ORM + better-sqlite3
- TailwindCSS
- Docker for deployment

## Development Commands
```bash
npm run dev          # Start dev server
npm run check        # Type check
npm run lint         # Lint code
npm run test         # Run tests
npm run build        # Production build
```

## Key Patterns
- **Database per workspace**: Each workspace gets its own SQLite file in `data/workspaces/`
- **Amounts as cents**: Always store money as integer cents (e.g., $15.75 = 1575)
- **Soft deletes**: Transactions use `deletedAt`/`voidedAt` timestamps
- **Tag allocations**: Transactions can have multiple tags with percentage splits (must sum to 100%)

## CI/CD Workflows

### IMPORTANT: Check GitHub Actions after pushes
After pushing changes, verify workflows are passing:
```bash
gh run list --limit=5
```

If a workflow fails, investigate with:
```bash
gh run view <run-id> --log-failed
```

### Active Workflows
- **docker.yml**: Builds and pushes Docker image to GHCR on push to main
- **screenshots.yml**: Captures UI screenshots for docs when src/ changes

### Demo Data
Set `SEED_DEMO_DATA=true` to create a demo workspace with sample transactions. Used by screenshots workflow.

## File Structure
```
src/
├── lib/
│   ├── server/
│   │   ├── db/           # Schema, migrations, seeding
│   │   └── workspace/    # Workspace management
│   └── utils/            # Shared utilities
├── routes/
│   ├── w/[workspace]/    # Workspace-scoped routes
│   └── api/              # API endpoints
└── hooks.server.ts       # Request hooks, demo seeding
```
