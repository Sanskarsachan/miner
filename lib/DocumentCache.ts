interface CachedDocument {
  hash: string
  courses: any[]
  timestamp: number
  pageStart?: number  // Start page of this cached batch (for incremental caching)
  pageEnd?: number    // End page of this cached batch
  totalPages?: number // Total pages in source document
}

export class DocumentCache {
  private dbName = 'CourseHarvesterCache'
  private storeName = 'documents'
  private db: IDBDatabase | null = null
  private cacheValidityMs = 24 * 60 * 60 * 1000 // 24 hours

  // Initialize IndexedDB
  readonly ready: Promise<void>

  constructor() {
    this.ready = this.init()
  }

  private async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if IndexedDB is available
      if (!('indexedDB' in window)) {
        console.warn('IndexedDB not available, caching disabled')
        resolve()
        return
      }

      const request = indexedDB.open(this.dbName, 1)

      request.onerror = () => {
        console.error('IndexedDB error:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'hash' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  /**
   * Generate SHA-256 hash of file for cache key
   */
  async hashFile(file: File): Promise<string> {
    try {
      const buffer = await file.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
    } catch (error) {
      console.error('Error hashing file:', error)
      // Return a temporary hash if crypto is unavailable
      return `${file.name}-${file.size}-${file.lastModified}`
    }
  }

  /**
   * Get cached courses for file hash
   */
  async get(fileHash: string): Promise<any[] | null> {
    if (!this.db) {
      return null
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(fileHash)

      request.onsuccess = () => {
        const result = request.result as CachedDocument | undefined

        // Check if cache exists and is still fresh
        if (result && Date.now() - result.timestamp < this.cacheValidityMs) {
          console.log(`Cache hit for ${fileHash}`)
          resolve(result.courses)
        } else if (result) {
          // Cache is stale, delete it
          this.delete(fileHash).catch(console.error)
          resolve(null)
        } else {
          resolve(null)
        }
      }

      request.onerror = () => {
        console.error('Cache read error:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Store extracted courses in cache
   */
  async set(fileHash: string, courses: any[]): Promise<void> {
    if (!this.db) {
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      const data: CachedDocument = {
        hash: fileHash,
        courses,
        timestamp: Date.now(),
      }

      const request = store.put(data)

      request.onsuccess = () => {
        console.log(`Cached ${courses.length} courses for ${fileHash}`)
        resolve()
      }

      request.onerror = () => {
        console.error('Cache write error:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Delete specific cache entry
   */
  async delete(fileHash: string): Promise<void> {
    if (!this.db) {
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(fileHash)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Clear all cached documents
   */
  async clear(): Promise<void> {
    if (!this.db) {
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onsuccess = () => {
        console.log('Cache cleared')
        resolve()
      }

      request.onerror = () => {
        console.error('Cache clear error:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get cache size statistics
   */
  async getStats(): Promise<{ entries: number; oldestTimestamp?: number }> {
    if (!this.db) {
      return { entries: 0 }
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onsuccess = () => {
        const entries = request.result as CachedDocument[]
        const oldestTimestamp = entries.length > 0
          ? Math.min(...entries.map((e) => e.timestamp))
          : undefined

        resolve({
          entries: entries.length,
          oldestTimestamp,
        })
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Clean up old cache entries (older than 24 hours)
   */
  async cleanup(): Promise<number> {
    if (!this.db) {
      return 0
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onsuccess = () => {
        const entries = request.result as CachedDocument[]
        const now = Date.now()
        let deletedCount = 0

        for (const entry of entries) {
          if (now - entry.timestamp > this.cacheValidityMs) {
            store.delete(entry.hash)
            deletedCount++
          }
        }

        resolve(deletedCount)
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Store incremental courses with page range metadata
   */
  async setIncremental(
    fileHash: string,
    courses: any[],
    pageStart: number,
    pageEnd: number,
    totalPages: number
  ): Promise<void> {
    if (!this.db) {
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      const data: CachedDocument = {
        hash: fileHash,
        courses,
        timestamp: Date.now(),
        pageStart,
        pageEnd,
        totalPages,
      }

      const request = store.put(data)

      request.onsuccess = () => {
        console.log(
          `Cached ${courses.length} courses for pages ${pageStart}-${pageEnd} of ${fileHash}`
        )
        resolve()
      }

      request.onerror = () => {
        console.error('Cache write error:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get partial cached results for incremental processing
   * Returns cached courses and info about which pages are already cached
   */
  async getIncremental(
    fileHash: string,
    requestedPageStart: number,
    requestedPageEnd: number
  ): Promise<{
    cachedCourses: any[] | null
    cachedPageStart?: number
    cachedPageEnd?: number
    needsProcessing: boolean
    nextPageToProcess?: number
  } | null> {
    if (!this.db) {
      return null
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(fileHash)

      request.onsuccess = () => {
        const result = request.result as CachedDocument | undefined

        // Check if cache exists and is still fresh
        if (result && Date.now() - result.timestamp < this.cacheValidityMs) {
          console.log(
            `Cache hit for ${fileHash} (pages ${result.pageStart}-${result.pageEnd})`
          )
          
          // VALIDATION: Check if courses array is valid and not empty
          if (!result.courses || !Array.isArray(result.courses) || result.courses.length === 0) {
            console.warn(`⚠️ Cache corrupted for ${fileHash}: empty or invalid courses array`)
            this.delete(fileHash).catch(console.error)
            resolve(null)
            return
          }

          const cachedStart = result.pageStart || 1
          const cachedEnd = result.pageEnd || result.totalPages || requestedPageEnd

          // Check if we have the pages we need
          const hasAllPages =
            cachedStart <= requestedPageStart && cachedEnd >= requestedPageEnd

          if (hasAllPages) {
            // We have all requested pages, no need to process
            console.log(`✓ Cache covers pages ${requestedPageStart}-${requestedPageEnd} (have ${cachedStart}-${cachedEnd}, ${result.courses.length} courses)`)
            resolve({
              cachedCourses: result.courses,
              cachedPageStart: cachedStart,
              cachedPageEnd: cachedEnd,
              needsProcessing: false,
            })
          } else {
            // We have partial cache, need to process remaining pages
            const nextPageToProcess = Math.max(cachedEnd + 1, requestedPageStart)
            console.log(`⚠ Cache partial: have ${cachedStart}-${cachedEnd}, need ${requestedPageStart}-${requestedPageEnd}, will process from ${nextPageToProcess}`)
            resolve({
              cachedCourses: result.courses,
              cachedPageStart: cachedStart,
              cachedPageEnd: cachedEnd,
              needsProcessing: true,
              nextPageToProcess,
            })
          }
        } else if (result) {
          // Cache is stale, delete it
          console.log(`Cache stale for ${fileHash}, deleting`)
          this.delete(fileHash).catch(console.error)
          resolve(null)
        } else {
          console.log(`No cache found for ${fileHash}`)
          resolve(null)
        }
      }

      request.onerror = () => {
        console.error('Cache read error:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Merge cached courses with newly processed courses
   */
  mergeCourses(cached: any[], newCourses: any[]): any[] {
    // Avoid duplicates by checking CourseName
    const merged = [...cached]
    newCourses.forEach((course) => {
      if (!merged.some((c) => c.CourseName === course.CourseName)) {
        merged.push(course)
      }
    })
    console.log(`✓ Merged ${cached.length} cached + ${newCourses.length} new = ${merged.length} total courses`)
    return merged
  }

  /**
   * Clear ALL cache entries (nuclear option for cache corruption)
   * This is a hard reset that clears IndexedDB completely
   */
  async clearAll(): Promise<void> {
    if (!this.db) {
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onsuccess = () => {
        console.log('🧹 All cache entries cleared from IndexedDB')
        resolve()
      }

      request.onerror = () => {
        console.error('Cache clear error:', request.error)
        reject(request.error)
      }
    })
  }
}
