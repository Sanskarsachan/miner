# Secondary AI Mapping - Quick Start Guide

## 🎯 What Is It?

A new optional workflow that lets you:
- Run Gemini-powered AI cleaning + mapping on any extraction
- Compare AI suggestions with your primary mapping
- Learn from differences without overwriting anything

## ✨ Key Features

✅ **Safe** - Never touches primary mapping  
✅ **Optional** - Can be ignored completely  
✅ **Reversible** - Can be deleted anytime  
✅ **Auditable** - All changes are timestamped and logged  
✅ **Isolated** - Completely separate code path  

## 🚀 How to Use

### 1. On `/map` Page

Find the **"On-Demand AI Mapping (Secondary)"** card (green, with ⚡ icon)

### 2. Click "Enable AI Mapping"

A panel will expand with:
- Extraction ID input field
- "Run AI Mapping" button
- Results display

### 3. Enter Extraction ID

```
Get this from /extractions page → Click "Info" → Copy ID
```

Example: `507f1f77bcf86cd799439011`

### 4. Click "✨ Run AI Mapping"

The system will:
1. Fetch your extraction
2. Get master catalog
3. Call Gemini to suggest mappings
4. Store results in extraction document
5. Show comparison view

### 5. View Results

Modal opens with:
- **Statistics**: Total, primary mapped, AI suggested, high confidence
- **Filter**: Show only courses with different results
- **Comparison Cards**: Side-by-side primary vs AI for each course
- **Details**: Why AI made each suggestion, alternatives, confidence scores

## 📊 What You See

### Statistics Dashboard
```
┌─────────────────────────────────────────────────┐
│ Total Courses: 45                               │
│ Primary Mapped: 42  │  AI Suggested: 40        │
│ Both Found: 38      │  AI High Conf (≥85%): 35 │
└─────────────────────────────────────────────────┘
```

### Comparison Card (Per Course)
```
Original Course: "Introduction to Biology"
Original Code: [blank]

┌─ PRIMARY MAPPING ─┬─ AI SUGGESTION ──────┐
│ 2000310          │ 2000310              │
│ Biology 1        │ Biology 1            │
│ Status: mapped   │ Cleaned: Biology I   │
│ Confidence: 85%  │ Confidence: 92%      │
│ [Use This]       │ [Use This]           │
└──────────────────┴──────────────────────┘

Reasoning: "Exact match for introductory biology course"

Alternative Suggestions:
- 2000320 (Biology 1 Honors) - 45%
```

## 🎯 What to Do With Results

### If codes MATCH (same course code)
✅ Great! Both methods agree  
→ Keep primary mapping (it's already applied)  
→ Can note that AI also suggests this

### If codes DIFFER
⚠️ Interesting! Methods disagree  
→ Read AI reasoning
→ Check confidence scores
→ Review alternative suggestions
→ Decide which is better
→ Manually update primary mapping if needed

### If ONLY AI found a match
🤔 AI found something primary missed  
→ Read reasoning
→ Check if confidence is high (≥85%)
→ Consider if it's a valid suggestion
→ Could improve primary mapping rules

### If ONLY Primary found a match
✅ Good! Primary is working  
→ Note what made it work
→ Primary mapping is already applied

## 💡 Use Cases

### Learning
"How does AI approach course mapping differently than my rules?"

### Validation
"Are my primary mapping rules working correctly?"

### Discovery
"What courses is AI suggesting that I'm missing?"

### Improvement
"Can I improve primary mapping based on AI suggestions?"

### Analysis
"What patterns emerge from comparing both approaches?"

## ⚙️ Technical Details

### Data Storage
```javascript
extraction.courses[0] = {
  name: "Introduction to Biology",
  // ... other fields ...
  
  // NEW: Secondary mapping results
  secondaryMapping: {
    cleanedTitle: "Biology 1",
    suggestedCode: "2000310",
    confidence: 92,
    reasoning: "Exact match...",
    aiModel: "gemini-2-flash",
    runAt: "2026-02-06T14:30:00Z"
  }
}
```

### API Endpoint
```
POST /api/v2/ai-remap

Request:
{
  "extractionId": "507f1f77bcf86cd799439011",
  "courseIds": ["optional_filter"],
  "dryRun": false
}

Response:
{
  "success": true,
  "stats": { ... },
  "results": [ ... ]
}
```

## 🛡️ Safety Guarantees

✅ **No data loss** - Original extraction never deleted  
✅ **No overwrites** - Primary mapping never modified  
✅ **No master catalog changes** - Only reads master database  
✅ **Fully reversible** - Can delete secondary mapping anytime  
✅ **Isolated** - Separate code path, doesn't affect primary logic  
✅ **Auditable** - All changes timestamped with AI model name  

## ❌ What NOT to Expect

❌ **NOT automatic** - Results don't replace primary mapping  
❌ **NOT perfect** - AI is suggestive, not definitive  
❌ **NOT fast** - Gemini API calls take a few seconds  
❌ **NOT free** - Uses Gemini API (~$0.01-0.02 per extraction)  
❌ **NOT mandatory** - Can ignore feature completely  

## 🔧 Troubleshooting

### "API key is required"
→ Paste your Gemini API key in the input field above  
→ Get one from aistudio.google.com  

### "Extraction not found"
→ Check extraction ID is correct  
→ Copy from /extractions page  

### "Master catalog is empty"
→ Import courses first using the "Import Master Data" card  

### "API rate limit exceeded"
→ Wait a minute and try again  
→ Gemini has rate limits, try again later  

### No suggestion generated for a course
→ AI couldn't find good match  
→ Check course name/description quality  
→ Try improving extracted data  

## 📈 Success Indicators

✅ You see `secondaryMapping` field in results  
✅ Comparison view loads without errors  
✅ Statistics dashboard shows counts  
✅ Confidence scores are reasonable (0-100%)  
✅ Reasoning field is not empty  
✅ No database errors in console  

## 📊 Example Workflow

```
1. Import 50 courses into master database ✓
2. Upload extraction with 45 courses ✓
3. Primary mapping runs, maps 40 courses ✓
4. On /map page, find secondary mapping card
5. Enter extraction ID
6. Click "Run AI Mapping"
7. Wait 10-30 seconds for Gemini...
8. Click "View Comparison"
9. See:
   - Primary mapped: 40 courses
   - AI suggested: 38 courses
   - Both found same: 35 courses
   - AI found different: 3 courses
   - AI missed: 2 courses
10. Review differences
11. Decide on next steps
12. (Optional) Adjust primary mapping rules
```

## 📚 Learn More

See: `SECONDARY_AI_MAPPING_IMPLEMENTATION.md`

For detailed architecture, testing, and configuration.

---

**Last Updated**: February 6, 2026  
**Quick Reference**: 2 min read  
**Full Guide**: 10 min read
