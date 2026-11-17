import { expect, test } from '@playwright/test';

test.describe('dictionary pages', () => {
  test('the home page lists all five levels', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Nemis tili');
    for (const level of ['A1', 'A2', 'B1', 'B2', 'C1']) {
      await expect(page.locator('.level-code', { hasText: level })).toBeVisible();
    }
  });

  test('search finds a German word and opens its page', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('searchbox').fill('haus');
    const first = page.locator('.search-results a').first();
    await expect(first).toContainText('Haus');
    await first.click();
    await expect(page).toHaveURL(/\/soz\/haus\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Haus');
    await expect(page.locator('.word-meaning')).toHaveText('uy');
    await expect(page.locator('.facts')).toContainText('die Häuser');
  });

  test('search understands Uzbek typed with a plain apostrophe', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('searchbox').fill("o'qituvchi");
    await expect(page.locator('.search-results a').first()).toContainText('Lehrer');
  });

  test('search says so when nothing matches', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('searchbox').fill('qqqqzzzz');
    await expect(page.locator('.search-results')).toContainText('Hech narsa topilmadi');
  });

  test('a level leads to its themes and a theme to its words', async ({ page }) => {
    await page.goto('./');
    await page.locator('.card-link', { hasText: 'A1' }).first().click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('A1 darajasi');
    await page.locator('.card-link', { hasText: 'Oila va doʻstlar' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Oila va doʻstlar');
    const family = page.locator('.word-row', { hasText: 'Familie' });
    await expect(family).toContainText('die');
    await expect(family).toContainText('oila');
  });

  test('an unknown address shows the not-found page', async ({ page }) => {
    const response = await page.goto('./bunday-sahifa-yoq/');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sahifa topilmadi');
  });

  for (const path of ['./', './a1/', './a1/familie-freunde/', './soz/haus/', './mashq/', './anki/']) {
    test(`${path} fits the screen width`, async ({ page }) => {
      await page.goto(path);
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflows).toBe(false);
    });
  }

  test('the Anki page offers a deck for every level', async ({ page }) => {
    await page.goto('./anki/');
    await expect(page.locator('.download-list a')).toHaveCount(5);
    const href = await page.locator('.download-list a').first().getAttribute('href');
    const response = await page.request.get(href ?? '');
    expect(response.ok()).toBe(true);
  });
});
