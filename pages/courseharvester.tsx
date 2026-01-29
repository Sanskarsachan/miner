import Head from 'next/head'
import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'
import { ChunkProcessor, type Course } from '@/lib/ChunkProcessor'
import { DocumentCache } from '@/lib/DocumentCache'
import CourseHarvesterSidebar, { type SavedExtraction } from '@/components/CourseHarvesterSidebar'
import Toast, { type ToastType } from '@/components/Toast'
import { FileText, BarChart3, BookOpen, Clock, FolderOpen, X, CheckCircle, AlertTriangle, XCircle, Lightbulb, AlertCircle, Key } from 'lucide-react'

interface FileHistory {
  filename: string
  coursesFound: number
  timestamp: string
}

function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.max(1, Math.ceil(text.length / 4))
}

function parseCoursesFromText(text: string): Course[] {
  function extractJsonArray(s: string): string | null {
    const first = s.indexOf('[')
    if (first === -1) return null
    let depth = 0
    for (let i = first; i < s.length; i++) {
      const ch = s[i]
      if (ch === '[') depth++
      else if (ch === ']') {
        depth--
        if (depth === 0) return s.slice(first, i + 1)
      }
    }
    return null
  }

  const arrText = extractJsonArray(text)
  if (!arrText) {
    console.error('Invalid JSON response from Gemini')
    return []
  }

  try {
    const parsed = JSON.parse(arrText)
    if (!Array.isArray(parsed)) return []
    return parsed.map((c: any) => ({
      Category: c.Category || '',
      CourseName: c.CourseName || '',
      CourseCode: c.CourseCode || '',
      GradeLevel: c.GradeLevel || '',
      Length: c.Length || '',
      Prerequisite: c.Prerequisite || '',
      Credit: c.Credit || '',
      Details: c.Details || '',
      CourseDescription: c.CourseDescription || '',
      SourceFile: '',
    }))
  } catch (err) {
    console.error('Failed to parse JSON', err)
    return []
  }
}

function buildPrompt(content: string): string {
  return `Extract courses from the document as JSON array only.
Fields: Category, CourseName, GradeLevel, Length, Prerequisite, Credit, CourseDescription
Return ONLY valid JSON starting with [ and ending with ].
No markdown, no code blocks, no extra text.

Document:\n${content}`
}

function cleanCourseData(course: any): any {
  // Clean and trim all string fields, fix character encoding issues
  const clean = (val: any) => {
    if (!val) return null
    let str = String(val).trim()
    
    // Remove control characters and fix encoding issues
    str = str.replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/[\x80-\xFF]+/g, (match) => {
        // Try to recover garbled UTF-8 sequences
        try {
          return Buffer.from(match, 'latin1').toString('utf8')
        } catch {
          return '' // Skip unrecoverable characters
        }
      })
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .replace(/["\\]/g, '') // Remove problematic quotes
      .trim()
    
    // Return null if empty after cleaning
    return str && str.length > 0 ? str : null
  }

  const courseName = clean(course.CourseName)
  
  // Skip courses with empty names or very short names (likely junk data)
  if (!courseName || courseName.length < 2) return null
  
  return {
    Category: clean(course.Category) || 'Uncategorized',
    CourseName: courseName,
    CourseCode: clean(course.CourseCode) || null,
    GradeLevel: clean(course.GradeLevel) || '-',
    Length: clean(course.Length) || '-',
    Prerequisite: clean(course.Prerequisite) || '-',
    Credit: clean(course.Credit) || '-',
    Details: clean(course.Details) || null,
    CourseDescription: clean(course.CourseDescription) || '-',
    SourceFile: clean(course.SourceFile) || '',
  }
}

function copyToClipboard(courses: any[]) {
  if (courses.length === 0) {
    alert('No courses to copy')
    return
  }

  // Create tab-separated values with S.No (for Google Sheets)
  const headers = ['S.No', 'Category', 'CourseName', 'GradeLevel', 'Length', 'Prerequisite', 'Credit', 'CourseDescription']
  const rows = [headers.join('\t')]
  
  courses.forEach((course: any, idx: number) => {
    const row = [
      String(idx + 1),
      course.Category || '',
      course.CourseName || '',
      course.GradeLevel || '',
      course.Length || '',
      course.Prerequisite || '',
      course.Credit || '',
      course.CourseDescription || '',
    ]
    rows.push(row.join('\t'))
  })

  const text = rows.join('\n')
  navigator.clipboard.writeText(text).then(() => {
    alert(`Copied ${courses.length} courses to clipboard!\nPaste directly into Google Sheets.`)
  }).catch(() => {
    alert('Failed to copy to clipboard')
  })
}

function detectFileType(file: File): { extension: string } {
  const extension = (file.name.split('.').pop() || '').toLowerCase()
  return { extension }
}

function estimateTokenCost(pages: number): { min: number; max: number; recommended: number } {
  // Token estimation based on batch size
  // Pages 1-5: ~500 tokens baseline
  // Pages 6-10: ~400-500 tokens (incremental)
  // Pages 11+: ~80-100 tokens per page (diminishing returns)
  
  if (pages <= 0) return { min: 0, max: 0, recommended: 0 }
  if (pages <= 5) return { min: 400, max: 600, recommended: 500 }
  if (pages <= 10) return { min: 800, max: 1100, recommended: 950 }
  if (pages <= 20) return { min: 1500, max: 2200, recommended: 1850 }
  if (pages <= 50) return { min: 3500, max: 5500, recommended: 4500 }
  
  // For larger documents
  const extraPages = pages - 50
  const base = 4500
  const extraTokens = extraPages * 90
  return { min: base + extraTokens - 500, max: base + extraTokens + 1000, recommended: base + extraTokens }
}

export default function CourseHarvester() {
  const [apiKey, setApiKey] = useState('')
  const [remember, setRemember] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [status, setStatus] = useState('')
  const [verified, setVerified] = useState(false)
  const [modelsList, setModelsList] = useState<any[]>([])
  const [tokenUsage, setTokenUsage] = useState(0)
  const [rawResponse, setRawResponse] = useState('')
  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [fileHistory, setFileHistory] = useState<FileHistory[]>([])
  const [searchQ, setSearchQ] = useState('')
  const [totalPages, setTotalPages] = useState(0)
  const [pageRangeStart, setPageRangeStart] = useState(1) // Start page for extraction
  const [pageRangeEnd, setPageRangeEnd] = useState(0) // End page for extraction (0 = all pages)
  const [cachedPageRange, setCachedPageRange] = useState<{
    start: number
    end: number
  } | null>(null) // Track which pages are cached
  const [usageStats, setUsageStats] = useState({
    tokensUsedToday: 0,
    tokensLimitPerDay: 1000000,
    requestsUsedToday: 0,
    requestsLimitPerDay: 20,
    coursesExtracted: 0,
    pagesProcessed: 0,
  })
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0)
  const [selectedSidebarExtraction, setSelectedSidebarExtraction] = useState<SavedExtraction | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null)
  const [courseSearch, setCourseSearch] = useState('')
  const [rateLimitModal, setRateLimitModal] = useState<{
    show: boolean
    message: string
    retryAfter: number
    suggestion: string
  } | null>(null)
  const [extractionProgress, setExtractionProgress] = useState({
    isExtracting: false,
    pagesProcessed: 0,
    totalPages: 0,
    coursesFound: 0,
    startTime: 0,
    estimatedTimeRemaining: 0,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cacheRef = useRef<DocumentCache | null>(null)

  // Helper function to show toast notifications
  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type })
  }

  useEffect(() => {
    const saved = localStorage.getItem('gh_api_key')
    if (saved) {
      setApiKey(saved)
      setRemember(true)
    }

    // Initialize document cache
    cacheRef.current = new DocumentCache()

    // Set PDF.js worker source to fix deprecated API warning
    if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    // Keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="Search courses"]') as HTMLInputElement
        searchInput?.focus()
      }
      
      // Cmd/Ctrl + E: Trigger extraction
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault()
        if (selectedFile && apiKey && !extractionProgress.isExtracting) {
          extract()
        }
      }

      // Cmd/Ctrl + B: Toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        setSidebarOpen(prev => !prev)
      }

      // Escape: Close modals/sidebar
      if (e.key === 'Escape') {
        setSidebarOpen(false)
        setToast(null)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [selectedFile, apiKey, extractionProgress.isExtracting])

  useEffect(() => {
    if (remember) localStorage.setItem('gh_api_key', apiKey)
    else localStorage.removeItem('gh_api_key')
  }, [remember, apiKey])

  // Load courses when a saved extraction is selected from sidebar
  useEffect(() => {
    if (selectedSidebarExtraction && selectedSidebarExtraction.courses) {
      // Load the saved courses into the main view
      setAllCourses(selectedSidebarExtraction.courses)
      
      // Update metadata display
      setTotalPages(selectedSidebarExtraction.metadata?.total_pages || 0)
      setCachedPageRange({
        start: 1,
        end: selectedSidebarExtraction.metadata?.pages_processed || selectedSidebarExtraction.metadata?.total_pages || 0
      })
      
      // Update usage stats to reflect loaded extraction
      setUsageStats(prev => ({
        ...prev,
        coursesExtracted: selectedSidebarExtraction.courses?.length || 0,
        pagesProcessed: selectedSidebarExtraction.metadata?.pages_processed || 0,
      }))
      
      setStatus(`Loaded ${selectedSidebarExtraction.courses.length} courses from "${selectedSidebarExtraction.filename}"`)
      showToast(`Loaded ${selectedSidebarExtraction.courses.length} courses from saved extraction`, 'success')
      
      // Close sidebar after loading
      setSidebarOpen(false)
    }
  }, [selectedSidebarExtraction])

  const handleFile = async (file: File | null) => {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setStatus('File too large (max 10MB)')
      showToast('File too large! Maximum size is 10MB', 'error')
      return
    }

    setSelectedFile(file)
    setPageRangeStart(1) // Reset to page 1
    setPageRangeEnd(0) // 0 = all pages
    setAllCourses([]) // Clear previous courses for new file
    setCachedPageRange(null) // Reset cached page range for new file
    setStatus('File selected: ' + file.name)
    showToast(`File selected: ${file.name}`, 'info')

    try {
      const ext = detectFileType(file).extension
      let previewText = ''
      let pages = 0

      if (ext === 'pdf') {
        const ab = await file.arrayBuffer()
        const pdf = await (window as any).pdfjsLib.getDocument({
          data: ab,
        }).promise
        pages = pdf.numPages
        setTotalPages(pages)
        
        const page = await pdf.getPage(1)
        const tc = await page.getTextContent()
        previewText = tc.items.map((it: any) => it.str).join(' ')
      } else if (['doc', 'docx', 'html', 'htm', 'txt'].includes(ext)) {
        const txt = await file.text()
        previewText = txt
        setTotalPages(0) // Not applicable for non-PDF
      }

      previewText = (previewText || '').slice(0, 20000)
      const est = estimateTokens(previewText)
      const pageInfo = pages > 0 ? ` (${pages} pages)` : ''
      setStatus(`File selected: ${file.name}${pageInfo} — est. tokens: ${est}`)
    } catch (e) {
      console.warn('preview token estimate failed', e)
    }
  }

  const onChoose = () => {
    fileInputRef.current?.click()
  }

  const verifyKey = async () => {
    if (!apiKey) {
      setStatus('Enter API key to verify')
      showToast('Please enter an API key', 'warning')
      return
    }
    setStatus('Verifying API key...')
    try {
      const r = await fetch('/api/list_models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })
      if (!r.ok) {
        const t = await r.text()
        throw new Error(t)
      }
      const data = await r.json()
      const found: any[] = []
      ;(data.results || []).forEach((r: any) => {
        if (r.body && r.body.models)
          r.body.models.forEach((m: any) =>
            found.push({ endpoint: r.endpoint, name: m.name })
          )
      })
      setModelsList(found)
      const hasGemini25 = found.some((m) => m.name.includes('gemini-2.5-flash'))
      if (hasGemini25) {
        setStatus(
          `Key verified! Gemini 2.5 Flash available. Free tier: 20 requests/day. Upgrade to paid for unlimited.`
        )
        setVerified(true)
        showToast('API key verified successfully!', 'success')
      } else {
        setStatus('Key verified but gemini-2.5-flash not found.')
        setVerified(found.length > 0)
        showToast('API key verified but Gemini 2.5 Flash not available', 'warning')
      }
    } catch (e) {
      console.error(e)
      setStatus(
        `Key verification failed: ${e instanceof Error ? e.message : 'Unknown error'}`
      )
      setVerified(false)
      showToast(`Verification failed: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error')
    }
  }

  const extract = async () => {
    if (!selectedFile) return setStatus('Select a file first')
    if (!apiKey) return setStatus('Enter your Gemini API key')

    setStatus('Preparing file...')
    
    // CRITICAL: Clear previous courses for fresh extraction from this page range
    setAllCourses([])
    
    // Calculate actual page range to process
    const startPage = pageRangeStart || 1
    const endPage = pageRangeEnd > 0 ? Math.min(pageRangeEnd, totalPages) : totalPages
    const numPagesToProcess = endPage - startPage + 1
    
    // Initialize progress tracking
    setExtractionProgress({
      isExtracting: true,
      pagesProcessed: 0,
      totalPages: numPagesToProcess || 1,
      coursesFound: 0,
      startTime: Date.now(),
      estimatedTimeRemaining: 0,
    })

    try {
      let textContent = ''
      let startPage = 1
      let cachedResults: any[] = []
      let usingCache = false
      const ext = detectFileType(selectedFile).extension

      // Check incremental cache for PDFs FIRST (before extracting text)
      if (ext === 'pdf') {
        const fileHash = await cacheRef.current!.hashFile(selectedFile)
        const incrementalCache =
          await cacheRef.current!.getIncremental(
            fileHash,
            startPage,
            endPage
          )

        if (incrementalCache) {
          cachedResults = incrementalCache.cachedCourses || []
          
          // CRITICAL FIX: If cached results are empty, skip cache and process fresh
          if (cachedResults.length === 0) {
            console.warn('Cache returned empty results, ignoring cache and processing fresh')
            cachedResults = []
            usingCache = false
          } else if (incrementalCache.needsProcessing) {
            // We have partial cache, continue from next page
            startPage = incrementalCache.nextPageToProcess || endPage + 1
            setStatus(
              `Using cached results from pages ${incrementalCache.cachedPageStart}-${incrementalCache.cachedPageEnd}. Processing pages ${startPage}-${endPage}...`
            )
            usingCache = true
          } else if (cachedResults.length > 0) {
            // We have all pages cached
            setAllCourses(
              cachedResults.map((c) => ({
                ...c,
                SourceFile: selectedFile.name,
              }))
            )
            setUsageStats(prev => ({
              ...prev,
              coursesExtracted: cachedResults.length,
              pagesProcessed: totalPages,
            }))
            setFileHistory((prev) => [
              ...prev,
              {
                filename: selectedFile.name,
                coursesFound: cachedResults.length,
                timestamp: new Date().toISOString(),
              },
            ])
            setCachedPageRange({
              start: incrementalCache.cachedPageStart || 1,
              end: incrementalCache.cachedPageEnd || totalPages,
            })
            setStatus(
              `Loaded from cache — ${cachedResults.length} courses (pages ${incrementalCache.cachedPageStart}-${incrementalCache.cachedPageEnd})`
            )
            return
          }
        }
      }

      // Extract text from file
      if (ext === 'pdf') {
        const ab = await selectedFile.arrayBuffer()
        const pdf = await (window as any).pdfjsLib.getDocument({
          data: ab,
        }).promise

        const pages: string[] = []
        const actualStartPage = startPage
        const actualEndPage = endPage
        
        // Extract pages in the specified range
        for (let i = actualStartPage; i <= actualEndPage; i++) {
          const page = await pdf.getPage(i)
          const tc = await page.getTextContent()
          const pageText = tc.items.map((it: any) => it.str).join(' ')
          pages.push(pageText)
          
          // Debug: Log each page's text length
          console.log(`[PDF Extract] Page ${i}: ${pageText.length} chars, first 100: "${pageText.substring(0, 100)}"`)
          
          // Update progress
          setExtractionProgress(prev => ({
            ...prev,
            pagesProcessed: i - actualStartPage + 1,
            totalPages: numPagesToProcess,
          }))
        }
        
        setStatus(`Processing pages ${actualStartPage}-${actualEndPage} (out of ${pdf.numPages} total)...`)
        
        textContent = pages.join('\n\n--- PAGE BREAK ---\n\n')
        
        // Debug: Log total text content info
        console.log(`[PDF Extract] Total text length: ${textContent.length} chars from ${pages.length} pages`)
        console.log(`[PDF Extract] Text preview (first 500 chars):`, textContent.substring(0, 500))
      } else if (ext === 'doc' || ext === 'docx') {
        const ab = await selectedFile.arrayBuffer()
        const res = await (window as any).mammoth.extractRawText({
          arrayBuffer: ab,
        })
        textContent = res.value
      } else if (['html', 'htm', 'txt'].includes(ext)) {
        textContent = await selectedFile.text()
      } else if (['ppt', 'pptx'].includes(ext)) {
        // For PPTX, keep original logic
        const ab = await selectedFile.arrayBuffer()
        let binary = ''
        const bytes = new Uint8Array(ab)
        const chunk = 0x8000

        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode.apply(
            null,
            Array.from(bytes.subarray(i, Math.min(i + chunk, bytes.length))) as any
          )
        }

        const b64 = btoa(binary)
        const prompt = buildPrompt('Attached file: ' + selectedFile.name)

        const r = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey,
            payload: {
              contents: [
                {
                  parts: [
                    {
                      inline_data: {
                        mime_type:
                          selectedFile.type ||
                          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                        data: b64,
                      },
                    },
                    { text: prompt },
                  ],
                },
              ],
              generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
            },
          }),
        })

        if (!r.ok) throw new Error('Failed to process PPTX')

        const txt = await r.text()
        const parsed = JSON.parse(txt)
        const respText = parsed.candidates?.[0]?.content?.parts?.[0]?.text || txt
        const courses = parseCoursesFromText(respText)

        setAllCourses((prev) => {
          const merged = [...prev]
          courses.forEach((c) => {
            c.SourceFile = selectedFile.name
            if (!merged.some((ex) => ex.CourseName === c.CourseName))
              merged.push(c)
          })
          return merged
        })

        setFileHistory((prev) => [
          ...prev,
          {
            filename: selectedFile.name,
            coursesFound: courses.length,
            timestamp: new Date().toISOString(),
          },
        ])

        setStatus(`Complete — ${courses.length} courses extracted`)
        return
      } else {
        throw new Error('Unsupported file type')
      }

      // For non-PDF files, check simple cache
      const fileHash = await cacheRef.current!.hashFile(selectedFile)
      if (ext !== 'pdf') {
        const cached = await cacheRef.current!.get(fileHash)
        if (cached && cached.length > 0) {
          setAllCourses(cached.map((c) => ({ ...c, SourceFile: selectedFile.name })))
          setFileHistory((prev) => [
            ...prev,
            {
              filename: selectedFile.name,
              coursesFound: cached.length,
              timestamp: new Date().toISOString(),
            },
          ])
          setStatus(`Loaded from cache — ${cached.length} courses`)
          return
        }
      }

      // Process with ChunkProcessor
      let accumulatedCourses: Course[] = []
      
      const processor = new ChunkProcessor(
        (progress) => {
          if (progress.status === 'processing') {
            setStatus(progress.message)
          } else if (progress.status === 'chunk_complete') {
            setTokenUsage((prev) => prev + 2000) // Rough estimate
            // Update both status and extraction progress state
            const coursesInChunk = progress.coursesFound || 0
            accumulatedCourses = (accumulatedCourses || []).slice() // Ensure it's an array
            
            setStatus(
              `Page ${progress.current} of ${progress.total} done — ${coursesInChunk} course${coursesInChunk !== 1 ? 's' : ''} in this chunk`
            )
            
            // Update extraction progress with real-time course count
            setExtractionProgress(prev => ({
              ...prev,
              pagesProcessed: progress.current,
              totalPages: progress.total,
              coursesFound: accumulatedCourses.length + coursesInChunk,
            }))
          }
        },
        (error) => {
          console.error('Processing error:', error)
        },
        apiKey  // CRITICAL: Pass the API key
      )

      const courses = await processor.processDocument(textContent, selectedFile.name)
      accumulatedCourses = courses

      // Clean and filter extracted courses
      const typedCourses: Course[] = courses
        .map((c) => cleanCourseData({ ...c, SourceFile: selectedFile.name }))
        .filter((c): c is Course => c !== null)

      // Merge with cached courses if using incremental cache
      let finalCourses = typedCourses
      if (usingCache && cachedResults.length > 0) {
        finalCourses = cacheRef.current!.mergeCourses(
          cachedResults.map((c) => ({ ...c, SourceFile: selectedFile.name })),
          typedCourses
        )
      }

      setAllCourses(finalCourses)
      
      // Update progress with final course count and completion status
      const elapsedTime = Date.now() - extractionProgress.startTime
      setExtractionProgress(prev => ({
        ...prev,
        coursesFound: finalCourses.length,
        pagesProcessed: prev.totalPages,
        estimatedTimeRemaining: 0,
        isExtracting: false,
      }))
      
      // Update usage statistics
      const estimatedTokens = finalCourses.length * 100
      setUsageStats(prev => ({
        ...prev,
        tokensUsedToday: prev.tokensUsedToday + estimatedTokens,
        requestsUsedToday: prev.requestsUsedToday + 1,
        coursesExtracted: finalCourses.length,
        pagesProcessed: Math.ceil(totalPages / 3) * 3,
      }))

      // Save extraction to MongoDB
      try {
        const saveResponse = await fetch('/api/v2/extractions/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_id: fileHash,
            filename: selectedFile.name,
            courses: finalCourses,
            username: 'user_guest',
            metadata: {
              file_size: selectedFile.size,
              file_type: ext,
              total_pages: totalPages,
              pages_processed: endPage,
            },
            status: 'completed',
            tokens_used: estimatedTokens,
            api_used: 'gemini',
          }),
        })

        if (saveResponse.ok) {
          const saveData = await saveResponse.json()
          console.log('Extraction saved to MongoDB:', saveData.extraction_id)
          
          // Refresh sidebar to show new extraction
          setSidebarRefreshTrigger(prev => prev + 1)
          
          // Check if it was a merge operation
          if (saveData.merged) {
            setStatus(
              `Merged ${saveData.new_courses_added} new courses! Total: ${saveData.total_courses} courses`
            )
            showToast(`Merged ${saveData.new_courses_added} new courses (Total: ${saveData.total_courses})`, 'success')
          } else {
            setStatus(
              `${finalCourses.length} courses extracted and saved (ID: ${saveData.extraction_id.slice(0, 8)}...)`
            )
            showToast(`Successfully extracted ${finalCourses.length} courses!`, 'success')
          }
        } else {
          console.error('Failed to save extraction to MongoDB')
          setStatus(`Extraction complete but failed to save to database. ${finalCourses.length} courses extracted.`)
          showToast('Extraction complete but database save failed', 'warning')
        }
      } catch (error) {
        console.error('Error saving to MongoDB:', error)
        setStatus(`Extraction complete but database save failed. ${finalCourses.length} courses extracted.`)
        showToast('Database save failed', 'warning')
      }

      // CRITICAL: Only cache if we have courses to cache
      if (finalCourses.length > 0) {
        // Cache cleaned results, not raw ones
        if (ext === 'pdf') {
          // When using incremental cache, use the original start page (from cache or request)
          // to ensure we're caching the full range of processed pages
          const cacheStart = usingCache ? 1 : (pageRangeStart || 1)  // Start from page 1 if we merged cached results
          const cacheEnd = endPage
          
          await cacheRef.current!.setIncremental(
            fileHash,
            finalCourses,  // Cache cleaned courses, not raw
            cacheStart,
            cacheEnd,
            totalPages
          )
          setCachedPageRange({ start: cacheStart, end: cacheEnd })
        } else {
          // For non-PDF, use simple cache
          await cacheRef.current!.set(fileHash, finalCourses)  // Cache cleaned courses
        }
      } else {
        console.warn('No courses extracted, not caching empty results')
      }

      setFileHistory((prev) => [
        ...prev,
        {
          filename: selectedFile.name,
          coursesFound: finalCourses.length,
          timestamp: new Date().toISOString(),
        },
      ])

      setStatus(`Complete — ${finalCourses.length} courses extracted`)
    } catch (e: any) {
      // Check if this is a rate limit error
      if (e?.isRateLimit) {
        setRateLimitModal({
          show: true,
          message: e.message || 'API rate limit reached.',
          retryAfter: e.retryAfter || 60,
          suggestion: e.suggestion || 'Please wait and try again, or use a different API key.',
        })
        setStatus('Rate limit reached - please check the alert')
        showToast('API rate limit reached!', 'error')
      } else {
        setStatus(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`)
        showToast(`Extraction failed: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error')
      }
      setExtractionProgress(prev => ({ ...prev, isExtracting: false }))
    }
  }

  const downloadCSV = () => {
    const headers = [
      'S.No',
      'Category',
      'CourseName',
      'GradeLevel',
      'Length',
      'Prerequisite',
      'Credit',
      'CourseDescription',
    ]
    const escape = (s: any) => {
      if (s == null) return ''
      s = String(s).replace(/"/g, '""')
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s}"`
        : s
    }
    const rows = [headers.join(',')].concat(
      allCourses.map((c, idx) => [
        String(idx + 1),
        escape(c.Category || ''),
        escape(c.CourseName || ''),
        escape(c.GradeLevel || ''),
        escape(c.Length || ''),
        escape(c.Prerequisite || ''),
        escape(c.Credit || ''),
        escape(c.CourseDescription || ''),
      ].join(','))
    )
    const blob = new Blob([rows.join('\n')], { type: 'text/csv; charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `courses_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredCourses = allCourses.filter((c) => {
    // Apply existing searchQ filter
    const matchesSearchQ = !searchQ || Object.values(c).some((v) =>
      String(v).toLowerCase().includes(searchQ.toLowerCase())
    )
    
    // Apply new courseSearch filter
    const matchesCourseSearch = !courseSearch || 
      String(c.CourseName || '').toLowerCase().includes(courseSearch.toLowerCase()) ||
      String(c.CourseCode || '').toLowerCase().includes(courseSearch.toLowerCase()) ||
      String(c.CourseDescription || '').toLowerCase().includes(courseSearch.toLowerCase()) ||
      String(c.Category || '').toLowerCase().includes(courseSearch.toLowerCase())
    
    return matchesSearchQ && matchesCourseSearch
  })

  return (
    <>
      <Head>
        <title>CourseHarvester - Extract Course Data</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {/* Favicon and fonts are in _document.tsx */}
      </Head>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        strategy="beforeInteractive"
        onLoad={() => {
          // Set worker source immediately when pdf.js loads
          if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 
              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          }
        }}
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"
        strategy="beforeInteractive"
      />
      <style jsx global>{`
        :root {
          --primary: #603AC8;
          --secondary: #31225C;
          --accent: #603AC8;
          --bg: #F4F0FF;
          --card: #ffffff;
          --muted: #6b7280;
          --danger: #ef4444;
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          background: linear-gradient(180deg, #F4F0FF, #ffffff);
          color: #31225C;
          font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto,
            'Helvetica Neue', Arial;
        }
      `}</style>

      <style jsx>{`
      .headerbackground {
          background: linear-gradient(90deg, var(--primary), var(--accent));
          box-shadow: 0 10px 30px rgba(16, 24, 40, 0.08);
      }
        .header {
          color: #fff;
          padding: 20px 10px;
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
        }
        .header-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .header-text{
          margin: 0;
          font-size: 25px;
          font-weight: 700;
        }
        .tagline {
          color: rgba(255, 255, 255, 0.9);
          margin-top: 6px;
          font-size: 14px;
        }
        .container {
          max-width: 1100px;
          margin: -10px auto 80px;
          background: var(--card);
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(16, 24, 40, 0.08);
          overflow: hidden;
        }
        .content {
          padding: 28px;
        }
        .row {
          display: flex;
          gap: 20px;
        }
        .left {
          flex: 1;
          min-width: 0;
        }
        .middle {
          flex: 1;
          min-width: 0;
        }
        .right {
          width: 25vw;
          min-width: 250px;
          max-width: 400px;
          height: 100vh;
          position: fixed;
          right: 0;
          top: 0;
          overflow: hidden;
          transform: translateX(100%);
          transition: transform 0.3s ease-in-out;
          z-index: 100;
        }
        .right.open {
          transform: translateX(0);
        }
        .sidebar-toggle {
          position: fixed;
          right: 20px;
          top: 20px;
          z-index: 105;
          background: #603AC8;
          color: white;
          border: none;
          border-radius: 50%;
          width: 44px;
          height: 44px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
          transition: all 0.3s ease;
          font-size: 20px;
          font-weight: bold;
        }
        .sidebar-toggle:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
        }
        .card {
          background: var(--card);
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #eef2ff;
          margin-bottom: 12px;
        }
        .upload-zone {
          border: 2px dashed rgba(37, 99, 235, 0.12);
          padding: 26px;
          text-align: center;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .upload-zone:hover {
          border-color: var(--primary);
          background: linear-gradient(
            90deg,
            rgba(37, 99, 235, 0.03),
            rgba(139, 92, 246, 0.03)
          );
        }
        .muted {
          color: var(--muted);
          font-size: 13px;
        }
        .controls {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          flex-wrap: wrap;
        }
        button {
          background: var(--primary);
          color: #fff;
          border: none;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
        }
        button:hover {
          opacity: 0.9;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        button.secondary {
          background: #eef2ff;
          color: var(--primary);
        }
        button.secondary:hover {
          background: #dbeafe;
        }
        .file-info {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 12px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #eef2ff;
        }
        .icon {
          width: 36px;
          height: 36px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 700;
          font-size: 11px;
        }
        .pdf {
          background: #ef4444;
        }
        .word {
          background: #3b82f6;
        }
        .ppt {
          background: #f97316;
        }
        .html {
          background: #22c55e;
        }
        .txt {
          background: #6b7280;
        }
        .stats {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 12px;
        }
        .stat {
          background: #f8fafc;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #eef2ff;
          min-width: 140px;
          font-size: 12px;
        }
        .stat-value {
          font-size: 18px;
          font-weight: 700;
          color: var(--primary);
          margin-top: 6px;
        }
        .stat-label {
          color: var(--muted);
          font-size: 12px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
          font-size: 13px;
        }
        th,
        td {
          padding: 8px;
          border-bottom: 1px solid #f1f5f9;
          text-align: left;
        }
        th {
          background: #fafafa;
          cursor: pointer;
          font-weight: 600;
          color: var(--muted);
        }
        tr:hover {
          background: #f8fafc;
        }
        .search-box {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #eef2ff;
          font-size: 13px;
        }
        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .header-title {
          font-weight: 600;
        }
        .buttons-group {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .input-group {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-top: 8px;
        }
        input[type='text'],
        input[type='password'] {
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #e6eefc;
          font-size: 13px;
        }
        input[type='checkbox'] {
          cursor: pointer;
        }
        label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 13px;
        }
        hr {
          margin: 14px 0;
          border: none;
          border-top: 1px solid #f1f5f9;
        }
        .debug-panel {
          margin-top: 10px;
          border: 1px solid #e6eefc;
          border-radius: 8px;
          overflow: hidden;
        }
        .debug-summary {
          padding: 10px;
          background: #f8fafc;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          user-select: none;
        }
        .debug-content {
          padding: 10px;
          background: #0f172a;
          color: #e5e7eb;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          max-height: 300px;
          overflow: auto;
          white-space: pre-wrap;
          word-break: break-word;
          border-top: 1px solid #e6eefc;
        }
        .status-message {
          padding: 10px;
          border-radius: 8px;
          margin-top: 12px;
          font-size: 13px;
        }
        .status-success {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #d1fae5;
        }
        .status-error {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fee2e2;
        }
        .status-info {
          background: #eff6ff;
          color: #0c2340;
          border: 1px solid #bfdbfe;
        }
        .verified-badge {
          color: var(--secondary);
          margin-left: 8px;
          font-weight: 600;
          font-size: 13px;
        }
        @media (max-width: 900px) {
          .row {
            flex-direction: column;
          }
          .left {
            flex: 1 1 100%;
          }
          .middle {
            flex: 1 1 100%;
          }
          .right {
            flex: 1 1 100%;
            height: auto;
            position: static;
            min-width: auto;
          }
          .results-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .buttons-group {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .search-box {
            width: 100% !important;
          }
          button {
            width: 100%;
          }
          .header-inner {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .container {
            margin: -20px 10px 40px;
          }
          .content {
            padding: 16px;
          }
          table {
            font-size: 12px;
          }
          th, td {
            padding: 8px !important;
          }
        }
        @media (max-width: 640px) {
          .header {
            padding: 20px 16px;
          }
          .header h1 {
            font-size: 18px;
          }
          .container {
            margin: -15px 8px 30px;
            border-radius: 8px;
          }
          .content {
            padding: 12px;
          }
          .card {
            padding: 12px;
            margin-bottom: 8px;
          }
          table {
            font-size: 11px;
          }
          th, td {
            padding: 6px !important;
          }
          .buttons-group {
            gap: 6px;
          }
          button {
            padding: 8px 10px;
            font-size: 12px;
          }
          .input-group {
            flex-direction: column;
            gap: 8px;
          }
          .input-group input,
          .input-group button {
            width: 100%;
          }
        }
      `}</style>

      {/* Header */}
      <div className="header headerbackground">
        <div className="header-inner">
          <div>
            <div className="header header-text" style={{ margin: 0 }}>
              Planpaths Course Database
            </div>
            <div className="tagline">
              Extract course data from PDF • Word • PowerPoint • HTML • TXT
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>
              Powered by Google Gemini
            </div>
            <div style={{ fontSize: '11px', opacity: 0.75, marginTop: '4px' }}>
              ⌨️ Cmd+K: Search | Cmd+E: Extract | Cmd+B: Sidebar
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'rgba(255,255,255,0.95)',
                fontSize: '12px',
                marginTop: 8,
                display: 'inline-block',
              }}
            >
              Get free API key
            </a>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="container">
        <div className="content">
          <div className="row">
            {/* Left Column */}
            <div className="left">
              {/* API Key Card */}
              <div className="card">
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>
                  Gemini API Key
                </label>
                <div className="input-group">
                  <input
                    type={apiKey.includes('AI') && apiKey.length > 20 ? 'password' : 'text'}
                    placeholder="Paste your Gemini API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        verifyKey()
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                  <button type="button" onClick={(e) => { e.preventDefault(); verifyKey(); }} className="secondary">
                    Verify
                  </button>
                </div>
                <div className="muted" style={{ marginTop: 8 }}>
                  We store the key in localStorage only if you check "Remember" below.
                </div>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    Remember
                  </label>
                  {verified && <span className="verified-badge">✓ Verified</span>}
                </div>
              </div>

              {/* Quota Info Card */}
              {verified && (
                <div
                  className="card"
                  style={{
                    background: '#fffbeb',
                    borderColor: '#fcd34d',
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#31225C', marginBottom: 8 }}>
                    API Quota Info
                  </div>
                  <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.6 }}>
                    <div>• <strong>Free Tier:</strong> 20 requests/day</div>
                    <div>• <strong>Smart Chunking:</strong> Larger batches reduce API calls</div>
                    <div>• <strong>Tip:</strong> Use 3-5 page batches for PDFs, 30-50KB for text</div>
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #fbcfe8' }}>
                      <a
                        href="https://ai.google.dev/pricing"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#b45309', textDecoration: 'none', fontWeight: 600 }}
                      >
                        Upgrade to Paid Plan for Unlimited Access →
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Card */}
              <div className="card">
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 12 }}>
                  Select File
                </label>
                <div
                  className="upload-zone"
                  onClick={onChoose}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.currentTarget.classList.add('dragover')
                  }}
                  onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.currentTarget.classList.remove('dragover')
                    handleFile(e.dataTransfer.files[0])
                  }}
                >
                  <div style={{ fontWeight: 600 }}>Drag & drop a file here, or click to select</div>
                  <div className="muted" style={{ marginTop: 8 }}>
                    Accepted: .pdf, .doc, .docx, .ppt, .pptx, .html, .htm, .txt — Max 10MB
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.html,.htm,.txt"
                    onChange={(e) => handleFile(e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                  />
                </div>

                {selectedFile && (
                  <div className="file-info">
                    <div className={`icon ${detectFileType(selectedFile).extension}`}>
                      {detectFileType(selectedFile).extension.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{selectedFile.name}</div>
                      <div className="muted">{(selectedFile.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>
                )}

                {totalPages > 0 && (
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: 'rgba(37, 99, 235, 0.05)',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    fontSize: '13px'
                  }}>
                    <div style={{ marginBottom: '8px', fontWeight: 600 }}>
                      Page Range ({totalPages} total pages)
                      {cachedPageRange && (
                        <span style={{ marginLeft: '8px', fontSize: '12px', color: '#603AC8' }}>
                          ✓ Cached: pages {cachedPageRange.start}-{cachedPageRange.end}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
                      <select
                        value={`${pageRangeStart}-${pageRangeEnd}`}
                        onChange={(e) => {
                          const [start, end] = e.target.value.split('-').map(Number)
                          setPageRangeStart(start)
                          setPageRangeEnd(end)
                        }}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          fontFamily: 'Inter, sans-serif',
                          cursor: 'pointer',
                        }}
                      >
                        <option value={`1-0`}>All pages (1-{totalPages})</option>
                        {/* Generate 5-page chunks dynamically */}
                        {Array.from({ length: Math.ceil(totalPages / 5) }, (_, i) => {
                          const start = i * 5 + 1
                          const end = Math.min((i + 1) * 5, totalPages)
                          return (
                            <option key={i} value={`${start}-${end}`}>
                              Pages {start}-{end}
                            </option>
                          )
                        })}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setAllCourses([])
                          setPageRangeStart(1)
                          setPageRangeEnd(5)
                          setStatus('Ready to extract pages 1-5')
                        }}
                        className="secondary"
                        style={{ fontSize: '12px', padding: '6px 8px' }}
                        title="Clear results and extract first 5 pages"
                      >
                        Reset 1-5
                      </button>
                      <div className="muted">
                        {pageRangeEnd > 0 
                          ? `Will process pages ${pageRangeStart}-${pageRangeEnd} (${pageRangeEnd - pageRangeStart + 1} pages, ~${Math.ceil((pageRangeEnd - pageRangeStart + 1) / 12)} API calls)` 
                          : `Will process all ${totalPages} page${totalPages !== 1 ? 's' : ''} (~${Math.ceil(totalPages / 12)} API calls)`}
                      </div>
                    </div>

                    {/* Batch Processing Info */}
                    {totalPages > 0 && (() => {
                      const pagesToProcess = pageRangeEnd > 0 ? (pageRangeEnd - pageRangeStart + 1) : totalPages
                      const costEstimate = estimateTokenCost(pagesToProcess)
                      const tokensRemaining = usageStats.tokensLimitPerDay - usageStats.tokensUsedToday
                      const willExceedQuota = costEstimate.max > tokensRemaining
                      const isWarning = costEstimate.recommended > tokensRemaining * 0.7
                      
                      return (
                        <div style={{
                          padding: '12px',
                          backgroundColor: willExceedQuota ? '#fef2f2' : isWarning ? '#fef3c7' : '#f0fdf4',
                          borderRadius: '8px',
                          border: `1px solid ${willExceedQuota ? '#fecaca' : isWarning ? '#fcd34d' : '#dcfce7'}`,
                          marginBottom: '8px',
                          fontSize: '12px',
                        }}>
                          <div style={{
                            marginBottom: '8px',
                            fontWeight: 600,
                            color: willExceedQuota ? '#991b1b' : isWarning ? '#31225C' : '#31225C',
                          }}>
                            {willExceedQuota ? <><AlertTriangle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Warning: Quota Exceeded</> : isWarning ? <><Lightbulb size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Batch Processing</> : <><CheckCircle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Sufficient Quota</>}
                          </div>
                          
                          <div style={{
                            marginLeft: '0px',
                            lineHeight: '1.6',
                            color: willExceedQuota ? '#7f1d1d' : isWarning ? '#31225C' : '#31225C',
                          }}>
                            <div style={{ marginBottom: '6px' }}>
                              <strong>Processing pages {pageRangeStart}-{pageRangeEnd > 0 ? pageRangeEnd : totalPages} ({pagesToProcess} page{pagesToProcess !== 1 ? 's' : ''}):</strong>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', marginBottom: '8px' }}>
                              <div>Est. Tokens: <strong>{costEstimate.recommended.toLocaleString()}</strong></div>
                              <div>Available: <strong>{tokensRemaining.toLocaleString()}</strong></div>
                              <div>Range: {costEstimate.min.toLocaleString()}-{costEstimate.max.toLocaleString()}</div>
                              <div>
                                Remaining: <strong style={{ color: willExceedQuota ? '#dc2626' : '#603AC8' }}>
                                  {willExceedQuota ? `-${(costEstimate.recommended - tokensRemaining).toLocaleString()}` : (tokensRemaining - costEstimate.recommended).toLocaleString()}
                                </strong>
                              </div>
                            </div>
                            
                            {willExceedQuota && (
                              <div style={{
                                padding: '8px',
                                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                                borderRadius: '4px',
                                marginTop: '8px',
                              }}>
                                <Lightbulb size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /><strong>Recommendation:</strong> Process in smaller batches (5-10 pages) or upgrade to paid plan
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                <div className="controls">
                  <button type="button" onClick={extract} disabled={!selectedFile || !apiKey}>
                    Extract Courses
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      // Clear IndexedDB cache completely
                      try {
                        await cacheRef.current?.clearAll()
                        setCachedPageRange(null)
                        setStatus('Cache cleared!')
                      } catch (e) {
                        console.error('Failed to clear cache:', e)
                        setStatus('Error clearing cache')
                      }
                    }}
                    className="secondary"
                    title="Clear all cached data from browser storage"
                  >
                    Clear Cache
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null)
                      setTotalPages(0)
                      setPageRangeStart(1)
                      setPageRangeEnd(0)
                      setAllCourses([])
                      setCachedPageRange(null)
                      setStatus('')
                    }}
                    className="secondary"
                  >
                    Clear
                  </button>
                </div>

                {status && (
                  <div
                    className={`status-message ${
                      status.includes('Complete')
                        ? 'status-success'
                        : status.includes('error') || status.includes('failed')
                          ? 'status-error'
                          : 'status-info'
                    }`}
                  >
                    {status}
                  </div>
                )}

                {extractionProgress.isExtracting && (
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#F4F0FF',
                    borderRadius: '8px',
                    border: '1px solid #603AC8',
                    marginTop: '12px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#31225C', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <BarChart3 size={14} /> Extraction Progress
                      </div>
                      <div style={{ fontSize: '12px', color: '#31225C' }}>
                        {extractionProgress.pagesProcessed}/{extractionProgress.totalPages} pages
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div style={{
                      width: '100%',
                      height: '12px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      marginBottom: '16px',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
                    }}>
                      <div style={{
                        width: `${(extractionProgress.pagesProcessed / Math.max(extractionProgress.totalPages, 1)) * 100}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #603AC8 0%, #31225C 100%)',
                        borderRadius: '6px',
                        transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
                      }} />
                    </div>

                    {/* Stats Grid */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '12px', 
                      fontSize: '12px', 
                      marginBottom: '8px',
                    }}>
                      <div style={{
                        padding: '8px',
                        backgroundColor: '#f0f9ff',
                        borderRadius: '4px',
                        borderLeft: '3px solid #603AC8',
                      }}>
                        <div style={{ color: '#6b7280', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}><BookOpen size={12} /> Courses Found</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#31225C' }}>{extractionProgress.coursesFound}</div>
                      </div>
                      
                      <div style={{
                        padding: '8px',
                        backgroundColor: '#fef3c7',
                        borderRadius: '4px',
                        borderLeft: '3px solid #603AC8',
                      }}>
                        <div style={{ color: '#6b7280', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}><FileText size={12} /> Pages Processed</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#31225C' }}>
                          {extractionProgress.pagesProcessed}/{extractionProgress.totalPages}
                        </div>
                      </div>
                      
                      <div style={{
                        padding: '8px',
                        backgroundColor: '#f0fdf4',
                        borderRadius: '4px',
                        borderLeft: '3px solid #603AC8',
                      }}>
                        <div style={{ color: '#6b7280', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> Time Elapsed</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#31225C' }}>
                          {Math.round((Date.now() - extractionProgress.startTime) / 1000)}s
                        </div>
                      </div>
                      
                      {extractionProgress.estimatedTimeRemaining > 0 && (
                        <div style={{
                          padding: '8px',
                          backgroundColor: '#F4F0FF',
                          borderRadius: '4px',
                          borderLeft: '3px solid #603AC8',
                        }}>
                          <div style={{ color: '#6b7280', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> Est. Time Remaining</div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: '#31225C' }}>
                            {Math.round(extractionProgress.estimatedTimeRemaining / 1000)}s
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Detailed Progress Info */}
                    <div style={{
                      padding: '8px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: '#6b7280',
                      lineHeight: '1.6',
                    }}>
                      <div>Processing page <strong style={{ color: '#1f2937' }}>{extractionProgress.pagesProcessed} of {extractionProgress.totalPages}</strong></div>
                      <div>Found <strong style={{ color: '#1f2937' }}>{extractionProgress.coursesFound} course{extractionProgress.coursesFound !== 1 ? 's' : ''}</strong> so far</div>
                      {extractionProgress.pagesProcessed > 0 && (
                        <div>Average: <strong style={{ color: '#1f2937' }}>{Math.round(extractionProgress.coursesFound / extractionProgress.pagesProcessed)} course{Math.round(extractionProgress.coursesFound / extractionProgress.pagesProcessed) !== 1 ? 's' : ''}/page</strong></div>
                      )}
                    </div>
                  </div>
                )}

                {rawResponse && (
                  <div className="debug-panel">
                    <div className="debug-summary">📋 Raw Gemini Response (click to toggle)</div>
                    <div className="debug-content">{rawResponse}</div>
                  </div>
                )}

                <div className="stats">
                  <div className="stat">
                    <div className="stat-label">Files processed</div>
                    <div className="stat-value">{fileHistory.length}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Courses extracted</div>
                    <div className="stat-value">{allCourses.length}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Tokens used</div>
                    <div className="stat-value">{tokenUsage.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Column - Results Table */}
            <div className="middle">
              <div className="card">
                <div className="results-header">
                  <div className="header-title">Results ({filteredCourses.length}/{allCourses.length})</div>
                  <div className="buttons-group">
                    <input
                      type="text"
                      className="search-box"
                      placeholder="Search courses..."
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                    />

                    {/* Free Tier Usage Stats */}
                    <div style={{
                      padding: '12px 16px',
                      backgroundColor: '#F4F0FF',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      fontSize: '12px',
                      border: '1px solid #603AC8',
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: '8px', color: '#31225C' }}>Free Tier Usage</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', color: '#1f2937' }}>
                        <div style={{ flex: '1 1 calc(50% - 6px)', minWidth: '150px' }}>
                          <div style={{ marginBottom: '4px' }}>Tokens: <span style={{ fontWeight: 600 }}>{Math.min(usageStats.tokensUsedToday, 1000000).toLocaleString()}</span>/{usageStats.tokensLimitPerDay.toLocaleString()}</div>
                          <div style={{ width: '100%', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px' }}>
                            <div style={{
                              width: `${Math.min((usageStats.tokensUsedToday / usageStats.tokensLimitPerDay) * 100, 100)}%`,
                              height: '100%',
                              backgroundColor: usageStats.tokensUsedToday > usageStats.tokensLimitPerDay * 0.8 ? '#ef4444' : '#603AC8',
                              borderRadius: '3px',
                              transition: 'width 0.3s'
                            }} />
                          </div>
                        </div>
                        <div style={{ flex: '1 1 calc(50% - 6px)', minWidth: '150px' }}>
                          <div style={{ marginBottom: '4px' }}>Requests: <span style={{ fontWeight: 600 }}>{usageStats.requestsUsedToday}</span>/{usageStats.requestsLimitPerDay}</div>
                          <div style={{ width: '100%', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px' }}>
                            <div style={{
                              width: `${(usageStats.requestsUsedToday / usageStats.requestsLimitPerDay) * 100}%`,
                              height: '100%',
                              backgroundColor: usageStats.requestsUsedToday > usageStats.requestsLimitPerDay * 0.8 ? '#ef4444' : '#10b981',
                              borderRadius: '3px',
                              transition: 'width 0.3s'
                            }} />
                          </div>
                        </div>
                        <div style={{ flex: '1 1 calc(50% - 6px)', minWidth: '150px' }}>Pages: <span style={{ fontWeight: 600 }}>{usageStats.pagesProcessed}</span></div>
                        <div style={{ flex: '1 1 calc(50% - 6px)', minWidth: '150px' }}>Courses: <span style={{ fontWeight: 600 }}>{usageStats.coursesExtracted}</span></div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <input
                        type="text"
                        placeholder="Search courses by name, code, or description..."
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          fontSize: '14px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '6px',
                          outline: 'none',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                        onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                      />
                      {courseSearch && (
                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280' }}>
                          Found {filteredCourses.length} of {allCourses.length} courses
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(filteredCourses)}
                      className="primary"
                      disabled={allCourses.length === 0}
                      title="Copy results as tab-separated values for Google Sheets"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={downloadCSV}
                      className="secondary"
                      disabled={allCourses.length === 0}
                    >
                      CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(allCourses, null, 2)], {
                          type: 'application/json',
                        })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `courses_${new Date().toISOString().slice(0, 10)}.json`
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                      className="secondary"
                      disabled={allCourses.length === 0}
                    >
                      JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAllCourses([])
                        setFileHistory([])
                        setTokenUsage(0)
                      }}
                      className="secondary"
                      disabled={allCourses.length === 0}
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>S.No</th>
                        <th>Category</th>
                        <th>Course Name</th>
                        <th>Code</th>
                        <th>Grade Level</th>
                        <th>Length</th>
                        <th>Prerequisite</th>
                        <th>Credit</th>
                        <th>Details</th>
                        <th>Description</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCourses.map((course, idx) => {
                        const allIdx = allCourses.findIndex(c => c.CourseName === course.CourseName)
                        return (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{allIdx + 1}</td>
                            <td>{course.Category}</td>
                            <td>{course.CourseName}</td>
                            <td>{course.CourseCode || '-'}</td>
                            <td>{course.GradeLevel}</td>
                            <td>{course.Length}</td>
                            <td>{course.Prerequisite}</td>
                            <td>{course.Credit}</td>
                            <td>{course.Details || '-'}</td>
                            <td
                              style={{
                                fontSize: '12px',
                                color: allCourses.length > 10 ? '#6b7280' : '#0f172a',
                              }}
                            >
                              {String(course.CourseDescription || '').slice(0, 60)}...
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {allCourses.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', fontSize: '13px' }}>
                    No courses extracted yet. Select a file and click "Extract Courses" to get started.
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className={`right ${sidebarOpen ? 'open' : ''}`}>
              <CourseHarvesterSidebar 
                refreshTrigger={sidebarRefreshTrigger}
                onSelectFile={setSelectedSidebarExtraction}
                onRefresh={() => setSidebarRefreshTrigger(prev => prev + 1)}
                onClose={() => setSidebarOpen(false)}
              />
            </div>

            {/* Sidebar Toggle Button */}
            <button 
              type="button"
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? 'Close sidebar' : 'Open saved files'}
            >
              {sidebarOpen ? <X size={18} /> : <FolderOpen size={18} />}
            </button>

            {/* Backdrop when sidebar is open on small screens */}
            {sidebarOpen && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  zIndex: 98,
                  display: 'none',
                }}
                onClick={() => setSidebarOpen(false)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Rate Limit Alert Modal */}
      {rateLimitModal?.show && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setRateLimitModal(null)}
        >
          <div 
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '450px',
              width: '90%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              animation: 'fadeIn 0.3s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Alert Icon */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#FEE2E2',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <AlertCircle size={32} color="#DC2626" />
              </div>
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#1F2937',
              textAlign: 'center',
              margin: '0 0 12px 0',
            }}>
              API Rate Limit Reached
            </h3>

            {/* Message */}
            <p style={{
              fontSize: '14px',
              color: '#6B7280',
              textAlign: 'center',
              margin: '0 0 20px 0',
              lineHeight: '1.5',
            }}>
              {rateLimitModal.message}
            </p>

            {/* Info Box */}
            <div style={{
              backgroundColor: '#F3F4F6',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Clock size={16} color="#603AC8" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  Retry after: {rateLimitModal.retryAfter} seconds
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Key size={16} color="#603AC8" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#4B5563', lineHeight: '1.4' }}>
                  {rateLimitModal.suggestion}
                </span>
              </div>
            </div>

            {/* Tip */}
            <div style={{
              backgroundColor: '#FDF4FF',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '24px',
              border: '1px solid #E9D5FF',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Lightbulb size={16} color="#9333EA" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: '#7E22CE', lineHeight: '1.4' }}>
                  <strong>Tip:</strong> The Gemini free tier allows 20 requests per day. 
                  For more requests, upgrade to a paid API key at{' '}
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#603AC8', textDecoration: 'underline' }}
                  >
                    Google AI Studio
                  </a>
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setRateLimitModal(null)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#fff',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#F9FAFB'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff'
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setRateLimitModal(null)
                  // Scroll to API key input
                  const apiKeyInput = document.querySelector('input[placeholder*="API"]') as HTMLElement
                  if (apiKeyInput) {
                    apiKeyInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    apiKeyInput.focus()
                  }
                }}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#603AC8',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#4F2FA8'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#603AC8'
                }}
              >
                Change API Key
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
