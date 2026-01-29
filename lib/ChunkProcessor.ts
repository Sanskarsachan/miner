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
  GradeLevel?: string
  Length?: string
  Prerequisite?: string
  Credit?: string
  Details?: string
  CourseDescription?: string
  SourceFile?: string
}

export class ChunkProcessor {
  private maxTokensPerChunk = 150000 // Increased for faster processing
  private retryAttempts = 3
  private retryDelay = 1500 // Reduced from 2000ms
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
    private apiKey: string = ''  // NEW: Accept API key from client
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
      console.log('[ChunkProcessor] Calling /api/secure_extract with', text.length, 'chars, apiKey present:', !!this.apiKey)
      
      const response = await fetch('/api/secure_extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, filename, apiKey: this.apiKey }),  // Send API key
      })

      console.log('[ChunkProcessor] Response status:', response.status)

      // Always read as text first (to avoid "body stream already read" error)
      let responseText = ''
      try {
        responseText = await response.text()
        console.log('[ChunkProcessor] Response text length:', responseText.length)
        console.log('[ChunkProcessor] Response preview:', responseText.substring(0, 200))
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
        console.error(`[ChunkProcessor] API returned HTTP ${response.status}`)
        console.error('[ChunkProcessor] Response:', JSON.stringify(data).substring(0, 300))

        // Handle rate limiting with exponential backoff
        if (response.status === 429) {
          if (attempt < this.retryAttempts) {
            const delay = this.retryDelay * Math.pow(2, attempt - 1)
            this.onProgress({
              status: 'waiting',
              total: 0,
              current: 0,
              message: `Rate limit reached. Retrying in ${Math.ceil(delay / 1000)}s... (attempt ${attempt}/${this.retryAttempts})`,
            })

            await new Promise((r) => setTimeout(r, delay))
            return this.processChunk(text, filename, attempt + 1)
          } else {
            throw new Error(
              `Rate limit exceeded. Maximum 5 documents per hour. Please try again later.`
            )
          }
        }

        // For 500 errors, server returns empty array to avoid crashing client
        // Log but continue with empty result
        if (response.status === 500) {
          console.error('[ChunkProcessor] API returned 500 error. Check server logs for details.')
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
      return courses
    } catch (error) {
      // Retry on network errors, but not on validation errors
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

        // Small delay between chunks to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise((r) => setTimeout(r, 500))
        }
      } catch (error) {
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
   * Use fuzzy matching to catch variations in course names
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
