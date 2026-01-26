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
      console.error('[secure_extract] ❌ No API key provided')
      return res.status(400).json({ error: 'API key required' })
    }

    if (!text || typeof text !== 'string' || text.length === 0) {
      console.error('[secure_extract] ❌ No text provided')
      return res.status(400).json({ error: 'Text is required' })
    }

    console.log('[secure_extract] ✓ Input validation passed')
    console.log('[secure_extract] Text length:', text.length)
    console.log('[secure_extract] First 100 chars:', text.substring(0, 100))

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

    console.log('[secure_extract] ✓ Prompt built, length:', prompt.length)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

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
            // No maxOutputTokens limit - let Gemini return complete JSON
          },
        }),
      })
    } catch (fetchError) {
      console.error('[secure_extract] ❌ Fetch error:', fetchError instanceof Error ? fetchError.message : String(fetchError))
      throw fetchError
    }
    const responseText = await response.text()

    console.log('[secure_extract] 📬 Gemini response status:', response.status)
    console.log('[secure_extract] Response length:', responseText.length)
    console.log('[secure_extract] First 300 chars:', responseText.substring(0, 300))

    if (!response.ok) {
      console.error('[secure_extract] ❌ Gemini error response:', responseText.substring(0, 500))
      
      // Try to extract error details from Gemini response
      let errorDetail = 'Unknown error'
      try {
        const errorData = JSON.parse(responseText)
        errorDetail = errorData.error?.message || errorData.message || JSON.stringify(errorData).substring(0, 200)
      } catch (e) {
        errorDetail = responseText.substring(0, 200)
      }
      
      console.error('[secure_extract] ❌ Gemini error details:', errorDetail)
      throw new Error(`Gemini API error (${response.status}): ${errorDetail}`)
    }

    let geminiData
    try {
      geminiData = JSON.parse(responseText)
    } catch (e) {
      console.error('[secure_extract] ❌ Failed to parse Gemini response as JSON')
      console.error('[secure_extract] Response was:', responseText.substring(0, 300))
      throw new Error('Invalid response from Gemini')
    }

    // Extract the text content from Gemini response
    const responseContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!responseContent) {
      console.error('[secure_extract] ❌ No text content in Gemini response')
      console.error('[secure_extract] Full response:', JSON.stringify(geminiData).substring(0, 500))
      return res.status(200).json([])
    }

    console.log('[secure_extract] ✓ Gemini returned text, length:', responseContent.length)
    console.log('[secure_extract] First 200 chars:', responseContent.substring(0, 200))

    // Extract JSON array from response
    let courses: Course[] = []
    try {
      // Try to find JSON array in the response
      const jsonMatch = responseContent.match(/\[[\s\S]*\]/)
      
      if (!jsonMatch) {
        console.error('[secure_extract] ❌ Could not find JSON array in response')
        console.error('[secure_extract] Response text:', responseContent)
        return res.status(200).json([])
      }

      const jsonStr = jsonMatch[0]
      console.log('[secure_extract] 📋 Found JSON, parsing...')
      
      courses = JSON.parse(jsonStr)
      console.log('[secure_extract] ✅ Successfully parsed', courses.length, 'courses')
    } catch (parseError) {
      console.error('[secure_extract] ❌ JSON parse error:', parseError instanceof Error ? parseError.message : String(parseError))
      console.error('[secure_extract] Attempted to parse:', responseContent.substring(0, 300))
      return res.status(200).json([])
    }

    return res.status(200).json(courses)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[secure_extract] ❌ Fatal error:', errorMsg)
    // Return empty array instead of error object to avoid client parsing issues
    // Client will receive empty array and user will see "0 courses extracted" instead of crash
    return res.status(500).json([])
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
}
