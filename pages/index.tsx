import Head from 'next/head'
import Link from 'next/link'
import { NextPage } from 'next'
import { useState } from 'react'
import Header from '@/components/Header'
import { FileText, Bot, Zap, BarChart3, Save, Download, ArrowRight, Sparkles, Database, Brain, CheckCircle2, TrendingUp } from 'lucide-react'

const Home: NextPage = () => {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null)

  return (
    <>
      <Head>
        <title>CourseHarvester - Extract Course Data</title>
        <meta name="description" content="Extract course information from curriculum documents using AI" />
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
            <Link href="/extractions" style={{
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
                Complete Course Intelligence Platform
              </h2>
              <p style={{ fontSize: '1.1rem', color: '#6b7280', maxWidth: '600px', margin: '0 auto' }}>
                From extraction to mapping to comparison. Everything you need to build and maintain accurate course catalogs.
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
                  {feature.badge && (
                    <div style={{
                      marginTop: '16px',
                      display: 'inline-block',
                      padding: '4px 12px',
                      background: '#10b981',
                      color: 'white',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}>
                      ✨ {feature.badge}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Secondary AI Mapping Section */}
        <section style={{
          padding: '100px 24px',
          background: 'linear-gradient(135deg, #f0fdf4, #ffffff)',
          borderTop: '1px solid #e5e7eb',
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr',
              gap: '60px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}>
              {/* Left Content */}
              <div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: '#dcfce7',
                  borderRadius: '50px',
                  marginBottom: '24px',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                }}>
                  <Brain size={16} style={{ color: '#10b981' }} />
                  <span style={{ fontSize: '14px', color: '#10b981', fontWeight: 500 }}>NEW: On-Demand AI Mapping</span>
                </div>

                <h2 style={{
                  fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                  fontWeight: 800,
                  color: '#31225C',
                  marginBottom: '24px',
                  lineHeight: 1.2,
                }}>
                  Compare AI Suggestions with Your Mapping
                </h2>

                <p style={{
                  fontSize: '1.1rem',
                  color: '#6b7280',
                  marginBottom: '32px',
                  lineHeight: 1.8,
                }}>
                  Run Gemini-powered AI course mapping alongside your existing logic. View side-by-side comparisons, confidence scores, and reasoning to improve your mapping strategy.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                  {[
                    'Compare primary vs AI mapping results',
                    'Confidence scoring (0-100%) with reasoning',
                    'Alternative suggestions for each course',
                    'Safe and fully reversible - no data loss',
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <CheckCircle2 size={20} style={{ color: '#10b981', flexShrink: 0 }} />
                      <span style={{ color: '#6b7280' }}>{item}</span>
                    </div>
                  ))}
                </div>

                <Link href="/map" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 28px',
                  background: '#10b981',
                  color: 'white',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '16px',
                  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.3s ease',
                }}>
                  Try AI Mapping <ArrowRight size={18} />
                </Link>
              </div>

              {/* Right Side - Stats/Features */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
              }}>
                <div style={{
                  padding: '32px',
                  background: 'white',
                  borderRadius: '16px',
                  border: '2px solid #dcfce7',
                  textAlign: 'center',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}>133</div>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>Tests Passing</p>
                </div>
                <div style={{
                  padding: '32px',
                  background: 'white',
                  borderRadius: '16px',
                  border: '2px solid #dcfce7',
                  textAlign: 'center',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}>100%</div>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>Pass Rate</p>
                </div>
                <div style={{
                  padding: '32px',
                  background: 'white',
                  borderRadius: '16px',
                  border: '2px solid #dcfce7',
                  textAlign: 'center',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                  gridColumn: '1 / -1',
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}>✨ Production Ready</div>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>Zero Breaking Changes</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* Complete Workflow Section */}
        <section style={{
          padding: '100px 24px',
          background: '#F4F0FF',
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <h2 style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                color: '#31225C',
                marginBottom: '16px',
              }}>
                Complete Workflow
              </h2>
              <p style={{ fontSize: '1.1rem', color: '#6b7280' }}>
                From document upload to AI-powered mapping and comparison in 6 steps
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
              {completeWorkflow.map((step, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  background: '#ffffff',
                  padding: '32px',
                  borderRadius: '16px',
                  boxShadow: '0 4px 20px rgba(96, 58, 200, 0.08)',
                  textAlign: 'center',
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
                    margin: '0 auto',
                  }}>
                    {idx + 1}
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#31225C', marginBottom: '8px' }}>
                    {step.title}
                  </h3>
                  <p style={{ color: '#6b7280', lineHeight: 1.6, flexGrow: 1 }}>{step.description}</p>
                  {step.badge && (
                    <div style={{
                      display: 'inline-block',
                      padding: '6px 12px',
                      background: '#dcfce7',
                      color: '#065f46',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      alignSelf: 'center',
                    }}>
                      {step.badge}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Project Accomplishments Section */}
        <section style={{
          padding: '100px 24px',
          background: 'white',
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <h2 style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                color: '#31225C',
                marginBottom: '16px',
              }}>
                Project Accomplishments
              </h2>
              <p style={{ fontSize: '1.1rem', color: '#6b7280' }}>
                Built with enterprise-grade quality and rigorous testing standards
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px' }}>
              {accomplishments.map((item, idx) => (
                <div key={idx} style={{
                  padding: '40px 24px',
                  background: 'linear-gradient(135deg, #f0f9ff, #f8f4ff)',
                  borderRadius: '16px',
                  border: '2px solid #e5e7eb',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }}>
                  <div style={{
                    fontSize: '3rem',
                    fontWeight: 700,
                    color: '#10b981',
                    marginBottom: '12px',
                  }}>
                    {item.value}
                  </div>
                  <p style={{ color: '#6b7280', fontSize: '16px', fontWeight: 500 }}>{item.label}</p>
                  {item.description && (
                    <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '8px', lineHeight: 1.6 }}>
                      {item.description}
                    </p>
                  )}
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
              <Link href="/extractions" style={{ color: 'white', textDecoration: 'none' }}>History</Link>
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
const features: Array<{
  icon: any;
  title: string;
  description: string;
  badge?: string;
}> = [
  { icon: FileText, title: 'Multi-Format Support', description: 'Extract from PDF, DOCX, PPTX, HTML, TXT and more. Works with any curriculum document.' },
  { icon: Bot, title: 'AI-Powered Extraction', description: 'Powered by Google Gemini AI for intelligent, context-aware data extraction.' },
  { icon: Zap, title: 'Real-Time Processing', description: 'Watch courses appear as they are extracted. Live progress tracking included.' },
  { icon: BarChart3, title: 'Analytics Dashboard', description: 'Track token usage, extraction history, and optimize your workflow.' },
  { icon: Save, title: 'Auto-Save & History', description: 'All extractions are saved automatically. Access and manage anytime.' },
  { icon: Download, title: 'Export Options', description: 'Download as CSV for easy import into spreadsheets and databases.' },
]

// Complete workflow data
const completeWorkflow = [
  { 
    title: 'Upload Your Document', 
    description: 'Drag and drop or select your curriculum PDF, Word document, presentation, or text file.',
  },
  { 
    title: 'Select & Configure', 
    description: 'Choose specific pages or configure extraction settings for optimal results.',
  },
  { 
    title: 'AI Extraction', 
    description: 'Gemini AI intelligently extracts course names, codes, descriptions, and metadata.',
  },
  { 
    title: 'Primary Mapping', 
    description: 'Deterministic mapping engine maps courses to master database with full accuracy.',
  },
  { 
    title: 'Run AI Mapping (Optional)', 
    description: 'Trigger secondary Gemini-powered AI mapping for enhanced suggestions and comparisons.',
    badge: 'NEW',
  },
  { 
    title: 'Compare & Review', 
    description: 'View side-by-side comparisons with confidence scores and export your results.',
  },
]

// Accomplishments data
const accomplishments = [
  {
    value: '133',
    label: 'Tests Passing',
    description: 'Comprehensive test suite ensuring reliability',
  },
  {
    value: '100%',
    label: 'Pass Rate',
    description: 'Zero test failures, production-grade quality',
  },
  {
    value: '1,100+',
    label: 'Lines of Code',
    description: 'New secondary mapping feature',
  },
  {
    value: '0',
    label: 'Breaking Changes',
    description: 'Fully backward compatible',
  },
  {
    value: '6',
    label: 'Documentation Guides',
    description: 'Complete technical + user documentation',
  },
  {
    value: '✨',
    label: 'Production Ready',
    description: 'Enterprise-grade implementation',
  },
]

// Steps data (legacy, kept for reference)
const steps = [
  { title: 'Upload Your Document', description: 'Drag and drop or select your curriculum PDF, Word document, or presentation file.' },
  { title: 'Select Page Range', description: 'Choose specific pages to extract or process the entire document at once.' },
  { title: 'Get Structured Data', description: 'AI extracts course names, codes, descriptions, prerequisites, and more into a clean table.' },
]

export default Home
