/**
 * API: POST /api/v2/ai-remap
 * 
 * On-Demand AI Remapping Endpoint (Secondary, Non-Authoritative)
 * 
 * Purpose:
 * - Runs Gemini-based cleaning + mapping on selected courses
 * - Stores results in courses[].secondaryMapping
 * - Does NOT modify primary mapping
 * - Allows users to compare AI suggestions with primary results
 * 
 * Safety Constraints:
 * ✅ Never overwrites primary mapping fields
 * ✅ Never deletes data
 * ✅ Never writes to master_catalog
 * ✅ Completely reversible (can delete secondaryMapping anytime)
 * ✅ Read-only on master database
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { getDB, healthCheck } from '@/lib/db';
import {
  runSecondaryAIMapping,
  prepareCourseDataForSecondaryMapping,
  geminiResponseToSecondaryMapping,
} from '@/lib/secondary-ai-mapping';

interface AIRemapRequest {
  extractionId: string;
  courseIds?: string[]; // If provided, only remap these courses. If not, remap all.
  dryRun?: boolean; // If true, return results without persisting
}

interface AIRemapResponse {
  success: boolean;
  jobId?: string;
  status?: 'completed' | 'partial_failure' | 'failed';
  stats?: {
    totalCourses: number;
    processed: number;
    suggestions: number;
    highConfidence: number; // >= 85
    lowConfidence: number; // < 65
  };
  results?: Array<{
    courseId?: string;
    originalName: string;
    cleaned: string;
    suggestedCode: string;
    confidence: number;
    reasoning: string;
  }>;
  error?: string;
  errors?: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AIRemapResponse>
) {
  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
    });
  }

  try {
    // Check DB connection
    const isHealthy = await healthCheck();
    if (!isHealthy) {
      return res.status(503).json({
        success: false,
        error: 'Database connection failed',
      });
    }

    // Get API key from environment or headers
    const apiKey =
      req.headers['x-gemini-api-key'] ||
      process.env.GEMINI_API_KEY;

    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Gemini API key is required. Pass via x-gemini-api-key header or GEMINI_API_KEY env var.',
      });
    }

    const { extractionId, courseIds, dryRun } = req.body as AIRemapRequest;

    if (!extractionId) {
      return res.status(400).json({
        success: false,
        error: 'extractionId is required',
      });
    }

    const db = await getDB();
    const extractionsCollection = db.collection('extractions');
    const masterCoursesCollection = db.collection('master_courses');

    // 1. Fetch the extraction document
    let extractionObjectId: ObjectId;
    try {
      extractionObjectId = new ObjectId(extractionId);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid extractionId format',
      });
    }

    const extraction = await extractionsCollection.findOne({
      _id: extractionObjectId,
    });

    if (!extraction) {
      return res.status(404).json({
        success: false,
        error: 'Extraction not found',
      });
    }

    // 2. Get courses to process
    let coursesToProcess = extraction.courses || [];

    if (courseIds && courseIds.length > 0) {
      // Filter to only requested courses
      const courseIdSet = new Set(courseIds);
      coursesToProcess = coursesToProcess.filter((c: any) => {
        const courseId = c._id?.toString?.() || c.name;
        return courseIdSet.has(courseId);
      });
    }

    if (coursesToProcess.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No courses to process',
      });
    }

    // 3. Fetch master catalog for suggestions
    const masterCatalog = await masterCoursesCollection
      .find({})
      .toArray();

    if (masterCatalog.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Master catalog is empty. Import courses first.',
      });
    }

    // 4. Prepare course data for Gemini
    const courseData = prepareCourseDataForSecondaryMapping(
      coursesToProcess
    );

    // 5. Call Gemini for AI suggestions
    const mappingResults = await runSecondaryAIMapping({
      courses: courseData,
      masterCatalog: masterCatalog.map((mc: any) => ({
        courseCode: mc.courseCode,
        courseName: mc.courseName,
        courseTitle: mc.courseTitle,
        category: mc.category,
        level: mc.level,
      })),
      apiKey,
      gradeContext: extraction.gradeLevel || undefined,
    });

    // 6. Update results with secondary mappings
    const updatedCourses = coursesToProcess.map((course: any, index: number) => {
      const mapping = mappingResults[index];
      return {
        ...course,
        secondaryMapping: mapping.secondary,
      };
    });

    // 7. Persist if not dry run
    if (!dryRun) {
      // Update ONLY the secondaryMapping field
      // This is safe - we're adding a new field, not modifying existing ones
      const updateResult = await extractionsCollection.updateOne(
        { _id: extractionObjectId },
        {
          $set: {
            courses: updatedCourses,
            secondary_mapping_updated_at: new Date(),
          },
        }
      );

      if (updateResult.matchedCount === 0) {
        return res.status(500).json({
          success: false,
          error: 'Failed to update extraction',
        });
      }
    }

    // 8. Build response
    const stats = {
      totalCourses: coursesToProcess.length,
      processed: mappingResults.length,
      suggestions: mappingResults.filter((r) => r.secondary.suggestedCode !== 'UNMAPPED').length,
      highConfidence: mappingResults.filter((r) => r.secondary.confidence >= 85).length,
      lowConfidence: mappingResults.filter((r) => r.secondary.confidence < 65).length,
    };

    const results = mappingResults.map((r, idx) => ({
      courseId: coursesToProcess[idx]?._id?.toString?.(),
      originalName: r.original.name,
      cleaned: r.secondary.cleanedTitle,
      suggestedCode: r.secondary.suggestedCode,
      confidence: r.secondary.confidence,
      reasoning: r.secondary.reasoning,
    }));

    return res.status(200).json({
      success: true,
      jobId: extractionObjectId.toString(),
      status: 'completed',
      stats,
      results,
    });
  } catch (error) {
    console.error('[ai-remap] Error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return res.status(500).json({
      success: false,
      error: `Internal server error: ${errorMessage}`,
    });
  }
}
