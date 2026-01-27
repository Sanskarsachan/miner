# CourseHarvester V2 - Implementation Guide

## 🎯 Overview

This branch (`feature/v2-database`) contains the new database integration for persistent course storage and management. The main branch remains stable and functional.

---

## 📁 Branch Structure

```
main branch (current, stable)
├── Fully functional course extraction
├── Multiple API support (Gemini, Claude ready)
├── Dynamic usage tracking
├── Responsive UI
└── Production ready ✅

feature/v2-database branch (NEW, in development)
├── MongoDB integration
├── File/Extraction management
├── Version history
├── API logs tracking
├── Sidebar file list (coming soon)
└── Batch processing (coming soon)
```

---

## 🚀 Getting Started with V2

### Switch to V2 Branch
```bash
# Create local tracking branch
git checkout -b feature/v2-database origin/feature/v2-database

# Or switch if already created
git checkout feature/v2-database
```

### MongoDB Setup

#### Option 1: Local MongoDB (for development)
```bash
# Install MongoDB (Mac)
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Verify connection
mongosh
```

#### Option 2: MongoDB Atlas (cloud, recommended)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Get connection string
4. Add to `.env.local`:
```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
DEFAULT_USER_ID=user_guest
```

### Environment Variables
```bash
# Copy to .env.local
MONGODB_URI=your_mongodb_uri
DEFAULT_USER_ID=user_guest
NEXTAUTH_SECRET=your_secret_key # for future auth
```

### Install Dependencies
```bash
npm install mongodb
# or
pnpm add mongodb
```

### Initialize Database
```bash
npm run build
npm run dev
```

Visit: `http://localhost:3000/api/v2/health` to verify DB connection.

---

## 📡 New V2 API Endpoints

### 1. Save Extraction
```bash
POST /api/v2/extractions/save
Content-Type: application/json

{
  "file_id": "hash_of_file",
  "filename": "curriculum.pdf",
  "total_pages": 55,
  "extraction_time_ms": 12500,
  "api_used": "gemini",
  "tokens_used": 45000,
  "courses": [
    {
      "CourseName": "Biology 101",
      "CourseCode": "BIO101",
      "GradeLevel": "9-12",
      "Credit": "1.0",
      "CourseDescription": "...",
      "Details": "Lab included",
      "Category": "Science"
    }
  ]
}

Response:
{
  "success": true,
  "extraction_id": "60d5ec49c1234567890abcde",
  "total_courses": 94,
  "message": "Extraction saved successfully"
}
```

### 2. List Extractions
```bash
GET /api/v2/extractions/list?limit=10&skip=0

Response:
{
  "success": true,
  "data": [
    {
      "id": "60d5ec49c1234567890abcde",
      "filename": "curriculum.pdf",
      "total_courses": 94,
      "total_pages": 55,
      "api_used": "gemini",
      "status": "completed",
      "created_at": "2026-01-27T10:00:00Z",
      "is_refined": false,
      "current_version": 1
    }
  ],
  "pagination": {
    "limit": 10,
    "skip": 0,
    "total": 42,
    "pages": 5,
    "current_page": 1
  }
}
```

---

## 🔧 Next Steps (Implementation Order)

### Phase 1: Database Layer ✅ (DONE)
- [x] MongoDB connection module
- [x] Type definitions
- [x] Extraction service
- [x] Save endpoint
- [x] List endpoint
- [ ] Get extraction endpoint
- [ ] Delete endpoint

### Phase 2: UI Components (NEXT)
- [ ] Sidebar component showing all files
- [ ] File detail view
- [ ] Quick actions (download, delete, refine)
- [ ] Stats display per file
- [ ] Search & filter files

### Phase 3: Advanced Features
- [ ] Extraction detail page
- [ ] Version history viewer
- [ ] Manual refinement UI
- [ ] Export functionality
- [ ] Re-upload and merge

### Phase 4: Multi-API & Optimization
- [ ] Multi-API endpoint
- [ ] API router logic
- [ ] Quota management
- [ ] Batch processing
- [ ] Advanced analytics

---

## 📊 Database Collections

### users
```javascript
{
  _id: ObjectId,
  email: "user@example.com",
  api_keys: { gemini: "...", claude: "..." },
  daily_quota: { courses_used_today: 15, reset_date: ISODate },
  created_at: ISODate,
  updated_at: ISODate
}
```

### extractions
```javascript
{
  _id: ObjectId,
  file_id: "hash",
  user_id: ObjectId,
  filename: "curriculum.pdf",
  courses: [...],
  total_courses: 94,
  status: "completed",
  api_used: "gemini",
  tokens_used: 45000,
  current_version: 1,
  is_refined: false,
  created_at: ISODate,
  updated_at: ISODate
}
```

### versions
```javascript
{
  _id: ObjectId,
  extraction_id: ObjectId,
  version_number: 2,
  changes: { added: [...], modified: [...], removed: [...] },
  created_at: ISODate
}
```

### api_logs
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  extraction_id: ObjectId,
  api_used: "gemini",
  total_tokens: 53000,
  courses_extracted: 94,
  timestamp: ISODate
}
```

---

## 🔄 Development Workflow

### Working on V2 Branch
```bash
# Switch to v2
git checkout feature/v2-database

# Make changes
# ... edit files ...

# Commit changes
git add -A
git commit -m "feat: add extraction detail endpoint"

# Push to v2 branch
git push origin feature/v2-database
```

### Switching Back to Main
```bash
# Switch to main
git checkout main

# Build and test
npm run build
npm run dev

# Main branch stays production-ready
```

### Merging V2 to Main (When Ready)
```bash
# When v2 is complete and tested:
git checkout main
git pull origin main
git merge feature/v2-database
git push origin main
```

---

## 🧪 Testing V2 Features

### Test Save Extraction
```bash
curl -X POST http://localhost:3000/api/v2/extractions/save \
  -H "Content-Type: application/json" \
  -d '{
    "file_id": "test_hash_123",
    "filename": "test.pdf",
    "total_pages": 10,
    "extraction_time_ms": 5000,
    "api_used": "gemini",
    "tokens_used": 20000,
    "courses": [{
      "CourseName": "Test Course",
      "CourseCode": "TST101",
      "GradeLevel": "9-12",
      "Credit": "1.0",
      "CourseDescription": "Test description",
      "Category": "Test"
    }]
  }'
```

### Test List Extractions
```bash
curl http://localhost:3000/api/v2/extractions/list
```

---

## 📝 File Structure

```
lib/
├── db.ts                    # MongoDB connection
├── types.ts                 # TypeScript interfaces
├── extraction.service.ts    # Extraction operations
└── DocumentCache.ts         # Existing cache (unchanged)

pages/api/v2/
├── extractions/
│   ├── save.ts             # Save extraction
│   ├── list.ts             # List extractions
│   ├── [id]/get.ts         # Get single extraction
│   └── [id]/delete.ts      # Delete extraction
└── health.ts               # DB health check

components/
├── Sidebar.tsx             # File list sidebar (coming soon)
├── FileCard.tsx            # File detail card (coming soon)
└── VersionHistory.tsx      # Version viewer (coming soon)
```

---

## 🐛 Troubleshooting

### DB Connection Failed
- Check MONGODB_URI in .env.local
- Verify MongoDB is running (local) or accessible (cloud)
- Check IP whitelist in MongoDB Atlas

### Collections Not Created
- Run `npm run build` to trigger initialization
- Check MongoDB logs for errors
- Verify database permissions

### Type Errors
- Run `npm run build` to verify types
- Check import paths in .ts files

---

## 📚 Useful Commands

```bash
# Check current branch
git branch

# List all branches
git branch -a

# View v2 commits
git log feature/v2-database --oneline -10

# See changes in v2
git diff main feature/v2-database

# Reset v2 to main (if needed)
git reset --hard main

# Delete local v2 branch
git branch -D feature/v2-database
```

---

## 🚀 Progress Tracking

| Component | Status | Notes |
|-----------|--------|-------|
| DB Connection | ✅ Done | MongoDB initialized |
| Type Definitions | ✅ Done | All models defined |
| Extraction Service | ✅ Done | CRUD operations ready |
| Save Endpoint | ✅ Done | Tested and working |
| List Endpoint | ✅ Done | Pagination supported |
| Get Endpoint | ⏳ In Progress | Next to implement |
| Delete Endpoint | ⏳ Planned | After get |
| Sidebar Component | ⏳ Planned | UI for file list |
| Detail Page | ⏳ Planned | View extraction details |
| Export Functionality | ⏳ Planned | CSV/JSON/Excel |
| Refinement UI | ⏳ Planned | Manual editing |
| Multi-API Router | ⏳ Planned | Smart API selection |

---

## 💡 Key Points

✅ **Stability**: Main branch remains fully functional
✅ **Isolation**: V2 work doesn't affect production code
✅ **Flexibility**: Easy to switch between branches
✅ **Testing**: Can test v2 independently before merging
✅ **Git History**: Clean commits showing each feature
✅ **Collaboration**: Team can work on different features

---

**V2 Development starts here! 🎯**
