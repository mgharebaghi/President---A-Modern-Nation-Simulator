import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { withPreview } from './with-preview.mjs';
await withPreview(async url => {
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  try {
    await mkdir('docs/screenshots', { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(url); await page.locator('canvas').waitFor();
    await page.getByRole('button', { name: 'Switch to English' }).click();
    await page.getByRole('button', { name: 'Open treasury & projects' }).click();
    await page.getByRole('button', { name: 'Fund power station', exact: true }).click();
    await page.getByRole('button', { name: 'Save current game', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Game saved' }).waitFor();
    await page.screenshot({ path: 'docs/screenshots/phase02-management-en.png', fullPage: true });
    await page.getByRole('button', { name: 'View construction site' }).click();
    await page.getByRole('button', { name: 'Close treasury & projects' }).click();
    await page.getByRole('button', { name: '6 game hours / second' }).click();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await page.waitForFunction(() => window.__presidentRender?.elapsedHours >= 55);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByTestId('clock-status').filter({ hasText: 'PAUSED' }).waitFor();
    await page.screenshot({ path: 'docs/screenshots/phase02-construction.png' });
    await page.getByRole('button', { name: '24 game hours / second' }).click();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await page.getByTestId('project-status').filter({ hasText: 'Operational' }).waitFor();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.screenshot({ path: 'docs/screenshots/phase02-operational.png' });
    console.log(JSON.stringify(await page.evaluate(() => window.__presidentRender)));
    await page.getByRole('button', { name: 'تغییر به فارسی' }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'نمایش خزانه و پروژه‌ها' }).click();
    await page.screenshot({ path: 'docs/screenshots/phase02-mobile-fa.png', fullPage: true });
    console.log('Captured phase-02 management, construction, completed plant and Persian mobile UI.');
  } finally { await browser.close(); }
});
