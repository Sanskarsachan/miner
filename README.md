# CourseHarvester 🎓

A powerful, client-side web application that extracts structured course data from curriculum documents using Google Gemini AI. Process PDFs, Word docs, PowerPoint presentations, HTML, and text files with intelligent chunking and incremental results.

![Next.js](https://img.shields.io/badge/Next.js-13-black)
![React](https://img.shields.io/badge/React-18-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Features ✨

- **Multi-Format Support**: Extract from PDF, DOCX, PPTX, HTML, HTM, TXT
- **Client-Side Processing**: All file extraction happens in the browser—your data never leaves your machine
- **Intelligent Chunking**: Automatically splits large documents into manageable chunks to prevent API timeouts
- **Live Results**: See extracted courses appear in real-time as each chunk is processed
- **Dual Interface**: 
  - Standalone HTML app (`public/courseharvester.html`) for quick deployments
  - Full Next.js React app (`pages/courseharvester.js`) for integrated workflows
- **Smart Parsing**: Robust JSON extraction that tolerates imperfect Gemini responses
- **Export Data**: Download results as CSV or JSON
- **Token Tracking**: Monitor estimated token usage for cost awareness
- **API Key Management**: Secure localStorage support with optional encryption
- **Debug Panel**: Inspect raw Gemini responses for troubleshooting
- **Responsive Design**: Beautiful modern UI that works on mobile and desktop

## Quick Start 🚀

### Prerequisites

- Node.js 16+ and pnpm (or npm/yarn)
- Free Google Gemini API key from [aistudio.google.com](https://aistudio.google.com/app/apikey)

### Installation

```bash
git clone <your-repo-url>
cd course-harvester
pnpm install
pnpm dev
```

The app will be available at http://localhost:3001

### Get Your Gemini API Key

1. Visit [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy your API key
4. Paste it in the CourseHarvester app and click "Verify"

## Usage 📖

1. **Open the App**: http://localhost:3001/courseharvester
2. **Add Your API Key**: Paste and click "Verify"
3. **Upload a Document**: Drag & drop or click to select (PDF, DOCX, PPTX, HTML, TXT)
4. **Extract Courses**: Click "Extract Courses"
5. **Export Results**: Download as CSV or JSON

## Architecture 🏗️

### Project Structure

```
course-harvester/
├── pages/
│   ├── index.js                    # Landing page
│   ├── courseharvester.js          # React app (polished UI)
│   └── api/
│       ├── generate.js             # Proxies text→Gemini
│       ├── upload_generate.js      # Proxies binary→Gemini
│       ├── upload_file.js          # Multipart upload (experimental)
│       └── list_models.js          # Lists Gemini models
├── public/
│   └── courseharvester.html        # Standalone app
├── package.json
├── next.config.js
├── vercel.json
└── README.md
```

### How It Works

**File Extraction (Client-Side)**
- PDF: PDF.js extracts text page-by-page
- Word (DOCX): Mammoth.js extracts text
- PowerPoint (PPTX): Converted to base64, sent inline
- HTML/TXT: Native FileReader API

**Intelligent Chunking**
- PDF: Batches 3 pages per API call
- Text: Splits into ~20KB chunks
- PPTX: Sent as single inline_data request

**Gemini Integration**
- Uses `models/gemini-2.5-flash`
- Processes each chunk with refined extraction prompt
- Captures raw responses for debugging

**JSON Parsing**
- Extracts first valid JSON array from response
- Tolerates Gemini preambles or extra text
- Falls back gracefully if parsing fails

**Results Display**
- Appends courses to table immediately after each chunk
- Shows extraction progress and token usage
- Supports search, sort, and export

### Data Flow

```
User Document
    ↓
Client-Side Extraction (PDF.js, Mammoth, FileReader)
    ↓
Intelligent Chunking (by pages or character count)
    ↓
Gemini API via Serverless Proxy (/api/generate)
    ↓
Robust JSON Extraction (bracket-depth matching)
    ↓
Live UI Update (append to table, update stats)
```

## Improving Extraction Accuracy 🎯

### 1. Enhanced Prompt Engineering

Add context-aware instructions to the extraction prompt:

```javascript
buildPrompt(content) {
  return `
    Extract course information from Florida school curriculum.
    Return ONLY valid JSON array. Each course must have:
    - Category: Subject/department
    - CourseName: Official course name
    - GradeLevel: Target grade(s)
    - Length: Duration (semester/year/hours)
    - Prerequisite: Required courses
    - Credit: Credit hours
    - CourseDescription: Full description
    
    Rules:
    1. If a field is missing, use null
    2. Preserve original formatting for descriptions
    3. Do NOT invent missing data
    4. Return ONLY [ ... ] with NO markdown or preamble
  `
}
```

### 2. Validation Layer

Filter out invalid extractions:

```javascript
function validateCourse(course) {
  return course.CourseName && course.Category
}

const validCourses = parsed.filter(validateCourse)
```

### 3. Retry Logic with Exponential Backoff

Handle transient API failures:

```javascript
async function robustGeminiCall(chunk, apiKey, attempt = 1) {
  try {
    return await processChunk(chunk)
  } catch (err) {
    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
      return robustGeminiCall(chunk, apiKey, attempt + 1)
    }
    throw err
  }
}
```

### 4. Semantic Chunking

Split by section headers instead of fixed character count:
- Reduces mid-course splits that confuse the model
- Preserves section context in prompts

### 5. Model Selection

Use appropriate model for your use case:

```javascript
const models = {
  fast: 'models/gemini-2.5-flash',
  accurate: 'models/gemini-1.5-pro'
}
```

### 6. Deduplication & Merging

Remove duplicate courses from multiple chunks:

```javascript
function mergeCourses(allCourses) {
  const seen = new Map()
  return allCourses.filter(c => {
    const key = `${c.CourseName}_${c.Category}`
    if (seen.has(key)) return false
    seen.set(key, true)
    return true
  })
}
```

## Deployment 🚀

### Deploy to Vercel

```bash
git push origin main
```

Then import your GitHub repo to [vercel.com](https://vercel.com). It will auto-deploy.

### Deploy to Other Platforms

- **Netlify**: Copy `public/courseharvester.html` to static site
- **AWS S3**: Host the standalone HTML
- **Docker**: Build container image and deploy

## Troubleshooting 🔧

| Issue | Solution |
|-------|----------|
| "Invalid JSON response" | Check debug panel; Gemini may include markdown |
| "API Key not found" | Verify key at aistudio.google.com; click "Verify Key" |
| Extraction is slow | Large PDFs are chunked automatically (costs tokens) |
| Results look incomplete | Some courses may be missed if Gemini output is malformed |

## API Quota & Pricing 💰

### Free Tier (Gemini API)
- **20 requests per day** limit per model
- **2 concurrent requests** allowed
- **Perfect for**: Testing, prototyping, small batches (< 5 documents/day)

### Paid Tier (Recommended)
- **Unlimited requests** (10,000+ RPM)
- **~$15-20/month** estimated cost for typical use
- See [QUOTA_MANAGEMENT.md](QUOTA_MANAGEMENT.md) for pricing details and optimization strategies

### Important: How Chunking Reduces API Calls
The app automatically increases chunk sizes to reduce API calls needed:

| Document Size | API Calls (Free Tier) | Result |
|---|---|---|
| Small (20 pages) | 4-7 calls | ✅ Under limit |
| Medium (50 pages) | 8-10 calls | ✅ Under limit |
| Large (80 pages) | 12-15 calls | ✅ Under limit |
| Very Large (180 pages) | 15-20 calls | ⚠️ Approaching limit |

**Example**: A 180-course, 80-page curriculum document that previously required 27 API calls (exceeding free tier) now needs only 12-15 calls with intelligent chunking.

### Auto-Retry on Rate Limit
If you hit the 20-request limit, the app will:
1. ✅ Automatically detect the rate limit (429 error)
2. ✅ Retry with exponential backoff (up to 3 times)
3. ✅ Show countdown timer in the UI
4. ⏰ If still limited, wait until tomorrow (quota resets at UTC midnight) or upgrade to paid

**For detailed quota management strategies**, see [QUOTA_MANAGEMENT.md](QUOTA_MANAGEMENT.md)

## Known Limitations

1. **Free tier**: Limited to 20 API calls per day (see above for optimization strategies)
2. **Large PDFs** (100+ pages): Chunked automatically to stay under quota (token usage increases)
3. **Scanned PDFs**: Require OCR preprocessing (not included)
4. **Complex layouts**: Tables with nested structures may not extract perfectly
5. **PPTX files**: Inline data limited to ~20MB file size

## Next Steps

- [ ] Add OCR support for scanned PDFs
- [ ] Implement semantic chunking
- [ ] Add confidence scoring per course
- [ ] Batch processing for multiple documents
- [ ] Web API for programmatic access
- [ ] Server-side caching

## License

MIT License - See LICENSE file for details

## Contributing

1. Fork the repo
2. Create a feature branch
3. Commit with clear messages
4. Open a Pull Request

---

**Built with ❤️ using Next.js, React, and Google Gemini AI**
