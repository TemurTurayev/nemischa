export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
export type Level = (typeof LEVELS)[number];

export const PARTS_OF_SPEECH = [
  'noun', 'verb', 'adjective', 'adverb', 'preposition',
  'conjunction', 'pronoun', 'number', 'phrase', 'other',
] as const;
export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number];

export const ARTICLES = ['der', 'die', 'das'] as const;
export type Article = (typeof ARTICLES)[number];

export interface Entry {
  readonly id: string;
  readonly de: string;
  readonly article: string;
  readonly plural: string;
  readonly plural_form: string;
  readonly pos: PartOfSpeech;
  readonly ipa: string;
  readonly uz_respell: string;
  readonly uz: string;
  readonly en: string;
  readonly emoji: string;
  readonly subgroup: string;
}

export interface Theme {
  readonly n: number;
  readonly de: string;
  readonly uz: string;
  readonly en: string;
  readonly entries: readonly Entry[];
}

export interface LevelData {
  readonly level: Level;
  readonly themes: readonly Theme[];
}

export function isLevel(value: unknown): value is Level {
  return typeof value === 'string' && (LEVELS as readonly string[]).includes(value);
}

export function isArticle(value: string): value is Article {
  return (ARTICLES as readonly string[]).includes(value);
}
