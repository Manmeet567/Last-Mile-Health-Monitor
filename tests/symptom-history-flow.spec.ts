import { expect, test } from '@playwright/test';

test('a saved symptom check-in persists locally and appears in combined history', async ({
  page,
}) => {
  await page.goto('/symptom-check-in');

  await page.getByRole('button', { name: 'Eye strain' }).click();
  await page.getByRole('button', { name: /continue/i }).click();
  await expect(
    page.getByRole('heading', { name: /how much did it affect you/i }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Save Symptom Check-In' }).click();

  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible();

  await page.reload();

  const recentEntries = page.locator('article').filter({
    has: page.getByRole('heading', { name: /symptom history for this browser/i }),
  });
  await expect(recentEntries).toContainText('Eye strain');

  await page.goto('/history');

  const dailyTimeline = page.locator('section').filter({
    has: page.getByRole('heading', {
      name: /matched day/i,
    }),
  });

  await expect(dailyTimeline).toContainText('Eye strain');
  await expect(dailyTimeline).toContainText('Symptoms reported that day');
});
