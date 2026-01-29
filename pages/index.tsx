import Head from 'next/head'
import Link from 'next/link'
import { NextPage } from 'next'

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>CourseHarvester - Extract Course Data</title>
        <meta name="description" content="Extract course information from curriculum documents using AI" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <main style={styles.main}>
        <div style={styles.container}>
          <div style={styles.hero}>
            <h1 style={styles.title}>CourseHarvester</h1>
            <p style={styles.subtitle}>
              Intelligent curriculum data extraction powered by AI
            </p>
            <p style={styles.description}>
              Extract course information from PDFs, Word documents, presentations, and more.
            </p>
          </div>

          <div style={styles.ctaSection}>
            <Link href="/courseharvester">
              <button style={styles.primaryButton}>
                Launch CourseHarvester
                <span style={styles.arrow}> →</span>
              </button>
            </Link>
          </div>

          <div style={styles.features}>
            <div style={styles.featureGrid}>
              <div style={styles.feature}>
                <div style={styles.featureIcon}>📄</div>
                <h3 style={styles.featureTitle}>Multi-Format</h3>
                <p style={styles.featureText}>PDF, DOCX, PPTX, HTML, TXT</p>
              </div>
              <div style={styles.feature}>
                <div style={styles.featureIcon}>🤖</div>
                <h3 style={styles.featureTitle}>AI-Powered</h3>
                <p style={styles.featureText}>Gemini API integration</p>
              </div>
              <div style={styles.feature}>
                <div style={styles.featureIcon}>⚡</div>
                <h3 style={styles.featureTitle}>Real-Time</h3>
                <p style={styles.featureText}>Live extraction & results</p>
              </div>
              <div style={styles.feature}>
                <div style={styles.featureIcon}>🎯</div>
                <h3 style={styles.featureTitle}>Accurate</h3>
                <p style={styles.featureText}>Smart chunking & parsing</p>
              </div>
            </div>
          </div>

          <footer style={styles.footer}>
            <p style={styles.footerText}>
              Next.js • TypeScript • React 18
            </p>
          </footer>
        </div>
      </main>
    </>
  )
}

const styles = {
  main: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #31225C 0%, #603AC8 100%)',
    color: '#F4F0FF',
    fontFamily: "'Inter', 'system-ui', '-apple-system', sans-serif",
    padding: '20px',
  } as React.CSSProperties,
  
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: '100vh',
  } as React.CSSProperties,

  hero: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center' as const,
    paddingTop: '60px',
    paddingBottom: '40px',
  } as React.CSSProperties,

  title: {
    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
    fontWeight: 'bold',
    margin: '0 0 20px 0',
    background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  } as React.CSSProperties,

  subtitle: {
    fontSize: '1.5rem',
    marginBottom: '10px',
    color: '#cbd5e1',
  } as React.CSSProperties,

  description: {
    fontSize: '1rem',
    color: '#94a3b8',
    marginBottom: '30px',
    maxWidth: '600px',
  } as React.CSSProperties,

  ctaSection: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '60px',
  } as React.CSSProperties,

  primaryButton: {
    padding: '14px 40px',
    fontSize: '1.1rem',
    fontWeight: '600',
    background: '#603AC8',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(96, 58, 200, 0.4)',
  } as React.CSSProperties,

  arrow: {
    marginLeft: '8px',
    display: 'inline-block',
    transition: 'transform 0.3s ease',
  } as React.CSSProperties,

  features: {
    marginBottom: '60px',
  } as React.CSSProperties,

  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    width: '100%',
  } as React.CSSProperties,

  feature: {
    background: 'rgba(96, 58, 200, 0.2)',
    border: '1px solid rgba(96, 58, 200, 0.3)',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center' as const,
    transition: 'all 0.3s ease',
  } as React.CSSProperties,

  featureIcon: {
    fontSize: '2.5rem',
    marginBottom: '12px',
  } as React.CSSProperties,

  featureTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    margin: '0 0 8px 0',
    color: '#ffffff',
  } as React.CSSProperties,

  featureText: {
    fontSize: '0.9rem',
    color: '#F4F0FF',
    margin: 0,
  } as React.CSSProperties,

  footer: {
    textAlign: 'center' as const,
    marginTop: 'auto',
    paddingBottom: '20px',
    borderTop: '1px solid rgba(96, 58, 200, 0.3)',
  } as React.CSSProperties,

  footerText: {
    fontSize: '0.9rem',
    color: '#F4F0FF',
    margin: '20px 0 0 0',
  } as React.CSSProperties,
}

export default Home
