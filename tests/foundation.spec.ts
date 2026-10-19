import { expect, test } from '@playwright/test';

test('capital, bilingual landmarks, camera and simulation clock', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByTestId('simulation-time')).toHaveText('۰۸:۰۰');
  await expect(page.getByRole('button', { name: 'ادامه', exact: true })).toBeEnabled();
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByTestId('simulation-date')).toHaveText('1 January 2026');
  const hospitalPoint = await page.evaluate(() => (window as unknown as { __presidentRender: { landmarks: { id: string; x: number; y: number }[] } }).__presidentRender.landmarks.find(item => item.id === 'civic-hospital')!);
  const canvasBounds = (await page.locator('canvas').boundingBox())!;
  await page.mouse.click(canvasBounds.x + canvasBounds.width * hospitalPoint.x, canvasBounds.y + canvasBounds.height * hospitalPoint.y);
  await expect(page.getByRole('heading', { name: 'Darvan Central Hospital' })).toBeVisible();
  await page.getByRole('button', { name: /01 Presidential Palace/ }).click();
  await expect(page.getByRole('heading', { name: 'Presidential Palace' })).toBeVisible();
  await page.getByRole('button', { name: 'Focus on building' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __presidentRender: { target: number[] } }).__presidentRender.target[2])).toBeLessThan(-25);
  await page.getByRole('button', { name: 'Reset camera', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __presidentRender: { target: number[] } }).__presidentRender.target[2])).toBeGreaterThan(-7);
  await page.getByRole('button', { name: '24 game hours / second' }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByTestId('clock-status')).toHaveText('LIVE');
  await expect(page.getByTestId('simulation-date')).not.toHaveText('1 January 2026');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByTestId('clock-status')).toHaveText('PAUSED');
  const pausedTime = await page.getByTestId('simulation-time').textContent();
  await page.waitForTimeout(400);
  await expect(page.getByTestId('simulation-time')).toHaveText(pausedTime!);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Low', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __presidentRender: { quality: string } }).__presidentRender.quality)).toBe('low');
  await page.getByRole('button', { name: 'فارسی', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.reload();
  await expect(page.getByTestId('simulation-time')).toHaveText('۰۸:۰۰');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
  expect(errors).toEqual([]);
});

test('mobile view fits and landmark controls work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'نمایش مشخصات', exact: true }).click();
  await expect(page.getByRole('button', { name: /کاخ ریاست‌جمهوری/ })).toBeVisible();
  await page.getByRole('button', { name: /کاخ ریاست‌جمهوری/ }).click();
  await expect(page.getByRole('heading', { name: 'کاخ ریاست‌جمهوری' })).toBeVisible();
});

test('night lighting follows the authoritative clock and remains paused with it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  // Use the normal clock: locator actionability on software WebGL may take
  // seconds. A fast-forward clock can legitimately reach the next morning.
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.waitForFunction(() => {
    const render = (window as unknown as { __presidentRender?: { hour: number; lights: number } }).__presidentRender;
    return render && render.hour >= 21 && render.hour <= 23 && render.lights > 2;
  });
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByTestId('clock-status')).toHaveText('PAUSED');
  const paused = await page.evaluate(() => (window as unknown as { __presidentRender: { elapsedHours: number; hour: number; lights: number } }).__presidentRender);
  expect(paused.elapsedHours).toBeGreaterThan(0);
  await expect(page.getByTestId('simulation-time')).toHaveText(`${String(paused.hour).padStart(2, '0')}:00`);
  // The stopped phase must match the actual stopped hour, not the earlier
  // hour at which the automation first observed nighttime.
  if (paused.hour >= 20 || paused.hour < 5) expect(paused.lights).toBeGreaterThan(2);
  else if (paused.hour >= 8 && paused.hour <= 16) expect(paused.lights).toBe(0);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as unknown as { __presidentRender: { elapsedHours: number } }).__presidentRender.elapsedHours)).toBe(paused.elapsedHours);
});
