import { expect, test } from '@playwright/test';

test('combined history filters update local mixed posture and symptom history', async ({
  page,
}) => {
  await page.goto('/history');
  await page.waitForLoadState('networkidle');

  const seededDates = await page.evaluate(async () => {
    function toDateKey(date: Date) {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${date.getFullYear()}-${month}-${day}`;
    }

    function formatLabel(date: Date) {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(date);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('lastMileHealthMonitorDB');

      request.onupgradeneeded = () => {
        reject(new Error('IndexedDB schema was not initialized yet.'));
      };

      request.onsuccess = () => {
        try {
          const db = request.result;
          const transaction = db.transaction('dailyMetrics', 'readwrite');
          const store = transaction.objectStore('dailyMetrics');

          store.put({
            dateKey: toDateKey(today),
            totalMonitoringSec: 3600,
            totalSittingSec: 2400,
            goodPostureSec: 1800,
            mildSlouchSec: 600,
            deepSlouchSec: 0,
            totalBreaks: 3,
            longestSittingBoutSec: 1200,
            averageSittingBoutSec: 600,
            remindersTriggered: 1,
            sittingBoutCount: 4,
          });
          store.put({
            dateKey: toDateKey(yesterday),
            totalMonitoringSec: 2400,
            totalSittingSec: 1800,
            goodPostureSec: 200,
            mildSlouchSec: 400,
            deepSlouchSec: 1200,
            totalBreaks: 1,
            longestSittingBoutSec: 900,
            averageSittingBoutSec: 900,
            remindersTriggered: 2,
            sittingBoutCount: 2,
          });

          transaction.oncomplete = () => resolve();
          transaction.onerror = () =>
            reject(
              transaction.error ?? new Error('Failed to seed daily metrics.'),
            );
        } catch (error) {
          reject(
            error instanceof Error
              ? error
              : new Error('Failed to write seeded daily metrics.'),
          );
        }
      };

      request.onerror = () =>
        reject(request.error ?? new Error('Failed to open IndexedDB.'));
    });

    return {
      todayLabel: formatLabel(today),
      yesterdayLabel: formatLabel(yesterday),
    };
  });

  await page.goto('/symptom-check-in');
  await page.getByRole('button', { name: 'Eye strain' }).click();
  await page.getByRole('button', { name: /continue/i }).click();
  await expect(
    page.getByRole('heading', { name: /how much did it affect you/i }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Save Symptom Check-In' }).click();
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible();

  await page.goto('/history');

  const filteredHistory = page.locator('section').filter({
    has: page.getByRole('heading', { name: /matched day/i }),
  });

  await expect(filteredHistory.locator('article')).toHaveCount(2);
  await expect(filteredHistory).toContainText(seededDates.todayLabel);
  await expect(filteredHistory).toContainText(seededDates.yesterdayLabel);

  await page.getByRole('button', { name: 'All time' }).click();
  await page.getByRole('button', { name: 'All symptoms' }).first().click();
  await page.getByRole('option', { name: 'Eye strain' }).locator('button').click();
  await expect(page.getByRole('button', { name: 'Eye strain' }).first()).toBeVisible();
  await expect(filteredHistory.locator('article')).toHaveCount(1);
  await expect(filteredHistory).toContainText(seededDates.todayLabel);
  await expect(filteredHistory).not.toContainText(seededDates.yesterdayLabel);

  await page.getByRole('switch').click();
  await expect(filteredHistory.locator('article')).toHaveCount(1);

  await page.getByRole('button', { name: 'All states' }).first().click();
  await page.getByRole('option', { name: 'Deep slouch' }).locator('button').click();
  await expect(page.getByRole('button', { name: 'Deep slouch' }).first()).toBeVisible();
  await expect(filteredHistory.locator('article')).toHaveCount(0);
  await expect
    .poll(
      async (): Promise<string | null> =>
        page.evaluate(() =>
          window.localStorage.getItem('last-mile:combined-history-filters'),
        ),
    )
    .not.toBeNull();

  const persistedFiltersRaw = await page.evaluate(() =>
    window.localStorage.getItem('last-mile:combined-history-filters'),
  );
  expect(JSON.parse(persistedFiltersRaw ?? 'null')).toMatchObject({
    dateRange: 'all',
    symptomLabel: 'Eye strain',
    onlyDaysWithSymptoms: true,
    postureStateLabel: 'Deep slouch',
  });

  await page.reload();

  await expect(page.getByRole('button', { name: 'All time' })).toBeVisible();
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('button', { name: 'Eye strain' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Deep slouch' }).first()).toBeVisible();
  await expect(filteredHistory.locator('article')).toHaveCount(0);
});
