/** Downloads one level of vocabulary for the trainer and checks its shape. */

import { type Level, type LevelData, isLevel } from '../lib/types';

const ENTRY_TEXT_FIELDS = ['id', 'de', 'article', 'plural', 'plural_form', 'pos', 'uz'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isEntry(value: unknown): boolean {
  return isRecord(value) && ENTRY_TEXT_FIELDS.every((field) => typeof value[field] === 'string');
}

function isTheme(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.n === 'number' &&
    typeof value.uz === 'string' &&
    Array.isArray(value.entries) &&
    value.entries.every(isEntry)
  );
}

export function isLevelData(value: unknown): value is LevelData {
  return (
    isRecord(value) && isLevel(value.level) && Array.isArray(value.themes) && value.themes.every(isTheme)
  );
}

export async function fetchLevel(dataBase: string, level: Level): Promise<LevelData> {
  const response = await fetch(`${dataBase}${level.toLowerCase()}.json`);
  if (!response.ok) throw new Error(`Loading ${level} failed: HTTP ${response.status}`);
  const raw: unknown = await response.json();
  if (!isLevelData(raw)) throw new Error(`Vocabulary for ${level} has an unexpected format`);
  return raw;
}
