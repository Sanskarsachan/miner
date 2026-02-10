import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const db = await connectDB();
    const collection = db.collection('master_courses');

    // Fetch all courses from master database
    const courses = await collection.find({}).toArray();

    return res.status(200).json({
      success: true,
      data: courses,
      count: courses.length,
    });
  } catch (error) {
    console.error('[master-db/list] Fetch error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch courses',
    });
  }
}
