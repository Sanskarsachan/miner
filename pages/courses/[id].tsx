import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { normalizeCourse } from '@/lib/normalize'
import { ArrowLeft, Download, Save, X, Plus, Trash2, Search, FileText, Layers, CheckCircle, Edit2 } from 'lucide-react'

interface Course {
  Category?: string
  CourseName?: string
  name?: string
  CourseCode?: string
  code?: string
  GradeLevel?: string
  grade_level?: string
  Length?: string
  Prerequisite?: string
  Credit?: string
  credits?: string
  Details?: string
  details?: string
  CourseDescription?: string
  description?: string
  SourceFile?: string
}

interface ExtractionData {
  _id: string
  filename: string
  courses: Course[]
  total_courses?: number
  total_pages?: number
  metadata?: {
    file_size?: number
    file_type?: string
    total_pages?: number
    pages_processed?: number
  }
  created_at: string
  updated_at: string
  status: string
}

// Using shared normalize helper from lib/normalize

export default function CourseDetailPage() {
  const router = useRouter()
  const { id } = router.query
  
  const [extraction, setExtraction] = useState<ExtractionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingRow, setEditingRow] = useState<number | null>(null)
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
    if (id) fetchExtraction()
  }, [id])

  const fetchExtraction = async () => {
    try {
      setLoading(true)
      const idStr = Array.isArray(id) ? id[0] : id
      const response = await fetch(`/api/v2/extractions/${idStr}`)
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

  const handleSaveCourse = async () => {
    if (!extraction || editingRow === null || !editedCourse) return

    const updatedCourses = [...extraction.courses]
    updatedCourses[editingRow] = editedCourse

    try {
      setSaving(true)
      const response = await fetch(`/api/v2/extractions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courses: updatedCourses }),
      })

      if (response.ok) {
        setExtraction({ ...extraction, courses: updatedCourses })
        setEditingRow(null)
        setEditedCourse(null)
        showToast('Course updated!', 'success')
      } else {
        showToast('Failed to update', 'error')
      }
    } catch (err) {
      showToast('Error saving', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCourse = async (index: number) => {
    if (!extraction || !confirm('Delete this course?')) return

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
        showToast('Course deleted!', 'success')
      } else {
        showToast('Failed to delete', 'error')
      }
    } catch (err) {
      showToast('Error deleting', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAddCourse = async () => {
    if (!extraction || !newCourse.CourseName?.trim()) {
      showToast('Course name required', 'error')
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
          CourseName: '', Category: '', CourseCode: '', GradeLevel: '',
          Length: '', Prerequisite: '', Credit: '', CourseDescription: '',
        })
        showToast('Course added!', 'success')
      } else {
        showToast('Failed to add', 'error')
      }
    } catch (err) {
      showToast('Error adding', 'error')
    } finally {
      setSaving(false)
    }
  }

  const downloadCSV = () => {
    if (!extraction) return
    if (!extraction.courses || extraction.courses.length === 0) {
      if (typeof window !== 'undefined') window.alert('No courses available to export.')
      return
    }
    
    const headers = ['S.No', 'Category', 'CourseName', 'CourseCode', 'GradeLevel', 'Length', 'Prerequisite', 'Credit', 'Details', 'CourseDescription']
    const escape = (s: any) => {
      if (s == null) return ''
      s = String(s).replace(/"/g, '""')
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s
    }
    
    const rows = [headers.join(',')].concat(
      extraction.courses.map((c, idx) => {
        const nc = normalizeCourse(c)
        return [
          String(idx + 1),
          escape(nc.Category),
          escape(nc.CourseName),
          escape(nc.CourseCode),
          escape(nc.GradeLevel),
          escape(nc.Length),
          escape(nc.Prerequisite),
          escape(nc.Credit),
          escape(nc.Details),
          escape(nc.CourseDescription),
        ].join(',')
      })
    )

    // Add BOM for Excel compatibility
    const csvContent = '\uFEFF' + rows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv; charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${extraction.filename.replace(/\.[^.]+$/, '')}_courses.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredCourses = extraction?.courses.filter(course => {
    if (!searchQuery) return true
    const nc = normalizeCourse(course)
    const query = searchQuery.toLowerCase()
    return (
      nc.CourseName?.toLowerCase().includes(query) ||
      nc.Category?.toLowerCase().includes(query) ||
      nc.CourseCode?.toLowerCase().includes(query) ||
      nc.CourseDescription?.toLowerCase().includes(query)
    )
  }) || []

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F0FF' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#603AC8', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280' }}>Loading...</p>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error || !extraction) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F0FF' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
          <h2 style={{ margin: '0 0 8px' }}>Not Found</h2>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>{error || 'Extraction does not exist.'}</p>
          <Link href="/courseharvester" style={{ padding: '12px 24px', background: '#603AC8', color: 'white', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
            ← Back
          </Link>
        </div>
      </div>
    )
  }

  const totalPages = extraction.total_pages || extraction.metadata?.total_pages || 0
  const pagesProcessed = extraction.metadata?.pages_processed || totalPages
  const totalCourses = extraction.total_courses || extraction.courses?.length || 0

  return (
    <>
      <Head>
        <title>{extraction.filename} - Courses</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {/* Favicon and fonts are in _document.tsx */}
      </Head>

      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #F4F0FF; color: #31225C; }
        @keyframes spin { to { transform: rotate(360deg); } }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #F4F0FF; font-weight: 600; color: #31225C; position: sticky; top: 0; z-index: 10; }
        tr:hover { background: #F4F0FF; }
        .truncate { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .edit-input { padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; width: 100%; }
        .edit-input:focus { outline: none; border-color: #603AC8; }
      `}</style>

      {/* Header */}
      <header style={{ background: 'linear-gradient(135deg, #603AC8 0%, #31225C 100%)', color: 'white', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1600, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/courseharvester" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'white', textDecoration: 'none', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.1)' }}>
              <ArrowLeft size={18} /> Back
            </Link>
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{extraction.filename}</h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, opacity: 0.9 }}>
                {new Date(extraction.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              <Plus size={16} /> Add
            </button>
            <button onClick={downloadCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'white', border: 'none', borderRadius: 6, color: '#603AC8', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              <Download size={16} /> CSV
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '20px 24px' }}>
        {/* Stats Row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ background: 'white', borderRadius: 10, padding: '14px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 12, minWidth: 160 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'linear-gradient(135deg, #603AC8, #31225C)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <FileText size={20} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{totalPages}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Total Pages</div>
            </div>
          </div>
          <div style={{ background: 'white', borderRadius: 10, padding: '14px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 12, minWidth: 160 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'linear-gradient(135deg, #603AC8, #31225C)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Layers size={20} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{pagesProcessed}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Pages Processed</div>
            </div>
          </div>
          <div style={{ background: 'white', borderRadius: 10, padding: '14px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 12, minWidth: 160 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'linear-gradient(135deg, #603AC8, #31225C)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <CheckCircle size={20} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{totalCourses}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Courses Extracted</div>
            </div>
          </div>
          
          {/* Search */}
          <div style={{ flex: 1, minWidth: 250, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '12px 12px 12px 42px', border: '2px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none' }}
              onFocus={(e) => e.target.style.borderColor = '#603AC8'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
          <div style={{ background: '#f3f4f6', padding: '12px 16px', borderRadius: 8, fontSize: 13 }}>
            Showing <strong>{filteredCourses.length}</strong> of <strong>{totalCourses}</strong>
          </div>
        </div>

        {/* Table */}
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 50 }}>S.No</th>
                  <th style={{ minWidth: 140 }}>Category</th>
                  <th style={{ minWidth: 200 }}>Course Name</th>
                  <th style={{ width: 80 }}>Code</th>
                  <th style={{ width: 80 }}>Grade</th>
                  <th style={{ width: 80 }}>Length</th>
                  <th style={{ minWidth: 120 }}>Prerequisite</th>
                  <th style={{ width: 60 }}>Credit</th>
                  <th style={{ minWidth: 120 }}>Details</th>
                  <th style={{ minWidth: 250 }}>Description</th>
                  <th style={{ width: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map((course, idx) => {
                  const nc = normalizeCourse(course)
                  const actualIdx = extraction.courses.indexOf(course)
                  const isEditing = editingRow === actualIdx
                  
                  return (
                    <tr key={actualIdx}>
                      <td style={{ fontWeight: 600, color: '#603AC8' }}>{actualIdx + 1}</td>
                      
                      {isEditing && editedCourse ? (
                        <>
                          <td><input className="edit-input" value={editedCourse.Category || ''} onChange={(e) => setEditedCourse({ ...editedCourse, Category: e.target.value })} /></td>
                          <td><input className="edit-input" value={editedCourse.CourseName || ''} onChange={(e) => setEditedCourse({ ...editedCourse, CourseName: e.target.value })} /></td>
                          <td><input className="edit-input" value={editedCourse.CourseCode || ''} onChange={(e) => setEditedCourse({ ...editedCourse, CourseCode: e.target.value })} /></td>
                          <td><input className="edit-input" value={editedCourse.GradeLevel || ''} onChange={(e) => setEditedCourse({ ...editedCourse, GradeLevel: e.target.value })} /></td>
                          <td><input className="edit-input" value={editedCourse.Length || ''} onChange={(e) => setEditedCourse({ ...editedCourse, Length: e.target.value })} /></td>
                          <td><input className="edit-input" value={editedCourse.Prerequisite || ''} onChange={(e) => setEditedCourse({ ...editedCourse, Prerequisite: e.target.value })} /></td>
                          <td><input className="edit-input" value={editedCourse.Credit || ''} onChange={(e) => setEditedCourse({ ...editedCourse, Credit: e.target.value })} /></td>
                          <td><input className="edit-input" value={editedCourse.Details || ''} onChange={(e) => setEditedCourse({ ...editedCourse, Details: e.target.value })} /></td>
                          <td><input className="edit-input" value={editedCourse.CourseDescription || ''} onChange={(e) => setEditedCourse({ ...editedCourse, CourseDescription: e.target.value })} /></td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={handleSaveCourse} disabled={saving} style={{ padding: 6, background: '#603AC8', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }} title="Save">
                                <Save size={14} />
                              </button>
                              <button onClick={() => { setEditingRow(null); setEditedCourse(null) }} style={{ padding: 6, background: '#f3f4f6', color: '#6b7280', border: 'none', borderRadius: 4, cursor: 'pointer' }} title="Cancel">
                                <X size={14} />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{nc.Category}</td>
                          <td style={{ fontWeight: 500 }}>{nc.CourseName}</td>
                          <td>{nc.CourseCode || '-'}</td>
                          <td>{nc.GradeLevel}</td>
                          <td>{nc.Length}</td>
                          <td className="truncate" title={nc.Prerequisite}>{nc.Prerequisite}</td>
                          <td>{nc.Credit}</td>
                          <td className="truncate" title={nc.Details}>{nc.Details}</td>
                          <td className="truncate" title={nc.CourseDescription}>{nc.CourseDescription}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => { setEditingRow(actualIdx); setEditedCourse(nc) }} style={{ padding: 6, background: '#f3f4f6', color: '#6b7280', border: 'none', borderRadius: 4, cursor: 'pointer' }} title="Edit">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => handleDeleteCourse(actualIdx)} style={{ padding: 6, background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: 4, cursor: 'pointer' }} title="Delete">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {filteredCourses.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}><Search size={32} /></div>
              <p>No courses match your search</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Course Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 500, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Add New Course</h2>
              <button onClick={() => setShowAddModal(false)} style={{ padding: 6, background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#6b7280' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input type="text" placeholder="Course Name *" value={newCourse.CourseName} onChange={(e) => setNewCourse({ ...newCourse, CourseName: e.target.value })} style={{ padding: 12, border: '2px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontWeight: 600 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input type="text" placeholder="Category" value={newCourse.Category} onChange={(e) => setNewCourse({ ...newCourse, Category: e.target.value })} style={{ padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
                <input type="text" placeholder="Course Code" value={newCourse.CourseCode} onChange={(e) => setNewCourse({ ...newCourse, CourseCode: e.target.value })} style={{ padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
                <input type="text" placeholder="Grade Level" value={newCourse.GradeLevel} onChange={(e) => setNewCourse({ ...newCourse, GradeLevel: e.target.value })} style={{ padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
                <input type="text" placeholder="Credit" value={newCourse.Credit} onChange={(e) => setNewCourse({ ...newCourse, Credit: e.target.value })} style={{ padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
                <input type="text" placeholder="Length" value={newCourse.Length} onChange={(e) => setNewCourse({ ...newCourse, Length: e.target.value })} style={{ padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
                <input type="text" placeholder="Prerequisite" value={newCourse.Prerequisite} onChange={(e) => setNewCourse({ ...newCourse, Prerequisite: e.target.value })} style={{ padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
              </div>
              <input type="text" placeholder="Details" value={newCourse.Details} onChange={(e) => setNewCourse({ ...newCourse, Details: e.target.value })} style={{ padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
              <textarea placeholder="Course Description" value={newCourse.CourseDescription} onChange={(e) => setNewCourse({ ...newCourse, CourseDescription: e.target.value })} rows={3} style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, resize: 'vertical' }} />
              <button onClick={handleAddCourse} disabled={saving || !newCourse.CourseName?.trim()} style={{ padding: 14, background: 'linear-gradient(135deg, #603AC8 0%, #31225C 100%)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: saving || !newCourse.CourseName?.trim() ? 'not-allowed' : 'pointer', opacity: saving || !newCourse.CourseName?.trim() ? 0.7 : 1, marginTop: 8 }}>
                {saving ? 'Adding...' : 'Add Course'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, padding: '12px 20px', background: toast.type === 'success' ? '#603AC8' : '#ef4444', color: 'white', borderRadius: 8, fontWeight: 500, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 200 }}>
          {toast.message}
        </div>
      )}
    </>
  )
}
