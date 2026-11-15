import { test, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
test.beforeEach(async ({ page }) => {
  await page.route('http://localhost:4000/**', (route) => route.abort());
});
test('offline booking is queued, a PDF downloads, and reconnect confirms the demo request', async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  await page.goto('/en/booking/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page.getByLabel('Full name', { exact: true }).fill('Offline demo');
  await page.getByLabel('Email', { exact: true }).fill('offline@example.invalid');
  await page.getByLabel('I understand this is a demo and data is stored locally.').check();
  await page.getByRole('button', { name: 'Confirm booking', exact: true }).click();
  await expect(page.getByText('DEMO / queued', { exact: true })).toBeVisible();
  const id = await page.locator('.reference').textContent();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF estimate' }).click();
  const file = await (await downloaded).path();
  expect((await readFile(file!)).subarray(0, 5).toString()).toBe('%PDF-');
  await context.setOffline(false);
  await expect
    .poll(() =>
      page.evaluate(
        (id) =>
          new Promise<string>((resolve) => {
            const open = indexedDB.open('apex-studio');
            open.onsuccess = () => {
              const request = open.result.transaction('bookings').objectStore('bookings').get(id!);
              request.onsuccess = () => {
                resolve(request.result?.status || 'missing');
                open.result.close();
              };
            };
          }),
        id,
      ),
    )
    .toBe('confirmed');
});
test('GLB model loads, PNG export works, and portfolio screenshots are captured', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/en/');
  const enable = page.getByRole('button', { name: '3D ↗', exact: true });
  await enable
    .or(page.getByText('LIVE 3D EXPERIENCE', { exact: true }))
    .first()
    .waitFor();
  if (await enable.isVisible()) await enable.click();
  await page.getByText('LIVE 3D EXPERIENCE', { exact: true }).waitFor({ timeout: 30000 });
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save PNG', exact: true }).click();
  const file = await (await downloaded).path();
  expect((await readFile(file!)).subarray(1, 4).toString()).toBe('PNG');
  await mkdir('docs/media', { recursive: true });
  await page.screenshot({ path: 'docs/media/desktop.png' });
  for (let i = 0; i < 4; i++) {
    await page.locator('.car-viewport').screenshot({ path: `docs/media/scene-${i}.png` });
    await page.waitForTimeout(350);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/');
  await page.screenshot({ path: 'docs/media/mobile.png' });
});
