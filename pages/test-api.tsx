import { useState, useEffect } from 'react'

interface ApiKeyOption {
  _id: string
  nickname: string
  rpd_remaining: number
}

export default function TestApiPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeyOption[]>([])
  const [selectedKeyId, setSelectedKeyId] = useState('')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    fetch('/api/v2/api-keys/available')
      .then(r => r.json())
      .then(data => {
        if (data.keys) {
          setApiKeys(data.keys)
          if (data.keys.length > 0) {
            setSelectedKeyId(data.keys[0]._id)
          }
        }
      })
  }, [])

  const testKey = async () => {
    if (!selectedKeyId) {
      alert('Please select an API key')
      return
    }

    setTesting(true)
    setResult(null)

    try {
      const response = await fetch('/api/test-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKeyId: selectedKeyId })
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : String(error) })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1>Gemini API Key Tester</h1>
      <p style={{ color: '#666', marginBottom: '32px' }}>
        This page tests if your Gemini API key is working properly by making a simple test request.
      </p>

      {apiKeys.length === 0 ? (
        <div style={{ padding: '20px', background: '#fee', border: '1px solid #fcc', borderRadius: '8px' }}>
          <strong>No API keys available</strong>
          <p>Please add API keys in the backend first.</p>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Select API Key:
            </label>
            <select
              value={selectedKeyId}
              onChange={(e) => setSelectedKeyId(e.target.value)}
              style={{
                padding: '10px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                width: '100%',
                maxWidth: '400px'
              }}
            >
              {apiKeys.map(key => (
                <option key={key._id} value={key._id}>
                  {key.nickname} ({key.rpd_remaining} requests remaining)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={testKey}
            disabled={testing || !selectedKeyId}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 500,
              background: testing ? '#ccc' : '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: testing ? 'not-allowed' : 'pointer'
            }}
          >
            {testing ? 'Testing...' : 'Test API Key'}
          </button>

          {result && (
            <div style={{ marginTop: '32px' }}>
              <h2>Test Result:</h2>
              
              {result.error && (
                <div style={{ padding: '20px', background: '#fee', border: '1px solid #fcc', borderRadius: '8px', marginTop: '16px' }}>
                  <strong style={{ color: '#c00' }}>❌ Error:</strong>
                  <pre style={{ marginTop: '8px', overflow: 'auto' }}>{result.error}</pre>
                </div>
              )}

              {result.success && (
                <div>
                  <div style={{ padding: '20px', background: '#efe', border: '1px solid #cfc', borderRadius: '8px', marginTop: '16px' }}>
                    <strong style={{ color: '#070' }}>✅ API Key is Working!</strong>
                  </div>

                  <div style={{ marginTop: '24px' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <strong>Response Status:</strong> {result.status}
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <strong>Has Candidates:</strong> {result.hasCandidates ? 'Yes' : 'No'}
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <strong>Candidates Count:</strong> {result.candidatesCount}
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <strong>Has Content:</strong> {result.hasContent ? 'Yes' : 'No'}
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <strong>Content Length:</strong> {result.contentLength} characters
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <strong>Finish Reason:</strong> {result.finishReason || 'None'}
                    </div>
                  </div>

                  {result.content && (
                    <div style={{ marginTop: '24px' }}>
                      <h3>Response Content:</h3>
                      <pre style={{
                        background: '#f5f5f5',
                        padding: '16px',
                        borderRadius: '6px',
                        overflow: 'auto',
                        fontSize: '14px'
                      }}>
                        {result.content}
                      </pre>
                    </div>
                  )}

                  {result.safetyRatings && (
                    <div style={{ marginTop: '24px' }}>
                      <h3>Safety Ratings:</h3>
                      <pre style={{
                        background: '#f5f5f5',
                        padding: '16px',
                        borderRadius: '6px',
                        overflow: 'auto',
                        fontSize: '14px'
                      }}>
                        {JSON.stringify(result.safetyRatings, null, 2)}
                      </pre>
                    </div>
                  )}

                  <details style={{ marginTop: '24px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 500 }}>
                      Full Response (click to expand)
                    </summary>
                    <pre style={{
                      background: '#f5f5f5',
                      padding: '16px',
                      borderRadius: '6px',
                      overflow: 'auto',
                      fontSize: '12px',
                      marginTop: '12px'
                    }}>
                      {JSON.stringify(result.fullResponse, null, 2)}
                    </pre>
                  </details>
                </div>
              )}

              {!result.success && !result.error && (
                <div style={{ padding: '20px', background: '#ffa', border: '1px solid #cc8', borderRadius: '8px', marginTop: '16px' }}>
                  <strong>⚠️ Unexpected Response:</strong>
                  <pre style={{ marginTop: '8px', overflow: 'auto', fontSize: '12px' }}>
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
