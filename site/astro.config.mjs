// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Defaults match GitHub Pages; override both for a custom domain:
//   SITE_URL=https://nemischa.uz SITE_BASE=/ npm run build
const site = process.env.SITE_URL ?? 'https://temurturayev.github.io';
const base = process.env.SITE_BASE ?? '/nemischa';

export default defineConfig({
  site,
  base,
  integrations: [sitemap()],
  devToolbar: { enabled: false },
});
