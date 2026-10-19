import { withPreview } from './with-preview.mjs';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

await withPreview(async url => {
const hardware = process.argv.includes('--hardware');
const browser = await chromium.launch({ headless: true, args: hardware ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  await mkdir('docs/screenshots', { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(url);
  await page.locator('canvas').waitFor();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'docs/screenshots/capital-fa.png' });
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await page.screenshot({ path: 'docs/screenshots/capital-en.png' });
  await page.getByRole('button', { name: '1 game hours / second' }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.waitForFunction(() => { const hour = window.__presidentRender?.hour; return hour >= 21 && hour <= 23; });
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'docs/screenshots/capital-night.png' });
  await page.reload();
  await page.locator('canvas').waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/screenshots/capital-mobile.png', fullPage: true });
  console.log('Captured Persian, English, night and mobile previews from actual UI.');
} finally { await browser.close(); }

});
