import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://pro-tour-lorwyn-eclipsed.alles-standard.social',
  integrations: [react()],
  output: 'static',
});
