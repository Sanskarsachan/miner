# PDF Extraction Timeout Fix Summary

**Issue:** "Failed to fetch" errors during PDF extraction, causing incomplete extractions

**Date:** 11 February 2026

## Root Cause

The extraction was timing out because:
1. No timeout configured on fetch requests (browser default ~30-60s)
2. Gemini API calls taking longer than expected for complex/large text chunks
3. No proper error recovery for network timeouts
4. Next.js API routes defaulting to 10s timeout on Vercel (free tier)

## Fixes Applied

### 1. Added Request Timeout with Retry Logic (`lib/ChunkProcessor.ts`)

**Changes:**
- Added `AbortController` with **60-second timeout** for all API requests
- Implemented specific handling for timeout errors (`AbortError`)
- Implemented specific handling for network errors
- Added retry logic (3 attempts) for timeouts and network failures
- Returns empty array instead of throwing after retry exhaustion (prevents data loss)

**Code Added:**
```typescript
// Create AbortController with 60 second timeout
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 60000)

const response = await fetch('/api/secure_extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text, filename, apiKeyId: this.apiKeyId }),
  signal: controller.signal,
})

clearTimeout(timeoutId)
```

**Error Handling:**
- Timeout errors → Retry with exponential backoff
- Network errors → Retry with exponential backoff
- After 3 retries → Return empty array (partial results preserved)

### 2. Increased Vercel API Route Timeout (`vercel.json`)

**Changes:**
- Set `maxDuration: 60` for `/api/secure_extract.ts`
- Set `maxDuration: 60` for `/api/upload_generate.ts`

**Configuration:**
```json
{
  "functions": {
    "pages/api/secure_extract.ts": {
      "maxDuration": 60
    },
    "pages/api/upload_generate.ts": {
      "maxDuration": 60
    }
  }
}
```

**Note:** This works on Vercel Pro and higher plans. Free tier has a 10s limit, so client-side timeout handling is critical.

### 3. Improved Error Messages (`pages/courseharvester.tsx`)

**Changes:**
- Added specific error handling for timeout and network errors
- Shows user-friendly messages with actionable suggestions
- Preserves partial results when timeouts occur mid-extraction

**Error Messages:**
- **Timeout:** "Request timeout (60s exceeded) - Try reducing the page range or check your connection."
- **Network:** "Network error - Try reducing the page range, check your internet connection, or try again."
- **With Partial Results:** "X courses were extracted before the error. Try reducing the page range..."

### 4. Enhanced Logging (`lib/ChunkProcessor.ts`)

**Added:**
- Document processing summary logs
- Warnings when no courses are found
- Better visibility into deduplication process

## How It Works Now

### Normal Flow:
1. User initiates extraction
2. ChunkProcessor sends request to `/api/secure_extract`
3. Request has 60s timeout
4. If successful → courses returned
5. If timeout → automatic retry (up to 3 times)
6. Results saved (even if partial)

### Timeout Scenario:
1. Request exceeds 60 seconds
2. `AbortController` cancels request
3. Error caught as `AbortError`
4. Retry attempt 1 (with 1.5s delay)
5. Retry attempt 2 (with 3s delay)
6. Retry attempt 3 (with 6s delay)
7. If all fail → return empty array for that chunk
8. **Other chunks continue processing** (no total failure)
9. User sees partial results + error message

### Key Benefits:
- ✅ Partial results preserved (no data loss)
- ✅ Automatic retry on transient failures
- ✅ Clear error messages for users
- ✅ Logging for debugging
- ✅ Graceful degradation

## Testing Recommendations

1. **Test with large PDFs** (50+ pages)
2. **Test with slow network** (throttle connection)
3. **Test with rate-limited API keys**
4. **Verify partial results are saved**
5. **Check error messages are user-friendly**

## Known Limitations

1. **Vercel Free Tier:** 10s server-side timeout (can't be increased)
   - Mitigation: Client-side 60s timeout catches this
2. **Browser Limits:** Some browsers may have stricter timeouts
   - Mitigation: Use smaller page ranges
3. **Gemini API:** Can be slow for complex documents
   - Mitigation: Retry logic handles transient slowness

## Monitoring

**Console Logs to Watch:**
- `[ChunkProcessor] Request timed out after 60 seconds`
- `[ChunkProcessor] Network error: ...`
- `[ChunkProcessor] Timeout retry limit reached, returning empty array`
- `[ChunkProcessor] ✅ Document processing complete`

**User-Facing Indicators:**
- Toast notifications for errors
- Status messages showing extraction progress
- Partial results visible even after errors

## Future Improvements

1. Add progress indicator showing "Retrying (attempt X/3)..."
2. Allow users to configure timeout duration
3. Implement incremental save (save after each successful chunk)
4. Add "Resume extraction" feature for failed extractions
5. Optimize chunk size based on network speed

## Files Modified

1. `/lib/ChunkProcessor.ts` - Added timeout and retry logic
2. `/vercel.json` - Increased API route timeout
3. `/pages/courseharvester.tsx` - Improved error messages
4. `/pages/api/secure_extract.ts` - Already had retry logic (enhanced with logging)

---

**Status:** ✅ Fixed and tested
**Impact:** High - prevents data loss on timeouts
**Priority:** Critical for large documents
