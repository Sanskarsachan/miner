import type { NextApiRequest, NextApiResponse } from 'next'
import { ObjectId } from 'mongodb'
import { connectDB } from '@/lib/db'
import { getApiKey, logApiUsage } from '@/lib/api-key-manager'

interface RequestBody {
  apiKey?: string // Legacy: raw API key
  apiKeyId?: string // New: API key pool ID
  payload: any
}

type ResponseData = any

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { apiKey, apiKeyId, payload } = (req.body || {}) as RequestBody

    let actualApiKey = apiKey // Legacy: use provided key

    // New: look up key from pool
    if (apiKeyId && !apiKey) {
      if (!ObjectId.isValid(apiKeyId)) {
        return res.status(400).json({ error: 'Invalid API key ID format' })
      }

      const db = await connectDB()
      const keyData = await getApiKey(db, new ObjectId(apiKeyId))

      if (!keyData) {
        return res.status(404).json({ error: 'API key not found' })
      }

      actualApiKey = keyData.key
    }

    if (!actualApiKey) {
      return res.status(400).json({ error: 'apiKey or apiKeyId required' })
    }

    if (!payload) {
      return res.status(400).json({ error: 'payload required in body' })
    }

    // Validate payload size (prevent abuse)
    const payloadStr = JSON.stringify(payload)
    if (payloadStr.length > 50 * 1024 * 1024) { // 50MB max
      return res.status(413).json({ error: 'Payload too large (max 50MB)' })
    }

    // Forward to Gemini's v1beta generateContent endpoint
    // ⚠️ CRITICAL: API key in Authorization header, NOT in URL
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': actualApiKey, // Use header instead of URL parameter
      },
      body: JSON.stringify(payload),
    })

    const text = await r.text()

    // Log API usage if using API key from pool
    if (apiKeyId) {
      try {
        const db = await connectDB()
        await logApiUsage(db, new ObjectId(apiKeyId), {
          user_id: 'system',
          requests_count: 1,
          tokens_used: Math.ceil(payloadStr.length / 4), // Rough estimate
          success: r.ok,
          error_message: r.ok ? undefined : `HTTP ${r.status}`,
        })
        console.log('[generate] ✅ API usage logged for key:', apiKeyId)
      } catch (logError) {
        console.error('[generate] Failed to log API usage:', logError)
      }
    }

    // Forward status and body
    res.status(r.status).setHeader('content-type', 'application/json').send(text)
  } catch (err) {
    console.error(err)
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Server error',
    })
  }
}
