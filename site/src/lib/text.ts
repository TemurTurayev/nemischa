/** Text helpers shared by the build and the browser. */

const OKINA = '\u02bb'; // part of the Uzbek letters oʻ and gʻ
const TUTUQ = '\u02bc'; // the Uzbek glottal-stop sign, as in sanʼat
const ANY_MARK = /(?<=(\S))['\u2019\u2018`\u02bb\u02bc]/g;
const ALL_MARKS = /['\u2019\u2018`\u02bb\u02bc]/g;
const DIACRITICS = /[\u0300-\u036f]/g;

/** Use ʻ after o/g and ʼ everywhere else, whatever look-alike was typed. */
export function fixUzbekMarks(text: string): string {
  return text.replace(ANY_MARK, (_mark, before: string) => ('oOgG'.includes(before) ? OKINA : TUTUQ));
}

function stripDiacritics(text: string): string {
  return text.normalize('NFKD').replace(DIACRITICS, '');
}

/** URL slug: "Körper & Gesundheit" → "koerper-gesundheit". */
export function slugify(text: string): string {
  const german = text
    .toLowerCase()
    .replaceAll('ä', 'ae')
    .replaceAll('ö', 'oe')
    .replaceAll('ü', 'ue')
    .replaceAll('ß', 'ss');
  return stripDiacritics(german)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Key for matching what people type: no case, no Uzbek marks, no umlauts. */
export function searchKey(text: string): string {
  const folded = text.toLowerCase().replaceAll('ß', 'ss').replace(ALL_MARKS, '');
  return stripDiacritics(folded).trim();
}
