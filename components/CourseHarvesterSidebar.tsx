import { useEffect, useState } from 'react'
import { Trash2, Download, Edit2, RefreshCw, Eye } from 'lucide-react'
import ExtractionDetailModal from './ExtractionDetailModal'

export interface SavedExtraction {
  _id: string
  user_id?: string
  username?: string
  filename: string
  courses: any[]
  metadata: {
    file_size: number
    file_type: string
    total_pages: number
    pages_processed: number
  }
  created_at: string
  updated_at: string
  status: string
}

interface CourseHarvesterSidebarProps {
  onSelectFile?: (extraction: SavedExtraction) => void
  onRefresh?: () => void
  refreshTrigger?: number
  onClose?: () => void
}

export default function CourseHarvesterSidebar({
  onSelectFile,
  onRefresh,
  refreshTrigger = 0,
  onClose,
}: CourseHarvesterSidebarProps) {
  const [extractions, setExtractions] = useState<SavedExtraction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [viewingExtraction, setViewingExtraction] = useState<SavedExtraction | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Fetch extractions on mount and when refreshTrigger changes
  useEffect(() => {
    fetchExtractions()
  }, [refreshTrigger])

  const fetchExtractions = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/v2/extractions/list')
      
      if (!response.ok) {
        throw new Error('Failed to load extractions')
      }

      const data = await response.json()
      if (data.success) {
        setExtractions(data.data || [])
      } else {
        setError(data.error || 'Failed to load extractions')
        setExtractions([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setExtractions([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this extraction? This cannot be undone.')) return

    try {
      setDeleting(id)
      const response = await fetch(`/api/v2/extractions/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setExtractions((prev) => prev.filter((e) => e._id !== id))
        if (selectedId === id) setSelectedId(null)
        onRefresh?.()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete extraction')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  const handleDownload = async (extraction: SavedExtraction) => {
    try {
      setDownloading(extraction._id)
      
      // Download as CSV
      const courses = extraction.courses || []
      const headers = ['S.No', 'Category', 'CourseName', 'GradeLevel', 'Length', 'Prerequisite', 'Credit', 'CourseDescription']
      const escape = (s: any) => {
        if (s == null) return ''
        s = String(s).replace(/"/g, '""')
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s}"`
          : s
      }
      const rows = [headers.join(',')].concat(
        courses.map((c: any, idx: number) => [
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
      
      const csvBlob = new Blob([rows.join('\n')], { type: 'text/csv; charset=utf-8;' })
      const url = URL.createObjectURL(csvBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${extraction.filename.replace(/\.[^.]+$/, '')}_courses.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download')
    } finally {
      setDownloading(null)
    }
  }

  const handleSelect = (extraction: SavedExtraction) => {
    setSelectedId(extraction._id)
    onSelectFile?.(extraction)
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

  const getFileTypeIcon = (fileType: string) => {
    const icons: Record<string, string> = {
      pdf: '📄',
      docx: '📝',
      doc: '📝',
      pptx: '🎯',
      ppt: '🎯',
      html: '🌐',
      txt: '📋',
    }
    return icons[fileType.toLowerCase()] || '📁'
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
          📚 Saved Files
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={fetchExtractions}
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
            Loading extractions...
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

        {!loading && extractions.length === 0 && (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: '12px',
          }}>
            No saved files yet. Extract a PDF to get started!
          </div>
        )}

        {!loading && extractions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {extractions.map((extraction) => (
              <div
                key={extraction._id}
                onClick={() => handleSelect(extraction)}
                style={{
                  padding: '8px',
                  backgroundColor: selectedId === extraction._id ? '#dbeafe' : '#ffffff',
                  border: selectedId === extraction._id ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
                onMouseEnter={(e) => {
                  if (selectedId !== extraction._id) {
                    e.currentTarget.style.backgroundColor = '#f3f4f6'
                    e.currentTarget.style.borderColor = '#d1d5db'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedId !== extraction._id) {
                    e.currentTarget.style.backgroundColor = '#ffffff'
                    e.currentTarget.style.borderColor = '#e5e7eb'
                  }
                }}
              >
                {/* File Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500 }}>
                  <span>{getFileTypeIcon(extraction.metadata?.file_type || 'pdf')}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {extraction.filename}
                  </span>
                  <span style={{
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}>
                    {extraction.courses?.length || 0}
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
                  {extraction.metadata?.file_size && (
                    <span title={`File size: ${extraction.metadata.file_size} bytes`}>
                      📊 {(extraction.metadata.file_size / 1024).toFixed(1)} KB
                    </span>
                  )}
                  {extraction.metadata?.file_type?.toLowerCase() === 'pdf' && extraction.metadata?.pages_processed && (
                    <span title="Pages processed">
                      📄 {extraction.metadata.pages_processed} of {extraction.metadata.total_pages}
                    </span>
                  )}
                  <span title="Saved date">
                    🕐 {formatDate(extraction.created_at)}
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
                      handleDownload(extraction)
                    }}
                    disabled={downloading === extraction._id}
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      fontSize: '11px',
                      border: '1px solid #d1d5db',
                      backgroundColor: '#ffffff',
                      borderRadius: '4px',
                      cursor: downloading === extraction._id ? 'not-allowed' : 'pointer',
                      opacity: downloading === extraction._id ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (downloading !== extraction._id) {
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
                      setViewingExtraction(extraction)
                      setShowDetailModal(true)
                    }}
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      fontSize: '11px',
                      border: '1px solid #bfdbfe',
                      backgroundColor: '#eff6ff',
                      color: '#1e40af',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#dbeafe'
                      e.currentTarget.style.borderColor = '#3b82f6'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#eff6ff'
                      e.currentTarget.style.borderColor = '#bfdbfe'
                    }}
                    title="View extracted courses"
                  >
                    <Eye size={12} />
                    View
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(extraction._id)
                    }}
                    disabled={deleting === extraction._id}
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      fontSize: '11px',
                      border: '1px solid #fecaca',
                      backgroundColor: '#fef2f2',
                      color: '#991b1b',
                      borderRadius: '4px',
                      cursor: deleting === extraction._id ? 'not-allowed' : 'pointer',
                      opacity: deleting === extraction._id ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (deleting !== extraction._id) {
                        e.currentTarget.style.backgroundColor = '#fee2e2'
                        e.currentTarget.style.borderColor = '#f87171'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fef2f2'
                      e.currentTarget.style.borderColor = '#fecaca'
                    }}
                    title="Delete from database"
                  >
                    <Trash2 size={12} />
                    Del
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
        {extractions.length} file{extractions.length !== 1 ? 's' : ''}
      </div>

      {/* Detail Modal */}
      <ExtractionDetailModal
        extraction={viewingExtraction}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setViewingExtraction(null)
        }}
      />

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
