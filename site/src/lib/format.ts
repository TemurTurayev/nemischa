/** How an entry is shown; shared by the pages and the trainer. */

import { type Entry, isArticle } from './types';
import { t } from './uz';

const SINGULAR_ONLY = 'Sg.';
const PLURAL_ONLY = 'Pl.';

export function fullWord(entry: Pick<Entry, 'de' | 'article'>): string {
  return entry.article ? `${entry.article} ${entry.de}` : entry.de;
}

/** CSS class that colours an article: der blue, die red, das green. */
export function articleClass(article: string): string {
  return isArticle(article) ? `art-${article}` : 'art-mixed';
}

/** Plural as a learner should read it: "die Häuser", or a note when there is none. */
export function pluralLabel(entry: Pick<Entry, 'pos' | 'plural' | 'plural_form'>): string {
  if (entry.pos !== 'noun') return '';
  if (entry.plural === SINGULAR_ONLY) return t.word.noPlural;
  if (entry.plural === PLURAL_ONLY) return t.word.pluralOnly;
  if (entry.plural_form) return `die ${entry.plural_form}`;
  return entry.plural;
}

export function formatCount(value: number): string {
  return value.toLocaleString('ru-RU').replace(/ /g, ' ');
}
