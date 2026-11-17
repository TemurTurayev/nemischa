/** Saves progress in the browser. Private mode or a full disk must not break practice. */

import { EMPTY_PROGRESS, type Progress, parseProgress } from './progress';

export const STORAGE_KEY = 'nemischa.progress.v1';

export function loadProgress(): Progress {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === null ? EMPTY_PROGRESS : parseProgress(JSON.parse(saved));
  } catch {
    return EMPTY_PROGRESS; // storage blocked or corrupted: start fresh, keep working
  }
}

/** Returns false when the progress could not be stored. */
export function saveProgress(progress: Progress): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
