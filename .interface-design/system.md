# TinyLedger Design System

## Theme
Catppuccin (Latte light / Mocha dark). Class-based dark mode (`.dark` on root).

## Spacing
Base unit: 4px. Tailwind scale: 0.5, 1, 1.5, 2, 2.5, 3, 4, 6, 8.

## Colors
All colors via CSS custom properties. No raw hex values in components.

| Token | Light (Latte) | Dark (Mocha) |
|-------|---------------|--------------|
| --color-background | #eff1f5 | #1e1e2e |
| --color-foreground | #4c4f69 | #cdd6f4 |
| --color-muted | #9ca0b0 | #a6adc8 |
| --color-surface | #e6e9ef | #313244 |
| --color-surface-alt | #dce0e8 | #45475a |
| --color-overlay | #ccd0da | #585b70 |
| --color-border | #bcc0cc | #6c7086 |
| --color-primary | #1e66f5 | #60a5fa |
| --color-success | #40a02b | #22c55e |
| --color-warning | #df8e1d | #f9e2af |
| --color-error | #d20f39 | #ef4444 |
| --color-card-bg | #ffffff | #313244 |
| --color-card-border | #ccd0da | #45475a |
| --color-input-bg | #ffffff | #313244 |
| --color-input-border | #bcc0cc | #6c7086 |
| --color-input-focus | #1e66f5 | #89b4fa |

Opacity variants: `/10` (backgrounds), `/30` (borders), `/50` (focus rings).

Hover tokens: Always use `-hover` token variants (e.g., `hover:bg-primary-hover`, `hover:text-primary-hover`), never opacity hacks like `/90`.

## Typography
- System font stack (no explicit family)
- Line height: 1.6 (body)
- Page title: `text-3xl font-bold`
- Section heading: `text-lg font-semibold` or `text-2xl font-bold`
- Label: `text-sm font-medium`
- Body: `text-base` (implicit)
- Metadata: `text-xs`
- Financial values: `tabular-nums` / `.currency`

## Depth
Borders-first system with selective shadows.
- Cards: `shadow-sm` default, `shadow-md` on hover
- Dropdowns: `shadow-lg`
- Modals: `shadow-xl`
- All cards have `border border-card-border`
- Focus: `focus:ring-2 focus:ring-primary/50` (standardized everywhere)

## Border Radius
- Small elements: `rounded` (6px)
- Inputs/buttons: `rounded-lg` (8px)
- Cards: `rounded-xl` (12px)
- Modals/sheets: `rounded-2xl` (16px)
- Pills/avatars: `rounded-full`

## Components

### Buttons
| Variant | Background | Text | Hover | Padding |
|---------|-----------|------|-------|---------|
| Primary | bg-primary | text-white | hover:bg-primary-hover | px-4 py-2 / px-6 py-3 |
| Secondary | bg-surface / transparent | text-fg | hover:bg-surface-alt | px-3 py-2 |
| Danger | bg-error | text-white | hover:bg-error-hover | px-4 py-2 |
| Success | bg-success | text-white | hover:bg-success-hover | px-4 py-2 |
| Icon | transparent | text-muted | hover:bg-surface | p-2 |
| Segmented | bg-card (container) | text-muted / text-white (active) | hover:bg-surface | px-3 py-2 |

Radius: `rounded-lg` or `rounded-xl`. Active: `active:opacity-90` or `active:scale-95`.

### Cards
- Border: `border border-card-border`
- Background: `bg-card`
- Padding: `p-4` or `p-6`
- Radius: `rounded-xl`
- Shadow: `shadow-sm`
- Status variants: `border-{status}/30 bg-{status}/10`

### Inputs
- Border: `border border-input-border`
- Background: `bg-input`
- Radius: `rounded-lg`
- Focus: `focus:border-input-focus focus:outline-none focus:ring-2 focus:ring-primary/50`
- Padding variants:
  - **Standard** (`px-4 py-3`): Standalone form pages with direct HTML inputs (settings, create workspace)
  - **Compact** (`px-3 py-2`): Forms using shared components (CurrencyInput, DateInput, etc.) and inline contexts
  - **Toolbar** (`px-2 py-1.5`): Filter bar and toolbar controls

### Navigation
- Desktop tabs: `rounded-t-lg border-b-2 px-4 py-2`
- Active: `border-primary text-primary font-medium`
- Bottom bar (mobile): `fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card`

### Badges
- `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium`
- Color: `bg-{status}/10 text-{status}`

## Layout
- Max width: `max-w-4xl`
- Container: `mx-auto max-w-4xl px-4`
- Page padding: `py-6` or `py-8`
- Primary breakpoint: `md:` (768px)
- Mobile-first responsive

## Z-Index
- Sticky headers: z-10
- Dropdowns: z-20
- Fixed elements: z-30/z-40
- Modals: z-40 (backdrop) / z-50 (content)

## Transitions
- Interactive elements: `transition-colors`
- Buttons: `transition-transform` (for scale)
- Respects `prefers-reduced-motion`
