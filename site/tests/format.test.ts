import { describe, expect, it } from 'vitest';
import { articleClass, formatCount, fullWord, pluralLabel } from '../src/lib/format';
import { isLevelData } from '../src/trainer/data';
import { LEVEL_NAMES, POS_NAMES, fill, t } from '../src/lib/uz';

describe('fullWord', () => {
  it('puts the article before a noun and leaves other words alone', () => {
    expect(fullWord({ de: 'Haus', article: 'das' })).toBe('das Haus');
    expect(fullWord({ de: 'gehen', article: '' })).toBe('gehen');
  });
});

describe('articleClass', () => {
  it('gives each gender its own class and double genders a shared one', () => {
    expect(articleClass('der')).toBe('art-der');
    expect(articleClass('die')).toBe('art-die');
    expect(articleClass('das')).toBe('art-das');
    expect(articleClass('der/die')).toBe('art-mixed');
  });
});

describe('pluralLabel', () => {
  const noun = { pos: 'noun', plural: '⸚-er', plural_form: 'Häuser' } as const;

  it('shows the full plural with its article', () => {
    expect(pluralLabel(noun)).toBe('die Häuser');
  });

  it('explains nouns without a plural or without a singular', () => {
    expect(pluralLabel({ ...noun, plural: 'Sg.', plural_form: '' })).toBe(t.word.noPlural);
    expect(pluralLabel({ ...noun, plural: 'Pl.', plural_form: 'Eltern' })).toBe(t.word.pluralOnly);
  });

  it('falls back to the textbook marker when no full form is known', () => {
    expect(pluralLabel({ ...noun, plural: '-s/-e', plural_form: '' })).toBe('-s/-e');
  });

  it('is empty for words that are not nouns', () => {
    expect(pluralLabel({ pos: 'verb', plural: '', plural_form: '' })).toBe('');
  });
});

describe('formatCount', () => {
  it('groups thousands with a plain space', () => {
    expect(formatCount(3763)).toBe('3 763');
    expect(formatCount(55)).toBe('55');
  });
});

describe('interface strings', () => {
  it('fills placeholders and keeps unknown ones visible', () => {
    expect(fill('{n} ta {thing}', { n: 5 })).toBe('5 ta {thing}');
  });

  it('uses the proper Uzbek signs everywhere', () => {
    const all = JSON.stringify({ t, LEVEL_NAMES, POS_NAMES });
    expect(all).not.toMatch(/['’‘`]/);
    expect(t.trainer.reveal).toBe('Javobni koʻrsatish');
    expect(POS_NAMES.verb).toBe('feʼl');
  });
});

describe('isLevelData', () => {
  const entry = {
    id: 'haus', de: 'Haus', article: 'das', plural: '-', plural_form: 'Häuser', pos: 'noun', uz: 'uy',
  };
  const level = { level: 'A1', themes: [{ n: 1, uz: 'Uy-joy', entries: [entry] }] };

  it('accepts a well-formed level', () => {
    expect(isLevelData(level)).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isLevelData(null)).toBe(false);
    expect(isLevelData({ ...level, level: 'Z9' })).toBe(false);
    expect(isLevelData({ level: 'A1', themes: [{ n: 1, uz: 'x', entries: [{ id: 1 }] }] })).toBe(false);
    expect(isLevelData({ level: 'A1', themes: 'none' })).toBe(false);
  });
});
