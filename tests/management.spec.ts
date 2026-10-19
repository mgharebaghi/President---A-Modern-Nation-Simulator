import { expect, test } from '@playwright/test';

test('fund, construct, persist and restore the same power station and treasury', async ({ page }) => {
  test.setTimeout(100_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await page.getByRole('button', { name: 'Open treasury & projects' }).click();
  await page.getByRole('button', { name: 'Fund power station', exact: true }).click();
  await expect(page.getByTestId('treasury')).toHaveText('26,000,000 credits');
  await expect(page.getByRole('button', { name: 'Fund power station', exact: true })).toBeDisabled();
  await expect(page.getByTestId('project-status')).toContainText('Under construction');
  await expect(page.getByTestId('energy')).toHaveText('100 / 140 MW');
  await page.getByRole('button', { name: 'Close treasury & projects' }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByTestId('simulation-time')).not.toHaveText('08:00');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const time = await page.getByTestId('simulation-time').textContent();
  await page.getByRole('button', { name: 'Open treasury & projects' }).click();
  const remaining = await page.getByTestId('remaining').textContent();
  await page.getByRole('button', { name: 'Save current game', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Game saved');
  await page.reload();
  await expect(page.getByTestId('treasury')).toHaveText('50,000,000 credits');
  await page.getByRole('button', { name: 'Open treasury & projects' }).click();
  await page.getByRole('button', { name: 'Restore saved game', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Saved game restored · paused');
  await expect(page.getByTestId('simulation-time')).toHaveText(time!);
  await expect(page.getByTestId('remaining')).toHaveText(remaining!);
  await expect(page.getByTestId('treasury')).toHaveText('26,000,000 credits');
  await page.getByRole('button', { name: 'View construction site' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __presidentRender: { target: number[] } }).__presidentRender.target[0])).toBeGreaterThan(110);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __presidentRender: { project: { scaffoldingVisible: boolean } } }).__presidentRender.project.scaffoldingVisible)).toBe(true);
  await page.getByRole('button', { name: 'Close treasury & projects' }).click();
  await page.getByRole('button', { name: '24 game hours / second' }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByTestId('project-status')).toContainText('Operational', { timeout: 20_000 });
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByTestId('energy')).toHaveText('180 / 140 MW');
  const project = await page.evaluate(() => (window as unknown as { __presidentRender: { project: { stage: string; scaffoldingVisible: boolean; structureVisible: boolean } } }).__presidentRender.project);
  expect(project).toMatchObject({ stage: 'operational', scaffoldingVisible: false, structureVisible: true });
  await page.getByRole('button', { name: 'Open treasury & projects' }).click();
  await page.getByRole('button', { name: 'Save current game', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Game saved');
  const treasury = await page.getByTestId('treasury').textContent();
  await page.reload(); await page.getByRole('button', { name: 'Open treasury & projects' }).click();
  await page.getByRole('button', { name: 'Restore saved game', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Saved game restored · paused');
  await expect(page.getByTestId('energy')).toHaveText('180 / 140 MW');
  await expect(page.getByTestId('treasury')).toHaveText(treasury!);
  // Corruption after discovery must be rejected on restore, leaving the active game intact.
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open('president-saves', 1);
      r.onsuccess = () => {
        const db = r.result, tx = db.transaction('slots', 'readwrite'), store = tx.objectStore('slots');
        const get = store.get('current'); get.onsuccess = () => { const slot = get.result; slot.game.version = 99; store.put(slot, 'current'); };
        tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); reject(tx.error); };
      };
    });
  });
  await page.getByRole('button', { name: 'Restore saved game', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Save or restore failed');
  await expect(page.getByTestId('treasury')).toHaveText(treasury!);
  await expect(page.getByTestId('energy')).toHaveText('180 / 140 MW');
  expect(errors).toEqual([]);
});

test('Persian management fits mobile and storage failure remains recoverable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => { Object.defineProperty(window, 'indexedDB', { get() { throw new Error('Storage disabled'); } }); });
  await page.goto('/');
  await page.getByRole('button', { name: 'نمایش خزانه و پروژه‌ها' }).click();
  await expect(page.getByRole('status')).toContainText('ذخیره خوانده نشد');
  await page.getByRole('button', { name: 'ذخیرهٔ بازی فعلی', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('ذخیره یا بازیابی انجام نشد');
  await page.getByRole('button', { name: 'تأمین مالی نیروگاه', exact: true }).click();
  await expect(page.getByTestId('treasury')).toHaveText('۲۶٬۰۰۰٬۰۰۰ اعتبار');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'بازیابی ذخیره', exact: true })).toBeDisabled();
});
