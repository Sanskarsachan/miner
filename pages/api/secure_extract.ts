import type { NextApiRequest, NextApiResponse } from 'next'
import rateLimit from 'micro-ratelimit'

// Allow env var as fallback, but prefer client-provided key
const ENV_GEMINI_API_KEY = process.env.GEMINI_API_KEY
const MAX_REQUESTS_PER_HOUR = 5

// Rate limiter using IP address
const limiter = rateLimit({
  window: 60 * 60 * 1000, // 1 hour
  limit: MAX_REQUESTS_PER_HOUR,
})

interface ExtractRequest {
  text: string
  filename?: string
  apiKey?: string  // NEW: Accept API key from client
}

interface Course {
  Category?: string
  CourseName?: string
  GradeLevel?: string
  Length?: string
  Prerequisite?: string
  Credit?: string
  CourseDescription?: string
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text: string }>
    }
  }>
}

interface ErrorResponse {
  error: string
  retryAfter?: number
  resetTime?: string
  type?: string
  timestamp?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GeminiResponse | Course[] | ErrorResponse>
) {
  // CORS headers for security
  res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('X-Content-Type-Options', 'nosniff')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { text, filename, apiKey: clientApiKey } = req.body as ExtractRequest

    // Use client-provided key or fallback to env var
    const GEMINI_API_KEY = clientApiKey || ENV_GEMINI_API_KEY

    // Verify API key is available (from client or env)
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured - not provided by client and not in env')
      return res.status(500).json({ error: 'Service not properly configured' })
    }

    // Apply rate limiting (wrapped in try-catch)
    try {
      await limiter(req, res)
    } catch (rateLimitError) {
      console.error('Rate limit error:', rateLimitError)
      const resetTime = new Date(Date.now() + 3600 * 1000).toLocaleTimeString()
      return res.status(429).json({
        error: `Rate limit exceeded. Maximum 5 documents per hour. You can try again after ${resetTime} UTC.`,
        retryAfter: 3600,
        resetTime,
      })
    }

    // Validate request
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Invalid request: text is required' })
    }

    if (text.length === 0) {
      return res.status(400).json({ error: 'Text cannot be empty' })
    }

    // Validate API key format
    if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 10) {
      console.error('Invalid API key provided, length:', GEMINI_API_KEY?.length || 0)
      return res.status(400).json({ 
        error: 'Invalid API key. Please check your Gemini API key.'
      })
    }

    // Build optimized prompt
    const prompt = buildOptimizedPrompt(text)

    // Call Gemini API with secure headers and timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 8192,
            },
          }),
          signal: controller.signal,
        }
      )

      clearTimeout(timeout)

      if (!response.ok) {
        let errorData: { error?: string } = {}
        try {
          errorData = await response.json()
        } catch (e) {
          console.error('Failed to parse error response:', e)
          const text = await response.text()
          console.error('Response text:', text.substring(0, 500))
        }
        
        console.error(`Gemini API Error (${response.status}):`, errorData)

        // User-friendly error messages
        if (response.status === 429) {
          return res.status(429).json({
            error:
              'Gemini API rate limit reached. Please wait a moment and try again.',
            retryAfter: 60,
          })
        }

        if (response.status === 403) {
          console.error('API key error - may be suspended or invalid')
          return res.status(500).json({
            error:
              'API authentication failed. Please contact support or regenerate your API key.',
          })
        }

        if (response.status === 401) {
          return res.status(500).json({
            error:
              'API key is invalid or expired. Please regenerate at https://aistudio.google.com/app/apikey',
          })
        }

        return res.status(response.status).json({
          error: errorData?.error || 'Failed to process document. Please try again.',
        })
      }

      const data = (await response.json()) as GeminiResponse

      // Log usage for monitoring (don't expose to client)
      console.log(
        `[${new Date().toISOString()}] Extraction: ${filename || 'unknown'}, tokens: ~${Math.ceil(text.length / 4)}`
      )

      return res.status(200).json(data)
    } catch (fetchError) {
      clearTimeout(timeout)
      
      // Handle timeout
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('Gemini API call timed out after 30 seconds')
        return res.status(504).json({
          error: 'Request timed out. The Gemini API took too long to respond. Please try with a smaller chunk.',
        })
      }
      
      throw fetchError
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : ''
    const errorType = error instanceof Error ? error.constructor.name : typeof error
    
    console.error('=== SECURE_EXTRACT ERROR ===')
    console.error('Error Message:', errorMsg)
    console.error('Error Type:', errorType)
    console.error('Error Stack:', errorStack)
    console.error('=============================')
    
    // Return detailed error for debugging
    const response: ErrorResponse = { 
      error: `Internal server error: ${errorMsg}`,
      type: errorType,
      timestamp: new Date().toISOString(),
    }
    return res.status(500).json(response)
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
}

function buildOptimizedPrompt(text: string): string {
  return `Extract course data from the document. Return ONLY a JSON array, no markdown or extra text.

Fields: Category, CourseName, GradeLevel, Length, Prerequisite, Credit, CourseDescription
Use null for missing fields. Return [{...}, {...}] format only.

Document:
${text}`
}
