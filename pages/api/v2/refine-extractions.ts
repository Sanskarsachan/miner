/**
 * API Endpoint: Refine Extractions with Master Database Mapping
 * POST /api/v2/refine-extractions
 * 
 * Request Body:
 * {
 *   extractionId: string (MongoDB ObjectId)
 *   apiKeyId?: string (MongoDB ObjectId of API key - from dropdown)
 *   schoolName?: string (for usage tracking)
 *   fileName?: string (for usage tracking)
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   data: MappingResult (totalProcessed, newlyMapped, stillUnmapped, etc.)
 *   error?: string
 *   message?: string
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
import {
  getApiKey,
  logApiUsage,
  validateApiKey,
} from '@/lib/api-key-manager';

interface RequestBody {
  extractionId: string;
  apiKeyId?: string; // ID of API key to use from pool
  schoolName?: string; // Optional: school name for tracking
  fileName?: string; // Optional: file name for tracking
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

  let startTime = Date.now();
  let apiKeyUsed: ObjectId | null = null;
  let tokensUsed = 0;
  let requestsCount = 0;
  let schoolName = '';
  let fileName = '';

  try {
    const { extractionId, apiKeyId, schoolName: reqSchoolName, fileName: reqFileName } = req.body as RequestBody;

    schoolName = reqSchoolName || '';
    fileName = reqFileName || '';

    // Validate input
    if (!extractionId || !ObjectId.isValid(extractionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid extraction ID',
      });
    }

    const db = await connectDB();

    // Get API key from pool (new flow) or specific key
    let apiKey: string | null = null;
    if (apiKeyId) {
      // User selected specific API key
      if (!ObjectId.isValid(apiKeyId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid API key ID',
        });
      }

      // Validate key has quota
      const hasQuota = await validateApiKey(db, new ObjectId(apiKeyId));
      if (!hasQuota) {
        return res.status(400).json({
          success: false,
          error: 'Selected API key has no quota remaining',
        });
      }

      const selectedKey = await getApiKey(db, new ObjectId(apiKeyId));
      if (!selectedKey) {
        return res.status(404).json({
          success: false,
          error: 'API key not found',
        });
      }

      apiKey = selectedKey.key;
      apiKeyUsed = new ObjectId(apiKeyId);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Please select an API key from the dropdown',
      });
    }

    console.log(`[refine-extractions] Processing extraction: ${extractionId}`);

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
      .toArray()) as unknown as MasterCourse[];

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

    // Log API usage
    if (apiKeyUsed) {
      requestsCount = unmappedAfterDeterministic.length > 0 ? 1 : 0; // 1 per Gemini call
      tokensUsed = summary.details.semanticMatches || 0; // Estimate based on semantic matches

      try {
        await logApiUsage(db, apiKeyUsed, {
          extraction_id: new ObjectId(extractionId),
          user_id: extraction.user_id || 'unknown',
          school_name: schoolName || 'Unknown School',
          file_name: fileName || extraction.filename,
          requests_count: requestsCount,
          tokens_used: tokensUsed,
          success: true,
          estimated_cost_cents: Math.round(tokensUsed * 0.0000001), // Rough estimate
        });
      } catch (loggingError) {
        console.warn('[refine-extractions] Failed to log API usage:', loggingError);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully refined ${summary.totalProcessed} courses. ${summary.newlyMapped} mapped, ${summary.stillUnmapped} unmapped, ${summary.flaggedForReview} flagged for review.`,
      data: summary,
    });
  } catch (error) {
    console.error('[refine-extractions] Error:', error);

    // Log failed usage
    if (apiKeyUsed) {
      const db = await connectDB();
      try {
        await logApiUsage(db, apiKeyUsed, {
          user_id: 'unknown',
          school_name: schoolName || 'Unknown School',
          file_name: fileName || 'unknown',
          requests_count: requestsCount,
          tokens_used: tokensUsed,
          success: false,
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });
      } catch (loggingError) {
        console.warn('[refine-extractions] Failed to log failed API usage:', loggingError);
      }
    }

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
