import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.route('http://localhost:4000/**', (route) => route.abort());
});
test('configuration → demo booking → confirmation and email preview', async ({ page }) => {
  await page.goto('/en/');
  await page.getByLabel('Preset', { exact: true }).selectOption('track');
  await page.getByRole('link', { name: 'Book this configuration' }).click();
  await expect(page.getByText('TRACK · black · light')).toBeVisible();
  await page.getByLabel('Full name', { exact: true }).fill('Demo visitor');
  await page.getByLabel('Email', { exact: true }).fill('demo@example.invalid');
  await page.getByLabel('I understand this is a demo and data is stored locally.').check();
  await page.getByRole('button', { name: 'Confirm booking', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Request summary', exact: true })).toBeVisible();
  await expect(page.getByText('Email preview', { exact: true })).toBeVisible();
  await expect(page.getByText('DEMO / confirmed', { exact: true })).toBeVisible();
});
test('cart survives reload and produces an explicit unpaid demo order', async ({ page }) => {
  await page.goto('/en/shop/');
  const product = page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'pH-neutral wash', exact: true }) });
  await product.getByRole('button', { name: 'Add to cart' }).click();
  await page.reload();
  await expect(page.getByRole('spinbutton', { name: 'pH-neutral wash' })).toHaveValue('1');
  await page.getByRole('button', { name: 'Place a demo order' }).click();
  await expect(page.getByText('Demo order saved. No payment was collected.')).toBeVisible();
  await page.goto('/en/account/');
  await page.getByRole('button', { name: 'Open demo account' }).click();
  await expect(page.getByText('demo / demo_no_payment', { exact: true })).toBeVisible();
});
test('Angular demo admin enters calendar, filters customers and respects manager role', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:4174');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await page.getByRole('button', { name: 'Enter as demo admin' }).click();
  await expect(page.getByRole('heading', { name: 'Calendar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '02 / Customers' }).click();
  await page.getByLabel('Find a customer').fill('demo24@');
  await expect(
    page.getByRole('cell', { name: 'demo24@example.invalid', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Demo role').selectOption('manager');
  await expect(page.getByRole('button', { name: 'customer → manager' })).toBeDisabled();
  await page.getByRole('button', { name: '03 / Reports' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Excel' }).click();
  expect((await download).suggestedFilename()).toBe('apex-report.xlsx');
});
test('mobile layout and keyboard command palette', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/en/');
  await page
    .getByText('STATIC VIEW', { exact: true })
    .or(page.getByText('LIVE 3D EXPERIENCE', { exact: true }))
    .first()
    .waitFor();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByPlaceholder('Find a section…').fill('Services');
  await page.getByRole('dialog').getByRole('link', { name: 'Services' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
