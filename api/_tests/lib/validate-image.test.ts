import { describe, expect, it } from 'vitest'
import { validateImageFile } from '../../../src/lib/storage/resize-image'

describe('validateImageFile', () => {
  it('rejects unsupported types', () => {
    const file = new File(['x'], 'logo.gif', { type: 'image/gif' })
    expect(validateImageFile(file)).toMatch(/JPEG, PNG, or WebP/)
  })

  it('rejects files over 5 MB', () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', {
      type: 'image/png',
    })
    expect(validateImageFile(file)).toMatch(/5 MB/)
  })

  it('accepts valid png', () => {
    const file = new File(['x'], 'logo.png', { type: 'image/png' })
    expect(validateImageFile(file)).toBeNull()
  })
})
