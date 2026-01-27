# Course Harvester - AI-Powered PDF Course Extraction

**Latest Update**: January 27, 2026  
**Current Status**: Production Ready (main) + V2 Development (feature/v2-database)  
**Active Branches**: `main` (stable), `feature/v2-database` (in development)

---

## 📌 Overview

**Course Harvester** is a full-stack web application that extracts structured course information from PDF documents using AI (Gemini 2.5 Flash). Features include intelligent PDF chunking, real-time progress tracking, MongoDB persistence (V2), and a responsive dashboard.

### What It Does
1. **Extracts courses from PDFs** - Detects course name, code, description, grade level, credits, etc.
2. **Tracks API usage** - Shows tokens/requests used, free tier quotas, and per-page progress
3. **Saves to database** - V2 stores extractions in MongoDB for later retrieval
4. **Provides dashboard** - V2 shows file list, metadata, export/delete options
5. **Handles errors gracefully** - Falls back to empty results instead of crashing

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier available)
- Google Gemini API key (free)

### Setup
```bash
cd /Users/sanskarsachan/Documents/Miner

# Install dependencies
pnpm install

# Configure environment
cat > .env.local << EOF
MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/"
DEFAULT_USER_ID=user_guest
EOF

# Start development
npm run dev
```

### Use Production (main)
```bash
git checkout main
npm run dev
# Open: http://localhost:3000/courseharvester
```

### Use V2 Development (feature/v2-database)
```bash
git checkout feature/v2-database
npm run dev
# Open: http://localhost:3000/v2/extractions
```

---

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15.5, React 18.3, TypeScript 5.3, Tailwind CSS
- **Backend**: Next.js API Routes (Node.js serverless)
- **Database**: MongoDB Atlas (cloud)
- **PDF Processing**: PDF.js 3.11.174
- **AI API**: Google Gemini 2.5-flash
- **Client Cache**: IndexedDB (60-70% API reduction)
- **Icons**: Lucide React 0.563

### Folder Structure
```
components/
  ├─ V2Sidebar.tsx              # File list sidebar (V2)
  ├─ ExtractionDetailCard.tsx   # Metadata display (V2)
  
lib/
  ├─ db.ts                      # MongoDB setup
  ├─ extraction.service.ts      # CRUD operations
  ├─ types.ts                   # TypeScript interfaces
  ├─ ChunkProcessor.ts          # PDF semantic chunking
  ├─ DocumentCache.ts           # IndexedDB caching
  
pages/
  ├─ courseharvester.tsx        # Main extraction UI
  ├─ index.tsx                  # Landing page
  ├─ api/
  │  ├─ secure_extract.ts       # Gemini extraction
  │  ├─ generate.ts             # Chat API
  │  └─ v2/
  │     └─ extractions/
  │        ├─ save.ts           # POST save to DB
  │        ├─ list.ts           # GET paginated list
  │        └─ [id].ts           # GET/DELETE single
  └─ v2/
     ├─ index.tsx               # Redirect
     └─ extractions.tsx         # Dashboard
```

---

## 💾 Database Schema

### Extraction Collection
```typescript
{
  _id: ObjectId
  file_id: string              // MD5 hash for dedup
  user_id: ObjectId            // Owner ID
  
  // File Info
  filename: string
  file_size: number
  file_type: string            // 'pdf', 'docx', etc.
  upload_date: Date
  
  // Extracted Data
  courses: {
    name: string
    code: string
    grade_level: string
    credits: string
    description: string
    details: string
    category: string
    confidence_score: number
    extracted_by_api: string
  }[]
  
  // Metadata
  total_courses: number
  total_pages: number
  extraction_time_ms: number
  api_used: string             // 'gemini', 'claude', etc.
  tokens_used: number
  
  // Status
  status: 'processing' | 'completed' | 'failed'
  current_version: number
  is_refined: boolean
  
  // Timestamps
  created_at: Date
  updated_at: Date
}
```

### Indexes
- `file_id + user_id` - Prevent duplicate extractions
- `user_id + created_at` - Fast user file list queries
- `created_at` - Sorting by newest first

---

## 🔧 Core Features

### Production (main branch)
| Feature | Status | Details |
|---------|--------|---------|
| Extract from PDFs | ✅ | Full text, no truncation |
| Batch Processing | ✅ | 3 pages at a time |
| Token Tracking | ✅ | Real-time display |
| Caching | ✅ | IndexedDB reduces API by 60-70% |
| Responsive UI | ✅ | Mobile-first flexbox design |
| Error Handling | ✅ | Returns [] instead of 500 errors |
| Dynamic Stats | ✅ | Updates during extraction |

### V2 Development (feature/v2-database)
| Feature | Status | Details |
|---------|--------|---------|
| MongoDB Integration | ✅ | Persistent storage |
| File List Dashboard | ✅ | Sidebar with sidebar/detail view |
| File Metadata | ✅ | Display all extraction info |
| Delete Files | ✅ | Remove from database |
| Download (Placeholder) | ✅ | CSV/JSON/Excel buttons (Phase 3) |
| API CRUD Endpoints | ✅ | Complete data operations |
| Type Safety | ✅ | Full TypeScript |

---

## 📡 API Endpoints

### Extraction (Main)
```
POST /api/secure_extract
  Input: { text: string, model: 'gemini' }
  Output: { courses: Course[] }
```

### Save Extraction (V2)
```
POST /api/v2/extractions/save
  Input: {
    file_id, filename, courses[], total_pages,
    tokens_used, api_used
  }
  Output: { success, extraction_id }
```

### List Extractions (V2)
```
GET /api/v2/extractions/list?limit=10&skip=0
  Output: {
    success,
    data: Extraction[],
    pagination: { total, limit, skip }
  }
```

### Get Single (V2)
```
GET /api/v2/extractions/[id]
  Output: { success, data: Extraction }
```

### Delete (V2)
```
DELETE /api/v2/extractions/[id]
  Output: { success, message }
```

---

## 🧪 Testing

### Extract Courses (main)
1. `http://localhost:3000/courseharvester`
2. Select PDF file
3. Set page limit (0 = all, 3 = quick test)
4. Click "Extract Courses"
5. Watch progress, view results

### View Extractions (v2)
1. Extract a PDF (auto-saves to MongoDB)
2. `http://localhost:3000/v2/extractions`
3. Click file in sidebar
4. View metadata and statistics
5. Delete or refresh list

### API Testing
```bash
# List all extractions
curl http://localhost:3000/api/v2/extractions/list

# Get single extraction
curl http://localhost:3000/api/v2/extractions/{id}

# Delete extraction
curl -X DELETE http://localhost:3000/api/v2/extractions/{id}
```

---

## 🚀 Deployment

### Build
```bash
npm run build
# Check for errors and bundle size
```

### Run Production
```bash
npm start
# Starts on port 3000
```

### Deploy to Vercel
```bash
git push origin main
# Auto-deploys from GitHub
```

---

## 📊 Current Status

### Branch: main ✅ STABLE
- **Latest Commit**: 97eb5a4 - Dynamic stats & responsive layout
- **Bundle Size**: 15.4 kB (excellent)
- **Production Ready**: Yes
- **Features**: Full extraction, caching, responsive UI

### Branch: feature/v2-database ✅ PHASE 2 COMPLETE
- **Latest Commit**: 96566ae - Phase 2 UI + testing guide
- **Components**: V2Sidebar, ExtractionDetailCard, Dashboard
- **APIs**: Save, list, delete endpoints
- **Status**: Ready for Phase 3 polish

---

## 📚 File References

| File | Purpose | Lines |
|------|---------|-------|
| `pages/courseharvester.tsx` | Main extraction UI | 1,483 |
| `lib/extraction.service.ts` | Database CRUD | 236 |
| `lib/db.ts` | MongoDB setup | 150 |
| `components/V2Sidebar.tsx` | File list (V2) | 290 |
| `components/ExtractionDetailCard.tsx` | Details card (V2) | 350 |
| `pages/v2/extractions.tsx` | V2 dashboard | 200 |

---

## 🔒 Security

- ✅ Environment variables for secrets
- ✅ Server-side API keys only
- ✅ Input validation on all endpoints
- ✅ MongoDB Atlas connection (encrypted)
- ✅ No sensitive data in frontend
- ⏳ User authentication (Phase 4)
- ⏳ Rate limiting (Phase 4)

---

## 📈 Performance

| Metric | Value |
|--------|-------|
| Bundle Size | 15.4 kB |
| API Reduction | 60-70% (caching) |
| Batch Size | 3 pages per call |
| Build Time | ~4 seconds |
| Dev Server Start | ~2.4 seconds |

---

## 🗺️ Roadmap

✅ **Phase 1**: Database foundation (complete)  
✅ **Phase 2**: UI components (complete)  
🚧 **Phase 3**: Export & polish (in progress)  
📅 **Phase 4**: Multi-API & auth (planned)  
📅 **Phase 5**: Optimization (planned)

---

## 🤔 Common Tasks

```bash
# Switch to main (production)
git checkout main
npm run dev

# Switch to v2 (development)
git checkout feature/v2-database
npm run dev

# Build for production
npm run build

# Run production build locally
npm start

# Clear cache and rebuild
rm -rf .next
npm run build

# Check TypeScript
npx tsc --noEmit

# View git branches
git branch -v

# View recent commits
git log --oneline -10
```

---

## ⚠️ Known Limitations

- **Free tier**: 20 API calls/day limit (use semantic chunking)
- **Large PDFs**: Automatically chunked (increases token usage)
- **Scanned PDFs**: Require OCR (not included)
- **Export**: Placeholder in Phase 2, full implementation Phase 3

---

## 📞 Support

See **ISSUES_AND_FIXES.md** for:
- Issue tracking by commit
- Bugs and resolutions
- Development rules and standards
- Technical debt tracking

---

## 📝 License

MIT License - Open source and free to use

---

**Maintained by**: Sanskar Sachan  
**Last Updated**: January 27, 2026  
**Repository**: Local Git + GitHub sync
