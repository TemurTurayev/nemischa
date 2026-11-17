import { describe, expect, it } from 'vitest';
import { isDue, isLearned, review } from '../src/trainer/scheduler';

const TODAY = 20_000;

describe('review', () => {
  it('schedules a new card for tomorrow after a correct answer', () => {
    const card = review(undefined, 'good', TODAY);
    expect(card).toEqual({ reps: 1, interval: 1, ease: 2.5, due: TODAY + 1, lapses: 0 });
  });

  it('grows the interval on every further correct answer', () => {
    const first = review(undefined, 'good', TODAY);
    const second = review(first, 'good', first.due);
    const third = review(second, 'good', second.due);
    expect(second.interval).toBe(3);
    expect(third.interval).toBe(8); // 3 days × ease 2.5, rounded
    expect(third.due).toBe(second.due + 8);
  });

  it('keeps a forgotten card due today and counts the lapse', () => {
    const learned = review(review(undefined, 'good', TODAY), 'good', TODAY + 1);
    const forgotten = review(learned, 'again', TODAY + 4);
    expect(forgotten).toMatchObject({ reps: 0, interval: 0, due: TODAY + 4, lapses: 1 });
    expect(forgotten.ease).toBeCloseTo(2.3);
  });

  it('does not count a lapse for a card that was never learned', () => {
    expect(review(undefined, 'again', TODAY).lapses).toBe(0);
  });

  it('grows the interval slowly and lowers the ease after a hard answer', () => {
    const learned = review(review(undefined, 'good', TODAY), 'good', TODAY + 1);
    const hard = review(learned, 'hard', TODAY + 4);
    expect(hard.interval).toBe(4); // 3 days × 1.2, at least one day longer
    expect(hard.ease).toBeCloseTo(2.35);
  });

  it('never lets the ease fall below the minimum', () => {
    let card = review(undefined, 'good', TODAY);
    for (let i = 0; i < 20; i += 1) card = review(card, 'again', TODAY);
    expect(card.ease).toBeCloseTo(1.3);
  });

  it('returns a new object and leaves the input untouched', () => {
    const before = review(undefined, 'good', TODAY);
    const snapshot = { ...before };
    review(before, 'good', TODAY + 1);
    expect(before).toEqual(snapshot);
  });
});

describe('isDue and isLearned', () => {
  it('treats a card as due on and after its due day', () => {
    const card = review(undefined, 'good', TODAY);
    expect(isDue(card, TODAY)).toBe(false);
    expect(isDue(card, TODAY + 1)).toBe(true);
    expect(isDue(card, TODAY + 9)).toBe(true);
  });

  it('counts a card as learned once it was answered correctly', () => {
    expect(isLearned(review(undefined, 'again', TODAY))).toBe(false);
    expect(isLearned(review(undefined, 'hard', TODAY))).toBe(true);
  });
});
