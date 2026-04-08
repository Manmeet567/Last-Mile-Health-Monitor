import { defineConfig, mergeConfig, configDefaults } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: true,
      globals: true,
      exclude: [...configDefaults.exclude, 'tests/**'],
      coverage: {
        reporter: ['text', 'html'],
      },
    },
  }),
);
