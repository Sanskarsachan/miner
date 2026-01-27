import { X } from 'lucide-react'
import { type SavedExtraction } from './CourseHarvesterSidebar'

interface ExtractionDetailModalProps {
  extraction: SavedExtraction | null
  isOpen: boolean
  onClose: () => void
}

export default function ExtractionDetailModal({
  extraction,
  isOpen,
  onClose,
}: ExtractionDetailModalProps) {
  if (!isOpen || !extraction) return null

  const courses = extraction.courses || []

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <h2 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 700 }}>
                📋 {extraction.filename}
              </h2>
              {extraction.username && (
                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                  👤 User: <strong>{extraction.username}</strong>
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                fontSize: '18px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6'
                e.currentTarget.style.color = '#1f2937'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#6b7280'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Metadata Info */}
          <div
            style={{
              padding: '16px 24px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              fontSize: '13px',
            }}
          >
            {extraction.metadata?.file_size && (
              <div>
                <span style={{ color: '#6b7280' }}>📊 Size:</span> {(extraction.metadata.file_size / 1024).toFixed(1)} KB
              </div>
            )}
            {extraction.metadata?.file_type && (
              <div>
                <span style={{ color: '#6b7280' }}>📄 Type:</span> {extraction.metadata.file_type.toUpperCase()}
              </div>
            )}
            {extraction.metadata?.total_pages && (
              <div>
                <span style={{ color: '#6b7280' }}>📑 Pages:</span> {extraction.metadata.pages_processed}/{extraction.metadata.total_pages}
              </div>
            )}
            {courses.length > 0 && (
              <div>
                <span style={{ color: '#6b7280' }}>📚 Courses:</span>{' '}
                <strong style={{ color: '#2563eb' }}>{courses.length}</strong>
              </div>
            )}
            <div>
              <span style={{ color: '#6b7280' }}>🕐 Created:</span>{' '}
              {new Date(extraction.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>

          {/* Content */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 24px',
            }}
          >
            {courses.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#9ca3af',
                  fontSize: '14px',
                }}
              >
                No courses extracted from this file.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px',
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>
                        S.No
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>
                        Course Name
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>
                        Category
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>
                        Code
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>
                        Grade Level
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>
                        Credit
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((course, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8fafc'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        <td style={{ padding: '12px', fontWeight: 600, color: '#2563eb' }}>{idx + 1}</td>
                        <td style={{ padding: '12px', fontWeight: 500 }}>
                          {course.CourseName || '-'}
                        </td>
                        <td style={{ padding: '12px', color: '#6b7280' }}>
                          {course.Category || '-'}
                        </td>
                        <td style={{ padding: '12px', color: '#6b7280', fontSize: '12px' }}>
                          {course.CourseCode || '-'}
                        </td>
                        <td style={{ padding: '12px', color: '#6b7280' }}>
                          {course.GradeLevel || '-'}
                        </td>
                        <td style={{ padding: '12px', color: '#6b7280' }}>
                          {course.Credit || '-'}
                        </td>
                        <td style={{ padding: '12px', color: '#6b7280', fontSize: '12px', maxWidth: '300px' }}>
                          {course.CourseDescription ? course.CourseDescription.slice(0, 60) + (course.CourseDescription.length > 60 ? '...' : '') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          div {
            /* Modal adapts to smaller screens */
          }
        }
      `}</style>
    </>
  )
}
