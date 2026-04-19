import { expect, test } from '@playwright/test';

test('core navigation routes render without touching the camera flow', async ({ page }) => {
  await page.goto('/');

  const primaryNav = page.getByRole('navigation', { name: 'Primary' });
  const utilitiesNav = page.getByRole('navigation', { name: 'Utilities' });

  await expect(primaryNav.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
  await expect(primaryNav.getByRole('link', { name: 'Posture', exact: true })).toBeVisible();
  await expect(primaryNav.getByRole('link', { name: 'History', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /a calmer way to start your local desk-health review/i })).toBeVisible();

  await primaryNav.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await page.waitForURL('**/dashboard');
  await expect(page.getByRole('heading', { name: /today's summary/i })).toBeVisible();

  await utilitiesNav.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: /settings now cover reminders/i })).toBeVisible();

  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: /privacy and local data controls/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /export json/i })).toBeVisible();

  await primaryNav.getByRole('link', { name: 'Project', exact: true }).click();
  await expect(page.getByRole('heading', { name: /what last mile does/i })).toBeVisible();

  await primaryNav.getByRole('link', { name: 'History', exact: true }).click();
  await expect(page.getByRole('heading', { name: /review what happened over time/i })).toBeVisible();
});
