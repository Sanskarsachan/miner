/**
 * API Route: /api/list_models
 * 
 * Verifies Gemini API key and lists available models.
 * Queries both v1 and v1beta endpoints to support older and newer API versions.
 * 
 * Used by the frontend to:
 * 1. Verify that the user's API key is valid
 * 2. Discover which models are available
 * 3. Ensure the target model (gemini-2.5-flash) exists
 * 
 * Input: { apiKey }
 * Output: { results: [ { endpoint, status, body } ] }
 */

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).send('Method Not Allowed')
  try{
    const { apiKey } = req.body || {}
    if(!apiKey) return res.status(400).json({ error: 'apiKey required' })

    // Query both endpoints to support different API versions
    const endpoints = [
      'https://generativelanguage.googleapis.com/v1/models?key=',
      'https://generativelanguage.googleapis.com/v1beta/models?key='
    ]
    const results = []
    for(const base of endpoints){
      try{
        const r = await fetch(base + encodeURIComponent(apiKey))
        const text = await r.text()
        let json = null
        try{ json = JSON.parse(text) }catch(e){ json = { raw: text } }
        results.push({ endpoint: base.replace('?key=',''), status: r.status, body: json })
      }catch(e){ results.push({ endpoint: base.replace('?key=',''), error: e.message }) }
    }
    res.status(200).json({ results })
  }catch(err){ console.error(err); res.status(500).json({ error: err.message||'server error' }) }
}
