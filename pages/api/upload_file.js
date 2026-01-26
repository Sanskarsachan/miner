export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).send('Method Not Allowed')
  try{
    const { apiKey, filename, mimeType, base64 } = req.body || {}
    if(!apiKey) return res.status(400).json({ error: 'apiKey required' })
    if(!base64) return res.status(400).json({ error: 'base64 required' })

    const boundary = '----WebKitFormBoundary' + Math.random().toString(16).slice(2)
    const pre = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    const post = `\r\n--${boundary}--\r\n`
    const fileBuffer = Buffer.from(base64, 'base64')
    const body = Buffer.concat([Buffer.from(pre,'utf8'), fileBuffer, Buffer.from(post,'utf8')])

    // Try v1beta files endpoint (may vary by account)
    const url = `https://generativelanguage.googleapis.com/v1beta/files?key=${encodeURIComponent(apiKey)}`
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` }, body })
    const text = await r.text()
    // forward status and body
    res.status(r.status).setHeader('content-type','application/json').send(text)
  }catch(err){ console.error(err); res.status(500).json({ error: err.message||'server error' }) }
}
