# TinyLedger Brand Guide

## Mascot: Penny the Hedgehog

**Character description:**
A cute baby hedgehog in a children's book illustration style. Sitting in a cozy pose, wearing small round glasses and a polka-dot red bowtie. Natural hedgehog coloring with warm browns and tans. Soft, friendly expression with big eyes. Approachable and slightly nerdy.

**Working prompt (v1 - approved):**
```
A cute baby hedgehog character named Penny in a children's book illustration style.
She is sitting in a cozy pose, wearing small round glasses and a tiny bowtie.
Natural hedgehog coloring with warm browns and tans. Soft, friendly expression with
big eyes. The style should be like a classic storybook illustration - soft edges,
gentle shading, warm and inviting. Simple warm cream/off-white background. The
hedgehog should look approachable and slightly nerdy. No text.
```

## Visual Style

- **Aesthetic:** Children's book illustration, storybook feel
- **Technique:** Soft pencil/watercolor, gentle shading, soft edges
- **Colors:** Warm browns, tans, cream backgrounds
- **Mood:** Friendly, cozy, approachable, slightly nerdy

## Color Palette

Primary colors from Catppuccin (for UI, not mascot):
- Primary Blue: `#1e66f5`
- Light Base: `#eff1f5`
- Dark Base: `#1e1e2e`

Penny's palette (natural/earthy):
- Warm browns for spines
- Cream/tan for face and belly
- Red polka-dot bowtie accent

## Typography

- App name: **TinyLedger** (one word, camelCase)
- For illustrated materials: Match the storybook aesthetic

## Assets

| Asset | Location | Notes |
|-------|----------|-------|
| Penny (sitting) | `static/brand/mascot-sitting.png` | Base character with background |
| Penny (transparent) | `static/brand/mascot-sitting-transparent.png` | For overlays and compositing |
| App icons | `static/icons/` | Generated from Penny sitting |
| Hero banner | `static/brand/hero-banner.png` | GitHub README header |
| Logo | `static/brand/ti-logo.png` | TinyLedger logo |
| Wordmark | `static/brand/wordmark.png` | Text-only branding |

## Generating New Assets

For transparent backgrounds, use the `/openai-image` skill with `gpt-image-1.5`:
- Gemini/nanobanana does not support transparency
- OpenAI's `background: "transparent"` parameter works well

Example to regenerate Penny with transparency:
```bash
# Edit existing image to remove background
curl -s https://api.openai.com/v1/images/edits \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F "model=gpt-image-1.5" \
  -F "image=@static/brand/mascot-sitting.png" \
  -F "prompt=Remove background, keep only the hedgehog, transparent background" \
  -F "background=transparent" \
  -F "output_format=png" \
  | jq -r '.data[0].b64_json' | base64 --decode > output.png
```
