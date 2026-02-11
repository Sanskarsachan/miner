import React, { useState, useRef, useEffect } from 'react';
import { Download, Trash2, Search, AlertCircle, CheckCircle, Sparkles, RefreshCw } from 'lucide-react';
import Script from 'next/script';
import Header from '@/components/Header';
import ApiKeySelector from '@/components/ApiKeySelector';

interface MasterCourse {
  _id?: string;
  category: string;
  subCategory: string;
  programSubjectArea?: string;
  courseCode: string;
  courseName: string;
  courseTitle: string;
  levelLength: string;
  length: string;
  level: string;
  gradReq: string;
  credit: string;
  certification?: string;
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
  const [apiKeyId, setApiKeyId] = useState('');
  const [extractionProgress, setExtractionProgress] = useState<ExtractionProgress>({
    pagesProcessed: 0,
    totalPages: 0,
    coursesFound: 0,
    currentBatch: 0,
  });
  const [pageRangeStart, setPageRangeStart] = useState(1);
  const [pageRangeEnd, setPageRangeEnd] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showCleaningModal, setShowCleaningModal] = useState(false);
  const [cleaningProgress, setCleaningProgress] = useState(0);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleaningStats, setCleaningStats] = useState({ before: 0, after: 0, expanded: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Clean course name - remove special characters, extra spaces
   */
  const cleanCourseName = (name: string): string => {
    return name
      .replace(/[^\w\s\-&().,]/g, '') // Remove special chars except common ones
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  };

  /**
   * Expand course codes like "1001030/31/32/34" into separate courses
   * Example: "1001030/31/32/34" → ["1001030", "1001031", "1001032", "1001034"]
   */
  const expandCourseCode = (courseCode: string): string[] => {
    // Check if code contains slashes (e.g., "1001030/31/32/34")
    if (!courseCode.includes('/')) {
      return [courseCode.trim()];
    }

    const parts = courseCode.split('/').map(p => p.trim());
    if (parts.length === 0) return [courseCode];

    const basePart = parts[0];
    if (!/^\d+$/.test(basePart)) {
      // Not a numeric code, return as-is
      return [courseCode.trim()];
    }

    // Extract the base (all but last 2 digits)
    const basePrefix = basePart.slice(0, -2);
    const codes: string[] = [basePart];

    // Process remaining parts
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (/^\d{1,2}$/.test(part)) {
        // It's a suffix (like "31", "32")
        codes.push(basePrefix + part);
      } else if (/^\d+$/.test(part)) {
        // It's a full code
        codes.push(part);
      }
    }

    return codes;
  };

  /**
   * Clean and expand master data  
   * - Remove special characters from course names
   * - Expand course codes like "1001030/31/32/34"
   */
  const cleanAndExpandData = async () => {
    if (masterData.length === 0) {
      setError('No data to clean');
      return;
    }

    setShowCleaningModal(true);
    setIsCleaning(true);
    setCleaningProgress(0);
    setError(null);

    try {
      const statsBefore = masterData.length;
      const cleanedData: MasterCourse[] = [];
      
      for (let i = 0; i < masterData.length; i++) {
        const course = masterData[i];
        const expandedCodes = expandCourseCode(course.courseCode);

        // Create a course for each expanded code
        expandedCodes.forEach((code) => {
          cleanedData.push({
            ...course,
            courseCode: code,
            courseName: cleanCourseName(course.courseName),
            courseTitle: cleanCourseName(course.courseTitle),
          });
        });

        // Update progress
        setCleaningProgress(Math.round(((i + 1) / masterData.length) * 100));
        
        // Yield to UI
        if (i % 10 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }

      const statsAfter = cleanedData.length;
      const statsExpanded = statsAfter - statsBefore;
      setCleaningStats({ before: statsBefore, after: statsAfter, expanded: statsExpanded });

      // Update database with cleaned data
      const response = await fetch('/api/v2/master-db/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courses: cleanedData, replaceAll: true }),
      });

      const result = await response.json();
      if (result.success) {
        setSuccess(true);
        await fetchMasterData();
        setTimeout(() => {
          setShowCleaningModal(false);
          setIsCleaning(false);
        }, 2000);
      } else {
        setError(result.error || 'Cleaning failed');
        setIsCleaning(false);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Cleaning failed: ${errorMsg}`);
      setIsCleaning(false);
    } finally {
      setCleaningProgress(100);
    }
  };

  // Remove old localStorage API key loading - now using API key pool
  useEffect(() => {
    // Load master data on mount
    fetchMasterData();
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

    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter);
    const normalizeHeader = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim();
    const headerIndex = new Map(headers.map((h, idx) => [normalizeHeader(h), idx]));
    const getValue = (values: string[], keys: string[], fallbackIndex?: number) => {
      for (const key of keys) {
        const idx = headerIndex.get(normalizeHeader(key));
        if (idx !== undefined && values[idx] !== undefined) {
          return values[idx]?.trim() || '-';
        }
      }
      if (fallbackIndex !== undefined) {
        return values[fallbackIndex]?.trim() || '-';
      }
      return '-';
    };
    const courses: MasterCourse[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter);
      if (values.length > 1) {
        const course: MasterCourse = {
          category: getValue(values, ['Category'], 0),
          subCategory: getValue(values, ['Sub-Category', 'SubCategory'], 1),
          programSubjectArea: getValue(values, ['Program/Subject Area', 'Program Subject Area', 'Program']),
          courseCode: getValue(values, ['Course Code', 'CourseCode', 'Number'], 2),
          courseName: getValue(values, ['Course Name', 'CourseName', 'Course Abbreviated Title'], 3),
          courseTitle: getValue(values, ['Course Title', 'CourseTitle', 'Program/Course Title'], 4),
          levelLength: getValue(values, ['Level/Length', 'LevelLength', 'Course Level'], 5),
          length: getValue(values, ['Length', 'Course Length', 'Crse Length'], 6),
          level: getValue(values, ['Level'], 7),
          gradReq: getValue(values, ['Graduation Requirement', 'Graduation Requirements', 'Requirements'], 8),
          credit: getValue(values, ['Credit'], 9),
          certification: getValue(values, ['Certification'], 10),
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
      if (!apiKeyId) {
        throw new Error('API key is required for course extraction');
      }

      // Use secure_extract endpoint with API key pool
      const response = await fetch('/api/secure_extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          apiKeyId: apiKeyId,
          filename: file?.name || 'master-import.pdf',
          extractionType: 'master_db',
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
        levelLength: course.LevelLength || course.levelLength || '-',
        length: course.Length || course.length || course.CourseLength || course.courseLength || '-',
        level: course.CourseLevel || course.courseLevel || course.Level || course.level || '-',
        gradReq: course.GraduationRequirement || course.gradReq || '-',
        credit: course.Credit || course.credit || '-',
        certification: course.Certification || course.certification || '-',
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

    if (file.type === 'application/pdf' && !apiKeyId) {
      setError('Please select an API Key to extract from PDFs');
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

        for (let batchIdx = 0; batchIdx < selectedPages.length; batchIdx += PAGES_PER_BATCH) {
          const batchEnd = Math.min(batchIdx + PAGES_PER_BATCH, selectedPages.length);
          const batchPages = selectedPages.slice(batchIdx, batchEnd);
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
            if (batchEnd < selectedPages.length) {
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

  const downloadTemplate = () => {
    const headers = [
      'Category',
      'Sub-Category',
      'Program/Subject Area',
      'Course Code',
      'Course Name',
      'Course Title',
      'Level/Length',
      'Length',
      'Level',
      'Graduation Requirement',
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

  const exportCSV = () => {
    if (filteredData.length === 0) {
      setError('No data to export');
      return;
    }

    const headers = [
      'Category',
      'Sub-Category',
      'Program/Subject Area',
      'Course Code',
      'Course Name',
      'Course Title',
      'Level/Length',
      'Length',
      'Level',
      'Graduation Requirement',
      'Credit',
      'Certification',
      'Filename',
    ];

    const rows = filteredData.map((course) => [
      course.category,
      course.subCategory,
      course.programSubjectArea,
      course.courseCode,
      course.courseName,
      course.courseTitle,
      course.levelLength,
      course.length,
      course.level,
      course.gradReq,
      course.credit,
      course.certification,
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

        .btn-secondary {
          background: white;
          color: #4b5563;
          border: 1px solid #d1d5db;
          flex: 1;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #f3f4f6;
          border-color: #9ca3af;
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

            <div className="input-group">
              <label className="label">Gemini API Key (Required for PDF extraction)</label>
              <ApiKeySelector
                value={apiKeyId}
                onChange={setApiKeyId}
                disabled={loading}
                showStats={true}
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
              {file && <div className="file-info">✓ {file.name}</div>}
            </div>

            {file?.type === 'application/pdf' && (
              <div className="input-group">
                <label className="label">PDF Page Range (optional)</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="number"
                      min={1}
                      value={pageRangeStart}
                      onChange={(e) => setPageRangeStart(Number(e.target.value || 1))}
                      placeholder="Start page"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="number"
                      min={0}
                      value={pageRangeEnd}
                      onChange={(e) => setPageRangeEnd(Number(e.target.value || 0))}
                      placeholder="End page (0 = all)"
                    />
                  </div>
                </div>
                <div className="drop-subtext" style={{ marginTop: '8px' }}>
                  Use 1-based pages. Set End to 0 to process all pages.
                </div>
              </div>
            )}

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
                disabled={loading || !file || (file.type === 'application/pdf' && !apiKeyId)}
              >
                {loading ? (file.type === 'application/pdf' ? 'Extracting & Importing...' : 'Importing...') : 'Import Data'}
              </button>
              <button
                className="btn-secondary"
                onClick={downloadTemplate}
                type="button"
              >
                Download CSV Template
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
                  <option value="programSubjectArea">Program</option>
                  <option value="filename">Filename</option>
                </select>
              </div>

              <div className="export-buttons">
                <button className="export-btn" onClick={exportCSV}>
                  <Download size={14} />
                  Export CSV
                </button>
                <button 
                  className="export-btn" 
                  onClick={cleanAndExpandData}
                  disabled={isCleaning || masterData.length === 0}
                  style={{ 
                    background: isCleaning ? '#e0e7ff' : 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: 'white',
                    borderColor: 'transparent'
                  }}
                >
                  <Sparkles size={14} />
                  {isCleaning ? 'Cleaning...' : 'Clean Data'}
                </button>
              </div>

              {filteredData.length > 0 ? (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Sub-Category</th>
                        <th>Program</th>
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
                          <td>{course.programSubjectArea}</td>
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
        </div>
      </div>

      {/* Cleaning Progress Modal */}
      {showCleaningModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
            }}>
              <Sparkles size={24} style={{ color: '#667eea' }} />
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                {cleaningProgress === 100 && !isCleaning ? 'Cleaning Complete!' : 'Cleaning Data...'}
              </h2>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{
                background: '#f3f4f6',
                borderRadius: '8px',
                height: '8px',
                overflow: 'hidden',
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  height: '100%',
                  width: `${cleaningProgress}%`,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <div style={{
                marginTop: '8px',
                fontSize: '13px',
                color: '#6b7280',
                textAlign: 'center',
              }}>
                {cleaningProgress}% Complete
              </div>
            </div>

            {cleaningProgress === 100 && !isCleaning && (
              <div style={{
                padding: '16px',
                background: '#ecfdf5',
                borderRadius: '8px',
                borderLeft: '3px solid #10b981',
                marginTop: '16px',
              }}>
                <div style={{ fontSize: '14px', color: '#065f46', lineHeight: '1.6' }}>
                  <div><strong>Before:</strong> {cleaningStats.before} courses</div>
                  <div><strong>After:</strong> {cleaningStats.after} courses</div>
                  <div><strong>Expanded:</strong> {cleaningStats.expanded} new courses</div>
                </div>
              </div>
            )}

            {isCleaning && (
              <div style={{
                fontSize: '13px',
                color: '#6b7280',
                textAlign: 'center',
                fontStyle: 'italic',
              }}>
                Removing special characters and expanding course codes...
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
