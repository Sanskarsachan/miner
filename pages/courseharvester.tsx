import Head from 'next/head'
import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'

interface Course {
  Category?: string
  CourseName: string
  GradeLevel?: string
  Length?: string
  Prerequisite?: string
  Credit?: string
  CourseDescription?: string
  SourceFile: string
  [key: string]: any
}

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
      GradeLevel: c.GradeLevel || '',
      Length: c.Length || '',
      Prerequisite: c.Prerequisite || '',
      Credit: c.Credit || '',
      CourseDescription: c.CourseDescription || '',
      SourceFile: '',
    }))
  } catch (err) {
    console.error('Failed to parse JSON', err)
    return []
  }
}

function buildPrompt(content: string): string {
  return `Extract ALL course information from the following curriculum document.\n\nReturn ONLY a valid JSON array with no markdown formatting, no code blocks, no preamble, and no explanation. Each course must be an object with these EXACT field names:\n- Category\n- CourseName\n- GradeLevel\n- Length\n- Prerequisite\n- Credit\n- CourseDescription\n\nIMPORTANT: Return ONLY the JSON array starting with [ and ending with ]. No other text.\n\nDocument content:\n${content}`
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('gh_api_key')
    if (saved) {
      setApiKey(saved)
      setRemember(true)
    }
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
    setStatus('File selected: ' + file.name)

    try {
      const ext = detectFileType(file).extension
      let previewText = ''

      if (['pdf', 'doc', 'docx', 'html', 'htm', 'txt'].includes(ext)) {
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
      setStatus(`File selected: ${file.name} — est. tokens: ${est}`)
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

  const processChunk = async (
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
            contents: [{ parts: [{ text: buildPrompt(textChunk) }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
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
        await new Promise((resolve) => setTimeout(resolve, seconds * 1000))
        return processChunk(textChunk, retryCount + 1, maxRetries)
      }

      if (!r.ok) {
        if (txt.includes('exceeded your current quota')) {
          setStatus(
            '❌ QUOTA EXHAUSTED! Free tier: 20 requests/day. Upgrade at https://ai.google.dev/pricing'
          )
        }
        throw new Error('Server error')
      }

      const parsed = JSON.parse(txt)
      const respText = parsed.candidates?.[0]?.content?.parts?.[0]?.text || txt

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
          if (!merged.some((ex) => ex.CourseName === c.CourseName))
            merged.push(c)
        })
        return merged
      })

      return courses.length
    } catch (e) {
      console.error('chunk api error', e)
      setStatus(`API error: ${e instanceof Error ? e.message : 'Unknown error'}`)
      return 0
    }
  }

  const extract = async () => {
    if (!selectedFile) return setStatus('Select a file first')
    if (!apiKey) return setStatus('Enter your Gemini API key')

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
            Array.from(bytes.subarray(i, Math.min(i + chunk, bytes.length))) as any
          )
        }

        const b64 = btoa(binary)
        const prompt = buildPrompt('Attached file: ' + selectedFile.name)
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
                { text: prompt },
              ],
            },
          ],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
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

          setStatus(
            `Processing page ${i + 1}/${pages.length}... [${Math.floor((chunkNum / totalChunks) * 100)}% done]`
          )

          const added = await processChunk(batch)
          total += added
          setTokenUsage((prev) => prev + estimateTokens(batch))

          if (chunkNum >= 20) {
            setStatus(`❌ Quota limit reached. ${total} courses extracted.`)
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

          setStatus(
            `Processing text chunk ${chunkNum}/${totalChunks}... [${Math.floor((chunkNum / totalChunks) * 100)}% done]`
          )

          const added = await processChunk(chunk)
          total += added
          setTokenUsage((prev) => prev + estimateTokens(chunk))

          if (chunkNum >= 20) {
            setStatus(`❌ Quota limit reached. ${total} courses extracted.`)
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
  }

  const downloadCSV = () => {
    const headers = [
      'Category',
      'CourseName',
      'GradeLevel',
      'Length',
      'Prerequisite',
      'Credit',
      'CourseDescription',
      'SourceFile',
    ]
    const escape = (s: any) => {
      if (s == null) return ''
      s = String(s).replace(/"/g, '""')
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s}"`
        : s
    }
    const rows = [headers.join(',')].concat(
      allCourses.map((c) => headers.map((h) => escape(c[h as keyof Course] || '')).join(','))
    )
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `course_data_${new Date().toISOString().slice(0, 10)}.csv`
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

                <div className="controls">
                  <button onClick={extract} disabled={!selectedFile || !apiKey}>
                    Extract Courses
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFile(null)
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
                  <div className="header-title">Results ({allCourses.length})</div>
                  <div className="buttons-group">
                    <input
                      type="text"
                      className="search-box"
                      placeholder="Search courses..."
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                    />
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
                        a.download = `course_data_${new Date().toISOString().slice(0, 10)}.json`
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
                        <th>Category</th>
                        <th>Course Name</th>
                        <th>Grade Level</th>
                        <th>Length</th>
                        <th>Prerequisite</th>
                        <th>Credit</th>
                        <th>Description</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCourses.map((course, idx) => (
                        <tr key={idx}>
                          <td>{course.Category}</td>
                          <td>{course.CourseName}</td>
                          <td>{course.GradeLevel}</td>
                          <td>{course.Length}</td>
                          <td>{course.Prerequisite}</td>
                          <td>{course.Credit}</td>
                          <td
                            style={{
                              fontSize: '12px',
                              color: allCourses.length > 10 ? '#6b7280' : '#0f172a',
                            }}
                          >
                            {String(course.CourseDescription || '').slice(0, 60)}...
                          </td>
                          <td className="muted">{course.SourceFile}</td>
                        </tr>
                      ))}
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
