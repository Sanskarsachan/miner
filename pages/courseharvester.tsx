import { NextPage } from 'next'
import Head from 'next/head'
import Script from 'next/script'
import { useEffect, useRef, useState, useCallback } from 'react'

// Types
interface Course {
  CourseName: string
  SourceFile: string
  [key: string]: string
}

interface FileHistory {
  filename: string
  coursesFound: number
  timestamp: string
}

// Utility functions
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4)
}

const parseCoursesFromText = (text: string): Course[] => {
  const courses: Course[] = []
  try {
    const cleanText = text
      .replace(/```json\n?|\n?```/g, '')
      .replace(/^[\s\n]*/, '')
      .replace(/[\s\n]*$/, '')

    let depth = 0
    let current = ''
    let inString = false
    let escape = false

    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i]

      if (escape) {
        escape = false
        current += char
        continue
      }

      if (char === '\\') {
        escape = true
        current += char
        continue
      }

      if (char === '"') {
        inString = !inString
        current += char
        continue
      }

      if (inString) {
        current += char
        continue
      }

      if (char === '{') {
        depth++
        current += char
      } else if (char === '}') {
        current += char
        depth--

        if (depth === 0) {
          try {
            const obj = JSON.parse(current)
            if (obj.CourseName || obj.courseName) {
              courses.push({
                CourseName: obj.CourseName || obj.courseName,
                ...obj,
              })
            }
          } catch (e) {
            // Skip invalid JSON objects
          }
          current = ''
        }
      } else if (depth > 0) {
        current += char
      }
    }
  } catch (e) {
    console.error('Error parsing courses:', e)
  }

  return courses.filter(
    (course, idx, arr) =>
      arr.findIndex(
        (c) =>
          c.CourseName === course.CourseName &&
          c.SourceFile === course.SourceFile
      ) === idx
  )
}

const buildPrompt = (textContent: string): string => {
  return `Extract ALL courses from this document in JSON format.
For each course, provide:
{
  "CourseName": "string",
  "CourseCode": "string or null",
  "Credits": "number or null",
  "Description": "string or null"
}

Return ONLY valid JSON array of course objects. No markdown, no extra text.
Document content:
${textContent}`
}

// Main Component
const CourseHarvester: NextPage = () => {
  const [apiKey, setApiKey] = useState('')
  const [remember, setRemember] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [status, setStatus] = useState('')
  const [verified, setVerified] = useState(false)
  const [modelsList, setModelsList] = useState<string[]>([])
  const [tokenUsage, setTokenUsage] = useState(0)
  const [rawResponse, setRawResponse] = useState('')
  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [fileHistory, setFileHistory] = useState<FileHistory[]>([])
  const [searchQ, setSearchQ] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load API key from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('gh_api_key')
    if (saved) {
      setApiKey(saved)
      setRemember(true)
    }
  }, [])

  // Save API key to localStorage
  useEffect(() => {
    if (remember) {
      localStorage.setItem('gh_api_key', apiKey)
    } else {
      localStorage.removeItem('gh_api_key')
    }
  }, [remember, apiKey])

  const detectFileType = useCallback(
    (file: File): { extension: string } => {
      const extension = (file.name.split('.').pop() || '').toLowerCase()
      return { extension }
    },
    []
  )

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) return
      if (file.size > 10 * 1024 * 1024) {
        setStatus('File too large (max 10MB)')
        return
      }

      setSelectedFile(file)
      setStatus('File selected: ' + file.name)

      try {
        const ext = detectFileType(file).extension
        let previewText = ''

        if (
          ['pdf', 'doc', 'docx', 'html', 'htm', 'txt'].includes(ext)
        ) {
          const txt = await (ext === 'pdf'
            ? (async () => {
                const ab = await file.arrayBuffer()
                const pdf = await (window as any).pdfjsLib.getDocument({
                  data: ab,
                }).promise
                const page = await pdf.getPage(1)
                const tc = await page.getTextContent()
                return tc.items.map((it: any) => it.str).join(' ')
              })()
            : file.text())

          previewText = (txt || '').slice(0, 20000)
        }

        const est = estimateTokens(previewText)
        setStatus(
          `File selected: ${file.name} — est. tokens: ${est}`
        )
      } catch (e) {
        console.warn('preview token estimate failed', e)
      }
    },
    [detectFileType]
  )

  const onChoose = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const processChunk = useCallback(
    async (
      textChunk: string,
      retryCount = 0,
      maxRetries = 3
    ): Promise<number> => {
      try {
        const r = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey,
            payload: {
              contents: [
                {
                  parts: [{ text: buildPrompt(textChunk) }],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8192,
              },
            },
          }),
        })

        const txt = await r.text()
        setRawResponse(txt)

        if (r.status === 429 && retryCount < maxRetries) {
          const seconds = Math.pow(2, retryCount)
          setStatus(
            `⏳ Rate limited. Retrying in ${seconds}s... (${retryCount + 1}/${maxRetries})`
          )
          await new Promise((resolve) =>
            setTimeout(resolve, seconds * 1000)
          )
          return processChunk(textChunk, retryCount + 1, maxRetries)
        }

        if (!r.ok) {
          if (txt.includes('exceeded your current quota')) {
            setStatus(
              '❌ Quota exceeded! Free tier: 20 requests/day. Upgrade or try tomorrow.'
            )
          }
          throw new Error('Server error')
        }

        const parsed = JSON.parse(txt)
        const respText =
          parsed.candidates?.[0]?.content?.parts?.[0]?.text || txt

        if (!respText) {
          console.warn('⚠️ Invalid API response')
          setStatus('⚠️ API returned empty response')
          return 0
        }

        const courses = parseCoursesFromText(respText)

        setAllCourses((prev) => {
          const merged = [...prev]
          courses.forEach((c) => {
            c.SourceFile = selectedFile?.name || 'unknown'
            if (
              !merged.some(
                (ex) =>
                  ex.CourseName === c.CourseName &&
                  ex.SourceFile === c.SourceFile
              )
            ) {
              merged.push(c)
            }
          })
          return merged
        })

        return courses.length
      } catch (e) {
        console.error('chunk api error', e)
        setStatus('API error: ' + (e instanceof Error ? e.message : 'Unknown error'))
        return 0
      }
    },
    [apiKey, selectedFile]
  )

  const extract = useCallback(async () => {
    if (!selectedFile) {
      setStatus('Select a file first')
      return
    }
    if (!apiKey) {
      setStatus('Enter your Gemini API key')
      return
    }

    setStatus('Preparing file...')
    const ext = detectFileType(selectedFile).extension

    try {
      let payloadBody: any = null

      if (['pdf', 'html', 'htm', 'doc', 'docx', 'txt'].includes(ext)) {
        if (ext === 'pdf') {
          const ab = await selectedFile.arrayBuffer()
          const pdf = await (window as any).pdfjsLib.getDocument({
            data: ab,
          }).promise

          const pages: string[] = []
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const tc = await page.getTextContent()
            pages.push(tc.items.map((it: any) => it.str).join(' '))
          }
          payloadBody = { __pages: pages }
        } else if (ext === 'doc' || ext === 'docx') {
          const ab = await selectedFile.arrayBuffer()
          const res = await (window as any).mammoth.extractRawText({
            arrayBuffer: ab,
          })
          payloadBody = { __text: res.value }
        } else {
          const content = await selectedFile.text()
          payloadBody = { __text: content }
        }
      } else if (['ppt', 'pptx'].includes(ext)) {
        const ab = await selectedFile.arrayBuffer()
        let binary = ''
        const bytes = new Uint8Array(ab)
        const chunk = 0x8000

        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode.apply(
            null,
            Array.from(bytes.subarray(i, Math.min(i + chunk, bytes.length)))
          )
        }

        const b64 = btoa(binary)
        payloadBody = {
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
                { text: buildPrompt('Attached file: ' + selectedFile.name) },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
          },
        }
      } else {
        throw new Error('Unsupported file type')
      }

      setStatus('Processing...')
      const isPages = payloadBody && payloadBody.__pages
      const isText = payloadBody && payloadBody.__text

      let total = 0

      if (isPages) {
        const pages = payloadBody.__pages
        const batchSize = 1
        const totalChunks = pages.length

        for (let i = 0; i < pages.length; i += batchSize) {
          const batch = pages.slice(i, i + batchSize).join('\n\n')
          const chunkNum = Math.floor(i / batchSize) + 1
          const remainingQuota = Math.max(0, 20 - chunkNum)

          setStatus(
            `Processing page ${i + 1}/${pages.length} - Est. Quota Left: ${remainingQuota} calls... [${Math.floor((chunkNum / totalChunks) * 100)}% done]`
          )

          const added = await processChunk(batch)
          total += added
          setTokenUsage((prev) => prev + estimateTokens(batch))

          if (chunkNum >= 18) {
            setStatus(
              `⚠️ CRITICAL: Used ${chunkNum} API calls. Free tier: 20/day.`
            )
          } else if (chunkNum >= 15) {
            setStatus(
              `⚠️ Warning: Used ${chunkNum} API calls (${20 - chunkNum} left).`
            )
          }

          if (chunkNum >= 20) {
            setStatus(
              `❌ Quota limit reached. ${total} courses extracted.`
            )
            break
          }
        }
      } else if (isText) {
        const textContent = payloadBody.__text || ''
        const maxSize = 5000
        const totalChunks = Math.ceil(textContent.length / maxSize)

        for (let i = 0; i < textContent.length; i += maxSize) {
          const chunk = textContent.slice(i, i + maxSize)
          const chunkNum = Math.floor(i / maxSize) + 1
          const remainingQuota = Math.max(0, 20 - chunkNum)

          setStatus(
            `Processing text chunk ${chunkNum}/${totalChunks} - Est. Quota Left: ${remainingQuota}... [${Math.floor((chunkNum / totalChunks) * 100)}% done]`
          )

          const added = await processChunk(chunk)
          total += added
          setTokenUsage((prev) => prev + estimateTokens(chunk))

          if (chunkNum >= 20) {
            setStatus(
              `❌ Quota limit reached. ${total} courses extracted.`
            )
            break
          }
        }
      }

      setFileHistory((prev) => [
        ...prev,
        {
          filename: selectedFile.name,
          coursesFound: total,
          timestamp: new Date().toISOString(),
        },
      ])

      setStatus(`✅ Complete — ${total} courses extracted`)
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }, [selectedFile, apiKey, detectFileType, processChunk])

  const filteredCourses = allCourses.filter((course) =>
    course.CourseName?.toLowerCase().includes(searchQ.toLowerCase())
  )

  return (
    <>
      <Head>
        <title>CourseHarvester - Extract Course Data</title>
        <meta
          name="description"
          content="Extract course information from curriculum documents"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"
        strategy="beforeInteractive"
      />

      <main style={styles.main}>
        <div style={styles.container}>
          <header style={styles.header}>
            <h1 style={styles.title}>CourseHarvester</h1>
            <p style={styles.subtitle}>Extract courses from curriculum documents</p>
          </header>

          <div style={styles.content}>
            {/* Settings Section */}
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Settings</h2>
              <div style={styles.inputGroup}>
                <input
                  type="password"
                  placeholder="Enter your Gemini API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  style={styles.input}
                />
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  {' '}Remember API key
                </label>
              </div>
            </section>

            {/* Upload Section */}
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Upload Document</h2>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) =>
                  handleFile(e.target.files?.[0] || null)
                }
                accept=".pdf,.docx,.doc,.pptx,.ppt,.html,.htm,.txt"
                style={{ display: 'none' }}
              />
              <button
                onClick={onChoose}
                style={styles.uploadButton}
              >
                Choose File
              </button>
              {selectedFile && (
                <p style={styles.selectedFile}>
                  ✓ {selectedFile.name}
                </p>
              )}
            </section>

            {/* Extract Section */}
            <section style={styles.section}>
              <button
                onClick={extract}
                style={styles.extractButton}
              >
                Extract Courses
              </button>
            </section>

            {/* Status */}
            {status && (
              <section style={styles.statusSection}>
                <p style={styles.status}>{status}</p>
              </section>
            )}

            {/* Results */}
            {allCourses.length > 0 && (
              <section style={styles.section}>
                <h2 style={styles.sectionTitle}>
                  Extracted Courses ({allCourses.length})
                </h2>
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  style={styles.searchInput}
                />
                <div style={styles.coursesGrid}>
                  {filteredCourses.map((course, idx) => (
                    <div key={idx} style={styles.courseCard}>
                      <h3 style={styles.courseName}>
                        {course.CourseName}
                      </h3>
                      {course.CourseCode && (
                        <p style={styles.courseDetail}>
                          <strong>Code:</strong> {course.CourseCode}
                        </p>
                      )}
                      {course.Credits && (
                        <p style={styles.courseDetail}>
                          <strong>Credits:</strong> {course.Credits}
                        </p>
                      )}
                      {course.Description && (
                        <p style={styles.courseDescription}>
                          {course.Description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Debug Panel */}
            {rawResponse && (
              <section style={styles.section}>
                <details style={styles.details}>
                  <summary style={styles.summary}>
                    Debug: Raw API Response
                  </summary>
                  <pre style={styles.pre}>{rawResponse}</pre>
                </details>
              </section>
            )}
          </div>
        </div>
      </main>
    </>
  )
}

const styles = {
  main: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    color: '#e2e8f0',
    fontFamily: "'Inter', 'system-ui', '-apple-system', sans-serif",
    padding: '20px',
  } as React.CSSProperties,

  container: {
    maxWidth: '900px',
    margin: '0 auto',
  } as React.CSSProperties,

  header: {
    textAlign: 'center' as const,
    marginBottom: '40px',
    paddingTop: '20px',
  } as React.CSSProperties,

  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
    background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  } as React.CSSProperties,

  subtitle: {
    fontSize: '1rem',
    color: '#94a3b8',
    margin: 0,
  } as React.CSSProperties,

  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  } as React.CSSProperties,

  section: {
    background: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '12px',
    padding: '20px',
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: '1.2rem',
    fontWeight: '600',
    margin: '0 0 16px 0',
    color: '#f1f5f9',
  } as React.CSSProperties,

  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  } as React.CSSProperties,

  input: {
    padding: '10px 12px',
    background: 'rgba(15, 23, 42, 0.5)',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    borderRadius: '6px',
    color: '#e2e8f0',
    fontSize: '0.95rem',
  } as React.CSSProperties,

  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#cbd5e1',
    cursor: 'pointer',
  } as React.CSSProperties,

  uploadButton: {
    padding: '10px 20px',
    background: 'rgba(59, 130, 246, 0.2)',
    border: '1px solid rgb(59, 130, 246)',
    borderRadius: '6px',
    color: '#60a5fa',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  } as React.CSSProperties,

  selectedFile: {
    marginTop: '10px',
    color: '#4ade80',
    fontSize: '0.9rem',
  } as React.CSSProperties,

  extractButton: {
    padding: '12px 24px',
    background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontWeight: '600',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.3s',
  } as React.CSSProperties,

  statusSection: {
    background: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '12px',
    padding: '16px',
  } as React.CSSProperties,

  status: {
    margin: 0,
    fontSize: '0.95rem',
    color: '#cbd5e1',
    wordBreak: 'break-word' as const,
  } as React.CSSProperties,

  searchInput: {
    padding: '10px 12px',
    background: 'rgba(15, 23, 42, 0.5)',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    borderRadius: '6px',
    color: '#e2e8f0',
    marginBottom: '16px',
    width: '100%',
  } as React.CSSProperties,

  coursesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  } as React.CSSProperties,

  courseCard: {
    background: 'rgba(15, 23, 42, 0.3)',
    border: '1px solid rgba(148, 163, 184, 0.15)',
    borderRadius: '8px',
    padding: '16px',
  } as React.CSSProperties,

  courseName: {
    margin: '0 0 12px 0',
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#60a5fa',
  } as React.CSSProperties,

  courseDetail: {
    margin: '6px 0',
    fontSize: '0.9rem',
    color: '#cbd5e1',
  } as React.CSSProperties,

  courseDescription: {
    margin: '8px 0 0 0',
    fontSize: '0.85rem',
    color: '#94a3b8',
    lineHeight: '1.4',
  } as React.CSSProperties,

  details: {
    cursor: 'pointer',
  } as React.CSSProperties,

  summary: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    padding: '8px',
  } as React.CSSProperties,

  pre: {
    background: 'rgba(15, 23, 42, 0.5)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '6px',
    padding: '12px',
    overflow: 'auto',
    fontSize: '0.8rem',
    color: '#cbd5e1',
    maxHeight: '300px',
  } as React.CSSProperties,
}

export default CourseHarvester
