import { defineConfig } from 'vite';

export default defineConfig({
  // relative base so the build can be served from a subpath (project pages)
  base: './',
  test: {
    include: ['src/**/*.test.ts'],
  },
});
