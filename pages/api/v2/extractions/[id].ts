import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { deleteExtraction, getExtractionById } from '../../../../lib/extraction.service';

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
      // Update extraction (for refinements later)
      const { courses, status, is_refined } = req.body;

      if (!courses && !status && is_refined === undefined) {
        return res.status(400).json({
          success: false,
          error: 'No update data provided',
        });
      }

      const updates: any = {};
      if (courses) updates.courses = courses;
      if (status) updates.status = status;
      if (is_refined !== undefined) updates.is_refined = is_refined;
      updates.updated_at = new Date();

      // TODO: Implement updateExtraction in service
      return res.status(200).json({
        success: true,
        message: 'Extraction updated successfully',
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
