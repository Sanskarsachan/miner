import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_COOKIE = 'pp_admin'
const LOGIN_PATH = '/admin-login'
const ALLOWED_PATHS = new Set([LOGIN_PATH, '/api/admin-login'])

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (ALLOWED_PATHS.has(pathname)) {
    return NextResponse.next()
  }

  const hasAdmin = req.cookies.get(ADMIN_COOKIE)?.value === '1'

  if (hasAdmin) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const loginUrl = req.nextUrl.clone()
  loginUrl.pathname = LOGIN_PATH
  loginUrl.searchParams.set('next', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|PlanpathsIcon.png|robots.txt|sitemap.xml).*)']
}
