import type { NextApiRequest, NextApiResponse } from 'next'
import { ObjectId } from 'mongodb'
import { healthCheck, getDB } from '@/lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const isHealthy = await healthCheck()
    if (!isHealthy) {
      return res.status(503).json({ error: 'Database connection failed' })
    }

    const db = await getDB()
    const analyticsCollection = db.collection('token_analytics')

    // Get all token analytics for the current user
    const userIdStr = process.env.DEFAULT_USER_ID || 'user_guest'
    const userId = new ObjectId(Buffer.from(userIdStr.padEnd(12, '\0')).slice(0, 12))

    const analytics = await analyticsCollection
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .toArray()

    // Calculate aggregate stats
    const totalTokens = analytics.reduce((sum, a) => sum + (a.tokens_used || 0), 0)
    const totalCourses = analytics.reduce((sum, a) => sum + (a.courses_extracted || 0), 0)
    const totalPages = analytics.reduce((sum, a) => sum + (a.total_pages || 0), 0)
    const totalExtractions = analytics.length

    const avgTokensPerCourse = totalCourses > 0 ? totalTokens / totalCourses : 0
    const avgTokensPerPage = totalPages > 0 ? totalTokens / totalPages : 0
    const avgCoursesPerExtraction = totalExtractions > 0 ? totalCourses / totalExtractions : 0

    // Group by API used
    const apiBreakdown = analytics.reduce((acc: any, a) => {
      const api = a.api_used || 'unknown'
      if (!acc[api]) {
        acc[api] = { tokens: 0, courses: 0, extractions: 0 }
      }
      acc[api].tokens += a.tokens_used || 0
      acc[api].courses += a.courses_extracted || 0
      acc[api].extractions += 1
      return acc
    }, {})

    // Convert to array for easier processing
    const apiStats = Object.entries(apiBreakdown).map(([api, stats]: any) => ({
      api,
      tokens_used: stats.tokens,
      courses_extracted: stats.courses,
      extractions: stats.extractions,
      cost_per_course: stats.courses > 0 ? stats.tokens / stats.courses : 0,
    }))

    // Top extractions by tokens
    const topByTokens = analytics.slice(0, 10).map((a) => ({
      filename: a.filename,
      tokens_used: a.tokens_used,
      courses_extracted: a.courses_extracted,
      cost_per_course: a.cost_per_course,
      date: a.created_at,
    }))

    // Top extractions by courses extracted
    const topByCourses = analytics
      .sort((a, b) => (b.courses_extracted || 0) - (a.courses_extracted || 0))
      .slice(0, 10)
      .map((a) => ({
        filename: a.filename,
        courses_extracted: a.courses_extracted,
        tokens_used: a.tokens_used,
        cost_per_course: a.cost_per_course,
        date: a.created_at,
      }))

    // Estimate free tier remaining (1M daily limit)
    const FREE_TIER_LIMIT = 1000000
    const tokensRemaining = Math.max(0, FREE_TIER_LIMIT - totalTokens)
    const estimatedExtractionsRemaining = Math.floor(tokensRemaining / Math.max(avgTokensPerCourse, 1))

    console.log('[token analytics] ✅ Retrieved analytics for', userIdStr)

    return res.status(200).json({
      success: true,
      summary: {
        total_tokens: totalTokens,
        total_courses: totalCourses,
        total_pages: totalPages,
        total_extractions: totalExtractions,
        free_tier_limit: FREE_TIER_LIMIT,
        tokens_remaining: tokensRemaining,
        usage_percentage: (totalTokens / FREE_TIER_LIMIT) * 100,
      },
      efficiency: {
        avg_tokens_per_course: Math.round(avgTokensPerCourse),
        avg_tokens_per_page: Math.round(avgTokensPerPage),
        avg_courses_per_extraction: avgCoursesPerExtraction.toFixed(1),
        estimated_extractions_remaining: estimatedExtractionsRemaining,
      },
      api_breakdown: apiStats,
      top_by_tokens: topByTokens,
      top_by_courses: topByCourses,
      recent_extractions: analytics.slice(0, 20),
    })
  } catch (error) {
    console.error('[token analytics] Error:', error)
    return res.status(500).json({
      error: 'Failed to fetch token analytics',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
