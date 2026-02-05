# Master Database PDF Extraction Implementation ✅

## Summary

The `/map` page now supports **both CSV/TSV imports AND PDF extraction with intelligent batching**. Users can upload PDFs to automatically extract course data using Gemini AI, processing 5 pages per API request to optimize costs.

---

## What's New

### 🎯 Core Features

1. **Dual File Format Support**
   - CSV/TSV files: Parse tab-separated course data directly
   - PDF files: Extract text page-by-page, then use Gemini AI to extract structured courses

2. **Intelligent PDF Batching**
   - Processes PDFs in 5-page batches
   - One API call per batch reduces costs
   - Real-time progress tracking (pages processed, courses found, batch count)
   - 1.5-second delay between batches to avoid rate limiting

3. **Real-time Progress UI**
   - Shows current page being processed
   - Displays running count of courses found
   - Shows which batch is being processed
   - Animated progress indicator during extraction

4. **API Key Management**
   - Gemini API key input field (required for PDF extraction)
   - Stored in localStorage for convenience
   - Validated before PDF processing starts

---

## Technical Implementation

### File: [pages/map.tsx](pages/map.tsx) (858 lines)

**Key Functions:**

1. **extractPdfText(pdfFile)** - Extracts text from PDF pages
   - Uses PDF.js library loaded from CDN
   - Returns array of page text strings
   - Error handling for corrupted PDFs

2. **extractCoursesFromText(text)** - Calls Gemini API for course extraction
   - POST to `/api/generate` with page text
   - Converts response to MasterCourse format
   - Maps multiple field variations (CourseName/courseName, etc.)

3. **uploadToDatabase()** - Main orchestration function
   - Detects file type (PDF vs CSV/TSV)
   - For PDFs:
     - Extracts all pages with extractPdfText()
     - Processes in 5-page batches with extractCoursesFromText()
     - Updates progress state after each batch
     - Merges all extracted courses
   - For CSV/TSV:
     - Parses with parseCSV() function
   - Saves all courses to MongoDB via `/api/v2/master-db/import`

### State Management

```typescript
interface ExtractionProgress {
  pagesProcessed: number;    // Current page being processed
  totalPages: number;        // Total pages in PDF
  coursesFound: number;      // Running count of extracted courses
  currentBatch: number;      // Which batch (1, 2, 3, etc.)
}

// Additional state for extraction:
const [apiKey, setApiKey] = useState('');              // Gemini API key
const [isExtracting, setIsExtracting] = useState(false);
const [extractionProgress, setExtractionProgress] = useState<ExtractionProgress>(...)
```

### UI Components

**API Key Input**
```tsx
<input
  type="password"
  value={apiKey}
  onChange={(e) => {
    setApiKey(e.target.value);
    localStorage.setItem('geminiApiKey', e.target.value);
  }}
  placeholder="Enter your Gemini API key from aistudio.google.com"
/>
```

**File Upload (Updated to accept PDFs)**
```tsx
<input
  type="file"
  accept=".csv,.tsv,.txt,.pdf"  // ← Now includes PDF
  onChange={handleFileSelect}
/>
```

**Progress Display (During PDF Extraction)**
```tsx
{isExtracting && (
  <div style={{ ... }}>
    <div>📄 Pages Processed: {extractionProgress.pagesProcessed} / {extractionProgress.totalPages}</div>
    <div>📚 Courses Found: {extractionProgress.coursesFound}</div>
    <div>🔄 Current Batch: {extractionProgress.currentBatch}</div>
  </div>
)}
```

### PDF.js Integration

Added Next.js Script component to load PDF.js from CDN:

```tsx
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
```

---

## Batching Strategy

```
Example: 20-page PDF
├─ Batch 1: Pages 1-5   (1 API call)
├─ Batch 2: Pages 6-10  (1 API call after 1.5s delay)
├─ Batch 3: Pages 11-15 (1 API call after 1.5s delay)
└─ Batch 4: Pages 16-20 (1 API call after 1.5s delay)

Total: 4 API calls instead of 20
Cost reduction: ~80% fewer API calls
```

---

## Workflow

### For PDF Files:

1. User selects PDF file
2. Enters Gemini API key (or uses saved one)
3. Clicks "Import Data"
4. System:
   - Extracts all page text using PDF.js
   - Processes pages in 5-page batches
   - Shows real-time progress (📄 Page X/Y, 📚 Courses Found, 🔄 Batch N)
   - After each batch:
     - Calls Gemini API to extract structured course data
     - Waits 1.5 seconds before next batch
   - Combines all extracted courses
   - Saves to MongoDB via `/api/v2/master-db/import`
5. Displays results in table with search/filter/export

### For CSV/TSV Files:

1. User selects CSV/TSV file
2. Clicks "Import Data" (no API key needed)
3. System:
   - Parses tab-separated values
   - Maps to MasterCourse format
   - Saves to MongoDB immediately
4. Displays results in table

---

## Error Handling

- **Missing API Key**: Shows error "Please enter your Gemini API Key to extract from PDFs"
- **PDF Loading Error**: Throws error with specific message
- **API Call Failure**: Logs batch error but continues with remaining batches
- **Corrupted CSV**: Shows "CSV must have at least a header row"
- **Empty Results**: Shows "No valid courses found in file"

---

## Testing Checklist

- [ ] Upload small PDF (2-3 pages) to test batching
- [ ] Verify each batch extracts courses
- [ ] Check progress updates in real-time
- [ ] Verify courses saved to MongoDB
- [ ] Test search/filter on imported PDF courses
- [ ] Export imported PDF courses as CSV
- [ ] Delete individual courses
- [ ] Upload CSV file (should work without API key)
- [ ] Test with API key saved in localStorage
- [ ] Test API key update functionality

---

## Files Modified

1. **[pages/map.tsx](pages/map.tsx)** - Added PDF extraction with batching
   - New: extractPdfText(), extractCoursesFromText()
   - Updated: uploadToDatabase(), UI for API key and PDF support
   - Added: ExtractionProgress interface, progress state variables
   - Added: Script component for PDF.js loading

2. **[pages/api/v2/master-db/import.ts](pages/api/v2/master-db/import.ts)** - Already implemented ✅
3. **[pages/api/v2/master-db/list.ts](pages/api/v2/master-db/list.ts)** - Already implemented ✅
4. **[pages/api/v2/master-db/delete.ts](pages/api/v2/master-db/delete.ts)** - Already implemented ✅

---

## Next Steps (Phase 3)

Once master database is populated with PDF and CSV courses, Phase 3 will implement:

1. **Course Matching Algorithm** - Compare school extractions against master database
2. **Similarity Scoring** - Name/code matching with confidence scores
3. **Mapping UI** - Visual interface to review and confirm matches
4. **Batch Mapping** - Apply matches to multiple extractions

---

## Notes

- PDF extraction uses the same Gemini API credits as courseharvester
- Monitor your API quota when processing large PDFs
- 5-page batching significantly reduces costs while maintaining speed
- All extracted courses are stored with source filename for traceability
