/// <reference types="vitest/config" />
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { playwright } from '@vitest/browser-playwright'

// https://vite.dev/config/
// Vercel injects env at build time. Without these, the SPA ships with empty
// import.meta.env → getSupabaseConfigured() is false, jobs list is empty, auth toasts errors.
if (process.env.VERCEL === '1') {
  const url = process.env.VITE_SUPABASE_URL?.trim()
  const anon = process.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !anon) {
    throw new Error(
      'Vercel build missing VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY. Add both in Project → Settings → Environment Variables (enable Production and/or Preview), then redeploy. See docs/vercel-environment.md'
    )
  }
}

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    silent: 'passed-only',
    unstubEnvs: true,
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
    coverage: {
      // include: ['src/**/*.{js,jsx,ts,tsx}'], // Uncomment to expand the report to all src/**/* so untested modules appear as 0% coverage.
      exclude: [
        'src/components/ui/**',
        'src/assets/**',
        'src/tanstack-table.d.ts',
        'src/routeTree.gen.ts',
        'src/test-utils/**',
        'src/routes/**',
      ],
    },
  },
})
