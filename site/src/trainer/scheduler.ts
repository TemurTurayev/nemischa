/** Spaced repetition in the spirit of SM-2: pure functions over one card. */

export type Grade = 'again' | 'hard' | 'good';

export interface CardState {
  readonly reps: number; // correct answers in a row
  readonly interval: number; // days until the next review
  readonly ease: number; // growth factor of the interval
  readonly due: number; // local day number of the next review
  readonly lapses: number; // times a learned card was forgotten
}

const START_EASE = 2.5;
const MIN_EASE = 1.3;
const AGAIN_PENALTY = 0.2;
const HARD_PENALTY = 0.15;
const HARD_FACTOR = 1.2;
const FIRST_INTERVAL = 1;
const SECOND_INTERVAL = 3;

const NEW_CARD: CardState = { reps: 0, interval: 0, ease: START_EASE, due: 0, lapses: 0 };

function nextInterval(card: CardState, grade: Exclude<Grade, 'again'>): number {
  if (card.reps === 0) return FIRST_INTERVAL;
  if (grade === 'hard') return Math.max(card.interval + 1, Math.round(card.interval * HARD_FACTOR));
  if (card.reps === 1) return SECOND_INTERVAL;
  return Math.max(card.interval + 1, Math.round(card.interval * card.ease));
}

/** Return the card as it should be stored after an answer given today. */
export function review(card: CardState | undefined, grade: Grade, today: number): CardState {
  const current = card ?? NEW_CARD;
  if (grade === 'again') {
    return {
      reps: 0,
      interval: 0,
      ease: Math.max(MIN_EASE, current.ease - AGAIN_PENALTY),
      due: today,
      lapses: current.lapses + (current.reps > 0 ? 1 : 0),
    };
  }
  const interval = nextInterval(current, grade);
  return {
    reps: current.reps + 1,
    interval,
    ease: grade === 'hard' ? Math.max(MIN_EASE, current.ease - HARD_PENALTY) : current.ease,
    due: today + interval,
    lapses: current.lapses,
  };
}

export function isDue(card: CardState, today: number): boolean {
  return card.due <= today;
}

export function isLearned(card: CardState): boolean {
  return card.reps > 0;
}
