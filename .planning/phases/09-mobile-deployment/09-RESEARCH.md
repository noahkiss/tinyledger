# Phase 9: Mobile & Deployment - Research

**Researched:** 2026-02-03
**Domain:** PWA Configuration, Docker Deployment, SQLite Backup
**Confidence:** HIGH

## Summary

Phase 9 focuses on making tinyledger installable as a PWA on iOS home screens and production-ready via Docker. The research covers three domains: PWA manifest configuration for iOS standalone mode, Docker multi-stage builds with better-sqlite3 native bindings, and SQLite backup strategies for data safety.

The PWA implementation is straightforward since iOS now supports web app manifest (since iOS 16.4), though Apple touch icons still require explicit `<link>` elements. Docker deployment with better-sqlite3 works best with Debian-slim images rather than Alpine due to native binary compatibility. SQLite backup should use the `VACUUM INTO` command for hot backups rather than file copies.

**Primary recommendation:** Use static `manifest.webmanifest` (not .json to avoid Vite conflict), node:lts-slim base image for Docker, and VACUUM INTO for SQLite backups.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @sveltejs/adapter-node | 5.5.2 | SvelteKit Node.js deployment | Already installed, native support |
| better-sqlite3 | 12.6.2 | SQLite with backup API | Already in use, has backup() method |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sharp | 0.34.5 | Icon generation | Already installed, PNG export |
| express | 5.x | Custom server for healthcheck | Only if /health endpoint needed outside SvelteKit |

### No Additional Dependencies Needed

PWA manifest is a static JSON file. Docker is configuration-only. The existing stack handles all requirements:
- sharp: Generate PWA icons (already used for logo processing)
- better-sqlite3: Has built-in backup() method and supports VACUUM INTO
- adapter-node: Supports all required environment variables natively

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Static manifest | @vite-pwa/sveltekit | More complex, service worker overhead not needed |
| node:slim | node:alpine | Alpine smaller but native binary issues with better-sqlite3 |
| express healthcheck | SvelteKit route | SvelteKit route simpler, no extra dependency |

**Installation:**
No new packages required.

## Architecture Patterns

### Recommended Project Structure
```
static/
  manifest.webmanifest    # PWA manifest (not .json to avoid Vite conflict)
  icons/
    icon-180.png          # Apple touch icon
    icon-192.png          # PWA minimum
    icon-512.png          # PWA splash
    icon-512-maskable.png # Android adaptive icon
src/
  app.html                # Add manifest link, apple-touch-icon, theme-color meta
  routes/
    health/
      +server.ts          # Health check endpoint for Docker
docker/
  Dockerfile              # Multi-stage build
  .dockerignore           # Exclude dev files
docker-compose.yml        # Production deployment
BACKUP.md                 # Backup and restore documentation
```

### Pattern 1: Static PWA Manifest
**What:** Place manifest.webmanifest in static/ folder
**When to use:** Always for SvelteKit PWAs without offline support
**Why .webmanifest:** Vite creates its own manifest.json in build output. Using .webmanifest avoids confusion.

```json
{
  "name": "Ledger",
  "short_name": "Ledger",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```
Source: [MDN PWA Manifest](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)

### Pattern 2: iOS-Specific HTML Elements
**What:** Apple touch icons and status bar configuration in app.html
**When to use:** Always for iOS PWA support
**Why:** iOS still requires explicit `<link rel="apple-touch-icon">` and proprietary meta tags

```html
<!-- In app.html <head> -->
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="apple-touch-icon" href="/icons/icon-180.png" />
<meta name="theme-color" content="#ffffff" />
<meta name="apple-mobile-web-app-title" content="Ledger" />
```
Source: [Apple Developer Documentation](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)

### Pattern 3: Multi-Stage Docker Build
**What:** Separate build and runtime stages for smaller images
**When to use:** Always for production Node.js deployments

```dockerfile
# Build stage
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production

# Runtime stage
FROM node:22-slim
WORKDIR /app
RUN addgroup --gid 1001 nodejs && adduser --uid 1001 --gid 1001 nodejs
COPY --from=builder --chown=nodejs:nodejs /app/build build/
COPY --from=builder --chown=nodejs:nodejs /app/node_modules node_modules/
COPY --from=builder --chown=nodejs:nodejs /app/package.json .
USER nodejs
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "build"]
```
Source: [Docker Node.js Guide](https://docs.docker.com/guides/nodejs/containerize/)

### Pattern 4: Docker Compose with Volumes
**What:** Separate volumes for databases and attachments
**When to use:** Production deployment

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - ORIGIN=https://ledger.example.com
      - DATA_DIR=/data
      - BODY_SIZE_LIMIT=10M
    volumes:
      - db-data:/data/db
      - attachments:/data/attachments
    restart: unless-stopped

volumes:
  db-data:
  attachments:
```

### Anti-Patterns to Avoid
- **Using Alpine with better-sqlite3:** Native bindings may have musl/glibc incompatibility issues. Use Debian-slim.
- **Copying node_modules from host:** Binary incompatibility between host and container architectures.
- **Using manifest.json:** Conflicts with Vite's internal manifest.json. Use .webmanifest extension.
- **File copy for SQLite backup:** Not transactionally safe. Use VACUUM INTO or backup() API.
- **Setting apple-mobile-web-app-capable without manifest:** Deprecated, creates poor experience.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Icon generation | Manual resize | sharp with existing PNG | Consistent sizing, already in project |
| SQLite hot backup | File copy with fs | VACUUM INTO or db.backup() | Transactionally safe, consistent state |
| Health check | Complex liveness probe | Simple /health route | SvelteKit handles it natively |
| PWA install prompt | Custom beforeinstallprompt | Settings page link | User decision: no banners |

**Key insight:** The SvelteKit adapter-node and better-sqlite3 already provide all the building blocks. No new libraries needed.

## Common Pitfalls

### Pitfall 1: manifest.json vs manifest.webmanifest
**What goes wrong:** Vite creates its own manifest.json in build output for asset management
**Why it happens:** Standard PWA tutorials suggest manifest.json, but Vite uses that filename
**How to avoid:** Always use `manifest.webmanifest` extension
**Warning signs:** PWA not installing, manifest not found in DevTools

### Pitfall 2: Missing apple-touch-icon
**What goes wrong:** iOS shows ugly screenshot instead of icon on home screen
**Why it happens:** iOS doesn't fully honor manifest icons, requires explicit link element
**How to avoid:** Always include `<link rel="apple-touch-icon" href="/icons/icon-180.png">`
**Warning signs:** Low-quality or screenshot icon on iOS home screen

### Pitfall 3: ORIGIN not set in Docker
**What goes wrong:** "Cross-site POST form submissions are forbidden" error
**Why it happens:** adapter-node can't determine origin without explicit setting
**How to avoid:** Always set ORIGIN environment variable to your full domain URL
**Warning signs:** Form submissions failing with 403, CSRF-like errors

### Pitfall 4: Alpine with Native Bindings
**What goes wrong:** "symbol not found" errors with better-sqlite3
**Why it happens:** Alpine uses musl libc, prebuilt binaries may be for glibc
**How to avoid:** Use node:22-slim (Debian-based) instead of Alpine
**Warning signs:** Error relocating .node files, symbol not found messages

### Pitfall 5: SQLite Backup with File Copy
**What goes wrong:** Corrupted backup if database is being written to
**Why it happens:** SQLite may have uncommitted data in WAL or pending transactions
**How to avoid:** Use `VACUUM INTO '/path/to/backup.db'` or better-sqlite3's backup() method
**Warning signs:** "database disk image is malformed" when opening backup

### Pitfall 6: Running as Root in Container
**What goes wrong:** Security vulnerability, files created with root ownership
**Why it happens:** Docker runs as root by default
**How to avoid:** Create nodejs user, use USER directive before CMD
**Warning signs:** Permission errors when volume-mounted files are accessed from host

## Code Examples

Verified patterns from official sources:

### SvelteKit Health Check Route
```typescript
// src/routes/health/+server.ts
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  return new Response('ok', { status: 200 });
};
```

### adapter-node Environment Variables
```bash
# Required for production
ORIGIN=https://ledger.example.com  # Full URL including protocol

# Optional with defaults
PORT=3000                          # Server port
HOST=0.0.0.0                       # Bind address
BODY_SIZE_LIMIT=512K               # Max request body (supports K, M, G suffixes)

# Optional advanced
PROTOCOL_HEADER=x-forwarded-proto  # If behind reverse proxy
HOST_HEADER=x-forwarded-host       # If behind reverse proxy
SHUTDOWN_TIMEOUT=30                # Graceful shutdown seconds
```
Source: [SvelteKit adapter-node docs](https://svelte.dev/docs/kit/adapter-node)

### SQLite VACUUM INTO Backup
```typescript
// For hot backup without locking
import { db } from '$lib/server/db';

function backupWorkspace(workspaceId: string, backupPath: string) {
  const workspace = getWorkspaceDb(workspaceId);
  workspace.exec(`VACUUM INTO '${backupPath}'`);
}
```
Source: [SQLite VACUUM documentation](https://www.sqlite.org/lang_vacuum.html)

### better-sqlite3 backup() Method
```typescript
// Async backup with progress reporting
const db = new Database('/path/to/database.db');

await db.backup(`/path/to/backup-${Date.now()}.db`, {
  progress({ totalPages, remainingPages }) {
    const percent = ((totalPages - remainingPages) / totalPages * 100).toFixed(1);
    console.log(`Backup progress: ${percent}%`);
    return 200; // pages per iteration, 0 to pause
  }
});
```
Source: [better-sqlite3 API](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)

### Docker HEALTHCHECK
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
```

### Icon Generation Script Pattern
```typescript
// scripts/generate-icons.ts
import sharp from 'sharp';

const sizes = [
  { size: 180, name: 'icon-180.png' },   // Apple touch icon
  { size: 192, name: 'icon-192.png' },   // PWA minimum
  { size: 512, name: 'icon-512.png' },   // PWA splash
  { size: 512, name: 'icon-512-maskable.png', padding: 0.1 }, // Maskable (10% safe zone)
];

async function generateIcons(sourcePath: string, outputDir: string) {
  for (const { size, name, padding } of sizes) {
    const img = sharp(sourcePath);
    if (padding) {
      // Add padding for maskable icons
      const innerSize = Math.floor(size * (1 - padding * 2));
      await img
        .resize(innerSize, innerSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .extend({
          top: Math.floor(size * padding),
          bottom: Math.floor(size * padding),
          left: Math.floor(size * padding),
          right: Math.floor(size * padding),
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .toFile(`${outputDir}/${name}`);
    } else {
      await img.resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } }).toFile(`${outputDir}/${name}`);
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| apple-mobile-web-app-capable meta | Web app manifest | iOS 16.4 (2023) | Can now rely on manifest for standalone mode |
| Service worker required | Manifest-only PWA | Always optional | No offline = no service worker needed |
| Alpine for small images | Debian-slim for native bindings | 2024 recommendation | Fewer compatibility issues |
| .backup CLI command | VACUUM INTO | SQLite 3.27 (2019) | Better for hot databases under load |

**Deprecated/outdated:**
- `apple-mobile-web-app-capable` meta tag: Still works but manifest.display is preferred
- `apple-mobile-web-app-status-bar-style`: Limited to default/black/black-translucent
- Node.js alpine images with native bindings: Compatibility issues, use slim instead

## iOS PWA Specifics

### Icon Requirements
- **180x180**: Apple touch icon (required for home screen)
- **192x192**: PWA minimum (Lighthouse requirement)
- **512x512**: PWA splash/install (Android, Chrome)
- **512x512 maskable**: Android adaptive icons (10% safe zone padding)

### Manifest Settings
```json
{
  "display": "standalone",
  "theme_color": "#ffffff",
  "background_color": "#ffffff"
}
```

### HTML Requirements
```html
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="apple-touch-icon" href="/icons/icon-180.png" />
<meta name="theme-color" content="#ffffff" />
<meta name="apple-mobile-web-app-title" content="Ledger" />
```

### Offline Indicator Pattern
User decision: Show banner when offline. Implementation:
```svelte
<script>
  let online = $state(true);

  $effect(() => {
    const handleOnline = () => online = true;
    const handleOffline = () => online = false;

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    online = navigator.onLine;

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });
</script>

{#if !online}
  <div class="bg-yellow-100 text-yellow-800 px-4 py-2 text-center">
    You're offline - connect to continue
  </div>
{/if}
```

## Open Questions

Things that couldn't be fully resolved:

1. **Exact icon design for "Abstract L monogram"**
   - What we know: User wants minimal, modern, abstract L
   - What's unclear: Specific design details (color, style)
   - Recommendation: Claude's discretion per CONTEXT.md. Create simple geometric L.

2. **Default theme_color value**
   - What we know: Should match app background
   - What's unclear: Current app uses Tailwind, no explicit brand color defined
   - Recommendation: Use #ffffff (white) for clean appearance, matches Tailwind defaults

## Sources

### Primary (HIGH confidence)
- [SvelteKit adapter-node docs](https://svelte.dev/docs/kit/adapter-node) - Environment variables, custom server
- [better-sqlite3 API](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md) - backup() method
- [Docker Node.js Guide](https://docs.docker.com/guides/nodejs/containerize/) - Multi-stage builds
- [SQLite VACUUM documentation](https://www.sqlite.org/lang_vacuum.html) - VACUUM INTO

### Secondary (MEDIUM confidence)
- [MDN PWA Installation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) - Manifest requirements
- [web.dev PWA Manifest](https://web.dev/learn/pwa/web-app-manifest) - Icon sizes, display modes
- [Apple Developer Archive](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html) - iOS specifics

### Tertiary (LOW confidence)
- Various WebSearch results on Alpine vs Debian for native bindings - community consensus
- Blog posts on SvelteKit Docker patterns - multiple sources agree

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing dependencies, official docs
- Architecture: HIGH - Well-documented patterns from official sources
- Pitfalls: HIGH - Direct from official docs and community experience
- iOS specifics: MEDIUM - Apple documentation is sparse, community knowledge fills gaps

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days - stable technologies)
