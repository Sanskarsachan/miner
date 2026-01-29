import type { NextApiRequest, NextApiResponse } from 'next'

interface Course {
  Category?: string
  CourseName?: string
  CourseCode?: string
  GradeLevel?: string
  Length?: string
  Prerequisite?: string
  Credit?: string
  Details?: string
  CourseDescription?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { text, apiKey } = req.body

    if (!apiKey) {
      console.error('[secure_extract] No API key provided')
      return res.status(400).json({ error: 'API key required' })
    }

    if (!text || typeof text !== 'string' || text.length === 0) {
      console.error('[secure_extract] No text provided')
      return res.status(400).json({ error: 'Text is required' })
    }

    // CRITICAL: Check if text is too short to contain courses
    if (text.length < 50) {
      console.warn('[secure_extract] Text too short to contain courses:', text.length, 'chars')
      console.warn('[secure_extract] Full text:', text)
      return res.status(200).json([])
    }

    console.log('[secure_extract] Input validation passed')
    console.log('[secure_extract] Text length:', text.length)
    console.log('[secure_extract] First 200 chars:', text.substring(0, 200))
    console.log('[secure_extract] Last 200 chars:', text.substring(text.length - 200))

    // Build prompt that explicitly asks for JSON
    const prompt = `You are a course data extraction expert. Extract ALL course information from the provided document.

CRITICAL INSTRUCTIONS:
1. Return ONLY a valid JSON array with NO additional text, markdown, or code blocks
2. Start with [ and end with ]
3. For missing fields: Use null (NOT "N/A", NOT empty string, NOT "-")
4. For CourseCode: Extract course code if available, otherwise use null
5. Fix character encoding issues: Replace garbled characters with readable text
6. Include ALL courses found, even if details are partial
7. Use proper JSON escaping for special characters

For each course, create an object with EXACTLY these fields:
- Category: string (department/category name) or null
- CourseName: string (course title - REQUIRED, must not be null)
- CourseCode: string (course number/code) or null
- GradeLevel: string (grade range like "9-12") or null
- Length: string (duration like "1 semester" or "1 year") or null
- Prerequisite: string (prerequisite courses) or null
- Credit: string (credit hours) or null
- Details: string (additional notes/details) or null
- CourseDescription: string (full course description) or null

STRICT EXAMPLE (follow this format exactly):
[
  {
    "Category": "Mathematics",
    "CourseName": "Algebra I",
    "CourseCode": "MATH101",
    "GradeLevel": "9-10",
    "Length": "1 year",
    "Prerequisite": null,
    "Credit": "1.0",
    "Details": "Foundation course in algebra",
    "CourseDescription": "Introduction to algebraic concepts including variables, equations, and functions"
  },
  {
    "Category": "Science",
    "CourseName": "Physics",
    "CourseCode": null,
    "GradeLevel": "11-12",
    "Length": "2 semesters",
    "Prerequisite": "Algebra I",
    "Credit": "1.0",
    "Details": "Honors course available",
    "CourseDescription": "Study of motion, forces, energy and waves"
  }
]

DOCUMENT TO EXTRACT FROM:
${text}`

    console.log('[secure_extract] Prompt built, length:', prompt.length)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

    let response
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
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
            },
          }),
        })
        break // Success, exit retry loop
      } catch (fetchError) {
        retryCount++
        if (retryCount >= maxRetries) {
          console.error('[secure_extract] Fetch error:', fetchError instanceof Error ? fetchError.message : String(fetchError))
          throw fetchError
        }
      }
    }

    const responseText = await response.text()

    console.log('[secure_extract] Gemini response status:', response.status)
    console.log('[secure_extract] Response length:', responseText.length)
    
    if (!response.ok) {
      // Try to extract error details from Gemini response
      let errorDetail = 'Unknown error'
      let retryAfter = 0
      
      console.log('[secure_extract] API Error - Full response:', responseText.substring(0, 500))
      
      try {
        const errorData = JSON.parse(responseText)
        errorDetail = errorData.error?.message || errorData.message || JSON.stringify(errorData).substring(0, 200)
        
        // Check for rate limit and extract retry-after
        if (errorData.error?.code === 429 && errorData.error?.message?.includes('Please retry in')) {
          const match = errorData.error.message.match(/Please retry in ([\d.]+)s/)
          if (match) {
            retryAfter = Math.ceil(parseFloat(match[1]) * 1000) // Convert to milliseconds
            console.log(`[secure_extract] Rate limited. Retry after ${retryAfter}ms`)
          }
        }
      } catch (e) {
        errorDetail = responseText.substring(0, 200)
      }
      
      console.error('[secure_extract] Gemini error code:', response.status)
      console.error('[secure_extract] Gemini error details:', errorDetail)
      throw new Error(`Gemini API error (${response.status}): ${errorDetail}`)
    }

    let geminiData
    try {
      geminiData = JSON.parse(responseText)
    } catch (e) {
      console.error('[secure_extract] Failed to parse Gemini response as JSON')
      console.error('[secure_extract] Response was:', responseText.substring(0, 300))
      throw new Error('Invalid response from Gemini')
    }

    // Extract the text content from Gemini response
    const responseContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!responseContent) {
      console.error('[secure_extract] No text content in Gemini response')
      console.error('[secure_extract] Full response:', JSON.stringify(geminiData).substring(0, 500))
      return res.status(200).json([])
    }

    console.log('[secure_extract] Gemini returned text, length:', responseContent.length)
    console.log('[secure_extract] First 200 chars:', responseContent.substring(0, 200))

    // Extract JSON array from response
    let courses: Course[] = []
    try {
      // Try to find JSON array in the response
      const jsonMatch = responseContent.match(/\[[\s\S]*\]/)
      
      if (!jsonMatch) {
        console.error('[secure_extract] Could not find JSON array in response')
        console.error('[secure_extract] Response text:', responseContent)
        return res.status(200).json([])
      }

      const jsonStr = jsonMatch[0]
      console.log('[secure_extract] Found JSON, parsing...')
      
      courses = JSON.parse(jsonStr)
      console.log('[secure_extract] Successfully parsed', courses.length, 'courses')
    } catch (parseError) {
      console.error('[secure_extract] JSON parse error:', parseError instanceof Error ? parseError.message : String(parseError))
      console.error('[secure_extract] Attempted to parse:', responseContent.substring(0, 300))
      return res.status(200).json([])
    }

    return res.status(200).json(courses)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[secure_extract] Fatal error:', errorMsg)
    // Return empty array with 200 status (not 500) to avoid client parsing issues
    // Client will receive empty array and user will see "0 courses extracted" instead of crash
    return res.status(200).json([])
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
}
