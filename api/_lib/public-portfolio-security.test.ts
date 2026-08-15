import { describe, expect, it } from 'vitest'
import {
  isSafePublicAvatarUrl,
  mapPortfolioPayload,
} from './public-portfolio.js'

const projectUrl = 'https://project-ref.supabase.co'
const userId = '9b229530-efdd-4f97-a299-977c05b136ca'
const ownedAvatar = `${projectUrl}/storage/v1/object/public/avatars/${userId}/avatar.jpg`

describe('public portfolio avatar boundary', () => {
  it('allows only the app-owned avatar object path', () => {
    expect(isSafePublicAvatarUrl(ownedAvatar, projectUrl)).toBe(true)
    expect(
      isSafePublicAvatarUrl(
        'https://attacker.example/internal-metadata',
        projectUrl
      )
    ).toBe(false)
    expect(
      isSafePublicAvatarUrl(
        `${projectUrl}/storage/v1/object/public/avatars/${userId}/other.jpg`,
        projectUrl
      )
    ).toBe(false)
    expect(
      isSafePublicAvatarUrl(ownedAvatar.replace('https:', 'http:'), projectUrl)
    ).toBe(false)
  })

  it('removes an untrusted avatar from the public payload', () => {
    const result = mapPortfolioPayload({
      slug: 'candidate',
      name: 'Candidate',
      avatar: 'https://127.0.0.1/admin',
      resume: { general: {}, sections: [] },
    })

    expect(result?.avatar).toBeNull()
  })
})
