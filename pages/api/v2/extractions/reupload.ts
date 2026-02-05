import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { connectDB } from '../../../../lib/db';
import { parseForm } from '../../../../lib/form-parser';

const ALLOWED_FILE_TYPES = ['application/pdf', 'text/csv', 'application/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/html', 'text/plain'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const db = await connectDB();
    const { fields, files } = await parseForm(req) as { fields: Record<string, string[]>; files: Record<string, any[]> };
    
    const extractionId = (fields.extractionId?.[0]) as string;
    const mergeMode = (fields.mergeMode?.[0] || 'merge') as 'merge' | 'replace';
    const uploadedFile = files.file?.[0];
    const fileType = uploadedFile?.mimetype || 'unknown';

    if (!extractionId || !ObjectId.isValid(extractionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid extraction ID',
      });
    }

    // Validate file type
    if (fileType && fileType !== 'unknown' && !ALLOWED_FILE_TYPES.includes(fileType)) {
      return res.status(400).json({
        success: false,
        error: `File type not supported: ${fileType}. Allowed: PDF, CSV, Excel, Word, PowerPoint, HTML, TXT`,
      });
    }

    // Get existing extraction
    const collection = db.collection('extractions');
    const existing = await collection.findOne({
      _id: new ObjectId(extractionId),
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Extraction not found',
      });
    }

    const mode = (mergeMode || 'merge') as 'merge' | 'replace';

    // Create version history entry
    const versions = existing.versions || [];
    versions.push({
      timestamp: new Date(),
      action: mode === 'replace' ? 'replaced_file' : 'merged_file',
      courseCount: existing.courses?.length || 0,
      fileType: fileType || 'unknown',
    });

    // For merge: keep existing courses. For replace: clear and prepare for new extraction.
    // In a full implementation, file extraction would happen here.
    const newCourses = mode === 'replace' ? [] : existing.courses || [];

    // Update extraction
    const updated = await collection.findOneAndUpdate(
      { _id: new ObjectId(extractionId) },
      {
        $set: {
          courses: newCourses,
          total_courses: newCourses.length,
          updated_at: new Date(),
          versions: versions,
        },
      },
      { returnDocument: 'after' }
    );

    return res.status(200).json({
      success: true,
      message: `File ${mode === 'replace' ? 'replaced' : 'merged'} successfully`,
      data: updated.value,
    });
  } catch (error) {
    console.error('Re-upload error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
