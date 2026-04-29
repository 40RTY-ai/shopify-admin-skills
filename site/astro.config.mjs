// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://skills.40rty.ai',
  base: '/',
  output: 'static',
  integrations: [react()],
});
