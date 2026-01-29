import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  FileText, 
  Download, 
  Trash2, 
  RefreshCw, 
  Search, 
  Calendar, 
  BookOpen, 
  Zap,
  ChevronRight,
  Grid,
  List,
  Copy,
  Check,
  ArrowLeft,
  Plus,
  FolderOpen,
  Share2,
  Clock,
  Hash,
  Eye,
  ExternalLink
} from 'lucide-react';

interface Extraction {
  _id: string;
  filename: string;
  total_courses: number;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'completed' | 'failed';
  tokens_used: number;
  pages_processed?: number;
  courses?: any[];
}

export default function V2ExtractionsPage() {
  const router = useRouter();
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExtraction, setSelectedExtraction] = useState<Extraction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'courses'>('date');
  const [showDetail, setShowDetail] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedShare, setCopiedShare] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const navigateToExtraction = (id: string) => {
    router.push(`/extraction/${id}`);
  };

  useEffect(() => {
    fetchExtractions();
  }, []);

  const fetchExtractions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v2/extractions/list?limit=100&skip=0');
      const data = await response.json();
      
      if (data.success) {
        setExtractions(data.data || []);
      } else {
        setError('Failed to load extractions');
      }
    } catch (err) {
      setError('Error fetching extractions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this extraction?')) return;
    
    try {
      setDeleting(id);
      const response = await fetch(`/api/v2/extractions/${id}`, { method: 'DELETE' });
      
      if (response.ok) {
        setExtractions(prev => prev.filter(e => e._id !== id));
        if (selectedExtraction?._id === id) {
          setSelectedExtraction(null);
          setShowDetail(false);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  const handleExport = async (extraction: Extraction, format: 'csv' | 'json') => {
    try {
      // Fetch full extraction data with courses
      const response = await fetch(`/api/v2/extractions/${extraction._id}`);
      const data = await response.json();
      
      const courses = data.data?.courses || [];
      
      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'csv') {
        const headers = ['S.No', 'Category', 'CourseName', 'CourseCode', 'GradeLevel', 'Length', 'Prerequisite', 'Credit', 'CourseDescription'];
        const rows = [headers.join(',')];
        courses.forEach((course: any, idx: number) => {
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
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareExtraction = async (extraction: Extraction) => {
    const shareUrl = `${window.location.origin}/extractions?id=${extraction._id}`;
    
    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Course Extraction: ${extraction.filename}`,
          text: `Check out this course extraction with ${extraction.total_courses} courses from ${extraction.filename}`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fall back to clipboard
      }
    }
    
    // Fall back to clipboard
    await navigator.clipboard.writeText(shareUrl);
    setCopiedShare(extraction._id);
    setTimeout(() => setCopiedShare(null), 2000);
  };

  const formatFullDate = (dateString: string) => {
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

  const formatDate = (dateString: string) => {
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

  const filteredExtractions = extractions
    .filter(e => e.filename.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      if (sortBy === 'name') return a.filename.localeCompare(b.filename);
      if (sortBy === 'courses') return b.total_courses - a.total_courses;
      return 0;
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return { bg: '#ECFDF5', text: '#059669', dot: '#10B981' };
      case 'pending': return { bg: '#FEF3C7', text: '#D97706', dot: '#F59E0B' };
      case 'failed': return { bg: '#FEE2E2', text: '#DC2626', dot: '#EF4444' };
      default: return { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' };
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

  return (
    <>
      <Head>
        <title>Saved Extractions - Planpaths</title>
        <meta name="description" content="View and manage your extracted course data" />
        <link rel="icon" href="/PlanpathsIcon.png" type="image/png" />
      </Head>

      <style jsx global>{`
        :root {
          --primary: #603AC8;
          --primary-dark: #31225C;
          --primary-light: #F4F0FF;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(180deg, #F4F0FF 0%, #FFFFFF 100%);
          min-height: 100vh;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ minHeight: '100vh' }}>
        {/* Header */}
        <header style={{
          background: 'linear-gradient(135deg, #603AC8 0%, #31225C 100%)',
          color: 'white',
          padding: '20px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          boxShadow: '0 4px 20px rgba(96, 58, 200, 0.3)',
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Link href="/courseharvester" style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', opacity: 0.9 }}>
                <ArrowLeft size={20} />
                <span style={{ fontSize: '14px' }}>Back</span>
              </Link>
              <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.3)' }} />
              <div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FolderOpen size={24} />
                  Saved Extractions
                </h1>
                <p style={{ margin: '4px 0 0', fontSize: '14px', opacity: 0.85 }}>
                  {extractions.length} file{extractions.length !== 1 ? 's' : ''} • {extractions.reduce((sum, e) => sum + (e.total_courses || 0), 0)} total courses
                </p>
              </div>
            </div>
            <Link 
              href="/courseharvester"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: 'white',
                color: '#603AC8',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
            >
              <Plus size={18} />
              New Extraction
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
          {/* Toolbar */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '24px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            {/* Search */}
            <div style={{
              flex: '1 1 300px',
              position: 'relative',
            }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                type="text"
                placeholder="Search files..."
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

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                padding: '12px 16px',
                border: '2px solid #E5E7EB',
                borderRadius: '10px',
                fontSize: '14px',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="courses">Sort by Courses</option>
            </select>

            {/* View Toggle */}
            <div style={{
              display: 'flex',
              border: '2px solid #E5E7EB',
              borderRadius: '10px',
              overflow: 'hidden',
            }}>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '10px 14px',
                  border: 'none',
                  background: viewMode === 'grid' ? '#603AC8' : 'white',
                  color: viewMode === 'grid' ? 'white' : '#6B7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  padding: '10px 14px',
                  border: 'none',
                  borderLeft: '1px solid #E5E7EB',
                  background: viewMode === 'list' ? '#603AC8' : 'white',
                  color: viewMode === 'list' ? 'white' : '#6B7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <List size={18} />
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={fetchExtractions}
              disabled={loading}
              style={{
                padding: '12px 16px',
                border: '2px solid #E5E7EB',
                borderRadius: '10px',
                background: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#374151',
                fontWeight: 500,
              }}
            >
              <RefreshCw size={18} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '4px solid #F4F0FF',
                borderTopColor: '#603AC8',
                borderRadius: '50%',
                margin: '0 auto 16px',
                animation: 'spin 1s linear infinite',
              }} />
              <p style={{ color: '#6B7280' }}>Loading your extractions...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredExtractions.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '80px 20px',
              background: 'white',
              borderRadius: '16px',
              border: '2px dashed #E5E7EB',
            }}>
              <FolderOpen size={64} style={{ color: '#D1D5DB', marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px', color: '#374151', fontSize: '18px' }}>
                {searchQuery ? 'No matching files' : 'No extractions yet'}
              </h3>
              <p style={{ margin: '0 0 24px', color: '#6B7280', fontSize: '14px' }}>
                {searchQuery ? 'Try a different search term' : 'Extract courses from a PDF to get started'}
              </p>
              {!searchQuery && (
                <Link
                  href="/courseharvester"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    background: '#603AC8',
                    color: 'white',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  <Plus size={18} />
                  Create Your First Extraction
                </Link>
              )}
            </div>
          )}

          {/* Grid View */}
          {!loading && filteredExtractions.length > 0 && viewMode === 'grid' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px',
            }}>
              {filteredExtractions.map((extraction) => {
                const fileIcon = getFileIcon(extraction.filename);
                const statusColor = getStatusColor(extraction.status);
                
                return (
                  <div
                    key={extraction._id}
                    onClick={() => navigateToExtraction(extraction._id)}
                    style={{
                      background: 'white',
                      borderRadius: '16px',
                      border: selectedExtraction?._id === extraction._id ? '2px solid #603AC8' : '1px solid #E5E7EB',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(96, 58, 200, 0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                    }}
                  >
                    {/* Card Header */}
                    <div style={{
                      padding: '20px',
                      background: 'linear-gradient(135deg, #F4F0FF 0%, #FFFFFF 100%)',
                      borderBottom: '1px solid #F3F4F6',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          background: fileIcon.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '12px',
                          flexShrink: 0,
                        }}>
                          {fileIcon.label}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{
                            margin: 0,
                            fontSize: '15px',
                            fontWeight: 600,
                            color: '#1F2937',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }} title={extraction.filename}>
                            {extraction.filename}
                          </h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: statusColor.bg,
                              color: statusColor.text,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}>
                              <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: statusColor.dot,
                              }} />
                              {extraction.status}
                            </span>
                            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                              {formatDate(extraction.updated_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                      <div style={{ textAlign: 'center', padding: '8px 4px', background: '#F4F0FF', borderRadius: '8px' }}>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#603AC8' }}>
                          {extraction.total_courses || 0}
                        </div>
                        <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>Courses</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '8px 4px', background: '#ECFDF5', borderRadius: '8px' }}>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#059669' }}>
                          {extraction.pages_processed || 0}
                        </div>
                        <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>Pages</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '8px 4px', background: '#FEF3C7', borderRadius: '8px' }}>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#D97706' }}>
                          {(extraction.tokens_used || 0) > 1000 ? `${((extraction.tokens_used || 0) / 1000).toFixed(1)}k` : (extraction.tokens_used || 0)}
                        </div>
                        <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>Tokens</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '8px 4px', background: '#EEF2FF', borderRadius: '8px' }}>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#4F46E5' }}>
                          {(extraction.total_courses || 0) > 0 && (extraction.pages_processed || 0) > 0 ? ((extraction.total_courses || 0) / (extraction.pages_processed || 1)).toFixed(1) : '-'}
                        </div>
                        <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>Avg/Page</div>
                      </div>
                    </div>

                    {/* Created/Updated Info */}
                    <div style={{ padding: '8px 20px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: '16px', fontSize: '11px', color: '#6B7280' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        Created: {formatDate(extraction.created_at)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        Updated: {formatDate(extraction.updated_at)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{
                      padding: '12px 20px',
                      borderTop: '1px solid #F3F4F6',
                      display: 'flex',
                      gap: '8px',
                    }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleExport(extraction, 'csv'); }}
                        style={{
                          flex: 1,
                          padding: '8px',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          background: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#374151',
                        }}
                      >
                        <Download size={14} />
                        CSV
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleExport(extraction, 'json'); }}
                        style={{
                          flex: 1,
                          padding: '8px',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          background: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#374151',
                        }}
                      >
                        <Download size={14} />
                        JSON
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); shareExtraction(extraction); }}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #E0E7FF',
                          borderRadius: '8px',
                          background: copiedShare === extraction._id ? '#ECFDF5' : '#EEF2FF',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: copiedShare === extraction._id ? '#059669' : '#4F46E5',
                          transition: 'all 0.2s',
                        }}
                        title="Share extraction link"
                      >
                        {copiedShare === extraction._id ? <Check size={14} /> : <Share2 size={14} />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(extraction._id); }}
                        disabled={deleting === extraction._id}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #FEE2E2',
                          borderRadius: '8px',
                          background: '#FEF2F2',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#DC2626',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* List View */}
          {!loading && filteredExtractions.length > 0 && viewMode === 'list' && (
            <div style={{
              background: 'white',
              borderRadius: '16px',
              border: '1px solid #E5E7EB',
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>File</th>
                    <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Status</th>
                    <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Courses</th>
                    <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Pages</th>
                    <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Tokens</th>
                    <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Created</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExtractions.map((extraction) => {
                    const fileIcon = getFileIcon(extraction.filename);
                    const statusColor = getStatusColor(extraction.status);
                    
                    return (
                      <tr
                        key={extraction._id}
                        onClick={() => navigateToExtraction(extraction._id)}
                        style={{
                          borderBottom: '1px solid #F3F4F6',
                          cursor: 'pointer',
                          background: selectedExtraction?._id === extraction._id ? '#F4F0FF' : 'white',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
                        onMouseLeave={(e) => e.currentTarget.style.background = selectedExtraction?._id === extraction._id ? '#F4F0FF' : 'white'}
                      >
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              background: fileIcon.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 700,
                              fontSize: '10px',
                            }}>
                              {fileIcon.label}
                            </div>
                            <span style={{ fontWeight: 500, color: '#1F2937', fontSize: '14px' }}>{extraction.filename}</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 500,
                            background: statusColor.bg,
                            color: statusColor.text,
                          }}>
                            {extraction.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: '#603AC8' }}>
                          {extraction.total_courses || 0}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: '#059669' }}>
                          {extraction.pages_processed || 0}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center', color: '#6B7280' }}>
                          {(extraction.tokens_used || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                          {formatDate(extraction.created_at)}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleExport(extraction, 'csv'); }}
                              style={{
                                padding: '6px 12px',
                                border: '1px solid #E5E7EB',
                                borderRadius: '6px',
                                background: 'white',
                                cursor: 'pointer',
                                fontSize: '12px',
                                color: '#374151',
                              }}
                            >
                              CSV
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); shareExtraction(extraction); }}
                              style={{
                                padding: '6px 10px',
                                border: '1px solid #E0E7FF',
                                borderRadius: '6px',
                                background: copiedShare === extraction._id ? '#ECFDF5' : '#EEF2FF',
                                cursor: 'pointer',
                                color: copiedShare === extraction._id ? '#059669' : '#4F46E5',
                              }}
                              title="Share link"
                            >
                              {copiedShare === extraction._id ? <Check size={14} /> : <Share2 size={14} />}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(extraction._id); }}
                              style={{
                                padding: '6px 10px',
                                border: '1px solid #FEE2E2',
                                borderRadius: '6px',
                                background: '#FEF2F2',
                                cursor: 'pointer',
                                color: '#DC2626',
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>

        {/* Detail Modal */}
        {showDetail && selectedExtraction && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: '20px',
            }}
            onClick={() => setShowDetail(false)}
          >
            <div
              style={{
                background: 'white',
                borderRadius: '20px',
                maxWidth: '500px',
                width: '100%',
                maxHeight: '80vh',
                overflow: 'auto',
                boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{
                padding: '24px',
                background: 'linear-gradient(135deg, #603AC8 0%, #31225C 100%)',
                color: 'white',
                borderRadius: '20px 20px 0 0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '14px',
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <FileText size={28} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{selectedExtraction.filename}</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.85 }}>
                      {formatDate(selectedExtraction.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '24px' }}>
                {/* Stats */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px',
                  marginBottom: '20px',
                }}>
                  <div style={{
                    padding: '14px',
                    background: '#F4F0FF',
                    borderRadius: '12px',
                    textAlign: 'center',
                  }}>
                    <BookOpen size={18} style={{ color: '#603AC8', marginBottom: '6px' }} />
                    <div style={{ fontSize: '22px', fontWeight: 700, color: '#603AC8' }}>{selectedExtraction.total_courses || 0}</div>
                    <div style={{ fontSize: '10px', color: '#6B7280' }}>Courses</div>
                  </div>
                  <div style={{
                    padding: '14px',
                    background: '#ECFDF5',
                    borderRadius: '12px',
                    textAlign: 'center',
                  }}>
                    <FileText size={18} style={{ color: '#059669', marginBottom: '6px' }} />
                    <div style={{ fontSize: '22px', fontWeight: 700, color: '#059669' }}>{selectedExtraction.pages_processed || 0}</div>
                    <div style={{ fontSize: '10px', color: '#6B7280' }}>Pages</div>
                  </div>
                  <div style={{
                    padding: '14px',
                    background: '#FEF3C7',
                    borderRadius: '12px',
                    textAlign: 'center',
                  }}>
                    <Zap size={18} style={{ color: '#D97706', marginBottom: '6px' }} />
                    <div style={{ fontSize: '22px', fontWeight: 700, color: '#D97706' }}>{(selectedExtraction.tokens_used || 0).toLocaleString()}</div>
                    <div style={{ fontSize: '10px', color: '#6B7280' }}>Tokens</div>
                  </div>
                  <div style={{
                    padding: '14px',
                    background: '#EEF2FF',
                    borderRadius: '12px',
                    textAlign: 'center',
                  }}>
                    <Hash size={18} style={{ color: '#4F46E5', marginBottom: '6px' }} />
                    <div style={{ fontSize: '22px', fontWeight: 700, color: '#4F46E5' }}>
                      {(selectedExtraction.total_courses || 0) > 0 && (selectedExtraction.pages_processed || 0) > 0 
                        ? ((selectedExtraction.total_courses || 0) / (selectedExtraction.pages_processed || 1)).toFixed(1) 
                        : '-'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#6B7280' }}>Avg/Page</div>
                  </div>
                </div>

                {/* Date Info */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '16px',
                }}>
                  <div style={{
                    padding: '12px',
                    background: '#F9FAFB',
                    borderRadius: '8px',
                  }}>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} /> Created
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                      {formatFullDate(selectedExtraction.created_at)}
                    </div>
                  </div>
                  <div style={{
                    padding: '12px',
                    background: '#F9FAFB',
                    borderRadius: '8px',
                  }}>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> Last Updated
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                      {formatFullDate(selectedExtraction.updated_at)}
                    </div>
                  </div>
                </div>

                {/* File ID */}
                <div style={{
                  padding: '12px 16px',
                  background: '#F9FAFB',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px' }}>File ID</div>
                    <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#374151' }}>{selectedExtraction._id}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(selectedExtraction._id)}
                    style={{
                      padding: '8px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: copied ? '#059669' : '#6B7280',
                    }}
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* View Courses Button - Primary */}
                  <button
                    onClick={() => { setShowDetail(false); navigateToExtraction(selectedExtraction._id); }}
                    style={{
                      padding: '14px',
                      border: 'none',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #603AC8 0%, #31225C 100%)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'white',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Eye size={18} /> View All Courses
                  </button>

                  {/* Share Button */}
                  <button
                    onClick={() => shareExtraction(selectedExtraction)}
                    style={{
                      padding: '14px',
                      border: '2px solid #E0E7FF',
                      borderRadius: '10px',
                      background: copiedShare === selectedExtraction._id 
                        ? '#ECFDF5' 
                        : '#EEF2FF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: copiedShare === selectedExtraction._id ? '#059669' : '#4F46E5',
                      transition: 'all 0.2s',
                    }}
                  >
                    {copiedShare === selectedExtraction._id ? (
                      <><Check size={18} /> Link Copied!</>
                    ) : (
                      <><Share2 size={18} /> Share Extraction</>  
                    )}
                  </button>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleExport(selectedExtraction, 'csv')}
                      style={{
                        flex: 1,
                        padding: '12px',
                        border: '2px solid #E5E7EB',
                        borderRadius: '10px',
                        background: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#374151',
                      }}
                    >
                      <Download size={16} />
                      CSV
                    </button>
                    <button
                      onClick={() => handleExport(selectedExtraction, 'json')}
                      style={{
                        flex: 1,
                        padding: '12px',
                        border: '2px solid #E5E7EB',
                        borderRadius: '10px',
                        background: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#374151',
                      }}
                    >
                      <Download size={16} />
                      JSON
                    </button>
                  </div>

                  <button
                    onClick={() => { handleDelete(selectedExtraction._id); setShowDetail(false); }}
                    style={{
                      padding: '12px',
                      border: '2px solid #FEE2E2',
                      borderRadius: '10px',
                      background: '#FEF2F2',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#DC2626',
                    }}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
