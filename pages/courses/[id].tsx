import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { ArrowLeft, Download, Edit2, Save, X, Plus, Trash2, Search, FileText, Layers, Clock, CheckCircle } from 'lucide-react'

interface Course {
  Category?: string
  CourseName: string
  CourseCode?: string
  GradeLevel?: string
  Length?: string
  Prerequisite?: string
  Credit?: string
  Details?: string
  CourseDescription?: string
  SourceFile?: string
}

interface ExtractionData {
  _id: string
  filename: string
  courses: Course[]
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

export default function CourseDetailPage() {
  const router = useRouter()
  const { id } = router.query
  
  const [extraction, setExtraction] = useState<ExtractionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingCourse, setEditingCourse] = useState<number | null>(null)
  const [editedCourse, setEditedCourse] = useState<Course | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newCourse, setNewCourse] = useState<Course>({
    CourseName: '',
    Category: '',
    CourseCode: '',
    GradeLevel: '',
    Length: '',
    Prerequisite: '',
    Credit: '',
    CourseDescription: '',
  })

  useEffect(() => {
    if (id) {
      fetchExtraction()
    }
  }, [id])

  const fetchExtraction = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v2/extractions/${id}`)
      if (!response.ok) throw new Error('Failed to fetch extraction')
      const data = await response.json()
      if (data.success) {
        setExtraction(data.data)
      } else {
        setError(data.error || 'Failed to load extraction')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleEditCourse = (index: number) => {
    if (extraction) {
      setEditingCourse(index)
      setEditedCourse({ ...extraction.courses[index] })
    }
  }

  const handleSaveCourse = async () => {
    if (!extraction || editingCourse === null || !editedCourse) return

    const updatedCourses = [...extraction.courses]
    updatedCourses[editingCourse] = editedCourse

    try {
      setSaving(true)
      const response = await fetch(`/api/v2/extractions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courses: updatedCourses }),
      })

      if (response.ok) {
        setExtraction({ ...extraction, courses: updatedCourses })
        setEditingCourse(null)
        setEditedCourse(null)
        showToast('Course updated successfully!', 'success')
      } else {
        showToast('Failed to update course', 'error')
      }
    } catch (err) {
      showToast('Error saving course', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCourse = async (index: number) => {
    if (!extraction || !confirm('Delete this course? This cannot be undone.')) return

    const updatedCourses = extraction.courses.filter((_, i) => i !== index)

    try {
      setSaving(true)
      const response = await fetch(`/api/v2/extractions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courses: updatedCourses }),
      })

      if (response.ok) {
        setExtraction({ ...extraction, courses: updatedCourses })
        showToast('Course deleted successfully!', 'success')
      } else {
        showToast('Failed to delete course', 'error')
      }
    } catch (err) {
      showToast('Error deleting course', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAddCourse = async () => {
    if (!extraction || !newCourse.CourseName.trim()) {
      showToast('Course name is required', 'error')
      return
    }

    const updatedCourses = [...extraction.courses, newCourse]

    try {
      setSaving(true)
      const response = await fetch(`/api/v2/extractions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courses: updatedCourses }),
      })

      if (response.ok) {
        setExtraction({ ...extraction, courses: updatedCourses })
        setShowAddModal(false)
        setNewCourse({
          CourseName: '',
          Category: '',
          CourseCode: '',
          GradeLevel: '',
          Length: '',
          Prerequisite: '',
          Credit: '',
          CourseDescription: '',
        })
        showToast('Course added successfully!', 'success')
      } else {
        showToast('Failed to add course', 'error')
      }
    } catch (err) {
      showToast('Error adding course', 'error')
    } finally {
      setSaving(false)
    }
  }

  const downloadCSV = () => {
    if (!extraction) return
    
    const headers = ['S.No', 'Category', 'CourseName', 'CourseCode', 'GradeLevel', 'Length', 'Prerequisite', 'Credit', 'CourseDescription']
    const escape = (s: any) => {
      if (s == null) return ''
      s = String(s).replace(/"/g, '""')
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s
    }
    
    const rows = [headers.join(',')].concat(
      extraction.courses.map((c, idx) => [
        String(idx + 1),
        escape(c.Category || ''),
        escape(c.CourseName || ''),
        escape(c.CourseCode || ''),
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
    a.download = `${extraction.filename.replace(/\.[^.]+$/, '')}_courses.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredCourses = extraction?.courses.filter(course => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      course.CourseName?.toLowerCase().includes(query) ||
      course.Category?.toLowerCase().includes(query) ||
      course.CourseCode?.toLowerCase().includes(query) ||
      course.CourseDescription?.toLowerCase().includes(query)
    )
  }) || []

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '16px',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#6b7280', margin: 0 }}>Loading extraction...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (error || !extraction) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '16px',
          textAlign: 'center',
          maxWidth: '400px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😕</div>
          <h2 style={{ margin: '0 0 8px', color: '#1f2937' }}>Extraction Not Found</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>{error || 'This extraction does not exist.'}</p>
          <Link href="/courseharvester" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
          }}>
            <ArrowLeft size={18} />
            Back to CourseHarvester
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{extraction.filename} - Course Details</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: Inter, system-ui, -apple-system, sans-serif;
          background: #f8fafc;
          color: #1f2937;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '20px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/courseharvester" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'white',
              textDecoration: 'none',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.1)',
              transition: 'background 0.2s',
            }}>
              <ArrowLeft size={18} />
              <span style={{ fontWeight: 500 }}>Back</span>
            </Link>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
                {extraction.filename}
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.9 }}>
                Extracted {new Date(extraction.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Plus size={16} />
              Add Course
            </button>
            <button
              onClick={downloadCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                background: 'white',
                border: 'none',
                borderRadius: '8px',
                color: '#6366f1',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div style={{
        maxWidth: '1400px',
        margin: '24px auto',
        padding: '0 24px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}>
          {/* Total Pages Card */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            animation: 'fadeIn 0.3s ease-out',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}>
              <FileText size={24} />
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937' }}>
                {extraction.metadata?.total_pages || '-'}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Total Pages</div>
            </div>
          </div>

          {/* Pages Processed Card */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            animation: 'fadeIn 0.3s ease-out 0.1s both',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}>
              <Layers size={24} />
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937' }}>
                {extraction.metadata?.pages_processed || '-'}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Pages Processed</div>
            </div>
          </div>

          {/* Courses Extracted Card */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            animation: 'fadeIn 0.3s ease-out 0.2s both',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}>
              <CheckCircle size={24} />
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937' }}>
                {extraction.courses?.length || 0}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Courses Extracted</div>
            </div>
          </div>

          {/* File Size Card */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            animation: 'fadeIn 0.3s ease-out 0.3s both',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}>
              <Clock size={24} />
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937' }}>
                {extraction.metadata?.file_size 
                  ? `${(extraction.metadata.file_size / 1024).toFixed(1)} KB` 
                  : '-'}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>File Size</div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <div style={{
            flex: 1,
            minWidth: '250px',
            position: 'relative',
          }}>
            <Search size={18} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af',
            }} />
            <input
              type="text"
              placeholder="Search courses by name, category, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 42px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#6366f1'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
          <div style={{
            fontSize: '14px',
            color: '#6b7280',
            padding: '8px 16px',
            background: '#f3f4f6',
            borderRadius: '8px',
          }}>
            Showing <strong style={{ color: '#1f2937' }}>{filteredCourses.length}</strong> of <strong style={{ color: '#1f2937' }}>{extraction.courses.length}</strong> courses
          </div>
        </div>

        {/* Course Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '16px',
        }}>
          {filteredCourses.map((course, index) => {
            const actualIndex = extraction.courses.findIndex(c => c === course)
            return (
              <div
                key={actualIndex}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s',
                  animation: `slideIn 0.3s ease-out ${index * 0.05}s both`,
                  border: editingCourse === actualIndex ? '2px solid #6366f1' : '2px solid transparent',
                }}
              >
                {editingCourse === actualIndex && editedCourse ? (
                  // Edit Mode
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input
                      type="text"
                      value={editedCourse.CourseName || ''}
                      onChange={(e) => setEditedCourse({ ...editedCourse, CourseName: e.target.value })}
                      placeholder="Course Name"
                      style={{
                        padding: '10px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: 600,
                      }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <input
                        type="text"
                        value={editedCourse.Category || ''}
                        onChange={(e) => setEditedCourse({ ...editedCourse, Category: e.target.value })}
                        placeholder="Category"
                        style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }}
                      />
                      <input
                        type="text"
                        value={editedCourse.CourseCode || ''}
                        onChange={(e) => setEditedCourse({ ...editedCourse, CourseCode: e.target.value })}
                        placeholder="Course Code"
                        style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }}
                      />
                      <input
                        type="text"
                        value={editedCourse.GradeLevel || ''}
                        onChange={(e) => setEditedCourse({ ...editedCourse, GradeLevel: e.target.value })}
                        placeholder="Grade Level"
                        style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }}
                      />
                      <input
                        type="text"
                        value={editedCourse.Credit || ''}
                        onChange={(e) => setEditedCourse({ ...editedCourse, Credit: e.target.value })}
                        placeholder="Credit"
                        style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }}
                      />
                    </div>
                    <textarea
                      value={editedCourse.CourseDescription || ''}
                      onChange={(e) => setEditedCourse({ ...editedCourse, CourseDescription: e.target.value })}
                      placeholder="Course Description"
                      rows={3}
                      style={{
                        padding: '10px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '13px',
                        resize: 'vertical',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button
                        onClick={handleSaveCourse}
                        disabled={saving}
                        style={{
                          flex: 1,
                          padding: '10px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: saving ? 'not-allowed' : 'pointer',
                          opacity: saving ? 0.7 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <Save size={14} />
                        Save
                      </button>
                      <button
                        onClick={() => { setEditingCourse(null); setEditedCourse(null) }}
                        style={{
                          padding: '10px 16px',
                          background: '#f3f4f6',
                          color: '#6b7280',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <X size={14} />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}>
                        {course.Category || 'Uncategorized'}
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => handleEditCourse(actualIndex)}
                          style={{
                            padding: '6px',
                            background: '#f3f4f6',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Edit course"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(actualIndex)}
                          style={{
                            padding: '6px',
                            background: '#fef2f2',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Delete course"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                      {course.CourseName}
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      {course.CourseCode && (
                        <span style={{
                          background: '#dbeafe',
                          color: '#1e40af',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 500,
                        }}>
                          {course.CourseCode}
                        </span>
                      )}
                      {course.GradeLevel && (
                        <span style={{
                          background: '#dcfce7',
                          color: '#166534',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 500,
                        }}>
                          Grade: {course.GradeLevel}
                        </span>
                      )}
                      {course.Credit && (
                        <span style={{
                          background: '#fef3c7',
                          color: '#92400e',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 500,
                        }}>
                          Credit: {course.Credit}
                        </span>
                      )}
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: '13px',
                      color: '#6b7280',
                      lineHeight: 1.5,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {course.CourseDescription || 'No description available'}
                    </p>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {filteredCourses.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#9ca3af',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <p style={{ margin: 0, fontSize: '16px' }}>No courses match your search</p>
          </div>
        )}
      </div>

      {/* Add Course Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
            animation: 'fadeIn 0.2s ease-out',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Add New Course</h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '6px',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                value={newCourse.CourseName}
                onChange={(e) => setNewCourse({ ...newCourse, CourseName: e.target.value })}
                placeholder="Course Name *"
                style={{
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input
                  type="text"
                  value={newCourse.Category}
                  onChange={(e) => setNewCourse({ ...newCourse, Category: e.target.value })}
                  placeholder="Category"
                  style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }}
                />
                <input
                  type="text"
                  value={newCourse.CourseCode}
                  onChange={(e) => setNewCourse({ ...newCourse, CourseCode: e.target.value })}
                  placeholder="Course Code"
                  style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }}
                />
                <input
                  type="text"
                  value={newCourse.GradeLevel}
                  onChange={(e) => setNewCourse({ ...newCourse, GradeLevel: e.target.value })}
                  placeholder="Grade Level"
                  style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }}
                />
                <input
                  type="text"
                  value={newCourse.Credit}
                  onChange={(e) => setNewCourse({ ...newCourse, Credit: e.target.value })}
                  placeholder="Credit"
                  style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }}
                />
                <input
                  type="text"
                  value={newCourse.Length}
                  onChange={(e) => setNewCourse({ ...newCourse, Length: e.target.value })}
                  placeholder="Length"
                  style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }}
                />
                <input
                  type="text"
                  value={newCourse.Prerequisite}
                  onChange={(e) => setNewCourse({ ...newCourse, Prerequisite: e.target.value })}
                  placeholder="Prerequisite"
                  style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>
              <textarea
                value={newCourse.CourseDescription}
                onChange={(e) => setNewCourse({ ...newCourse, CourseDescription: e.target.value })}
                placeholder="Course Description"
                rows={4}
                style={{
                  padding: '12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '13px',
                  resize: 'vertical',
                }}
              />
              <button
                onClick={handleAddCourse}
                disabled={saving || !newCourse.CourseName.trim()}
                style={{
                  padding: '14px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: saving || !newCourse.CourseName.trim() ? 'not-allowed' : 'pointer',
                  opacity: saving || !newCourse.CourseName.trim() ? 0.7 : 1,
                  marginTop: '8px',
                }}
              >
                {saving ? 'Adding...' : 'Add Course'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '14px 20px',
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          borderRadius: '8px',
          fontWeight: 500,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          animation: 'fadeIn 0.2s ease-out',
          zIndex: 200,
        }}>
          {toast.message}
        </div>
      )}
    </>
  )
}
