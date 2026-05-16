import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { subscribeNewsletter } from '@/lib/email/marketing-opt-in'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function FooterNewsletterSubscribe() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    setBusy(true)
    try {
      await subscribeNewsletter(trimmed)
      toast.success('Subscribed to ServiceNow job updates')
      setEmail('')
    } catch {
      toast.error('Could not subscribe. Try again later.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className='mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row'
    >
      <Input
        type='email'
        required
        placeholder='you@example.com'
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete='email'
        className='bg-background'
      />
      <Button type='submit' disabled={busy} className='shrink-0'>
        {busy ? <Loader2 className='size-4 animate-spin' /> : null}
        Subscribe
      </Button>
    </form>
  )
}
