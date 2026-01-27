import Head from 'next/head'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface TokenAnalytics {
  summary: {
    total_tokens: number
    total_courses: number
    total_pages: number
    total_extractions: number
    free_tier_limit: number
    tokens_remaining: number
    usage_percentage: number
  }
  efficiency: {
    avg_tokens_per_course: number
    avg_tokens_per_page: number
    avg_courses_per_extraction: string
    estimated_extractions_remaining: number
  }
  api_breakdown: Array<{
    api: string
    tokens_used: number
    courses_extracted: number
    extractions: number
    cost_per_course: number
  }>
  top_by_tokens: Array<{
    filename: string
    tokens_used: number
    courses_extracted: number
    cost_per_course: number
    date: string
  }>
  top_by_courses: Array<{
    filename: string
    courses_extracted: number
    tokens_used: number
    cost_per_course: number
    date: string
  }>
}

export default function TokensPage() {
  const [analytics, setAnalytics] = useState<TokenAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/v2/analytics/tokens')
        if (!response.ok) throw new Error('Failed to fetch analytics')
        const data = await response.json()
        setAnalytics(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
        Loading token analytics...
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#d32f2f' }}>
        Error: {error}
      </div>
    )
  }

  const { summary, efficiency, api_breakdown, top_by_tokens, top_by_courses } = analytics

  return (
    <>
      <Head>
        <title>Token Analytics - CourseHarvester</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>

      <style jsx global>{`
        :root {
          --primary: #2563eb;
          --secondary: #10b981;
          --accent: #8b5cf6;
          --warning: #f97316;
          --danger: #ef4444;
          --bg: #f8fafc;
          --card: #ffffff;
          --muted: #6b7280;
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          background: linear-gradient(180deg, #f8fafc, #ffffff);
          color: #0f172a;
          font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
        }
      `}</style>

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(90deg, var(--primary), var(--accent));
          color: white;
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .header-link {
          color: rgba(255, 255, 255, 0.9);
          text-decoration: none;
          font-size: 14px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 8px 12px;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .header-link:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.6);
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .card {
          background: var(--card);
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
        }
        .stat-label {
          color: var(--muted);
          font-size: 13px;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }
        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: 4px;
        }
        .stat-unit {
          font-size: 13px;
          color: var(--muted);
          font-weight: normal;
        }
        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          margin-top: 8px;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--primary), var(--accent));
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        .section {
          margin-bottom: 24px;
        }
        .section-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 12px;
          color: #0f172a;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        th {
          text-align: left;
          padding: 12px;
          background: #f8fafc;
          border-bottom: 1px solid #e5e7eb;
          font-weight: 600;
          color: var(--muted);
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #f1f5f9;
        }
        tr:hover {
          background: #f8fafc;
        }
        .highlight {
          background: #fef3c7;
          padding: 12px;
          border-radius: 8px;
          border-left: 4px solid var(--warning);
          margin-bottom: 16px;
        }
        .highlight-text {
          font-size: 13px;
          color: #92400e;
          margin: 0;
        }
        .api-badge {
          display: inline-block;
          padding: 4px 8px;
          background: #dbeafe;
          color: #1e40af;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }
        @media (max-width: 768px) {
          .header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .grid {
            grid-template-columns: 1fr;
          }
          table {
            font-size: 12px;
          }
          th,
          td {
            padding: 8px;
          }
        }
      `}</style>

      <div className="container">
        <div className="header">
          <div>
            <h1>💡 Token Analytics</h1>
            <p style={{ margin: '6px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
              Track your API usage and optimize extraction efficiency
            </p>
          </div>
          <Link href="/courseharvester">
            <a className="header-link">← Back to Harvester</a>
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid">
          <div className="card">
            <div className="stat-label">Total Tokens Used</div>
            <div className="stat-value">
              {summary.total_tokens.toLocaleString()}
              <span className="stat-unit"> / {summary.free_tier_limit.toLocaleString()}</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.min(summary.usage_percentage, 100)}%` }}
              />
            </div>
            <div style={{ fontSize: '12px', color: var(--muted), marginTop: '6px' }}>
              {summary.tokens_remaining.toLocaleString()} tokens remaining
            </div>
          </div>

          <div className="card">
            <div className="stat-label">Total Courses Extracted</div>
            <div className="stat-value">{summary.total_courses.toLocaleString()}</div>
            <div style={{ fontSize: '13px', color: var(--muted), marginTop: '8px' }}>
              {summary.total_extractions} extractions
            </div>
          </div>

          <div className="card">
            <div className="stat-label">Total Pages Processed</div>
            <div className="stat-value">{summary.total_pages.toLocaleString()}</div>
            <div style={{ fontSize: '13px', color: var(--muted), marginTop: '8px' }}>
              {(summary.total_pages / Math.max(summary.total_extractions, 1)).toFixed(1)} avg per extraction
            </div>
          </div>

          <div className="card">
            <div className="stat-label">Cost Efficiency</div>
            <div className="stat-value" style={{ color: '#10b981' }}>
              {efficiency.avg_tokens_per_course}
              <span className="stat-unit"> tokens/course</span>
            </div>
            <div style={{ fontSize: '13px', color: var(--muted), marginTop: '8px' }}>
              {efficiency.estimated_extractions_remaining} extractions remaining
            </div>
          </div>
        </div>

        {/* Efficiency Metrics */}
        <div className="section">
          <div className="section-title">Efficiency Metrics</div>
          <div className="card">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <div className="stat-label">Tokens per Course</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: var(--primary) }}>
                  {efficiency.avg_tokens_per_course}
                </div>
              </div>
              <div>
                <div className="stat-label">Tokens per Page</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: var(--primary) }}>
                  {efficiency.avg_tokens_per_page}
                </div>
              </div>
              <div>
                <div className="stat-label">Courses per Extraction</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: var(--primary) }}>
                  {efficiency.avg_courses_per_extraction}
                </div>
              </div>
              <div>
                <div className="stat-label">Usage Rate</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: summary.usage_percentage > 80 ? var(--danger) : var(--secondary) }}>
                  {summary.usage_percentage.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* API Breakdown */}
        {api_breakdown.length > 0 && (
          <div className="section">
            <div className="section-title">API Breakdown</div>
            <div className="card">
              <table>
                <thead>
                  <tr>
                    <th>API</th>
                    <th>Extractions</th>
                    <th>Tokens Used</th>
                    <th>Courses</th>
                    <th>Cost/Course</th>
                  </tr>
                </thead>
                <tbody>
                  {api_breakdown.map((api) => (
                    <tr key={api.api}>
                      <td>
                        <span className="api-badge">{api.api}</span>
                      </td>
                      <td>{api.extractions}</td>
                      <td>{api.tokens_used.toLocaleString()}</td>
                      <td>{api.courses_extracted}</td>
                      <td>{Math.round(api.cost_per_course)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Top by Tokens */}
        {top_by_tokens.length > 0 && (
          <div className="section">
            <div className="section-title">Most Token-Intensive Extractions</div>
            <div className="card">
              <table>
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Tokens</th>
                    <th>Courses</th>
                    <th>Cost/Course</th>
                  </tr>
                </thead>
                <tbody>
                  {top_by_tokens.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.filename}
                      </td>
                      <td>{item.tokens_used.toLocaleString()}</td>
                      <td>{item.courses_extracted}</td>
                      <td>{Math.round(item.cost_per_course)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Top by Courses */}
        {top_by_courses.length > 0 && (
          <div className="section">
            <div className="section-title">Most Courses Extracted</div>
            <div className="card">
              <table>
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Courses</th>
                    <th>Tokens</th>
                    <th>Cost/Course</th>
                  </tr>
                </thead>
                <tbody>
                  {top_by_courses.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.filename}
                      </td>
                      <td>{item.courses_extracted}</td>
                      <td>{item.tokens_used.toLocaleString()}</td>
                      <td>{Math.round(item.cost_per_course)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Free Tier Info */}
        <div className="section">
          <div className="highlight">
            <p className="highlight-text">
              📊 <strong>Free Tier:</strong> {summary.usage_percentage.toFixed(1)}% used ({summary.total_tokens.toLocaleString()} / {summary.free_tier_limit.toLocaleString()} tokens). {summary.usage_percentage > 80 ? '⚠️ Consider upgrading to paid plan.' : '✅ You have plenty of quota remaining.'}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
