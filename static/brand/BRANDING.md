# TinyLedger Brand Guide

## Brand Overview

**Name:** TinyLedger (one word, camelCase)
**Mascot:** Penny the Hedgehog
**Tagline:** Personal bookkeeping for sole proprietors

## Personality

- Friendly and approachable nerd helper
- Minimal but warm
- Cozy, storybook aesthetic
- Trustworthy - guards your finances

## Visual Style

| Aspect | Direction |
|--------|-----------|
| **Aesthetic** | Children's book illustration (Beatrix Potter-esque) |
| **Technique** | Soft pencil lines, watercolor wash, gentle shading |
| **Colors** | Warm browns, tans, sepia tones, cream backgrounds |
| **Mood** | Friendly, cozy, approachable, slightly nerdy |

## Logo Concept

The primary logo is a **Ti monogram** where the **T is a vintage balance scale** with two weighing pans hanging from chains. This represents:
- The "Ti" from "TinyLedger"
- Balance/bookkeeping theme
- Careful, measured approach to finances

## Color Palette

### Brand Illustration Colors (Penny & Assets)
- Warm browns and tans (natural hedgehog tones)
- Sepia/brown ink for linework
- Cream/off-white backgrounds
- Red polka-dot accent (Penny's bowtie)

### UI Colors (Catppuccin - separate from illustrations)
| Role | Light Mode | Dark Mode |
|------|------------|-----------|
| Primary | `#1e66f5` | `#89b4fa` |
| Background | `#eff1f5` | `#1e1e2e` |
| Foreground | `#4c4f69` | `#cdd6f4` |

## Brand Assets

### Primary Assets

| Asset | File | Dimensions | Usage |
|-------|------|------------|-------|
| **Ti Logo** | `ti-logo.png` | 1024x1024 | App icon, favicon base |
| **Wordmark** | `wordmark.png` | Wide | Headers, about pages |
| **Hero Banner** | `hero-banner.png` | 3:1 wide | GitHub README, marketing |
| **Mascot (sitting)** | `mascot-sitting.png` | Square | Social, marketing |
| **Mascot (curled)** | `mascot-curled.png` | Wide | Alternative mascot |

### Asset Usage

**Ti Logo (`ti-logo.png`)**
- Use as app icon (iOS, Android, PWA)
- Use as favicon (generate smaller sizes)
- Use when space is limited

**Wordmark (`wordmark.png`)**
- Full "TinyLedger" with T as balance scale
- Use in headers, about pages, documentation
- Hand-drawn sketchy serif style

**Hero Banner (`hero-banner.png`)**
- Complete scene: wordmark + Penny + woodland/accounting elements
- Use for GitHub README header
- Use for social media covers

**Mascot Images**
- `mascot-sitting.png`: Penny sitting, clean background - good for avatars, social
- `mascot-curled.png`: Original curled pose - alternative usage

## Penny the Hedgehog

### Character Description
A cute baby hedgehog in a children's book illustration style. She sits in a cozy pose, wearing small round glasses and a red polka-dot bowtie. Natural hedgehog coloring with warm browns and tans. Soft, friendly expression. Approachable and slightly nerdy.

### Why a Hedgehog?
- "Tiny" — hedgehogs are small, name synergy
- Protective — they curl up to guard things (your finances)
- Careful & methodical — how bookkeeping should be
- Underused — not the typical tech mascot

### Character Prompt (for regeneration)
```
A cute baby hedgehog character named Penny in a children's book illustration style.
She is sitting in a cozy pose, wearing small round glasses and a red polka-dot bowtie.
Natural hedgehog coloring with warm browns and tans. Soft, friendly expression with
big eyes. The style should be like a classic storybook illustration - soft edges,
gentle shading, warm and inviting. Simple warm cream/off-white background. The
hedgehog should look approachable and slightly nerdy.
```

## Typography

### Wordmark
- Hand-drawn sketchy serif style
- T designed as balance scale
- Warm brown ink appearance
- Watercolor wash/coffee stain effect underneath

### UI Typography
- Use system fonts or clean sans-serif for UI
- Reserve hand-drawn style for brand assets only

## Generating App Icons

From `ti-logo.png`, generate these sizes:

```bash
# Using ImageMagick
convert ti-logo.png -resize 512x512 icon-512.png
convert ti-logo.png -resize 192x192 icon-192.png
convert ti-logo.png -resize 180x180 icon-180.png
convert ti-logo.png -resize 32x32 -resize 16x16 -resize 48x48 favicon.ico
```

## Do's and Don'ts

### Do
- Keep the storybook illustration style consistent
- Use warm, earthy tones for brand materials
- Let Penny be friendly and approachable
- Maintain the hand-drawn quality in wordmarks

### Don't
- Mix the illustrated style with flat/digital UI icons
- Use cold or stark colors for brand materials
- Over-complicate the Ti logo
- Add gradients or effects that break the storybook aesthetic
