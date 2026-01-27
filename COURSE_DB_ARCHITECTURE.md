# Course Database Management System - Architecture Plan

## 🎯 Project Overview

A **free-tier course extraction and database system** allowing teams to:
- Extract courses from PDFs using multiple AI APIs
- Store extracted data per user/team
- Manage, refine, and version course data
- Download in multiple formats (CSV, JSON, Excel)
- Re-upload and improve extracted data
- Track extraction history and statistics

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐        ┌──────────────────────────┐  │
│  │   Main Dashboard     │        │   Sidebar (File List)    │  │
│  │  - Course Extractor  │        │  - My Extractions       │  │
│  │  - Upload Area       │        │  - File Stats           │  │
│  │  - Live Progress     │        │  - Quick Actions        │  │
│  └──────────────────────┘        │  - Version History      │  │
│                                  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                     API Routes (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ /api/extract │  │ /api/files   │  │ /api/multi-extract   │ │
│  │ (Single API) │  │ (CRUD ops)   │  │ (Multi-API router)   │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ /api/refine  │  │ /api/export  │  │ /api/auth (future)   │ │
│  │ (Edit data)  │  │ (Download)   │  │ (User management)    │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Database Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ MongoDB Collections:                                      │  │
│  │ - users (email, api_keys, daily_quota)                   │  │
│  │ - extractions (file_id, user_id, courses, metadata)      │  │
│  │ - versions (extraction_id, version_num, changes)         │  │
│  │ - api_logs (api_used, tokens, timestamp, user_id)        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│               External AI APIs                                  │
├─────────────────────────────────────────────────────────────────┤
│  API 1: Gemini 2.5-flash (primary, free tier)                  │
│  API 2: Claude 3.5-sonnet (secondary, better accuracy)         │
│  API 3: GPT-4 (premium, fallback)                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### Collections

#### 1. **users**
```javascript
{
  _id: ObjectId,
  email: "user@example.com",
  password: "hashed",
  username: "john_doe",
  organization: "Acme School",
  
  // API Keys & Settings
  api_keys: {
    gemini: "AIzaSy...",
    claude: "sk-ant-...",
    openai: "sk-..."
  },
  
  // Daily Quotas
  daily_quota: {
    courses_extracted: 20,
    courses_used_today: 15,
    reset_date: "2026-01-28T00:00:00Z"
  },
  
  // Preferences
  preferred_api: "gemini", // or "claude", "openai"
  export_formats: ["csv", "json", "xlsx"],
  auto_refine: true,
  
  created_at: "2026-01-27T10:00:00Z",
  updated_at: "2026-01-27T15:30:00Z"
}
```

#### 2. **extractions**
```javascript
{
  _id: ObjectId,
  file_id: "hash_of_file",
  user_id: ObjectId,
  
  // File Info
  filename: "curriculum.pdf",
  file_size: 5242880,
  file_type: "pdf",
  upload_date: "2026-01-27T10:00:00Z",
  
  // Extraction Data
  courses: [
    {
      course_id: ObjectId,
      name: "Biology 101",
      code: "BIO101",
      grade_level: "9-12",
      credits: "1.0",
      description: "...",
      details: "Lab included",
      category: "Science",
      confidence_score: 0.95,
      extracted_by_api: "gemini"
    }
  ],
  
  // Metadata
  total_courses: 94,
  total_pages: 55,
  extraction_time_ms: 12500,
  api_used: "gemini",
  tokens_used: 45000,
  
  // Status
  status: "completed", // "processing", "completed", "failed"
  error_message: null,
  
  // Versioning
  current_version: 2,
  is_refined: true,
  last_refined_at: "2026-01-27T12:00:00Z",
  
  created_at: "2026-01-27T10:00:00Z",
  updated_at: "2026-01-27T12:00:00Z"
}
```

#### 3. **versions**
```javascript
{
  _id: ObjectId,
  extraction_id: ObjectId,
  user_id: ObjectId,
  
  version_number: 2,
  
  // Changes Made
  changes: {
    added: [
      {
        course_id: ObjectId,
        name: "New Course",
        reason: "Manually added"
      }
    ],
    modified: [
      {
        course_id: ObjectId,
        field: "credits",
        old_value: "1.0",
        new_value: "0.5"
      }
    ],
    removed: [
      {
        course_id: ObjectId,
        name: "Removed Course",
        reason: "Duplicate"
      }
    ]
  },
  
  total_courses: 95,
  refined_by: "manual", // "manual", "ai_suggestion", "user_input"
  notes: "Added missing AP courses",
  
  created_at: "2026-01-27T12:00:00Z",
  parent_version: 1
}
```

#### 4. **api_logs**
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  extraction_id: ObjectId,
  
  api_used: "gemini",
  request_tokens: 45000,
  response_tokens: 8000,
  total_tokens: 53000,
  
  courses_extracted: 94,
  success: true,
  error_message: null,
  
  response_time_ms: 12500,
  timestamp: "2026-01-27T10:00:00Z",
  
  // Rate limit tracking
  rate_limit_remaining: 6,
  daily_quota_remaining: 5
}
```

---

## 🎨 Frontend Components

### Sidebar Component
```
┌─────────────────────┐
│  My Extractions     │ ← Title
├─────────────────────┤
│ 📄 curriculum.pdf   │ ← Recent File
│  94 courses         │
│  Today at 10:00     │
│  ✅ Completed       │
│  [More...] [×]      │
├─────────────────────┤
│ 📄 courses_2025.pdf │ ← File
│  156 courses        │
│  Yesterday          │
│  ✏️ v2 (Refined)    │
│  [More...] [×]      │
├─────────────────────┤
│ 📄 curriculum_v1... │
│  92 courses         │
│  Jan 25             │
│  📊 v1              │
│  [More...] [×]      │
├─────────────────────┤
│ [Load More...]      │
├─────────────────────┤
│ 📊 Total Stats      │
│ Files: 42           │
│ Courses: 4,250      │
│ Space: 125 MB/500MB │
└─────────────────────┘
```

### File Card (on Click)
```
┌──────────────────────────────────────┐
│ curriculum.pdf                   [×]  │
├──────────────────────────────────────┤
│ 📊 94 Courses | 55 Pages             │
│ 📅 2026-01-27 10:00 | ✅ Completed   │
│ 🤖 Gemini | ⏱️ 12.5s                 │
├──────────────────────────────────────┤
│ Version History:                      │
│ ✅ v2 (Current) - Jan 27 12:00       │
│    - Modified 2 courses              │
│    - Added 1 course                  │
│ 📊 v1 (Original) - Jan 27 10:00      │
│    - 94 courses                      │
├──────────────────────────────────────┤
│ Actions:                              │
│ [📥 Download] [✏️ Refine]             │
│ [📤 Re-upload] [📋 Copy] [🗑️ Delete]  │
├──────────────────────────────────────┤
│ Export As:                            │
│ [CSV] [JSON] [Excel] [Google Sheets] │
└──────────────────────────────────────┘
```

---

## 🔄 Multi-API Extraction Flow

### API Selection Logic
```javascript
async function selectAPI(user, fallback = false) {
  // Priority Order: User Preference → Fallback → Default
  const apiOrder = [
    user.preferred_api,      // User's choice
    "claude",                // Backup (better accuracy)
    "gemini",                // Fallback (fast)
    "openai"                 // Emergency (expensive)
  ]
  
  for (let api of apiOrder) {
    const quota = await checkQuota(user.id, api)
    if (quota.remaining > 0) {
      return api
    }
  }
  
  throw new Error("All APIs exhausted for today")
}
```

### Extraction Endpoints

#### 1. Single API Extract
```
POST /api/extract
{
  file: File,
  api_key: "user_api_key",
  api: "gemini" // optional
}
→ Returns: { extraction_id, courses[], status }
```

#### 2. Multi-API Extract (Smart Routing)
```
POST /api/multi-extract
{
  file: File,
  strategy: "fast" | "accurate" | "balanced"
}
→ Uses best available API automatically
→ Falls back to secondary API if quota exceeded
```

#### 3. Refine Data
```
POST /api/refine
{
  extraction_id: ObjectId,
  changes: {
    modified: [...],
    added: [...],
    removed: [...]
  }
}
→ Creates new version, tracks changes
```

#### 4. List User Files
```
GET /api/files?sort=latest&limit=10
→ Returns paginated list of user's extractions
```

#### 5. Export File
```
GET /api/export/:extraction_id?format=csv|json|xlsx
→ Returns downloadable file in requested format
```

---

## 📈 Daily Quota Management

### Tracking System
```javascript
{
  daily_quota: {
    courses_extracted: 20,      // Daily limit
    courses_used_today: 15,     // Already used
    courses_remaining: 5,       // Available
    reset_date: "2026-01-28T00:00:00Z",
    
    // Per API
    api_quotas: {
      gemini: {
        used: 5,
        limit: 10,
        reset_at: "2026-01-28T00:00:00Z"
      },
      claude: {
        used: 10,
        limit: 10,
        reset_at: "2026-01-28T00:00:00Z"
      }
    }
  }
}
```

### Quota Reset Logic
```javascript
function shouldResetQuota(user) {
  const resetDate = new Date(user.daily_quota.reset_date)
  return new Date() > resetDate
}

function resetDailyQuota(user) {
  user.daily_quota.courses_used_today = 0
  user.daily_quota.reset_date = tomorrow()
  user.api_logs.length = 0 // Clear logs
  return user
}
```

---

## 🔐 Authentication (Future Phase)

### User Roles
- **Free User**: 20 courses/day, 500MB storage, single API
- **Pro User**: 500 courses/day, 10GB storage, multi-API
- **Team**: Unlimited, shared quota, collaborative

### Session Management
```javascript
// JWT Token
{
  sub: user_id,
  email: user_email,
  org: organization_id,
  role: "free" | "pro" | "team",
  iat: issued_at,
  exp: expiration_time
}
```

---

## 📁 File Storage Strategy

### Option 1: MongoDB GridFS (Simple)
- Store files directly in DB
- Better for <16MB files
- Included with MongoDB

### Option 2: AWS S3 (Scalable)
- Store files in cloud
- Cheap, reliable, fast
- Link in database

### Option 3: Vercel Blob (Current)
- Built-in to Vercel
- Easy to implement
- Good for small-medium files

**Recommendation**: Start with MongoDB GridFS → Migrate to S3 at scale

---

## 🔄 Re-upload & Refine Workflow

```
1. User uploads PDF
   ↓
2. Extract courses (API 1)
   ↓
3. Save extraction v1
   ↓
4. User reviews and finds missing courses
   ↓
5. User clicks "Refine"
   ↓
6. Option A: Manual Editing
   - Add missing courses
   - Edit existing courses
   - Remove duplicates
   ↓
7. Option B: Re-upload with manual additions
   - Upload same PDF
   - Merge with previous extraction
   - Deduplicate
   ↓
8. Save as v2
   ↓
9. Track all changes in version history
```

---

## 📊 Statistics Dashboard

### User Dashboard Shows:
- Total files uploaded: 42
- Total courses extracted: 4,250
- Average courses per file: 101
- Most common category: Math (892 courses)
- Total storage used: 125 MB / 500 MB
- This month: 500 courses extracted
- This week: 120 courses extracted
- Today: 15 courses extracted (5 remaining)

### File-Level Stats:
- Extraction time
- Accuracy score (0-100%)
- Tokens used
- API used
- Versions created
- Last modified date

---

## 🚀 Implementation Phases

### Phase 1: MVP (Current)
- [x] Single file extraction (Gemini)
- [ ] Save extraction to DB
- [ ] List user files in sidebar
- [ ] Download as CSV/JSON
- [ ] Simple refinement (manual edit)

### Phase 2: Multi-API (Week 2)
- [ ] Add Claude API support
- [ ] Smart API routing
- [ ] Fallback logic
- [ ] API quota tracking

### Phase 3: Advanced Features (Week 3)
- [ ] User authentication
- [ ] Team collaboration
- [ ] Version history UI
- [ ] Data comparison tool
- [ ] Batch processing

### Phase 4: Scale (Week 4+)
- [ ] S3 file storage
- [ ] Advanced analytics
- [ ] Data enrichment APIs
- [ ] CSV import/merge
- [ ] API key management UI

---

## 📝 Database Setup

### MongoDB Connection
```javascript
// lib/db.ts
import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017"
const client = new MongoClient(uri)

export async function connectDB() {
  if (!client.isConnected) {
    await client.connect()
  }
  return client.db("course_harvester")
}
```

### Collections Setup
```javascript
// pages/api/admin/setup-db.ts
async function setupCollections() {
  const db = await connectDB()
  
  // Create users collection with unique index on email
  await db.createCollection("users")
  await db.collection("users").createIndex({ email: 1 }, { unique: true })
  
  // Create extractions collection
  await db.createCollection("extractions")
  await db.collection("extractions").createIndex({ user_id: 1, created_at: -1 })
  
  // Create versions collection
  await db.createCollection("versions")
  await db.collection("versions").createIndex({ extraction_id: 1, version_number: -1 })
  
  // Create api_logs collection
  await db.createCollection("api_logs")
  await db.collection("api_logs").createIndex({ user_id: 1, timestamp: -1 })
}
```

---

## 🎯 Next Steps

1. **Week 1**:
   - [ ] Set up MongoDB cluster
   - [ ] Create database schema
   - [ ] Implement file CRUD APIs
   - [ ] Build sidebar component
   - [ ] Add download functionality

2. **Week 2**:
   - [ ] Integrate second API (Claude)
   - [ ] Implement smart API routing
   - [ ] Add quota tracking UI
   - [ ] Build version history viewer

3. **Week 3**:
   - [ ] Add user authentication
   - [ ] Implement refinement workflow
   - [ ] Create analytics dashboard
   - [ ] Add team features

4. **Week 4**:
   - [ ] Migrate to S3
   - [ ] Performance optimization
   - [ ] Advanced features
   - [ ] Launch beta

---

## 💡 Team Collaboration Features (Future)

- Shared extraction workspace
- Comments on courses
- Approval workflow
- Merge different versions
- Audit trail of all changes
- Role-based access (Admin, Editor, Viewer)

---

**This architecture supports:**
- ✅ Multi-API extraction with fallback
- ✅ Persistent file storage per user
- ✅ Daily quota management
- ✅ Version control of extracted data
- ✅ Data refinement workflow
- ✅ Export in multiple formats
- ✅ Scalable to enterprise use
- ✅ Future authentication & collaboration

