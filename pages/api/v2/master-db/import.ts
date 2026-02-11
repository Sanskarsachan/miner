import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/db';

interface MasterCourse {
  _id?: string;
  category: string;
  subCategory: string;
  programSubjectArea?: string;
  courseCode: string;
  courseName: string;
  courseTitle: string;
  levelLength: string;
  length: string;
  level: string;
  gradReq: string;
  credit: string;
  certification?: string;
  filename: string;
  addedAt?: string;
  [key: string]: any;
}

interface ImportRequest {
  filename: string;
  courses: MasterCourse[];
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

    if (!Array.isArray(courses)) {
      return res.status(400).json({ success: false, message: 'Courses must be an array' });
    }

    // Validate course data
    const validCourses = courses.filter((course) => {
      return course.courseCode && course.courseName;
    });

    if (validCourses.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid courses to import' });
    }

    const db = await connectDB();
    const collection = db.collection('master_courses');

    // Add timestamp and filename to each course
    const coursesWithMetadata = validCourses.map((course) => {
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
      message: `Successfully imported ${insertedCount} courses from "${filename}"`,
      data: {
        inserted: insertedCount,
        total: validCourses.length,
        skipped: courses.length - validCourses.length,
      },
    });
  } catch (error) {
    console.error('[master-db/import] Error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to import courses',
    });
  }
}
