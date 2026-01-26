import Head from 'next/head'
import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'
import { ChunkProcessor, type Course } from '@/lib/ChunkProcessor'
import { DocumentCache } from '@/lib/DocumentCache'

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
  // Clean and trim all string fields
  const clean = (val: any) => {
    if (!val) return ''
    let str = String(val).trim()
    // Remove extra whitespace, special characters, and control characters
    str = str.replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .replace(/["\\]/g, '') // Remove quotes and backslashes
      .trim()
    return str
  }

  const courseName = clean(course.CourseName)
  
  // Skip courses with empty names or very short names (likely junk data)
  if (!courseName || courseName.length < 2) return null
  
  return {
    Category: clean(course.Category) || 'Uncategorized',
    CourseName: courseName,
    CourseCode: clean(course.CourseCode) || null,
    GradeLevel: clean(course.GradeLevel) || 'N/A',
    Length: clean(course.Length) || 'N/A',
    Prerequisite: clean(course.Prerequisite) || 'None',
    Credit: clean(course.Credit) || 'N/A',
    Details: clean(course.Details) || null,
    CourseDescription: clean(course.CourseDescription) || '',
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
    alert(`✅ Copied ${courses.length} courses to clipboard!\nPaste directly into Google Sheets.`)
  }).catch(() => {
    alert('Failed to copy to clipboard')
  })
}

function detectFileType(file: File): { extension: string } {
  const extension = (file.name.split('.').pop() || '').toLowerCase()
  return { extension }
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
  const [pageLimit, setPageLimit] = useState(0) // 0 = all pages
  const [cachedPageRange, setCachedPageRange] = useState<{
    start: number
    end: number
  } | null>(null) // Track which pages are cached
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cacheRef = useRef<DocumentCache | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('gh_api_key')
    if (saved) {
      setApiKey(saved)
      setRemember(true)
    }

    // Initialize document cache
    cacheRef.current = new DocumentCache()
  }, [])

  useEffect(() => {
    if (remember) localStorage.setItem('gh_api_key', apiKey)
    else localStorage.removeItem('gh_api_key')
  }, [remember, apiKey])

  const handleFile = async (file: File | null) => {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setStatus('File too large (max 10MB)')
      return
    }

    setSelectedFile(file)
    setPageLimit(0) // Reset page limit when new file selected
    setCachedPageRange(null) // Reset cached page range for new file
    setStatus('File selected: ' + file.name)

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
    if (!apiKey) return setStatus('Enter API key to verify')
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
          `✅ Key verified! Gemini 2.5 Flash available. Free tier: 20 requests/day. 📈 Upgrade to paid for unlimited.`
        )
        setVerified(true)
      } else {
        setStatus('⚠️ Key verified but gemini-2.5-flash not found.')
        setVerified(found.length > 0)
      }
    } catch (e) {
      console.error(e)
      setStatus(
        `Key verification failed: ${e instanceof Error ? e.message : 'Unknown error'}`
      )
      setVerified(false)
    }
  }

  const extract = async () => {
    if (!selectedFile) return setStatus('Select a file first')
    if (!apiKey) return setStatus('Enter your Gemini API key')

    setStatus('Preparing file...')

    try {
      let textContent = ''
      let startPage = 1
      let cachedResults: any[] = []
      let usingCache = false
      const ext = detectFileType(selectedFile).extension

      // Check incremental cache for PDFs FIRST (before extracting text)
      if (ext === 'pdf') {
        const fileHash = await cacheRef.current!.hashFile(selectedFile)
        const numPagesToProcess =
          pageLimit > 0 ? Math.min(pageLimit, totalPages) : totalPages
        const incrementalCache =
          await cacheRef.current!.getIncremental(
            fileHash,
            1,
            numPagesToProcess
          )

        if (incrementalCache) {
          cachedResults = incrementalCache.cachedCourses || []
          
          // CRITICAL FIX: If cached results are empty, skip cache and process fresh
          if (cachedResults.length === 0) {
            console.warn('⚠️ Cache returned empty results, ignoring cache and processing fresh')
            cachedResults = []
            usingCache = false
          } else if (incrementalCache.needsProcessing) {
            // We have partial cache, continue from next page
            startPage = incrementalCache.nextPageToProcess || numPagesToProcess + 1
            setStatus(
              `📦 Using cached results from pages ${incrementalCache.cachedPageStart}-${incrementalCache.cachedPageEnd}. Processing pages ${startPage}-${numPagesToProcess}...`
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
              `✅ Loaded from cache — ${cachedResults.length} courses (pages ${incrementalCache.cachedPageStart}-${incrementalCache.cachedPageEnd})`
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
        const numPagesToProcess = pageLimit > 0 ? Math.min(pageLimit, pdf.numPages) : pdf.numPages
        
        // CRITICAL FIX: Only extract pages we need to process (not from page 1)
        for (let i = startPage; i <= numPagesToProcess; i++) {
          const page = await pdf.getPage(i)
          const tc = await page.getTextContent()
          pages.push(tc.items.map((it: any) => it.str).join(' '))
        }
        
        if (pageLimit > 0 && numPagesToProcess < pdf.numPages) {
          setStatus(`Processing first ${numPagesToProcess} pages (out of ${pdf.numPages} total)...`)
        }
        
        textContent = pages.join('\n\n')
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

        setStatus(`✅ Complete — ${courses.length} courses extracted`)
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
          setStatus(`✅ Loaded from cache — ${cached.length} courses`)
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
            // Show page progress: "Page 2 of 51 done"
            setStatus(
              `📄 Page ${progress.current} of ${progress.total} done — ${
                accumulatedCourses.length
              } courses found`
            )
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

      // CRITICAL: Only cache if we have courses to cache
      if (finalCourses.length > 0) {
        // Cache cleaned results, not raw ones
        if (ext === 'pdf') {
          const numPagesToProcess =
            pageLimit > 0 ? Math.min(pageLimit, totalPages) : totalPages
          const cacheStart = usingCache ? startPage : 1
          const cacheEnd = numPagesToProcess
          
          await cacheRef.current!.setIncremental(
            fileHash,
            finalCourses,  // Cache cleaned courses, not raw
            cacheStart,
            cacheEnd,
            totalPages
          )
          setCachedPageRange({ start: 1, end: cacheEnd })
        } else {
          // For non-PDF, use simple cache
          await cacheRef.current!.set(fileHash, finalCourses)  // Cache cleaned courses
        }
      } else {
        console.warn('⚠️ No courses extracted, not caching empty results')
      }

      setFileHistory((prev) => [
        ...prev,
        {
          filename: selectedFile.name,
          coursesFound: finalCourses.length,
          timestamp: new Date().toISOString(),
        },
      ])

      setStatus(`✅ Complete — ${courses.length} courses extracted`)
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`)
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

  const filteredCourses = allCourses.filter(
    (c) =>
      !searchQ ||
      Object.values(c).some((v) =>
        String(v).toLowerCase().includes(searchQ.toLowerCase())
      )
  )

  return (
    <>
      <Head>
        <title>CourseHarvester - Extract Course Data</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"
        strategy="beforeInteractive"
      />
      <style jsx global>{`
        :root {
          --primary: #2563eb;
          --secondary: #10b981;
          --accent: #8b5cf6;
          --bg: #f8fafc;
          --card: #ffffff;
          --muted: #6b7280;
          --danger: #ef4444;
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          background: linear-gradient(180deg, #f8fafc, #ffffff);
          color: #0f172a;
          font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto,
            'Helvetica Neue', Arial;
        }
      `}</style>

      <style jsx>{`
        .header {
          background: linear-gradient(90deg, var(--primary), var(--accent));
          color: #fff;
          padding: 28px 20px;
        }
        .header-inner {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .header h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
        }
        .tagline {
          color: rgba(255, 255, 255, 0.9);
          margin-top: 6px;
          font-size: 13px;
        }
        .container {
          max-width: 1100px;
          margin: -40px auto 80px;
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
        }
        .right {
          flex: 1;
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
          .results-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .buttons-group {
            width: 100%;
          }
        }
      `}</style>

      {/* Header */}
      <div className="header">
        <div className="header-inner">
          <div>
            <div className="header h1" style={{ margin: 0 }}>
              CourseHarvester
            </div>
            <div className="tagline">
              Extract course data from PDF • Word • PowerPoint • HTML • TXT
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>
              Powered by Google Gemini
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
                    style={{ flex: 1 }}
                  />
                  <button onClick={verifyKey} className="secondary">
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
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#92400e', marginBottom: 8 }}>
                    📊 API Quota Info
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
                        📈 Upgrade to Paid Plan for Unlimited Access →
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
                      📄 Page Range ({totalPages} total pages)
                      {cachedPageRange && (
                        <span style={{ marginLeft: '8px', fontSize: '12px', color: '#059669' }}>
                          ✓ Cached: pages {cachedPageRange.start}-{cachedPageRange.end}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <select
                        value={pageLimit}
                        onChange={(e) => setPageLimit(Number(e.target.value))}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          fontFamily: 'Inter, sans-serif',
                          cursor: 'pointer',
                        }}
                      >
                        <option value={0}>All pages ({totalPages})</option>
                        {totalPages > 5 && <option value={5}>First 5 pages</option>}
                        {totalPages > 10 && <option value={10}>First 10 pages</option>}
                        {totalPages > 20 && <option value={20}>First 20 pages</option>}
                        {totalPages > 50 && <option value={50}>First 50 pages</option>}
                      </select>
                      <div className="muted">
                        {pageLimit > 0 ? `Will process ${pageLimit} page${pageLimit !== 1 ? 's' : ''} (~${Math.ceil(pageLimit / 12)} API calls)` : `Will process all ${totalPages} page${totalPages !== 1 ? 's' : ''} (~${Math.ceil(totalPages / 12)} API calls)`}
                      </div>
                    </div>
                  </div>
                )}

                <div className="controls">
                  <button onClick={extract} disabled={!selectedFile || !apiKey}>
                    Extract Courses
                  </button>
                  <button
                    onClick={async () => {
                      // Clear IndexedDB cache completely
                      try {
                        await cacheRef.current?.clearAll()
                        setCachedPageRange(null)
                        setStatus('🧹 Cache cleared!')
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
                    onClick={() => {
                      setSelectedFile(null)
                      setTotalPages(0)
                      setPageLimit(0)
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

            {/* Right Column */}
            <div className="right">
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
                    <button
                      onClick={() => copyToClipboard(filteredCourses)}
                      className="primary"
                      disabled={allCourses.length === 0}
                      title="Copy results as tab-separated values for Google Sheets"
                    >
                      📋 Copy
                    </button>
                    <button
                      onClick={downloadCSV}
                      className="secondary"
                      disabled={allCourses.length === 0}
                    >
                      CSV
                    </button>
                    <button
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
          </div>
        </div>
      </div>
    </>
  )
}
