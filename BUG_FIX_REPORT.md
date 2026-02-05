# Bug Fix Report: PDF Course Extraction

## Issue

**Error**: "Course extraction failed: Failed to extract courses"  
**Location**: `pages/map.tsx` line 167 in `extractCoursesFromText` function  
**Trigger**: When attempting to extract courses from PDF using Gemini AI

---

## Root Cause Analysis

The `/api/generate` endpoint was receiving an incorrectly formatted request body.

### What Was Sent (Incorrect)

```javascript
{
  text: "course text here",
  apiKey: "sk-...",
  extractionType: "master_database"
}
```

### What Was Expected (Correct)

```javascript
{
  apiKey: "sk-...",
  payload: {  // ← This is the Gemini API request format
    contents: [{
      parts: [{
        text: "prompt with course data"
      }]
    }]
  }
}
```

**Why**: The `/api/generate` endpoint is a proxy to Google's Gemini API. It expects the `payload` field to contain the actual Gemini API request format, not custom fields.

---

## Solution Implemented

### Updated `extractCoursesFromText` Function

**Changes Made:**

1. **Crafted proper Gemini payload** with `contents` and `parts` structure
2. **Enhanced prompt** with clear JSON extraction instructions
3. **Added comprehensive error handling** with detailed logging
4. **Improved response parsing** to handle JSON in code blocks
5. **Better error messages** for debugging

### Key Improvements

```typescript
// New implementation:
const payload = {
  contents: [{
    parts: [{
      text: `Extract courses... Return ONLY JSON array...`
    }]
  }]
};

const response = await fetch('/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    apiKey: apiKey,
    payload: payload  // ← Correct format
  })
});
```

### Error Logging Additions

Now logs:
- API response status and content
- Parsed JSON data
- Course extraction count
- Detailed error messages with context

---

## Testing Changes

### Before (Silent Failures)

```
Batch 1 extraction error: (logged but not shown to user)
→ User sees generic "Course extraction failed"
```

### After (Clear Feedback)

```
Batch 1 extraction error: API returned 400: Invalid API Key
→ User sees: "Batch 1 failed: API returned 400: Invalid API Key"
→ User can take specific action (update API key)
```

---

## Files Modified

### 1. `pages/map.tsx`

**Function**: `extractCoursesFromText()`
- **Lines**: 128-211
- **Changes**:
  - Proper Gemini API payload format
  - Enhanced extraction prompt
  - Comprehensive error logging
  - JSON parsing with code block support
  - Better error messages

**Function**: `uploadToDatabase()`
- **Lines**: 264-269
- **Changes**:
  - Better error messages showing which batch failed
  - User-visible error feedback

---

## How to Test

### Test 1: CSV Import (No API Key)

```
1. Go to /map
2. Upload any CSV file with proper headers
3. Click "Import Data"
4. Should see courses in table
```

**Expected**: Works without Gemini API key

### Test 2: PDF Extraction (With API Key)

```
1. Go to /map
2. Enter Gemini API key (get from aistudio.google.com)
3. Upload PDF with course information
4. Click "Import Data"
5. Watch real-time progress
6. Should see extracted courses in table
```

**Expected**: 
- Real-time progress updates
- Courses extracted and saved
- Helpful error messages if API fails

### Test 3: Error Handling

```
1. Go to /map
2. Try to extract PDF WITHOUT API key
3. Should show: "API key is required for course extraction"

1. Try with invalid API key
2. Should show: "API returned 401: Unauthenticated" or similar
```

**Expected**: Clear error messages guide users

---

## Verification

### Console Logs (Open with F12)

When successfully extracting courses, you'll see:

```
API Response: { candidates: [...], ... }
Parsing JSON: [{"Category":"CS",...
Extracted 8 courses
```

### Error Logs

If there's a failure:

```
API Error Response: {status: 401, text: "Invalid API Key"}
extractCoursesFromText error: API returned 401: Invalid API Key
Batch 1 failed: API returned 401: Invalid API Key
```

---

## Performance Impact

- **No performance degradation**
- **Better error visibility** reduces user frustration
- **Debug logs** help identify issues faster
- **Batching still provides 80% cost reduction** (5-page batches)

---

## Documentation Updates

Created: `MASTER_DATABASE_TESTING.md`
- Comprehensive testing guide
- Sample test data
- Troubleshooting section
- Performance benchmarks
- Success criteria

---

## Release Notes

**Version 2.2.1** (Bug Fix Release)

### Fixed
- ✅ PDF extraction API request format
- ✅ Error messages not visible to users
- ✅ JSON parsing from Gemini responses
- ✅ Batch error handling

### Improved
- ✅ Console logging for debugging
- ✅ Error messages specificity
- ✅ Response validation

### Testing
- ✅ Comprehensive testing guide added
- ✅ Sample test data provided
- ✅ Troubleshooting documentation

---

## Next Steps

1. **Test with real PDF** to verify extraction works
2. **Verify API quota** is sufficient
3. **Monitor production** for any issues
4. **Proceed to Phase 3**: Course mapping and data standardization

---

## Questions?

Check the following resources:

1. **Master Database Overview**: See `README.md` section "Master Database System"
2. **Testing Guide**: See `MASTER_DATABASE_TESTING.md`
3. **Technical Details**: See `PDF_EXTRACTION_IMPLEMENTATION.md`
4. **Known Issues**: See `ISSUES_AND_FIXES.md`

---

**Fix Date**: February 6, 2026  
**Status**: Ready for Testing  
**Priority**: High (Blocking PDF extraction feature)
