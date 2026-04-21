// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://vitruvius.com.br',
  trailingSlash: 'never',
  output: 'static',
  vite: {
    ssr: {
      // better-sqlite3 is a native module — don't try to bundle it
      external: ['better-sqlite3'],
    },
  },
});
