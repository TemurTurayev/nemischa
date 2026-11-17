/** Per-level vocabulary for the trainer, without the fields it does not show. */

import type { APIRoute, GetStaticPaths } from 'astro';
import type { LevelData } from '../../lib/types';
import { getLevels } from '../../lib/vocab';

export const getStaticPaths: GetStaticPaths = () =>
  getLevels().map((data) => ({
    params: { level: data.level.toLowerCase() },
    props: { data },
  }));

export const GET: APIRoute = ({ props }) => {
  const { level, themes } = props.data as LevelData;
  const compact = {
    level,
    themes: themes.map((theme) => ({
      n: theme.n,
      de: theme.de,
      uz: theme.uz,
      en: theme.en,
      entries: theme.entries.map((entry) => ({ ...entry, subgroup: '' })),
    })),
  };
  return new Response(JSON.stringify(compact), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
