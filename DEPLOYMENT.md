# Environment Variables for Production Deployment

## 🚨 Issue: MongoDB Not Working in Production

**Problem**: `.env.local` is in `.gitignore` and not deployed to production.
**Solution**: Set environment variables in your hosting platform.

---

## For Vercel Deployment

### Step 1: Add Environment Variables in Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

```
Name: MONGODB_URI
Value: mongodb+srv://sanskar841singh_db_user:PlanpathsDataMiner@florida.gddf8cx.mongodb.net/

Name: DEFAULT_USER_ID
Value: sanskar841singh_db_user
```

### Step 2: Redeploy

After adding environment variables:
- Click **Deployments** tab
- Click the **three dots** on latest deployment
- Click **Redeploy**

OR push a new commit to trigger auto-deploy.

---

## For Other Hosting Platforms

### Netlify
1. Site Settings → Build & Deploy → Environment
2. Add `MONGODB_URI` and `DEFAULT_USER_ID`
3. Trigger new deploy

### Railway
1. Project → Variables tab
2. Add `MONGODB_URI` and `DEFAULT_USER_ID`
3. Redeploy automatically

### Render
1. Dashboard → Environment tab
2. Add environment variables
3. Manual deploy or auto-deploy on push

---

## Security Best Practices

### ✅ DO:
- Set environment variables in hosting dashboard
- Use different MongoDB databases for dev/prod
- Rotate MongoDB password regularly
- Use MongoDB Atlas IP allowlist (allow 0.0.0.0/0 for Vercel)

### ❌ DON'T:
- Commit `.env.local` to git
- Hardcode credentials in code
- Use same database for dev and prod
- Share credentials publicly

---

## Verify Production Environment

### Method 1: Check Vercel Logs
1. Vercel Dashboard → Deployments
2. Click latest deployment
3. Click **View Function Logs**
4. Look for MongoDB connection errors

### Method 2: Add Debug Endpoint

Create `/pages/api/debug.ts`:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow in development or with secret
  if (process.env.NODE_ENV === 'production' && req.query.secret !== 'your-secret-key') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  return res.status(200).json({
    hasMongoUri: !!process.env.MONGODB_URI,
    mongoUriLength: process.env.MONGODB_URI?.length || 0,
    hasUserId: !!process.env.DEFAULT_USER_ID,
    nodeEnv: process.env.NODE_ENV,
    // Don't log actual values for security!
  })
}
```

Visit: `https://your-domain.vercel.app/api/debug?secret=your-secret-key`

Expected response:
```json
{
  "hasMongoUri": true,
  "mongoUriLength": 97,
  "hasUserId": true,
  "nodeEnv": "production"
}
```

---

## MongoDB Atlas Configuration

### Allow Vercel IPs

1. MongoDB Atlas → Network Access
2. Click **Add IP Address**
3. Select **Allow Access from Anywhere** (0.0.0.0/0)
   - Vercel uses dynamic IPs, so this is necessary
   - Security is handled by your connection string password

### Connection String Format

```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

**Important**: 
- No spaces
- No quotes
- URL-encode special characters in password

---

## Testing Production Environment

### 1. Test MongoDB Connection

```bash
curl https://your-domain.vercel.app/api/v2/extractions/list
```

Expected: JSON with extractions or empty array
If error 503: MongoDB connection failed

### 2. Test Extraction Save

Upload a PDF in production and check if it saves to MongoDB.

### 3. Check Vercel Logs

```bash
vercel logs <deployment-url>
```

Look for:
- `[DB] ✅ Connected to MongoDB` (success)
- `[DB] ❌ Connection failed` (error)

---

## Common Issues & Fixes

### Issue 1: "503 Service Unavailable"
**Cause**: MongoDB connection failing
**Fix**: 
1. Check environment variables are set
2. Verify MongoDB Atlas IP whitelist
3. Check connection string is correct

### Issue 2: "MongooseError: Operation buffering timed out"
**Cause**: MongoDB Atlas network access blocked
**Fix**: Add 0.0.0.0/0 to IP whitelist in MongoDB Atlas

### Issue 3: "Authentication failed"
**Cause**: Wrong username/password in connection string
**Fix**: 
1. Reset password in MongoDB Atlas
2. Update `MONGODB_URI` in Vercel
3. Redeploy

### Issue 4: Environment variables not updating
**Cause**: Vercel caches environment variables
**Fix**: 
1. Update variables in Vercel dashboard
2. Trigger new deployment (don't just restart)

---

## Production Checklist

- [ ] Environment variables set in hosting platform
- [ ] MongoDB Atlas IP whitelist includes 0.0.0.0/0
- [ ] Connection string has no spaces or quotes
- [ ] Deployment successful (no build errors)
- [ ] API endpoints return 200 (not 503)
- [ ] Extractions save to MongoDB
- [ ] Sidebar loads saved files
- [ ] Check production logs for errors

---

## Quick Fix Command

If deploying to Vercel via CLI:

```bash
# Set environment variables
vercel env add MONGODB_URI production
# Paste: mongodb+srv://sanskar841singh_db_user:PlanpathsDataMiner@florida.gddf8cx.mongodb.net/

vercel env add DEFAULT_USER_ID production
# Paste: sanskar841singh_db_user

# Redeploy
vercel --prod
```

---

## Need Help?

1. Check Vercel logs for specific errors
2. Test `/api/v2/extractions/list` endpoint
3. Verify MongoDB Atlas network access
4. Ensure environment variables are set correctly

**Most common fix**: Just add the environment variables in Vercel dashboard and redeploy!
