import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    env: { VITRUVIUS_DB: 'vitruvius.fixture.db' },
  },
});
