import Head from 'next/head'
import Link from 'next/link'
import { NextPage } from 'next'
import { useState } from 'react'
import Header from '@/components/Header'
import { FileText, Bot, Zap, BarChart3, Save, Download, ArrowRight, Sparkles, Database, GitBranch, TestTube, Upload, FolderOpen } from 'lucide-react'

const Home: NextPage = () => {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null)

  return (
    <>
      <Head>
        <title>Planpaths Data Miner - Course Data Platform</title>
        <meta name="description" content="Complete course data platform: Extract, map, and manage course information with AI-powered tools" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Favicon and fonts are in _document.tsx */}
      </Head>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #ffffff; }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
      `}</style>
      
      {/* Header Navigation */}
      <Header transparent />

      <main style={{ minHeight: '100vh', background: '#ffffff' }}>
        {/* Hero Section */}
        <section style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: '120px 24px 60px',
          background: 'linear-gradient(180deg, #F4F0FF 0%, #ffffff 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Background decoration */}
          <div style={{
            position: 'absolute',
            top: '10%',
            left: '10%',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(96, 58, 200, 0.1) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }} />
          <div style={{
            position: 'absolute',
            bottom: '20%',
            right: '10%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(49, 34, 92, 0.08) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }} />

          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: '#F4F0FF',
            borderRadius: '50px',
            marginBottom: '24px',
            border: '1px solid rgba(96, 58, 200, 0.2)',
          }}>
            <Sparkles size={16} style={{ color: '#603AC8' }} />
            <span style={{ fontSize: '14px', color: '#603AC8', fontWeight: 500 }}>AI-Powered Course Extraction</span>
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: '24px',
            color: '#31225C',
            maxWidth: '800px',
          }}>
            Course Data Platform
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #603AC8, #31225C)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Extract • Map • Manage</span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: '1.25rem',
            color: '#6b7280',
            maxWidth: '700px',
            marginBottom: '40px',
            lineHeight: 1.6,
          }}>
            Complete course data solution: Extract from PDFs, build master databases, map with AI, and track everything with powerful analytics.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/courseharvester" style={{
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #603AC8, #31225C)',
              color: 'white',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 8px 30px rgba(96, 58, 200, 0.4)',
              transition: 'all 0.3s ease',
            }}>
              Launch Harvester <ArrowRight size={18} />
            </Link>
            <Link href="/masterdatabase" style={{
              padding: '16px 32px',
              background: 'white',
              color: '#603AC8',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '16px',
              border: '2px solid #F4F0FF',
              transition: 'all 0.3s ease',
            }}>
              Master Database
            </Link>
            <Link href="/map" style={{
              padding: '16px 32px',
              background: 'white',
              color: '#603AC8',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '16px',
              border: '2px solid #F4F0FF',
              transition: 'all 0.3s ease',
            }}>
              Start Mapping
            </Link>
          </div>

          {/* Stats */}
          <div style={{
            display: 'flex',
            gap: '48px',
            marginTop: '80px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            <StatItem value="6" label="Tools" />
            <StatItem value="AI-Powered" label="Mapping" />
            <StatItem value="380" label="RPD Capacity" />
          </div>
        </section>

        {/* Features Section */}
        <section style={{
          padding: '100px 24px',
          background: '#ffffff',
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <h2 style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                color: '#31225C',
                marginBottom: '16px',
              }}>
                Complete Toolset
              </h2>
              <p style={{ fontSize: '1.1rem', color: '#6b7280', maxWidth: '600px', margin: '0 auto' }}>
                Six powerful tools for extracting, mapping, and managing course data
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
            }}>
              {features.map((feature, idx) => (
                <Link
                  key={idx}
                  href={feature.link}
                  onMouseEnter={() => setHoveredFeature(idx)}
                  onMouseLeave={() => setHoveredFeature(null)}
                  style={{
                    padding: '32px',
                    background: hoveredFeature === idx ? '#F4F0FF' : '#ffffff',
                    borderRadius: '16px',
                    border: `2px solid ${hoveredFeature === idx ? '#603AC8' : '#F4F0FF'}`,
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    transform: hoveredFeature === idx ? 'translateY(-4px)' : 'none',
                    boxShadow: hoveredFeature === idx ? '0 20px 40px rgba(96, 58, 200, 0.15)' : 'none',
                    textDecoration: 'none',
                    display: 'block',
                  }}
                >
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #603AC8, #31225C)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px',
                    color: 'white',
                  }}>
                    <feature.icon size={28} />
                  </div>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: '#31225C',
                    marginBottom: '12px',
                  }}>
                    {feature.title}
                  </h3>
                  <p style={{ color: '#6b7280', lineHeight: 1.6 }}>
                    {feature.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section style={{
          padding: '100px 24px',
          background: '#F4F0FF',
        }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <h2 style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                color: '#31225C',
                marginBottom: '16px',
              }}>
                How It Works
              </h2>
              <p style={{ fontSize: '1.1rem', color: '#6b7280' }}>
                Three simple steps to extract your course data
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {steps.map((step, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '24px',
                  background: '#ffffff',
                  padding: '32px',
                  borderRadius: '16px',
                  boxShadow: '0 4px 20px rgba(96, 58, 200, 0.08)',
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #603AC8, #31225C)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '24px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {idx + 1}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#31225C', marginBottom: '8px' }}>
                      {step.title}
                    </h3>
                    <p style={{ color: '#6b7280', lineHeight: 1.6 }}>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section style={{
          padding: '100px 24px',
          background: 'linear-gradient(135deg, #603AC8, #31225C)',
          textAlign: 'center',
        }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            color: 'white',
            marginBottom: '16px',
          }}>
            Ready to Get Started?
          </h2>
          <p style={{
            fontSize: '1.1rem',
            color: 'rgba(255, 255, 255, 0.8)',
            marginBottom: '32px',
            maxWidth: '600px',
            margin: '0 auto 32px',
          }}>
            Choose your tool and start processing course data with AI-powered automation.
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/courseharvester" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '16px 40px',
              background: 'white',
              color: '#603AC8',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '16px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
            }}>
              Launch Harvester <ArrowRight size={18} />
            </Link>
            <Link href="/masterdatabase" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '16px 40px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '16px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
            }}>
              Master Database <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer style={{
          padding: '40px 24px',
          background: '#31225C',
          color: 'white',
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src="/PlanpathsIcon.png" alt="Planpaths" style={{ width: '20px', height: '20px', borderRadius: '4px' }} />
              <span style={{ fontWeight: 600 }}>Planpaths Data Miner</span>
            </div>
            <div style={{ display: 'flex', gap: '24px', fontSize: '14px', opacity: 0.8', flexWrap: 'wrap' }}>
              <Link href="/courseharvester" style={{ color: 'white', textDecoration: 'none' }}>Harvester</Link>
              <Link href="/masterdatabase" style={{ color: 'white', textDecoration: 'none' }}>Master DB</Link>
              <Link href="/map" style={{ color: 'white', textDecoration: 'none' }}>Mapping</Link>
              <Link href="/extractions" style={{ color: 'white', textDecoration: 'none' }}>History</Link>
              <Link href="/tokens" style={{ color: 'white', textDecoration: 'none' }}>Analytics</Link>
              <Link href="/test-api" style={{ color: 'white', textDecoration: 'none' }}>Test API</Link>
            </div>
            <p style={{ fontSize: '14px', opacity: 0.6 }}>
              Built with Next.js • TypeScript • Gemini AI
            </p>
          </div>
        </footer>
      </main>
    </>
  )
}

// Stat Item Component
const StatItem = ({ value, label }: { value: string; label: string }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#603AC8' }}>{value}</div>
    <div style={{ fontSize: '14px', color: '#6b7280' }}>{label}</div>
  </div>
)

// Features data
const features = [
  { icon: Upload, title: 'Course Harvester', description: 'Extract courses from curriculum PDFs with AI. Real-time processing with live progress tracking.', link: '/courseharvester' },
  { icon: Database, title: 'Master Database', description: 'Build master course database from catalog PDFs. Auto-save, batch processing, and duplicate detection.', link: '/masterdatabase' },
  { icon: GitBranch, title: 'Mapping Engine', description: 'Map extracted courses to master database. AI-powered similarity matching with manual refinement.', link: '/map' },
  { icon: FolderOpen, title: 'Extraction History', description: 'Browse all extractions with detailed views. Download CSV exports and manage saved data.', link: '/extractions' },
  { icon: BarChart3, title: 'Analytics Dashboard', description: 'Track token usage, API consumption, and extraction statistics across all operations.', link: '/tokens' },
  { icon: TestTube, title: 'API Testing', description: 'Test Gemini API integration, check model availability, and debug extraction issues.', link: '/test-api' },
]

// Steps data
const steps = [
  { title: 'Extract Courses', description: 'Use Course Harvester to extract courses from curriculum PDFs with real-time AI processing.' },
  { title: 'Build Master Database', description: 'Create master course catalog from course catalog PDFs with batch processing and auto-save.' },
  { title: 'Map & Refine', description: 'Use AI-powered mapping to match extracted courses to master database with manual refinement tools.' },
]

export default Home
