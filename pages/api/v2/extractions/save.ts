import type { NextApiRequest, NextApiResponse } from 'next'
import { ObjectId } from 'mongodb'
import { healthCheck, getDB } from '@/lib/db'
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

    const { file_id, filename, courses, total_pages, extraction_time_ms, api_used, tokens_used, username } = req.body

    // Validation
    if (!file_id || !filename || !courses || !Array.isArray(courses)) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Generate user ID consistently (for now, use a default; will be from auth later)
    const userIdStr = process.env.DEFAULT_USER_ID || 'user_guest'
    const userId = new ObjectId(Buffer.from(userIdStr.padEnd(12, '\0')).slice(0, 12))

    const db = await getDB()
    const collection = db.collection('extractions')

    // Check if already exists
    const existing = await collection.findOne({
      user_id: userId,
      file_id: file_id,
    })
    
    if (existing) {
      // MERGE MODE: Add new courses to existing extraction
      const existingCourses = existing.courses || []
      const existingNames = new Set(
        existingCourses.map((c: any) => 
          (c.name || c.CourseName || '').toLowerCase().trim()
        )
      )
      
      // Filter out duplicates
      const newCourses = courses.filter((c: any) => {
        const name = (c.CourseName || '').toLowerCase().trim()
        return name && !existingNames.has(name)
      }).map((c: any) => ({
        name: c.CourseName,
        code: c.CourseCode,
        grade_level: c.GradeLevel,
        credits: c.Credit,
        description: c.CourseDescription,
        details: c.Details,
        category: c.Category,
        confidence_score: 0.95,
        extracted_by_api: api_used,
      }))
      
      const mergedCourses = [...existingCourses, ...newCourses]
      
      // Update existing extraction with merged courses
      await collection.updateOne(
        { _id: existing._id },
        {
          $set: {
            courses: mergedCourses,
            total_courses: mergedCourses.length,
            tokens_used: (existing.tokens_used || 0) + (tokens_used || 0),
            updated_at: new Date(),
            metadata: {
              ...existing.metadata,
              ...req.body.metadata,
              pages_processed: req.body.metadata?.pages_processed || existing.metadata?.pages_processed,
              total_pages: req.body.metadata?.total_pages || existing.metadata?.total_pages,
            },
          },
        }
      )
      
      console.log(`[v2/save] MERGED ${newCourses.length} new courses into ${filename} (total: ${mergedCourses.length})`)
      
      return res.status(200).json({
        success: true,
        extraction_id: existing._id?.toString(),
        total_courses: mergedCourses.length,
        new_courses_added: newCourses.length,
        tokens_used: (existing.tokens_used || 0) + (tokens_used || 0),
        message: `Merged ${newCourses.length} new courses (total: ${mergedCourses.length})`,
        merged: true,
      })
    }

    // Create extraction document
    const extraction: Extraction = {
      file_id,
      user_id: userId,
      username: username || 'user_guest',
      filename,
      file_size: 0,
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
      total_pages: total_pages || 0,
      extraction_time_ms: extraction_time_ms || 0,
      api_used: api_used || 'gemini',
      tokens_used: tokens_used || 0,
      status: 'completed',
      current_version: 1,
      is_refined: false,
      created_at: new Date(),
      updated_at: new Date(),
    }

    const result = await collection.insertOne(extraction as any)

    // Save token usage analytics
    const analyticsCollection = db.collection('token_analytics')
    await analyticsCollection.insertOne({
      extraction_id: result.insertedId,
      user_id: userId,
      username: username || 'user_guest',
      filename,
      tokens_used: tokens_used || 0,
      courses_extracted: courses.length,
      total_pages: total_pages || 0,
      cost_per_course: (tokens_used || 0) / Math.max(courses.length, 1),
      api_used: api_used || 'gemini',
      created_at: new Date(),
    })

    console.log(`[v2/save] Saved ${courses.length} courses from ${filename} (${tokens_used || 0} tokens)`)

    return res.status(200).json({
      success: true,
      extraction_id: result.insertedId.toString(),
      total_courses: extraction.total_courses,
      tokens_used: tokens_used || 0,
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
