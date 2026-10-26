/**
 * Renders the app icons (PWA manifest and Apple touch icon) from the same abacus drawing as public/favicon.svg.
 * Run once after changing the logo: `node scripts/build-icons.ts`. Uses the Chromium that Playwright installs.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const RED = '#b3122e';
const abacus = `
  <rect x="15.2" y="6" width="1.6" height="20" rx=".8" fill="#fbe8ea"/>
  <ellipse cx="16" cy="10.5" rx="6.2" ry="2.6" fill="#fff"/>
  <ellipse cx="16" cy="17.5" rx="6.2" ry="2.6" fill="#fbd3d9"/>
  <ellipse cx="16" cy="22.5" rx="6.2" ry="2.6" fill="#fbd3d9"/>
  <rect x="7" y="13.4" width="18" height="1.6" rx=".8" fill="#fbe8ea"/>`;

// Regular icon: rounded tile on a transparent background, like the favicon.
const regular = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="9" fill="${RED}"/>${abacus}</svg>`;
// Maskable icon: full-bleed background, drawing kept inside the central safe zone (80 % circle).
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${RED}"/><g transform="translate(16 16) scale(0.72) translate(-16 -16)">${abacus}</g></svg>`;
// Apple touch icon: iOS rounds the corners itself and does not support transparency.
const apple = maskable;

const outDir = join(import.meta.dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, svg, size] of [
  ['icon-192.png', regular, 192],
  ['icon-512.png', regular, 512],
  ['icon-maskable-512.png', maskable, 512],
  ['apple-touch-icon.png', apple, 180],
] as const) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.locator('svg').screenshot({ path: join(outDir, file), omitBackground: true });
  console.log(`${file} (${size}×${size})`);
}
await browser.close();
