import { defineConfig } from 'vitest/config';

// Configure Vitest (https://vitest.dev/config/)
const config = defineConfig({
  test: {
    globals: true,
  },
});

export default config;
