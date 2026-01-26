import Head from 'next/head'

export default function Home() {
  return (
    <>
      <Head>
        <title>CourseHarvester</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main style={{padding: '40px', fontFamily: 'Inter, system-ui, -apple-system'}}>
        <h1>CourseHarvester</h1>
        <p>
          This site serves the standalone CourseHarvester app. Open the app directly:
          <a href="/courseharvester" style={{marginLeft:8}}>Open CourseHarvester</a>
        </p>
        <p>
          To deploy: push this repo to Git and deploy with Vercel.
        </p>
      </main>
    </>
  )
}
