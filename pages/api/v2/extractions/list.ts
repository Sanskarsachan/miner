/**
 * V2 API: List Extractions
 * Get user's extracted files with pagination
 * 
 * GET /api/v2/extractions?limit=10&skip=0
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { ObjectId } from 'mongodb'
import { healthCheck } from '@/lib/db'
import { getDB } from '@/lib/db'

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

    // For now use default user; will be from auth later
    const userId = process.env.DEFAULT_USER_ID || 'user_guest'
    
    // Create a consistent ObjectId from the user ID
    const userObjectId = new ObjectId(Buffer.from(userId.padEnd(12, '\0')).slice(0, 12))

    const db = await getDB()
    const collection = db.collection('extractions')

    const total = await collection.countDocuments({
      user_id: userObjectId,
    })

    const extractions = (await collection
      .find({
        user_id: userObjectId,
      })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()) as any[]

    console.log(`[v2/list] ✅ Retrieved ${extractions.length}/${total} extractions`)

    return res.status(200).json({
      success: true,
      data: extractions.map((ext: any) => ({
        _id: ext._id?.toString(),
        filename: ext.filename,
        courses: ext.courses || [],
        metadata: {
          file_size: ext.metadata?.file_size || 0,
          file_type: ext.metadata?.file_type || 'pdf',
          total_pages: ext.metadata?.total_pages || ext.total_pages || 0,
          pages_processed: ext.metadata?.pages_processed || 0,
        },
        created_at: ext.created_at,
        updated_at: ext.updated_at,
        status: ext.status || 'completed',
        user_id: ext.user_id?.toString?.(),
        username: ext.username,
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
