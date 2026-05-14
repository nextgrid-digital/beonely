/** Format INR paise (Razorpay) as rupees for display. */
export function formatInrFromPaise (paise: number): string {
  const rupees = paise / 100
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees)
}
