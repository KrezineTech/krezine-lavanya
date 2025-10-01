// Products by Hint API Endpoint
// TODO: Implement product search by hint

import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return res.status(501).json({ error: 'Not implemented yet' })
}
