import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '../../../../lib/db';
import { ObjectId } from 'mongodb';

interface CourseData {
  courseNumber: string;
  abbreviatedTitle: string;
  fullTitle: string;
  courseLevel: string;
  credits: string;
  artRequirements: string;
  certification: string;
  gradReqs: string;
}

interface PageData {
  pageNumber: number;
  courseCount: number;
  extracted_at: Date;
}

interface DatabaseEntry {
  name: string;
  created_at: Date;
  updated_at: Date;
  status: string;
  totalPages: number;
  totalCourses: number;
  pages: PageData[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const db = await connectDB();
    const { dbName, pageNumber, courses } = req.body as {
      dbName: string;
      pageNumber: number;
      courses: CourseData[];
    };

    if (!dbName || !courses || !Array.isArray(courses)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: dbName, courses',
      });
    }

    const collection = db.collection('master_databases');

    // Find or create database entry
    const existingDb = await collection.findOne({ name: dbName }) as unknown as DatabaseEntry | null;

    if (!existingDb) {
      // Create new database entry
      const result = await collection.insertOne({
        name: dbName,
        created_at: new Date(),
        updated_at: new Date(),
        status: 'processing',
        totalPages: 0,
        totalCourses: 0,
        pages: [
          {
            pageNumber: pageNumber,
            courseCount: courses.length,
            extracted_at: new Date(),
          },
        ] as PageData[],
      });

    } else {
      // Update existing database entry
      const newPage: PageData = {
        pageNumber: pageNumber,
        courseCount: courses.length,
        extracted_at: new Date(),
      };
      await collection.updateOne(
        { name: dbName },
        {
          $push: {
            pages: newPage as any,
          },
          $set: {
            updated_at: new Date(),
          },
        } as any
      );
    }

    return res.status(200).json({
      success: true,
      message: `Page ${pageNumber} saved successfully`,
    });
  } catch (error) {
    console.error('Save page error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
