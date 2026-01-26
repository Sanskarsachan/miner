import type { NextApiRequest, NextApiResponse } from 'next'

interface RequestBody {
  apiKey: string
}

interface ModelResult {
  endpoint: string
  status: number
  body: any
}

type ResponseData = { results: ModelResult[] } | { error: string }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { apiKey } = (req.body || {}) as RequestBody

    if (!apiKey) {
      return res.status(400).json({ error: 'apiKey required' })
    }

    // Query both endpoints to support different API versions
    const endpoints = [
      'https://generativelanguage.googleapis.com/v1/models?key=',
      'https://generativelanguage.googleapis.com/v1beta/models?key=',
    ]

    const results: ModelResult[] = []

    for (const base of endpoints) {
      try {
        const r = await fetch(base + encodeURIComponent(apiKey))
        const body = await r.json()
        results.push({
          endpoint: base,
          status: r.status,
          body,
        })
      } catch (e) {
        console.error(`Error querying ${base}:`, e)
        results.push({
          endpoint: base,
          status: 0,
          body: { error: 'Failed to query' },
        })
      }
    }

    res.status(200).json({ results })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Server error',
    })
  }
}
