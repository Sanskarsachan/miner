/**
 * V2 API: List Extractions
 * Get user's extracted files with pagination
 * 
 * GET /api/v2/extractions?limit=10&skip=0
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserExtractions, countUserExtractions } from '@/lib/extraction.service'
import { healthCheck } from '@/lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check DB connection
    const isHealthy = await healthCheck()
    if (!isHealthy) {
      return res.status(503).json({ error: 'Database connection failed' })
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100)
    const skip = parseInt(req.query.skip as string) || 0
    const sort = (req.query.sort as string) || 'latest'

    // For now use default user; will be from auth later
    const userId = process.env.DEFAULT_USER_ID || 'user_guest'

    const { extractions, total } = await getUserExtractions(userId, limit, skip)

    console.log(`[v2/list] ✅ Retrieved ${extractions.length}/${total} extractions`)

    return res.status(200).json({
      success: true,
      data: extractions.map(ext => ({
        id: ext._id,
        filename: ext.filename,
        total_courses: ext.total_courses,
        total_pages: ext.total_pages,
        api_used: ext.api_used,
        status: ext.status,
        created_at: ext.created_at,
        updated_at: ext.updated_at,
        is_refined: ext.is_refined,
        current_version: ext.current_version,
      })),
      pagination: {
        limit,
        skip,
        total,
        pages: Math.ceil(total / limit),
        current_page: Math.floor(skip / limit) + 1,
      },
    })
  } catch (error) {
    console.error('[v2/list] Error:', error)
    return res.status(500).json({
      error: 'Failed to list extractions',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
