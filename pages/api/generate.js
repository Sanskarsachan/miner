export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).send('Method Not Allowed')
  try{
    const { apiKey, payload } = req.body || {}
    if(!apiKey) return res.status(400).json({ error: 'apiKey required in body' })
    if(!payload) return res.status(400).json({ error: 'payload required in body' })

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const text = await r.text()
    // Forward status and body
    res.status(r.status).setHeader('content-type','application/json').send(text)
  }catch(err){
    console.error(err)
    res.status(500).json({ error: err.message || 'Server error' })
  }
}
