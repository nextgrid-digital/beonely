/// <reference types="vitest/config" />
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
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
    const message =
      'Vercel build missing Supabase client env. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or use the Supabase+Vercel integration (SUPABASE_URL + SUPABASE_ANON_KEY). Never expose the service role key as VITE_*. See docs/vercel-environment.md'
    if (process.env.VERCEL_ENV === 'production') {
      throw new Error(message)
    }
    process.emitWarning(
      `${message} This non-production deployment will remain fail-closed.`
    )
    return undefined
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

function googleVerificationMeta(value: string | undefined) {
  return {
    name: 'beonely-google-site-verification',
    transformIndexHtml: {
      order: 'pre' as const,
      handler(html: string) {
        const meta =
          /\s*<meta\s+name="google-site-verification"\s+content="%VITE_GOOGLE_SITE_VERIFICATION%"\s*\/>/
        const token = value?.trim()
        if (!token) return html.replace(meta, '')
        const escaped = token
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
        return html.replace(
          meta,
          `\n    <meta name="google-site-verification" content="${escaped}" />`
        )
      },
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    ...(supabaseDefine ? { define: supabaseDefine } : {}),
    plugins: [
      googleVerificationMeta(
        process.env.VITE_GOOGLE_SITE_VERIFICATION ??
          env.VITE_GOOGLE_SITE_VERIFICATION
      ),
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
        'e2e/**',
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
  }
})
