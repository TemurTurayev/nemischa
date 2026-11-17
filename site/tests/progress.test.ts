import { describe, expect, it } from 'vitest';
import {
  EMPTY_PROGRESS,
  countLearned,
  dueIds,
  newIds,
  parseProgress,
  recordReview,
  streak,
} from '../src/trainer/progress';
import { afterAnswer, planSession } from '../src/trainer/session';

const TODAY = 20_000;
const IDS = ['haus', 'tag', 'gehen', 'gut'];

describe('recordReview', () => {
  it('stores the card and counts the review for that day', () => {
    const progress = recordReview(EMPTY_PROGRESS, 'haus', 'good', TODAY);
    expect(progress.cards.haus?.due).toBe(TODAY + 1);
    expect(progress.days[String(TODAY)]).toBe(1);
  });

  it('does not change the progress it was given', () => {
    recordReview(EMPTY_PROGRESS, 'haus', 'good', TODAY);
    expect(EMPTY_PROGRESS).toEqual({ version: 1, cards: {}, days: {} });
  });
});

describe('queries', () => {
  const seen = recordReview(recordReview(EMPTY_PROGRESS, 'haus', 'good', TODAY), 'tag', 'again', TODAY);

  it('counts only cards that were answered correctly as learned', () => {
    expect(countLearned(seen, IDS)).toBe(1);
  });

  it('lists unseen words as new, in their original order', () => {
    expect(newIds(seen, IDS)).toEqual(['gehen', 'gut']);
  });

  it('lists due cards, most overdue first', () => {
    expect(dueIds(seen, IDS, TODAY)).toEqual(['tag']);
    expect(dueIds(seen, IDS, TODAY + 1)).toEqual(['tag', 'haus']);
  });

  it('ignores cards outside the requested set', () => {
    expect(dueIds(seen, ['gut'], TODAY + 5)).toEqual([]);
  });
});

describe('streak', () => {
  it('is zero without any reviews', () => {
    expect(streak(EMPTY_PROGRESS, TODAY)).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    const days = { [TODAY]: 3, [TODAY - 1]: 1, [TODAY - 2]: 5, [TODAY - 4]: 2 };
    expect(streak({ ...EMPTY_PROGRESS, days }, TODAY)).toBe(3);
  });

  it('keeps yesterday’s streak alive until today ends', () => {
    const days = { [TODAY - 1]: 1, [TODAY - 2]: 1 };
    expect(streak({ ...EMPTY_PROGRESS, days }, TODAY)).toBe(2);
  });

  it('resets after a missed day', () => {
    expect(streak({ ...EMPTY_PROGRESS, days: { [TODAY - 2]: 4 } }, TODAY)).toBe(0);
  });
});

describe('parseProgress', () => {
  it('returns empty progress for anything that is not a saved state', () => {
    for (const raw of [null, undefined, 'x', 42, [], { version: 2 }, { version: 1, cards: 5 }]) {
      expect(parseProgress(raw)).toEqual(EMPTY_PROGRESS);
    }
  });

  it('keeps valid cards and drops broken ones', () => {
    const good = { reps: 1, interval: 1, ease: 2.5, due: TODAY, lapses: 0 };
    const parsed = parseProgress({
      version: 1,
      cards: { haus: good, tag: { reps: 'many' }, gut: null },
      days: { [TODAY]: 2, broken: 'x' },
    });
    expect(parsed.cards).toEqual({ haus: good });
    expect(parsed.days).toEqual({ [TODAY]: 2 });
  });

  it('survives a JSON round trip', () => {
    const progress = recordReview(EMPTY_PROGRESS, 'haus', 'good', TODAY);
    expect(parseProgress(JSON.parse(JSON.stringify(progress)))).toEqual(progress);
  });
});

describe('planSession', () => {
  it('puts due reviews before new words and respects the size', () => {
    const seen = recordReview(EMPTY_PROGRESS, 'gut', 'again', TODAY);
    expect(planSession(IDS, seen, TODAY, 3)).toEqual(['gut', 'haus', 'tag']);
  });

  it('is empty when everything is learned and nothing is due', () => {
    const all = IDS.reduce((p, id) => recordReview(p, id, 'good', TODAY), EMPTY_PROGRESS);
    expect(planSession(IDS, all, TODAY, 10)).toEqual([]);
  });
});

describe('afterAnswer', () => {
  it('drops the answered card', () => {
    expect(afterAnswer(['haus', 'tag'], 'good')).toEqual(['tag']);
  });

  it('sends a missed card to the back of the queue', () => {
    expect(afterAnswer(['haus', 'tag'], 'again')).toEqual(['tag', 'haus']);
  });

  it('handles an empty queue', () => {
    expect(afterAnswer([], 'good')).toEqual([]);
  });
});
