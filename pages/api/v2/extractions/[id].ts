import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { deleteExtraction, getExtractionById, updateExtraction } from '../../../../lib/extraction.service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  // Validate extraction ID
  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid extraction ID',
    });
  }

  // Validate ObjectId format
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid extraction ID format',
    });
  }

  try {
    if (req.method === 'GET') {
      // Get single extraction
      const extraction = await getExtractionById(id);

      if (!extraction) {
        return res.status(404).json({
          success: false,
          error: 'Extraction not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: extraction,
      });
    } else if (req.method === 'DELETE') {
      // Delete extraction
      const result = await deleteExtraction(id);

      if (!result.deletedCount) {
        return res.status(404).json({
          success: false,
          error: 'Extraction not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Extraction deleted successfully',
      });
    } else if (req.method === 'PUT') {
      // Update extraction (courses, status, metadata)
      const { courses, status, is_refined, metadata, merge_courses } = req.body;

      if (!courses && !status && is_refined === undefined && !metadata) {
        return res.status(400).json({
          success: false,
          error: 'No update data provided',
        });
      }

      // Get existing extraction for merge
      const existing = await getExtractionById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Extraction not found',
        });
      }

      const updates: any = {
        updated_at: new Date(),
      };

      // Handle course merging vs replacement
      if (courses) {
        if (merge_courses && existing.courses) {
          // Merge: Add new courses that don't already exist
          const existingNames = new Set(
            existing.courses.map((c: any) => 
              (c.name || c.CourseName || '').toLowerCase().trim()
            )
          );
          
          const newCourses = courses.filter((c: any) => {
            const name = (c.name || c.CourseName || '').toLowerCase().trim();
            return name && !existingNames.has(name);
          });
          
          updates.courses = [...existing.courses, ...newCourses];
          updates.total_courses = updates.courses.length;
          console.log(`[PUT] Merged ${newCourses.length} new courses (total: ${updates.courses.length})`);
        } else {
          // Replace all courses
          updates.courses = courses;
          updates.total_courses = courses.length;
        }
      }

      if (status) updates.status = status;
      if (is_refined !== undefined) updates.is_refined = is_refined;
      if (metadata) {
        updates.metadata = { ...existing.metadata, ...metadata };
        if (metadata.pages_processed) updates.total_pages = metadata.pages_processed;
      }

      const result = await updateExtraction(id, updates);

      if (!result) {
        return res.status(500).json({
          success: false,
          error: 'Failed to update extraction',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Extraction updated successfully',
        data: result,
        total_courses: result.total_courses || result.courses?.length || 0,
      });
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error) {
    console.error('Error handling extraction request:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
