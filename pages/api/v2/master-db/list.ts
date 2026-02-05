import { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'miner';
const COLLECTION_NAME = 'master_courses';

interface MasterCourse {
  _id?: string;
  category: string;
  subCategory: string;
  courseCode: string;
  courseName: string;
  courseTitle: string;
  levelLength: string;
  length: string;
  level: string;
  gradReq: string;
  credit: string;
  filename: string;
  addedAt?: string;
  [key: string]: any;
}

async function getDB(): Promise<Db> {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client.db(DB_NAME);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const db = await getDB();
    const collection = db.collection(COLLECTION_NAME);

    // Fetch all courses from master database
    const courses = (await collection.find({}).toArray()) as any[] as MasterCourse[];

    return res.status(200).json({
      success: true,
      data: courses,
      count: courses.length,
    });
  } catch (error) {
    console.error('Fetch error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch courses',
    });
  }
}
