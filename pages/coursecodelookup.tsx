import React, { useState } from 'react'
import Header from '@/components/Header'
import Toast from '@/components/Toast'
import { type ToastType } from '@/components/Toast'

interface LookupResult {
  code: string
  name: string
  title: string
  category: string
  sub_category: string
  credits?: string
  length?: string
  grad_requirement?: string
}

export default function CourseCodeLookup() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<LookupResult[]>([])
  const [missing, setMissing] = useState<string[]>([])
  const [toast, setToast] = useState('')
  const [copiedCount, setCopiedCount] = useState(0)

  const parseInput = (text: string): string[] => {
    // Support multiple formats: comma-separated, newline-separated, space-separated
    return text
      .split(/[\n,\s]+/)
      .map(code => code.trim().toUpperCase())
      .filter(code => code && /^\d{7}$/.test(code)) // Only 7-digit codes
  }

  const handleLookup = async () => {
    const codes = parseInput(input)

    if (codes.length === 0) {
      setToast('Please enter valid 7-digit course codes')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/v2/courses/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes }),
      })

      const data = await response.json()

      if (!response.ok) {
        setToast(`Error: ${data.error || 'Lookup failed'}`)
        return
      }

      setResults(data.courses || [])
      setMissing(data.missing_codes || [])
      setToast(`Found ${data.found}/${codes.length} courses`)
    } catch (error) {
      setToast(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyAsCSV = () => {
    const csv = [
      ['Code', 'Name', 'Title', 'Category', 'Credits', 'Length'].join(','),
      ...results.map(c =>
        [
          c.code,
          `"${c.name}"`,
          `"${c.title}"`,
          c.category,
          c.credits || '',
          c.length || '',
        ].join(',')
      ),
    ].join('\n')

    navigator.clipboard.writeText(csv)
    setCopiedCount(results.length)
    setToast(`Copied ${results.length} courses to clipboard as CSV`)
  }

  const handleCopyAsJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(results, null, 2))
    setCopiedCount(results.length)
    setToast(`Copied ${results.length} courses to clipboard as JSON`)
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h1>Course Code Lookup</h1>
          <p>Lookup course details by code. Supports Florida course codes (7 digits).</p>

          <div style={{ marginTop: '2rem' }}>
            <label htmlFor="codes-input" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Enter Course Codes
            </label>
            <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
              Paste codes separated by commas, spaces, or newlines. Example: 0708340, 1001310, 1001320
            </p>
            <textarea
              id="codes-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="0708340&#10;0708350&#10;1001310&#10;..."
              style={{
                width: '100%',
                minHeight: '150px',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleLookup}
              disabled={loading || input.trim() === ''}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading || input.trim() === '' ? 0.5 : 1,
                fontWeight: 500,
              }}
            >
              {loading ? 'Looking up...' : 'Lookup Courses'}
            </button>

            <button
              onClick={() => setInput('')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#f0f0f0',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {results.length > 0 && (
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', marginTop: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Found Courses ({results.length})</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleCopyAsCSV}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Copy as CSV
                </button>
                <button
                  onClick={handleCopyAsJSON}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Copy as JSON
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.9rem',
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Code</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Title</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Category</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Credits</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Length</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((course, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 500, fontFamily: 'monospace' }}>
                        {course.code}
                      </td>
                      <td style={{ padding: '0.75rem' }}>{course.name}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#666' }}>
                        {course.title}
                      </td>
                      <td style={{ padding: '0.75rem' }}>{course.category}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {course.credits || '–'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {course.length || '–'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {missing.length > 0 && (
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', marginTop: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#dc3545' }}>Missing Codes ({missing.length})</h3>
            <p style={{ marginBottom: '1rem' }}>These codes were not found in the master database:</p>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '1rem',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              wordBreak: 'break-all',
            }}>
              {missing.join(', ')}
            </div>
            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
              You can manually add these courses or upload a document containing them.
            </p>
          </div>
        )}

        {toast && (
          <Toast message={toast} type="info" onClose={() => setToast('')} />
        )}
      </div>
    </main>
  )
}
