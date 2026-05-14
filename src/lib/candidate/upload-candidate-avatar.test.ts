import { describe, expect, it } from 'vitest'
import { validateCandidateAvatarFile } from '@/lib/candidate/upload-candidate-avatar'

function makeFile (type: string, size: number): File {
  return new File([new Uint8Array(size)], 'x.jpg', { type })
}

describe('validateCandidateAvatarFile', () => {
  it('accepts small jpeg', () => {
    expect(validateCandidateAvatarFile(makeFile('image/jpeg', 100))).toBeNull()
  })

  it('rejects wrong type', () => {
    expect(validateCandidateAvatarFile(makeFile('image/gif', 100))).toMatch(/JPEG|PNG|WebP/)
  })

  it('rejects oversized file', () => {
    expect(validateCandidateAvatarFile(makeFile('image/jpeg', 6 * 1024 * 1024))).toMatch(/5 MB/)
  })
})
