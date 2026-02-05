import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { getExtractionById } from '../../../../lib/extraction.service';

/**
 * DEBUG ENDPOINT: Returns first 3 courses in full detail for inspection
 * Remove this before production!
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string' || !ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid extraction ID',
    });
  }

  try {
    const extraction = await getExtractionById(id);

    if (!extraction) {
      return res.status(404).json({
        success: false,
        error: 'Extraction not found',
      });
    }

    // Return first 3 courses in full detail
    const sampleCourses = (extraction.courses || []).slice(0, 3);

    return res.status(200).json({
      success: true,
      total_courses: extraction.total_courses,
      sample_courses: sampleCourses,
      field_names: sampleCourses.length > 0 ? Object.keys(sampleCourses[0]) : [],
      first_course_full: sampleCourses[0] || null,
    });
  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
