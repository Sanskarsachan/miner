import type { NextApiRequest, NextApiResponse } from 'next'

interface RequestBody {
  apiKey: string
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
    const { apiKey, payload } = (req.body || {}) as RequestBody

    if (!apiKey) {
      return res.status(400).json({ error: 'apiKey required in body' })
    }

    if (!payload) {
      return res.status(400).json({ error: 'payload required in body' })
    }

    // Forward to Gemini's v1beta generateContent endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
      apiKey
    )}`

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const text = await r.text()

    // Forward status and body
    res.status(r.status).setHeader('content-type', 'application/json').send(text)
  } catch (err) {
    console.error(err)
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Server error',
    })
  }
}
