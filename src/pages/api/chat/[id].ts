// Chat by ID API Endpoint
// TODO: Implement chat retrieval by ID

import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return res.status(501).json({ error: 'Not implemented yet' })
}
