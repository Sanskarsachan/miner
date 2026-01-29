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

// In-memory log store for debugging (last 10 requests)
const requestLogs: Array<{
  timestamp: string
  textLength: number
  promptLength: number
  apiKeyPresent: boolean
  geminiStatus?: number
  geminiResponseLength?: number
  geminiContentLength?: number
  coursesExtracted: number
  error?: string
  firstChars?: string
  lastChars?: string
}> = []

// Export for debug endpoint
export function getRequestLogs() {
  return requestLogs
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const logEntry: typeof requestLogs[0] = {
    timestamp: new Date().toISOString(),
    textLength: 0,
    promptLength: 0,
    apiKeyPresent: false,
    coursesExtracted: 0,
  }

  try {
    const { text, apiKey } = req.body

    logEntry.apiKeyPresent = !!apiKey
    logEntry.textLength = text?.length || 0

    if (!apiKey) {
      logEntry.error = 'No API key provided'
      console.error('[secure_extract] No API key provided')
      requestLogs.unshift(logEntry)
      if (requestLogs.length > 10) requestLogs.pop()
      return res.status(400).json({ error: 'API key required' })
    }

    if (!text || typeof text !== 'string' || text.length === 0) {
      logEntry.error = 'No text provided'
      console.error('[secure_extract] No text provided')
      requestLogs.unshift(logEntry)
      if (requestLogs.length > 10) requestLogs.pop()
      return res.status(400).json({ error: 'Text is required' })
    }

    // CRITICAL: Check if text is too short to contain courses
    if (text.length < 50) {
      logEntry.error = `Text too short: ${text.length} chars`
      console.warn('[secure_extract] Text too short to contain courses:', text.length, 'chars')
      requestLogs.unshift(logEntry)
      if (requestLogs.length > 10) requestLogs.pop()
      return res.status(200).json([])
    }

    logEntry.firstChars = text.substring(0, 100)
    logEntry.lastChars = text.substring(text.length - 100)

    console.log('[secure_extract] === NEW EXTRACTION REQUEST ===')
    console.log('[secure_extract] Text length:', text.length)
    console.log('[secure_extract] First 300 chars:', text.substring(0, 300))
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

    logEntry.promptLength = prompt.length
    console.log('[secure_extract] Prompt built, length:', prompt.length)
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
    console.log('[secure_extract] Calling Gemini API...')

    let response: Response | undefined
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
      try {
        console.log(`[secure_extract] Fetch attempt ${retryCount + 1}/${maxRetries}`)
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
        console.log('[secure_extract] Fetch succeeded, status:', response.status)
        break // Success, exit retry loop
      } catch (fetchError) {
        retryCount++
        const errMsg = fetchError instanceof Error ? fetchError.message : String(fetchError)
        console.error(`[secure_extract] Fetch attempt ${retryCount} failed:`, errMsg)
        if (retryCount >= maxRetries) {
          logEntry.error = `Fetch failed after ${maxRetries} attempts: ${errMsg}`
          requestLogs.unshift(logEntry)
          if (requestLogs.length > 10) requestLogs.pop()
          throw fetchError
        }
        // Wait before retry
        await new Promise(r => setTimeout(r, 1000 * retryCount))
      }
    }

    if (!response) {
      logEntry.error = 'No response received from Gemini'
      requestLogs.unshift(logEntry)
      if (requestLogs.length > 10) requestLogs.pop()
      return res.status(200).json([])
    }

    let responseText = await response.text()
    logEntry.geminiStatus = response.status
    logEntry.geminiResponseLength = responseText.length

    console.log('[secure_extract] Gemini response status:', response.status)
    console.log('[secure_extract] Response length:', responseText.length)
    console.log('[secure_extract] Response preview:', responseText.substring(0, 500))
    
    if (!response.ok) {
      // Try to extract error details from Gemini response
      let errorDetail = 'Unknown error'
      let retryAfter = 0
      let retrySucceeded = false
      
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
            
            // If retry time is reasonable (< 120 seconds), wait and retry automatically
            if (retryAfter > 0 && retryAfter < 120000) {
              console.log(`[secure_extract] Waiting ${retryAfter}ms before automatic retry...`)
              await new Promise(resolve => setTimeout(resolve, retryAfter + 1000)) // Add 1 second buffer
              
              // Recursive retry - make the API call again
              console.log('[secure_extract] Retrying after rate limit wait...')
              const retryResponse = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: { temperature: 0.1 },
                }),
              })
              
              if (retryResponse.ok) {
                const retryText = await retryResponse.text()
                console.log('[secure_extract] Retry succeeded, response length:', retryText.length)
                responseText = retryText
                response = retryResponse
                retrySucceeded = true
                // Continue processing below (skip the throw)
              } else {
                console.error('[secure_extract] Retry also failed:', retryResponse.status)
                // Let it fall through to the error handling
              }
            }
          }
        }
      } catch (e) {
        errorDetail = responseText.substring(0, 200)
      }
      
      // Only throw if we didn't successfully retry
      if (!retrySucceeded) {
        console.error('[secure_extract] Gemini error code:', response.status)
        console.error('[secure_extract] Gemini error details:', errorDetail)
        logEntry.error = `Gemini API error (${response.status}): ${errorDetail}`
        requestLogs.unshift(logEntry)
        if (requestLogs.length > 10) requestLogs.pop()
        
        // Return specific error for rate limiting so client can show proper message
        if (response.status === 429) {
          return res.status(429).json({ 
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'API rate limit reached. Free tier allows 20 requests/day.',
            retryAfter: retryAfter > 0 ? Math.ceil(retryAfter / 1000) : 60,
            suggestion: 'Please wait a minute and try again, or use a different API key.'
          })
        }
        
        throw new Error(`Gemini API error (${response.status}): ${errorDetail}`)
      }
    }

    let geminiData
    try {
      geminiData = JSON.parse(responseText)
      console.log('[secure_extract] Parsed Gemini JSON response')
    } catch (e) {
      console.error('[secure_extract] Failed to parse Gemini response as JSON')
      console.error('[secure_extract] Response was:', responseText.substring(0, 500))
      logEntry.error = 'Failed to parse Gemini response as JSON'
      requestLogs.unshift(logEntry)
      if (requestLogs.length > 10) requestLogs.pop()
      throw new Error('Invalid response from Gemini')
    }

    // Extract the text content from Gemini response
    const responseContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
    logEntry.geminiContentLength = responseContent?.length || 0
    
    if (!responseContent) {
      console.error('[secure_extract] No text content in Gemini response')
      console.error('[secure_extract] Candidates:', JSON.stringify(geminiData.candidates).substring(0, 500))
      console.error('[secure_extract] Full response keys:', Object.keys(geminiData))
      logEntry.error = 'No text content in Gemini response'
      requestLogs.unshift(logEntry)
      if (requestLogs.length > 10) requestLogs.pop()
      return res.status(200).json([])
    }

    console.log('[secure_extract] Gemini returned text, length:', responseContent.length)
    console.log('[secure_extract] Content preview (first 500):', responseContent.substring(0, 500))

    // Extract JSON array from response
    let courses: Course[] = []
    try {
      // Try to find JSON array in the response
      const jsonMatch = responseContent.match(/\[[\s\S]*\]/)
      
      if (!jsonMatch) {
        console.error('[secure_extract] Could not find JSON array in response')
        console.error('[secure_extract] Full response text:', responseContent)
        logEntry.error = 'No JSON array found in Gemini content'
        requestLogs.unshift(logEntry)
        if (requestLogs.length > 10) requestLogs.pop()
        return res.status(200).json([])
      }

      const jsonStr = jsonMatch[0]
      console.log('[secure_extract] Found JSON array, length:', jsonStr.length)
      
      courses = JSON.parse(jsonStr)
      logEntry.coursesExtracted = courses.length
      console.log('[secure_extract] Successfully parsed', courses.length, 'courses')
      
      // Log first course for debugging
      if (courses.length > 0) {
        console.log('[secure_extract] First course:', JSON.stringify(courses[0]).substring(0, 300))
      }
    } catch (parseError) {
      const errMsg = parseError instanceof Error ? parseError.message : String(parseError)
      console.error('[secure_extract] JSON parse error:', errMsg)
      console.error('[secure_extract] Attempted to parse:', responseContent.substring(0, 500))
      logEntry.error = `JSON parse error: ${errMsg}`
      requestLogs.unshift(logEntry)
      if (requestLogs.length > 10) requestLogs.pop()
      return res.status(200).json([])
    }

    // Success - save log and return
    requestLogs.unshift(logEntry)
    if (requestLogs.length > 10) requestLogs.pop()
    console.log('[secure_extract] === EXTRACTION COMPLETE ===', courses.length, 'courses')
    
    return res.status(200).json(courses)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[secure_extract] Fatal error:', errorMsg)
    logEntry.error = `Fatal: ${errorMsg}`
    requestLogs.unshift(logEntry)
    if (requestLogs.length > 10) requestLogs.pop()
    // Return empty array with 200 status (not 500) to avoid client parsing issues
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
