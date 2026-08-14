// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

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
  ],
});
