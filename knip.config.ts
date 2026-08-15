import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  // Vercel discovers these files by convention, so there is no static import
  // for Knip to follow from the browser entry point.
  entry: [
    'middleware.ts',
    'api/*.{ts,tsx}',
    'api/admin/*.ts',
    'api/email/*.ts',
  ],
  // Keep generated primitives and ambient declarations out of the unused-file
  // report while still analyzing their imports and dependency declarations.
  ignoreFiles: ['src/components/ui/**', 'src/tanstack-table.d.ts'],
  // These back the retained calendar and dashboard component catalog, which is
  // intentionally not mounted in the current production route tree.
  ignoreDependencies: ['react-day-picker', 'recharts'],
}

export default config
