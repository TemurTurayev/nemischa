/** The learner's saved state and pure functions to update and query it. */

import { type CardState, type Grade, isDue, isLearned, review } from './scheduler';

export interface Progress {
  readonly version: 1;
  readonly cards: Readonly<Record<string, CardState>>;
  readonly days: Readonly<Record<string, number>>; // local day number → answers given
}

export const EMPTY_PROGRESS: Progress = { version: 1, cards: {}, days: {} };

const CARD_FIELDS = ['reps', 'interval', 'ease', 'due', 'lapses'] as const;

export function recordReview(progress: Progress, id: string, grade: Grade, today: number): Progress {
  const day = String(today);
  return {
    ...progress,
    cards: { ...progress.cards, [id]: review(progress.cards[id], grade, today) },
    days: { ...progress.days, [day]: (progress.days[day] ?? 0) + 1 },
  };
}

export function countLearned(progress: Progress, ids: readonly string[]): number {
  return ids.filter((id) => {
    const card = progress.cards[id];
    return card !== undefined && isLearned(card);
  }).length;
}

export function newIds(progress: Progress, ids: readonly string[]): string[] {
  return ids.filter((id) => progress.cards[id] === undefined);
}

/** Cards that were seen before and are due, most overdue first. */
export function dueIds(progress: Progress, ids: readonly string[], today: number): string[] {
  return ids
    .flatMap((id) => {
      const card = progress.cards[id];
      return card !== undefined && isDue(card, today) ? [{ id, due: card.due }] : [];
    })
    .sort((a, b) => a.due - b.due)
    .map((item) => item.id);
}

/** Days in a row with at least one answer; today may still be empty. */
export function streak(progress: Progress, today: number): number {
  const practised = (day: number): boolean => (progress.days[String(day)] ?? 0) > 0;
  let day = practised(today) ? today : today - 1;
  let count = 0;
  while (practised(day)) {
    count += 1;
    day -= 1;
  }
  return count;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCardState(value: unknown): value is CardState {
  return isRecord(value) && CARD_FIELDS.every((field) => Number.isFinite(value[field]));
}

/** Read whatever was in storage; anything unexpected is dropped, never thrown. */
export function parseProgress(raw: unknown): Progress {
  if (!isRecord(raw) || raw.version !== 1 || !isRecord(raw.cards)) return EMPTY_PROGRESS;
  const cards = Object.fromEntries(
    Object.entries(raw.cards).filter((pair): pair is [string, CardState] => isCardState(pair[1])),
  );
  const days = Object.fromEntries(
    Object.entries(isRecord(raw.days) ? raw.days : {}).filter(
      (pair): pair is [string, number] => /^\d+$/.test(pair[0]) && Number.isFinite(pair[1]),
    ),
  );
  return { version: 1, cards, days };
}
