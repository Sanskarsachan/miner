# 🎯 Course Mapping Engine - System Architecture & Implementation

**Version 2.3.0** | Created: February 6, 2026 | Status: Phase 3 Complete

---

## 📋 System Overview

The **Course Mapping Engine** is a 6-step deterministic → semantic → validation system that maps extracted school courses to a standardized Florida state course catalog.

### Architecture Diagram

```
Extracted Courses (from PDFs/CSVs)
        ↓
┌─────────────────────────────────────────────────────┐
│     STEP 1: Data Preparation & Normalization         │
│  - Load extraction + master catalog into memory      │
│  - Normalize all strings (remove spaces/special)     │
└─────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────┐
│     STEP 2: Deterministic Pass (100% JavaScript)    │
│  - Match A: Direct code comparison                  │
│  - Match B: Trim to 7-digit prefix                  │
│  - Success rate: ~60% of courses                    │
└─────────────────────────────────────────────────────┘
        ↓ (Unmapped courses)
┌─────────────────────────────────────────────────────┐
│    STEP 3: Semantic Pass (Gemini AI 2.5-flash)      │
│  - Send course name + description to AI             │
│  - AI compares against master catalog keywords      │
│  - Returns mappedCode + confidence score            │
│  - Success rate: ~30% of remaining                  │
└─────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────┐
│    STEP 4: Validation Layer (Source of Truth)       │
│  - Verify all AI-generated codes exist              │
│  - Flag confidence < 75% for manual review          │
│  - Keep only valid mappings                         │
└─────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────┐
│   STEP 5: MongoDB Persistence (Array Filters)       │
│  - Update courses array in extraction document      │
│  - Set: mappedCode, mappingStatus, confidence       │
│  - Mark extraction: is_refined = true               │
└─────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────┐
│    STEP 6: Real-time UI Response                    │
│  - Return summary stats (mapped, unmapped, flagged)  │
│  - Dashboard displays results with colored badges   │
└─────────────────────────────────────────────────────┘
```

---

## 🛠 Implementation Files

### 1. **Core Service: `lib/mapping-engine.ts`** (450 lines)

Implements all 6 steps with pure JavaScript/TypeScript logic.

**Key Exports:**

- `normalize(text)` - Removes spaces/special chars for comparison
- `deterministicPass()` - Step 2: Code matching
- `semanticPass()` - Step 3: AI-based matching
- `validateMappings()` - Step 4: Validation layer
- `persistMappings()` - Step 5: MongoDB persistence
- `computeSummary()` - Step 6: Results summary

**Type Safety:**
```typescript
interface ExtractedCourse {
  CourseName: string;
  CourseCode: string;
  CourseDescription?: string;
  mappedCode?: string;                  // Set by mapping engine
  mappingStatus?: 'unmapped' | 'mapped' | 'flagged_for_review';
  matchMethod?: 'CODE_MATCH' | 'CODE_TRIM_MATCH' | 'SEMANTIC_MATCH';
  confidence?: number;                  // 0-100
  matchReasoning?: string;              // Why matched
}
```

---

### 2. **API Endpoint: `pages/api/v2/refine-extractions.ts`** (200 lines)

**Endpoint:** `POST /api/v2/refine-extractions`

**Request:**
```json
{
  "extractionId": "507f1f77bcf86cd799439011",
  "apiKey": "sk-..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProcessed": 215,
    "newlyMapped": 140,
    "stillUnmapped": 60,
    "flaggedForReview": 15,
    "details": {
      "codeMatches": 90,
      "trimMatches": 50,
      "semanticMatches": 40
    }
  }
}
```

**Flow:**
1. Validates input (extractionId, apiKey)
2. Loads extraction document + master catalog
3. Calls `deterministicPass()` → `semanticPass()` → `validateMappings()`
4. Persists using MongoDB array filters
5. Returns summary statistics

---

### 3. **Dashboard Component: `components/MappingDashboard.tsx`** (350 lines)

Beautiful real-time UI for triggering and monitoring refinement.

**Features:**
- 🔑 API key input (password field)
- 🎬 Start button with loading state
- 📊 4 color-coded badges:
  - 🟢 **Green**: Mapped courses
  - 🔴 **Red**: Unmapped courses
  - 🟡 **Yellow**: Flagged for review
  - 🔵 **Blue**: Total processed
- 📈 Breakdown by match method (code, trim, semantic)
- 📝 Live success rate percentage
- ✨ Glassmorphic design with gradient background

**Props:**
```typescript
interface MappingDashboardProps {
  extractionId: string;                // MongoDB extraction ID
  onRefineStart?: () => void;          // Called when refinement starts
  onRefineComplete?: (result) => void; // Called with results
  onRefineError?: (error) => void;    // Called on error
}
```

---

### 4. **Refinement Page: `pages/refine/[id].tsx`** (400 lines)

Full-page workflow combining all components.

**Features:**
- Back button to extractions list
- Current stats (mapped, unmapped, flagged)
- MappingDashboard integration
- Table of courses with mapping status
- Responsive grid layout

---

## 🧠 Gemini System Instructions

The AI uses this system prompt to find semantic matches:

```
You are an expert in Florida High School Curriculum. Your task is to map 
school-specific course titles and project descriptions to the correct 
7-digit State Course Code.

Instructions:
1. Ignore all formatting, spaces, and minor typos.
2. Look for keywords in project descriptions that indicate a state standard 
   (e.g., 'Quadratic equations' matches 'Algebra 2').
3. If a description involves '3D Printing' or 'Simulations' in a math context, 
   look for Geometry or Physics codes.
4. Output Format: Return ONLY a JSON array: 
   [{"rawName": string, "mappedCode": string, "confidence": number, "reasoning": string}]
5. If no clear match exists, return null for the mappedCode.
```

---

## 🔧 MongoDB Array Filters Pattern

**Critical Implementation Detail:**

When updating courses array in extraction documents:

```javascript
// BEFORE (❌ Wrong - updates only first match):
db.collection('extractions').updateOne(
  { _id: extractionId },
  { $set: { 'courses.$': { ...updatedCourse } } }
)

// AFTER (✅ Correct - precise array updates):
db.collection('extractions').updateOne(
  { _id: extractionId },
  {
    $set: {
      'courses.$[elem].mappedCode': course.mappedCode,
      'courses.$[elem].mappingStatus': course.mappingStatus,
      'courses.$[elem].matchMethod': course.matchMethod,
      'courses.$[elem].confidence': course.confidence,
    },
  },
  {
    arrayFilters: [
      {
        'elem.CourseName': course.CourseName,
        'elem.CourseCode': course.CourseCode,
      },
    ],
  }
)
```

**Key Points:**
- `$[elem]` = placeholder for array element
- `arrayFilters` = conditions to match specific elements
- Updates only target element, not entire array
- Preserves other courses unchanged

---

## 📊 Expected Results

### Typical Refinement Summary

For a batch of 215 extracted courses:

| Metric | Count | Method |
|--------|-------|--------|
| **Direct Code Matches** | 90 | JavaScript (instant) |
| **Trimmed Code Matches** | 50 | JavaScript (instant) |
| **Semantic Matches** | 40 | Gemini AI (3-5 sec) |
| **Flagged for Review** | 15 | Low confidence (< 75%) |
| **Still Unmapped** | 20 | No match found |
| **Total Mapped** | 180 | 83.7% success |

### Performance Metrics

- **Deterministic Pass**: < 100ms (JavaScript only)
- **Semantic Pass**: 3-5 seconds (1 API call to Gemini)
- **Validation**: < 50ms (Set lookups)
- **Persistence**: 1-2 seconds (MongoDB bulk update)
- **Total**: ~5-8 seconds per extraction

### Cost Optimization

- **Code Matching**: No API calls (free)
- **Semantic Matching**: 1 API call per extraction (not per course)
- **Cost per Extraction**: ~$0.0002 (Gemini 2.5-flash pricing)

---

## 🚀 Usage Example

### Frontend (React)

```typescript
import MappingDashboard from '@/components/MappingDashboard';

function ExtractionDetail({ extractionId }) {
  return (
    <MappingDashboard
      extractionId={extractionId}
      onRefineComplete={(result) => {
        console.log(`Mapped ${result.newlyMapped} courses`);
        // Refresh extraction data
      }}
    />
  );
}
```

### Backend (Node.js)

```typescript
import { 
  deterministicPass, 
  semanticPass, 
  validateMappings 
} from '@/lib/mapping-engine';

// Step 1: Get data
const extraction = await db.collection('extractions').findOne({ _id });
const masterCatalog = await db.collection('master_courses').find().toArray();

// Step 2-4: Run refinement pipeline
const { updated: detMatches, unmapped } = 
  await deterministicPass(extraction.courses, masterCatalog);

const semMatches = 
  await semanticPass(unmapped, masterCatalog, apiKey);

const validated = 
  validateMappings([...detMatches, ...semMatches], masterCatalog);

// Step 5: Save
await persistMappings(db, extractionId, validated);
```

---

## ⚙️ Configuration

### Environment Variables

```bash
# .env.local
MONGODB_URI=mongodb+srv://...
GEMINI_API_KEY=sk-...  # Optional: fallback if not provided in request
```

### Tuning Parameters (in `mapping-engine.ts`)

```typescript
// Confidence threshold for flagging
const CONFIDENCE_THRESHOLD = 75; // Flag if < 75%

// Maximum master catalog size to load
const MAX_MASTER_CATALOG = 10000;

// Semantic pass batch size
const SEMANTIC_BATCH_SIZE = 100;
```

---

## 🧪 Testing Checklist

### Unit Tests (mapping-engine.ts)

```typescript
// Test normalization
normalize('CS-101')  === normalize('cs101') // ✓

// Test deterministic pass
deterministicPass([
  { CourseCode: 'CS-101', CourseName: 'Intro' },
], [
  { courseCode: 'CS101', courseName: 'Intro to CS' }
]) // Should match ✓

// Test validation
validateMappings(
  [{ mappedCode: 'INVALID' }],
  masterCatalog
) // Should flag as invalid ✓
```

### Integration Tests

1. ✅ Extract courses from PDF
2. ✅ Load master catalog
3. ✅ Run deterministic pass (check code matches)
4. ✅ Run semantic pass (check AI matches)
5. ✅ Validate mappings
6. ✅ Persist to MongoDB
7. ✅ Fetch and verify updates

### End-to-End Tests

1. ✅ Extraction detail page loads
2. ✅ Click "Start Refinement"
3. ✅ Dashboard shows progress
4. ✅ Results display correctly
5. ✅ Table updates with mapped codes
6. ✅ Navigate back and verify persistence

---

## 🔐 Security & Validation

### Input Validation

- ✅ Extraction ID must be valid MongoDB ObjectId
- ✅ API key must be non-empty string
- ✅ Courses array must exist and be iterable

### Output Validation

- ✅ All mapped codes verified against master catalog
- ✅ Confidence scores in range [0, 100]
- ✅ Match methods match enum values
- ✅ Reasoning text trimmed and escaped

### Error Handling

- ✅ MongoDB connection errors caught
- ✅ Gemini API errors logged with details
- ✅ Invalid JSON responses handled gracefully
- ✅ User-friendly error messages displayed

---

## 📈 Monitoring & Logging

### Console Logs (Development)

```typescript
console.log(`[refine-extractions] Processing extraction: ${extractionId}`);
console.log(`[refine-extractions] Loaded ${masterCatalog.length} master courses`);
console.log(`[refine-extractions] Deterministic pass: ${stats.codeMatches} matches`);
console.log(`[refine-extractions] Semantic pass: ${semanticMatches} matches`);
console.log(`[refine-extractions] Validation: ${flagged} flagged`);
console.log(`[refine-extractions] Successfully persisted mappings`);
```

### Production Metrics

Track these in your analytics:
- Time to complete refinement
- Success rate (mapped / total)
- API call count per extraction
- Flagged courses requiring review
- User completion rate

---

## 🎯 Next Steps (Phase 4)

1. **Batch Refinement** - Process multiple extractions simultaneously
2. **Manual Review UI** - Interface for flagged courses
3. **Learning System** - Track successful matches to improve AI prompts
4. **Custom Mappings** - Allow users to create custom match rules
5. **Reporting** - Dashboard showing refinement statistics

---

## 📚 Related Documentation

- See [MASTER_DATABASE_TESTING.md](MASTER_DATABASE_TESTING.md) for master DB setup
- See [BUG_FIX_REPORT.md](BUG_FIX_REPORT.md) for PDF extraction issues
- See [README.md](README.md) for overall system architecture

---

**Questions?** Check the code comments in `lib/mapping-engine.ts` for detailed step-by-step explanations.
