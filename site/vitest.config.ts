import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/conteudo/**/*.test.ts'],
    // Unit tests run on the sample content; `npm run conteudo:validar` sets
    // VITRUVIUS_CONTENT=conteudo to check the real one.
    env: { VITRUVIUS_CONTENT: process.env.VITRUVIUS_CONTENT ?? 'tests/fixture/conteudo' },
  },
});
