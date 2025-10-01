// Message Integration API Endpoint
// TODO: Implement message integration logic

import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return res.status(200).json({ 
      ok: true, 
      message: 'Message integration endpoint - pending implementation' 
    })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
