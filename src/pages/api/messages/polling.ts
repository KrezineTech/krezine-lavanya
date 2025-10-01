// Messages Polling API Endpoint
// TODO: Implement long polling for messages

import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return res.status(501).json({ error: 'Not implemented yet' })
}
