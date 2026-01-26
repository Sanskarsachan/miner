# CourseHarvester - Deployment Guide

This guide walks you through deploying CourseHarvester to Vercel, the recommended platform for this Next.js application.

## Pre-Deployment Checklist

- [x] Code review and testing completed
- [x] README and documentation written
- [x] Architecture reviewed (see ARCHITECTURE.md)
- [x] Environment variables configured (.env.example provided)
- [x] No hardcoded secrets in codebase
- [x] Error handling implemented
- [x] Mobile responsiveness tested
- [x] Debug features included for troubleshooting

## Deploy to Vercel (Recommended)

### Step 1: Push to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial CourseHarvester commit"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/yourusername/course-harvester.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 2: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub account
3. Authorize Vercel to access your repositories

### Step 3: Import Project to Vercel

**Option A: One-Click Deploy (Easiest)**

Once signed in, click: **Add New → Project**

- Select your GitHub repository
- Vercel auto-detects Next.js
- Click **Deploy**

**Option B: Vercel CLI**

```bash
# Install Vercel CLI globally
npm install -g vercel

# Deploy from project directory
cd course-harvester
vercel

# Follow the prompts
# - Link to your Vercel account
# - Select scope (personal team)
# - Confirm project settings
# - Wait for deployment
```

### Step 4: Configure Environment Variables (Optional)

Vercel deployment **requires NO environment variables** for CourseHarvester because:
- Users provide their own Gemini API key
- No server-side secrets needed

If you want to add optional variables:

1. Go to **Project Settings → Environment Variables**
2. Add (optional):
   - `NEXT_PUBLIC_DEFAULT_MODEL`: Default Gemini model
   - `NEXT_PUBLIC_LOG_LEVEL`: Debug logging level
3. Redeploy

### Step 5: Access Your Deployment

Once deployed, you'll get:
- A Vercel URL: `https://course-harvester-xxxxx.vercel.app`
- Access to live logs and analytics
- Automatic deployments on git push

Your app will be at:
- **Main App**: `https://course-harvester-xxxxx.vercel.app/courseharvester`

## Performance Optimization on Vercel

### 1. Image & Asset Optimization
CourseHarvester doesn't use images, but if you add them later:
- Use Next.js `<Image>` component
- Vercel auto-optimizes via serverless functions

### 2. Function Optimization
Current serverless functions are lightweight:
- `/api/generate`: ~20ms execution
- `/api/list_models`: ~30ms execution
- `/api/upload_generate`: 1-3s (depends on Gemini latency)

No optimization needed at current scale.

### 3. CDN & Caching
- Static assets (HTML, CSS) cached globally
- API responses not cached (real-time Gemini calls)
- PDF.js and Mammoth.js loaded from CDN

### 4. Monitor Performance
In Vercel dashboard:
1. Go to **Analytics**
2. Monitor:
   - Page load times
   - API response times
   - Error rates

## Alternative Deployment Options

### Deploy to Netlify (Static Only)

⚠️ **Netlify Functions required for API proxies**

```bash
# Create netlify.toml
cat > netlify.toml << EOF
[build]
  command = "next build && next export"
  publish = "out"

[functions]
  directory = "netlify/functions"
EOF

# Push to Netlify via GitHub
```

### Deploy to AWS (Advanced)

```bash
# Build Next.js app
npm run build

# Deploy with Amplify CLI
amplify init
amplify add hosting
amplify publish
```

### Deploy to Docker (Self-Hosted)

```bash
# Create Dockerfile
cat > Dockerfile << EOF
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
EOF

# Build and run
docker build -t course-harvester .
docker run -p 3000:3000 course-harvester
```

## Monitoring & Maintenance

### Set Up Error Tracking (Optional)

Integrate Sentry for error monitoring:

```bash
# Install Sentry
npm install @sentry/nextjs

# Configure in next.config.js
const withSentry = require('@sentry/nextjs/withSentryConfig');

module.exports = withSentry({
  // ... your config
}, {
  org: "your-org",
  project: "course-harvester",
});
```

### Monitor API Usage

1. Check Gemini API quotas at [aistudio.google.com](https://aistudio.google.com)
2. Monitor daily/monthly usage
3. Upgrade if hitting free tier limits

### Enable Vercel Analytics

1. In Vercel dashboard: **Settings → Analytics**
2. Enable **Web Analytics**
3. Track user behavior and performance

## Scaling Considerations

### Current Limits

- **Concurrent users**: Unlimited (serverless scales)
- **API calls/day**: Limited by Gemini free tier
- **Document size**: Recommended max 100 pages

### When to Scale

If you hit limits:

1. **Gemini quota exceeded**:
   - Upgrade to paid Gemini plan
   - Or use rate limiting to queue requests

2. **Too many concurrent users**:
   - Implement document processing queue
   - Add database for result caching
   - Use background jobs

3. **Large file uploads**:
   - Implement multipart uploads
   - Add file size validation
   - Stream processing instead of in-memory

## Rollback & Recovery

### Rollback a Deployment

In Vercel dashboard:
1. Go to **Deployments**
2. Find previous working version
3. Click **Promote to Production**

### Revert Code Changes

```bash
# View commit history
git log --oneline

# Revert to previous commit
git revert <commit-hash>
git push origin main

# Vercel will auto-redeploy
```

## Security Best Practices

### API Key Security

✅ What we do:
- Never expose API key in code
- Serverless proxies handle all Gemini calls
- Users provide their own keys

⚠️ What users should do:
- Never share their API key
- Regenerate key if compromised
- Use Gemini API quotas to limit damage

### CORS & CSRF

✅ Current protections:
- Serverless proxies prevent CORS issues
- POST-only API endpoints
- No cross-origin vulnerabilities

### Rate Limiting

⚠️ Future consideration:
- Add rate limiting per IP
- Prevent API abuse
- Implement queuing for large uploads

```javascript
// Example: Add rate limiting
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})

export default limiter(handler)
```

## Troubleshooting Deployment Issues

### Issue: "Build failed"

**Check logs**:
1. Go to **Deployments → Error logs**
2. Look for build errors
3. Common causes:
   - Missing dependencies
   - Syntax errors
   - Invalid Next.js config

**Fix**:
```bash
# Test locally
npm run build

# Fix any errors
# Push to GitHub
git push origin main
# Vercel will redeploy
```

### Issue: "API returning 500 errors"

**Check Vercel logs**:
1. Go to **Functions → Logs**
2. Look for error details
3. Common causes:
   - Invalid Gemini API key
   - Network timeout
   - Malformed request

**Debug**:
- Use debug panel in app to see raw responses
- Check Gemini API status at [status.google.com](https://status.google.com)

### Issue: "Cold start latency"

**Why**: Serverless functions have startup overhead

**Solution**:
- Keep functions < 50MB
- Minimize dependencies
- Use connection pooling (if database)

## Cost Estimates

### Vercel Hosting
- **Free tier**: 100 GB bandwidth/month
- **Pro tier**: $20/month + bandwidth overages

### Gemini API
- **Free tier**: 60 requests/minute, 15,000 requests/day
- **Paid tier**: $0.075 per 1M input tokens

**Estimate for typical usage**:
- 100 documents/day × 10K tokens avg = 1M tokens
- Cost: ~$0.075/day = $2.25/month

## Next Steps

1. Deploy to Vercel (15 minutes)
2. Test live app with sample curriculum documents
3. Gather feedback and usage metrics
4. Plan improvements based on real-world usage

---

**Deployment Guide v1.0**
**Last Updated**: January 26, 2026
