import { describe, expect, it } from 'vitest'

const BOT_UA =
  /bot|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|WhatsApp|Discordbot|Pinterest|Embedly|Quora|TelegramBot|vkShare/i

describe('social bot user-agent detection', () => {
  it('matches common crawlers', () => {
    expect(BOT_UA.test('facebookexternalhit/1.1')).toBe(true)
    expect(BOT_UA.test('Twitterbot/1.0')).toBe(true)
    expect(BOT_UA.test('LinkedInBot/1.0')).toBe(true)
    expect(BOT_UA.test('WhatsApp/2.0')).toBe(true)
  })

  it('does not match normal browsers', () => {
    expect(
      BOT_UA.test(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      )
    ).toBe(false)
  })
})
