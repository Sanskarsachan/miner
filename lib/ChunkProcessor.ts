interface ProcessProgress {
  status: 'processing' | 'chunk_complete' | 'chunk_error' | 'waiting'
  total: number
  current: number
  message: string
  coursesFound?: number
}

export interface Course {
  Category?: string
  CourseName: string
  GradeLevel?: string
  Length?: string
  Prerequisite?: string
  Credit?: string
  CourseDescription?: string
  SourceFile?: string
}

export class ChunkProcessor {
  private maxTokensPerChunk = 100000
  private retryAttempts = 3
  private retryDelay = 2000

  constructor(
    private onProgress: (progress: ProcessProgress) => void = () => {},
    private onError: (error: Error) => void = console.error,
    private apiKey: string = ''  // NEW: Accept API key from client
  ) {}

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
      const response = await fetch('/api/secure_extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, filename, apiKey: this.apiKey }),  // Send API key
      })

      if (!response.ok) {
        let error: any = {}
        let responseText = ''
        
        // Always read as text first (to avoid "body stream already read" error)
        try {
          responseText = await response.text()
          // Try to parse as JSON
          if (responseText) {
            error = JSON.parse(responseText)
          }
        } catch (parseError) {
          // If JSON parse fails, just use raw text
          console.error('Failed to parse response as JSON:', parseError)
          error = { error: responseText || 'Unknown error' }
        }

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
            // Extract reset time from error response if available
            const resetTime = error?.resetTime || 'in 1 hour'
            throw new Error(
              `Rate limit exceeded. Maximum 5 documents per hour. You can try again ${resetTime}.`
            )
          }
        }

        // Log detailed error for debugging
        console.error(`ChunkProcessor API Error (${response.status}):`, error, 'Response text:', responseText.substring(0, 200))
        
        throw new Error(
          error?.error || 
          error?.message || 
          `API Error (HTTP ${response.status}): ${responseText.substring(0, 150)}`
        )
      }

      const data = await response.json()
      const courses = this.extractCoursesFromResponse(data)

      return courses
    } catch (error) {
      // Retry on network errors, but not on validation errors
      if (attempt < this.retryAttempts && !(error instanceof SyntaxError)) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1)
        await new Promise((r) => setTimeout(r, delay))
        return this.processChunk(text, filename, attempt + 1)
      }

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
          await new Promise((r) => setTimeout(r, 1000))
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        this.onError(error instanceof Error ? error : new Error(errorMsg))

        this.onProgress({
          status: 'chunk_error',
          total: totalChunks,
          current: chunkNum,
          message: `❌ Error in chunk ${chunkNum}: ${errorMsg}`,
        })

        // Continue with next chunk instead of failing entire document
      }
    }

    // Deduplicate courses
    const deduplicated = this.deduplicateCourses(allCourses)

    this.onProgress({
      status: 'processing',
      total: totalChunks,
      current: totalChunks,
      coursesFound: deduplicated.length,
      message: `✓ Extraction complete! Found ${deduplicated.length} unique course${deduplicated.length === 1 ? '' : 's'}`,
    })

    return deduplicated
  }

  /**
   * Remove duplicate courses based on category, name, and grade level
   */
  private deduplicateCourses(courses: Course[]): Course[] {
    const seen = new Map<string, boolean>()

    return courses.filter((course) => {
      const key = `${course.Category}|${course.CourseName}|${course.GradeLevel}`.toLowerCase()

      if (seen.has(key)) {
        return false
      }

      seen.set(key, true)
      return true
    })
  }
}
