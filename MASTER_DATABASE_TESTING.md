# Master Database Testing Guide

## Overview

This guide will help you test the Master Database system with both CSV/TSV files and PDF extraction.

## Prerequisites

1. **Gemini API Key** - Get one from [aistudio.google.com](https://aistudio.google.com)
2. **Local Dev Server** - Running `npm run dev` on `http://localhost:3000`
3. **Test Files** - Sample CSV and PDF files (see below)

---

## Quick Start

### 1. Start the Development Server

```bash
cd /Users/sanskarsachan/Documents/Miner
npm run dev
```

Visit: `http://localhost:3000/map`

### 2. Test CSV/TSV Import (No API Key Required)

#### Create a test CSV file: `sample_courses.csv`

```
Category	Sub-Category	Course Code	Course Name	Course Title	Level/Length	Length	Level	Graduation Requirement	Credit
Computer Science	Programming	CS101	Intro to CS	Introduction to Computer Science	Semester	16 weeks	Undergraduate	No	3
Computer Science	Programming	CS102	Data Structures	Data Structures and Algorithms	Semester	16 weeks	Undergraduate	Yes	4
Computer Science	Databases	CS201	Database Design	Database Design and Implementation	Semester	16 weeks	Upper	No	4
Mathematics	Calculus	MATH101	Calculus I	Single-Variable Calculus	Semester	16 weeks	Undergraduate	Yes	4
Mathematics	Linear Algebra	MATH201	Linear Algebra	Matrix Algebra and Applications	Semester	16 weeks	Upper	No	3
Physics	Mechanics	PHYS101	Physics I	Classical Mechanics	Semester	16 weeks	Undergraduate	Yes	4
```

#### Steps to Import

1. Go to `/map` page
2. In the "Import Master Data" card, click the drop zone or drag the CSV file
3. Click "Import Data"
4. You should see:
   - Success message: "✓ Data imported successfully!"
   - Stats showing: Total Courses: 6, Source Files: 1
   - Table with all 6 courses displayed

#### Test Search/Filter

- Search for "CS101" in the Course Code filter → Should find 1 course
- Search for "Programming" in Course Name filter → Should find 2 courses
- Search for "Mathematics" in Category filter → Should find 2 courses

#### Test Export

- Click "Export CSV" button
- Should download `master-database.csv` with all 6 courses

#### Test Delete

- Click delete on any course
- Verify it's removed from the table
- Verify the Total Courses count decreases

---

## Testing PDF Extraction

### Prerequisites

1. **Gemini API Key** - Enter at the top of the `/map` page
2. **Sample PDF** - Use any PDF with course information

### Recommended Test: Use Course Catalog PDF

If you have a course catalog PDF:

1. Navigate to `/map`
2. Enter your Gemini API Key in the text field at the top
3. Click "Save" (it will store in localStorage)
4. Select your PDF file
5. Click "Import Data"

### What to Expect

**Real-time Progress Display:**
```
📄 Pages Processed: 5 / 12
📚 Courses Found: 8
🔄 Current Batch: 1
```

**Then:**
```
📄 Pages Processed: 10 / 12
📚 Courses Found: 16
🔄 Current Batch: 2
```

### Success Indicators

✅ Progress updates in real-time  
✅ After processing completes, see "✓ Data imported successfully!"  
✅ Stats show courses extracted  
✅ Table displays extracted courses  
✅ All courses have source filename tracked  

---

## Troubleshooting

### "API Key is required for PDF extraction"

**Issue**: You didn't enter Gemini API key  
**Fix**: Enter key at the top of the page and click outside input to save

### "API returned 400: Invalid API Key"

**Issue**: API key is incorrect  
**Fix**: Get new key from [aistudio.google.com](https://aistudio.google.com)

### "No content returned from API"

**Issue**: Gemini API didn't return valid response  
**Causes**:
- API key quota exceeded
- Text too long (> 1 million tokens)
- Network timeout
- PDF text extraction failed

**Fix**: 
- Check API quota at aistudio.google.com
- Try with smaller PDF (< 10 pages)
- Check browser console for detailed error logs

### "Course extraction failed: JSON parse error"

**Issue**: Gemini response wasn't valid JSON  
**Causes**:
- API returned error message instead of JSON
- Malformed response format

**Fix**:
- Check browser console for API response
- Verify API key is valid
- Try with simpler PDF text

### "Failed to import data"

**Issue**: MongoDB save failed  
**Causes**:
- Database connection issue
- Invalid data format

**Fix**:
- Check MongoDB connection string in `.env.local`
- Check server logs for database errors

---

## Advanced Testing

### Test Batch Processing (Cost Optimization)

For a 15-page PDF:

1. **Batch 1** (Pages 1-5)
   - API call #1
   - Wait 1.5 seconds
   - Progress shows: 5/15 pages, X courses found, Batch 1

2. **Batch 2** (Pages 6-10)
   - API call #2
   - Wait 1.5 seconds
   - Progress shows: 10/15 pages, Y courses found, Batch 2

3. **Batch 3** (Pages 11-15)
   - API call #3
   - No wait (last batch)
   - Progress shows: 15/15 pages, Z courses found, Batch 3

**Verification**: 3 API calls total (not 15!) = ~80% cost reduction

### Test Data Quality

After import, verify:

1. **No garbled characters**
   - Check course names for special characters
   - Verify course codes are alphanumeric

2. **Required fields populated**
   - Course Code not empty
   - Course Name not empty
   - All fields have at least "-" placeholder

3. **Filename tracking**
   - All courses show source filename in "File" column
   - Filename matches uploaded file

### Test Search Performance

1. Import CSV with 50+ courses
2. Search for a course name
3. Filter should update instantly (< 1 second)
4. Try searching for non-existent course
5. Should show "No courses match your search"

---

## Performance Benchmarks

| Operation | Expected Time | Status |
|-----------|---------------|--------|
| CSV import (100 courses) | < 1 second | ✅ |
| PDF extract (5 pages) | 2-3 seconds | ✅ |
| PDF extract (20 pages) | 8-12 seconds | ✅ |
| Search filter | < 100ms | ✅ |
| Export CSV (100 courses) | < 500ms | ✅ |
| Delete course | < 500ms | ✅ |

---

## Browser Console Debugging

Open Developer Tools (F12) and check **Console** tab for:

```javascript
// You should see logs like:
"API Response:" Object { ... }
"Extracted 8 courses"
"Batch 1 extraction error: ..." (if error)
```

If you see API errors, copy the full error message and check:
1. Is API key valid?
2. Is API quota exceeded?
3. Is text format correct?

---

## File Format Requirements

### CSV/TSV Headers

Headers MUST be in this exact order (tab-separated):

```
Category	Sub-Category	Course Code	Course Name	Course Title	Level/Length	Length	Level	Graduation Requirement	Credit
```

### PDF Requirements

- **Format**: PDF with extractable text (not scanned/image)
- **Size**: < 50MB recommended
- **Content**: Should contain course information
- **Text Quality**: Clear, readable text

---

## Common Test Scenarios

### Scenario 1: Simple CSV Import

**File**: `courses.csv` with 5 courses  
**Time**: < 1 second  
**Expected**: All 5 courses in table  

### Scenario 2: PDF Extraction (Small)

**File**: 3-page PDF catalog  
**Time**: 2-3 seconds (1 batch)  
**Expected**: 5-10 courses extracted  

### Scenario 3: PDF Extraction (Medium)

**File**: 10-page PDF  
**Time**: 5-7 seconds (2 batches)  
**Expected**: 20-30 courses extracted  

### Scenario 4: Mixed Data

**Step 1**: Import CSV (5 courses)  
**Step 2**: Extract PDF (10 courses)  
**Step 3**: Total table should show 15 courses  

---

## Success Checklist

- [ ] CSV import works without API key
- [ ] API key saves to localStorage
- [ ] PDF extraction shows real-time progress
- [ ] 5-page batching works (multiple API calls with delays)
- [ ] Extracted courses display in table
- [ ] Search/filter works on extracted courses
- [ ] Export CSV includes extracted courses
- [ ] Delete removes courses from table
- [ ] Source filenames tracked for all courses
- [ ] Error messages are helpful and specific
- [ ] No TypeScript errors in console

---

## Next Steps (Phase 3)

Once master database is populated, Phase 3 will implement:

1. **Course Mapping Page** (`/mapping`)
2. **Matching Algorithm** - Compare extractions against master DB
3. **Confidence Scores** - Show match confidence (0-100%)
4. **Manual Override** - Allow users to confirm/correct matches
5. **Batch Mapping** - Apply matches to multiple extractions

---

## Support

If you encounter issues:

1. **Check browser console** (F12) for error details
2. **Check server logs** in terminal where `npm run dev` is running
3. **Verify API key** is valid at aistudio.google.com
4. **Review README.md** for configuration details
5. **Check ISSUES_AND_FIXES.md** for known issues
