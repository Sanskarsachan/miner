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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const db = await connectDB();
    const { dbName, totalCourses, courses } = req.body as {
      dbName: string;
      totalCourses: number;
      courses: CourseData[];
    };

    if (!dbName || !courses || !Array.isArray(courses)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const collection = db.collection('master_databases');
    const coursesCollection = db.collection('master_courses');

    // Create course entries with master database reference
    const courseDocuments = courses.map((course) => ({
      ...course,
      databaseName: dbName,
      created_at: new Date(),
    }));

    // Insert courses in batch
    if (courseDocuments.length > 0) {
      await coursesCollection.insertMany(courseDocuments);
    }

    // Update master database entry with final status
    const result = await collection.findOneAndUpdate(
      { name: dbName },
      {
        $set: {
          status: 'completed',
          totalCourses: totalCourses,
          courseCount: courses.length,
          uniqueCourses: courses.length,
          updated_at: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    return res.status(200).json({
      success: true,
      message: `Master database "${dbName}" finalized with ${courses.length} courses`,
      databaseId: result.value?._id,
      data: result.value,
    });
  } catch (error) {
    console.error('Finalize database error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
