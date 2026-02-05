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

interface ImportRequest {
  filename: string;
  courses: MasterCourse[];
}

async function getDB(): Promise<Db> {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client.db(DB_NAME);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { filename, courses } = req.body as ImportRequest;

    if (!filename || !courses || courses.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing filename or courses' });
    }

    const db = await getDB();
    const collection = db.collection(COLLECTION_NAME);

    // Add timestamp and filename to each course
    const coursesWithMetadata = courses.map((course) => {
      const { _id, ...courseData } = course;
      return {
        ...courseData,
        filename: filename,
        addedAt: new Date().toISOString(),
      };
    });

    // Insert courses into database
    const result = await collection.insertMany(coursesWithMetadata as any);

    const insertedCount = Object.keys(result.insertedIds).length;

    return res.status(200).json({
      success: true,
      count: insertedCount,
      message: `Successfully imported ${insertedCount} courses`,
    });
  } catch (error) {
    console.error('Import error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to import courses',
    });
  }
}
