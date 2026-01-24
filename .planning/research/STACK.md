# Technology Stack

**Project:** TinyLedger
**Researched:** 2026-01-24
**Overall Confidence:** HIGH

## Executive Summary

TinyLedger's stack is optimized for a lightweight, mobile-first, self-hosted bookkeeping app. The recommended stack prioritizes developer experience, performance on mobile, minimal resource usage for homelab deployment, and long-term maintainability. All recommendations are verified against current documentation and npm registry data.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| SvelteKit | ^2.50.0 | Full-stack framework | File-based routing, SSR/SSG flexibility, excellent DX, smallest bundle sizes of any major framework. Official Svelte team project with strong ecosystem. | HIGH |
| Svelte | ^5.47.0 | UI framework | Compiles to vanilla JS (no virtual DOM), reactive by default, minimal runtime. Perfect for mobile performance. | HIGH |
| TypeScript | ^5.x | Type safety | Required for Drizzle ORM type inference. Catches errors at build time. | HIGH |
| Vite | ^6.x | Build tool | Ships with SvelteKit. Fastest HMR, excellent plugin ecosystem. | HIGH |

**Source:** [SvelteKit npm](https://www.npmjs.com/package/@sveltejs/kit), [SvelteKit Docs](https://svelte.dev/docs/kit/project-structure)

### Database

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| better-sqlite3 | ^12.6.2 | SQLite driver | Synchronous API (simpler code), fastest Node.js SQLite driver, zero config. Perfect for single-user self-hosted apps. | HIGH |
| Drizzle ORM | ^0.45.1 | Type-safe ORM | Lightweight (~7.4kb), zero dependencies, SQL-like syntax (not magic), excellent TypeScript inference, great migration tooling via drizzle-kit. | HIGH |
| drizzle-kit | ^0.31.x | Migrations CLI | Generates SQL migrations from TypeScript schema, push/pull commands for rapid development. | HIGH |

**Why Drizzle over alternatives:**
- **vs Prisma:** Drizzle has no query engine binary (smaller Docker images), no serialization overhead, SQL-transparent queries
- **vs raw better-sqlite3:** Type safety, migration management, schema-as-code
- **vs TypeORM/MikroORM:** Lighter weight, better TypeScript inference, simpler mental model

**Source:** [Drizzle ORM Docs](https://orm.drizzle.team/docs/quick-sqlite/better-sqlite3), [better-sqlite3 GitHub](https://github.com/WiseLibs/better-sqlite3)

### CSS & Styling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | ^4.1.x | Utility CSS | Mobile-first by design, zero-runtime CSS, automatic content detection in v4, tight Vite integration. 5x faster builds than v3. | HIGH |
| @tailwindcss/vite | ^4.1.x | Vite plugin | First-party integration, no PostCSS config needed in v4. | HIGH |

**Mobile-first approach:** Tailwind's breakpoint system is mobile-first by default. Use unprefixed utilities for mobile, `sm:`, `md:`, `lg:` for larger screens.

```css
/* Tailwind v4 setup - just one line in app.css */
@import "tailwindcss";
```

**Source:** [Tailwind CSS v4 Blog](https://tailwindcss.com/blog/tailwindcss-v4), [Tailwind Responsive Docs](https://tailwindcss.com/docs/responsive-design)

### Charts & Visualization

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Chart.js | ^4.5.1 | Charting | Battle-tested, 8 chart types, excellent docs, works with Svelte (direct integration, not wrapper). Lightweight enough for the use case. | HIGH |

**Alternative considered:** LayerChart - newer, Svelte-native, more customizable. However, Chart.js is simpler for basic income/expense visualizations and has vastly more documentation and examples.

**Svelte integration note:** The `svelte-chartjs` wrapper is unmaintained and doesn't support Svelte 5. Use Chart.js directly with Svelte's reactivity:

```svelte
<script>
  import { Chart } from 'chart.js/auto';
  import { onMount } from 'svelte';

  let canvas;
  onMount(() => {
    new Chart(canvas, { type: 'bar', data: {...} });
  });
</script>
<canvas bind:this={canvas}></canvas>
```

**Source:** [Chart.js Docs](https://www.chartjs.org/docs/latest/), [Rodney Lab Svelte Charts](https://rodneylab.com/svelte-charts/)

### PDF Generation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PDFKit | ^0.17.2 | PDF generation | Mature, full control over layout, supports tables natively, Node.js native. Best for custom-designed reports/summaries. | HIGH |

**Why PDFKit over alternatives:**
- **vs jsPDF:** PDFKit has better table support and is more mature for server-side generation
- **vs pdfmake:** PDFKit is lower-level (more control) and has simpler API for programmatic generation
- **vs Puppeteer/Playwright:** Overkill for structured reports, requires browser binary (heavy for Docker)

**Key capabilities for TinyLedger:**
- Table generation for transaction lists
- Custom fonts for professional appearance
- Vector graphics for charts/logos
- Multi-page document support

**Source:** [PDFKit GitHub](https://github.com/foliojs/pdfkit), [PDFKit Docs](https://pdfkit.org/)

### PWA & Offline

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @vite-pwa/sveltekit | ^0.6.x | PWA plugin | Zero-config sensible defaults, automatic service worker generation via Workbox, manifest injection, handles SvelteKit specifics. | MEDIUM |

**iOS PWA requirements (verified):**
- `display: "standalone"` in manifest for app-like feel
- `apple-touch-icon` meta tag (iOS ignores manifest icons)
- `apple-mobile-web-app-capable` meta tag
- `apple-mobile-web-app-title` meta tag
- Multiple icon sizes: 180x180 for iOS, 192x192 and 512x512 for Android

```html
<!-- Required iOS meta tags in app.html -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="TinyLedger">
<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png">
```

**Source:** [vite-pwa/sveltekit GitHub](https://github.com/vite-pwa/sveltekit), [iOS PWA Guide](https://firt.dev/notes/pwa-ios/)

### Infrastructure

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @sveltejs/adapter-node | ^5.x | Node adapter | Required for Docker deployment, produces standalone Node server. | HIGH |
| Docker | - | Containerization | Standard for homelab deployment, reproducible builds. | HIGH |
| Node.js | 22-alpine | Runtime | LTS, smallest image, native ESM support. | HIGH |

**Source:** [SvelteKit adapter-node Docs](https://svelte.dev/docs/kit/adapter-node)

---

## Project Structure

Based on SvelteKit best practices (verified via official docs):

```
tinyledger/
├── src/
│   ├── routes/              # File-based routing
│   │   ├── +layout.svelte   # Root layout (nav, global styles)
│   │   ├── +page.svelte     # Dashboard/home
│   │   ├── transactions/
│   │   │   ├── +page.svelte
│   │   │   └── +page.server.ts
│   │   └── reports/
│   │       ├── +page.svelte
│   │       └── +page.server.ts
│   ├── lib/                 # Reusable code ($lib alias)
│   │   ├── components/      # Svelte components
│   │   ├── stores/          # Svelte stores
│   │   └── server/          # Server-only code ($lib/server)
│   │       └── db/          # Database schema, queries
│   └── app.html             # HTML template
├── static/                  # Static assets (icons, etc.)
├── drizzle/                 # Migration files
├── drizzle.config.ts        # Drizzle Kit config
├── svelte.config.js         # SvelteKit config
├── vite.config.ts           # Vite config
├── tailwind.config.ts       # Tailwind config (optional in v4)
└── Dockerfile
```

**Source:** [SvelteKit Project Structure](https://svelte.dev/docs/kit/project-structure)

---

## Docker Configuration

Multi-stage build for minimal image size:

```dockerfile
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
COPY --from=builder /app/package.json .
# SQLite data directory
VOLUME /app/data
ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/data/tinyledger.db
EXPOSE 3000
CMD ["node", "build"]
```

**Key considerations:**
- Use multi-stage build to exclude dev dependencies and source
- Mount SQLite database as volume for persistence
- Set `ORIGIN` environment variable if using form actions
- No healthcheck needed for simple homelab deployment (add if desired)

**Source:** [Dockerize SvelteKit Guide](https://dev.to/code42cate/how-to-dockerize-sveltekit-3oho)

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | SvelteKit | Next.js, Nuxt | Larger bundles, heavier runtime. SvelteKit is ideal for mobile-first. |
| ORM | Drizzle | Prisma | Prisma requires query engine binary (~15MB), adds complexity for simple SQLite use case. |
| ORM | Drizzle | Raw SQL | Loses type safety, migration management, and schema-as-code benefits. |
| Database | SQLite | PostgreSQL | Overkill for single-user app. SQLite = zero config, single file, perfect for homelab. |
| CSS | Tailwind | Bootstrap, Bulma | Tailwind's utility approach = smaller bundles, better customization, mobile-first by design. |
| CSS | Tailwind v4 | Tailwind v3 | v4 is 5x faster, simpler setup, better Vite integration. Browser support is adequate (Safari 16.4+). |
| Charts | Chart.js | LayerChart | Chart.js has more documentation, simpler for basic charts. LayerChart better for complex visualizations. |
| Charts | Chart.js | Apache ECharts | ECharts is heavier, more complex API. Overkill for income/expense charts. |
| PDF | PDFKit | Puppeteer | Puppeteer requires browser binary (huge Docker image), slow. PDFKit is native Node.js. |
| PDF | PDFKit | jsPDF | jsPDF weaker for tables and complex layouts needed for financial reports. |
| PWA | @vite-pwa/sveltekit | Manual service worker | Plugin handles edge cases, manifest generation, Workbox integration automatically. |

---

## Installation Commands

```bash
# Create SvelteKit project
npx sv create tinyledger
cd tinyledger

# Core dependencies
npm install better-sqlite3 drizzle-orm chart.js pdfkit

# Dev dependencies
npm install -D @sveltejs/adapter-node drizzle-kit @types/better-sqlite3 @types/pdfkit

# Tailwind CSS v4 (via Vite plugin)
npm install -D tailwindcss @tailwindcss/vite

# PWA support
npm install -D @vite-pwa/sveltekit
```

---

## Configuration Files

### svelte.config.js

```javascript
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      out: 'build',
      precompress: true
    }),
    // Disable SvelteKit's service worker if using vite-pwa
    serviceWorker: {
      register: false
    }
  }
};

export default config;
```

### vite.config.ts

```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(), // MUST be before sveltekit()
    sveltekit(),
    SvelteKitPWA({
      manifest: {
        name: 'TinyLedger',
        short_name: 'TinyLedger',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
});
```

### drizzle.config.ts

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'file:./data/tinyledger.db'
  }
});
```

### src/app.css

```css
@import "tailwindcss";
```

---

## Version Summary

| Package | Version | Verified Date | Source |
|---------|---------|---------------|--------|
| @sveltejs/kit | ^2.50.0 | 2026-01-24 | npm registry |
| svelte | ^5.47.0 | 2026-01-24 | npm registry |
| better-sqlite3 | ^12.6.2 | 2026-01-24 | npm registry |
| drizzle-orm | ^0.45.1 | 2026-01-24 | npm registry |
| tailwindcss | ^4.1.x | 2026-01-24 | GitHub releases |
| chart.js | ^4.5.1 | 2026-01-24 | npm registry |
| pdfkit | ^0.17.2 | 2026-01-24 | npm registry |
| @vite-pwa/sveltekit | ^0.6.x | 2026-01-24 | GitHub |

---

## Sources

### Primary (HIGH confidence)
- [SvelteKit Official Docs](https://svelte.dev/docs/kit/project-structure)
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/quick-sqlite/better-sqlite3)
- [better-sqlite3 API Docs](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)
- [Tailwind CSS v4 Blog](https://tailwindcss.com/blog/tailwindcss-v4)
- [Chart.js Documentation](https://www.chartjs.org/docs/latest/)
- [PDFKit Documentation](https://pdfkit.org/)
- [SvelteKit adapter-node](https://svelte.dev/docs/kit/adapter-node)

### Secondary (MEDIUM confidence)
- [vite-pwa/sveltekit GitHub](https://github.com/vite-pwa/sveltekit)
- [iOS PWA Compatibility Notes](https://firt.dev/notes/pwa-ios/)
- [Dockerize SvelteKit Guide](https://dev.to/code42cate/how-to-dockerize-sveltekit-3oho)
- [Node.js ORM Comparison 2025](https://thedataguy.pro/blog/2025/12/nodejs-orm-comparison-2025/)

### Ecosystem Discovery
- [Top CSS Frameworks 2025](https://blog.logrocket.com/top-6-css-frameworks-2025/)
- [Svelte Chart Libraries](https://dev.to/dev_michael/the-hunt-for-the-perfect-svelte-charting-library-a-happy-ending-o0p)
- [PDF Generation Libraries 2025](https://pdfnoodle.com/blog/popular-libraries-2025-for-pdf-generation-using-node-js)
