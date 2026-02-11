import type { NextApiRequest, NextApiResponse } from 'next'
import { connectDB } from '@/lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { filename } = req.body

    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: 'Filename is required' })
    }

    const db = await connectDB()
    const masterCoursesCollection = db.collection('master_courses')

    const result = await masterCoursesCollection.deleteMany({ filename })

    return res.status(200).json({
      success: true,
      deletedCount: result.deletedCount,
    })
  } catch (error) {
    console.error('[delete-by-filename] Error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete courses',
    })
  }
}
