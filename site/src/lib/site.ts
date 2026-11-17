/** Site-wide constants and URL helpers. */

export const REPO_URL = 'https://github.com/TemurTurayev/nemischa';
export const ANKI_URL = 'https://apps.ankiweb.net';

/** Prefix an absolute site path with the deploy base ("/nemischa" on GitHub Pages). */
export function href(path: string): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`;
}

/** Link that opens a pre-filled GitHub issue about one word. */
export function reportUrl(word: string): string {
  return `${REPO_URL}/issues/new?title=${encodeURIComponent(`Xato: ${word}`)}`;
}
