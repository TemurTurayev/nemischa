/** The trainer's state and every transition between states, as pure functions. */

import { ARTICLES, type Entry, type Level, type LevelData, isLevel } from '../lib/types';
import { type Progress, countLearned, dueIds, recordReview, streak } from './progress';
import { type Mode, choiceOptions, eligibleFor, isMode, shuffle } from './quiz';
import type { Grade } from './scheduler';
import { afterAnswer, planSession } from './session';

export const SESSION_SIZE = 15;
const DEFAULT_LEVEL: Level = 'A1';
const DEFAULT_MODE: Mode = 'cards';

export type Screen = 'setup' | 'card' | 'summary' | 'nothing' | 'noNouns';
type Random = () => number;

export interface Choice {
  readonly level: Level;
  readonly theme: number | null;
  readonly mode: Mode;
}

export interface State extends Choice {
  readonly levels: Readonly<Partial<Record<Level, LevelData>>>;
  readonly failed: boolean; // the chosen level could not be downloaded
  readonly saveFailed: boolean; // progress could not be stored on this device
  readonly progress: Progress;
  readonly screen: Screen;
  readonly forced: boolean; // extra practice outside the schedule
  readonly queue: readonly string[];
  readonly total: number;
  readonly missed: readonly string[];
  readonly revealed: boolean;
  readonly picked: string | null;
  readonly options: readonly string[];
}

export interface Stats {
  readonly total: number;
  readonly learned: number;
  readonly due: number;
  readonly streak: number;
}

export function readQuery(search: string): Choice {
  const params = new URLSearchParams(search);
  const level = params.get('level')?.toUpperCase();
  const theme = Number.parseInt(params.get('theme') ?? '', 10);
  const mode = params.get('mode');
  return {
    level: isLevel(level) ? level : DEFAULT_LEVEL,
    theme: Number.isInteger(theme) && theme > 0 ? theme : null,
    mode: isMode(mode) ? mode : DEFAULT_MODE,
  };
}

export function queryString(choice: Choice): string {
  const params = new URLSearchParams({ level: choice.level, mode: choice.mode });
  if (choice.theme !== null) params.set('theme', String(choice.theme));
  return params.toString();
}

export function initialState(search: string, progress: Progress): State {
  return {
    ...readQuery(search),
    levels: {},
    failed: false,
    saveFailed: false,
    progress,
    screen: 'setup',
    forced: false,
    queue: [],
    total: 0,
    missed: [],
    revealed: false,
    picked: null,
    options: [],
  };
}

/** Entries of the chosen level and theme, before the mode filter. */
export function chosenEntries(state: State): readonly Entry[] {
  const data = state.levels[state.level];
  if (!data) return [];
  return data.themes
    .filter((theme) => state.theme === null || theme.n === state.theme)
    .flatMap((theme) => theme.entries);
}

export function currentEntry(state: State): Entry | undefined {
  const id = state.queue[0];
  return chosenEntries(state).find((entry) => entry.id === id);
}

export function statsFor(state: State, today: number): Stats | null {
  if (!state.levels[state.level]) return null;
  const ids = eligibleFor(state.mode, chosenEntries(state)).map((entry) => entry.id);
  return {
    total: ids.length,
    learned: countLearned(state.progress, ids),
    due: dueIds(state.progress, ids, today).length,
    streak: streak(state.progress, today),
  };
}

/** A level finished downloading; a theme that does not exist in it is dropped. */
export function withLevel(state: State, level: Level, data: LevelData): State {
  const levels = { ...state.levels, [level]: data };
  if (level !== state.level) return { ...state, levels };
  const known = state.theme === null || data.themes.some((theme) => theme.n === state.theme);
  return { ...state, levels, failed: false, theme: known ? state.theme : null };
}

/** A download failed; it only matters if the learner is still on that level. */
export function withFailure(state: State, level: Level): State {
  return level === state.level ? { ...state, failed: true } : state;
}

export function rightAnswer(state: State, entry: Entry): string {
  return state.mode === 'article' ? entry.article : entry.uz;
}

function optionsFor(state: State, id: string | undefined, random: Random): readonly string[] {
  const entry = chosenEntries(state).find((candidate) => candidate.id === id);
  if (!entry) return [];
  if (state.mode === 'article') return ARTICLES;
  if (state.mode === 'choice') return choiceOptions(entry, chosenEntries(state), random);
  return [];
}

/** Start a session. `force` repeats random words of the scope outside the schedule. */
export function beginSession(state: State, today: number, random: Random, force = false): State {
  const ids = eligibleFor(state.mode, chosenEntries(state)).map((entry) => entry.id);
  if (ids.length === 0) return { ...state, screen: 'noNouns' };
  const queue = force
    ? shuffle(ids, random).slice(0, SESSION_SIZE)
    : planSession(ids, state.progress, today, SESSION_SIZE);
  if (queue.length === 0) return { ...state, screen: 'nothing' };
  return {
    ...state,
    screen: 'card',
    forced: force,
    queue,
    total: queue.length,
    missed: [],
    revealed: false,
    picked: null,
    options: optionsFor(state, queue[0], random),
  };
}

/**
 * Record an answer and move on. Extra practice must not stretch the schedule,
 * so in a forced session only a miss is recorded (the word then comes back).
 */
export function answer(state: State, grade: Grade, today: number, random: Random): State {
  const id = state.queue[0];
  if (id === undefined) return state;
  const counts = !state.forced || grade === 'again';
  const queue = afterAnswer(state.queue, grade);
  return {
    ...state,
    progress: counts ? recordReview(state.progress, id, grade, today) : state.progress,
    queue,
    missed: grade === 'again' && !state.missed.includes(id) ? [...state.missed, id] : state.missed,
    screen: queue.length === 0 ? 'summary' : 'card',
    revealed: false,
    picked: null,
    options: optionsFor(state, queue[0], random),
  };
}

/** The grade a picked option earns, or null when nothing is picked yet. */
export function gradeForPick(state: State): Grade | null {
  const entry = currentEntry(state);
  if (!entry || state.picked === null) return null;
  return state.picked === rightAnswer(state, entry) ? 'good' : 'again';
}
