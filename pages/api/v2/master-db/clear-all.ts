import type { NextApiRequest, NextApiResponse } from 'next'
import { connectDB } from '@/lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const db = await connectDB()
    const masterCoursesCollection = db.collection('master_courses')

    const result = await masterCoursesCollection.deleteMany({})

    return res.status(200).json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Deleted ${result.deletedCount} courses from master database`,
    })
  } catch (error) {
    console.error('[clear-all] Error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear database',
    })
  }
}
