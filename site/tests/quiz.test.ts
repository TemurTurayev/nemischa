import { describe, expect, it } from 'vitest';
import { localDay } from '../src/trainer/day';
import { choiceOptions, eligibleFor, isMode, shuffle } from '../src/trainer/quiz';
import { fixUzbekMarks, searchKey, slugify } from '../src/lib/text';
import type { Entry } from '../src/lib/types';

function entry(overrides: Partial<Entry>): Entry {
  return {
    id: 'haus', de: 'Haus', article: 'das', plural: '⸚-er', plural_form: 'Häuser', pos: 'noun',
    ipa: 'haʊ̯s', uz_respell: 'HAUS', uz: 'uy', en: 'house', emoji: '🏠', subgroup: '',
    ...overrides,
  };
}

/** A deterministic stand-in for Math.random. */
function seeded(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length] ?? 0;
}

const POOL: Entry[] = [
  entry({}),
  entry({ id: 'tag', de: 'Tag', article: 'der', uz: 'kun' }),
  entry({ id: 'frau', de: 'Frau', article: 'die', uz: 'ayol' }),
  entry({ id: 'kind', de: 'Kind', article: 'das', uz: 'bola' }),
  entry({ id: 'buch', de: 'Buch', article: 'das', uz: 'kitob' }),
  entry({ id: 'gehen', de: 'gehen', article: '', pos: 'verb', uz: 'bormoq' }),
  entry({ id: 'angestellte', de: 'Angestellte', article: 'der/die', uz: 'xodim' }),
];

describe('eligibleFor', () => {
  it('uses only nouns with exactly one article for the article quiz', () => {
    expect(eligibleFor('article', POOL).map((e) => e.id)).toEqual(['haus', 'tag', 'frau', 'kind', 'buch']);
  });

  it('uses every entry for cards and multiple choice', () => {
    expect(eligibleFor('cards', POOL)).toHaveLength(POOL.length);
    expect(eligibleFor('choice', POOL)).toHaveLength(POOL.length);
  });
});

describe('shuffle', () => {
  it('returns a new array with the same items', () => {
    const items = [1, 2, 3, 4, 5];
    const shuffled = shuffle(items, seeded([0.9, 0.1, 0.5, 0.3]));
    expect([...shuffled].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5]);
    expect(shuffled).not.toBe(items);
  });
});

describe('choiceOptions', () => {
  it('offers the right answer among distinct options', () => {
    const options = choiceOptions(POOL[0]!, POOL, seeded([0.2, 0.7, 0.4, 0.9, 0.1]));
    expect(options).toHaveLength(4);
    expect(options).toContain('uy');
    expect(new Set(options).size).toBe(4);
  });

  it('prefers words of the same part of speech as distractors', () => {
    const options = choiceOptions(POOL[0]!, POOL, seeded([0.5]));
    expect(options).not.toContain('bormoq');
  });

  it('falls back to other words when there are too few of the same kind', () => {
    const options = choiceOptions(POOL[5]!, POOL, seeded([0.5]));
    expect(options).toHaveLength(4);
    expect(options).toContain('bormoq');
  });

  it('works with a pool smaller than the option count', () => {
    expect(choiceOptions(POOL[0]!, POOL.slice(0, 2), seeded([0.5])).sort()).toEqual(['kun', 'uy']);
  });
});

describe('isMode', () => {
  it('accepts only known modes', () => {
    expect(isMode('cards')).toBe(true);
    expect(isMode('article')).toBe(true);
    expect(isMode('exam')).toBe(false);
    expect(isMode(null)).toBe(false);
  });
});

describe('localDay', () => {
  it('changes at local midnight, not at UTC midnight', () => {
    const lateEvening = new Date(2026, 10, 17, 23, 59);
    const afterMidnight = new Date(2026, 10, 18, 0, 1);
    expect(localDay(afterMidnight) - localDay(lateEvening)).toBe(1);
    expect(localDay(new Date(2026, 10, 17, 0, 1))).toBe(localDay(lateEvening));
  });
});

describe('text helpers', () => {
  it('writes Uzbek oʻ/gʻ and the glottal stop with the right signs', () => {
    expect(fixUzbekMarks("o'g'il")).toBe('oʻgʻil');
    expect(fixUzbekMarks("san'at")).toBe('sanʼat');
  });

  it('builds URL slugs from German words', () => {
    expect(slugify('Familie & Freunde')).toBe('familie-freunde');
    expect(slugify('Körper & Gesundheit')).toBe('koerper-gesundheit');
    expect(slugify('Maße')).toBe('masse');
  });

  it('makes search keys that ignore case, marks and umlauts', () => {
    expect(searchKey('Oʻzbek')).toBe(searchKey("o'zbek"));
    expect(searchKey('Straße')).toBe('strasse');
    expect(searchKey('Übung')).toBe('ubung');
    expect(searchKey('ubung')).toBe('ubung');
  });
});
