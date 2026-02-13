import { useRouter } from 'next/router'
import { useState } from 'react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const nextPath = typeof router.query.next === 'string' ? router.query.next : '/'

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (!res.ok) {
        setError('Invalid credentials.')
        return
      }

      await router.push(nextPath)
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f1e8] px-4 py-12">
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#f3c26b] opacity-60 blur-3xl" />
      <div className="absolute right-[-8rem] top-1/3 h-80 w-80 rounded-full bg-[#1d1b1a] opacity-10 blur-3xl" />
      <div className="absolute bottom-0 left-1/2 h-48 w-[36rem] -translate-x-1/2 rounded-full bg-[#b85c38] opacity-20 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-10 lg:flex-row lg:items-stretch">
        <section className="w-full rounded-[28px] border border-black/10 bg-white/80 p-8 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.6)] backdrop-blur">
          <p
            className="text-xs uppercase tracking-[0.4em] text-[#b85c38]"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Planpaths Internal
          </p>
          <h1
            className="mt-4 text-4xl font-semibold text-[#1d1b1a] sm:text-5xl"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            Admin access.
            <br />
            Editorial calm.
          </h1>
          <p
            className="mt-4 text-base text-[#3f3a34]"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            This site is private. Sign in with the temporary admin credentials to continue.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                className="text-xs uppercase tracking-[0.25em] text-[#6d6258]"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                htmlFor="email"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-black/15 bg-white px-4 py-3 text-sm text-[#1d1b1a] shadow-[0_12px_24px_-18px_rgba(0,0,0,0.5)] focus:border-black/60 focus:outline-none"
                placeholder="admin@planpaths.com"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              />
            </div>
            <div className="space-y-2">
              <label
                className="text-xs uppercase tracking-[0.25em] text-[#6d6258]"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                htmlFor="password"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-black/15 bg-white px-4 py-3 text-sm text-[#1d1b1a] shadow-[0_12px_24px_-18px_rgba(0,0,0,0.5)] focus:border-black/60 focus:outline-none"
                placeholder="********"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              />
            </div>
            {error ? (
              <p
                className="rounded-2xl border border-[#b85c38]/40 bg-[#b85c38]/10 px-4 py-2 text-sm text-[#8c3f27]"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              className="w-full rounded-2xl bg-[#1d1b1a] px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Enter the archive'}
            </button>
          </form>
        </section>

        <aside className="w-full max-w-lg rounded-[28px] border border-black/10 bg-[#1d1b1a] p-8 text-white shadow-[0_30px_80px_-60px_rgba(0,0,0,0.6)]">
          <div className="flex h-full flex-col justify-between gap-10">
            <div>
              <p
                className="text-xs uppercase tracking-[0.35em] text-white/70"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Access Notes
              </p>
              <h2
                className="mt-4 text-3xl font-semibold text-white"
                style={{ fontFamily: 'Playfair Display, serif' }}
              >
                Keep this gate temporary.
              </h2>
              <p
                className="mt-4 text-sm text-white/70"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                This login is a short-term shield for stakeholders. When you are ready for a
                permanent auth system, we can replace this with full user roles.
              </p>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="h-12 w-12 rounded-full border border-white/20 bg-white/10" />
              <div>
                <p
                  className="text-xs uppercase tracking-[0.3em] text-white/60"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Protected
                </p>
                <p
                  className="text-sm font-medium text-white"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Admin-only session required
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
