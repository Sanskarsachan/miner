# 🏗️ Phase 3 Architecture Redesign - Data Isolation & Component Safety

**Status**: REDESIGN PROPOSAL (Before Implementation)  
**Priority**: CRITICAL - Protecting sensitive data collection logic  
**Date**: February 6, 2026

---

## ⚠️ Current Risk Analysis

### Problem with Previous Design
The original Phase 3 design **modified the extraction data directly**:

```typescript
// ❌ DANGEROUS - Modifies original extraction document
await collection.updateOne(
  { _id: extractionId },
  {
    $set: {
      'courses.$[elem].mappedCode': mappedCode,
      'courses.$[elem].mappingStatus': status,
    },
  }
);
```

**Why this is risky:**
1. ✗ Original extracted data gets overwritten (irreversible)
2. ✗ If mapping fails, dirty data remains in extraction
3. ✗ Hard to audit what mapping did vs what extraction extracted
4. ✗ Can't easily rollback bad mappings
5. ✗ Mixes concerns: extraction vs mapping logic
6. ✗ If Gemini makes mistakes, extraction is corrupted

---

## ✅ Proposed Solution: Complete Data Isolation

### Architecture Pattern: **Separate Collections**

```
MongoDB Collections:
├── extractions (PRISTINE - NEVER MODIFIED)
│   ├── courses[] (raw extracted data - IMMUTABLE)
│   └── status: "completed"
│
├── course_mappings (NEW - ONLY MAPPING DATA)
│   ├── extraction_id (reference only)
│   ├── mappings[] (all mapping attempts/results)
│   ├── status: "pending" | "mapped" | "review_needed"
│   └── audit_trail[] (what changed, when, by what)
│
└── mapping_sessions (AUDIT LOG)
    ├── extraction_id
    ├── status: "in_progress" | "completed" | "failed"
    ├── gemini_interactions[] (every API call logged)
    ├── validation_results
    └── error_log
```

### Key Principle: **Write Once, Read Many**

```
EXTRACTION COLLECTION:
- Created: Once (during PDF parsing)
- Modified: NEVER
- Status: Always "completed"
- Data: Pristine, original extracted courses

MAPPING COLLECTION (NEW):
- Created: Once per mapping session
- Modified: Only by mapping engine
- Status: tracked separately
- Data: All mapping attempts (successful, failed, flagged)

MAPPING SESSIONS (NEW):
- Created: One per refinement operation
- Immutable audit trail
- Every Gemini call logged
- Every validation result recorded
```

---

## 📊 New Data Models

### 1. Updated Course Type (in extractions - UNCHANGED)

```typescript
// lib/types.ts
export interface Course {
  _id?: ObjectId;
  name: string;
  co
  de?: string;
  grade_level?: string;
  credits?: string;
  description?: string;
  category?: string;
  confidence_score?: number; // From extraction, not mapping
  extracted_by_api?: string;
  extraction_timestamp: Date;
  
  // NO mapping fields here - separation of concerns
}

export interface Extraction {
  _id?: ObjectId;
  file_id: string;
  user_id: ObjectId | string;
  filename: string;
  courses: Course[]; // PRISTINE, NEVER MODIFIED
  total_courses: number;
  status: 'completed' | 'failed'; // Not "refined"
  created_at: Date;
  // NO mapping fields, NO is_refined, NO last_refined_at
}
```

### 2. NEW: Course Mapping Collection

```typescript
// lib/types.ts - NEW TYPE
export interface CourseMapping {
  _id?: ObjectId;
  
  // Reference to original data
  extraction_id: ObjectId | string;
  user_id: ObjectId | string;
  source_course: {
    name: string;
    code?: string;
    description?: string;
  };
  
  // Mapping result
  mapped_code?: string;
  mapped_name?: string;
  mapped_id?: string; // Reference to master_courses
  
  // Status and metadata
  status: 'unmapped' | 'mapped' | 'flagged_for_review';
  confidence: number; // 0-100
  match_method: 'CODE_MATCH' | 'CODE_TRIM_MATCH' | 'SEMANTIC_MATCH' | 'MANUAL';
  
  // Why was it flagged?
  flags?: {
    reason: string; // e.g., "confidence < 75"
    severity: 'low' | 'medium' | 'high';
  }[];
  
  // Audit trail
  mapping_session_id: ObjectId;
  created_at: Date;
  manually_reviewed?: {
    reviewed_by: string;
    reviewed_at: Date;
    override_code?: string;
    notes?: string;
  };
}

export interface MappingSession {
  _id?: ObjectId;
  
  // Reference
  extraction_id: ObjectId | string;
  user_id: ObjectId | string;
  
  // Session metadata
  status: 'in_progress' | 'completed' | 'failed' | 'partial_failure';
  started_at: Date;
  completed_at?: Date;
  duration_ms?: number;
  
  // Statistics
  stats: {
    total_courses: number;
    code_matches: number;
    trim_matches: number;
    semantic_matches: number;
    flagged: number;
    unmapped: number;
    errors: number;
  };
  
  // Gemini interaction log
  gemini_calls: {
    call_number: number;
    timestamp: Date;
    request: {
      courses_sent: number;
      prompt_tokens: number;
    };
    response: {
      success: boolean;
      mappings_found: number;
      response_tokens: number;
      error?: string;
    };
    cost_cents: number;
  }[];
  
  // Validation results
  validation: {
    invalid_codes: {
      code: string;
      reason: string;
    }[];
    low_confidence: {
      mapping_id: ObjectId;
      confidence: number;
    }[];
  };
  
  // Errors and debugging
  error_log?: {
    timestamp: Date;
    error_type: string;
    message: string;
    stack?: string;
  }[];
}
```

---

## 🧠 Redesigned Gemini Prompting System

### Problem with Previous Approach

Previous design sent unmapped courses to Gemini with generic system instructions.

**Issues:**
- ❌ No context about master database structure
- ❌ Gemini doesn't know what valid codes are
- ❌ No constraints/rules to follow
- ❌ Vague matching criteria
- ❌ Hard to debug what went wrong
- ❌ No input validation before API call

### NEW: Structured Gemini Framework

#### Step 1: Prepare Context (Server-side)

```typescript
// lib/gemini-context-builder.ts (NEW)
export function buildGeminiContext(
  unmappedCourses: ExtractedCourse[],
  masterCatalog: MasterCourse[],
  rules: MappingRules
): GeminiPromptContext {
  return {
    system_instructions: buildSystemInstructions(rules),
    master_database_summary: summarizeMasterDatabase(masterCatalog),
    extracted_courses: unmappedCourses,
    constraints: buildConstraints(masterCatalog),
    examples: buildExamples(masterCatalog),
  };
}
```

#### Step 2: System Instructions (Rules-Based)

```typescript
// lib/prompts/gemini-system.ts (NEW)
export const GEMINI_SYSTEM_INSTRUCTIONS = `
You are a course mapping specialist with access to an institutional master course database.

## YOUR JOB
Map extracted course names/descriptions to official course codes in the master database.
Be accurate and conservative - flag uncertain mappings.

## CRITICAL RULES

1. NEVER invent course codes
   - Only use codes from the master database provided
   - If unsure, respond with confidence < 75 or say "NOT_FOUND"

2. MATCHING STRATEGY
   a) First: Look for EXACT OR SIMILAR CODE MATCHES
      - Input: "CS 101" → Look for "CS101", "CS-101", "CSCI-101"
      - Match confidence: 95-100%
   
   b) Second: KEYWORD MATCHING IN COURSE NAMES
      - Input name: "Introduction to Programming"
      - Master has: "CS101 - Intro Programming"
      - Match confidence: 75-90%
   
   c) Third: SEMANTIC MATCHING ON DESCRIPTIONS
      - Use course descriptions to find thematic matches
      - Match confidence: 60-75%

3. CONFIDENCE THRESHOLDS
   - 90-100%: Definitely the right course
   - 75-89%: Very likely, but human should check
   - 50-74%: Possible, needs review
   - Below 50%: Don't map, flag as unmapped

4. FLAGGING RULES
   - Flag any mapping with confidence < 75%
   - Flag if course sounds like specialized topic but no match found
   - Flag if multiple possible matches (ambiguous)

## INPUT FORMAT
You will receive:
{
  "courses": [
    {
      "name": "Course Name",
      "code": "Original Code (if any)",
      "description": "Description if available"
    }
  ],
  "master_database": [...], // All valid courses
  "constraints": {...}
}

## OUTPUT FORMAT
Respond ONLY with valid JSON:
{
  "mappings": [
    {
      "source_name": "Input course name",
      "mapped_code": "VALID_CODE_FROM_DATABASE",
      "confidence": 85,
      "reasoning": "Brief explanation of why this match",
      "alternative_matches": ["CODE2", "CODE3"] (if ambiguous),
      "should_flag": false
    }
  ],
  "unmapped": [
    {
      "source_name": "Input course name",
      "reason": "Why not mapped",
      "suggestions": ["POSSIBLE_CODE1", "POSSIBLE_CODE2"]
    }
  ],
  "errors": [
    {
      "input_index": 0,
      "error_type": "INVALID_INPUT",
      "message": "..."
    }
  ]
}

## NO ERRORS = EMPTY ARRAY
Always return all three arrays (mappings, unmapped, errors).
`;
```

#### Step 3: Master Database Context (Constrained)

```typescript
// lib/gemini-context-builder.ts
function summarizeMasterDatabase(
  catalog: MasterCourse[]
): MasterDatabaseContext {
  return {
    total_courses: catalog.length,
    by_category: groupBy(catalog, 'category'),
    valid_codes: catalog.map(c => c.courseCode), // For validation
    code_prefixes: extractPrefixes(catalog), // E.g., "CS", "MATH"
    sample_courses: catalog.slice(0, 20), // Show examples
  };
}
```

#### Step 4: Constraints (Prevent Invalid Outputs)

```typescript
// lib/prompts/constraints.ts (NEW)
export function buildConstraints(masterCatalog: MasterCourse[]): MappingConstraints {
  const validCodes = new Set(masterCatalog.map(c => normalize(c.courseCode)));
  
  return {
    valid_codes: Array.from(validCodes),
    code_format_patterns: [
      /^[A-Z]{2,4}\d{3}$/, // CS101
      /^[A-Z]{2,4}-\d{3}$/, // CS-101
      /^[A-Z]{2,4}\s\d{3}$/, // CS 101
    ],
    forbidden_outputs: [
      'UNKNOWN',
      'N/A',
      'TBD',
      'CUSTOM-XXXX',
    ],
    confidence_scale: {
      min: 0,
      max: 100,
      must_be_integer: true,
    },
  };
}
```

#### Step 5: Pre-Validation (Before API Call)

```typescript
// lib/gemini-validator.ts (NEW)
export function validateGeminiInput(
  courses: ExtractedCourse[],
  masterCatalog: MasterCourse[]
): ValidationResult {
  const errors: string[] = [];
  
  if (courses.length === 0) {
    errors.push('No courses to map');
  }
  if (courses.length > 100) {
    errors.push('Cannot map more than 100 courses at once');
  }
  if (!masterCatalog || masterCatalog.length === 0) {
    errors.push('Master catalog is empty');
  }
  
  // Check for required fields
  for (const course of courses) {
    if (!course.name) {
      errors.push(`Course missing name`);
    }
  }
  
  return {
    is_valid: errors.length === 0,
    errors,
  };
}
```

---

## 🎨 Component-Based Architecture with Tailwind

### NEW UI Structure

```
components/
├── mapping/
│   ├── MappingWorkflow.tsx (main container)
│   ├── sections/
│   │   ├── MappingHeader.tsx (title, stats)
│   │   ├── MappingConfiguration.tsx (rules, settings)
│   │   ├── MappingProgress.tsx (real-time status)
│   │   ├── MappingResults.tsx (results display)
│   │   └── MappingFlags.tsx (flagged courses)
│   │
│   ├── cards/
│   │   ├── MappingStatsCard.tsx (counters)
│   │   ├── MappingSessionCard.tsx (session info)
│   │   └── CourseResultCard.tsx (individual result)
│   │
│   ├── controls/
│   │   ├── RuleSelector.tsx (select mapping rules)
│   │   ├── ApiKeyInput.tsx (secure input)
│   │   ├── StartMappingButton.tsx (trigger mapping)
│   │   └── ValidationToggle.tsx (validation options)
│   │
│   ├── tables/
│   │   ├── MappingResultsTable.tsx (all results)
│   │   ├── FlaggedCoursesTable.tsx (needs review)
│   │   └── GeminiCallsTable.tsx (API log)
│   │
│   ├── modals/
│   │   ├── CourseDetailModal.tsx (review single course)
│   │   ├── ConfirmMappingModal.tsx (confirmation)
│   │   └── ErrorDetailModal.tsx (error details)
│   │
│   └── alerts/
│       ├── ValidationAlert.tsx (warnings)
│       ├── SuccessAlert.tsx (success message)
│       └── GeminiErrorAlert.tsx (API errors)
│
└── shared/
    ├── StatusBadge.tsx (color-coded status)
    ├── ConfidenceBar.tsx (visual confidence)
    ├── LoadingSpinner.tsx (animated loader)
    └── DataIsolationWarning.tsx (data protection notice)
```

### Design System: Tailwind + Shadcn/ui

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Data states
        extracted: '#E0F2FE', // Sky blue - pristine extraction
        mapping: '#FEF3C7', // Amber - in progress
        mapped: '#DCFCE7', // Green - success
        flagged: '#FED7AA', // Orange - review needed
        unmapped: '#F3F4F6', // Gray - not found
        
        // Status colors
        pristine: '#10B981', // Green - original data safe
        risky: '#EF4444', // Red - potential issues
        warning: '#F59E0B', // Amber - needs attention
      },
      keyframes: {
        refinement: {
          '0%': { opacity: '0.5', transform: 'scale(0.95)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0.5', transform: 'scale(0.95)' },
        },
      },
    },
  },
};
```

### Component Example: Data Isolation Indicator

```typescript
// components/mapping/DataIsolationStatus.tsx
import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function DataIsolationStatus() {
  return (
    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-3">
        <CheckCircle className="text-emerald-600 w-5 h-5 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-emerald-900">
            ✓ Original Data Protected
          </h3>
          <p className="text-sm text-emerald-700">
            Extracted courses remain pristine. Mappings are stored separately.
          </p>
        </div>
      </div>
      
      {/* Visual representation of separation */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-white border border-emerald-300 rounded p-3">
          <p className="text-xs font-mono text-emerald-700">extractions</p>
          <p className="text-xs text-gray-600">locked (pristine)</p>
        </div>
        <div className="bg-amber-50 border border-amber-300 rounded p-3">
          <p className="text-xs font-mono text-amber-700">course_mappings</p>
          <p className="text-xs text-gray-600">mutable (separate)</p>
        </div>
      </div>
    </div>
  );
}
```

---

## 🔄 New Mapping Flow (Safe)

### Step-by-Step Process

```
User Action: Click "Start Mapping"
    ↓
1. VALIDATION PHASE
   ├─ Check extraction exists and has courses
   ├─ Load extraction (read-only)
   ├─ Verify master catalog exists
   ├─ Pre-validate Gemini input
   └─ Status: "validation" (in UI)
    ↓
2. PREPARATION PHASE
   ├─ Create NEW mapping_session document
   ├─ Log session start
   ├─ Filter out already-mapped courses
   ├─ Group unmapped courses for Gemini
   └─ Status: "preparing" (in UI)
    ↓
3. CONTEXT BUILDING PHASE
   ├─ Build system instructions with rules
   ├─ Summarize master database
   ├─ Add constraints and examples
   ├─ Validate total tokens < limit
   └─ Status: "building_context" (in UI)
    ↓
4. DETERMINISTIC PHASE (Fast, Free)
   ├─ Code matching (100% accuracy, < 10ms)
   ├─ Trim matching (high accuracy, < 10ms)
   ├─ Create mappings for matches
   ├─ Log results in mapping_session
   └─ Status: "deterministic" (in UI)
    ↓
5. GEMINI PHASE (AI, Costly)
   ├─ Send unmapped courses to Gemini
   ├─ Log request (tokens, timestamp)
   ├─ Wait for response
   ├─ Parse and validate response
   ├─ Log response (tokens, cost, error if any)
   ├─ Create mappings for semantic matches
   └─ Status: "semantic_matching" (in UI)
    ↓
6. VALIDATION PHASE
   ├─ Check all mapped codes exist in master
   ├─ Apply confidence thresholds
   ├─ Flag low-confidence mappings
   ├─ Log validation results
   └─ Status: "validation" (in UI)
    ↓
7. PERSISTENCE PHASE
   ├─ INSERT new documents to course_mappings
   ├─ INSERT validation results
   ├─ UPDATE mapping_session with final stats
   ├─ NEVER modify extraction
   └─ Status: "persisting" (in UI)
    ↓
8. RESPONSE PHASE
   ├─ Compute summary statistics
   ├─ Generate audit report
   ├─ Return success response
   └─ Status: "completed" ✓
```

---

## 🛡️ Safety Mechanisms

### 1. Read-Only Extraction Access

```typescript
// pages/api/v2/safe-mapping.ts (NEW)
export async function safeMapExtraction(req: Request) {
  const db = await getDB();
  
  // Read-only
  const extraction = await db
    .collection('extractions')
    .findOne({ _id: new ObjectId(extractionId) });
  
  if (!extraction) {
    return { error: 'Extraction not found' };
  }
  
  // Clone data for processing (never modify original)
  const coursesToMap = JSON.parse(JSON.stringify(extraction.courses));
  
  // ... mapping logic ...
  
  // Insert to course_mappings (NEW COLLECTION)
  await db.collection('course_mappings').insertMany(mappings);
  
  // Log session
  await db.collection('mapping_sessions').insertOne(session);
  
  // ✗ NEVER do: db.collection('extractions').updateOne(...)
  
  return { success: true, session_id };
}
```

### 2. Transaction Support (Rollback on Failure)

```typescript
// pages/api/v2/safe-mapping.ts
export async function safeMapExtractionWithRollback(req: Request) {
  const db = await getDB();
  const session = db.getMongo().startSession();
  
  try {
    await session.withTransaction(async () => {
      // Everything here or nothing at all
      
      // 1. Create mapping session
      const sessionResult = await db
        .collection('mapping_sessions')
        .insertOne(mappingSession, { session });
      
      // 2. Insert all mappings
      await db
        .collection('course_mappings')
        .insertMany(allMappings, { session });
      
      // 3. Update master extraction status
      // (extract.status stays "completed", no new fields added)
    });
    
    return { success: true };
  } catch (error) {
    // Transaction automatically rolled back
    console.error('Mapping failed, all changes reversed:', error);
    return { error: 'Mapping failed', details: error };
  } finally {
    await session.endSession();
  }
}
```

### 3. Gemini Response Validation

```typescript
// lib/gemini-response-validator.ts (NEW)
export function validateGeminiResponse(
  response: GeminiRawResponse,
  constraints: MappingConstraints
): ValidationResult {
  const errors: string[] = [];
  
  // Check JSON structure
  try {
    const parsed = JSON.parse(response);
    if (!parsed.mappings || !parsed.unmapped || !parsed.errors) {
      errors.push('Response missing required arrays');
    }
  } catch (e) {
    errors.push('Response is not valid JSON');
  }
  
  // Validate each mapping
  for (const mapping of response.mappings) {
    // Code must be in valid list
    if (!constraints.valid_codes.includes(normalize(mapping.mapped_code))) {
      errors.push(`Invalid code from Gemini: ${mapping.mapped_code}`);
    }
    
    // Confidence must be 0-100
    if (mapping.confidence < 0 || mapping.confidence > 100) {
      errors.push(`Invalid confidence: ${mapping.confidence}`);
    }
    
    // Must have reasoning
    if (!mapping.reasoning || mapping.reasoning.length < 10) {
      errors.push('Mapping missing proper reasoning');
    }
  }
  
  return {
    is_valid: errors.length === 0,
    errors,
  };
}
```

---

## 🎯 Component Refinement: Tailwind Best Practices

### MappingWorkflow.tsx - Main Container

```tsx
// components/mapping/MappingWorkflow.tsx
'use client';

import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

import MappingHeader from './sections/MappingHeader';
import DataIsolationStatus from './DataIsolationStatus';
import MappingConfiguration from './sections/MappingConfiguration';
import MappingProgress from './sections/MappingProgress';
import MappingResults from './sections/MappingResults';

export default function MappingWorkflow({ extractionId }: Props) {
  const [step, setStep] = useState<'config' | 'progress' | 'results'>('config');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stats, setStats] = useState<MappingStats | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Maximum width container */}
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header section */}
        <MappingHeader extractionId={extractionId} />
        
        {/* Data isolation status - prominent and clear */}
        <DataIsolationStatus />
        
        {/* Step indicator */}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className={step === 'config' ? 'font-bold text-slate-900' : ''}>
            Configuration
          </span>
          <ChevronRight className="w-4 h-4" />
          <span className={step === 'progress' ? 'font-bold text-slate-900' : ''}>
            Processing
          </span>
          <ChevronRight className="w-4 h-4" />
          <span className={step === 'results' ? 'font-bold text-slate-900' : ''}>
            Results
          </span>
        </div>
        
        {/* Main content - changes based on step */}
        {step === 'config' && (
          <MappingConfiguration
            extractionId={extractionId}
            onStart={(session, initialStats) => {
              setSessionId(session._id);
              setStats(initialStats);
              setStep('progress');
            }}
          />
        )}
        
        {step === 'progress' && sessionId && (
          <MappingProgress
            sessionId={sessionId}
            onComplete={(finalStats) => {
              setStats(finalStats);
              setStep('results');
            }}
          />
        )}
        
        {step === 'results' && sessionId && stats && (
          <MappingResults
            sessionId={sessionId}
            extractionId={extractionId}
            stats={stats}
            onReset={() => setStep('config')}
          />
        )}
      </div>
    </div>
  );
}
```

### StatusBadge.tsx - Reusable Component

```tsx
// components/mapping/StatusBadge.tsx
import React from 'react';
import { CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';

const statusConfig = {
  mapped: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: CheckCircle,
    color: 'text-emerald-600',
    label: 'Mapped',
  },
  flagged: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: AlertCircle,
    color: 'text-amber-600',
    label: 'Needs Review',
  },
  unmapped: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    icon: HelpCircle,
    color: 'text-slate-600',
    label: 'Unmapped',
  },
};

export default function StatusBadge({ 
  status: 'mapped' | 'flagged' | 'unmapped',
  count,
  percentage,
}: Props) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <div className={`${config.bg} border ${config.border} rounded-lg p-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`${config.color} w-5 h-5 flex-shrink-0`} />
          <div>
            <p className={`text-sm font-medium ${config.color}`}>
              {config.label}
            </p>
            <p className="text-2xl font-bold text-slate-900">{count}</p>
          </div>
        </div>
        {percentage !== undefined && (
          <div className="text-right">
            <p className="text-lg font-bold text-slate-900">{percentage}%</p>
            <p className="text-xs text-slate-600">of total</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 📋 Implementation Checklist

### Phase 3A: Data Layer Redesign (FIRST)
- [ ] Create new TypeScript types for course_mappings
- [ ] Create MappingSession interface
- [ ] Update extraction.service.ts to be read-only
- [ ] Create new mapping.service.ts for write operations
- [ ] Add database migration (create new collections)
- [ ] Add indexes for performance

### Phase 3B: Gemini System Redesign (SECOND)
- [ ] Create gemini-system.ts with improved prompt
- [ ] Create gemini-context-builder.ts
- [ ] Create gemini-validator.ts (pre-validation)
- [ ] Create gemini-response-validator.ts
- [ ] Update API endpoint to use new validators
- [ ] Add comprehensive logging

### Phase 3C: Component Redesign (THIRD)
- [ ] Install tailwind if not present
- [ ] Create component folder structure
- [ ] Build MappingWorkflow (main container)
- [ ] Build section components (Header, Config, Progress, Results)
- [ ] Build card/badge components
- [ ] Build control components
- [ ] Build table components
- [ ] Add responsive design

### Phase 3D: Integration (FOURTH)
- [ ] Update API endpoint to use new data model
- [ ] Add transaction support
- [ ] Update mapping-engine.ts to be read-only
- [ ] Create new mapping-processor.ts for logic
- [ ] Test with real extractions
- [ ] Monitor for errors

### Phase 3E: Safety Validation (FIFTH)
- [ ] Verify extractions are never modified
- [ ] Audit all Gemini API calls
- [ ] Test rollback on failure
- [ ] Load test performance
- [ ] Security review
- [ ] Deploy to staging

---

## 🔍 Risk Mitigation Summary

| Risk | Previous Design | New Design |
|------|-----------------|-----------|
| **Data Loss** | ❌ Overwrites extraction | ✅ Separate collections |
| **Audit Trail** | ❌ No history | ✅ Full session logging |
| **Rollback** | ❌ Impossible | ✅ Transaction support |
| **Validation** | ❌ Post-API only | ✅ Pre & post validation |
| **Gemini Errors** | ❌ Corrupts extraction | ✅ Logged separately |
| **Code Auditing** | ❌ Hard to trace | ✅ Every call logged |
| **Data Recovery** | ❌ Difficult | ✅ Original always pristine |
| **Compliance** | ❌ No audit trail | ✅ Full audit log |

---

## 📊 Expected Outcome

### After Redesign

**Data Safety:**
- ✅ Zero risk of corrupting extraction data
- ✅ Complete audit trail for compliance
- ✅ Easy to debug mapping errors
- ✅ Simple data recovery (keep old extractions)

**Technical Excellence:**
- ✅ Separation of concerns (extraction vs mapping)
- ✅ Scalable architecture (batch operations)
- ✅ Better error handling (transaction rollback)
- ✅ Improved monitoring (detailed logging)

**User Experience:**
- ✅ Beautiful Tailwind UI
- ✅ Clear step-by-step flow
- ✅ Real-time progress tracking
- ✅ Safe, visible data isolation

---

## 🚀 Next Steps

1. **Review this document** - Ensure alignment on approach
2. **Create new TypeScript types** - course_mappings, mapping_sessions
3. **Build API endpoint** - With transaction support
4. **Redesign Gemini prompts** - With better rules/constraints
5. **Build components** - Tailwind-based, modular
6. **Integration test** - End-to-end with real data
7. **Deploy** - To staging, then production

**This redesign prioritizes:**
- 🛡️ **Safety** - Data never at risk
- 🏗️ **Architecture** - Clean separation of concerns
- 📊 **Audit** - Complete traceability
- 💫 **UX** - Beautiful, modern interface
- ⚡ **Performance** - Optimized queries & processing

---

**Ready to proceed with this safer, more robust approach?**

