// @ts-check
import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

/**
 * Serve `/llms.txt` at `/.well-known/llms.txt` too.
 *
 * Agents look in both places and there is no consensus on which is canonical.
 * The first attempt used a `rewrites` entry in `vercel.json`; it did not take —
 * the path stayed 404 in production while every other new file deployed fine,
 * so static serving wins over the rewrite for this dot-prefixed path.
 *
 * Copying at build time is platform-independent and keeps a single source: the
 * bytes come from the generated `dist/llms.txt`, so the alias cannot drift from
 * it the way a hand-maintained second copy in `public/` would.
 */
function wellKnownLlmsAlias() {
  return {
    name: 'well-known-llms-alias',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const out = fileURLToPath(dir);
        const src = path.join(out, 'llms.txt');
        const destDir = path.join(out, '.well-known');
        mkdirSync(destDir, { recursive: true });
        copyFileSync(src, path.join(destDir, 'llms.txt'));
        logger.info('copied llms.txt -> .well-known/llms.txt');
      },
    },
  };
}

export default defineConfig({
  site: 'https://skills.40rty.ai',
  base: '/',
  output: 'static',
  integrations: [
    react(),
    // `public/robots.txt` had been advertising a sitemap since launch; nothing
    // was generating one, so /sitemap.xml returned 404 and crawlers had to
    // discover every skill page by following links. The integration emits
    // `sitemap-index.xml` (which is what robots.txt now points at) plus the
    // `sitemap-0.xml` it indexes.
    sitemap({
      // Every page here is a real destination — the skill pages especially,
      // since each one is the answer to "how do I do <task> in Shopify admin".
      changefreq: 'weekly',
      lastmod: new Date(),
    }),
    wellKnownLlmsAlias(),
  ],
});
