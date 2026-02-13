import type { NextApiRequest, NextApiResponse } from 'next'
import { getDB } from '@/lib/db'
import { MasterCourse } from '@/lib/types-redesigned'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { codes } = req.body

    // Validate input
    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({ error: 'codes array is required and must not be empty' })
    }

    // Normalize and deduplicate codes
    const normalizedCodes = [...new Set(
      codes.map((code: string) => 
        (code || '').toString().trim().toUpperCase()
      ).filter(c => c)
    )]

    if (normalizedCodes.length === 0) {
      return res.status(400).json({ error: 'No valid course codes provided' })
    }

    console.log(`[courses/lookup] Looking up ${normalizedCodes.length} course codes`)

    const db = await getDB()
    const collection = db.collection('master_courses')

    // Find matching courses
    const courses: MasterCourse[] = await collection
      .find({
        course_code: { $in: normalizedCodes }
      })
      .toArray() as MasterCourse[]

    console.log(`[courses/lookup] Found ${courses.length} out of ${normalizedCodes.length} codes`)

    // Identify missing codes
    const foundCodes = new Set(courses.map(c => c.course_code?.toUpperCase()))
    const missingCodes = normalizedCodes.filter(code => !foundCodes.has(code))

    // Format response
    const formatted = courses.map(c => ({
      code: c.course_code,
      name: c.course_name,
      title: c.course_title,
      category: c.category,
      sub_category: c.sub_category,
      credits: c.credits,
      length: c.length || c.level_length,
      grad_requirement: c.grad_requirement,
    }))

    return res.status(200).json({
      success: true,
      found: formatted.length,
      missing: missingCodes.length,
      courses: formatted,
      missing_codes: missingCodes,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[courses/lookup] Error:', error)
    return res.status(500).json({
      error: 'Failed to lookup courses',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
