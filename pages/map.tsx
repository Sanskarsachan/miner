import React, { useState, useRef, useEffect } from 'react';
import { Download, Trash2, Search, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import Script from 'next/script';
import Header from '@/components/Header';
import { SecondaryMappingComparisonView } from '@/components/SecondaryMappingComparison';

interface MasterCourse {
  _id?: string;
  category: string;
  subCategory: string;
  courseCode: string;
  courseName: string;
  courseTitle: string;
  levelLength: string;
  length: string;
  level: string;
  gradReq: string;
  credit: string;
  filename: string;
  addedAt?: string;
  [key: string]: any;
}

interface ExtractionProgress {
  pagesProcessed: number;
  totalPages: number;
  coursesFound: number;
  currentBatch: number;
}

export default function MapPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [masterData, setMasterData] = useState<MasterCourse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterField, setFilterField] = useState<string>('courseName');
  const [apiKey, setApiKey] = useState('');
  const [extractionProgress, setExtractionProgress] = useState<ExtractionProgress>({
    pagesProcessed: 0,
    totalPages: 0,
    coursesFound: 0,
    currentBatch: 0,
  });
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Secondary AI Mapping state
  const [showSecondaryMappingUI, setShowSecondaryMappingUI] = useState(false);
  const [secondaryMappingLoading, setSecondaryMappingLoading] = useState(false);
  const [selectedExtractionId, setSelectedExtractionId] = useState<string | null>(null);
  const [secondaryMappingResults, setSecondaryMappingResults] = useState<any>(null);
  const [showComparisonView, setShowComparisonView] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('geminiApiKey');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDragDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError(null);
    }
  };

  const parseCSV = (csvText: string): MasterCourse[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row');
    }

    const headers = lines[0].split('\t');
    const courses: MasterCourse[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t');
      if (values.length > 1) {
        const course: MasterCourse = {
          category: values[0]?.trim() || '-',
          subCategory: values[1]?.trim() || '-',
          courseCode: values[2]?.trim() || '-',
          courseName: values[3]?.trim() || '-',
          courseTitle: values[4]?.trim() || '-',
          levelLength: values[5]?.trim() || '-',
          length: values[6]?.trim() || '-',
          level: values[7]?.trim() || '-',
          gradReq: values[8]?.trim() || '-',
          credit: values[9]?.trim() || '-',
          filename: file?.name || 'unknown',
        };
        courses.push(course);
      }
    }

    return courses;
  };

  const extractPdfText = async (pdfFile: File): Promise<string[]> => {
    try {
      if (!(window as any).pdfjsLib) {
        throw new Error('PDF.js library not loaded. Please refresh the page and try again.');
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
    } catch (err) {
      throw new Error(`Failed to extract PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const extractCoursesFromText = async (text: string): Promise<MasterCourse[]> => {
    try {
      if (!apiKey) {
        throw new Error('API key is required for course extraction');
      }

      // Craft the Gemini API payload for course extraction
      const payload = {
        contents: [
          {
            parts: [
              {
                text: `Extract all courses from the following text. Return a JSON array of courses with these fields:
Category, SubCategory, CourseCode, CourseName, CourseTitle, LevelLength, Length, Level, GraduationRequirement, Credit

Text:
${text}

Return ONLY a valid JSON array, no other text. Example format:
[{"Category":"CS","SubCategory":"Programming","CourseCode":"101","CourseName":"Intro","CourseTitle":"Introduction to CS","LevelLength":"Semester","Length":"16 weeks","Level":"Undergraduate","GraduationRequirement":"No","Credit":"3"}]`,
              },
            ],
          },
        ],
      };

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: apiKey,
          payload: payload,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', { status: response.status, text: errorText });
        throw new Error(`API returned ${response.status}: ${errorText.substring(0, 200)}`);
      }

      const result = await response.json();
      console.log('API Response:', result);

      // Extract text from Gemini response
      let coursesText = '';
      if (result.candidates && result.candidates.length > 0) {
        const content = result.candidates[0].content;
        if (content && content.parts && content.parts.length > 0) {
          coursesText = content.parts[0].text || '';
        }
      }

      if (!coursesText) {
        console.error('No content in response. Full response:', result);
        throw new Error('No content returned from API');
      }

      // Parse JSON from response (handle markdown code blocks)
      let jsonStr = coursesText.trim();
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
      }

      console.log('Parsing JSON:', jsonStr.substring(0, 200));
      const parsedCourses = JSON.parse(jsonStr);
      const coursesArray = Array.isArray(parsedCourses) ? parsedCourses : [parsedCourses];

      console.log(`Extracted ${coursesArray.length} courses`);

      // Convert to MasterCourse format
      return coursesArray.map((course: any) => ({
        category: course.Category || course.category || '-',
        subCategory: course.SubCategory || course.subCategory || '-',
        courseCode: course.CourseCode || course.courseCode || '-',
        courseName: course.CourseName || course.courseName || '-',
        courseTitle: course.CourseTitle || course.courseTitle || '-',
        levelLength: course.LevelLength || course.levelLength || '-',
        length: course.Length || course.length || '-',
        level: course.Level || course.level || '-',
        gradReq: course.GraduationRequirement || course.gradReq || '-',
        credit: course.Credit || course.credit || '-',
        filename: file?.name || 'unknown',
      }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('extractCoursesFromText error:', errorMsg);
      throw new Error(`Course extraction failed: ${errorMsg}`);
    }
  };

  const uploadToDatabase = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    if (file.type === 'application/pdf' && !apiKey) {
      setError('Please enter your Gemini API Key to extract from PDFs');
      return;
    }

    setLoading(true);
    setIsExtracting(true);
    setError(null);
    setSuccess(false);
    setExtractionProgress({ pagesProcessed: 0, totalPages: 0, coursesFound: 0, currentBatch: 0 });

    try {
      let courses: MasterCourse[] = [];

      // Handle PDF files with intelligent batching (5 pages per request)
      if (file.type === 'application/pdf') {
        const pageTexts = await extractPdfText(file);
        setExtractionProgress((p) => ({ ...p, totalPages: pageTexts.length }));

        const PAGES_PER_BATCH = 5;
        let allExtractedCourses: MasterCourse[] = [];

        for (let batchIdx = 0; batchIdx < pageTexts.length; batchIdx += PAGES_PER_BATCH) {
          const batchEnd = Math.min(batchIdx + PAGES_PER_BATCH, pageTexts.length);
          const batchPages = pageTexts.slice(batchIdx, batchEnd);
          const batchText = batchPages.join('\n---PAGE BREAK---\n');

          // Update progress
          setExtractionProgress((p) => ({
            ...p,
            pagesProcessed: batchEnd,
            currentBatch: Math.floor(batchIdx / PAGES_PER_BATCH) + 1,
          }));

          try {
            const batchCourses = await extractCoursesFromText(batchText);
            allExtractedCourses = [...allExtractedCourses, ...batchCourses];

            setExtractionProgress((p) => ({
              ...p,
              coursesFound: allExtractedCourses.length,
            }));

            // Delay between batches to avoid rate limiting
            if (batchEnd < pageTexts.length) {
              await new Promise((resolve) => setTimeout(resolve, 1500));
            }
          } catch (batchErr) {
            const errorMsg = batchErr instanceof Error ? batchErr.message : String(batchErr);
            console.error(`Batch ${Math.floor(batchIdx / PAGES_PER_BATCH) + 1} extraction error:`, errorMsg);
            setError(`Batch ${Math.floor(batchIdx / PAGES_PER_BATCH) + 1} failed: ${errorMsg}`);
            // Continue with other batches even if one fails
          }
        }

        courses = allExtractedCourses;
      } else {
        // Handle CSV/TSV files
        const text = await file.text();
        courses = parseCSV(text);
      }

      if (courses.length === 0) {
        setError('No valid courses found in file');
        setLoading(false);
        setIsExtracting(false);
        return;
      }

      // Save to database
      const response = await fetch('/api/v2/master-db/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          courses: courses,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setSuccess(true);
        setFile(null);
        setMasterData([...masterData, ...courses]);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.message || 'Failed to import data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import data');
    } finally {
      setLoading(false);
      setIsExtracting(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const response = await fetch('/api/v2/master-db/list');
      const result = await response.json();
      if (result.success) {
        setMasterData(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch master data:', err);
    }
  };

  const exportCSV = () => {
    if (filteredData.length === 0) {
      setError('No data to export');
      return;
    }

    const headers = [
      'Category',
      'Sub-Category',
      'Course Code',
      'Course Name',
      'Course Title',
      'Level/Length',
      'Length',
      'Level',
      'Graduation Requirement',
      'Credit',
      'Filename',
    ];

    const rows = filteredData.map((course) => [
      course.category,
      course.subCategory,
      course.courseCode,
      course.courseName,
      course.courseTitle,
      course.levelLength,
      course.length,
      course.level,
      course.gradReq,
      course.credit,
      course.filename,
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'master-database.csv';
    a.click();
  };

  const deleteCourse = async (id: string | undefined) => {
    if (!id) return;

    try {
      const response = await fetch(`/api/v2/master-db/delete?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        setMasterData(masterData.filter((c) => c._id !== id));
      }
    } catch (err) {
      setError('Failed to delete course');
    }
  };

  /**
   * Trigger secondary AI mapping for an extraction
   * This is a safe, non-destructive workflow that:
   * - Does NOT modify primary mapping
   * - Stores results in courses[].secondaryMapping
   * - Allows side-by-side comparison
   */
  const triggerSecondaryAIMapping = async (extractionId: string) => {
    if (!apiKey) {
      setError('Gemini API key is required for AI mapping. Please enter it above and save.');
      return;
    }

    setSecondaryMappingLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/v2/ai-remap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': apiKey,
        },
        body: JSON.stringify({
          extractionId,
          dryRun: false,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to run AI mapping');
        setSecondaryMappingLoading(false);
        return;
      }

      // Store results and show comparison view
      setSecondaryMappingResults(result);
      setSelectedExtractionId(extractionId);
      setShowComparisonView(true);
      setSuccessMessage('✓ AI mapping completed! View the comparison below.');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`AI mapping error: ${errorMsg}`);
    } finally {
      setSecondaryMappingLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  const filteredData = masterData.filter((course) =>
    course[filterField]?.toString().toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <style jsx>{`
        .container {
          min-height: 100vh;
          background: #f8f9fa;
        }

        .content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 32px 20px;
        }

        .header {
          margin-bottom: 32px;
        }

        .title {
          font-size: 28px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 8px;
        }

        .subtitle {
          font-size: 14px;
          color: #6b7280;
        }

        .card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          margin-bottom: 24px;
        }

        .card-title {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 16px;
        }

        .input-group {
          margin-bottom: 16px;
        }

        .label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }

        input[type='text'],
        select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 13px;
        }

        input[type='text']:focus,
        select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .drop-zone {
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          padding: 32px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          background: #f9fafb;
        }

        .drop-zone:hover {
          border-color: #667eea;
          background: #f3f4f8;
        }

        .drop-zone.dragover {
          border-color: #667eea;
          background: #eff6ff;
        }

        .drop-text {
          font-size: 15px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 4px;
        }

        .drop-subtext {
          font-size: 12px;
          color: #6b7280;
        }

        .file-info {
          margin-top: 12px;
          padding: 10px 12px;
          background: #ecfdf5;
          border-radius: 6px;
          border-left: 2px solid #10b981;
          font-size: 12px;
          color: #065f46;
        }

        .button-group {
          display: flex;
          gap: 12px;
          margin-top: 16px;
        }

        button {
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          flex: 1;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .alert {
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
          display: flex;
          gap: 8px;
          align-items: center;
          font-size: 13px;
        }

        .alert-error {
          background: #fee2e2;
          color: #991b1b;
          border-left: 3px solid #dc2626;
        }

        .alert-success {
          background: #ecfdf5;
          color: #065f46;
          border-left: 3px solid #10b981;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .stat-box {
          background: #f0f4f8;
          padding: 12px;
          border-radius: 8px;
        }

        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
        }

        .stat-label {
          font-size: 11px;
          color: #6b7280;
          margin-top: 4px;
        }

        .search-section {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .search-input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 13px;
        }

        .filter-select {
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 13px;
        }

        .export-buttons {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .export-btn {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .export-btn:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        .table-container {
          overflow-x: auto;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .data-table th {
          background: #f3f4f6;
          padding: 10px 12px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
        }

        .data-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #e5e7eb;
          color: #4b5563;
        }

        .data-table tr:hover {
          background: #f9fafb;
        }

        .badge {
          display: inline-block;
          padding: 4px 8px;
          background: #f0fdf4;
          color: #15803d;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .empty-state {
          text-align: center;
          padding: 32px 20px;
          color: #9ca3af;
        }

        .delete-btn {
          padding: 4px 8px;
          background: #fee2e2;
          color: #991b1b;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
        }

        .delete-btn:hover {
          background: #fecaca;
        }
      `}</style>

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
      <div className="container">
        <div className="content">
          <div className="header">
            <h1 className="title">Master Database</h1>
            <p className="subtitle">Import and manage your master course database from CSV/TSV files or extract courses from PDF files using AI</p>
          </div>

          <div className="card">
            <h2 className="card-title">Import Master Data</h2>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">✓ Data imported successfully!</div>}
            {successMessage && <div className="alert alert-success">{successMessage}</div>}

            <div className="input-group">
              <label className="label">Gemini API Key (Required for PDF extraction)</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  localStorage.setItem('geminiApiKey', e.target.value);
                }}
                placeholder="Enter your Gemini API key from aistudio.google.com"
                style={{ marginBottom: '16px' }}
              />
            </div>

            <div className="input-group">
              <label className="label">Upload CSV/TSV or PDF File</label>
              <div
                className="drop-zone"
                onDrop={handleDragDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('dragover');
                }}
                onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="drop-text">Drag & drop your file here or click to select</div>
                <div className="drop-subtext">
                  CSV/TSV format with tab-separated headers: Category, Sub-Category, Course Code, Course Name, etc.
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
              {file && <div className="file-info">✓ {file.name}</div>}
            </div>

            {isExtracting && (
              <div style={{ marginBottom: '16px', padding: '16px', background: '#f0f4f8', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
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

            <div className="button-group">
              <button
                className="btn-primary"
                onClick={uploadToDatabase}
                disabled={loading || !file || (file.type === 'application/pdf' && !apiKey)}
              >
                {loading ? (file.type === 'application/pdf' ? 'Extracting & Importing...' : 'Importing...') : 'Import Data'}
              </button>
            </div>
          </div>

          {masterData.length > 0 && (
            <div className="card">
              <h2 className="card-title">Master Database Entries</h2>

              <div className="stats-grid">
                <div className="stat-box">
                  <div className="stat-value">{masterData.length}</div>
                  <div className="stat-label">Total Courses</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value">{new Set(masterData.map((c) => c.filename)).size}</div>
                  <div className="stat-label">Source Files</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value">{filteredData.length}</div>
                  <div className="stat-label">Filtered Results</div>
                </div>
              </div>

              <div className="search-section">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select
                  className="filter-select"
                  value={filterField}
                  onChange={(e) => setFilterField(e.target.value)}
                >
                  <option value="courseName">Course Name</option>
                  <option value="courseCode">Course Code</option>
                  <option value="category">Category</option>
                  <option value="filename">Filename</option>
                </select>
              </div>

              <div className="export-buttons">
                <button className="export-btn" onClick={exportCSV}>
                  <Download size={14} />
                  Export CSV
                </button>
              </div>

              {filteredData.length > 0 ? (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Sub-Category</th>
                        <th>Code</th>
                        <th>Course Name</th>
                        <th>Course Title</th>
                        <th>Level</th>
                        <th>Credit</th>
                        <th>Grad Req</th>
                        <th>File</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((course, idx) => (
                        <tr key={course._id || idx}>
                          <td>{course.category}</td>
                          <td>{course.subCategory}</td>
                          <td>
                            <span className="badge">{course.courseCode}</span>
                          </td>
                          <td>{course.courseName}</td>
                          <td>{course.courseTitle}</td>
                          <td>{course.level}</td>
                          <td>{course.credit}</td>
                          <td>{course.gradReq}</td>
                          <td style={{ fontSize: '11px', color: '#6b7280' }}>{course.filename}</td>
                          <td>
                            <button
                              className="delete-btn"
                              onClick={() => deleteCourse(course._id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <p>No courses match your search</p>
                </div>
              )}
            </div>
          )}

          {masterData.length === 0 && !loading && (
            <div className="card">
              <div className="empty-state">
                <p style={{ fontSize: '14px' }}>No data yet. Import a CSV/TSV file to get started.</p>
              </div>
            </div>
          )}

          {/* Secondary AI Mapping Feature Card */}
          <div className="card" style={{ borderLeft: '4px solid #10b981', background: '#f0fdf4' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Zap size={20} style={{ color: '#10b981' }} />
              <h2 className="card-title" style={{ margin: 0 }}>On-Demand AI Mapping (Secondary)</h2>
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
              Run Gemini-based AI cleaning and mapping on any extraction. Results are stored separately and don't affect primary mapping. 
              Perfect for comparing AI-first suggestions with your existing mapping logic.
            </p>

            {!showSecondaryMappingUI ? (
              <button
                className="btn-primary"
                onClick={() => setShowSecondaryMappingUI(true)}
                style={{ background: '#10b981', borderColor: '#10b981' }}
              >
                <Zap size={16} style={{ marginRight: '8px', display: 'inline' }} />
                Enable AI Mapping
              </button>
            ) : (
              <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: '#1f2937' }}>
                  Select an extraction to run AI mapping:
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
                  Note: You need to have extracted courses first. Use the "Extractions" page to view and select from your uploaded files.
                </p>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Enter extraction ID or paste from extractions page..."
                    value={selectedExtractionId || ''}
                    onChange={(e) => setSelectedExtractionId(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                  />
                  <button
                    className="btn-primary"
                    onClick={() => {
                      if (selectedExtractionId) {
                        triggerSecondaryAIMapping(selectedExtractionId);
                      }
                    }}
                    disabled={!selectedExtractionId || secondaryMappingLoading}
                    style={{
                      background: '#10b981',
                      borderColor: '#10b981',
                      opacity: !selectedExtractionId || secondaryMappingLoading ? 0.6 : 1,
                    }}
                  >
                    {secondaryMappingLoading ? '⏳ Running...' : '✨ Run AI Mapping'}
                  </button>
                  <button
                    onClick={() => {
                      setShowSecondaryMappingUI(false);
                      setSelectedExtractionId(null);
                    }}
                    style={{
                      padding: '10px 16px',
                      background: '#e5e7eb',
                      color: '#1f2937',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '13px',
                    }}
                  >
                    Close
                  </button>
                </div>

                {secondaryMappingResults && (
                  <div style={{ marginTop: '16px', padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#166534', marginBottom: '8px' }}>
                      ✓ AI Mapping Completed
                    </div>
                    <div style={{ fontSize: '12px', color: '#15803d', lineHeight: '1.6' }}>
                      <div>Total Courses: {secondaryMappingResults.stats?.totalCourses || 0}</div>
                      <div>Processed: {secondaryMappingResults.stats?.processed || 0}</div>
                      <div>High Confidence (≥85%): {secondaryMappingResults.stats?.highConfidence || 0}</div>
                      <button
                        onClick={() => setShowComparisonView(true)}
                        style={{
                          marginTop: '8px',
                          padding: '6px 12px',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        View Comparison →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comparison View Modal */}
          {showComparisonView && selectedExtractionId && secondaryMappingResults && (
            <SecondaryMappingComparisonView
              extractionId={selectedExtractionId}
              courses={secondaryMappingResults.results || []}
              onClose={() => setShowComparisonView(false)}
            />
          )}
        </div>
      </div>
    </>
  );
}
