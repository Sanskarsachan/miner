# 📚 Course Harvester - AI-Powered PDF Course Extraction System

> **Open Source** | MIT License | Production Ready | MongoDB + Gemini AI

**Last Updated**: February 6, 2026  
**Version**: 2.3.0  
**Status**: ✅ Production Ready with Master Database + Course Mapping Engine (Phase 3 Complete)

---

## 🎯 Project Overview

**Course Harvester** is a full-stack Next.js application that intelligently extracts structured course information from PDF documents using Google's Gemini AI. It features real-time progress tracking, MongoDB persistence, token analytics, intelligent batch processing, and a **comprehensive Master Database system with AI-powered course mapping**.

### 🌟 Key Capabilities

- 🤖 **AI-Powered Extraction** - Uses Gemini 2.5-flash for intelligent course detection
- 📚 **Master Database System** - Import courses from CSV/TSV or extract from PDFs with 5-page batching
- 🔗 **Intelligent Course Mapping** - 6-step deterministic→semantic→validation mapping engine
- 📊 **Real-time Analytics** - Track token usage, extraction efficiency, mapping success rates
- 💾 **MongoDB Persistence** - Save and retrieve extractions with full metadata
- 🎯 **Intelligent Batching** - Smart quota warnings and 5-page PDF batch processing
- 📈 **Live Progress Tracking** - Real-time page/course counts during extraction
- 🔄 **Deduplication Logic** - Removes duplicate courses while preserving data
- ✅ **Code Matching** - Direct and trimmed code comparison (60% success rate)
- 🧠 **AI Semantic Matching** - AI-powered keyword matching for complex course names
- 🚀 **Performance Optimized** - 30-40% faster with chunking and caching
- 📱 **Responsive UI** - Beautiful, color-coded interface with animations

---

## 🏗️ Architecture & Tech Stack

### Frontend
- **Framework**: Next.js 15.1.0 (React 18.3.1)
- **Language**: TypeScript 5.3.3 (strict mode)
- **Styling**: CSS-in-JS (styled components)
- **Icons**: Lucide React 0.563.0
- **PDF Processing**: PDF.js 3.11.174
- **Document Processing**: Mammoth 1.6.0 (DOCX)

### Backend
- **API**: Next.js API Routes (serverless functions)
- **Database**: MongoDB 7.0.0 (Atlas Cloud)
- **AI API**: Google Gemini 2.5-flash
- **Rate Limiting**: Custom implementation
- **Caching**: IndexedDB (DocumentCache)

### Database Schema

```typescript
// Extractions Collection
{
  _id: ObjectId,
  user_id: ObjectId,
  username: string,
  filename: string,
  
  courses: [{
    Category: string,
    CourseName: string,
    CourseCode: string,
    GradeLevel: string,
    Length: string,
    Prerequisite: string,
    Credit: string,
    Details: string,
    CourseDescription: string,
    SourceFile: string
  }],
  
  metadata: {
    file_size: number,
    file_type: string,
    total_pages: number,
    pages_processed: number
  },
  
  status: 'completed' | 'processing' | 'failed',
  created_at: Date,
  updated_at: Date
}

// Token Analytics Collection
{
  _id: ObjectId,
  extraction_id: ObjectId,
  user_id: ObjectId,
  username: string,
  filename: string,
  
  tokens_used: number,
  courses_extracted: number,
  total_pages: number,
  cost_per_course: number,
  api_used: string,
  
  created_at: Date
}

// Master Database Collection (NEW)
{
  _id: ObjectId,
  category: string,
  subCategory: string,
  courseCode: string,
  courseName: string,
  courseTitle: string,
  levelLength: string,
  length: string,
  level: string,
  gradReq: string,
  credit: string,
  filename: string,  // Source file name for tracking
  addedAt: Date,
  
  // Flexible field support
  [key: string]: any
}
```

---

## 📁 Project Structure

```
├── components/
│   ├── CourseHarvesterSidebar.tsx    # File list with actions (View/Download/Delete)
│   ├── ExtractionDetailCard.tsx      # Metadata display cards
│   ├── ExtractionDetailModal.tsx     # Full extraction view modal
│   ├── MappingDashboard.tsx          # Course refinement UI with stats - PHASE 3
│   ├── ReuploadModal.tsx             # File re-upload dialog
│   └── V2Sidebar.tsx                 # Alternative sidebar component
│
├── lib/
│   ├── ChunkProcessor.ts             # Smart PDF chunking + deduplication
│   ├── DocumentCache.ts              # IndexedDB caching layer
│   ├── db.ts                         # MongoDB connection manager
│   ├── extraction.service.ts         # CRUD operations service
│   ├── mapping-engine.ts             # 6-step course mapping system - PHASE 3
│   ├── normalize.ts                  # Data normalization utilities
│   └── types.ts                      # TypeScript interfaces
│
├── pages/
│   ├── index.tsx                     # Landing page
│   ├── courseharvester.tsx           # Phase 1: Main extraction UI (1,825 lines)
│   ├── tokens.tsx                    # Token analytics dashboard
│   ├── map.tsx                       # Phase 2: Master database UI (858 lines)
│   ├── refine/[id].tsx               # Phase 3: Course mapping refinement
│   │
│   ├── api/
│   │   ├── generate.ts               # Gemini chat API
│   │   ├── list_models.ts            # Available models
│   │   ├── secure_extract.ts         # Secure extraction endpoint
│   │   ├── upload_file.ts            # File upload handler
│   │   ├── upload_generate.ts        # Upload + extract
│   │   │
│   │   └── v2/
│   │       ├── analytics/
│   │       │   └── tokens.ts         # Token analytics API
│   │       │
│   │       ├── extractions/
│   │       │   ├── [id].ts           # GET/DELETE single extraction
│   │       │   ├── debug.ts          # Debug endpoint
│   │       │   ├── list.ts           # GET paginated list
│   │       │   ├── reupload.ts       # RE-upload file for extraction
│   │       │   └── save.ts           # POST save extraction
│   │       │
│   │       ├── master-db/            # Master Database APIs
│   │       │   ├── import.ts         # POST save courses to master DB
│   │       │   ├── list.ts           # GET all master database courses
│   │       │   ├── delete.ts         # DELETE course from master DB
│   │       │   ├── finalize.ts       # Finalize master DB
│   │       │   └── save-page.ts      # Save extracted page
│   │       │
│   │       └── refine-extractions.ts # PHASE 3: Deterministic→Semantic→Validation
│   │
│   └── v2/
│       ├── index.tsx                 # V2 redirect
│       └── extractions.tsx           # Extractions dashboard
│
├── public/                           # Static assets
├── .env.local                        # Environment variables (not in git)
├── next.config.js                    # Next.js configuration
├── tsconfig.json                     # TypeScript config
├── package.json                      # Dependencies
└── vercel.json                       # Vercel deployment config
```

---

## 🚀 Getting Started

### Prerequisites

1. **Node.js** 18+ and pnpm/npm
2. **MongoDB Atlas** account (free tier: https://www.mongodb.com/cloud/atlas)
3. **Gemini API Key** (free tier: https://aistudio.google.com/app/apikey)

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd Miner

# Install dependencies
pnpm install
# or
npm install

# Configure environment
cp .env.example .env.local
```

### Environment Configuration

Create `.env.local` file:

```env
# MongoDB Atlas connection string (NO quotes, NO spaces)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/

# Default user ID (for authentication placeholder)
DEFAULT_USER_ID=user_guest
```

⚠️ **Important**: Remove quotes and extra spaces from environment variables!

### Development

```bash
# Start dev server
npm run dev

# Open browser
http://localhost:3000/courseharvester
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

---

## 💡 Core Features & Usage

### 1. **Course Extraction**

#### Basic Workflow
1. Navigate to `/courseharvester`
2. Enter your Gemini API key (stored in localStorage)
3. Select PDF file
4. Choose page range:
   - **All pages** - Full extraction
   - **Pages 1-5** - Quick test batch
   - **Pages 5-10** - Second batch
   - **Pages 10-15** - Third batch
   - **Remaining pages** - Process rest
5. Click **Extract Courses**
6. Watch real-time progress

#### Smart Quota Warnings

The system shows color-coded warnings before extraction:

- **🟢 Green (Safe)**: Plenty of quota remaining
- **🟡 Yellow (Warning)**: Will use >70% of remaining tokens
- **🔴 Red (Exceeded)**: Extraction would exceed quota
  - Shows smart recommendations (e.g., "Process 5-10 pages instead")

#### Real-time Progress

During extraction you'll see:
- **Progress Bar**: Animated gradient bar
- **📚 Courses Found**: Updates as courses are discovered
- **📄 Pages Processed**: Current page / total pages
- **⏱️ Time Elapsed**: Running timer
- **⏰ Est. Time Remaining**: Calculated ETA

### 2. **Token Analytics Dashboard**

Visit `/tokens` to see:

#### Summary Metrics
- Total tokens used today
- Tokens remaining (free tier: 1M/day)
- Total courses extracted
- Average tokens per course
- Efficiency score

#### API Breakdown
- Tokens used per API (Gemini, Claude, etc.)
- Course count per API
- Cost efficiency comparison

#### Top Extractions
- Highest token usage files
- Most courses extracted files
- Efficiency leaders

### 3. **Master Database System** (NEW - `/map` page)

The Master Database provides a centralized repository for course reference data. This is the foundation for Phase 3 course mapping and standardization.

#### Import Methods

**CSV/TSV Files**
```
Upload CSV/TSV with tab-separated headers:
Category | Sub-Category | Course Code | Course Name | Course Title | 
Level/Length | Length | Level | Graduation Requirement | Credit | Filename
```
- No API key required
- Instant parsing and import
- Perfect for bulk data entry

**PDF Files** (NEW)
- Automatic text extraction using PDF.js
- Intelligent 5-page batching for cost optimization
- Real-time progress tracking
- Uses Gemini API for structured extraction
- Cost-effective: 80% fewer API calls than page-by-page processing

#### Batching Strategy for PDFs

```
Example: 20-page PDF
├─ Batch 1: Pages 1-5   (1 API call) → Extract courses
├─ Batch 2: Pages 6-10  (1 API call after 1.5s delay)
├─ Batch 3: Pages 11-15 (1 API call after 1.5s delay)
└─ Batch 4: Pages 16-20 (1 API call after 1.5s delay)

Total: 4 API calls instead of 20
Cost reduction: ~80% fewer API calls
```

#### Features
- **Search & Filter**: Find courses by name, code, category, or source file
- **Export**: Download master database as CSV
- **Delete**: Remove individual courses
- **Source Tracking**: All courses tagged with source filename
- **Real-time Progress**: Monitor extraction with page count and course count
- **Flexible Schema**: Supports additional custom fields

#### Workflow

1. Navigate to `/map`
2. For **PDF extraction**:
   - Enter your Gemini API key (or use saved one)
   - Select PDF file
   - Click "Import Data"
   - Watch real-time progress: 📄 Pages processed, 📚 Courses found, 🔄 Batch #
3. For **CSV/TSV import**:
   - Select CSV/TSV file (no API key needed)
   - Click "Import Data"
   - Instant parsing and storage
4. View results in searchable table
5. Export as CSV or delete courses as needed

### 4. **Saved Extractions**

#### Sidebar Features
- Toggle open/close with button (top-right)
- List all saved extractions
- Show metadata: file size, pages, date
- Actions per file:
  - **👁️ View** - Open detail modal
  - **⬇️ Download** - Export as CSV
  - **🗑️ Delete** - Remove from database

#### Recheck Feature
Use **🔄 Recheck 5 Pages** button to:
- Clear current results
- Reprocess first 5 pages
- Catch any missed courses
- Useful when data seems incomplete

---

## 🔧 Technical Deep Dive

### Intelligent Token Cost Estimation

```typescript
function estimateTokenCost(pages: number) {
  if (pages <= 5)  return { min: 400,  max: 600,   recommended: 500 }
  if (pages <= 10) return { min: 800,  max: 1100,  recommended: 950 }
  if (pages <= 20) return { min: 1500, max: 2200,  recommended: 1850 }
  if (pages <= 50) return { min: 3500, max: 5500,  recommended: 4500 }
  
  // For large PDFs, scale with diminishing returns
  const extraPages = pages - 50
  const base = 4500
  const extraTokens = extraPages * 90
  return {
    min: base + extraTokens - 500,
    max: base + extraTokens + 1000,
    recommended: base + extraTokens
  }
}
```

### ChunkProcessor Optimizations

**Performance Settings**:
```typescript
maxTokensPerChunk = 150000  // Increased from 100K for speed
retryDelay = 1500           // Reduced from 2000ms
chunkDelay = 500            // Between API calls
batchSize = 3               // Pages per batch
```

**Deduplication Logic**:
```typescript
// Removes duplicates based on normalized course name
// Logs: "Deduplication: 245 → 198 (removed 47 duplicates)"
private deduplicateCourses(courses: Course[]): Course[] {
  const seen = new Map<string, Course>()
  
  for (const course of courses) {
    const normalizedName = (course.CourseName || '')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim()
    
    const key = `${(course.Category || '').toLowerCase().trim()}|${normalizedName}|${(course.GradeLevel || '').toLowerCase().trim()}`
    
    if (!seen.has(key)) {
      seen.set(key, course)
    }
  }
  
  return Array.from(seen.values())
}
```

### Data Quality Handling

**Character Encoding Issues**:
- Uses UTF-8 recovery for garbled text
- Replaces `"N/A"` with `"-"` for cleaner display
- Handles null/undefined gracefully

**Error Recovery**:
- Continues processing on chunk errors
- Returns empty array instead of crashing
- Logs all issues to console for debugging

---

## 📊 Git Commit Analysis

### Recent Major Improvements (Last 20 Commits)

| Commit | Date | Type | Description | Impact |
|--------|------|------|-------------|--------|
| `91dd05b` | Jan 27 | perf | Optimize extraction speed | 30-40% faster |
| `940f399` | Jan 27 | feat | Add deduplication logging | Debug data loss |
| `ad073d2` | Jan 27 | fix | Real-time progress updates | Shows actual counts |
| `99109fe` | Jan 27 | fix | Fix API response structure | Sidebar loads properly |
| `c49af2a` | Jan 27 | feat | Enhanced progress UI | Beautiful cards & animations |
| `a5d4894` | Jan 26 | feat | Intelligent batch processing | Smart quota warnings |
| `ecf210f` | Jan 26 | fix | CSS variable syntax errors | 0 TypeScript errors |
| `c6f64df` | Jan 26 | feat | Real-time progress tracking | Live page/course counts |
| `d32d3bc` | Jan 26 | feat | Token analytics + data quality | `/tokens` dashboard |
| `0ab5958` | Jan 25 | merge | Integrate v2-database | MongoDB persistence |

### Recent Updates (February 6, 2026) - Phase 2: Master Database

| Commit | Date | Type | Description | Impact |
|--------|------|------|-------------|--------|
| NEW | Feb 6 | feat | Master Database page at `/map` | CSV/TSV/PDF import interface |
| NEW | Feb 6 | feat | PDF extraction with 5-page batching | 80% cost reduction |
| NEW | Feb 6 | feat | Real-time extraction progress UI | Shows pages, courses, batches |
| NEW | Feb 6 | feat | Master DB CRUD APIs | import, list, delete endpoints |
| NEW | Feb 6 | feat | API key management | localStorage persistence |
| NEW | Feb 6 | feat | CSV parsing and import | Instant data import |

### Feature Evolution Timeline

**Phase 1: Foundation** (Commits: bd1929d → d0bf7d8)
- MongoDB integration
- Database schema design
- Basic CRUD operations

**Phase 2: UI Components** (Commits: d4af347 → ccf506e)
- Sidebar with file list
- Detail cards and modals
- Export/delete functionality

**Phase 3: UX Polish** (Commits: 3ff4149 → bf1291f)
- Username support
- Toggle animations
- CSV downloads
- Sidebar width optimization

**Phase 4: Analytics** (Commits: d32d3bc → ecf210f)
- Token tracking
- Cost analysis
- Efficiency metrics
- API breakdown

**Phase 5: Performance** (Commits: c6f64df → 91dd05b)
- Real-time progress
- Smart batching
- Quota warnings
- Speed optimizations

---

## ⚡ Performance Metrics

### Current Performance

| Metric | Value | Benchmark |
|--------|-------|-----------|
| Bundle Size | 24.7 kB | ✅ Excellent |
| Build Time | ~4s | ✅ Fast |
| Extraction Speed | 30-40% faster | ✅ Optimized |
| PDF Batching Cost Reduction | 80% fewer API calls | ✅ Excellent |
| API Call Reduction | 60-70% (cache) | ✅ Efficient |
| TypeScript Errors | 0 | ✅ Clean |
| MongoDB Queries | <50ms | ✅ Fast |

### Optimization Techniques Applied

1. **Semantic Chunking** - Groups related content to reduce API calls
2. **IndexedDB Caching** - Stores processed pages locally
3. **Batch Processing** - Processes 3 pages at once (main extraction), 5 pages (master DB PDFs)
4. **PDF Batching** - 5-page batches reduce API costs by 80%
5. **Deduplication** - Removes redundant courses efficiently
6. **Lazy Loading** - Components load on demand
7. **Memoization** - Caches expensive calculations
8. **Rate Limiting** - 1.5s delay between batches prevents quota throttling

---

## 🐛 Known Issues & Solutions

### Data Quality Issues

**Problem**: Wrong characters, garbled text, encoding issues

**Solutions Implemented**:
```typescript
// 1. UTF-8 recovery
cleanCourseData(course) {
  // Fixes: â€™ → ', Ã© → é
  return {
    ...course,
    CourseName: fixUtf8(course.CourseName),
    CourseDescription: fixUtf8(course.CourseDescription)
  }
}

// 2. Use "-" instead of "N/A"
const value = course.Credit || "-"

// 3. Null handling
const description = course.CourseDescription ?? "-"
```

**Best Practices**:
- Always validate extracted data
- Check console logs for deduplication stats
- Use "Recheck 5 Pages" if data seems wrong
- Inspect raw Gemini response for debugging

### MongoDB Connection Issues

**Problem**: 503 error, "Failed to load extractions"

**Solution**:
```env
# ❌ WRONG (has quotes and spaces)
MONGODB_URI= "mongodb+srv://user:pass@cluster.mongodb.net/"

# ✅ CORRECT (no quotes, no spaces)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
```

### Progress Showing 0/0

**Problem**: Progress bar stuck at 0 courses, 0 pages

**Root Cause**: Progress state not updating during extraction

**Fix Applied** (commit ad073d2):
```typescript
// Now updates in real-time from ChunkProcessor callbacks
setExtractionProgress(prev => ({
  ...prev,
  pagesProcessed: progress.current,
  coursesFound: accumulatedCourses.length + coursesInChunk
}))
```

---

## 🎯 Next Steps & Roadmap

### Phase 2: Master Database (COMPLETED ✅)

- [x] **Master Database Page** - `/map` page with CSV/TSV/PDF import
- [x] **PDF Extraction** - Extract courses from PDFs with intelligent batching
- [x] **Real-time Progress** - Show pages processed, courses found, batch number
- [x] **API Key Management** - Store/retrieve Gemini API key from localStorage
- [x] **CRUD Operations** - Import, view, search, filter, export, delete courses
- [x] **Database Persistence** - MongoDB master_courses collection

### Phase 3: Course Mapping (NEXT PRIORITY)

- [ ] **Matching Algorithm** - Compare school extractions against master database
- [ ] **Similarity Scoring** - Name/code matching with confidence scores
- [ ] **Mapping UI** - Visual interface to review and confirm matches
- [ ] **Batch Mapping** - Apply matches to multiple extractions
- [ ] **Data Standardization** - Normalize extracted courses using master data

### Immediate Priorities (This Week)

- [ ] **Mapping Algorithm** - Build similarity matching for course names/codes
- [ ] **Mapping Dashboard** - Create `/mapping` page to view and confirm matches
- [ ] **Confidence Scores** - Show match confidence (0-100%)
- [ ] **Error Alerts** - Toast notifications for failures
- [ ] **Batch Operations** - Map multiple extractions at once

### Short-term Goals (This Month)

- [ ] **User Authentication** - Replace `user_guest` with real auth
- [ ] **Multi-file Upload** - Process multiple PDFs in queue
- [ ] **API Key Management** - Save multiple API keys per user
- [ ] **Scheduled Extractions** - Cron jobs for batch processing
- [ ] **Email Notifications** - Alert when extraction completes

### Long-term Vision (This Quarter)

- [ ] **Advanced Filters** - Search by any course field in master database
- [ ] **Field Mapping** - Customize which fields to extract
- [ ] **OCR Integration** - Process scanned PDFs
- [ ] **Multi-AI Support** - Claude, OpenAI, Mistral integration
- [ ] **Advanced Analytics** - Charts, trends, cost projections
- [ ] **API Webhooks** - External integrations
- [ ] **White-label Option** - Customizable branding
- [ ] **Mobile App** - React Native version

---

## 🚀 Performance Improvement Ideas

### 1. **Database Optimizations**

```typescript
// Add compound indexes
db.extractions.createIndex({ user_id: 1, created_at: -1, status: 1 })
db.token_analytics.createIndex({ user_id: 1, created_at: -1 })
db.master_courses.createIndex({ courseName: 1, courseCode: 1 })  // For mapping

// Use projection to reduce payload
db.extractions.find(
  { user_id },
  { courses: 0 } // Exclude large fields when listing
)

// Implement pagination cursor
const cursor = db.extractions.find().limit(10).skip(offset)
```

### 2. **Frontend Optimizations**

```typescript
// Use React.memo for expensive components
const CourseTable = React.memo(({ courses }) => { ... })

// Virtualize long lists
import { FixedSizeList } from 'react-window'

// Code splitting
const TokensPage = dynamic(() => import('./tokens'), { ssr: false })

// Optimize images
<Image src="..." width={100} height={100} loading="lazy" />
```

### 3. **API Optimizations**

```typescript
// Parallel processing
await Promise.all([
  processChunk(chunk1),
  processChunk(chunk2),
  processChunk(chunk3)
])

// Request deduplication
const cache = new Map()
function fetchWithCache(url) {
  if (cache.has(url)) return cache.get(url)
  const promise = fetch(url).then(r => r.json())
  cache.set(url, promise)
  return promise
}

// Rate limiting
import rateLimit from 'micro-ratelimit'
const limiter = rateLimit({ window: 60000, limit: 10 })
```

### 4. **Extraction Accuracy**

```typescript
// Better prompt engineering
const enhancedPrompt = `
Extract ALL courses from this document. Include:
- Official course name (required)
- Course code if available
- Prerequisites (use "-" if none)
- Credit hours (use "-" if not specified)
...
`

// Validation layer
function validateCourse(course) {
  if (!course.CourseName?.trim()) return null
  if (course.CourseName.length < 3) return null
  return course
}

// Multi-pass extraction
const firstPass = await extractCourses(text)
const secondPass = await extractMissed(text, firstPass)
const final = mergeCourses(firstPass, secondPass)
```

---

## 🔐 Security Best Practices

### Environment Variables

```bash
# Never commit .env.local
echo ".env.local" >> .gitignore

# Use different values per environment
MONGODB_URI_DEV=mongodb://localhost:27017
MONGODB_URI_PROD=mongodb+srv://...

# Rotate API keys regularly
GEMINI_API_KEY=...  # Change every 3 months
```

### API Security

```typescript
// Rate limiting
if (requestCount > MAX_REQUESTS_PER_HOUR) {
  return res.status(429).json({ error: 'Rate limit exceeded' })
}

// Input validation
if (!filename || filename.includes('..')) {
  return res.status(400).json({ error: 'Invalid filename' })
}

// Sanitize MongoDB queries
const query = { user_id: new ObjectId(sanitize(userId)) }
```

### User Authentication (TODO)

```typescript
// Use NextAuth.js
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    })
  ]
})

// Protect API routes
if (!session) {
  return res.status(401).json({ error: 'Unauthorized' })
}
```

---

## 📚 Best Practices & Guidelines

### Code Quality

1. **TypeScript Strict Mode** - All files fully typed
2. **ESLint** - Follow Next.js recommended rules
3. **Git Commits** - Conventional commit messages
   ```
   feat: add new feature
   fix: bug fix
   perf: performance improvement
   docs: documentation update
   style: formatting changes
   refactor: code restructuring
   test: add tests
   chore: maintenance tasks
   ```

### Data Handling

1. **Always validate** extracted data before saving
2. **Log deduplication** stats for debugging
3. **Use "-" for missing values**, not "N/A" or null
4. **Normalize text** before comparison (lowercase, trim, remove extra spaces)
5. **Handle encoding** issues with UTF-8 recovery

### Performance

1. **Batch operations** - Process multiple items together
2. **Cache aggressively** - Use IndexedDB and memoization
3. **Lazy load** - Components and routes on demand
4. **Optimize images** - Use Next.js Image component
5. **Monitor bundle size** - Keep under 100kB per route

### User Experience

1. **Show progress** - Real-time feedback during long operations
2. **Graceful errors** - Never crash, always show helpful messages
3. **Smart defaults** - Pre-fill common values
4. **Keyboard shortcuts** - Power user features
5. **Responsive design** - Mobile-first approach

---

## 🧪 Testing Checklist

### Before Deployment

- [ ] Run `npm run build` successfully
- [ ] Check for TypeScript errors: `npx tsc --noEmit`
- [ ] Test extraction with:
  - [ ] Small PDF (1-5 pages)
  - [ ] Medium PDF (10-20 pages)
  - [ ] Large PDF (50+ pages)
- [ ] Verify sidebar loads saved files
- [ ] Test CSV download
- [ ] Test delete functionality
- [ ] Check `/tokens` analytics page
- [ ] Verify MongoDB connection
- [ ] Test quota warnings
- [ ] Check console for errors
- [ ] Test mobile responsiveness

### User Acceptance Testing

1. **Happy Path**: Select PDF → Extract → View results → Download CSV → Success
2. **Edge Cases**: Large file, malformed PDF, network error, quota exceeded
3. **Data Quality**: Check for garbled characters, missing courses, duplicates
4. **Performance**: Measure extraction time, page load speed, API response time

---

## 📖 API Documentation

### POST /api/v2/extractions/save

Save an extraction to MongoDB.

**Request**:
```json
{
  "file_id": "abc123",
  "filename": "course_catalog.pdf",
  "courses": [...],
  "username": "user123",
  "metadata": {
    "file_size": 1024000,
    "file_type": "pdf",
    "total_pages": 50,
    "pages_processed": 50
  },
  "status": "completed",
  "tokens_used": 5000,
  "api_used": "gemini"
}
```

**Response**:
```json
{
  "success": true,
  "extraction_id": "6789abcd"
}
```

### GET /api/v2/extractions/list

List all extractions for a user.

**Query Params**:
- `limit` (default: 10) - Items per page
- `skip` (default: 0) - Items to skip

**Response**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 42,
    "limit": 10,
    "skip": 0,
    "pages": 5,
    "current_page": 1
  }
}
```

### GET /api/v2/analytics/tokens

Get token usage analytics.

**Response**:
```json
{
  "summary": {
    "total_tokens": 50000,
    "total_courses": 200,
    "total_pages": 150,
    "tokens_remaining": 950000
  },
  "efficiency": {
    "avg_tokens_per_course": 250,
    "avg_tokens_per_page": 333
  },
  "api_breakdown": [...],
  "top_by_tokens": [...],
  "top_by_courses": [...]
}
```

---

## 📚 Master Database API Documentation (NEW)

### POST /api/v2/master-db/import

Save courses to the master database from CSV/TSV or PDF extraction.

**Request**:
```json
{
  "filename": "course_catalog.pdf",
  "courses": [
    {
      "category": "Computer Science",
      "subCategory": "Programming",
      "courseCode": "CS101",
      "courseName": "Introduction to Programming",
      "courseTitle": "Intro to Programming",
      "levelLength": "Semester",
      "length": "16 weeks",
      "level": "Undergraduate",
      "gradReq": "Yes",
      "credit": "3",
      "filename": "course_catalog.pdf"
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "count": 45,
  "message": "Successfully imported 45 courses"
}
```

### GET /api/v2/master-db/list

Fetch all courses from the master database.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "category": "Computer Science",
      "subCategory": "Programming",
      "courseCode": "CS101",
      "courseName": "Introduction to Programming",
      "courseTitle": "Intro to Programming",
      "levelLength": "Semester",
      "length": "16 weeks",
      "level": "Undergraduate",
      "gradReq": "Yes",
      "credit": "3",
      "filename": "course_catalog.pdf",
      "addedAt": "2026-02-06T10:30:00Z"
    }
  ],
  "count": 142
}
```

### DELETE /api/v2/master-db/delete

Remove a course from the master database.

**Query Params**:
- `id` (required) - MongoDB ObjectId of the course to delete

**Example**:
```
DELETE /api/v2/master-db/delete?id=507f1f77bcf86cd799439011
```

**Response**:
```json
{
  "success": true,
  "message": "Course deleted successfully"
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Course not found"
}
```

---

## 🤝 Contributing

This is an open-source project! Contributions welcome.

### How to Contribute

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Contribution Guidelines

- Follow TypeScript strict mode
- Write meaningful commit messages
- Add comments for complex logic
- Update README for new features
- Test thoroughly before submitting

---

## 📄 License

**MIT License**

Copyright (c) 2026 Sanskar Sachan

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.

---

## 👨‍💻 Author

**Sanskar Sachan**
- GitHub: [@sanskarsachan](https://github.com/sanskarsachan)
- Project: Course Harvester
- Version: 2.1.0

---

## 🙏 Acknowledgments

- **Google Gemini** - AI extraction API
- **MongoDB Atlas** - Database hosting
- **Vercel** - Deployment platform
- **Next.js Team** - Amazing framework
- **Open Source Community** - Inspiration and libraries

---

## 📞 Support & Resources

- **Issues**: Use GitHub Issues for bug reports
- **Questions**: Open GitHub Discussions
- **Documentation**: See ISSUES_AND_FIXES.md for detailed troubleshooting
- **Master DB**: See PDF_EXTRACTION_IMPLEMENTATION.md for detailed technical details
- **Updates**: Check git log for latest changes

---

## 📚 Master Database System Summary

The Master Database system (completed February 6, 2026) provides:

✅ **CSV/TSV Import** - Instant parsing of tab-separated course data  
✅ **PDF Extraction** - AI-powered extraction with intelligent batching  
✅ **5-Page Batching** - 80% cost reduction vs page-by-page processing  
✅ **Real-time Progress** - Track extraction with pages, courses, batches  
✅ **CRUD Operations** - Create, read, update, delete course records  
✅ **Search & Filter** - Find courses by any field  
✅ **Export** - Download master database as CSV  
✅ **Source Tracking** - Maintain filename lineage for audit trails  

**Ready for Phase 3**: Course Mapping & Data Standardization

---

**⭐ Star this repo if you find it useful!**

**Last Updated**: February 6, 2026 | **Maintained by**: Sanskar Sachan
