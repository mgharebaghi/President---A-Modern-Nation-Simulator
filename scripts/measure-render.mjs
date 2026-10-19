import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { cpus, totalmem, platform, release } from 'node:os';

// Local diagnostics against a running development server. Never a CI FPS gate.
const software = process.argv.includes('--software');
const hardware = process.argv.includes('--hardware');
const browser = await chromium.launch({ headless: true, args: software ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : hardware ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
try {
  const viewport = hardware ? { width: 1920, height: 1080 } : { width: 1440, height: 1000 };
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:5173');
  await page.locator('canvas').waitFor();
  const session = await page.context().newCDPSession(page);
  await session.send('Performance.enable');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  const measurements = [];
  for (const quality of ['high', 'medium', 'low']) {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: quality[0].toUpperCase() + quality.slice(1), exact: true }).click();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2500);
    const samples = [];
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(1100);
      samples.push(await page.evaluate(() => window.__presidentRender));
    }
    const metrics = await session.send('Performance.getMetrics');
    measurements.push({ quality, samples, jsHeapUsedBytes: metrics.metrics.find(item => item.name === 'JSHeapUsedSize')?.value });
  }
  const report = {
    date: new Date().toISOString(), mode: software ? 'forced SwiftShader' : hardware ? 'requested D3D11 hardware renderer (verify actual renderer field)' : 'default browser renderer',
    browser: browser.version(), os: `${platform()} ${release()}`, cpu: cpus()[0]?.model, ramGiB: Math.round(totalmem() / 2 ** 30),
    viewport, paused: true,
    notes: '6 one-second samples per quality after 2.5s warm-up. Frame time is interval mean, not p95. JS heap excludes GPU/process memory. No human performance approval implied.',
    measurements,
  };
  await mkdir('test-results', { recursive: true });
  const path = `test-results/render-${software ? 'software' : hardware ? 'hardware' : 'default'}.json`;
  await writeFile(path, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, measurements: measurements.map(item => ({ quality: item.quality, fps: item.samples.map(sample => sample.stats?.fps), frameMs: item.samples.map(sample => sample.stats?.frameMs), renderer: item.samples[0]?.renderer, calls: item.samples[0]?.stats?.calls, triangles: item.samples[0]?.stats?.triangles, canvas: item.samples[0]?.canvas, jsHeapMiB: Math.round(item.jsHeapUsedBytes / 2 ** 20) })), path }, null, 2));
} finally { await browser.close(); }
