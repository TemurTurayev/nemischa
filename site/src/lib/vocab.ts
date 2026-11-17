/** Build-time access to the published dataset in ../data (never runs in the browser). */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { slugify } from './text';
import { type Entry, LEVELS, type Level, type LevelData, PARTS_OF_SPEECH, type Theme } from './types';

const DATA_DIR = path.resolve(process.cwd(), '..', 'data');

const entrySchema = z.object({
  id: z.string().min(1),
  de: z.string().min(1),
  article: z.string(),
  plural: z.string(),
  plural_form: z.string(),
  pos: z.enum(PARTS_OF_SPEECH),
  ipa: z.string(),
  uz_respell: z.string(),
  uz: z.string().min(1),
  en: z.string(),
  emoji: z.string(),
  subgroup: z.string(),
});

const levelSchema = z.object({
  level: z.enum(LEVELS),
  themes: z.array(
    z.object({
      n: z.number().int().positive(),
      de: z.string().min(1),
      uz: z.string().min(1),
      en: z.string(),
      entries: z.array(entrySchema).min(1),
    }),
  ),
});

export interface WordRef {
  readonly entry: Entry;
  readonly level: Level;
  readonly theme: Theme;
}

function readLevel(level: Level): LevelData {
  const file = path.join(DATA_DIR, `${level.toLowerCase()}.json`);
  try {
    return levelSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
  } catch (error) {
    throw new Error(
      `Cannot load the ${level} vocabulary from ${file}. Build the data first: see README, "Data pipeline".`,
      { cause: error },
    );
  }
}

let cache: readonly LevelData[] | undefined;

export function getLevels(): readonly LevelData[] {
  cache ??= LEVELS.map(readLevel);
  return cache;
}

export function themeSlug(theme: Pick<Theme, 'de'>): string {
  return slugify(theme.de);
}

export function countEntries(level: LevelData): number {
  return level.themes.reduce((sum, theme) => sum + theme.entries.length, 0);
}

export function getWords(): readonly WordRef[] {
  return getLevels().flatMap((data) =>
    data.themes.flatMap((theme) =>
      theme.entries.map((entry) => ({ entry, level: data.level, theme })),
    ),
  );
}
