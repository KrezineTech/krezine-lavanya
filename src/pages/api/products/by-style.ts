// Products by Style API Endpoint
// TODO: Implement product search by style

import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return res.status(501).json({ error: 'Not implemented yet' })
}
