import { type Page, expect, test } from '@playwright/test';

const STORAGE_KEY = 'nemischa.progress.v1';
const SESSION_SIZE = 15;

interface SavedProgress {
  cards: Record<string, { reps: number; due: number }>;
  days: Record<string, number>;
}

async function savedProgress(page: Page): Promise<SavedProgress> {
  const raw = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  return JSON.parse(raw ?? '{"cards":{},"days":{}}') as SavedProgress;
}

async function openTrainer(page: Page, query: string): Promise<void> {
  await page.goto(`./mashq/?${query}`);
  await expect(page.locator('.stats')).toBeVisible();
}

async function statValue(page: Page, label: string): Promise<string> {
  return (await page.locator('.stat', { hasText: label }).locator('dd').textContent()) ?? '';
}

test.describe('trainer', () => {
  test('the setup screen reflects the address and shows the scope size', async ({ page }) => {
    await openTrainer(page, 'level=A1&theme=2&mode=cards');
    await expect(page.locator('input[name=level][value=A1]')).toBeChecked();
    await expect(page.locator('select[name=theme]')).toHaveValue('2');
    expect(await statValue(page, 'Jami soʻz')).toBe('55');
    expect(await statValue(page, 'Oʻrganilgan')).toBe('0');
  });

  test('flashcards: reveal, grade, finish a session and keep the progress', async ({ page }) => {
    await openTrainer(page, 'level=A1&theme=2&mode=cards');
    await page.getByRole('button', { name: 'Boshlash' }).click();
    await expect(page.locator('[data-role=word]')).toContainText('Familie');
    await expect(page.locator('[data-role=answer]')).toHaveCount(0);

    for (let card = 0; card < SESSION_SIZE; card += 1) {
      await page.getByRole('button', { name: 'Javobni koʻrsatish' }).click();
      await expect(page.locator('[data-role=answer]')).toBeVisible();
      await page.getByRole('button', { name: 'Bildim' }).click();
    }

    await expect(page.getByRole('heading', { name: 'Mashq tugadi!' })).toBeVisible();
    const progress = await savedProgress(page);
    expect(Object.keys(progress.cards)).toHaveLength(SESSION_SIZE);
    expect(progress.cards.familie?.reps).toBe(1);

    await page.reload();
    await expect(page.locator('.stats')).toBeVisible();
    expect(await statValue(page, 'Oʻrganilgan')).toBe(String(SESSION_SIZE));
    expect(await statValue(page, 'Ketma-ket kun')).toBe('1');
  });

  test('a card answered "Bilmadim" comes back in the same session', async ({ page }) => {
    await openTrainer(page, 'level=A1&theme=2&mode=cards');
    await page.getByRole('button', { name: 'Boshlash' }).click();
    const firstWord = await page.locator('[data-role=word]').textContent();
    await page.getByRole('button', { name: 'Javobni koʻrsatish' }).click();
    await page.getByRole('button', { name: 'Bilmadim' }).click();
    await expect(page.locator('[data-role=position]')).toHaveText(`1 / ${SESSION_SIZE}`);

    for (let card = 0; card < SESSION_SIZE - 1; card += 1) {
      await page.getByRole('button', { name: 'Javobni koʻrsatish' }).click();
      await page.getByRole('button', { name: 'Bildim' }).click();
    }
    await expect(page.locator('[data-role=word]')).toHaveText(firstWord ?? '');
  });

  test('multiple choice marks a right and a wrong answer', async ({ page }) => {
    await openTrainer(page, 'level=A1&theme=2&mode=choice');
    await page.getByRole('button', { name: 'Boshlash' }).click();
    await expect(page.locator('[data-action=pick]')).toHaveCount(4);
    const background = (selector: string) =>
      page.locator(selector).first().evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(await background('[data-action=pick]')).toBe(await background('.panel')); // neutral, not primary

    await page.locator('[data-action=pick]', { hasText: /^oila$/ }).click();
    await expect(page.locator('[data-role=verdict]')).toHaveText('Toʻgʻri!');
    await page.getByRole('button', { name: 'Keyingisi' }).click();

    const answer = (await page.locator('[data-role=word]').textContent()) ?? '';
    const wrong = page.locator('[data-action=pick]').filter({ hasNotText: /^uchrashmoq$/ }).first();
    expect(answer).toContain('treffen');
    await wrong.click();
    await expect(page.locator('[data-role=verdict]')).toHaveText('Notoʻgʻri');
    await expect(page.locator('.choice.is-right')).toHaveText('uchrashmoq');

    const progress = await savedProgress(page);
    expect(progress.cards.familie?.reps).toBe(1);
  });

  test('the article quiz hides the article until an answer is given', async ({ page }) => {
    await openTrainer(page, 'level=A1&theme=2&mode=article');
    await page.getByRole('button', { name: 'Boshlash' }).click();
    await expect(page.locator('[data-role=word]')).toHaveText('Familie');
    await expect(page.locator('[data-action=pick]')).toHaveText(['der', 'die', 'das']);

    await page.locator('[data-action=pick]', { hasText: 'das' }).click();
    await expect(page.locator('[data-role=verdict]')).toHaveText('Notoʻgʻri');
    await expect(page.locator('[data-role=word]')).toHaveText('die Familie');
    await expect(page.locator('.choice.is-right')).toHaveText('die');
  });

  test('number keys answer a multiple-choice question', async ({ page, isMobile }) => {
    test.skip(isMobile, 'phones have no hardware keyboard');
    await openTrainer(page, 'level=A1&theme=2&mode=article');
    await page.getByRole('button', { name: 'Boshlash' }).click();
    await page.keyboard.press('2');
    await expect(page.locator('[data-role=verdict]')).toHaveText('Toʻgʻri!');
  });

  test('changing the level reloads the themes and updates the address', async ({ page }) => {
    await openTrainer(page, 'level=A1');
    await page.locator('label.pill', { hasText: 'B1' }).click();
    await expect(page).toHaveURL(/level=B1/);
    await expect(page.locator('select[name=theme] option')).toHaveCount(17);
    expect(await statValue(page, 'Jami soʻz')).toBe('835');
  });

  test('a finished scope offers to repeat instead of an empty session', async ({ page }) => {
    // Learn every word of one small theme through the interface, as a learner would.
    await openTrainer(page, 'level=C1&theme=3&mode=cards');
    const total = Number(await statValue(page, 'Jami soʻz'));
    for (let done = 0; done < total; ) {
      await page.getByRole('button', { name: /Boshlash|Yana mashq qilish/ }).click();
      const inSession = Math.min(SESSION_SIZE, total - done);
      for (let card = 0; card < inSession; card += 1) {
        await page.getByRole('button', { name: 'Javobni koʻrsatish' }).click();
        await page.getByRole('button', { name: 'Bildim' }).click();
      }
      done += inSession;
      await expect(page.getByRole('heading', { name: 'Mashq tugadi!' })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Yana mashq qilish' }).click();
    await expect(page.getByRole('heading', { name: 'Bugunga hammasi bajarildi' })).toBeVisible();
    const before = await savedProgress(page);
    await page.getByRole('button', { name: 'Baribir takrorlash' }).click();
    await expect(page.locator('[data-role=word]')).toBeVisible();
    await page.getByRole('button', { name: 'Javobni koʻrsatish' }).click();
    await page.getByRole('button', { name: 'Bildim' }).click();
    expect(await savedProgress(page)).toEqual(before); // extra practice does not stretch intervals
  });

  test('a theme that does not exist falls back to the whole level', async ({ page }) => {
    await openTrainer(page, 'level=A1&theme=999&mode=cards');
    await expect(page.locator('select[name=theme]')).toHaveValue('');
    expect(Number(await statValue(page, 'Jami soʻz'))).toBeGreaterThan(900);
    await page.getByRole('button', { name: 'Boshlash' }).click();
    await expect(page.locator('[data-role=word]')).toBeVisible();
  });

  test('the keyboard alone is enough: focus follows every step', async ({ page, isMobile }) => {
    test.skip(isMobile, 'phones have no hardware keyboard');
    await openTrainer(page, 'level=A1&theme=2&mode=cards');
    await page.locator('input[name=level][value=A1]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('input[name=level][value=A2]')).toBeChecked();
    await expect(page.locator('input[name=level][value=A2]')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('input[name=level][value=A1]')).toBeFocused();
    await expect(page.locator('.stats')).toBeVisible();

    await page.getByRole('button', { name: 'Boshlash' }).click();
    await expect(page.getByRole('button', { name: 'Javobni koʻrsatish' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Bilmadim' })).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Bildim' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-role=position]')).toHaveText(`2 / ${SESSION_SIZE}`);
    await expect(page.getByRole('button', { name: 'Javobni koʻrsatish' })).toBeFocused();
  });

  test('screen readers are told the word, the answer and the verdict', async ({ page }) => {
    const status = page.locator('#trainer-status');
    await openTrainer(page, 'level=A1&theme=2&mode=cards');
    await page.getByRole('button', { name: 'Boshlash' }).click();
    await expect(status).toHaveText('die Familie');
    await page.getByRole('button', { name: 'Javobni koʻrsatish' }).click();
    await expect(status).toHaveText('oila');

    await openTrainer(page, 'level=A1&theme=2&mode=article');
    await page.getByRole('button', { name: 'Boshlash' }).click();
    await expect(status).toHaveText('Familie');
    await page.locator('[data-action=pick]', { hasText: 'das' }).click();
    await expect(status).toHaveText('Notoʻgʻri. Toʻgʻri javob: die');
    await expect(page.locator('.choice.is-right')).toHaveAttribute('aria-label', 'die — toʻgʻri javob');
    await expect(page.locator('.choice.is-wrong')).toHaveAttribute('aria-label', 'das — notoʻgʻri javob');
    await expect(page.getByRole('button', { name: 'Keyingisi' })).toBeFocused();
  });

  test('progress saved in another tab is not overwritten', async ({ page, context }) => {
    await openTrainer(page, 'level=A1&theme=2&mode=cards');
    const other = await context.newPage();
    await other.goto('./mashq/?level=A1&theme=2&mode=cards');
    await expect(other.locator('.stats')).toBeVisible();
    await other.getByRole('button', { name: 'Boshlash' }).click();
    for (let card = 0; card < 3; card += 1) {
      await other.getByRole('button', { name: 'Javobni koʻrsatish' }).click();
      await other.getByRole('button', { name: 'Bildim' }).click();
    }
    await expect.poll(() => statValue(page, 'Oʻrganilgan')).toBe('3');

    await page.getByRole('button', { name: 'Boshlash' }).click();
    await page.getByRole('button', { name: 'Javobni koʻrsatish' }).click();
    await page.getByRole('button', { name: 'Bildim' }).click();
    expect(Object.keys((await savedProgress(page)).cards)).toHaveLength(4);
  });

  test('broken saved data does not break the page', async ({ page }) => {
    await page.goto('./mashq/');
    await page.evaluate((key) => window.localStorage.setItem(key, '{not json'), STORAGE_KEY);
    await openTrainer(page, 'level=A1&theme=2');
    expect(await statValue(page, 'Oʻrganilgan')).toBe('0');
  });
});
