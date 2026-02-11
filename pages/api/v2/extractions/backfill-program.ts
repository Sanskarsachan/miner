import type { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { connectDB } from '@/lib/db';

interface BackfillResponse {
  success: boolean;
  updatedExtractions?: number;
  updatedCourses?: number;
  scannedExtractions?: number;
  error?: string;
}

const normalizeCode = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BackfillResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { extractionId } = req.body || {};

    const db = await connectDB();
    const masterCollection = db.collection('master_courses');
    const extractionsCollection = db.collection('extractions');

    const masterCourses = await masterCollection
      .find({}, { projection: { courseCode: 1, programSubjectArea: 1 } })
      .toArray();

    const masterByCode = new Map<string, string>();
    masterCourses.forEach((course: any) => {
      if (course?.courseCode) {
        masterByCode.set(
          normalizeCode(String(course.courseCode)),
          course.programSubjectArea || ''
        );
      }
    });

    const query: Record<string, any> = {};
    if (extractionId) {
      if (!ObjectId.isValid(extractionId)) {
        return res.status(400).json({ success: false, error: 'Invalid extractionId' });
      }
      query._id = new ObjectId(extractionId);
    }

    const cursor = extractionsCollection.find(query);

    let updatedExtractions = 0;
    let updatedCourses = 0;
    let scannedExtractions = 0;

    for await (const extraction of cursor) {
      scannedExtractions++;
      const courses = Array.isArray(extraction.courses) ? extraction.courses : [];
      if (courses.length === 0) continue;

      let changed = false;
      const updated = courses.map((course: any) => {
        if (course?.mappedProgramSubjectArea) {
          return course;
        }

        const mappedCode = course?.mappedCode || course?.CourseCode || course?.courseCode;
        if (!mappedCode) return course;

        const program = masterByCode.get(normalizeCode(String(mappedCode)));
        if (!program) return course;

        changed = true;
        updatedCourses++;
        return {
          ...course,
          mappedProgramSubjectArea: program,
        };
      });

      if (changed) {
        updatedExtractions++;
        await extractionsCollection.updateOne(
          { _id: extraction._id },
          {
            $set: {
              courses: updated,
              updated_at: new Date(),
            },
          }
        );
      }
    }

    return res.status(200).json({
      success: true,
      updatedExtractions,
      updatedCourses,
      scannedExtractions,
    });
  } catch (error) {
    console.error('[backfill-program] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to backfill program data',
    });
  }
}
