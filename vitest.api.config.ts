import path from 'path'
import { defineConfig } from 'vitest/config'

/** Node-only smoke tests for `api/` (not run in browser pool — see root `vite.config.ts` `test.exclude`). */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    silent: 'passed-only',
    unstubEnvs: true,
    environment: 'node',
    include: ['api/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
})
