import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { connectDB } from '../../../../lib/db';
import { parseForm } from '../../../../lib/form-parser';

const ALLOWED_FILE_TYPES = ['application/pdf', 'text/csv', 'application/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/html', 'text/plain'];

/**
 * Clean and normalize course data
 */
function cleanCourseData(course: any): any {
  const clean = (val: any) => {
    if (!val) return null;
    let str = String(val).trim();
    
    // Remove control characters and fix encoding issues
    str = str
      .replace(/[\x00-\x1F\x7F]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/["\\]/g, '')
      .trim();
    
    return str && str.length > 0 ? str : null;
  };

  const courseName = clean(course.CourseName || course.CourseName);
  
  if (!courseName || courseName.length < 2) return null;
  
  return {
    CourseName: courseName,
    CourseCode: clean(course.CourseCode || course.code) || null,
    Category: clean(course.Category || course.category) || 'Uncategorized',
    GradeLevel: clean(course.GradeLevel || course.grade_level) || '-',
    Length: clean(course.Length || course.length) || '-',
    Prerequisite: clean(course.Prerequisite || course.prerequisite) || '-',
    Credit: clean(course.Credit || course.credit) || '-',
    CourseDescription: clean(course.CourseDescription || course.description) || '-',
  };
}

/**
 * Parse CSV/TSV content
 */
function parseCSVContent(content: string): any[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(/[\t,]/).map((h: string) => h.trim().toLowerCase());
  const courses: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/[\t,]/);
    if (values.length > 1) {
      const course: any = {};
      headers.forEach((header, idx) => {
        course[header] = values[idx]?.trim() || '';
      });
      const cleaned = cleanCourseData(course);
      if (cleaned) courses.push(cleaned);
    }
  }

  return courses;
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

    if (!uploadedFile || !uploadedFile.filepath) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
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
    
    // Read file content and extract courses
    let extractedCourses: any[] = [];
    try {
      const fs = require('fs').promises;
      const fileContent = await fs.readFile(uploadedFile.filepath, 'utf8');
      
      // Parse based on file type
      if (fileType === 'text/csv' || fileType === 'application/csv' || uploadedFile.originalFilename?.endsWith('.csv')) {
        extractedCourses = parseCSVContent(fileContent);
      } else {
        // For other text-based formats, treat as simple text
        extractedCourses = parseCSVContent(fileContent);
      }
    } catch (parseErr) {
      console.error('File parsing error:', parseErr);
      return res.status(400).json({
        success: false,
        error: 'Failed to parse file content',
      });
    }

    if (extractedCourses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid courses found in uploaded file',
      });
    }

    // Create version history entry
    const versions = existing.versions || [];
    versions.push({
      timestamp: new Date(),
      action: mode === 'replace' ? 'replaced_file' : 'merged_file',
      courseCount: existing.courses?.length || 0,
      fileType: fileType || 'unknown',
      newCoursesCount: extractedCourses.length,
    });

    // Determine final courses based on merge mode
    let finalCourses = extractedCourses;
    if (mode === 'merge' && existing.courses) {
      // Merge: combine with existing, avoiding duplicates
      const existingNames = new Set(
        existing.courses.map((c: any) => (c.CourseName || '').toLowerCase().trim())
      );
      
      const newUnique = extractedCourses.filter((c) => 
        !existingNames.has((c.CourseName || '').toLowerCase().trim())
      );
      
      finalCourses = [...existing.courses, ...newUnique];
    }

    // Update extraction with new courses
    const updated = await collection.findOneAndUpdate(
      { _id: new ObjectId(extractionId) },
      {
        $set: {
          courses: finalCourses,
          total_courses: finalCourses.length,
          updated_at: new Date(),
          versions: versions,
          status: 'completed',
        },
      },
      { returnDocument: 'after' }
    );

    return res.status(200).json({
      success: true,
      message: `File ${mode === 'replace' ? 'replaced' : 'merged'} successfully. Extracted ${extractedCourses.length} courses.`,
      data: updated.value,
      stats: {
        extracted: extractedCourses.length,
        total: finalCourses.length,
        mode: mode,
      },
    });
  } catch (error) {
    console.error('Re-upload error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
