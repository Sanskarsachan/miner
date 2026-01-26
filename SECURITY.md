# CourseHarvester - Security Guide

## Critical Security Fixes Applied

### 1. API Key Protection (CRITICAL)

**Problem**: API keys were previously sent in URL query parameters, which are:
- Logged by servers (Vercel, Google, proxies)
- Visible in browser history
- Exposed in server access logs
- Captured by network monitoring tools

**Solution**: API keys are now sent in HTTP headers using `X-Goog-Api-Key` header:

```typescript
// ❌ BEFORE (Insecure)
const url = `https://api.google.com/...?key=${apiKey}`

// ✅ AFTER (Secure)
const headers = { 'X-Goog-Api-Key': apiKey }
```

**Impact**: Your previous API key suspension was likely due to exposure in URLs. Generate a new key.

---

### 2. Input Validation & Size Limits

**Problem**: No validation on payload sizes could allow abuse

**Solution**: Added payload size validation:
- Maximum 50MB per request
- Prevents memory exhaustion
- Rejects oversized uploads with HTTP 413

```typescript
if (payloadStr.length > 50 * 1024 * 1024) {
  return res.status(413).json({ error: 'Payload too large (max 50MB)' })
}
```

---

### 3. API Key Security Best Practices

#### For Users:

✅ **DO**:
- Keep API key private (never share)
- Store in browser localStorage only (encrypted by browser)
- Regenerate key if accidentally exposed
- Use a dedicated API key for this app (not production keys)
- Monitor usage at [aistudio.google.com](https://aistudio.google.com)

❌ **DON'T**:
- Commit API key to GitHub
- Share key in emails or messages
- Use production API keys in demos
- Hardcode keys in frontend code
- Pass keys in URLs or query parameters

#### For Developers:

✅ **Current Protection**:
- API key sent in request header only
- Never logged by this application
- No hardcoded secrets in codebase
- No exposure in URLs/query params
- Input validation on all payloads

❌ **Avoid**:
- Logging API keys or full request bodies
- Using API key in URL parameters
- Storing keys in version control
- Accepting unlimited payload sizes

---

### 4. Rate Limiting Recommendations

**Current Status**: No server-side rate limiting

**Why It's Needed**:
- Prevent API key abuse
- Protect against DOS attacks
- Monitor unusual activity
- Free tier limits: 20 requests/day per key

**Future Implementation**:

```typescript
// Recommended: Add rate limiting middleware
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute per IP
  message: 'Too many requests, please retry later'
})

export default limiter(handler)
```

---

### 5. CORS & CSRF Protection

**Current Implementation**:
✅ POST-only endpoints (prevents simple CSRF)
✅ No sensitive data in cookies
✅ API key required in request body (not cookie)
✅ Content-Type validation

**Why It's Safe**:
- Browser's same-origin policy prevents unauthorized access
- API key not stored in cookies
- POST-only prevents simple form-based attacks

---

### 6. Data Security

**What's Transmitted**:
- User's Gemini API key (only in request body/headers)
- Document content (sent to Gemini API)
- Extracted courses (stored in browser only)

**What's NOT Stored**:
- API keys (only in browser localStorage)
- Extracted course data (only in memory)
- Documents (processed and discarded)
- User information

**Privacy**:
- This is a client-side application
- No server database
- No tracking or analytics
- Vercel logs don't contain sensitive data

---

### 7. Routes Security Audit

| Route | Method | Security | Notes |
|-------|--------|----------|-------|
| `/api/generate` | POST | ✅ Secure | API key in header, payload validated |
| `/api/upload_generate` | POST | ✅ Secure | API key in header, file size limited |
| `/api/list_models` | POST | ✅ Secure | API key in header |
| `/api/upload_file` | POST | ✅ Secure | File size validated |
| `/courseharvester` | GET | ✅ Secure | No sensitive data |
| `/` | GET | ✅ Secure | Landing page |

---

### 8. Recovery Steps (If Key Compromised)

**If your API key gets suspended**:

1. **Check Vercel logs**: Go to Deployment → Functions → Logs
   - Look for unusual activity
   - Check request patterns

2. **Regenerate API key**:
   - Go to [aistudio.google.com](https://aistudio.google.com/app/apikey)
   - Delete compromised key
   - Create new key

3. **Update your app**:
   - Paste new key in app
   - Click "Verify"
   - Test with small document

4. **Monitor usage**:
   - Check daily usage at Google AI Studio
   - Set up billing alerts
   - Consider paid plan if high usage

---

### 9. Gemini API Quotas

**Free Tier**:
- 60 requests/minute
- 15,000 requests/day
- Limited token processing

**Why Suspension Happens**:
- Exceeding daily quota (15,000 requests)
- API key exposed to public
- Unusual usage patterns detected
- Terms of service violation

**Prevention**:
- Monitor daily usage
- Implement client-side rate limiting
- Show quota warnings (app already does this)
- Upgrade to paid for production

---

### 10. Deployment Security Checklist

Before deploying to production:

- [ ] No hardcoded API keys in code
- [ ] API key sent in headers, not URLs
- [ ] Input validation on all endpoints
- [ ] HTTPS enabled (Vercel auto-enables)
- [ ] Error messages don't expose secrets
- [ ] No sensitive data in logs
- [ ] Rate limiting configured
- [ ] CORS headers set correctly
- [ ] Environment variables used for secrets
- [ ] Security headers configured

---

## Vercel Security Settings

### Enable in Vercel Dashboard:

1. **Project Settings → Security Headers**:
   - Enable `X-Content-Type-Options: nosniff`
   - Enable `X-Frame-Options: DENY`
   - Enable `X-XSS-Protection: 1; mode=block`

2. **Settings → Analytics**:
   - Enable Web Analytics for monitoring
   - Set up error alerts

3. **Settings → Environment Variables**:
   - Never add API keys
   - Users provide their own

---

## Monitoring & Alerts

### What to Monitor:

1. **Google AI Studio**:
   - Check daily API usage
   - Set quota alerts
   - Review request history

2. **Vercel Dashboard**:
   - Check function execution time
   - Monitor error rates
   - Review logs for unusual activity

3. **Application**:
   - Status messages show quota warnings
   - Debug panel reveals API responses
   - Check for 403 Permission Denied errors

---

## Security Changelog

| Date | Change | Severity |
|------|--------|----------|
| 2026-01-26 | Moved API key from URL to header | Critical |
| 2026-01-26 | Added payload size validation | High |
| 2026-01-26 | Documented security best practices | Medium |

---

## Questions or Issues?

If your API key gets suspended:

1. **Check the error message** - usually in the debug panel
2. **Review your usage** at [aistudio.google.com](https://aistudio.google.com/app/apikey)
3. **Regenerate a new key** if compromised
4. **Update this application** with new key
5. **Verify the key** using the Verify button

---

**Last Updated**: January 26, 2026  
**Status**: ✅ All critical security fixes applied
