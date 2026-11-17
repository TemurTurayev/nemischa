/** What to show in one practice session, and in which order. */

import { type Progress, dueIds, newIds } from './progress';
import type { Grade } from './scheduler';

/** Due reviews come first, then new words in their textbook order. */
export function planSession(
  ids: readonly string[],
  progress: Progress,
  today: number,
  size: number,
): string[] {
  return [...dueIds(progress, ids, today), ...newIds(progress, ids)].slice(0, size);
}

/** The queue after the first card was answered; a missed card comes back at the end. */
export function afterAnswer(queue: readonly string[], grade: Grade): string[] {
  const [answered, ...rest] = queue;
  if (answered === undefined) return [];
  return grade === 'again' ? [...rest, answered] : rest;
}
