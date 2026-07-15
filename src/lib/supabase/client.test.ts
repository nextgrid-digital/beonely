import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createSupabaseBrowserClient,
  getSupabaseConfigured,
  getSupabaseUrl,
} from './client'

describe('Supabase browser configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('fails closed when the browser configuration is absent', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')

    expect(getSupabaseConfigured()).toBe(false)
    expect(getSupabaseUrl()).toBe('')
    expect(() => createSupabaseBrowserClient()).toThrow(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY'
    )
  })

  it('requires both values and trims the configured project URL', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '  https://project.example.test  ')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')

    expect(getSupabaseConfigured()).toBe(false)
    expect(getSupabaseUrl()).toBe('https://project.example.test')

    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '  public-anon-key  ')
    expect(getSupabaseConfigured()).toBe(true)
  })
})
