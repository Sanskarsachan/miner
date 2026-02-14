# Fix Production API Key Quota Issue (28800 → 20)

Your production MongoDB has API keys 1001-1015 with 28800/28800 limit instead of 20/20.

## Quick Fix Options

### Option 1: Direct MongoDB Command (Fastest)

Copy & paste this in your **MongoDB Atlas Console** → Collections → gemini_api_keys → Insert from JSON:

```javascript
db.gemini_api_keys.updateMany(
  { 
    is_deleted: false,
    "quota.daily_limit": { $ne: 20 }
  },
  {
    $set: {
      "quota.daily_limit": 20,
      "quota.reset_at": new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1),
      "quota.used_today": 0,
      "last_modified_at": new Date()
    }
  }
)
```

**Steps:**
1. Go to your MongoDB Atlas dashboard
2. Select your cluster → Collections
3. Find `gemini_api_keys` collection
4. Click "Aggregations" or use MongoDB Shell
5. Run the command above
6. Should see "Updated: 15 documents"

---

### Option 2: Using the Bash Script

```bash
chmod +x fix-prod.sh
./fix-prod.sh
```

Then enter your MongoDB Atlas connection string when prompted:
```
mongodb+srv://username:password@cluster.mongodb.net/database
```

---

### Option 3: Using the API Endpoint

Once deployed, call:
```bash
curl -X POST https://your-domain.com/api/v2/admin/fix-api-quotas
```

---

### Option 4: Environment Variable + Node Script

```bash
# Set your production MongoDB URI
export MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/database"

# Run the fix script
node fix-production-quotas.js
```

---

## Verification

After running the fix, refresh your analytics page. You should see:

```
API1001  0/20   20   0%   0
API1002  0/20   20   0%   0
API1003  0/20   20   0%   0
...
```

Instead of the current 28800 values.

---

## Troubleshooting

**Error: "Network error"**
- Check your IP is whitelisted in MongoDB Atlas security settings
- Go to Atlas → Network Access → Add your IP

**Error: "Authentication failed"**
- Verify your username and password are correct
- Check for special characters in password (may need URL encoding)

**Error: "Database not found"**
- Ensure the correct database name is in the connection string
- Default should be `course_harvester_v2`

---

## What the Fix Does

✅ Updates all API keys with limit != 20 to have limit = 20
✅ Resets used_today to 0 for a clean slate
✅ Sets correct reset_at time for quota reset (next day at midnight)
✅ Verifies all changes were applied successfully

---

## Timeline

- **Before**: API1001-API1015 show 0/28800
- **After**: All show 0/20
- **Refresh**: Analytics page auto-refreshes every 10 seconds
