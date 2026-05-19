import { handleJobOgImage } from './_handlers/job/og-image.js'

export const config = {
  runtime: 'edge',
}

export default function handler (request: Request): Promise<Response> {
  return handleJobOgImage(request)
}
