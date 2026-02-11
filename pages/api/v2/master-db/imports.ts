import type { NextApiRequest, NextApiResponse } from 'next'
import { connectDB } from '@/lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const db = await connectDB()
    const masterCoursesCollection = db.collection('master_courses')

    // Group by filename and get counts
    const pipeline = [
      {
        $group: {
          _id: '$filename',
          count: { $sum: 1 },
          latestImport: { $max: '$addedAt' },
          courses: { $push: '$$ROOT' },
        },
      },
      {
        $project: {
          _id: 0,
          filename: '$_id',
          count: 1,
          latestImport: 1,
          courses: 1,
        },
      },
      {
        $sort: { latestImport: -1 },
      },
    ]

    const results = await masterCoursesCollection.aggregate(pipeline).toArray()

    return res.status(200).json({
      success: true,
      data: results,
    })
  } catch (error) {
    console.error('[imports] Error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch imports',
    })
  }
}
