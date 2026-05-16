import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireStaffAdmin } from '../_lib/admin-auth.js'
import { TRANSACTIONAL_TEMPLATE_SAMPLES } from '../_lib/email-templates.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const admin = await requireStaffAdmin(req, res)
  if (!admin) return

  return res.status(200).json({
    previews: [
      { id: 'jobApproved', label: 'Job approved (recruiter)', ...TRANSACTIONAL_TEMPLATE_SAMPLES.jobApproved() },
      { id: 'jobRejected', label: 'Job rejected (recruiter)', ...TRANSACTIONAL_TEMPLATE_SAMPLES.jobRejected() },
      {
        id: 'applicationReceived',
        label: 'Application received (recruiter)',
        ...TRANSACTIONAL_TEMPLATE_SAMPLES.applicationReceived(),
      },
      {
        id: 'applicationConfirmation',
        label: 'Application confirmation (candidate)',
        ...TRANSACTIONAL_TEMPLATE_SAMPLES.applicationConfirmation(),
      },
    ],
  })
}
