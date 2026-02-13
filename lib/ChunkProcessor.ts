interface ProcessProgress {
  status: 'processing' | 'chunk_complete' | 'chunk_error' | 'waiting'
  total: number
  current: number
  message: string
  coursesFound?: number
  tokensUsed?: number
  tokensRemaining?: number
  pagesProcessed?: number
}

interface APIUsageStats {
  tokensUsedToday: number
  tokensLimitPerDay: number
  requestsUsedToday: number
  requestsLimitPerDay: number
  coursesExtracted: number
  pagesProcessed: number
}

export interface Course {
  Category?: string
  CourseName: string
  CourseCode?: string
  CourseAbbrevTitle?: string  // For Florida master DB: abbreviated title
  CourseTitle?: string        // For Florida master DB: full title
  GradeLevel?: string
  Length?: string
  CourseDuration?: string  // For Florida master DB: duration number (from "3/Y")
  CourseTerm?: string      // For Florida master DB: term letter (from "3/Y")
  Prerequisite?: string
  Credit?: string
  Details?: string
  CourseDescription?: string
  GraduationRequirement?: string  // For Florida master DB: graduation requirements
  Certification?: string          // For Florida master DB: certification info
  SourceFile?: string
}

export class ChunkProcessor {
  private maxTokensPerChunk = 150000 // Increased for faster processing
  private retryAttempts = 3
  private retryDelay = 800 // Optimized for speed
  private batchSize = 3 // Process 3 pages at a time
  
  // Free tier limits per day
  private FREE_TIER_TOKENS_PER_DAY = 1000000 // 1M tokens/day
  private FREE_TIER_REQUESTS_PER_DAY = 20 // 20 requests/day
  
  private usageStats: APIUsageStats = {
    tokensUsedToday: 0,
    tokensLimitPerDay: this.FREE_TIER_TOKENS_PER_DAY,
    requestsUsedToday: 0,
    requestsLimitPerDay: this.FREE_TIER_REQUESTS_PER_DAY,
    coursesExtracted: 0,
    pagesProcessed: 0,
  }

  constructor(
    private onProgress: (progress: ProcessProgress) => void = () => {},
    private onError: (error: Error) => void = console.error,
    private apiKeyId: string = ''  // NEW: Accept API key ID from pool
  ) {}

  getUsageStats(): APIUsageStats {
    return { ...this.usageStats }
  }

  recordTokenUsage(tokens: number, courses: number = 0): void {
    this.usageStats.tokensUsedToday += tokens
    this.usageStats.requestsUsedToday += 1
    this.usageStats.coursesExtracted += courses
    this.usageStats.pagesProcessed += this.batchSize
  }

  getTokensRemaining(): number {
    return Math.max(0, this.usageStats.tokensLimitPerDay - this.usageStats.tokensUsedToday)
  }

  getRequestsRemaining(): number {
    return Math.max(0, this.usageStats.requestsLimitPerDay - this.usageStats.requestsUsedToday)
  }

  canProcessBatch(): boolean {
    const tokensNeeded = Math.ceil(this.maxTokensPerChunk * 0.5)
    return this.getTokensRemaining() >= tokensNeeded && this.getRequestsRemaining() >= 1
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  /**
   * Split text into semantic chunks based on document structure
   * This reduces API calls by grouping related content
   */
  createSemanticChunks(text: string): string[] {
    const chunks: string[] = []

    // Try to split by common section headers
    const sectionPattern = /\n(?=[A-Z][A-Z\s]{3,}:|\d+\.\s+[A-Z]|\n\n[A-Z][A-Z\s]+\n)/
    const sections = text.split(sectionPattern)

    let currentChunk = ''
    let currentTokens = 0

    for (const section of sections) {
      const sectionTokens = this.estimateTokens(section)

      // If adding this section would exceed limit, save current chunk and start new one
      if (currentTokens + sectionTokens > this.maxTokensPerChunk && currentChunk) {
        chunks.push(currentChunk.trim())
        currentChunk = section
        currentTokens = sectionTokens
      } else {
        currentChunk += '\n\n' + section
        currentTokens += sectionTokens
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }

    return chunks.length > 0 ? chunks : [text]
  }

  /**
   * Process a single chunk with retry logic and exponential backoff
   */
  async processChunk(text: string, filename: string, attempt: number = 1): Promise<Course[]> {
    try {
      // Auto-detect extraction type based on content
      const isMasterDB = text.includes('|') && text.match(/\|[A-Z\s-]+\|/)
      const extractionType = isMasterDB ? 'master_db' : 'regular'
      
      console.log('[ChunkProcessor] Calling /api/secure_extract with', text.length, 'chars, apiKeyId present:', !!this.apiKeyId)
      console.log('[ChunkProcessor] Detected format:', extractionType)
      
      // Create AbortController with 45 second timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 45000) // 45 second timeout
      
      const response = await fetch('/api/secure_extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, filename, apiKeyId: this.apiKeyId, extractionType }),  // Send extraction type
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId) // Clear timeout on successful response

      console.log('[ChunkProcessor] Response status:', response.status)

      // Always read as text first (to avoid "body stream already read" error)
      let responseText = ''
      try {
        responseText = await response.text()
        console.log('[ChunkProcessor] Response text length:', responseText.length)
        console.log('[ChunkProcessor] Full response text:', responseText.substring(0, 500))
      } catch (textError) {
        console.error('[ChunkProcessor] Failed to read response text:', textError)
        throw new Error('Failed to read API response')
      }

      // Try to parse response as JSON
      let data: any = []
      try {
        if (responseText) {
          data = JSON.parse(responseText)
        }
      } catch (parseError) {
        console.error('[ChunkProcessor] Failed to parse response as JSON:', parseError)
        console.error('[ChunkProcessor] Response text was:', responseText.substring(0, 300))
        throw new Error(`Invalid API response: ${responseText.substring(0, 100)}`)
      }

      // Handle error responses (HTTP errors, API errors)
      if (!response.ok) {
        console.error(`[ChunkProcessor] ❌ API returned HTTP ${response.status}`)
        console.error('[ChunkProcessor] Response:', JSON.stringify(data).substring(0, 500))

        // Handle rate limiting - throw a special error that the UI can catch
        if (response.status === 429) {
          const rateLimitError = new Error(
            data.message || 'API rate limit reached. Free tier allows 20 requests/day.'
          )
          // Add custom properties to identify this as a rate limit error
          ;(rateLimitError as any).isRateLimit = true
          ;(rateLimitError as any).retryAfter = data.retryAfter || 60
          ;(rateLimitError as any).suggestion = data.suggestion || 'Please wait and try again, or use a different API key.'
          throw rateLimitError
        }

        // For 500 errors, log and return empty array
        if (response.status === 500) {
          console.error('[ChunkProcessor] ❌ API returned 500 error. Check server logs for details.')
          console.error('[ChunkProcessor] Error details:', JSON.stringify(data))
          // Return empty array - client will show "0 courses extracted"
          return []
        }

        // For other errors, throw
        throw new Error(
          `API Error (HTTP ${response.status}): ${typeof data === 'string' ? data.substring(0, 100) : JSON.stringify(data).substring(0, 100)}`
        )
      }

      // Data should be an array of courses
      if (!Array.isArray(data)) {
        console.error('[ChunkProcessor] API response is not an array:', typeof data)
        return []
      }

      const courses = this.extractCoursesFromResponse(data)
      console.log(`[ChunkProcessor] Extracted ${courses.length} courses from API response`)
      
      // Post-process: Split Duration/Term if needed
      const processedCourses = this.normalizeDurationTerm(courses)
      console.log(`[ChunkProcessor] After post-processing: ${processedCourses.length} courses`)
      
      return processedCourses
    } catch (error: any) {
      // Handle abort/timeout errors
      if (error.name === 'AbortError') {
        console.error('[ChunkProcessor] Request timed out after 45 seconds')
        // Retry timeouts
        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1)
          console.log(`[ChunkProcessor] Retrying after timeout (attempt ${attempt + 1}/${this.retryAttempts}) after ${delay}ms`)
          await new Promise((r) => setTimeout(r, delay))
          return this.processChunk(text, filename, attempt + 1)
        }
        // After exhausting retries, return empty array instead of throwing
        console.error('[ChunkProcessor] Timeout retry limit reached, returning empty array')
        return []
      }
      
      // Handle network errors (failed to fetch)
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        console.error('[ChunkProcessor] Network error:', error.message)
        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1)
          console.log(`[ChunkProcessor] Retrying after network error (attempt ${attempt + 1}/${this.retryAttempts}) after ${delay}ms`)
          await new Promise((r) => setTimeout(r, delay))
          return this.processChunk(text, filename, attempt + 1)
        }
        // After exhausting retries, return empty array instead of throwing
        console.error('[ChunkProcessor] Network error retry limit reached, returning empty array')
        return []
      }
      
      // Don't retry rate limit errors - throw immediately so UI can show modal
      if (error?.isRateLimit) {
        console.log('[ChunkProcessor] Rate limit error - not retrying, throwing to UI')
        throw error
      }
      
      // Retry on other network errors, but not on validation errors
      if (attempt < this.retryAttempts && !(error instanceof SyntaxError)) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1)
        console.log(`[ChunkProcessor] Retrying (attempt ${attempt + 1}/${this.retryAttempts}) after ${delay}ms`)
        await new Promise((r) => setTimeout(r, delay))
        return this.processChunk(text, filename, attempt + 1)
      }

      // If we've exhausted retries or it's a non-retryable error, throw
      throw error
    }
  }

  /**
   * Normalize Duration/Term fields
   * If CourseDuration contains "X/Y" format, split it into separate fields
   * Also attempts to extract from other fields if not found
   */
  normalizeDurationTerm(courses: Course[]): Course[] {
    return courses.map(course => {
      let duration = course.CourseDuration
      let term = course.CourseTerm

      // If CourseDuration exists and has X/Y format, split it
      if (duration && typeof duration === 'string') {
        const match = duration.match(/^(\d+)\/([A-Z])$/i)
        if (match) {
          const [, dur, t] = match
          console.log(`[ChunkProcessor] Splitting "${duration}" → Duration="${dur}", Term="${t}"`)
          return {
            ...course,
            CourseDuration: dur,
            CourseTerm: t,
          }
        }
      }

      // Fallback: Try to extract X/Y from other fields if CourseDuration is empty/missing
      if ((!duration || duration === '-' || duration === null) && !term) {
        // Try to find X/Y pattern in CourseAbbrevTitle or other fields
        const searchText = `${course.CourseAbbrevTitle || ''} ${course.Length || ''}`
        
        // Look for pattern like "3/Y" or "2/S" anywhere in the text
        const match = searchText.match(/(\d+)\/([A-Z])/i)
        if (match) {
          const [fullMatch, dur, t] = match
          console.log(`[ChunkProcessor] Extracted Duration/Term from text: "${fullMatch}" → Duration="${dur}", Term="${t}"`)
          return {
            ...course,
            CourseDuration: dur,
            CourseTerm: t,
            Length: course.Length || `${dur}/${t}`, // Preserve original if it has meaning
          }
        }
      }

      return course
    })
  }

  /**
   * Extract JSON array from API response text
   */
  extractCoursesFromResponse(data: any): Course[] {
    console.log('[ChunkProcessor] extractCoursesFromResponse received:', JSON.stringify(data).substring(0, 300))
    
    // If data is already an array, return it (backend already parsed)
    if (Array.isArray(data)) {
      console.log('[ChunkProcessor] Data is already an array, length:', data.length)
      return data
    }

    // Otherwise try to extract from Gemini response structure
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || data.text || ''

    if (!text) {
      console.warn('[ChunkProcessor] API returned empty response')
      console.warn('[ChunkProcessor] Data structure:', typeof data, Object.keys(data || {}))
      return []
    }

    // Find JSON array using bracket matching
    const firstBracket = text.indexOf('[')
    if (firstBracket === -1) {
      console.warn('[ChunkProcessor] No JSON array found in response:', text.substring(0, 200))
      return []
    }

    let depth = 0
    for (let i = firstBracket; i < text.length; i++) {
      if (text[i] === '[') {
        depth++
      } else if (text[i] === ']') {
        depth--
        if (depth === 0) {
          try {
            const jsonStr = text.slice(firstBracket, i + 1)
            console.log('[ChunkProcessor] Found and parsing JSON, length:', jsonStr.length)
            const courses = JSON.parse(jsonStr)
            console.log('[ChunkProcessor] Successfully extracted', courses.length, 'courses')
            return Array.isArray(courses) ? courses : []
          } catch (e) {
            console.error('[ChunkProcessor] JSON parse error:', e)
            console.error('[ChunkProcessor] Attempted to parse:', text.slice(firstBracket, i + 1).substring(0, 500))
            return []
          }
        }
      }
    }

    console.warn('[ChunkProcessor] Unmatched brackets in response')
    return []
  }

  /**
   * Process entire document with progress tracking
   */
  async processDocument(text: string, filename: string): Promise<Course[]> {
    const chunks = this.createSemanticChunks(text)
    const totalChunks = chunks.length

    this.onProgress({
      status: 'processing',
      total: totalChunks,
      current: 0,
      message: `Split into ${totalChunks} chunk${totalChunks === 1 ? '' : 's'}`,
    })

    const allCourses: Course[] = []

    for (let i = 0; i < chunks.length; i++) {
      const chunkNum = i + 1

      this.onProgress({
        status: 'processing',
        total: totalChunks,
        current: chunkNum,
        message: `Processing chunk ${chunkNum} of ${totalChunks}...`,
      })

      try {
        const courses = await this.processChunk(chunks[i], filename)
        allCourses.push(...courses)

        this.onProgress({
          status: 'chunk_complete',
          total: totalChunks,
          current: chunkNum,
          coursesFound: courses.length,
          message: `✓ Found ${courses.length} course${courses.length === 1 ? '' : 's'} in chunk ${chunkNum}`,
        })

        // Minimal delay between chunks (Gemini 2.5 Flash has 15 RPM = 1 per 4s, but bursts allowed)
        if (i < chunks.length - 1) {
          await new Promise((r) => setTimeout(r, 100))
        }
      } catch (error: any) {
        // Re-throw rate limit errors so UI can show modal
        if (error?.isRateLimit) {
          console.log('[ChunkProcessor] Rate limit error in processDocument - re-throwing to UI')
          throw error
        }
        
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        this.onError(error instanceof Error ? error : new Error(errorMsg))

        this.onProgress({
          status: 'chunk_error',
          total: totalChunks,
          current: chunkNum,
          message: `Error in chunk ${chunkNum}: ${errorMsg}`,
        })

        // Continue with next chunk instead of failing entire document
      }
    }

    // Deduplicate courses - log how many are removed
    const beforeDedup = allCourses.length
    const deduplicated = this.deduplicateCourses(allCourses)
    const dupesRemoved = beforeDedup - deduplicated.length

    console.log(`[ChunkProcessor] Deduplication: ${beforeDedup} → ${deduplicated.length} (removed ${dupesRemoved} duplicates)`)

    // Log completion summary
    console.log(`[ChunkProcessor] ✅ Document processing complete:`)
    console.log(`  - Total chunks: ${totalChunks}`)
    console.log(`  - Courses found: ${deduplicated.length}`)
    console.log(`  - Duplicates removed: ${dupesRemoved}`)
    
    if (deduplicated.length === 0) {
      console.warn(`[ChunkProcessor] ⚠️  WARNING: No courses found in document "${filename}"`)
      console.warn(`  - This could mean: empty document, wrong format, or all chunks failed`)
    }

    // Report final progress
    this.onProgress({
      status: 'processing',
      total: totalChunks,
      current: totalChunks,
      coursesFound: deduplicated.length,
      message: `✓ Extraction complete! Found ${deduplicated.length} unique course${deduplicated.length === 1 ? '' : 's'} (removed ${dupesRemoved} duplicates)`,
    })

    return deduplicated
  }

  /**
   * Remove duplicate courses based on category, name, and grade level
   */
  private deduplicateCourses(courses: Course[]): Course[] {
    const seen = new Map<string, Course>()

    for (const course of courses) {
      // Normalize course name for comparison (remove extra spaces, lowercase)
      const normalizedName = (course.CourseName || '').replace(/\s+/g, ' ').toLowerCase().trim()
      const key = `${(course.Category || '').toLowerCase().trim()}|${normalizedName}|${(course.GradeLevel || '').toLowerCase().trim()}`

      // Keep first occurrence of each unique course
      if (!seen.has(key)) {
        seen.set(key, course)
      }
    }

    const result = Array.from(seen.values())
    console.log(`[ChunkProcessor] Dedup: kept ${result.length}/${courses.length} courses`)
    return result
  }
}
