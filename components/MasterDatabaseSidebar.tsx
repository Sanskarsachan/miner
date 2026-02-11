import { useEffect, useState } from 'react'
import { Trash2, Download, RefreshCw, FileText } from 'lucide-react'

export interface MasterDbImport {
  filename: string
  count: number
  latestImport: string
  courses: any[]
}

interface MasterDatabaseSidebarProps {
  onSelectFile?: (fileImport: MasterDbImport) => void
  onRefresh?: () => void
  refreshTrigger?: number
  onClose?: () => void
}

export default function MasterDatabaseSidebar({
  onSelectFile,
  onRefresh,
  refreshTrigger = 0,
  onClose,
}: MasterDatabaseSidebarProps) {
  const [imports, setImports] = useState<MasterDbImport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    fetchImports()
  }, [refreshTrigger])

  const fetchImports = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/v2/master-db/imports')
      
      if (!response.ok) {
        throw new Error('Failed to load imports')
      }

      const data = await response.json()
      if (data.success) {
        setImports(data.data || [])
      } else {
        setError(data.error || 'Failed to load imports')
        setImports([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setImports([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete all courses from "${filename}"? This cannot be undone.`)) return

    try {
      setDeleting(filename)
      const response = await fetch('/api/v2/master-db/delete-by-filename', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      })

      if (response.ok) {
        setImports((prev) => prev.filter((i) => i.filename !== filename))
        if (selectedFilename === filename) setSelectedFilename(null)
        onRefresh?.()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete courses')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  const handleDownload = async (fileImport: MasterDbImport) => {
    try {
      setDownloading(fileImport.filename)
      
      const courses = fileImport.courses || []
      const headers = [
        'S.No',
        'Category',
        'SubCategory',
        'Program',
        'Course Code',
        'Course Name',
        'Course Title',
        'Grade Level',
        'Course Duration',
        'Course Term',
        'Credit',
        'Certification'
      ]
      
      const escape = (s: any) => {
        if (s == null) return ''
        s = String(s).replace(/"/g, '""')
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s
      }
      
      const rows = [headers.join(',')].concat(
        courses.map((c: any, idx: number) => [
          String(idx + 1),
          escape(c.category || ''),
          escape(c.subCategory || ''),
          escape(c.programSubjectArea || ''),
          escape(c.courseCode || ''),
          escape(c.courseName || ''),
          escape(c.courseTitle || ''),
          escape(c.gradeLevel || ''),
          escape(c.courseDuration || ''),
          escape(c.courseTerm || ''),
          escape(c.credit || ''),
          escape(c.certification || ''),
        ].join(','))
      )
      
      const csvBlob = new Blob([rows.join('\n')], { type: 'text/csv; charset=utf-8;' })
      const url = URL.createObjectURL(csvBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${fileImport.filename.replace(/\.[^.]+$/, '')}_master_courses.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download')
    } finally {
      setDownloading(null)
    }
  }

  const handleSelect = (fileImport: MasterDbImport) => {
    setSelectedFilename(fileImport.filename)
    onSelectFile?.(fileImport)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#f8fafc',
      borderLeft: '1px solid #e2e8f0',
      borderRadius: '8px',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ fontWeight: 600, fontSize: '13px' }}>
          📂 Imported Files
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={fetchImports}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: '4px',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb'
              e.currentTarget.style.color = '#1f2937'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#6b7280'
            }}
            title="Refresh list"
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: '4px',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              fontSize: '18px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb'
              e.currentTarget.style.color = '#1f2937'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#6b7280'
            }}
            title="Close sidebar"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Subtitle */}
      <div style={{
        padding: '8px 12px',
        fontSize: '11px',
        color: '#6b7280',
        borderBottom: '1px solid #e2e8f0',
      }}>
        History based on master database filenames
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px',
      }}>
        {loading && (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '12px',
          }}>
            Loading imports...
          </div>
        )}

        {error && (
          <div style={{
            padding: '8px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '4px',
            color: '#991b1b',
            fontSize: '12px',
            margin: '8px',
          }}>
            {error}
          </div>
        )}

        {!loading && imports.length === 0 && (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: '12px',
          }}>
            No imports yet.
          </div>
        )}

        {!loading && imports.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {imports.map((fileImport) => (
              <div
                key={fileImport.filename}
                onClick={() => handleSelect(fileImport)}
                style={{
                  padding: '8px',
                  backgroundColor: selectedFilename === fileImport.filename ? '#F4F0FF' : '#ffffff',
                  border: selectedFilename === fileImport.filename ? '1px solid #603AC8' : '1px solid #e5e7eb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
                onMouseEnter={(e) => {
                  if (selectedFilename !== fileImport.filename) {
                    e.currentTarget.style.backgroundColor = '#f3f4f6'
                    e.currentTarget.style.borderColor = '#d1d5db'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedFilename !== fileImport.filename) {
                    e.currentTarget.style.backgroundColor = '#ffffff'
                    e.currentTarget.style.borderColor = '#e5e7eb'
                  }
                }}
              >
                {/* File Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500 }}>
                  <span>📄</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fileImport.filename}
                  </span>
                  <span style={{
                    backgroundColor: '#F4F0FF',
                    color: '#603AC8',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}>
                    {fileImport.count}
                  </span>
                </div>

                {/* Metadata */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  fontSize: '11px',
                  color: '#6b7280',
                  flexWrap: 'wrap',
                }}>
                  <span title="Latest import">
                    🕐 {formatDate(fileImport.latestImport)}
                  </span>
                </div>

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  paddingTop: '4px',
                  borderTop: '1px solid #e5e7eb',
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownload(fileImport)
                    }}
                    disabled={downloading === fileImport.filename}
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      fontSize: '11px',
                      border: '1px solid #d1d5db',
                      backgroundColor: '#ffffff',
                      borderRadius: '4px',
                      cursor: downloading === fileImport.filename ? 'not-allowed' : 'pointer',
                      opacity: downloading === fileImport.filename ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (downloading !== fileImport.filename) {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                        e.currentTarget.style.borderColor = '#9ca3af'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff'
                      e.currentTarget.style.borderColor = '#d1d5db'
                    }}
                    title="Download as CSV"
                  >
                    <Download size={12} />
                    CSV
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(fileImport.filename)
                    }}
                    disabled={deleting === fileImport.filename}
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      fontSize: '11px',
                      border: '1px solid #fecaca',
                      backgroundColor: '#fef2f2',
                      color: '#991b1b',
                      borderRadius: '4px',
                      cursor: deleting === fileImport.filename ? 'not-allowed' : 'pointer',
                      opacity: deleting === fileImport.filename ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (deleting !== fileImport.filename) {
                        e.currentTarget.style.backgroundColor = '#fee2e2'
                        e.currentTarget.style.borderColor = '#f87171'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fef2f2'
                      e.currentTarget.style.borderColor = '#fecaca'
                    }}
                    title="Delete all courses from this file"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px',
        borderTop: '1px solid #e2e8f0',
        fontSize: '11px',
        color: '#9ca3af',
        textAlign: 'center',
      }}>
        {imports.length} file{imports.length !== 1 ? 's' : ''}
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
