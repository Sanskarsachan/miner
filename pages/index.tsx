import Head from 'next/head'
import Link from 'next/link'
import { NextPage } from 'next'
import { useState } from 'react'
import { FileText, Bot, Zap, BarChart3, Save, Download, Upload, ListFilter, CheckCircle, Sparkles, ArrowRight, FolderOpen } from 'lucide-react'

const Home: NextPage = () => {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null)

  return (
    <>
      <Head>
        <title>CourseHarvester - Extract Course Data</title>
        <meta name="description" content="Extract course information from curriculum documents using AI" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/PlanpathsIcon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/PlanpathsIcon.png" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #ffffff; }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
      `}</style>
      
      {/* Header Navigation */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #F4F0FF',
        padding: '12px 24px',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src="/PlanpathsIcon.png" 
              alt="Planpaths Logo" 
              style={{ width: '36px', height: '36px', borderRadius: '8px' }} 
            />
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#31225C' }}>
              Course<span style={{ color: '#603AC8' }}>Harvester</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <NavLink href="/courseharvester" label="Extract" Icon={Upload} />
            <NavLink href="/tokens" label="Analytics" Icon={BarChart3} />
            <NavLink href="/v2/extractions" label="History" Icon={FolderOpen} />
            <Link href="/courseharvester" style={{
              marginLeft: '12px',
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #603AC8, #31225C)',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(96, 58, 200, 0.3)',
            }}>
              Get Started
            </Link>
          </nav>
        </div>
      </header>

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
            Extract Course Data
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #603AC8, #31225C)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>in Seconds</span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: '1.25rem',
            color: '#6b7280',
            maxWidth: '600px',
            marginBottom: '40px',
            lineHeight: 1.6,
          }}>
            Transform PDFs, Word documents, and presentations into structured course data using advanced AI. Fast, accurate, and effortless.
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
              Start Extracting <ArrowRight size={18} />
            </Link>
            <Link href="/v2/extractions" style={{
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
              View Extractions
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
            <StatItem value="10+" label="File Formats" />
            <StatItem value="99%" label="Accuracy" />
            <StatItem value="<5s" label="Per Page" />
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
                Powerful Features
              </h2>
              <p style={{ fontSize: '1.1rem', color: '#6b7280', maxWidth: '500px', margin: '0 auto' }}>
                Everything you need to extract and manage course data efficiently
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
            }}>
              {features.map((feature, idx) => (
                <div
                  key={idx}
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
                </div>
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
            maxWidth: '500px',
            margin: '0 auto 32px',
          }}>
            Start extracting course data from your documents in seconds.
          </p>
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
            Launch CourseHarvester <ArrowRight size={18} />
          </Link>
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
              <span style={{ fontWeight: 600 }}>CourseHarvester</span>
            </div>
            <div style={{ display: 'flex', gap: '24px', fontSize: '14px', opacity: 0.8 }}>
              <Link href="/courseharvester" style={{ color: 'white', textDecoration: 'none' }}>Extract</Link>
              <Link href="/tokens" style={{ color: 'white', textDecoration: 'none' }}>Analytics</Link>
              <Link href="/v2/extractions" style={{ color: 'white', textDecoration: 'none' }}>History</Link>
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

// Nav Link Component
const NavLink = ({ href, label, Icon }: { href: string; label: string; Icon: any }) => (
  <Link href={href} style={{
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    color: '#31225C',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '8px',
    transition: 'all 0.2s ease',
  }}>
    <Icon size={16} />
    {label}
  </Link>
)

// Stat Item Component
const StatItem = ({ value, label }: { value: string; label: string }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#603AC8' }}>{value}</div>
    <div style={{ fontSize: '14px', color: '#6b7280' }}>{label}</div>
  </div>
)

// Features data
const features = [
  { icon: FileText, title: 'Multi-Format Support', description: 'Extract from PDF, DOCX, PPTX, HTML, TXT and more. Works with any curriculum document.' },
  { icon: Bot, title: 'AI-Powered Extraction', description: 'Powered by Google Gemini AI for intelligent, context-aware data extraction.' },
  { icon: Zap, title: 'Real-Time Processing', description: 'Watch courses appear as they are extracted. Live progress tracking included.' },
  { icon: BarChart3, title: 'Analytics Dashboard', description: 'Track token usage, extraction history, and optimize your workflow.' },
  { icon: Save, title: 'Auto-Save & History', description: 'All extractions are saved automatically. Access and manage anytime.' },
  { icon: Download, title: 'Export Options', description: 'Download as CSV for easy import into spreadsheets and databases.' },
]

// Steps data
const steps = [
  { title: 'Upload Your Document', description: 'Drag and drop or select your curriculum PDF, Word document, or presentation file.' },
  { title: 'Select Page Range', description: 'Choose specific pages to extract or process the entire document at once.' },
  { title: 'Get Structured Data', description: 'AI extracts course names, codes, descriptions, prerequisites, and more into a clean table.' },
]

export default Home
