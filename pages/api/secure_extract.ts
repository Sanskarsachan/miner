import type { NextApiRequest, NextApiResponse } from 'next'

const ENV_GEMINI_API_KEY = process.env.GEMINI_API_KEY

interface ExtractRequest {
  text: string
  filename?: string
  apiKey?: string
}

interface Course {
  Category?: string
  CourseName?: string
  GradeLevel?: string
  Length?: string
  Prerequisite?: string
  Credit?: string
  CourseDescription?: string
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text: string }>
    }
  }>
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { text, filename, apiKey: clientApiKey } = req.body as ExtractRequest

    // Use client-provided key or env var
    const GEMINI_API_KEY = clientApiKey || ENV_GEMINI_API_KEY

    if (!GEMINI_API_KEY) {
      return res.status(400).json({ error: 'API key required' })
    }

    if (!text || text.length === 0) {
      return res.status(400).json({ error: 'Text is required' })
    }

    // Build simple prompt
    const prompt = `Extract course data from this document. Return ONLY a valid JSON array.
Fields: Category, CourseName, GradeLevel, Length, Prerequisite, Credit, CourseDescription
Return: [{...}, {...}] or []

Document:
${text.substring(0, 50000)}`

    // Call Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
    
    console.log('[secure_extract] Calling Gemini with key:', GEMINI_API_KEY.substring(0, 10) + '...')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    let response
    try {
      response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
        }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    // Read response as text first
    const responseText = await response.text()
    console.log('[secure_extract] Response status:', response.status, 'First 100 chars:', responseText.substring(0, 100))

    if (!response.ok) {
      console.error('[secure_extract] API error:', responseText.substring(0, 200))
      return res.status(response.status).json({ error: 'Failed to extract courses' })
    }

    // Parse JSON
    let data: GeminiResponse
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error('[secure_extract] Failed to parse response:', e)
      return res.status(500).json({ error: 'Invalid response format from API' })
    }

    // Extract text from response
    const courseText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    console.log('[secure_extract] Got response:', courseText.substring(0, 100))

    if (!courseText) {
      return res.status(200).json([])
    }

    // Parse courses from text
    let courses: Course[] = []
    try {
      const jsonMatch = courseText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        courses = JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      console.error('[secure_extract] Failed to parse courses:', e)
    }

    return res.status(200).json(courses)
  } catch (error) {
    console.error('[secure_extract] Error:', error instanceof Error ? error.message : error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '50mb' } },
}
