# 🚀 Branch Management Quick Reference

## 📊 Current Branch Structure

```
main (Production - STABLE ✅)
├── Latest Commit: fix: make usage stats dynamic and layout fully responsive
├── Status: Ready for production
├── Features: Course extraction, dynamic stats, responsive UI
└── Deployment: Ready to push to Vercel

feature/v2-database (Development - IN PROGRESS 🔄)
├── Latest Commit: feat(v2): initialize database layer with MongoDB integration
├── Status: Foundation complete, ready for Phase 2
├── Features: MongoDB, persistence, file management
└── Deployment: Not yet ready, test locally first

feature/modern-dashboard (Feature - COMPLETED ✅)
├── Status: Complete, awaiting merge
└── Ready for review
```

---

## 🔀 Quick Commands

### Switch to Main (Production)
```bash
git checkout main
npm run build
npm run dev
# Visit http://localhost:3000/courseharvester
```

### Switch to V2 (Development)
```bash
git checkout feature/v2-database
npm run build
npm run dev
# Visit http://localhost:3000/courseharvester (same UI)
# But new DB APIs available at /api/v2/*
```

### See What Changed in V2
```bash
git diff main feature/v2-database --stat
```

### See Commit Difference
```bash
git log main..feature/v2-database --oneline
```

---

## 📝 Branch Purposes

| Branch | Purpose | Status | Deploy |
|--------|---------|--------|--------|
| **main** | Production code | ✅ Ready | Vercel |
| **feature/v2-database** | New database features | 🔄 In Progress | Local testing |
| **feature/modern-dashboard** | Modern UI (optional) | ✅ Complete | Review pending |

---

## 🎯 What's in Each Branch

### ✅ MAIN BRANCH (Keep This Stable!)
```
✅ Course extraction (Gemini, Claude ready)
✅ Dynamic usage stats & quotas
✅ Responsive UI (mobile, tablet, desktop)
✅ File upload & processing
✅ Export CSV/JSON
✅ Batch processing (3 pages at a time)
✅ Real-time progress tracking
✅ Free tier limits display
```

### 🔄 V2 BRANCH (New Features)
```
✅ MongoDB connection module
✅ Type-safe database models
✅ Extraction service (save, list, get, delete)
✅ API endpoints for v2 operations
⏳ Sidebar component (coming Phase 2)
⏳ File detail page (coming Phase 2)
⏳ Version history (coming Phase 3)
⏳ Refinement UI (coming Phase 3)
⏳ Multi-API routing (coming Phase 4)
```

---

## 🚀 Recommended Workflow

### Day-to-Day Development

#### Working on Main Features
```bash
# Make sure main is up to date
git checkout main
git pull origin main

# Create feature branch from main if needed
git checkout -b feature/my-feature main

# Test locally
npm run dev

# Merge back to main when ready
git checkout main
git merge feature/my-feature
```

#### Working on V2 Database
```bash
# Switch to v2 branch
git checkout feature/v2-database

# Make changes
# ... edit files ...

# Commit frequently
git add -A
git commit -m "feat: add extraction detail endpoint"

# Test locally
npm run dev

# When feature is complete, leave in branch
# Ready for merge to main later
```

#### Quick Switch Between Branches
```bash
# List all branches
git branch -a

# Switch with checkout
git checkout main              # Go to main
git checkout feature/v2-database  # Go to v2

# Last branch shortcut
git checkout -                 # Toggle between last two branches
```

---

## ✅ Pre-Deployment Checklist

### Before Pushing to Vercel (Main Branch)
```bash
# 1. Switch to main
git checkout main

# 2. Test build
npm run build
# Should see: ✓ Compiled successfully

# 3. Run tests (if available)
npm test

# 4. View changes
git log --oneline -5

# 5. If all good, push
git push origin main
```

### Before Merging V2 to Main
```bash
# 1. Make sure v2 is fully tested
git checkout feature/v2-database
npm run build  # Should compile without errors

# 2. Check what will merge
git diff main feature/v2-database --stat

# 3. When ready, merge
git checkout main
git merge feature/v2-database

# 4. Push to production
git push origin main
```

---

## 🐛 Troubleshooting

### "I made changes on wrong branch!"
```bash
# Stash changes
git stash

# Switch to correct branch
git checkout correct-branch

# Apply changes
git stash pop
```

### "I want to see what's different"
```bash
# Compare branches
git diff main feature/v2-database

# See commits only in v2
git log main..feature/v2-database

# See which branch has specific commit
git branch --contains 0375702
```

### "I want to reset v2 to main"
```bash
git checkout feature/v2-database
git reset --hard main
# Warning: This deletes all v2 changes!
```

### "Merge conflicts when merging v2"
```bash
# Start merge
git checkout main
git merge feature/v2-database

# If conflicts occur:
# 1. Edit files to resolve conflicts
# 2. Mark as resolved
git add .

# 3. Complete merge
git commit -m "Merge v2 into main"
```

---

## 📊 Files by Branch

### Only in V2 (Not in Main)
```
lib/db.ts                          # MongoDB connection
lib/types.ts                       # DB type definitions
lib/extraction.service.ts          # Extraction operations
pages/api/v2/extractions/save.ts   # Save extraction endpoint
pages/api/v2/extractions/list.ts   # List extractions endpoint
V2_IMPLEMENTATION_GUIDE.md         # V2 development guide
```

### Shared (Both Branches)
```
pages/courseharvester.tsx          # Main UI (same in both)
pages/api/secure_extract.ts        # Gemini extraction (same in both)
lib/ChunkProcessor.ts              # PDF processing (same in both)
package.json, tsconfig.json        # Config (same in both)
```

### Main Branch Only (Not in V2 Yet)
```
(Nothing - v2 has all of main's code + new features)
```

---

## 🎯 Next Phase Goals

### Phase 2: UI Components (In V2)
```bash
# After Phase 1 is complete:
git checkout feature/v2-database

# Add these components:
touch components/Sidebar.tsx          # File list sidebar
touch components/FileCard.tsx         # File detail card
touch components/VersionHistory.tsx   # Version viewer
touch pages/api/v2/extractions/[id].ts  # Get extraction endpoint

# Commit when done
git add -A
git commit -m "feat(v2): add UI components for file management"
```

---

## 📞 Summary

| Task | Command |
|------|---------|
| See which branch I'm on | `git branch` |
| Switch to main | `git checkout main` |
| Switch to v2 | `git checkout feature/v2-database` |
| See all branches | `git branch -a` |
| See v2 changes | `git diff main feature/v2-database` |
| Merge v2 to main | `git checkout main && git merge feature/v2-database` |
| Undo a commit | `git reset HEAD~1` |
| Stash changes | `git stash` |
| See stashed changes | `git stash list` |
| Apply stash | `git stash pop` |

---

**Remember**: Keep main stable, experiment in v2! 🚀
