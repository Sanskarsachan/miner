import type { NextApiRequest, NextApiResponse } from 'next'
import { ObjectId } from 'mongodb'
import { connectDB } from '@/lib/db'
import { getApiKey, logApiUsage } from '@/lib/api-key-manager'

interface Course {
  Category?: string
  SubCategory?: string
  ProgramSubjectArea?: string
  CourseName?: string
  CourseCode?: string
  CourseAbbrevTitle?: string
  CourseTitle?: string
  GradeLevel?: string
  LevelLength?: string
  CourseLevel?: string
  Length?: string
  CourseLength?: string
  GraduationRequirement?: string
  Credit?: string
  Certification?: string
  Prerequisite?: string
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
    const { text, apiKey, apiKeyId, filename, extractionType } = req.body

    let actualApiKey = apiKey // Direct key (legacy)
    let keyIdForLogging: ObjectId | null = null

    // New: If apiKeyId is provided, look up the key from database
    if (apiKeyId && !apiKey) {
      try {
        const db = await connectDB()
        const keyData = await getApiKey(db, apiKeyId)
        
        if (!keyData) {
          logEntry.error = 'API key not found in pool'
          console.error('[secure_extract] API key not found:', apiKeyId)
          requestLogs.unshift(logEntry)
          if (requestLogs.length > 10) requestLogs.pop()
          return res.status(404).json({ error: 'API key not found' })
        }
        
        actualApiKey = keyData.key
        keyIdForLogging = typeof apiKeyId === 'string' ? new ObjectId(apiKeyId) : apiKeyId
        console.log('[secure_extract] Using API key from pool:', keyData.nickname)
      } catch (dbError) {
        console.error('[secure_extract] Database error:', dbError)
        return res.status(500).json({ error: 'Failed to retrieve API key' })
      }
    }

    logEntry.apiKeyPresent = !!actualApiKey
    logEntry.textLength = text?.length || 0

    if (!actualApiKey) {
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

    const normalizedExtractionType = typeof extractionType === 'string' ? extractionType.trim().toLowerCase() : ''

    const buildPrompt = (mode: string, inputText: string) => {
      if (mode === 'master_db' || mode === 'master-db') {
        return `You are a Florida course catalog extraction expert. Extract ALL course information from the provided Florida DOE master course catalog.

CRITICAL INSTRUCTIONS:
1. Return ONLY a valid JSON array with NO additional text, markdown, or code blocks
2. Start with [ and end with ]
3. For missing fields: Use null (NOT "N/A", NOT empty string, NOT "-")
4. Fix character encoding issues: Replace garbled characters with readable text
5. Include ALL courses found, even if details are partial
6. Use proper JSON escaping for special characters

CATEGORY AND SUBCATEGORY RULES:
- Category headers appear in pipes like |DANCE| or |AGRICULTURE|
- If you see a category header in pipes, use it for Category field
- SubCategory is ONLY used when there's a clear career path header (e.g., "FOOD PRODUCTS & PROCESSING SYSTEMS CAREER PATH")
- For simple categories like DANCE, ART, MUSIC with no subcategory listed: Set SubCategory to null
- Don't invent subcategories - use null if not explicitly stated in the document

PROGRAM HEADER RULES - IMPORTANT:
- The FIRST entry under a new category/subcategory is often a PROGRAM HEADER (not a course)
- Program headers have NO course code and NO credit
- DO NOT include program headers in the JSON output - SKIP THEM ENTIRELY
- Only extract rows that have both a CourseCode AND Credit value
- Use the program header name for the ProgramSubjectArea field of subsequent courses
- After the program header, regular courses follow with full details

COURSE LINE STRUCTURE (typical pattern):
CourseCode CourseName CourseLength GradeLevel Credit Certification CourseAbbrevTitle ProgramSubjectArea [other codes]

Example line:
0300300 WORLD DANCE 2/Y PF 1.0 ANY FIELD WHEN CERT REFLECTS BACHELOR OR HIGHER World Dance DANCE 6 CLASSICAL ED (RESTRICTED) 6 PT FINE PERF ART 7 G

Extracts to:
- CourseCode: "0300300"
- CourseTitle: "WORLD DANCE"
- CourseDuration: "2"
- CourseTerm: "Y"
- GradeLevel: "PF"
- Credit: "1.0"
- Certification: "ANY FIELD WHEN CERT REFLECTS BACHELOR OR HIGHER"
- CourseAbbrevTitle: "World Dance"
- ProgramSubjectArea: "DANCE"

Example with 2/S (2 semesters):
- CourseDuration: "2"
- CourseTerm: "S"

OUTPUT FIELDS (EXACT KEYS):
- Category: string (from |HEADER| or section header) or null
- SubCategory: string (career path header ONLY if clearly stated) or null
- ProgramSubjectArea: string (program/subject area name) or null
- CourseCode: string (course number - REQUIRED, must not be null/empty) or null
- CourseAbbrevTitle: string (abbreviated title) or null
- CourseTitle: string (full course title/name) or null
- GradeLevel: string (grade level) or null
- CourseDuration: string (just the number like "2", "3") or null
- CourseTerm: string (just the term like "Y" for year, "S" for semester) or null
- GraduationRequirement: string (requirements) or null
- Credit: string (credit value - REQUIRED for valid courses) or null
- Certification: string (certification requirements) or null
- CourseLevel: string (course level if stated) or null

STRICT EXAMPLE (follow this format exactly):
[
  {
    "Category": "DANCE",
    "SubCategory": null,
    "ProgramSubjectArea": "DANCE",
    "CourseCode": "0300300",
    "CourseAbbrevTitle": "World Dance",
    "CourseTitle": "WORLD DANCE",
    "GradeLevel": "PF",
    "CourseDuration": "2",
    "CourseTerm": "Y",
    "GraduationRequirement": null,
    "Credit": "1.0",
    "Certification": "ANY FIELD WHEN CERT REFLECTS BACHELOR OR HIGHER",
    "CourseLevel": null
  }
]

REMEMBER: Only include rows with BOTH CourseCode AND Credit. Skip program headers!

DOCUMENT TO EXTRACT FROM:
${inputText}`
      }

      return `You are a course data extraction expert. Extract ALL course information from the provided document.

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
${inputText}`
  }

  // Build prompt that explicitly asks for JSON
  const prompt = buildPrompt(normalizedExtractionType, text)

    logEntry.promptLength = prompt.length
    console.log('[secure_extract] Prompt built, length:', prompt.length)
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${actualApiKey}`
    console.log('[secure_extract] Calling Gemini API with model: gemini-2.5-flash')

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
      
      console.error('[secure_extract] ❌ API Error - Status:', response.status)
      console.error('[secure_extract] ❌ Full response:', responseText.substring(0, 500))
      
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
      console.log('[secure_extract] ✅ Parsed Gemini JSON response')
      console.log('[secure_extract] Response keys:', Object.keys(geminiData))
      console.log('[secure_extract] Full response structure:', JSON.stringify(geminiData).substring(0, 1000))
      
      // Check if prompt was blocked
      if (geminiData.promptFeedback?.blockReason) {
        console.error('[secure_extract] ❌ PROMPT WAS BLOCKED!')
        console.error('[secure_extract] Block reason:', geminiData.promptFeedback.blockReason)
        console.error('[secure_extract] Safety ratings:', JSON.stringify(geminiData.promptFeedback.safetyRatings))
        logEntry.error = `Prompt blocked: ${geminiData.promptFeedback.blockReason}`
        requestLogs.unshift(logEntry)
        if (requestLogs.length > 10) requestLogs.pop()
        return res.status(200).json({ 
          error: 'CONTENT_BLOCKED',
          reason: geminiData.promptFeedback.blockReason,
          message: 'The content was blocked by Gemini safety filters. Try a different document.'
        })
      }
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
    
    console.log('[secure_extract] Has candidates?', !!geminiData.candidates)
    console.log('[secure_extract] Candidates count:', geminiData.candidates?.length || 0)
    console.log('[secure_extract] First candidate:', JSON.stringify(geminiData.candidates?.[0]).substring(0, 500))
    console.log('[secure_extract] Finish reason:', geminiData.candidates?.[0]?.finishReason)
    console.log('[secure_extract] Safety ratings:', JSON.stringify(geminiData.candidates?.[0]?.safetyRatings))
    console.log('[secure_extract] Prompt feedback:', JSON.stringify(geminiData.promptFeedback))
    
    if (!responseContent) {
      console.error('[secure_extract] ❌❌❌ NO TEXT CONTENT IN GEMINI RESPONSE ❌❌❌')
      console.error('[secure_extract] Candidates:', JSON.stringify(geminiData.candidates))
      console.error('[secure_extract] Full response keys:', Object.keys(geminiData))
      console.error('[secure_extract] ===== FULL GEMINI RESPONSE START =====')
      console.error(JSON.stringify(geminiData, null, 2))
      console.error('[secure_extract] ===== FULL GEMINI RESPONSE END =====')
      console.error('[secure_extract] Finish reason:', geminiData.candidates?.[0]?.finishReason)
      console.error('[secure_extract] Block reason:', geminiData.promptFeedback?.blockReason)
      logEntry.error = 'No text content in Gemini response'
      requestLogs.unshift(logEntry)
      if (requestLogs.length > 10) requestLogs.pop()
      
      // Return empty array (keep 200 for frontend compatibility)
      return res.status(200).json([])
    }

    console.log('[secure_extract] Gemini returned text, length:', responseContent.length)
    console.log('[secure_extract] Content preview (first 500):', responseContent.substring(0, 500))
    console.log('[secure_extract] Content preview (last 200):', responseContent.substring(Math.max(0, responseContent.length - 200)))

    // CRITICAL CHECK: If Gemini literally returned "[]" as text, log it
    if (responseContent.trim() === '[]') {
      console.error('[secure_extract] ❌❌❌ GEMINI RETURNED LITERAL EMPTY ARRAY "[]" ❌❌❌')
      console.error('[secure_extract] This means Gemini processed the request but found NO courses')
      console.error('[secure_extract] API Key ID used:', apiKeyId || 'legacy direct key')
      console.error('[secure_extract] Input text length:', text.length)
      console.error('[secure_extract] Input text preview:', text.substring(0, 500))
      console.error('[secure_extract] Finish reason:', geminiData.candidates?.[0]?.finishReason)
      console.error('[secure_extract] Safety ratings:', JSON.stringify(geminiData.candidates?.[0]?.safetyRatings))
      console.error('[secure_extract] ⚠️  POSSIBLE CAUSES: 1) Document format not recognized, 2) API key quota exhausted, 3) Safety filters blocking')
      
      // Log to help diagnose - maybe the prompt is bad or text format is wrong
      logEntry.error = `Gemini returned empty array - API key: ${apiKeyId || 'direct'}, finish: ${geminiData.candidates?.[0]?.finishReason}`
      requestLogs.unshift(logEntry)
      if (requestLogs.length > 10) requestLogs.pop()
      
      // Return empty array (Gemini explicitly said no courses found)
      return res.status(200).json([])
    }

    // Extract JSON array from response
    let courses: Course[] = []
    try {
      const recoverPartialJsonArray = (text: string): string | null => {
        const cleaned = text.replace(/```json|```/g, '')
        const start = cleaned.indexOf('[')
        if (start === -1) return null
        const lastBrace = cleaned.lastIndexOf('}')
        if (lastBrace === -1 || lastBrace <= start) return null
        return cleaned.slice(start, lastBrace + 1) + ']'
      }

      // Try to find JSON array in the response
      const jsonMatch = responseContent.match(/\[[\s\S]*\]/)
      let jsonStr = ''

      if (jsonMatch) {
        jsonStr = jsonMatch[0]
      } else {
        const recovered = recoverPartialJsonArray(responseContent)
        if (!recovered) {
          console.error('[secure_extract] Could not find JSON array in response')
          console.error('[secure_extract] Full response text:', responseContent)
          logEntry.error = 'No JSON array found in Gemini content'
          requestLogs.unshift(logEntry)
          if (requestLogs.length > 10) requestLogs.pop()
          return res.status(200).json([])
        }

        jsonStr = recovered
        console.warn('[secure_extract] Recovered partial JSON array from truncated response')
      }

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
    console.log('[secure_extract] ✅ === EXTRACTION COMPLETE ===', courses.length, 'courses')
    
    // Log API usage if using key pool
    if (keyIdForLogging) {
      try {
        const db = await connectDB()
        await logApiUsage(db, keyIdForLogging, {
          extraction_id: undefined,
          user_id: 'system',
          school_name: undefined,
          file_name: filename,
          requests_count: 1,
          tokens_used: Math.ceil((logEntry.promptLength || 0) / 4),
          prompt_tokens: Math.ceil((logEntry.promptLength || 0) / 4),
          completion_tokens: Math.ceil((logEntry.geminiContentLength || 0) / 4),
          success: true,
          estimated_cost_cents: 0,
        })
        console.log('[secure_extract] ✅ API usage logged for key:', keyIdForLogging.toString())
      } catch (logError) {
        console.error('[secure_extract] Failed to log API usage:', logError)
      }
    }
    
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
