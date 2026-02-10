/**
 * API Endpoint: Refine Extractions with Master Database Mapping
 * POST /api/v2/refine-extractions
 * 
 * Request Body:
 * {
 *   extractionId: string (MongoDB ObjectId)
 *   apiKey: string (Gemini API key)
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   data: MappingResult (totalProcessed, newlyMapped, stillUnmapped, etc.)
 *   error?: string
 * }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { connectDB } from '@/lib/db';
import {
  deterministicPass,
  semanticPass,
  validateMappings,
  persistMappings,
  computeSummary,
  ExtractedCourse,
  MasterCourse,
  MappingResult,
} from '@/lib/mapping-engine';

interface RequestBody {
  extractionId: string;
  apiKey: string;
}

interface ApiResponse {
  success: boolean;
  data?: MappingResult;
  error?: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const { extractionId, apiKey } = req.body as RequestBody;

    // Validate input
    if (!extractionId || !ObjectId.isValid(extractionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid extraction ID',
      });
    }

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API key required for semantic mapping',
      });
    }

    console.log(`[refine-extractions] Processing extraction: ${extractionId}`);

    // Connect to database
    const db = await connectDB();

    // STEP 1: Fetch extraction and master catalog
    const extractionsCollection = db.collection('extractions');
    const masterDbCollection = db.collection('master_courses');

    const extraction = (await extractionsCollection.findOne({
      _id: new ObjectId(extractionId),
    })) as any;

    if (!extraction) {
      return res.status(404).json({
        success: false,
        error: 'Extraction not found',
      });
    }

    // Load master catalog (limit to 10k for memory efficiency)
    const masterCatalog = (await masterDbCollection
      .find({})
      .limit(10000)
      .toArray()) as MasterCourse[];

    if (masterCatalog.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Master catalog is empty. Please import master database first.',
      });
    }

    console.log(
      `[refine-extractions] Loaded ${masterCatalog.length} master courses`
    );
    console.log(
      `[refine-extractions] Processing ${extraction.courses?.length || 0} extracted courses`
    );

    const extractedCourses = (extraction.courses || []) as ExtractedCourse[];

    if (extractedCourses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No courses found in extraction',
      });
    }

    // STEP 2: Deterministic Pass (code matching)
    const {
      updated: deterministicMatches,
      unmapped: unmappedAfterDeterministic,
      stats: deterministicStats,
    } = await deterministicPass(extractedCourses, masterCatalog);

    console.log(
      `[refine-extractions] Deterministic pass: ${deterministicStats.codeMatches} code matches, ${deterministicStats.trimMatches} trim matches`
    );

    // STEP 3: Semantic Pass (AI-based matching)
    let semanticMatches: ExtractedCourse[] = [];
    if (unmappedAfterDeterministic.length > 0) {
      console.log(
        `[refine-extractions] Starting semantic pass for ${unmappedAfterDeterministic.length} unmapped courses...`
      );

      semanticMatches = await semanticPass(
        unmappedAfterDeterministic,
        masterCatalog,
        apiKey
      );

      console.log(
        `[refine-extractions] Semantic pass complete. ${semanticMatches.filter((c) => c.mappingStatus === 'mapped').length} newly mapped.`
      );
    }

    // STEP 4: Combine and Validate
    const allMappedCourses = [
      ...deterministicMatches,
      ...semanticMatches,
    ];

    const validatedCourses = validateMappings(allMappedCourses, masterCatalog);

    console.log(
      `[refine-extractions] Validation complete. ${validatedCourses.filter((c) => c.mappingStatus === 'mapped').length} mapped, ${validatedCourses.filter((c) => c.mappingStatus === 'unmapped').length} unmapped`
    );

    // STEP 5: Persist to MongoDB
    await persistMappings(db, extractionId, validatedCourses);

    console.log(
      `[refine-extractions] Successfully persisted mappings to database`
    );

    // STEP 6: Compute summary
    const summary = computeSummary(
      extractedCourses,
      validatedCourses,
      deterministicStats
    );

    return res.status(200).json({
      success: true,
      message: `Successfully refined ${summary.totalProcessed} courses. ${summary.newlyMapped} mapped, ${summary.stillUnmapped} unmapped, ${summary.flaggedForReview} flagged for review.`,
      data: summary,
    });
  } catch (error) {
    console.error('[refine-extractions] Error:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
