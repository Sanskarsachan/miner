/**
 * V2 API: Save Extraction
 * Saves extraction results to MongoDB
 * 
 * POST /api/v2/extractions/save
 * Body: {
 *   file_id: string (hash),
 *   filename: string,
 *   courses: Course[],
 *   metadata: { pages, time, api, tokens }
 * }
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { saveExtraction, getExtractionByFileHash } from '@/lib/extraction.service'
import { healthCheck } from '@/lib/db'
import { Extraction } from '@/lib/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check DB connection
    const isHealthy = await healthCheck()
    if (!isHealthy) {
      return res.status(503).json({ error: 'Database connection failed' })
    }

    const { file_id, filename, courses, total_pages, extraction_time_ms, api_used, tokens_used } = req.body

    // Validation
    if (!file_id || !filename || !courses || !Array.isArray(courses)) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Generate user ID (for now, use a default; will be from auth later)
    const userId = process.env.DEFAULT_USER_ID || 'user_guest'

    // Check if already exists
    const existing = await getExtractionByFileHash(userId, file_id)
    if (existing) {
      return res.status(409).json({
        error: 'File already extracted',
        extraction_id: existing._id,
        message: 'This file has already been processed. Use the extraction ID to view or refine.',
      })
    }

    // Save extraction
    const extraction = await saveExtraction(userId, {
      file_id,
      filename,
      file_size: 0, // Will be tracked separately
      file_type: filename.split('.').pop() || 'unknown',
      upload_date: new Date(),
      courses: courses.map((c: any) => ({
        name: c.CourseName,
        code: c.CourseCode,
        grade_level: c.GradeLevel,
        credits: c.Credit,
        description: c.CourseDescription,
        details: c.Details,
        category: c.Category,
        confidence_score: 0.95,
        extracted_by_api: api_used,
      })),
      total_courses: courses.length,
      total_pages,
      extraction_time_ms,
      api_used,
      tokens_used,
      status: 'completed',
      current_version: 1,
      is_refined: false,
    })

    console.log(`[v2/save] ✅ Saved ${courses.length} courses from ${filename}`)

    return res.status(200).json({
      success: true,
      extraction_id: extraction._id,
      total_courses: extraction.total_courses,
      message: 'Extraction saved successfully',
    })
  } catch (error) {
    console.error('[v2/save] Error:', error)
    return res.status(500).json({
      error: 'Failed to save extraction',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
