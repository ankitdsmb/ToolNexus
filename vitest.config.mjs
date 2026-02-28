import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/runtime/**/*.test.js', 'tests/ui/**/*.test.js'],
    environment: 'jsdom',
    setupFiles: ['tests/js/setup-jest.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov']
    }
  }
});
