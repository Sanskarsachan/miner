import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import { 
  FileText, 
  Download, 
  ArrowLeft,
  Search, 
  Calendar, 
  BookOpen, 
  Zap,
  Hash,
  Share2,
  Clock,
  Check,
  Copy,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Filter
} from 'lucide-react';

interface Course {
  CourseName: string;
  CourseCode?: string;
  Category?: string;
  GradeLevel?: string;
  Length?: string;
  Prerequisite?: string;
  Credit?: string;
  CourseDescription?: string;
  Details?: string;
  SourceFile?: string;
}

interface Extraction {
  _id: string;
  filename: string;
  total_courses: number;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'completed' | 'failed';
  tokens_used: number;
  pages_processed?: number;
  courses?: Course[];
}

export default function ExtractionDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'grade'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (id) {
      fetchExtraction();
    }
  }, [id]);

  const fetchExtraction = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v2/extractions/${id}`);
      const data = await response.json();
      
      if (data.success) {
        setExtraction(data.data);
      } else {
        setError('Failed to load extraction');
      }
    } catch (err) {
      setError('Error fetching extraction');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    if (!extraction) return;
    
    const courses = extraction.courses || [];
    
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'csv') {
      const headers = ['S.No', 'Category', 'CourseName', 'CourseCode', 'GradeLevel', 'Length', 'Prerequisite', 'Credit', 'CourseDescription'];
      const rows = [headers.join(',')];
      courses.forEach((course: Course, idx: number) => {
        const row = [
          idx + 1,
          `"${(course.Category || '').replace(/"/g, '""')}"`,
          `"${(course.CourseName || '').replace(/"/g, '""')}"`,
          `"${(course.CourseCode || '').replace(/"/g, '""')}"`,
          `"${(course.GradeLevel || '').replace(/"/g, '""')}"`,
          `"${(course.Length || '').replace(/"/g, '""')}"`,
          `"${(course.Prerequisite || '').replace(/"/g, '""')}"`,
          `"${(course.Credit || '').replace(/"/g, '""')}"`,
          `"${(course.CourseDescription || '').replace(/"/g, '""')}"`,
        ];
        rows.push(row.join(','));
      });
      content = rows.join('\n');
      filename = `${extraction.filename.replace(/\.[^/.]+$/, '')}_courses.csv`;
      mimeType = 'text/csv';
    } else {
      content = JSON.stringify({ ...extraction, courses }, null, 2);
      filename = `${extraction.filename.replace(/\.[^/.]+$/, '')}_courses.json`;
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const shareExtraction = async () => {
    const shareUrl = `${window.location.origin}/extraction/${id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Course Extraction: ${extraction?.filename}`,
          text: `Check out this course extraction with ${extraction?.total_courses || 0} courses`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // Fall back to clipboard
      }
    }
    
    await navigator.clipboard.writeText(shareUrl);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get unique categories
  const categories = extraction?.courses 
    ? ['all', ...new Set(extraction.courses.map(c => c.Category || 'Uncategorized').filter(Boolean))]
    : ['all'];

  // Filter and sort courses
  const filteredCourses = (extraction?.courses || [])
    .filter(course => {
      const matchesSearch = !searchQuery || 
        (course.CourseName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (course.CourseCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (course.CourseDescription || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (course.Category || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || 
        (course.Category || 'Uncategorized') === selectedCategory;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = (a.CourseName || '').localeCompare(b.CourseName || '');
      } else if (sortBy === 'category') {
        comparison = (a.Category || '').localeCompare(b.Category || '');
      } else if (sortBy === 'grade') {
        comparison = (a.GradeLevel || '').localeCompare(b.GradeLevel || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const toggleSort = (field: 'name' | 'category' | 'grade') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return { color: '#DC2626', label: 'PDF' };
      case 'doc':
      case 'docx': return { color: '#2563EB', label: 'DOC' };
      case 'ppt':
      case 'pptx': return { color: '#EA580C', label: 'PPT' };
      default: return { color: '#6B7280', label: 'FILE' };
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Loading... - Planpaths</title>
        </Head>
        <style jsx global>{`
          :root { --primary: #603AC8; --primary-dark: #31225C; --primary-light: #F4F0FF; }
          * { box-sizing: border-box; }
          body { margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: linear-gradient(180deg, #F4F0FF 0%, #FFFFFF 100%); min-height: 100vh; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #F4F0FF',
            borderTopColor: '#603AC8',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
        </div>
      </>
    );
  }

  if (error || !extraction) {
    return (
      <>
        <Head>
          <title>Error - Planpaths</title>
        </Head>
        <style jsx global>{`
          :root { --primary: #603AC8; --primary-dark: #31225C; --primary-light: #F4F0FF; }
          * { box-sizing: border-box; }
          body { margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: linear-gradient(180deg, #F4F0FF 0%, #FFFFFF 100%); min-height: 100vh; }
        `}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😕</div>
          <h2 style={{ margin: '0 0 8px', color: '#374151' }}>Extraction Not Found</h2>
          <p style={{ margin: '0 0 24px', color: '#6B7280' }}>{error || 'This extraction does not exist or has been deleted.'}</p>
          <Link href="/extractions" style={{
            padding: '12px 24px',
            background: '#603AC8',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
          }}>
            Back to Extractions
          </Link>
        </div>
      </>
    );
  }

  const fileIcon = getFileIcon(extraction.filename);

  return (
    <>
      <Head>
        <title>{extraction.filename} - Planpaths</title>
        <meta name="description" content={`View ${extraction.total_courses || 0} extracted courses from ${extraction.filename}`} />
        <link rel="icon" href="/PlanpathsIcon.png" type="image/png" />
      </Head>

      <style jsx global>{`
        :root { --primary: #603AC8; --primary-dark: #31225C; --primary-light: #F4F0FF; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: linear-gradient(180deg, #F4F0FF 0%, #FFFFFF 100%); min-height: 100vh; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ minHeight: '100vh' }}>
        {/* Global Header */}
        <Header />
        
        {/* Spacer for fixed header */}
        <div style={{ height: '70px' }} />

        {/* Page Header */}
        <div style={{
          background: 'linear-gradient(135deg, #603AC8 0%, #31225C 100%)',
          color: 'white',
          padding: '20px 24px',
          boxShadow: '0 4px 20px rgba(96, 58, 200, 0.3)',
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <Link href="/extractions" style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', opacity: 0.9 }}>
                <ArrowLeft size={20} />
                <span style={{ fontSize: '14px' }}>Back to Extractions</span>
              </Link>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: fileIcon.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '14px',
                  flexShrink: 0,
                }}>
                  {fileIcon.label}
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>{extraction.filename}</h1>
                  <p style={{ margin: '6px 0 0', fontSize: '13px', opacity: 0.85, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> {formatRelativeDate(extraction.created_at)}</span>
                    <span>•</span>
                    <span>{extraction.total_courses || 0} courses</span>
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={shareExtraction}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    background: copiedShare ? '#10B981' : 'rgba(255,255,255,0.15)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '13px',
                    transition: 'all 0.2s',
                  }}
                >
                  {copiedShare ? <Check size={16} /> : <Share2 size={16} />}
                  {copiedShare ? 'Copied!' : 'Share'}
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    background: 'white',
                    color: '#603AC8',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                >
                  <Download size={16} />
                  Export CSV
                </button>
                <button
                  onClick={() => handleExport('json')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    background: 'rgba(255,255,255,0.15)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '13px',
                  }}
                >
                  <Download size={16} />
                  JSON
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div style={{
          background: 'white',
          borderBottom: '1px solid #E5E7EB',
          padding: '16px 24px',
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#F4F0FF', borderRadius: '10px' }}>
              <BookOpen size={20} style={{ color: '#603AC8' }} />
              <div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#603AC8' }}>{extraction.total_courses || 0}</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Courses</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#ECFDF5', borderRadius: '10px' }}>
              <FileText size={20} style={{ color: '#059669' }} />
              <div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#059669' }}>{extraction.pages_processed || 0}</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Pages</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#FEF3C7', borderRadius: '10px' }}>
              <Zap size={20} style={{ color: '#D97706' }} />
              <div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#D97706' }}>{(extraction.tokens_used || 0).toLocaleString()}</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Tokens</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#EEF2FF', borderRadius: '10px' }}>
              <Hash size={20} style={{ color: '#4F46E5' }} />
              <div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#4F46E5' }}>
                  {(extraction.total_courses || 0) > 0 && (extraction.pages_processed || 0) > 0 
                    ? ((extraction.total_courses || 0) / (extraction.pages_processed || 1)).toFixed(1) 
                    : '-'}
                </div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Avg/Page</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#F9FAFB', borderRadius: '10px' }}>
              <Calendar size={20} style={{ color: '#6B7280' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{formatDate(extraction.created_at)}</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Created</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#F9FAFB', borderRadius: '10px' }}>
              <Clock size={20} style={{ color: '#6B7280' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{formatDate(extraction.updated_at)}</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Updated</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
          {/* Toolbar */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '20px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            {/* Search */}
            <div style={{ flex: '1 1 300px', position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 44px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#603AC8'}
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>

            {/* Category Filter */}
            <div style={{ position: 'relative' }}>
              <Filter size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  padding: '12px 16px 12px 36px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '10px',
                  fontSize: '14px',
                  background: 'white',
                  cursor: 'pointer',
                  minWidth: '160px',
                }}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Results count */}
            <div style={{ fontSize: '14px', color: '#6B7280' }}>
              Showing {filteredCourses.length} of {extraction.courses?.length || 0} courses
            </div>
          </div>

          {/* Courses Table */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #E5E7EB',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', width: '50px' }}>#</th>
                  <th 
                    onClick={() => toggleSort('name')}
                    style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Course Name
                      {sortBy === 'name' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </div>
                  </th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Code</th>
                  <th 
                    onClick={() => toggleSort('category')}
                    style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Category
                      {sortBy === 'category' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </div>
                  </th>
                  <th 
                    onClick={() => toggleSort('grade')}
                    style={{ padding: '14px 20px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6B7280', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      Grade
                      {sortBy === 'grade' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </div>
                  </th>
                  <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Credit</th>
                  <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6B7280', width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center' }}>
                      <div style={{ color: '#9CA3AF', marginBottom: '8px' }}>
                        {searchQuery || selectedCategory !== 'all' ? 'No courses match your filters' : 'No courses found'}
                      </div>
                      {(searchQuery || selectedCategory !== 'all') && (
                        <button
                          onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                          style={{
                            padding: '8px 16px',
                            background: '#F4F0FF',
                            color: '#603AC8',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 500,
                          }}
                        >
                          Clear Filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map((course, idx) => (
                    <React.Fragment key={idx}>
                      <tr
                        onClick={() => setExpandedCourse(expandedCourse === idx ? null : idx)}
                        style={{
                          borderBottom: expandedCourse === idx ? 'none' : '1px solid #F3F4F6',
                          cursor: 'pointer',
                          background: expandedCourse === idx ? '#F4F0FF' : 'white',
                        }}
                        onMouseEnter={(e) => {
                          if (expandedCourse !== idx) e.currentTarget.style.background = '#F9FAFB';
                        }}
                        onMouseLeave={(e) => {
                          if (expandedCourse !== idx) e.currentTarget.style.background = 'white';
                        }}
                      >
                        <td style={{ padding: '16px 20px', fontWeight: 600, color: '#603AC8' }}>{idx + 1}</td>
                        <td style={{ padding: '16px 20px', fontWeight: 500, color: '#1F2937' }}>{course.CourseName || '-'}</td>
                        <td style={{ padding: '16px 20px', color: '#6B7280', fontFamily: 'monospace', fontSize: '13px' }}>{course.CourseCode || '-'}</td>
                        <td style={{ padding: '16px 20px' }}>
                          {course.Category ? (
                            <span style={{
                              padding: '4px 10px',
                              background: '#F4F0FF',
                              color: '#603AC8',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 500,
                            }}>
                              {course.Category}
                            </span>
                          ) : '-'}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center', color: '#6B7280' }}>{course.GradeLevel || '-'}</td>
                        <td style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: '#059669' }}>{course.Credit || '-'}</td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          {expandedCourse === idx ? <ChevronUp size={18} color="#603AC8" /> : <ChevronDown size={18} color="#9CA3AF" />}
                        </td>
                      </tr>
                      {expandedCourse === idx && (
                        <tr style={{ background: '#F4F0FF' }}>
                          <td colSpan={7} style={{ padding: '0 20px 20px' }}>
                            <div style={{
                              background: 'white',
                              borderRadius: '12px',
                              padding: '20px',
                              border: '1px solid #E5E7EB',
                            }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                  <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>Length</div>
                                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>{course.Length || 'Not specified'}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>Prerequisite</div>
                                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>{course.Prerequisite || 'None'}</div>
                                </div>
                                {course.Details && (
                                  <div>
                                    <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>Additional Details</div>
                                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>{course.Details}</div>
                                  </div>
                                )}
                              </div>
                              {course.CourseDescription && (
                                <div>
                                  <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '6px' }}>Description</div>
                                  <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>{course.CourseDescription}</div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </>
  );
}
