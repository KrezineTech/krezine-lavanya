// Blogs Store API Endpoint
// TODO: Implement blogs store logic

import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return res.status(501).json({ error: 'Not implemented yet' })
}
