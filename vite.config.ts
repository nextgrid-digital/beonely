/// <reference types="vitest/config" />
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { playwright } from '@vitest/browser-playwright'

// https://vite.dev/config/
// Vercel + Supabase integration often exposes SUPABASE_URL and SUPABASE_ANON_KEY.
// The SPA reads import.meta.env.VITE_* only; map integration names when VITE_* are absent.
function vercelSupabaseClientDefine(): Record<string, string> | undefined {
  if (process.env.VERCEL !== '1') return undefined
  const url = (
    process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  )?.trim()
  const anon = (
    process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
  )?.trim()
  if (!url || !anon) {
    throw new Error(
      'Vercel build missing Supabase client env. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or use the Supabase+Vercel integration (SUPABASE_URL + SUPABASE_ANON_KEY). Never expose the service role key as VITE_*. See docs/vercel-environment.md'
    )
  }
  const define: Record<string, string> = {}
  if (!process.env.VITE_SUPABASE_URL?.trim()) {
    define['import.meta.env.VITE_SUPABASE_URL'] = JSON.stringify(url)
  }
  if (!process.env.VITE_SUPABASE_ANON_KEY?.trim()) {
    define['import.meta.env.VITE_SUPABASE_ANON_KEY'] = JSON.stringify(anon)
  }
  return Object.keys(define).length > 0 ? define : undefined
}

const supabaseDefine = vercelSupabaseClientDefine()

export default defineConfig({
  ...(supabaseDefine ? { define: supabaseDefine } : {}),
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
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      'api/**/*.test.ts',
      'scripts/**/*.test.ts',
    ],
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
