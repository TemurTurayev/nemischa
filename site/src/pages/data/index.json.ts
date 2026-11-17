/** Compact list of every word for the home-page search. */

import type { APIRoute } from 'astro';
import { getWords } from '../../lib/vocab';

export const GET: APIRoute = () => {
  const rows = getWords().map(({ entry, level }) => ({
    i: entry.id,
    d: entry.de,
    a: entry.article,
    u: entry.uz,
    l: level,
  }));
  return new Response(JSON.stringify(rows), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
