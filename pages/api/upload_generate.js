/**
 * API Route: /api/upload_generate
 * 
 * Proxies binary file requests (e.g., PPTX) with inline_data to Gemini.
 * 
 * This endpoint handles:
 * 1. Base64-encoded binary files (PPTX presentations)
 * 2. Converting base64 to inline_data format for Gemini API
 * 3. Forwarding the request with file + extraction prompt
 * 4. Returning raw Gemini response
 * 
 * Used for: PowerPoint presentations that can't be extracted as text on client
 * 
 * Limitation: Max payload ~5MB due to API limits
 * 
 * Input: { apiKey, filename, mimeType, base64, prompt }
 * Output: Raw Gemini API response
 */

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).send('Method Not Allowed')
  try{
    const { apiKey, filename, mimeType, base64, prompt } = req.body || {}
    if(!apiKey) return res.status(400).json({ error: 'apiKey required' })
    if(!base64) return res.status(400).json({ error: 'base64 file required' })

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`
    const payload = {
      contents: [
        {
          parts: [
            { inline_data: { mime_type: mimeType || 'application/octet-stream', data: base64 } },
            { text: prompt }
          ]
        }
      ],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
    }

    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const text = await r.text()
    res.status(r.status).setHeader('content-type','application/json').send(text)
  }catch(err){
    console.error(err)
    res.status(500).json({ error: err.message || 'Server error' })
  }
}
