/**
 * Refine Extraction Page
 * Integrates MappingDashboard with extraction details for end-to-end refinement workflow
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '@/components/Header';
import MappingDashboard from '@/components/MappingDashboard';
import { ArrowLeft, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';

interface Course {
  CourseName?: string;
  courseName?: string;
  CourseCode?: string;
  courseCode?: string;
  Category?: string;
  mappedCode?: string;
  mappingStatus?: 'unmapped' | 'mapped' | 'flagged_for_review';
  confidence?: number;
  matchMethod?: string;
  [key: string]: any;
}

interface ExtractionData {
  _id: string;
  filename: string;
  courses: Course[];
  total_courses?: number;
  is_refined?: boolean;
  created_at: string;
  updated_at: string;
  status: string;
}

export default function RefineExtractionPage() {
  const router = useRouter();
  const { id } = router.query;
  const [extraction, setExtraction] = useState<ExtractionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statsComputed, setStatsComputed] = useState({
    mapped: 0,
    unmapped: 0,
    flagged: 0,
  });

  useEffect(() => {
    if (id) fetchExtraction();
  }, [id]);

  const fetchExtraction = async () => {
    try {
      setLoading(true);
      const idStr = Array.isArray(id) ? id[0] : id;
      const response = await fetch(`/api/v2/extractions/${idStr}`);

      if (!response.ok) {
        throw new Error('Failed to fetch extraction');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setExtraction(data.data);
        computeStats(data.data.courses);
      } else {
        setError('Extraction not found');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load extraction'
      );
    } finally {
      setLoading(false);
    }
  };

  const computeStats = (courses: Course[]) => {
    const mapped = courses.filter(
      (c) => c.mappingStatus === 'mapped'
    ).length;
    const unmapped = courses.filter(
      (c) => c.mappingStatus !== 'mapped' && c.mappingStatus !== 'flagged_for_review'
    ).length;
    const flagged = courses.filter(
      (c) => c.mappingStatus === 'flagged_for_review'
    ).length;

    setStatsComputed({ mapped, unmapped, flagged });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
        <Header />
        <div
          style={{
            padding: '64px 20px',
            textAlign: 'center',
            color: '#6b7280',
          }}
        >
          Loading extraction...
        </div>
      </div>
    );
  }

  if (error || !extraction) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
        <Header />
        <div
          style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: '40px 20px',
          }}
        >
          <div
            style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: '16px',
              borderRadius: '8px',
              display: 'flex',
              gap: '12px',
            }}
          >
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{error || 'Extraction not found'}</span>
          </div>
          <button
            onClick={() => router.push('/extractions')}
            style={{
              marginTop: '16px',
              padding: '10px 16px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ← Back to Extractions
          </button>
        </div>
      </div>
    );
  }

  const courseName = extraction.filename.replace(/\.[^.]+$/, '');
  const totalCourses = extraction.courses?.length || 0;

  return (
    <>
      <Head>
        <title>Refine Extraction - {courseName}</title>
      </Head>

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: #f8f9fa;
        }

        .content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 20px;
        }

        .header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }

        .back-btn {
          background: white;
          border: 1px solid #e5e7eb;
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .back-btn:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .title-section h1 {
          font-size: 28px;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 8px 0;
        }

        .title-section p {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border-left: 4px solid #667eea;
        }

        .stat-card.green {
          border-left-color: #10b981;
        }

        .stat-card.red {
          border-left-color: #ef4444;
        }

        .stat-card.yellow {
          border-left-color: #fbbf24;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #1f2937;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 13px;
          color: #6b7280;
          font-weight: 600;
        }

        .courses-table {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          margin-top: 32px;
        }

        .table-header {
          background: #f9fafb;
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
          font-weight: 600;
          font-size: 13px;
          color: #374151;
          display: grid;
          grid-template-columns: 2fr 1.2fr 1fr 1fr 1fr;
          gap: 16px;
          align-items: center;
        }

        .table-row {
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
          display: grid;
          grid-template-columns: 2fr 1.2fr 1fr 1fr 1fr;
          gap: 16px;
          align-items: center;
        }

        .table-row:last-child {
          border-bottom: none;
        }

        .table-row:hover {
          background: #f9fafb;
        }

        .course-name {
          font-weight: 500;
          color: #1f2937;
        }

        .badge {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          text-align: center;
        }

        .badge-mapped {
          background: #d1fae5;
          color: #065f46;
        }

        .badge-unmapped {
          background: #fee2e2;
          color: #991b1b;
        }

        .badge-flagged {
          background: #fef3c7;
          color: #92400e;
        }

        .confidence {
          color: #6b7280;
          font-size: 13px;
        }

        .empty-state {
          text-align: center;
          padding: 32px;
          color: #9ca3af;
        }

        @media (max-width: 768px) {
          .table-row {
            grid-template-columns: 1fr;
          }

          .title-section h1 {
            font-size: 24px;
          }
        }
      `}</style>

      <div className="container">
        <Header />

        <div className="content">
          <div className="header">
            <button className="back-btn" onClick={() => router.push('/extractions')}>
              <ArrowLeft size={18} />
              Back
            </button>
            <div className="title-section">
              <h1>Refine Extraction: {courseName}</h1>
              <p>Map {totalCourses} courses to your master database</p>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card green">
              <div className="stat-value">
                <CheckCircle size={28} color="#10b981" />
                {statsComputed.mapped}
              </div>
              <div className="stat-label">Mapped Courses</div>
            </div>

            <div className="stat-card red">
              <div className="stat-value">
                <AlertCircle size={28} color="#ef4444" />
                {statsComputed.unmapped}
              </div>
              <div className="stat-label">Unmapped Courses</div>
            </div>

            <div className="stat-card yellow">
              <div className="stat-value">
                <TrendingUp size={28} color="#fbbf24" />
                {statsComputed.flagged}
              </div>
              <div className="stat-label">Flagged for Review</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">
                {totalCourses > 0
                  ? Math.round((statsComputed.mapped / totalCourses) * 100)
                  : 0}
                %
              </div>
              <div className="stat-label">Completion Rate</div>
            </div>
          </div>

          {extraction && (
            <MappingDashboard
              extractionId={extraction._id}
              onRefineComplete={(result) => {
                // Refresh extraction data after refinement
                setTimeout(() => fetchExtraction(), 1000);
              }}
            />
          )}

          <div style={{ marginTop: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#1f2937' }}>
              Current Mappings
            </h2>

            {extraction.courses && extraction.courses.length > 0 ? (
              <div className="courses-table">
                <div className="table-header">
                  <div>Course Name</div>
                  <div>Program</div>
                  <div>Course Code</div>
                  <div>Mapped Code</div>
                  <div>Status</div>
                </div>

                {extraction.courses.slice(0, 20).map((course, idx) => (
                  <div key={idx} className="table-row">
                    <div className="course-name">{course.CourseName || course.courseName || '-'}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      {course.mappedProgramSubjectArea || course.ProgramSubjectArea || course.programSubjectArea || '-'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      {course.CourseCode || course.courseCode || '-'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      {course.mappedCode || '-'}
                    </div>
                    <div>
                      {course.mappingStatus === 'mapped' && (
                        <span className="badge badge-mapped">Mapped</span>
                      )}
                      {course.mappingStatus === 'flagged_for_review' && (
                        <span className="badge badge-flagged">Review</span>
                      )}
                      {(!course.mappingStatus || course.mappingStatus === 'unmapped') && (
                        <span className="badge badge-unmapped">Unmapped</span>
                      )}
                      {course.confidence && (
                        <div className="confidence">{course.confidence}% confidence</div>
                      )}
                    </div>
                  </div>
                ))}

                {extraction.courses.length > 20 && (
                  <div className="table-row" style={{ background: '#f9fafb' }}>
                    <div style={{ textAlign: 'center', gridColumn: '1 / -1', color: '#6b7280' }}>
                      Showing 20 of {extraction.courses.length} courses
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <p>No courses found in this extraction</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
