/** Question building for the three practice modes. */

import { type Entry, isArticle } from '../lib/types';

export const MODES = ['cards', 'choice', 'article'] as const;
export type Mode = (typeof MODES)[number];

const OPTION_COUNT = 4;

export function isMode(value: unknown): value is Mode {
  return typeof value === 'string' && (MODES as readonly string[]).includes(value);
}

/** The article quiz only makes sense for nouns with exactly one gender. */
export function eligibleFor(mode: Mode, entries: readonly Entry[]): Entry[] {
  if (mode !== 'article') return [...entries];
  return entries.filter((entry) => entry.pos === 'noun' && isArticle(entry.article));
}

/** Fisher–Yates on a copy; `random` is injected so tests are deterministic. */
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const held = result[i] as T;
    result[i] = result[j] as T;
    result[j] = held;
  }
  return result;
}

function distinctTranslations(entries: readonly Entry[], taken: ReadonlySet<string>): string[] {
  return [...new Set(entries.map((entry) => entry.uz))].filter((uz) => !taken.has(uz));
}

/** Uzbek answer options: the right one plus distractors, in random order. */
export function choiceOptions(entry: Entry, pool: readonly Entry[], random: () => number): string[] {
  const others = shuffle(pool.filter((other) => other.id !== entry.id), random);
  const samePos = distinctTranslations(others.filter((o) => o.pos === entry.pos), new Set([entry.uz]));
  const rest = distinctTranslations(others, new Set([entry.uz, ...samePos]));
  const distractors = [...samePos, ...rest].slice(0, OPTION_COUNT - 1);
  return shuffle([entry.uz, ...distractors], random);
}
