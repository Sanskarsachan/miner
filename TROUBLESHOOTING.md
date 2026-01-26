# Quick Troubleshooting Guide

## Issue: Still getting "Quota exceeded" (429 error)

### ✅ Solution 1: Wait for Quota Reset (Free Tier)
- **When**: You hit the 20-request daily limit
- **What happens**: Gemini API rejects further requests with 429 error
- **App behavior**: Auto-retries up to 3 times, then shows error message
- **Fix**: Wait until **UTC midnight** for quota to reset (or use a new day)
- **Time to wait**: Up to 24 hours depending on current UTC time
- **Cost**: Free

### ✅ Solution 2: Upgrade to Paid Tier (Recommended)
- **When**: You need to process large documents immediately
- **Benefit**: Unlimited API calls (10,000+ requests/minute)
- **Setup** (2 minutes):
  1. Go to https://ai.google.dev
  2. Click "Enable billing"
  3. Add your credit card
  4. Done! Your free tier automatically upgrades
- **Cost**: ~$15-20/month for typical use
- **Instant**: Changes take effect immediately

### ✅ Solution 3: Increase Chunk Sizes Further
- **When**: You want to extract more per API call
- **Edit**: `pages/courseharvester.js` line 180
- **Before**:
  ```javascript
  const batchSize = pages.length > 50 ? 7 : pages.length > 20 ? 5 : 3
  ```
- **After** (more aggressive):
  ```javascript
  const batchSize = pages.length > 50 ? 10 : pages.length > 20 ? 7 : 5
  ```
- **Impact**: Extracts ~30% more data per API call
- **Cost**: Free, but less granular progress updates
- **Runbook**:
  1. Edit the line above
  2. Save file
  3. Refresh your browser (Ctrl+R)
  4. Try extraction again

### ✅ Solution 4: Split Document Extraction Across Days
- **When**: Your document requires 20-25 API calls (exceeds limit)
- **Process**:
  - **Day 1**: Upload document, extract first 50% → stops at quota limit
  - **Day 2**: Upload same document, continue from where it stopped
  - **Day 3**: Extract final portion
- **Cost**: Free (spread usage across multiple days)
- **Requires**: Manual file upload multiple times
- **Note**: Future enhancement could cache results between sessions

---

## Issue: "Rate limited. Retrying in Xs..."

### ✅ This is Expected!
The app is working correctly:
1. Detected a rate limit (429 error)
2. Waiting for backoff time (1s, 2s, 4s, etc.)
3. Will automatically retry

**What to do**: Just wait! The UI shows countdown timer. App will continue automatically.

### If Retries Keep Failing
- This means you've truly hit the daily quota (all 20 requests used)
- See **Solution 1** or **Solution 2** above
- No further retries will succeed until quota resets

---

## Issue: Extraction Slow / Timeout

### ✅ Check if Due to Large PDF
- **Symptom**: Stuck on "Processing pages X-Y..."
- **Cause**: PDF.js is extracting text from large document
- **Normal wait**: 30 seconds to 2 minutes for 100+ page PDFs
- **What to do**: Wait longer before reloading

### ✅ Check if Due to API Rate Limit
- **Symptom**: "Rate limited. Retrying in Xs..."
- **This is expected**: See **"Rate limited" section** above
- **What to do**: Let it retry automatically

### ✅ Check if Browser Tab Inactive
- **Symptom**: Extraction paused unexpectedly
- **Cause**: Browser throttles background tabs
- **Fix**: Click on the CourseHarvester tab to make it active

### ✅ Check Browser Console for Errors
- **Open**: Press F12 → Click "Console" tab
- **Look for**: Red error messages starting with "Error"
- **Common errors**:
  - `Invalid API key` → Verify your Gemini API key
  - `CORS error` → Server issue, try refreshing page
  - `JSON parse error` → Gemini response format issue (try again)

---

## Issue: API Key Not Recognized

### ✅ Verify Your API Key Format
- Should be ~39 characters long
- Starts with letters/numbers
- No spaces before/after

### ✅ Check API Key is from Correct Project
1. Go to https://aistudio.google.com/app/apikey
2. Make sure you're logged in with correct Google account
3. Copy the key shown there
4. Paste into CourseHarvester

### ✅ Check Browser Console
1. Press F12 → Console tab
2. Click "Verify" button
3. Look for error message with details

### ✅ Try Creating a New API Key
1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Select project (or create new)
4. Copy new key
5. Paste into CourseHarvester

---

## Issue: Document Extracted Only Partial Data

### ✅ Check API Call Count
- Look at status bar: "Processing chunk 5/12..."
- If shows fewer chunks than expected, hit quota limit
- Upload same document tomorrow to continue (quota resets at UTC midnight)

### ✅ Try Extracting from Different File Format
- Sometimes PDF text extraction is imperfect
- Try converting PDF → DOCX (in Office) → Upload DOCX
- DOCX format often extracts cleaner text

### ✅ Check Document Quality
- Scanned PDFs (images) don't extract well → need OCR preprocessing
- Tables with complex formatting may not extract perfectly
- Nested structure may confuse extraction

### ✅ Increase Extraction Chunk Size
- See **Solution 3** above
- Larger chunks = more context for Gemini
- May improve accuracy

---

## Comparison: Free vs Paid Tier

| Feature | Free | Paid |
|---------|------|------|
| **Daily Request Limit** | 20 | Unlimited (10K+/min) |
| **Cost** | $0 | $0.075/M input tokens |
| **Cost Example** | 20 docs/day free | ~$10/month for 100 docs |
| **Best For** | Testing, prototyping | Production, large batches |
| **Time to Enable** | Instant | ~2 min (add credit card) |

---

## When to Upgrade to Paid

### 👍 Good Time to Upgrade If:
- Processing > 5 documents per day
- Need reliable automated extraction
- Building production service
- Can't wait for quota reset

### 👍 Not Necessary If:
- Processing < 3 documents per day
- Can spread work across multiple days
- Testing or learning
- Budget is very tight

---

## Contact & Support

If issues persist after trying above:

1. **Check GitHub Issues**: https://github.com/yourname/course-harvester/issues
2. **Check Gemini API Status**: https://status.cloud.google.com/
3. **Gemini API Docs**: https://ai.google.dev/docs
4. **Quota Management Guide**: See [QUOTA_MANAGEMENT.md](QUOTA_MANAGEMENT.md)

---

**Last Updated**: January 26, 2026  
**Status**: Quick troubleshooting guide for quota and extraction issues
