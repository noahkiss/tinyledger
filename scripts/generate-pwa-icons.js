// Generate PWA icons from SVG source
// Usage: node scripts/generate-pwa-icons.js

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'static', 'icons');
const sourcePath = join(iconsDir, 'icon.svg');

const sizes = [
  { size: 180, name: 'icon-180.png' },    // Apple touch icon
  { size: 192, name: 'icon-192.png' },    // PWA minimum
  { size: 512, name: 'icon-512.png' },    // PWA splash
];

async function generateIcons() {
  console.log('Generating PWA icons from', sourcePath);

  // Generate standard icons
  for (const { size, name } of sizes) {
    await sharp(sourcePath)
      .resize(size, size)
      .png()
      .toFile(join(iconsDir, name));
    console.log(`  Created ${name} (${size}x${size})`);
  }

  // Generate maskable icon with 10% safe zone padding
  const maskableSize = 512;
  const padding = Math.floor(maskableSize * 0.1); // 10% padding on each side
  const innerSize = maskableSize - (padding * 2); // 80% of the total size

  await sharp(sourcePath)
    .resize(innerSize, innerSize)
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .png()
    .toFile(join(iconsDir, 'icon-512-maskable.png'));
  console.log(`  Created icon-512-maskable.png (${maskableSize}x${maskableSize} with safe zone)`);

  console.log('Done!');
}

generateIcons().catch(console.error);
