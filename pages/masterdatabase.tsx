import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import Header from '@/components/Header';
import ApiKeySelector from '@/components/ApiKeySelector';
import MasterDatabaseSidebar from '@/components/MasterDatabaseSidebar';
import { AlertCircle, CheckCircle, Download, FileText, RefreshCw, Sparkles, Trash2 } from 'lucide-react';

interface MasterCourse {
  _id?: string;
  category: string;
  subCategory: string;
  programSubjectArea?: string;
  courseCode: string;
  courseName: string;
  courseTitle: string;
  gradeLevel?: string;
  courseLevel?: string;
  courseDuration?: string;
  courseTerm?: string;
  gradReq?: string;
  credit?: string;
  certification?: string;
  filename?: string;
  addedAt?: string;
  [key: string]: any;
}

interface ExtractionProgress {
  isExtracting: boolean;
  pagesProcessed: number;
  totalPages: number;
  coursesFound: number;
  currentBatch: number;
}

interface RateLimitModal {
  show: boolean;
  message: string;
  retryAfter: number;
  suggestion: string;
}

interface FileSummary {
  filename: string;
  count: number;
  latest?: string;
}

export default function MasterDatabasePage() {
  const [apiKeyId, setApiKeyId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [masterData, setMasterData] = useState<MasterCourse[]>([]);
  const [filteredData, setFilteredData] = useState<MasterCourse[]>([]);
  const [fileHistory, setFileHistory] = useState<FileSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [apiDebug, setApiDebug] = useState<string | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [pageRangeStart, setPageRangeStart] = useState(1);
  const [pageRangeEnd, setPageRangeEnd] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [extractionProgress, setExtractionProgress] = useState<ExtractionProgress>({
    isExtracting: false,
    pagesProcessed: 0,
    totalPages: 0,
    coursesFound: 0,
    currentBatch: 0,
  });
  const [rateLimitModal, setRateLimitModal] = useState<RateLimitModal | null>(null);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  const [showSidebar, setShowSidebar] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const response = await fetch('/api/v2/master-db/list');
      const result = await response.json();
      if (result.success) {
        const data = result.data || [];
        setMasterData(data);
        setFilteredData(data);
        buildHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch master data:', err);
    }
  };

  const buildHistory = (courses: MasterCourse[]) => {
    const byFile = new Map<string, { count: number; latest?: string }>();
    courses.forEach((course) => {
      const name = course.filename || 'unknown';
      const entry = byFile.get(name) || { count: 0, latest: undefined };
      entry.count += 1;
      if (course.addedAt && (!entry.latest || course.addedAt > entry.latest)) {
        entry.latest = course.addedAt;
      }
      byFile.set(name, entry);
    });

    const history: FileSummary[] = Array.from(byFile.entries()).map(([filename, info]) => ({
      filename,
      count: info.count,
      latest: info.latest,
    }));

    history.sort((a, b) => (b.latest || '').localeCompare(a.latest || ''));
    setFileHistory(history);
  };

  const clearAllData = async () => {
    if (!confirm('⚠️ Delete ALL courses from master database? This cannot be undone!')) return;

    try {
      setLoading(true);
      const response = await fetch('/api/v2/master-db/clear-all', {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        setMasterData([]);
        setFilteredData([]);
        setFileHistory([]);
        setSuccess(result.message || 'All courses deleted');
        setSidebarRefreshTrigger(prev => prev + 1);
      } else {
        setError(result.error || 'Failed to clear database');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear database');
    } finally {
      setLoading(false);
    }
  };

  const buildCourseKey = (course: MasterCourse) => {
    const normalize = (value?: string | number | null) => String(value || '').trim().toLowerCase();

    return [
      normalize(course.category),
      normalize(course.subCategory),
      normalize(course.programSubjectArea),
      normalize(course.courseCode),
      normalize(course.courseName),
      normalize(course.courseTitle),
      normalize(course.gradeLevel),
      normalize(course.courseLevel),
      normalize(course.courseDuration),
      normalize(course.courseTerm),
      normalize(course.gradReq),
      normalize(course.credit),
      normalize(course.certification),
      normalize(course.filename),
    ].join('::');
  };

  const buildKeySet = (courses: MasterCourse[]) =>
    new Set(courses.map((course) => buildCourseKey(course)));

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setSuccess(null);
      setPageRangeStart(1);
      setPageRangeEnd(0);
      setTotalPages(0);

      if (selectedFile.type === 'application/pdf') {
        try {
          if (!(window as any).pdfjsLib) {
            throw new Error('PDF.js library not loaded');
          }
          const arrayBuffer = await selectedFile.arrayBuffer();
          const pdf = await (window as any).pdfjsLib.getDocument(arrayBuffer).promise;
          setTotalPages(pdf.numPages || 0);
        } catch (err) {
          console.error('Failed to load PDF page count:', err);
        }
      }
    }
  };

  const handleDragDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError(null);
      setSuccess(null);
      setPageRangeStart(1);
      setPageRangeEnd(0);
      setTotalPages(0);

      if (droppedFile.type === 'application/pdf') {
        try {
          if (!(window as any).pdfjsLib) {
            throw new Error('PDF.js library not loaded');
          }
          const arrayBuffer = await droppedFile.arrayBuffer();
          const pdf = await (window as any).pdfjsLib.getDocument(arrayBuffer).promise;
          setTotalPages(pdf.numPages || 0);
        } catch (err) {
          console.error('Failed to load PDF page count:', err);
        }
      }
    }
  };

  const extractPdfText = async (pdfFile: File): Promise<string[]> => {
    if (!(window as any).pdfjsLib) {
      throw new Error('PDF.js library not loaded. Please refresh and try again.');
    }

    if (!(window as any).pdfjsLib.GlobalWorkerOptions?.workerSrc) {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await (window as any).pdfjsLib.getDocument(arrayBuffer).promise;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(' ');
      pageTexts.push(text);
    }

    return pageTexts;
  };

  const extractCoursesFromText = async (text: string): Promise<MasterCourse[]> => {
    if (!apiKeyId) {
      throw new Error('API key is required for course extraction');
    }

    const response = await fetch('/api/secure_extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        apiKeyId,
        filename: file?.name || 'master-import.pdf',
        extractionType: 'master_db',
      }),
    });

    if (response.status === 429) {
      const data = await response.json();
      setApiDebug(JSON.stringify(data).substring(0, 1000));
      setRateLimitModal({
        show: true,
        message: data.message || 'API rate limit reached',
        retryAfter: data.retryAfter || 60,
        suggestion: data.suggestion || 'Please wait and try again or switch API key.',
      });
      throw new Error('Rate limit reached');
    }

    if (!response.ok) {
      const errorText = await response.text();
      setApiDebug(errorText.substring(0, 1000));
      throw new Error(`API returned ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const result = await response.json();
    setApiDebug(null);

    // secure_extract now returns courses array directly, not Gemini response format
    if (!Array.isArray(result)) {
      setApiDebug(JSON.stringify(result).substring(0, 1000));
      throw new Error('API returned unexpected format (expected array)');
    }

    if (result.length === 0) {
      console.warn('[extractCoursesFromText] API returned empty array');
      return [];
    }

    return result.map((course: any) => ({
      category: course.Category || course.category || '-',
      subCategory: course.SubCategory || course.subCategory || '-',
      programSubjectArea:
        course.ProgramSubjectArea || course.programSubjectArea || course.Program || course.program || '-',
      courseCode: course.CourseCode || course.courseCode || '-',
      courseName:
        course.CourseName ||
        course.courseName ||
        course.CourseAbbrevTitle ||
        course.courseAbbrevTitle ||
        '-',
      courseTitle:
        course.CourseTitle ||
        course.courseTitle ||
        course.ProgramSubjectArea ||
        course.programSubjectArea ||
        '-',
      gradeLevel: course.GradeLevel || course.gradeLevel || '-',
      courseLevel: course.CourseLevel || course.courseLevel || '-',
      courseLength: course.CourseLength || course.courseLength || '-',
      levelLength: course.LevelLength || course.levelLength || '-',
      length: course.Length || course.length || '-',
      gradReq: course.GraduationRequirement || course.gradReq || '-',
      credit: course.Credit || course.credit || '-',
      certification: course.Certification || course.certification || '-',
      filename: file?.name || 'unknown',
    }));
  };

  const extractFromPdf = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setApiDebug(null);
    setExtractionProgress({
      isExtracting: true,
      pagesProcessed: 0,
      totalPages: 0,
      coursesFound: 0,
      currentBatch: 0,
    });

    try {
      const pageTexts = await extractPdfText(file);
      const totalPages = pageTexts.length;
      const safeStart = Math.max(1, pageRangeStart || 1);
      const safeEnd = pageRangeEnd && pageRangeEnd > 0 ? Math.min(pageRangeEnd, totalPages) : totalPages;

      if (safeStart > safeEnd) {
        throw new Error(`Invalid page range: start ${safeStart} is greater than end ${safeEnd}`);
      }

      const selectedPages = pageTexts.slice(safeStart - 1, safeEnd);
      setExtractionProgress((p) => ({ ...p, totalPages: selectedPages.length }));

      const PAGES_PER_BATCH = 5;
      let allExtractedCourses: MasterCourse[] = [];
      let totalSaved = 0;
      const existingKeys = buildKeySet(masterData);

      for (let batchIdx = 0; batchIdx < selectedPages.length; batchIdx += PAGES_PER_BATCH) {
        const batchEnd = Math.min(batchIdx + PAGES_PER_BATCH, selectedPages.length);
        const batchPages = selectedPages.slice(batchIdx, batchEnd);
        const batchText = batchPages.join('\n---PAGE BREAK---\n');

        setExtractionProgress((p) => ({
          ...p,
          pagesProcessed: batchEnd,
          currentBatch: Math.floor(batchIdx / PAGES_PER_BATCH) + 1,
        }));

        const batchCourses = await extractCoursesFromText(batchText);
        const batchUnique = batchCourses.filter((course) => {
          const key = buildCourseKey(course);
          if (existingKeys.has(key)) return false;
          existingKeys.add(key);
          return true;
        });

        allExtractedCourses = [...allExtractedCourses, ...batchUnique];

        if (autoSaveEnabled && batchUnique.length > 0) {
          const response = await fetch('/api/v2/master-db/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              courses: batchUnique,
            }),
          });

          const result = await response.json();
          if (!response.ok || !result.success) {
            throw new Error(result.message || 'Failed to save batch to master database');
          }

          totalSaved += result.count || batchUnique.length;
          setMasterData((prev) => [...prev, ...batchUnique]);
          setFilteredData((prev) => [...prev, ...batchUnique]);
        } else {
          setFilteredData((prev) => [...prev, ...batchUnique]);
        }

        setExtractionProgress((p) => ({
          ...p,
          coursesFound: allExtractedCourses.length,
        }));

        if (batchEnd < selectedPages.length) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }

      if (autoSaveEnabled) {
        setSuccess(
          `Extracted ${allExtractedCourses.length} courses from ${file.name}. Saved ${totalSaved} to master database.`
        );
        setSidebarRefreshTrigger(prev => prev + 1);
      } else {
        setSuccess(
          `Extracted ${allExtractedCourses.length} courses from ${file.name}. Preview only (not saved).`
        );
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg !== 'Rate limit reached') {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
      setExtractionProgress((p) => ({ ...p, isExtracting: false }));
    }
  };

  const saveToMasterDb = async () => {
    if (!file || filteredData.length === 0) {
      setError('No extracted data to save');
      return;
    }

    const existingKeys = buildKeySet(masterData);
    const newCourses = filteredData.filter((course) => !existingKeys.has(buildCourseKey(course)));

    if (newCourses.length === 0) {
      setError('No new courses to save (duplicates filtered)');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/v2/master-db/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          courses: newCourses,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setSuccess(`Saved ${result.count || newCourses.length} courses to master database`);
        setMasterData((prev) => [...prev, ...newCourses]);
        setFilteredData((prev) => [...prev, ...newCourses]);
        buildHistory([...masterData, ...newCourses]);
        setSidebarRefreshTrigger(prev => prev + 1);
      } else {
        setError(result.message || 'Failed to save data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save data');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'Category',
      'Sub-Category',
      'Program/Subject Area',
      'Course Code',
      'Course Name',
      'Course Title',
      'Grade Level/Graduation',
      'Course Level',
      'Course Length',
      'Requirements',
      'Credit',
      'Certification',
    ];

    const csv = '\uFEFF' + headers.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'master-database-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        strategy="beforeInteractive"
        onLoad={() => {
          if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          }
        }}
      />

      <Header />
      <div style={{ background: '#c69fe2', marginTop: '50px', borderRadius: '10px', padding: '10px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '28px 20px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: '16px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937' }}>Master Database</h1>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                  Import and manage your master course database from CSV/TSV files or extract courses from PDF files using AI
                </p>
              </div>

              <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', marginBottom: '16px' }}>Import Master Data</h2>

                {error && (
                  <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <AlertCircle size={16} /> {error}
                  </div>
                )}
                {success && (
                  <div style={{ background: '#ecfdf5', color: '#065f46', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <CheckCircle size={16} /> {success}
                  </div>
                )}
                {apiDebug && (
                  <div style={{ background: '#eef2ff', color: '#1e1b4b', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>API Debug Details</div>
                    <pre style={{ margin: 0, fontSize: '11px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{apiDebug}</pre>
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <ApiKeySelector value={apiKeyId} onChange={setApiKeyId} disabled={loading} showStats={true} />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                    Upload CSV/TSV or PDF File
                  </label>
                  <div
                    style={{ border: '2px dashed #d1d5db', borderRadius: '10px', padding: '28px', textAlign: 'center', background: '#f9fafb', cursor: 'pointer' }}
                    onDrop={handleDragDrop}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#1f2937', marginBottom: '6px' }}>
                      Drag & drop your file here or click to select
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      CSV/TSV format with headers: Category, Sub-Category, Program/Subject Area, Course Code, Course Name, Certification, etc.
                      <br />
                      OR PDF file to extract courses using AI (5 pages per API call)
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.tsv,.txt,.pdf"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                  </div>
                  {file && (
                    <div style={{ marginTop: '10px', padding: '10px 12px', background: '#ecfdf5', borderRadius: '6px', borderLeft: '3px solid #10b981', color: '#065f46', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>✓ {file.name}</span>
                      {file.type === 'application/pdf' && pageRangeStart > 0 && pageRangeEnd > 0 && (
                        <span style={{ fontSize: '11px', opacity: 0.8 }}>
                          {pageRangeStart === 1 && pageRangeEnd === 0 
                            ? `All ${totalPages} pages` 
                            : `Pages ${pageRangeStart}-${pageRangeEnd} of ${totalPages}`}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {file?.type === 'application/pdf' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                      PDF Page Range
                    </label>
                    {totalPages > 0 ? (
                      <select
                        value={`${pageRangeStart}-${pageRangeEnd}`}
                        onChange={(e) => {
                          const [start, end] = e.target.value.split('-').map(Number);
                          setPageRangeStart(start);
                          setPageRangeEnd(end);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          fontSize: '13px',
                          background: 'white',
                        }}
                      >
                        <option value={`1-0`}>All pages (1-{totalPages})</option>
                        {Array.from({ length: Math.ceil(totalPages / 5) }, (_, i) => {
                          const start = i * 5 + 1;
                          const end = Math.min((i + 1) * 5, totalPages);
                          return (
                            <option key={i} value={`${start}-${end}`}>
                              Pages {start}-{end}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Loading page count...
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
                      Select 5-page batches (same as Course Harvester).
                    </div>
                  </div>
                )}

                {extractionProgress.isExtracting && (
                  <div style={{ marginBottom: '16px', padding: '16px', background: '#f0f4f8', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <AlertCircle size={16} style={{ color: '#667eea' }} />
                      <span style={{ fontWeight: 600, color: '#1f2937' }}>Extracting Courses...</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.8' }}>
                      <div>📄 Pages Processed: {extractionProgress.pagesProcessed} / {extractionProgress.totalPages}</div>
                      <div>📚 Courses Found: {extractionProgress.coursesFound}</div>
                      <div>🔄 Current Batch: {extractionProgress.currentBatch}</div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    onClick={extractFromPdf}
                    disabled={loading || !file || (file.type === 'application/pdf' && !apiKeyId)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {loading ? 'Extracting...' : 'Extract Data'}
                  </button>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#4b5563' }}>
                    <input
                      type="checkbox"
                      checked={autoSaveEnabled}
                      onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                    />
                    Auto-save each batch
                  </label>
                  <button
                    onClick={saveToMasterDb}
                    disabled={loading || filteredData.length === 0}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      background: 'white',
                      color: '#374151',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Save to Master DB
                  </button>
                  <button
                    onClick={downloadTemplate}
                    type="button"
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      background: 'white',
                      color: '#374151',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Download size={14} /> Template
                  </button>
                  <button
                    onClick={clearAllData}
                    disabled={loading || masterData.length === 0}
                    type="button"
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: '1px solid #fecaca',
                      background: masterData.length === 0 ? '#f3f4f6' : '#fef2f2',
                      color: masterData.length === 0 ? '#9ca3af' : '#991b1b',
                      fontWeight: 600,
                      cursor: masterData.length === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Trash2 size={14} /> Clear All Data
                  </button>
                </div>
              </div>

              <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>Extracted Courses</h2>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>{filteredData.length} results</span>
                </div>

                {filteredData.length === 0 ? (
                  <div style={{ padding: '24px', color: '#9ca3af', textAlign: 'center' }}>
                    No extracted data yet. Run extraction to preview results.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f3f4f6' }}>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Category</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Sub-Category</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Program</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Code</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Course Name</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Title</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Grade</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Duration</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Term</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Requirements</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Credit</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Certification</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map((course, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '10px' }}>{course.category}</td>
                            <td style={{ padding: '10px' }}>{course.subCategory}</td>
                            <td style={{ padding: '10px' }}>{course.programSubjectArea}</td>
                            <td style={{ padding: '10px' }}>{course.courseCode}</td>
                            <td style={{ padding: '10px' }}>{course.courseName}</td>
                            <td style={{ padding: '10px' }}>{course.courseTitle}</td>
                            <td style={{ padding: '10px' }}>{course.gradeLevel || '-'}</td>
                            <td style={{ padding: '10px' }}>{course.courseDuration || '-'}</td>
                            <td style={{ padding: '10px' }}>{course.courseTerm || '-'}</td>
                            <td style={{ padding: '10px' }}>{course.gradReq || '-'}</td>
                            <td style={{ padding: '10px' }}>{course.credit || '-'}</td>
                            <td style={{ padding: '10px' }}>{course.certification || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {showSidebar && (
              <div style={{ width: '340px', height: 'calc(100vh - 140px)', position: 'sticky', top: '140px' }}>
                <MasterDatabaseSidebar
                  refreshTrigger={sidebarRefreshTrigger}
                  onRefresh={() => {
                    fetchMasterData();
                    setSidebarRefreshTrigger(prev => prev + 1);
                  }}
                  onClose={() => setShowSidebar(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {rateLimitModal?.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '420px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <AlertCircle size={18} style={{ color: '#ef4444' }} />
              <h3 style={{ margin: 0, fontSize: '18px', color: '#1f2937' }}>Rate Limit Reached</h3>
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>{rateLimitModal.message}</p>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>{rateLimitModal.suggestion}</p>
            <div style={{ fontSize: '12px', color: '#374151', marginBottom: '16px' }}>
              Retry after: {rateLimitModal.retryAfter} seconds
            </div>
            <button
              onClick={() => setRateLimitModal(null)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                background: '#ef4444',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
