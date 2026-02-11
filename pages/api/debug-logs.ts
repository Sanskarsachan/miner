/**
 * Debug Endpoint: View Recent Extraction Logs
 * GET /api/debug-logs
 * 
 * Returns the last 10 extraction attempts with detailed info
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { getRequestLogs } from './secure_extract'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const logs = getRequestLogs()
    
    return res.status(200).json({
      success: true,
      count: logs.length,
      logs: logs,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[debug-logs] Error:', errorMsg)
    return res.status(500).json({ error: errorMsg })
  }
}
