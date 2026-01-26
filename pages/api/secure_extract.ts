import type { NextApiRequest, NextApiResponse } from 'next'

interface Course {
  Category?: string
  CourseName?: string
  GradeLevel?: string
  Length?: string
  Prerequisite?: string
  Credit?: string
  CourseDescription?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { text, apiKey } = req.body

    if (!apiKey) {
      console.error('[extract] No API key provided')
      return res.status(400).json({ error: 'API key required' })
    }

    if (!text || typeof text !== 'string' || text.length === 0) {
      console.error('[extract] No text provided')
      return res.status(400).json({ error: 'Text is required' })
    }

    // Build prompt that explicitly asks for JSON
    const prompt = `You are a course data extraction expert. Extract all course information from the provided document.

Return ONLY a valid JSON array with NO additional text or markdown. Start with [ and end with ].

For each course found, create an object with these fields:
- Category (string or null)
- CourseName (string)
- GradeLevel (string or null)
- Length (string or null)
- Prerequisite (string or null)  
- Credit (string or null)
- CourseDescription (string or null)

Example format:
[
  {"Category":"Science","CourseName":"Biology 101","GradeLevel":"9-12","Length":"1 year","Prerequisite":null,"Credit":"1.0","CourseDescription":"Study of living organisms"},
  {"Category":"Math","CourseName":"Algebra","GradeLevel":"9-10","Length":"1 year","Prerequisite":null,"Credit":"1.0","CourseDescription":"Basic algebra concepts"}
]

DOCUMENT TO EXTRACT FROM:
${text.substring(0, 80000)}`

    console.log('[extract] Calling Gemini API...')
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout

    let response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
          },
        }),
        signal: controller.signal,
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('[extract] Request timed out')
        return res.status(504).json({ error: 'Request timed out - Gemini API took too long' })
      }
      throw fetchError
    }

    clearTimeout(timeoutId)
    const responseText = await response.text()

    console.log('[extract] Gemini status:', response.status)

    if (!response.ok) {
      console.error('[extract] Gemini error response:', responseText.substring(0, 500))
      throw new Error(`Gemini API error: ${response.status}`)
    }

    let geminiData
    try {
      geminiData = JSON.parse(responseText)
    } catch (e) {
      console.error('[extract] Failed to parse Gemini response as JSON')
      console.error('[extract] Response was:', responseText.substring(0, 300))
      throw new Error('Invalid response from Gemini')
    }

    // Extract the text content from Gemini response
    const responseContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!responseContent) {
      console.error('[extract] No text content in Gemini response')
      console.error('[extract] Full response:', JSON.stringify(geminiData).substring(0, 500))
      return res.status(200).json([])
    }

    console.log('[extract] Gemini returned text, length:', responseContent.length)
    console.log('[extract] First 200 chars:', responseContent.substring(0, 200))

    // Extract JSON array from response
    let courses: Course[] = []
    try {
      // Try to find JSON array in the response
      const jsonMatch = responseContent.match(/\[[\s\S]*\]/)
      
      if (!jsonMatch) {
        console.error('[extract] Could not find JSON array in response')
        console.error('[extract] Response text:', responseContent)
        return res.status(200).json([])
      }

      const jsonStr = jsonMatch[0]
      console.log('[extract] Found JSON, parsing...')
      
      courses = JSON.parse(jsonStr)
      console.log('[extract] Successfully parsed', courses.length, 'courses')
    } catch (parseError) {
      console.error('[extract] JSON parse error:', parseError instanceof Error ? parseError.message : String(parseError))
      console.error('[extract] Attempted to parse:', responseContent.substring(0, 300))
      return res.status(200).json([])
    }

    return res.status(200).json(courses)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[extract] Fatal error:', errorMsg)
    return res.status(500).json({ error: errorMsg })
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
}
