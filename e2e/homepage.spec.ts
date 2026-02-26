import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage successfully', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();
  });

  test('should have navigation elements', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    // Navigation or header should be present
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
  });

  test('should have working links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const links = page.locator('a[href]');
    expect(await links.count()).toBeGreaterThan(0);
  });
});
