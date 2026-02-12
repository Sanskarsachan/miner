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
    
    // Check if document looks like master_db format (has pipes and codes)
    const looksLikeMasterDB = text.includes('|') && text.match(/\|[A-Z\s-]+\|/)
    const looksLikeNumbers = text.match(/\d{7}/) // Master DB course codes are 7 digits
    const looksLikeK12 = text.match(/grade[s]?\s*\d/i) || text.match(/k-12/i) || text.match(/\bages?\s*\d/i)
    
    // Auto-detect format if not specified
    let detectedType = normalizedExtractionType
    if (!detectedType) {
      if (looksLikeMasterDB || looksLikeNumbers) {
        detectedType = 'master_db'
      } else {
        detectedType = 'regular'
      }
      console.log('[secure_extract] Auto-detected format:', detectedType, '(pipes:', looksLikeMasterDB, ', 7-digit codes:', looksLikeNumbers, ', k12:', looksLikeK12, ')')
    } else {
      console.log('[secure_extract] Extraction type specified:', normalizedExtractionType)
      
      // WARN if specified format doesn't match detected format
      const specifiedIsMasterDB = normalizedExtractionType.includes('master')
      if (specifiedIsMasterDB && looksLikeK12 && !looksLikeMasterDB) {
        console.warn('[secure_extract] ⚠️  WARNING: Specified master_db but document looks like K-12 (has grade levels, no pipes)')
        console.warn('[secure_extract] If extraction fails, the format mismatch may be the cause')
        console.warn('[secure_extract] Consider uploading K-12 docs to Course Harvester instead')
      } else if (!specifiedIsMasterDB && looksLikeMasterDB) {
        console.warn('[secure_extract] ⚠️  WARNING: Specified regular but document looks like Florida Master DB (has pipes)')
        console.warn('[secure_extract] Will attempt with regular prompt, but may not extract correctly')
      }
    }

    const buildPrompt = (mode: string, inputText: string) => {
      if (mode === 'master_db' || mode === 'master-db') {
        return `EXTRACT Florida DOE course catalog as JSON array ONLY. Return [ and ].

FIELD MAPPING (find these in order on each line):
1. CourseCode = first number (e.g., 0100300)
2. CourseAbbrevTitle = text after code (e.g., AP ART HISTORY)
3. CourseDuration = NUMBER from "X/Y" pattern (e.g., 3 from "3/Y")
4. CourseTerm = LETTER from "X/Y" pattern (e.g., Y from "3/Y")
   ** PUT "3/Y" VALUE HERE - FIND IT AFTER COURSE NAME **
5. GradeLevel = 2-letter code after X/Y (e.g., PF, PK, PA)
6. Credit = decimal number (e.g., 1.0, 0.5)
7. GraduationRequirement = remaining text on line
8. CourseTitle = first indented line
9. Certification = remaining indented lines

EXACT LOCATION OF X/Y:
Line example: "0100300 AP ART HISTORY 3/Y PF 1.0 HUMANITIES 6 ART 6"
                                       ^^^
                            THIS IS WHAT YOU NEED!

IN JSON: "CourseDuration": "3/Y" (OR if you split: "CourseDuration": "3", "CourseTerm": "Y")

REQUIRED: Category, SubCategory, ProgramSubjectArea(null), CourseCode, CourseAbbrevTitle,
CourseTitle, GradeLevel, CourseDuration, CourseTerm, GraduationRequirement, Credit, 
Certification, CourseLevel

NULL for missing (NOT "-" or "N/A"). Only rows with CourseCode AND Credit.

DOCUMENT:
${inputText}`
      }

      return `EXTRACT ALL COURSES FROM K-12/EDUCATION DOCUMENT. OUTPUT ONLY JSON ARRAY.

SEARCH PATTERNS FOR COURSES:
1. Course Title (any capitalized text that appears to be a course name)
2. Grade Level (e.g., "Grade 9", "Grades 9-12", "K-12", "High School")
3. Credit Hours/Units (e.g., "0.5 credit", "1 unit", ".5 credit")
4. Course Code (e.g., course numbers like "ALG1", "BIO10", "ENG1")
5. Duration/Semester info (e.g., "Full year", "1 semester", "Half year")
6. Prerequisites (any course dependencies mentioned)
7. Category/Subject (Subject area like Math, English, Science, Social Studies, etc.)
8. Description (purpose or content of course)

COMMON K-12 COURSE LISTING FORMATS:
- "Course Name - Grade Level, Credit Hours"
- "Subject: Course Name (Grade Range) - Prerequisites - Description"
- Bulleted or numbered lists with course details
- Table format with course code | name | grade | credit columns
- Category sections (e.g., "MATHEMATICS COURSES:") followed by course listings

SPECIFIC INSTRUCTIONS:
- Look at EVERY paragraph and bullet point - courses can appear anywhere
- If you see a capitalized phrase followed by grade levels, that's likely a course
- Even if not all fields present for a course, INCLUDE IT if you can identify a course name
- Handle partial information - use null for truly missing fields
- Handle decimal credits like ".5" and "0.5"
- Level/Grade examples: "Algebra 1 (Grades 9-12)", "AP Chemistry High School", "Elementary Art"
- Subject/Category: Extract from section headers or infer from course content

OUTPUT JSON STRUCTURE:
{
  "Category": "Subject area (Math, Science, English, etc.) or null",
  "CourseName": "Full course name - REQUIRED, cannot be null",
  "CourseCode": "Code/Number if available, null otherwise",
  "GradeLevel": "Grade range like '9-12' or 'Grades 9-12', null if not applicable",
  "Credit": "Credit hours or units (e.g. '0.5', '1'), null if not specified",
  "Length": "Duration info like 'full year', '1 semester', null if not specified",
  "CourseDescription": "Brief description of course content, null if not available",
  "Details": "Any other relevant info (prerequisites, requirements, etc.), null if none",
  "Prerequisite": "Prerequisite courses, null if none"
}

CRITICAL: 
- Return ONLY the JSON array: [ {...}, {...}, ... ]
- No markdown, no code blocks, ONLY JSON
- CourseName MUST be a string, never null
- Find EVERY course mentioned in this document
- If unsure, include it - better to over-extract than miss courses

DOCUMENT TEXT:
${inputText}`
  }

  // Build prompt that explicitly asks for JSON
    const prompt = buildPrompt(detectedType, text)
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
        
        // Create abort controller for timeout
        // Use 55s timeout (leaves 5s buffer for Vercel 60s limit)
        // High token output needs more time to generate
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 55000)
        
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
              maxOutputTokens: 12000, // Balanced: enough for multi-course chunks, fast enough to avoid timeout
            },
          }),
          signal: controller.signal,
        })
        
        clearTimeout(timeoutId)
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
        await new Promise(r => setTimeout(r, 500 * retryCount)) // Reduced from 1000ms
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
              
              const retryController = new AbortController()
              const retryTimeoutId = setTimeout(() => retryController.abort(), 50000)
              
              const retryResponse = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: { 
                    temperature: 0.1,
                    maxOutputTokens: 12000,
                  },
                }),
                signal: retryController.signal,
              })
              
              clearTimeout(retryTimeoutId)
              
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
    let responseContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
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
      console.error('[secure_extract] Format used:', detectedType)
      console.error('[secure_extract] API Key ID used:', apiKeyId || 'legacy direct key')
      console.error('[secure_extract] Input text length:', text.length)
      console.error('[secure_extract] Input text preview:', text.substring(0, 500))
      console.error('[secure_extract] Finish reason:', geminiData.candidates?.[0]?.finishReason)
      console.error('[secure_extract] Safety ratings:', JSON.stringify(geminiData.candidates?.[0]?.safetyRatings))
      
      // SMART FALLBACK: If master_db returned empty but document looks like K-12, retry with regular prompt
      if ((detectedType === 'master_db' || detectedType === 'master-db') && (looksLikeK12 && !looksLikeMasterDB)) {
        console.warn('[secure_extract] 🔄 FALLBACK: Master DB prompt returned empty, but document looks like K-12')
        console.warn('[secure_extract] Retrying with regular K-12 extraction prompt...')
        
        // Rebuild prompt for regular format
        const regularPrompt = buildPrompt('regular', text)
        console.log('[secure_extract] Fallback prompt length:', regularPrompt.length)
        
        try {
          const fallbackController = new AbortController()
          const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 30000)
          
          const fallbackResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: regularPrompt }],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 12000,
              },
            }),
            signal: fallbackController.signal,
          })
          
          clearTimeout(fallbackTimeoutId)
          
          if (fallbackResponse.ok) {
            const fallbackText = await fallbackResponse.text()
            const fallbackData = JSON.parse(fallbackText)
            const fallbackContentText = fallbackData.candidates?.[0]?.content?.parts?.[0]?.text
            
            if (fallbackContentText && fallbackContentText.trim() !== '[]') {
              console.log('[secure_extract] ✅ FALLBACK SUCCEEDED! Found courses with regular prompt')
              responseContent = fallbackContentText // Use fallback content instead
            } else {
              console.error('[secure_extract] Fallback also returned empty array')
              logEntry.error = `Both master_db and fallback regular returned empty - likely wrong document type`
              requestLogs.unshift(logEntry)
              if (requestLogs.length > 10) requestLogs.pop()
              return res.status(200).json([])
            }
          } else {
            console.error('[secure_extract] Fallback API call failed:', fallbackResponse.status)
            logEntry.error = `Fallback extraction failed (${fallbackResponse.status})`
            requestLogs.unshift(logEntry)
            if (requestLogs.length > 10) requestLogs.pop()
            return res.status(200).json([])
          }
        } catch (fallbackError) {
          console.error('[secure_extract] Fallback error:', fallbackError)
          logEntry.error = `Fallback extraction error`
          requestLogs.unshift(logEntry)
          if (requestLogs.length > 10) requestLogs.pop()
          return res.status(200).json([])
        }
      } else {
        console.error('[secure_extract] ⚠️  POSSIBLE CAUSES:')
        console.error('   1) Format mismatch - document doesn\'t match prompt expectations')
        console.error('   2) Course content too ambiguous for Gemini')
        console.error('   3) Prompt asking for fields that don\'t exist in document')
        console.error('   4) Document has unusual structure')
        
        logEntry.error = `Gemini returned empty array - Format: ${detectedType}, Finish: ${geminiData.candidates?.[0]?.finishReason}`
        requestLogs.unshift(logEntry)
        if (requestLogs.length > 10) requestLogs.pop()
        return res.status(200).json([])
      }
    }

    // Extract JSON array from response
    let courses: Course[] = []
    try {
      // FIRST: Strip markdown code fences if present
      let cleanedContent = responseContent
      if (cleanedContent.includes('```json')) {
        console.log('[secure_extract] Response wrapped in markdown fence, stripping...')
        cleanedContent = cleanedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        console.log('[secure_extract] After markdown strip, length:', cleanedContent.length)
      }

      const recoverPartialJsonArray = (text: string): string | null => {
        const start = text.indexOf('[')
        if (start === -1) {
          console.error('[secure_extract] No opening [ found')
          return null
        }
        
        // Smart recovery: find all COMPLETE course objects, even if the response is truncated
        let pos = start + 1 // Position after [
        let braceDepth = 0
        let completeObjects = 0
        let lastValidPos = start + 1 // Position after [
        
        for (let i = pos; i < text.length; i++) {
          const ch = text[i]
          
          if (ch === '{') {
            braceDepth++
          } else if (ch === '}') {
            braceDepth--
            
            // When we close an object at depth 0 (top level), we have a complete course
            if (braceDepth === 0) {
              completeObjects++
              lastValidPos = i + 1 // Position after the }
              console.log('[secure_extract] Found complete object #' + completeObjects + ' at position ' + i)
            }
          }
        }
        
        if (completeObjects === 0) {
          console.error('[secure_extract] No complete course objects found in response')
          return null
        }
        
        // Close the array after the last complete object
        const recovered = text.slice(start, lastValidPos) + ']'
        console.log('[secure_extract] Recovered ' + completeObjects + ' complete course objects')
        console.log('[secure_extract] Recovered JSON length:', recovered.length)
        console.log('[secure_extract] First 200 chars:', recovered.substring(0, 200))
        console.log('[secure_extract] Last 100 chars:', recovered.substring(Math.max(0, recovered.length - 100)))
        
        return recovered
      }

      // Try to find complete JSON array in the response
      const jsonMatch = cleanedContent.match(/\[[\s\S]*\]/)
      let jsonStr = ''

      if (jsonMatch) {
        console.log('[secure_extract] Found complete JSON array with regex')
        jsonStr = jsonMatch[0]
      } else {
        console.warn('[secure_extract] Could not find complete JSON array, attempting recovery from truncation')
        const recovered = recoverPartialJsonArray(cleanedContent)
        if (!recovered) {
          console.error('[secure_extract] Could not recover partial JSON array')
          console.error('[secure_extract] Full response text:', cleanedContent.substring(0, 500))
          logEntry.error = 'No JSON array found in Gemini content'
          requestLogs.unshift(logEntry)
          if (requestLogs.length > 10) requestLogs.pop()
          return res.status(200).json([])
        }

        jsonStr = recovered
        console.warn('[secure_extract] Recovered partial JSON array from truncated response')
      }

      console.log('[secure_extract] Found JSON array, length:', jsonStr.length)
      
      try {
        courses = JSON.parse(jsonStr)
      } catch (parseError) {
        // JSON is malformed, likely due to truncation. Try to fix it.
        console.warn('[secure_extract] Initial JSON parse failed, attempting to fix truncation:', parseError instanceof Error ? parseError.message : String(parseError))
        
        // Common truncation patterns - try to close incomplete objects
        let fixed = jsonStr
        
        // Try different closure patterns
        const closureAttempts = [
          fixed + '}]',        // Single object truncated
          fixed + '}}]',       // Nested object truncated  
          fixed + '"]',        // String value truncated
          fixed + '"}]',       // Object with string truncated
        ]
        
        let parsed = false
        for (const attempt of closureAttempts) {
          try {
            console.log('[secure_extract] Trying closure pattern:', attempt.substring(Math.max(0, attempt.length - 20)))
            courses = JSON.parse(attempt)
            console.log('[secure_extract] ✅ Successfully parsed after fixing truncation')
            parsed = true
            break
          } catch (e) {
            // Try next pattern
          }
        }
        
        if (!parsed) {
          console.error('[secure_extract] Could not fix truncated JSON')
          console.error('[secure_extract] Attempted JSON:', jsonStr.substring(0, 500))
          
          // If MAX_TOKENS was the finish reason, we know it's truncated
          const finishReason = geminiData.candidates?.[0]?.finishReason
          if (finishReason === 'MAX_TOKENS') {
            console.error('[secure_extract] Response was truncated (MAX_TOKENS) - this is a Gemini issue')
            console.error('[secure_extract] Suggestion: Increase maxOutputTokens or reduce input')
          }
          
          logEntry.error = `JSON parse error: Could not parse or fix truncated JSON`
          requestLogs.unshift(logEntry)
          if (requestLogs.length > 10) requestLogs.pop()
          return res.status(200).json([])
        }
      }
      
      logEntry.coursesExtracted = courses.length
      console.log('[secure_extract] Successfully parsed', courses.length, 'courses')
      
      // Log first course for debugging
      if (courses.length > 0) {
        console.log('[secure_extract] First course:', JSON.stringify(courses[0]).substring(0, 300))
      }
    } catch (parseError) {
      const errMsg = parseError instanceof Error ? parseError.message : String(parseError)
      console.error('[secure_extract] Unexpected error during JSON extraction:', errMsg)
      console.error('[secure_extract] Response content preview:', responseContent.substring(0, 500))
      logEntry.error = `Unexpected error: ${errMsg}`
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
