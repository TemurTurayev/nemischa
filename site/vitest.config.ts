import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/trainer/**/*.ts', 'src/lib/text.ts', 'src/lib/format.ts', 'src/lib/uz.ts'],
      // DOM glue is covered by the Playwright suite in e2e/.
      exclude: ['src/trainer/app.ts', 'src/trainer/view.ts', 'src/trainer/speech.ts', 'src/trainer/storage.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80 },
    },
  },
});
