import { expect, test } from '@playwright/test';

test('core navigation routes render without touching the camera flow', async ({ page }) => {
  await page.goto('/');

  const primaryNav = page.getByRole('navigation', { name: 'Primary' });

  await expect(primaryNav.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
  await expect(primaryNav.getByRole('link', { name: 'History', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /local posture dashboard/i })).toBeVisible();

  await primaryNav.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: /settings now cover reminders/i })).toBeVisible();

  await primaryNav.getByRole('link', { name: 'Privacy', exact: true }).click();
  await expect(page.getByRole('heading', { name: /privacy and local data controls/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /export json/i })).toBeVisible();

  await primaryNav.getByRole('link', { name: 'History', exact: true }).click();
  await expect(page.getByRole('heading', { name: /local trends and saved monitoring sessions/i })).toBeVisible();
});
