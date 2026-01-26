interface CachedDocument {
  hash: string
  courses: any[]
  timestamp: number
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
}
