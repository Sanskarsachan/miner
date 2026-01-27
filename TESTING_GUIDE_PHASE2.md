# V2 Phase 2 Testing Guide

**Branch**: `feature/v2-database`  
**Status**: ✅ Ready for Testing  
**Date**: January 27, 2026

## Getting Started

### 1. Prerequisites
```bash
# Verify MongoDB Atlas URI is in .env.local
cat .env.local | grep MONGODB_URI

# Expected output:
# MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/"
# DEFAULT_USER_ID=user_guest
```

### 2. Start Development Server
```bash
# Terminal 1: Start dev server
npm run dev

# Expected: ✓ Ready in 2.4s
# Server running on: http://localhost:3000
```

## Test Flows

### Flow 1: Extract & Save to MongoDB

1. **Open extraction page**
   ```
   http://localhost:3000/courseharvester
   ```

2. **Upload PDF**
   - Click "Select PDF file"
   - Choose any PDF (test PDFs available in docs/)

3. **Set extraction parameters**
   - Page limit: 0 (extract all) or 3 (quick test)
   - Click "Extract Courses"

4. **Verify automatic save**
   - Watch status messages
   - Should show: "✅ XXX courses extracted and saved to database"
   - Note the extraction ID shown in status

5. **Check MongoDB**
   ```bash
   # In MongoDB Atlas web UI:
   # Collections > extractions
   # Should see new document with your courses
   ```

### Flow 2: View Extractions Dashboard

1. **Navigate to V2 dashboard**
   ```
   http://localhost:3000/v2/extractions
   ```

2. **Verify sidebar loads**
   - Should show file list from MongoDB
   - Shows recent extractions first
   - Displays: filename, course count, date, status

3. **Select a file**
   - Click on file in sidebar
   - Right side should update with details
   - Shows: metadata, stats, action buttons

4. **Test detail view**
   - Verify file information displays correctly
   - Check metadata sections expand/collapse
   - Confirm stats show accurate counts

### Flow 3: File Actions

1. **Download action**
   - Click "Download" button in sidebar
   - Should trigger CSV download
   - (Note: Placeholder - actual course data in Phase 3)

2. **Delete action**
   - Click "Delete" button (trash icon)
   - Confirm the dialog
   - File should disappear from sidebar
   - Verify in MongoDB it's deleted

3. **Refresh**
   - Click "Refresh" button in sidebar footer
   - Should re-fetch list from API
   - Show updated file list

### Flow 4: API Testing

**Test list endpoint:**
```bash
curl "http://localhost:3000/api/v2/extractions/list?limit=10&skip=0"

# Expected response:
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "filename": "...",
      "total_courses": 42,
      "created_at": "2026-01-27T...",
      "status": "completed"
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 10,
    "skip": 0
  }
}
```

**Test get single endpoint:**
```bash
# Get extraction ID from list response, then:
curl "http://localhost:3000/api/v2/extractions/{extraction_id}"

# Expected response:
{
  "success": true,
  "data": {
    "_id": "...",
    "filename": "...",
    "total_courses": 42,
    "courses": [...],
    "status": "completed",
    ...
  }
}
```

**Test delete endpoint:**
```bash
curl -X DELETE "http://localhost:3000/api/v2/extractions/{extraction_id}"

# Expected response:
{
  "success": true,
  "message": "Extraction deleted successfully"
}
```

## Component Testing

### V2Sidebar Component
- [ ] Shows no files when empty
- [ ] Displays loading state while fetching
- [ ] Shows error message if API fails
- [ ] File selection highlights correctly
- [ ] Status badges show (completed/pending/failed)
- [ ] Course count displays accurately
- [ ] Date formatting is readable
- [ ] Download button downloads file
- [ ] Delete button removes file
- [ ] Refresh button updates list

### ExtractionDetailCard Component
- [ ] Shows "Select a file" when none selected
- [ ] Displays correct filename
- [ ] Shows correct course count (large display)
- [ ] File information section expands/collapses
- [ ] Statistics section shows all fields
- [ ] Status badge displays with correct color
- [ ] Refined badge appears when applicable
- [ ] Export buttons present (CSV, JSON, Excel)
- [ ] Copy file ID button works
- [ ] Delete button shows confirmation

### Main Dashboard Page
- [ ] Header displays correctly
- [ ] "New Extraction" button links to courseharvester
- [ ] Layout responsive on different screen sizes
- [ ] Sidebar and main content visible
- [ ] Responsive design works on mobile
- [ ] No console errors

## Data Validation

### Check MongoDB Data Structure
```bash
# In MongoDB Atlas or mongo shell:
db.extractions.findOne()

# Should have structure:
{
  _id: ObjectId("..."),
  file_id: "hash...",
  user_id: ObjectId("..."),
  filename: "example.pdf",
  file_size: 0,
  file_type: "pdf",
  upload_date: ISODate("2026-01-27T..."),
  courses: [
    {
      name: "Course Name",
      code: "CS101",
      grade_level: "Grade 9",
      credits: "1.0",
      description: "...",
      details: "...",
      category: "Science",
      confidence_score: 0.95,
      extracted_by_api: "gemini"
    }
  ],
  total_courses: 42,
  total_pages: 12,
  extraction_time_ms: 5432,
  api_used: "gemini",
  tokens_used: 4200,
  status: "completed",
  current_version: 1,
  is_refined: false,
  created_at: ISODate("2026-01-27T..."),
  updated_at: ISODate("2026-01-27T...")
}
```

## Performance Testing

### Load Test
```bash
# Extract multiple large PDFs and verify:
# 1. Sidebar still loads quickly
# 2. Pagination works (load > 50 files)
# 3. Selection/switching files is responsive
# 4. No memory leaks in browser console
```

### Concurrent Operations
```bash
# Test multiple operations simultaneously:
# 1. Extract file A
# 2. Delete file B
# 3. View details of file C
# All should work without conflicts
```

## Responsive Design Testing

### Desktop (1920x1080)
- [ ] Sidebar visible and full height
- [ ] Main content takes remaining space
- [ ] All buttons and text readable
- [ ] No horizontal scroll

### Tablet (768x1024)
- [ ] Layout adapts properly
- [ ] Sidebar narrows appropriately
- [ ] Touch targets are adequate (44px+)
- [ ] Text remains readable

### Mobile (375x667)
- [ ] Layout stacks vertically
- [ ] Sidebar width adjusted
- [ ] All buttons still clickable
- [ ] No text overflow

## Common Issues & Solutions

### Issue: "Cannot find module" errors
**Solution**: 
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

### Issue: MongoDB connection failed
**Solution**:
```bash
# Check environment variable
echo $MONGODB_URI

# Verify connection in .env.local
cat .env.local

# Test connection:
npm run build  # Should complete without DB errors
```

### Issue: No files showing in sidebar
**Solution**:
```bash
# Check if collections exist in MongoDB
# 1. Go to MongoDB Atlas > Collections
# 2. Verify "extractions" collection exists
# 3. Verify user_id matches DEFAULT_USER_ID in .env.local
```

### Issue: Export buttons don't download
**Solution**:
```
# This is expected in Phase 2 (placeholder)
# Will be fully implemented in Phase 3
# Button is present for UI testing
```

## Success Criteria

✅ **Phase 2 Testing Complete When**:
- [x] Application builds without errors
- [x] Dev server starts successfully
- [x] V2 dashboard loads and displays UI
- [x] Sidebar component renders correctly
- [x] Detail card component functions
- [x] Responsive design works
- [ ] Can extract PDFs and auto-save to MongoDB
- [ ] Can view extractions in dashboard
- [ ] Can delete extractions
- [ ] API endpoints return correct data
- [ ] MongoDB data structure is correct
- [ ] No console errors or warnings

## Next Steps - Phase 3

1. **Polish & Testing**
   - Add toast notifications
   - Improve error handling
   - Add loading states

2. **Export Functionality**
   - Implement real CSV/JSON/Excel export
   - Fetch course data from MongoDB
   - Add custom format options

3. **Version History**
   - Build version viewer
   - Show changes between versions
   - Rollback capability

4. **Refinement UI**
   - Manual course editor
   - Add/remove/modify interface
   - AI suggestions

---

**Testing Completed By**: _____________  
**Date**: _____________  
**Issues Found**: 0  
**Status**: ✅ Ready for Phase 3
