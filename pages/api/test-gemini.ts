import type { NextApiRequest, NextApiResponse } from 'next'
import { connectDB } from '@/lib/db'
import { getApiKey } from '@/lib/api-key-manager'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { apiKeyId } = req.body

    if (!apiKeyId) {
      return res.status(400).json({ error: 'apiKeyId required' })
    }

    // Get API key from database
    const db = await connectDB()
    const keyData = await getApiKey(db, apiKeyId)
    
    if (!keyData) {
      return res.status(404).json({ error: 'API key not found' })
    }

    console.log('[test-gemini] Testing with key:', keyData.nickname)

    // Simple test prompt
    const testPrompt = "Return this exact JSON array: [{\"test\": \"hello\"}]"
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${keyData.key}`
    console.log('[test-gemini] Calling Gemini API...')

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: testPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
        },
      }),
    })

    console.log('[test-gemini] Response status:', response.status)
    const responseText = await response.text()
    console.log('[test-gemini] Response text length:', responseText.length)
    console.log('[test-gemini] Response text:', responseText.substring(0, 1000))

    let geminiData
    try {
      geminiData = JSON.parse(responseText)
    } catch (e) {
      return res.status(200).json({
        error: 'Failed to parse response',
        status: response.status,
        responseText: responseText.substring(0, 500)
      })
    }

    // Check response structure
    const responseContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
    
    return res.status(200).json({
      success: true,
      status: response.status,
      hasCandidates: !!geminiData.candidates,
      candidatesCount: geminiData.candidates?.length || 0,
      hasContent: !!responseContent,
      contentLength: responseContent?.length || 0,
      content: responseContent?.substring(0, 500),
      fullResponse: geminiData,
      responseKeys: Object.keys(geminiData),
      finishReason: geminiData.candidates?.[0]?.finishReason,
      safetyRatings: geminiData.candidates?.[0]?.safetyRatings,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[test-gemini] Error:', errorMsg)
    return res.status(500).json({ error: errorMsg })
  }
}
