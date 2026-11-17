/** Home-page dictionary search: loads the word index once, then filters as you type. */

import { h } from '../lib/dom';
import { articleClass } from '../lib/format';
import { searchKey } from '../lib/text';

interface IndexRow {
  readonly i: string; // id
  readonly d: string; // German word
  readonly a: string; // article
  readonly u: string; // Uzbek translation
  readonly l: string; // level
}

interface Searchable {
  readonly row: IndexRow;
  readonly de: string;
  readonly uz: string;
}

const MAX_RESULTS = 12;
const MIN_QUERY_LENGTH = 2;

function isIndexRow(value: unknown): value is IndexRow {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return ['i', 'd', 'a', 'u', 'l'].every((key) => typeof row[key] === 'string');
}

async function loadIndex(url: string): Promise<Searchable[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Search index request failed: HTTP ${response.status}`);
  const raw: unknown = await response.json();
  if (!Array.isArray(raw)) throw new Error('Search index has an unexpected format');
  return raw.filter(isIndexRow).map((row) => ({ row, de: searchKey(row.d), uz: searchKey(row.u) }));
}

/** Lower is better; null means no match. */
function rank(item: Searchable, query: string): number | null {
  if (item.de === query || item.uz === query) return 0;
  if (item.de.startsWith(query)) return 1;
  if (item.uz.startsWith(query)) return 2;
  if (item.de.includes(query)) return 3;
  if (item.uz.includes(query)) return 4;
  return null;
}

function find(index: readonly Searchable[], query: string): IndexRow[] {
  return index
    .flatMap((item) => {
      const score = rank(item, query);
      return score === null ? [] : [{ item, score }];
    })
    .sort((a, b) => a.score - b.score || a.item.de.length - b.item.de.length)
    .slice(0, MAX_RESULTS)
    .map(({ item }) => item.row);
}

function resultItem(row: IndexRow, wordBase: string): HTMLLIElement {
  const article = row.a && h('span', { class: `art ${articleClass(row.a)}` }, row.a);
  return h(
    'li',
    {},
    h(
      'a',
      { attrs: { href: `${wordBase}${encodeURIComponent(row.i)}/` } },
      h('strong', { attrs: { lang: 'de' } }, article, article ? ' ' : '', row.d),
      h('span', { class: 'muted' }, `${row.u} · ${row.l}`),
    ),
  );
}

function noteItem(text: string): HTMLLIElement {
  return h('li', {}, h('span', { class: 'search-note muted' }, text));
}

function setup(root: HTMLElement): void {
  const input = root.querySelector<HTMLInputElement>('input');
  const list = root.querySelector<HTMLUListElement>('.search-results');
  const { index: indexUrl, wordBase } = root.dataset;
  if (!input || !list || !indexUrl || !wordBase) return;

  let index: Promise<Searchable[]> | undefined;

  const update = async (): Promise<void> => {
    const query = searchKey(input.value);
    if (query.length < MIN_QUERY_LENGTH) {
      list.replaceChildren();
      return;
    }
    try {
      index ??= loadIndex(indexUrl);
      const rows = find(await index, query);
      if (searchKey(input.value) !== query) return; // a newer keystroke won
      list.replaceChildren(
        ...(rows.length
          ? rows.map((row) => resultItem(row, wordBase))
          : [noteItem(input.dataset.empty ?? '')]),
      );
    } catch {
      index = undefined; // allow a retry on the next keystroke
      list.replaceChildren(noteItem(input.dataset.error ?? ''));
    }
  };

  input.addEventListener('input', () => void update());
}

for (const root of document.querySelectorAll<HTMLElement>('[data-search]')) setup(root);
