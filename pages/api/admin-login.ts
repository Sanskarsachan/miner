import type { NextApiRequest, NextApiResponse } from 'next'

const ADMIN_COOKIE = 'pp_admin'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { email, password } = req.body || {}
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@planpaths.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'planpathsadmin'

  if (email !== adminEmail || password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const isProd = process.env.NODE_ENV === 'production'
  res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=1; Path=/; HttpOnly; SameSite=Lax; ${isProd ? 'Secure; ' : ''}Max-Age=86400`)
  return res.status(200).json({ ok: true })
}
