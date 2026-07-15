import { useCallback, useState } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'

const siteKey = (
  import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
)?.trim()

/**
 * Keeps checkout anti-bot verification consistent with the server-side
 * `TURNSTILE_SECRET_KEY` gate. Tokens are reset after every order attempt
 * because Cloudflare response tokens are single-use.
 */
export function usePaymentTurnstileChallenge() {
  const [token, setToken] = useState<string | null>(null)
  const [generation, setGeneration] = useState(0)

  const reset = useCallback(() => {
    setToken(null)
    setGeneration((value) => value + 1)
  }, [])

  const challenge = siteKey ? (
    <div className='flex justify-center'>
      <Turnstile
        key={generation}
        siteKey={siteKey}
        options={{ action: 'payment_checkout', size: 'flexible' }}
        onSuccess={setToken}
        onExpire={() => setToken(null)}
        onError={() => {
          setToken(null)
        }}
      />
    </div>
  ) : null

  return {
    challenge,
    ready: !siteKey || Boolean(token),
    required: Boolean(siteKey),
    reset,
    token,
  }
}
