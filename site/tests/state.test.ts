import { describe, expect, it } from 'vitest';
import type { Entry, LevelData } from '../src/lib/types';
import { EMPTY_PROGRESS, recordReview } from '../src/trainer/progress';
import {
  SESSION_SIZE,
  type State,
  answer,
  beginSession,
  chosenEntries,
  currentEntry,
  gradeForPick,
  initialState,
  queryString,
  readQuery,
  statsFor,
  withFailure,
  withLevel,
} from '../src/trainer/state';

const TODAY = 20_000;
const noShuffle = (): number => 0.999;

function entry(id: string, overrides: Partial<Entry> = {}): Entry {
  return {
    id, de: id, article: 'das', plural: '-', plural_form: id, pos: 'noun',
    ipa: 'x', uz_respell: 'X', uz: `uz-${id}`, en: 'x', emoji: '', subgroup: '',
    ...overrides,
  };
}

const A1: LevelData = {
  level: 'A1',
  themes: [
    { n: 1, de: 'Eins', uz: 'Bir', en: 'One', entries: [entry('haus'), entry('kind'), entry('buch')] },
    { n: 2, de: 'Zwei', uz: 'Ikki', en: 'Two', entries: [entry('gehen', { pos: 'verb', article: '' })] },
  ],
};

function loaded(search = ''): State {
  return withLevel(initialState(search, EMPTY_PROGRESS), 'A1', A1);
}

describe('address', () => {
  it('reads level, theme and mode and falls back to defaults', () => {
    expect(readQuery('?level=b1&theme=3&mode=choice')).toEqual({ level: 'B1', theme: 3, mode: 'choice' });
    expect(readQuery('?level=Z9&theme=-1&mode=exam')).toEqual({ level: 'A1', theme: null, mode: 'cards' });
    expect(readQuery('')).toEqual({ level: 'A1', theme: null, mode: 'cards' });
  });

  it('writes the choice back as a query string', () => {
    expect(queryString({ level: 'B1', theme: 3, mode: 'choice' })).toBe('level=B1&mode=choice&theme=3');
    expect(queryString({ level: 'A1', theme: null, mode: 'cards' })).toBe('level=A1&mode=cards');
  });
});

describe('level data', () => {
  it('has no stats until the level is downloaded', () => {
    expect(statsFor(initialState('', EMPTY_PROGRESS), TODAY)).toBeNull();
    expect(statsFor(loaded(), TODAY)).toEqual({ total: 4, learned: 0, due: 0, streak: 0 });
  });

  it('narrows the entries to the chosen theme', () => {
    expect(chosenEntries(loaded('?theme=2')).map((e) => e.id)).toEqual(['gehen']);
  });

  it('drops a theme that the level does not have', () => {
    expect(loaded('?theme=999').theme).toBeNull();
  });

  it('ignores a failure of a level the learner already left', () => {
    const onA1 = loaded();
    expect(withFailure(onA1, 'B2')).toBe(onA1);
    expect(withFailure(onA1, 'A1').failed).toBe(true);
  });

  it('keeps the error of the current level when another level arrives late', () => {
    const failedOnA2 = { ...withFailure({ ...loaded(), level: 'A2' as const }, 'A2') };
    const afterLateB1 = withLevel(failedOnA2, 'B1', { level: 'B1', themes: [] });
    expect(afterLateB1.failed).toBe(true);
    expect(afterLateB1.levels.B1).toBeDefined();
  });
});

describe('sessions', () => {
  it('starts with the first card and no answer shown', () => {
    const state = beginSession(loaded(), TODAY, noShuffle);
    expect(state.screen).toBe('card');
    expect(state.queue).toEqual(['haus', 'kind', 'buch', 'gehen']);
    expect(currentEntry(state)?.id).toBe('haus');
    expect(state.revealed).toBe(false);
  });

  it('says so when the article quiz has no nouns to ask', () => {
    expect(beginSession(loaded('?theme=2&mode=article'), TODAY, noShuffle).screen).toBe('noNouns');
  });

  it('says so when nothing is new or due', () => {
    const progress = ['haus', 'kind', 'buch', 'gehen'].reduce(
      (p, id) => recordReview(p, id, 'good', TODAY),
      EMPTY_PROGRESS,
    );
    expect(beginSession({ ...loaded(), progress }, TODAY, noShuffle).screen).toBe('nothing');
  });

  it('offers the three articles in the article quiz', () => {
    const state = beginSession(loaded('?mode=article'), TODAY, noShuffle);
    expect(state.options).toEqual(['der', 'die', 'das']);
    expect(state.queue).toEqual(['haus', 'kind', 'buch']);
  });

  it('offers translations in multiple choice', () => {
    const state = beginSession(loaded('?mode=choice'), TODAY, noShuffle);
    expect(state.options).toContain('uz-haus');
    expect(state.options).toHaveLength(4);
  });

  it('never plans more cards than one session holds', () => {
    const many = Array.from({ length: 40 }, (_, i) => entry(`w${i}`));
    const big: LevelData = { level: 'A1', themes: [{ n: 1, de: 'x', uz: 'x', en: 'x', entries: many }] };
    const state = beginSession(withLevel(initialState('', EMPTY_PROGRESS), 'A1', big), TODAY, noShuffle);
    expect(state.queue).toHaveLength(SESSION_SIZE);
  });
});

describe('answers', () => {
  it('records a correct answer and moves to the next card', () => {
    const next = answer(beginSession(loaded(), TODAY, noShuffle), 'good', TODAY, noShuffle);
    expect(next.queue[0]).toBe('kind');
    expect(next.progress.cards.haus?.reps).toBe(1);
    expect(next.missed).toEqual([]);
  });

  it('brings a missed card back and counts it once', () => {
    let state = beginSession(loaded('?theme=2'), TODAY, noShuffle);
    state = answer(state, 'again', TODAY, noShuffle);
    state = answer(state, 'again', TODAY, noShuffle);
    expect(state.queue).toEqual(['gehen']);
    expect(state.missed).toEqual(['gehen']);
    expect(state.screen).toBe('card');
  });

  it('ends with the summary after the last card', () => {
    const state = answer(beginSession(loaded('?theme=2'), TODAY, noShuffle), 'good', TODAY, noShuffle);
    expect(state.screen).toBe('summary');
    expect(state.queue).toEqual([]);
  });

  it('does nothing without a card', () => {
    const idle = loaded();
    expect(answer(idle, 'good', TODAY, noShuffle)).toBe(idle);
  });

  it('grades a picked option against the right answer', () => {
    const state = beginSession(loaded('?mode=article'), TODAY, noShuffle);
    expect(gradeForPick(state)).toBeNull();
    expect(gradeForPick({ ...state, picked: 'das' })).toBe('good');
    expect(gradeForPick({ ...state, picked: 'der' })).toBe('again');
  });
});

describe('extra practice outside the schedule', () => {
  const learned = ['haus', 'kind', 'buch', 'gehen'].reduce(
    (p, id) => recordReview(p, id, 'good', TODAY),
    EMPTY_PROGRESS,
  );
  const forced = beginSession({ ...loaded(), progress: learned }, TODAY, noShuffle, true);

  it('repeats words even though nothing is due', () => {
    expect(forced.screen).toBe('card');
    expect(forced.forced).toBe(true);
    expect([...forced.queue].sort()).toEqual(['buch', 'gehen', 'haus', 'kind']);
  });

  it('does not push a word further into the future', () => {
    const id = forced.queue[0] as string;
    const after = answer(forced, 'good', TODAY, noShuffle);
    expect(after.progress).toBe(learned);
    expect(after.progress.cards[id]?.interval).toBe(1);
  });

  it('still records a word the learner has forgotten', () => {
    const id = forced.queue[0] as string;
    const after = answer(forced, 'again', TODAY, noShuffle);
    expect(after.progress.cards[id]?.reps).toBe(0);
    expect(after.progress.cards[id]?.due).toBe(TODAY);
  });
});
